// Il calendario: gli eventi del calendario della scuola (ICS).
// Blocchi, pastiglie e righe d'agenda degli eventi, la scelta con ctrl+clic, il
// loro menu e le divergenze fra registro e calendario. Le viste chiedono qui
// tutto quel che riguarda l'ICS.

import { fineLezione, inizioLezione } from '../../../domain/calculations.js'
import { minutiDaOra } from '../../../domain/dates.js'
import { eventiDellaStessaLezione } from '../../../domain/calendar.js'
import type { EventoCalendario } from '../../../domain/calendarIcs.js'
import { abbina, corsiConfrontabili } from '../../../domain/calendarRules.js'
import type { AnomalieSettimana } from '../../../domain/calendarLinks.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { pastiglia } from '../../components/base.js'
import { icona } from '../../components/icons.js'
import { h, type Figlio } from '../../dom.js'
import {
  anomalieCalendario,
  dicituraEvento,
  eventiEsterni,
  icsInVista,
  lezioneDellEvento,
} from '../../externalCalendar.js'
import { moduloEventoIcs, moduloLezione } from '../../forms.js'
import { inModifica } from './editor.js'
import { menuContestuale, type ElementoMenu } from '../../components/menu.js'
import { aggiorna, lezionePerId, nomeClasseDiLezione, coloreDiLezione, stato } from '../../state.js'
import { apriLezione } from './common.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './ics.testi.js'

// ------------------------------------------------------------------ calendario ICS

/*
 * Gli eventi ICS accanto alle ore del registro: tratteggiati, grigi, non si
 * aprono e non si trascinano. Nella settimana stanno in una corsia a destra
 * della colonna, fianco a fianco con le ore. Farne lezioni è il lavoro di
 * «Confronta con il calendario».
 */

/** Il suggerimento di un evento: quando, che cosa, dove, e a che lezione è ancorato. */
function dettagliEvento (evento: EventoCalendario): string {
  const lezione = lezioneDiEvento(evento)
  const t = testi()
  const orario = lezione ? `${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}` : ''
  return [
    t.dalCalendario(evento.inizio, evento.fine),
    evento.titolo,
    evento.luogo,
    evento.annullato ? t.annullato : '',
    senzaAbbinamento(evento) ? t.senzaCorso : '',
    lezione ? t.collegatoA(`${nomeClasseDiLezione(lezione)} ${orario}`) : t.nonCollegato,
  ].filter(Boolean).join('\n')
}

/**
 * Gli eventi che nessuna prova attribuisce a un corso (regola, nome della
 * classe, orario, ora a calendario), esclusi quelli che una regola ignora.
 * Calcolati evento per evento e ricordati finché il registro è lo stesso.
 */
let senzaCorso: { registro: typeof stato.registro, perChiave: Map<string, boolean> } | null = null

function senzaAbbinamento (evento: EventoCalendario): boolean {
  if (senzaCorso?.registro !== stato.registro) {
    senzaCorso = { registro: stato.registro, perChiave: new Map() }
  }
  let esito = senzaCorso.perChiave.get(evento.chiave)
  if (esito === undefined) {
    const registro = stato.registro
    const { corsoId, ignorato } = abbina(
      registro,
      evento,
      registro.impostazioni.calendario?.regole ?? [],
      corsiConfrontabili(registro),
    )
    esito = !corsoId && !ignorato
    senzaCorso.perChiave.set(evento.chiave, esito)
  }
  return esito
}

/** Il segno di un evento che non si sa di che corso sia: tasto destro, «Abbina a un corso…». */
function segnoSenzaAbbinamento (evento: EventoCalendario): HTMLElement | null {
  if (!senzaAbbinamento(evento)) return null
  return h(
    'span',
    {
      class: 'evento-ics__senza-corso',
      attr: { title: testi().senzaCorsoPerche },
    },
    icona('avviso', 'icona--minuta'),
  )
}

