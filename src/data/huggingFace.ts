// Hugging Face: come si trova un modello da scaricare, e nient'altro.
//
// È il magazzino da cui vengono i `.gguf`, e questo file contiene soltanto il
// suo dialetto: i due indirizzi che si interrogano, la forma delle risposte, e
// il modo di comporre l'indirizzo di un file. Chi lo scarica e dove lo mette è
// `gguf.ts`; questo file non scrive niente sul disco.
//
// ------------------------------------------------------------ che cosa esce di qui
//
// **Niente.** È l'unica cosa che parla con la rete in tutta la catena dei
// modelli, e va nella direzione opposta a quella che preoccupa: porta dentro
// dei pesi, non porta fuori un dato del registro. Le uniche parole che escono
// sono quelle che qualcuno ha battuto nella casella di ricerca — «qwen», «7b»,
// «vision» — e non c'è nessun percorso per cui un nome, una media o un'assenza
// possa finire in una di queste richieste: la ricerca non sa niente
// dell'archivio, e non lo può sapere, perché questo file non lo importa.
//
// Nessuna chiave, nessuna registrazione, nessun conto: i depositi pubblici si
// leggono senza. Un modello che chiede di accettare delle condizioni — Llama ne
// chiede — non si scarica da qui, e lo si dice invece di far fallire uno
// scarico a metà.
//
// ------------------------------------------------------- il catalogo che consigliamo
//
// Cercare fra duecentomila depositi è un lavoro per chi sa già cosa cerca. Chi
// apre la pagina per la prima volta vuole **un modello che funzioni**, e i due
// usi del registro chiedono due cose diverse e incompatibili:
//
//   l'assistente   deve saper **chiamare gli attrezzi**. Sotto i 3 miliardi di
//                  parametri quella capacità diventa inaffidabile: il modello
//                  si inventa i nomi delle procedure invece di aprirle.
//   le scansioni   devono saper **guardare**, e quindi vogliono due file — i
//                  pesi e il proiettore.
//
// Perciò il catalogo dice a che cosa serve ogni voce, quanto pesa, e che cosa
// vuole la macchina. Le voci sono depositi, non nomi di file: i nomi dei file
// cambiano a ogni ripubblicazione, e un catalogo che li scrivesse a mano
// comincerebbe a mentire da solo. I file veri si chiedono all'albero del
// deposito, qui sotto.
//
// -------------------------------------------------------------- la quantizzazione
//
// Un modello si pubblica in più versioni, tagliate a precisione diversa: `Q8`
// pesa il doppio di `Q4` e risponde quasi uguale; `Q2` entra dappertutto e
// comincia a sbagliare. `Q4_K_M` è il compromesso che quasi tutti consigliano e
// quello che il catalogo preferisce — ma la scelta resta in elenco, perché su
// una macchina con poca memoria «entra» conta più di «risponde meglio».

/** Quanto si aspetta una risposta dal sito, prima di rinunciare. */
const ATTESA_MS = 15000

/** Quanti depositi si mostrano in una ricerca. */
const QUANTI = 20

/** La radice dell'API pubblica. */
const API = 'https://huggingface.co/api'

// ------------------------------------------------------------- il catalogo

/** A che cosa serve un modello, nel registro. */
export type PerChe = 'assistente' | 'ocr'

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

/**
 * I modelli che il registro consiglia.
 *
 * Tenuto a mano e corto apposta. Un catalogo lungo è un modo di non scegliere,
 * e chi apre questa pagina non sta cercando il modello migliore del mondo: sta
 * cercando quello che sulla sua macchina risponde alle domande sul registro
 * senza inventare. Le voci sono quattro perché i casi veri sono quattro: una
 * macchina piccola e una normale, per ciascuno dei due usi.
 */
