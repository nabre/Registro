// I calendari ICS del documento, accanto alle lezioni. Gli eventi arrivano da
// `calendario.eventi` per tutto l'anno e restano in memoria finché non cambiano
// i calendari o l'anno (la vista si ridisegna a ogni spunta). Li chiede
// l'iscritto allo stato, non il disegno, che legge soltanto. La chiave di un
// evento porta davanti l'id del suo calendario, così due calendari con lo
// stesso UID restano due eventi. File a sé perché lo leggono la vista e
// `commands.ts`.
//
// Le lezioni collegate per certo a un evento si allineano da sole, dal
// calendario e in una scrittura (`allineaCollegate`): inizio, fine e aula li
// detta il calendario della scuola (`ancorataAIcs`). Solo per collegamenti
// certi e lezioni non ancora fatte (il criterio è in `domain/calendar.ts`); il
// resto, e le ore annullate, restano proposte del confronto.

import type { EventoCalendario } from '../../core/dominio/calendarIcs.js'
import { abbina, corsiConfrontabili, dicituraDi } from '../../core/dominio/calendarRules.js'
import {
  anomaliePerSettimana,
  collegaEventi,
  type AnomalieSettimana,
  type Collegamenti,
} from '../../core/dominio/calendarLinks.js'
import {
  allineamentiAutomatici,
  allineamentoAutomatico,
  collegataPerCerto,
  type AllineamentoDaCalendario,
} from '../../core/dominio/calendar.js'
import { oggi } from '../../core/dominio/dates.js'
import type { Iso, Registro } from '../../core/dominio/models.js'
import { azione, chiedi, invia } from './bridge.js'
import { notifica } from './components/notifications.js'
import { risorse } from './risorse.js'
import { aggiorna, annoCorrente, iscriviti, stato } from './state.js'
import { testi } from './externalCalendar.testi.js'

interface Richiesta {
  chiave: string
  dal: Iso
  al: Iso
}

interface Letti {
  tutti: EventoCalendario[]
  perGiorno: Map<Iso, EventoCalendario[]>
  /** La frase del guasto, se la lettura non è riuscita: si dice, e non si riprova da sola. */
  errore: string | null
}

/**
 * Le letture per chiave (`risorse.ts`): vuoto, in volo, pronto, errore. Il
 * disegno legge soltanto (ADR-06: il pannello disegna senza chiedere
 * all'host); una chiave mai letta parte al più in un microtask dopo. Di solito
 * la fa partire prima l'iscritto allo stato, all'ingresso nella vista.
 */
const letture = risorse<Letti>(4)

/**
 * Le viste che leggono gli eventi: il calendario e la scheda delle regole
 * nelle impostazioni. Entrandoci la lettura parte prima del disegno.
 */
const VISTE_CON_EVENTI: ReadonlySet<string> = new Set(['calendario', 'impostazioni'])

/**
 * Che cosa andrebbe letto adesso, o `null`. La chiave porta il momento della
 * copia di ogni calendario: una copia rifatta con «Aggiorna» va riletta.
 */
function richiesta (): Richiesta | null {
  const calendari = stato.registro.impostazioni.calendario?.calendari ?? []
  const anno = annoCorrente()
  if (calendari.length === 0 || !anno) return null
  const quali = calendari.map((c) => `${c.id}@${c.copiatoIl ?? ''}`).join(',')
  return { chiave: `${quali}|${anno.inizio}|${anno.fine}`, dal: anno.inizio, al: anno.fine }
}

const NESSUN_EVENTO: EventoCalendario[] = []

/** Gli eventi letti per la chiave di adesso, o `null` se non ci sono ancora. */
function letti (): Letti | null {
  const voluta = richiesta()
  if (!voluta) return null
  const voce = letture.leggi(voluta.chiave, () => carica(voluta))
  if (voce.stato === 'pronto') return voce.valore
  if (voce.stato === 'errore') {
    return { tutti: NESSUN_EVENTO, perGiorno: new Map(), errore: voce.errore || testi().nonSiLegge }
  }
  return null
}

