// Rigenera `core/dati/modelliConsigliati.ts` da `resources/modelli-consigliati.json`:
// l'elenco dei modelli GGUF consigliati per l'assistente e per le scansioni.
//
//   npm run modelli-consigliati
//
// `npm test` controlla che il file generato sia in accordo con il JSON.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { RADICE } from './common.mjs'

export const FILE_JSON = join(RADICE, 'resources', 'modelli-consigliati.json')
export const FILE_GENERATO = join(RADICE, 'core', 'dati', 'modelliConsigliati.ts')

const TESTATA = `// I modelli consigliati del registro per l'assistente e per l'OCR.
//
// Generato da \`resources/modelli-consigliati.json\` con
// \`npm run modelli-consigliati\`: non si scrive a mano. Che i due siano
// in accordo lo controlla \`npm test\`.

import { testi } from './gguf.testi.js'

/** A che cosa serve un modello, nel registro. */
export type PerChe = 'assistente' | 'ocr'

/** Una voce consigliata: un deposito, e perché sta in elenco. */
export interface VoceCatalogo {
  /** Il deposito: \`utente/nome\`. */
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
 * \`{ ...voce }\` ne copia i valori nella lingua di quel momento.
 */
export const CATALOGO: readonly VoceCatalogo[] = [
`

/** Genera il sorgente TypeScript partendo dai dati del JSON. */
export function componiFile (dati = JSON.parse(readFileSync(FILE_JSON, 'utf8'))) {
  const righe = dati.map((voce) => {
    return `  consigliato('${voce.deposito}', '${voce.chiave}', '${voce.perChe}', '${voce.taglio}'),`
  }).join('\n')
  return `${TESTATA}${righe}\n]\n`
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  writeFileSync(FILE_GENERATO, componiFile(), 'utf8')
  console.log('Modelli consigliati rigenerati da resources/modelli-consigliati.json.')
}
