// L'assistente staccato: la stessa conversazione, in una finestra sua.
//
// Il riquadro a destra va bene finché la domanda è corta. Quando la risposta è
// lunga, o quando la si vuole tenere aperta **accanto** al registro invece che
// dentro, una colonna di ventitré rem non basta più: si stacca, e diventa una
// finestra che si sposta, si ridimensiona e si porta sull'altro schermo come
// qualunque altra. È lo stesso gesto della proiezione, e per la stessa ragione
// — una cosa che si guarda mentre si lavora non deve rubare spazio a quel su
// cui si sta lavorando.
//
// ------------------------------------------------------------ il suo bundle
//
// La finestra carica `dist/assistant.js` e non quello del registro, ed è una
// scelta e non un dettaglio di costruzione: il bundle del pannello porta dentro
// tutte le viste che sanno **modificare** i dati, e questa finestra non ne
// modifica nessuno. Riceve due fatti — se l'assistente è acceso e quale modello
// risponde — e non riceve il `Registro`: il che vuol dire, fra l'altro, che una
// finestra dell'assistente lasciata aperta su una scrivania non ha addosso i
// voti e le assenze di nessuno. Quel che passa di lì è quel che si è chiesto e
// quel che è stato risposto, e basta.
//
// È la stessa divisione di `panels/projection.ts`, e il motivo è scritto lì
// per esteso.
//
// ------------------------------------------------------------ la conversazione
//
// Viaggia con lei. Chi stacca lo fa quasi sempre a metà di una domanda, e un
// riquadro che si svuota spostandosi è un riquadro che non si sposta: si
// ricomincerebbe da capo con la stessa domanda.
//
// Viaggia anche **la domanda a cui non è ancora arrivata risposta**: il filo
// con il modello vive in questo processo e non nella pagina, quindi non si
// ferma perché una finestra si chiude — basta dire all'altra da dove
// riprenderlo. Come si fa sta in `panels/conversation.ts`; qui si vede
// passare come `inVolo.giro`.
//
// **L'host la tiene per un istante e poi la lascia.** `inVolo` si riempie
// quando una finestra la consegna e si svuota appena l'altra la prende: dentro
// ci sono i nomi delle persone in formazione, e un main process che se la
// tenesse per tutta la sessione sarebbe una copia della conversazione che
// nessuno ha chiesto e che nessuna delle due finestre può cancellare.
//
// «Appena l'altra la prende» non bastava, perché l'altra poteva non arrivare
// mai: bastava una finestra che non si apriva — l'assistente spento un istante
// prima — e la conversazione restava qui a tempo indeterminato, con il riquadro
// già svuotato e nessuno che se ne accorgesse. Adesso ha una scadenza, come il
// giro sospeso di `panels/conversation.ts` e per la stessa ragione.

import * as apparato from 'apparato'

import { registraFinestraAssistente } from '../actions/assistant.js'
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
import type { BloccoRisultato, RisultatoAssistente } from '../protocol.js'
import { riprendiGiro, rispondiConversazione, sospendiGiroInCorso } from './conversation.js'
import { rispondiDettatura } from './transcription.js'
import { paginaHtml, radiciDellaPagina } from './page.js'

/**
 * Quel che serve per aprire la finestra, messo da parte all'accensione.
 *
 * Le azioni che la aprono arrivano dal webview e hanno in mano l'archivio, non
 * il contesto dell'applicazione: senza questo appoggio ognuna dovrebbe farsi
 * passare l'`extensionUri` da chi non ce l'ha. Stessa soluzione, stesso motivo,
 * di `panels/projection.ts`.
 */
let ambiente: { contesto: apparato.ContestoApplicazione, archivio: Archivio } | null = null

type Ascoltatore = (stato: MessaggioStatoAssistente) => void
const ascoltatori = new Set<Ascoltatore>()