async function carica (voluta: Richiesta): Promise<Letti> {
  const esito = await chiedi<{
    eventi: EventoCalendario[]
    guasti: Array<{ nome: string, motivo: string }>
  }>('calendario.eventi', { dal: voluta.dal, al: voluta.al })
  const perGiorno = new Map<Iso, EventoCalendario[]>()
  for (const evento of esito.dati?.eventi ?? []) {
    const gruppo = perGiorno.get(evento.data) ?? []
    gruppo.push(evento)
    perGiorno.set(evento.data, gruppo)
  }
  // Un calendario che non si legge non spegne gli altri: la frase lo nomina.
  const guasti = (esito.dati?.guasti ?? []).map((g) => testi().guasto(g.nome, g.motivo))
  return {
    tutti: esito.dati?.eventi ?? [],
    perGiorno,
    errore: esito.ok
      ? (guasti.length > 0 ? guasti.join(' ') : null)
      : esito.errori.join(' ') || testi().nonSiLegge,
  }
}

/**
 * L'iscritto allo stato: fa partire la lettura all'ingresso in una vista che
 * legge gli eventi o quando cambia la chiave (anno, calendari, copia nuova), e
 * l'allineamento quando cambiano registro o eventi. Mai dal disegno: una
 * scrittura a metà ridisegno ne farebbe partire un altro.
 */
function allaModifica (): void {
  const voluta = richiesta()
  if (voluta && VISTE_CON_EVENTI.has(stato.vista)) {
    letture.avvia(voluta.chiave, () => carica(voluta))
  }
  forseAllinea()
}

iscriviti(allaModifica)

/**
 * Se il calendario ICS si vede adesso: interruttore acceso, calendario in
 * modifica e vista settimanale. Chi disegna qualcosa dell'ICS chiede questo, non
 * l'interruttore. L'ancoraggio delle lezioni vale invece sempre: dipende
 * dall'orario, non da che cosa si guarda.
 */
export function icsInVista (): boolean {
  return (
    stato.mostraCalendarioEsterno &&
    stato.editorCalendario &&
    stato.modoCalendario === 'settimana'
  )
}

/** Se c'è un calendario ICS da mostrare: almeno uno nel documento, e un anno in uso. */
export function haCalendarioEsterno (): boolean {
  return richiesta() !== null
}

/**
 * Gli eventi di un giorno in ordine d'ora. Se mancano si risponde vuoto:
 * all'arrivo la vista si ridisegna.
 */
export function eventiEsterni (data: Iso): EventoCalendario[] {
  if (!icsInVista()) return []
  return letti()?.perGiorno.get(data) ?? []
}

/**
 * I collegamenti fra eventi e lezioni, rifatti solo quando cambiano registro
 * (un oggetto nuovo a ogni modifica) o eventi.
 */
let collegati: { registro: Registro, eventi: EventoCalendario[], esito: Collegamenti } | null = null

const NESSUNO: Collegamenti = {
  lezionePerEvento: new Map(),
  eventiPerLezione: new Map(),
  viaPerEvento: new Map(),
  ignorati: new Set(),
}

function collegamenti (): Collegamenti {
  // Non guarda l'interruttore della settimana: catena e blocco del trascinamento
  // restano anche a eventi nascosti.
  const eventi = letti()?.tutti
  if (!eventi || eventi.length === 0) return NESSUNO
  if (collegati?.registro !== stato.registro || collegati.eventi !== eventi) {
    collegati = {
      registro: stato.registro,
      eventi,
      esito: collegaEventi(
        stato.registro,
        eventi,
        stato.registro.impostazioni.calendario?.regole ?? [],
      ),
    }
  }
  return collegati.esito
}

/** Una scrittura d'allineamento alla volta: la prossima guarda il registro che ne esce. */
let allineando = false
/** Registro o eventi cambiati mentre si scriveva: finita la scrittura si riguarda. */
let daRiguardare = false
/** Registro ed eventi già guardati: lo stesso paio non si riguarda. */
let guardati: { registro: Registro, eventi: readonly EventoCalendario[] } | null = null

/**
 * I passi d'allineamento già tentati, per lezione (chiave di
 * `allineamentoAutomatico`): non si riprova a ogni modifica e un rifiuto si
 * dice una volta. Quando la lezione torna a combaciare i passi si scordano.
 */
const giaTentati = new Map<string, Set<string>>()

