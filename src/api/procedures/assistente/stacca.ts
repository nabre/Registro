import { assistente } from '../../../actions/assistant.js'
import type { BloccoRisultato, RisultatoAssistente, TurnoAssistente } from '../../../protocol.js'
import { inoltra, scrittura } from '../../core.js'
import {
  booleano, elenco, numero, oggetto, opzionale, qualunque, scelta, testo, type Schema,
} from '../../schemas.js'
import { testi } from './assistente.testi.js'

const t = () => testi().stacca

/**
 * Un turno della conversazione, come si vede. Lo schema è completo, attrezzi
 * compresi: `oggetto()` scarta le chiavi non dichiarate, e staccando si
 * perderebbero in silenzio le procedure aperte sotto ogni risposta.
 */
/**
 * Quel che una procedura ha letto, già impaginato. I blocchi passano come sono:
 * li compone `api/presentation.ts` da un'uscita già convalidata e li disegna
 * `ui/assistant/result.ts`; riscriverne qui l'unione sarebbe una seconda copia
 * di `BloccoRisultato`.
 */
const RISULTATO = oggetto({
  procedura: testo({ aiuto: () => t().procedura }),
  titolo: testo(),
  // Il cast tiene il tipo `BloccoRisultato` dentro, mentre da fuori la forma è
  // «qualunque», perché nessuno la convalida.
  blocchi: elenco(
    qualunque({ aiuto: () => t().blocco }) as Schema<BloccoRisultato>,
  ),
})

const TURNO = oggetto({
  ruolo: scelta(['utente', 'assistente'], { aiuto: () => t().ruolo }),
  testo: testo(),
  attrezzi: opzionale(elenco(oggetto({
    nome: testo({ aiuto: () => t().nomeAttrezzo }),
    ok: booleano(),
    codice: opzionale(testo({ aiuto: () => t().codice })),
    // Il perché con le parole del nucleo: è la parte che serve a chi guarda.
    messaggio: opzionale(testo({ aiuto: () => t().messaggio })),
  }))),
  // Le tabelle sotto le risposte: i dati letti dal registro.
  risultati: opzionale(elenco(RISULTATO)),
  guasto: opzionale(booleano({ aiuto: () => t().guasto })),
  // Gli id già visti, per non ricominciare a cercare per nome.
  visti: opzionale(elenco(oggetto({
    id: testo({ aiuto: () => t().idVisto }),
    nome: testo({ aiuto: () => t().nomeVisto }),
    cosa: testo({ aiuto: () => t().cosaVisto }),
  }))),
  // Chi ha chiesto ha smesso di aspettare: si disegna diverso da un guasto.
  fermato: opzionale(booleano({ aiuto: () => t().fermato })),
  // Il modello ha finito le chiamate concesse: la nota dice che la risposta può
  // essere monca.
  esaurito: opzionale(booleano({ aiuto: () => t().esaurito })),
})

/**
 * I turni arrivati dalla finestra staccata, controllati uno per uno: la
 * direzione opposta di `TURNO`, per `panels/assistant.ts`. È l'unica porta del
 * ponte senza contratto, e un blocco malformato farebbe cadere l'intero
 * ridisegno del registro (`metti()` → `ridisegna()` → `aggiorna()`).
 *
 * Non usa `TURNO`: lo schema rifiuterebbe il turno intero, qui invece si toglie
 * solo quel che non ha la forma. Un campo aggiunto a `TURNO` va aggiunto anche
 * qui.
 */
