// I messaggi che l'host spinge alla webview: lo stato, la navigazione, gli
// avanzamenti di scarichi e aggiornamenti, la proiezione. Parte di
// `contract/protocol.ts`, che li riesporta.

import type { Iso, Registro } from '#core/dominio/models.js'
import type { AccountMicrosoft } from '#core/dominio/onedrive.js'
import type { ContenutoProiezione, ImpostazioniProiezione } from '#core/dominio/projection.js'
import type { Riscontro, Risposta, Vista } from '#contract/protocol.js'
import type { MessaggioAssistente, MessaggioDettatura, MessaggioStatoAssistente } from './assistant.js'

/**
 * Avanzamento dello scarico di un modello, spesso. `byte` e `totale` invece di
 * una percentuale per poter scrivere «1,2 GB di 4,7 GB»; `totale` è zero finché
 * il sito non lo dichiara. L'ultimo porta `finito`, con `nome` o `motivo`.
 */
export interface MessaggioScarico {
  tipo: 'scarico'
  /** Il file che sta scendendo, come si chiama nel deposito. */
  file: string
  byte: number
  totale: number
  finito?: boolean
  /** Il nome con cui è finito nella cartella, quando è andata. */
  nome?: string
  /** Perché non è arrivato, in una frase che si legge. */
  motivo?: string
  /**
   * I file in coda, in ordine. Viaggia in ogni messaggio perché barra e coda
   * devono restare coerenti anche con messaggi in disordine.
   */
  coda: string[]
}

/**
 * Fase degli aggiornamenti, una alla volta. `errore` non blocca: il controllo
 * dopo riparte. `installazione` dura pochi secondi, poi il registro esce e
 * racconta la finestra dell'aggiornamento.
 */
export type FaseAggiornamenti =
  | 'fermo'
  | 'controllo'
  | 'aggiornato'
  | 'disponibile'
  | 'scarico'
  | 'pronto'
  | 'installazione'
  | 'errore'

export interface StatoAggiornamenti {
  /** La versione che gira adesso. */
  versione: string
  /**
   * Se questo registro si può aggiornare da sé: no nel portabile, in sviluppo e
   * fuori da Windows. Allora `motivo` lo dice e resta `pagina`.
   */
  supportato: boolean
  motivo?: string
  fase: FaseAggiornamenti
  /** La versione trovata, quando ce n'è una più nuova. */
  nuova?: { versione: string, data?: string, note?: string }
  /** Lo scarico in corso: `byte` di `totale`. */
  byte?: number
  totale?: number
  /** Quando si è controllato l'ultima volta, in ISO. */
  ultimoControllo?: string
  /** Perché l'ultimo tentativo non è andato, in una frase che si legge. */
  errore?: string
  /** Dove stanno le release: il ripiego quando da sé non si può. */
  pagina: string
  /** Lo stato detto a parole, uguale per tutte le superfici che lo mostrano. */
  racconto: RaccontoAggiornamenti
  /** La notizia chiusa con la ✕, ricordata per non rimostrarla finché non cambia. */
  notiziaNascosta?: string
}

/**
 * Lo stato degli aggiornamenti a parole, scritto dall'host
 * (`environment/updates.ts`) perché le superfici che lo mostrano sono quattro,
 * in strati che non si importano a vicenda.
 */
export interface RaccontoAggiornamenti {
  /** Due o tre parole («c’è la 1.7.0»), per pastiglie e barre. */
  breve: string
  /** Una frase intera: la riga della sezione, il suggerimento sopra la voce. */
  frase: string
  /** Il colore, fra i toni del tema. */
  tono: 'quiete' | 'informativo' | 'positivo' | 'attenzione' | 'negativo'
  /** Il gesto sensato adesso, se c'è. `pagina` apre le release nel browser. */
  gesto?: {
    tipo: 'aggiornamenti.controlla' | 'aggiornamenti.scarica' | 'aggiornamenti.installa' | 'pagina'
    testo: string
    /** Visibile ma spento: il controllo in corso. */
    spento?: boolean
  }
  /** Quanto è sceso, fra 0 e 1, mentre si scarica e il totale è noto. */
  quota?: number
  /**
   * Presente quando c'è una notizia (versione trovata, in arrivo, pronta): solo
   * allora barra e filetto parlano. È una chiave: cambia quando la notizia cambia,
   * non mentre lo scarico avanza; chiudere il filetto chiude quella chiave.
   */
  notizia?: string
}

