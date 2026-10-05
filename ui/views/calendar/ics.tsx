// Il calendario: gli eventi del calendario della scuola (ICS).
// Blocchi, pastiglie e righe d'agenda degli eventi, la scelta con ctrl+clic, il
// loro menu e le divergenze fra registro e calendario. Le viste chiedono qui
// tutto quel che riguarda l'ICS.

import type { MouseEvent as EventoMouse, ReactElement } from 'react'

import { fineLezione, inizioLezione } from '#core/dominio/calculations.js'
import { minutiDaOra } from '#core/dominio/dates.js'
import { eventiDellaStessaLezione } from '#core/dominio/calendar.js'
import type { EventoCalendario } from '#core/dominio/calendarIcs.js'
import { abbina, corsiConfrontabili } from '#core/dominio/calendarRules.js'
import type { AnomalieSettimana } from '#core/dominio/calendarLinks.js'
import type { Iso, Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import {
  anomalieCalendario,
  dicituraEvento,
  eventiEsterni,
  icsInVista,
  lezioneDellEvento,
} from '#ui/externalCalendar.js'
import { moduloEventoIcs, moduloLezione } from '#ui/forms.js'
import { inModifica } from './editor.js'
import { menuContestuale, type ElementoMenu } from '#ui/components/menu.js'
import { lezionePerId, nomeClasseDiLezione, coloreDiLezione, ridisegna, stato } from '#ui/state.js'
import { apriLezione } from './common.js'
import { parole } from '#core/dominio/words.testi.js'
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
function segnoSenzaAbbinamento (evento: EventoCalendario): ReactElement | null {
  if (!senzaAbbinamento(evento)) return null
  return (
    <span className="evento-ics__senza-corso" title={testi().senzaCorsoPerche}>
      <Icona nome="avviso" classe="icona--minuta" />
    </span>
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
export function ancora (lezioneId: string | null, collegato: boolean): {
  'data-ancora'?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
} {
  if (!lezioneId || !collegato) return {}
  // Fuori dal disegno: passare sopra un blocco non merita un ridisegno, e la
  // controparte può stare in un'altra colonna.
  const accendi = (acceso: boolean) => {
    for (const elemento of document.querySelectorAll(`[data-ancora="${CSS.escape(lezioneId)}"]`)) {
      elemento.classList.toggle('ancora--accesa', acceso)
    }
  }
  return {
    'data-ancora': lezioneId,
    onMouseEnter: () => accendi(true),
    onMouseLeave: () => accendi(false),
  }
}

/**
 * La catena su una lezione collegata a eventi ICS, con quanti sono. Nascosta
 * con l'ICS spento nella barra; il collegamento però resta (la lezione non si
 * trascina lo stesso).
 */
export function segnoCollegamento (eventi: readonly EventoCalendario[]): ReactElement | null {
  if (eventi.length === 0 || !icsInVista()) return null
  return (
    <span
      className="segno-ics"
      title={[
        testi().collegataA(eventi.length),
        ...eventi.map((e) => `${e.inizio}–${e.fine} ${e.titolo}`),
      ].join('\n')}
    >
      <Icona nome="collegamento" classe="icona--minuta" />
      {eventi.length > 1 ? String(eventi.length) : null}
    </span>
  )
}

/** Il blocco di un evento nella corsia ICS della settimana. */
export function BloccoEvento ({ evento, minutiPrimaOra, durataFascia }: {
  evento: EventoCalendario
  minutiPrimaOra: number
  durataFascia: number
}): ReactElement {
  const da = minutiDaOra(evento.inizio)
  const minuti = Math.max(1, minutiDaOra(evento.fine) - da)
  const lezione = lezioneDiEvento(evento)
  // In modifica anche l'evento libero è un pulsante: un clic ne fa una lezione.
  const premibile = lezione !== null || inModifica()
  const Tag = premibile ? 'button' : 'div'
  return (
    <Tag
      className={classi(
        'evento-ics',
        lezione ? 'evento-ics--collegato' : 'evento-ics--libero',
        evento.annullato && 'evento-ics--annullato',
        èSceltoIcs(evento) && 'evento-ics--scelto',
        ...classiDivergenza(divergenzaEvento(evento)),
      )}
      type={premibile ? 'button' : undefined}
      style={{
        top: `${((da - minutiPrimaOra) / durataFascia) * 100}%`,
        height: `${(minuti / durataFascia) * 100}%`,
        // Ancorato: prende il colore della sua lezione, sul bordo destro e smorzato
        // (`.evento-ics--collegato`).
        ...(lezione ? { '--colore-ancora': coloreDiLezione(lezione) } : {}),
      }}
      title={dettagliEvento(evento)}
      {...ancora(lezione?.id ?? null, lezione !== null)}
      // Un evento ancorato apre la sua lezione; con ctrl si sceglie; in modifica
      // vedi `cliccaEvento`.
      onClick={(e: EventoMouse) => cliccaEvento(e, evento)}
      onContextMenu={(e: EventoMouse) => menuEvento(e, evento)}
    >
      <span className="evento-ics__testata">
        <span className="evento-ics__ora">{evento.inizio}</span>
        {segnoSenzaAbbinamento(evento)}
        {lezione
          ? <span className="evento-ics__ancora"><Icona nome="collegamento" classe="icona--minuta" /></span>
          : <span className="evento-ics__ancora evento-ics__ancora--libero">{testi().libero}</span>}
      </span>
      <span className="evento-ics__titolo">{evento.titolo || testi().senzaTitolo}</span>
      {evento.luogo ? <span className="evento-ics__luogo">{evento.luogo}</span> : null}
    </Tag>
  )
}

/** La pastiglia di un evento nelle celle del mese. */
export function ChipEvento ({ evento }: { evento: EventoCalendario }): ReactElement {
  const lezione = lezioneDiEvento(evento)
  return (
    <div
      className={classi(
        'chip',
        'chip--ics',
        lezione && 'chip--ics-collegato',
        evento.annullato && 'chip--annullata',
        èSceltoIcs(evento) && 'chip--ics-scelto',
        ...classiDivergenza(divergenzaEvento(evento)),
      )}
      style={lezione ? { borderLeftColor: coloreDiLezione(lezione) } : {}}
      title={dettagliEvento(evento)}
      {...ancora(lezione?.id ?? null, lezione !== null)}
      onClick={(e) => void scegliEvento(e, evento)}
      onContextMenu={(e) => menuEvento(e, evento)}
    >
      <span className="chip__ora">{evento.inizio}</span>
      <span className="chip__testo">{evento.titolo || testi().senzaTitolo}</span>
      {lezione ? <Icona nome="collegamento" classe="icona--minuta" /> : segnoSenzaAbbinamento(evento)}
    </div>
  )
}

/** La riga di un evento nell'agenda. */
export function VoceEvento ({ evento }: { evento: EventoCalendario }): ReactElement {
  const lezione = lezioneDiEvento(evento)
  const t = testi()
  return (
    <div
      className={classi(
        'agenda__voce',
        'agenda__voce--ics',
        lezione && 'agenda__voce--ics-collegata',
        evento.annullato && 'agenda__voce--annullata',
        èSceltoIcs(evento) && 'agenda__voce--ics-scelta',
        ...classiDivergenza(divergenzaEvento(evento)),
      )}
      title={dettagliEvento(evento)}
      {...ancora(lezione?.id ?? null, lezione !== null)}
      onClick={(e) => void scegliEvento(e, evento)}
      onContextMenu={(e) => menuEvento(e, evento)}
    >
      <span className="agenda__orario">{`${evento.inizio}–${evento.fine}`}</span>
      {lezione
        ? <span className="segno-ics"><Icona nome="collegamento" classe="icona--minuta" /></span>
        : <span className="evento-ics__ancora--libero">{segnoSenzaAbbinamento(evento)}{t.libero}</span>}
      <span className="agenda__testo">
        <span>{evento.titolo || t.senzaTitolo}</span>
        {evento.luogo ? <span className="agenda__materia">{evento.luogo}</span> : null}
      </span>
      <span className="agenda__coda">
        {/* testo-fisso: la sigla ICS, uguale in tutte le lingue */}
        <Pastiglia testo="ICS" tono="quiete" />
        {evento.annullato ? <Pastiglia testo={t.annullato} tono="negativo" /> : null}
      </span>
    </div>
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
function scegliEvento (mouse: EventoMouse, evento: EventoCalendario): boolean {
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
  ridisegna()
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
function cliccaEvento (mouse: EventoMouse, evento: EventoCalendario): void {
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
function menuEvento (mouse: EventoMouse, evento: EventoCalendario): void {
  // Il menu della cella sotto (il mese) non deve aprirsi al posto di questo.
  mouse.stopPropagation()
  const scelti = èSceltoIcs(evento) ? eventiEsterni(evento.data).filter(èSceltoIcs) : []
  const gruppo = gruppoDellEvento(evento)
  const tuttiCollegati = gruppo.every((e) => lezioneDiEvento(e) !== null)
  const lezione = lezioneDiEvento(evento)
  const collegato = lezione !== null
  const t = testi()
  menuContestuale(mouse.nativeEvent, [
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
            ridisegna()
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
