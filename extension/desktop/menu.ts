// Il menu dell'applicazione, e la finestra delle impostazioni.
//
// Le due cose stanno nello stesso file perché nascono dallo stesso posto:
// `src/manifesto.ts`. I comandi, i loro titoli e le loro scorciatoie vengono da
// `COMANDI`; i campi del modulo da `IMPOSTAZIONI`. Un elenco ricopiato a mano
// diverge dall'originale in pochi mesi, e la divergenza si scopre da una voce
// di menu che non fa niente — cioè nel modo più scomodo possibile.
//
// Qui si scrive soltanto quel che nel manifesto non c'è e non ci potrebbe
// stare: l'ordine con cui i comandi si raggruppano nei menu. Nemmeno quello,
// però, decide *quali* comandi esistono — vedi `GRUPPI`.

import { BrowserWindow, ipcMain, Menu, type MenuItemConstructorOptions } from 'electron'

import { executeCommand, registerCommand } from '../src/ambiente/comandi.js'
import { percorsoPreload } from '../src/ambiente/contesto.js'
import { CANALE } from '../src/ambiente/finestre.js'
import { getConfiguration } from '../src/ambiente/impostazioni.js'
import { coloreSfondo, preferenzeComuni } from '../src/ambiente/tema.js'
import {
  COMANDI,
  IMPOSTAZIONI,
  TITOLO_IMPOSTAZIONI,
  type Comando,
  type VoceImpostazione,
} from '../src/manifesto.js'

// ------------------------------------------------------------------- il menu

export interface Azioni {
  /**
   * Cambia la cartella su cui si lavora. Sta nel main process e non qui perché
   * finisce con un riavvio dell'applicazione: vedi `principale.ts`.
   */
  cambiaCartella (): Promise<void>
}

/**
 * L'ordine dei menu, che è l'unica cosa che il manifesto non sa dire.
 *
 * Qui stanno i nomi dei gruppi e l'ordine dentro ognuno, e basta: i titoli e le
 * scorciatoie vengono dal manifesto, e un comando nominato qui ma tolto di lì
 * semplicemente non compare. Soprattutto: un comando *aggiunto* al manifesto e
 * non nominato qui non sparisce — finisce sotto «Altro». È la ragione per cui
 * questo elenco può restare indietro senza che si perda una funzione.
 */
const GRUPPI: ReadonlyArray<{ etichetta: string, comandi: readonly string[] }> = [
  {
    etichetta: 'Registro',
    comandi: [
      'registroDocenti.apri',
      'registroDocenti.oggi',
      'registroDocenti.nuovaLezione',
      'registroDocenti.proietta',
      'registroDocenti.ricarica',
    ],
  },
  {
    etichetta: 'Nuovo',
    comandi: [
      'registroDocenti.nuovaClasse',
      'registroDocenti.nuovoCorso',
      'registroDocenti.nuovoPiano',
      'registroDocenti.nuovaValutazione',
      'registroDocenti.nuovoAnno',
    ],
  },
  {
    etichetta: 'Posta',
    comandi: [
      'registroDocenti.collegaPosta',
      'registroDocenti.provaPosta',
      'registroDocenti.scollegaPosta',
      'registroDocenti.azzeraPosta',
    ],
  },
  {
    etichetta: 'Cartelle',
    comandi: ['registroDocenti.apriCartellaDati', 'registroDocenti.apriInArrivo'],
  },
  {
    etichetta: 'Aiuto',
    comandi: ['registroDocenti.guida', 'registroDocenti.avvio'],
  },
]

/**
 * Una voce di menu che invoca un comando. L'`id` è il nome del comando: a
 * Electron non serve, serve alle prove per dire quali comandi sono finiti nel
 * menu senza dover guardare dentro una funzione.
 */
function voceDi (comando: Comando): MenuItemConstructorOptions {
  return {
    id: comando.id,
    label: comando.titolo,
    accelerator: comando.scorciatoia,
    click: () => void executeCommand(comando.id),
  }
}

