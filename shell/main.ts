// Il main process: prepara quel che il registro dà per esistente — protocollo
// delle risorse, cartella di lavoro, contesto — e poi lo accende. Lo
// spegnimento passa da `spegni`, che aspetta l'ultimo salvataggio.
//
//   main.ts, preload.ts   i due punti d'ingresso, uno per processo
//   system/               il sistema operativo: portabile, associazione dei
//                         `.regi`, comando `regi`, disinstallazione, nome precedente
//   protocol/             lo schema `registro://`, i tasselli della mappa, i
//                         permessi delle pagine
//   windows/              le finestre native: menu, benvenuto, lettore dei PDF
//   pages/                le pagine di quelle finestre, una cartella ciascuna;
//                         `shared/` ha il foglio e il ponte comuni (vedi `esbuild.mjs`)

// Per primi, in quest'ordine: fissano `userData` prima che qualunque altra riga lo usi.
import './system/portable.js'
import './system/userData.js'

import { app, BrowserWindow, dialog } from 'electron'
import { statSync } from 'node:fs'
import * as percorso from 'node:path'
import { pathToFileURL } from 'node:url'

import { executeCommand, registerCommand } from '../src/environment/commands.js'
import {
  creaContesto,
  impostaCartellaLavoro,
  percorsoCaratteriPdf,
  percorsoIcona,
  percorsoIconaFinestra,
  percorsoWorkerPdf,
} from '../src/environment/context.js'
import { getConfiguration, ritiraChiaviDismesse } from '../src/environment/settings.js'
import { showErrorMessage } from '../src/environment/dialogs.js'
import { avvisa, dichiaraIdentita, notificheDisponibili } from '../src/environment/notifications.js'
import {
  applicaAvvioConWindows,
  avviatoDalSistema,
  osservaAvvioConWindows,
} from '../src/environment/systemStartup.js'
import { avviaRicaricamento } from '../src/environment/dev.js'
import { applicaTema, osservaTema } from '../src/environment/theme.js'
import { applicaLingua, osservaLingua, rispondiLingua } from '../src/environment/language.js'
import { Uri } from '../src/environment/uri.js'
import { vassoioAcceso } from '../src/environment/tray.js'
import { alCambioAggiornamenti, avviaAggiornamenti, installaAllUscita } from '../src/environment/updates.js'
import { aggiornamentoInCorso, concludiAggiornamento } from '../src/environment/updateInstaller.js'
import { ESTENSIONE, èPacchetto } from '../src/data/package.js'
import { impostaCaratteri, impostaWorker } from '../src/data/pdf.js'
import { èProvvisorio, percorsoPacchetto } from '../src/data/paths.js'
import {
  apriRegistro,
  avvia as avviaRegistro,
  chiudiDocumentoAperto,
  chiediAnnoNuovo,
  creaPrimoAnno,
  spegni,
} from '../src/startup.js'
import { PannelloProiezione } from '../src/panels/projection.js'
import { ascolta as ascoltaInterfaccia } from '../src/environment/windows.js'
import { chiudiBenvenuto, mettiDavantiBenvenuto, mostraBenvenuto } from './windows/welcome.js'
import { chiudiLettori, mostraDocumento } from './windows/reader.js'
import { annunciaAvvio, chiudiAvvio, chiudiAvvioQuandoAppare, mostraAvvio } from './windows/splash.js'
import { installaMenu } from './windows/menu.js'
import { disinstalla } from './system/uninstall.js'
import { allaRichiestaDelBenvenuto, quandoNonRestanoFinestre } from './lifecycle.js'
import { registraFileDelProgramma } from './system/fileAssociation.js'
import { registraComandoRiga } from './system/commandLine.js'
import { ripulisciIdentitaVecchia } from './system/formerIdentity.js'
import { regolaPermessi } from './protocol/permissions.js'
import { privilegiaSchema, registraProtocollo } from './protocol/fileProtocol.js'
import { parole } from '../src/domain/words.testi.js'
import { testi } from './main.testi.js'

// Su Windows un nome nudo (`reg`, `rundll32`) si cerca prima nella cartella
// corrente, che è quella del `.regi` aperto con doppio clic: un `reg.exe` messo
// lì girerebbe al posto di quello di sistema. Vale anche per i processi figli.
process.env.NoDefaultCurrentDirectoryInExePath = '1'

