// Dove sta l'applicazione e dove stanno i dati.
//
// Sono due domande sole, ma sono quelle a cui il registro non sa rispondere da
// sé: la radice dell'app — da cui compone gli indirizzi del proprio codice e
// delle proprie immagini — e la cartella del docente, che è una scelta fatta
// all'avvio e ricordata in `impostazioni.json`.
//
// C'è anche l'`ContestoApplicazione`, che è poco più di un contenitore: la lista
// delle cose da smaltire, i due percorsi, il portachiavi.

import { app } from 'electron'
import { existsSync } from 'node:fs'
import * as percorso from 'node:path'

import { getConfiguration } from './settings.js'
import { Segreti, type DepositoSegreti } from './secrets.js'
import { Uri } from './uri.js'

/**
 * La cartella in cui stanno i bundle dell'app.
 *
 * È la stessa che `panels/panel.ts` nomina quando compone l'indirizzo del proprio
 * script — `registro://app/dist/panel.js` — ed è voluto che sia una sola: per
 * un po' i bundle sono stati in `dist-desktop/` mentre il registro continuava a
 * scrivere `dist`, e in mezzo c'era una traduzione che il protocollo e chi
 * componeva l'indirizzo dovevano applicare tutti e due allo stesso modo. Una
 * cartella sola toglie di mezzo la traduzione e il modo di sbagliarla.
 */
const CARTELLA_BUNDLE = 'dist'

/** La chiave di `impostazioni.json` in cui si ricorda la cartella scelta. */
const CHIAVE_CARTELLA = 'cartellaLavoro'

/** Un percorso che porta una lettera di unità: `/C:/dati`. */
const UNITA = /^\/[A-Za-z]:/

/**
 * Se un uri sta dentro una cartella. È il confronto su cui poggia il controllo
 * di sicurezza del protocollo, e quindi non può essere approssimativo: si
 * pretende il confine di segmento, o `…/dati2` risulterebbe dentro `…/dati`.
 *
 * Su Windows il confronto è indifferente alle maiuscole, perché lo è il
 * filesystem: `D:\Registro` e `D:\registro` sono la stessa cartella, e
 * trattarle come due farebbe sparire le immagini senza dire perché.
 */
export function dentro (radice: Uri, figlio: Uri): boolean {
  const chiave = (uri: Uri): string => (UNITA.test(uri.path) ? uri.path.toLowerCase() : uri.path)
  const sopra = chiave(radice)
  const sotto = chiave(figlio)
  return sotto === sopra || sotto.startsWith(sopra.endsWith('/') ? sopra : `${sopra}/`)
}

let radice: Uri | null = null

/**
 * La radice dell'applicazione: quel che il registro chiama `extensionUri`.
 *
 * `app.getAppPath()` dà la cartella del progetto — impacchettata o no — perché
 * l'applicazione si lancia sempre su una cartella e mai su un file: è quel che
 * fanno `npm run start` e `tools/dev.mjs`, e la ragione è che solo
 * così Electron legge il nostro `package.json` e l'applicazione ha il proprio
 * nome invece di chiamarsi «Electron».
 *
 * La correzione qui sotto è per chi la lancia comunque sul file di avvio —
 * `electron dist/main.cjs`, che è la prima cosa che viene in mente: lì
 * `getAppPath()` è `dist/`, e la radice è la cartella che la contiene, perché è
 * lì che stanno `resources/`, `icons/` e tutto il resto.
 */
export function radiceApp (): Uri {
  if (radice) return radice
  const cammino = app.getAppPath()
  const base = percorso.basename(cammino) === CARTELLA_BUNDLE ? percorso.dirname(cammino) : cammino
  radice = Uri.file(base)
  return radice
}

/**
 * La versione dell'applicazione, quella di `package.json`.
 *
 * Non è API di VS Code, ed è qui per la stessa ragione delle altre voci che non
 * lo sono: `app.getVersion()` si può chiamare solo dove Electron si nomina, e
 * chi la vuole — il condotto, che la dichiara a chi chiama da fuori — sta
 * dall'altra parte di quel confine.
 */
