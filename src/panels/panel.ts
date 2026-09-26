// Il pannello del registro: un'istanza sola, perché due copie dello stesso
// stato si contraddirebbero; `mostra` riporta davanti quella che c'è.

import * as apparato from 'apparato'
import { alCambioDocumenti, documentiNoti } from '../environment/documents.js'
import { vociImpostazioni } from '../environment/settings.js'
import { archiviPresenti, esportazioniPresenti } from '../data/filing.js'
import { composizioniPresenti } from '../data/compositions.js'
import { ESTENSIONE, percorsoPacchetto, èProvvisorio } from '../data/paths.js'

import { azioneValida, esegui } from '../actions.js'
import { registraAvanzamentoScarico } from '../actions/llm.js'
// Le procedure le registra già `actions.js` (via `gestoriDelleProcedure()`):
// qui non si importa l'indice.
import { chiama, procedura } from '../api/core.js'
import type { Archivio } from '../data/archive.js'
import { ocrAttivo } from '../data/ocr.js'
import { collegatoNoto, conto as contoExchange } from '../data/exchange.js'
import { invioDiretto, mittente as mittentePosta } from '../data/mail.js'
import { smistatoreDi } from '../data/sorter.js'
import { riferimentiRotti } from '../domain/integrity.js'
import { versionePiuRecente } from '../domain/upgrades.js'
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
import { testi } from './panels.testi.js'

/** Nome del programma, solo nella barra quando non c'è un anno aperto. */
// testo-fisso: il marchio, lo stesso in tutte le lingue
const NOME_PROGRAMMA = 'Regiclass'

/** L'estensione del documento in fondo a un nome, senza distinguere maiuscole. */
const ESTENSIONE_FINALE = new RegExp(`${ESTENSIONE.replace('.', '\\.')}$`, 'i')

/**
 * Titolo della finestra, «2026-2027 — Regiclass»: il nome del file senza
 * estensione viene prima, perché la barra delle applicazioni taglia a destra.
 */
function titoloFinestra (percorso: string | null): string {
  const nome = percorso?.split(/[\\/]/).filter(Boolean).pop()?.replace(ESTENSIONE_FINALE, '')
  if (!nome) return NOME_PROGRAMMA
  return `${nome}${èProvvisorio() ? testi().nonSalvato : ''} — ${NOME_PROGRAMMA}`
}

/**
 * Per azione, i campi che sono il valore scritto: nella chiave del gesto entra
 * solo il loro nome, così le battute sullo stesso campo si fondono. Gli altri
 * campi dicono *dove* si scrive ed entrano col valore; un'azione assente qui
 * non si fonde mai.
 */
const CAMPI_SCRITTI: Partial<Record<Richiesta['azione']['tipo'], readonly string[]>> = {
  'lezione.testi': ['argomenti', 'materiali', 'consuntivo'],
  'lezione.stato': ['stato'],
  'anno.settimana': ['lettera'],
  'presenze.ud': ['stato'],
  'presenze.riga': ['stato'],
  'presenze.colonna': ['stato'],
  'presenze.tutti': ['stato'],
  'presenze.campi': ['minuti', 'nota'],
  'avanzamento.imposta': ['stato', 'nota'],
  'voto.imposta': ['valore', 'assente', 'nota'],
  'voto.riconsegna': ['il'],
  'valutazione.riconsegna': ['il'],
  'consegna.spunta': ['fatta'],
  'consegna.spuntaTutti': ['fatta'],
  'consegna.consegnato': ['fatta'],
  'comunicazione.spunta': ['spedita'],
  'assenze.spunta': ['spedita'],
  'check.data': ['data'],
  'programma.salva': ['valore'],
}

/** Oltre questa lunghezza un valore non è un bersaglio ma un testo: non si fonde. */
const VALORE_MASSIMO = 200

/**
 * Chiave del gesto per la storia: tipo dell'azione più bersaglio. Due gesti
 * consecutivi con la stessa chiave si annullano insieme.
 * Degli oggetti conta gli id un livello sotto; un oggetto senza id o un elenco
 * non dice il bersaglio, e allora non si fonde (`undefined`).
 */
export function chiaveDelGesto (azione: Richiesta['azione']): string | undefined {
  const èId = (campo: string) => campo === 'id' || campo.endsWith('Id')
  const scritti = CAMPI_SCRITTI[azione.tipo] ?? []
  const parti: string[] = [azione.tipo]
  for (const [campo, valore] of Object.entries(azione)) {
    if (campo === 'tipo' || valore === undefined) continue
    if (scritti.includes(campo)) {
      parti.push(campo)
      continue
    }
    if (valore === null || typeof valore !== 'object') {
      const testo = JSON.stringify(valore)
      if (testo.length > VALORE_MASSIMO) return undefined
      parti.push(`${campo}=${testo}`)
      continue
    }
    if (Array.isArray(valore)) return undefined
    const dentro = Object.entries(valore as Record<string, unknown>)
      .filter(([sotto, id]) => typeof id === 'string' && èId(sotto))
      .map(([sotto, id]) => `${campo}.${sotto}=${String(id)}`)
    if (dentro.length === 0) return undefined
    parti.push(...dentro)
  }
  return parti.join('|')
}

