// Dove sta l'applicazione (radice, bundle, icone, script) e dove stanno i dati
// (la cartella di lavoro, ricordata in `impostazioni.json`), più il contenitore
// `ContestoApplicazione`.

import { app } from 'electron'
import { existsSync } from 'node:fs'
import * as percorso from 'node:path'

import { getConfiguration } from './settings.js'
import { Segreti, type DepositoSegreti } from './secrets.js'
import { Uri } from './uri.js'

/** La cartella dei bundle; la stessa di `registro://app/dist/…` in `panels/panel.ts`. */
const CARTELLA_BUNDLE = 'dist'

/** La chiave di `impostazioni.json` in cui si ricorda la cartella scelta. */
const CHIAVE_CARTELLA = 'cartellaLavoro'

/** Un percorso che porta una lettera di unità: `/C:/dati`. */
const UNITA = /^\/[A-Za-z]:/

/**
 * Se un uri sta dentro una cartella: regge il controllo di sicurezza del
 * protocollo, quindi pretende il confine di segmento (`…/dati2` non è in
 * `…/dati`). Sui percorsi Windows ignora le maiuscole, come il filesystem.
 */
export function dentro (radice: Uri, figlio: Uri): boolean {
  const chiave = (uri: Uri): string => (UNITA.test(uri.path) ? uri.path.toLowerCase() : uri.path)
  const sopra = chiave(radice)
  const sotto = chiave(figlio)
  return sotto === sopra || sotto.startsWith(sopra.endsWith('/') ? sopra : `${sopra}/`)
}

let radice: Uri | null = null

/**
 * La radice dell'applicazione (`extensionUri`). Se l'app è lanciata sul file
 * `dist/main.cjs` invece che sulla cartella, risale da `dist/` alla radice.
 */
export function radiceApp (): Uri {
  if (radice) return radice
  const cammino = app.getAppPath()
  const base = percorso.basename(cammino) === CARTELLA_BUNDLE ? percorso.dirname(cammino) : cammino
  radice = Uri.file(base)
  return radice
}

/** La versione di `package.json`, per chi non può importare Electron. */
export function versioneApplicazione (): string {
  return app.getVersion()
}

// ------------------------------------------------------------------- l'icona
//
// In `icons/`, fatte da `npm run icons`. Il `.ico` (misure da 16 a 256) serve
// all'icona piccola su Windows; il `.png` da 512 a quella grande (notifiche).

/** I file d'icona, in ordine di preferenza. */
const ICONE_PICCOLE = ['icon.ico', 'icon.png'] as const
const ICONE_GRANDI = ['icon.png'] as const

/** Il primo file d'icona che esiste davvero, o `null` se non c'è nessuno. */
function primaIconaPresente (nomi: readonly string[]): string | null {
  for (const nome of nomi) {
    // Fuori dall'asar: questi file li apre Windows, che l'archivio non lo legge.
    const file = fuoriDallAsar(Uri.joinPath(radiceApp(), 'icons', nome).fsPath)
    if (existsSync(file)) return file
  }
  return null
}

/** L'icona delle finestre: `.ico` su Windows, `.png` altrove; `null` se manca. */
export function percorsoIconaFinestra (): string | null {
  return primaIconaPresente(process.platform === 'win32' ? ICONE_PICCOLE : ICONE_GRANDI)
}

/**
 * L'icona del cassetto: su macOS l'immagine «template» `trayTemplate.png`, che
 * il sistema ricolora per il tema; altrove quella delle finestre.
 */
export function percorsoIconaCassetto (): string | null {
  if (process.platform === 'darwin') {
    const modello = primaIconaPresente(['trayTemplate.png'])
    if (modello) return modello
  }
  return percorsoIconaFinestra()
}

/** L'icona grande, per le notifiche di sistema. */
export function percorsoIcona (): string | null {
  return primaIconaPresente(ICONE_GRANDI)
}

/**
 * L'icona da spargere nelle opzioni di una finestra. Senza file la chiave manca
 * (non `icon: undefined`), così Electron eredita l'icona dell'eseguibile.
 */
export function icona (): { icon?: string } {
  const file = percorsoIconaFinestra()
  return file ? { icon: file } : {}
}

/** Il bundle del preload. */
export function percorsoPreload (): string {
  return Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'preload.cjs').fsPath
}

/**
 * Lo stesso percorso in `app.asar.unpacked`, per i file che non aprono via
 * `node:fs` (import di moduli, altri processi). Vedi `asarUnpack` in
 * `electron-builder.json`; fuori dal pacchetto non cambia nulla.
 */
function fuoriDallAsar (cammino: string): string {
  return cammino.replace(/(^|[\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2')
}

/**
 * Il worker di pdfjs, fuori dall'asar perché si carica con `import()`; dentro,
 * nel pacchetto, dà «Setting up fake worker failed».
 */
export function percorsoWorkerPdf (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'pdf.worker.mjs').fsPath)
}

/** I caratteri standard del PDF; restano nell'asar perché pdfjs li legge con `fs`. */
export function percorsoCaratteriPdf (): string {
  return Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'caratteri-pdf').fsPath
}

/** La riga di comando `src/cli/registro.mjs`, fuori dall'asar perché la esegue un altro processo. */
export function percorsoRigaDiComando (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), 'src', 'cli', 'registro.mjs').fsPath)
}

/** Lo script di pulizia `src/cli/disinstalla.mjs`, fuori dall'asar come la riga di comando. */
export function percorsoDisinstallazione (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), 'src', 'cli', 'disinstalla.mjs').fsPath)
}

/**
 * La finestra dell'aggiornamento `os/windows/aggiornamento.ps1`: resta nell'asar
 * perché la si ricopia in una cartella temporanea prima di lanciarla.
 */
export function percorsoAiutanteAggiornamento (): string {
  return Uri.joinPath(radiceApp(), 'os', 'windows', 'aggiornamento.ps1').fsPath
}

let lavoro: Uri | null = null

/** La cartella su cui il registro lavora, o `null` se non è ancora stata scelta. */
export function cartellaLavoro (): Uri | null {
  if (lavoro) return lavoro
  const scritta = getConfiguration().get<string>(CHIAVE_CARTELLA, '')
  if (!scritta) return null
  lavoro = Uri.file(scritta)
  return lavoro
}

export async function impostaCartellaLavoro (cartella: Uri): Promise<void> {
  lavoro = cartella
  // Il percorso nativo, leggibile da chi apre il file a mano.
  await getConfiguration().update(CHIAVE_CARTELLA, cartella.fsPath)
}

export interface CartellaDiLavoro {
  readonly uri: Uri
  readonly name: string
  readonly index: number
}

/** Una cartella sola, o nessuna. */
export function cartelleDiLavoro (): CartellaDiLavoro[] | undefined {
  const cartella = cartellaLavoro()
  if (!cartella) return undefined
  return [{ uri: cartella, name: percorso.basename(cartella.fsPath), index: 0 }]
}

export interface ContestoApplicazione {
  readonly subscriptions: Array<{ dispose (): unknown }>
  readonly extensionUri: Uri
  readonly extensionPath: string
  readonly globalStorageUri: Uri
  readonly secrets: DepositoSegreti
}

export function creaContesto (): ContestoApplicazione {
  const base = radiceApp()
  return {
    subscriptions: [],
    extensionUri: base,
    extensionPath: base.fsPath,
    // La stessa di impostazioni e segreti.
    globalStorageUri: Uri.file(app.getPath('userData')),
    secrets: new Segreti(() => app.getPath('userData')),
  }
}