export function versioneApplicazione (): string {
  return app.getVersion()
}

// ------------------------------------------------------------------- l'icona
//
// Le icone stanno in `icons/`, le fa `npm run icons` da `resources/registro.svg`,
// e nel pacchetto ci entrano tutte e due — vedi `files` in
// `electron-builder.json`. Sono due file perché servono a due mestieri diversi.
//
// Il `.ico` contiene nove misure disegnate apposta, dalla 16 alla 256: è
// quello che vuole chi mostra l'icona **piccola** — la barra delle
// applicazioni, la barra del titolo, l'alt-tab, il cassetto accanto
// all'orologio. Windows non ridimensiona: prende la misura più vicina fra
// quelle che trova.
//
// Il `.png` è una sola immagine da 512: è quello che vuole chi la mostra
// **grande**, e cioè una notifica di sistema, dove un `.ico` non è previsto.
//
// Dare il `.png` anche alla barra delle applicazioni — che era quel che
// succedeva — non è un errore che si nota subito: l'icona compare, ma è la 512
// schiacciata in un passo solo a 24 pixel, cioè il tratto del libro impastato.

/** I file d'icona, nell'ordine in cui li si preferisce per ciascun mestiere. */
const ICONE_PICCOLE = ['icon.ico', 'icon.png'] as const
const ICONE_GRANDI = ['icon.png'] as const

/** Il primo file d'icona che esiste davvero, o `null` se non c'è nessuno. */
function primaIconaPresente (nomi: readonly string[]): string | null {
  for (const nome of nomi) {
    // Fuori dall'asar: chi apre questi file è Windows — il centro notifiche,
    // `LoadImage` per il `.ico` — e l'archivio per lui non è una cartella.
    const file = fuoriDallAsar(Uri.joinPath(radiceApp(), 'icons', nome).fsPath)
    if (existsSync(file)) return file
  }
  return null
}

/**
 * L'icona per le finestre e per il cassetto accanto all'orologio.
 *
 * Su Windows è il `.ico`: senza, la barra delle applicazioni mostra la 512
 * ridotta male. Fuori da Windows è il `.png`, perché GTK e macOS il formato di
 * Windows non lo leggono.
 *
 * `null` se non c'è: chi la usa non deve costruire una finestra senza icona
 * *e* senza dirlo, ma nemmeno cadere perché un file di contorno manca.
 */
export function percorsoIconaFinestra (): string | null {
  return primaIconaPresente(process.platform === 'win32' ? ICONE_PICCOLE : ICONE_GRANDI)
}

/** L'icona per le notifiche di sistema, che la vogliono grande. */
export function percorsoIcona (): string | null {
  return primaIconaPresente(ICONE_GRANDI)
}

/**
 * L'icona pronta da spargere nelle opzioni di una finestra.
 *
 * Con lo spread e non con `icon: undefined`: Electron tratta la chiave presente
 * e vuota diversamente da quella assente, e sul secondo caso fa quel che serve
 * — eredita l'icona dell'eseguibile, che nel pacchetto è già quella giusta.
 */
export function icona (): { icon?: string } {
  const file = percorsoIconaFinestra()
  return file ? { icon: file } : {}
}

/** Il preload, che è un bundle come gli altri e sta dove stanno loro. */
export function percorsoPreload (): string {
  return Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'preload.cjs').fsPath
}

/**
 * Lo stesso percorso, ma fuori dall'archivio asar.
 *
 * Nel pacchetto i file dell'applicazione stanno dentro `app.asar`, e Electron
 * corregge `node:fs` perché li apra come se quell'archivio fosse una cartella.
 * Non tutto passa di lì: `import()` di un URL `file:` va al caricatore di
 * moduli, e che il caricatore sappia dell'asar dipende dalla versione di
 * Electron. I file che si aprono per quella via si tengono spacchettati —
 * `asarUnpack` in `electron-builder.json` — e spacchettati vuol dire in
 * `app.asar.unpacked`, che è la cartella accanto. Fuori dal pacchetto la
 * sostituzione non trova niente da sostituire e il percorso resta quello.
 */
