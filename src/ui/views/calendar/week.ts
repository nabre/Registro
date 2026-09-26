// Il calendario: la settimana, la vista di lavoro. La griglia delle ore com'è
// davvero, pause comprese, con la fascia oraria e il salto all'ora di adesso.

import { inizioSullaGriglia, lineeDellaGiornata } from '../../../domain/breaks.js'
import { fineLezione, inizioLezione, lezioniDelGiorno } from '../../../domain/calculations.js'
import {
  giorniBrevi,
  giornoDelMese,
  giornoSettimana,
  minutiDaOra,
  oggi,
  oraDaMinuti,
  settimanaDi,
  settimanaIso,
} from '../../../domain/dates.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { h } from '../../dom.js'
import { finestraSettimana } from '../../calendarNavigation.js'
import { eventiEsterni } from '../../externalCalendar.js'
import { aggiorna, compleanniDi, lezioniInAgenda, stato } from '../../state.js'
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
import { bloccoEvento } from './ics.js'
import { classiInAula, qualcunoInAula, segnoCompleanni } from './birthdays.js'
import { strisciaSettimane } from './weekStrip.js'
import { disegnaLezione, inModifica, ricordaFascia } from './editor.js'
import { bloccoLezione } from './lessonBlock.js'
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
export function vistaSettimana (): HTMLElement {
  const t = testi()
  const giorni = settimanaDi(stato.data).filter((data) =>
    giorniVisibili().includes(giornoSettimana(data)),
  )
  const lezioni = lezioniInAgenda()
  const { primaOra, ultimaOra, scala } = fasciaSettimana(giorni, lezioni)
  ricordaFascia({ primaOra, ultimaOra })
  const altezza = Math.max(240, (ultimaOra - primaOra) * scala)

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

  const settimana = h(
    'div',
    { class: 'settimana' },
    strisciaSettimane(),
    h(
      'div',
      { class: 'settimana__intestazione' },
      h(
        'div',
        { class: 'settimana__angolo' },
        h('span', null, t.siglaNumero(settimanaIso(stato.data))),
        letteraDi(stato.data)
          ? h(
              'span',
              {
                class: 'settimana__lettera',
                attr: { title: t.letteraSiCambia },
              },
              letteraDi(stato.data) as string,
            )
          : null,
      ),
      ...giorni.map((data) =>
        h(
          'div',
          {
            class: [
              'settimana__giorno',
              data === oggi() && 'settimana__giorno--oggi',
              festivo(data) && 'giorno--festivo',
              chiusura(data) && 'giorno--chiuso',
              apreQui(data) && 'giorno--apre-semestre',
              chiudeQui(data) && 'giorno--chiude-semestre',
            ],
            attr: { title: chiusura(data) || null },
            onclick: () => aggiorna({ data }),
          },
          h('span', { class: 'settimana__giorno-nome' }, giorniBrevi()[giornoSettimana(data) - 1]),
          h('span', { class: 'settimana__giorno-numero' }, String(giornoDelMese(data))),
          segnoSemestreQui(data, 'settimana__semestre'),
          (() => {
            const feste = compleanniDi(data)
            return segnoCompleanni(feste, qualcunoInAula(feste, classiInAula(lezioni, data)))
          })(),
        ),
      ),
    ),
    h(
      'div',
      // Qui si scorre l'ora del giorno: la chiave è fissa, così passando alla
      // settimana dopo si resta sulla stessa ora. Il mese ha un meccanismo suo
      // (`finestraMese`).
      { class: 'settimana__scorrevole', dataset: { scorrimento: 'calendario:settimana' } },
      h(
        'div',
        // `min-height` in pixel è il pavimento; sopra comanda `height: 100%` del foglio
        // di stile, e i blocchi in percentuale seguono.
        // testo-fisso: una misura CSS
        { class: 'settimana__corpo', style: { minHeight: `${altezza}px` } },
        h(
          'div',
          { class: 'settimana__ore' },
          ...righe.map((minuto) =>
            h(
              'div',
              {
                // L'etichetta sta a cavallo della sua riga; sui due bordi della fascia si
                // appoggia dalla parte di dentro, per non essere tagliata.
                class: [
                  'settimana__ora',
                  minuto === primaOra && 'settimana__ora--prima',
                  minuto === ultimaOra && 'settimana__ora--ultima',
                ],
                style: { top: alto(minuto) },
              },
              oraDaMinuti(minuto),
            ),
          ),
        ),
        ...giorni.map((data) => {
        /** L'ora su cui cade il puntatore dentro questa colonna. */
          const oraSotto = (colonna: HTMLElement, clientY: number, passo: number): number => {
            const riquadro = colonna.getBoundingClientRect()
            // Dalla frazione di colonna e non da una scala in pixel: la colonna si allunga
            // con la finestra.
            const frazione = riquadro.height > 0 ? (clientY - riquadro.top) / riquadro.height : 0
            const grezzi = primaOra + frazione * (ultimaOra - primaOra)
            const minuti = Math.round(grezzi / passo) * passo
            return Math.max(primaOra, Math.min(minuti, ultimaOra - 5))
          }

          return h(
            'div',
            {
              class: [
                'settimana__colonna',
                eventiEsterni(data).length > 0 && 'settimana__colonna--ics',
                data === oggi() && 'settimana__colonna--oggi',
                festivo(data) && 'giorno--festivo',
                apreQui(data) && 'giorno--apre-semestre',
                chiudeQui(data) && 'giorno--chiude-semestre',
              ],
              // In modifica, premere e tirare sul vuoto disegna una lezione (clic secco:
              // durata predefinita). Fuori dalla modifica il calendario si guarda.
              onpointerdown: (evento: PointerEvent) => {
                if (!inModifica()) return
                const colonna = evento.currentTarget as HTMLElement
                disegnaLezione(evento, colonna, data, { primaOra, ultimaOra })
              },
              // La colonna è la zona di posa: mostra dove finirebbe il blocco.
              ondragover: (evento: DragEvent) => {
                if (!trascinata) return
                evento.preventDefault()
                const colonna = evento.currentTarget as HTMLElement
                const copia = vuoleCopiare(evento)
                if (evento.dataTransfer) evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
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
              },
              ondragleave: (evento: DragEvent) => {
                const colonna = evento.currentTarget as HTMLElement
                // `dragleave` scatta anche sui figli: si sgombra solo uscendo dalla colonna.
                if (colonna.contains(evento.relatedTarget as Node | null)) return
                colonna.classList.remove('zona-posa')
                colonna.querySelector('.settimana__guida')?.remove()
              },
              ondrop: (evento: DragEvent) => {
                if (!trascinata) return
                evento.preventDefault()
                const colonna = evento.currentTarget as HTMLElement
                const minuti = oraSotto(colonna, evento.clientY, AGGANCIO_MINUTI)
                void posa(trascinata, data, oraDaMinuti(minuti), vuoleCopiare(evento))
              },
              // Sul vuoto il tasto destro propone l'ora su cui è caduto.
              oncontextmenu: (evento: MouseEvent) => {
                const colonna = evento.currentTarget as HTMLElement
                if (evento.target !== colonna) return
                menuGiorno(evento, data, oraSotto(colonna, evento.clientY, 15))
              },
            },
            ...righe.map((minuto) =>
              h('div', {
                class: 'settimana__riga-ora',
                style: { top: alto(minuto) },
              }),
            ),
            // La riga di adesso, solo nella colonna di oggi; si muove con l'orologio dello stato.
            data === stato.adessoData &&
          minutiDaOra(stato.adessoOra) >= primaOra &&
          minutiDaOra(stato.adessoOra) <= ultimaOra
              ? h('div', {
                  class: 'settimana__adesso',
                  attr: { title: t.adesso(stato.adessoOra) },
                  style: {
                    top: `${((minutiDaOra(stato.adessoOra) - primaOra) / (ultimaOra - primaOra)) * 100}%`,
                  },
                })
              : null,
            ...lezioniDelGiorno(lezioni, data).map((lezione) =>
              bloccoLezione(lezione, primaOra, ultimaOra - primaOra, scala),
            ),
            ...eventiEsterni(data).map((evento) =>
              bloccoEvento(evento, primaOra, ultimaOra - primaOra),
            ),
          )
        }),
      ),
    ),
  )

  // «Oggi» porta anche all'ora di adesso, dopo il disegno: sostituisce una volta
  // lo scorrimento ricordato.
  if (finestraSettimana.versoAdesso) {
    finestraSettimana.versoAdesso = false
    requestAnimationFrame(() => portaAdAdesso(settimana, primaOra, ultimaOra))
  }
  return settimana
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
