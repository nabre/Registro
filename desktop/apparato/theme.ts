// Tema chiaro/scuro per tutta l'applicazione: l'impostazione va in
// `nativeTheme.themeSource`, e ogni finestra segue con `prefers-color-scheme`.
// Qui resta quel che il CSS non raggiunge: il fondo prima della pagina, la fascia
// dei pulsanti di sistema, la barra dei menu delle finestre di servizio e la
// dimensione del testo di Windows.

import { BrowserWindow, nativeTheme, type BrowserWindowConstructorOptions, type WebPreferences } from 'electron'
import { execFileSync } from 'node:child_process'

import { percorsoPreload } from './context.js'
import { Smaltitore } from '#core/apparato/events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { diSistema } from './system.js'
import { limita } from '#core/dominio/calculations.js'

const CHIAVE = 'registroDocenti.aspetto.tema'

/** `--sfondo` di `src/ui/styles/theme.css`, copiato: serve prima che la pagina esista. */
const SFONDO_CHIARO = '#fafafa'
const SFONDO_SCURO = '#141416'

/**
 * `--sfondo-alto` e `--testo-quieto` dello stesso foglio, per i pulsanti di
 * finestra che su Windows e Linux disegna il sistema.
 */
const BARRA_CHIARA = { fondo: '#f3f3f4', segni: '#5b5b62' }
const BARRA_SCURA = { fondo: '#1b1b1e', segni: '#a1a1a9' }

/**
 * Altezza in pixel della barra del titolo; uguale in `ui/styles/title-bar.css`
 * e in `desktop/shell/pages/shared/title-bar.css`.
 */
const ALTEZZA_BARRA_TITOLO = 40

/** Se in questo momento l'applicazione è scura. */
export function scuro (): boolean {
  return nativeTheme.shouldUseDarkColors
}

/** Il fondo della finestra prima che la pagina arrivi, per evitare il lampo bianco. */
export function coloreSfondo (): string {
  return scuro() ? SFONDO_SCURO : SFONDO_CHIARO
}

/**
 * Le finestre con la fascia di sistema: `setTitleBarOverlay` su una finestra
 * senza overlay solleva un'eccezione.
 */
const conFascia = new WeakSet<BrowserWindow>()

/** La fascia di sistema nei colori del tema attuale. */
function fasciaDelTema (): { color: string, symbolColor: string, height: number } {
  const colori = scuro() ? BARRA_SCURA : BARRA_CHIARA
  return { color: colori.fondo, symbolColor: colori.segni, height: ALTEZZA_BARRA_TITOLO }
}

/** Segna che questa finestra ha la fascia; su macOS non c'è, ci sono i semafori. */
export function ricordaFascia (finestra: BrowserWindow): void {
  if (process.platform !== 'darwin') conFascia.add(finestra)
}

// ------------------------------------------------------ la barra del titolo propria

/**
 * Le opzioni di una finestra che si disegna da sé la barra del titolo: il
 * pannello e le finestre del guscio (benvenuto, impostazioni, dialoghi,
 * lettore), perché abbiano tutte la stessa testata. Dopo la costruzione va
 * chiamata `ricordaFascia`, che al cambio di tema ne ricolora i pulsanti.
 *
 * macOS: i semafori restano del sistema, posati dentro la barra; la pagina
 * lascia loro lo spazio a sinistra (`data-sistema`).
 *
 * Windows e Linux: la barra di sistema sparisce e i pulsanti arrivano come
 * `titleBarOverlay`, nei colori del tema; la pagina ne conosce l'ingombro da
 * `env(titlebar-area-*)`. I bordi restano del sistema: ridimensionare funziona
 * come prima. Su Linux la fascia la disegna Electron stesso: un gestore di
 * finestre che impone la sua cornice (alcuni compositori Wayland) ci mette
 * sopra la propria barra, e la nostra resta sotto come una testata: brutta ma
 * usabile, e nessun pulsante si perde.
 */
export function cornicePropria (): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: (ALTEZZA_BARRA_TITOLO - 16) / 2 },
    }
  }
  return {
    titleBarStyle: 'hidden',
    titleBarOverlay: fasciaDelTema(),
    autoHideMenuBar: true,
  }
}

/** Da dove parte il programma se non è installato: `dev` con `npm run dev`, `start` con `npm run start`. */
function modoSviluppo (): 'dev' | 'start' | null {
  if (process.env.REGISTRO_SVILUPPO === '1') return 'dev'
  return process.defaultApp ? 'start' : null
}

/**
 * La query che dice a una pagina del guscio di disegnarsi la barra
 * (`desktop/shell/pages/shared/titleBar.ts`): il sistema, perché su macOS i
 * semafori stanno a sinistra, e il modo di sviluppo, per il segno accanto al
 * logo come nel pannello.
 */