/** Le voci di un gruppo, tolte da `rimasti` man mano che si consumano. */
function vociDelGruppo (
  nomi: readonly string[],
  rimasti: Map<string, Comando>,
): MenuItemConstructorOptions[] {
  const voci: MenuItemConstructorOptions[] = []
  for (const nome of nomi) {
    const comando = rimasti.get(nome)
    if (!comando) continue
    rimasti.delete(nome)
    voci.push(voceDi(comando))
  }
  return voci
}

/** Le voci che non vengono da un comando del registro. */
function vociNostre (azioni: Azioni): MenuItemConstructorOptions[] {
  return [
    { type: 'separator' },
    {
      label: 'Cambia cartella di lavoro…',
      click: () => void azioni.cambiaCartella(),
    },
    {
      label: 'Impostazioni…',
      accelerator: 'CommandOrControl+,',
      click: () => apriImpostazioni(),
    },
  ]
}

/**
 * Il menu «Modifica», tutto ruoli e nessun comando nostro.
 *
 * Non è un ornamento: su macOS taglia, copia e incolla nei campi di testo
 * passano di qui, e senza queste voci il registro sarebbe una finestra piena di
 * caselle in cui non si può incollare un indirizzo.
 */
function menuModifica (): MenuItemConstructorOptions {
  return {
    label: 'Modifica',
    submenu: [
      { role: 'undo', label: 'Annulla' },
      { role: 'redo', label: 'Ripeti' },
      { type: 'separator' },
      { role: 'cut', label: 'Taglia' },
      { role: 'copy', label: 'Copia' },
      { role: 'paste', label: 'Incolla' },
      { role: 'selectAll', label: 'Seleziona tutto' },
    ],
  }
}