/**
 * La conversazione fra una finestra e l'altra, **con la sua destinazione**.
 *
 * Il `verso` non è un ornamento: senza, la consegna andava a chi chiedeva per
 * primo. Staccando, `apri()` annuncia lo stato al pannello *prima* che la
 * finestra nuova dica «sono in piedi» — e il pannello si portava via la
 * conversazione destinata alla finestra, che si apriva vuota mentre il riquadro
 * si riapriva da solo con dentro la chat. Il difetto era invisibile finché la
 * conversazione era vuota, che è come si prova una cosa appena scritta.
 *
 * Resta qui per l'istante fra una finestra e l'altra, e chi la prende la lascia
 * vuota: vedi la nota in testa al file.
 */
let inVolo: {
  verso: 'finestra' | 'riquadro'
  storia: TurnoAssistente[]
  bozza: string
  /**
   * La domanda ancora senza risposta, se se ne stava aspettando una.
   *
   * Il giro non viaggia — è già qui, sta parlando con il modello — e quel che
   * viaggia è il numero per riprenderlo: vedi `panels/conversation.ts`.
   */
  giro: GiroDaRiprendere | null
  /** Quando si butta da sé, se nessuno è venuto a prenderla. */
  scadenza: ReturnType<typeof setTimeout> | null
} | null = null

/**
 * Quanto si tiene una conversazione che nessuno è venuto a prendere.
 *
 * La stessa del giro sospeso, e per la stessa ragione: dentro ci sono i nomi
 * delle persone in formazione. Il giro una scadenza ce l'aveva da sempre e
 * questa no — bastava una finestra che non si apriva perché la conversazione
 * restasse qui **a tempo indeterminato**, contro quel che questo file dichiara
 * in testa. Si apre una finestra in meno di un secondo: quel che avanza è
 * margine per una macchina lenta.
 */
const SCADENZA_IN_VOLO = 60_000

/** Butta la conversazione in transito, e spegne il suo orologio. */
function scordaInVolo (): void {
  if (inVolo?.scadenza) clearTimeout(inVolo.scadenza)
  inVolo = null
}

export function avviaAssistente (
  contesto: apparato.ContestoApplicazione,
  archivio: Archivio,
): void {
  ambiente = { contesto, archivio }
  // L'azione «stacca» non conosce questo file e non deve: è raggiunta
  // dall'elenco delle procedure, e importarlo di là chiudeva un anello fra il
  // livello API e le finestre. Si iscrive chi sa aprire — vedi la nota in testa
  // a `actions/assistant.ts`.
  registraFinestraAssistente((storia, bozza, giro) => {
    // Si guarda **prima** di prendere in consegna: `apri()` esce senza dire
    // niente quando l'assistente è spento, e consegnando per primi si restava
    // con la conversazione in mano e un giro sospeso per una finestra che non
    // si apriva mai. Chi ha chiamato adesso legge il `false` e se la riprende.
    if (!PannelloAssistente.apribile()) return false
    // Una consegna già in attesa non si sovrascrive: vedi `consegnaStoria`.
    // Questa è la strada da cui passa anche il «porta davanti» — una busta
    // vuota mandata dal registro che si crede ancora staccato — e sovrascrivere
    // lì voleva dire far sparire la conversazione che la finestra aveva appena
    // riconsegnato al riquadro.
    consegnaStoria(storia, 'finestra', bozza, giro)
    PannelloAssistente.apri()
    return true
  })
}

/**
 * Chi vuole sapere dov'è l'assistente: è il pannello del registro, che deve
 * sapere se il riquadro a destra deve farsi da parte. Si iscrive lui invece di
 * essere chiamato per nome da qui, così questo file non lo conosce.
 */
export function allAssistente (ascoltatore: Ascoltatore): apparato.Smaltitore {
  ascoltatori.add(ascoltatore)
  return new apparato.Smaltitore(() => ascoltatori.delete(ascoltatore))
}

/**
 * Com'è messo l'assistente, per chi lo sta chiedendo.
 *
 * La conversazione esce **una volta sola e da una parte sola**: quella per cui
 * è partita. Chi non è la destinazione riceve lo stato e nient'altro, ed è quel
 * che impedisce al pannello di intercettare una chat diretta alla finestra —
 * vedi `inVolo` qui sopra.
 *
 * Al riquadro va anche `rientro`, che è l'altra metà: dice se la finestra ha
 * consegnato (e allora il riquadro si riapre) o se si è semplicemente chiusa.
 */
