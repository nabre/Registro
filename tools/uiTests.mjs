/**
 * Le prove dell'interfaccia su Chromium: `npm run ui-tests`. Provano in un
 * browser quel che `node --test` non vede: pagine, comandi, filtri, tastiera,
 * responsive, pdfjs nel pannello; e accendono una volta il registro vero in
 * Electron.
 *
 * Sono prove `@playwright/test` in `tests/interfaccia/` (ADR-50, passo 5).
 * Questo attrezzo costruisce quel che leggono e lancia Playwright; gli
 * argomenti in più passano a lui (`npm run ui-tests -- navigation`).
 * Fuori da `npm test` perché vogliono un Chromium scaricato
 * (`npx playwright install chromium`); in CI sono un lavoro a parte.
 */

import { spawnSync } from 'node:child_process'

import { RADICE } from './common.mjs'

/** Una riga di comando nella shell, con l'uscita a schermo. */
function esegui (riga) {
  return spawnSync(riga, { cwd: RADICE, shell: true, stdio: 'inherit' }).status === 0
}

function manca (messaggio) {
  process.stderr.write(`${messaggio}\n`)
  process.exit(1)
}

// I bundle che le prove leggono (`dist-tests/ui.*`), e `dist/` per la prova
// che accende Electron: costruiti una volta per tutte.
for (const costruzione of ['node esbuild.mjs --ui', 'node esbuild.mjs']) {
  process.stdout.write(`\n— ${costruzione}\n`)
  if (!esegui(costruzione)) manca(`«${costruzione}» non riesce: le prove dell’interfaccia non hanno che cosa leggere.`)
}

// Gli argomenti passano come sono: nomi di file o opzioni di Playwright.
const altri = process.argv.slice(2).map((argomento) => JSON.stringify(argomento)).join(' ')
process.stdout.write('\n— playwright test\n')
const riuscite = esegui(`npx playwright test -c tests/interfaccia/playwright.config.ts ${altri}`.trim())

process.stdout.write(
  riuscite
    ? '\nLe prove dell’interfaccia passano.\n'
    : '\nLe prove dell’interfaccia non passano. Se manca il browser: npx playwright install chromium\n',
)
process.exit(riuscite ? 0 : 1)