export class PannelloRegistro {
  private static istanza: PannelloRegistro | null = null
  /** Testi delle finestre di errore di sistema ancora aperte (vedi `avvisa`). */
  private static readonly finestreDiErrore = new Set<string>()

  private readonly smaltibili: apparato.Smaltitore[] = []
  /** Navigazione chiesta prima che il webview fosse pronto ad ascoltare. */
  private navigazioneInAttesa: MessaggioNavigazione | null = null
  private pronto = false
  /**
   * Coda delle richieste, una alla volta. Non doppia quella di `chiama()`: questa
   * serializza anche le spinte di stato dopo la risposta, che il nucleo non fa,
   * così la pagina non riceve stati incrociati.
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
      // Anche le modifiche arrivate da fuori (un file cambiato a mano).
      this.archivio.alCambiamento(() => this.spingiStato()),
      // La storia cambia anche senza dati nuovi, e i pulsanti ↶ ↷ devono saperlo.
      this.archivio.alCambioStoria(() => this.spingiStato()),
      alCambioDocumenti(() => this.spingiStato()),
      // Ogni impostazione del programma torna alla pagina col valore vero
      // (corretto, normalizzato o rifiutato), non come la si è premuta.
      apparato.impostazioni.alCambio((evento) => {
        if (evento.affectsConfiguration('registroDocenti')) this.spingiStato()
      }),
      // Stato della proiezione, anche quando la si chiude dalla sua finestra.
      allaProiezione((stato) => this.invia(stato)),
      // Dov'è l'assistente (riquadro o finestra), per farsi da parte e
      // riprendersi la conversazione quando la finestra si chiude.
      allAssistente((stato) => this.invia(stato)),
      // Avanzamento dello scarico di un modello (gigabyte, minuti). Si iscrive
      // il pannello: un'azione non chiama i pannelli.
      registraAvanzamentoScarico((avanzamento) =>
        this.invia({ tipo: 'scarico', ...avanzamento }),
      ),
      // Stato degli aggiornamenti del programma, per la sezione impostazioni.
      apparato.aggiornamenti.alCambio((stato) => this.invia({ tipo: 'aggiornamenti', stato })),
      // Avanzamento della lettura delle scansioni: lunga, con una coda.
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
      // testo-fisso: il marchio non si traduce
      'Regiclass',
      apparato.ViewColumn.One,
      {
        enableScripts: true,
        // Nascosto non si ricostruisce: si perderebbero i moduli a metà.
        retainContextWhenHidden: true,
        // Anche la cartella dei dati: immagini dei piani lezione.
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
   * Aspetta le richieste della pagina già in corso, perché `spegni()` non chiuda
   * il pacchetto sotto una scrittura. Non ferma niente.
   */
  static attendiScritture (): Promise<void> {
    const coda = PannelloRegistro.istanza?.coda
    return coda ? coda.then(() => undefined, () => undefined) : Promise.resolve()
  }

  /**
   * Da chiamare quando si apre un altro documento: aggiorna i
   * `localResourceRoots`, sennò le immagini del nuovo anno restano fuori.
   */
  static aggiornaRisorse (): void {
    PannelloRegistro.istanza?.aggiornaRisorse()
    // Anche la proiezione mostra le immagini dei piani.
    PannelloProiezione.aggiornaRisorse()
  }