function statoPer (verso: 'finestra' | 'riquadro'): MessaggioStatoAssistente {
  // A `data/llm.ts` e non al trasporto dell'assistente: di quello servirebbe
  // una riga sola, e chiederla di là chiudeva un ciclo di import attraverso
  // l'elenco delle procedure. Vedi `PREDEFINITI` in `llm.ts`.
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
    // Una conversazione vuota è comunque un rientro: si stacca anche senza aver
    // ancora chiesto niente, e chiudendo la finestra il riquadro deve tornare.
    ...(verso === 'riquadro' ? { rientro: true } : {}),
  }
}

/** Com'è messo l'assistente, detto al pannello del registro. */
export function statoAssistente (): MessaggioStatoAssistente {
  return statoPer('riquadro')
}

function annuncia (): void {
  const stato = statoAssistente()
  for (const ascoltatore of ascoltatori) ascoltatore(stato)
}

/**
 * Mette da parte la conversazione che sta cambiando finestra, e per chi.
 *
 * Anche vuota: `verso` da solo basta a dire che uno spostamento è in corso, e
 * scartare l'array vuoto vorrebbe dire non distinguere più «la finestra ha
 * consegnato una chat vuota» da «non sta succedendo niente».
 */
function consegnaStoria (
  storia: readonly TurnoAssistente[],
  verso: 'finestra' | 'riquadro',
  bozza = '',
  giro?: GiroAssistente,
): void {
  // Una consegna già in attesa non si sovrascrive.
  //
  // Le due si incrociano davvero: si preme «Riattacca» nella finestra — la
  // conversazione è qui, destinata al riquadro — e si clicca l'icona
  // dell'assistente nel registro, che si crede ancora staccato e manda una
  // busta vuota per «portare davanti». Quella vuota si prendeva il posto
  // dell'altra: la conversazione destinata al riquadro spariva, e si riapriva
  // una finestra bianca. Una consegna vuota non ha niente da perdere, e chi
  // aspetta sì.
  if (inVolo && storia.length === 0 && bozza === '' && !giro) return

  // La domanda in volo, se ce n'era una: il filo smette di scrivere verso la
  // finestra che se ne va e aspetta che l'altra lo venga a prendere. `null`
  // quando non c'era niente da aspettare — il caso normale.
  //
  // **Anche quando il giro è finito nel frattempo**, che qui era scritto come
  // «il modo giusto di andare: la risposta è già dentro `storia`». Non era
  // vero: `storia` è la fotografia scattata da `prendi()` *prima* che la
  // risposta arrivasse, e la finestra nuova si apriva con una bolla vuota, le
  // pastiglie degli attrezzi sopra e nessuna spiegazione. Un giro finito si
  // sospende come gli altri, e `riprendiGiro` lo riconsegna e poi lo scarta.
  //
  // Quale giro lo dice chi consegna, e chi consegna è l'altra pagina rispetto
  // a `verso`: indovinarlo dal contatore sospendeva il giro del riquadro
  // quando a riattaccare era la finestra.
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
  // Non tiene in piedi il programma: se sta chiudendo non c'è più nessuna
  // finestra che possa venirsela a prendere.
  ;(scadenza as { unref?: () => void }).unref?.()
  inVolo = {
    verso,
    storia: storia.map((turno) => ({ ...turno })),
    bozza,
    giro: chiave === null || !giro ? null : { id: chiave, visti: giro.visti },
    scadenza,
  }
}

/**
 * Il giro dichiarato in una busta che non passa da nessuno schema.
 *
 * La consegna del riquadro è un'azione, e l'ingresso di `assistente.stacca` lo
 * convalida; quella della finestra staccata è una busta libera — l'unica porta
 * del ponte che non passa da un contratto — e quel che ne arriva si guarda qui,
 * campo per campo, invece di fidarsi della forma.
 */
