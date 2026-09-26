// Il punto unico per chiedere a un modello locale (`.gguf` governato da
// `gguf.ts`): chi chiede (l'uso: `ocr`, `assistente`, ciascuno con le proprie
// impostazioni) e chi risponde (il motore) sono assi separati. Il motore lo
// decide `motoreDi`: `llamaCpp.ts` dentro il processo, che non vede immagini, o
// `mtmd.ts` (`llama-mtmd-cli`) per l'OCR. Nessuna chiamata di rete da qui.

import * as apparato from 'apparato'

import { modelloNellaCartella } from './gguf.js'
import { LLAMA_CPP } from './llamaCpp.js'
import { MTMD } from './mtmd.js'
import { testi as testiMtmd } from './mtmd.testi.js'
import { testi } from './llm.testi.js'

// ----------------------------------------------------- che cosa si può dire

/** Chi ha detto una battuta. La traduzione in `system`/`user`/… la fa il motore. */
export type Ruolo = 'sistema' | 'utente' | 'assistente'

/**
 * Un attrezzo che il modello ha chiesto di usare. `argomenti` è `unknown`
 * perché un modello piccolo ci mette di tutto: li valida chi esegue.
 */
export interface ChiamataAttrezzo {
  /** Come il modello lo ha chiamato: può essere un nome che non esiste. */
  nome: string
  argomenti: unknown
}

/** Una battuta della conversazione. */
export interface Battuta {
  ruolo: Ruolo
  testo: string
}

/** Un attrezzo offerto al modello. `ingresso` è JSON Schema, da `schemaJson` (`api/schemas.ts`). */
export interface Attrezzo {
  nome: string
  descrizione: string
  ingresso: Record<string, unknown>
}

/** Una domanda secca: un colpo, niente conversazione. */
export interface Domanda {
  richiesta: string
  /** Le pagine da guardare, in PNG. Vuole un motore che sappia vedere. */
  immagini?: readonly Uint8Array[]
  /** Un tetto alle parole prodotte: i modelli piccoli tendono a ripetersi. */
  tettoParole?: number
}

/**
 * Una procedura aperta mentre il modello lavora: la risposta arriva tutta alla
 * fine, e questi passi mostrano che la macchina non è ferma.
 */
export interface Passo {
  /** La procedura che il modello ha chiesto, come l'ha chiamata lui. */
  attrezzo: string
  /**
   * Vero quando la chiamata non è stata eseguita perché il tetto del giro era
   * finito: la pagina la disegna diversa e avvisa che la risposta è parziale.
   */
  esaurito?: boolean
}

/**
 * Un giro di conversazione: battute, attrezzi e chi li esegue. Il ciclo
 * chiamata-risultato lo fa il motore; che cosa si esegue lo decide `esegui`,
 * portato da chi chiama, dove vive il controllo sul genere della procedura.
 */
export interface Giro {
  battute: readonly Battuta[]
  /** Senza, il modello può soltanto parlare. */
  attrezzi?: readonly Attrezzo[]
  /**
   * Esegue quel che il modello ha chiesto e torna il testo da rimandargli. Non
   * solleva: l'errore torna come testo, così il modello può cambiare strada.
   */
  esegui?: (chiamata: ChiamataAttrezzo) => Promise<string>
  /** Che cosa sta succedendo, mentre succede. */
  al?: (passo: Passo) => void
}

// ------------------------------------------------------------- chi risponde

/**
 * Un modo di far rispondere un modello su questa macchina. Non installa niente:
 * i file li governa `gguf.ts`, il programma esterno lo indica un'impostazione.
 */
export interface Motore {
  /** Come si chiama, per i messaggi: «llama.cpp». */
  nome: string
  /** Se sa guardare le immagini. Lo usa `motoreDi`, e nient'altro. */
  vede: boolean
  /**
   * Perché questo motore adesso non può lavorare, o `''`. Solo i motivi propri
   * del motore: il modello mancante lo guarda `prontezza()`.
   */
  impedimento: (collegamento: Collegamento) => string
  /** Una domanda secca. Solo i motori che vedono la ricevono con le immagini. */
  genera?: (collegamento: Collegamento, domanda: Domanda) => Promise<string>
  /** Un giro di conversazione, attrezzi compresi. */
  chatta?: (collegamento: Collegamento, giro: Giro) => Promise<string>
}

// -------------------------------------------------------------- chi chiede

/**
 * Chi si serve di un modello. Il nome è il prefisso delle chiavi nel manifesto
 * (`<uso>.attivo`, `<uso>.modello`, e `.proiettore`/`.programma` se servono):
 * un uso nuovo vuole una riga qui, una in `PREDEFINITI` e quelle chiavi.
 */
export type Uso = 'ocr' | 'assistente'

/** Le costanti di ciascun uso, che non sono impostazioni. */
interface Predefiniti {
  attesaSecondi: number
}

/**
 * L'attesa di ciascun uso, fissa perché accorciarla fa solo fallire le risposte.
 * Nessun modello predefinito: un file che magari non c'è sarebbe una promessa.
 */
const PREDEFINITI: Record<Uso, Predefiniti> = {
  // Tanto ci mette una pagina scansionata.
  ocr: { attesaSecondi: 180 },
  // Largo per un giro con dentro una lettura.
  assistente: { attesaSecondi: 120 },
}

