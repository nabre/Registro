// Le icone dell'applicazione, ricavate da `resources/registro.svg`.
//
// L'icona dell'estensione è un contorno monocromatico: la barra delle attività
// di VS Code la colora da sé con `currentColor`. Un'icona di programma non ha
// nessuno che la colori — sta sul desktop, nella barra di Windows e
// nell'installer — e allora il disegno va posato su un fondo suo. Il tratto
// resta quello del `.svg`: si legge di lì e non si ridisegna, o fra qualche mese
// l'estensione e l'app avrebbero due libri diversi.
//
// Si rende con Electron perché Electron c'è già: è Chromium, sa leggere l'SVG
// come lo leggerà chi guarda l'icona, e non aggiunge una dipendenza che
// servirebbe una volta l'anno.
//
//   npm run icons
//
// Produce `icons/icon.png` (512×512, da cui electron-builder ricava il `.icns`
// di macOS se un giorno servirà) e `icons/icon.ico` con le nove misure che
// Windows va a cercare, dalla riga dell'esplora risorse ai riquadri grandi.

// Il file è CommonJS apposta: dentro Electron il modulo `electron` si prende
// con `require`, e da un modulo ECMAScript si otterrebbe il guscio che Node
// usa fuori da Electron — quello che restituisce il percorso dell'eseguibile e
// non l'API.
const electron = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const percorso = require('node:path')

// Lo stesso guscio arriva anche dentro Electron quando `ELECTRON_RUN_AS_NODE`
// è acceso, e il terminale di VS Code lo accende per tutti i suoi figli:
// `npm run icons` lanciato da lì cadeva su `app` indefinito. Ci si rilancia
// senza, come fa `tools/dev.mjs` per l'applicazione.
if (typeof electron === 'string') {
  const ambiente = { ...process.env }
  delete ambiente.ELECTRON_RUN_AS_NODE
  const esito = require('node:child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: ambiente,
  })
  process.exit(esito.status ?? 1)
}

const { app, BrowserWindow } = electron

const radice = percorso.dirname(__dirname)

/** Il fondo e il tratto. Il blu è quello della copertina di un registro. */
const FONDO_ALTO = '#2f5d8f'
const FONDO_BASSO = '#1d3c5e'
const TRATTO = '#ffffff'

/**
 * Le misure che finiscono nel `.ico`. Windows non ridimensiona: sceglie la più
 * vicina fra quelle che trova, e senza la 16 la voce nel menu di avvio esce
 * sgranata. La 20 e la 40 sono la 16 e la 32 con lo schermo al 125%, che è
 * l'ingrandimento di serie di tanti portatili: senza, Windows rimpicciolisce
 * la 24 e la 48, e il tratto si impasta nella barra del titolo e nel cassetto.
 */
const MISURE = [16, 20, 24, 32, 40, 48, 64, 128, 256]

/** La misura del `.png`, che è la sorgente per i formati che si generano dopo. */
const MISURA_PNG = 512

/**
 * Il raggio degli angoli, nelle unità del `viewBox` da 32: gli angoli tondi
 * sono quel che distingue un'icona di programma da un ritaglio di immagine.
 */
const RAGGIO = 6

/**
 * Il disegno posato sul fondo.
 *
 * Il `viewBox` del `.svg` è 24×24 e il libro ne occupa quasi tutto: su un fondo
 * quadrato serve un margine — di qui il `viewBox` da 32 e lo spostamento di 4 —
 * o l'icona sembrerebbe premuta contro i bordi. Il tratto si ingrossa un poco
 * perché a 16 pixel un tratto da 1.6 sparisce.
 */
function disegno (misura) {
  const sorgente = readFileSync(percorso.join(radice, 'resources', 'registro.svg'), 'utf8')
  const glifo = sorgente
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .trim()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${misura}" height="${misura}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${FONDO_ALTO}"/>
      <stop offset="1" stop-color="${FONDO_BASSO}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="32" height="32" rx="${RAGGIO}" fill="url(#fondo)"/>
  <g transform="translate(4 4)" fill="none" stroke="${TRATTO}" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round">${glifo}</g>
</svg>`
}

/**
 * Un PNG della misura chiesta.
 *
 * Il disegno si posa su una tela e la tela si fa PNG: non si fotografa la
 * finestra. Fotografarla vorrebbe dire aspettare che Chromium l'abbia dipinta,
 * e una finestra nascosta e trasparente quel momento non lo annuncia mai —
 * `capturePage` resta appesa. La tela invece non ha bisogno di essere vista.
 */
async function rendi (finestra, misura) {
  const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(disegno(misura))}`
  const base64 = await finestra.webContents.executeJavaScript(`new Promise((risolvi, rifiuta) => {
    const immagine = new Image()
    immagine.onload = () => {
      const tela = document.createElement('canvas')
      tela.width = ${misura}
      tela.height = ${misura}
      tela.getContext('2d').drawImage(immagine, 0, 0, ${misura}, ${misura})
      risolvi(tela.toDataURL('image/png').split(',')[1])
    }
    immagine.onerror = () => rifiuta(new Error('il disegno non si carica'))
    immagine.src = ${JSON.stringify(svg)}
  })`)
  return Buffer.from(base64, 'base64')
}

/**
 * Il `.ico`, che è un indice seguito dalle immagini.
 *
 * Dal 2007 in poi Windows accetta dentro il `.ico` i PNG così come sono, e non
 * pretende più le bitmap con la maschera di trasparenza a parte: ogni voce
 * dell'indice dice quanto è lunga la sua immagine e da dove comincia, e il
 * resto del file sono i PNG uno dietro l'altro. La misura 256 si scrive `0`,
 * perché nell'indice ogni lato sta in un byte solo.
 */
function componiIco (immagini) {
  const INTESTAZIONE = 6
  const VOCE = 16
  const indice = Buffer.alloc(INTESTAZIONE + VOCE * immagini.length)
  indice.writeUInt16LE(0, 0)
  indice.writeUInt16LE(1, 2)
  indice.writeUInt16LE(immagini.length, 4)

  let scostamento = indice.length
  immagini.forEach(({ misura, byte }, i) => {
    const voce = INTESTAZIONE + VOCE * i
    indice.writeUInt8(misura === 256 ? 0 : misura, voce)
    indice.writeUInt8(misura === 256 ? 0 : misura, voce + 1)
    indice.writeUInt8(0, voce + 2)
    indice.writeUInt8(0, voce + 3)
    indice.writeUInt16LE(1, voce + 4)
    indice.writeUInt16LE(32, voce + 6)
    indice.writeUInt32LE(byte.length, voce + 8)
    indice.writeUInt32LE(scostamento, voce + 12)
    scostamento += byte.length
  })

  return Buffer.concat([indice, ...immagini.map((i) => i.byte)])
}

void app.whenReady().then(async () => {
  const finestra = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
  await finestra.loadURL('data:text/html;charset=utf-8,<!doctype html><meta charset="utf-8">')

  const immagini = []
  for (const misura of MISURE) immagini.push({ misura, byte: await rendi(finestra, misura) })

  writeFileSync(percorso.join(radice, 'icons', 'icon.ico'), componiIco(immagini))
  writeFileSync(percorso.join(radice, 'icons', 'icon.png'), await rendi(finestra, MISURA_PNG))

  finestra.destroy()
  console.log(`icons/icon.ico (${MISURE.join(', ')}) e icons/icon.png (${MISURA_PNG})`)
  app.exit(0)
})
