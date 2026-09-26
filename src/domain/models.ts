// Il vocabolario del registro: archivio, protocollo del webview e viste parlano
// di queste forme e di nessun'altra.
//
// Convenzioni:
//   Iso  una data senza fuso, 'AAAA-MM-GG': il registro ragiona per giorni, e
//        un'ora dentro la data sposterebbe le lezioni cambiando fuso.
//   Ora  'HH:MM' a 24 ore, confrontabile come stringa.
//
// Ogni legame segue una regola sola:
//   annidare  se non ha vita propria e muore col contenitore (uno slot, un voto)
//   riferire  se deve restare aggiornato (il nome della classe)
//   copiare   se deve restare com'era (la scala con cui è stato dato un voto)
//   derivare  se si ricava da altro, e allora non si scrive (il semestre)

/** Data di calendario, 'AAAA-MM-GG'. */
export type Iso = string
/** Ora del giorno, 'HH:MM' su 24 ore. */
export type Ora = string
/** Istante di modifica, ISO 8601 completo. Serve solo per ordinare e mostrare. */
export type Istante = string

// ---------------------------------------------------------------- anno e semestri

/**
 * Un semestre, due per anno: la scansione di valutazioni e medie. Nessuno lo
 * cita per id: il semestre di una data si trova dagli estremi.
 */
export interface Semestre {
  id: string
  numero: 1 | 2
  etichetta: string
  inizio: Iso
  fine: Iso
}

/**
 * Un periodo senza lezione (vacanze, ponti, giornate d'istituto): spegne i
 * giorni nel calendario e la generazione dell'orario li salta.
 */
export interface Sospensione {
  id: string
  etichetta: string
  dal: Iso
  al: Iso
}

/**
 * Il tipo di una settimana dove l'orario va a turni: il valore di una voce
 * della lista «Tipi di settimana» (`tipoSettimana`). Il nome resta «lettera»
 * perché per quasi tutti è A o B.
 */
export type LetteraSettimana = string

/**
 * Un anno scolastico, anche unità di stoccaggio: una cartella con le sue
 * classi, ore e documenti.
 */
export interface AnnoScolastico {
  id: string
  /** Come lo si chiama parlando: '2025/2026'. */
  etichetta: string
  inizio: Iso
  fine: Iso
  semestri: Semestre[]
  /** Vacanze e giorni di chiusura: valgono per tutte le classi dell'anno. */
  sospensioni: Sospensione[]
  /**
   * Il tipo di ogni settimana marcata (A, B o un'altra voce della lista), per il
   * lunedì che la apre. Una settimana assente non ha lettera, il caso normale.
   * Si scrivono una per una e non con una regola di alternanza, che al primo
   * imprevisto sbaglierebbe tutto il resto. Chiave: il lunedì `AAAA-MM-GG`, non
   * il numero ISO, che a cavallo d'anno cambia significato.
   */
  settimane?: Record<Iso, LetteraSettimana>
  note?: string
  /**
   * La cartella in cui l'anno vive, '2025-2026'. Non si scrive nel file: la
   * riempie `Archivio` in lettura, per chi deve scrivere in un anno non in uso.
   */
  cartella?: string
}

// ---------------------------------------------------------------- materie e corsi

/**
 * Una materia: un'entità con un id, così «matematica» e «Matematica» non
 * diventano due materie.
 */
export interface Materia {
  id: string
  nome: string
  /** Sigla breve per gli elenchi stretti: MAT, ITA, DIC. */
  sigla?: string
  colore?: string
  note?: string
}

/**
 * Una fascia fissa dell'orario: «il martedì, dalle 08:20, novanta minuti». È
 * lo stampo da cui si generano le lezioni, che restano modificabili una per
 * una. `dal` e `al` per gli orari che cambiano a metà anno; vuoti, vale tutto
 * l'anno della classe.
 */
export interface Ricorrenza {
  id: string
  /** 1 = lunedì … 7 = domenica. */
  giorno: number
  inizio: Ora
  durataMin: number
  aula?: string
  dal?: Iso
  al?: Iso
}

/**
 * Un corso: questa materia, a questa classe. È il perno del registro: lezioni,
 * valutazioni e programma si agganciano al corso, non a classe e materia.
 * L'anno lo porta la classe.
 */