/** Un motore, un modello e un'attesa: quel che serve per chiedere. */
export interface Collegamento {
  uso: Uso
  motore: Motore
  attivo: boolean
  /**
   * Il percorso intero del `.gguf` scelto; vuoto se non scelto o sparito dalla
   * cartella (`prontezza()` distingue i due casi con `modelloChiesto`).
   */
  modello: string
  /** Com'era scritto nelle impostazioni, anche quando il file non c'è più. */
  modelloChiesto: string
  /**
   * Il proiettore multimodale (`mmproj`) per i motori che vedono: senza, il
   * modello risponde ma non vede le immagini.
   */
  proiettore: string
  /** Com'era scritto nelle impostazioni, anche quando il file non c'è più. */
  proiettoreChiesto: string
  /** L'eseguibile esterno, per i motori che ne hanno uno. Vuoto se non vale. */
  programma: string
  attesaMs: number
  /** Per fermare da fuori: lo preme chi chiude la pagina o annulla. */
  segnale?: AbortSignal
}

/**
 * Il motore di un uso, deciso da che cosa l'uso manda e non da un'impostazione:
 * l'OCR manda immagini, che `node-llama-cpp` non accetta.
 */
function motoreDi (uso: Uso): Motore {
  return uso === 'ocr' ? MTMD : LLAMA_CPP
}

/**
 * Le impostazioni di un uso, risolte in un posto solo. Modello e proiettore si
 * risolvono dentro la cartella dei modelli (`modelloNellaCartella`): un
 * percorso scritto a mano nel JSON non porta il registro ad aprire altro.
 */
export function collegamento (uso: Uso, segnale?: AbortSignal): Collegamento {
  const motore = motoreDi(uso)
  const configurazione = apparato.impostazioni.leggi('registroDocenti')
  const chiesto = configurazione.get<string>(`${uso}.modello`, '').trim()
  const proiettoreChiesto = configurazione.get<string>(`${uso}.proiettore`, '').trim()
  return {
    uso,
    motore,
    attivo: configurazione.get<boolean>(`${uso}.attivo`, false),
    modello: modelloNellaCartella(chiesto),
    modelloChiesto: chiesto,
    proiettore: modelloNellaCartella(proiettoreChiesto),
    proiettoreChiesto,
    programma: configurazione.get<string>(`${uso}.programma`, '').trim(),
    attesaMs: PREDEFINITI[uso].attesaSecondi * 1000,
    ...(segnale ? { segnale } : {}),
  }
}

// ------------------------------------------------------------- se si può

/** Perché adesso non si può chiedere niente, o `pronto` se si può. */
export interface Prontezza {
  pronto: boolean
  motivo: string
}

/**
 * Se c'è tutto per chiedere, da sapere prima di mandare. Il motivo è una frase
 * leggibile che dice dove si rimedia (la sezione «Modelli linguistici»).
 * Sincrona: guarda solo file e impostazioni.
 */
export function prontezza (collegamento: Collegamento): Prontezza {
  const { uso, motore, modello, modelloChiesto } = collegamento
  const t = testi()
  // Il modello mancante prima di «è spento»: senza modello l'interruttore non si
  // accende (`richiede` nel manifesto).
  if (modelloChiesto === '') {
    return {
      pronto: false,
      motivo: t.senzaModello(t.nomi[uso]),
    }
  }
  if (motore.vede && collegamento.proiettoreChiesto === '') {
    return { pronto: false, motivo: testiMtmd().senzaProiettore }
  }
  if (!collegamento.attivo) {
    return { pronto: false, motivo: t.spento(t.nomi[uso], t.doveSiAccende[uso]) }
  }
  if (modello === '') {
    return {
      pronto: false,
      motivo: t.modelloSparito(modelloChiesto),
    }
  }
  const impedimento = motore.impedimento(collegamento)
  if (impedimento !== '') return { pronto: false, motivo: impedimento }
  return { pronto: true, motivo: '' }
}

// ------------------------------------------------------------ che cosa si fa

/** Una domanda secca. Solleva il guasto grezzo: per un motivo leggibile, `conMotivo`. */
export async function genera (collegamento: Collegamento, domanda: Domanda): Promise<string> {
  if (!collegamento.motore.genera) {
    throw new Error(testi().nonGenera(collegamento.motore.nome))
  }
  return collegamento.motore.genera(collegamento, domanda)
}

/** Un giro di conversazione, attrezzi compresi. Solleva se il motore non ce la fa. */
export async function chatta (collegamento: Collegamento, giro: Giro): Promise<string> {
  if (!collegamento.motore.chatta) {
    throw new Error(testi().nonConversa(collegamento.motore.nome))
  }
  return collegamento.motore.chatta(collegamento, giro)
}

/**
 * Esegue `giro` e, se fallisce, traduce il guasto nel motivo di `prontezza()`.
 * Il controllo si fa solo dopo un guasto, non prima di ogni giro.
 */
export async function conMotivo<T> (
  collegamento: Collegamento,
  giro: () => Promise<T>,
): Promise<T> {
  try {
    return await giro()
  } catch (guasto) {
    const stato = prontezza(collegamento)
    // Il guasto originale resta in `cause`, per la console.
    if (!stato.pronto) throw new Error(stato.motivo, { cause: guasto })
    // C'è tutto e non ha funzionato: il guasto è un altro, si passa com'è.
    throw guasto instanceof Error
      ? guasto
      : new Error(testi().nonRisposto(collegamento.motore.nome))
  }
}
