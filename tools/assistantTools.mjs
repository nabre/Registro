/**
 * Rigenera `resources/tools.json`: il registro raccontato a un modello.
 *
 * Il file non si scrive a mano e non si corregge a mano. Esce dalle procedure
 * — dai loro `titolo`, dai loro `Schema` — perché una seconda copia del
 * contratto è una copia che resta indietro, e resta indietro in silenzio:
 * un ingresso che perde un campo non rompe niente di visibile, l'attrezzo
 * continua a esistere e quel campo semplicemente non arriva più.
 *
 * Sta nel versionamento apposta. È il posto in cui una procedura aggiunta,
 * tolta o cambiata di forma compare come una differenza leggibile, e in cui
 * chi rilegge una modifica vede che cos'è successo al contratto senza doverlo
 * dedurre dai file delle procedure.
 *
 * Che non resti indietro lo tiene fermo `tests/api/tools.test.mjs`, che lo
 * ricostruisce e lo confronta con quello su disco: se questa riga non è stata
 * data, le prove non passano.
 *
 * Uso: `npm run tools`
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

import { catalogoJson } from '../dist-tests/api.mjs'

const PERCORSO = fileURLToPath(new URL('../resources/tools.json', import.meta.url))

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
