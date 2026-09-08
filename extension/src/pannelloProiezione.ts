// Lo schermo per la classe: un secondo pannello, sola lettura, caratteri grandi.
//
// Non è il registro spostato sul proiettore. Un `WebviewPanel` non si può
// duplicare — è un editor solo, e trascinarlo sull'altro schermo lo toglie da
// quello del docente — ma soprattutto non lo si vorrebbe duplicare: il registro
// tiene i voti e le assenze di tutti, e davanti a venti persone quella pagina
// non ci va. Qui c'è una vista diversa sugli stessi dati, con dentro solo quel
// che il docente ha acceso.
//
// Segue il pannello principale: il registro dice dove sta guardando, questo
// ricalcola e spinge. Chi insegna non deve fare un secondo gesto per ogni ora
// che apre — se lo dovesse fare, dopo tre lezioni lo schermo mostrerebbe
// l'ora sbagliata.
//
// I comandi stanno tutti nel pannello del docente, e non qui: un interruttore
// sullo schermo grande è un interruttore che si preme davanti alla classe.

import * as vscode from 'vscode'

import type { Archivio } from './dati/archivio.js'
import { cartellaAnno, cartellaDati } from './dati/percorsi.js'
import {
  bloccoAperto,
  contenutoProiezione,
  PROIEZIONE_PREDEFINITA,
  MIRA_VUOTA,
  vistaCalendarioValida,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from './dominio/proiezione.js'
import type { MessaggioProiezione, MessaggioStatoProiezione } from './protocollo.js'

/**
 * Quel che serve per aprire il pannello, messo da parte all'accensione
 * dell'estensione.
 *
 * Le azioni che aprono la proiezione arrivano dal webview e hanno in mano
 * l'archivio, non il contesto dell'estensione: senza questo appoggio ognuna
 * dovrebbe farsi passare l'`extensionUri` da chi non ce l'ha.
 */
let ambiente: { contesto: vscode.ExtensionContext; archivio: Archivio } | null = null

type Ascoltatore = (stato: MessaggioStatoProiezione) => void
const ascoltatori = new Set<Ascoltatore>()

/** Dove sta guardando il registro, e che cosa se ne mostra. */
let mira: MiraProiezione = MIRA_VUOTA
let impostazioni: ImpostazioniProiezione = { ...PROIEZIONE_PREDEFINITA }

export function avviaProiezione (contesto: vscode.ExtensionContext, archivio: Archivio): void {
  ambiente = { contesto, archivio }
}

/**
 * Chi vuole sapere come sta la proiezione: è il pannello del docente, che ne
 * disegna i comandi. Si iscrive lui invece di essere chiamato per nome da qui,
 * così questo file non ha bisogno di conoscerlo.
 */
export function allaProiezione (ascoltatore: Ascoltatore): vscode.Disposable {
  ascoltatori.add(ascoltatore)
  return new vscode.Disposable(() => ascoltatori.delete(ascoltatore))
}

export function statoProiezione (): MessaggioStatoProiezione {
  return {
    tipo: 'proiezione.stato',
    aperta: PannelloProiezione.aperta,
    impostazioni,
  }
}

function annuncia (): void {
  const stato = statoProiezione()
  for (const ascoltatore of ascoltatori) ascoltatore(stato)
}

/** Se aprendo si deve staccare una finestra: è quel che serve col doppio schermo. */
function finestraSeparata (): boolean {
  return vscode.workspace
    .getConfiguration('registroDocenti')
    .get<boolean>('proiezione.finestraSeparata', true)
}

/** Se la finestra staccata va messa a schermo intero appena aperta. */
function schermoIntero (): boolean {
  return vscode.workspace
    .getConfiguration('registroDocenti')
    .get<boolean>('proiezione.schermoIntero', false)
}

/**
 * Stacca la proiezione in una finestra sua.
 *
 * **Su quale monitor finisca non lo decide il registro.** Un'estensione di VS
 * Code non sa quanti schermi ci sono, non sa dove sono, e non può mettere una
 * finestra su uno piuttosto che su un altro: non esiste un'API per farlo, e
 * girarci intorno vorrebbe dire uscire da VS Code. Quel che si può fare è
 * questo — staccarla — e poi è VS Code a ricordarsi dove la si è messa: la si
 * trascina sul proiettore una volta, e da lì in poi riapre lì.
 *
 * Il comando agisce sull'editor attivo, e il pannello lo diventa solo quando
 * VS Code ha finito di aprirlo. Un `reveal` esplicito e un giro di eventi
 * prima: senza, capitava che a staccarsi fosse il file aperto accanto invece
 * della proiezione.
 */
async function staccaFinestra (pannello: vscode.WebviewPanel): Promise<void> {
  pannello.reveal(pannello.viewColumn, false)
  await new Promise((risolvi) => setTimeout(risolvi, 0))
  try {
    await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow')
  } catch {
    // Una versione più vecchia, o un host che non lo implementa: il pannello
    // resta accanto al registro e si sposta a mano. Non è un guasto.
    return
  }
  // Solo se il distacco è andato: a schermo intero si mette la finestra che ha
  // il fuoco, e se fosse ancora quella del registro si spegnerebbe la
  // schermata di chi insegna invece di riempire il proiettore.
  if (!schermoIntero()) return
  try {
    await vscode.commands.executeCommand('workbench.action.toggleFullScreen')
  } catch {
    // Si mette a schermo intero a mano.
  }
}

/**
 * La radice dei file che lo schermo grande carica: la cartella dell'anno in
 * uso, perché è a lei che i percorsi dentro i JSON sono relativi. Vedi la nota
 * gemella in `pannello.ts`.
 */
function radiceRisorse (): vscode.Uri | null {
  return cartellaAnno() ?? cartellaDati()
}

function localResourceRoots (extensionUri: vscode.Uri): vscode.Uri[] {
  const dati = radiceRisorse()
  return [
    vscode.Uri.joinPath(extensionUri, 'dist'),
    vscode.Uri.joinPath(extensionUri, 'media'),
    ...(dati ? [dati] : []),
  ]
}

function nonce (): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let esito = ''
  for (let i = 0; i < 32; i += 1) esito += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return esito
}