/** Istanza unica: due copie sullo stesso registro si contraddicono al primo salvataggio. */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_evento, argomenti, cartella) => {
    // In uscita: riaprire vorrebbe dire riprendersi la serratura che `spegni` lascia.
    if (inChiusura) return
    // Doppio clic su un `.regi` a registro aperto: la seconda copia consegna il
    // documento alla prima. Gli argomenti relativi valgono rispetto alla
    // cartella della seconda copia.
    const documento = documentoNegliArgomenti(argomenti, cartella)
    if (documento) {
      apriDaFuori(documento)
      return
    }
    const prima = BrowserWindow.getAllWindows()[0]
    // Nessuna finestra è lo stato normale con il vassoio acceso: si riapre il registro.
    if (!prima) {
      apriRegistro()
      return
    }
    if (prima.isMinimized()) prima.restore()
    prima.focus()
  })

  // Su macOS il documento arriva di qui e non dalla riga di comando, anche prima
  // che l'applicazione sia pronta.
  app.on('open-file', (evento, cammino) => {
    evento.preventDefault()
    if (inChiusura) return
    void app.whenReady().then(() => apriDaFuori(Uri.file(cammino)))
  })

  // Prima di `whenReady`, o la dichiarazione non conta più.
  privilegiaSchema()

  // L'AppUserModelID prima di ogni finestra: la barra delle applicazioni lo
  // legge alla nascita della finestra per legarla al collegamento. Qui e non in
  // `avvia` perché `open-file` e `second-instance` possono aprire finestre da soli.
  dichiaraIdentita()
  raccontaLIcona()

  // Per quel che si rompe prima del `try` di `avvia`: senza, il riquadro
  // d'avvio resterebbe sullo schermo per sempre.
  void app.whenReady().then(avvia).catch((errore: unknown) => {
    console.error('avvio interrotto:', errore)
    // testo-fisso: il marchio non si traduce
    dialog.showErrorBox('Regiclass', testi().avvioFermato(String(errore)))
    app.exit(1)
  })
}

/**
 * Da sorgenti stampa quale icona si è trovata: un file mancante dà l'atomo di
 * Electron senza nessun errore. Nel pacchetto l'icona la porta l'eseguibile.
 */
function raccontaLIcona (): void {
  if (app.isPackaged) return
  const perLaFinestra = percorsoIconaFinestra()
  const perLeNotifiche = percorsoIcona()
  console.log(`icona delle finestre: ${perLaFinestra ?? 'NESSUNA — le finestre nascono senza'}`)
  console.log(`icona delle notifiche: ${perLeNotifiche ?? 'NESSUNA'}`)
  console.log(`radice dell'app: ${app.getAppPath()}`)

  // Su macOS il Dock mostra l'icona del pacchetto, non quella di `BrowserWindow`.
  if (process.platform === 'darwin' && perLeNotifiche) {
    void app.whenReady().then(() => app.dock?.setIcon(perLeNotifiche))
  }
}

/** Le iscrizioni del guscio, fuori da `contesto.subscriptions`: si chiudono all'uscita. */
const smaltibiliGuscio: Array<{ dispose (): unknown }> = []

