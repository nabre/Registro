// Il main process: dove il registro vive.
//
// Non riscrive niente del registro. Prepara quel che l'estensione dà per
// esistente — il protocollo delle risorse, la cartella di lavoro, il contesto —
// e poi accende il registro. Lo spegnimento passa da `spegni`,
// che è dove si aspetta l'ultimo salvataggio.

import { app, BrowserWindow, dialog } from 'electron'
import { existsSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { registerCommand } from '../src/ambiente/comandi.js'
import {
  cartellaLavoro,
  creaContesto,
  impostaCartellaLavoro,
  percorsoWorkerPdf,
} from '../src/ambiente/contesto.js'
import { getConfiguration } from '../src/ambiente/impostazioni.js'
import { avvisa, dichiaraIdentita, notificheDisponibili } from '../src/ambiente/notifiche.js'
import { avviaRicaricamento } from '../src/ambiente/sviluppo.js'
import { applicaTema, osservaTema } from '../src/ambiente/tema.js'
import { Uri } from '../src/ambiente/uri.js'
import { vassoioAcceso } from '../src/ambiente/vassoio.js'
import { impostaWorker } from '../src/dati/pdf.js'
import { apriRegistro, avvia as avviaRegistro, spegni } from '../src/avvio.js'
import { PannelloProiezione } from '../src/pannelli/proiezione.js'
import { installaMenu } from './menu.js'
import { privilegiaSchema, registraProtocollo } from './protocolloFile.js'

/**
 * Due copie sullo stesso registro si contraddicono appena una delle due salva:
 * la seconda istanza cede il posto alla prima e se ne va.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const prima = BrowserWindow.getAllWindows()[0]
    // Nessuna finestra non vuol più dire «applicazione morente»: con il vassoio
    // acceso è lo stato normale del registro messo via. Rilanciarlo dall'icona
    // del desktop, allora, deve riaprirlo — non spegnersi in silenzio lasciando
    // credere che il doppio clic non abbia funzionato.
    if (!prima) {
      apriRegistro()
      return
    }
    if (prima.isMinimized()) prima.restore()
    prima.focus()
  })

  // Prima di `whenReady`, o la dichiarazione non conta più.
  privilegiaSchema()

  void app.whenReady().then(avvia)
}

/**
 * Le iscrizioni del guscio: quelle che non nascono da `avvia` e che quindi
 * non stanno in `contesto.subscriptions`. Si chiudono all'uscita, insieme a
 * tutto il resto.
 */
const smaltibiliGuscio: Array<{ dispose (): unknown }> = []

async function avvia (): Promise<void> {
  registraProtocollo()

  // L'uscita, registrata come comando perché è di là che la si invoca: il menu
  // del vassoio nasce dentro il registro, dove `app` non esiste e non deve
  // esistere. Passa da `quit` e non da `exit`, così l'ultimo salvataggio viene
  // aspettato come per ogni altra uscita — vedi `before-quit`, in fondo.
  registerCommand('registroDocenti.esci', () => app.quit())

  // Il tema prima di ogni finestra: `applicaTema` scrive `nativeTheme.themeSource`,
  // e da lì `prefers-color-scheme` risponde giusto in tutte le pagine. Messo
  // dopo, la prima finestra nascerebbe con il fondo dell'altro tema e
  // cambierebbe colore sotto gli occhi.
  applicaTema()
  smaltibiliGuscio.push(osservaTema())

  // In sviluppo: le pagine si ricaricano da sole quando i bundle cambiano.
  // Nell'applicazione impacchettata queste righe non fanno niente.
  smaltibiliGuscio.push(avviaRicaricamento(() => PannelloProiezione.ricalcola()))

  const cartella = await assicuraCartellaLavoro()
  // Senza cartella non c'è registro: se l'utente annulla, si esce invece di
  // aprire una finestra che non saprebbe che cosa mostrare.
  if (!cartella) {
    app.exit(0)
    return
  }

  const contesto = creaContesto()
  try {
    await avviaRegistro(contesto)
    // `avvia` dichiara il worker di pdfjs con un `joinPath` su `dist/`, che
    // in sviluppo è giusto e nel pacchetto no: là quel file sta fuori
    // dall'archivio asar. Si ridichiara subito dopo — è `avvia` a scriverlo
    // per ultimo — e comunque prima che un PDF venga aperto, perché lo
    // smistatore aspetta che un file smetta di crescere prima di leggerlo.
    impostaWorker(pathToFileURL(percorsoWorkerPdf()).href)
    // Dopo `avvia`, che è dove i comandi si registrano: il menu li invoca
    // per nome, e una voce che non trovasse il proprio comando non farebbe
    // niente senza dirlo.
    installaMenu({ cambiaCartella: cambiaCartellaLavoro })
  } catch (errore) {
    // Le parti che mancano si annunciano da sé, con dentro il numero della
    // fase: si mostrano invece di lasciare una finestra che non arriva.
    const testo = errore instanceof Error ? errore.message : String(errore)
    console.error('avvio interrotto:', errore)
    dialog.showErrorBox('Registro docenti', `L'avvio si è fermato: ${testo}`)
  }
}

/** Una cartella che esiste davvero: il valore ricordato vale solo se è ancora lì. */
function ricordataValida (): Uri | null {
  const scelta = cartellaLavoro()
  if (!scelta) return null
  try {
    return statSync(scelta.fsPath).isDirectory() ? scelta : null
  } catch {
    return null
  }
}

/**
 * La cartella su cui il registro lavora, chiesta all'utente la prima volta e
 * ricordata da lì in poi.
 */
async function assicuraCartellaLavoro (): Promise<Uri | null> {
  const ricordata = ricordataValida()
  if (ricordata) return ricordata
  return chiediCartellaLavoro()
}

async function chiediCartellaLavoro (): Promise<Uri | null> {
  const esito = await dialog.showOpenDialog({
    title: 'Cartella del registro',
    message: 'Scegli la cartella in cui il registro tiene i suoi dati',
    buttonLabel: 'Usa questa cartella',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: cartellaLavoro()?.fsPath,
  })
  const scelta = esito.canceled ? undefined : esito.filePaths[0]
  if (!scelta || !existsSync(scelta)) return null

  const cartella = Uri.file(scelta)
  await impostaCartellaLavoro(cartella)
  return cartella
}

/**
 * Cambia la cartella di lavoro. È la voce «Cambia cartella di lavoro…» del menu
 * «Cartelle».
 *
 * Riavvia invece di ricaricare, e la ragione è che l'archivio nasce dentro
 * `activate` e non esce di lì: il guscio non ha in mano niente da ricaricare,
 * e ricostruirsene uno proprio vorrebbe dire due registri aperti sugli stessi
 * file. Il riavvio passa da `deactivate`, quindi l'ultimo salvataggio si
 * aspetta comunque.
 */
export async function cambiaCartellaLavoro (): Promise<void> {
  const scelta = await chiediCartellaLavoro()
  if (!scelta) return
  app.relaunch()
  app.quit()
}

/**
 * Se chiudere l'ultima finestra deve mettere via il registro invece di uscire.
 *
 * Vuole tutte e tre le condizioni. L'icona accesa, perché un'applicazione viva
 * senza finestre e senza niente da premere per riaverla è un'applicazione
 * perduta. L'impostazione, perché chi preferisce la X di sempre deve poterla
 * riavere. E che non si stia già uscendo: durante `before-quit` le finestre si
 * chiudono una dopo l'altra, e l'ultima farebbe scattare questa regola proprio
 * mentre si sta andando via.
 */
function restaNelVassoio (): boolean {
  if (inChiusura || !vassoioAcceso()) return false
  return getConfiguration().get<boolean>('registroDocenti.vassoio.chiusuraNelVassoio', true)
}

/**
 * Il primo «non me ne sono andato», detto una volta sola.
 *
 * La prima volta che la X non chiude l'applicazione è una sorpresa, e una
 * sorpresa taciuta si trasforma in «il registro non si chiude più». Detta una
 * volta, con dentro dove sta l'uscita vera, è un'istruzione; ripetuta a ogni
 * chiusura sarebbe la ragione per cui si spengono le notifiche.
 */
let spiegatoIlVassoio = false
function spiegaIlVassoio (): void {
  if (spiegatoIlVassoio || !notificheDisponibili()) return
  spiegatoIlVassoio = true
  dichiaraIdentita()
  avvisa({
    titolo: 'Il registro resta accanto all’orologio',
    corpo:
      'Riaprilo con un clic sull’icona. Per chiuderlo davvero: tasto destro sull’icona → ' +
      '«Esci dal registro».',
    al: () => apriRegistro(),
  })
}

// Su Windows e Linux chiudere l'ultima finestra chiude l'applicazione: non c'è
// una barra dei menu che sopravviva alle finestre, come su macOS. Con l'icona
// nel vassoio, però, qualcosa che sopravvive c'è — ed è lì che si va a
// riprendere il registro, e da lì che si esce.
app.on('window-all-closed', () => {
  if (restaNelVassoio()) {
    spiegaIlVassoio()
    return
  }
  if (process.platform !== 'darwin') app.quit()
})

// Su macOS il gesto è l'icona nel Dock, e vale la stessa regola del vassoio:
// l'applicazione è viva, la finestra no, e premendola si rivuole il registro.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) apriRegistro()
})

/**
 * Lo spegnimento, che è il punto delicato.
 *
 * I salvataggi del registro sono ritardati di mezzo secondo, e `deactivate`
 * esiste apposta per aspettarli. Electron però non aspetta le promesse in
 * `before-quit`: si ferma l'uscita, si aspetta davvero, e solo dopo si esce.
 */
let inChiusura = false
app.on('before-quit', (evento) => {
  if (inChiusura) return
  evento.preventDefault()
  inChiusura = true
  while (smaltibiliGuscio.length > 0) smaltibiliGuscio.pop()?.dispose()
  void spegni()
    .catch((errore: unknown) => console.error('errore nell’ultimo salvataggio', errore))
    .finally(() => app.exit(0))
})
