// Il main process: dove il registro vive.
//
// Non riscrive niente del registro. Prepara quel che l'estensione dà per
// esistente — il protocollo delle risorse, la cartella di lavoro, il contesto —
// e poi accende il registro. Lo spegnimento passa da `spegni`,
// che è dove si aspetta l'ultimo salvataggio.
//
// Com'è fatto `shell/`:
//
//   main.ts, preload.ts   i due punti d'ingresso, uno per processo
//   system/               il registro e il sistema operativo: dati del
//                         portabile, associazione dei `.registro`, il comando
//                         `regdoc`, la disinstallazione
//   protocol/             lo schema `registro://`, i tasselli della mappa, i
//                         permessi delle pagine
//   windows/              le finestre native: menu e impostazioni, benvenuto,
//                         lettore dei PDF
//   pages/                le pagine che quelle finestre caricano — dialog,
//                         settings, welcome, agenda — una cartella ciascuna
//                         con HTML, CSS e script; `shared/` ha il foglio e il
//                         ponte comuni. Escono in `dist/` (vedi `esbuild.mjs`)

// Per primo: sposta `userData` prima che qualunque altra riga lo usi.
import './system/portable.js'

import { app, BrowserWindow, dialog } from 'electron'
import { statSync } from 'node:fs'
import * as percorso from 'node:path'
import { pathToFileURL } from 'node:url'

import { executeCommand, registerCommand } from '../src/environment/commands.js'
import {
  cartellaLavoro,
  creaContesto,
  impostaCartellaLavoro,
  percorsoCaratteriPdf,
  percorsoIcona,
  percorsoIconaFinestra,
  percorsoWorkerPdf,
} from '../src/environment/context.js'
import { getConfiguration } from '../src/environment/settings.js'
import { avvisa, dichiaraIdentita, notificheDisponibili } from '../src/environment/notifications.js'
import {
  applicaAvvioConWindows,
  avviatoDalSistema,
  osservaAvvioConWindows,
} from '../src/environment/systemStartup.js'
import { avviaRicaricamento } from '../src/environment/dev.js'
import { applicaTema, osservaTema } from '../src/environment/theme.js'
import { Uri } from '../src/environment/uri.js'
import { vassoioAcceso } from '../src/environment/tray.js'
import { ESTENSIONE, èPacchetto } from '../src/data/package.js'
import { creaAnnoCorrente } from '../src/domain/factories.js'
import type { AnnoScolastico } from '../src/domain/models.js'
import { impostaCaratteri, impostaWorker } from '../src/data/pdf.js'
import {
  apriRegistro,
  avvia as avviaRegistro,
  chiudiDocumentoAperto,
  creaPrimoAnno,
  spegni,
} from '../src/startup.js'
import { PannelloProiezione } from '../src/panels/projection.js'
import { ascolta as ascoltaInterfaccia } from '../src/environment/windows.js'
import { chiudiBenvenuto, mostraBenvenuto } from './windows/welcome.js'
import { chiudiLettori, mostraDocumento } from './windows/reader.js'
import { annunciaAvvio, chiudiAvvio, chiudiAvvioQuandoAppare, mostraAvvio } from './windows/splash.js'
import { installaMenu } from './windows/menu.js'
import { registraFileDelProgramma } from './system/fileAssociation.js'
import { registraComandoRiga } from './system/commandLine.js'
import { regolaPermessi } from './protocol/permissions.js'
import { privilegiaSchema, registraProtocollo } from './protocol/fileProtocol.js'

// Su Windows un nome nudo — `reg`, `rundll32` — passato a CreateProcess, e
// quindi a libuv, si cerca prima nella cartella corrente e poi nel PATH. La
// cartella corrente è quella del doppio clic, cioè quella del `.registro`, che
// può essere una chiavetta o una cartella condivisa: un `reg.exe` messo lì
// girerebbe al posto di quello di sistema. Questa variabile toglie la cartella
// corrente dalla ricerca, per noi e per ogni processo figlio.
process.env.NoDefaultCurrentDirectoryInExePath = '1'

