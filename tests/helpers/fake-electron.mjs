// Il finto `electron` con cui si prova lo shim: `app` (percorsi, versione),
// `shell`, `safeStorage`, `BrowserWindow` e `ipcMain`, `dialog`, `screen`,
// `nativeTheme`, `Tray` e `nativeImage`, abbastanza veri da far girare le prove
// con `node --test` senza display.
//
// esbuild lo mette al posto di `electron` nel bundle `dist/ambiente.mjs` (ramo
// `--test` di esbuild.mjs).

import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

/** La cartella che fa da `userData`: la prova la sceglie con REGISTRO_USERDATA. */
function cartellaDati () {
  const scelta = process.env.REGISTRO_USERDATA || percorso.join(tmpdir(), 'registro-prove')
  mkdirSync(scelta, { recursive: true })
  return scelta
}

export const app = {
  getPath (nome) {
    if (nome === 'userData') return cartellaDati()
    if (nome === 'documents') return percorso.join(cartellaDati(), 'Documenti')
    throw new Error(`il finto electron non conosce ${nome}`)
  },

  /**
   * Dove sta l'applicazione: come nell'app vera il percorso finisce in `dist/`
   * (la cartella del file di avvio). La prova la sceglie con REGISTRO_APPPATH.
   */
  getAppPath () {
    return process.env.REGISTRO_APPPATH || percorso.join(cartellaDati(), 'app', 'dist')
  },

  /**
   * La versione dichiarata dal pacchetto: la chiede `versioneApplicazione()` in
   * `environment/context.ts` per `$versione` del condotto.
   */
  getVersion () {
    return process.env.REGISTRO_VERSIONE || '0.0.0-prove'
  },
}

export const shell = {
  /** Un cestino che cancella: quel che conta nelle prove è che il file sparisca. */
  async trashItem (nativo) {
    rmSync(nativo, { recursive: true, force: true })
  },

  /** Le tre vie verso il sistema: qui si annotano e basta. Vedi `banco.fuori`. */
  showItemInFolder (nativo) {
    banco.fuori.push({ cosa: 'mostra', dove: nativo })
  },

  async openPath (nativo) {
    banco.fuori.push({ cosa: 'apri', dove: nativo })
    return ''
  },

  async openExternal (indirizzo) {
    banco.fuori.push({ cosa: 'esterno', dove: indirizzo })
  },
}

export const clipboard = {
  writeText (testo) {
    banco.appunti = testo
  },
  readText () {
    return banco.appunti
  },
}

/**
 * I messaggi e i dialoghi di sistema. La prova dice in anticipo che cosa
 * risponderà chi guarda, con `rispondiConIlBottone`.
 */
export const dialog = {
  async showMessageBox (padreOScelte, forseScelte) {
    const scelte = forseScelte ?? padreOScelte
    banco.messaggi.push(scelte)
    return { response: banco.rispostaAiMessaggi, checkboxChecked: false }
  },

  async showOpenDialog (padreOScelte, forseScelte) {
    const scelte = forseScelte ?? padreOScelte
    banco.aperture.push(scelte)
    return banco.rispostaAlleAperture
  },

  showErrorBox () {},
}

/**
 * Il menu dell'applicazione: la prova guarda il modello che `menu.ts` costruisce
 * dal manifesto.
 */
export const Menu = {
  buildFromTemplate (modello) {
    return { modello }
  },
  setApplicationMenu (menu) {
    banco.menu = menu ? menu.modello : null
  },
}

/**
 * Le immagini native: basta che il percorso arrivi fin qui e che il
 * ridimensionamento sia stato chiesto.
 */
export const nativeImage = {
  createFromPath (file) {
    return {
      file,
      misura: null,
      resize (misura) {
        return { ...this, misura }
      },
    }
  },
}

/** Due schermi, che è il caso per cui la proiezione esiste. */
export const screen = {
  getAllDisplays () {
    return banco.schermi
  },
  getPrimaryDisplay () {
    return banco.schermi[0]
  },
}

/**
 * Il tema del sistema: `themeSource` si scrive e si rilegge e decide
 * `shouldUseDarkColors` come in Electron (`system` lascia decidere al banco).
 */