/** Lo stato degli aggiornamenti, spinto dall'host a ogni cambio (lo scarico dura minuti). */
export interface MessaggioAggiornamenti {
  tipo: 'aggiornamenti'
  stato: StatoAggiornamenti
}

/**
 * Un'impostazione del programma come la vede la pagina: manifesto più stato.
 * `scritta` distingue «vale il predefinito» da «l'ho deciso io».
 */
export interface VoceProgramma {
  /** `registroDocenti.vassoio.attivo`: è anche la chiave con cui si scrive. */
  chiave: string
  tipo: 'string' | 'number' | 'boolean'
  /** Il nome da leggere: `etichetta` nel manifesto, o ricavato dalla chiave. */
  etichetta: string
  descrizione: string
  /**
   * Che cosa tiene una voce di testo (vedi `Formato` nel manifesto). Un percorso
   * si mostra in sola lettura con «Sfoglia…», un modello rimanda a «Modelli
   * linguistici». Per `indirizzoLocale` la regola la fa rispettare la dogana.
   */
  formato: 'email' | 'cartella' | 'eseguibile' | 'file' | 'modello' | 'indirizzoLocale' | null
  scelte: Array<{ valore: string | number, aiuto: string }> | null
  /** Gli estremi di un numero, quando ce ne sono: diventano `min` e `max` del campo. */
  minimo: number | null
  massimo: number | null
  /**
   * Di quanto si muove un numero (`step` del campo), contato dal minimo: 1 se
   * il manifesto non dice altro, perché un numero è intero. `null` per chi non è
   * un numero. La dogana lo fa rispettare.
   */
  passo: number | null
  /** L'unità scritta accanto al numero («min»), nella lingua di adesso, o `null`. */
  unita: string | null
  /**
   * Come si disegna (`Controllo` nel manifesto), o `null` se basta il tipo. Un
   * disegno solo per le due superfici (ADR-52).
   */
  controllo: 'segmenti' | 'tendina' | 'cursore' | null
  /**
   * Da dove vengono le scelte che si sanno solo sul momento (`FonteScelte`), o
   * `null`. L'elenco lo porta chi lo conosce: per `indirizziPosta`, lo stato
   * della posta del pannello.
   */
  scelteDinamiche: 'indirizziPosta' | null
  /** Con `scelteDinamiche`: se si può scrivere anche un valore fuori elenco. */
  sceltaLibera: boolean
  predefinito: string | number | boolean
  valore: string | number | boolean
  /** Se il valore di adesso è scritto nel file o viene dal predefinito. */
  scritta: boolean
  /**
   * Perché questo interruttore non si può accendere adesso, o `null`. Se manca
   * quel che `richiede`, `valore` è già spento. Calcolata da `vociImpostazioni()`
   * perché le superfici sono due.
   */
  bloccata: string | null
  /**
   * Acceso ma non in grado di lavorare adesso (programma che manca, file del
   * modello sparito), con il motivo; `null` se va, se è spento o se la voce non
   * accende un modello. Lo dice `prontezza()` di `core/dati/llm.ts`.
   */
  nonPronta: string | null
  /** La chiave che deve essere accesa perché questa conti, per dirlo a schermo. */
  dipendeDa: string | null
  /**
   * Se il padre è spento e questa voce non conta. Calcolata da
   * `vociImpostazioni()` e non da chi disegna, così pannello e finestra nativa
   * dicono lo stesso.
   */
  sospesa: boolean
  /** Voce rara: sta in fondo alla sezione, in un gruppo che si apre. */
  avanzata: boolean
  /** Cambiata, vale dal prossimo avvio: le due superfici lo dicono accanto al nome. */
  alProssimoAvvio?: boolean
  /**
   * La scrive «Collega la casella» (`CHIAVI_DEL_COLLEGAMENTO`): si mostra in
   * sola lettura e non si ritira, in tutte e due le superfici.
   */
  delCollegamento: boolean
}