/**
 * Chiamata dall'iscritto: se nel calendario sono cambiati registro o eventi,
 * guarda se c'è da allineare. Fuori dal calendario non si allinea: ci si pensa
 * quando ci si torna.
 */
function forseAllinea (): void {
  if (stato.vista !== 'calendario') return
  const esito = collegamenti()
  if (esito === NESSUNO || !collegati) return
  if (guardati?.registro === collegati.registro && guardati.eventi === collegati.eventi) return
  guardati = { registro: collegati.registro, eventi: collegati.eventi }
  // Dopo gli altri iscritti: il disegno di questa modifica viene prima.
  queueMicrotask(() => void allineaCollegate())
}

/**
 * Porta le lezioni collegate per certo a inizio, fine e aula del calendario.
 * Quali lo decide il dominio (`allineamentiAutomatici`); qui si spedisce con
 * `calendario.applica`, tutte in una scrittura. Dopo la scrittura i
 * collegamenti si rifanno e non resta niente da fare: così il giro si ferma.
 */
async function allineaCollegate (): Promise<void> {
  if (!collegati) return
  if (allineando) {
    daRiguardare = true
    return
  }
  const { registro, esito } = collegati
  const giorno = oggi()
  const scelta = allineamentiAutomatici(registro, esito, giorno)
  for (const lezioneId of scelta.combaciano) giaTentati.delete(lezioneId)

  // I collegamenti sono di una foto del registro: una lezione cambiata nel
  // frattempo non si tocca, ci ripensa il giro dopo.
  const attuale = stato.registro
  const allinea: AllineamentoDaCalendario[] = []
  const tentati: Array<{ lezioneId: string, chiave: string }> = []
  for (const { voce, chiave } of scelta.allinea) {
    if (giaTentati.get(voce.lezioneId)?.has(chiave)) continue
    const lezione = attuale.lezioni.find((l) => l.id === voce.lezioneId)
    const suoi = esito.eventiPerLezione.get(voce.lezioneId) ?? []
    const ancora = lezione
      ? allineamentoAutomatico(attuale, lezione, suoi, esito.viaPerEvento, giorno)
      : null
    if (ancora?.chiave !== chiave) continue
    tentati.push({ lezioneId: voce.lezioneId, chiave })
    allinea.push(ancora.voce)
  }
  if (allinea.length === 0) return

  // Tentato, riuscito o no: se qualcosa cambia la chiave è un'altra.
  for (const { lezioneId, chiave } of tentati) {
    const suoi = giaTentati.get(lezioneId) ?? new Set<string>()
    suoi.add(chiave)
    giaTentati.set(lezioneId, suoi)
  }

  allineando = true
  try {
    const riuscite = await spedisci(allinea)
    if (riuscite > 0) notifica(testi().allineate(riuscite), 'info')
  } finally {
    allineando = false
  }
  if (daRiguardare) {
    daRiguardare = false
    guardati = null
    forseAllinea()
  }
}

/**
 * Spedisce l'allineamento e dice quante lezioni sono andate. Tutte insieme:
 * una scrittura, una spinta e un ridisegno. `calendario.applica` però rifiuta
 * in blocco: se una voce non passa si riprova una lezione alla volta, così un
 * rifiuto ferma quella sola. Uscendo dal calendario ci si ferma.
 */
async function spedisci (allinea: AllineamentoDaCalendario[]): Promise<number> {
  // Senza `regole`, che restano come sono. `automatico` fa ricontrollare la
  // voce all'host sul registro vero.
  const applica = (voci: AllineamentoDaCalendario[]) => ({
    tipo: 'calendario.applica' as const,
    automatico: true,
    crea: [],
    allinea: voci,
    annulla: [],
  })
  if (allinea.length === 1) return (await azione(applica(allinea))).ok ? 1 : 0
  // In blocco senza avviso: il rifiuto lo dicono subito sotto le voci una per una.
  if ((await invia(applica(allinea))).ok) return allinea.length
  let riuscite = 0
  for (const voce of allinea) {
    if (stato.vista !== 'calendario') break
    if ((await azione(applica([voce]))).ok) riuscite += 1
  }
  return riuscite
}

/** Le diciture di abbinamento degli eventi, ricordate per chiave finché il registro è lo stesso. */
let diciture: { registro: Registro, perChiave: Map<string, string> } | null = null

