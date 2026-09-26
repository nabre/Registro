// L'assistente staccato: la stessa conversazione in una finestra sua, da
// spostare accanto al registro o su un altro schermo.
//
// Carica `dist/assistant.js`, non il bundle del registro: non modifica dati e
// non riceve il `Registro`, solo lo stato dell'assistente.
//
// La conversazione, bozza e giro in corso compresi, passa da una finestra
// all'altra attraverso `inVolo`, che l'host tiene solo per l'istante del
// passaggio e con una scadenza (contiene nomi di persone). Il giro si riprende
// con `panels/conversation.ts`.

import * as apparato from 'apparato'

import { registraFinestraAssistente } from '../actions/assistant.js'
import { convalidaTurni } from '../api/procedures/assistente/stacca.js'
import { dettaturaAccesa } from '../data/dictation.js'
import { collegamento } from '../data/llm.js'
import type { Archivio } from '../data/archive.js'
import type {
  Conversazione,
  Dettatura,
  GiroAssistente,
  GiroDaRiprendere,
  MessaggioStatoAssistente,
  MessaggioVersoWebview,
  SeguiConversazione,
  TurnoAssistente,
} from '../protocol.js'
import {
  fermaGiriDi, riprendiGiro, rispondiConversazione, sospendiGiroInCorso,
} from './conversation.js'
import { rispondiDettatura } from './transcription.js'
import { paginaHtml, radiciDellaPagina } from './page.js'
import { testi } from './panels.testi.js'

/** Contesto e archivio messi da parte all'avvio: chi apre la finestra non li ha. */
let ambiente: { contesto: apparato.ContestoApplicazione, archivio: Archivio } | null = null

type Ascoltatore = (stato: MessaggioStatoAssistente) => void
const ascoltatori = new Set<Ascoltatore>()

/**
 * La conversazione fra una finestra e l'altra, con la destinazione: `apri()`
 * annuncia lo stato al pannello prima che la finestra sia pronta, e senza
 * `verso` il pannello se la prenderebbe.
 */
let inVolo: {
  verso: 'finestra' | 'riquadro'
  storia: TurnoAssistente[]
  bozza: string
  /** La chiave per riprendere il giro in attesa di risposta, se c'è. */
  giro: GiroDaRiprendere | null
  /** Timer che la butta se nessuno la prende. */
  scadenza: ReturnType<typeof setTimeout> | null
} | null = null

/** Quanto si tiene una conversazione che nessuno prende (come il giro sospeso). */
const SCADENZA_IN_VOLO = 60_000

/** Butta la conversazione in transito e ne spegne il timer. */
function scordaInVolo (): void {
  if (inVolo?.scadenza) clearTimeout(inVolo.scadenza)
  inVolo = null
}

export function avviaAssistente (
  contesto: apparato.ContestoApplicazione,
  archivio: Archivio,
): void {
  ambiente = { contesto, archivio }
  // Si iscrive qui chi sa aprire la finestra, perché l'azione «stacca» non
  // importa i pannelli (vedi `actions/assistant.ts`).
  registraFinestraAssistente((storia, bozza, giro) => {
    // Prima di prendere in consegna: se non si apre, chi chiama legge `false`
    // e si tiene la conversazione.
    if (!PannelloAssistente.apribile()) return false
    consegnaStoria(storia, 'finestra', bozza, giro)
    PannelloAssistente.apri()
    return true
  })
}

/** Iscrive un ascoltatore dello stato (il pannello del registro, per il riquadro). */
export function allAssistente (ascoltatore: Ascoltatore): apparato.Smaltitore {
  ascoltatori.add(ascoltatore)
  return new apparato.Smaltitore(() => ascoltatori.delete(ascoltatore))
}

/**
 * Lo stato dell'assistente per una destinazione. La conversazione in transito
 * esce una volta sola, solo verso `inVolo.verso`; al riquadro va anche `rientro`.
 */
function statoPer (verso: 'finestra' | 'riquadro'): MessaggioStatoAssistente {
  // Da `data/llm.ts`: dal trasporto nascerebbe un ciclo di import.
  const { attivo: acceso, modello } = collegamento('assistente')
  const stato: MessaggioStatoAssistente = {
    tipo: 'assistente.stato',
    acceso,
    modello,
    staccato: PannelloAssistente.aperta,
    dettatura: dettaturaAccesa(),
  }
  if (inVolo?.verso !== verso) return stato

  const { storia, bozza, giro } = inVolo
  scordaInVolo()
  return {
    ...stato,
    ...(storia.length > 0 ? { storia } : {}),
    ...(bozza !== '' ? { bozza } : {}),
    ...(giro ? { giro } : {}),
    // Anche una conversazione vuota è un rientro: il riquadro deve tornare.
    ...(verso === 'riquadro' ? { rientro: true } : {}),
  }
}

