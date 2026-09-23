// Il vocabolario del registro. Tutto il resto — archivio su disco, protocollo
// del webview, viste — parla di queste forme e di nessun'altra.
//
// Due convenzioni tengono insieme il file:
//   Iso  una data senza fuso orario, 'AAAA-MM-GG'. Il registro ragiona per
//        giorni di calendario, non per istanti: Date con l'ora dentro sposta le
//        lezioni di un giorno appena si cambia fuso, e non serve a niente qui.
//   Ora  'HH:MM' a 24 ore. Confrontabile come stringa, ed è il motivo del
//        formato a due cifre.
//
// E una regola sola per decidere ogni legame, applicata ovunque qui dentro:
//   annidare  se non ha vita propria e muore col contenitore (uno slot, un voto)
//   riferire  se deve restare aggiornato (il nome della classe)
//   copiare   se deve restare com'era (la scala con cui è stato dato un voto)
//   derivare  se si ricava da altro — e allora non si scrive (il semestre)

/** Data di calendario, 'AAAA-MM-GG'. */
export type Iso = string
/** Ora del giorno, 'HH:MM' su 24 ore. */
export type Ora = string
/** Istante di modifica, ISO 8601 completo. Serve solo per ordinare e mostrare. */
export type Istante = string

// ---------------------------------------------------------------- anno e semestri

/**
 * Un semestre. Sono sempre due per anno: è la scansione su cui il registro
 * raggruppa le valutazioni e calcola le medie. Nessuno lo cita per id — il
 * semestre di una data si trova guardando dentro quali estremi cade.
 */
export interface Semestre {
  id: string
  numero: 1 | 2
  etichetta: string
  inizio: Iso
  fine: Iso
}

/**
 * Un periodo in cui non si fa lezione: vacanze, ponti, giornate d'istituto.
 *
 * Serve a due cose, e la seconda è quella per cui esiste: nel calendario i
 * giorni si spengono, e la generazione dell'orario li salta. Senza, generare le
 * lezioni di un semestre vorrebbe dire poi cancellarne quindici a mano, che è
 * peggio che scriverle.
 */
export interface Sospensione {
  id: string
  etichetta: string
  dal: Iso
  al: Iso
}

/**
 * La lettera di una settimana, dove l'orario è quindicinale: A o B.
 *
 * Due lettere e non un numero perché è così che le chiama chi le usa — «questa
 * è una B» — e perché sono due: un terzo turno non esiste in nessun orario che
 * il registro debba servire, e prevederlo vorrebbe dire chiedere «quale?»
 * ovunque invece di «A o B?».
 */
export type LetteraSettimana = 'A' | 'B'

/**
 * Un anno scolastico. È anche l'unità di stoccaggio: a ogni anno corrisponde
 * una cartella, e dentro ci sono le sue classi, le sue ore, i suoi documenti.
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
   * Quali settimane sono A e quali B, per il lunedì che le apre.
   *
   * Una settimana che non compare qui non ha lettera, ed è il caso normale:
   * le vacanze, le settimane di stage, quelle in cui la quindicina non conta.
   * Si scrivono a mano una per una e non si ricavano da una regola —
   * «alterna da settembre» — perché la regola non regge il primo imprevisto:
   * basta una settimana di vacanza in mezzo, o un recupero, e da lì in poi
   * ogni settimana sarebbe sbagliata senza che niente lo dica. Quarant'anni
   * di orari scolastici dicono che l'alternanza vera ha sempre qualche
   * eccezione, e una regola con le eccezioni è più difficile da leggere
   * dell'elenco.
   *
   * La chiave è il lunedì in forma `AAAA-MM-GG` e non il numero di settimana
   * ISO: il numero cambia significato a cavallo dell'anno solare — la 1 di
   * gennaio e la 53 di dicembre confinano — mentre una data si confronta con
   * quella di una lezione senza convertire niente.
   */
  settimane?: Record<Iso, LetteraSettimana>
  note?: string
  /**
   * Il nome della cartella in cui l'anno vive — '2025-2026'.
   *
   * Non si scrive nel file: è la cartella stessa a dirlo, e riscriverlo dentro
   * vorrebbe dire poterlo contraddire spostando la cartella. Lo riempie
   * `Archivio` quando legge, e serve a chi deve tornare a scrivere in un anno
   * che non è quello in uso.
   */
  cartella?: string
}

// ---------------------------------------------------------------- materie e corsi

/**
 * Una materia. È un'entità con un id e non una parola scritta sulla classe
 * perché su di lei si appoggiano i corsi: «matematica» e «Matematica» scritte
 * in due momenti diversi non devono diventare due materie diverse.
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
 * Un corso: questa materia, a questa classe. È il perno del registro.
 *
 * La classe da sola è un gruppo di allievi, la materia da sola una voce di
 * catalogo; l'insegnamento è la coppia, e sta scritta qui una volta sola. Tutto
 * ciò che riguarda l'insegnare — lezioni, valutazioni, programma svolto — si
 * aggancia al corso e smette di nominare classe e materia per conto suo.
 *
 * L'anno non c'è: lo porta la classe. Una classe appartiene a un anno, quindi
 * un corso pure, e scriverlo di nuovo qui sarebbe solo un modo di poterlo
 * scrivere sbagliato.
 */
/**
 * Una fascia fissa dell'orario: «il martedì, dalle 08:20, novanta minuti».
 *
 * L'orario di un docente si ripete tutto l'anno, e ribatterlo lezione per
 * lezione trentacinque volte è il lavoro che un registro dovrebbe togliere, non
 * chiedere. Da qui si generano le lezioni vere, che restano modificabili una
 * per una: la ricorrenza è uno stampo, non un vincolo.
 *
 * `dal` e `al` servono agli orari che cambiano a metà anno; vuoti valgono per
 * tutto l'anno della classe.
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
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- classi e allievi

/**
 * Un allievo dentro una classe: chi è, e come lo si raggiunge.
 *
 * Quel che serve a un registro: il nome per l'appello e per i voti, i recapiti
 * per le comunicazioni, i fogli delle assenze e le consegne, e i due dati che
 * i moduli della scuola chiedono sempre — la nascita e dove sta l'azienda.
 *
 * Le note non ci sono e non tornano: erano un campo libero che non leggeva
 * nessuno, e quel che si osserva di una persona sta nelle osservazioni, con
 * la data e l'ora in cui è stato scritto.
 */
/**
 * A chi risponde un numero di telefono.
 *
 * Tre e non di più: sono i tre interlocutori che il registro conosce già —
 * la persona, chi risponde per lei da minorenne, chi la ospita in azienda — e
 * un quarto è una parola da inventare a cui non corrisponde nessun documento.
 */
import type { Indirizzo } from './addresses.js'

export type { Indirizzo } from './addresses.js'

export type ContattoTelefonico = 'pif' | 'rappresentante' | 'datore'

/**
 * Che numero è: quel che si dice a voce prima di comporlo.
 *
 * Un elenco chiuso e non testo libero, perché serve a scegliere quale provare
 * per primo — un cellulare risponde, un centralino la domenica no — e venti
 * modi di scrivere «cellulare» non si confrontano. «altro» è la via
 * d'uscita, e chi ne ha due così li distingue dall'ordine.
 */
