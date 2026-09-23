// Il pannello del registro: un webview solo, riusato.
//
// Aprire il registro due volte non ha senso — sono gli stessi dati, e due copie
// dello stesso stato si contraddicono appena una delle due salva. Qui c'è
// un'istanza sola: la seconda chiamata a `mostra` porta in primo piano quella
// che c'è già.

import * as apparato from 'apparato'
import { alCambioDocumenti, documentiNoti } from '../environment/documents.js'
import { vociImpostazioni } from '../environment/settings.js'
import { archiviPresenti, esportazioniPresenti } from '../data/filing.js'
import { composizioniPresenti } from '../data/compositions.js'
import { inventarioModelli } from '../data/templates.js'
import { nomeDocumento, percorsoPacchetto } from '../data/paths.js'

import { azioneValida, esegui } from '../actions.js'
import { registraAvanzamentoScarico } from '../actions/llm.js'
// Le procedure sono già nell'elenco: `azioni.js`, qui sopra, sparge
// `gestoriDelleProcedure()`, che le registra. Importare anche l'indice da qui
// vorrebbe dire due strade per la stessa cosa, e una delle due prima o poi
// resta indietro.
import { chiama, procedura } from '../api/core.js'
import type { Archivio } from '../data/archive.js'
import { ocrAttivo } from '../data/ocr.js'
import { collegatoNoto, conto as contoExchange } from '../data/exchange.js'
import { invioDiretto, mittente as mittentePosta } from '../data/mail.js'
import { smistatoreDi } from '../data/sorter.js'
import { riferimentiRotti } from '../domain/validation.js'
import { allAssistente, PannelloAssistente, seguiGiro, statoAssistente } from './assistant.js'
import { rispondiConversazione } from './conversation.js'
import { rispondiDettatura } from './transcription.js'
import { allaProiezione, PannelloProiezione, statoProiezione } from './projection.js'
import type {
  Conversazione,
  Dettatura,
  Domanda,
  MessaggioNavigazione,
  MessaggioVersoWebview,
  Richiesta,
  SeguiConversazione,
} from '../protocol.js'
import { paginaHtml, radiceRisorse, radiciDellaPagina } from './page.js'

/** Il nome del programma: quel che resta nella barra quando non c'è un anno aperto. */
const NOME_PROGRAMMA = 'Registro docenti'

/**
 * Come si chiama la finestra: «2026-2027 — Registro docenti».
 *
 * L'ordine è quello di ogni programma che apre documenti — prima il documento,
 * poi chi lo apre — e non è un vezzo: nella barra delle applicazioni i titoli
 * si tagliano a destra, e due registri aperti su due anni diversi si
 * distinguono solo se il nome dell'anno viene per primo.
 */
function titoloFinestra (percorso: string | null): string {
  const nome = percorso ? nomeDocumento() : null
  return nome ? `${nome} — ${NOME_PROGRAMMA}` : NOME_PROGRAMMA
}

export class PannelloRegistro {
  private static istanza: PannelloRegistro | null = null

  private readonly smaltibili: apparato.Smaltitore[] = []
  /** Navigazione chiesta prima che il webview fosse pronto ad ascoltare. */
  private navigazioneInAttesa: MessaggioNavigazione | null = null
  private pronto = false
  /**
   * Le richieste si eseguono una dopo l'altra: mai due insieme sullo stesso
   * registro.
   *
   * **Resta anche adesso che `chiama()` ha una fila sua**, e non è un doppione.
   * Quella del nucleo serializza le *scritture*; questa serializza l'intero
   * `eseguiRichiesta`, cioè anche le due righe che vengono dopo — `spingiStato()`
   * e `flushStato()`, che serializzano l'ordine con cui il registro arriva alla
   * pagina. Il nucleo quelle non le conosce e non deve conoscerle: «il nucleo
   * non spinge lo stato», dice ADR-27, perché una riga di comando che corregge
   * un voto non ha un webview da aggiornare. Senza questa coda due risposte
   * potrebbero arrivare con le spinte di stato incrociate, e la pagina
   * ridisegnerebbe l'una con i dati dell'altra.
   *
   * **Si potrà togliere** il giorno in cui la spinta dello stato smette di
   * essere una conseguenza della risposta — cioè quando la pagina si aggiorna
   * per sottoscrizione a `archivio.alCambiamento` con un numero di revisione
   * che le permetta di scartare da sé quel che arriva in ritardo. Da lì in poi
   * l'ordine delle spinte non sarà più una cosa da garantire qui.
   */
  private coda: Promise<void> = Promise.resolve()
  /** Una spinta dello stato è già in coda: non se ne accoda una seconda. */
  private spintaInSospeso = false

