// Il main process: dove il registro vive.
//
// Non riscrive niente del registro. Prepara quel che l'estensione dà per
// esistente — il protocollo delle risorse, la cartella di lavoro, il contesto —
// e poi accende il registro. Lo spegnimento passa da `spegni`,
// che è dove si aspetta l'ultimo salvataggio.

import { app, BrowserWindow, dialog } from 'electron'
import { existsSync, statSync } from 'node:fs'
import * as percorso from 'node:path'
import { pathToFileURL } from 'node:url'

import { executeCommand, registerCommand } from '../src/ambiente/comandi.js'
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
import { segnaAnnoDaAprire } from '../src/dati/archivio.js'
import { ESTENSIONE, nomeDelPacchetto, èPacchetto } from '../src/dati/pacchetto.js'
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
  app.on('second-instance', (_evento, argomenti) => {
    // Un doppio clic su un `.registro` mentre il registro è già aperto: la
    // seconda copia se ne va, ma prima consegna alla prima quale anno si
    // voleva. Senza, il doppio clic non farebbe niente e sembrerebbe rotto.
    const documento = documentoNegliArgomenti(argomenti)
    if (documento) {
      void usaDocumento(documento)
      return
    }
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

  // Su macOS un documento non arriva mai sulla riga di comando: arriva di qui,
  // e può arrivare prima che l'applicazione sia pronta. Chi arriva presto
  // aspetta — `whenReady` è già stato chiesto qui sotto — e chi arriva a
  // registro avviato passa dalla stessa strada del doppio clic su Windows.
  app.on('open-file', (evento, cammino) => {
    evento.preventDefault()
    void app.whenReady().then(() => usaDocumento(Uri.file(cammino)))
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

  // Un documento sulla riga di comando decide tutto il resto — cartella di
  // lavoro e anno da aprire — e va guardato prima di chiedere una cartella:
  // chi ha fatto doppio clic su un file ha già detto dove vuole andare, e
  // farsi chiedere una cartella dopo sarebbe chiederglielo due volte.
  const documento = documentoNegliArgomenti(process.argv)
  if (documento) await preparaDocumento(documento)

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
    installaMenu({ cambiaCartella: cambiaCartellaLavoro, apriDocumento: chiediDocumento })
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

// --------------------------------------------------- aprire un documento d'anno

/**
 * Il documento passato sulla riga di comando: quel che arriva da un doppio clic
 * su `2026-2027.registro`.
 *
 * Si scorrono tutti gli argomenti invece di prendere il primo: Electron ne
 * antepone di suoi — e in sviluppo il primo è la cartella dell'applicazione —
 * e quel che si cerca si riconosce da sé, dall'estensione e dall'essere un file
 * che esiste.
 */
function documentoNegliArgomenti (argomenti: string[]): Uri | null {
  for (const argomento of argomenti.slice(1)) {
    if (argomento.startsWith('-')) continue
    if (!èPacchetto(percorso.basename(argomento))) continue
    try {
      const intero = percorso.resolve(argomento)
      if (statSync(intero).isFile()) return Uri.file(intero)
    } catch {
      // Un argomento che non è un file: non è quello che si cercava.
    }
  }
  return null
}

/**
 * Prepara l'apertura di un documento: da dove sta il file si ricava tutto il
 * resto.
 *
 * La cartella che contiene il documento è la cartella dei dati — quella con gli
 * anni dentro — e sopra c'è la cartella di lavoro. Si prendono da lì e non da
 * quel che era configurato prima: chi apre un `.registro` con un doppio clic
 * sta dicendo *questo*, e un registro che aprisse l'anno giusto della cartella
 * sbagliata mostrerebbe le lezioni di uno e gli allegati di un altro.
 *
 * Torna vero se ha cambiato la cartella di lavoro, e allora chi chiama sa che
 * c'è da riavviare invece che da ricaricare.
 */
async function preparaDocumento (file: Uri): Promise<boolean> {
  const dati = Uri.joinPath(file, '..')
  const lavoro = Uri.joinPath(dati, '..')
  const dentro = percorso.basename(dati.fsPath)

  const impostazioni = getConfiguration('registroDocenti')
  const cambia =
    cartellaLavoro()?.fsPath !== lavoro.fsPath ||
    impostazioni.get<string>('cartellaDati', 'registro') !== dentro

  // L'indice prima di tutto: dice quale anno aprire, e va scritto anche quando
  // la cartella non cambia — è l'unico modo che ha una ricarica di sapere che
  // adesso si vuole quell'anno e non quello di prima.
  await segnaAnnoDaAprire(dati, nomeDelPacchetto(file))
  await impostazioni.update('cartellaDati', dentro)
  await impostaCartellaLavoro(lavoro)
  return cambia
}

/**
 * Apre un documento d'anno: la voce «Apri un anno…» del menu, e la strada che
 * fa anche il doppio clic sul file.
 *
 * Cambiando cartella di lavoro si riavvia, per la stessa ragione di
 * `cambiaCartellaLavoro`; restando nella stessa, basta una ricarica — che passa
 * dall'archivio già aperto, e quindi salva quel che c'era prima di cambiare
 * anno.
 */
async function usaDocumento (file: Uri): Promise<void> {
  const cambiata = await preparaDocumento(file)
  if (cambiata) {
    app.relaunch()
    app.quit()
    return
  }
  await executeCommand('registroDocenti.ricarica')
  apriRegistro()
}

/** Il dialogo di apertura, filtrato sui documenti del registro. */
async function chiediDocumento (): Promise<void> {
  const esito = await dialog.showOpenDialog({
    title: 'Apri un anno del registro',
    buttonLabel: 'Apri',
    properties: ['openFile'],
    defaultPath: cartellaLavoro()?.fsPath,
    filters: [
      { name: 'Registro docenti', extensions: [ESTENSIONE.slice(1)] },
      { name: 'Tutti i file', extensions: ['*'] },
    ],
  })
  const scelto = esito.canceled ? undefined : esito.filePaths[0]
  if (!scelto) return
  await usaDocumento(Uri.file(scelto))
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
