// Il catalogo delle procedure per un modello: che cosa si può chiedere, con che
// forma e con quali regole. Esce dalle procedure (`titolo`, `Schema`), non si
// scrive a mano.
//
// Serve a chi sta fuori dal registro (un modello o uno script che non importa
// TypeScript, come la riga di comando; `regi catalogo` lo stampa vivo dal
// condotto) e alla revisione: `resources/tools.json` è versionato, e una
// procedura cambiata compare come differenza.
//
// Contiene tutte le voci; gli attrezzi da dare a un modello sono solo quelli con
// `offribile`, e il catalogo lo dice in `comeSiFiltra`.
//
// Niente date né conti qui dentro: `tests/api/tools.test.mjs` rigenera il
// catalogo e lo confronta byte per byte con quello su disco.

import type { ProceduraQualunque } from './contract.js'
import { VERSIONE_API } from './contract.js'
import { registraTutte } from './index.js'
import { procedure } from './core.js'
import { schemaJson } from './schemas.js'
import { detto } from '../i18n/index.js'
import { presentazioneDetta } from './presentation.js'
import { testi } from './tools.testi.js'

/** Come si chiama la riga di comando, se nessuno dice altrimenti. */
const COMANDO = 'regi'

// -------------------------------------------------------------------- i nomi

/**
 * `corso.presenze` → `corso_presenze`: alcuni modelli leggono il punto come
 * accesso a un campo. Il punto si toglie e si rimette solo qui.
 */
export function nomeFunzione (nome: string): string {
  return nome.replace(/\./g, '_')
}

/**
 * `corso_presenze` o `corso.presenze` → `corso.presenze`, se la procedura esiste;
 * altrimenti `null`, perché un nome inventato va rifiutato. Il confronto è
 * sull'elenco vero: un nome può avere più punti.
 *
 * Si accetta anche il nome puntato perché i rimedi delle guardie lo scrivono
 * così («Le classi dell'anno le elenca «classi.elenco».»). Solo nomi di
 * procedure vere; il genere si ricontrolla comunque a valle.
 */
export function daNomeFunzione (nome: string): string | null {
  registraTutte()
  const tutte = procedure()
  return tutte.find((p) => p.nome === nome)?.nome
    ?? tutte.find((p) => nomeFunzione(p.nome) === nome)?.nome
    ?? null
}

// ------------------------------------------------------- chi si può offrire

/**
 * Se una procedura si può mettere in mano al modello dell'assistente. Unica
 * definizione della regola: il catalogo ne pubblica la risposta in `offribile`,
 * e la riga di comando legge quella.
 *
 *   - `genere === 'lettura'`: non tocca l'archivio.
 *   - `assistente === true`: deroga per chi non tocca comunque l'archivio
 *     (oggi `vista.apri`).
 *   - `perAssistente !== false`: esclude le letture inutili a un docente
 *     (vedi `Procedura.perAssistente`).
 */
export function offribile (
  p: { genere: string, assistente?: boolean, perAssistente?: boolean },
): boolean {
  if (p.perAssistente === false) return false
  return p.genere === 'lettura' || p.assistente === true
}

// ----------------------------------------------------------------- il catalogo

/** Una procedura come la vede chi la deve chiamare da fuori. */
interface AttrezzoCatalogo {
  /** Il nome vero, con i punti: `corso.presenze`. */
  nome: string
  /** Il nome da mettere in `tools`, senza punti: `corso_presenze`. */
  funzione: string
  genere: 'lettura' | 'scrittura'
  /** Una riga: che cosa fa, detto a chi non conosce il codice. */
  titolo: string
  idempotente: boolean
  /** Le raccolte che una scrittura può toccare. Assente per le letture. */
  collezioni?: readonly string[]
  /**
   * Il modello dell'assistente la può chiamare anche se non è una lettura. Sta nel
   * catalogo perché una deroga nuova si veda in revisione.
   */
  assistente?: boolean
  /**
   * Se si può mettere in mano al modello dell'assistente (assente = no).
   * Derivato da `offribile()`: la riga di comando non importa TypeScript e legge
   * questo campo invece di riscrivere la regola.
   */
  offribile?: boolean
  /** Come la si invoca dalla riga di comando, con i campi obbligatori. */
  riga: string
  /** La forma dell'ingresso, in JSON Schema. */
  parametri: Record<string, unknown>
  /**
   * Come si impagina quel che torna: titolo, valori in cima, colonne. Serve alla
   * revisione e a chi disegna da fuori (la riga di comando stampa le stesse
   * tabelle). Assente dove non c'è niente da impaginare.
   */
  presentazione?: unknown
}