/** La lezione del registro su cui l'evento è ancorato, se c'è ancora. */
function lezioneDiEvento (evento: EventoCalendario): Lezione | null {
  const id = lezioneDellEvento(evento)
  return lezionePerId(id)
}

/*
 * L'ancora fra una lezione e i suoi eventi: lo stesso `data-ancora` (l'id della
 * lezione), e passando sopra l'uno si accende l'altro. La catena dice che il
 * collegamento c'è, il numero quanti eventi ci cadono sopra.
 */

/** Gli attributi che legano un elemento alla sua ancora e ne accendono la controparte. */
export function ancora (lezioneId: string | null, collegato: boolean) {
  if (!lezioneId || !collegato) return {}
  const accendi = (acceso: boolean) => {
    for (const elemento of document.querySelectorAll(`[data-ancora="${CSS.escape(lezioneId)}"]`)) {
      elemento.classList.toggle('ancora--accesa', acceso)
    }
  }
  return {
    dataset: { ancora: lezioneId },
    onmouseenter: () => accendi(true),
    onmouseleave: () => accendi(false),
  }
}

/**
 * La catena su una lezione collegata a eventi ICS, con quanti sono. Nascosta
 * con l'ICS spento nella barra; il collegamento però resta (la lezione non si
 * trascina lo stesso).
 */
export function segnoCollegamento (eventi: readonly EventoCalendario[]): Figlio {
  if (eventi.length === 0 || !icsInVista()) return null
  return h(
    'span',
    {
      class: 'segno-ics',
      attr: {
        title: [
          testi().collegataA(eventi.length),
          ...eventi.map((e) => `${e.inizio}–${e.fine} ${e.titolo}`),
        ].join('\n'),
      },
    },
    icona('collegamento', 'icona--minuta'),
    eventi.length > 1 ? String(eventi.length) : null,
  )
}

/** Il blocco di un evento nella corsia ICS della settimana. */
export function bloccoEvento (
  evento: EventoCalendario,
  minutiPrimaOra: number,
  durataFascia: number,
): HTMLElement {
  const da = minutiDaOra(evento.inizio)
  const minuti = Math.max(1, minutiDaOra(evento.fine) - da)
  const lezione = lezioneDiEvento(evento)
  // In modifica anche l'evento libero è un pulsante: un clic ne fa una lezione.
  const premibile = lezione !== null || inModifica()
  return h(
    premibile ? 'button' : 'div',
    {
      class: [
        'evento-ics',
        lezione ? 'evento-ics--collegato' : 'evento-ics--libero',
        evento.annullato && 'evento-ics--annullato',
        èSceltoIcs(evento) && 'evento-ics--scelto',
        ...classiDivergenza(divergenzaEvento(evento)),
      ],
      type: premibile ? 'button' : null,
      style: {
        top: `${((da - minutiPrimaOra) / durataFascia) * 100}%`,
        height: `${(minuti / durataFascia) * 100}%`,
        // Ancorato: prende il colore della sua lezione, sul bordo destro e smorzato
        // (`.evento-ics--collegato`).
        ...(lezione ? { '--colore-ancora': coloreDiLezione(lezione) } : {}),
      },
      attr: { title: dettagliEvento(evento) },
      ...ancora(lezione?.id ?? null, lezione !== null),
      // Un evento ancorato apre la sua lezione; con ctrl si sceglie; in modifica
      // vedi `cliccaEvento`.
      onclick: (e: MouseEvent) => cliccaEvento(e, evento),
      oncontextmenu: (e: MouseEvent) => menuEvento(e, evento),
    },
    h(
      'span',
      { class: 'evento-ics__testata' },
      h('span', { class: 'evento-ics__ora' }, evento.inizio),
      segnoSenzaAbbinamento(evento),
      lezione
        ? h('span', { class: 'evento-ics__ancora' }, icona('collegamento', 'icona--minuta'))
        : h('span', { class: 'evento-ics__ancora evento-ics__ancora--libero' }, testi().libero),
    ),
    h('span', { class: 'evento-ics__titolo' }, evento.titolo || testi().senzaTitolo),
    evento.luogo ? h('span', { class: 'evento-ics__luogo' }, evento.luogo) : null,
  )
}