export type EtichettaTelefono = 'cellulare' | 'casa' | 'lavoro' | 'centralino' | 'altro'

/** Un numero di telefono nell'anagrafica: a chi risponde, che numero è, e qual è. */
export interface Telefono {
  id: string
  contatto: ContattoTelefonico
  etichetta: EtichettaTelefono
  /** Scritto come lo si compone: il registro non lo riformatta e non lo valida. */
  numero: string
}

export interface Allievo {
  id: string
  cognome: string
  nome: string
  /**
   * Il giorno in cui è nato, in ISO.
   *
   * Non serve al registro per contare presenze o medie: serve a chi compila i
   * moduli della scuola — contratti di tirocinio, iscrizioni agli esami,
   * richieste che arrivano dall'esterno — e che senza andrebbe a cercarla in
   * un altro elenco. Due omonimi nella stessa classe si distinguono solo da
   * qui.
   *
   * Facoltativa, come ogni altro recapito: chi non ce l'ha non porta una riga
   * vuota sui fogli che si stampano.
   */
  dataNascita?: Iso
  /**
   * Dove abita: la via, il NAP e la località, ciascuno nella sua casella.
   *
   * Per anni è stato una riga sola, e la ragione era buona: il registro lo
   * mostrava e basta, e quattro caselle da riempire per ottenere la stessa riga
   * sono tre caselle di troppo. Poi la riga ha cominciato a servire — la mappa
   * la manda al geocodificatore, che la vuole a pezzi; i fogli intestano buste;
   * e un elenco in cui il NAP sta dentro una frase non si ordina e non si
   * raggruppa per località — e un indirizzo tenuto come testo è un indirizzo di
   * cui il registro sa soltanto che è scritto.
   *
   * In una riga sola si rilegge quando serve, con `scriviIndirizzo`: è
   * esattamente quella di prima, ed è la chiave con cui le coordinate già
   * trovate continuano a valere. Vedi `domain/addresses.ts`.
   */
  indirizzo?: Indirizzo
  email?: string
  /** L'indirizzo di chi va avvisato al posto suo, o oltre a lui. */
  emailTutore?: string
  /**
   * L'azienda in cui fa il tirocinio, e la casella a cui si scrive.
   *
   * Sta a sé e non fra i tutori perché non è la stessa persona e non riceve le
   * stesse cose: il tutore prende le comunicazioni alla classe, il datore di
   * lavoro firma i fogli delle assenze. Confonderli vorrebbe dire mandare la
   * gita in azienda e il rapporto delle assenze a casa.
   */
  azienda?: string
  /**
   * Dove sta l'azienda, nelle stesse caselle di quello di casa.
   *
   * Serve a chi la deve raggiungere — la visita in azienda, un foglio spedito
   * per posta, un modulo da intestare — e senza si finisce a cercarla in
   * rete ogni volta. Sta accanto al nome e non dentro, perché negli elenchi
   * si vuole l'azienda per nome e non un nome con dentro un indirizzo.
   */
  indirizzoDatore?: Indirizzo
  emailDatore?: string
  /**
   * I numeri di telefono, di chiunque risponda.
   *
   * Erano due caselle — il suo e quello del datore — e due caselle non bastano
   * a nessuno: una persona in formazione ha il cellulare e il fisso di casa, un
   * rappresentante legale ne ha uno per sé e uno al lavoro, e in azienda il
   * centralino e il diretto del capo sono due numeri diversi che si provano in
   * quest'ordine. Chi ne aveva due li scriveva nella stessa casella separati da
   * una barra, e quel che ne usciva sul foglio stampato non era un numero.
   *
   * Ogni numero dice tre cose: a chi risponde, che numero è, e qual è. La prima
   * è quella che evita l'errore che si paga — chiamare l'azienda credendo di
   * chiamare casa — e per questo non è il posto nell'elenco a dirlo, ma un
   * campo suo.
   *
   * L'ordine dentro lo stesso contatto è l'ordine in cui si prova: il primo è
   * quello che si compone per primo, e si cambia trascinando la riga.
   */
  telefoni: Telefono[]
  /**
   * Il ritratto: percorso relativo alla cartella dell'anno, come ogni allegato.
   *
   * Serve a due fogli — la scheda che si consegna e la parete di ritratti della
   * classe — e a chi entra in aula la prima volta con venticinque nomi da
   * imparare. Il file sta nella cartella della classe, dentro l'anno, e non
   * nel JSON: una
   * fotografia in base64 dentro l'anagrafica farebbe un file da megabyte che
   * si riscrive a ogni presenza segnata.
   *
   * Un ritratto è un dato personale come l'indirizzo di casa, e la cartella
   * dell'anno è il posto in cui stanno già tutti gli altri: chi archivia
   * l'anno se li porta dietro, chi lo cancella se ne libera insieme.
   */
  foto?: string
  /** Un ritiro non cancella l'allievo: le lezioni passate lo citano ancora. */
  attivo: boolean
}

/**
 * Un gruppo di allievi in un anno scolastico, e nient'altro.
 *
 * Non dice che materia ci si insegna: quella è una proprietà del corso, e una
 * classe può averne più d'uno. Non contiene nemmeno il fascicolo del docente di
 * classe — recapiti, documenti, comunicazioni — perché quelle cose crescono per
 * tutto l'anno mentre l'elenco degli allievi si tocca due volte, e tenerle nello
 * stesso file significa riscrivere l'anagrafica a ogni mail spedita.
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
   * Il docente di classe raccoglie documenti e scrive alle famiglie: è un
   * mestiere in più sulla stessa classe, non una classe diversa, e chi non lo
   * fa non deve nemmeno vederne i comandi.
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
 * Un documento raccolto dal docente di classe, come si scriveva prima.
 *
 * Non si creano più: un documento da raccogliere è una consegna come le altre —
 * ha un termine, si spunta, e la spunta porta con sé il file. Restava altrimenti
 * un secondo elenco di cose da fare, con una sua scadenza e un suo posto in cui
 * andarla a guardare, per la stessa identica domanda: chi non ha ancora
 * portato quel foglio.
 *
 * Il tipo resta perché i file scritti prima si devono poter ancora leggere:
 * alla lettura diventano consegne. Quelli di una classe in cui non si insegna
 * — senza corso a cui agganciarli — restano qui finché un corso non c'è.
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
 * Una comunicazione alla classe. I destinatari non si scrivono a mano: si dice
 * a quali gruppi va — allievi, tutori, recapiti fissi — e gli indirizzi si
 * ricavano dalla classe al momento dell'invio, così una mail cambiata resta
 * giusta anche nelle comunicazioni già scritte.
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
   * Gli allegati, per id della consegna che li ha raccolti: quelle «a me» che
   * hanno un file, cioè i moduli e le circolari che si tengono da parte.
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
 * Il fascicolo di una classe: quel che tiene il docente di classe e nessun
 * altro. Sta fuori dalla classe perché ha un'altra vita — le comunicazioni si
 * accumulano per tutto l'anno — e in un file suo perché `classi.json`
 * deve restare corto e leggibile a mano.
 *
 * Esiste al più un fascicolo per classe, e nasce quando serve: una classe senza
 * fascicolo è semplicemente una classe di cui non si è docente di classe.
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
 * Che cosa racconta un foglio: le ore mancate o le entrate in ritardo.
 *
 * Sono due stampe distinte e non due colonne della stessa, perché la scuola le
 * produce così e il datore di lavoro le firma così: un periodo può avere
 * entrambe, una sola, o — per chi non ha mancato niente — nessuna.
 */