/** Lo stato dell'assistente per il pannello del registro. */
export function statoAssistente (): MessaggioStatoAssistente {
  return statoPer('riquadro')
}

function annuncia (): void {
  const stato = statoAssistente()
  for (const ascoltatore of ascoltatori) ascoltatore(stato)
}

/**
 * Mette da parte la conversazione che cambia finestra, con la destinazione.
 * Anche vuota: `verso` basta a dire che uno spostamento è in corso.
 */
function consegnaStoria (
  storia: readonly TurnoAssistente[],
  verso: 'finestra' | 'riquadro',
  bozza = '',
  giro?: GiroAssistente,
): void {
  // Una consegna vuota (il «porta davanti» del registro) non sovrascrive una
  // già in attesa.
  if (inVolo && storia.length === 0 && bozza === '' && !giro) return

  // Sospende il giro in volo, anche se già finito: `storia` è stata presa prima
  // della risposta. Lo consegna la pagina opposta a `verso`.
  const chiave = giro
    ? sospendiGiroInCorso({
        origine: verso === 'finestra' ? 'riquadro' : 'finestra',
        busta: giro.busta,
        ancheFinito: true,
      })
    : null
  if (inVolo?.scadenza) clearTimeout(inVolo.scadenza)
  const scadenza = setTimeout(() => {
    inVolo = null
  }, SCADENZA_IN_VOLO)
  // Il timer non trattiene la chiusura del programma.
  ;(scadenza as { unref?: () => void }).unref?.()
  inVolo = {
    verso,
    storia: storia.map((turno) => ({ ...turno })),
    bozza,
    giro: chiave === null || !giro ? null : { id: chiave, visti: giro.visti },
    scadenza,
  }
}

/** Il giro dalla busta della finestra staccata, che nessuno schema convalida: campo per campo. */
function giroDellaBusta (giro: unknown): GiroAssistente | undefined {
  if (!giro || typeof giro !== 'object') return undefined
  const { visti, busta } = giro as { visti?: unknown, busta?: unknown }
  if (typeof visti !== 'number' || !Number.isInteger(visti) || visti < 0) return undefined
  // Senza `busta` si sospende il più recente della pagina (`GiroAssistente.busta`).
  return typeof busta === 'number' && Number.isInteger(busta) && busta >= 0
    ? { visti, busta }
    : { visti }
}

/**
 * Riattacca un giro messo da parte alla pagina che lo chiede (riquadro o
 * finestra); se non c'è più, lo dice con un `guasto`.
 */
export function seguiGiro (
  busta: SeguiConversazione,
  invia: (messaggio: MessaggioVersoWebview) => void,
  /** La pagina che lo riprende e che da qui lo può fermare. */
  origine: 'riquadro' | 'finestra' = 'riquadro',
): void {
  const ripreso = riprendiGiro(busta.segui, busta.id, busta.da, invia, origine)
  if (ripreso) return
  invia({
    tipo: 'assistente',
    id: busta.id,
    evento: 'guasto',
    errori: [testi().persaNelloSpostamento],
  })
}

export class PannelloAssistente {
  private static istanza: PannelloAssistente | null = null

  private readonly smaltibili: apparato.Smaltitore[] = []

  private constructor (
    private readonly pannello: apparato.WebviewPanel,
    private readonly contesto: apparato.ContestoApplicazione,
    private readonly archivio: Archivio,
  ) {
    this.pannello.webview.html = this.html()

    this.smaltibili.push(
      this.pannello.webview.onDidReceiveMessage((messaggio) => this.gestisci(messaggio)),
      // Modello, interruttore e dettatura cambiano dalle impostazioni, e la
      // testata della finestra li mostra.
      apparato.impostazioni.alCambio((evento) => {
        if (
          evento.affectsConfiguration('registroDocenti.assistente') ||
          evento.affectsConfiguration('registroDocenti.dettatura')
        ) {
          // Assistente spento: la finestra si chiude senza riattaccare, perché
          // il riquadro dove tornare non c'è.
          if (!collegamento('assistente').attivo) {
            PannelloAssistente.chiudi()
            return
          }
          this.spingi()
        }
      }),
    )

    this.pannello.onDidDispose(() => this.smaltisci(), null, this.smaltibili)
  }

