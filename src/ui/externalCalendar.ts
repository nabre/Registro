// I calendari ICS del documento, accanto alle lezioni. Gli eventi arrivano da
// `calendario.eventi` per tutto l'anno e restano in memoria finché non cambiano
// i calendari o l'anno (la vista si ridisegna a ogni spunta). La chiave di un
// evento porta davanti l'id del suo calendario, così due calendari con lo
// stesso UID restano due eventi. File a sé perché lo leggono la vista e
// `commands.ts`.
//
// Le lezioni collegate per certo a un evento si allineano da sole
// (`allineaCollegate`): inizio, fine e aula li detta il calendario della scuola
// (`ancorataAIcs`). Solo per collegamenti certi e lezioni non ancora fatte (il
// criterio è in `domain/calendar.ts`); il resto, e le ore annullate, restano
// proposte del confronto.

import type { EventoCalendario } from '../domain/calendarIcs.js'
import { abbina, corsiConfrontabili, dicituraDi } from '../domain/calendarRules.js'
import {
  anomaliePerSettimana,
  collegaEventi,
  type AnomalieSettimana,
  type Collegamenti,
} from '../domain/calendarLinks.js'
import {
  allineamentiAutomatici,
  allineamentoAutomatico,
  collegataPerCerto,
  type AllineamentoDaCalendario,
} from '../domain/calendar.js'
import { oggi } from '../domain/dates.js'
import type { Iso, Registro } from '../domain/models.js'
import { azione, chiedi } from './bridge.js'
import { notifica } from './components/notifications.js'
import { aggiorna, annoCorrente, stato } from './state.js'
import { testi } from './externalCalendar.testi.js'

interface Richiesta {
  chiave: string
  dal: Iso
  al: Iso
}

interface Letti {
  chiave: string
  tutti: EventoCalendario[]
  perGiorno: Map<Iso, EventoCalendario[]>
  /** La frase del guasto, se la lettura non è riuscita: si dice, e non si riprova da sola. */
  errore: string | null
}

let letti: Letti | null = null
let inVolo: string | null = null

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

async function carica (voluta: Richiesta): Promise<void> {
  if (inVolo === voluta.chiave) return
  inVolo = voluta.chiave
  const esito = await chiedi<{
    eventi: EventoCalendario[]
    guasti: Array<{ nome: string, motivo: string }>
  }>('calendario.eventi', { dal: voluta.dal, al: voluta.al })
  // Un calendario cambiato mentre si leggeva: vince l'ultima chiesta.
  if (inVolo !== voluta.chiave) return
  inVolo = null
  const perGiorno = new Map<Iso, EventoCalendario[]>()
  for (const evento of esito.dati?.eventi ?? []) {
    const gruppo = perGiorno.get(evento.data) ?? []
    gruppo.push(evento)
    perGiorno.set(evento.data, gruppo)
  }
  // Un calendario che non si legge non spegne gli altri: la frase lo nomina.
  const guasti = (esito.dati?.guasti ?? []).map((g) => testi().guasto(g.nome, g.motivo))
  letti = {
    chiave: voluta.chiave,
    tutti: esito.dati?.eventi ?? [],
    perGiorno,
    errore: esito.ok
      ? (guasti.length > 0 ? guasti.join(' ') : null)
      : esito.errori.join(' ') || testi().nonSiLegge,
  }
  aggiorna({})
}

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
 * Gli eventi di un giorno in ordine d'ora. Se mancano parte la lettura e si
 * risponde vuoto: all'arrivo la vista si ridisegna.
 */
export function eventiEsterni (data: Iso): EventoCalendario[] {
  if (!icsInVista()) return []
  const voluta = richiesta()
  if (!voluta) return []
  if (letti?.chiave !== voluta.chiave) {
    void carica(voluta)
    return []
  }
  return letti.perGiorno.get(data) ?? []
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
  const eventi = eventiCaricati()
  if (!eventi || eventi.length === 0 || !letti) return NESSUNO
  if (collegati?.registro !== stato.registro || collegati.eventi !== letti.tutti) {
    collegati = {
      registro: stato.registro,
      eventi: letti.tutti,
      esito: collegaEventi(
        stato.registro,
        letti.tutti,
        stato.registro.impostazioni.calendario?.regole ?? [],
      ),
    }
    // Fuori dal disegno: una scrittura a metà ridisegno ne farebbe partire un altro.
    queueMicrotask(() => void allineaCollegate())
  }
  return collegati.esito
}