export type TipoRapporto = 'assenze' | 'ritardi'

/**
 * Un PDF di un periodo, per un allievo.
 *
 * `firmato` distingue le due vite dello stesso foglio: quello che parte —
 * «vergine», come lo stampa la scuola — e quello che torna indietro con la
 * firma dell'azienda sopra. Sono due file diversi e vanno tenuti tutti e due:
 * il primo è quel che si è chiesto, il secondo è la prova di averlo ottenuto,
 * e sovrascrivere l'uno con l'altro perderebbe metà della storia.
 *
 * Il file sta nella cartella dei dati; qui resta il percorso relativo, come per
 * ogni altro allegato del registro.
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
 * La spedizione di un allievo. Si scrive dopo il tentativo, riuscito o no: un
 * invio fallito che non lascia traccia si ritenta alla cieca, e nessuno sa che
 * per quel nome la casella dell'azienda è sbagliata.
 */
export interface InvioAssenze {
  /** Gli indirizzi a cui è andata davvero: copia, si scrive solo dopo. */
  destinatari: string[]
  inviatoIl: Istante
  /** Valorizzato solo se non è partita: allora l'invio è da rifare. */
  errore?: string
}

/**
 * La riga di un allievo dentro un periodo: i suoi fogli e la sua mail.
 *
 * Esiste solo per chi ha qualcosa da far firmare. In un trimestre metà classe
 * non ha mancato un'ora, e tenere una riga vuota per ciascuno vorrebbe dire un
 * elenco in cui il lavoro da fare non si vede più.
 */
export interface RigaAssenze {
  allievoId: string
  fogli: FoglioAssenze[]
  /** L'ultimo tentativo di spedizione, o null se non se n'è ancora fatto nessuno. */
  invio: InvioAssenze | null
  note?: string
}

/**
 * Un periodo di assenze da far firmare: il blocco di lavoro del docente di
 * classe, dal foglio stampato alla firma che torna indietro.
 *
 * Le tre fasi stanno tutte qui dentro perché sono la stessa pratica guardata a
 * tre momenti — il vergine che parte, la mail che lo chiede, il firmato che
 * arriva — e spezzarle in tre elenchi separati vorrebbe dire, per ogni nome,
 * cercare in tre posti per sapere a che punto si è. Il periodo è l'unità in cui
 * la scuola lo chiede («il primo semestre») e in cui l'azienda lo firma.
 *
 * Non è una `Comunicazione`: quella va alla classe intera e prende gli
 * indirizzi dai gruppi, questa è una mail per allievo — un'azienda per volta,
 * con addosso i fogli di quel nome e nient'altro. L'oggetto e il testo si
 * scrivono una volta sola per il periodo e si compilano per ciascuno: vedi
 * `testoAssenze` per i segnaposto.
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
 * Una frazione di orario della lezione. Una lezione ne ha almeno una; le pause
 * sono slot come gli altri, con tipo 'pausa', perché una lezione di due ore con
 * quindici minuti in mezzo resta una lezione sola — stesso corso, stesso piano,
 * stesse presenze — e spezzarla in due falserebbe conteggi e medie.
 */
export interface Slot {
  id: string
  inizio: Ora
  fine: Ora
  tipo: 'lezione' | 'pausa'
  etichetta?: string
}

/**
 * Quattro stati, più il non detto.
 *
 * Ce n'erano sei, e i due che sono spariti — «giustificato» e «uscita
 * anticipata» — dicevano cose che l'appello per unità didattica dice meglio da
 * sé. Un'uscita alle dieci non è uno stato dell'ora: è presente nelle prime UD
 * e assente nelle ultime, e scritta così si conta da sola. La giustificazione
 * non è un modo di essere assenti ma una cosa che arriva dopo, spesso giorni
 * dopo, e stava nello stesso campo dell'assenza costringendo a cambiarla per
 * registrarla: quel che se ne sa si scrive nella nota.
 *
 * `non-impostato` non è un quinto modo di stare in aula: è l'assenza di una
 * risposta. Senza, una casella mai toccata si leggeva «presente», e un appello
 * dimenticato diventava indistinguibile da un appello fatto con tutti in
 * classe — il registro raccontava una presenza che nessuno aveva verificato.
 * È lo stato con cui ogni casella nasce, e l'unico che si può dire di non
 * sapere.
 */
export type StatoPresenza =
  | 'non-impostato'
  | 'presente'
  | 'assente'
  | 'ritardo'
  | 'esonerato'

/**
 * L'appello di un allievo su un'ora, unità didattica per unità didattica.
 *
 * Uno stato solo per l'intera lezione non reggeva: un blocco di due ore con la
 * pausa in mezzo sono quattro UD, e chi arriva alla terza è assente per due e
 * presente per due — segnarlo «ritardo» e basta perde due UD di assenza, che
 * sono proprio quelle che a fine semestre si contano. `stati` ne ha uno per
 * ogni UD dell'ora, nell'ordine in cui l'ora le mette in fila; se l'elenco è
 * più corto di quante ne conta la lezione, le UD che restano si leggono come
 * non impostate — non come presenze, che sarebbe una risposta che nessuno ha
 * dato.
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
 * Il segno di una cella della matrice: come è andata, senza mezze misure.
 *
 * Due soli valori, e non una scala da uno a cinque. Quel che si segna mentre
 * la classe lavora è un'impressione presa di sfuggita — «oggi ha tirato il
 * gruppo», «oggi ha disturbato» — e una scala a cinque gradini costringe a
 * decidere se è un tre o un quattro proprio nel momento in cui non si può
 * pensarci. Quel che c'è da dire in più si scrive nella nota della cella.
 */
export type SegnoOsservato = 'positivo' | 'negativo'

/**
 * Una casella della matrice del comportamento: una persona, un aspetto, un'ora.
 *
 * Gli aspetti sono quelli della lista `aspettoOsservato`, che si cambia da
 * Impostazioni: che cosa si guardi di una classe dipende da che cosa ci si
 * fa dentro, e il laboratorio non osserva le stesse cose dell'aula.
 *
 * Le celle vuote non si salvano: la matrice tiene solo quelle segnate, che in
 * un'ora sono tre o quattro su sessanta. Salvarle tutte vorrebbe dire un file
 * che cresce di un migliaio di righe a settimana per dire «niente da dire».
 */