function menuVisualizza (): MenuItemConstructorOptions {
  return {
    label: 'Visualizza',
    submenu: [
      { role: 'resetZoom', label: 'Dimensione normale' },
      { role: 'zoomIn', label: 'Ingrandisci' },
      { role: 'zoomOut', label: 'Riduci' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Schermo intero' },
      { role: 'toggleDevTools', label: 'Strumenti di sviluppo' },
    ],
  }
}

/** Esportata per le prove: è il modello che si dà a `Menu.buildFromTemplate`. */
export function modelloDelMenu (azioni: Azioni): MenuItemConstructorOptions[] {
  const rimasti = new Map(COMANDI.map((comando) => [comando.id, comando]))

  const dalManifesto = GRUPPI.map((gruppo) => ({
    label: gruppo.etichetta,
    voci: vociDelGruppo(gruppo.comandi, rimasti),
  }))

  // Le voci nostre si attaccano a un gruppo per nome e non per posizione: se
  // domani i gruppi cambiano ordine, non finiscono altrove.
  const cartelle = dalManifesto.find((menu) => menu.label === 'Cartelle')
  if (cartelle) cartelle.voci.push(...vociNostre(azioni))

  // Chi non ha un gruppo: un comando aggiunto al manifesto dopo che questo file
  // è stato scritto. Meglio una voce in un menu generico che una funzione del
  // registro che sul desktop non si raggiunge.
  const orfani = [...rimasti.values()].map(voceDi)

  const modello: MenuItemConstructorOptions[] = []
  if (process.platform === 'darwin') modello.push({ role: 'appMenu' })

  for (const menu of dalManifesto) {
    if (menu.voci.length === 0) continue
    // Su Windows e Linux la via d'uscita sta in fondo al primo menu, dov'è
    // sempre stata; su macOS la mette `appMenu`.
    if (menu.label === 'Registro' && process.platform !== 'darwin') {
      menu.voci.push({ type: 'separator' }, { role: 'quit', label: 'Esci' })
    }
    // «Modifica» e «Visualizza» stanno fra i comandi del registro e l'aiuto,
    // che è il posto in cui si cercano.
    if (menu.label === 'Aiuto') {
      if (orfani.length > 0) modello.push({ label: 'Altro', submenu: orfani })
      modello.push(menuModifica(), menuVisualizza())
    }
    modello.push({ label: menu.label, submenu: menu.voci })
  }

  return modello
}

export function installaMenu (azioni: Azioni): void {
  // Il comando dell'editor che il registro invoca da sé: `smistamento.ts` lo
  // chiama per portare davanti le impostazioni dell'OCR, con il prefisso da
  // cercare come argomento. Registrato qui e non scritto dentro `comandi.ts`
  // perché `executeCommand` guarda prima i comandi registrati: lo shim non ha
  // bisogno di sapere che esiste una finestra delle impostazioni.
  registerCommand('workbench.action.openSettings', (filtro?: string) => {
    apriImpostazioni(typeof filtro === 'string' ? filtro : '')
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(modelloDelMenu(azioni)))
}

// ------------------------------------------------------------ le impostazioni

/**
 * La voce che il modulo non mostra.
 *
 * `posta.autenticazione` la scrive il comando «collega la casella di posta», che
 * è quel che dice la sua stessa descrizione: lasciarla modificabile a mano vuol
 * dire invitare a metterla in disaccordo con il portachiavi.
 */
const ESCLUSE = new Set(['registroDocenti.posta.autenticazione'])

/** Una voce come la riceve la pagina: il manifesto, più lo stato di adesso. */
interface CampoImpostazione {
  chiave: string
  tipo: string
  descrizione: string
  formato: string | null
  scelte: Array<{ valore: string | number, aiuto: string }> | null
  predefinito: unknown
  valore: unknown
  /** Se il valore di adesso è scritto nel file o viene dal predefinito. */
  scritta: boolean
}

/** Esportata per le prove: è quel che il modulo mostra, nell'ordine del manifesto. */
export function vociImpostazioni (): CampoImpostazione[] {
  const configurazione = getConfiguration()
  return Object.entries(IMPOSTAZIONI)
    .filter(([chiave]) => !ESCLUSE.has(chiave))
    .map(([chiave, voce]) => {
      // Da `inspect` e non da `get`: serve sapere non solo il valore ma anche se
      // è stato scritto, perché il modulo lo dice e offre di ritirarlo.
      const stato = configurazione.inspect<unknown>(chiave)
      const scritto = stato?.globalValue
      return {
        chiave,
        tipo: voce.tipo,
        descrizione: voce.descrizione,
        formato: voce.formato ?? null,
        scelte: voce.scelte ? voce.scelte.map((scelta) => ({ ...scelta })) : null,
        predefinito: stato?.defaultValue,
        valore: scritto !== undefined ? scritto : stato?.defaultValue,
        scritta: scritto !== undefined,
      }
    })
}

/** Quel che la pagina delle impostazioni manda al main process. */
type Richiesta =
  | { impostazioni: 'pronto' }
  | { impostazioni: 'scrivi', chiave: string, valore: unknown }
  | { impostazioni: 'azzera', chiave: string }

function eRichiesta (messaggio: unknown): messaggio is Richiesta {
  return typeof messaggio === 'object' && messaggio !== null && 'impostazioni' in messaggio
}

let finestra: BrowserWindow | null = null
let inAscolto = false

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  // Sullo stesso canale di tutto il resto: `finestre.ts` e `dialoghi.ts`
  // scartano i mittenti che non conoscono, e qui si scartano i loro.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    if (eRichiesta(messaggio)) void rispondi(aperta, messaggio)
  })
}

/**
 * Il valore da scrivere, ricontrollato sullo schema.
 *
 * La pagina è nostra e manda quel che deve, ma resta una pagina: un numero
 * arrivato come testo o una scelta fuori dall'enum finirebbero nel file delle
 * impostazioni, e di lì dentro il registro. `undefined` vuol dire «non
 * scrivere».
 */