  static get aperta (): boolean {
    return PannelloAssistente.istanza !== null
  }

  /** Se `apri()` aprirebbe una finestra adesso: `assistente.stacca` lo chiede prima. */
  static apribile (): boolean {
    return ambiente !== null && collegamento('assistente').attivo
  }

  /** Apre la finestra dell'assistente, o la riporta davanti se c'è già. */
  static apri (): void {
    if (!ambiente) return
    // Spento non si stacca: `assistente.stacca` si può chiamare anche da riga di comando.
    if (!collegamento('assistente').attivo) return
    if (PannelloAssistente.istanza) {
      PannelloAssistente.istanza.pannello.reveal(undefined, true)
      PannelloAssistente.istanza.spingi()
      return
    }

    const { contesto, archivio } = ambiente
    const pannello = apparato.finestre.crea(
      'registroDocenti.assistente',
      testi().finestraAssistente,
      apparato.ViewColumn.Beside,
      {
        enableScripts: true,
        // La conversazione vive solo nella pagina: ricostruirla la perderebbe.
        retainContextWhenHidden: true,
        localResourceRoots: radiciDellaPagina(contesto.extensionUri),
      },
    )
    pannello.iconPath = apparato.Uri.joinPath(contesto.extensionUri, 'resources', 'registro.svg')

    PannelloAssistente.istanza = new PannelloAssistente(pannello, contesto, archivio)
    annuncia()
  }

  static chiudi (): void {
    PannelloAssistente.istanza?.pannello.dispose()
  }

  // ---------------------------------------------------------------- messaggi

  private gestisci (messaggio: unknown): void {
    const busta = messaggio as Partial<Conversazione> &
      Partial<Dettatura> &
      Partial<SeguiConversazione> & {
        pronto?: unknown
        riattacca?: unknown
        bozza?: unknown
        giro?: unknown
      }
    if (!busta || typeof busta !== 'object') return

    // Pagina pronta: riceve lo stato, con la conversazione consegnata dal riquadro.
    if (busta.pronto === true) {
      this.spingi()
      return
    }

    // «Riattacca»: consegna la conversazione e si chiude; il riquadro si
    // riapre con lo stato annunciato da `smaltisci`.
    if (Array.isArray(busta.riattacca)) {
      consegnaStoria(
        // Convalidata, non castata: un turno storto romperebbe il registro.
        convalidaTurni(busta.riattacca as unknown[]),
        'riquadro',
        typeof busta.bozza === 'string' ? busta.bozza : '',
        giroDellaBusta(busta.giro),
      )
      PannelloAssistente.chiudi()
      return
    }

    // Riprende il giro rimasto senza risposta nell'altra pagina.
    if (typeof busta.segui === 'number' && typeof busta.id === 'number') {
      seguiGiro(busta as SeguiConversazione, (risposta) => this.invia(risposta), 'finestra')
      return
    }

    // Dettatura, stessa busta del riquadro (`transcription.ts`).
    if (typeof busta.id === 'number' && busta.campioni) {
      void rispondiDettatura(busta as Dettatura, (risposta) => this.invia(risposta))
      return
    }

    if (typeof busta.id === 'number' && Array.isArray(busta.storia)) {
      // `'finestra'` dice di chi è il giro (`sospendiGiroInCorso`).
      void rispondiConversazione(
        this.archivio,
        busta as Conversazione,
        (risposta) => this.invia(risposta),
        'finestra',
      )
    }
  }

  private invia (messaggio: MessaggioVersoWebview): void {
    void this.pannello.webview.postMessage(messaggio)
  }

  private spingi (): void {
    this.invia(statoPer('finestra'))
  }

  private html (): string {
    return paginaHtml({
      webview: this.pannello.webview,
      radiceApp: this.contesto.extensionUri,
      bundle: 'assistant',
      titolo: testi().paginaAssistente,
      classe: 'assistente-finestra',
    })
  }

  private smaltisci (): void {
    // Ferma i giri che questa finestra aspettava; quelli sospesi restano.
    fermaGiriDi('finestra')
    PannelloAssistente.istanza = null
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
    // Dopo aver azzerato l'istanza: `staccato` si legge da `aperta`.
    annuncia()
  }
}