export interface CellaOsservata {
  allievoId: string
  /** Il valore di una voce della lista `aspettoOsservato`. */
  aspetto: string
  /**
   * `null` quando c'è solo l'annotazione.
   *
   * Si può scrivere che cosa è successo senza dire se è un bene o un male —
   * «ha chiesto di cambiare posto» non è né l'uno né l'altro — e costringere a
   * un segno per poter scrivere una riga vorrebbe dire far dire al registro
   * cose che chi scrive non pensa.
   */
  segno: SegnoOsservato | null
  nota?: string
}

export type StatoAttivita = 'da-fare' | 'svolta' | 'parziale' | 'saltata'

/**
 * Quanto di un'attività del piano è stato effettivamente fatto in aula.
 *
 * Il titolo è una copia, non un rimando: il piano è fatto per essere riusato e
 * quindi cambia: rinominare un'attività a gennaio non deve riscrivere il
 * consuntivo di novembre, e cancellarla non deve lasciarlo muto.
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
 * Un'ora di lezione. Conosce il corso e nient'altro: classe, materia e anno si
 * leggono da lì, e non stanno scritte qui perché due copie della stessa cosa
 * sono due occasioni di dire cose diverse.
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
   * La matrice del comportamento: le caselle segnate, e nient'altro.
   *
   * Facoltativa perché i registri scritti prima che esistesse non ce l'hanno,
   * e un file vecchio deve continuare ad aprirsi: chi la legge fa `?? []`.
   */
  matrice?: CellaOsservata[]
  /**
   * Che cosa si è fatto davvero.
   *
   * È l'unico posto in cui l'ora si racconta a parole. La lezione non ha un
   * titolo suo: quel che ci si aspetta di fare lo dice il piano assegnato, quel
   * che si è fatto lo dice questo campo, e un terzo testo da riempire a mano
   * era solo un'altra casella che restava vuota o diceva la stessa cosa.
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
   * Il tempo che il docente di classe passa con la sua classe, e che non è
   * insegnamento della materia: le comunicazioni, i moduli da firmare, i
   * colloqui, la gita da organizzare.
   *
   * È un tipo a sé e non una spiegazione con un titolo diverso perché non
   * risponde alle stesse domande: non ha un supporto né un riferimento sul
   * libro, ha un ordine del giorno e delle cose da riportare. E soprattutto
   * perché quel tempo va contato a parte: alla fine dell'anno la domanda
   * "quante ore ho fatto da docente di classe" ha una risposta solo se le ore
   * lo dicono.
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
 * Materiale appeso a un piano o a una sua attività: un collegamento, un file,
 * un'immagine.
 *
 * Un collegamento è un indirizzo e resta un indirizzo — una pagina non si porta
 * dentro il registro. Un file e un'immagine invece si copiano nella cartella
 * dei dati: il PDF scelto può stare in Download e sparire la settimana dopo,
 * mentre un piano deve reggere anche l'anno prossimo. Qui resta solo il
 * percorso relativo, come per gli allegati delle verifiche, così la cartella si
 * può spostare o sincronizzare senza rompere niente.
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
 * Un'attività della scaletta: il modulo di cui è fatto un piano. Porta con sé
 * le proprie risorse, perché la scheda che serve al lavoro di gruppo appartiene
 * a quel quarto d'ora e non al piano intero.
 */
export interface Attivita {
  id: string
  titolo: string
  tipo: TipoAttivita
  /**
   * Quanto dura, in unità didattiche.
   *
   * Stava in minuti, ed erano i minuti a essere l'unità sbagliata: nessuno
   * prepara un'ora pensando «trentasette minuti di esercizi». Si pensa per
   * frazioni dell'unità — mezza di spiegazione, un quarto di ripasso, due
   * intere di laboratorio — e quanto duri un'unità lo dice l'orario, che
   * cambia da scuola a scuola e da slot a slot. Scrivendo in minuti, lo stesso
   * piano riusato in una scuola con le UD da cinquanta lasciava scoperto un
   * decimo dell'ora senza dirlo.
   *
   * Si conta a quarti di UD: sotto non si scende, e in mezzo non si sta.
   */
  durataUd: number
  descrizione?: string
  /** Materiale d'aula in una riga: fotocopie, righello, laboratorio. */
  materiali?: string
  raggruppamento?: Raggruppamento
  risorse: Risorsa[]
  /**
   * Che cosa dell'attività dipende dal suo tipo.
   *
   * Un lavoro di gruppo ha una dimensione dei gruppi, una verifica ha una
   * durata e un punteggio, un laboratorio ha una postazione: sono domande che
   * hanno senso per un tipo solo, e mettere in fila tutti i campi di tutti i
   * tipi renderebbe il modulo illeggibile per chiunque. Le chiavi ammesse le
   * dice `domain/activities.ts`, tipo per tipo; quel che resta scritto sotto una
   * chiave che non c'è più non dà fastidio a nessuno e non si butta.
   */
  parametri?: Record<string, string | number | boolean>
  /**
   * Quando questa tappa è una prova: che cosa nascerà, se la si valuta.
   *
   * Sta sull'attività e non sul piano perché è la tappa a essere una verifica —
   * il piano intero quasi mai lo è — e perché una lezione può contenerne due:
   * l'interrogazione all'inizio e il test alla fine. Il momento vero non sta
   * qui: nasce dentro la lezione in cui la prova si è fatta, e questa è la
   * traccia con cui nasce già compilato.
   */
  valutazione?: ValutazionePrevista | null
}

/**
 * La scaletta di una lezione, e sta sul corso.
 *
 * Stava sulla materia, perché un piano si riusa: la stessa introduzione alle
 * proporzioni vale per la DIC4a di quest'anno e per la DIC2 dell'anno prossimo.
 * Ma «vale anche là» non è «è di là»: un piano preparato per una classe ne
 * conosce il livello, il tempo che ha, le cose già fatte, e presentarlo come
 * proprietà comune di tutte le classi che fanno quella materia significava
 * cercarlo in un elenco dove metà delle voci non c'entravano.
 *
 * Il riuso resta, e passa dalla duplicazione: si copia il piano dell'altro
 * corso e lo si adatta. Una copia che si può cambiare senza rovinare l'anno
 * scorso è quel che si voleva davvero fare — e infatti è quel che si faceva
 * comunque, a mano.
 *
 * `corsoId` nullo è ammesso: un piano appena abbozzato, ancora senza casa.
 *
 * Una valutazione il piano non ce l'ha, e non l'ha più: ce l'avuta, accanto a
 * quella delle attività, e i due posti dicevano la stessa cosa in disaccordo —
 * il piano prometteva «una verifica» e la scaletta ne aveva due, o nessuna. La
 * prova è una tappa dell'ora, non una proprietà dell'ora intera: è
 * un'attività a durare venti minuti e a produrre voti, e quindi è l'attività
 * a dirlo. Un piano che porta a valutazione è un piano che ha almeno una
 * tappa valutata, e si legge dalla scaletta invece che da una casella a parte.
 *
 * Un titolo suo non ce l'ha. C'era, ed era una casella da riempire con quel che
 * già si sapeva: il piano è la lezione di quel corso, e chiamarlo «Lezione del
 * 15.09» accanto alla lezione del 15.09 non aggiungeva niente. Il nome lo dice
 * `nomePiano`, che lo compone dal corso e dalla lezione che lo usa; quel che
 * un titolo diceva davvero — «recupero», «con la prova in fondo» — sta negli
 * obiettivi, nelle etichette e nelle note, che si cercano tutti.
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
   * Il giorno in cui *questo* allievo ha riavuto la sua prova corretta.
   *
   * È la sola riconsegna che il registro conosce: una data per la prova intera
   * diceva «la classe l'ha riavuta», che per chi quel giorno mancava non era
   * vero — e da questa data si contano i termini di un ricorso. Riconsegnare a
   * tutta la classe scrive lo stesso giorno su ogni riga, e resta la riga a
   * dire di chi è.
   *
   * Assente vuol dire «non ancora riavuta»: finché è vuota quel foglio è in
   * mano a chi insegna, ed è quel che il todo va a pescare.
   */
  riconsegnataIl?: Iso | null
}

