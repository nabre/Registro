// Il menu dell'applicazione, e la finestra delle impostazioni.
//
// Le due cose stanno nello stesso file perché nascono dallo stesso posto:
// `src/manifest.ts`. I comandi, i loro titoli e le loro scorciatoie vengono da
// `COMANDI`; i campi del modulo da `IMPOSTAZIONI`. Un elenco ricopiato a mano
// diverge dall'originale in pochi mesi, e la divergenza si scopre da una voce
// di menu che non fa niente — cioè nel modo più scomodo possibile.
//
// Qui si scrive soltanto quel che nel manifesto non c'è e non ci potrebbe
// stare: l'ordine con cui i comandi si raggruppano nei menu. Nemmeno quello,
// però, decide *quali* comandi esistono — vedi `GRUPPI`.

import { BrowserWindow, ipcMain, Menu, type MenuItemConstructorOptions } from 'electron'

import { executeCommand, registerCommand } from '../../src/environment/commands.js'
import { icona, percorsoPreload } from '../../src/environment/context.js'
import { alCambioDocumenti, documentiNoti } from '../../src/environment/documents.js'
import { CANALE } from '../../src/environment/windows.js'
import {
  getConfiguration,
  onDidChangeConfiguration,
  valoreConMotivo,
  vociImpostazioni,
} from '../../src/environment/settings.js'
import { postoDi, ricordaPosto } from '../../src/environment/placement.js'
import { coloreSfondo, preferenzeComuni } from '../../src/environment/theme.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { COMANDI, TITOLO_IMPOSTAZIONI, type Comando } from '../../src/manifest.js'

// ------------------------------------------------------------------- il menu