/** Tutto quel che serve per far guidare la riga di comando a un modello. */
interface Catalogo {
  /** La versione del contratto: la stessa che viaggia in ogni busta. */
  api: number
  /** Il nome del comando a cui le righe di esempio si riferiscono. */
  comando: string
  /** Che cosa il modello deve sapere prima di leggere la domanda. */
  istruzioni: string
  /**
   * Come si ricava da qui l'elenco da mandare a un modello. Sta nel file perché
   * lo legge chi prende il catalogo senza il sorgente: passarlo intero a un
   * modello costa oltre dodici volte il necessario.
   */
  comeSiFiltra: string
  attrezzi: AttrezzoCatalogo[]
}

/**
 * La riga di comando che chiama una procedura, con i soli campi obbligatori:
 * gli opzionali sono nello schema accanto.
 */
function riga (comando: string, p: ProceduraQualunque): string {
  const forma = p.ingresso.forma
  if (forma.genere !== 'oggetto' || forma.richiesti.length === 0) {
    // testo-fisso: il comando «chiama» della riga di comando, che non si traduce
    return `${comando} chiama ${p.nome}`
  }
  const campi = forma.richiesti
    .map((campo) => `--${campo} <${forma.campi[campo]?.genere ?? 'valore'}>`)
    .join(' ')
  // testo-fisso: il comando «chiama» della riga di comando, che non si traduce
  return `${comando} chiama ${p.nome} ${campi}`
}

/**
 * Il prompt per un modello che sta fuori dal registro e ne esegue gli attrezzi
 * con la riga di comando (l'assistente della finestra ha le sue istruzioni in
 * `api/transports/assistant.ts`).
 *
 * Chi legge sta davanti a un terminale, quindi la risposta cita anche il
 * comando, per poterla verificare. La regola chiave: niente cifre senza aver
 * chiamato un attrezzo.
 */
function istruzioni (comando: string): string {
  return testi().istruzioni(comando)
}

/**
 * Il catalogo intero, letture e scritture: una scrittura che sparisce deve
 * vedersi in revisione. Chi esegue ricontrolla comunque prima di chiamare
 * (`usaAttrezzo` in `transports/assistant.ts`).
 */
export function catalogo (comando: string = COMANDO): Catalogo {
  registraTutte()
  return {
    api: VERSIONE_API,
    comando,
    istruzioni: istruzioni(comando),
    comeSiFiltra: testi().comeSiFiltra,
    attrezzi: procedure().map((p) => ({
      nome: p.nome,
      funzione: nomeFunzione(p.nome),
      genere: p.genere,
      titolo: detto(p.titolo),
      idempotente: p.idempotente,
      ...(p.collezioni && p.collezioni.length > 0 ? { collezioni: [...p.collezioni] } : {}),
      ...(p.assistente ? { assistente: true } : {}),
      ...(offribile(p) ? { offribile: true } : {}),
      riga: riga(comando, p),
      parametri: schemaJson(p.ingresso.forma),
      ...(p.presentazione ? { presentazione: presentazioneDetta(p.presentazione) } : {}),
    })),
  }
}

/**
 * Il catalogo come va sul disco: due spazi di rientro e un a capo in fondo.
 * Deve coincidere byte per byte con quello che la prova ricostruisce; per
 * questo il file è `eol=lf` in `.gitattributes`.
 */
export function catalogoJson (comando?: string): string {
  return `${JSON.stringify(catalogo(comando), null, 2)}\n`
}
