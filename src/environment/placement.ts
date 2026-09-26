// Posto, misure e stato (ingrandita, a schermo intero) delle finestre, per
// riaprirle dove erano. Sta in `userData`, non nella cartella dell'anno: il
// posto dipende dal computer, non dal registro. Un posto letto si usa solo se
// cade ancora dentro uno schermo attaccato.

import { app, screen, type BrowserWindow } from 'electron'
import { depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

const NOME_FILE = 'finestre.json'

/** Attesa prima di scrivere: il trascinamento emette `move` decine di volte al secondo. */
const ATTESA_SCRITTURA = 500

/** Quanto di una finestra deve restare su uno schermo perché il posto valga. */
const MINIMO_VISIBILE = 120

/** Il posto di una finestra, com'è scritto nel file. */
interface Posto {
  x: number
  y: number
  larghezza: number
  altezza: number
  /** Ingrandita: le misure qui sopra sono quelle a cui torna ripristinandola. */
  massimizzata?: boolean
  schermoIntero?: boolean
}

/** Le misure con cui nasce una finestra che non si è mai vista. */
export interface Misure {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
}

let orologio: ReturnType<typeof setTimeout> | null = null

/**
 * Posti cambiati dall'ultima scrittura. Tenuti a parte perché la rilettura del
 * deposito prima di scrivere sostituisce quel che c'è in memoria.
 */
const daScrivere = new Map<string, Posto>()

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

// Un file presente ma illeggibile `depositoJson` lo lascia stare, così non si
// perdono i posti delle altre finestre.
const deposito = depositoJson<Record<string, Posto>>(
  file,
  (letto) =>
    letto !== null && typeof letto === 'object' ? { ...(letto as Record<string, Posto>) } : {},
  () => ({}),
)

function caricati (): Record<string, Posto> {
  return deposito.contenuto()
}

/** Rimanda la scrittura finché la finestra non si ferma. */
function programmaScrittura (): void {
  if (orologio) clearTimeout(orologio)
  orologio = setTimeout(scrivi, ATTESA_SCRITTURA)
}

function scrivi (): void {
  if (orologio) {
    clearTimeout(orologio)
    orologio = null
  }
  if (daScrivere.size === 0) return
  const cambiati = Object.fromEntries(daScrivere)
  daScrivere.clear()
  try {
    deposito.salva((attuale) => ({ ...attuale, ...cambiati }))
  } catch {
    // Al peggio la finestra si riapre al centro.
  }
}

/** Rilegge il file. Serve alle prove, che scrivono in una `userData` loro. */
export function ricaricaPosti (): void {
  deposito.dimentica()
}

/**
 * L'area dello schermo che ospita almeno un pezzo afferrabile del posto, o
 * `null` se la finestra cadrebbe fuori da tutti gli schermi attaccati.
 */
function schermoDi (posto: Posto): Electron.Rectangle | null {
  for (const schermo of screen.getAllDisplays()) {
    const area = schermo.workArea
    const largo =
      Math.min(posto.x + posto.larghezza, area.x + area.width) - Math.max(posto.x, area.x)
    const alto = Math.min(posto.y + posto.altezza, area.y + area.height) - Math.max(posto.y, area.y)
    if (largo >= MINIMO_VISIBILE && alto >= MINIMO_VISIBILE) return area
  }
  return null
}

/**
 * Posto e misure per le opzioni di `BrowserWindow`: il posto salvato se vale
 * ancora, altrimenti `misure`. Va nel costruttore, non in `setBounds`, per non
 * far saltare la finestra dopo la nascita.
 */
export function postoDi (nome: string, misure: Misure): Misure & { x?: number, y?: number } {
  const posto = caricati()[nome]
  const schermo = posto ? schermoDi(posto) : null
  if (!posto || !schermo) return misure

  // Mai più grande dello schermo che la ospita, o i bordi per ridimensionare
  // restano fuori.
  const larghezza = Math.min(Math.round(posto.larghezza), schermo.width)
  const altezza = Math.min(Math.round(posto.altezza), schermo.height)

  return {
    ...misure,
    x: Math.round(posto.x),
    y: Math.round(posto.y),
    // Mai più piccola del minimo dichiarato.
    width: Math.max(larghezza, misure.minWidth ?? 0),
    height: Math.max(altezza, misure.minHeight ?? 0),
  }
}

/**
 * Ridà a una finestra lo stato ingrandita/schermo intero e ne segue il posto.
 * Usa `getNormalBounds` perché `getBounds`, a finestra ingrandita, dà le misure
 * dello schermo e si perderebbero quelle di ripristino.
 */
export function ricordaPosto (
  nome: string,
  finestra: BrowserWindow,
  opzioni: {
    /**
     * Se riaprire a schermo intero una finestra chiusa così. Spento per la
     * proiezione, che va a schermo intero solo a comando e sullo schermo giusto.
     */
    schermoIntero?: boolean
  } = {},
): void {
  const posto = caricati()[nome]
  if (posto?.massimizzata) finestra.maximize()
  if (posto?.schermoIntero && opzioni.schermoIntero !== false) finestra.setFullScreen(true)

  const segna = (): void => {
    if (finestra.isDestroyed()) return
    const misure = finestra.getNormalBounds()
    const posto: Posto = {
      x: misure.x,
      y: misure.y,
      larghezza: misure.width,
      altezza: misure.height,
      massimizzata: finestra.isMaximized(),
      schermoIntero: finestra.isFullScreen(),
    }
    // In memoria per chi riapre subito; in `daScrivere` per sopravvivere alla rilettura.
    caricati()[nome] = posto
    daScrivere.set(nome, posto)
    programmaScrittura()
  }

  finestra.on('resize', segna)
  finestra.on('move', segna)
  finestra.on('maximize', segna)
  finestra.on('unmaximize', segna)
  finestra.on('enter-full-screen', segna)
  finestra.on('leave-full-screen', segna)
  // Alla chiusura si scrive subito, o l'attesa perderebbe l'ultimo posto.
  finestra.on('close', () => {
    segna()
    scrivi()
  })
}