async function avvia (): Promise<void> {
  // Riaperto mentre un aggiornamento sostituisce i file: la finestra
  // dell'aggiornamento lo riaprirà alla fine. Si esce prima di scrivere qualunque cosa.
  if (aggiornamentoInCorso()) {
    app.exit(0)
    return
  }

  // La lingua prima di ciò che scrive parole fuori dal registro: la descrizione
  // dei `.regi` e il ponte di `regi`.
  applicaLingua()

  registraFileDelProgramma()
  // Dopo la pulizia del nome precedente, che riscrive anch'essa il PATH e toglie
  // la voce d'avvio automatico con l'identità vecchia.
  void ripulisciIdentitaVecchia().then(() => {
    registraComandoRiga()
    applicaAvvioConWindows()
  })
  registraProtocollo()

  // Prima di ogni finestra: senza, Electron concede ogni permesso (vedi `permissions.ts`).
  regolaPermessi()

  // Comando e non chiamata diretta: il menu del vassoio vive nel registro, dove
  // `app` non esiste. `quit` e non `exit`, così `before-quit` aspetta l'ultimo salvataggio.
  registerCommand('registroDocenti.esci', () => app.quit())

  // Chiude l'anno e mostra il benvenuto; qui perché le finestre sono del guscio.
  registerCommand('registroDocenti.chiudiDocumento', () => chiudiDocumento())

  // Dal menu del vassoio, che non conosce le finestre. Chi decide è
  // `allaRichiestaDelBenvenuto` in `lifecycle.ts`: il menu del vassoio è una
  // fotografia e non sa che un anno può essere appena stato scelto.
  registerCommand('registroDocenti.benvenuto', () => {
    if (mettiDavantiBenvenuto()) return
    const risposta = allaRichiestaDelBenvenuto({
      aperturaInCorso: apertureInCorso > 0,
      documentoAperto: percorsoPacchetto() !== null,
    })
    if (risposta === 'registro') apriRegistro()
    else if (risposta === 'benvenuto') void senzaDocumento()
  })
  registerCommand('registroDocenti.creaAnnoNuovo', () => {
    // Senza un anno aperto il riquadro d'avvio fa da ponte fino al pannello; con
    // un anno aperto il pannello c'è già.
    const ponte = percorsoPacchetto() === null
    if (ponte) {
      annunciaAvvio(testi().creoAnnoNuovo)
      mostraAvvio()
    }
    // Il benvenuto aperto si chiude come «altrove»: la domanda ha già risposta.
    chiudiBenvenuto()
    void creaAnnoNuovo().finally(() => {
      if (ponte) chiudiAvvioQuandoAppare()
    })
  })

  // Un anno salvato con nome ha cambiato posto: il prossimo avvio lo riapre di là.
  registerCommand('registroDocenti.ricordaDocumento', (percorsoFile: string) =>
    preparaDocumento(Uri.file(percorsoFile)),
  )

  // Un PDF in una finestra con il lettore di Chromium.
  registerCommand('registroDocenti.mostraDocumento', (percorso: string, titolo: string) => {
    mostraDocumento(Uri.file(percorso), titolo || testi().documento)
  })

  // Il tema prima di ogni finestra, o la prima nascerebbe col fondo dell'altro tema.
  applicaTema()
  smaltibiliGuscio.push(osservaTema())

  // Le pagine chiedono la lingua al preload quando nascono. Al cambio le finestre
  // si rifanno e lo schermo della classe si ricalcola.
  rispondiLingua()
  smaltibiliGuscio.push(osservaLingua(() => PannelloProiezione.ricalcola()))

  // Prima di leggere qualunque cosa: le chiavi tolte dal manifesto escono dal file.
  ritiraChiaviDismesse()
  const conf = getConfiguration('registroDocenti')
  const silenzioso = avviatoDalSistema() || conf.get<boolean>('avvio.soloVassoio', false)
  // Il canale da cui il preload legge lo stato, prima di ogni finestra che lo carichi.
  ascoltaInterfaccia()
  // Il riquadro d'avvio copre i secondi fino alla prima finestra; non nell'avvio
  // silenzioso, dove nessuna finestra arriva.
  if (!silenzioso) mostraAvvio()

  // Un aggiornamento appena finito: la sua finestra aspetta questo segnale per
  // lasciare il posto al riquadro d'avvio. L'esito si notifica qui.
  const aggiornamento = concludiAggiornamento()
  if (aggiornamento?.esito === 'riuscito') {
    avvisa({
      titolo: testi().aggiornatoAlla(aggiornamento.segno.a),
      corpo: testi().noteDellaRelease,
    })
  } else if (aggiornamento?.esito === 'fallito' && !aggiornamento.detto) {
    avvisa({
      titolo: testi().aggiornamentoFallito,
      corpo: testi().giraAncora(aggiornamento.segno.da),
    })
  }

  // La voce d'avvio di Windows segue l'impostazione.
  applicaAvvioConWindows()
  smaltibiliGuscio.push(osservaAvvioConWindows())

  // Gli aggiornamenti valgono anche senza documento aperto, quindi stanno qui e
  // non in `startup.ts`. Una versione scaricata si notifica: il pannello
  // potrebbe non esserci.
  smaltibiliGuscio.push(avviaAggiornamenti())
  let annunciata = ''
  smaltibiliGuscio.push(
    alCambioAggiornamenti((stato) => {
      if (stato.fase !== 'pronto' || !stato.nuova || annunciata === stato.nuova.versione) return
      annunciata = stato.nuova.versione
      // La frase la scrive `environment/updates.ts`, uguale ovunque.
      avvisa({
        titolo: testi().versionePronta(stato.nuova.versione),
        corpo: stato.racconto.frase,
      })
    }),
  )

  // In sviluppo le pagine si ricaricano quando i bundle cambiano; nel pacchetto non fa niente.
  smaltibiliGuscio.push(avviaRicaricamento(() => PannelloProiezione.ricalcola()))

  // Il documento d'anno: dalla riga di comando, poi l'ultimo aperto, altrimenti
  // lo si chiede. La cartella di lavoro si ricava dal documento.
  let documento = documentoNegliArgomenti(process.argv, process.cwd()) ?? documentoRicordato()
  let daCreare = false
  // Letti gli argomenti, la cartella corrente fa solo danni: Windows non lascia
  // togliere né rinominare una cartella tenuta come corrente (la chiavetta non si
  // espelle), ed è dove si cercherebbero gli eseguibili chiamati per nome.
  try {
    process.chdir(app.getPath('home'))
  } catch {
    // Resta dov'era.
  }
  if (!documento) {
    // Il riquadro lascia il posto al benvenuto quando questo si mostra: chiuso
    // prima, `window-all-closed` farebbe uscire l'applicazione.
    chiudiAvvioQuandoAppare()
    const scelta = await mostraBenvenuto(azioniBenvenuto)
    if (!scelta) {
      app.exit(0)
      return
    }
    // `altrove` non è una rinuncia: un documento sta arrivando da un'altra
    // strada (doppio clic, recenti di Windows) e lo aprirà `usaDocumento`.
    if (scelta.tipo === 'apri') documento = scelta.documento
    else if (scelta.tipo === 'crea') daCreare = true
    // Il benvenuto si sta chiudendo: il riquadro fa da ponte fino al pannello,
    // così `window-all-closed` non trova zero finestre.
    mostraAvvio()
  }

  // L'anno aperto all'avvio è un'apertura come le altre; un anno da creare lo
  // gestisce `creaAnnoNuovo` da sé.
  const fineApertura = documento ? iniziaApertura() : () => undefined
  // Vero se il documento da aprire non si è aperto (sparito, illeggibile, più
  // recente, serratura annullata): si torna al benvenuto, l'errore l'ha già detto l'archivio.
  let alBenvenuto = false
  // Nell'avvio silenzioso con l'icona accesa non si apre niente da sé.
  const benvenutoDopo = () => alBenvenuto && !(silenzioso && vassoioAcceso())
  try {
    // Prima di partire, e dentro il `try`: protocollo e modelli la chiedono
    // durante l'avvio, e un `impostazioni.json` bloccato non deve fermare il riquadro.
    if (documento) await preparaDocumento(documento)
    const contesto = creaContesto()
    annunciaAvvio(
      documento ? testi().aproAnno(nomeDelDocumento(documento)) : testi().preparoRegistro,
    )
    await avviaRegistro(contesto, documento, annunciaAvvio)
    alBenvenuto = documento !== null && percorsoPacchetto() === null
    // Da qui `registroDocenti.*` esiste.
    dichiaraPronto()
    // `avvia` dichiara il worker di pdfjs dentro `dist/`, che nel pacchetto sta
    // nell'asar: si ridichiara fuori, prima che si apra un PDF.
    impostaWorker(pathToFileURL(percorsoWorkerPdf()).href)
    impostaCaratteri(percorsoCaratteriPdf())
    // Dopo `avvia`, che registra i comandi invocati dal menu. Il percorso si fa
    // assoluto: `Uri.file` di un relativo lo appende alla radice del disco.
    installaMenu({
      apriDocumento: (cammino?: string) =>
        cammino ? usaDocumento(Uri.file(percorso.resolve(cammino))) : chiediDocumento(),
      disinstalla,
    })
    // Crearlo richiede l'archivio, che esiste solo dopo `avviaRegistro`. Nasce in
    // una cartella provvisoria; posto e nome si scelgono al «salva con nome»
    // (vedi `data/paths.ts`).
    if (daCreare) {
      annunciaAvvio(testi().creoAnnoNuovo)
      await creaAnnoNuovo()
    }
  } catch (errore) {
    // Il riquadro va via prima del messaggio, o resterebbe dietro a dire «Preparo le finestre…».
    const testo = errore instanceof Error ? errore.message : String(errore)
    console.error('avvio interrotto:', errore)
    chiudiAvvio()
    // testo-fisso: il marchio non si traduce
    dialog.showErrorBox('Regiclass', testi().avvioFermato(testo))
  } finally {
    // Anche se l'avvio si è fermato, chi aspetta i comandi smette di aspettare.
    // Scioglierla due volte non fa niente.
    dichiaraPronto()
    // Se si va al benvenuto non si ricontrolla: fra qui e la sua finestra nessuno
    // deve decidere che non restano finestre.
    fineApertura(!benvenutoDopo())
    chiudiAvvioQuandoAppare()
  }
  if (alBenvenuto) {
    // Dimenticato, o al prossimo avvio si ripeterebbe l'errore. Fra i recenti resta.
    await getConfiguration('registroDocenti').update(CHIAVE_ULTIMO, undefined)
    if (benvenutoDopo()) await senzaDocumento()
  }
}

