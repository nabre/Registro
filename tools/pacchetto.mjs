// electron-builder con l'icona del portabile.
//
//   node tools/pacchetto.mjs --config electron-builder.json [argomenti di electron-builder]
//
// Gli argomenti sono quelli di `electron-builder`, letti dal suo stesso parser.
// La differenza è una sola: il bersaglio `portable` prende sempre l'icona del
// programma (`win.icon`), e `electron-builder.json` non ha una chiave per
// cambiarla. L'API sì: `effectiveOptionComputed` riceve comandi e definizioni
// di NSIS prima che partano, e lì si sostituisce `Icon` con la borsa di
// `icons/portabile.ico` (`tools/icons.cjs`). L'eseguibile dentro, quello che si
// apre, tiene la spirale.

import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build, configureBuildCommand, createYargs } = require('electron-builder/out/builder')
const { wrap } = require('electron-builder/out/cli/cli-util')

const ICONA_PORTABILE = fileURLToPath(new URL('../icons/portabile.ico', import.meta.url))

if (!existsSync(ICONA_PORTABILE)) {
  console.error(`Manca ${ICONA_PORTABILE}: npm run icons`)
  process.exit(1)
}

/**
 * Chiamata da ogni bersaglio con le sue opzioni finali. NSIS passa
 * `[definizioni, comandi]`, e solo il portabile definisce
 * `REQUEST_EXECUTION_LEVEL`; gli altri bersagli passano forme diverse e restano
 * come sono. `false`: il bersaglio si costruisce.
 */
function opzioniCalcolate (opzioni) {
  if (Array.isArray(opzioni)) {
    const [definizioni, comandi] = opzioni
    if (definizioni?.REQUEST_EXECUTION_LEVEL !== undefined && typeof comandi?.Icon === 'string') {
      comandi.Icon = `"${ICONA_PORTABILE}"`
    }
  }
  return false
}

void createYargs()
  .command(['build', '*'], 'Build', configureBuildCommand, wrap((argomenti) => build({ ...argomenti, effectiveOptionComputed: opzioniCalcolate })))
  .help()
  .strict()
  .parse()