/**
 * Una riga della tabella supplementare dei recuperi: un allievo che rifà la
 * prova, e quando.
 *
 * Sta accanto ai voti e non dentro il voto perché è un'altra tabella: i voti
 * sono venticinque righe che si compilano di corsa, i recuperi sono due o tre
 * che si guardano una alla volta. E non è un momento di valutazione a parte:
 * la prova recuperata è la stessa prova — stesso argomento, stesso peso, stessa
 * colonna nella griglia — e il voto che ne esce va nella casella di sempre.
 * Farne un momento suo voleva dire una colonna in più per ogni assente, medie
 * da ricomporre a mano, e due prove nei rapporti dove ce n'era una.
 *
 * I documenti scansionati stanno fra gli allegati del momento, con ruolo
 * `recupero`: il testo della prova di recupero senza allievo, e la prova
 * corretta di ciascuno con il suo.
 */
export interface RecuperoProva {
  allievoId: string
  /** Il giorno in cui la prova si rifà. Nullo finché non è stato fissato. */
  previstoIl: Iso | null
  /**
   * Il giorno in cui la prova rifatta è tornata in mano a *questo* allievo.
   *
   * Un giorno suo, che non ha niente a che vedere con quello in cui la classe
   * ha rivisto la verifica: chi l'ha rifatta a gennaio riavrà il suo foglio
   * quando sarà corretto. Segnargli la riconsegna di un compito che quel
   * giorno non esisteva ancora sarebbe una data falsa, e da questa data si
   * contano i termini di un ricorso.
   */
  riconsegnataIl?: Iso | null
  /** «in laboratorio», «solo la parte B»: quel che va ricordato quel giorno. */
  nota?: string
  /**
   * Si rinuncia: la prova non si rifà e la casella resta vuota per sempre.
   *
   * Serve perché non tutte le assenze si recuperano — un certificato lungo, un
   * lavoro sostitutivo già valutato altrove, una prova che non vale la pena di
   * rifare — e senza un modo per dirlo l'elenco dei recuperi non si svuota mai.
   * È una decisione dichiarata, non una deduzione: il registro non rinuncia da
   * solo a un voto.
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
 * Che cos'è un PDF appeso a una prova.
 *
 * I primi tre sono la prova come si è fatta: il testo, la sua soluzione, i
 * compiti corretti uno per allievo. Gli altri due sono la seconda tornata —
 * `recupero` senza allievo è il testo del recupero, con l'allievo è il suo
 * compito rifatto; `recupero-soluzione` è la soluzione di quel testo, che è un
 * altro testo e quindi ha una soluzione sua.
 *
 * Stanno tutti qui e non in elenchi separati perché sono allegati di quella
 * verifica: stessa cartella, stesso cestino, stessa apertura.
 */
export type RuoloAllegato =
  | 'verifica'
  | 'soluzione'
  | 'prova'
  | 'recupero'
  | 'recupero-soluzione'

/**
 * Un PDF appeso a un momento di valutazione: il testo della verifica, la sua
 * soluzione, o la prova corretta di un allievo. Il file sta nella cartella dei
 * dati, qui resta solo il percorso relativo — così la cartella si può spostare
 * o sincronizzare senza che i riferimenti si rompano.
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
 * Una verifica, un'interrogazione, un lavoro valutato. Come la lezione,
 * conosce il corso e basta; il semestre non è scritto perché la data lo dice
 * già, e scriverlo permetterebbe soltanto di scriverlo in disaccordo con lei.
 */
export interface MomentoValutazione {
  id: string
  corsoId: string
  /** La lezione in cui si è svolto, se combacia con una. */
  lezioneId: string | null
  /** Il piano da cui nasce: tiene insieme la preparazione e i voti che ne escono. */
  pianoId: string | null
  /**
   * La tappa del piano che l'ha prodotto.
   *
   * Serve a ritrovarlo dove lo si è fatto: dentro la lezione, l'attività che
   * era una prova mostra il suo foglio invece di un pulsante che ne crea un
   * altro. Con la sola lezione due prove nella stessa ora sarebbero
   * indistinguibili.
   */
  attivitaId?: string | null
  titolo: string
  tipo: TipoValutazione
  data: Iso
  /**
   * Quanto pesa nella media del semestre: da 0 a 10, uno di norma.
   *
   * Decimale perché la ponderazione vera non è mai in numeri interi — «questa
   * conta una volta e mezza», «il test d'ingresso vale un quarto» — e zero è
   * ammesso: è una prova che si fa, si corregge e si restituisce, ma che non
   * entra nella media. Prima il minimo era 0,1 e non c'era modo di dire
   * «questa non conta» se non togliendo i voti.
   */
  peso: number
  /** Copia: la scala di quel giorno. Cambiare quella del registro non riscrive i voti dati. */
  scala: Scala
  descrizione?: string
  voti: Voto[]
  /**
   * Chi rifà la prova, e quando: la tabella supplementare dei recuperi.
   *
   * Assente vuol dire che nessuno ha ancora promosso niente — è lo stato di
   * partenza di ogni verifica con degli assenti.
   */
  recuperi?: RecuperoProva[]
  /** Verifica, soluzione, prove corrette e recuperi: i PDF del momento. */
  allegati: Allegato[]
  // La riconsegna non sta qui: sta su ogni voto, un allievo alla volta.
  //
  // C'era una data sola per la prova — «la classe l'ha riavuta il tal giorno»
  // — ed era una mezza verità: la pila torna indietro in un giorno, ma chi
  // mancava riavrà la sua un'altra volta, e di solito è chi ha più bisogno di
  // vederla. Con una data di gruppo quei due o tre fogli risultavano
  // consegnati e non li reclamava nessuno. Il registro scriveva così un fatto
  // che di quell'allievo non era vero, e da quella data si contano i termini
  // di un ricorso.
  //
  // Chi riconsegna a tutti in un colpo non ha perso niente: il pulsante scrive
  // la stessa data su ogni riga, e resta la riga a dire di chi è.
  creatoIl: Istante
  aggiornatoIl: Istante
}

// ---------------------------------------------------------------- consegne

/**
 * Che cosa si è dato da fare, e a chi.
 *
 * Hanno preso il posto del campo di testo «compiti assegnati» che stava sulla
 * lezione: quello era il verbale di quell'ora — si scriveva una volta e restava
 * lì, leggibile solo riaprendo quel giorno. Una consegna invece vive: nasce in
 * un'ora, ha un termine, e torna a galla in ogni lezione successiva del corso
 * finché non è spuntata. È la differenza fra «l'avevo scritto» e «me l'ero
 * segnato», e due posti per la stessa cosa erano un posto di troppo.
 *
 * Vale anche per il docente: «portare le fotocopie», «correggere le verifiche»
 * sono consegne come le altre, e stare nello stesso posto è il motivo per cui
 * ci si arriva davvero.
 */
/** Chi porta il foglio a chi: lo raccolgo dagli allievi, o glielo do io. */
export type VersoDocumento = 'ricevo' | 'consegno'

/** Come il documento arriva in mano all'allievo. */
type ModoConsegna = 'mano' | 'email'

/**
 * Il documento di un allievo dentro una richiesta: il file, e nient'altro.
 *
 * Sta a sé e non dentro la spunta perché in una richiesta di documenti i fatti
 * sono sempre due, in tutti e due i versi. Quando distribuisco: avere la
 * pagella di Rossi non vuol dire avergliela data. Quando raccolgo: Rossi mi ha
 * portato il certificato in aula — e questo lo so subito — ma scansionarlo è
 * un'altra faccenda, che capita dopo o non capita affatto.
 *
 * Tenerli in un campo solo obbligherebbe a scegliere quale delle due cose
 * dimenticare: una matrice che dice «consegnato» solo dove c'è un PDF mente su
 * chi ha portato il foglio, e una che spunta all'arrivo del file mente su chi
 * deve ancora ricevere il suo.
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
 * Una spunta. Il completamento è individuale: una consegna data alla classe è
 * fatta da chi l'ha fatta, non dalla classe — ed è l'unico modo di sapere chi
 * manca senza rileggersi i nomi uno per uno.
 */
export interface SpuntaConsegna {
  /** L'id dell'allievo, o `CHI_INSEGNA` per quel che tocca a chi insegna. */
  chi: string
  fattaIl: Istante
  nota?: string
  /**
   * Il documento con cui è stata spuntata, se la consegna ne raccoglieva uno:
   * percorso relativo alla cartella dei dati, come ogni altro allegato. La
   * spunta e il file sono la stessa cosa — chi ha consegnato è chi ha portato
   * il foglio — ed è per questo che stanno qui e non in un elenco a parte.
   */
  file?: string
  /** Il nome che il file aveva quando è arrivato. */
  nome?: string
  /**
   * Come è passato il foglio. A mano non lascia altra traccia che questa
   * spunta; per mail restano gli indirizzi a cui è partita, che sono la prova
   * che serve mesi dopo.
   */
  modo?: ModoConsegna
  destinatari?: string[]
}

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
   * Quando è nata. Se è nata in un'ora, si tiene il rimando alla lezione e non
   * la data: spostando la lezione la consegna si sposta con lei, che è quel che
   * si intende dicendo «l'ho data lunedì».
   */
  dataLezioneId: string | null
  data: Iso
  /** Per quando. Stessa regola: la lezione entro cui va fatta, o una data. */
  scadenzaLezioneId: string | null
  scadenza: Iso | null
  note?: string
  /**
   * Quando spuntarla vuol dire consegnare un foglio: la categoria di quel che
   * si raccoglie. Assente sulle consegne normali, che si spuntano e basta.
   *
   * È quel che rende una consegna una «richiesta di documento»: stesso oggetto,
   * stesso elenco, stessa scadenza — in più un file per ciascuno, e una
   * ricapitolazione a matrice per vedere in un colpo chi manca.
   */
  documento?: CategoriaDocumento
  /**
   * Da che parte va il foglio.
   *
   * «ricevo» è il caso di sempre: si chiede un certificato e si aspetta che
   * arrivi. «consegno» è l'altro mestiere del docente di classe — le pagelle,
   * le convocazioni, i moduli da far firmare a casa — e cambia che cosa vuol
   * dire una spunta: non «l'ha portato», ma «gliel'ho dato».
   *
   * Assente vale «ricevo»: è quel che erano tutte le richieste scritte prima.
   */
  verso?: VersoDocumento
  /**
   * Come si consegna: a mano, in aula, oppure per mail.
   *
   * Cambia il gesto e cambia la prova. A mano si spunta uno per uno mentre si
   * passa fra i banchi, e chi vuole una prova fa firmare il foglio; per mail
   * parte un messaggio a testa, con il documento in allegato, e la prova è
   * l'invio stesso — con scritto a quale indirizzo è andato.
   */
  modoConsegna?: ModoConsegna
  /** Con `modoConsegna: 'email'`: a chi scrivere, oltre che all'allievo. */
  mailAllievo?: boolean
  mailTutore?: boolean
  /** Oggetto e testo del messaggio, con i segnaposto {allievo}, {classe}, {documento}. */
  oggettoMail?: string
  corpoMail?: string
  /**
   * I file, uno per allievo: quel che si è scansionato di ciò che hanno
   * portato, o quel che si tiene pronto da dare. Si riempie dallo smistamento
   * di un PDF di classe o allegandolo a mano, e non spunta niente da sé.
   */
  documenti?: DocumentoAllievo[]
  /**
   * Il documento uguale per tutti, quando non ce n'è uno per allievo: la
   * circolare, il modulo da compilare. Vale per chi non ha il suo.
   */
  fileTutti?: string
  nomeTutti?: string
  /**
   * Se di quella distribuzione serve la prova firmata.
   *
   * Non sempre serve: una circolare la si dà e basta. Quando invece conta —
   * pagelle, moduli che tornano indietro dai genitori — si spunta qui, e il
   * foglio delle firme compare fra le cose da tenere insieme al resto.
   */
  firmeRichieste?: boolean
  /**
   * Il foglio delle firme di consegna: uno per tutta la classe, non uno per
   * allievo. Quando si distribuisce qualcosa la prova non è il documento — di
   * quello ognuno tiene il suo — ma la lista firmata di chi l'ha ritirato, ed è
   * un file solo che appartiene alla richiesta.
   */
  fileFirme?: string
  nomeFirme?: string
  fatte: SpuntaConsegna[]
  // Non c'è una chiusura della consegna intera: è finita quando l'ha fatta
  // ognuno di quelli a cui era stata data.
  //
  // C'era «Chiudi comunque», e chiudeva tutto con un colpo — ma una consegna
  // data alla classe è fatta da chi l'ha fatta, non dalla classe: chiusa così
  // spariva dagli elenchi portandosi via anche i nomi di chi non aveva
  // portato niente, e quei nomi erano l'unica ragione per cui la consegna
  // esisteva. Chi vuole chiuderla lo stesso ha «Spunta tutti», che scrive quel
  // che ha fatto: una spunta per nome, con la sua data.
  creataIl: Istante
  aggiornataIl: Istante
}

