/**
 * Le licenze di tutto l'albero `node_modules`, come controllo e non come
 * promemoria (ADR-50, criterio 1).
 *
 *   1. Produzione (`dependencies` e quel che si tirano dietro, cioè quel che
 *      electron-builder mette nel pacchetto): ogni licenza dev'essere nella
 *      lista ammessa, o un'alternativa `OR` che ne contiene una. Sconosciuta,
 *      indovinata (`*`) o `UNLICENSED` è un guasto.
 *   2. Sviluppo: non arriva sul computer del docente, quindi è un guasto solo il
 *      copyleft forte (GPL, AGPL, SSPL); il resto fuori lista è un avviso.
 *      Tranne quel che esbuild mette nei bundle dell'applicazione (pdf-lib,
 *      pdfjs, immer…): sta in `devDependencies` ma arriva al docente, quindi
 *      vale la regola della produzione. L'elenco esatto viene dal metafile.
 *   3. I pacchetti di produzione senza file di licenza: MIT e simili chiedono di
 *      portarsi dietro l'avviso, e senza file non c'è niente da portare.
 *   4. Le risorse non npm del pacchetto (i caratteri dei PDF): dichiarate in
 *      `tools/licenze-risorse.json`, ognuna col suo file di licenza accanto;
 *      un carattere in `resources/` non dichiarato è un guasto.
 *
 * Un pacchetto fuori regola entra solo con un motivo scritto in
 * `tools/licenze-eccezioni.json` (`{ "nome@versione" o "nome": "perché" }`).
 *
 * Uso: `npm run licenze`
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

import * as esbuild from 'esbuild'
import { init } from 'license-checker-rseidelsohn'

import { applicazione } from '../esbuild.mjs'

import { RADICE } from './common.mjs'

const AMMESSE = new Set([
  'MIT', 'ISC', '0BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0',
  'BlueOak-1.0.0', 'Unlicense', 'CC0-1.0',
])
// La licenza della Python Software Foundation è permissiva, ma nel programma
// entra solo con un'eccezione scritta.
const AMMESSE_SVILUPPO = new Set([...AMMESSE, 'Python-2.0'])
// Per le risorse: i caratteri hanno la loro licenza, la SIL OFL.
const AMMESSE_RISORSE = new Set([...AMMESSE, 'OFL-1.1'])

const COPYLEFT_FORTE = /(^|[^L])GPL|AGPL|SSPL/i
const CARATTERI = /\.(ttf|otf|woff2?|pfb|pfm|afm)$/i
const FILE_LICENZA = /^(licen[cs]e|copying|notice)/i

const leggiJson = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'))

const progetto = leggiJson('package.json')
const eccezioni = leggiJson('tools/licenze-eccezioni.json')
const risorse = leggiJson('tools/licenze-risorse.json')
const eccezioniUsate = new Set()

function eccezione (chiave) {
  const nome = chiave.slice(0, chiave.lastIndexOf('@'))
  for (const k of [chiave, nome]) {
    if (Object.hasOwn(eccezioni, k)) {
      eccezioniUsate.add(k)
      return eccezioni[k]
    }
  }
  return null
}

/**
 * Vera se l'espressione SPDX si può usare con licenze della lista: basta
 * un'alternativa `OR` le cui parti `AND` siano tutte ammesse. Le parentesi si
 * ignorano: le espressioni dell'albero sono piatte.
 */
function ammessa (licenze, lista) {
  const testo = (Array.isArray(licenze) ? licenze.join(' OR ') : String(licenze ?? ''))
  if (!testo || testo.includes('*')) return false
  return testo.replace(/[()]/g, ' ').split(/\s+OR\s+/i)
    .some((alternativa) => alternativa.split(/\s+AND\s+/i).every((l) => lista.has(l.trim())))
}

const albero = (produzione) => new Promise((risolvi, rifiuta) => {
  init({ start: RADICE, production: produzione, development: !produzione }, (errore, pacchetti) => {
    if (errore) rifiuta(errore)
    else risolvi(pacchetti)
  })
})

const problemi = []
const avvisi = []
const questo = `${progetto.name}@${progetto.version}`

// ----------------------------------------------------------------- produzione

