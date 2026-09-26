/**
 * Quel che serve a tutti i controlli statici di questa cartella: camminare sui
 * file e scrivere un percorso in una forma sola.
 *
 * Le estensioni sono un argomento perché ogni controllo sceglie le sue
 * (`layers` guarda anche gli `.mjs`, `census` anche `.mts` e `.cjs`). I `.d.ts`
 * restano sempre fuori.
 */
import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * La radice del repository, senza barra in coda: la cartella sopra `tools/`,
 * qualunque sia quella da cui si lancia lo script.
 */
export const RADICE = resolve(fileURLToPath(new URL('..', import.meta.url)))

/** Le estensioni che si guardano quando nessuno ne chiede altre. */
const ESTENSIONI_PREDEFINITE = ['.ts']

/**
 * Ogni file di codice sotto una cartella, ricorsivamente, nell'ordine di
 * `readdirSync` (ogni cartella dove compare). Mai i `.d.ts`, che non contengono codice.
 */
export function fileSotto (cartella, estensioni = ESTENSIONI_PREDEFINITE, raccolti = []) {
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) {
      fileSotto(percorso, estensioni, raccolti)
      continue
    }
    if (voce.name.endsWith('.d.ts')) continue
    if (estensioni.some((fine) => voce.name.endsWith(fine))) raccolti.push(percorso)
  }
  return raccolti
}

/**
 * Lo stesso percorso con le barre in avanti, su qualunque sistema; relativo
 * resta relativo. Messaggi, mappe e confronti usano questa forma sola.
 */
export function piano (percorso) {
  return percorso.split(/[\\/]+/).join('/')
}

/** Il percorso piano rispetto a una base: è come i controlli nominano un file. */
export function daRadice (percorso, radice = '.') {
  return piano(relative(radice, percorso))
}