export const nativeTheme = {
  // Sul banco e non qui: la prova e lo shim hanno due copie del modulo, e lo
  // stato dev'essere comune.
  get themeSource () {
    return banco.temaScelto
  },

  set themeSource (scelto) {
    banco.temaScelto = scelto
  },

  get shouldUseDarkColors () {
    if (this.themeSource === 'dark') return true
    if (this.themeSource === 'light') return false
    return banco.sistemaScuro
  },

  on (nome, ascoltatore) {
    banco.ascoltatoriTema.push({ nome, ascoltatore })
    return this
  },

  off (nome, ascoltatore) {
    const dove = banco.ascoltatoriTema.findIndex(
      (voce) => voce.nome === nome && voce.ascoltatore === ascoltatore,
    )
    if (dove >= 0) banco.ascoltatoriTema.splice(dove, 1)
    return this
  },
}

export const safeStorage = {
  isEncryptionAvailable () {
    return true
  },
  encryptString (testo) {
    return Buffer.from(testo, 'utf8')
  },
  decryptString (cifrato) {
    return Buffer.from(cifrato).toString('utf8')
  },
}

/** Il minimo per emettere eventi con la stessa forma di Electron. */
class Emettitore {
  #ascoltatori = new Map()

  on (nome, ascoltatore) {
    const elenco = this.#ascoltatori.get(nome) ?? []
    elenco.push({ ascoltatore, unaVolta: false })
    this.#ascoltatori.set(nome, elenco)
    return this
  }

  once (nome, ascoltatore) {
    const elenco = this.#ascoltatori.get(nome) ?? []
    elenco.push({ ascoltatore, unaVolta: true })
    this.#ascoltatori.set(nome, elenco)
    return this
  }

  emetti (nome, ...argomenti) {
    const elenco = this.#ascoltatori.get(nome) ?? []
    this.#ascoltatori.set(
      nome,
      elenco.filter((voce) => !voce.unaVolta),
    )
    for (const voce of elenco) voce.ascoltatore(...argomenti)
  }
}

let prossimoId = 0

/** I `webContents` della finestra: quel che serve è l'id e i messaggi spediti. */
class Contenuti extends Emettitore {
  constructor () {
    super()
    prossimoId += 1
    this.id = prossimoId
    /** Quel che il main process ha spedito alla pagina, in ordine. */
    this.inviati = []
    /** Il gestore delle finestre figlie, se qualcuno lo ha messo. */
    this.gestoreApertura = null
  }

  send (canale, messaggio) {
    this.inviati.push({ canale, messaggio })
  }

  /** Come in Electron: chi la chiama decide che fare di `window.open`. */
  setWindowOpenHandler (gestore) {
    this.gestoreApertura = gestore
  }

  /** L'indirizzo mostrato: la guardia sulla navigazione lo confronta. */
  getURL () {
    return this.indirizzo ?? ''
  }
}

/**
 * Il banco di lavoro, appeso a `globalThis`: la prova importa questo file, lo
 * shim se lo ritrova nel bundle, e le due copie del modulo devono vedere le
 * stesse finestre.
 */