function giroDellaBusta (giro: unknown): GiroAssistente | undefined {
  if (!giro || typeof giro !== 'object') return undefined
  const { visti, busta } = giro as { visti?: unknown, busta?: unknown }
  if (typeof visti !== 'number' || !Number.isInteger(visti) || visti < 0) return undefined
  // `busta` dice **quale** giro sospendere. Senza, si ricade sul più recente
  // della pagina che consegna: vedi `GiroAssistente.busta` nel protocollo.
  return typeof busta === 'number' && Number.isInteger(busta) && busta >= 0
    ? { visti, busta }
    : { visti }
}

/**
 * I turni arrivati dalla finestra staccata, guardati uno per uno.
 *
 * È l'unica porta del ponte che non passa da un contratto, e fin qui si
 * accontentava di `Array.isArray` e di un cast: `bridge.ts` dichiarava la porta
 * «protetta da un tipo dichiarato», che è una cosa che esiste alla
 * compilazione e non a mezzanotte. Di qui entrava il blocco malformato che poi
 * faceva cadere **l'intero ridisegno del registro** dentro `result.ts` —
 * `metti()` → `ridisegna()` → `aggiorna()`, e non la sola bolla.
 *
 * La forma è quella che `api/procedure/assistente/stacca.ts` dichiara già per
 * la direzione opposta (`TURNO`). **Va unificata**: questa è una seconda
 * verità, e la seconda verità è quella che resta indietro. Non si importa di
 * là perché chiuderebbe l'anello fra `pannelli/` e il livello API — quello che
 * `actions/assistant.ts` racconta in testa — quindi la riga giusta è esportare
 * un convalidatore da `stacca.ts` e chiamarlo da qui.
 *
 * Quel che non ha la forma **si toglie**, non fa cadere la busta: una tabella
 * storta in fondo a una conversazione di venti turni non è una buona ragione
 * per perderla tutta.
 */
function convalidaTurni (grezzi: readonly unknown[]): TurnoAssistente[] {
  const turni: TurnoAssistente[] = []
  for (const grezzo of grezzi) {
    if (!grezzo || typeof grezzo !== 'object') continue
    const turno = grezzo as Record<string, unknown>
    if (turno.ruolo !== 'utente' && turno.ruolo !== 'assistente') continue
    if (typeof turno.testo !== 'string') continue
    const buono: TurnoAssistente = { ruolo: turno.ruolo, testo: turno.testo }
    if (Array.isArray(turno.attrezzi)) {
      const attrezzi = turno.attrezzi.flatMap((grezzo: unknown) => {
        if (!grezzo || typeof grezzo !== 'object') return []
        const a = grezzo as Record<string, unknown>
        if (typeof a.nome !== 'string' || typeof a.ok !== 'boolean') return []
        return [{
          nome: a.nome,
          ok: a.ok,
          ...(typeof a.codice === 'string' ? { codice: a.codice } : {}),
          ...(typeof a.messaggio === 'string' ? { messaggio: a.messaggio } : {}),
        }]
      })
      if (attrezzi.length > 0) buono.attrezzi = attrezzi
    }
    if (Array.isArray(turno.risultati)) {
      const risultati = turno.risultati.flatMap(convalidaRisultato)
      if (risultati.length > 0) buono.risultati = risultati
    }
    // Gli id già visti: tre stringhe, e si guardano tutte e tre. Un id senza il
    // suo nome non si tiene — nel testo che il modello legge sarebbe una riga
    // che non gli dice di chi si tratta, cioè contesto speso per niente.
    if (Array.isArray(turno.visti)) {
      const visti = turno.visti.flatMap((grezzo: unknown) => {
        if (!grezzo || typeof grezzo !== 'object') return []
        const v = grezzo as Record<string, unknown>
        if (typeof v.id !== 'string' || v.id === '') return []
        if (typeof v.nome !== 'string' || v.nome === '') return []
        return [{ id: v.id, nome: v.nome, cosa: typeof v.cosa === 'string' ? v.cosa : '' }]
      })
      if (visti.length > 0) buono.visti = visti
    }
    if (turno.guasto === true) buono.guasto = true
    if (turno.fermato === true) buono.fermato = true
    turni.push(buono)
  }
  return turni
}