/**
 * Lo stato che l'host spinge: il registro intero (`MessaggioStato`) o solo le
 * sue differenze (`MessaggioDifferenze`), e intorno quel che il pannello non
 * legge da sé, che viaggia sempre intero perché è piccolo.
 */
export interface MessaggioStato extends ContornoDelloStato {
  tipo: 'stato'
  registro: Registro
  /**
   * La revisione dell'archivio di questo registro: le differenze che seguono
   * partono da qui (`MessaggioDifferenze.da`).
   */
  revisione: number
}

/**
 * Una patch di immer sul registro, scritta qui per non portare immer nel
 * contratto: `path` parte da una chiave del `Registro` (`['lezioni', 3, 'stato']`).
 */
export interface PatchRegistro {
  op: 'replace' | 'remove' | 'add'
  path: Array<string | number>
  value?: unknown
}

/**
 * Lo stato con solo quel che è cambiato nel registro dalla spinta di prima:
 * le patch delle scritture e degli annulla, in ordine. Valgono solo sul
 * registro della revisione `da`; una pagina che ne ha un'altra le scarta e
 * chiede lo stato intero (`ChiestaStatoIntero`). Senza patch il registro è
 * quello di prima, e cambia solo il contorno (storia, documenti, impostazioni).
 */
export interface MessaggioDifferenze extends ContornoDelloStato {
  tipo: 'differenze'
  /** La revisione su cui le patch si applicano: quella che la pagina deve avere. */
  da: number
  /** La revisione dopo le patch. */
  revisione: number
  /** Le collezioni che le patch toccano, come su disco. */
  collezioni: string[]
  patch: PatchRegistro[]
}

/**
 * Dalla pagina all'host: il registro che ha non torna con le differenze
 * arrivate (revisione fuori sequenza, patch che non si applica), e la
 * prossima spinta lo porti intero.
 */
export interface ChiestaStatoIntero {
  tipo: 'stato.intero'
}

interface ContornoDelloStato {
  /**
   * Le impostazioni del programma, che il webview non legge da sé: arrivano con
   * lo stato, rifatto quando cambiano.
   */
  programma: VoceProgramma[]
  avvisi: string[]
  /**
   * La cartella dei dati vista dal webview, per le immagini: la sandbox carica
   * solo l'indirizzo `registro://` concesso a quella cartella.
   */
  radiceDati: string | null
  /**
   * La radice dell'applicazione come indirizzo caricabile: dice a pdfjs dove
   * sono i caratteri standard del PDF, senza cui le miniature usano un ripiego.
   */
  radiceApp: string | null
  /**
   * Se la lettura automatica delle scansioni è accesa: senza saperlo il webview
   * offrirebbe una lettura spenta; così la quarantena propone di accenderla.
   */
  ocrAttivo: boolean
  /**
   * Com'è messa la posta, per la scheda che lo dice: quel che si sa senza
   * chiedere al server. Se il server risponde lo dice `posta.prova`.
   */
  posta: {
    /** Vero quando la casella è collegata (indirizzo scritto, password nel portachiavi). */
    exchange: boolean
    /** Il server a cui si consegna, per la scheda che lo dice. */
    server: string
    /** La porta del server (STARTTLS). */
    porta: number
    invioDiretto: boolean
    /** L'indirizzo da cui si scrive: quello che le famiglie vedono in «Da». */
    mittente: string
    /**
     * Il nome d'accesso, quando è diverso dall'indirizzo (nelle scuole spesso una
     * sigla): scambiati, fanno rifiutare l'invio.
     */
    accesso: string
    /**
     * Gli indirizzi da cui l'account collegato può scrivere, detti da Microsoft
     * all'accesso: il mittente si sceglie fra questi. Vuoto se non è collegato.
     */
    indirizzi: string[]
  }
  /**
   * Gli account Microsoft: quelli collegati per OneDrive, e la casella della
   * posta anche se non lo è ancora. Nessun gettone: solo chi e che cosa.
   */
  microsoft: { account: AccountMicrosoft[] }
  /** Quanti gesti si possono annullare e ripristinare: accendono ↶ ↷ e il suggerimento. */
  storia: { annulla: number; ripristina: number }
  documenti: {
    /** Il percorso del documento in uso, o `null` se non ce n'è ancora uno. */
    corrente: string | null
    /**
     * Anno appena creato e non ancora salvato con nome, in una cartella
     * provvisoria. Vedi `data/paths.ts`.
     */
    provvisorio?: boolean
    elenco: DocumentoRecente[]
  }
  /**
   * L'inventario di `esportazioni/`, per la pagina Documenti: dice quali fogli
   * ci sono e quali mancano. Arriva con lo stato, che si rispinge a ogni rapporto
   * scritto.
   */
  esportati: DocumentoEsportato[]
  /**
   * L'inventario di `archivio/`, per l'anteprima dell'archivio documentale:
   * presenza, misura e revisione di ogni foglio.
   */
  archiviati: DocumentoEsportato[]
}