export class PannelloProiezione {
  private static istanza: PannelloProiezione | null = null

  private readonly smaltibili: vscode.Disposable[] = []
  /** Una spinta è già in coda: non se ne accoda una seconda. */
  private spintaInSospeso = false

  private constructor (
    private readonly pannello: vscode.WebviewPanel,
    private readonly contesto: vscode.ExtensionContext,
    private readonly archivio: Archivio,
  ) {
    this.pannello.webview.html = this.html()

    this.smaltibili.push(
      // Il registro cambia mentre la classe guarda: una tappa spuntata, un
      // argomento scritto, un'assenza segnata. Lo schermo grande si aggiorna da
      // sé — è metà del motivo per cui vale la pena averlo acceso.
      this.archivio.alCambiamento(() => this.spingi()),
    )

    this.pannello.onDidDispose(() => this.smaltisci(), null, this.smaltibili)
    this.spingi()
  }

  static get aperta (): boolean {
    return PannelloProiezione.istanza !== null
  }

  /** Apre lo schermo per la classe, o lo riporta davanti se c'è già. */
  static async apri (): Promise<void> {
    if (!ambiente) return
    if (PannelloProiezione.istanza) {
      PannelloProiezione.istanza.pannello.reveal(undefined, true)
      return
    }

    const { contesto, archivio } = ambiente
    const pannello = vscode.window.createWebviewPanel(
      'registroDocenti.proiezione',
      'Registro · proiezione',
      // Accanto, non addosso: il registro resta dov'è, e chi non ha un secondo
      // schermo si ritrova comunque i due affiancati.
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        // Nascondendo la scheda — cosa che succede appena si torna sul registro
        // in una finestra sola — il contenuto non va ricostruito: la classe
        // vedrebbe la pagina sfarfallare a ogni passaggio.
        retainContextWhenHidden: true,
        localResourceRoots: localResourceRoots(contesto.extensionUri),
      },
    )
    pannello.iconPath = vscode.Uri.joinPath(contesto.extensionUri, 'media', 'registro.svg')

    PannelloProiezione.istanza = new PannelloProiezione(pannello, contesto, archivio)
    annuncia()