const banco = (globalThis.__bancoElectron ??= {
  finestre: [],
  /** Quel che è stato consegnato al sistema: cartelle mostrate, file e indirizzi aperti. */
  fuori: [],
  appunti: '',
  /** I vassoi costruiti: uno solo, in pratica. */
  vassoi: [],
  /** Il modello passato a `Menu.setApplicationMenu`, o `null` finché non c'è. */
  menu: null,
  /** I messaggi mostrati, e il bottone che la prova sceglie. */
  messaggi: [],
  rispostaAiMessaggi: 0,
  aperture: [],
  rispostaAlleAperture: { canceled: true, filePaths: [] },
  schermi: [
    { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
    { id: 2, workArea: { x: 1920, y: 0, width: 1280, height: 720 } },
  ],
  /** Com'è messo il sistema quando `themeSource` è `system`. */
  sistemaScuro: false,
  temaScelto: 'system',
  ascoltatoriTema: [],
})

/** Il banco di lavoro, per le prove che vogliono predisporre le risposte. */
export const bancoElectron = banco

/** Tutte le finestre costruite, chiuse comprese: serve alle prove per ritrovarle. */
export const finestreCostruite = banco.finestre

export class BrowserWindow extends Emettitore {
  constructor (opzioni = {}) {
    super()
    this.opzioni = opzioni
    this.webContents = new Contenuti()
    this.titolo = opzioni.title ?? ''
    this.distrutta = false
    this.mostrata = false
    this.conFuoco = false
    this.schermoIntero = false
    this.riquadro = null
    this.dimensione = null
    this.ingrandita = false
    /**
     * Le misure «normali»: quelle con cui è nata e a cui torna ripristinandola.
     * Electron le distingue da `getBounds`, che a finestra ingrandita dà lo
     * schermo: la memoria dei posti si regge su questo.
     */
    this.riquadroNormale = {
      x: opzioni.x ?? 0,
      y: opzioni.y ?? 0,
      width: opzioni.width ?? 800,
      height: opzioni.height ?? 600,
    }
    /** Il colore di fondo, che il tema rifà quando gira. */
    this.sfondo = opzioni.backgroundColor ?? null
    /** Gli indirizzi caricati, in ordine. */
    this.caricati = []
    finestreCostruite.push(this)
  }

  static getAllWindows () {
    return finestreCostruite.filter((finestra) => !finestra.distrutta)
  }

  static getFocusedWindow () {
    return finestreCostruite.find((finestra) => !finestra.distrutta && finestra.conFuoco) ?? null
  }

  loadURL (indirizzo) {
    this.caricati.push(indirizzo)
    this.webContents.emetti('did-start-loading')
    return Promise.resolve()
  }

  /** Non è API di Electron: è la prova che dice «la pagina è arrivata». */
  finisciCaricamento () {
    this.webContents.emetti('did-finish-load')
  }

  /** Nemmeno questa: è la prova che dice «l'utente ha premuto la X». */
  chiudiDaFuori () {
    this.close()
  }

  isDestroyed () {
    return this.distrutta
  }

  isMinimized () {
    return false
  }

  isVisible () {
    return this.mostrata && !this.distrutta
  }

  restore () {}

  show () {
    this.mostrata = true
  }

  showInactive () {
    this.mostrata = true
  }

  focus () {
    this.conFuoco = true
  }

  close () {
    if (this.distrutta) return
    // I due eventi, nell'ordine di Electron: `close` mentre la finestra c'è ancora
    // (e si può chiedere dove stava), `closed` dopo.
    this.emetti('close')
    this.distrutta = true
    this.emetti('closed')
  }

  getBounds () {
    // Ingrandita, Electron dà lo schermo che la contiene: qui il primo, il
    // principale.
    return this.ingrandita ? { ...banco.schermi[0].workArea } : { ...this.riquadroNormale }
  }

  getNormalBounds () {
    return { ...this.riquadroNormale }
  }

  isMaximized () {
    return this.ingrandita
  }

  maximize () {
    this.ingrandita = true
    this.emetti('maximize')
  }

  unmaximize () {
    this.ingrandita = false
    this.emetti('unmaximize')
  }

  isFullScreen () {
    return this.schermoIntero
  }

  /** Non è API di Electron: è la prova che sposta o ridimensiona la finestra. */
  spostaDaFuori (riquadro) {
    this.riquadroNormale = { ...this.riquadroNormale, ...riquadro }
    this.emetti('move')
    this.emetti('resize')
  }

  setTitle (titolo) {
    this.titolo = titolo
  }

  setBackgroundColor (colore) {
    this.sfondo = colore
  }

  setBounds (riquadro) {
    this.riquadro = riquadro
  }

  setContentSize (larghezza, altezza) {
    this.dimensione = { larghezza, altezza }
  }

  setFullScreen (intero) {
    this.schermoIntero = intero
    this.emetti(intero ? 'enter-full-screen' : 'leave-full-screen')
  }

  center () {}

  getTitle () {
    return this.titolo
  }
}

/**
 * L'icona accanto all'orologio: la prova guarda il modello del menu.
 */
export class Tray extends Emettitore {
  constructor (immagine) {
    super()
    this.immagine = immagine
    this.suggerimento = ''
    /** L'ultimo menu ricevuto, nella forma che gli dà il finto `Menu`. */
    this.menu = null
    this.distrutto = false
    banco.vassoi.push(this)
  }

  setToolTip (testo) {
    this.suggerimento = testo
  }

  setContextMenu (menu) {
    this.menu = menu ? menu.modello : null
  }

  destroy () {
    this.distrutto = true
  }
}

/** Tutti i vassoi costruiti, distrutti compresi. */
export const vassoiCostruiti = banco.vassoi

class FintoIpc extends Emettitore {
  /**
   * Un messaggio dalla pagina, come lo consegnerebbe Electron: `sender.id` è
   * l'id dei `webContents` che l'ha spedito, ed è su quello che lo shim filtra.
   */
  simulaDallaPagina (idMittente, messaggio) {
    this.emetti('registro:messaggio', { sender: { id: idMittente } }, messaggio)
  }
}

export const ipcMain = (banco.ipc ??= new FintoIpc())

export default {
  app,
  clipboard,
  dialog,
  Menu,
  nativeImage,
  nativeTheme,
  screen,
  shell,
  safeStorage,
  BrowserWindow,
  ipcMain,
  Tray,
}
