// L'icona accanto all'orologio, e il menu che ci si apre sopra.
//
// Qui c'è solo Electron: un'icona, un menu, e la traduzione da una forma nostra
// — `VoceVassoio` — a quella che Electron vuole. Che cosa scriverci dentro lo
// decide `src/vassoio.ts`, che conosce il registro e non conosce Electron.
//
// La forma nostra non è cerimonia. `MenuItemConstructorOptions` è un tipo di
// Electron con quaranta campi: costruirlo dove si conoscono le lezioni vorrebbe
// dire un file che sa di lezioni *e* di menu nativi, e provarlo vorrebbe dire
// avviare un'applicazione. Con un albero di voci semplici, il menu si costruisce
// e si verifica senza aprire niente.

import { Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron'

import { percorsoIcona } from './contesto.js'

/** Una voce del menu. Senza `al` è una scritta, con `sotto` è un sottomenu. */
export interface VoceVassoio {
  etichetta: string
  al?: () => void
  /** Spenta: si legge e non si preme. È così che si fanno i titoli di gruppo. */
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
 * Toglie i separatori che non separano niente: in testa, in coda, o a coppie.
 *
 * Serve perché chi costruisce il menu mette un separatore dopo ogni gruppo
 * senza sapere se il gruppo dopo esisterà — l'alternativa sarebbe una catena di
 * condizioni a ogni riga, che è il modo in cui un menu diventa illeggibile da
 * scrivere.
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

export interface OpzioniVassoio {
  /** Il menu, richiesto a ogni `aggiorna()`: le lezioni cambiano sotto. */
  menu: () => VoceVassoio[]
  /** Il testo che compare fermandosi sopra l'icona. */
  suggerimento: () => string
  /** Che cosa fare con un clic singolo: riportare davanti il registro. */
  alClic: () => void
}

/**
 * Quante icone ci sono accanto all'orologio: zero o una.
 *
 * Non è un contatore per curiosità: è la domanda che il guscio fa prima di
 * decidere che cosa succede chiudendo l'ultima finestra. Con un'icona accesa la
 * X mette via il registro e l'uscita è nel menu del vassoio; senza, la X è
 * l'uscita — o l'applicazione resterebbe viva senza niente da premere per
 * riaverla, che è il modo peggiore di sparire.
 */
let accesi = 0

export function vassoioAcceso (): boolean {
  return accesi > 0
}

/**
 * Mette l'icona accanto all'orologio.
 *
 * L'icona si ridimensiona a 16 pixel: Windows la vuole piccola, e datagliela
 * grande la scala lui — male, perché non sa che è un disegno e la tratta come
 * una fotografia. `setTemplateImage` non si tocca: serve su macOS, dove
 * un'icona «template» viene ricolorata dal sistema, e la nostra è a colori.
 *
 * `null` se non c'è un'icona da mettere: un vassoio senza icona su Windows è
 * una voce invisibile nel cassetto, cioè peggio di niente.
 */
export function creaVassoio (opzioni: OpzioniVassoio): Vassoio | null {
  const file = percorsoIcona()
  if (!file) return null

  const immagine = nativeImage.createFromPath(file).resize({ width: 16, height: 16 })
  const vassoio = new Tray(immagine)

  const aggiorna = (): void => {
    vassoio.setToolTip(opzioni.suggerimento())
    vassoio.setContextMenu(
      Menu.buildFromTemplate(senzaSeparatoriInutili(opzioni.menu()).map(traduci)),
    )
  }

  // Su Windows il clic singolo non apre il menu — quello è il tasto destro — e
  // resta libero per la cosa che si vuole fare più spesso: riavere il registro
  // davanti.
  vassoio.on('click', () => opzioni.alClic())
  aggiorna()
  accesi += 1

  let vivo = true
  return {
    aggiorna,
    // Una volta sola: smaltito due volte, il conto scenderebbe sotto zero e
    // `vassoioAcceso()` mentirebbe nel verso che fa restare aperta
    // un'applicazione senza finestre e senza icona.
    smaltisci: () => {
      if (!vivo) return
      vivo = false
      accesi -= 1
      vassoio.destroy()
    },
  }
}
