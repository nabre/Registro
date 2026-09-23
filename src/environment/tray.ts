// L'icona accanto all'orologio, e il menu che ci si apre sopra.
//
// Qui c'è solo Electron: un'icona, un menu, e la traduzione da una forma nostra
// — `VoceVassoio` — a quella che Electron vuole. Che cosa scriverci dentro lo
// decide `src/tray.ts`, che conosce il registro e non conosce Electron.
//
// La forma nostra non è cerimonia. `MenuItemConstructorOptions` è un tipo di
// Electron con quaranta campi: costruirlo dove si conoscono le lezioni vorrebbe
// dire un file che sa di lezioni *e* di menu nativi, e provarlo vorrebbe dire
// avviare un'applicazione. Con un albero di voci semplici, il menu si costruisce
// e si verifica senza aprire niente.

import { Menu, nativeImage, Tray, type MenuItemConstructorOptions, type NativeImage } from 'electron'

import { percorsoIconaFinestra } from './context.js'

/** Una voce del menu. Senza `al` è una scritta, con `sotto` è un sottomenu. */
export interface VoceVassoio {
  etichetta: string
  al?: () => void
  /** Spenta: si legge e non si preme. È così che si fanno i titoli di gruppo. */
  spenta?: boolean
  /**
   * Un interruttore, con la spunta a dire com'è adesso.
   *
   * `undefined` è una voce normale: la distinzione conta, perché `false` è una
   * spunta che c'è e non è messa — «l'agenda sul desktop è spenta» — e senza di
   * lei non si saprebbe che quella voce è un interruttore prima di premerla.
   */
  segnata?: boolean
  sotto?: VoceVassoio[]
}

/** Una riga di separazione. Due di fila, o una in testa, si tolgono da sole. */
export const SEPARATORE: VoceVassoio = { etichetta: '-' }

function traduci (voce: VoceVassoio): MenuItemConstructorOptions {
  if (voce === SEPARATORE || voce.etichetta === '-') return { type: 'separator' }
  return {
    label: voce.etichetta,
    enabled: !voce.spenta,
    ...(voce.segnata === undefined ? {} : { type: 'checkbox' as const, checked: voce.segnata }),
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

interface OpzioniVassoio {
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
 * L'immagine da mettere nel cassetto, piccola com'è giusto che sia.
 *
 * Il `.ico` si consegna intero: dentro ci sono nove misure disegnate apposta,
 * e Windows pesca da sé quella che gli serve — 16 di solito, 20 o 24 con lo
 * schermo ingrandito. Ridurlo qui a 16 fisso vorrebbe dire dargli un'immagine
 * sola e costringerlo a ingrandirla sugli schermi ad alta risoluzione.
 *
 * Il `.png` invece è un'immagine sola da 512, e quella va ridotta: dandogliela
 * com'è la scala Windows, e la scala male — non sa che è un disegno e la tratta
 * come una fotografia.
 *
 * Quanto ridurlo dipende da chi lo disegna. Su macOS la barra dei menu è da
 * 16 punti, ma sugli schermi Retina un punto sono due pixel: una 16 sola esce
 * sfocata, e allora si accompagna con la 32 a `scaleFactor: 2`. Su Linux il
 * cassetto di KDE e quello di GNOME con AppIndicator disegnano a 22-24 pixel e
 * oltre: una 16 verrebbe ingrandita, una 32 si rimpicciolisce pulita.
 *
 * `setTemplateImage` non si tocca: serve su macOS, dove un'icona «template»
 * viene ricolorata dal sistema, e la nostra è a colori.
 */
function immagineDelCassetto (file: string): NativeImage {
  const immagine = nativeImage.createFromPath(file)
  if (file.endsWith('.ico')) return immagine
  if (process.platform === 'darwin') {
    const piccola = immagine.resize({ width: 16, height: 16 })
    const doppia = immagine.resize({ width: 32, height: 32 })
    piccola.addRepresentation({ scaleFactor: 2, buffer: doppia.toPNG() })
    return piccola
  }
  const lato = process.platform === 'linux' ? 32 : 16
  return immagine.resize({ width: lato, height: lato })
}

/**
 * Mette l'icona accanto all'orologio.
 *
 * `null` se non c'è un'icona da mettere: un vassoio senza icona su Windows è
 * una voce invisibile nel cassetto, cioè peggio di niente.
 */
export function creaVassoio (opzioni: OpzioniVassoio): Vassoio | null {
  const file = percorsoIconaFinestra()
  if (!file) return null

  const vassoio = new Tray(immagineDelCassetto(file))

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