/** Un documento che sta nella cartella delle esportazioni. */
interface DocumentoEsportato {
  /** Il percorso relativo alla cartella dei dati, `esportazioni/` compreso. */
  percorso: string
  /** Quanto misura, in byte: zero byte è un foglio da rifare. */
  misura: number
  /**
   * Quante volte è stato riscritto da quando l'anno è aperto. Serve all'anteprima:
   * il lettore di PDF tiene in cache lo stesso percorso, e la misura può restare
   * uguale.
   */
  revisione: number
}

/** Un anno che si è aperto, o che si tiene da parte. */
export interface DocumentoRecente {
  percorso: string
  /** Il nome dell'anno senza estensione: `2026-2027`. */
  nome: string
  /** L'anno scolastico scritto nel file («2026/27»), o `null` se mai aperto. */
  etichetta: string | null
  /** La cartella che lo contiene: distingue due anni con lo stesso nome. */
  cartella: string
  preferito: boolean
  /** Vero se ora sul disco non c'è (una chiavetta staccata). */
  mancante: boolean
  /**
   * Vero se è l'anno aperto adesso. Lo calcola l'host: confrontare percorsi è
   * una regola del sistema operativo che il pannello, senza `path`, non sa fare.
   */
  aperto: boolean
}

/** Un comando della palette che chiede al webview di aprirsi su qualcosa. */
export interface MessaggioNavigazione {
  tipo: 'naviga'
  vista: Vista
  elementoId?: string
  data?: Iso
  /** Apre direttamente il modulo di creazione della vista di destinazione. */
  nuovo?: boolean
  /** Apre l'importazione da un altro registro, dopo aver creato un anno. */
  importa?: boolean
  /**
   * Apre un dialogo sopra la pagina di adesso, che non cambia: `vista` allora
   * non conta. Dal menu nativo, che non sa quale pagina si stia guardando.
   * `nuovoAnno` è il modulo «Nuovo anno scolastico» del pannello, lo stesso del
   * menu «File»: il vassoio e il menu nativo lo aprono qui.
   */
  dialogo?: 'informazioniDocumento' | 'nuovoAnno'
  /**
   * Con `vista: 'impostazioni'`, l'indirizzo dentro la pagina: `<area>#<voce>`
   * (`utente#account`). Stringa e non `Scheda`, che è della pagina: la convalida
   * la fa chi riceve.
   */
  impostazioni?: string
}

/**
 * Dove guarda una finestra del registro: la forma del `Posto` di `ui/place.ts`
 * senza i suoi tipi, che sono della pagina. La convalida la fa chi riceve
 * (`completa`), come per `MessaggioNavigazione.impostazioni`.
 */
export interface PostoDellaFinestra {
  pagina: string
  soggetto?: { tipo: string, id: string }
  scheda?: string
}

/**
 * Gli id scelti con cui si guarda il posto (corso, classe, ora…): una finestra
 * nuova ci arriva come ci stava quella da cui nasce. Gli stessi campi del
 * `Contesto` di `ui/place.ts`.
 */
export interface ContestoDellaFinestra {
  corsoId?: string | null
  classeId?: string | null
  filtroClasseId?: string | null
  lezioneId?: string | null
  pianoId?: string | null
  valutazioneId?: string | null
  allievoId?: string | null
  progettoId?: string | null
}

/**
 * Porta una finestra del registro su un posto: quella nuova, che nasce dove
 * guardava l'altra. Come `naviga`, aspetta i dati se non sono ancora arrivati.
 */