/**
 * Una busta di lettura impaginata, guardata quanto basta a disegnarla.
 *
 * I blocchi non si riscrivono campo per campo — li compone uno schema d'uscita
 * già convalidato, e ricopiarne qui l'unione vorrebbe dire la terza verità da
 * tenere allineata — ma si guarda che **abbiano la forma che il disegno usa**:
 * era una `colonne.map` su un oggetto senza colonne a far cadere il registro.
 */
function convalidaRisultato (grezzo: unknown): RisultatoAssistente[] {
  if (!grezzo || typeof grezzo !== 'object') return []
  const r = grezzo as Record<string, unknown>
  if (typeof r.procedura !== 'string' || typeof r.titolo !== 'string') return []
  if (!Array.isArray(r.blocchi)) return []
  const blocchi = r.blocchi.filter((grezzo: unknown) => {
    if (!grezzo || typeof grezzo !== 'object') return false
    const b = grezzo as Record<string, unknown>
    if (b.tipo === 'valori' || b.tipo === 'elenco') return Array.isArray(b.voci)
    if (b.tipo === 'tabella') return Array.isArray(b.colonne) && Array.isArray(b.righe)
    return false
  }) as BloccoRisultato[]
  return [{ procedura: r.procedura, titolo: r.titolo, blocchi }]
}

/**
 * Riattacca alla finestra che chiede un giro messo da parte.
 *
 * Non c'è più — è scaduto, o l'host è ripartito — e chi aspetta se lo sente
 * dire: una rotella che gira per sempre è il modo peggiore di perdere una
 * domanda, perché non si sa nemmeno che è stata persa.
 *
 * Sta qui e non nei due pannelli perché li riguarda tutti e due allo stesso
 * modo, come `rispondiConversazione`: la finestra staccata riprende un giro del
 * riquadro e il riquadro riprende un giro della finestra, ed è la stessa busta.
 */