/**
 * Due copie sullo stesso registro si contraddicono appena una delle due salva:
 * la seconda istanza cede il posto alla prima e se ne va.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_evento, argomenti, cartella) => {
    // Si sta uscendo: riaprire adesso una finestra o un anno vorrebbe dire
    // riprendersi la serratura che `spegni` sta lasciando.
    if (inChiusura) return
    // Un doppio clic su un `.registro` mentre il registro è già aperto: la
    // seconda copia se ne va, ma prima consegna alla prima quale anno si
    // voleva. Senza, il doppio clic non farebbe niente e sembrerebbe rotto.
    // Gli argomenti relativi si leggono dalla cartella della *seconda* copia:
    // quella della prima, a quest'ora, è un'altra.
    const documento = documentoNegliArgomenti(argomenti, cartella)
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
    if (inChiusura) return
    void app.whenReady().then(() => usaDocumento(Uri.file(cammino)))
  })

  // Prima di `whenReady`, o la dichiarazione non conta più.
  privilegiaSchema()

  // Chi siamo per Windows, e va detto **prima di ogni finestra**.
  //
  // L'AppUserModelID non serve solo alle notifiche. È anche quel che la barra
  // delle applicazioni legge per decidere a quale programma appartiene un
  // pulsante: lo prende alla nascita della finestra, e dichiararlo dopo lascia
  // le finestre già aperte con l'identità di prima. Senza, il pulsante è di
  // «Electron» — con l'icona dell'atomo lanciando da sorgenti — e aggiungerlo
  // alla barra non lo lega al collegamento dell'installer, che quell'identità
  // ce l'ha: il registro appuntato si sdoppia, o non si riapre.
  //
  // Qui, e non dentro `avvia`: `open-file` e `second-instance` possono aprire
  // una finestra da soli, senza passare di là.
  dichiaraIdentita()
  raccontaLIcona()

  // Il `catch` è per quel che si rompe prima del `try` di `avvia`: senza,
  // l'errore spariva e il riquadro d'avvio restava sullo schermo per sempre.
  // Lì non è partito ancora niente da salvare, e si esce dicendolo.
  void app.whenReady().then(avvia).catch((errore: unknown) => {
    console.error('avvio interrotto:', errore)
    dialog.showErrorBox('Registro docenti', `L'avvio si è fermato: ${String(errore)}`)
    app.exit(1)
  })
}

/**
 * Che icona si è scelta, detto ad alta voce. Solo lanciando da sorgenti.
 *
 * L'icona è la cosa che va storta in silenzio: un file che non c'è, una radice
 * calcolata male, e la finestra nasce lo stesso — con l'atomo di Electron, che
 * è indistinguibile da «il codice dell'icona non funziona». Queste due righe
 * dicono quale file si è trovato e quale no, così la domanda «è il codice o è
 * Windows?» ha una risposta prima di cercarla.
 *
 * Nel pacchetto non stampa niente: là non c'è nessuno a leggere una console, e
 * l'icona la porta l'eseguibile.
 */
function raccontaLIcona (): void {
  if (app.isPackaged) return
  const perLaFinestra = percorsoIconaFinestra()
  const perLeNotifiche = percorsoIcona()
  console.log(`icona delle finestre: ${perLaFinestra ?? 'NESSUNA — le finestre nascono senza'}`)
  console.log(`icona delle notifiche: ${perLeNotifiche ?? 'NESSUNA'}`)
  console.log(`radice dell'app: ${app.getAppPath()}`)

  // Su macOS l'icona di `BrowserWindow` non conta: il Dock mostra quella del
  // pacchetto, che da sorgenti è l'atomo di Electron. Da installato la porta
  // il `.app`, e questa riga non serve.
  if (process.platform === 'darwin' && perLeNotifiche) {
    void app.whenReady().then(() => app.dock?.setIcon(perLeNotifiche))
  }
}

/**
 * Le iscrizioni del guscio: quelle che non nascono da `avvia` e che quindi
 * non stanno in `contesto.subscriptions`. Si chiudono all'uscita, insieme a
 * tutto il resto.
 */
const smaltibiliGuscio: Array<{ dispose (): unknown }> = []