  /**
   * Notifica di errore: nel webview se il pannello è aperto, altrimenti in una
   * finestra di sistema, mai due uguali insieme (un salvataggio fallito riprova
   * e ridice l'errore). Un anno di una versione più recente va sempre in
   * finestra, che offre di aggiornare.
   */
  static avvisa (testo: string): void {
    if (PannelloRegistro.istanza && !versionePiuRecente(testo)) {
      PannelloRegistro.istanza.invia({ tipo: 'notifica', livello: 'errore', testo })
      return
    }
    if (PannelloRegistro.finestreDiErrore.has(testo)) return
    PannelloRegistro.finestreDiErrore.add(testo)
    // testo-fisso: il marchio non si traduce
    void apparato.dialoghi.errore(`Regiclass: ${testo}`).finally(() => {
      PannelloRegistro.finestreDiErrore.delete(testo)
    })
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

    // Il riquadro riprende il giro che la finestra staccata aspettava (`conversation.ts`).
    if (typeof busta.segui === 'number') {
      seguiGiro(busta as SeguiConversazione, (risposta) => this.invia(risposta))
      return
    }

    // Dettatura: fuori dalla coda, non tocca l'archivio (`transcription.ts`).
    if (busta.campioni) {
      void rispondiDettatura(busta as Dettatura, (risposta) => this.invia(risposta))
      return
    }

    // Conversazione: fuori dalla coda, perché un giro dura decine di secondi.
    // Che non scriva lo garantisce `api/transports/assistant.ts`.
    if (Array.isArray(busta.storia)) {
      void this.assisti(busta as Conversazione)
      return
    }

    // Domanda: fuori dalla coda, per non attendere scritture lunghe. Che non
    // scriva lo garantisce `rispondiDomanda`.
    if (typeof busta.procedura === 'string') {
      void this.rispondiDomanda(busta as Domanda)
      return
    }

    const richiesta = busta as Richiesta
    if (!richiesta.azione) return

    // `stato.leggi` dice «pagina in piedi»; può arrivare più volte nella vita
    // del pannello (pagina ricaricata), e ogni volta si riconsegna tutto.
    if (richiesta.azione.tipo === 'stato.leggi') {
      this.pronto = true
      // Stato subito, senza aspettare la coda: la spinta della scrittura in
      // corso arriva dopo ed è la più nuova.
      this.spingiStato()
      this.flushStato()
      // Anche proiezione e assistente, sennò un webview ricostruito li vede spenti.
      this.invia(statoProiezione())
      this.invia(statoAssistente())
      if (this.navigazioneInAttesa) {
        const inAttesa = this.navigazioneInAttesa
        this.navigazioneInAttesa = null
        setTimeout(() => this.invia(inAttesa), 0)
      }
    }

    // In coda, una alla volta; un errore non ferma le successive.
    this.coda = this.coda.then(() => this.eseguiRichiesta(richiesta)).catch(() => undefined)
  }

  /** Porta una domanda all'assistente (`conversation.ts`, comune alle due finestre). */
  private assisti (conversazione: Conversazione): Promise<void> {
    // Origine esplicita: decide quale giro mettere da parte quando una pagina si stacca.
    return rispondiConversazione(this.archivio, conversazione, (messaggio) =>
      this.invia(messaggio), 'riquadro',
    )
  }

  /**
   * Risponde a una domanda di sola lettura. Rifiuta le procedure di scrittura,
   * che sennò salterebbero la coda.
   */
  private async rispondiDomanda (domanda: Domanda): Promise<void> {
    const dichiarata = procedura(domanda.procedura)
    if (dichiarata && dichiarata.genere !== 'lettura') {
      this.invia({
        tipo: 'riscontro',
        id: domanda.id,
        ok: false,
        codice: 'rifiutato',
        errori: [testi().scrive(domanda.procedura)],
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
        // Per TypeScript qui il tipo è `never`, ma dalla pagina arriva JSON
        // qualunque: `String(...)` lo scrive com'è.
        errori: [testi().azioneSconosciuta(String(richiesta.azione.tipo))],
      })
      return
    }

    try {
      // Un gesto, un passo della storia. Annulla e ripristina no: in un passo
      // svuoterebbero la pila del ripristino.
      const azione = richiesta.azione
      const esito = azione.tipo === 'storia.annulla' || azione.tipo === 'storia.ripristina'
        ? await esegui(this.archivio, azione)
        : await this.archivio.inUnPasso(() => esegui(this.archivio, azione), chiaveDelGesto(azione))
      // Lo stato prima della risposta: la pagina ridisegna appena la risposta
      // arriva. `invariato` (azione che non tocca i dati) non rispinge nulla.
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
      // Solo nella risposta: lo mostra chi ha chiesto (`ui/bridge.ts`), niente `avvisa`.
      const testo = errore instanceof Error ? errore.message : String(errore)
      this.invia({ tipo: 'risposta', id: richiesta.id, ok: false, errori: [testo] })
    }
  }

  /**
   * Segna il registro cambiato; più scritture della stessa azione diventano
   * una spinta sola, nella microtask.
   */
  private spingiStato (): void {
    if (this.spintaInSospeso) return
    this.spintaInSospeso = true
    queueMicrotask(() => this.flushStato())
  }

  /** La spinta vera e propria; si chiama subito quando deve precedere altro. */
  private flushStato (): void {
    if (!this.spintaInSospeso) return
    this.spintaInSospeso = false
    const cartella = radiceRisorse()
    const corrente = percorsoPacchetto()?.fsPath ?? null
    // Titolo della finestra, per la barra delle applicazioni e Alt+Tab.
    this.pannello.title = titoloFinestra(corrente)
    this.invia({
      tipo: 'stato',
      registro: this.archivio.registro,
      storia: this.archivio.contiStoria,
      documenti: { corrente, provvisorio: èProvvisorio(), elenco: documentiNoti(corrente) },
      esportati: esportazioniPresenti(),
      archiviati: archiviPresenti(),
      composizioni: composizioniPresenti(),
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
      // testo-fisso: il marchio non si traduce
      titolo: 'Regiclass',
      classe: 'app',
    })
  }

  private smaltisci (): void {
    PannelloRegistro.istanza = null
    // Assistente staccato e proiezione dipendono da questo pannello: si chiudono con lui.
    PannelloAssistente.chiudi()
    PannelloProiezione.chiudi()
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
  }
}