function accettabile (chiave: string, valore: unknown): unknown {
  const voce: VoceImpostazione | undefined = IMPOSTAZIONI[chiave]
  if (!voce || ESCLUSE.has(chiave)) return undefined
  if (voce.scelte && !voce.scelte.some((scelta) => scelta.valore === valore)) return undefined
  switch (voce.tipo) {
    case 'boolean':
      return typeof valore === 'boolean' ? valore : undefined
    case 'number':
      return typeof valore === 'number' && Number.isFinite(valore) ? valore : undefined
    case 'string':
      return typeof valore === 'string' ? valore : undefined
    default:
      return undefined
  }
}

/** Rimanda alla pagina lo stato di una voce, dopo averla scritta o ritirata. */
function annunciaValore (aperta: BrowserWindow, chiave: string): void {
  const voce = vociImpostazioni().find((candidata) => candidata.chiave === chiave)
  if (!voce) return
  aperta.webContents.send(CANALE, {
    impostazioni: 'valore',
    chiave,
    valore: voce.valore,
    scritta: voce.scritta,
  })
}

async function rispondi (aperta: BrowserWindow, richiesta: Richiesta): Promise<void> {
  switch (richiesta.impostazioni) {
    case 'pronto':
      // La pagina si è disegnata: prima di adesso la finestra sarebbe apparsa
      // vuota e poi avrebbe fatto saltare il contenuto.
      if (!aperta.isVisible()) aperta.show()
      break

    case 'scrivi': {
      const valore = accettabile(richiesta.chiave, richiesta.valore)
      if (valore === undefined) return
      // Da `update` e non scrivendo il file: è `update` a far scattare
      // `onDidChangeConfiguration`, ed è così che `estensione.ts` si accorge di
      // un cambio di `cartellaDati` e ricarica, e `pannello.ts` di un cambio in
      // `ocr` e ridisegna. Scritto a mano, il file vorrebbe un riavvio per una
      // spunta.
      await getConfiguration().update(richiesta.chiave, valore)
      annunciaValore(aperta, richiesta.chiave)
      break
    }

    case 'azzera':
      // `undefined` toglie la riga dal file: da lì in poi vale il predefinito
      // del manifesto, che è quel che il modulo torna a mostrare.
      await getConfiguration().update(richiesta.chiave, undefined)
      annunciaValore(aperta, richiesta.chiave)
      break
  }
}

/**
 * La finestra delle impostazioni: una sola, e se c'è già la si porta davanti.
 *
 * La pagina si serve dal protocollo come ogni altro pezzo dell'app: `dist/` è
 * la cartella dei bundle, e `impostazioni.html` ci finisce dentro perché ce la
 * copia esbuild.
 */
export function apriImpostazioni (filtro = ''): void {
  const gia = viva()
  if (gia) {
    gia.show()
    gia.focus()
    gia.webContents.send(CANALE, { impostazioni: 'filtro', testo: filtro })
    return
  }

  ascolta()
  const nata = new BrowserWindow({
    width: 820,
    height: 760,
    minWidth: 560,
    title: TITOLO_IMPOSTAZIONI,
    show: false,
    backgroundColor: coloreSfondo(),
    // Il menu dell'applicazione qui non serve a niente: le impostazioni non
    // hanno comandi del registro da invocare.
    autoHideMenuBar: true,
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  finestra = nata

  nata.webContents.on('did-finish-load', () => {
    if (nata.isDestroyed()) return
    nata.webContents.send(CANALE, {
      impostazioni: 'schema',
      titolo: TITOLO_IMPOSTAZIONI,
      voci: vociImpostazioni(),
      filtro,
    })
    // Come per i dialoghi: se la pagina arriva ma non dice di essersi
    // disegnata, la si mostra lo stesso, così almeno la si può chiudere.
    setTimeout(() => {
      if (!nata.isDestroyed() && !nata.isVisible()) nata.show()
    }, 1000)
  })

  nata.on('closed', () => {
    if (finestra === nata) finestra = null
  })

  void nata.loadURL('registro://app/dist/impostazioni.html')
}