async function avvia (): Promise<void> {
  registraFileDelProgramma()
  registraComandoRiga()
  registraProtocollo()

  // Che cosa le pagine possono chiedere al sistema — il microfono della
  // dettatura, gli appunti per «Copia» — e che cosa no. Prima di ogni finestra:
  // senza questa riga Electron concede tutto a chiunque, e il perché sta in
  // testa a `permissions.ts`.
  regolaPermessi()

  // L'uscita, registrata come comando perché è di là che la si invoca: il menu
  // del vassoio nasce dentro il registro, dove `app` non esiste e non deve
  // esistere. Passa da `quit` e non da `exit`, così l'ultimo salvataggio viene
  // aspettato come per ogni altra uscita — vedi `before-quit`, in fondo.
  registerCommand('registroDocenti.esci', () => app.quit())

  // Chiudere l'anno senza uscire dal registro: il documento torna libero e al
  // suo posto viene il benvenuto. Sta nel guscio perché è di qui che si
  // dimentica l'ultimo documento e si riapre quella finestra — `startup.ts` sa
  // dell'archivio e non delle finestre.
  registerCommand('registroDocenti.chiudiDocumento', () => chiudiDocumento())

  // Guardare un documento senza uscire dal registro: una finestra con dentro
  // il lettore di PDF di Chromium. Sta nel guscio perché apre una finestra, e
  // le finestre sono sue.
  registerCommand('registroDocenti.mostraDocumento', (percorso: string, titolo: string) => {
    mostraDocumento(Uri.file(percorso), titolo || 'Documento')
  })

  // Il tema prima di ogni finestra: `applicaTema` scrive `nativeTheme.themeSource`,
  // e da lì `prefers-color-scheme` risponde giusto in tutte le pagine. Messo
  // dopo, la prima finestra nascerebbe con il fondo dell'altro tema e
  // cambierebbe colore sotto gli occhi.
  applicaTema()
  smaltibiliGuscio.push(osservaTema())

  // Il riquadro d'avvio, appena c'è di che disegnarlo: il protocollo per la
  // pagina e il tema per i colori. Da qui alla prima finestra vera passano
  // secondi, e senza niente sullo schermo sembrano un clic andato a vuoto.
  //
  // Non nell'avvio silenzioso — all'accesso a Windows, o con il solo vassoio:
  // lì non arriva nessuna finestra, e un riquadro che compare e sparisce
  // mentre si sta facendo altro è solo un disturbo.
  // `aperturaAutomatica` spenta è la stessa cosa detta con un'altra casella:
  // il riquadro sparirebbe allo scadere dell'attesa, e quella chiusura faceva
  // scattare la nuvoletta «il registro resta accanto all'orologio» senza che
  // nessuno avesse chiuso niente.
  const conf = getConfiguration('registroDocenti')
  const silenzioso =
    avviatoDalSistema() ||
    conf.get<boolean>('avvio.soloVassoio', false) ||
    !conf.get<boolean>('aperturaAutomatica', true)
  // Il canale da cui il preload legge lo stato, prima di qualunque finestra
  // che lo carichi: vedi `ascolta`.
  ascoltaInterfaccia()
  if (!silenzioso) mostraAvvio()

  // L'accensione con il computer: la voce d'avvio di Windows si riscrive qui,
  // d'accordo con l'impostazione, e si tiene al passo se cambia.
  applicaAvvioConWindows()
  smaltibiliGuscio.push(osservaAvvioConWindows())

  // In sviluppo: le pagine si ricaricano da sole quando i bundle cambiano.
  // Nell'applicazione impacchettata queste righe non fanno niente.
  smaltibiliGuscio.push(avviaRicaricamento(() => PannelloProiezione.ricalcola()))

  // Da dove comincia tutto: un documento d'anno. Sulla riga di comando se si è
  // arrivati da un doppio clic su `2026-2027.registro`, quello di ieri se si è
  // aperta l'applicazione e basta, e altrimenti chiesto — aprirne uno o
  // crearne uno. Non c'è più nessuna «cartella di lavoro» da scegliere: è il
  // documento a dire dove si lavora, e la cartella si ricava da dove sta lui.
  let documento = documentoNegliArgomenti(process.argv, process.cwd()) ?? documentoRicordato()
  let daCreare: AnnoScolastico | null = null
  // Letti gli argomenti, la cartella corrente non serve più a niente e fa solo
  // danni: è quella del doppio clic, e Windows non lascia rinominare né
  // togliere una cartella che un processo tiene come corrente — la chiavetta
  // non si espelle, la cartella dell'anno non si sposta. Ed è il primo posto in
  // cui si cercherebbe un eseguibile chiamato per nome (vedi in testa al file).
  try {
    process.chdir(app.getPath('home'))
  } catch {
    // Resta dov'era: è il comportamento di prima.
  }
  if (!documento) {
    // Il benvenuto è già la risposta al clic: il riquadro gli lascia il posto
    // quando si mostra. Non prima: chiuso adesso, per un istante non ci sarebbe
    // nessuna finestra, e `window-all-closed` farebbe uscire l'applicazione.
    chiudiAvvioQuandoAppare()
    const scelta = await mostraBenvenuto({ scegliDocumento })
    // Nessun documento e nessuna voglia di farne uno: non c'è niente da
    // aprire, e una finestra vuota non sarebbe una risposta migliore.
    if (!scelta) {
      app.exit(0)
      return
    }
    // `altrove` non è una rinuncia, e il tipo lo dice a chiare lettere in
    // `welcome.ts`: un documento sta già arrivando da un'altra strada — un
    // doppio clic su un `.registro`, una voce dei recenti di Windows — e la
    // pagina si è chiusa perché la domanda ha già avuto risposta. Trattarla
    // come un «no grazie» faceva uscire l'applicazione proprio a chi aveva
    // appena chiesto di aprire un anno. Si prosegue senza documento: i comandi
    // si registrano lo stesso, e sarà `usaDocumento` ad aprirlo.
    if (scelta.tipo === 'apri') documento = scelta.documento
    else if (scelta.tipo === 'crea') daCreare = creaAnnoCorrente()
    // Il benvenuto se ne sta andando — `close` è asincrono — e fino al pannello
    // passano i secondi dell'apertura: il riquadro torna a fare da ponte. Non
    // solo per lo sguardo: senza nessuna finestra, `window-all-closed` faceva
    // uscire l'applicazione a metà avvio, proprio dopo aver scelto l'anno.
    mostraAvvio()
  }

  try {
    // Dove si lavora si dichiara prima di partire: il protocollo `registro://`
    // e la cartella dei modelli lo chiedono già durante l'avvio. Dentro il
    // `try`: un `impostazioni.json` bloccato da OneDrive lasciava il riquadro a
    // dire «Avvio del registro…» per sempre.
    if (documento) await preparaDocumento(documento)
    const contesto = creaContesto()
    annunciaAvvio(documento ? `Apro l’anno ${nomeDelDocumento(documento)}…` : 'Preparo il registro…')
    await avviaRegistro(contesto, documento, annunciaAvvio)
    // Da qui in poi `registroDocenti.*` esiste: chi aspettava può chiamare.
    dichiaraPronto()
    // `avvia` dichiara il worker di pdfjs con un `joinPath` su `dist/`, che
    // in sviluppo è giusto e nel pacchetto no: là quel file sta fuori
    // dall'archivio asar. Si ridichiara subito dopo — è `avvia` a scriverlo
    // per ultimo — e comunque prima che un PDF venga aperto, perché lo
    // smistatore aspetta che un file smetta di crescere prima di leggerlo.
    impostaWorker(pathToFileURL(percorsoWorkerPdf()).href)
    impostaCaratteri(percorsoCaratteriPdf())
    // Dopo `avvia`, che è dove i comandi si registrano: il menu li invoca
    // per nome, e una voce che non trovasse il proprio comando non farebbe
    // niente senza dirlo.
    installaMenu({
      apriDocumento: (percorso?: string) =>
        percorso ? usaDocumento(Uri.file(percorso)) : chiediDocumento(),
    })
    // Il documento nuovo nasce qui e non prima: crearlo vuol dire passare per
    // l'archivio, che prima di `avviaRegistro` non esiste ancora. Chiede dove
    // salvarlo con il «salva con nome» di sistema, che non è una finestra del
    // registro: il riquadro resta e dice che cosa si aspetta. Chiuderlo qui
    // non vedeva arrivare nessuna finestra, e allo scadere dell'attesa se ne
    // andava a dialogo aperto — zero finestre, e l'applicazione usciva mentre
    // si sceglieva la cartella. Se si annulla, lascia il posto al benvenuto
    // (`senzaDocumento`); se si conferma, al pannello, qui sotto nel `finally`.
    if (daCreare) {
      annunciaAvvio('Scegli dove salvare l’anno nuovo…')
      await creaAnnoNuovo(daCreare)
    }
  } catch (errore) {
    // Le parti che mancano si annunciano da sé, con dentro il numero della
    // fase: si mostrano invece di lasciare una finestra che non arriva. Il
    // riquadro va via prima: resterebbe dietro al messaggio a dire «Preparo le
    // finestre…» per una cosa che si è appena fermata.
    const testo = errore instanceof Error ? errore.message : String(errore)
    console.error('avvio interrotto:', errore)
    chiudiAvvio()
    dialog.showErrorBox('Registro docenti', `L'avvio si è fermato: ${testo}`)
  } finally {
    // Anche se l'avvio si è fermato: chi aspetta i comandi deve smettere di
    // aspettare. Senza, un doppio clic arrivato in quel momento resterebbe
    // appeso per sempre invece di dire che il comando non c'è. Scioglierla
    // due volte non fa niente.
    dichiaraPronto()
    chiudiAvvioQuandoAppare()
  }
}