    // La finestra staccata: è il gesto per cui esiste tutto questo. VS Code la
    // apre fluttuante, la si trascina sul proiettore, e da lì in poi la
    // riapre dove la si era lasciata.
    if (finestraSeparata()) await staccaFinestra(pannello)
  }

  static chiudi (): void {
    PannelloProiezione.istanza?.pannello.dispose()
  }

  /** Da chiamare quando cambia la cartella dei dati: le immagini vivono lì. */
  static aggiornaRisorse (): void {
    const istanza = PannelloProiezione.istanza
    if (!istanza) return
    istanza.pannello.webview.options = {
      ...istanza.pannello.webview.options,
      localResourceRoots: localResourceRoots(istanza.contesto.extensionUri),
    }
    istanza.spingi()
  }

  static ricalcola (): void {
    PannelloProiezione.istanza?.spingi()
  }

  private spingi (): void {
    if (this.spintaInSospeso) return
    this.spintaInSospeso = true
    // In una microtask: una singola azione può scrivere più volte — una
    // presenza per allievo, ognuna con la sua modifica — e ricalcolare il
    // contenuto a ogni scrittura vorrebbe dire ridisegnare lo schermo grande
    // venti volte per un appello solo.
    queueMicrotask(() => {
      this.spintaInSospeso = false
      const cartella = radiceRisorse()
      const messaggio: MessaggioProiezione = {
        tipo: 'proiezione',
        contenuto: contenutoProiezione(this.archivio.registro, mira, impostazioni),
        radiceDati: cartella ? this.pannello.webview.asWebviewUri(cartella).toString() : null,
      }
      void this.pannello.webview.postMessage(messaggio)
    })
  }

  private html (): string {
    const webview = this.pannello.webview
    const risorsa = (...parti: string[]) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.contesto.extensionUri, ...parti))

    const chiave = nonce()
    const script = risorsa('dist', 'proiezione.js')
    const stile = risorsa('dist', 'proiezione.css')

    // La stessa politica stretta del registro, e per lo stesso motivo: qui
    // dentro passano nomi di allievi, e questa pagina non ha alcuna ragione di
    // parlare con la rete.
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${chiave}'`,
    ].join('; ')

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stile}" rel="stylesheet">
  <title>Proiezione</title>
</head>
<body>
  <div id="radice" class="proiezione"></div>
  <script nonce="${chiave}" src="${script}"></script>
</body>
</html>`
  }

  private smaltisci (): void {
    PannelloProiezione.istanza = null
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
    // Chiudendo la finestra si spengono anche i blocchi riservati: la prossima
    // proiezione riparte da quel che è mostrabile senza pensarci. Chi li vuole
    // li riaccende, ed è un gesto che vale la pena rifare.
    impostazioni = { ...PROIEZIONE_PREDEFINITA }
    annuncia()
  }
}

// ------------------------------------------------------------------ comandi

/** Dove sta guardando il registro. Ricalcola solo se è cambiato qualcosa. */
export function puntaProiezione (nuova: MiraProiezione): void {
  const uguale =
    nuova.lezioneId === mira.lezioneId &&
    nuova.corsoId === mira.corsoId &&
    nuova.classeId === mira.classeId &&
    nuova.semestreId === mira.semestreId &&
    nuova.data === mira.data
  mira = nuova
  if (!uguale) PannelloProiezione.ricalcola()
}

export function impostaProiezione (nuove: ImpostazioniProiezione): void {
  impostazioni = {
    blocchi: [...nuove.blocchi],
    // La scheda aperta la si rimette in riga leggendola: se il pannello ne
    // manda una che nel frattempo è stata spenta, `bloccoAperto` scivola sulla
    // prima accesa invece di lasciare lo schermo vuoto.
    aperto: bloccoAperto({ ...nuove, blocchi: [...nuove.blocchi] }),
    nomi: Boolean(nuove.nomi),
    sospesa: Boolean(nuove.sospesa),
    compatta: Boolean(nuove.compatta),
    // Una vista che non esiste — un messaggio vecchio, un pannello ricaricato —
    // torna all'agenda invece di lasciare il blocco calendario senza niente da
    // disegnare.
    calendario: vistaCalendarioValida(nuove.calendario) ? nuove.calendario : 'agenda',
  }
  PannelloProiezione.ricalcola()
  annuncia()
}

export function impostazioniProiezione (): ImpostazioniProiezione {
  return impostazioni
}
