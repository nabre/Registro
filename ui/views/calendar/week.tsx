// Il calendario: la settimana, la vista di lavoro. La griglia delle ore com'è
// davvero, pause comprese, con la fascia oraria e il salto all'ora di adesso.

import { useEffect, useRef, useSyncExternalStore, type ReactElement } from 'react'

import { inizioSullaGriglia, lineeDellaGiornata } from '#core/dominio/breaks.js'
import { fineLezione, inizioLezione, lezioniDelGiorno } from '#core/dominio/calculations.js'
import {
  giorniBrevi,
  giornoDelMese,
  giornoSettimana,
  minutiDaOra,
  oraDaMinuti,
  settimanaDi,
  settimanaIso,
} from '#core/dominio/dates.js'
import type { Iso, Lezione, Ora } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { alMinuto } from '#ui/clock.js'
import { finestraSettimana } from '#ui/calendarNavigation.js'
import { eventiEsterni } from '#ui/externalCalendar.js'
import { aggiorna, compleanniDi, lezioniInAgenda, stato } from '#ui/state.js'
import {
  apreQui,
  chiudeQui,
  chiusura,
  festivo,
  giorniVisibili,
  letteraDi,
  segnoSemestreQui,
} from './common.js'
import { AGGANCIO_MINUTI, trascinata, vuoleCopiare, posa, guida } from './drag.js'
import { BloccoEvento } from './ics.js'
import { classiInAula, qualcunoInAula, segnoCompleanni } from './birthdays.js'
import { StrisciaSettimane } from './weekStrip.js'
import { disegnaLezione, inModifica, ricordaFascia } from './editor.js'
import { BloccoLezione } from './lessonBlock.js'
import { menuGiorno } from './menus.js'
import { testi } from './calendar.testi.js'

/** Altezza minima di un minuto nella griglia settimanale. Sotto 1.1 le ore si schiacciano. */
const PIXEL_PER_MINUTO = 1.15
/** Oltre questo la griglia si dilata troppo. */
const PIXEL_PER_MINUTO_MAX = 2.6
/**
 * L'altezza minima del corpo della settimana: la griglia si allunga fino a
 * riempire la finestra (i blocchi sono in percentuale), sotto questa misura
 * scorre la pagina. Serve anche a decidere quante righe scrivere in un blocco.
 */
const ALTEZZA_IDEALE = 620
/** Sotto tre ore la griglia non si legge più: si tiene comunque questa finestra. */
const FASCIA_MINIMA = 180

/**
 * L'ora di adesso, che cambia a ogni minuto senza ridisegnare il pannello
 * (`clock.ts`): si ridisegna solo chi la legge.
 */
function useMinuto (): Ora {
  return useSyncExternalStore(alMinuto, () => stato.adessoOra)
}

/**
 * La riga di adesso, solo nella colonna di oggi. C'è anche fuori fascia,
 * nascosta. A ogni minuto scende da sé: il resto della settimana non cambia, e
 * ridisegnarla tutta (ogni blocco, ogni evento) si vedeva.
 */
function RigaAdesso ({ primaOra, ultimaOra }: { primaOra: number, ultimaOra: number }): ReactElement {
  const ora = useMinuto()
  const minuti = minutiDaOra(ora)
  const fuori = minuti < primaOra || minuti > ultimaOra
  return (
    <div
      className="settimana__adesso"
      data-prima={String(primaOra)}
      data-ultima={String(ultimaOra)}
      title={testi().adesso(ora)}
      hidden={fuori}
      style={{ top: `${((minuti - primaOra) / (ultimaOra - primaOra)) * 100}%` }}
    />
  )
}

/**
 * La fascia oraria da disegnare: la giornata delle Impostazioni, a ore piene,
 * uguale tutto l'anno. Si allarga solo per la settimana in cui una lezione o
 * un evento ICS cade fuori.
 */