/** `2026-2027` da `…/2026-2027.registro`: il nome con cui il docente conosce l'anno. */
function nomeDelDocumento (file: Uri): string {
  return percorso.basename(file.fsPath, percorso.extname(file.fsPath))
}

/** La chiave delle impostazioni in cui si ricorda l'ultimo documento aperto. */
const CHIAVE_ULTIMO = 'ultimoDocumento'

/**
 * L'ultimo documento aperto qui, se sul disco c'è ancora.
 *
 * Non lo sceglie nessuno: è quello che si stava usando quando si è chiuso, e
 * riaprirlo è quel che ci si aspetta da un'applicazione che lavora su
 * documenti. Guardare che esista non è pedanteria — una chiavetta tolta, una
 * cartella sincronizzata sparita — e la differenza fra «c'è» e «non c'è più»
 * è fra partire e chiedere da dove ricominciare.
 */
function documentoRicordato (): Uri | null {
  const scritto = getConfiguration('registroDocenti').get<string>(CHIAVE_ULTIMO, '')
  if (!scritto) return null
  try {
    return statSync(scritto).isFile() ? Uri.file(scritto) : null
  } catch {
    return null
  }
}

/**
 * Un anno nuovo, dal benvenuto: si crea, e si ricorda dov'è finito.
 *
 * Il documento nasce dove dice il dialogo «salva con nome», che può essere
 * ovunque: senza `preparaDocumento` il prossimo avvio riaprirebbe quello di
 * prima, e il protocollo `registro://` leggerebbe da un'altra cartella. Se non
 * è nato niente — dialogo annullato — si torna al benvenuto, che è da dove si
 * era partiti.
 */