export interface MessaggioVai {
  tipo: 'vai'
  posto: PostoDellaFinestra
  contesto?: ContestoDellaFinestra
}

/**
 * Le finestre del registro aperte, spinte a tutte a ogni apertura o chiusura
 * e quando una cambia pagina: la principale ne fa il suo menu, una figlia sa
 * di esserlo. La principale è la 1.
 */
export interface MessaggioFinestre {
  tipo: 'finestre'
  ruolo: 'principale' | 'figlia'
  /** Il numero di chi riceve. */
  numero: number
  /** Tutte, principale compresa, in ordine di numero, con la pagina che mostrano. */
  elenco: Array<{ n: number, titolo: string }>
}

/**
 * Dalla pagina all'host, a ogni cambio di posto: che pagina mostra (il titolo,
 * per la barra delle applicazioni e il menu delle finestre) e dove, per aprire
 * una finestra nuova sullo stesso posto da un comando che non lo sa.
 */
export interface PaginaDellaFinestra {
  tipo: 'finestra.pagina'
  titolo: string
  posto: PostoDellaFinestra
  contesto: ContestoDellaFinestra
}

/**
 * Il corso di lavoro, la classe del docente di classe e il periodo: gli stessi
 * in tutte le finestre del registro. Solo i campi che cambiano; per corso e
 * classe solo id, perché «niente scelto» non si condivide. È stato della
 * pagina, non del documento: non si scrive.
 */
export interface ContestoCondiviso {
  corsoId?: string
  classeId?: string
  /** Il semestre dei conti; `null` è l'anno intero, una scelta come un'altra. */
  semestreId?: string | null
}

/**
 * Dalla pagina all'host: chi la guarda ha cambiato corso o classe. Non lo manda
 * una pagina che si sta solo allineando a un'altra (`MessaggioCondiviso`), così
 * il cambio non rimbalza.
 */
export interface CambioCondiviso {
  tipo: 'finestra.condiviso'
  condiviso: ContestoCondiviso
}

/**
 * Dall'host alle altre finestre del registro, non a quella che ha cambiato: il
 * corso o la classe scelti altrove. A una pagina appena in piedi, tutto quello
 * che l'host sa.
 */
export interface MessaggioCondiviso {
  tipo: 'condiviso'
  condiviso: ContestoCondiviso
}

interface MessaggioNotifica {
  tipo: 'notifica'
  livello: 'info' | 'avviso' | 'errore'
  testo: string
}

/**
 * A che punto è la lettura delle scansioni. Messaggio a sé perché cambia a ogni
 * pagina: spingere il registro intero ridisegnerebbe tutto il pannello.
 */
interface MessaggioLavoro {
  tipo: 'lavoro'
  corrente: { smistamentoId: string, pagina: number, etichetta: string } | null
  /** Pagine già lette in questa infornata, e quante erano. */
  fatte: number
  totale: number
  coda: Array<{ smistamentoId: string, pagina: number, etichetta: string }>
}

/**
 * Quel che va sullo schermo grande, già filtrato dall'host: il webview della
 * proiezione riceve solo i blocchi accesi.
 */
export interface MessaggioProiezione {
  tipo: 'proiezione'
  contenuto: ContenutoProiezione
  /** La cartella dei dati vista dal webview: serve alle immagini delle risorse. */
  radiceDati: string | null
  /** La versione del programma, scritta piccola nella pausa. */
  versione: string
}

/**
 * Com'è la proiezione, detto al pannello del docente, che ne disegna i comandi:
 * lo schermo grande non ne ha.
 */
export interface MessaggioStatoProiezione {
  tipo: 'proiezione.stato'
  aperta: boolean
  impostazioni: ImpostazioniProiezione
}

export type MessaggioVersoWebview =
  | MessaggioStato
  | MessaggioDifferenze
  | MessaggioNavigazione
  | MessaggioVai
  | MessaggioFinestre
  | MessaggioCondiviso
  | MessaggioNotifica
  | MessaggioLavoro
  | MessaggioProiezione
  | MessaggioStatoProiezione
  | MessaggioAssistente
  | MessaggioStatoAssistente
  | MessaggioDettatura
  | MessaggioScarico
  | MessaggioAggiornamenti
  | Risposta
  | Riscontro
