// `node-llama-cpp`: come si arriva a questa libreria, e nient'altro.
//
// È il pezzo di llama.cpp che gira dentro il registro — i pesi caricati nel
// main process, nessun servizio, nessuna porta — e questo file esiste per una
// ragione sola: **arrivarci costa, e costa una volta.**
//
// ------------------------------------------------ perché un `import()` e non un `import`
//
// `node-llama-cpp` è un pacchetto solo ESM, e il main process del registro è un
// bundle CommonJS (`dist/main.cjs`, vedi `esbuild.mjs`). Da CommonJS un
// modulo ESM non si `require`, si `import()`: è una funzione asincrona, torna
// una promessa, e Node la esegue come tale anche dentro un file CJS.
//
// Che sopravviva al bundler non è scontato e non è un caso: esbuild riscrive
// `import()` in `require()` quando il bersaglio non lo regge, e qui il
// bersaglio è `node18`, che lo regge. Se un giorno quel numero scendesse, il
// registro morirebbe all'avvio con `ERR_REQUIRE_ESM` — perciò sta scritto qui,
// accanto alla riga che ne dipende, e non solo in `esbuild.mjs`.
//
// I tipi vogliono la stessa dichiarazione, con `resolution-mode`: TypeScript,
// in un file destinato a CommonJS, non legge i tipi di un pacchetto ESM finché
// non gli si promette che lo si caricherà come ESM. È una promessa, e la
// mantiene `import()`.
//
// ------------------------------------------------------ e perché non nel bundle
//
// La libreria resta `external`: porta con sé i binari di llama.cpp per la
// piattaforma, e la sua struttura di cartelle è il modo in cui li ritrova.
// Impacchettarla vorrebbe dire cercarli dove non ci sono. Nell'applicazione
// installata sta fuori dall'`asar`, come koffi: le due righe stanno in
// `electron-builder.json`, con il perché accanto.
//
// ---------------------------------------------------------------- il caricamento
//
// Si carica **una volta sola e solo quando serve**: dentro ci sono decine di
// megabyte di binario, e un registro aperto per segnare due assenze non deve
// pagarli. Finché nessuno accende l'assistente, questo file non tocca niente.

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

export type { ChatHistoryItem, Llama, LlamaChatSession, LlamaModel }

/**
 * Quel che si usa della libreria, e nient'altro.
 *
 * Dichiarato a mano invece di prendere il modulo intero perché è l'elenco di
 * che cosa il registro si è legato: quattro nomi, e si vede subito quanto
 * costerebbe cambiare libreria.
 */
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

/**
 * La libreria, caricandola se è la prima volta.
 *
 * Solleva con una frase che si legge: chi arriva qui sta aspettando una
 * risposta dall'assistente, e «Cannot find module» non gli dice che il
 * programma è stato installato male.
 */
export async function modulo (): Promise<ModuloLlama> {
  caricata ??= import('node-llama-cpp')
    .then((m) => m as unknown as ModuloLlama)
    .catch((guasto: unknown) => {
      // Azzerata, così un secondo tentativo ricarica davvero invece di
      // riricevere la promessa già fallita.
      caricata = null
      throw new Error(
        'La libreria dei modelli (node-llama-cpp) non si è caricata: l’installazione del ' +
        'registro è incompleta.',
        { cause: guasto },
      )
    })
  return caricata
}

/** Llama, avviata una volta sola: dentro c'è l'inizializzazione del binario. */
let avviata: Promise<Llama> | null = null

/**
 * Il motore di llama.cpp, avviato una volta per tutto il programma.
 *
 * `gpu: 'auto'` e non `false`: su una macchina con una scheda video llama.cpp
 * la trova da sé, e su una senza ripiega sul processore senza che nessuno
 * debba dichiararlo. È l'unica impostazione che non si chiede a chi insegna,
 * perché è l'unica a cui non saprebbe rispondere.
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