async function creaAnnoNuovo (anno: AnnoScolastico): Promise<void> {
  const nato = await creaPrimoAnno(anno.inizio, anno.fine)
  if (nato) {
    await preparaDocumento(Uri.file(nato))
    return
  }
  await senzaDocumento()
}

/**
 * Il registro senza un anno aperto: il benvenuto, e quel che se ne ricava.
 *
 * Ci si arriva da due parti — la chiusura del documento, e un anno nuovo che
 * poi non si è creato — e in tutte e due il registro è già acceso: qui non si
 * parte da capo, si apre quel che si è scelto.
 *
 * Rinunciare non chiude l'applicazione se resta qualcosa da premere per
 * riaverla: con l'icona accanto all'orologio o il widget sul desktop, un
 * registro senza anno è uno stato legittimo — quello di chi ha chiuso il
 * documento per lasciarlo salire su OneDrive. Senza, un'applicazione viva e
 * invisibile non si riprenderebbe più, e allora si esce.
 */
async function senzaDocumento (): Promise<void> {
  // Dall'avvio, con un anno nuovo annullato, il riquadro è ancora lì: lascia il
  // posto al benvenuto quando si mostra. Da un documento chiuso non c'è, e
  // questa riga non fa niente.
  chiudiAvvioQuandoAppare()
  const scelta = await mostraBenvenuto({ scegliDocumento })
  if (!scelta || scelta.tipo === 'altrove') {
    if (!vassoioAcceso() && BrowserWindow.getAllWindows().length === 0) app.quit()
    return
  }
  if (scelta.tipo === 'apri') {
    await usaDocumento(scelta.documento)
    return
  }
  await creaAnnoNuovo(creaAnnoCorrente())
}

/**
 * Chiude l'anno aperto: il documento torna libero, e al suo posto il benvenuto.
 *
 * Il ricordo dell'ultimo documento si cancella, ed è il punto: chi chiude non
 * vuole ritrovarselo aperto al prossimo avvio — se lo volesse, non l'avrebbe
 * chiuso. Fra i recenti però resta, e riaprirlo è un clic.
 */