const produzione = await albero(true)
delete produzione[questo]
const senzaFile = []
for (const [chiave, info] of Object.entries(produzione)) {
  const file = info.licenseFile ? basename(info.licenseFile) : ''
  if (!FILE_LICENZA.test(file)) senzaFile.push(chiave)
  if (ammessa(info.licenses, AMMESSE) || eccezione(chiave)) continue
  problemi.push(`produzione: ${chiave} ha licenza ${info.licenses ?? 'sconosciuta'}`)
}

// ------------------------------------------------------------------ sviluppo

/** Il nome del pacchetto da un percorso dentro `node_modules`, anche con lo scope. */
function pacchettoDi (percorso) {
  const pezzi = percorso.replaceAll('\\', '/').split('node_modules/').pop().split('/')
  return pezzi[0].startsWith('@') ? `${pezzi[0]}/${pezzi[1]}` : pezzi[0]
}

/**
 * I pacchetti che finiscono nei bundle dell'applicazione: si costruisce in
 * memoria, senza scrivere, e si leggono gli ingressi del metafile.
 */
async function impacchettati () {
  const nomi = new Set()
  for (const { ricarica: _ricarica, ...configurazione } of applicazione) {
    const esito = await esbuild.build({
      ...configurazione, write: false, metafile: true, logLevel: 'silent',
    })
    for (const ingresso of Object.keys(esito.metafile?.inputs ?? {})) {
      if (ingresso.includes('node_modules/')) nomi.add(pacchettoDi(ingresso))
    }
  }
  return nomi
}

const sviluppo = await albero(false)
delete sviluppo[questo]
const neiBundle = await impacchettati()
for (const [chiave, info] of Object.entries(sviluppo)) {
  const nome = chiave.slice(0, chiave.lastIndexOf('@'))
  if (neiBundle.has(nome)) {
    if (ammessa(info.licenses, AMMESSE) || eccezione(chiave)) continue
    problemi.push(`nei bundle: ${chiave} ha licenza ${info.licenses ?? 'sconosciuta'}`)
    continue
  }
  if (ammessa(info.licenses, AMMESSE_SVILUPPO) || eccezione(chiave)) continue
  const riga = `sviluppo: ${chiave} ha licenza ${info.licenses ?? 'sconosciuta'}`
  if (COPYLEFT_FORTE.test(String(info.licenses))) problemi.push(riga)
  else avvisi.push(riga)
}

// ------------------------------------------------------------------- risorse

const dichiarate = new Set()
for (const { cartella, file, licenza, testo } of risorse) {
  if (!AMMESSE_RISORSE.has(licenza)) problemi.push(`risorse: ${cartella} ha licenza ${licenza}`)
  if (!existsSync(join(RADICE, cartella, testo))) {
    problemi.push(`risorse: manca ${cartella}/${testo}`)
  }
  for (const nome of file) {
    if (existsSync(join(RADICE, cartella, nome))) dichiarate.add(`${cartella}/${nome}`)
    else problemi.push(`risorse: dichiarato ma assente ${cartella}/${nome}`)
  }
}
for (const voce of readdirSync(join(RADICE, 'resources'), { recursive: true })) {
  const percorso = `resources/${String(voce).replaceAll('\\', '/')}`
  if (CARATTERI.test(percorso) && !dichiarate.has(percorso)) {
    problemi.push(`risorse: ${percorso} non è in tools/licenze-risorse.json`)
  }
}

// -------------------------------------------------------------------- esito

for (const chiave of Object.keys(eccezioni)) {
  if (!eccezioniUsate.has(chiave)) avvisi.push(`eccezione non più usata: ${chiave}`)
}
const conti = `${Object.keys(produzione).length} pacchetti di produzione, ` +
  `${neiBundle.size} nei bundle, ` +
  `${Object.keys(sviluppo).length} di sviluppo`

if (senzaFile.length) {
  console.log(`Senza file di licenza (produzione): ${senzaFile.sort().join(', ')}`)
}
for (const riga of avvisi) console.log(`avviso ${riga}`)
if (problemi.length) {
  for (const riga of problemi) console.log(`GUASTO ${riga}`)
  console.log(`Licenze: ${conti}; ${problemi.length} problemi.`)
  process.exitCode = 1
} else {
  console.log(`Licenze: ${conti}, tutte ammesse.`)
}
