// Lo schermo per la classe: secondo pannello in sola lettura, caratteri grandi.
// È una vista separata con solo i blocchi accesi dal docente, non il registro
// (che mostra voti e assenze). Segue da sé la mira del registro; i comandi
// stanno nel pannello del docente, non sullo schermo davanti alla classe.

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
import { testi } from './panels.testi.js'

/** Contesto e archivio messi da parte all'avvio: chi apre la proiezione non li ha. */
let ambiente: { contesto: apparato.ContestoApplicazione; archivio: Archivio } | null = null

type Ascoltatore = (stato: MessaggioStatoProiezione) => void
const ascoltatori = new Set<Ascoltatore>()

/** Dove sta guardando il registro, e che cosa se ne mostra. */
let mira: MiraProiezione = MIRA_VUOTA
let impostazioni: ImpostazioniProiezione = { ...PROIEZIONE_PREDEFINITA }

export function avviaProiezione (
  contesto: apparato.ContestoApplicazione,
  archivio: Archivio,
): void {
  ambiente = { contesto, archivio }
}

/** Iscrive un ascoltatore dello stato (il pannello del docente, che ne disegna i comandi). */
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
 * Porta la proiezione a schermo intero sul proiettore, se richiesto; lo schermo
 * lo sceglie `schermoDellaClasse()` in `src/environment/commands.ts`.
 * La finestra va passata per id e non per fuoco: su Windows il fuoco arriva in
 * ritardo e a schermo intero finirebbe il registro.
 */
async function portaSulProiettore (pannello: apparato.WebviewPanel): Promise<void> {
  if (!schermoIntero()) return
  pannello.reveal(pannello.viewColumn, false)
  await new Promise((risolvi) => setTimeout(risolvi, 0))
  await apparato.comandi.esegui('apparato.schermoIntero', pannello.idContenuti)
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
      // Lo schermo grande si aggiorna da sé a ogni cambiamento del registro.
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
      testi().finestraProiezione,
      // Accanto, così senza secondo schermo i due restano affiancati.
      apparato.ViewColumn.Beside,
      {
        enableScripts: true,
        // Evita che la pagina sfarfalli ricostruendosi a ogni cambio di scheda.
        retainContextWhenHidden: true,
        localResourceRoots: radiciDellaPagina(contesto.extensionUri),
      },
    )
    pannello.iconPath = apparato.Uri.joinPath(contesto.extensionUri, 'resources', 'registro.svg')

    PannelloProiezione.istanza = new PannelloProiezione(pannello, contesto, archivio)
    annuncia()

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
    // In una microtask: un'azione sola (un appello) scrive più volte, e si
    // ridisegna una volta.
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
      titolo: testi().paginaProiezione,
      classe: 'proiezione',
    })
  }

  private smaltisci (): void {
    PannelloProiezione.istanza = null
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
    // Alla chiusura si spengono i blocchi riservati: si riparte dai predefiniti.
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
    // Se la scheda aperta è stata spenta, `bloccoAperto` ripiega sulla prima accesa.
    aperto: bloccoAperto({ ...nuove, blocchi: [...nuove.blocchi] }),
    nomi: Boolean(nuove.nomi),
    sospesa: Boolean(nuove.sospesa),
    compatta: Boolean(nuove.compatta),
    // Una vista sconosciuta torna all'agenda.
    calendario: vistaCalendarioValida(nuove.calendario) ? nuove.calendario : 'agenda',
  }
  PannelloProiezione.ricalcola()
  annuncia()
}
