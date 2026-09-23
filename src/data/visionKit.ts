// Il corredo delle scansioni: il programma che sa guardare un'immagine.
//
// Per leggere una pagina scansionata serve `llama-mtmd-cli`, il programma di
// llama.cpp per i modelli multimodali. Questo file dichiara da dove viene e
// come si riconosce; **come** ci arriva, e con quali guardie, sta in
// `kit.ts`, che fa lo stesso lavoro per la dettatura.
//
// ------------------------------------------------------- perché un programma
//
// `node-llama-cpp` — la libreria con cui l'assistente gira dentro il processo —
// **non accetta immagini**: sa parlare, non vedere. Finché resta così, dare un
// PNG a un modello locale vuol dire uscire dal processo e far partire il
// programma di llama.cpp. Il giorno in cui la libreria imparasse a guardare,
// questo file e `mtmd.ts` sparirebbero insieme, e sarebbe una buona giornata.
//
// ---------------------------------------------------------- un solo pacco
//
// Qui non c'è un modello da scaricare, e la differenza con la dettatura è
// voluta. Il modello che guarda sta in **due** file — i pesi e il proiettore
// `mmproj` — e sceglierlo è una decisione vera: il catalogo ne propone uno da
// sei gigabyte che legge la scrittura a mano e uno da neanche uno che fatica,
// e quale dei due stia su quella macchina lì lo sa soltanto chi ci insegna.
// Quella scelta ha già la sua pagina, «Modelli linguistici», dove si vede
// quanto pesano e che cosa sanno fare.
//
// Il programma no: è sempre lo stesso, non si sceglie, e sette passaggi per
// prenderlo a mano sono sette passaggi che nessuno fa.
//
// ------------------------------------------------------------ solo Windows
//
// Come per whisper, e per la stessa ragione di fatto: llama.cpp pubblica
// binari già compilati per Windows e per Ubuntu, e per macOS nessuno. Dove non
// si può prendere resta la frase di prima — dove si scarica, come si compila.
//
// L'archivio scelto è quello **senza scheda video**: `bin-win-cpu-x64`. È il
// solo che funzioni dappertutto, e la scelta fra CUDA, Vulkan e ROCm vuole
// sapere che macchina c'è sotto — cioè è di nuovo una decisione, e le decisioni
// non si prendono da qui. Chi ha una scheda e la vuole usare compila o scarica
// la sua versione e ne scrive il percorso nelle impostazioni, che vince.

import { cartellaDi, nellaCartella, scarica, scaricoAutomatico as acceso } from './kit.js'
import type { Avanzamento, Pacco } from './kit.js'

/** La sottocartella del corredo, dentro i dati dell'applicazione. */
const CARTELLA = 'lettura'

/**
 * La versione di llama.cpp che il registro scarica.
 *
 * Fissa e non «l'ultima»: vedi la guardia 2 in testa a `kit.ts`. llama.cpp
 * non pubblica versioni con un numero — pubblica build, una ogni poche ore — e
 * questo rende la regola più importante, non meno: «l'ultima» qui vorrebbe dire
 * un programma diverso ogni settimana, mai lo stesso che qualcuno ha guardato.
 *
 * Si alza a mano, insieme all'impronta, e alzarla è una decisione.
 */
const VERSIONE = 'b11081'

/**
 * Che cosa si tiene, dell'archivio di llama.cpp.
 *
 * L'eseguibile e le librerie. Dentro ci sono cinquanta voci — il server, i
 * banchi di prova, gli strumenti di quantizzazione — di cui a noi ne serve
 * una; le `.dll` si prendono tutte perché `llama-mtmd-cli.exe` ne carica
 * parecchie (`mtmd.dll`, `llama.dll`, `llama-common.dll`, `libomp.dll` e la
 * `ggml-cpu-*` giusta per quel processore, scelta a macchina accesa).
 */
function serve (nome: string): boolean {
  const minuscolo = nome.toLowerCase()
  return minuscolo === 'llama-mtmd-cli.exe' || minuscolo.endsWith('.dll')
}

/** Il programma, per Windows a 64 bit e senza scheda video. */
const PROGRAMMA: Pacco = {
  che: 'programma',
  titolo: 'il programma che legge le scansioni',
  uri:
    'https://github.com/ggml-org/llama.cpp/releases/download/' +
    `${VERSIONE}/llama-${VERSIONE}-bin-win-cpu-x64.zip`,
  archivio: `llama-${VERSIONE}-bin-win-cpu-x64.zip`,
  byte: 18_548_230,
  impronta: '48f13c153946cca8543fd3ab915709ec5f340bfe1f38c687121b3d58f848b7b2',
  arrivo: 'llama-mtmd-cli.exe',
  tiene: serve,
}

const PACCHI: readonly Pacco[] = [PROGRAMMA]

// ---------------------------------------------------------------- la cartella

/** Dove sta il corredo delle scansioni. */
export function cartellaCorredo (): string {
  return cartellaDi('ocr.cartella', CARTELLA)
}

/**
 * Il programma scaricato dal registro, se c'è. Vuoto altrimenti.
 *
 * Non fa da guardia, e non deve: chi lo chiama — `mtmd.ts` — passa quel che
 * torna dalla stessa `programmaValido` che applica al percorso scritto a mano,
 * perché una seconda porta d'ingresso con una guardia più larga è esattamente
 * il modo in cui queste cose si rompono.
 */
export function programmaScaricato (): string {
  return nellaCartella(cartellaCorredo(), PROGRAMMA.arrivo)
}

/** Se su questa macchina il registro sa prendersi il programma da sé. */
export function siScarica (): boolean {
  return process.platform === 'win32' && process.arch === 'x64'
}

/** Se lo deve fare: l'interruttore, che si spegne. */
export function scaricoAutomatico (): boolean {
  return acceso('ocr.scaricoAutomatico')
}

/**
 * Se quel che manca il registro se lo prende adesso.
 *
 * Le due condizioni insieme in un posto solo — **si può** e **si deve** —
 * perché separarle vorrebbe dire un messaggio che annuncia uno scarico che poi
 * non parte. È la stessa forma di `daSé` in `dictation.ts`.
 */
export function daSé (): boolean {
  return siScarica() && scaricoAutomatico()
}

/** Porta nella cartella il programma, se non c'è. */
export function scaricaCorredo (al?: (avanzamento: Avanzamento) => void): Promise<void> {
  return scarica(cartellaCorredo(), PACCHI, al)
}