export interface Azioni {
  /**
   * Apre un documento d'anno — un file `.registro` — scelto con il dialogo del
   * sistema. Sta nel main process e non qui perché può finire con un riavvio
   * dell'applicazione: vedi `main.ts`.
   */
  apriDocumento (percorso?: string): Promise<void>
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
  // Gli stessi tre scaffali della barra del pannello, e per la stessa ragione:
  // il documento e il programma, poi dove si va, poi che cosa si fa. Un menu
  // che mescola «vai a oggi» e «collega la posta» costringe a leggerlo tutto
  // ogni volta, perché non c'è niente che dica dove guardare.
  {
    etichetta: 'Registro',
    comandi: ['registroDocenti.apri', 'registroDocenti.ricarica', 'registroDocenti.chiudiDocumento'],
  },
  {
    etichetta: 'Vai a',
    comandi: [
      'registroDocenti.oggi',
      'registroDocenti.agenda',
      'registroDocenti.impostazioni',
      'registroDocenti.guida',
    ],
  },
  {
    etichetta: 'Nuovo',
    comandi: [
      'registroDocenti.nuovaLezione',
      'registroDocenti.nuovaClasse',
      'registroDocenti.nuovoCorso',
      'registroDocenti.nuovoPiano',
      'registroDocenti.nuovaValutazione',
      'registroDocenti.nuovoAnno',
      'registroDocenti.avvio',
    ],
  },
  {
    etichetta: 'Schermo',
    comandi: ['registroDocenti.proietta'],
  },
  {
    etichetta: 'Posta',
    comandi: [
      'registroDocenti.collegaPosta',
      'registroDocenti.provaPosta',
      'registroDocenti.provaInvioPosta',
      'registroDocenti.scollegaPosta',
      'registroDocenti.azzeraPosta',
    ],
  },
  {
    etichetta: 'Cartelle',
    comandi: ['registroDocenti.apriCartellaDati'],
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

/**
 * Gli anni già visti: i preferiti in cima, i recenti sotto.
 *
 * È lo stesso elenco del menu «File» del pannello e della pagina di benvenuto —
 * `environment/documents.ts`, che vive in `userData` — e qui serve a chi il
 * pannello non ce l'ha davanti: la barra dei menu c'è comunque, e riaprire
 * l'anno scorso non deve voler dire sfogliare le cartelle.
 *
 * Il sottomenu resta anche da vuoto, spento: una voce che compare e scompare
 * secondo quanti file si sono aperti sposta tutte le altre, e chi cerca «Apri…»
 * lo troverebbe ogni volta in un punto diverso.
 */
function vociRecenti (azioni: Azioni): MenuItemConstructorOptions {
  const noti = documentiNoti()
  return {
    label: 'Apri un anno recente',
    enabled: noti.length > 0,
    submenu: noti.map((file) => ({
      // La stella davanti dice che è un preferito, e il «non disponibile» che
      // adesso quel file non c'è: una chiavetta staccata, una cartella
      // sincronizzata non ancora scesa. Si vede e non si preme.
      label: `${file.preferito ? '★ ' : ''}${file.nome}${file.mancante ? ' — non disponibile' : ''}`,
      sublabel: file.cartella,
      toolTip: file.percorso,
      enabled: !file.mancante,
      click: () => void azioni.apriDocumento(file.percorso),
    })),
  }
}

/** Le voci che non vengono da un comando del registro. */
function vociNostre (azioni: Azioni): MenuItemConstructorOptions[] {
  return [
    { type: 'separator' },
    {
      label: 'Apri…',
      accelerator: 'CommandOrControl+O',
      click: () => void azioni.apriDocumento(),
    },
    vociRecenti(azioni),
    {
      // Senza acceleratore: `CommandOrControl+,` lo porta già la voce
      // «Impostazioni» di «Vai a», che viene dal manifesto e apre la pagina del
      // registro. Erano due voci con la stessa scorciatoia nella stessa barra,
      // e quale delle due vincesse lo decideva Electron. Questa resta la strada
      // per la finestra nativa, che serve quando il pannello non c'è.
      label: 'Impostazioni del programma…',
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
  // domani i gruppi cambiano ordine, non finiscono altrove. Vanno nel primo,
  // che è quello del documento e del programma: aprire un anno e cambiare le
  // impostazioni è lavoro di lì, non di «Cartelle», dove stavano perché era
  // il gruppo che parlava di file.
  const registro = dalManifesto.find((menu) => menu.label === 'Registro')
  if (registro) registro.voci.push(...vociNostre(azioni))

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

/**
 * Le azioni dell'ultima installazione, e se ci si è già iscritti ai cambi
 * dell'elenco. `installaMenu` può essere chiamata più di una volta — lo fanno
 * le prove — e una seconda iscrizione rifarebbe il menu due volte per ogni
 * stella accesa; tenendo le azioni da parte, l'unica iscrizione lavora sempre
 * con quelle di adesso.
 */
let azioniCorrenti: Azioni | null = null
let seguiDocumenti = false

function ridisegnaMenu (): void {
  if (!azioniCorrenti) return
  Menu.setApplicationMenu(Menu.buildFromTemplate(modelloDelMenu(azioniCorrenti)))
}

export function installaMenu (azioni: Azioni): void {
  registerCommand('registroDocenti.apriDocumento', (percorso?: string) => azioni.apriDocumento(percorso))
  // Il registro invoca questo da sé: `sorting.ts` lo chiama per portare
  // davanti le impostazioni dell'OCR, con il prefisso da cercare come
  // argomento. Registrato qui e non scritto dentro `commands.ts` perché
  // `executeCommand` guarda prima i comandi registrati: l'apparato non ha
  // bisogno di sapere che esiste una finestra delle impostazioni.
  //
  // L'id è suo e non `registroDocenti.impostazioni`, che è la **pagina** del
  // registro registrata da `src/startup.ts`. Erano lo stesso nome, e
  // `registerCommand` fa `Map.set`: l'ultimo registrato vinceva, e l'ordine di
  // `shell/main.ts` — prima `avviaRegistro`, poi `installaMenu` — lo
  // faceva vincere sempre a questa finestra. Risultato: «Vai a → Impostazioni»
  // e `Ctrl+,` non aprivano mai la pagina del registro, malgrado il commento di
  // `startup.ts` dichiarasse il contrario; e il pulsante «Apri nel registro» di
  // `settings.html` chiamava l'id, ritrovava questa stessa finestra e la
  // chiudeva subito dopo — un pulsante che spariva invece di portare da
  // qualche parte.
  registerCommand('registroDocenti.impostazioniFinestra', (filtro?: string) => {
    apriImpostazioni(typeof filtro === 'string' ? filtro : '')
  })

  azioniCorrenti = azioni
  ridisegnaMenu()

  // Il menu di Electron è una fotografia: costruito una volta, resta com'era.
  // L'elenco dei recenti invece cambia mentre il registro gira — si apre un
  // anno, se ne mette da parte un altro — e un sottomenu fermo a com'era
  // all'avvio è un elenco che mente.
  if (!seguiDocumenti) {
    seguiDocumenti = true
    alCambioDocumenti(ridisegnaMenu)
  }
}

// ------------------------------------------------------------ le impostazioni

/**
 * L'elenco delle voci, riesportato: le prove del menu lo interrogano di qui, e
 * costruirlo è mestiere dell'ambiente — vedi `environment/settings.ts`.
 */
export { vociImpostazioni }

/** Quel che la pagina delle impostazioni manda al main process. */
export type RichiestaImpostazioni =
  | { impostazioni: 'pronto' }
  /** «Apri nel registro»: la pagina vera sta nel pannello, questa è il ripiego. */
  | { impostazioni: 'apriPannello' }
  | { impostazioni: 'scrivi', chiave: string, valore: unknown }
  | { impostazioni: 'azzera', chiave: string }

function eRichiesta (messaggio: unknown): messaggio is RichiestaImpostazioni {
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
  // Sullo stesso canale di tutto il resto: `windows.ts` e `dialogs.ts`
  // scartano i mittenti che non conoscono, e qui si scartano i loro.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    if (eRichiesta(messaggio)) void rispondi(aperta, messaggio)
  })
}

/**
 * Rimanda alla pagina l'elenco intero, con i valori di adesso.
 *
 * Intero e non la sola chiave toccata, per due ragioni che sono la stessa:
 * spegnere `api.condotto` sospende `lettura` e `scrittura`, e cambiare
 * un'impostazione dal pannello mentre questa finestra è aperta cambia una riga
 * che qui nessuno ha toccato. La pagina non ridisegna: aggiorna in posto quel
 * che ha già sotto gli occhi, campo per campo, e lascia stare quello in cui si
 * sta scrivendo.
 */
function annunciaTutto (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, { impostazioni: 'valori', voci: vociImpostazioni() })
}

/**
 * Il rifiuto della dogana, detto alla pagina.
 *
 * Qui c'era un `return` muto: il valore non si scriveva, non si diceva niente,
 * e il campo restava a mostrare quel che era stato battuto — cioè la finestra
 * dichiarava salvato quel che aveva buttato via. Il riquadro `.voce__errore`
 * della pagina esisteva già e non veniva mai riempito da nessuno.
 */
function annunciaRifiuto (aperta: BrowserWindow, chiave: string, motivo: string): void {
  aperta.webContents.send(CANALE, { impostazioni: 'rifiuto', chiave, motivo })
}

async function rispondi (aperta: BrowserWindow, richiesta: RichiestaImpostazioni): Promise<void> {
  switch (richiesta.impostazioni) {
    case 'pronto':
      // La pagina si è disegnata: prima di adesso la finestra sarebbe apparsa
      // vuota e poi avrebbe fatto saltare il contenuto.
      if (!aperta.isVisible()) aperta.show()
      break

    case 'apriPannello':
      // E si chiude: lasciare aperte due pagine sulle stesse impostazioni vuol
      // dire vederne una ferma al valore di prima mentre l'altra cambia.
      // `void`: il pannello si apre per conto suo e questa finestra si chiude
      // subito dopo, senza aspettarlo.
      void executeCommand('registroDocenti.impostazioni')
      aperta.close()
      break

    case 'scrivi': {
      const { valore, motivo } = valoreConMotivo(richiesta.chiave, richiesta.valore)
      if (valore === undefined) {
        annunciaRifiuto(aperta, richiesta.chiave, motivo ?? 'Valore non accettato.')
        // E il campo torna a dire il vero: quel che è scritto nel file, non
        // quel che si è battuto e non è stato preso.
        annunciaTutto(aperta)
        return
      }
      // Da `update` e non scrivendo il file: è `update` a far scattare
      // `onDidChangeConfiguration`, ed è così che `panels/panel.ts` si
      // accorge di un cambio in `ocr` e ridisegna. Scritto a mano, il file
      // vorrebbe un riavvio per una spunta.
      //
      // Non si richiama `annunciaTutto` qui: ci pensa l'iscrizione, che sente
      // anche i cambi venuti dal pannello. Chiamarlo sarebbe il doppio lavoro
      // per ogni spunta.
      await getConfiguration().update(richiesta.chiave, valore)
      break
    }

    case 'azzera':
      // `undefined` toglie la riga dal file: da lì in poi vale il predefinito
      // del manifesto, che è quel che il modulo torna a mostrare.
      await getConfiguration().update(richiesta.chiave, undefined)
      break
  }
}

/**
 * La finestra delle impostazioni: una sola, e se c'è già la si porta davanti.
 *
 * La pagina si serve dal protocollo come ogni altro pezzo dell'app: `dist/` è
 * la cartella dei bundle, e `settings.html` ci finisce dentro perché ce la
 * copia esbuild.
 */
function apriImpostazioni (filtro = ''): void {
  const gia = viva()
  if (gia) {
    gia.show()
    gia.focus()
    gia.webContents.send(CANALE, { impostazioni: 'filtro', testo: filtro })
    return
  }

  ascolta()
  const nata = new BrowserWindow({
    ...postoDi('impostazioni', { width: 820, height: 760, minWidth: 560 }),
    title: TITOLO_IMPOSTAZIONI,
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
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
  chiudiLeVieDiFuga(nata)
  ricordaPosto('impostazioni', nata)

  // Le superfici sono due e guardano lo stesso file: con questa finestra e la
  // pagina del pannello aperte insieme, questa restava ferma al valore di
  // prima e si sbloccava solo dopo una scrittura propria. Adesso si iscrive,
  // come fa il pannello, e si aggiorna da sé — comprese le voci che il cambio
  // ha sospeso, che sono la ragione per cui la coerenza fra le due qui conta
  // più che altrove.
  const iscrizione = onDidChangeConfiguration(() => {
    if (!nata.isDestroyed()) annunciaTutto(nata)
  })

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
    // Disdetta alla chiusura: l'iscrizione vive quanto la finestra, e una
    // rimasta appesa manderebbe messaggi a un `webContents` che non c'è più
    // — e ne accumulerebbe una a ogni riapertura.
    iscrizione.dispose()
    if (finestra === nata) finestra = null
  })

  void nata.loadURL('registro://app/dist/settings.html')
}