export function seguiGiro (
  busta: SeguiConversazione,
  invia: (messaggio: MessaggioVersoWebview) => void,
): void {
  const ripreso = riprendiGiro(busta.segui, busta.id, busta.da, invia)
  if (ripreso) return
  invia({
    tipo: 'assistente',
    id: busta.id,
    evento: 'guasto',
    errori: ['La domanda si è persa nello spostamento: va rifatta.'],
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
      // Il modello e l'interruttore si cambiano dalle impostazioni, e questa
      // finestra li scrive in testata: senza, continuerebbe a dichiarare il
      // modello di prima mentre a rispondere è già un altro.
      apparato.impostazioni.alCambio((evento) => {
        if (
          evento.affectsConfiguration('registroDocenti.assistente') ||
          // Anche la dettatura: il microfono compare e sparisce da lì, e una
          // finestra staccata non ha nessun'altra strada per saperlo.
          evento.affectsConfiguration('registroDocenti.dettatura')
        ) {
          // Spento mentre la finestra è aperta, la finestra si chiude. Quel
          // che resterebbe è una conversazione staccata che dichiara «spento»
          // e non risponde più a niente — e il registro, di là, ha già tolto
          // il pulsante per riprenderla: sarebbe una finestra senza strada di
          // ritorno. Non si riattacca, perché il riquadro dove tornare adesso
          // non c'è; quel che si è detto resta dov'è e se ne va con la pagina.
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

  /**
   * Se una finestra si potrebbe aprire adesso.
   *
   * Le due condizioni sono quelle di `apri()`, che usciva **senza dire niente**
   * quando non erano soddisfatte: l'applicazione non ancora accesa, o
   * l'assistente spento nel frattempo. Chiederlo prima è quel che permette a
   * `assistente.stacca` di rifiutare invece di rispondere `ok` a un riquadro
   * che si è già svuotato.
   */
  static apribile (): boolean {
    return ambiente !== null && collegamento('assistente').attivo
  }

  /** Apre la finestra dell'assistente, o la riporta davanti se c'è già. */
  static apri (): void {
    if (!ambiente) return
    // Spento non si stacca. Il pulsante che lo fa non c'è più quando
    // l'assistente è spento, ma `assistente.stacca` è una procedura dell'API:
    // dalla riga di comando si chiama lo stesso, e aprirebbe la finestra di un
    // assistente che non può rispondere.
    if (!collegamento('assistente').attivo) return
    if (PannelloAssistente.istanza) {
      PannelloAssistente.istanza.pannello.reveal(undefined, true)
      PannelloAssistente.istanza.spingi()
      return
    }

    const { contesto, archivio } = ambiente
    const pannello = apparato.finestre.crea(
      'registroDocenti.assistente',
      'Registro · assistente',
      // Accanto, non addosso: il registro resta dov'è. È il motivo per cui si
      // stacca — tenere la risposta aperta *insieme* a quel che si sta facendo.
      apparato.ViewColumn.Beside,
      {
        enableScripts: true,
        // Tornando sul registro la scheda si nasconde, e ricostruirla vorrebbe
        // dire perdere la conversazione: qui non c'è nessuno stato sul disco da
        // rileggere, quel che è stato detto sta nella pagina e da nessun'altra
        // parte.
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

    // «Sono in piedi»: la pagina lo dice appena è pronta ad ascoltare, ed è
    // allora che riceve lo stato — con dentro la conversazione che il riquadro
    // le ha appena consegnato. Spingerlo prima vorrebbe dire parlare a una
    // pagina che non ha ancora installato il proprio ascoltatore.
    if (busta.pronto === true) {
      this.spingi()
      return
    }

    // «Torno nel riquadro»: la finestra consegna quel che si sono detti e si
    // chiude. Riaprire il riquadro è del pannello del registro, che lo riceve
    // con lo stato annunciato da `smaltisci`.
    if (Array.isArray(busta.riattacca)) {
      consegnaStoria(
        // Convalidata e non castata: vedi `convalidaTurni`. Un cast qui era la
        // porta da cui entrava il blocco storto che faceva cadere il ridisegno
        // dell'intero registro dall'altra parte.
        convalidaTurni(busta.riattacca as unknown[]),
        'riquadro',
        typeof busta.bozza === 'string' ? busta.bozza : '',
        giroDellaBusta(busta.giro),
      )
      PannelloAssistente.chiudi()
      return
    }

    // «Quel giro lì lo ascolto io»: la conversazione è appena arrivata da
    // un'altra finestra con una domanda ancora senza risposta, e questa
    // riprende il filo dal punto in cui l'altra l'ha lasciato.
    if (typeof busta.segui === 'number' && typeof busta.id === 'number') {
      seguiGiro(busta as SeguiConversazione, (risposta) => this.invia(risposta))
      return
    }

    // La dettatura: la finestra staccata ha lo stesso microfono del riquadro,
    // e la stessa busta. Vedi `panels/transcription.ts`.
    if (typeof busta.id === 'number' && busta.campioni) {
      void rispondiDettatura(busta as Dettatura, (risposta) => this.invia(risposta))
      return
    }

    if (typeof busta.id === 'number' && Array.isArray(busta.storia)) {
      // `'finestra'`: è così che l'host sa poi **di chi** è il giro da mettere
      // da parte, invece di sospendere quello del riquadro perché è il più
      // recente. Vedi `sospendiGiroInCorso`.
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
      titolo: 'Assistente',
      classe: 'assistente-finestra',
    })
  }

  private smaltisci (): void {
    PannelloAssistente.istanza = null
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
    // L'annuncio **dopo** aver azzerato l'istanza: chi ascolta legge
    // `staccato` da `PannelloAssistente.aperta`, e annunciando prima si
    // sentirebbe dire che la finestra è ancora aperta mentre si sta chiudendo
    // — cioè il riquadro resterebbe da parte per sempre.
    annuncia()
  }
}