/**
 * Con che cosa è stato abbinato un evento: la regola o il titolo
 * (`dicituraDi`). La vista la passa a `eventiDellaStessaLezione`, così il menu
 * unisce le stesse metà del confronto.
 */
export function dicituraEvento (evento: EventoCalendario): string {
  if (diciture?.registro !== stato.registro) {
    diciture = { registro: stato.registro, perChiave: new Map() }
  }
  const gia = diciture.perChiave.get(evento.chiave)
  if (gia !== undefined) return gia
  const registro = stato.registro
  const abbinamento = abbina(
    registro,
    evento,
    registro.impostazioni.calendario?.regole ?? [],
    corsiConfrontabili(registro),
  )
  const sua = dicituraDi(evento, abbinamento)
  diciture.perChiave.set(evento.chiave, sua)
  return sua
}

/** Gli eventi ICS che cadono su quella lezione: nessuno, se non è collegata. */
export function eventiDellaLezione (lezioneId: string): EventoCalendario[] {
  return collegamenti().eventiPerLezione.get(lezioneId) ?? []
}

/**
 * Vero se la lezione è ancorata per certo a eventi ICS (regola o orario del
 * corso, `collegataPerCerto`): corso, data e orario li detta il calendario, e
 * la lezione non si trascina, non si modifica né si elimina. Un collegamento
 * per indizio resta modificabile, perché può essere sbagliato.
 */
export function ancorataAIcs (lezioneId: string): boolean {
  const eventi = eventiDellaLezione(lezioneId)
  if (eventi.length === 0) return false
  const lezione = stato.registro.lezioni.find((l) => l.id === lezioneId)
  return lezione !== undefined &&
    collegataPerCerto(stato.registro, lezione, eventi, collegamenti().viaPerEvento)
}

/**
 * L'aula che il calendario ICS dà a una lezione ancorata: il luogo del primo
 * evento non annullato che ne dice uno, o `''` (come `confrontaCalendario`).
 */
export function aulaDaIcs (lezioneId: string): string {
  return eventiDellaLezione(lezioneId).find((e) => !e.annullato && e.luogo)?.luogo ?? ''
}

/** La lezione su cui cade un evento ICS, o `null` se non è collegato a niente. */
export function lezioneDellEvento (evento: EventoCalendario): string | null {
  return collegamenti().lezionePerEvento.get(evento.chiave) ?? null
}

let anomalie: { esito: Collegamenti, perSettimana: Map<Iso, AnomalieSettimana> } | null = null

/**
 * Che cosa non torna fra calendario ICS e registro, per lunedì della settimana.
 * `null` a calendario non letto: prima di guardare non si dice niente.
 */
export function anomalieCalendario (): Map<Iso, AnomalieSettimana> | null {
  const esito = collegamenti()
  const eventi = letti()?.tutti
  if (esito === NESSUNO || !eventi) return null
  if (anomalie?.esito !== esito) {
    anomalie = { esito, perSettimana: anomaliePerSettimana(stato.registro, eventi, esito) }
  }
  return anomalie.perSettimana
}

/**
 * Tutti gli eventi letti, o `null` se non ci sono ancora. Ignora
 * l'interruttore: li usa la scheda delle regole. L'array resta lo stesso
 * finché non cambiano i calendari, quindi fa da chiave.
 */
export function eventiCaricati (): readonly EventoCalendario[] | null {
  return letti()?.tutti ?? null
}

/** Perché il calendario ICS non si vede, se si era chiesto di vederlo. */
export function guastoCalendarioEsterno (): string | null {
  if (!icsInVista()) return null
  return letti()?.errore ?? null
}

/**
 * Accende o spegne gli eventi ICS nel calendario. Riaccendendo si rilegge, per
 * riprovare un calendario che non si leggeva; per una copia nuova c'è
 * «Aggiorna» nelle impostazioni.
 */
export function mostraCalendarioEsterno (acceso: boolean): void {
  // Scordata la lettura, l'iscritto la rifà alla prossima modifica, questa.
  const voluta = richiesta()
  if (acceso && voluta) letture.dimentica(voluta.chiave)
  aggiorna({ mostraCalendarioEsterno: acceso })
}