  private constructor (
    private readonly pannello: apparato.WebviewPanel,
    private readonly contesto: apparato.ContestoApplicazione,
    private readonly archivio: Archivio,
  ) {
    this.pannello.webview.html = this.html()

    this.smaltibili.push(
      this.pannello.webview.onDidReceiveMessage((messaggio) => this.gestisci(messaggio)),
      // Ogni modifica dell'archivio — anche quelle che arrivano da fuori, per
      // esempio da un file modificato a mano — si riversa nel webview.
      this.archivio.alCambiamento(() => this.spingiStato()),
      alCambioDocumenti(() => this.spingiStato()),
      // La lettura delle scansioni si accende dalle impostazioni, e
      // il pannello deve accorgersene subito: altrimenti il pulsante continua a
      // proporre di attivarla dopo che è stata attivata.
      // E con lei ogni altra impostazione del programma: la pagina
      // Impostazioni le mostra accanto a quelle del documento, e una spunta
      // premuta lì deve tornare indietro come valore vero — corretto,
      // normalizzato, o rifiutato — e non come la si è premuta.
      apparato.impostazioni.alCambio((evento) => {
        if (evento.affectsConfiguration('registroDocenti')) this.spingiStato()
      }),
      // L'avanzamento della lettura arriva a parte, e spesso: una pagina di
      // scansione impiega decine di secondi, e per tutto quel tempo il pannello
      // deve poter dire che cosa sta macinando e che cosa aspetta in coda.
      // Com'è messa la proiezione: i suoi comandi stanno qui, nel pannello del
      // docente, e devono raccontare quel che sta davvero sullo schermo grande
      // — anche quando è stato chiuso dalla sua finestra, chiudendo la scheda.
      allaProiezione((stato) => this.invia(stato)),
      // Dov'è l'assistente: nel riquadro, o in una finestra sua. Il pannello
      // deve saperlo per farsi da parte — e per riprendersi la conversazione
      // quando la finestra la riconsegna chiudendosi.
      allAssistente((stato) => this.invia(stato)),
      // Lo scarico di un modello del linguaggio: quattro gigabyte su una linea
      // di scuola sono venti minuti, e venti minuti senza un numero che si
      // muove sono venti minuti in cui chi guarda chiude la finestra convinto
      // che si sia piantato. Si iscrive il pannello e non lo sa `actions/llm.ts`,
      // per la ragione scritta là: da un'azione non si esce verso i pannelli.
      registraAvanzamentoScarico((avanzamento) =>
        this.invia({ tipo: 'scarico', ...avanzamento }),
      ),
      smistatoreDi(this.archivio).allAvanzamento((avanzamento) =>
        this.invia({
          tipo: 'lavoro',
          corrente: avanzamento.corrente,
          fatte: avanzamento.fatte,
          totale: avanzamento.totale,
          coda: avanzamento.coda,
        }),
      ),
    )

    this.pannello.onDidDispose(() => this.smaltisci(), null, this.smaltibili)
  }

  /** Apre il registro, o lo riporta davanti se è già aperto. */
  static mostra (
    contesto: apparato.ContestoApplicazione,
    archivio: Archivio,
    navigazione?: MessaggioNavigazione,
  ): PannelloRegistro {
    if (PannelloRegistro.istanza) {
      PannelloRegistro.istanza.pannello.reveal(apparato.ViewColumn.One)
      if (navigazione) PannelloRegistro.istanza.naviga(navigazione)
      return PannelloRegistro.istanza
    }

    const pannello = apparato.finestre.crea(
      'registroDocenti.pannello',
      'Registro',
      apparato.ViewColumn.One,
      {
        enableScripts: true,
        // Il registro è pieno di moduli a metà compilazione: ricostruire tutto
        // ogni volta che si guarda un altro file farebbe perdere il lavoro.
        retainContextWhenHidden: true,
        // Oltre al proprio codice, il pannello deve poter mostrare le immagini
        // che stanno nella cartella dei dati: sono risorse dei piani lezione.
        localResourceRoots: radiciDellaPagina(contesto.extensionUri),
      },
    )
    pannello.iconPath = apparato.Uri.joinPath(contesto.extensionUri, 'resources', 'registro.svg')

    PannelloRegistro.istanza = new PannelloRegistro(pannello, contesto, archivio)
    if (navigazione) PannelloRegistro.istanza.naviga(navigazione)
    return PannelloRegistro.istanza
  }

