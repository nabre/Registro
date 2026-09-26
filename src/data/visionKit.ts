// Il corredo delle scansioni: `llama-mtmd-cli`, il programma di llama.cpp per
// i modelli multimodali. Qui da dove viene e come si riconosce; lo scarico e le
// sue guardie stanno in `kit.ts`.
//
// Serve un programma esterno perché `node-llama-cpp` non accetta immagini. Il
// modello (pesi + `mmproj`) non si scarica da qui: si sceglie nelle impostazioni.
// Solo Windows x64, archivio senza scheda video (`bin-win-cpu-x64`): è l'unico
// binario che va dappertutto; chi vuole la GPU scrive il suo percorso a mano.

import { cartellaDi, nellaCartella, scarica, scaricoAutomatico as acceso } from './kit.js'
import type { Pacco } from './kit.js'
import { testi } from './mtmd.testi.js'

/** La sottocartella del corredo, dentro i dati dell'applicazione. */
const CARTELLA = 'lettura'

/**
 * La versione di llama.cpp che il registro scarica: fissa, mai «l'ultima»
 * (guardia 2 di `kit.ts`). Si alza a mano insieme all'impronta.
 */
const VERSIONE = 'b11081'

/**
 * Che cosa si tiene dell'archivio: l'eseguibile e tutte le `.dll`, perché
 * `llama-mtmd-cli.exe` ne carica parecchie (fra cui la `ggml-cpu-*` scelta a
 * macchina accesa).
 */
function serve (nome: string): boolean {
  const minuscolo = nome.toLowerCase()
  return minuscolo === 'llama-mtmd-cli.exe' || minuscolo.endsWith('.dll')
}

/** Il programma, per Windows a 64 bit e senza scheda video. */
const PROGRAMMA: Pacco = {
  che: 'programma',
  titolo: () => testi().programma,
  uri:
    'https://github.com/ggml-org/llama.cpp/releases/download/' +
    `${VERSIONE}/llama-${VERSIONE}-bin-win-cpu-x64.zip`,
  // testo-fisso: il nome del file dell'archivio, come lo pubblica llama.cpp
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
  return cartellaDi(CARTELLA)
}

/**
 * Il programma scaricato dal registro, se c'è; vuoto altrimenti. Non fa da
 * guardia: `mtmd.ts` lo passa alla stessa `programmaValido` del percorso a mano.
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
  return acceso()
}

/**
 * Se quel che manca il registro se lo prende adesso: «si può» e «si deve»
 * insieme, così nessun messaggio annuncia uno scarico che non parte.
 */
export function daSé (): boolean {
  return siScarica() && scaricoAutomatico()
}

/** Porta nella cartella il programma, se non c'è. */
export function scaricaCorredo (): Promise<void> {
  return scarica(cartellaCorredo(), PACCHI)
}