/** Una scrittura d'allineamento alla volta: la prossima guarda il registro che ne esce. */
let allineando = false

/**
 * I passi d'allineamento già tentati, per lezione (chiave di
 * `allineamentoAutomatico`): non si riprova a ogni ridisegno e un rifiuto si
 * dice una volta. Quando la lezione torna a combaciare i passi si scordano.
 */
const giaTentati = new Map<string, Set<string>>()

/**
 * Porta le lezioni collegate per certo a inizio, fine e aula del calendario.
 * Quali lo decide il dominio (`allineamentiAutomatici`); qui si spedisce con
 * `calendario.applica`. Dopo la scrittura i collegamenti si rifanno e non resta
 * niente da fare: così il giro si ferma.
 */
async function allineaCollegate (): Promise<void> {
  if (allineando || !collegati) return
  const { registro, eventi, esito } = collegati
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

  allineando = true
  try {
    // Una lezione per scrittura: un rifiuto ferma quella sola.
    let riuscite = 0
    for (const [i, voce] of allinea.entries()) {
      const risposta = await azione({
        tipo: 'calendario.applica',
        // Senza `regole`, che restano come sono. `automatico` fa ricontrollare la
        // voce all'host sul registro vero.
        automatico: true,
        crea: [],
        allinea: [voce],
        annulla: [],
      })
      // Tentato, riuscito o no: se qualcosa cambia la chiave è un'altra.
      const { lezioneId, chiave } = tentati[i]
      const suoi = giaTentati.get(lezioneId) ?? new Set<string>()
      suoi.add(chiave)
      giaTentati.set(lezioneId, suoi)
      if (risposta.ok) riuscite += 1
    }
    if (riuscite > 0) {
      notifica(testi().allineate(riuscite), 'info')
    }
  } finally {
    allineando = false
  }
  // Se intanto sono arrivati eventi nuovi, si guarda di nuovo.
  if (collegati && (collegati.registro !== registro || collegati.eventi !== eventi)) {
    queueMicrotask(() => void allineaCollegate())
  }
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
  const eventi = letti?.tutti
  if (esito === NESSUNO || !eventi) return null
  if (anomalie?.esito !== esito) {
    anomalie = { esito, perSettimana: anomaliePerSettimana(stato.registro, eventi, esito) }
  }
  return anomalie.perSettimana
}

/**
 * Tutti gli eventi letti, o `null` se non ci sono ancora (e allora parte la
 * lettura). Ignora l'interruttore: li usa la scheda delle regole. L'array
 * resta lo stesso finché non cambiano i calendari, quindi fa da chiave.
 */
export function eventiCaricati (): readonly EventoCalendario[] | null {
  const voluta = richiesta()
  if (!voluta) return null
  if (letti?.chiave !== voluta.chiave) {
    void carica(voluta)
    return null
  }
  return letti.tutti
}

/** Perché il calendario ICS non si vede, se si era chiesto di vederlo. */
export function guastoCalendarioEsterno (): string | null {
  if (!icsInVista()) return null
  const voluta = richiesta()
  return voluta && letti?.chiave === voluta.chiave ? letti.errore : null
}

/**
 * Accende o spegne gli eventi ICS nel calendario. Riaccendendo si rilegge, per
 * riprovare un calendario che non si leggeva; per una copia nuova c'è
 * «Aggiorna» nelle impostazioni.
 */
export function mostraCalendarioEsterno (acceso: boolean): void {
  if (acceso) {
    letti = null
    inVolo = null
  }
  aggiorna({ mostraCalendarioEsterno: acceso })
}