/** `2026-2027` da `…/2026-2027.regi`: il nome con cui il docente conosce l'anno. */
function nomeDelDocumento (file: Uri): string {
  return percorso.basename(file.fsPath, percorso.extname(file.fsPath))
}

/** La chiave delle impostazioni in cui si ricorda l'ultimo documento aperto. */
const CHIAVE_ULTIMO = 'ultimoDocumento'

/**
 * L'ultimo documento aperto, se esiste ancora sul disco (chiavetta tolta,
 * cartella sparita). Un percorso che non termina in `.regi` si dimentica.
 */
function documentoRicordato (): Uri | null {
  const scritto = getConfiguration('registroDocenti').get<string>(CHIAVE_ULTIMO, '')
  if (!scritto) return null
  if (!èPacchetto(percorso.basename(scritto))) {
    void getConfiguration('registroDocenti').update(CHIAVE_ULTIMO, undefined)
    return null
  }
  try {
    return statSync(scritto).isFile() ? Uri.file(scritto) : null
  } catch {
    return null
  }
}

/**
 * Crea un anno nuovo e ricorda dov'è, così il prossimo avvio e `registro://`
 * puntano a lui. Se non nasce si torna al benvenuto.
 */
async function creaAnnoNuovo (): Promise<void> {
  const fine = iniziaApertura()
  // Vero solo se l'anno non è nato: il benvenuto è una finestra e non serve
  // ricontrollare. Dopo un errore sì.
  let alBenvenuto = false
  try {
    // Dentro l'apertura, perché fra la scelta e il pannello l'applicazione non
    // esca da sola; «Annulla» torna al benvenuto.
    const anno = await chiediAnnoNuovo()
    const nato = anno ? await creaPrimoAnno(anno) : null
    if (!nato) {
      alBenvenuto = true
    } else {
      await preparaDocumento(Uri.file(nato))
      // Un benvenuto aperto nel frattempo non ha più niente da chiedere.
      chiudiBenvenuto()
    }
  } finally {
    fine(!alBenvenuto)
  }
  if (alBenvenuto) await senzaDocumento()
}