function fasciaSettimana (
  giorni: Iso[],
  lezioni: Lezione[],
): { primaOra: number, ultimaOra: number, scala: number } {
  const impostazioni = stato.registro.impostazioni
  // A ore piene: le etichette stanno sulle righe.
  let primaOra = Math.floor(minutiDaOra(impostazioni.oraInizioGiornata) / 60) * 60
  let ultimaOra = Math.ceil(minutiDaOra(impostazioni.oraFineGiornata) / 60) * 60

  /** Allarga la fascia fino a contenere un intervallo che ne esce. */
  const contieni = (da: number, a: number): void => {
    primaOra = Math.min(primaOra, Math.floor(da / 60) * 60)
    ultimaOra = Math.max(ultimaOra, Math.ceil(a / 60) * 60)
  }
  for (const data of giorni) {
    for (const lezione of lezioniDelGiorno(lezioni, data)) {
      const da = inizioLezione(lezione)
      const a = fineLezione(lezione)
      if (da && a) contieni(minutiDaOra(da), minutiDaOra(a))
    }
    // Anche gli eventi ICS devono stare nella fascia.
    for (const evento of eventiEsterni(data)) {
      contieni(minutiDaOra(evento.inizio), minutiDaOra(evento.fine))
    }
  }
  primaOra = Math.max(0, primaOra)
  ultimaOra = Math.min(24 * 60, ultimaOra)

  if (ultimaOra - primaOra < FASCIA_MINIMA) ultimaOra = Math.min(24 * 60, primaOra + FASCIA_MINIMA)
  if (ultimaOra - primaOra < FASCIA_MINIMA) primaOra = Math.max(0, ultimaOra - FASCIA_MINIMA)

  const durata = Math.max(1, ultimaOra - primaOra)
  const scala = Math.min(PIXEL_PER_MINUTO_MAX, Math.max(PIXEL_PER_MINUTO, ALTEZZA_IDEALE / durata))

  return { primaOra, ultimaOra, scala }
}

