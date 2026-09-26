// Tema chiaro/scuro per tutta l'applicazione: l'impostazione va in
// `nativeTheme.themeSource`, e ogni finestra segue con `prefers-color-scheme`.
// Qui resta quel che il CSS non raggiunge: il fondo prima della pagina, la fascia
// dei pulsanti di sistema e la dimensione del testo di Windows.

import { BrowserWindow, nativeTheme, type WebPreferences } from 'electron'
import { execFileSync } from 'node:child_process'

import { percorsoPreload } from './context.js'
import { Smaltitore } from './events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { diSistema } from './system.js'
import { limita } from '../domain/calculations.js'

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

/** Altezza in pixel della barra del titolo; uguale in `src/ui/styles/title-bar.css`. */
export const ALTEZZA_BARRA_TITOLO = 40

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
export function fasciaDelTema (): { color: string, symbolColor: string, height: number } {
  const colori = scuro() ? BARRA_SCURA : BARRA_CHIARA
  return { color: colori.fondo, symbolColor: colori.segni, height: ALTEZZA_BARRA_TITOLO }
}

/** Segna che questa finestra ha la fascia. */
export function ricordaFascia (finestra: BrowserWindow): void {
  conFascia.add(finestra)
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
 * `sandbox: false` perché il preload è un bundle CommonJS che usa `require`.
 */
export function preferenzeConPonte (): WebPreferences {
  return {
    ...preferenzeComuni(),
    preload: percorsoPreload(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  }
}