  static get aperto (): boolean {
    return PannelloRegistro.istanza !== null
  }

  static chiudi (): void {
    PannelloRegistro.istanza?.pannello.dispose()
  }

  /**
   * Aspetta le richieste della pagina già cominciate. Per `spegni()`.
   *
   * Lo spegnimento aspettava il condotto e l'archivio, e non questa coda: una
   * richiesta partita dal pannello un istante prima di «Esci» proseguiva mentre
   * l'archivio si consegnava al disco, e quel che scriveva finiva in un
   * pacchetto già chiuso. Chi aveva premuto aveva visto la spunta.
   *
   * Non ferma niente e non ha bisogno di farlo: quel che arriva dopo trova la
   * finestra già chiusa, e quel che è in volo qui dentro è roba di secondi.
   */
  static attendiScritture (): Promise<void> {
    const coda = PannelloRegistro.istanza?.coda
    return coda ? coda.then(() => undefined, () => undefined) : Promise.resolve()
  }

  /**
   * Da chiamare quando si apre un altro documento: se il pannello era già
   * aperto, tiene i `localResourceRoots` della cartella dell'anno di prima, e
   * le immagini dei piani della classe appena caricata risulterebbero fuori
   * dalla sandbox concessa al webview.
   */
  static aggiornaRisorse (): void {
    PannelloRegistro.istanza?.aggiornaRisorse()
    // Anche lo schermo per la classe mostra le immagini dei piani: se resta con
    // la sandbox della cartella di prima, la scaletta proiettata perde le
    // figure proprio mentre la classe la sta guardando.
    PannelloProiezione.aggiornaRisorse()
  }

  /**
   * Una notifica di errore, mostrata una volta sola: nel webview se il
   * pannello è aperto — dove il resto delle notifiche del registro compare
   * già — altrimenti con una finestra di sistema, che è l'unico posto in cui
   * chi non ha ancora aperto il registro può vederla.
   */
  static avvisa (testo: string): void {
    if (PannelloRegistro.istanza) {
      PannelloRegistro.istanza.invia({ tipo: 'notifica', livello: 'errore', testo })
    } else {
      void apparato.dialoghi.errore(`Registro: ${testo}`)
    }
  }

  naviga (messaggio: MessaggioNavigazione): void {
    if (this.pronto) this.invia(messaggio)
    else this.navigazioneInAttesa = messaggio
  }

  private aggiornaRisorse (): void {
    this.pannello.webview.options = {
      ...this.pannello.webview.options,
      localResourceRoots: radiciDellaPagina(this.contesto.extensionUri),
    }
  }

  // ---------------------------------------------------------------- messaggi

  private gestisci (messaggio: unknown): void {
    const busta = messaggio as Partial<Richiesta> &
      Partial<Domanda> &
      Partial<Conversazione> &
      Partial<Dettatura> &
      Partial<SeguiConversazione>
    if (!busta || typeof busta.id !== 'number') return

    // Il giro che la finestra staccata stava aspettando quando ha riattaccato:
    // il riquadro lo riprende da dove era rimasto, invece di far ribattere una
    // domanda a cui il modello sta ancora rispondendo. Vedi
    // `panels/conversation.ts`.
    if (typeof busta.segui === 'number') {
      seguiGiro(busta as SeguiConversazione, (risposta) => this.invia(risposta))
      return
    }

    // La dettatura: fuori dalla coda come le domande, e senza toccare
    // l'archivio in nessun punto — di qui passa della voce, e torna del testo
    // che chi ha parlato deve ancora rileggere. Vedi `panels/transcription.ts`.
    if (busta.campioni) {
      void rispondiDettatura(busta as Dettatura, (risposta) => this.invia(risposta))
      return
    }

    // La conversazione con l'assistente: fuori dalla coda come le domande, e
    // per una ragione in più — un giro dura decine di secondi, e in fila davanti
    // alle scritture terrebbe fermo il registro per tutto quel tempo. Che non
    // possa scrivere non lo garantisce questa riga: lo garantisce
    // `api/transports/assistant.ts`, che ricontrolla il genere di ogni
    // procedura prima di chiamarla.
    if (Array.isArray(busta.storia)) {
      void this.assisti(busta as Conversazione)
      return
    }

    // Una domanda non entra nella coda delle scritture: è sincrona sul
    // registro in memoria, e metterla in fila dietro la generazione di venti
    // PDF vorrebbe dire una pagina ferma per secondi a disegnare qualcosa che
    // è già lì. Che non possa scrivere non lo garantisce questa riga: lo
    // garantisce `rispondiDomanda`, che rifiuta tutto ciò che non è dichiarato
    // di sola lettura.
    if (typeof busta.procedura === 'string') {
      void this.rispondiDomanda(busta as Domanda)
      return
    }

    const richiesta = busta as Richiesta
    if (!richiesta.azione) return

    // `stato.leggi` è la prima cosa che lo script del webview manda: è il suo
    // modo di dire «sono in piedi». Si guarda l'azione e non «è la prima
    // richiesta che arriva», perché la pagina può ripartire più volte nella vita
    // dello stesso pannello — in sviluppo a ogni salvataggio — e ogni volta ha
    // di nuovo bisogno di quel che le si era consegnato all'inizio.
    if (richiesta.azione.tipo === 'stato.leggi') {
      this.pronto = true
      // Com'è messa la proiezione, subito: ricostruendo il webview — un cambio
      // di tema, una finestra riaperta — i suoi comandi devono ritrovarsi come
      // erano, non spenti mentre lo schermo grande è ancora acceso.
      this.invia(statoProiezione())
      this.invia(statoAssistente())
      if (this.navigazioneInAttesa) {
        const inAttesa = this.navigazioneInAttesa
        this.navigazioneInAttesa = null
        setTimeout(() => this.invia(inAttesa), 0)
      }
    }

    // In coda, una dopo l'altra: due richieste arrivate vicine — un doppio
    // clic, un salvataggio e una spunta nello stesso istante — non si devono
    // intrecciare sullo stesso registro. Un errore nell'una non deve fermare
    // le altre: la coda continua comunque.
    this.coda = this.coda.then(() => this.eseguiRichiesta(richiesta)).catch(() => undefined)
  }

