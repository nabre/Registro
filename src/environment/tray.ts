// L'icona nell'area di notifica e il suo menu, lato Electron. Il contenuto lo
// decide `src/tray.ts` con `VoceVassoio`, una forma semplice che si prova senza
// avviare Electron; qui la si traduce in `MenuItemConstructorOptions`.

import { Menu, nativeImage, Tray, type MenuItemConstructorOptions, type NativeImage } from 'electron'

import { percorsoIconaCassetto } from './context.js'
import { alCambioLingua } from '../i18n/index.js'

/** Una voce del menu. Senza `al` è una scritta, con `sotto` è un sottomenu. */
export interface VoceVassoio {
  etichetta: string
  al?: () => void
  /** Spenta: si legge e non si preme (titoli di gruppo). */
  spenta?: boolean
  sotto?: VoceVassoio[]
}

/** Una riga di separazione. Due di fila, o una in testa, si tolgono da sole. */
export const SEPARATORE: VoceVassoio = { etichetta: '-' }

function traduci (voce: VoceVassoio): MenuItemConstructorOptions {
  if (voce === SEPARATORE || voce.etichetta === '-') return { type: 'separator' }
  return {
    label: voce.etichetta,
    enabled: !voce.spenta,
    ...(voce.sotto ? { submenu: voce.sotto.map(traduci) } : {}),
    ...(voce.al ? { click: voce.al } : {}),
  }
}

/**
 * Toglie i separatori in testa, in coda o a coppie, così chi costruisce il menu
 * può metterne uno dopo ogni gruppo senza condizioni.
 */
export function senzaSeparatoriInutili (voci: VoceVassoio[]): VoceVassoio[] {
  const netto: VoceVassoio[] = []
  for (const voce of voci) {
    const separatore = voce.etichetta === '-'
    if (separatore && (netto.length === 0 || netto[netto.length - 1]?.etichetta === '-')) continue
    netto.push(voce)
  }
  while (netto.length > 0 && netto[netto.length - 1]?.etichetta === '-') netto.pop()
  return netto
}

export interface Vassoio {
  /** Rifà il menu e il suggerimento: da chiamare quando il registro cambia. */
  aggiorna (): void
  smaltisci (): void
}

interface OpzioniVassoio {
  /** Il menu, richiesto a ogni `aggiorna()`: le lezioni cambiano sotto. */
  menu: () => VoceVassoio[]
  /** Il testo che compare fermandosi sopra l'icona. */
  suggerimento: () => string
  /** Che cosa fare con un clic singolo: riportare davanti il registro. */
  alClic: () => void
}

/**
 * Icone accese (zero o una). Il guscio lo chiede alla chiusura dell'ultima
 * finestra: senza icona la X deve uscire, o l'app resterebbe viva e irraggiungibile.
 */
let accesi = 0

export function vassoioAcceso (): boolean {
  return accesi > 0
}

/**
 * L'immagine per l'area di notifica, alla misura giusta per la piattaforma.
 * - `.ico`: intero, Windows sceglie la misura fra quelle contenute.
 * - `*Template.png` (macOS): com'è, dichiarato template perché il sistema lo ricolori.
 * - `.png` a colori: ridotto a 16 (Windows), 16+32@2x (macOS Retina), 32 (Linux).
 */
function immagineDelCassetto (file: string): NativeImage {
  const immagine = nativeImage.createFromPath(file)
  if (file.endsWith('.ico')) return immagine
  if (file.endsWith('Template.png')) {
    immagine.setTemplateImage(true)
    return immagine
  }
  if (process.platform === 'darwin') {
    const piccola = immagine.resize({ width: 16, height: 16 })
    const doppia = immagine.resize({ width: 32, height: 32 })
    piccola.addRepresentation({ scaleFactor: 2, buffer: doppia.toPNG() })
    return piccola
  }
  const lato = process.platform === 'linux' ? 32 : 16
  return immagine.resize({ width: lato, height: lato })
}

/** Mette l'icona nell'area di notifica; `null` se manca il file dell'icona. */
export function creaVassoio (opzioni: OpzioniVassoio): Vassoio | null {
  const file = percorsoIconaCassetto()
  if (!file) return null

  const vassoio = new Tray(immagineDelCassetto(file))

  const aggiorna = (): void => {
    vassoio.setToolTip(opzioni.suggerimento())
    vassoio.setContextMenu(
      Menu.buildFromTemplate(senzaSeparatoriInutili(opzioni.menu()).map(traduci)),
    )
  }

  // Il menu è sul tasto destro; il clic singolo riporta davanti il registro.
  vassoio.on('click', () => opzioni.alClic())
  aggiorna()
  accesi += 1

  // Il menu è una fotografia: al cambio di lingua si rifà.
  const smettiDiAscoltare = alCambioLingua(aggiorna)

  let vivo = true
  return {
    aggiorna,
    // Una volta sola, o `accesi` scenderebbe sotto zero.
    smaltisci: () => {
      if (!vivo) return
      vivo = false
      accesi -= 1
      smettiDiAscoltare()
      vassoio.destroy()
    },
  }
}