/**
 * Il registro acceso senza un anno aperto: il benvenuto, e quel che si sceglie.
 * Rinunciare esce solo se non resta l'icona del vassoio per riprenderlo.
 */
async function senzaDocumento (): Promise<void> {
  // Dall'avvio il riquadro c'è ancora e lascia il posto al benvenuto; altrimenti non fa niente.
  chiudiAvvioQuandoAppare()
  const scelta = await mostraBenvenuto(azioniBenvenuto)
  if (!scelta || scelta.tipo === 'altrove') {
    if (!vassoioAcceso() && BrowserWindow.getAllWindows().length === 0) app.quit()
    return
  }
  // Il riquadro fa da ponte fino al pannello, o `window-all-closed` uscirebbe
  // appena chiuso il benvenuto. Se l'apertura dura di più, tiene in vita il
  // registro `apertureInCorso`.
  annunciaAvvio(
    scelta.tipo === 'apri' ? testi().aproAnno(nomeDelDocumento(scelta.documento)) : testi().creoAnnoNuovo,
  )
  mostraAvvio()
  try {
    if (scelta.tipo === 'apri') await usaDocumento(scelta.documento)
    else await creaAnnoNuovo()
  } finally {
    chiudiAvvioQuandoAppare()
  }
}

/** Quel che il benvenuto non sa fare da sé: scegliere un file e aprirne uno arrivato da fuori. */
const azioniBenvenuto = {
  scegliDocumento,
  apriAltrove: (file: Uri) => apriDaFuori(file),
}