  /**
   * Porta una domanda all'assistente.
   *
   * Il lavoro sta in `panels/conversation.ts`, una volta per tutte e due le
   * finestre: il riquadro e quella staccata mandano la stessa busta e aspettano
   * gli stessi eventi, e due traduzioni della stessa conversazione avrebbero
   * cominciato a divergere al primo evento nuovo.
   */
  private assisti (conversazione: Conversazione): Promise<void> {
    // L'origine si scrive, non si lascia al valore d'ipotesi: con due pagine
    // che chiedono insieme è il campo su cui si decide **quale** giro mettere
    // da parte quando una delle due si stacca, e un valore taciuto qui si
    // rileggerebbe domani come una svista invece che come una scelta.
    return rispondiConversazione(this.archivio, conversazione, (messaggio) =>
      this.invia(messaggio), 'riquadro',
    )
  }

  /**
   * Risponde a una domanda di sola lettura.
   *
   * Il rifiuto di una procedura di scrittura è il punto per cui questo canale
   * è sicuro da tenere fuori dalla coda: senza, basterebbe il nome giusto in
   * una domanda per scrivere nel registro saltando la serializzazione — e
   * quella coda è la garanzia più forte che il sistema abbia.
   */
  private async rispondiDomanda (domanda: Domanda): Promise<void> {
    const dichiarata = procedura(domanda.procedura)
    if (dichiarata && dichiarata.genere !== 'lettura') {
      this.invia({
        tipo: 'riscontro',
        id: domanda.id,
        ok: false,
        codice: 'rifiutato',
        errori: [`«${domanda.procedura}» scrive: va chiesta come azione, non come domanda.`],
      })
      return
    }
    const esito = await chiama(this.archivio, domanda.procedura, domanda.ingresso ?? {}, {
      origine: 'pannello',
    })
    this.invia(
      esito.ok
        ? { tipo: 'riscontro', id: domanda.id, ok: true, dati: esito.dati }
        : {
            tipo: 'riscontro',
            id: domanda.id,
            ok: false,
            codice: esito.codice,
            errori: esito.messaggi,
          },
    )
  }

