// Hugging Face: cercare un modello `.gguf` e comporre l'indirizzo di un file.
// Non scrive sul disco (lo scarico è di `gguf.ts`) e non importa l'archivio:
// dalla rete escono solo le parole battute nella ricerca. Nessuna chiave; i
// depositi ristretti (`gated`) non si scaricano da qui. Il taglio preferito è
// `Q4_K_M`, ma gli altri restano in elenco per le macchine con poca memoria.

import { testi } from './gguf.testi.js'

/** Quanto si aspetta una risposta dal sito, prima di rinunciare. */
const ATTESA_MS = 15000

/** Quanti depositi si mostrano in una ricerca. */
const QUANTI = 20

/** La radice dell'API pubblica. */
const API = 'https://huggingface.co/api'

// ------------------------------------------------------------- il catalogo

/** A che cosa serve un modello, nel registro. */
type PerChe = 'assistente' | 'ocr'

/** Una voce consigliata: un deposito, e perché sta in elenco. */
export interface VoceCatalogo {
  /** Il deposito: `utente/nome`. */
  deposito: string
  /** Come si chiama per chi legge. */
  titolo: string
  perChe: PerChe
  /** La quantizzazione da preferire, fra quelle che il deposito pubblica. */
  taglio: string
  /** Una riga: che cosa sa fare, e che macchina vuole. */
  nota: string
}

/** Una voce consigliata, con il titolo e la nota letti nella lingua di adesso. */
function consigliato (
  deposito: string,
  quale: keyof ReturnType<typeof testi>['consigliati'],
  perChe: PerChe,
  taglio: string,
): VoceCatalogo {
  return {
    deposito,
    get titolo () {
      return testi().consigliati[quale].titolo
    },
    perChe,
    taglio,
    get nota () {
      return testi().consigliati[quale].nota
    },
  }
}

/**
 * I modelli consigliati: una macchina piccola e una normale per ciascun uso.
 * Sono depositi, non file, perché i nomi dei file cambiano; per l'assistente
 * niente sotto i 3B, che chiama male gli attrezzi. Titolo e nota sono getter:
 * `{ ...voce }` ne copia i valori nella lingua di quel momento.
 */
export const CATALOGO: readonly VoceCatalogo[] = [
  consigliato('bartowski/Qwen2.5-7B-Instruct-GGUF', 'qwen7', 'assistente', 'Q4_K_M'),
  consigliato('bartowski/Qwen2.5-3B-Instruct-GGUF', 'qwen3', 'assistente', 'Q4_K_M'),
  consigliato('ggml-org/Qwen2.5-VL-7B-Instruct-GGUF', 'qwenVl', 'ocr', 'Q4_K_M'),
  consigliato('ggml-org/SmolVLM-500M-Instruct-GGUF', 'smolVlm', 'ocr', 'Q8_0'),
]

// --------------------------------------------------------------- la ricerca

/** Un deposito trovato cercando. */
export interface Deposito {
  /** `utente/nome`. */
  id: string
  /** Quante volte è stato scaricato nell'ultimo mese: è l'unico indizio di fiducia. */
  scarichi: number
  /** Se chiede di accettare delle condizioni: da qui non si scarica. */
  ristretto: boolean
}

/** Una richiesta al sito, con l'attesa e il guasto detti in italiano. */
async function chiedi (dove: string, segnale?: AbortSignal): Promise<unknown> {
  const scadenza = AbortSignal.timeout(ATTESA_MS)
  const risposta = await fetch(`${API}${dove}`, {
    headers: { accept: 'application/json' },
    signal: segnale ? AbortSignal.any([segnale, scadenza]) : scadenza,
  }).catch((guasto: unknown) => {
    throw new Error(testi().hfNonRisponde, { cause: guasto })
  })
  if (!risposta.ok) {
    throw new Error(testi().hfRisponde(risposta.status))
  }
  return risposta.json()
}

/**
 * I depositi con `.gguf` che somigliano al testo cercato, ordinati per
 * scarichi: fra nomi quasi uguali è l'unico indizio di quale funziona.
 */
