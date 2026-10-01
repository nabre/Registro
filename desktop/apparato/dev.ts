// Strumenti di sviluppo, attivi solo con `REGISTRO_SVILUPPO=1` (lo mette
// `tools/dev.mjs`). Le pagine si ricaricano qui senza riavviare il main
// process, che resta in piedi con archivio e comandi; il main process lo
// riavvia `tools/dev.mjs`, quando cambia il suo bundle o quando esce con
// `CODICE_RIAVVIO`.
//
// Le scelte di chi sviluppa (console all'avvio, ricarica automatica) stanno in
// `sviluppo.json` nella `userData` di «Regiklass-dev», fuori dal manifesto:
// non sono impostazioni del registro e nel pacchetto non esistono. La finestra
// che le cambia è `desktop/shell/windows/devTools.ts`.

import { app, BrowserWindow, type WebContents } from 'electron'
import { watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'

import { cartellaBundle } from './context.js'
import { depositoJson } from './jsonStore.js'
import { tipoDelPannello } from './windows.js'
import { Smaltitore } from '../../core/apparato/events.js'

/** Quanto si aspetta prima di ricaricare, dall'ultimo file scritto. */
const CALMA = 120

/** I bundle delle pagine; main process e preload fanno riavviare, non ricaricare. */
const PAGINE = /\.(js|css|html)$/

/**
 * Il codice d'uscita con cui il main process chiede a `tools/dev.mjs` di
 * rilanciarlo; lo stesso numero sta là. 75 è `EX_TEMPFAIL`: «riprova».
 */
export const CODICE_RIAVVIO = 75

export function inSviluppo (): boolean {
  return process.env.REGISTRO_SVILUPPO === '1'
}

// ------------------------------------------------------------ le scelte

/** I tipi di finestra, nell'ordine in cui la finestra di sviluppo li elenca. */
const TIPI_FINESTRA = [
  'pannello',
  'proiezione',
  'assistente',
  'benvenuto',
  'impostazioni',
  'dialogo',
  'lettore',
  'avvio',
  'sviluppo',
] as const
export type TipoFinestra = typeof TIPI_FINESTRA[number]

/** Dove si apre la console: i modi di `openDevTools` che servono. */
export const POSIZIONI_CONSOLE = ['right', 'bottom', 'detach'] as const
export type PosizioneConsole = typeof POSIZIONI_CONSOLE[number]

export interface ImpostazioniSviluppo {
  /** Ricarica le pagine quando cambia un loro bundle (`avviaRicaricamento`). */
  ricaricaAutomatica: boolean
  /** Dove si apre la console, all'avvio e dalla finestra di sviluppo. */
  posizione: PosizioneConsole
  /** Per tipo di finestra, se la console si apre a pagina caricata. */
  allAvvio: Record<TipoFinestra, boolean>
}

/**
 * Le scelte di partenza: la console si apre da sola sui pannelli, come prima che
 * le scelte esistessero, e non sulle finestre di servizio.
 */
function impostazioniPredefinite (): ImpostazioniSviluppo {
  const allAvvio = Object.fromEntries(
    TIPI_FINESTRA.map((tipo) => [tipo, false]),
  ) as Record<TipoFinestra, boolean>
  allAvvio.pannello = true
  allAvvio.proiezione = true
  allAvvio.assistente = true
  return { ricaricaAutomatica: true, posizione: 'right', allAvvio }
}

function èPosizione (valore: unknown): valore is PosizioneConsole {
  return (POSIZIONI_CONSOLE as readonly unknown[]).includes(valore)
}

export function èTipoFinestra (valore: unknown): valore is TipoFinestra {
  return (TIPI_FINESTRA as readonly unknown[]).includes(valore)
}

/** Il file letto, campo per campo: quel che manca o non torna vale il predefinito. */
function convertiImpostazioni (letto: unknown): ImpostazioniSviluppo {
  const scelte = impostazioniPredefinite()
  if (typeof letto !== 'object' || letto === null) return scelte
  const grezzo = letto as Record<string, unknown>
  if (typeof grezzo.ricaricaAutomatica === 'boolean') scelte.ricaricaAutomatica = grezzo.ricaricaAutomatica
  if (èPosizione(grezzo.posizione)) scelte.posizione = grezzo.posizione
  const allAvvio = grezzo.allAvvio
  if (typeof allAvvio === 'object' && allAvvio !== null) {
    for (const tipo of TIPI_FINESTRA) {
      const valore = (allAvvio as Record<string, unknown>)[tipo]
      if (typeof valore === 'boolean') scelte.allAvvio[tipo] = valore
    }
  }
  return scelte
}

const deposito = depositoJson(
  () => join(app.getPath('userData'), 'sviluppo.json'),
  convertiImpostazioni,
  impostazioniPredefinite,
)

/** Le scelte di adesso. Legge e basta: il file nasce alla prima scrittura. */
export function impostazioniSviluppo (): ImpostazioniSviluppo {
  return deposito.contenuto()
}

/** Scrive le scelte che `muta` ricava da quelle di adesso; falso se il file è bloccato. */
export function cambiaImpostazioniSviluppo (
  muta: (attuali: ImpostazioniSviluppo) => ImpostazioniSviluppo,
): boolean {
  if (!inSviluppo()) return false
  return deposito.salva(muta)
}

// ------------------------------------------------------------ le finestre

const DEI_PANNELLI: Readonly<Record<string, TipoFinestra>> = {
  'registroDocenti.pannello': 'pannello',
  'registroDocenti.proiezione': 'proiezione',
  'registroDocenti.assistente': 'assistente',
}

/** Le pagine native per nome del file in `dist/` (`PAGINE_NATIVE` di `esbuild.mjs`). */
const DELLE_PAGINE: Readonly<Record<string, TipoFinestra>> = {
  welcome: 'benvenuto',
  settings: 'impostazioni',
  dialog: 'dialogo',
  reader: 'lettore',
  splash: 'avvio',
  dev: 'sviluppo',
}

/**
 * Che finestra è: i pannelli dal tipo con cui sono nati, le pagine native
 * dall'indirizzo. `null` per quel che non è nostro (la sentinella, `about:blank`).
 */
export function tipoDellaFinestra (finestra: BrowserWindow): TipoFinestra | null {
  if (finestra.isDestroyed()) return null
  const pannello = tipoDelPannello(finestra.webContents.id)
  if (pannello) return DEI_PANNELLI[pannello] ?? null
  const pagina = /^registro:\/\/app\/dist\/(\w+)\.html/.exec(finestra.webContents.getURL())?.[1]
  return pagina ? DELLE_PAGINE[pagina] ?? null : null
}

/** La posizione con cui si è aperta l'ultima volta la console di ogni pagina, per id dei contenuti. */
const posizioni = new Map<number, PosizioneConsole>()

/** La posizione dell'ultima apertura, o quella scelta per tutte. */
export function posizioneDellaConsole (contenuti: WebContents): PosizioneConsole {
  return posizioni.get(contenuti.id) ?? impostazioniSviluppo().posizione
}

/**
 * Apre la console di una pagina. Già aperta altrove, la si chiude e riapre:
 * Electron non sposta una console aperta.
 */
export function apriConsole (
  contenuti: WebContents,
  posizione: PosizioneConsole = impostazioniSviluppo().posizione,
): void {
  if (!inSviluppo() || contenuti.isDestroyed()) return
  if (contenuti.isDevToolsOpened()) {
    if (posizioni.get(contenuti.id) === posizione) return
    contenuti.closeDevTools()
  }
  posizioni.set(contenuti.id, posizione)
  contenuti.openDevTools({ mode: posizione })
}

/**
 * In sviluppo, apre la console delle finestre il cui tipo la vuole all'avvio, a
 * caricamento finito per non perdere le righe dell'avvio. `once` perché alla
 * ricarica resta aperta da sé.
 */
export function avviaConsoleAllAvvio (): Smaltitore {
  if (!inSviluppo()) return new Smaltitore(() => {})
  const nata = (_evento: unknown, finestra: BrowserWindow): void => {
    const contenuti = finestra.webContents
    const id = contenuti.id
    contenuti.once('did-finish-load', () => {
      if (finestra.isDestroyed() || contenuti.isDevToolsOpened()) return
      const tipo = tipoDellaFinestra(finestra)
      if (tipo && impostazioniSviluppo().allAvvio[tipo]) apriConsole(contenuti)
    })
    finestra.once('closed', () => posizioni.delete(id))
  }
  app.on('browser-window-created', nata)
  return new Smaltitore(() => {
    app.off('browser-window-created', nata)
  })
}

// ------------------------------------------------------------ ricarica e riavvio

/**
 * In sviluppo, ricarica ogni finestra quando un bundle di pagina cambia, se la
 * ricarica automatica è accesa. L'HTML di `registro://pagina/<id>` resta in
 * memoria e punta già ai bundle nuovi.
 */
export function avviaRicaricamento (dopo: () => void = () => {}): Smaltitore {
  if (!inSviluppo()) return new Smaltitore(() => {})

  const cartella = cartellaBundle().fsPath

  let attesa: NodeJS.Timeout | null = null
  let vigile: FSWatcher | null = null

  const ricarica = (): void => {
    attesa = null
    // Spenta, il bundle nuovo arriva alla prossima ricarica fatta a mano.
    if (!impostazioniSviluppo().ricaricaAutomatica) {
      console.log('[sviluppo] bundle cambiati, ricarica automatica spenta')
      return
    }
    const quante = ricaricaFinestre(dopo)
    if (quante > 0) console.log(`[sviluppo] ricarico ${quante} finestre`)
  }

  try {
    vigile = watch(cartella, (_evento, nome) => {
      // Una build emette più eventi a raffica (bundle, mappa, stile): si aspetta che tacciano.
      if (!nome || !PAGINE.test(nome)) return
      if (attesa) clearTimeout(attesa)
      attesa = setTimeout(ricarica, CALMA)
    })
  } catch (errore) {
    // Un aiuto di sviluppo non deve impedire l'avvio.
    console.error('[sviluppo] non riesco a guardare i bundle:', errore)
  }

  return new Smaltitore(() => {
    if (attesa) clearTimeout(attesa)
    vigile?.close()
  })
}

/**
 * Ricarica tutte le finestre, senza cache, e dice quante erano (bundle cambiato
 * in sviluppo, lingua cambiata). `dopo` si chiama a pagina caricata: la
 * proiezione non chiede lo stato da sé, glielo si rimanda.
 */
export function ricaricaFinestre (dopo: () => void = () => {}): number {
  const finestre = BrowserWindow.getAllWindows().filter((f) => !f.isDestroyed())
  for (const finestra of finestre) {
    finestra.webContents.once('did-finish-load', dopo)
    finestra.webContents.reloadIgnoringCache()
  }
  return finestre.length
}

let riavvioChiesto = false

/**
 * Esce passando da `before-quit` (l'ultimo salvataggio) con `CODICE_RIAVVIO`,
 * che `tools/dev.mjs` legge come «rilanciami». Fuori da `npm run dev` non c'è.
 */
export function chiediRiavvio (): void {
  if (!inSviluppo()) return
  riavvioChiesto = true
  app.quit()
}

/** Il codice con cui il main process esce, a spegnimento finito. */
export function codiceDUscita (): number {
  return riavvioChiesto ? CODICE_RIAVVIO : 0
}