// ------------------------------------------------------------- smistamento

/**
 * Perché un blocco di pagine non è andato a destinazione da solo.
 */
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
 * Un pezzo di PDF che aspetta una mano: quali pagine sono, di chi si crede che
 * siano, e perché il registro non se l'è sentita di deciderlo da solo.
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
   * La fotografia della prima pagina del blocco, percorso relativo alla
   * cartella dei dati. Vale più di ogni trascrizione: chi deve dire di chi sono
   * queste pagine guarda il foglio, invece di fidarsi di quel che si è letto.
   */
  anteprima?: string
}

/**
 * Una pagina del PDF come il registro l'ha letta.
 *
 * Si tiene pagina per pagina e non blocco per blocco perché i blocchi si
 * rifanno: appena l'OCR legge una pagina in più, il raggruppamento cambia — due
 * pagine che sembravano di nessuno diventano il documento di qualcuno. Le
 * letture sono il dato, i blocchi sono quel che se ne deduce.
 */
export interface PaginaSmistamento {
  /** Come si conta guardando il PDF: la prima è 1. */
  numero: number
  /** Il testo trovato, troncato: serve a riconoscere e a far capire. */
  testo: string
  lettura: 'testo' | 'ocr' | 'niente'
  /**
   * La fotografia della pagina, percorso relativo alla cartella dei dati. Vale
   * più di ogni trascrizione: chi deve dire di chi sono queste pagine guarda il
   * foglio invece di fidarsi di quel che si è letto.
   */
  anteprima?: string
  /**
   * Dove, sulla pagina, è stato letto il nome: frazioni del foglio, origine in
   * alto a sinistra.
   *
   * Un nome proposto senza il punto in cui compare è una parola da ricercare a
   * mano sul foglio, e su un elenco di classe di trenta righe ricercarla vuol
   * dire rifare il lavoro che il registro dice di aver fatto. Con il riquadro,
   * chi controlla guarda lì e in un secondo sa se la proposta regge.
   *
   * È preciso quando il nome sta nel testo del PDF — le coordinate sono quelle
   * vere del pezzo di testo — e largo quanto la striscia letta quando invece a
   * leggere è stato l'OCR, che restituisce parole e non posizioni. Largo ma
   * onesto: dice dove si è guardato.
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
 * Un PDF arrivato nella cartella «in arrivo», e che fine ha fatto.
 *
 * Vive solo finché resta qualcosa da sistemare: quando l'ultimo blocco è
 * assegnato o scartato, lo smistamento sparisce e restano i documenti nelle
 * consegne, che sono il posto vero in cui i file abitano. Un file originale
 * tenuto da parte per sempre sarebbe una seconda copia di tutto.
 */
/**
 * Come si taglia un PDF di classe in documenti.
 *
 * Tre modi, perché i PDF che arrivano sono di tre specie. Quello della
 * segreteria porta il nome in testa a ogni foglio, e il registro lo sa
 * riconoscere: `nomi`. Quello che esce da uno scanner a foglio doppio non ha
 * nomi leggibili ma ha una regola ferrea — due pagine a testa, sempre — e
 * dichiararla vale più di qualunque riconoscimento: `passo`. E poi c'è il PDF
 * che non segue nessuna regola, e allora le pagine le sceglie chi guarda:
 * `mano`.
 *
 * Sta scritto dentro lo smistamento e non passa solo al momento del taglio,
 * perché i blocchi non sono un dato: si rifanno a ogni pagina assegnata e a
 * ogni lettura dell'OCR. Senza il modo scritto qui, il secondo giro
 * ricadrebbe sul riconoscimento e disferebbe la divisione appena scelta.
 */
export type Divisione =
  | { modo: 'nomi' }
  /** Un documento ogni `pagine` pagine: `pagine` è almeno 1. */
  | { modo: 'passo', pagine: number }
  | { modo: 'mano' }

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
   * Le pagine già finite nella consegna di qualcuno.
   *
   * La consegna sta scritta accanto alla persona perché un PDF può alimentarne
   * più d'una — le pagine si lasciano cadere sulla colonna che si vuole — e
   * senza di lei non si saprebbe da dove riprendere una pagina finita nel posto
   * sbagliato. Manca sui documenti archiviati prima che questa colonna
   * esistesse: allora vale quella del PDF.
   *
   * Con `firme` le pagine non sono di nessuno in particolare: sono il foglio
   * firme di quella richiesta, che riguarda tutta la colonna. L'allievo è
   * allora una stringa vuota, ed è l'unico caso in cui può esserlo — tenere
   * due campi invece di uno servirebbe soltanto a poterli far litigare.
   */
  assegnate: Array<{
    allievoId: string
    consegnaId?: string
    firme?: true
    /**
     * Il foglio di assenze in cui sono finite: quale periodo, che rapporto,
     * vergine o firmato.
     *
     * C'è al posto della consegna quando le pagine sono state lasciate cadere
     * sulla matrice delle assenze: quei fogli non stanno in una richiesta ma
     * nella riga di una persona dentro un periodo, e senza queste quattro cose
     * non si saprebbe da dove riprendere una pagina finita nella casella
     * sbagliata.
     */
    assenze?: { classeId: string, bloccoId: string, tipo: TipoRapporto, firmato: boolean }
    da: number
    a: number
  }>
  /** Quel che resta da decidere. Vuoto vuol dire che non c'è più niente da fare. */
  blocchi: BloccoDaSmistare[]
  /** Se la lettura del PDF è fallita del tutto: il file resta lì e si dice perché. */
  errore?: string
  /**
   * Come dividerlo. Assente vale `nomi`: è quel che facevano tutti gli
   * smistamenti scritti prima che la domanda esistesse.
   */
  divisione?: Divisione
  arrivatoIl: Istante
}