export async function cerca (testo: string, segnale?: AbortSignal): Promise<Deposito[]> {
  const parole = testo.trim()
  if (parole === '') return []
  const dati = await chiedi(
    `/models?search=${encodeURIComponent(parole)}&filter=gguf` +
    `&sort=downloads&direction=-1&limit=${QUANTI}`,
    segnale,
  )
  if (!Array.isArray(dati)) return []
  return dati
    .map((grezzo: { id?: unknown, downloads?: unknown, gated?: unknown }) => ({
      id: typeof grezzo.id === 'string' ? grezzo.id : '',
      scarichi: typeof grezzo.downloads === 'number' ? grezzo.downloads : 0,
      // `gated` è `false` oppure «auto»/«manual»: tutto tranne `false` è ristretto.
      ristretto: grezzo.gated !== false && grezzo.gated !== undefined,
    }))
    .filter((deposito) => deposito.id !== '')
}

// ---------------------------------------------------------------- i file

/** Un `.gguf` dentro un deposito. */
export interface FileRemoto {
  /** Il percorso dentro il deposito: a volte sta in una sottocartella. */
  percorso: string
  byte: number
  /** Il taglio, ricavato dal nome: `Q4_K_M`. Vuoto se il nome non lo dice. */
  taglio: string
  /** Se è il proiettore di un modello che guarda, e non un modello. */
  proiettore: boolean
}

/** Il taglio scritto nel nome del file, se c'è. */
function taglioDi (nome: string): string {
  const trovato = /[-_.](IQ\d[A-Z_]*|Q\d[A-Z0-9_]*|BF16|F16|F32)\.gguf$/i.exec(nome)
  return trovato ? trovato[1].toUpperCase() : ''
}

/**
 * I `.gguf` di un deposito, chiesti all'albero perché i nomi cambiano. Di un
 * modello spezzato (`-00002-of-00009.gguf`) si mostra solo il primo pezzo:
 * gli altri li prende `gguf.ts`.
 */
export async function fileDelDeposito (
  deposito: string,
  segnale?: AbortSignal,
): Promise<FileRemoto[]> {
  const dati = await chiedi(
    `/models/${deposito}/tree/main?recursive=true`,
    segnale,
  )
  if (!Array.isArray(dati)) return []
  return dati
    .map((grezzo: { path?: unknown, size?: unknown }) => ({
      percorso: typeof grezzo.path === 'string' ? grezzo.path : '',
      byte: typeof grezzo.size === 'number' ? grezzo.size : 0,
    }))
    .filter((file) => file.percorso.toLowerCase().endsWith('.gguf'))
    // Il pezzo si confronta come numero, non a cifre: `-00010-of-00012` comincia con 1.
    .filter((file) => {
      const pezzo = /-(\d+)-of-\d+\.gguf$/i.exec(file.percorso)
      return !pezzo || Number(pezzo[1]) <= 1
    })
    .map((file) => ({
      ...file,
      taglio: taglioDi(file.percorso),
      proiettore: /mmproj/i.test(file.percorso),
    }))
    .sort((a, b) => a.percorso.localeCompare(b.percorso, 'it'))
}

/** Il file del taglio chiesto, o in mancanza il primo che non sia un proiettore. */
export function fileConsigliato (file: readonly FileRemoto[], taglio: string): FileRemoto | null {
  const modelli = file.filter((f) => !f.proiettore)
  return modelli.find((f) => f.taglio === taglio.toUpperCase()) ?? modelli[0] ?? null
}

/** Il proiettore di un deposito, se ne pubblica uno. */
export function proiettoreDi (file: readonly FileRemoto[]): FileRemoto | null {
  return file.find((f) => f.proiettore) ?? null
}

/**
 * L'indirizzo di un file per `gguf.ts`: lo schema `hf:` di `node-llama-cpp`,
 * che ritrova da sé i pezzi di un modello spezzato.
 */
export function indirizzo (deposito: string, file: string): string {
  // testo-fisso: lo schema d'indirizzo di node-llama-cpp
  return `hf:${deposito}/${file}`
}