export const CATALOGO: readonly VoceCatalogo[] = [
  {
    deposito: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    titolo: 'Qwen 2.5 — 7 miliardi',
    perChe: 'assistente',
    taglio: 'Q4_K_M',
    nota:
      'La scelta di riferimento per l’assistente: chiama gli attrezzi con precisione e ' +
      'risponde in italiano. Vuole circa 5 GB sul disco e 8 GB di memoria libera.',
  },
  {
    deposito: 'bartowski/Qwen2.5-3B-Instruct-GGUF',
    titolo: 'Qwen 2.5 — 3 miliardi',
    perChe: 'assistente',
    taglio: 'Q4_K_M',
    nota:
      'Per una macchina senza scheda video o con poca memoria: risponde in metà tempo e ' +
      'sbaglia più spesso l’attrezzo. Circa 2 GB sul disco.',
  },
  {
    deposito: 'ggml-org/Qwen2.5-VL-7B-Instruct-GGUF',
    titolo: 'Qwen 2.5 VL — 7 miliardi, vede',
    perChe: 'ocr',
    taglio: 'Q4_K_M',
    nota:
      'Legge le pagine scansionate, compresa la scrittura a mano di un foglio firmato. ' +
      'Vuole anche il suo proiettore, che il registro scarica insieme. Circa 6 GB in tutto.',
  },
  {
    deposito: 'ggml-org/SmolVLM-500M-Instruct-GGUF',
    titolo: 'SmolVLM — mezzo miliardo, vede',
    perChe: 'ocr',
    taglio: 'Q8_0',
    nota:
      'Minuscolo e velocissimo: legge il testo stampato di una scansione pulita e fatica ' +
      'con la scrittura a mano. Meno di 1 GB, gira su qualunque macchina.',
  },
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
    throw new Error('Hugging Face non risponde: controlla la connessione.', { cause: guasto })
  })
  if (!risposta.ok) {
    throw new Error(`Hugging Face risponde ${risposta.status}.`)
  }
  return risposta.json()
}

/**
 * I depositi che contengono `.gguf` e somigliano a quel che si è battuto.
 *
 * Ordinati per scarichi e non per somiglianza: fra venti depositi che si
 * chiamano quasi uguale, quello che hanno scaricato in centomila è quello che
 * funziona — e chi cerca non ha altro modo di saperlo.
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
      // `gated` è `false` oppure il modo in cui è ristretto — «auto», «manual»:
      // qualunque cosa che non sia `false` vuol dire che da qui non si scarica.
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
 * I `.gguf` di un deposito, come stanno adesso.
 *
 * Si chiedono invece di scriverli nel catalogo perché i nomi cambiano: un
 * deposito ripubblicato con un'altra convenzione farebbe fallire uno scarico
 * che ieri funzionava, e il messaggio parlerebbe di un file che non è mai
 * esistito. L'albero dice la verità di oggi.
 *
 * I pezzi di un modello spezzato — `-00002-of-00009.gguf` — non si mostrano: si
 * scarica il primo e `gguf.ts` prende gli altri da sé, e un elenco che li
 * mostrasse tutti farebbe scegliere a chi guarda un pezzo di mezzo.
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
    .filter((file) => !/-0*[2-9]\d*-of-\d+\.gguf$/i.test(file.percorso))
    .map((file) => ({
      ...file,
      taglio: taglioDi(file.percorso),
      proiettore: /mmproj/i.test(file.percorso),
    }))
    .sort((a, b) => a.percorso.localeCompare(b.percorso, 'it'))
}

/**
 * Il file da preferire fra quelli di un deposito, dato un taglio.
 *
 * Il taglio chiesto se c'è; se non c'è — un deposito che pubblica solo `Q8_0`,
 * o che li nomina in un modo che non riconosciamo — il primo che non sia un
 * proiettore, perché qualcosa è meglio di un elenco vuoto e la pagina mostra
 * comunque tutti i file.
 */
export function fileConsigliato (file: readonly FileRemoto[], taglio: string): FileRemoto | null {
  const modelli = file.filter((f) => !f.proiettore)
  return modelli.find((f) => f.taglio === taglio.toUpperCase()) ?? modelli[0] ?? null
}

/** Il proiettore di un deposito, se ne pubblica uno. */
export function proiettoreDi (file: readonly FileRemoto[]): FileRemoto | null {
  return file.find((f) => f.proiettore) ?? null
}

/**
 * L'indirizzo di un file, nella forma che `gguf.ts` sa scaricare.
 *
 * `hf:` e non un URL: è lo schema che `node-llama-cpp` riconosce, e con cui sa
 * anche ritrovare i pezzi di un modello spezzato senza che nessuno glieli
 * elenchi.
 */
export function indirizzo (deposito: string, file: string): string {
  return `hf:${deposito}/${file}`
}
