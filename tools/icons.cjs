// Le icone dell'applicazione, ricavate dai disegni in `resources/`.
//
// Il segno è la spirale dell'anno: dieci spicchi (i mesi di scuola), i passati
// bianchi, quello di oggi arancio, i prossimi velati, e un punto nel mezzo. I
// colori vengono da `src/ui/styles/theme.css` (`--accento`, `--accento-caldo`,
// `--su-tinta`, `--attenzione` del tema scuro): se cambiano là, vanno riportati qui.
//
//   npm run icons
//
// Si rende con Electron, che è Chromium e legge l'SVG come chi guarda l'icona.
//
// ## La mappa: da che cosa, che cosa, per chi
//
// Le SORGENTI si disegnano a mano, in `resources/`:
//
//   registro-app.svg          a colori, i dieci spicchi uno per uno: per le
//                             misure da 64 in su
//   registro-app-piccola.svg  a colori, i mesi raccolti in tre spicchi, sui
//                             pixel interi della 16: dalla 16 alla 48
//   registro-segno.svg        monocromo in `currentColor`, senza quadrato:
//                             dove il colore lo decide chi lo posa
//   registro.svg              a tratto su 24: l'icona dei pannelli
//                             (`iconPath`) e, copiato a mano, il tracciato
//                             `registro` di `src/ui/components/icons.ts`
//
// Le USCITE le scrive questo script, e non si toccano a mano:
//
//   icons/icon.ico            16…256, nove misure       finestre, barra delle
//                                                       applicazioni, collegamenti,
//                                                       vassoio su Windows e Linux
//   icons/icon.png            512                       notifiche
//   icons/icon.icns           16…1024                   applicazione su macOS
//   icons/png/NxN.png         16…1024, una per misura   applicazione su Linux
//   icons/trayTemplate(@2x)   16 e 32, nero             barra dei menu di macOS,
//                                                       che la ricolora da sé
//   icons/installerSidebar.bmp  fascia 164x314 (x3)     procedura d'installazione:
//   icons/installerHeader.bmp   testata 57x57 (x3)      NSIS legge solo BMP a 24 bit
//   resources/registro-fascia.svg  164x1200, vettore    finestra di benvenuto
//
// Le pagine non usano le uscite raster: leggono i vettori da
// `registro://app/resources/`. La barra del titolo mostra
// `registro-app-piccola.svg` (`src/ui/components/logo.ts`),
// lo splash `registro-app.svg`, il benvenuto la fascia. Chi sceglie quale file
// raster dare a finestre, vassoio e notifiche è `src/environment/context.ts`
// (`percorsoIconaFinestra`, `percorsoIconaCassetto`, `percorsoIcona`), e chi li
// mette nel pacchetto è `electron-builder.json` (`files`, `win`, `mac`,
// `linux`, `nsis`).
//
// Un formato nuovo si aggiunge qui, in quella tabella e dove lo si usa;
// `tests/environment/icons.test.mjs` controlla che i file ci siano e siano nominati.

// CommonJS apposta: dentro Electron `electron` si prende con `require`; da un
// modulo ECMAScript si otterrebbe il guscio di Node, che dà il percorso
// dell'eseguibile e non l'API.
const electron = require('electron')
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const percorso = require('node:path')

// Lo stesso guscio arriva con `ELECTRON_RUN_AS_NODE` acceso (il terminale di
// VS Code lo accende): ci si rilancia senza, come `tools/dev.mjs`.
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

/**
 * Il fondo della fascia dell'installer: il verde di `--accento` e
 * `--accento-caldo` sfumato, come il quadrato dell'icona. Il bianco sopra sta a 4,5:1.
 */
const FONDO_ALTO = '#468515'
const FONDO_MEZZO = '#3d7a0c'
const FONDO_BASSO = '#2f6108'
const TRATTO = '#ffffff'
/** Il mese di oggi: `--attenzione` del tema scuro, che sul verde si stacca. */
const ORA = '#ff9a4d'

