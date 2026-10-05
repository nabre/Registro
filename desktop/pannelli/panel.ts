// Il pannello del registro, in una o più finestre: la principale e le figlie,
// per guardare e lavorare su parti diverse dell'anno su più schermi. Ognuna ha
// la sua pagina e la sua navigazione; i dati sono uno solo, dell'archivio, e
// ogni scrittura passa da una coda sola per tutte, in ordine. Le figlie
// dipendono dalla principale: si chiudono con lei e con il documento.

import * as apparato from 'apparato'
import { alCambioDocumenti, documentiNoti } from '#desktop/apparato/documents.js'
import { vociImpostazioni } from '#desktop/apparato/settings.js'
import { archiviPresenti, esportazioniPresenti } from '#core/dati/filing.js'
import { ESTENSIONE, percorsoPacchetto, èProvvisorio } from '#core/dati/paths.js'

import { azioneValida, esegui } from '#contract/switchboard.js'
import { registraAvanzamentoScarico } from '#core/azioni/llm.js'
// Le procedure le registra già `actions.js` (via `gestoriDelleProcedure()`):
// qui non si importa l'indice.
import { chiama, procedura } from '#contract/core.js'
import type { Archivio } from '#core/dati/archive.js'
import { ocrAttivo } from '#core/dati/ocr.js'
import { collegamento, prontezza, type Uso } from '#core/dati/llm.js'
import { collegatoNoto, conto as contoExchange } from '#core/dati/exchange.js'
import { invioDiretto, mittente as mittentePosta } from '#core/dati/mail.js'
import { accountMicrosoft, cambiAccount } from '#core/dati/microsoft.js'
import { indirizziPosta, interrompiAccesso } from '#core/dati/oauth.js'
import { smistatoreDi } from '#core/dati/sorter.js'
import { riferimentiRotti } from '#core/dominio/integrity.js'
import { ErroreVersionePiuRecente, versionePiuRecente } from '#core/dominio/upgrades.js'
import { allAssistente, PannelloAssistente, seguiGiro, statoAssistente } from './assistant.js'
import { rispondiConversazione } from './conversation.js'
import { rispondiDettatura } from './transcription.js'
import { allaProiezione, PannelloProiezione, statoProiezione } from './projection.js'
import type {
  ChiestaStatoIntero,
  Conversazione,
  Dettatura,
  Domanda,
  ContestoDellaFinestra,
  MessaggioNavigazione,
  MessaggioVai,
  MessaggioVersoWebview,
  PaginaDellaFinestra,
  PatchRegistro,
  PostoDellaFinestra,
  Richiesta,
  SeguiConversazione,
  VoceProgramma,
} from '#contract/protocol.js'
import type { Registro } from '#core/dominio/models.js'
import { alCambioLingua, lingua } from '#core/i18n/index.js'
import { NUMERO_PRINCIPALE, tipoDelRegistro } from '#desktop/apparato/panelTypes.js'
import { paginaHtml, radiceRisorse, radiciDellaPagina } from './page.js'
import { testi } from './panels.testi.js'

/** Nome del programma, solo nella barra quando non c'è un anno aperto. */
// testo-fisso: il marchio, lo stesso in tutte le lingue
const NOME_PROGRAMMA = 'Regiklass'

/** L'estensione del documento in fondo a un nome, senza distinguere maiuscole. */
const ESTENSIONE_FINALE = new RegExp(`${ESTENSIONE.replace('.', '\\.')}$`, 'i')

/** La principale senza figlie: il titolo di sempre. */
const SOLA = { numero: NUMERO_PRINCIPALE, pagina: '', conFiglie: false }

/**
 * Titolo della finestra, «2026-2027 — Regiklass»: il nome del file senza
 * estensione viene prima, perché la barra delle applicazioni taglia a destra.
 * Con figlie aperte la principale lo dice in coda; una figlia mette davanti la
 * pagina che mostra e in coda il suo numero, «Calendario · 2026-2027 —
 * Regiklass [2]», perché Alt+Tab le distingua.
 */