/** La pastiglia di un evento nelle celle del mese. */
export function chipEvento (evento: EventoCalendario): HTMLElement {
  const lezione = lezioneDiEvento(evento)
  return h(
    'div',
    {
      class: [
        'chip',
        'chip--ics',
        lezione && 'chip--ics-collegato',
        evento.annullato && 'chip--annullata',
        èSceltoIcs(evento) && 'chip--ics-scelto',
        ...classiDivergenza(divergenzaEvento(evento)),
      ],
      style: lezione ? { borderLeftColor: coloreDiLezione(lezione) } : {},
      attr: { title: dettagliEvento(evento) },
      ...ancora(lezione?.id ?? null, lezione !== null),
      onclick: (e: MouseEvent) => void scegliEvento(e, evento),
      oncontextmenu: (e: MouseEvent) => menuEvento(e, evento),
    },
    h('span', { class: 'chip__ora' }, evento.inizio),
    h('span', { class: 'chip__testo' }, evento.titolo || testi().senzaTitolo),
    lezione ? icona('collegamento', 'icona--minuta') : segnoSenzaAbbinamento(evento),
  )
}

/** La riga di un evento nell'agenda. */
export function voceEvento (evento: EventoCalendario): HTMLElement {
  const lezione = lezioneDiEvento(evento)
  const t = testi()
  return h(
    'div',
    {
      class: [
        'agenda__voce',
        'agenda__voce--ics',
        lezione && 'agenda__voce--ics-collegata',
        evento.annullato && 'agenda__voce--annullata',
        èSceltoIcs(evento) && 'agenda__voce--ics-scelta',
        ...classiDivergenza(divergenzaEvento(evento)),
      ],
      attr: { title: dettagliEvento(evento) },
      ...ancora(lezione?.id ?? null, lezione !== null),
      onclick: (e: MouseEvent) => void scegliEvento(e, evento),
      oncontextmenu: (e: MouseEvent) => menuEvento(e, evento),
    },
    h('span', { class: 'agenda__orario' }, `${evento.inizio}–${evento.fine}`),
    lezione
      ? h('span', { class: 'segno-ics' }, icona('collegamento', 'icona--minuta'))
      : h('span', { class: 'evento-ics__ancora--libero' }, segnoSenzaAbbinamento(evento), t.libero),
    h(
      'span',
      { class: 'agenda__testo' },
      h('span', null, evento.titolo || t.senzaTitolo),
      evento.luogo ? h('span', { class: 'agenda__materia' }, evento.luogo) : null,
    ),
    h(
      'span',
      { class: 'agenda__coda' },
      pastiglia('ICS', 'quiete'),
      evento.annullato ? pastiglia(t.annullato, 'negativo') : null,
    ),
  )
}

/*
 * Gli eventi ICS scelti con ctrl+clic, per farne una lezione sola quando il
 * gruppo riconosciuto dal registro (stesso titolo, pausa corta) non basta.
 * Sempre dentro un giorno: un evento di un altro giorno ricomincia la scelta.
 */
const sceltiIcs: { data: Iso | null, chiavi: Set<string> } = { data: null, chiavi: new Set() }

function togliSceltaIcs (): void {
  sceltiIcs.data = null
  sceltiIcs.chiavi.clear()
}