/**
 * Le misure del `.ico`. Windows prende la più vicina senza ridimensionare bene:
 * la 20 e la 40 sono la 16 e la 32 con lo schermo al 125%.
 */
const MISURE = [16, 20, 24, 32, 40, 48, 64, 128, 256]

/** La misura del `.png`, quello delle notifiche. */
const MISURA_PNG = 512

/** Le misure della serie di Linux, in `icons/png/`. */
const MISURE_PNG = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256, 512, 1024]

/**
 * Le voci dell'`.icns`: il tipo di quattro lettere e la misura in pixel. Dal
 * 10.7 in poi macOS accetta dentro ogni voce un PNG così com'è; le voci «@2x»
 * (`ic11`…`ic14`) sono la stessa immagine della misura doppia.
 */
const VOCI_ICNS = [
  ['icp4', 16], ['icp5', 32], ['ic11', 32], ['ic12', 64], ['ic07', 128],
  ['ic13', 256], ['ic08', 256], ['ic14', 512], ['ic09', 512], ['ic10', 1024],
]

/** Fin qui si usa il disegno piccolo: dalla 64 in su, quello coi dettagli. */
const ULTIMA_PICCOLA = 48

/** Un disegno di `resources/`, senza i commenti. */
function sorgente (nome) {
  return readFileSync(percorso.join(radice, 'resources', nome), 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim()
}

/**
 * Lo stesso disegno a un'altra misura, con qualche attributo in più
 * sull'elemento `<svg>`: `x`, `y` e `color` quando lo si annida in un altro.
 */
function aMisura (svg, larga, alta = larga, altro = '') {
  return svg.replace(/<svg([^>]*?) width="\d+" height="\d+"/, `<svg$1 width="${larga}" height="${alta}"${altro}`)
}

/** L'icona a colori della misura chiesta, piccola o grande a seconda. */
function disegno (misura) {
  const nome = misura <= ULTIMA_PICCOLA ? 'registro-app-piccola.svg' : 'registro-app.svg'
  return aMisura(sorgente(nome), misura)
}

/** Il segno senza fondo, nel colore chiesto. */
function segno (misura, colore) {
  return aMisura(sorgente('registro-segno.svg'), misura, misura, ` color="${colore}"`)
}

/**
 * Le misure delle immagini della procedura, in pixel NSIS a schermo normale.
 * Si disegnano al triplo perché la procedura è `ManifestDPIAware`
 * (`os/windows/installer.nsh`): al 250% la fascia è alta quasi mille pixel.
 *
 * Le proporzioni del riquadro le decide il carattere. `os/windows/immagini.nsh`
 * posa l'immagine senza deformarla: la fascia copre e perde qualche pixel ai
 * lati (il disegno sta lontano dai bordi), la testata quadrata sta dentro a destra.
 */
const FASCIA = { larga: 164, alta: 314 }
/** La fascia del benvenuto: larga come quella della procedura, alta quanto uno schermo. */
const FASCIA_BENVENUTO = { larga: 164, alta: 1200 }
const TESTATA = { larga: 57, alta: 57 }
const SCALA_PROCEDURA = 3

/** Il fondo delle pagine della procedura: `--sfondo` in `src/ui/styles/theme.css`. */
const SFONDO_PAGINE = '#fafafa'

/** Il carattere dell'interfaccia di Windows, come `--carattere` nel registro. */
const CARATTERE = "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"

/** Un punto a `raggio` dal centro, `gradi` in senso orario da mezzogiorno. */
function punto (cx, cy, raggio, gradi) {
  const t = (gradi * Math.PI) / 180
  return `${+(cx + raggio * Math.sin(t)).toFixed(2)} ${+(cy - raggio * Math.cos(t)).toFixed(2)}`
}

/**
 * Uno spicchio della spirale dell'anno, come in `resources/registro-app.svg`:
 * dentro un arco di raggio `dentro`, fuori un bordo che parte da `r0` a
 * mezzogiorno e cresce di `passo` a ogni giro; da `da` ad `a` gradi.
 */
function spicchio (cx, cy, dentro, r0, passo, da, a) {
  const fuori = (gradi) => r0 + (passo * gradi) / 360
  const pezzi = [`M${punto(cx, cy, fuori(da), da)}`]
  const passi = Math.max(2, Math.ceil((a - da) / 4))
  for (let i = 1; i <= passi; i++) {
    const gradi = da + ((a - da) * i) / passi
    pezzi.push(`L${punto(cx, cy, fuori(gradi), gradi)}`)
  }
  pezzi.push(`L${punto(cx, cy, dentro, a)}`)
  pezzi.push(`A${dentro} ${dentro} 0 ${a - da > 180 ? 1 : 0} 0 ${punto(cx, cy, dentro, da)}Z`)
  return pezzi.join('')
}

/** Il seguito della spirale, dopo il primo giro: una linea sola, da `da` ad `a` gradi. */
function seguito (cx, cy, r0, passo, da, a) {
  const pezzi = []
  for (let gradi = da; gradi <= a; gradi += 4) {
    pezzi.push(`${pezzi.length ? 'L' : 'M'}${punto(cx, cy, r0 + (passo * gradi) / 360, gradi)}`)
  }
  return pezzi.join('')
}

/**
 * Il segno grande, senza quadrato, alla scala chiesta: dieci spicchi di 30
 * gradi con 6 di vuoto — sei passati in bianco, oggi in arancio, tre a venire
 * velati — e il punto nel mezzo. Le proporzioni sono quelle dell'icona.
 */
function spirale (cx, cy, scala) {
  const mesi = []
  for (let i = 0; i < 10; i++) {
    const colore = i < 6 ? `fill="${TRATTO}"` : i === 6 ? `fill="${ORA}"` : `fill="${TRATTO}" fill-opacity="0.28"`
    mesi.push(`<path ${colore} d="${spicchio(cx, cy, 4.3 * scala, 8.2 * scala, 3.4 * scala, 36 * i + 3, 36 * i + 33)}"/>`)
  }
  return `${mesi.join('\n  ')}
  <circle cx="${cx}" cy="${cy}" r="${+(2.2 * scala).toFixed(2)}" fill="${TRATTO}"/>`
}

/**
 * La fascia della procedura: il segno grande sul verde, la spirale che
 * continua sottile oltre i bordi, e sotto il nome. Niente testo piccolo (la
 * procedura ridimensiona); segno e nome a più di 14 punti dai lati, che
 * `immagini.nsh` può tagliare.
 *
 * Più alta e senza nome è anche la fascia del benvenuto (`FASCIA_BENVENUTO`),
 * in `.svg` perché la finestra si ridimensiona.
 */
function disegnoFascia (
  { larga, alta } = FASCIA,
  { scala = SCALA_PROCEDURA, conNome = true } = {},
) {
  const cx = larga / 2
  const cy = 116
  // Il segno è largo quanto l'icona a 96 punti: 3 volte il disegno da 32.
  const segno = 3
  // Dopo il primo giro la spirale continua sottile oltre i bordi.
  const oltre = seguito(cx, cy, 8.2 * segno, 3.4 * segno, 363, 2160)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${larga * scala}" height="${alta * scala}" viewBox="0 0 ${larga} ${alta}">
  <defs>
    <linearGradient id="fondo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${larga * 0.35}" y2="${Math.min(alta, 420)}">
      <stop offset="0" stop-color="${FONDO_ALTO}"/>
      <stop offset="0.55" stop-color="${FONDO_MEZZO}"/>
      <stop offset="1" stop-color="${FONDO_BASSO}"/>
    </linearGradient>
    <radialGradient id="luce" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="150">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${larga}" height="${alta}" fill="url(#fondo)"/>
  <rect width="${larga}" height="${alta}" fill="url(#luce)"/>
  <path d="${oltre}" fill="none" stroke="${TRATTO}" stroke-opacity="0.12" stroke-width="1.2" stroke-linecap="round"/>
  ${spirale(cx, cy, segno)}
  ${conNome
    ? `<g fill="${TRATTO}" font-family="${CARATTERE}" text-anchor="middle">
    <text x="${cx}" y="220" font-size="21" font-weight="600" letter-spacing="-0.2">Registro</text>
    <text x="${cx}" y="244" font-size="21" font-weight="300" fill-opacity="0.9">docenti</text>
  </g>`
    : ''}
</svg>`
}

/**
 * La testata delle pagine di mezzo: l'icona sul fondo di `MUI_BGCOLOR`
 * (`os/windows/installer.nsh`), perché non sembri un rettangolo incollato.
 */
function disegnoTestata () {
  const { larga, alta } = TESTATA
  const lato = 43
  const x = (larga - lato) / 2
  const y = (alta - lato) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${larga * SCALA_PROCEDURA}" height="${alta * SCALA_PROCEDURA}" viewBox="0 0 ${larga} ${alta}">
  <rect width="${larga}" height="${alta}" fill="${SFONDO_PAGINE}"/>
  ${aMisura(sorgente('registro-app.svg'), lato, lato, ` x="${x}" y="${y}"`)}
</svg>`
}

/** I pixel RGBA di un disegno; il fondo è pieno perché le bitmap NSIS non hanno trasparenza. */
async function pixel (finestra, svg, larga, alta) {
  const dati = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const base64 = await finestra.webContents.executeJavaScript(`new Promise((risolvi, rifiuta) => {
    const immagine = new Image()
    immagine.onload = () => {
      const tela = document.createElement('canvas')
      tela.width = ${larga}
      tela.height = ${alta}
      const penna = tela.getContext('2d')
      penna.drawImage(immagine, 0, 0, ${larga}, ${alta})
      const rgba = penna.getImageData(0, 0, ${larga}, ${alta}).data
      let binario = ''
      for (let i = 0; i < rgba.length; i += 0x8000) {
        binario += String.fromCharCode.apply(null, rgba.subarray(i, i + 0x8000))
      }
      risolvi(btoa(binario))
    }
    immagine.onerror = () => rifiuta(new Error('il disegno non si carica'))
    immagine.src = ${JSON.stringify(dati)}
  })`)
  return Buffer.from(base64, 'base64')
}

/**
 * Una BMP a 24 bit per NSIS: intestazione, righe dal basso verso l'alto, pixel
 * in BGR, righe allungate a multipli di quattro byte.
 */
function componiBmp (rgba, larga, alta) {
  const riga = Math.ceil((larga * 3) / 4) * 4
  const intestazione = 14 + 40
  const bmp = Buffer.alloc(intestazione + riga * alta)
  bmp.write('BM', 0, 'ascii')
  bmp.writeUInt32LE(bmp.length, 2)
  bmp.writeUInt32LE(intestazione, 10)
  bmp.writeUInt32LE(40, 14)
  bmp.writeInt32LE(larga, 18)
  bmp.writeInt32LE(alta, 22)
  bmp.writeUInt16LE(1, 26)
  bmp.writeUInt16LE(24, 28)
  bmp.writeUInt32LE(riga * alta, 34)
  // 96 punti per pollice, detti in punti per metro.
  bmp.writeInt32LE(3780, 38)
  bmp.writeInt32LE(3780, 42)
  for (let y = 0; y < alta; y++) {
    const dove = intestazione + (alta - 1 - y) * riga
    for (let x = 0; x < larga; x++) {
      const da = (y * larga + x) * 4
      bmp[dove + x * 3] = rgba[da + 2]
      bmp[dove + x * 3 + 1] = rgba[da + 1]
      bmp[dove + x * 3 + 2] = rgba[da]
    }
  }
  return bmp
}

/**
 * Un PNG del disegno alla misura chiesta, passando da una tela: `capturePage`
 * su una finestra nascosta resta appesa.
 */
async function rendi (finestra, svg, misura) {
  const dati = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
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
    immagine.src = ${JSON.stringify(dati)}
  })`)
  return Buffer.from(base64, 'base64')
}

/**
 * Il `.ico`: un indice (lunghezza e posizione di ogni immagine) seguito dai PNG.
 * La misura 256 si scrive `0` perché ogni lato sta in un byte.
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

/**
 * L'`.icns`: `icns` e la lunghezza totale, poi per ogni voce tipo, lunghezza
 * (intestazione compresa) e PNG. Numeri big-endian.
 */
function componiIcns (voci) {
  const pezzi = voci.map(({ tipo, byte }) => {
    const testa = Buffer.alloc(8)
    testa.write(tipo, 0, 'ascii')
    testa.writeUInt32BE(byte.length + 8, 4)
    return Buffer.concat([testa, byte])
  })
  const testa = Buffer.alloc(8)
  testa.write('icns', 0, 'ascii')
  testa.writeUInt32BE(8 + pezzi.reduce((somma, pezzo) => somma + pezzo.length, 0), 4)
  return Buffer.concat([testa, ...pezzi])
}

void app.whenReady().then(async () => {
  const finestra = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
  await finestra.loadURL('data:text/html;charset=utf-8,<!doctype html><meta charset="utf-8">')

  const cartella = percorso.join(radice, 'icons')
  const scrivi = (nome, byte) => writeFileSync(percorso.join(cartella, nome), byte)

  /** Ogni misura si rende una volta sola, anche se serve a più formati. */
  const rese = new Map()
  const png = async (misura) => {
    if (!rese.has(misura)) rese.set(misura, await rendi(finestra, disegno(misura), misura))
    return rese.get(misura)
  }

  const immagini = []
  for (const misura of MISURE) immagini.push({ misura, byte: await png(misura) })
  scrivi('icon.ico', componiIco(immagini))
  scrivi('icon.png', await png(MISURA_PNG))

  mkdirSync(percorso.join(cartella, 'png'), { recursive: true })
  for (const misura of MISURE_PNG) scrivi(`png/${misura}x${misura}.png`, await png(misura))

  const voci = []
  for (const [tipo, misura] of VOCI_ICNS) voci.push({ tipo, byte: await png(misura) })
  scrivi('icon.icns', componiIcns(voci))

  // Il cassetto di macOS: nero su trasparente; «Template» nel nome fa ricolorare
  // l'immagine a `nativeImage`, «@2x» è per il Retina.
  scrivi('trayTemplate.png', await rendi(finestra, segno(16, '#000000'), 16))
  scrivi('trayTemplate@2x.png', await rendi(finestra, segno(32, '#000000'), 32))

  const procedura = [
    ['installerSidebar.bmp', disegnoFascia(), FASCIA],
    ['installerHeader.bmp', disegnoTestata(), TESTATA],
  ]
  for (const [nome, svg, { larga, alta }] of procedura) {
    const l = larga * SCALA_PROCEDURA
    const a = alta * SCALA_PROCEDURA
    scrivi(nome, componiBmp(await pixel(finestra, svg, l, a), l, a))
  }

  // La fascia del benvenuto va in `resources/`, dove le pagine leggono.
  writeFileSync(
    percorso.join(radice, 'resources', 'registro-fascia.svg'),
    `${disegnoFascia(FASCIA_BENVENUTO, { scala: 1, conNome: false })}\n` +
      '<!-- Generato da `npm run icons` (tools/icons.cjs): non si modifica a mano. -->\n',
  )

  finestra.destroy()
  console.log(
    `icons/icon.ico (${MISURE.join(', ')}), icons/icon.png (${MISURA_PNG}), icons/icon.icns, ` +
    `icons/png/ (${MISURE_PNG.join(', ')}), icons/trayTemplate(@2x).png, ` +
    'icons/installerSidebar.bmp, icons/installerHeader.bmp e resources/registro-fascia.svg',
  )
  app.exit(0)
})