function fuoriDallAsar (cammino: string): string {
  return cammino.replace(/(^|[\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2')
}

/**
 * Il worker di pdfjs.
 *
 * Sta fra i bundle come tutto il resto, ma nel pacchetto sta per giunta *fuori*
 * dall'asar, e quella è la differenza per cui questa funzione esiste invece di
 * un `joinPath` scritto sul posto.
 *
 * Sbagliarlo non si vede in sviluppo, dove l'asar non c'è: si vede solo nel
 * pacchetto, dove il primo PDF letto risponde «Setting up fake worker failed»
 * senza nominare né l'archivio né la cartella.
 */
export function percorsoWorkerPdf (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'pdf.worker.mjs').fsPath)
}

/**
 * La cartella dei caratteri standard del PDF, copiata accanto ai bundle.
 *
 * Dentro l'asar si legge senza problemi: qui non passa nessun `import()` di
 * moduli — è pdfjs che apre dei file con il `fs` che Electron corregge da sé —
 * e quindi, a differenza del worker, non c'è niente da tenere fuori.
 */
export function percorsoCaratteriPdf (): string {
  return Uri.joinPath(radiceApp(), CARTELLA_BUNDLE, 'caratteri-pdf').fsPath
}

/**
 * La riga di comando, cioè `src/cli/registro.mjs`.
 *
 * Sta fuori dai bundle apposta — non si compila, ed è una scelta raccontata in
 * testa a quel file — e per la stessa ragione sta fuori dall'asar: chi la apre
 * non è il registro, è un altro processo che riceve un percorso e lo passa a
 * Node. Un percorso dentro l'archivio, per quel processo, non è una cartella.
 */
export function percorsoRigaDiComando (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), 'src', 'cli', 'registro.mjs').fsPath)
}

/**
 * Lo script che toglie dal computer quel che il registro ci ha lasciato,
 * `src/cli/disinstalla.mjs`. Fuori dall'asar per la stessa ragione della riga
 * di comando: lo esegue un altro processo, a registro già chiuso.
 */
export function percorsoDisinstallazione (): string {
  return fuoriDallAsar(Uri.joinPath(radiceApp(), 'src', 'cli', 'disinstalla.mjs').fsPath)
}

let lavoro: Uri | null = null

/**
 * La cartella su cui il registro lavora, o `null` se non è ancora stata
 * scelta. È la risposta ad `apparato.cartelleDiLavoro()`, e `null` è il caso
 * «nessuna cartella aperta», che `paths.ts` prevede già.
 */
export function cartellaLavoro (): Uri | null {
  if (lavoro) return lavoro
  const scritta = getConfiguration().get<string>(CHIAVE_CARTELLA, '')
  if (!scritta) return null
  lavoro = Uri.file(scritta)
  return lavoro
}

export async function impostaCartellaLavoro (cartella: Uri): Promise<void> {
  lavoro = cartella
  // Il percorso nativo e non la stringa dell'uri: il file delle impostazioni lo
  // si apre a mano quando qualcosa non torna, e `D:\Registro` si legge.
  await getConfiguration().update(CHIAVE_CARTELLA, cartella.fsPath)
}

export interface CartellaDiLavoro {
  readonly uri: Uri
  readonly name: string
  readonly index: number
}

/** Una cartella sola, o nessuna: sul desktop non esistono workspace a più radici. */
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
    // La cartella dell'utente dell'applicazione: è quella in cui stanno già le
    // impostazioni e i segreti, e non ha motivo di essere un'altra.
    globalStorageUri: Uri.file(app.getPath('userData')),
    secrets: new Segreti(() => app.getPath('userData')),
  }
}