/**
 * Chiude l'anno aperto e mostra il benvenuto. Il ricordo dell'ultimo documento
 * si cancella, così il prossimo avvio non lo riapre; fra i recenti resta.
 */
async function chiudiDocumento (): Promise<void> {
  // Un passaggio come un'apertura: il pannello che si chiude è l'ultima
  // finestra e `window-all-closed` non deve leggerlo come un'uscita.
  const fine = iniziaApertura()
  let benvenuto: Promise<void> | null = null
  try {
    // Un anno mai salvato chiede che cosa farne; «Annulla», o un anno che non si
    // lascia scrivere, lascia tutto com'è.
    if (!(await chiudiDocumentoAperto())) return
    // I lettori mostrano i PDF di quest'anno.
    chiudiLettori()
    await getConfiguration('registroDocenti').update(CHIAVE_ULTIMO, undefined)
    // La finestra del benvenuto nasce prima della prima attesa: il passaggio può finire subito.
    benvenuto = senzaDocumento()
  } finally {
    fine()
  }
  await benvenuto
}

// --------------------------------------------------- aprire un documento d'anno

/**
 * Il `.regi` passato sulla riga di comando. Si scorrono tutti gli argomenti
 * perché Electron ne antepone di suoi (in sviluppo la cartella dell'app).
 */
function documentoNegliArgomenti (argomenti: string[], cartella: string): Uri | null {
  for (const argomento of argomenti.slice(1)) {
    if (argomento.startsWith('-')) continue
    if (!èPacchetto(percorso.basename(argomento))) continue
    try {
      // Rispetto alla cartella di chi ha lanciato: per la seconda istanza non è
      // la nostra, e dopo l'avvio la nostra è `home`.
      const intero = percorso.resolve(cartella, argomento)
      if (statSync(intero).isFile()) return Uri.file(intero)
    } catch {
      // Non è un file.
    }
  }
  return null
}

/**
 * Ricorda il documento per il prossimo avvio e dichiara la cartella di lavoro
 * (quella che lo contiene): le radici leggibili da `registro://` e la cartella
 * dei modelli di stampa.
 */
async function preparaDocumento (file: Uri): Promise<void> {
  const impostazioni = getConfiguration('registroDocenti')
  await impostazioni.update(CHIAVE_ULTIMO, file.fsPath)
  // Un anno provvisorio si ricorda ma non sposta la cartella di lavoro: i
  // modelli di stampa del docente stanno nell'altra.
  if (!èProvvisorio(file)) await impostaCartellaLavoro(Uri.joinPath(file, '..'))
}

/**
 * Apre un documento d'anno, senza riavvio: «Apri…», i recenti, il doppio clic.
 * `Archivio.apri` scrive il salvataggio in attesa prima di lasciare il documento precedente.
 */
async function usaDocumento (file: Uri): Promise<void> {
  if (inChiusura) return
  // Il benvenuto che si chiude può essere l'ultima finestra: non è un invito a uscire.
  const fine = iniziaApertura()
  let alBenvenuto = false
  try {
    alBenvenuto = !(await apriDocumento(file))
  } finally {
    fine(!alBenvenuto)
  }
  // Niente di aperto né prima né dopo: il benvenuto, invece di un registro senza finestre.
  if (alBenvenuto) await senzaDocumento()
}

/**
 * Il corpo di `usaDocumento`. Falso se alla fine non c'è nessun anno aperto.
 */