/** Il ctrl+clic su un evento: lo aggiunge alla scelta, o lo toglie. Vero se era un ctrl+clic. */
function scegliEvento (mouse: MouseEvent, evento: EventoCalendario): boolean {
  if (!mouse.ctrlKey && !mouse.metaKey) return false
  mouse.preventDefault()
  mouse.stopPropagation()
  if (sceltiIcs.data !== evento.data) {
    togliSceltaIcs()
    sceltiIcs.data = evento.data
  }
  if (sceltiIcs.chiavi.has(evento.chiave)) sceltiIcs.chiavi.delete(evento.chiave)
  else sceltiIcs.chiavi.add(evento.chiave)
  if (sceltiIcs.chiavi.size === 0) togliSceltaIcs()
  aggiorna({})
  return true
}

function èSceltoIcs (evento: EventoCalendario): boolean {
  return sceltiIcs.data === evento.data && sceltiIcs.chiavi.has(evento.chiave)
}

/**
 * Gli eventi da cui nasce una lezione sola: quelli scelti con ctrl+clic, se
 * l'evento è fra loro, altrimenti il gruppo che il registro riconosce da sé.
 */
function gruppoDellEvento (evento: EventoCalendario): EventoCalendario[] {
  const delGiorno = eventiEsterni(evento.data)
  const scelti = èSceltoIcs(evento) ? delGiorno.filter(èSceltoIcs) : []
  return scelti.length > 0 ? scelti : eventiDellaStessaLezione(delGiorno, evento, dicituraEvento)
}

/**
 * Il clic su un evento. Guardando, un evento ancorato apre la sua lezione. In
 * modifica un evento libero apre «Genera la lezione» (la regola che ne nasce
 * riconosce gli eventi simili), uno ancorato il modulo della sua lezione.
 */
function cliccaEvento (mouse: MouseEvent, evento: EventoCalendario): void {
  if (scegliEvento(mouse, evento)) return
  const lezione = lezioneDiEvento(evento)
  if (!inModifica()) {
    if (lezione) apriLezione(lezione)
    return
  }
  if (lezione) {
    moduloLezione({ lezione })
    return
  }
  moduloEventoIcs({ evento, gruppo: gruppoDellEvento(evento), modo: 'genera', dopo: togliSceltaIcs })
}

/**
 * Il menu di un evento ICS: abbinamenti e lezione da generare; il resto si fa
 * sul blocco della lezione. La lezione nasce dagli eventi scelti, se l'evento
 * è fra loro, o dal gruppo riconosciuto; le pause fra eventi diventano fasce di pausa.
 */
function menuEvento (mouse: MouseEvent, evento: EventoCalendario): void {
  const scelti = èSceltoIcs(evento) ? eventiEsterni(evento.data).filter(èSceltoIcs) : []
  const gruppo = gruppoDellEvento(evento)
  const tuttiCollegati = gruppo.every((e) => lezioneDiEvento(e) !== null)
  const lezione = lezioneDiEvento(evento)
  const collegato = lezione !== null
  const t = testi()
  menuContestuale(mouse, [
    { titolo: scelti.length > 1 ? t.scelti(scelti.length) : t.evento },
    // La lezione abbinata, a portata di mano.
    ...(lezione
      ? [
        { testo: t.apriLezione, simbolo: 'destra', al: () => apriLezione(lezione) },
        {
          testo: t.modificaLezione,
          simbolo: 'matita',
          disabilitato: !stato.editorCalendario,
          titolo: stato.editorCalendario ? undefined : t.accendiModifica(parole().modifica),
          al: () => moduloLezione({ lezione }),
        },
        'separatore',
      ] satisfies ElementoMenu[]
      : []),
    tuttiCollegati
      ? 'separatore'
      : {
          testo: scelti.length > 1 ? t.generaDai(scelti.length) : t.generaDa,
          simbolo: 'piu',
          al: () => moduloEventoIcs({ evento, gruppo, modo: 'genera', dopo: togliSceltaIcs }),
        },
    {
      testo: collegato ? t.cambiaAbbinamento : t.abbina,
      simbolo: 'collegamento',
      al: () => moduloEventoIcs({ evento, gruppo, modo: 'abbina' }),
    },
    sceltiIcs.chiavi.size > 0
      ? {
          testo: t.togliScelta,
          simbolo: 'chiudi',
          al: () => {
            togliSceltaIcs()
            aggiorna({})
          },
        }
      : 'separatore',
  ])
}

