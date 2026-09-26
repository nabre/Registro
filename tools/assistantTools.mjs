/**
 * Rigenera `resources/tools.json`: il registro raccontato a un modello.
 *
 * Non si scrive a mano: esce dalle procedure (`titolo`, `Schema`). Sta nel
 * versionamento perché ogni cambio del contratto si veda come una differenza
 * leggibile. `tests/api/tools.test.mjs` lo ricostruisce e lo confronta con
 * quello su disco.
 *
 * Uso: `npm run tools`
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { catalogoJson } from '../dist-tests/api.mjs'
import { RADICE } from './common.mjs'

const PERCORSO = join(RADICE, 'resources', 'tools.json')

const nuovo = catalogoJson()

let vecchio = ''
try {
  vecchio = readFileSync(PERCORSO, 'utf8')
} catch {
  // Non c'era: lo si scrive e si dice che è nato adesso.
}

if (vecchio === nuovo) {
  console.log('resources/tools.json era già aggiornato.')
  process.exit(0)
}

writeFileSync(PERCORSO, nuovo, 'utf8')

const quanti = JSON.parse(nuovo).attrezzi.length
const prima = vecchio ? JSON.parse(vecchio).attrezzi.length : 0
console.log(
  vecchio
    ? `resources/tools.json aggiornato: ${prima} attrezzi → ${quanti}.`
    : `resources/tools.json scritto: ${quanti} attrezzi.`,
)