export interface Corso {
  id: string
  classeId: string
  materiaId: string
  /** Come lo si chiama parlando: 'Calcolo professionale — DIC4a'. */
  titolo: string
  /** Le ore fisse in settimana: lo stampo da cui nascono le lezioni. */
  orario: Ricorrenza[]
  /** Il programma d'insegnamento, per ora come testo libero. */
  note?: string
  /**
   * Il colore delle sue ore nel calendario, `#rrggbb`, scelto a mano. Assente,
   * è la media fra colore della classe e della materia (`coloreDelCorso`).
   */
  colore?: string
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- classi e allievi

import type { Indirizzo } from './addresses.js'

export type { Indirizzo } from './addresses.js'

/**
 * A chi risponde un numero di telefono: la persona, chi risponde per lei da
 * minorenne, chi la ospita in azienda.
 */
export type ContattoTelefonico = 'pif' | 'rappresentante' | 'datore'

/**
 * Che numero è. Un elenco chiuso, perché serve a scegliere quale provare per
 * primo (il centralino la domenica non risponde); «altro» è la via d'uscita.
 */
export type EtichettaTelefono = 'cellulare' | 'casa' | 'lavoro' | 'centralino' | 'altro'

/** Un numero di telefono nell'anagrafica: a chi risponde, che numero è, e qual è. */
export interface Telefono {
  id: string
  contatto: ContattoTelefonico
  etichetta: EtichettaTelefono
  /** Scritto come lo si compone: il registro non lo riformatta né lo valida. */
  numero: string
}

/**
 * Un allievo dentro una classe: il nome per appello e voti, i recapiti per
 * comunicazioni, assenze e consegne, nascita e azienda per i moduli della
 * scuola. Le osservazioni stanno altrove, con data e ora.
 */
export interface Allievo {
  id: string
  cognome: string
  nome: string
  /**
   * Il giorno in cui è nato: per i moduli della scuola e per distinguere due
   * omonimi. Facoltativa: senza, nessuna riga vuota sui fogli.
   */
  dataNascita?: Iso
  /**
   * Dove abita, a caselle (via, NAP, località): per la mappa, le buste e
   * l'ordinamento. `scriviIndirizzo` lo rimette in una riga, che è la chiave
   * delle coordinate. Vedi `domain/addresses.ts`.
   */
  indirizzo?: Indirizzo
  email?: string
  /** L'indirizzo di chi va avvisato al posto suo, o oltre a lui. */
  emailTutore?: string
  /**
   * L'azienda del tirocinio. Separata dai tutori: il tutore riceve le
   * comunicazioni alla classe, il datore firma i fogli delle assenze.
   */
  azienda?: string
  /** Dove sta l'azienda, con le stesse caselle dell'indirizzo di casa. */
  indirizzoDatore?: Indirizzo
  emailDatore?: string
  /**
   * I numeri di telefono, di chiunque risponda: ognuno dice a chi risponde
   * (per non chiamare l'azienda credendo di chiamare casa), che numero è, e
   * qual è. Dentro lo stesso contatto l'ordine è quello in cui si prova, e si
   * cambia trascinando.
   */
  telefoni: Telefono[]
  /**
   * Il ritratto: percorso relativo alla cartella dell'anno. Il file sta nella
   * cartella della classe, non nel JSON (in base64 appesantirebbe ogni
   * salvataggio), e segue l'anno come gli altri dati personali.
   */
  foto?: string
  /** Un ritiro non cancella l'allievo: le lezioni passate lo citano ancora. */
  attivo: boolean
}

/**
 * Un gruppo di allievi in un anno scolastico, e nient'altro. La materia è del
 * corso; il fascicolo del docente di classe sta a parte, perché cresce tutto
 * l'anno mentre l'anagrafica si tocca di rado.
 */
export interface Classe {
  id: string
  annoId: string
  /** Sigla con cui la classe compare ovunque: 'I MEC A'. */
  nome: string
  sede?: string
  /** Colore della classe nel calendario, in esadecimale. */
  colore: string
  note?: string
  allievi: Allievo[]
  archiviata: boolean
  /**
   * Se si è docente di classe: raccoglie documenti e scrive alle famiglie. Chi
   * non lo è non ne vede i comandi.
   */
  docenteDiClasse: boolean
  creataIl: Istante
  aggiornataIl: Istante
}

// ------------------------------------------------- fascicolo del docente di classe

/** Un indirizzo fisso a cui vanno le comunicazioni: segreteria, capoclasse, sede. */
export interface Recapito {
  id: string
  etichetta: string
  email: string
  /** Se vero entra da solo fra i destinatari di ogni comunicazione nuova. */
  predefinito: boolean
}

export type CategoriaDocumento =
  | 'certificato'
  | 'autorizzazione'
  | 'giustificazione'
  | 'modulo'
  | 'altro'

/**
 * Un documento raccolto dal docente di classe, nella forma vecchia. Non se ne
 * creano più (un documento da raccogliere è una consegna): il tipo serve a
 * leggere i file che li hanno, che in lettura diventano consegne. Quelli di una
 * classe senza corso restano qui finché un corso non c'è.
 */
export interface Documento {
  id: string
  allievoId: string | null
  titolo: string
  categoria: CategoriaDocumento
  /** Percorso relativo alla cartella dei dati; vuoto = atteso ma non ancora arrivato. */
  file: string
  nome: string
  scadenza?: Iso
  note?: string
  aggiuntoIl: Istante
}

export type StatoComunicazione = 'bozza' | 'inviata' | 'errore'

/**
 * Una comunicazione alla classe. Si scrivono i gruppi (allievi, tutori,
 * recapiti fissi), non gli indirizzi: si ricavano all'invio, così restano
 * aggiornati.
 */
export interface Comunicazione {
  id: string
  oggetto: string
  corpo: string
  aAllievi: boolean
  aTutori: boolean
  /** Recapiti fissi scelti, per id. */
  recapitiIds: string[]
  /**
   * Gli allegati, per id della consegna «a me» che ha raccolto il file (moduli,
   * circolari).
   */
  documentiIds: string[]
  stato: StatoComunicazione
  /** Gli indirizzi a cui è andata davvero: copia, si scrive solo dopo l'invio. */
  destinatari: string[]
  errore?: string
  creataIl: Istante
  inviataIl?: Istante
}

/**
 * Il fascicolo di una classe: quel che tiene il docente di classe. Fuori dalla
 * classe perché cresce tutto l'anno e `classi.json` deve restare corto. Al più
 * uno per classe; nasce quando serve.
 */
export interface Fascicolo {
  id: string
  classeId: string
  recapiti: Recapito[]
  /** Solo quel che resta da convertire in consegne: vedi `Documento`. */
  documenti: Documento[]
  comunicazioni: Comunicazione[]
  /** I periodi di assenze mandati a firmare al datore di lavoro. */
  assenze: BloccoAssenze[]
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ------------------------------------------------- assenze da far firmare

/**
 * Che cosa racconta un foglio: ore mancate o entrate in ritardo. Due stampe
 * distinte, come le produce la scuola e le firma l'azienda.
 */
export type TipoRapporto = 'assenze' | 'ritardi'

/**
 * Un PDF di un periodo, per un allievo. `firmato` distingue il foglio che parte
 * (vergine) da quello che torna con la firma: due file, tenuti tutti e due.
 * Qui il percorso relativo alla cartella dei dati.
 */
export interface FoglioAssenze {
  tipo: TipoRapporto
  firmato: boolean
  /** Percorso relativo alla cartella dei dati, con '/' come separatore. */
  file: string
  /** Come si chiamava il file scelto: è quel che si riconosce nell'elenco. */
  nome: string
  aggiuntoIl: Istante
}

/**
 * La spedizione di un allievo, scritta dopo il tentativo riuscito o no: un
 * invio fallito deve lasciare traccia.
 */
export interface InvioAssenze {
  /** Gli indirizzi a cui è andata davvero: copia, si scrive solo dopo. */
  destinatari: string[]
  inviatoIl: Istante
  /** Valorizzato solo se non è partita: allora l'invio è da rifare. */
  errore?: string
}

/**
 * La riga di un allievo dentro un periodo: i suoi fogli e la sua mail. Solo per
 * chi ha qualcosa da far firmare.
 */
export interface RigaAssenze {
  allievoId: string
  fogli: FoglioAssenze[]
  /** L'ultimo tentativo di spedizione, o null se non se n'è ancora fatto nessuno. */
  invio: InvioAssenze | null
  note?: string
}

/**
 * Un periodo di assenze da far firmare: le tre fasi (vergine che parte, mail,
 * firmato che torna) nella stessa pratica, per sapere a che punto è ogni nome.
 * Il periodo è l'unità in cui la scuola lo chiede e l'azienda lo firma.
 *
 * Non è una `Comunicazione`: è una mail per allievo, a un'azienda per volta,
 * con i suoi fogli. Oggetto e testo sono del periodo e si compilano per
 * ciascuno (segnaposto in `testoAssenze`).
 */
export interface BloccoAssenze {
  id: string
  /** Come lo si chiama parlando: '1° semestre', 'settembre–dicembre'. */
  etichetta: string
  dal: Iso
  al: Iso
  oggetto: string
  corpo: string
  /** Se la mail va anche all'allievo, oltre che al datore di lavoro. */
  aAllievo: boolean
  aTutore: boolean
  /** Recapiti fissi del fascicolo in copia a ogni invio del periodo. */
  recapitiIds: string[]
  /** Una riga per chi ha qualcosa da far firmare; gli altri non ci sono. */
  righe: RigaAssenze[]
  note?: string
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- lezioni

/**
 * Una frazione di orario della lezione, almeno una per lezione. Le pause sono
 * slot di tipo 'pausa': un blocco di due ore con la pausa resta una lezione
 * sola.
 */
export interface Slot {
  id: string
  inizio: Ora
  fine: Ora
  tipo: 'lezione' | 'pausa'
  etichetta?: string
  /**
   * La fascia viene dal calendario ICS. Su una lezione ancorata (`ancorataAIcs`)
   * queste fasce non si toccano, le altre sì, e il confronto guarda solo
   * queste. Una lezione senza nessuna fascia segnata le considera tutte del
   * calendario (`slotDelCalendario`).
   */
  ics?: true
}

/**
 * Quattro stati, più il non detto. Un'uscita anticipata si scrive come UD
 * presenti e assenti; una giustificazione va nella nota.
 *
 * `non-impostato` è l'assenza di una risposta, lo stato con cui ogni casella
 * nasce: un appello dimenticato non deve sembrare una classe al completo.
 */
export type StatoPresenza =
  | 'non-impostato'
  | 'presente'
  | 'assente'
  | 'ritardo'
  | 'esonerato'

/**
 * L'appello di un allievo su un'ora, UD per UD: chi arriva alla terza di
 * quattro è assente per due e presente per due. `stati` ha uno stato per UD in
 * ordine; se è più corto dell'ora, le UD mancanti sono non impostate.
 */
export interface Presenza {
  allievoId: string
  stati: StatoPresenza[]
  /** Minuti di ritardo, quando ce n'è uno. */
  minuti?: number
  nota?: string
}

export type TipoOsservazione =
  | 'nota'
  | 'merito'
  | 'disciplina'
  | 'compiti'
  | 'materiale'
  | 'colloquio'

/** Annotazione sull'andamento: sull'intera classe se allievoId è nullo. */
export interface Osservazione {
  id: string
  allievoId: string | null
  tipo: TipoOsservazione
  testo: string
  ora?: Ora
  creataIl: Istante
}

/**
 * Il segno di una cella della matrice: due soli valori, perché si segna di
 * sfuggita mentre la classe lavora. Il resto va nella nota della cella.
 */
export type SegnoOsservato = 'positivo' | 'negativo'

/**
 * Una casella della matrice del comportamento: una persona, un aspetto, un'ora.
 * Gli aspetti vengono dalla lista `aspettoOsservato`. Le celle vuote non si
 * salvano.
 */
export interface CellaOsservata {
  allievoId: string
  /** Il valore di una voce della lista `aspettoOsservato`. */
  aspetto: string
  /** `null` quando c'è solo l'annotazione, senza giudizio. */
  segno: SegnoOsservato | null
  nota?: string
}

export type StatoAttivita = 'da-fare' | 'svolta' | 'parziale' | 'saltata'

/**
 * Quanto di un'attività del piano è stato fatto in aula. Il titolo è una copia:
 * il piano cambia, e il consuntivo di novembre non deve cambiare con lui.
 */
export interface AvanzamentoAttivita {
  attivitaId: string
  /** Come si chiamava l'attività il giorno della lezione. */
  titolo: string
  stato: StatoAttivita
  nota?: string
}

export type StatoLezione = 'pianificata' | 'svolta' | 'annullata'

/**
 * Un'ora di lezione. Conosce solo il corso: classe, materia e anno si leggono
 * da lì.
 */
export interface Lezione {
  id: string
  corsoId: string
  data: Iso
  slot: Slot[]
  aula?: string
  stato: StatoLezione
  /** Piano assegnato, se c'è. La scaletta resta nel piano: qui solo il rimando. */
  pianoId: string | null
  avanzamento: AvanzamentoAttivita[]
  presenze: Presenza[]
  osservazioni: Osservazione[]
  /**
   * La matrice del comportamento: solo le caselle segnate. Facoltativa, perché
   * i documenti più vecchi non ce l'hanno: chi la legge fa `?? []`.
   */
  matrice?: CellaOsservata[]
  /**
   * Che cosa si è fatto davvero: l'unico racconto a parole dell'ora (quel che
   * si voleva fare lo dice il piano).
   */
  argomenti?: string
  materiali?: string
  /** Come è andata: il consuntivo che si scrive a fine ora. */
  consuntivo?: string
  creataIl: Istante
  aggiornataIl: Istante
}

// ---------------------------------------------------------------- piani lezione

export type TipoAttivita =
  /**
   * Il tempo del docente di classe con la sua classe, che non è insegnamento
   * della materia (comunicazioni, moduli, colloqui, gite). Tipo a sé perché ha
   * altri parametri (ordine del giorno, cose da riportare) e perché quelle ore
   * si contano a parte.
   */
  | 'docenza-di-classe'
  | 'introduzione'
  | 'spiegazione'
  | 'esercizio'
  | 'laboratorio'
  | 'discussione'
  | 'verifica'
  | 'gruppo'
  | 'ripasso'
  | 'compito'
  | 'altro'

export type Raggruppamento = 'plenaria' | 'individuale' | 'coppie' | 'gruppi'

export type TipoRisorsa = 'collegamento' | 'file' | 'immagine'

/**
 * Materiale appeso a un piano o a una sua attività. Un collegamento resta un
 * indirizzo; un file o un'immagine si copiano nella cartella dei dati (il PDF
 * in Download può sparire) e qui resta il percorso relativo.
 */
export interface Risorsa {
  id: string
  tipo: TipoRisorsa
  /** Come la si chiama nell'elenco. Per un collegamento vale anche da testo del link. */
  titolo: string
  /** Solo per 'collegamento': l'indirizzo, http o https. */
  url?: string
  /** Solo per 'file' e 'immagine': percorso relativo alla cartella dei dati, con '/'. */
  file?: string
  /** Come si chiamava il file scelto: è quel che si riconosce a colpo d'occhio. */
  nome?: string
  note?: string
  aggiuntaIl: Istante
}

/**
 * Un'attività della scaletta. Porta le sue risorse, perché la scheda del lavoro
 * di gruppo appartiene a quel quarto d'ora e non al piano intero.
 */
export interface Attivita {
  id: string
  titolo: string
  tipo: TipoAttivita
  /**
   * Quanto dura, in UD, a quarti: si pensa in frazioni di unità, e così lo
   * stesso piano riempie l'ora anche dove le UD durano cinquanta minuti.
   */
  durataUd: number
  descrizione?: string
  /** Materiale d'aula in una riga: fotocopie, righello, laboratorio. */
  materiali?: string
  raggruppamento?: Raggruppamento
  risorse: Risorsa[]
  /**
   * I parametri propri del tipo (dimensione dei gruppi, durata di una verifica,
   * postazione…): le chiavi ammesse per tipo in `domain/activities.ts`. Una
   * chiave non più prevista resta e non si butta.
   */
  parametri?: Record<string, string | number | boolean>
  /**
   * Se questa tappa è una prova: il modello del momento che ne nascerà. Sta
   * sull'attività perché una lezione può averne due; il momento vero nasce
   * dentro la lezione in cui la prova si fa.
   */
  valutazione?: ValutazionePrevista | null
}

/**
 * La scaletta di una lezione, di un corso. Si riusa duplicandola su un altro
 * corso. `corsoId` nullo: un piano ancora senza casa.
 *
 * Niente valutazione propria: una prova è una tappa (`Attivita.valutazione`).
 * Niente titolo: il nome lo compone `nomePiano` da corso e lezione; il resto
 * sta in obiettivi, etichette e note.
 */
export interface PianoLezione {
  id: string
  corsoId: string | null
  obiettivi: string[]
  prerequisiti?: string
  attivita: Attivita[]
  /** Le risorse del piano nel suo insieme; quelle di una singola tappa stanno nell'attività. */
  risorse: Risorsa[]
  note?: string
  tag: string[]
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- valutazioni

export type TipoValutazione =
  | 'scritto'
  | 'orale'
  | 'pratico'
  | 'progetto'
  | 'compito'
  | 'osservazione'

/** Che valutazione produce un piano: il modello da cui nasce il momento vero. */
export interface ValutazionePrevista {
  titolo: string
  tipo: TipoValutazione
  peso: number
}

export interface Voto {
  allievoId: string
  /** Nullo finché il voto non c'è: 'non ancora messo' non è zero. */
  valore: number | null
  assente: boolean
  nota?: string
  /**
   * Il giorno in cui questo allievo ha riavuto la sua prova corretta: la sola
   * riconsegna che il registro conosce, e da qui si contano i termini di un
   * ricorso. Assente: il foglio è ancora in mano a chi insegna.
   */
  riconsegnataIl?: Iso | null
}

/**
 * Una riga della tabella dei recuperi: un allievo che rifà la prova, e quando.
 * Tabella a parte dai voti, ma stessa prova: il voto va nella casella di
 * sempre. Le scansioni stanno fra gli allegati del momento con ruolo
 * `recupero` (senza allievo il testo del recupero, con allievo la sua prova).
 */
export interface RecuperoProva {
  allievoId: string
  /** Il giorno in cui la prova si rifà. Nullo finché non è stato fissato. */
  previstoIl: Iso | null
  /**
   * Il giorno in cui la prova rifatta è tornata a questo allievo: una data sua,
   * da cui si contano i termini di un ricorso.
   */
  riconsegnataIl?: Iso | null
  /** «in laboratorio», «solo la parte B»: quel che va ricordato quel giorno. */
  nota?: string
  /**
   * Si rinuncia: la prova non si rifà (certificato lungo, lavoro sostitutivo…)
   * e la casella resta vuota. È una decisione dichiarata: il registro non
   * rinuncia da solo.
   */
  dispensato?: boolean
  aggiornatoIl: Istante
}

/** Estremi della scala e soglia di sufficienza. Predefinita: 1–6, sufficienza 4. */
export interface Scala {
  min: number
  max: number
  sufficienza: number
  /** Passo di arrotondamento dei voti inseribili (0.25 = mezzi e quarti). */
  passo: number
}

/**
 * Che cos'è un PDF appeso a una prova: testo, soluzione, compiti corretti per
 * allievo; poi `recupero` (senza allievo il testo, con allievo il compito
 * rifatto) e `recupero-soluzione`. Tutti allegati della stessa verifica.
 */
export type RuoloAllegato =
  | 'verifica'
  | 'soluzione'
  | 'prova'
  | 'recupero'
  | 'recupero-soluzione'

/**
 * Un PDF appeso a un momento di valutazione. Qui resta il percorso relativo
 * alla cartella dei dati, così la cartella si sposta senza rompere niente.
 */
export interface Allegato {
  id: string
  ruolo: RuoloAllegato
  /** Valorizzato solo per le prove: di chi è il compito. */
  allievoId: string | null
  /** Come si chiamava il file scelto: è quel che si legge nell'elenco. */
  nome: string
  /** Percorso relativo alla cartella dei dati, con '/' come separatore. */
  file: string
  aggiuntoIl: Istante
}

/**
 * Una verifica, un'interrogazione, un lavoro valutato. Conosce solo il corso;
 * il semestre lo dice la data.
 */
export interface MomentoValutazione {
  id: string
  corsoId: string
  /** La lezione in cui si è svolto, se combacia con una. */
  lezioneId: string | null
  /** Il piano da cui nasce: tiene insieme la preparazione e i voti che ne escono. */
  pianoId: string | null
  /**
   * La tappa del piano che l'ha prodotto: dentro la lezione, l'attività-prova
   * mostra il suo foglio. Con la sola lezione due prove della stessa ora non
   * si distinguerebbero.
   */
  attivitaId?: string | null
  titolo: string
  tipo: TipoValutazione
  data: Iso
  /**
   * Quanto pesa nella media del semestre: da 0 a 10, di norma 1. Decimale; zero
   * vuol dire una prova che non entra nella media.
   */
  peso: number
  /** Copia: la scala di quel giorno. Cambiare quella del registro non riscrive i voti dati. */
  scala: Scala
  descrizione?: string
  voti: Voto[]
  /** Chi rifà la prova, e quando. Assente: nessun recupero ancora promosso. */
  recuperi?: RecuperoProva[]
  /** Verifica, soluzione, prove corrette e recuperi: i PDF del momento. */
  allegati: Allegato[]
  // La riconsegna non sta qui ma su ogni voto (`Voto.riconsegnataIl`): chi
  // mancava la riavrà un altro giorno. Riconsegnare a tutti scrive la stessa
  // data su ogni riga.
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- consegne

/** Chi porta il foglio a chi: lo raccolgo dagli allievi, o glielo do io. */
export type VersoDocumento = 'ricevo' | 'consegno'

/** Come il documento arriva in mano all'allievo. */
type ModoConsegna = 'mano' | 'email'

/**
 * Il documento di un allievo dentro una richiesta: il file e basta. Separato
 * dalla spunta perché sono due fatti: avere il foglio non è averlo dato, e
 * averlo ricevuto non è averlo scansionato.
 */
interface DocumentoAllievo {
  allievoId: string
  /** Percorso relativo alla cartella dei dati. */
  file: string
  nome: string
  aggiuntoIl: Istante
}

export type TipoConsegna =
  | 'compito'
  | 'studio'
  | 'materiale'
  | 'consegna'
  | 'preparazione'
  | 'amministrativo'
  | 'altro'

/** A chi tocca: tutta la classe, chi insegna, o qualche nome in particolare. */
type DestinatarioConsegna = 'classe' | 'docente' | 'allievi'

/** L'id con cui il docente compare fra chi deve spuntare. Non è un allievo. */
export const CHI_INSEGNA = 'docente'

/**
 * Una spunta. Il completamento è individuale: così si sa chi manca.
 */
export interface SpuntaConsegna {
  /** L'id dell'allievo, o `CHI_INSEGNA` per quel che tocca a chi insegna. */
  chi: string
  fattaIl: Istante
  nota?: string
  /**
   * Il documento con cui è stata spuntata (forma vecchia: oggi i file stanno in
   * `Consegna.documenti`). Percorso relativo alla cartella dei dati.
   */
  file?: string
  /** Il nome che il file aveva quando è arrivato. */
  nome?: string
  /**
   * Come è passato il foglio. A mano resta solo la spunta; per mail restano gli
   * indirizzi a cui è partita, la prova che serve dopo.
   */
  modo?: ModoConsegna
  destinatari?: string[]
}

/**
 * Che cosa si è dato da fare, e a chi. Una consegna nasce in un'ora, ha un
 * termine, e si ripresenta in ogni lezione del corso finché non è spuntata.
 * Vale anche per il docente («portare le fotocopie»).
 */
export interface Consegna {
  id: string
  /** Il corso a cui appartiene: da lì si leggono classe, materia e anno. */
  corsoId: string
  testo: string
  tipo: TipoConsegna
  a: DestinatarioConsegna
  /** Solo con `a: 'allievi'`: chi in particolare. */
  allieviIds: string[]
  /**
   * Quando è nata. Nata in un'ora, tiene il rimando alla lezione: spostando la
   * lezione si sposta anche lei.
   */
  dataLezioneId: string | null
  data: Iso
  /** Per quando. Stessa regola: la lezione entro cui va fatta, o una data. */
  scadenzaLezioneId: string | null
  scadenza: Iso | null
  note?: string
  /**
   * Se spuntarla vuol dire consegnare un foglio: la categoria del documento.
   * È quel che la rende una «richiesta di documento», con un file per ciascuno
   * e la matrice di chi manca. Assente sulle consegne normali.
   */
  documento?: CategoriaDocumento
  /**
   * Da che parte va il foglio: «ricevo» (si aspetta un certificato) o
   * «consegno» (pagelle, convocazioni: la spunta vuol dire «gliel'ho dato»).
   * Assente vale «ricevo».
   */
  verso?: VersoDocumento
  /**
   * Come si consegna: a mano (si spunta passando fra i banchi, con firme se
   * serve) o per mail (un messaggio a testa col documento, e l'invio è la
   * prova).
   */
  modoConsegna?: ModoConsegna
  /** Con `modoConsegna: 'email'`: a chi scrivere, oltre che all'allievo. */
  mailAllievo?: boolean
  mailTutore?: boolean
  /** Oggetto e testo del messaggio, con i segnaposto {allievo}, {classe}, {documento}. */
  oggettoMail?: string
  corpoMail?: string
  /**
   * I file, uno per allievo: scansionati o pronti da dare. Arrivano dallo
   * smistamento o a mano, e non spuntano niente da sé.
   */
  documenti?: DocumentoAllievo[]
  /**
   * Il documento uguale per tutti, quando non ce n'è uno per allievo: la
   * circolare, il modulo da compilare. Vale per chi non ha il suo.
   */
  fileTutti?: string
  nomeTutti?: string
  /**
   * Se della distribuzione serve la prova firmata (pagelle, moduli che tornano
   * dai genitori): allora compare il foglio delle firme.
   */
  firmeRichieste?: boolean
  /**
   * Il foglio delle firme di consegna, uno per la classe: la lista firmata di
   * chi ha ritirato.
   */
  fileFirme?: string
  nomeFirme?: string
  fatte: SpuntaConsegna[]
  // Non c'è una chiusura della consegna intera: è finita quando l'ha fatta
  // ognuno. «Spunta tutti» scrive una spunta per nome, con la sua data.
  creataIl: Istante
  aggiornataIl: Istante
}

// ---------------------------------------------------------------- check

/**
 * Una colonna della lista di controllo: una cosa da spuntare allievo per
 * allievo («ha firmato il regolamento»). Identificata dall'id: rinominarla non
 * la stacca dalle spunte.
 */
export interface ColonnaCheck {
  id: string
  titolo: string
}

/**
 * Una casella spuntata: chi, quale colonna, quando. Spuntata in un'ora tiene il
 * rimando alla lezione e ne segue la data; con una data scelta a mano il
 * rimando è nullo. `data` c'è sempre, come riserva se la lezione sparisce. Le
 * caselle vuote non si salvano.
 */
export interface SpuntaCheck {
  allievoId: string
  colonnaId: string
  lezioneId: string | null
  data: Iso
  /** Quando è stata scritta: per ordinare, non per dire quando è stata fatta. */
  fattaIl: Istante
}

/**
 * La lista di controllo di un corso: una per corso (le cose si fanno in giorni
 * diversi; la lezione è il quando della spunta). In un file a sé: il corso si
 * salva intero dal suo modulo, e una copia vecchia cancellerebbe le spunte.
 */
export interface Check {
  id: string
  corsoId: string
  colonne: ColonnaCheck[]
  spunte: SpuntaCheck[]
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ------------------------------------------------------------- smistamento

/** Perché un blocco di pagine non è andato a destinazione da solo. */
export type MotivoQuarantena =
  /** Diviso a passo fisso o a mano: di chi siano queste pagine lo dice una persona. */
  | 'a-mano'
  | 'senza-nome'
  | 'senza-testo'
  | 'ambiguo'
  | 'gia-consegnato'
  | 'fuori-elenco'
  | 'senza-consegna'
  /** Letto dall'OCR e riconosciuto: manca solo che qualcuno dica di sì. */
  | 'da-confermare'

/**
 * Un pezzo di PDF che aspetta una mano: quali pagine, di chi si crede che
 * siano, e perché il registro non ha deciso da solo.
 */
export interface BloccoDaSmistare {
  id: string
  /** Prima e ultima pagina nel PDF originale: si contano da 1, comprese. */
  da: number
  a: number
  /** Chi si crede sia: una proposta da confermare, non una decisione. */
  allievoId: string | null
  motivo: MotivoQuarantena
  /** Il testo su cui si è deciso, troncato: serve a capire senza aprire il PDF. */
  estratto: string
  /** Da 0 a 1: quanto valeva il nome trovato. */
  fiducia: number
  /** Come si è letta la pagina. 'niente' vuol dire scansione mai passata all'OCR. */
  lettura: 'testo' | 'ocr' | 'niente'
  /**
   * L'immagine della prima pagina del blocco, percorso relativo alla cartella
   * dei dati: chi decide guarda il foglio, non la trascrizione.
   */
  anteprima?: string
}

/**
 * Una pagina del PDF come il registro l'ha letta. Si tiene per pagina perché i
 * blocchi si rifanno a ogni lettura in più: le letture sono il dato, i blocchi
 * se ne deducono.
 */
export interface PaginaSmistamento {
  /** Come si conta guardando il PDF: la prima è 1. */
  numero: number
  /** Il testo trovato, troncato: serve a riconoscere e a far capire. */
  testo: string
  lettura: 'testo' | 'ocr' | 'niente'
  /** L'immagine della pagina, percorso relativo alla cartella dei dati. */
  anteprima?: string
  /**
   * Dove è stato letto il nome sulla pagina, in frazioni del foglio (origine in
   * alto a sinistra): chi controlla guarda lì. Preciso col testo del PDF, largo
   * quanto la striscia letta con l'OCR.
   */
  riquadroNome?: RiquadroPagina
}

/** Un rettangolo su una pagina, in frazioni del foglio: 0,0 è in alto a sinistra. */
export interface RiquadroPagina {
  x: number
  y: number
  larghezza: number
  altezza: number
}

/**
 * Come si taglia un PDF di classe in documenti: `nomi` (il nome in testa a ogni
 * foglio), `passo` (N pagine a testa, per le scansioni senza nomi leggibili),
 * `mano` (le pagine le sceglie chi guarda). Si salva nello smistamento perché i
 * blocchi si rifanno a ogni lettura, e senza si tornerebbe al riconoscimento.
 */
export type Divisione =
  | { modo: 'nomi' }
  /** Un documento ogni `pagine` pagine: `pagine` è almeno 1. */
  | { modo: 'passo', pagine: number }
  | { modo: 'mano' }

/**
 * Un PDF arrivato nella cartella «in arrivo», e che fine ha fatto. Vive finché
 * resta qualcosa da sistemare; poi restano i documenti nelle consegne.
 */
export interface Smistamento {
  id: string
  /** La consegna a cui il PDF appartiene, o null se non si è capito. */
  consegnaId: string | null
  /** La classe che si crede sia: serve quando la consegna manca. */
  classeId: string | null
  /** Il PDF intero com'è arrivato: percorso relativo alla cartella dei dati. */
  file: string
  /** Il nome che aveva quando è arrivato. */
  nome: string
  pagine: number
  /** Com'è stata letta ogni pagina: il dato da cui i blocchi si ricavano. */
  letture: PaginaSmistamento[]
  /**
   * Le pagine già finite nella consegna di qualcuno. La consegna sta accanto
   * alla persona perché un PDF può alimentarne più d'una; senza, vale quella
   * del PDF. Con `firme` le pagine sono il foglio firme della richiesta, e
   * l'allievo è vuoto (l'unico caso).
   */
  assegnate: Array<{
    allievoId: string
    consegnaId?: string
    firme?: true
    /**
     * Il foglio di assenze in cui sono finite (periodo, rapporto, vergine o
     * firmato), al posto della consegna quando le pagine sono cadute sulla
     * matrice delle assenze.
     */
    assenze?: { classeId: string, bloccoId: string, tipo: TipoRapporto, firmato: boolean }
    da: number
    a: number
  }>
  /** Quel che resta da decidere. Vuoto vuol dire che non c'è più niente da fare. */
  blocchi: BloccoDaSmistare[]
  /** Se la lettura del PDF è fallita del tutto: il file resta lì e si dice perché. */
  errore?: string
  /** Come dividerlo. Assente vale `nomi`. */
  divisione?: Divisione
  arrivatoIl: Istante
}

// ---------------------------------------------------------------- radice

/**
 * Una pausa dopo la prima: quante UD dopo la fine della precedente, e quanto
 * dura. In UD e non con un orario, perché fra due pause ci stanno UD intere.
 */
export interface PausaSeguente {
  /** Unità didattiche fra la fine della pausa precedente e l'inizio di questa, intere. */
  dopoUd: number
  /** Minuti. */
  durataMin: number
}

/**
 * Le pause della giornata (ricreazione, pranzo). Solo la prima ha un orario;
 * le altre si contano in UD, così una giornata sbagliata non si può
 * dichiarare. Le lezioni nuove le seguono (vedi `domain/breaks.ts`).
 */
export interface PauseGiornata {
  prima: { inizio: Ora, durataMin: number }
  seguenti: PausaSeguente[]
}

export interface Impostazioni {
  scala: Scala
  /**
   * Il passo con cui si arrotonda la nota di fine semestre, diverso da quello
   * dei voti (di solito mezzi punti). Zero vuol dire «non arrotondare».
   */
  passoFineSemestre: number
  /**
   * Da quale percentuale di assenza una persona in formazione va segnalata,
   * in cifra tonda (20 = venti per cento). La decide la scuola. Zero spegne la
   * segnalazione.
   */
  sogliaAssenza: number
  /**
   * Quanti minuti dura un'unità didattica: il passo di tutta la giornata
   * (fasce, pause, colonne dell'appello). Nel documento perché è della scuola.
   * Estremi in `LIMITI_UD`.
   */
  minutiUd: number
  /** La prima ora che il calendario mostra: dove comincia la giornata. */
  oraInizioGiornata: Ora
  /** L'ultima ora che il calendario mostra. */
  oraFineGiornata: Ora
  /** 1 = lunedì … 7 = domenica. */
  giorniVisibili: number[]
  /** Quanto dura una lezione nuova, in minuti: sempre un multiplo di `minutiUd`. */
  durataSlotPredefinita: number
  /** I minuti proposti per una pausa nuova, dentro un'ora o nella giornata. */
  durataPausaPredefinita: number
  /**
   * Le pause della giornata, che le lezioni nuove seguono. Assente: nessuna
   * pausa dichiarata, una lezione nuova è un blocco solo.
   */
  pause?: PauseGiornata
  /**
   * Quando il registro rifà da sé i PDF di un corso, perché su disco ci sia
   * quel che il registro sa. `chiusura`: quando un'ora è segnata svolta.
   * `sempre`: a ogni modifica del corso, poco dopo. `mai`: solo dai pulsanti.
   */
  pdfAutomatici: QuandoRifarePdf
  /**
   * Le voci dei menu a tendina cambiate rispetto a quelle di fabbrica: una
   * chiave assente vuol dire «lista predefinita». Le liste riconosciute stanno
   * in `domain/lists.ts`; le altre non si salvano.
   */
  liste?: Record<string, VoceLista[]>
  /**
   * Il calendario esterno con cui si confrontano le lezioni. Nel documento
   * perché vale per un anno. Assente: il confronto non si è mai fatto.
   */
  calendario?: CalendarioEsterno
  /**
   * Le carte intestate (sede, logo, corsi) e chi firma: nel documento, perché
   * ogni scuola ha la sua e va ritrovata su un altro computer.
   */
  intestazione: Intestazione
}

/**
 * Quel che serve per disporre un'ora sulla giornata: durata dell'UD e pause.
 * Le impostazioni lo sono già; le prove passano solo questi due campi.
 */
export type Giornata = Pick<Impostazioni, 'minutiUd' | 'pause'>

/** Minimo, massimo e predefinito dell'altezza del logo, in millimetri. */
export const ALTEZZA_LOGO = { minimo: 6, massimo: 40, predefinita: 14 } as const

/**
 * Una carta intestata: nome della scuola, logo, e i corsi che la usano (chi
 * insegna in due sedi stampa con due testate, e decide il corso).
 */
export interface CartaIntestata {
  id: string
  /** Il nome della scuola, in alto a destra (`{{sede}}`). Vuoto, la riga sparisce. */
  sede: string
  /**
   * Il logo, come percorso dentro il documento (`intestazione/<id>.png`): il
   * file sta nel pacchetto. Assente, il foglio esce senza logo.
   */
  logo?: string
  /** Quanto è alto il logo sul foglio, in millimetri: la larghezza segue le proporzioni. */
  altezzaLogo: number
  /**
   * I corsi che stampano su questa carta. Ogni corso sta in una carta sola; uno
   * non nominato va nella prima, nei dati (`completaCarte` in
   * `domain/letterhead.ts`).
   */
  corsi: string[]
}

/** La carta intestata di un documento, e chi firma: vedi `Impostazioni.intestazione`. */
export interface Intestazione {
  /**
   * Le carte intestate, **almeno una**. La prima è quella di chi non ne ha
   * un'altra: dei corsi nuovi, e dei fogli di classe i cui corsi stanno su
   * carte diverse.
   */
  carte: CartaIntestata[]
  /** Chi firma, in fondo a sinistra di ogni pagina: una persona sola, qualunque carta. */
  docente: string
  /**
   * La firma delle e-mail in HTML, quando non è quella di serie (che usa il
   * nome qui sopra e la scuola della prima carta).
   */
  firma?: string
  /**
   * Se la cartella `templates/` accanto al documento è già stata letta per
   * importarne l'intestazione: si legge una volta sola, così una sede svuotata
   * apposta non ricompare.
   */
  vecchiaCartellaVista?: boolean
}

/**
 * Da dove arriva il calendario ICS, e le scelte già fatte sui suoi eventi. Il
 * calendario propone, il registro resta il posto in cui le lezioni si scrivono.
 */
export interface CalendarioEsterno {
  /**
   * I calendari da cui si legge: l'orario di sede, quello dei laboratori, le
   * supplenze. Ognuno si confronta per conto suo.
   */
  calendari: SorgenteCalendario[]
  /** Comuni a tutti i calendari: una regola vale ovunque l'evento compaia. */
  regole: RegolaCalendario[]
}

/**
 * Un calendario ICS del documento. Si legge sempre dalla copia nel documento
 * (`calendari/<id>.ics`): funziona senza rete e non cambia fra un confronto e
 * l'altro. La copia si rifà a mano con `calendario.aggiorna`.
 */
export interface SorgenteCalendario {
  id: string
  /** Come lo si chiama: «Orario di sede». */
  nome: string
  /** Un indirizzo `https://` o `webcal://`, o il percorso di un file `.ics`. */
  origine: string
  /** Quando si è fatta la copia l'ultima volta, in ISO. Assente: mai. */
  copiatoIl?: string
}

/**
 * «Gli eventi che dicono così sono quel corso», detto una volta sola. Il testo
 * si cerca in titolo e luogo (sintassi in `calendarRules.ts`). Un corso nullo
 * vuol dire «non è una lezione», e l'evento non si propone più.
 */
export interface RegolaCalendario {
  id: string
  testo: string
  corsoId: string | null
}

/** Vedi `Impostazioni.pdfAutomatici`. */
export type QuandoRifarePdf = 'mai' | 'chiusura' | 'sempre'

/**
 * Una voce di menu a tendina: il valore che si salva e la parola che si legge.
 * Separati perché rinominare una voce non deve cambiare i dati.
 */
export interface VoceLista {
  valore: string
  testo: string
  /**
   * Il colore della voce, `#rrggbb`, per le liste che lo dichiarano
   * (`attributi: ['colore']`). Assente vuol dire quello di fabbrica
   * (`coloreDiVoce`), non «nessun colore».
   */
  colore?: string
}

/**
 * Un indirizzo collocato sulla mappa, con chiave sull'indirizzo e non sulla
 * persona: una sola geocodifica per indirizzo, e si vede chi condivide casa o
 * ditta. Le coordinate (da Nominatim) si tengono: l'indirizzo di un minorenne
 * non va mandato fuori a ogni apertura della mappa.
 */
export interface Coordinata {
  /**
   * L'indirizzo in forma confrontabile: l'id della voce, così due scritture
   * dello stesso indirizzo trovano lo stesso punto.
   */
  chiave: string
  /** L'indirizzo come lo ha scritto il docente: è quel che si rilegge. */
  indirizzo: string
  lat: number
  lon: number
  /** Come ha capito l'indirizzo il geocodificatore: per decidere se fidarsi. */
  etichetta?: string
  /**
   * Il punto è quello del paese, non del portone (via assente in
   * OpenStreetMap): va detto, perché il segnaposto non sia preso per preciso.
   */
  approssimato?: boolean
  trovatoIl: Istante
}

/**
 * Lo stato del registro: quel che l'archivio legge e il webview riceve. È lo
 * stato di un anno (classi, ore, voti, documenti, materie, impostazioni) più
 * le intestazioni di tutti gli anni in `anni`.
 */
export interface Registro {
  versione: number
  /** Le intestazioni di tutti gli anni trovati, in ordine di inizio. */
  anni: AnnoScolastico[]
  /** L'anno in uso: quello di cui sono caricate le collezioni. */
  annoCorrenteId: string | null
  materie: Materia[]
  classi: Classe[]
  corsi: Corso[]
  lezioni: Lezione[]
  piani: PianoLezione[]
  valutazioni: MomentoValutazione[]
  fascicoli: Fascicolo[]
  consegne: Consegna[]
  /** Le liste di controllo, una per corso. */
  check: Check[]
  smistamenti: Smistamento[]
  /** Gli indirizzi collocati, uno per indirizzo e non uno per persona. */
  coordinate: Coordinata[]
  impostazioni: Impostazioni
}

/**
 * La versione della forma dei dati, scritta in ogni documento. Un registro
 * rifiuta un documento più recente del suo (lo riscriverebbe perdendo i campi
 * che non conosce) e porta avanti quelli più vecchi con `PASSI_DEL_FORMATO`
 * (`domain/upgrades.ts`).
 *
 * Ogni campo nuovo su disco vuole questo numero più alto, il suo passo e il
 * campione in `tests/samples/formato/` (`npm run sample`): lo controllano
 * `migrationVersion.test.mjs`, `upgrades.test.mjs`, `formatUpgrade.test.mjs`.
 * Vedi la skill `formato`.
 */
export const VERSIONE_DATI = 1

/**
 * Le collezioni del registro, una per file. Chi modifica dichiara quali ha
 * toccato, e si riscrivono solo quelle.
 */
export type Collezione =
  | 'registro'
  | 'classi'
  | 'corsi'
  | 'lezioni'
  | 'piani'
  | 'valutazioni'
  | 'fascicoli'
  | 'consegne'
  | 'check'
  | 'smistamenti'
  | 'coordinate'
