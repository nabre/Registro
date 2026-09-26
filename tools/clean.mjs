// Rimette il registro allo stato di partenza. `npm run clean`. Per quando si
// sospetta che risponda qualcosa di vecchio invece del codice:
//
//   1. i bundle, `dist/` e `dist-tests/`;
//   2. le cache di Chromium nella cartella dell'utente dell'applicazione,
//      che Chromium rifà da sé;
//   3. la cartella «Electron», il doppione che nasce lanciando l'applicazione
//      su un file invece che sulla cartella (non legge `package.json`).
//
// Nella cartella dell'utente stanno anche le cose vere (`impostazioni.json`,
// `segreti.json`, `documenti.json`, le posizioni delle finestre): si cancella
// per nome, mai per cartella, e allungare l'elenco è una decisione.
//
// La cache delle icone di Windows (`iconcache_*.db`) non si tocca: svuotarla
// vuol dire riavviare `explorer.exe`. Il messaggio in fondo dice come farlo a mano.

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { RADICE } from './common.mjs'

/** I bundle. Rifatti da `npm run build` e da `npm run dev`. */
const BUNDLE = ['dist', 'dist-tests']

/** Le cache che una `BrowserWindow` si crea da sé: toglierle rallenta solo il primo avvio. */
const CACHE = [
  'Cache',
  'Code Cache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'GPUCache',
  'Shared Dictionary',
  'blob_storage',
]

/**
 * Le cartelle dell'utente da ripulire: la vera (il `productName`, come in
 * `app.getPath('userData')`) e il doppione «Electron», che si toglie intero.
 */
const VERA = 'Regiclass'
const DOPPIONE = 'Electron'

function cartellaUtente (nome) {
  const base = process.env.APPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming')
  return join(base, nome)
}

/** Toglie un percorso se c'è, e dice quanto pesava. */
function togli (percorso, etichetta) {
  if (!existsSync(percorso)) return false
  const quanto = peso(percorso)
  rmSync(percorso, { recursive: true, force: true })
  console.log(`  tolto  ${etichetta}${quanto ? ` (${quanto})` : ''}`)
  return true
}

/** Quanto pesa, approssimato e leggibile. */
function peso (percorso) {
  let byte = 0
  const conta = (dove) => {
    let stato
    try {
      stato = statSync(dove)
    } catch {
      return
    }
    if (!stato.isDirectory()) {
      byte += stato.size
      return
    }
    for (const voce of readdirSync(dove)) conta(join(dove, voce))
  }
  conta(percorso)
  if (byte < 1024) return ''
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} kB`
  return `${(byte / 1024 / 1024).toFixed(1)} MB`
}

console.log('I bundle:')
let fatto = BUNDLE.map((nome) => togli(join(RADICE, nome), `${nome}/`)).some(Boolean)
if (!fatto) console.log('  niente da togliere')

console.log(`\nLe cache di Chromium in «${VERA}» (impostazioni e segreti restano):`)
const utente = cartellaUtente(VERA)
if (!existsSync(utente)) {
  console.log('  la cartella non c’è ancora')
} else {
  fatto = CACHE.map((nome) => togli(join(utente, nome), nome)).some(Boolean)
  if (!fatto) console.log('  niente da togliere')
}

console.log(`\nLa cartella doppione «${DOPPIONE}», se il registro è mai partito su un file:`)
if (!togli(cartellaUtente(DOPPIONE), `${DOPPIONE}/`)) console.log('  non c’è, ed è come dev’essere')

console.log(`
Fatto. Il prossimo «npm run dev» ricostruisce i bundle da zero.

L'icona nella barra delle applicazioni ha una cache di Windows che non si tocca
di qui. Se dopo il riavvio è ancora quella vecchia, è lei: si svuota riavviando
l'esplora risorse, e la barra sparisce e ricompare.

  taskkill /f /im explorer.exe & start explorer.exe
`)
