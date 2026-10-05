// Il calendario: il mese, come una striscia di settimane senza confini fra un
// mese e l'altro, che si allunga scorrendo e si ferma ai capi dell'anno scolastico.

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type ReactElement,
  type UIEvent as EventoInterfaccia,
} from 'react'
import { flushSync } from 'react-dom'

import { confrontaLezioni } from '#core/dominio/calculations.js'
import {
  giorniBrevi,
  mesi,
  daIso,
  formattaData,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
} from '#core/dominio/dates.js'
import type { Iso, Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import {
  SETTIMANE_ATTORNO,
  SETTIMANE_IN_PIU,
  SOGLIA_ALLUNGA,
  finestraMese,
} from '#ui/calendarNavigation.js'
import { eventiEsterni } from '#ui/externalCalendar.js'
import { moduloLezione } from '#ui/forms.js'
import { apriLezione } from '#ui/pages.js'
import {
  aggiorna,
  annoCorrente,
  compleanniDi,
  lezioniInAgenda,
  stato,
} from '#ui/state.js'
import {
  apreQui,
  chiudeQui,
  chiusura,
  festivo,
  giorniVisibili,
  letteraDi,
  segnoSemestreQui,
} from './common.js'
import { trascinata, vuoleCopiare, posa } from './drag.js'
import { ChipEvento } from './ics.js'
import { classiInAula, ChipCompleanno } from './birthdays.js'
import { inModifica } from './editor.js'
import { ChipLezione } from './lessonBlock.js'
import { menuGiorno } from './menus.js'
import { testi } from './calendar.testi.js'

/*
 * Le settimane sono una striscia sola: scorrendo si va avanti e indietro, e
 * vicino a un capo la striscia si allunga da sé. Il nome del mese resta
 * appiccicato in alto mentre le sue settimane scorrono.
 *
 * Quante settimane si vedono sopra e sotto il giorno scelto lo tiene
 * `finestraMese` (`calendarNavigation.ts`), di modulo: la vista si ridisegna a
 * ogni modifica dello stato, e la striscia non deve tornare al punto di
 * partenza. Dove portarla lo decide `posaStriscia`, dopo il disegno e mai da lui.
 */

/**
 * Le strisce già portate al loro posto, con la chiave di scorrimento che avevano:
 * quella che resta fra due disegni resta dov'è.
 */
const posate = new WeakMap<HTMLElement, string>()

/**
 * Porta la striscia al suo posto, dopo il disegno. Una striscia nuova (si entra
 * nel mese, o si è cambiato giorno) torna dove si era rimasti; ricentrata
 * (`finestraMese.scorrimento` negativo: «Oggi», le frecce) va sul giorno
 * scelto. Quella che resta non si tocca: rimetterle lo scorrimento a ogni
 * ridisegno fermava la rotella.
 */
function posaStriscia (viva: HTMLElement): void {
  if (finestraMese.scorrimento >= 0) {
    // Una striscia nuova già scorsa l'ha rimessa la storia (Alt+freccia): resta lì.
    const giaPosata = posate.get(viva) === viva.dataset.scorrimento
    if (!giaPosata && viva.scrollTop === 0) viva.scrollTop = finestraMese.scorrimento
  } else {
    const scelta = viva.querySelector<HTMLElement>('.mese__cella--scelta')
    if (scelta) {
      // Con i rettangoli e non con `offsetTop`: il genitore posizionato della cella
      // potrebbe non essere questo.
      const dove = scelta.getBoundingClientRect().top - viva.getBoundingClientRect().top
      // Il nome del mese sta appiccicato in alto: si lascia spazio, o coprirebbe il
      // giorno cercato.
      const cartello = viva.querySelector<HTMLElement>('.mese__etichetta')
      const riparo = (cartello?.offsetHeight ?? 0) + 8
      viva.scrollTop = Math.max(0, viva.scrollTop + dove - riparo)
    }
  }
  posate.set(viva, viva.dataset.scorrimento ?? '')
  finestraMese.scorrimento = viva.scrollTop
}

/** Il nome del mese sopra le sue settimane: appiccicato in alto finché scorre l'ultima. */
function etichettaMese (data: Iso, cappello = false): ReactElement {
  return (
    <div
      // testo-fisso: una chiave di React, non un testo
      key={cappello ? 'cappello' : `mese:${data}`}
      className="mese__etichetta"
      data-cappello={cappello ? '' : undefined}
    >
      {formattaMese(data)}
    </div>
  )
}

/** Vero se nella settimana di quel lunedì cade il primo di un mese. */
function apreUnMese (lunedi: Iso): boolean {
  return settimanaDi(lunedi).some((data) => giornoDelMese(data) === 1)
}

export function VistaMese (): ReactElement {
  const t = testi()
  const striscia = useRef<HTMLDivElement>(null)
  const [, allunga] = useReducer((volte: number) => volte + 1, 0)
  /** L'altezza della striscia prima di allungarla verso l'alto, finché il disegno non la rimette. */
  const altezzaPrima = useRef<number | null>(null)

  // Aggiungendo sopra si rimette il contenuto dov'era, senza strappi.
  useLayoutEffect(() => {
    const viva = striscia.current
    if (altezzaPrima.current === null || !viva) return
    viva.scrollTop += viva.scrollHeight - altezzaPrima.current
    altezzaPrima.current = null
  })

  // Dopo ogni disegno la striscia si guarda a disegno fatto, al fotogramma dopo.
  useEffect(() => {
    requestAnimationFrame(() => {
      if (striscia.current) posaStriscia(striscia.current)
    })
  })

  // Le lezioni divise per giorno una volta sola, già in ordine d'orario: le
  // celle sono centinaia. Come nell'anno e nell'agenda.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of lezioniInAgenda()) {
    const sue = perGiorno.get(lezione.data)
    if (sue) sue.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }
  for (const sue of perGiorno.values()) sue.sort(confrontaLezioni)
  const visibili = giorniVisibili()
  // La prima colonna è il numero della settimana, come nel piano annuale.
  const colonne = `2.4rem repeat(${visibili.length}, 1fr)`
  // La striscia scorre solo dentro l'anno scolastico: ai due capi finisce, e lo dice.
  const anno = annoCorrente()
  const primaSettimana = anno ? inizioSettimana(anno.inizio) : null
  const ultimaSettimana = anno ? inizioSettimana(anno.fine) : null
  const dentroLAnno = (lunedi: Iso): boolean =>
    (!primaSettimana || lunedi >= primaSettimana) && (!ultimaSettimana || lunedi <= ultimaSettimana)

  // Un giorno scelto fuori dall'anno si riporta al capo più vicino. Un anno
  // cambiato lo sistema già `riconvalidaRicordati` nello stato; qui resta il
  // caso delle frecce.
  const scelta = inizioSettimana(stato.data)
  const ancora =
    primaSettimana && scelta < primaSettimana
      ? primaSettimana
      : ultimaSettimana && scelta > ultimaSettimana
        ? ultimaSettimana
        : scelta

  // Cambiare giorno rimette la striscia attorno a quello; con lo stesso giorno
  // (un salvataggio, un trascinamento) si riprende dove si era.
  if (finestraMese.ancora !== ancora) {
    finestraMese.ancora = ancora
    finestraMese.su = SETTIMANE_ATTORNO
    finestraMese.giu = SETTIMANE_ATTORNO
    finestraMese.scorrimento = -1
  }

  // La finestra si accorcia contro i capi dell'anno.
  const settimane: Iso[] = []
  for (let i = finestraMese.su; i >= 1; i -= 1) {
    const lunedi = sommaGiorni(ancora, -i * 7)
    if (dentroLAnno(lunedi)) settimane.push(lunedi)
  }
  finestraMese.su = settimane.length
  let resteGiu = 0
  for (let i = 0; i <= finestraMese.giu; i += 1) {
    const lunedi = sommaGiorni(ancora, i * 7)
    if (!dentroLAnno(lunedi)) break
    settimane.push(lunedi)
    resteGiu = i
  }
  finestraMese.giu = resteGiu

  const cima = sommaGiorni(ancora, -finestraMese.su * 7)
  const fondo = sommaGiorni(ancora, finestraMese.giu * 7)
  // I cartelli di fine, quando la striscia tocca un capo: lì non si allunga più.
  const capoSopra = Boolean(anno) && !dentroLAnno(sommaGiorni(cima, -7))
  const capoSotto = Boolean(anno) && !dentroLAnno(sommaGiorni(fondo, 7))

  /** Allunga la striscia vicino a un capo, finché non ne tocca uno. */
  const allaRotella = (evento: EventoInterfaccia<HTMLDivElement>): void => {
    const viva = evento.currentTarget
    finestraMese.scorrimento = viva.scrollTop
    if (viva.scrollTop < SOGLIA_ALLUNGA) {
      if (capoSopra) return
      let quante = 0
      for (let i = finestraMese.su + SETTIMANE_IN_PIU; i > finestraMese.su; i -= 1) {
        if (dentroLAnno(sommaGiorni(ancora, -i * 7))) quante += 1
      }
      if (quante === 0) return
      finestraMese.su += quante
      altezzaPrima.current = viva.scrollHeight
      // Subito, come prima: la rotella che continua trova già le settimane nuove.
      flushSync(allunga)
    } else if (viva.scrollHeight - viva.scrollTop - viva.clientHeight < SOGLIA_ALLUNGA) {
      if (capoSotto) return
      let quante = 0
      for (let i = 1; i <= SETTIMANE_IN_PIU; i += 1) {
        if (!dentroLAnno(sommaGiorni(ancora, (finestraMese.giu + i) * 7))) break
        quante += 1
      }
      if (quante === 0) return
      finestraMese.giu += quante
      flushSync(allunga)
    }
  }

  const cella = (data: Iso): ReactElement => {
    const delGiorno = perGiorno.get(data) ?? []
    const eventiDelGiorno = eventiEsterni(data)
    const feste = compleanniDi(data)
    const inAula = classiInAula(delGiorno, data)
    const primoDelSuoMese = giornoDelMese(data) === 1

    /** Apre dal giorno vuoto la stessa finestra del doppio clic. */
    const creaLezione = (): void => {
      if (!inModifica()) return
      moduloLezione({
        data,
        corsoId: stato.filtroCorsoAgendaId ?? undefined,
        dopo: (id) => apriLezione(id),
      })
    }

    return (
      <div
        key={data}
        className={classi(
          'mese__cella',
          // Nella striscia ogni cella è un giorno vero: il confine lo segna il primo del mese.
          primoDelSuoMese && 'mese__cella--apre-mese',
          data === stato.adessoData && 'mese__cella--oggi',
          festivo(data) && 'giorno--festivo',
          apreQui(data) && 'giorno--apre-semestre',
          chiudeQui(data) && 'giorno--chiude-semestre',
          data === stato.data && 'mese__cella--scelta',
          chiusura(data) && 'giorno--chiuso',
        )}
        title={chiusura(data) || undefined}
        role="group"
        tabIndex={0}
        aria-label={formattaData(data, 'lungo')}
        aria-current={data === stato.adessoData ? 'date' : undefined}
        aria-keyshortcuts="Enter Space F2" // testo-fisso: nomi dei tasti per i lettori di schermo
        // Il corso filtrato arriva anche da qui, come negli altri punti in cui si
        // crea un'ora. Solo in modifica.
        onDoubleClick={creaLezione}
        onClick={() => aggiorna({ data })}
        onKeyDown={(evento) => {
          if (evento.target !== evento.currentTarget) return
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            aggiorna({ data })
          } else if (evento.key === 'F2' && inModifica()) {
            evento.preventDefault()
            creaLezione()
          }
        }}
        // Nel mese si sposta di giorno, non di ora: l'ora resta quella. La zona di
        // posa vive fuori dal disegno, con il trascinamento.
        onDragOver={(evento) => {
          if (!trascinata) return
          evento.preventDefault()
          const copia = vuoleCopiare(evento)
          evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
          evento.currentTarget.classList.add('zona-posa')
        }}
        onDragLeave={(evento) => {
          const cellaViva = evento.currentTarget
          if (cellaViva.contains(evento.relatedTarget as Node | null)) return
          cellaViva.classList.remove('zona-posa')
        }}
        onDrop={(evento) => {
          if (!trascinata) return
          evento.preventDefault()
          void posa(trascinata, data, undefined, vuoleCopiare(evento))
        }}
        onContextMenu={(evento) => menuGiorno(evento.nativeEvent, data)}
      >
        <div className="mese__numero">
          {/* Il primo del mese si dice per esteso: segna dove comincia il mese. */}
          {primoDelSuoMese ? `1 ${mesi()[daIso(data).getUTCMonth()].slice(0, 3)}` : String(giornoDelMese(data))}
          {segnoSemestreQui(data)}
          {delGiorno.length > 0
            ? <span className="mese__conteggio">{String(delGiorno.length)}</span>
            : null}
        </div>
        <div className="mese__lezioni">
          {/* I compleanni sopra le ore, o finirebbero sotto il «+2» che tronca l'elenco. */}
          {feste.map((festa) => (
            <ChipCompleanno
              key={`${festa.allievoId}:${festa.classeId}`}
              compleanno={festa}
              inAula={inAula.has(festa.classeId)}
            />
          ))}
          {delGiorno.slice(0, 4).map((lezione) => <ChipLezione key={lezione.id} lezione={lezione} />)}
          {eventiDelGiorno.slice(0, 3).map((evento) => <ChipEvento key={evento.chiave} evento={evento} />)}
        </div>
        {delGiorno.length > 4 ? <div className="mese__altre">{`+${delGiorno.length - 4}`}</div> : null}
        {eventiDelGiorno.length > 3
          // testo-fisso: la sigla ICS, uguale in tutte le lingue
          ? <div className="mese__altre">{`+${eventiDelGiorno.length - 3} ICS`}</div>
          : null}
      </div>
    )
  }

  /** Una settimana intera: la riga di cui è fatta la striscia. */
  const rigaSettimana = (lunedi: Iso): ReactElement => {
    const lettera = letteraDi(lunedi)
    return (
      <div className="mese__settimana" style={{ gridTemplateColumns: colonne }}>
        <button
          className={classi(
            'mese__settimana-numero',
            inizioSettimana(stato.data) === lunedi && 'mese__settimana-numero--scelta',
          )}
          type="button"
          title={[
            t.settimana(settimanaIso(lunedi)),
            lettera && t.settimanaMinuscola(lettera),
            t.aprila,
          ]
            .filter(Boolean)
            .join(' · ')}
          onClick={() => aggiorna({ data: lunedi, modoCalendario: 'settimana' })}
        >
          {String(settimanaIso(lunedi))}
          {/* La lettera della settimana sotto il numero, per controllare l'alternanza. */}
          {lettera ? <span className="mese__settimana-lettera">{lettera}</span> : null}
        </button>
        {settimanaDi(lunedi)
          .filter((data) => visibili.includes(giornoSettimana(data)))
          .map(cella)}
      </div>
    )
  }

  /**
   * I nodi di una settimana: il nome del mese, se ne comincia uno, e la riga. Il
   * cambio di semestre sta nella cella del giorno in cui cade.
   */
  const pezzi = (lunedi: Iso): ReactElement => {
    const apertura = settimanaDi(lunedi).find((data) => giornoDelMese(data) === 1)
    return (
      <Fragment key={lunedi}>
        {apertura ? etichettaMese(apertura) : null}
        {rigaSettimana(lunedi)}
      </Fragment>
    )
  }

  return (
    // Anello della catena di telaio fino alla striscia.
    <div className="mese" data-telaio="mese">
      <div className="mese__intestazione" style={{ gridTemplateColumns: colonne }}>
        <div className="mese__giorno-nome mese__giorno-nome--settimana">{t.sigla}</div>
        {giorniBrevi().map((nome, indice) => (visibili.includes(indice + 1)
          ? <div key={nome} className="mese__giorno-nome">{nome}</div>
          : null))}
      </div>
      <div
        // Cambiando settimana di partenza la striscia è un'altra: nodo nuovo.
        key={ancora}
        ref={striscia}
        className="mese__scorrevole"
        data-telaio="mese-striscia"
        data-scorrimento={`calendario:mese:${ancora}`}
        onScroll={allaRotella}
      >
        {anno && capoSopra ? <div className="mese__capo">{t.cominciaAnno(anno.etichetta)}</div> : null}
        {/* La striscia comincia a metà mese: il nome del mese in cima, che non è di
            nessuna settimana. */}
        {apreUnMese(cima) ? null : etichettaMese(cima, true)}
        {settimane.map(pezzi)}
        {anno && capoSotto ? <div className="mese__capo">{t.finisceAnno(anno.etichetta)}</div> : null}
      </div>
    </div>
  )
}