async function chiudiDocumento (): Promise<void> {
  // I lettori aperti mostrano i PDF di quest'anno: le loro copie non valgono
  // più, come quando se ne apre un altro.
  chiudiLettori()
  await chiudiDocumentoAperto()
  await getConfiguration('registroDocenti').update(CHIAVE_ULTIMO, undefined)
  await senzaDocumento()
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
function documentoNegliArgomenti (argomenti: string[], cartella: string): Uri | null {
  for (const argomento of argomenti.slice(1)) {
    if (argomento.startsWith('-')) continue
    if (!èPacchetto(percorso.basename(argomento))) continue
    try {
      // Rispetto alla cartella di chi ha lanciato, detta esplicitamente: per la
      // seconda istanza non è la nostra, e dopo l'avvio la nostra è `home`.
      const intero = percorso.resolve(cartella, argomento)
      if (statSync(intero).isFile()) return Uri.file(intero)
    } catch {
      // Un argomento che non è un file: non è quello che si cercava.
    }
  }
  return null
}

/**
 * Ricorda un documento e dichiara dove si lavora.
 *
 * Qui prima si scriveva un indice che diceva *quale anno* aprire e due
 * impostazioni che dicevano *in quale cartella* cercarlo: il documento veniva
 * poi ritrovato per nome, e il file scelto e il file aperto erano legati solo
 * dal chiamarsi uguale. Adesso l'Uri si consegna intero a chi apre, e qui
 * resta il solo ricordo — per riaprirlo al prossimo avvio.
 *
 * La cartella di lavoro è quella che contiene il documento, e serve a due
 * cose che non passano dall'archivio: le radici da cui il protocollo
 * `registro://` può leggere, e la cartella dei modelli di stampa.
 */
async function preparaDocumento (file: Uri): Promise<void> {
  const impostazioni = getConfiguration('registroDocenti')
  await impostazioni.update(CHIAVE_ULTIMO, file.fsPath)
  await impostaCartellaLavoro(Uri.joinPath(file, '..'))
}

/**
 * Apre un documento d'anno: la voce «Apri…» del menu, una voce dei recenti, e
 * la strada che fa anche il doppio clic sul file.
 *
 * Nessun riavvio, mai. Prima un documento in un'altra cartella ne imponeva uno
 * — l'archivio cercava i dati dentro una cartella configurata, e cambiarla
 * voleva dire rifare tutto da capo — e riavviare per aprire un file è una cosa
 * che nessun'altra applicazione a documenti fa. Adesso all'archivio si consegna
 * l'Uri e quello apre: la cartella non è più un presupposto.
 *
 * Il salvataggio di quel che c'era prima non si perde: `Archivio.apri` scrive
 * quel che è in attesa prima di lasciare il documento vecchio.
 */
async function usaDocumento (file: Uri): Promise<void> {
  if (inChiusura) return
  // Il benvenuto, se c'era: un documento è arrivato — dal doppio clic, dai
  // recenti di Windows, dalla sua stessa lista — e la domanda «quale anno?» ha
  // avuto risposta.
  chiudiBenvenuto()
  // E si aspetta che i comandi esistano. Chiudere il benvenuto fa ripartire
  // `avvia`, ma la sua continuazione è in coda: senza questa attesa
  // `registroDocenti.usaDocumento` arriverebbe prima di essere registrato, e
  // `executeCommand` lo direbbe alla console e tornerebbe — l'anno non si
  // aprirebbe, senza che niente lo dica a chi ha fatto doppio clic.
  if (!(await entroIlTetto(prontoPerIComandi, TETTO_PRONTO_MS))) {
    console.error(`comandi non pronti dopo ${TETTO_PRONTO_MS / 1000} s: ${file.fsPath} non aperto`)
    return
  }
  if (inChiusura) return
  // I lettori aperti parlano dei documenti dell'anno che si sta lasciando: le
  // loro copie non valgono più, e una finestra che mostra la scheda di un'altra
  // classe è peggio di una finestra chiusa.
  chiudiLettori()
  await preparaDocumento(file)
  await executeCommand('registroDocenti.usaDocumento', file.fsPath)
  apriRegistro()
}

/**
 * Si scioglie quando `registroDocenti.*` è registrato.
 *
 * Serve a `usaDocumento`, che può partire da un doppio clic prima che l'avvio
 * sia arrivato a registrare i comandi. Il `finally` di `avvia` la scioglie
 * anche quando l'avvio fallisce; chi aspetta ha comunque un tetto,
 * `TETTO_PRONTO_MS`, per il caso in cui l'avvio si fermi prima di arrivarci —
 * un'attesa che non torna — e il doppio clic resterebbe appeso per sempre.
 */
let dichiaraPronto: () => void = () => undefined
const prontoPerIComandi = new Promise<void>((sciogli) => {
  dichiaraPronto = sciogli
})

/** Quanto un documento arrivato presto aspetta che i comandi esistano. */
const TETTO_PRONTO_MS = 30_000

/** Vero se `promessa` si scioglie entro `ms`, falso se il tempo scade prima. */
async function entroIlTetto (promessa: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const scadenza = new Promise<boolean>((risolvi) => {
    timer = setTimeout(() => risolvi(false), ms)
  })
  try {
    return await Promise.race([promessa.then(() => true), scadenza])
  } finally {
    clearTimeout(timer)
  }
}

/** Il dialogo di apertura, filtrato sui documenti del registro. */
async function scegliDocumento (): Promise<Uri | null> {
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
  return scelto ? Uri.file(scelto) : null
}

/** La voce «Apri…» del menu: si sceglie, e si va. */
async function chiediDocumento (): Promise<void> {
  const scelto = await scegliDocumento()
  if (scelto) await usaDocumento(scelto)
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
 *
 * L'attesa ha un tetto. Una scrittura che non torna — un file tenuto da
 * OneDrive o dall'antivirus — lasciava il processo vivo senza finestre e senza
 * icona, e con in mano il lucchetto dell'istanza unica: ogni lancio successivo
 * finiva in `second-instance` e non faceva niente. Allo scadere si esce lo
 * stesso: quel che non si è scritto in venti secondi non si scriverà dopo.
 */
let inChiusura = false
const TETTO_SPEGNIMENTO_MS = 20_000
app.on('before-quit', (evento) => {
  if (inChiusura) return
  evento.preventDefault()
  inChiusura = true
  while (smaltibiliGuscio.length > 0) smaltibiliGuscio.pop()?.dispose()
  // Niente `unref`: il timer deve scattare proprio quando nient'altro lo farebbe.
  const guardia = setTimeout(() => {
    console.error(`spegnimento oltre ${TETTO_SPEGNIMENTO_MS / 1000} s: esco senza aspettare`)
    app.exit(0)
  }, TETTO_SPEGNIMENTO_MS)
  void spegni()
    .catch((errore: unknown) => console.error('errore nell’ultimo salvataggio', errore))
    .finally(() => {
      clearTimeout(guardia)
      app.exit(0)
    })
})

/**
 * L'arresto e la disconnessione di Windows.
 *
 * `before-quit` lì non scatta — lo dice la documentazione di Electron — e
 * senza queste righe `spegni` non girava: la serratura restava accanto al
 * `.registro` («l'anno risulta già aperto» sul PC di casa), e si perdevano il
 * salvataggio ritardato, un PDF a metà, una pagina di OCR. Windows chiede
 * prima a ogni finestra se si può chiudere la sessione (`query-session-end`):
 * si dice di no quanto basta a uscire nel modo solito, che passa da
 * `before-quit` e dal suo tetto. Nel frattempo Windows mostra «Registro docenti
 * impedisce l'arresto», e la scritta sparisce appena il processo è uscito.
 *
 * `session-end` è l'ultima rete: arriva quando la sessione finisce comunque —
 * chi ha premuto «Arresta comunque» — e da lì non si torna indietro. Si avvia
 * l'uscita e si spera che basti.
 *
 * Tutti e due arrivano solo alle `BrowserWindow`. Con il registro messo via nel
 * vassoio, e senza il widget sul desktop, di finestre non ce n'è nessuna: lì
 * l'arresto di Windows passa ancora senza che `spegni` giri.
 */
app.on('browser-window-created', (_evento, finestra) => {
  finestra.on('query-session-end', (evento) => {
    if (inChiusura) return
    evento.preventDefault()
    app.quit()
  })
  finestra.on('session-end', () => {
    if (!inChiusura) app.quit()
  })
})