export function VistaSettimana (): ReactElement {
  const t = testi()
  const radice = useRef<HTMLDivElement>(null)
  const giorni = settimanaDi(stato.data).filter((data) =>
    giorniVisibili().includes(giornoSettimana(data)),
  )
  const lezioni = lezioniInAgenda()
  const { primaOra, ultimaOra, scala } = fasciaSettimana(giorni, lezioni)
  ricordaFascia({ primaOra, ultimaOra })
  const altezza = Math.max(240, (ultimaOra - primaOra) * scala)
  // testo-fisso: una misura CSS
  const pavimento = `${altezza}px`

  // «Oggi» porta anche all'ora di adesso, dopo il disegno: sostituisce una volta
  // lo scorrimento ricordato.
  useEffect(() => {
    if (!finestraSettimana.versoAdesso) return
    finestraSettimana.versoAdesso = false
    requestAnimationFrame(() => {
      if (radice.current) portaAdAdesso(radice.current, primaOra, ultimaOra)
    })
  })

  const orePiene: number[] = []
  for (let minuto = Math.ceil(primaOra / 60) * 60; minuto <= ultimaOra; minuto += 60) {
    orePiene.push(minuto)
  }
  // Con le pause della giornata le righe principali sono i confini delle UD
  // (inizio e fine delle pause compresi): mostrano dove un blocco sta intero.
  const giornata = stato.registro.impostazioni
  const linee = giornata.pause ? lineeDellaGiornata(giornata, primaOra, ultimaOra) : null
  const righe = linee ?? orePiene
  /** Dove sta un minuto nella colonna, in percento dall'alto. */
  const alto = (minuto: number): string => `${((minuto - primaOra) / (ultimaOra - primaOra)) * 100}%`
  /** Il punto su cui cade il puntatore, portato sulla griglia delle pause. */
  const sullaGriglia = (minuto: number): number =>
    giornata.pause ? minutiDaOra(inizioSullaGriglia(oraDaMinuti(minuto), giornata)) : minuto

  /** L'ora su cui cade il puntatore dentro una colonna. */
  const oraSotto = (colonna: HTMLElement, clientY: number, passo: number): number => {
    const riquadro = colonna.getBoundingClientRect()
    // Dalla frazione di colonna e non da una scala in pixel: la colonna si allunga
    // con la finestra.
    const frazione = riquadro.height > 0 ? (clientY - riquadro.top) / riquadro.height : 0
    const grezzi = primaOra + frazione * (ultimaOra - primaOra)
    const minuti = Math.round(grezzi / passo) * passo
    return Math.max(primaOra, Math.min(minuti, ultimaOra - 5))
  }

  const lettera = letteraDi(stato.data)

  return (
    // Anello della catena di telaio fino alla fila delle settimane (`weekStrip.tsx`).
    <div ref={radice} className="settimana" data-telaio="settimana">
      <StrisciaSettimane />
      <div className="settimana__intestazione">
        <div className="settimana__angolo">
          <span>{t.siglaNumero(settimanaIso(stato.data))}</span>
          {lettera
            ? <span className="settimana__lettera" title={t.letteraSiCambia}>{lettera}</span>
            : null}
        </div>
        {giorni.map((data) => {
          const feste = compleanniDi(data)
          return (
            <div
              key={data}
              className={classi(
                'settimana__giorno',
                data === stato.adessoData && 'settimana__giorno--oggi',
                festivo(data) && 'giorno--festivo',
                chiusura(data) && 'giorno--chiuso',
                apreQui(data) && 'giorno--apre-semestre',
                chiudeQui(data) && 'giorno--chiude-semestre',
              )}
              title={chiusura(data) || undefined}
              onClick={() => aggiorna({ data })}
            >
              <span className="settimana__giorno-nome">{giorniBrevi()[giornoSettimana(data) - 1]}</span>
              <span className="settimana__giorno-numero">{String(giornoDelMese(data))}</span>
              {segnoSemestreQui(data, 'settimana__semestre')}
              {segnoCompleanni(feste, qualcunoInAula(feste, classiInAula(lezioni, data)))}
            </div>
          )
        })}
      </div>
      {/* Qui si scorre l'ora del giorno: la chiave è fissa, così passando alla
          settimana dopo si resta sulla stessa ora. Il mese ha un meccanismo suo
          (`finestraMese`). */}
      <div
        className="settimana__scorrevole"
        data-scorrimento="calendario:settimana"
        data-telaio="settimana-scorrevole"
      >
        {/* `min-height` in pixel è il pavimento; sopra comanda `height: 100%` del foglio
            di stile, e i blocchi in percentuale seguono. */}
        <div className="settimana__corpo" style={{ minHeight: pavimento }}>
          <div className="settimana__ore">
            {righe.map((minuto) => (
              <div
                key={minuto}
                // L'etichetta sta a cavallo della sua riga; sui due bordi della fascia si
                // appoggia dalla parte di dentro, per non essere tagliata.
                className={classi(
                  'settimana__ora',
                  minuto === primaOra && 'settimana__ora--prima',
                  minuto === ultimaOra && 'settimana__ora--ultima',
                )}
                style={{ top: alto(minuto) }}
              >
                {oraDaMinuti(minuto)}
              </div>
            ))}
          </div>
          {giorni.map((data) => (
            <div
              key={data}
              className={classi(
                'settimana__colonna',
                eventiEsterni(data).length > 0 && 'settimana__colonna--ics',
                data === stato.adessoData && 'settimana__colonna--oggi',
                festivo(data) && 'giorno--festivo',
                apreQui(data) && 'giorno--apre-semestre',
                chiudeQui(data) && 'giorno--chiude-semestre',
              )}
              // In modifica, premere e tirare sul vuoto disegna una lezione (clic secco:
              // durata predefinita). Fuori dalla modifica il calendario si guarda.
              onPointerDown={(evento) => {
                if (!inModifica()) return
                disegnaLezione(evento.nativeEvent, evento.currentTarget, data, { primaOra, ultimaOra })
              }}
              // La colonna è la zona di posa: mostra dove finirebbe il blocco. Guida e
              // zona vivono fuori dal disegno: nascono e muoiono con il trascinamento.
              onDragOver={(evento) => {
                if (!trascinata) return
                evento.preventDefault()
                const colonna = evento.currentTarget
                const copia = vuoleCopiare(evento)
                evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
                colonna.classList.add('zona-posa')
                // La guida mostra dove `posa` aggancerà l'ora, sulle pause.
                guida(
                  colonna,
                  trascinata.slot.some((s) => s.ics)
                    ? oraSotto(colonna, evento.clientY, AGGANCIO_MINUTI)
                    : sullaGriglia(oraSotto(colonna, evento.clientY, AGGANCIO_MINUTI)),
                  { primaOra, ultimaOra },
                  copia,
                )
              }}
              onDragLeave={(evento) => {
                const colonna = evento.currentTarget
                // `dragleave` scatta anche sui figli: si sgombra solo uscendo dalla colonna.
                if (colonna.contains(evento.relatedTarget as Node | null)) return
                colonna.classList.remove('zona-posa')
                colonna.querySelector('.settimana__guida')?.remove()
              }}
              onDrop={(evento) => {
                if (!trascinata) return
                evento.preventDefault()
                const minuti = oraSotto(evento.currentTarget, evento.clientY, AGGANCIO_MINUTI)
                void posa(trascinata, data, oraDaMinuti(minuti), vuoleCopiare(evento))
              }}
              // Sul vuoto il tasto destro propone l'ora su cui è caduto.
              onContextMenu={(evento) => {
                const colonna = evento.currentTarget
                if (evento.target !== colonna) return
                menuGiorno(evento.nativeEvent, data, oraSotto(colonna, evento.clientY, 15))
              }}
            >
              {righe.map((minuto) => (
                <div key={minuto} className="settimana__riga-ora" style={{ top: alto(minuto) }} />
              ))}
              {data === stato.adessoData
                ? <RigaAdesso primaOra={primaOra} ultimaOra={ultimaOra} />
                : null}
              {lezioniDelGiorno(lezioni, data).map((lezione) => (
                <BloccoLezione
                  key={lezione.id}
                  lezione={lezione}
                  minutiPrimaOra={primaOra}
                  durataFascia={ultimaOra - primaOra}
                  scala={scala}
                />
              ))}
              {eventiEsterni(data).map((evento) => (
                <BloccoEvento
                  key={evento.chiave}
                  evento={evento}
                  minutiPrimaOra={primaOra}
                  durataFascia={ultimaOra - primaOra}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Scorre il corpo della settimana fino all'ora di adesso, calcolata sulla
 * fascia (la riga esiste solo nella colonna di oggi, che può essere nascosta).
 * Fuori fascia si ferma al bordo; lascia un po' di margine sopra.
 */
function portaAdAdesso (settimana: HTMLElement, primaOra: number, ultimaOra: number): void {
  const scorrevole = settimana.querySelector<HTMLElement>('.settimana__scorrevole')
  const corpo = settimana.querySelector<HTMLElement>('.settimana__corpo')
  if (!scorrevole || !corpo) return
  const frazione = (minutiDaOra(stato.adessoOra) - primaOra) / Math.max(1, ultimaOra - primaOra)
  const riga = corpo.offsetTop + corpo.offsetHeight * Math.min(1, Math.max(0, frazione))
  const margine = Math.min(80, scorrevole.clientHeight / 3)
  // Di colpo, non con animazione: la vista è appena stata ridisegnata.
  scorrevole.scrollTop = Math.max(0, riga - margine)
}