// ---------------------------------------------------------------- radice

export interface Impostazioni {
  scala: Scala
  /**
   * Il passo con cui si arrotonda la nota di fine semestre.
   *
   * È un passo suo, diverso da quello dei voti: durante l'anno si mettono
   * quarti di punto, ma la nota che va sulla pagella si dà a mezzi — e la media
   * pesata di sei prove non ci cade quasi mai sopra. Prima si leggeva 4,37 e
   * l'arrotondamento lo faceva a mente chi compilava, che è il posto peggiore
   * dove tenere una regola: due docenti la applicavano in due modi.
   *
   * Zero vuol dire «non arrotondare»: la nota resta la media com'è.
   */
  passoFineSemestre: number
  /**
   * Da quale percentuale di assenza una persona in formazione va segnalata.
   *
   * In cifra tonda — 20 vuol dire il venti per cento — perché è così che la
   * regola si dice e si discute in sede, e uno 0,2 nel file delle impostazioni
   * sarebbe da tradurre ogni volta che lo si legge.
   *
   * È un'impostazione e non un numero dentro il codice: la soglia oltre cui
   * un'assenza diventa un caso la decide la scuola, cambia fra un corso di
   * tirocinio e una formazione a tempo pieno, e chi la deve cambiare non
   * ricompila niente.
   *
   * Zero spegne la segnalazione: c'è chi quel conto lo fa altrove e non vuole
   * un avviso su ogni foglio.
   */
  sogliaAssenza: number
  oraInizioGiornata: Ora
  oraFineGiornata: Ora
  /** 1 = lunedì … 7 = domenica. */
  giorniVisibili: number[]
  durataSlotPredefinita: number
  durataPausaPredefinita: number
  /**
   * Quando il registro rifà da sé i PDF di un corso.
   *
   * I documenti di un corso invecchiano da soli: basta un voto messo o un
   * appello corretto perché il PDF nella cartella dica una cosa e il registro
   * un'altra, e chi apre la cartella non ha modo di accorgersene — un foglio
   * vecchio non ha l'aria di essere vecchio. Rifarli quando i dati cambiano è
   * l'unico modo perché quel che sta su disco sia sempre quel che il registro
   * sa.
   *
   * `chiusura` li rifà quando un'ora viene segnata svolta, che è il momento in
   * cui i dati di quell'ora sono completi. `sempre` li rifà a ogni modifica
   * che tocca il corso, poco dopo che si è smesso di scrivere. `mai` lascia
   * fare ai pulsanti.
   */
  pdfAutomatici: QuandoRifarePdf
  /**
   * Le voci dei menu a tendina, quando non sono più quelle di fabbrica.
   *
   * Ci sta solo quel che qualcuno ha cambiato: una chiave che manca vuol dire
   * «la lista predefinita», non «nessuna voce». È il motivo per cui un registro
   * vecchio si apre con le tendine già piene, e per cui una voce aggiunta al
   * programma compare anche in un documento scritto l'anno scorso.
   *
   * Le liste che il registro conosce, e quali ammettono voci nuove, stanno in
   * `domain/lists.ts`. Quel che non è una lista riconosciuta non si salva:
   * sarebbe un elenco che nessuna tendina legge.
   */
  liste?: Record<string, VoceLista[]>
}