  private async eseguiRichiesta (richiesta: Richiesta): Promise<void> {
    if (!azioneValida(richiesta.azione.tipo)) {
      this.invia({
        tipo: 'risposta',
        id: richiesta.id,
        ok: false,
        // `String(...)`: qui dentro TypeScript ha gia' dimostrato che il tipo e'
        // `never` — `azioneValida` le riconosce tutte, e questo e' il ramo del
        // "nessuna delle precedenti". Il ramo pero' serve lo stesso: dall'altra
        // parte del ponte c'e' una pagina, e quel che arriva di li' e' JSON, non
        // un tipo. A tempo di esecuzione `tipo` e' una stringa qualunque, ed e'
        // proprio quella che va scritta nel messaggio.
        errori: [`Azione sconosciuta: «${String(richiesta.azione.tipo)}».`],
      })
      return
    }

    try {
      const esito = await esegui(this.archivio, richiesta.azione)
      // Lo stato prima della risposta: il webview ridisegna nella microtask
      // con cui la risposta risolve la sua promessa, e a quel punto deve
      // trovare già il registro aggiornato — non quello di un attimo prima.
      // `invariato` è un'azione riuscita che non ha toccato i dati — dove
      // guardare, che cosa proiettare: rispingere il registro intero per una
      // cosa che nel registro non c'è sarebbe lavoro fatto per niente, e ne
      // arriva una a ogni gesto.
      if (esito.ok && !esito.invariato) {
        this.spingiStato()
        this.flushStato()
      }
      this.invia({
        tipo: 'risposta',
        id: richiesta.id,
        ok: esito.ok,
        errori: esito.errori,
        codice: esito.codice,
        tracciato: esito.tracciato,
        creato: esito.creato,
        documento: esito.documento,
        messaggio: esito.messaggio,
      })
    } catch (errore) {
      const testo = errore instanceof Error ? errore.message : String(errore)
      this.invia({ tipo: 'risposta', id: richiesta.id, ok: false, errori: [testo] })
      PannelloRegistro.avvisa(testo)
    }
  }

  /**
   * Segna il registro cambiato. Una singola azione può scrivere più volte —
   * una spedizione per allievo, ognuna con la sua `archivio.modifica` — e
   * ognuna fa scattare `alCambiamento`: senza questo cancelletto finirebbero
   * per serializzare e spedire il registro una volta a scrittura invece che
   * una sola, alla fine.
   */
  private spingiStato (): void {
    if (this.spintaInSospeso) return
    this.spintaInSospeso = true
    queueMicrotask(() => this.flushStato())
  }

  /** La spinta vera e propria: la si chiama subito quando serve prima di un'altra cosa. */
  private flushStato (): void {
    if (!this.spintaInSospeso) return
    this.spintaInSospeso = false
    const cartella = radiceRisorse()
    const corrente = percorsoPacchetto()?.fsPath ?? null
    // Il nome del documento nella barra del titolo della finestra: è quel che
    // si legge nella barra delle applicazioni e in Alt+Tab, dove di «Registro
    // docenti» aperti possono essercene due su due anni diversi. Dentro la
    // finestra lo dice la barra che la pagina si disegna da sé — questo è per
    // chi la guarda da fuori.
    this.pannello.title = titoloFinestra(corrente)
    this.invia({
      tipo: 'stato',
      registro: this.archivio.registro,
      documenti: { corrente, elenco: documentiNoti(corrente) },
      esportati: esportazioniPresenti(),
      archiviati: archiviPresenti(),
      composizioni: composizioniPresenti(),
      // Quel che c'è in `templates/`, com'era all'ultimo giro: lo rilegge chi
      // tocca quella cartella e chi apre il pannello, non ogni spinta di stato
      // — sarebbe una lettura di cartella per ogni voto salvato.
      modelli: [...inventarioModelli()],
      avvisi: riferimentiRotti(this.archivio.registro),
      radiceDati: cartella ? this.pannello.webview.asWebviewUri(cartella).toString() : null,
      radiceApp: this.pannello.webview.asWebviewUri(this.contesto.extensionUri).toString(),
      ocrAttivo: ocrAttivo(),
      programma: vociImpostazioni(),
      posta: {
        exchange: collegatoNoto(),
        server: contoExchange().server,
        invioDiretto: invioDiretto(),
        mittente: mittentePosta(),
        accesso: contoExchange().utente,
      },
    })
  }

  private invia (messaggio: MessaggioVersoWebview): void {
    void this.pannello.webview.postMessage(messaggio)
  }

  // ---------------------------------------------------------------- pagina

  private html (): string {
    return paginaHtml({
      webview: this.pannello.webview,
      radiceApp: this.contesto.extensionUri,
      bundle: 'panel',
      titolo: 'Registro',
      classe: 'app',
    })
  }

  private smaltisci (): void {
    PannelloRegistro.istanza = null
    // Con il registro se ne va anche l'assistente staccato: da solo resterebbe
    // una finestra che sa rispondere su un documento che nessuno tiene più
    // aperto — e le sue risposte verrebbero da un archivio in chiusura.
    PannelloAssistente.chiudi()
    // Chiudendo il registro si chiude anche lo schermo per la classe: da solo
    // resterebbe acceso su un'ora che nessuno può più cambiare, e i suoi
    // comandi stanno tutti in questa finestra.
    PannelloProiezione.chiudi()
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
  }
}