/*
 * I tre modi in cui una settimana non torna col calendario ICS, con simboli
 * leggibili anche senza colore: «+» solo nel calendario, «−» solo nel registro,
 * «?» abbinati per indizio e non per regola.
 */
// Le parole dal catalogo al caricamento: al cambio di lingua la pagina si ricarica.
const segni = testi().segni

export const SEGNI_ICS = [
  { tipo: 'evento', simbolo: '+', ...segni.evento },
  { tipo: 'lezione', simbolo: '−', ...segni.lezione },
  { tipo: 'regola', simbolo: '?', ...segni.regola },
] as const

/** I segni di una settimana, con la frase che li conta. */
type SegnoIcs = (typeof SEGNI_ICS)[number] & { frase: string }

export function segniAnomalie (guasti: AnomalieSettimana): SegnoIcs[] {
  const quanti = {
    evento: guasti.eventiSenzaLezione.length,
    lezione: guasti.lezioniSenzaEvento.length,
    regola: guasti.lezioniSenzaRegola.length,
  }
  const t = testi()
  const frasi = {
    evento: t.eventiSenzaLezione(quanti.evento),
    lezione: t.lezioniSenzaEvento(quanti.lezione),
    regola: t.lezioniSenzaRegola(quanti.regola),
  }
  return SEGNI_ICS.filter((s) => quanti[s.tipo] > 0).map((s) => ({ ...s, frase: frasi[s.tipo] }))
}

/*
 * La divergenza anche sul box: aperta la settimana, il box che non torna
 * prende il colore del suo segno e il suggerimento dice perché. Solo con
 * «Calendario ICS» acceso.
 */

type Divergenza = (typeof SEGNI_ICS)[number]['tipo']

let divergenze: {
  da: Map<Iso, AnomalieSettimana>
  lezioni: Map<string, Divergenza>
  eventi: Set<string>
} | null = null

/** Le divergenze per lezione e per evento, rifatte solo quando cambiano le anomalie. */
function tabellaDivergenze (): typeof divergenze {
  if (!icsInVista()) return null
  const anomalie = anomalieCalendario()
  if (!anomalie) return null
  if (divergenze?.da !== anomalie) {
    const lezioni = new Map<string, Divergenza>()
    const eventi = new Set<string>()
    for (const settimana of anomalie.values()) {
      for (const l of settimana.lezioniSenzaEvento) lezioni.set(l.id, 'lezione')
      for (const l of settimana.lezioniSenzaRegola) lezioni.set(l.id, 'regola')
      for (const e of settimana.eventiSenzaLezione) eventi.add(e.chiave)
    }
    divergenze = { da: anomalie, lezioni, eventi }
  }
  return divergenze
}

export function divergenzaLezione (lezioneId: string): Divergenza | null {
  return tabellaDivergenze()?.lezioni.get(lezioneId) ?? null
}

function divergenzaEvento (evento: EventoCalendario): Divergenza | null {
  return tabellaDivergenze()?.eventi.has(evento.chiave) ? 'evento' : null
}

export function classiDivergenza (tipo: Divergenza | null): string[] {
  // testo-fisso: classi CSS
  return tipo ? ['ics-divergente', `ics-divergente--${tipo}`] : []
}

/** Il suggerimento con in fondo il perché della divergenza, se c'è. */
export function conDivergenza (titolo: string, tipo: Divergenza | null): string {
  const segno = SEGNI_ICS.find((s) => s.tipo === tipo)
  if (!segno) return titolo
  return [titolo, `${segno.simbolo} ${segno.spiegazione}`].filter(Boolean).join('\n')
}