export function convalidaTurni (grezzi: readonly unknown[]): TurnoAssistente[] {
  const turni: TurnoAssistente[] = []
  for (const grezzo of grezzi) {
    if (!grezzo || typeof grezzo !== 'object') continue
    const turno = grezzo as Record<string, unknown>
    if (turno.ruolo !== 'utente' && turno.ruolo !== 'assistente') continue
    if (typeof turno.testo !== 'string') continue
    const buono: TurnoAssistente = { ruolo: turno.ruolo, testo: turno.testo }
    if (Array.isArray(turno.attrezzi)) {
      const attrezzi = turno.attrezzi.flatMap((grezzo: unknown) => {
        if (!grezzo || typeof grezzo !== 'object') return []
        const a = grezzo as Record<string, unknown>
        if (typeof a.nome !== 'string' || typeof a.ok !== 'boolean') return []
        return [{
          nome: a.nome,
          ok: a.ok,
          ...(typeof a.codice === 'string' ? { codice: a.codice } : {}),
          ...(typeof a.messaggio === 'string' ? { messaggio: a.messaggio } : {}),
        }]
      })
      if (attrezzi.length > 0) buono.attrezzi = attrezzi
    }
    if (Array.isArray(turno.risultati)) {
      const risultati = turno.risultati.flatMap(convalidaRisultato)
      if (risultati.length > 0) buono.risultati = risultati
    }
    // Un id visto senza il suo nome non si tiene: al modello non direbbe niente.
    if (Array.isArray(turno.visti)) {
      const visti = turno.visti.flatMap((grezzo: unknown) => {
        if (!grezzo || typeof grezzo !== 'object') return []
        const v = grezzo as Record<string, unknown>
        if (typeof v.id !== 'string' || v.id === '') return []
        if (typeof v.nome !== 'string' || v.nome === '') return []
        return [{ id: v.id, nome: v.nome, cosa: typeof v.cosa === 'string' ? v.cosa : '' }]
      })
      if (visti.length > 0) buono.visti = visti
    }
    if (turno.guasto === true) buono.guasto = true
    if (turno.fermato === true) buono.fermato = true
    if (turno.esaurito === true) buono.esaurito = true
    turni.push(buono)
  }
  return turni
}

/**
 * Una busta di lettura impaginata, controllata quanto basta a disegnarla: i
 * blocchi non si ricontrollano campo per campo, ma devono avere la forma che il
 * disegno usa (es. `colonne` su una tabella).
 */
function convalidaRisultato (grezzo: unknown): RisultatoAssistente[] {
  if (!grezzo || typeof grezzo !== 'object') return []
  const r = grezzo as Record<string, unknown>
  if (typeof r.procedura !== 'string' || typeof r.titolo !== 'string') return []
  if (!Array.isArray(r.blocchi)) return []
  const blocchi = r.blocchi.filter((grezzo: unknown) => {
    if (!grezzo || typeof grezzo !== 'object') return false
    const b = grezzo as Record<string, unknown>
    if (b.tipo === 'valori' || b.tipo === 'elenco') return Array.isArray(b.voci)
    if (b.tipo === 'tabella') return Array.isArray(b.colonne) && Array.isArray(b.righe)
    return false
  }) as BloccoRisultato[]
  return [{ procedura: r.procedura, titolo: r.titolo, blocchi }]
}

export const procedura = scrittura({
  nome: 'assistente.stacca',
  titolo: () => t().titolo,
  azione: 'assistente.stacca',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    storia: elenco(TURNO, { aiuto: () => t().storia }),
    // La domanda a metà: si ritrova nella finestra nuova.
    bozza: opzionale(testo({ aiuto: () => t().bozza })),
    // La risposta a metà: il giro vive nell'host, e chiudere una finestra non lo
    // ferma. Viaggia quanto se n'è già visto, e la finestra nuova riprende da lì.
    giro: opzionale(oggetto({
      visti: numero({ intero: true, minimo: 0, aiuto: () => t().visti }),
      // L'id della busta dice di quale giro si tratta quando due pagine chiedono
      // insieme.
      busta: opzionale(numero({ intero: true, minimo: 0, aiuto: () => t().busta })),
    }, { aiuto: () => t().giro })),
  }),
  esegui: inoltra(assistente, 'assistente.stacca'),
})