export function titoloFinestra (
  percorso: string | null,
  finestra: { numero: number, pagina: string, conFiglie: boolean } = SOLA,
): string {
  const nome = percorso?.split(/[\\/]/).filter(Boolean).pop()?.replace(ESTENSIONE_FINALE, '')
  const documento = nome
    ? `${nome}${èProvvisorio() ? testi().nonSalvato : ''} — ${NOME_PROGRAMMA}`
    : NOME_PROGRAMMA
  if (finestra.numero === NUMERO_PRINCIPALE) {
    return finestra.conFiglie ? `${documento}${testi().principale}` : documento
  }
  const pagina = finestra.pagina ? `${finestra.pagina} · ` : ''
  return `${pagina}${documento} [${finestra.numero}]`
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

/**
 * Le azioni che aspettano l'accesso nel browser, anche minuti, e non toccano il
 * registro: fuori dalla coda, come le domande, perché chi chiude la scheda del
 * browser non fermi ogni altro gesto. Una nuova interrompe quella che aspetta.
 */
const ACCESSI_DAL_BROWSER: ReadonlySet<string> = new Set<Richiesta['azione']['tipo']>([
  'microsoft.aggiungi',
  'posta.collega',
])

/**
 * L'interruttore per tornare indietro: con `REGISTRO_STATO_INTERO=1` ogni
 * spinta porta il registro intero, come prima delle differenze. Letto a ogni
 * spinta, così una prova lo accende e lo spegne senza rifare il pannello.
 */
function spintaADifferenze (): boolean {
  return process.env.REGISTRO_STATO_INTERO !== '1'
}

/**
 * Le azioni che dicono dove si guarda: lo schermo per la classe e l'assistente
 * seguono una finestra sola, l'ultima del registro che ha preso il fuoco. Le
 * altre le mandano lo stesso (non sanno chi ha il fuoco): l'host le tiene da
 * parte e le esegue quando la loro finestra lo prende.
 */
const DEL_FUOCO: ReadonlySet<string> = new Set<Richiesta['azione']['tipo']>([
  'proiezione.mira',
  'assistente.contesto',
])

/** Quante figlie al più, finché l'impostazione `finestre.massimo` non c'è. */
const MASSIMO_FIGLIE = 4

/**
 * La coda delle scritture, una per tutte le finestre: due gesti da due finestre
 * vanno nell'ordine in cui arrivano, e chi chiude il documento aspetta tutti.
 */
let codaScritture: Promise<void> = Promise.resolve()

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
  /** Le finestre del registro aperte, per numero: la principale è la 1. */
  private static readonly istanze = new Map<number, PannelloRegistro>()
  /** L'ultima finestra del registro che ha preso il fuoco: lo schermo e l'assistente seguono lei. */
  private static numeroColFuoco = NUMERO_PRINCIPALE
  /** Contesto e archivio, dati dalla prima `mostra`: servono a far nascere le figlie. */
  private static ambiente: {
    contesto: apparato.ContestoApplicazione
    archivio: Archivio
  } | null = null
  /** Chi segue le finestre aperte (il menu nativo). */
  private static readonly cambioFinestre = new apparato.EventEmitter<void>()
  /** Testi delle finestre di errore di sistema ancora aperte (vedi `avvisa`). */
  private static readonly finestreDiErrore = new Set<string>()

  private readonly smaltibili: apparato.Smaltitore[] = []
  /** Navigazione chiesta prima che il webview fosse pronto ad ascoltare. */
  private navigazioneInAttesa: MessaggioNavigazione | MessaggioVai | null = null
  private pronto = false
  /** Già smaltito: la cascata lo fa prima che la finestra se ne vada davvero. */
  private smaltito = false
  /** La pagina che la finestra mostra, come la dice lei (`finestra.pagina`). */
  private pagina: PaginaDellaFinestra | null = null
  /** Le ultime mira e contesto mandati, da eseguire quando la finestra prende il fuoco. */
  private readonly daRiprendere = new Map<string, Richiesta['azione']>()

  /**
   * Coda delle richieste, una alla volta e una per tutte le finestre. Non doppia
   * quella di `chiama()`: questa serializza anche le spinte di stato dopo la
   * risposta, che il nucleo non fa, così la pagina non riceve stati incrociati.
   */
  private get coda (): Promise<void> {
    return codaScritture
  }

  private set coda (nuova: Promise<void>) {
    codaScritture = nuova
  }
  /** Una spinta dello stato è già in coda: non se ne accoda una seconda. */
  private spintaInSospeso = false
  /**
   * La revisione del registro che la pagina ha, o `null` se non ne ha uno:
   * le differenze valgono solo a partire da lì.
   */
  private revisioneDellaPagina: number | null = null
  /**
   * La prossima spinta porta il registro intero: alla nascita del pannello, a
   * pagina ricaricata (`stato.leggi`), quando la pagina lo chiede.
   */
  private serveIntero = true
  /**
   * Le patch arrivate dopo l'ultima spinta, in ordine, con la revisione da cui
   * partono e quella a cui portano. Copiate subito: i loro valori sono oggetti
   * dello stato vivo, che la scrittura dopo cambia in posto (`applicaInPosto`).
   */
  private differenze: {
    collezioni: Set<string>
    patch: PatchRegistro[]
    da: number
    a: number
  } | null = null
  /**
   * Quanti cambiamenti e quante differenze dall'ultima spinta. Ogni scrittura e
   * ogni annulla danno l'uno e l'altro; un cambiamento senza differenze è un
   * registro riletto (documento aperto, file cambiato fuori), e va spinto intero.
   */
  private cambiamenti = 0
  private conDifferenze = 0

  private constructor (
    private readonly pannello: apparato.WebviewPanel,
    private readonly contesto: apparato.ContestoApplicazione,
    private readonly archivio: Archivio,
    /** Il numero della finestra: 1 la principale, da 2 le figlie. */
    readonly numero: number = NUMERO_PRINCIPALE,
  ) {
    PannelloRegistro.istanze.set(numero, this)
    this.pannello.webview.html = this.html()

    this.smaltibili.push(
      this.pannello.webview.onDidReceiveMessage((messaggio) => this.gestisci(messaggio)),
      // Anche le modifiche arrivate da fuori (un file cambiato a mano).
      this.archivio.alCambiamento(() => {
        this.cambiamenti += 1
        this.spingiStato()
      }),
      // Scatta subito dopo `alCambiamento`, per le scritture e gli annulla.
      this.archivio.alleDifferenze((differenze) => {
        this.conDifferenze += 1
        // Con l'interruttore la spinta è intera: niente da copiare.
        if (!spintaADifferenze()) return
        const patch = structuredClone(differenze.patch) as PatchRegistro[]
        const a = this.archivio.revisione
        if (this.differenze) {
          this.differenze.patch.push(...patch)
          for (const collezione of differenze.collezioni) this.differenze.collezioni.add(collezione)
          this.differenze.a = a
        } else {
          // Ogni scrittura alza la revisione di uno, prima di dirlo.
          this.differenze = { collezioni: new Set(differenze.collezioni), patch, da: a - 1, a }
        }
      }),
      // La storia cambia anche senza dati nuovi, e i pulsanti ↶ ↷ devono saperlo.
      this.archivio.alCambioStoria(() => this.spingiStato()),
      alCambioDocumenti(() => this.spingiStato()),
      // Ogni impostazione del programma torna alla pagina col valore vero
      // (corretto, normalizzato o rifiutato), non come la si è premuta.
      apparato.impostazioni.alCambio((evento) => {
        if (evento.affectsConfiguration('registroDocenti')) this.spingiStato()
      }),
      new apparato.Smaltitore(alCambioLingua(() => this.spingiStato())),
      // Gli account Microsoft si leggono dal portachiavi dopo l'avvio, e un
      // permesso ritirato li cambia senza che nessuno abbia premuto niente.
      cambiAccount(() => this.spingiStato()),
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
    // Lo schermo per la classe e l'assistente seguono la finestra su cui si lavora.
    const alFuoco = this.pannello.alFuoco?.(() => this.prendeIlFuoco())
    if (alFuoco) this.smaltibili.push(alFuoco)

    this.pannello.onDidDispose(() => this.smaltisci(), null, this.smaltibili)
  }

  /**
   * Apre il registro, o lo riporta davanti se è già aperto. Con più finestre
   * aperte il gesto (un comando, un promemoria, `vista.apri`) va a quella su cui
   * si lavora, l'ultima che ha preso il fuoco.
   */
  static mostra (
    contesto: apparato.ContestoApplicazione,
    archivio: Archivio,
    navigazione?: MessaggioNavigazione,
  ): PannelloRegistro {
    PannelloRegistro.ambiente = { contesto, archivio }
    const principale = PannelloRegistro.istanze.get(NUMERO_PRINCIPALE)
    if (principale) {
      const bersaglio = PannelloRegistro.istanze.get(PannelloRegistro.numeroColFuoco) ?? principale
      bersaglio.pannello.reveal(apparato.ViewColumn.One)
      if (navigazione) bersaglio.naviga(navigazione)
      return bersaglio
    }

    const nata = PannelloRegistro.nasce(NUMERO_PRINCIPALE, contesto, archivio)
    if (navigazione) nata.naviga(navigazione)
    return nata
  }

  /** Una finestra del registro nuova, col suo tipo: posto e memoria sono per tipo. */
  private static nasce (
    numero: number,
    contesto: apparato.ContestoApplicazione,
    archivio: Archivio,
  ): PannelloRegistro {
    const pannello = apparato.finestre.crea(
      tipoDelRegistro(numero),
      // testo-fisso: il marchio non si traduce
      'Regiklass',
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
    const nata = new PannelloRegistro(pannello, contesto, archivio, numero)
    PannelloRegistro.finestreCambiate()
    return nata
  }

  /**
   * Apre una finestra figlia sul posto dato, o su quello della finestra col
   * fuoco (Ctrl+Maiusc+N dal menu nativo, che non sa dove si guarda). Solo con
   * un anno aperto e la principale in piedi. Torna perché non si può, o `null`.
   */
  static apriFiglia (posto?: PostoDellaFinestra, contesto?: ContestoDellaFinestra): string | null {
    const ambiente = PannelloRegistro.ambiente
    if (!ambiente || !PannelloRegistro.aperto || !percorsoPacchetto()) return testi().senzaDocumento
    const figlie = PannelloRegistro.istanze.size - 1
    if (figlie >= MASSIMO_FIGLIE) return testi().troppeFinestre(MASSIMO_FIGLIE)
    // Il numero più basso libero: chiusa la 2, la prossima torna a essere la 2.
    let numero = NUMERO_PRINCIPALE + 1
    while (PannelloRegistro.istanze.has(numero)) numero += 1
    const da = PannelloRegistro.istanze.get(PannelloRegistro.numeroColFuoco)?.pagina
    const dove = posto
      ? { posto, ...(contesto ? { contesto } : {}) }
      : da ? { posto: da.posto, contesto: da.contesto } : null
    const figlia = PannelloRegistro.nasce(numero, ambiente.contesto, ambiente.archivio)
    if (dove) figlia.naviga({ tipo: 'vai', ...dove })
    return null
  }

  /** Porta davanti la finestra del registro con quel numero; falso se non c'è. */
  static portaDavanti (numero: number): boolean {
    const finestra = PannelloRegistro.istanze.get(numero)
    finestra?.pannello.reveal(apparato.ViewColumn.One)
    return finestra !== undefined
  }

  /** Chiude la figlia con quel numero; la principale no, si chiude dalla sua ✕. */
  static chiudiFiglia (numero: number): boolean {
    if (numero === NUMERO_PRINCIPALE) return false
    const figlia = PannelloRegistro.istanze.get(numero)
    figlia?.pannello.dispose()
    return figlia !== undefined
  }

  /** Le finestre del registro aperte, in ordine di numero, con la pagina che mostrano. */
  static finestre (): Array<{ n: number, titolo: string }> {
    return [...PannelloRegistro.istanze.values()]
      .sort((a, b) => a.numero - b.numero)
      .map((finestra) => ({ n: finestra.numero, titolo: finestra.pagina?.titolo ?? '' }))
  }

  /** Avvisa quando si apre o si chiude una finestra, o una cambia pagina. */
  static alCambioFinestre (ascoltatore: () => void): apparato.Smaltitore {
    return PannelloRegistro.cambioFinestre.event(ascoltatore)
  }

  static get aperto (): boolean {
    return PannelloRegistro.istanze.has(NUMERO_PRINCIPALE)
  }

  /** Chiude il registro: prima le figlie, poi la principale. */
  static chiudi (): void {
    PannelloRegistro.chiudiFiglie()
    PannelloRegistro.istanze.get(NUMERO_PRINCIPALE)?.pannello.dispose()
  }

  /**
   * Da chiamare quando si apre un altro documento, prima che il suo stato
   * arrivi alle finestre: le figlie guardavano l'anno di prima e si chiudono.
   */
  static cambioDiDocumento (): void {
    PannelloRegistro.chiudiFiglie()
  }

  /**
   * Chiude tutte le figlie insieme, perché si chiude la principale o il
   * documento. Ognuna smette subito di ascoltare l'archivio: la sua finestra se
   * ne va dopo, e intanto non deve ricevere lo stato di un altro anno.
   */
  private static chiudiFiglie (): void {
    for (const finestra of [...PannelloRegistro.istanze.values()]) {
      if (finestra.numero === NUMERO_PRINCIPALE) continue
      finestra.smaltisci()
      finestra.pannello.dispose()
    }
  }

  /**
   * Aspetta le richieste della pagina già in corso, di tutte le finestre,
   * perché `spegni()` non chiuda il pacchetto sotto una scrittura. Non ferma
   * niente.
   */
  static attendiScritture (): Promise<void> {
    return codaScritture.then(() => undefined, () => undefined)
  }

  /**
   * Da chiamare quando si apre un altro documento: aggiorna i
   * `localResourceRoots`, sennò le immagini del nuovo anno restano fuori.
   */
  static aggiornaRisorse (): void {
    for (const finestra of PannelloRegistro.istanze.values()) finestra.aggiornaRisorse()
    // Anche la proiezione mostra le immagini dei piani.
    PannelloProiezione.aggiornaRisorse()
  }

  /**
   * Notifica di errore: nel webview se il pannello è aperto (in quella su cui si
   * lavora), altrimenti in una finestra di sistema, mai due uguali insieme (un
   * salvataggio fallito riprova e ridice l'errore). Un anno di una versione più
   * recente va sempre in finestra, che offre di aggiornare.
   */
  static avvisa (testo: string | ErroreVersionePiuRecente): void {
    const recente = versionePiuRecente(testo)
    const frase = typeof testo === 'string' ? testo : testo.message
    const finestra = PannelloRegistro.istanze.get(PannelloRegistro.numeroColFuoco) ??
      PannelloRegistro.istanze.get(NUMERO_PRINCIPALE)
    if (finestra && !recente) {
      finestra.invia({ tipo: 'notifica', livello: 'errore', testo: frase })
      return
    }
    if (PannelloRegistro.finestreDiErrore.has(frase)) return
    PannelloRegistro.finestreDiErrore.add(frase)
    // testo-fisso: il marchio non si traduce
    const messaggioFinestra = typeof testo === 'string' ? `Regiklass: ${testo}` : testo
    void apparato.dialoghi.errore(messaggioFinestra as unknown as string).finally(() => {
      PannelloRegistro.finestreDiErrore.delete(frase)
    })
  }

  /**
   * Si è aperta o chiusa una finestra, o una ha cambiato pagina: titoli, menu
   * nativo e l'elenco che ogni pagina mostra nella barra del titolo si rifanno.
   */
  private static finestreCambiate (): void {
    for (const finestra of PannelloRegistro.istanze.values()) {
      finestra.aggiornaTitolo()
      finestra.annunciaFinestre()
    }
    PannelloRegistro.cambioFinestre.fire()
  }

  naviga (messaggio: MessaggioNavigazione | MessaggioVai): void {
    if (this.pronto) this.invia(messaggio)
    else this.navigazioneInAttesa = messaggio
  }

  private aggiornaRisorse (): void {
    this.pannello.webview.options = {
      ...this.pannello.webview.options,
      localResourceRoots: radiciDellaPagina(this.contesto.extensionUri),
    }
  }

  /** Le finestre aperte, dette alla pagina: chi è lei, e chi c'è con lei. */
  private annunciaFinestre (): void {
    if (this.smaltito) return
    this.invia({
      tipo: 'finestre',
      ruolo: this.numero === NUMERO_PRINCIPALE ? 'principale' : 'figlia',
      numero: this.numero,
      elenco: PannelloRegistro.finestre(),
    })
  }

  /** Titolo della finestra, per la barra delle applicazioni e Alt+Tab. */
  private aggiornaTitolo (): void {
    if (this.smaltito) return
    this.pannello.title = titoloFinestra(percorsoPacchetto()?.fsPath ?? null, {
      numero: this.numero,
      pagina: this.pagina?.titolo ?? '',
      conFiglie: PannelloRegistro.istanze.size > 1,
    })
  }

  /**
   * La finestra prende il fuoco: lo schermo per la classe e l'assistente
   * passano a lei, con l'ultima mira e l'ultimo contesto che ha mandato.
   */
  private prendeIlFuoco (): void {
    if (PannelloRegistro.numeroColFuoco === this.numero) return
    PannelloRegistro.numeroColFuoco = this.numero
    this.riprendi()
  }

  /** Esegue, in coda come ogni azione, quel che si era tenuto da parte senza il fuoco. */
  private riprendi (): void {
    for (const azione of this.daRiprendere.values()) {
      this.coda = this.coda
        .then(async () => { await esegui(this.archivio, azione) })
        .catch(() => undefined)
    }
  }

  // ---------------------------------------------------------------- messaggi

  private gestisci (messaggio: unknown): void {
    const busta = messaggio as Partial<Richiesta> &
      Partial<Domanda> &
      Partial<Conversazione> &
      Partial<Dettatura> &
      Partial<SeguiConversazione> &
      Partial<Omit<ChiestaStatoIntero, 'tipo'>> &
      Partial<Omit<PaginaDellaFinestra, 'tipo'>> &
      { tipo?: ChiestaStatoIntero['tipo'] | PaginaDellaFinestra['tipo'] }
    if (!busta) return

    // La pagina ha perso il filo delle differenze: la prossima spinta è intera.
    if (busta.tipo === 'stato.intero') {
      this.serveIntero = true
      this.spingiStato()
      return
    }
    // La pagina dice dove guarda: titolo della finestra, menu delle finestre, e
    // il posto da cui nasce una figlia aperta dal menu nativo.
    if (busta.tipo === 'finestra.pagina') {
      this.ricordaPagina(busta as PaginaDellaFinestra)
      return
    }
    if (typeof busta.id !== 'number') return

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
      const domanda = busta as Domanda
      void this.rispondiDomanda(domanda).catch((guasto: unknown) => {
        // `chiama` non lancia, ma quel che le sta intorno sì: senza riscontro
        // la pagina aspetterebbe per sempre.
        console.warn(`[PannelloRegistro] Errore nella domanda ${domanda.procedura}:`, guasto)
        this.invia({
          tipo: 'riscontro',
          id: domanda.id,
          ok: false,
          codice: 'interno',
          errori: [testi().domandaFallita],
        })
      })
      return
    }

    const richiesta = busta as Richiesta
    if (!richiesta.azione) return

    // `stato.leggi` dice «pagina in piedi»; può arrivare più volte nella vita
    // del pannello (pagina ricaricata), e ogni volta si riconsegna tutto.
    if (richiesta.azione.tipo === 'stato.leggi') {
      this.pronto = true
      // Una pagina ricaricata non ha più il registro di prima.
      this.serveIntero = true
      // Stato subito, senza aspettare la coda: la spinta della scrittura in
      // corso arriva dopo ed è la più nuova.
      this.spingiStato()
      this.flushStato()
      // Anche proiezione e assistente, sennò un webview ricostruito li vede spenti.
      this.invia(statoProiezione())
      this.invia(statoAssistente())
      this.annunciaFinestre()
      if (this.navigazioneInAttesa) {
        const inAttesa = this.navigazioneInAttesa
        this.navigazioneInAttesa = null
        setTimeout(() => this.invia(inAttesa), 0)
      }
    }

    if (ACCESSI_DAL_BROWSER.has(richiesta.azione.tipo)) {
      // Qui e non in `oauth.ts`: la nuova, nella fila delle scritture di
      // `chiama()`, aspetterebbe la vecchia senza arrivare a interromperla.
      interrompiAccesso()
      void this.eseguiRichiesta(richiesta)
      return
    }

    // Mira dello schermo e contesto dell'assistente: valgono quelli della
    // finestra col fuoco. Le altre si tengono da parte, per quando lo prende.
    if (DEL_FUOCO.has(richiesta.azione.tipo)) {
      this.daRiprendere.set(richiesta.azione.tipo, richiesta.azione)
      if (this.numero !== PannelloRegistro.numeroColFuoco) {
        this.invia({ tipo: 'risposta', id: richiesta.id, ok: true })
        return
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
        // Anche alle altre finestre: la loro spinta dei dati è partita a passo
        // ancora aperto, e senza questa i loro ↶ ↷ non vedrebbero il passo nuovo.
        for (const finestra of PannelloRegistro.istanze.values()) finestra.spingiStato()
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
      console.warn(`[PannelloRegistro] Errore esecuzione richiesta ${richiesta.azione.tipo}:`, errore)
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

  private cacheAvvisi: {
    registro: Registro | null
    revisione: number
    lingua: string
    avvisi: string[]
  } = { registro: null, revisione: -1, lingua: '', avvisi: [] }

  private calcolaAvvisi (): string[] {
    const l = lingua()
    if (
      this.archivio.registro === this.cacheAvvisi.registro &&
      this.archivio.revisione === this.cacheAvvisi.revisione &&
      l === this.cacheAvvisi.lingua
    ) {
      return this.cacheAvvisi.avvisi
    }
    const avvisi = riferimentiRotti(this.archivio.registro)
    this.cacheAvvisi = {
      registro: this.archivio.registro,
      revisione: this.archivio.revisione,
      lingua: l,
      avvisi,
    }
    return avvisi
  }

  /** La spinta vera e propria; si chiama subito quando deve precedere altro. */
  private flushStato (): void {
    if (!this.spintaInSospeso) return
    this.spintaInSospeso = false
    const cartella = radiceRisorse()
    const corrente = percorsoPacchetto()?.fsPath ?? null
    this.aggiornaTitolo()
    const contorno = {
      storia: this.archivio.contiStoria,
      documenti: { corrente, provvisorio: èProvvisorio(), elenco: documentiNoti(corrente) },
      esportati: esportazioniPresenti(),
      archiviati: archiviPresenti(),
      avvisi: this.calcolaAvvisi(),
      radiceDati: cartella ? this.pannello.webview.asWebviewUri(cartella).toString() : null,
      radiceApp: this.pannello.webview.asWebviewUri(this.contesto.extensionUri).toString(),
      ocrAttivo: ocrAttivo(),
      programma: conProntezza(vociImpostazioni()),
      posta: {
        exchange: collegatoNoto(),
        server: contoExchange().server,
        porta: contoExchange().porta,
        invioDiretto: invioDiretto(),
        mittente: mittentePosta(),
        accesso: contoExchange().utente,
        indirizzi: [...indirizziPosta()],
      },
      microsoft: { account: accountMicrosoft() },
    }
    const revisione = this.archivio.revisione
    const da = this.revisioneDellaPagina
    const differenze = this.differenze
    const passi = this.conDifferenze
    const riletto = this.cambiamenti !== passi
    this.differenze = null
    this.cambiamenti = 0
    this.conDifferenze = 0
    this.revisioneDellaPagina = revisione
    // Le differenze bastano se partono dal registro che la pagina ha e arrivano
    // a quello di adesso; senza, il registro dev'essere lo stesso di allora.
    const bastano = spintaADifferenze() && !this.serveIntero && !riletto && da !== null &&
      (differenze
        ? differenze.da === da && differenze.a === revisione && revisione - da === passi
        : da === revisione)
    this.serveIntero = false
    if (bastano) {
      this.invia({
        tipo: 'differenze',
        da,
        revisione,
        collezioni: differenze ? [...differenze.collezioni] : [],
        patch: differenze?.patch ?? [],
        ...contorno,
      })
      return
    }
    this.invia({ tipo: 'stato', registro: this.archivio.registro, revisione, ...contorno })
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
      titolo: 'Regiklass',
      classe: 'app',
      finestra: this.numero,
    })
  }

  /** Quel che la pagina dice di sé a ogni cambio di posto. */
  private ricordaPagina (pagina: PaginaDellaFinestra): void {
    if (typeof pagina.titolo !== 'string' || !pagina.posto || typeof pagina.posto.pagina !== 'string') return
    const altroTitolo = pagina.titolo !== this.pagina?.titolo
    this.pagina = { tipo: 'finestra.pagina', titolo: pagina.titolo, posto: pagina.posto, contesto: pagina.contesto ?? {} }
    if (altroTitolo) PannelloRegistro.finestreCambiate()
  }

  /**
   * Una volta sola, dalla ✕, da `dispose()` o dalla cascata. Assistente staccato
   * e proiezione dipendono dalla principale, e le figlie anche: si chiudono con
   * lei. Una figlia che se ne va col fuoco lo rende alla principale.
   */
  private smaltisci (): void {
    if (this.smaltito) return
    this.smaltito = true
    const istanze = PannelloRegistro.istanze
    if (istanze.get(this.numero) === this) istanze.delete(this.numero)
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
    if (this.numero === NUMERO_PRINCIPALE) {
      PannelloRegistro.chiudiFiglie()
      PannelloAssistente.chiudi()
      PannelloProiezione.chiudi()
      PannelloRegistro.numeroColFuoco = NUMERO_PRINCIPALE
    } else if (PannelloRegistro.numeroColFuoco === this.numero) {
      PannelloRegistro.numeroColFuoco = NUMERO_PRINCIPALE
      PannelloRegistro.istanze.get(NUMERO_PRINCIPALE)?.riprendi()
    }
    PannelloRegistro.finestreCambiate()
  }
}

/** Gli interruttori che accendono un modello locale, e per quale uso. */
const INTERRUTTORI_DEI_MODELLI: Readonly<Record<string, Uso>> = {
  'registroDocenti.assistente.attivo': 'assistente',
  'registroDocenti.ocr.attivo': 'ocr',
}

/**
 * Le voci con il perché un modello acceso non può lavorare adesso
 * (`prontezza()`: programma, file del modello o del proiettore): la barra di
 * stato lo dice invece di un verde che poi fallisce dopo minuti.
 */
function conProntezza (voci: VoceProgramma[]): VoceProgramma[] {
  return voci.map((voce) => {
    const uso = INTERRUTTORI_DEI_MODELLI[voce.chiave]
    if (!uso || voce.valore !== true || voce.bloccata !== null) return voce
    const { pronto, motivo } = prontezza(collegamento(uso))
    return pronto ? voce : { ...voce, nonPronta: motivo }
  })
}
