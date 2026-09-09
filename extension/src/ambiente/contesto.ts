// Dove sta l'applicazione e dove stanno i dati.
//
// Sono due domande sole, ma sono quelle a cui il registro non sa rispondere da
// sé: la radice dell'app — da cui compone gli indirizzi del proprio codice e
// delle proprie immagini — e la cartella del docente, che è una scelta fatta
// all'avvio e ricordata in `impostazioni.json`.
//
// C'è anche l'`ExtensionContext`, che è poco più di un contenitore: la lista
// delle cose da smaltire, i due percorsi, il portachiavi.

import { app } from 'electron'
import * as percorso from 'node:path'

import { getConfiguration } from './impostazioni.js'
import { Segreti, type SecretStorage } from './segreti.js'
import { Uri } from './uri.js'

/**
 * La cartella in cui stanno i bundle dell'app.
 *
 * È la stessa che `pannello.ts` nomina quando compone l'indirizzo del proprio
 * script — `registro://app/dist/webview.js` — ed è voluto che sia una sola: per
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
 * fanno `npm run avvia` e `strumenti/sviluppo.mjs`, e la ragione è che solo
 * così Electron legge il nostro `package.json` e l'applicazione ha il proprio
 * nome invece di chiamarsi «Electron».
 *
 * La correzione qui sotto è per chi la lancia comunque sul file di avvio —
 * `electron dist/principale.cjs`, che è la prima cosa che viene in mente: lì
 * `getAppPath()` è `dist/`, e la radice è la cartella che la contiene, perché è
 * lì che stanno `media/` e tutto il resto.
 */
export function radiceApp (): Uri {
  if (radice) return radice
  const cammino = app.getAppPath()
  const base = percorso.basename(cammino) === CARTELLA_BUNDLE ? percorso.dirname(cammino) : cammino
  radice = Uri.file(base)
  return radice
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

let lavoro: Uri | null = null

/**
 * La cartella su cui il registro lavora, o `null` se non è ancora stata
 * scelta. È la risposta a `workspace.workspaceFolders`, e `null` è il caso
 * «nessuna cartella aperta», che `percorsi.ts` prevede già.
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

export interface WorkspaceFolder {
  readonly uri: Uri
  readonly name: string
  readonly index: number
}

/** Una cartella sola, o nessuna: sul desktop non esistono workspace a più radici. */
export function cartelleDiLavoro (): WorkspaceFolder[] | undefined {
  const cartella = cartellaLavoro()
  if (!cartella) return undefined
  return [{ uri: cartella, name: percorso.basename(cartella.fsPath), index: 0 }]
}

export interface ExtensionContext {
  readonly subscriptions: Array<{ dispose (): unknown }>
  readonly extensionUri: Uri
  readonly extensionPath: string
  readonly globalStorageUri: Uri
  readonly secrets: SecretStorage
}

export function creaContesto (): ExtensionContext {
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
