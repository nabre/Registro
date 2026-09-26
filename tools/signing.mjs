/**
 * I due conti che la firma del codice chiede a `.github/workflows/rilascio.yml`
 * (la firma la mette SignPath; vedi `docs/GUIDA.md`, § «La firma del codice»).
 *
 * `versioni`: le configurazioni in `.signpath/artifact-configuration/` vogliono
 * nome e versione scritti dentro l'eseguibile, in due forme:
 *
 *   - `versione`, com'è in `package.json` (`1.7.0-beta.1`): la `ProductVersion`
 *     NSIS di installatore e portabile;
 *   - `versioneWindows`, quattro cifre (`1.6.0.0`) scritte da rcedit
 *     nell'eseguibile (`AppInfo.getVersionInWeirdWindowsForm()`): la quarta,
 *     il numero di build, in GitHub Actions è `0`, e un'anteprima perde `-beta.1`.
 *
 * Esce una riga `nome=valore` per parametro, in `$GITHUB_OUTPUT` se c'è.
 *
 * `firmati <cartella>`: la firma cambia l'impronta dell'installatore, e
 * `latest.yml` e `.blockmap` sono stati scritti prima; senza correzione ogni
 * registro scarterebbe l'aggiornamento. Per ogni `.exe` firmato: lo si mette
 * in `pacchetti/`, si rifà la `.blockmap` (con `buildBlockMap` di
 * app-builder-lib, come electron-builder) e nei file di aggiornamento impronta
 * e misura diventano le nuove. Se l'impronta vecchia non c'è, ci si ferma.
 *
 * Uso: `node tools/signing.mjs versioni`
 *      `node tools/signing.mjs firmati pacchetti/firmati`
 */
import { createHash } from 'node:crypto'
import { appendFileSync, copyFileSync, createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join, resolve } from 'node:path'

import { RADICE } from './common.mjs'

/** Dove electron-builder mette i pacchetti: `directories.output`. */
const PACCHETTI = join(RADICE, 'pacchetti')

/** I `.yml` di `pacchetti/` che non sono file di aggiornamento. */
const NON_AGGIORNAMENTO = new Set(['builder-debug.yml'])

/** Le due forme della versione, come le scrive electron-builder. */
function versioni () {
  const { version } = JSON.parse(readFileSync(join(RADICE, 'package.json'), 'utf8'))
  const [maggiore, minore = '0', correzione = '0'] = String(version).split('.')
  const cifre = [maggiore, minore, correzione].map((parte) => Number.parseInt(parte, 10))
  if (cifre.some(Number.isNaN)) {
    throw new Error(`La versione di package.json non ha tre cifre leggibili: ${version}`)
  }
  return { versione: version, versioneWindows: [...cifre, 0].join('.') }
}

/** Lo SHA-512 di un file in base64, come lo scrive electron-builder. */
async function impronta (file) {
  const hash = createHash('sha512')
  for await (const pezzo of createReadStream(file)) hash.update(pezzo)
  return hash.digest('base64')
}

/** I file di aggiornamento che electron-builder ha scritto in `pacchetti/`. */
function fileDiAggiornamento () {
  return readdirSync(PACCHETTI)
    .filter((nome) => nome.endsWith('.yml') && !NON_AGGIORNAMENTO.has(nome))
    .map((nome) => join(PACCHETTI, nome))
}

async function firmati (cartella) {
  const sorgente = resolve(cartella)
  const eseguibili = readdirSync(sorgente).filter((nome) => nome.endsWith('.exe'))
  if (eseguibili.length === 0) throw new Error(`Nessun .exe firmato in ${sorgente}`)

  const require = createRequire(join(RADICE, 'package.json'))
  const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap.js')
  const aggiornamenti = fileDiAggiornamento()

  for (const nome of eseguibili) {
    const firmato = join(sorgente, nome)
    const destinazione = join(PACCHETTI, nome)
    if (!existsSync(destinazione)) throw new Error(`${nome} non c'è in pacchetti/: chi l'ha firmato?`)

    const prima = { sha512: await impronta(destinazione), size: statSync(destinazione).size }
    copyFileSync(firmato, destinazione)

    const blockmap = `${destinazione}.blockmap`
    const dopo = existsSync(blockmap)
      ? await buildBlockMap(destinazione, 'gzip', blockmap)
      : { sha512: await impronta(destinazione), size: statSync(destinazione).size }

    let citato = false
    for (const file of aggiornamenti) {
      const testo = readFileSync(file, 'utf8')
      if (!testo.includes(prima.sha512)) continue
      citato = true
      writeFileSync(file, testo
        .split(prima.sha512).join(dopo.sha512)
        .split(`size: ${prima.size}\n`).join(`size: ${dopo.size}\n`))
      console.log(`${basename(file)}: ${nome} con l'impronta firmata.`)
    }
    // Il portabile non è citato da nessuno; l'installatore con `.blockmap` deve esserlo.
    if (!citato && existsSync(blockmap)) {
      throw new Error(`${nome} ha una .blockmap ma nessun file di aggiornamento ne riporta l'impronta.`)
    }
    console.log(`${nome}: firmato, ${dopo.size} byte.`)
  }
}

const [comando, argomento] = process.argv.slice(2)

if (comando === 'versioni') {
  const righe = Object.entries(versioni()).map(([nome, valore]) => `${nome}=${valore}`).join('\n') + '\n'
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, righe)
  process.stdout.write(righe)
} else if (comando === 'firmati' && argomento) {
  await firmati(argomento)
} else {
  console.error('Uso: node tools/signing.mjs versioni | firmati <cartella>')
  process.exit(2)
}
