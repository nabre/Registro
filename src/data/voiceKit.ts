// Il corredo della dettatura: i due file che servono, e dove si prendono.
//
// Per dettare servono **un programma** — `whisper-cli` — e **un modello**, il
// file `ggml` con cui riconosce le parole. Questo file dichiara quali sono, da
// dove vengono e come si riconoscono; **come** ci arrivano, e con quali
// guardie, sta in `kit.ts`, che fa lo stesso lavoro per le scansioni.
//
// ------------------------------------------------------------- dove si scarica
//
// Il **modello** da Hugging Face, dal deposito di whisper.cpp: un file solo, e
// niente da estrarre.
//
// Il **programma** dalle release di GitHub, e **soltanto su Windows a 64 bit**.
// Non è una dimenticanza: whisper.cpp pubblica un binario già compilato per
// Windows e per Ubuntu, e per macOS nessuno.
//
// Dove il programma non si prende, **non si prende nemmeno il modello**, e non
// per simmetria: mezzo gigabyte di pesi senza il programma che li legge è mezzo
// gigabyte che non serve a niente. `dictation.ts` se ne accorge prima, perché
// guarda il programma per primo, e la frase che mostra resta quella di sempre —
// dove si prende whisper, e come si compila.

import { cartellaDi, nellaCartella, scarica, scaricoAutomatico as acceso } from './kit.js'
import type { Avanzamento, Pacco, Pezzo } from './kit.js'

/** La sottocartella del corredo, dentro i dati dell'applicazione. */
const CARTELLA = 'dettatura'

/**
 * La versione di whisper.cpp che il registro scarica.
 *
 * Fissa e non «l'ultima»: vedi la guardia 2 in testa a `kit.ts`. Si alza a
 * mano, insieme all'impronta, e alzarla è una decisione — si guarda che cosa è
 * cambiato, si riprende l'impronta dalla release, si prova a dettare.
 */
const VERSIONE = 'v1.9.2'

/**
 * Il modello che riconosce la voce.
 *
 * `large-v3-turbo` tagliato a `q5_0`: è il più accurato fra quelli che vanno
 * veloci anche senza scheda video, ed è quello che le impostazioni consigliano
 * da sempre a chi se lo cercava a mano. Mezzo gigabyte contro il gigabyte e
 * mezzo della versione intera, con una differenza che sull'italiano non si
 * sente.
 */
const MODELLO: Pacco = {
  che: 'modello',
  titolo: 'il modello che riconosce la voce',
  uri:
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/' +
    'ggml-large-v3-turbo-q5_0.bin',
  archivio: 'ggml-large-v3-turbo-q5_0.bin',
  byte: 574_041_195,
  impronta: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',
  arrivo: 'ggml-large-v3-turbo-q5_0.bin',
}

/**
 * Che cosa si tiene, dell'archivio di whisper.cpp.
 *
 * L'eseguibile e le librerie, e nient'altro: dentro ci sono una trentina di
 * programmi — un server, dei banchi di prova, degli esempi — di cui a noi ne
 * serve uno. Le `.dll` si prendono tutte, comprese le dodici `ggml-cpu-*`:
 * quale caricare lo decide la libreria a macchina accesa, guardando che
 * processore ha davanti, e tenerne una sola vorrebbe dire indovinare il
 * computer di chi insegna.
 */
function serve (nome: string): boolean {
  const minuscolo = nome.toLowerCase()
  return minuscolo === 'whisper-cli.exe' || minuscolo.endsWith('.dll')
}

/** Il programma, per Windows a 64 bit. */
const PROGRAMMA: Pacco = {
  che: 'programma',
  titolo: 'il programma che trascrive',
  uri:
    'https://github.com/ggml-org/whisper.cpp/releases/download/' +
    `${VERSIONE}/whisper-bin-x64.zip`,
  archivio: 'whisper-bin-x64.zip',
  byte: 8_194_445,
  impronta: '49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a',
  arrivo: 'whisper-cli.exe',
  tiene: serve,
}

/** I due pezzi, nell'ordine in cui conviene prenderli: prima il piccolo. */
const PACCHI: readonly Pacco[] = [PROGRAMMA, MODELLO]

// ---------------------------------------------------------------- la cartella

/** Dove sta il corredo della dettatura. */
export function cartellaCorredo (): string {
  return cartellaDi('dettatura.cartella', CARTELLA)
}

/**
 * Il programma scaricato dal registro, se c'è. Vuoto altrimenti.
 *
 * Non fa da guardia, e non deve: chi lo chiama — `dictation.ts` — passa quel
 * che torna dalla stessa `programmaValido` che applica al percorso scritto a
 * mano, perché una seconda porta d'ingresso con una guardia più larga è
 * esattamente il modo in cui queste cose si rompono.
 */
export function programmaScaricato (): string {
  return nellaCartella(cartellaCorredo(), PROGRAMMA.arrivo)
}

/** Il modello scaricato dal registro, se c'è. Vuoto altrimenti. */
export function modelloScaricato (): string {
  return nellaCartella(cartellaCorredo(), MODELLO.arrivo)
}

/**
 * Se questo pezzo, su questa macchina, il registro lo sa prendere da sé.
 *
 * Il modello dappertutto: è un file e basta. Il programma soltanto su Windows a
 * 64 bit, perché è l'unico sistema per cui whisper.cpp pubblica un binario che
 * si possa usare senza compilarlo. Vedi la nota in testa al file.
 */
export function siScarica (che: Pezzo): boolean {
  if (che === 'modello') return true
  return process.platform === 'win32' && process.arch === 'x64'
}

/** Se il registro prende da sé quel che manca, la prima volta che si detta. */
export function scaricoAutomatico (): boolean {
  return acceso('dettatura.scaricoAutomatico')
}

/**
 * Porta nella cartella quel che manca, e lo racconta mentre lo fa.
 *
 * `quali` dice **quali pezzi servono davvero**, e senza di lui li prendeva
 * tutti e due. Era il difetto di chi si è già messo da parte un modello suo
 * — un `ggml-tiny.bin`, un `base`, quello che ha — e lo ha scritto nelle
 * impostazioni: mancando il solo programma, partiva anche mezzo gigabyte di
 * modello che quella macchina non avrebbe mai usato. `porta()` salta i pacchi
 * già nella cartella, ma un modello scelto a mano **non sta in questa
 * cartella**, e da qui non si vedeva.
 *
 * Chi chiama passa quel che gli manca, perché è lui a saperlo: la guardia sta
 * in `dictation.ts`, che il percorso scritto a mano lo ha già controllato.
 */
export function scaricaCorredo (
  al?: (avanzamento: Avanzamento) => void,
  quali: readonly Pezzo[] = ['programma', 'modello'],
): Promise<void> {
  return scarica(cartellaCorredo(), PACCHI.filter((pacco) => quali.includes(pacco.che)), al)
}

export type { Avanzamento as AvanzamentoCorredo }