async function apriDocumento (file: Uri): Promise<boolean> {
  if (!èPacchetto(percorso.basename(file.fsPath))) {
    void showErrorMessage(testi().estensioneNonValida(file.fsPath))
    return percorsoPacchetto() !== null || BrowserWindow.getAllWindows().length > 0
  }
  // È arrivato un documento: la domanda del benvenuto ha avuto risposta.
  chiudiBenvenuto()
  // Chiudere il benvenuto fa ripartire `avvia`, ma in coda: senza questa attesa
  // `registroDocenti.usaDocumento` non sarebbe ancora registrato e l'anno non si
  // aprirebbe senza dirlo.
  if (!(await entroIlTetto(prontoPerIComandi, TETTO_PRONTO_MS))) {
    console.error(`comandi non pronti dopo ${TETTO_PRONTO_MS / 1000} s: ${file.fsPath} non aperto`)
    return true
  }
  if (inChiusura) return true
  // I lettori mostrano documenti dell'anno che si lascia.
  chiudiLettori()
  await preparaDocumento(file)
  // Di nuovo dopo l'attesa: un «Esci» intanto ha chiuso l'archivio, e aprire
  // prenderebbe una serratura che nessuno toglierà.
  if (inChiusura) return true
  try {
    await executeCommand('registroDocenti.usaDocumento', file.fsPath)
  } catch (errore) {
    console.error(`documento non aperto: ${file.fsPath}`, errore)
    void showErrorMessage(
      testi().nonSiÈAperto(file.fsPath, errore instanceof Error ? errore.message : String(errore)),
    )
  }
  // Non si è aperto (l'archivio l'ha già detto): il ricordo torna all'anno
  // rimasto aperto o si cancella, perché `preparaDocumento` l'aveva già spostato.
  const aperto = percorsoPacchetto()
  if (aperto?.fsPath !== file.fsPath) {
    if (!aperto) {
      await getConfiguration('registroDocenti').update(CHIAVE_ULTIMO, undefined)
      return false
    }
    await preparaDocumento(aperto)
  }
  apriRegistro()
  // Un benvenuto aperto mentre l'anno arrivava resterebbe sopra a chiedere quale.
  chiudiBenvenuto()
  return true
}

/**
 * Aperture d'anno a metà: documento scelto, pannello non ancora arrivato. In
 * quei secondi può non esserci nessuna finestra e `window-all-closed` non deve
 * uscire. Contatore perché le aperture possono sovrapporsi.
 */
let apertureInCorso = 0

/**
 * Segna un'apertura cominciata e torna chi la chiude (una volta sola). Alla
 * chiusura, se non si dice il contrario, prende la decisione rimandata da
 * `window-all-closed`.
 */
function iniziaApertura (): (ricontrolla?: boolean) => void {
  apertureInCorso += 1
  let chiusa = false
  return (ricontrolla = true) => {
    if (chiusa) return
    chiusa = true
    apertureInCorso -= 1
    if (ricontrolla && apertureInCorso === 0 && BrowserWindow.getAllWindows().length === 0) {
      senzaFinestre()
    }
  }
}

/**
 * `usaDocumento` per chi arriva da fuori (seconda copia, Finder) e non aspetta
 * la promessa: l'errore si mostra invece di perdersi.
 */
function apriDaFuori (file: Uri): void {
  usaDocumento(file).catch((errore: unknown) => {
    console.error(`documento non aperto: ${file.fsPath}`, errore)
    const motivo = errore instanceof Error ? errore.message : String(errore)
    void showErrorMessage(testi().nonSiÈAperto(file.fsPath, motivo))
  })
}

/**
 * Si scioglie quando `registroDocenti.*` è registrato, anche se l'avvio fallisce
 * (`finally` di `avvia`). Chi aspetta ha comunque il tetto `TETTO_PRONTO_MS`.
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
    title: testi().apriUnAnno,
    buttonLabel: parole().apri,
    properties: ['openFile'],
    defaultPath: app.getPath('documents'),
    filters: [
      // testo-fisso: il marchio non si traduce
      { name: 'Regiclass', extensions: [ESTENSIONE.slice(1)] },
    ],
  })
  const scelto = esito.canceled ? undefined : esito.filePaths[0]
  if (!scelto) return null
  return Uri.file(scelto)
}

/** La voce «Apri…» del menu: si sceglie, e si va. */
async function chiediDocumento (): Promise<void> {
  const scelto = await scegliDocumento()
  if (scelto) await usaDocumento(scelto)
}