/** Vedi `Impostazioni.pdfAutomatici`. */
export type QuandoRifarePdf = 'mai' | 'chiusura' | 'sempre'

/**
 * Una voce di menu a tendina: il valore che si salva, e la parola che si legge.
 *
 * I due sono separati apposta. Il valore è quello che finisce nei file e nei
 * conti — cambiandolo si cambierebbero di nascosto tutte le tappe che lo hanno
 * scelto — mentre la parola è solo quel che si legge sullo schermo, e
 * rinominare «Lavagna» in «Alla lavagna» non deve toccare nessun piano.
 */
export interface VoceLista {
  valore: string
  testo: string
}

/**
 * Lo stato del registro: quel che l'archivio legge e il webview riceve.
 *
 * È lo stato di *un anno*, più l'elenco di tutti gli anni che ci sono. Le
 * classi, le ore, i voti e i documenti sono quelli dell'anno in uso e di
 * nessun altro: gli altri anni stanno nelle loro cartelle e si aprono
 * scegliendoli. `anni` porta solo le intestazioni — etichetta, semestri,
 * sospensioni — che si leggono da ogni cartella e costano una riga a testa.
 *
 * Anche `materie` e `impostazioni` appartengono all'anno in uso: la scala dei
 * voti e la griglia oraria cambiano fra un anno e l'altro, e un anno chiuso
 * deve restare leggibile con le regole con cui è stato scritto.
 */
/**
 * Un indirizzo collocato sulla mappa. La chiave è l'indirizzo, non chi ci sta.
 *
 * Sta in una raccolta sua e non dentro l'allievo, ed è la differenza che conta:
 * un indirizzo non appartiene a una persona. Due fratelli hanno la stessa casa,
 * sei persone in formazione hanno la stessa azienda, e la stessa via compare
 * come domicilio di uno e posto di lavoro di un altro. Tenendo il punto
 * nell'anagrafica lo si sarebbe cercato sei volte, scritto sei volte, e — al
 * primo «rifai» — si sarebbero avute sei risposte leggermente diverse per lo
 * stesso portone.
 *
 * Con la chiave sull'indirizzo, invece, la domanda al geocodificatore si fa una
 * volta sola e la risposta vale per tutti: da lì nascono anche i collegamenti —
 * chi abita dove abita un altro, chi lavora dove lavora un altro — che sono
 * proprio il fatto che si vede aprendo una mappa di classe.
 *
 * Le coordinate arrivano da Nominatim, il geocodificatore di OpenStreetMap, e
 * il registro se le tiene: l'indirizzo di casa di una persona minorenne è un
 * dato personale, e mandarlo fuori a ogni apertura della mappa sarebbe mandarlo
 * fuori cento volte per la stessa risposta.
 */
export interface Coordinata {
  /**
   * L'indirizzo ridotto alla sua forma confrontabile: minuscolo, senza spazi
   * doppi. È l'id della voce, e il motivo per cui due scritture diverse dello
   * stesso indirizzo — «Via Roma 3,6900 Lugano» e «via roma 3, 6900 Lugano» —
   * trovano lo stesso punto.
   */
  chiave: string
  /** L'indirizzo come lo ha scritto il docente: è quel che si rilegge. */
  indirizzo: string
  lat: number
  lon: number
  /**
   * Come ha capito l'indirizzo il geocodificatore.
   *
   * Serve a fidarsi o a non fidarsi: un «Via Roma 3» senza località risolto in
   * un paese dall'altra parte del Cantone lo si scopre leggendo questa riga,
   * non guardando il segnaposto.
   */
  etichetta?: string
  /**
   * Il punto è quello del paese, non del portone.
   *
   * Succede quando la via non esiste in OpenStreetMap — nuclei, strade di
   * frazione, vie con il nome abbreviato — e il registro ha preferito il centro
   * del paese al niente: «viene da Olivone» è una risposta, «non lo sappiamo»
   * no. Ma la differenza va detta, o il segnaposto verrebbe preso per un
   * portone e qualcuno ci andrebbe in macchina.
   */
  approssimato?: boolean
  trovatoIl: Istante
}

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
  smistamenti: Smistamento[]
  /** Gli indirizzi collocati, uno per indirizzo e non uno per persona. */
  coordinate: Coordinata[]
  impostazioni: Impostazioni
}

/**
 * 1 → 2: il corso diventa il perno. La classe perde la materia e il fascicolo,
 * lezioni e valutazioni perdono anno, classe, materia e semestre in favore di
 * `corsoId`, il piano perde anno e classe in favore della materia. La lettura
 * migra da sola: vedi `normalizzaRegistro`.
 *
 * 2 → 3: l'anno scolastico diventa una cartella. I nove JSON, che stavano
 * tutti insieme nella radice con dentro gli anni mescolati, si spostano in
 * `<anno>/dati/`, e la documentazione, la cassetta e gli allegati seguono la
 * loro classe nell'anno a cui appartiene. In radice resta un `registro.json`
 * che dice soltanto quale anno si sta usando. Lo spostamento lo fa
 * `migraAnni`, una volta sola, alla prima apertura.
 */
export const VERSIONE_DATI = 3

/**
 * Le collezioni del registro: una per file. Chi modifica dichiara quali ha
 * toccato, e si riscrivono solo quelle — un voto non deve far riscrivere le
 * classi.
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
  | 'smistamenti'
  | 'coordinate'