export function segniDellaCornice (): string {
  const segni = new URLSearchParams({ cornice: process.platform })
  const modo = modoSviluppo()
  if (modo) segni.set('sviluppo', modo)
  return segni.toString()
}

// ------------------------------------------------------------ la barra dei menu

/**
 * Le finestre senza barra dei menu: dialoghi, benvenuto, impostazioni, lettore.
 * Su Windows e Linux `Menu.setApplicationMenu` rimette il menu a ogni finestra
 * aperta, e ogni finestra nuova nasce col menu dell'applicazione (all'avvio
 * quello predefinito di Electron): qui si ricorda chi va ripulita.
 */
const senzaMenu = new WeakSet<BrowserWindow>()

/**
 * Toglie la barra dei menu a una finestra di servizio. Su macOS il menu è
 * dell'applicazione, non della finestra, e resta: porta copia e incolla.
 */
export function togliMenu (finestra: BrowserWindow): void {
  senzaMenu.add(finestra)
  finestra.removeMenu()
}

/** Da chiamare dopo ogni `Menu.setApplicationMenu`, che il menu lo rimette. */
export function ritogliMenu (): void {
  for (const finestra of BrowserWindow.getAllWindows()) {
    if (!finestra.isDestroyed() && senzaMenu.has(finestra)) finestra.removeMenu()
  }
}

/** L'impostazione, ridotta a quel che Electron capisce. */
function sorgente (): 'system' | 'light' | 'dark' {
  const scelta = getConfiguration().get<string>(CHIAVE, 'sistema')
  if (scelta === 'chiaro') return 'light'
  if (scelta === 'scuro') return 'dark'
  return 'system'
}

/** Applica l'impostazione; all'avvio va chiamata prima di aprire finestre. */
export function applicaTema (): void {
  nativeTheme.themeSource = sorgente()
}

/**
 * Segue l'impostazione e, al cambio di tema, aggiorna fondo e fascia delle
 * finestre aperte (il fondo si vede mentre si ridimensionano).
 */
export function osservaTema (): Smaltitore {
  const alCambio = (): void => {
    const colore = coloreSfondo()
    const fascia = fasciaDelTema()
    for (const finestra of BrowserWindow.getAllWindows()) {
      if (finestra.isDestroyed()) continue
      finestra.setBackgroundColor(colore)
      if (conFascia.has(finestra)) finestra.setTitleBarOverlay(fascia)
    }
  }
  nativeTheme.on('updated', alCambio)

  const iscrizione = onDidChangeConfiguration((evento) => {
    if (evento.affectsConfiguration(CHIAVE)) applicaTema()
  })

  return new Smaltitore(() => {
    nativeTheme.off('updated', alCambio)
    iscrizione.dispose()
  })
}

// ------------------------------------------------------- la dimensione del testo

/**
 * Dimensione del testo in pixel alla radice del documento. Rispetta la
 * «Dimensione testo» di Windows, che Chromium ignora (la scala dello schermo la
 * gestisce già): va in `defaultFontSize`, e il CSS la segue via `rem`/`em`.
 */
const BASE = 16

/** Letto una volta: un cambio in Windows vale al riavvio. */
let dimensione: number | null = null

export function dimensioneTesto (): number {
  if (dimensione !== null) return dimensione
  dimensione = Math.round((BASE * fattoreDiSistema()) / 100)
  return dimensione
}

/**
 * `TextScaleFactor` di Windows in centesimi, letto con `reg query`; 100 se
 * assente, illeggibile o fuori da Windows.
 */
function fattoreDiSistema (): number {
  if (process.platform !== 'win32') return 100
  try {
    // Per percorso intero: vedi `system.ts` per il `reg.exe` della cartella condivisa.
    const uscita = execFileSync(
      diSistema('reg.exe'),
      ['query', 'HKCU\\Software\\Microsoft\\Accessibility', '/v', 'TextScaleFactor'],
      { encoding: 'utf8', windowsHide: true, timeout: 2000 },
    )
    const trovato = /TextScaleFactor\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(uscita)
    if (!trovato) return 100
    const letto = Number.parseInt(trovato[1], 16)
    // Windows arriva a 225; il limite para i valori scritti a mano.
    return Number.isFinite(letto) ? limita(letto, 100, 300) : 100
  } catch {
    // Chiave assente (caso normale) o `reg` muto.
    return 100
  }
}

/** Le preferenze comuni a ogni finestra dell'applicazione. */
export function preferenzeComuni (): { defaultFontSize: number } {
  return { defaultFontSize: dimensioneTesto() }
}

/**
 * Preferenze comuni più il ponte del preload, con la pagina isolata da Node.
 * `sandbox: true`: il preload è un bundle che usa solo le API Electron esposte dal contesto isolato.
 */
export function preferenzeConPonte (): WebPreferences {
  return {
    ...preferenzeComuni(),
    preload: percorsoPreload(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  }
}
