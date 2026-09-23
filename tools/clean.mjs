// Rimette il registro allo stato di partenza. `npm run clean`.
//
// Serve quando una prova non torna e il sospetto è che a rispondere non sia il
// codice ma qualcosa di vecchio rimasto in giro. Sono tre posti diversi, e
// confonderli fa perdere un pomeriggio:
//
//   1. **i bundle** — `dist/` e `dist-tests/`. Li rifà esbuild in due secondi.
//      Restano vecchi solo se il modo sviluppo è morto a metà costruzione.
//   2. **le cache di Chromium** — dentro la cartella dell'utente
//      dell'applicazione. Sono il codice compilato delle pagine, le immagini
//      decodificate, lo shader della GPU. Chromium le rifà da sé all'avvio.
//   3. **la cartella «Electron»** — quella che nasce quando l'applicazione si
//      lancia su un file invece che su una cartella e non legge il nostro
//      `package.json`: allora si chiama «Electron» e si scrive le impostazioni
//      da un'altra parte. Non è una cache, è un doppione, e finché c'è fa
//      credere che le impostazioni non si salvino.
//
// **Quel che non si tocca, mai.** Nella cartella dell'utente, accanto alle
// cache, stanno le cose vere: `impostazioni.json`, `segreti.json` — dentro c'è
// la password della posta — `documenti.json` con l'elenco degli anni, le
// posizioni delle finestre. Qui si cancella per nome, non per cartella: si
// tolgono le cache che si sanno nominare e si lascia in piedi tutto il resto.
// L'elenco è quello sotto, e allungarlo è una decisione, non una svista.
//
// L'icona nella barra delle applicazioni ha una cache sua, che è di Windows e
// non nostra — `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db`. Non
// si tocca di qui: svuotarla vuol dire riavviare `explorer.exe`, cioè far
// sparire e ricomparire la barra delle applicazioni di chi sta lavorando. Se
// serve, lo dice il messaggio in fondo e lo si fa a mano.

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RADICE = join(fileURLToPath(new URL('.', import.meta.url)), '..')

/** I bundle. Rifatti da `npm run build` e da `npm run dev`. */
const BUNDLE = ['dist', 'dist-tests']

/**
 * Le cache di Chromium, per nome.
 *
 * Sono quelle che una `BrowserWindow` si crea da sé. Cancellarle costa il primo
 * avvio un poco più lento e niente altro: non c'è dentro niente che qualcuno
 * abbia scritto.
 */
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
 * Le cartelle dell'utente da ripulire: quella vera e il doppione.
 *
 * Il nome della vera è il `productName` di `package.json` — è così che Electron
 * compone `app.getPath('userData')`. «Electron» è il doppione descritto in
 * testa: quello si toglie intero, perché non contiene niente che valga.
 */
const VERA = 'Registro docenti'
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

/** Quanto pesa, in modo leggibile. Un conto approssimato basta: è per l'occhio. */
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
