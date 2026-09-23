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

import * as apparato from 'apparato'

import type { Archivio } from '../data/archive.js'
import {
  bloccoAperto,
  contenutoProiezione,
  PROIEZIONE_PREDEFINITA,
  MIRA_VUOTA,
  vistaCalendarioValida,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from '../domain/projection.js'
import type { MessaggioProiezione, MessaggioStatoProiezione } from '../protocol.js'
import { paginaHtml, radiceRisorse, radiciDellaPagina } from './page.js'

/**
 * Quel che serve per aprire il pannello, messo da parte all'accensione
 * dell'estensione.
 *
 * Le azioni che aprono la proiezione arrivano dal webview e hanno in mano
 * l'archivio, non il contesto dell'estensione: senza questo appoggio ognuna
 * dovrebbe farsi passare l'`extensionUri` da chi non ce l'ha.
 */
let ambiente: { contesto: apparato.ContestoApplicazione; archivio: Archivio } | null = null

type Ascoltatore = (stato: MessaggioStatoProiezione) => void
const ascoltatori = new Set<Ascoltatore>()

/** Dove sta guardando il registro, e che cosa se ne mostra. */
let mira: MiraProiezione = MIRA_VUOTA
let impostazioni: ImpostazioniProiezione = { ...PROIEZIONE_PREDEFINITA }

export function avviaProiezione (contesto: apparato.ContestoApplicazione, archivio: Archivio): void {
  ambiente = { contesto, archivio }
}

/**
 * Chi vuole sapere come sta la proiezione: è il pannello del docente, che ne
 * disegna i comandi. Si iscrive lui invece di essere chiamato per nome da qui,
 * così questo file non ha bisogno di conoscerlo.
 */
export function allaProiezione (ascoltatore: Ascoltatore): apparato.Smaltitore {
  ascoltatori.add(ascoltatore)
  return new apparato.Smaltitore(() => ascoltatori.delete(ascoltatore))
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

/** Se la finestra della proiezione va messa a schermo intero appena aperta. */
function schermoIntero (): boolean {
  return apparato.impostazioni
    .leggi('registroDocenti')
    .get<boolean>('proiezione.schermoIntero', false)
}

/**
 * Porta la proiezione sul proiettore, e — se lo si è chiesto — a schermo intero.
 *
 * Lo schermo su cui va a finire lo sceglie il registro: `schermoDellaClasse()`
 * in `src/environment/commands.ts` prende quello che non è il principale, che in
 * un'aula è il proiettore. È una cosa che si può fare adesso e non si poteva
 * prima: un'estensione dell'editor non sapeva nemmeno quanti schermi ci fossero,
 * e il meglio che riusciva a fare era staccare una finestra fluttuante e
 * lasciarla trascinare a mano.
 *
 * Il comando agisce sulla finestra che ha il fuoco. Il `reveal` esplicito e il
 * giro di eventi prima servono a quello: senza, a mettersi a schermo intero
 * poteva essere la finestra di chi insegna — cioè si spegneva il registro
 * davanti alla classe invece di riempire il proiettore.
 */
async function portaSulProiettore (pannello: apparato.WebviewPanel): Promise<void> {
  if (!schermoIntero()) return
  pannello.reveal(pannello.viewColumn, false)
  await new Promise((risolvi) => setTimeout(risolvi, 0))
  await apparato.comandi.esegui('apparato.schermoIntero')
}

export class PannelloProiezione {
  private static istanza: PannelloProiezione | null = null

  private readonly smaltibili: apparato.Smaltitore[] = []
  /** Una spinta è già in coda: non se ne accoda una seconda. */
  private spintaInSospeso = false

  private constructor (
    private readonly pannello: apparato.WebviewPanel,
    private readonly contesto: apparato.ContestoApplicazione,
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
    const pannello = apparato.finestre.crea(
      'registroDocenti.proiezione',
      'Registro · proiezione',
      // Accanto, non addosso: il registro resta dov'è, e chi non ha un secondo
      // schermo si ritrova comunque i due affiancati.
      apparato.ViewColumn.Beside,
      {
        enableScripts: true,
        // Nascondendo la scheda — cosa che succede appena si torna sul registro
        // in una finestra sola — il contenuto non va ricostruito: la classe
        // vedrebbe la pagina sfarfallare a ogni passaggio.
        retainContextWhenHidden: true,
        localResourceRoots: radiciDellaPagina(contesto.extensionUri),
      },
    )
    pannello.iconPath = apparato.Uri.joinPath(contesto.extensionUri, 'resources', 'registro.svg')

    PannelloProiezione.istanza = new PannelloProiezione(pannello, contesto, archivio)
    annuncia()

    // La proiezione è già una finestra sua: qui resta solo da portarla sul
    // proiettore, che è il gesto per cui esiste tutto questo.
    await portaSulProiettore(pannello)
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
      localResourceRoots: radiciDellaPagina(istanza.contesto.extensionUri),
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
    return paginaHtml({
      webview: this.pannello.webview,
      radiceApp: this.contesto.extensionUri,
      bundle: 'projection',
      titolo: 'Proiezione',
      classe: 'proiezione',
    })
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
