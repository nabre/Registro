/**
 * Il controllo mirato con StrykerJS: un file sorgente, le sole prove che lo
 * riguardano. Quando farlo lo dice la skill `prove` («Controllo mirato con
 * StrykerJS»); mai su tutta la suite, mai in CI.
 *
 *   npm run mutanti -- --file core/dominio/calculations.ts \
 *     --prove "tests/domain/calculations.test.mjs tests/domain/lateness.test.mjs"
 *
 * Il resto della configurazione sta in `stryker.config.json`. Qui si aggiungono
 * `mutate` (il file) e il comando del runner (`node --test` sulle prove), che
 * cambiano a ogni controllo, e `concurrency`, che dipende dalla macchina.
 *
 * `dist-tests/` si costruisce una volta sola (`buildCommand`), nella copia di
 * Stryker: il file mutato contiene tutti i mutanti insieme, e quello acceso lo
 * sceglie `__STRYKER_ACTIVE_MUTANT__`, che il runner mette nell'ambiente di
 * ogni esecuzione. Ricostruire per mutante darebbe gli stessi bundle, e con più
 * processi nella stessa copia li riscriverebbe mentre altri li leggono.
 *
 * `buildCommand` è `node tools/mutanti.mjs --costruisci`, non `node esbuild.mjs
 * --test` e basta: Stryker lo lancia prima di collegare `node_modules` nella
 * copia, ed `esbuild.mjs` prende il worker di pdfjs per percorso da
 * `node_modules/`. Qui il collegamento lo si fa prima, come lo farebbe Stryker
 * (una junction), e `symlinkNodeModules` è spento.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { availableParallelism } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

import { Stryker } from '@stryker-mutator/core'

import { daRadice, piano, RADICE } from './common.mjs'

/**
 * Nella copia di Stryker (la cartella corrente): collega il `node_modules` che
 * Node trova risalendo, cioè quello del progetto, e costruisce `dist-tests/`.
 */
function costruisci () {
  const moduli = dirname(dirname(createRequire(import.meta.url).resolve('esbuild/package.json')))
  if (!existsSync('node_modules')) symlinkSync(moduli, 'node_modules', 'junction')
  const esito = spawnSync(process.execPath, ['esbuild.mjs', '--test'], { stdio: 'inherit' })
  process.exit(esito.status ?? 1)
}

/** Gli stati che entrano nel punteggio: gli altri (errori di compilazione, ignorati) no. */
const UCCISI = new Set(['Killed', 'Timeout'])
const VIVI = new Set(['Survived', 'NoCoverage'])

function ferma (messaggio) {
  console.error(`mutanti: ${messaggio}`)
  console.error('uso: npm run mutanti -- --file <sorgente.ts> --prove "<prova.test.mjs> …"')
  process.exit(2)
}

const { values: opzioni, positionals: sciolti } = parseArgs({
  // `--file a.ts b.ts` senza virgolette lascia `b.ts` sciolto: si rifiuta con l'uso, non con uno stack.
  allowPositionals: true,
  options: {
    file: { type: 'string', multiple: true },
    prove: { type: 'string', multiple: true },
    costruisci: { type: 'boolean' },
  },
})
if (opzioni.costruisci) costruisci()
if (sciolti.length > 0) ferma(`argomenti senza opzione: ${sciolti.join(' ')}`)

const file = opzioni.file ?? []
if (file.length === 0) ferma('manca --file')
if (file.length > 1) ferma('un file solo per volta')
const sorgente = piano(file[0].trim())
// Uno spazio, una virgola o un carattere di glob vorrebbero dire più file.
if (/[\s,*?{}[\]!]/.test(sorgente)) ferma(`«${sorgente}» non è un file solo`)
if (!existsSync(join(RADICE, sorgente))) ferma(`${sorgente} non esiste`)

const prove = (opzioni.prove ?? []).flatMap((voce) => voce.split(/\s+/)).filter(Boolean).map(piano)
// Senza prove il comando lancerebbe tutta la suite a ogni mutante: ore.
if (prove.length === 0) ferma('manca --prove')
for (const prova of prove) {
  if (!existsSync(join(RADICE, prova))) ferma(`${prova} non esiste`)
}

process.chdir(RADICE)
const inizio = Date.now()
const esiti = await new Stryker({
  mutate: [sorgente],
  commandRunner: { command: `node --test ${prove.map((p) => `"${p}"`).join(' ')}` },
  concurrency: Math.max(1, Math.floor(availableParallelism() / 2)),
}).runMutationTest()

const uccisi = esiti.filter((m) => UCCISI.has(m.status)).length
const sopravvissuti = esiti.filter((m) => VIVI.has(m.status))
const validi = uccisi + sopravvissuti.length
const minuti = ((Date.now() - inizio) / 60_000).toFixed(1)

console.log('')
console.log(`${sorgente}: ${esiti.length} mutanti, ${uccisi} uccisi, ${sopravvissuti.length} sopravvissuti, ${minuti} min`)
console.log(`punteggio: ${validi === 0 ? '—' : `${(100 * uccisi / validi).toFixed(2)} %`}`)
for (const m of sopravvissuti) {
  const { line, column } = m.location.start
  console.log(`  ${daRadice(m.fileName, RADICE)}:${line}:${column}  ${m.mutatorName}  ${m.status}`)
}
console.log(`rapporto: ${join(RADICE, 'reports', 'mutation', 'mutation.html')}`)