/**
 * Alla prima chiusura nel vassoio si notifica, una volta sola, dove si trova
 * l'uscita vera: altrimenti sembra che il registro non si chiuda più.
 */
let spiegatoIlVassoio = false
function spiegaIlVassoio (): void {
  if (spiegatoIlVassoio || !notificheDisponibili()) return
  spiegatoIlVassoio = true
  dichiaraIdentita()
  avvisa({
    titolo: testi().restaAccantoAllOrologio,
    corpo: testi().comeSiRiapre,
    al: () => apriRegistro(),
  })
}

// Senza finestre si esce, a meno che l'icona del vassoio tenga vivo il
// registro. Un'apertura in corso rimanda la decisione a `iniziaApertura`. Chi
// decide è `quandoNonRestanoFinestre` in `lifecycle.ts`.
app.on('window-all-closed', () => senzaFinestre())

function senzaFinestre (): void {
  const decisione = quandoNonRestanoFinestre({
    inChiusura,
    aperturaInCorso: apertureInCorso > 0,
    vassoioAcceso: vassoioAcceso(),
    chiusuraNelVassoio: getConfiguration().get<boolean>('registroDocenti.vassoio.chiusuraNelVassoio', true),
    piattaforma: process.platform,
  })
  if (decisione === 'vassoio') spiegaIlVassoio()
  else if (decisione === 'esci') app.quit()
}

// macOS: l'icona nel Dock riapre il registro.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) apriRegistro()
})

/**
 * Lo spegnimento. Electron non aspetta le promesse in `before-quit`: si ferma
 * l'uscita, si aspetta `spegni` (i salvataggi ritardati), poi si esce.
 *
 * L'attesa ha un tetto: una scrittura bloccata (OneDrive, antivirus) lascerebbe
 * un processo invisibile con la serratura dell'istanza unica.
 *
 * L'aggiornamento si installa solo dopo `spegni`, perché l'installatore NSIS
 * con `--updated` chiude i processi del programma dopo un secondo e mezzo (vedi
 * `installaAllUscita` in `src/environment/updates.ts`). Ha anche lui un tetto.
 */
let inChiusura = false
/** Windows sta chiudendo la sessione: niente installazioni, che verrebbero troncate. */
let sessioneFinita = false
const TETTO_SPEGNIMENTO_MS = 20_000
const TETTO_INSTALLAZIONE_MS = 30_000
app.on('before-quit', (evento) => {
  // Un secondo `app.quit()` durante l'uscita non riparte da capo.
  if (inChiusura) {
    evento.preventDefault()
    return
  }
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
    .then(async () => {
      clearTimeout(guardia)
      const tetto = setTimeout(() => {
        console.error('installazione dell’aggiornamento oltre il tetto: esco senza')
        app.exit(0)
      }, TETTO_INSTALLAZIONE_MS)
      try {
        await installaAllUscita(sessioneFinita)
      } catch (errore) {
        console.error('aggiornamento non consegnato', errore)
      }
      clearTimeout(tetto)
    })
    .finally(() => app.exit(0))
})

/**
 * Arresto e disconnessione di Windows, dove `before-quit` non scatta: senza,
 * la serratura resterebbe accanto al `.regi` e il salvataggio ritardato si
 * perderebbe. A `query-session-end` si rifiuta quanto basta a uscire passando da
 * `before-quit`; `session-end` è l'ultima rete, senza ritorno.
 *
 * Arrivano solo alle `BrowserWindow`: con il registro nel vassoio e nessuna
 * finestra, l'arresto passa senza che `spegni` giri.
 */
app.on('browser-window-created', (_evento, finestra) => {
  finestra.on('query-session-end', (evento) => {
    sessioneFinita = true
    if (inChiusura) return
    evento.preventDefault()
    app.quit()
  })
  finestra.on('session-end', () => {
    sessioneFinita = true
    if (!inChiusura) app.quit()
  })
})
