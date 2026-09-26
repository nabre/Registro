// Caricamento pigro di `node-llama-cpp` (llama.cpp dentro il main process).
//
// Il pacchetto è solo ESM e il main è un bundle CommonJS: si arriva con
// `import()`, che esbuild conserva finché il bersaglio è `node18` (sotto,
// `ERR_REQUIRE_ESM` all'avvio). Resta `external` e fuori dall'`asar` perché
// ritrova i suoi binari dalla struttura di cartelle. Si carica una volta sola
// e solo quando serve: pesa decine di megabyte.

import type {
  ChatHistoryItem,
  ChatSessionModelFunction,
  GbnfJsonSchema,
  Llama,
  LlamaChatSession,
  LlamaChatSessionOptions,
  LlamaModel,
  ModelDownloader,
  ModelDownloaderOptions,
} from 'node-llama-cpp' with { 'resolution-mode': 'import' }

import { testi } from './llm.testi.js'

export type { ChatHistoryItem, Llama, LlamaChatSession, LlamaModel }

/** Le sole parti della libreria che si usano, dichiarate a mano. */
interface ModuloLlama {
  getLlama: (opzioni?: { gpu?: false | 'auto' }) => Promise<Llama>
  LlamaChatSession: new (opzioni: LlamaChatSessionOptions) => LlamaChatSession
  defineChatSessionFunction: (descrizione: {
    description?: string
    params?: GbnfJsonSchema
    handler: (argomenti: never) => unknown
  }) => ChatSessionModelFunction
  createModelDownloader: (opzioni: ModelDownloaderOptions) => Promise<ModelDownloader>
}

/** La libreria, caricata una volta sola. */
let caricata: Promise<ModuloLlama> | null = null

/** La libreria, caricata alla prima chiamata; se manca solleva un errore leggibile. */
export async function modulo (): Promise<ModuloLlama> {
  caricata ??= import('node-llama-cpp')
    .then((m) => m as unknown as ModuloLlama)
    .catch((guasto: unknown) => {
      // Azzerata perché un secondo tentativo ricarichi invece di riavere la promessa fallita.
      caricata = null
      throw new Error(testi().libreria, { cause: guasto })
    })
  return caricata
}

/** Llama, avviata una volta sola: dentro c'è l'inizializzazione del binario. */
let avviata: Promise<Llama> | null = null

/**
 * Il motore di llama.cpp, avviato una volta per tutto il programma.
 * `gpu: 'auto'`: usa la scheda video se c'è, altrimenti il processore.
 */
export async function llama (): Promise<Llama> {
  avviata ??= modulo()
    .then((m) => m.getLlama({ gpu: 'auto' }))
    .catch((guasto: unknown) => {
      avviata = null
      throw guasto
    })
  return avviata
}
