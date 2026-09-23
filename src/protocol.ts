// Il contratto fra il webview e l'extension host. Lo importano tutti e due, e
// TypeScript controlla le due sponde con lo stesso tipo: una richiesta con un
// campo sbagliato non compila, invece di arrivare a destinazione e non fare nulla.
//
// Il webview non tocca il disco e non calcola nulla che vada salvato: costruisce
// l'entità completa con le fabbriche del dominio e la manda intera. L'host la
// applica e rispedisce lo stato aggiornato, che è sempre l'unica verità.

import type {
  AnnoScolastico,
  BloccoAssenze,
  Classe,
  Comunicazione,
  Consegna,
  Corso,
  Divisione,
  Impostazioni,
  Iso,
  LetteraSettimana,
  Lezione,
  Materia,
  MomentoValutazione,
  Ora,
  Osservazione,
  SegnoOsservato,
  PianoLezione,
  Recapito,
  Registro,
  Ricorrenza,
  Risorsa,
  RuoloAllegato,
  Sospensione,
  StatoAttivita,
  StatoLezione,
  StatoPresenza,
  TipoRapporto,
  TipoRisorsa,
} from './domain/models.js'
import type { GenereRapporto } from './domain/locations.js'
import type { RuoloModello } from './domain/templateCatalog.js'
import type { Composizione } from './domain/compositions.js'
import type {
  ContenutoProiezione,
  ImpostazioniProiezione,
  MiraProiezione,
} from './domain/projection.js'

export type {
  BloccoProiezione,
  ContenutoProiezione,
  ImpostazioniProiezione,
  MiraProiezione,
} from './domain/projection.js'

export type Azione =
  | { tipo: 'stato.leggi' }
  | { tipo: 'stato.ricarica' }
  /**
   * Scrive subito quel che è in attesa. È il Ctrl+S, che nel registro non
   * salva «il documento» — quello si salva da sé — ma smette di aspettare.
   *
   * Esiste perché il gesto esiste: chi ha imparato a premerlo lo preme, e un
   * registro che rispondesse «qui non serve» insegnerebbe soltanto a dubitare
   * del salvataggio automatico. Premuto, scrive e lo dice.
   */
  | { tipo: 'stato.salva' }
  /**
   * Apre un documento d'anno. Senza percorso apre il dialogo del sistema.
   *
   * Il lavoro vero è del guscio — può finire con un riavvio, se il documento
   * sta in un'altra cartella di lavoro — e qui c'è solo la richiesta: il
   * webview non conosce Electron e non deve conoscerlo.
   */
  | { tipo: 'documento.apri'; percorso?: string }
  /**
   * Chiude l'anno aperto e lascia il registro senza documento.
   *
   * Serve a liberare il file: finché il registro lo tiene aperto, accanto a lui
   * c'è la sua serratura, e la stessa cartella aperta da un'altra macchina
   * annuncia un anno occupato. Anche questo è lavoro del guscio — il pannello
   * si chiude, e al suo posto viene il benvenuto.
   */
  | { tipo: 'documento.chiudi' }
  /** Mette da parte un documento, o lo lascia tornare fra i recenti. */
  | { tipo: 'documento.preferito'; percorso: string; preferito: boolean }
  /** Toglie un documento dall'elenco. Il file sul disco non si tocca. */
  | { tipo: 'documento.dimentica'; percorso: string }
  | {
    tipo: 'anno.crea'
    inizio: Iso
    fine: Iso
    etichetta?: string
    confine?: Iso
    /** Le pause dichiarate nel modulo di creazione: nascono con l'anno, non dopo. */
    sospensioni?: Sospensione[]
    /**
     * I nomi dei due semestri, se chi crea l'anno li ha scritti.
     *
     * Il modulo li chiede anche per un anno nuovo — sono due campi accanto
     * alle date — e senza un posto qui restavano battuti e buttati via.
     */
    etichetteSemestri?: [string, string]
  }
  | { tipo: 'anno.salva'; anno: AnnoScolastico }
  /**
   * Dice che la settimana in cui cade `giorno` è una A, una B, o nessuna
   * delle due.
   *
   * Un'azione sua e non un `anno.salva` con l'anno intero dentro: si assegna
   * una settimana alla volta scorrendo il calendario, e rimandare ogni volta
   * tutto l'anno — semestri, sospensioni — vorrebbe dire che due finestre
   * aperte sullo stesso registro si sovrascrivono le vacanze a vicenda.
   */
  | { tipo: 'anno.settimana'; annoId: string; giorno: Iso; lettera: LetteraSettimana | null }
  | { tipo: 'materia.salva'; materia: Materia }
  | { tipo: 'materia.elimina'; materiaId: string }
  | { tipo: 'materia.unisci'; daId: string; aId: string }
  /**
   * Apre un corso: questa materia, a questa classe. È l'unico modo di crearne
   * uno, e sta qui e non sotto `classe` perché la cosa che nasce è il corso —
   * il perno a cui lezioni e valutazioni si agganciano.
   */
  | { tipo: 'corso.crea'; classeId: string; materiaId: string; titolo?: string }
  | { tipo: 'corso.salva'; corso: Corso }
  | { tipo: 'corso.elimina'; corsoId: string }
  /** Le ore fisse di un corso, senza dover rimandare indietro il corso intero. */
  | { tipo: 'orario.imposta'; corsoId: string; orario: Ricorrenza[] }
  /** Mette sul calendario le lezioni che l'orario del corso prevede e non ci sono. */
  | { tipo: 'orario.genera'; corsoId: string; dal: Iso; al: Iso }
  | { tipo: 'piano.perLezione'; lezioneId: string; daPianoId?: string | null }
  | { tipo: 'classe.salva'; classe: Classe }
  | { tipo: 'classe.elimina'; classeId: string }
  | { tipo: 'classe.duplica'; classeId: string; annoId: string; nome: string }
  | { tipo: 'allievi.importa'; classeId: string; testo: string }
  /**
   * Toglie un allievo dalla classe portandosi via quel che parlava di lui:
   * presenze, voti, osservazioni. Un ritiro non è questo — per quello basta
   * togliergli la spunta «frequenta» — ma un nome sbagliato o un'iscrizione
   * finita nella classe sbagliata devono poter sparire davvero.
   */
  | { tipo: 'allievo.elimina'; classeId: string; allievoId: string }
  /**
   * Il ritratto di un allievo: si sceglie un file dal disco e il registro se
   * ne tiene una copia in `foto/`, dentro l'anno.
   *
   * Passa dall'host e non dal pannello perché è il dialogo di sistema ad
   * aprirsi, e perché la copia va fatta dove si scrive su disco. Il pannello
   * chiede e basta.
   */
  | { tipo: 'allievo.foto.imposta'; classeId: string; allievoId: string }
  | { tipo: 'allievo.foto.togli'; classeId: string; allievoId: string }
  | { tipo: 'lezione.salva'; lezione: Lezione }
  /**
   * I testi dell'ora — argomenti, materiali, consuntivo — uno alla volta.
   *
   * Stanno a sé e non dentro `lezione.salva` perché si scrivono in aula, un
   * campo dopo l'altro, mentre lo stato torna dall'host a ogni salvataggio:
   * rimandare la lezione intera dalla copia che il campo aveva in mano
   * sovrascriverebbe quel che un altro campo ha appena salvato.
   */
  | { tipo: 'lezione.testi'; lezioneId: string; argomenti?: string; materiali?: string; consuntivo?: string }
  | { tipo: 'lezione.elimina'; lezioneId: string }
  /** Una copia della lezione altrove: stessa scaletta, appello e voti no. */
  | { tipo: 'lezione.duplica'; lezioneId: string; data: Iso; inizio?: Ora }
  | { tipo: 'lezione.stato'; lezioneId: string; stato: StatoLezione }
  /** La stessa lezione, un altro giorno e — se si dice — un'altra ora. */
  | { tipo: 'lezione.sposta'; lezioneId: string; data: Iso; inizio?: Ora }
  /** L'appello per intero: lo mandano i campi che stanno fuori dalla matrice. */
  /**
   * Una casella della matrice: questo allievo, questa unità didattica.
   *
   * La casella e non l'elenco intero perché l'appello si fa mentre la classe
   * entra, con la lista che si ridisegna sotto le dita: rimandare tutte le
   * righe a ogni clic significa riscrivere anche quelle che nel frattempo ha
   * cambiato qualcun altro — o che si erano lette un secondo prima.
   */
  | { tipo: 'presenze.ud'; lezioneId: string; allievoId: string; ud: number; stato: StatoPresenza }
  /** Tutta la riga di un allievo: mancato per l'ora intera, in un gesto solo. */
  | { tipo: 'presenze.riga'; lezioneId: string; allievoId: string; stato: StatoPresenza }
  /** Tutta una colonna: l'unità didattica in cui la classe non c'era. */
  | { tipo: 'presenze.colonna'; lezioneId: string; ud: number; stato: StatoPresenza }
  | { tipo: 'presenze.tutti'; lezioneId: string; stato: StatoPresenza }
  /**
   * I minuti di ritardo e la nota di una riga dell'appello. Solo quelli: le
   * caselle non si toccano, e le righe degli altri — compresi gli allievi che
   * non frequentano più — restano com'erano.
   */
  | { tipo: 'presenze.campi'; lezioneId: string; allievoId: string; minuti?: number; nota?: string }
  /**
   * Una casella della matrice del comportamento: questa persona, questo aspetto.
   *
   * La casella e non la matrice intera, per la stessa ragione dell'appello: si
   * segna mentre la classe lavora, e rimandare tutte le caselle a ogni clic
   * riscriverebbe anche quelle toccate un istante prima. Un campo lasciato
   * fuori resta com'era; `segno: null` toglie il segno e lascia la nota, e una
   * casella senza segno né nota sparisce da sé.
   */
  | {
    tipo: 'osservazione.cella'
    lezioneId: string
    allievoId: string
    aspetto: string
    segno?: SegnoOsservato | null
    nota?: string
  }
  | { tipo: 'osservazione.salva'; lezioneId: string; osservazione: Osservazione }
  | { tipo: 'osservazione.elimina'; lezioneId: string; osservazioneId: string }
  | { tipo: 'piano.salva'; piano: PianoLezione }
  | { tipo: 'piano.elimina'; pianoId: string }
  | { tipo: 'piano.duplica'; pianoId: string }
  | { tipo: 'piano.assegna'; lezioneId: string; pianoId: string | null }
  // Le risorse di un piano. `attivitaId` nullo vuol dire «del piano intero»,
  // valorizzato vuol dire «di quella tappa della scaletta».
  | {
    tipo: 'risorsa.aggiungi'
    pianoId: string
    attivitaId: string | null
    genere: TipoRisorsa
    titolo?: string
    url?: string
  }
  | { tipo: 'risorsa.salva'; pianoId: string; attivitaId: string | null; risorsa: Risorsa }
  /**
   * La risorsa passa a un'altra tappa, o al piano nel suo insieme.
   *
   * Serve perché una scheda finisce quasi sempre sotto la tappa sbagliata la
   * prima volta: la si allega mentre si scrive, e poi la scaletta cambia. Il
   * giro «cancella e riallega» perdeva il file dal disco e faceva ripescare
   * l'originale da Download, che a quel punto poteva non esserci più.
   */
  | {
    tipo: 'risorsa.sposta'
    pianoId: string
    daAttivitaId: string | null
    aAttivitaId: string | null
    risorsaId: string
  }
  | { tipo: 'risorsa.elimina'; pianoId: string; attivitaId: string | null; risorsaId: string }
  | { tipo: 'risorsa.apri'; pianoId: string; attivitaId: string | null; risorsaId: string }
  | { tipo: 'avanzamento.imposta'; lezioneId: string; attivitaId: string; stato: StatoAttivita; nota?: string }
  /**
   * Il momento che nasce da una tappa del piano.
   *
   * È il modo normale di crearne uno: la scaletta dice che quella tappa è una
   * prova, e dentro l'ora in cui la si fa il momento si apre già compilato —
   * titolo, tipo e peso li ha detti il piano, data e corso li dice la lezione.
   * Chiamarlo due volte non ne crea due: se per quella tappa il momento esiste
   * già, si torna quello.
   */
  | { tipo: 'valutazione.daAttivita'; lezioneId: string; attivitaId: string }
  | { tipo: 'valutazione.salva'; valutazione: MomentoValutazione }
  | { tipo: 'valutazione.elimina'; valutazioneId: string }
  | { tipo: 'voto.imposta'; valutazioneId: string; allievoId: string; valore: number | null; assente: boolean; nota?: string }
  /**
   * Il giorno in cui un allievo ha riavuto la sua prova corretta. `null` la
   * rimette fra quelle da ridare: senza data, vale quella della classe se c'è.
   */
  | { tipo: 'voto.riconsegna'; valutazioneId: string; allievoId: string; il: string | null }
  /**
   * Che cosa si fa del buco lasciato da un'assenza: quando si rifà la prova,
   * oppure che non si rifà. `previstoIl: null` senza `dispensato` rimette il
   * recupero fra quelli da fissare, che è il modo di disdire una data.
   */
  | {
    tipo: 'recupero.imposta'
    valutazioneId: string
    allievoId: string
    previstoIl: string | null
    nota?: string
    dispensato?: boolean
    /**
       * Il giorno in cui la prova rifatta è tornata a quell'allievo. Assente
       * vuol dire «lascia com'era»: chi sposta una data di recupero non sta
       * dicendo niente sulla riconsegna, e cancellargliela sarebbe una perdita
       * silenziosa. `null` invece la toglie.
       */
    riconsegnataIl?: string | null
  }
  /**
   * Che la prova corretta è tornata in mano agli allievi: a tutti in un colpo.
   *
   * Scrive la stessa data su ogni riga, e non una data della prova: quella
   * diceva «la classe l'ha riavuta» anche di chi quel giorno mancava, e da
   * questa data si contano i termini di un ricorso. Chi ha già la sua la
   * tiene — è più precisa, ed è il motivo per cui la data di gruppo se n'è
   * andata.
   *
   * `il: null` toglie la data a tutti e rimette la prova fra quelle da
   * riconsegnare: serve quando si è spuntata la riga sbagliata, che con due
   * prove nello stesso giorno capita.
   */
  | { tipo: 'valutazione.riconsegna'; valutazioneId: string; il: string | null }
  // ---------------------------------------------------------------- consegne
  | { tipo: 'consegna.salva'; consegna: Consegna }
  | { tipo: 'consegna.elimina'; consegnaId: string }
  /**
   * La spunta di una persona sola. Sta a sé e non dentro `consegna.salva`
   * perché è il gesto che si fa in aula, uno dopo l'altro mentre si ritira: un
   * salvataggio dell'intera consegna a ogni nome perderebbe quel che un'altra
   * finestra sta scrivendo nello stesso momento.
   */
  | { tipo: 'consegna.spunta'; consegnaId: string; chi: string; fatta: boolean }
  /**
   * Spunta, o toglie la spunta, a tutti quelli a cui la consegna era data.
   *
   * Ha preso il posto di «Chiudi comunque», che chiudeva la consegna intera
   * con un colpo: una consegna data alla classe è però fatta da chi l'ha
   * fatta, e chiusa così spariva portandosi via i nomi di chi non aveva
   * portato niente — che erano l'unica ragione per cui esisteva. Il gesto
   * resta uno, ma scrive quel che è successo: una spunta per nome.
   *
   * `fatta: false` toglie solo le spunte nude. Quelle con un documento
   * raccolto restano: quel foglio è arrivato davvero, e non lo si cancella
   * perché si è cambiato idea sull'elenco.
   */
  | { tipo: 'consegna.spuntaTutti'; consegnaId: string; fatta: boolean }
  /**
   * Spuntare consegnando: si sceglie il file, che viene archiviato nella
   * cartella dei dati, e la spunta di quella persona se lo porta dietro.
   * Annullando la scelta non succede niente — la consegna resta da fare.
   */
  | { tipo: 'consegna.raccogli'; consegnaId: string; chi: string }
  /** Apre il file con cui qualcuno ha spuntato. */
  | { tipo: 'consegna.file.apri'; consegnaId: string; chi: string }
  // ------------------------------------------------- distribuire un documento
  /**
   * Il documento pronto per qualcuno, prima di consegnarlo.
   *
   * `allievoId` nullo vuol dire «lo stesso per tutti»: la circolare, il modulo
   * da compilare. Averlo non è averlo consegnato — quello è un gesto a parte —
   * ed è la distinzione su cui si regge tutta la distribuzione.
   */
  | { tipo: 'consegna.documento.allega'; consegnaId: string; allievoId: string | null }
  | { tipo: 'consegna.documento.apri'; consegnaId: string; allievoId: string | null }
  | { tipo: 'consegna.documento.togli'; consegnaId: string; allievoId: string | null }
  /** Consegnato a mano: la spunta e basta, che è tutto quel che resta di un foglio dato in aula. */
  | { tipo: 'consegna.consegnato'; consegnaId: string; allievoId: string; fatta: boolean }
  /**
   * La distribuzione per mail: un messaggio a testa, col documento in allegato.
   *
   * Senza `allieviIds` parte per tutti quelli che aspettano e hanno un
   * documento pronto; con l'elenco, solo per quelli. Chi non ha un indirizzo
   * resta indietro e viene detto per nome: una consegna che si crede fatta e
   * non lo è, è peggio di una consegna mancata.
   */
  | { tipo: 'consegna.distribuisci'; consegnaId: string; allieviIds?: string[] }
  /**
   * Il foglio delle firme di consegna: uno per tutta la richiesta.
   *
   * Sta sulla consegna e non sulle spunte perché è un documento solo — la
   * lista con cui si dimostra di aver distribuito quel foglio — e ha senso
   * unicamente quando è il docente a consegnare.
   */
  | { tipo: 'consegna.firme.aggiungi'; consegnaId: string }
  | { tipo: 'consegna.firme.apri'; consegnaId: string }
  | { tipo: 'consegna.firme.togli'; consegnaId: string }
  /** Toglie il file e la spunta: il documento torna atteso. */
  | { tipo: 'consegna.file.togli'; consegnaId: string; chi: string }
  // ------------------------------------------------------------- smistamento
  /**
   * Dei PDF di classe da dividere adesso: si scelgono dal disco e si dicono di
   * questa richiesta. È la via per i file che stanno già da qualche altra
   * parte e che non si vogliono trascinare; l'originale non si sposta, ne
   * entrano i byte dentro il documento dell'anno.
   *
   * `consegnaId` può essere nullo: il PDF entra senza documento, e lo si
   * aggancia o lo si divide a mano dal pannello.
   *
   * `divisione` dice dove cadono le forbici: dai nomi sulle pagine, ogni N
   * pagine, o da nessuna parte — le pagine le sceglie chi guarda. Si chiede a
   * chi carica perché è l'unico che lo sa: su una scansione muta nessun
   * riconoscimento indovinerà mai che i documenti sono di due facciate.
   */
  | {
    tipo: 'smistamento.carica'
    /** La richiesta a cui appartiene, quando la si sa: di solito no. */
    consegnaId: string | null
    /**
       * La classe da cui il file è entrato.
       *
       * È il solo contesto che serve, e non si chiede a nessuno: chi carica un
       * PDF lo fa dall'archivio di una classe. Senza, una scansione muta —
       * nessun nome leggibile, nessuna richiesta indovinabile — finirebbe in
       * quarantena senza classe, cioè in nessun archivio, cioè invisibile a chi
       * l'ha appena portata dentro.
       */
    classeId?: string | null
    divisione: Divisione
  }
  /**
   * Un PDF trascinato dentro il pannello, con i suoi byte in codifica base64.
   *
   * Il contenuto viaggia dentro il messaggio perché il webview vive in una
   * sandbox: di un file trascinato conosce i byte e il nome, non dove stia sul
   * disco. L'host lo posa in quarantena dentro il documento dell'anno, e da lì
   * il giro è quello di sempre. Senza `consegnaId` resta «senza documento».
   */
  | {
    tipo: 'smistamento.deposita'
    consegnaId: string | null
    /** La classe da cui il file è stato lasciato cadere: vedi `smistamento.carica`. */
    classeId?: string | null
    nome: string
    contenuto: string
    divisione: Divisione
  }
  /**
   * Un blocco in quarantena assegnato a mano: queste pagine, a questa persona.
   * Le pagine si possono restringere — è il modo in cui si separa un documento
   * di due pagine che il registro aveva tenuto insieme — e quel che avanza
   * resta in quarantena.
   */
  /** Pagine che non interessano: via dalla quarantena senza finire da nessuno. */
  /**
   * Rimette in coda la lettura delle pagine scelte nello sfoglio.
   *
   * È il gesto di chi guarda una pagina e vede che il registro ci ha letto il
   * nome sbagliato, o non ce n'ha letto nessuno: si rilegge quella, non tutto
   * il PDF.
   */
  | { tipo: 'smistamento.leggiPagine'; smistamentoId: string; pagine: number[] }
  /** Apre solo quelle pagine nel lettore del sistema: un ritaglio di servizio. */
  | { tipo: 'smistamento.apriPagine'; smistamentoId: string; pagine: number[] }
  /**
   * Riprende delle pagine già archiviate: il documento esce dal fascicolo di
   * chi l'aveva e le sue pagine tornano fra quelle da smistare.
   *
   * È il rimedio all'errore che conta: una pagina lasciata cadere sulla riga
   * sbagliata. Senza, l'unica via era togliere il documento dalla matrice — e
   * le pagine restavano fuori da ogni elenco, dentro un PDF che il registro
   * dava per finito.
   */
  | { tipo: 'smistamento.riprendiPagine'; smistamentoId: string; pagine: number[] }
  /**
   * Le pagine scelte nello sfoglio, buttate via: via dalla quarantena senza
   * finire da nessuno. È la copertina dello scanner, il foglio bianco in mezzo
   * al mucchio — roba che non è di nessuno e che tenuta lì farebbe credere che
   * manchi ancora qualcosa da decidere.
   */
  | { tipo: 'smistamento.scartaPagine'; smistamentoId: string; pagine: number[] }
  /**
   * Mette in coda la lettura OCR di un blocco. Torna subito: la lettura vera
   * dura decine di secondi a pagina, e a raccontarla ci pensa l'avanzamento.
   */
  /**
   * Conferma in blocco tutte le proposte di un PDF: ogni riga che ha già un
   * nome viene archiviata. Quel che non ha un nome resta dov'è.
   */
  | { tipo: 'smistamento.confermaTutto'; smistamentoId: string }
  /**
   * L'assegnazione fatta a mano: queste pagine, a questo allievo, dentro questo
   * documento. È la via che non passa dal riconoscimento — si guarda il PDF, si
   * dicono gli estremi, si sceglie chi — e vale anche quando il documento non è
   * quello a cui il PDF era stato agganciato.
   */
  /**
   * Le pagine trascinate sulla casella di qualcuno: queste, a questa persona,
   * dentro questo documento.
   *
   * È l'assegnazione a mano detta con il mouse invece che con due campi, e
   * porta una cosa che gli estremi non sanno dire: pagine che non si toccano.
   * Chi guarda una scansione di classe trova le due facciate di una persona a
   * distanza di dieci fogli più spesso di quanto sembri, e due assegnazioni
   * separate farebbero due documenti dove ce n'è uno — di cui il registro
   * accetterebbe solo il primo.
   */
  // Le due azioni del flusso a blocchi: nessuna vista le manda più, le
  // esercitano le prove. Vedi la nota in `src/actions/sorting.ts`.
  | { tipo: 'smistamento.assegnaManuale'; smistamentoId: string; consegnaId: string; allievoId: string; da: number; a: number }
  | { tipo: 'smistamento.dividi'; smistamentoId: string; divisione: Divisione }
  | {
    tipo: 'smistamento.assegnaPagine'
    smistamentoId: string
    consegnaId: string
    allievoId: string
    pagine: number[]
  }
  /**
   * Le pagine trascinate su una casella della matrice delle assenze: questo
   * rapporto, di questa persona, in questo periodo.
   *
   * Il gemello di `smistamento.assegnaPagine` per l'altra matrice del docente
   * di classe. La casella dice quel che il file non può sapere: i rapporti
   * della scuola arrivano in un PDF solo per tutta la classe, e se quelle
   * pagine siano le assenze o i ritardi — vergini o già firmati — lo sa chi le
   * guarda, non il riconoscimento dei nomi.
   */
  | {
    tipo: 'smistamento.assegnaAssenze'
    smistamentoId: string
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
    pagine: number[]
  }
  /**
   * Le pagine trascinate sulla casella delle firme: queste, come foglio firme
   * di questa richiesta.
   *
   * È la stessa archiviazione delle altre, con una differenza sola: il foglio
   * firme non è di nessuno. È la prova di aver distribuito quel documento, vale
   * per tutta la colonna, e prima l'unica via per metterlo dentro era sceglierlo
   * da disco — cioè ritagliarlo altrove, salvarlo da qualche parte e ritrovarlo
   * nel dialogo. Le pagine sono già qui: è lo stesso gesto delle altre.
   */
  | { tipo: 'smistamento.assegnaFirme'; smistamentoId: string; consegnaId: string; pagine: number[] }
  /** Mette in coda tutte le pagine ancora da leggere di un PDF. */
  | { tipo: 'smistamento.leggiTutto'; smistamentoId: string }
  /**
   * Rilegge con l'OCR tutte le pagine ancora attive dei PDF indicati: quelle
   * che nessuno ha ancora archiviato.
   *
   * È il comando generale, e l'unico che porta più di un file: chi accende
   * l'OCR a metà lavoro — o cambia modello perché quello di prima leggeva male
   * — ha cinque PDF aperti a metà e nessuna voglia di premere cinque volte lo
   * stesso pulsante.
   *
   * Quali PDF lo dice il pannello e non l'host, perché «i PDF di questa
   * classe» è una domanda della pagina: dipende dal periodo scelto e dalle
   * richieste ancora aperte. Un comando che leggesse un elenco diverso da
   * quello che si vede macinerebbe pagine che chi l'ha premuto non ha mai
   * avuto davanti.
   *
   * Rilegge anche le pagine che un testo ce l'hanno già: se si chiede di
   * rileggere tutto è perché quel testo non è servito a niente —
   * l'intestazione della segreteria ripetuta uguale su trenta fogli, per dire.
   */
  | { tipo: 'smistamento.rileggiAttive'; smistamentiId: string[] }
  /** Svuota la coda di lettura: quel che si sta leggendo finisce la pagina. */
  | { tipo: 'smistamento.fermaLettura' }
  /** Prepara la fotografia della prima pagina di un blocco, per guardarla. */
  /** Apre in un lettore esterno solo le pagine di un blocco. */
  /** Dice a quale richiesta appartiene un PDF che non si era saputo agganciare. */
  /**
   * Dice di quale *classe* è un PDF: la prima volta, o cambiando idea.
   *
   * Due momenti, un gesto solo. Il PDF entrato dalla cartella osservata, con
   * `classeId` nullo e nessuna richiesta indovinata: senza una classe non ha
   * nemmeno un posto in cui mostrarsi — il fascicolo è per classe — e la pagina
   * «Da smistare» è l'unica da cui lo si può raggiungere. E la scansione che
   * attraversa due classi: finito di dividere quel che era della prima restano
   * pagine, e sono di un'altra.
   *
   * **Le pagine già archiviate non si muovono**: sono documenti di qualcuno, e
   * il mucchio che si sposta è solo quel che era rimasto da decidere. La
   * richiesta a cui il PDF era agganciato si lascia andare — una consegna
   * appartiene a un corso, cioè a una classe.
   */
  | { tipo: 'smistamento.attribuisci'; smistamentoId: string; classeId: string }
  /**
   * Cambia il modo in cui un PDF già in attesa viene tagliato, e rifà la bozza.
   *
   * Serve perché la domanda si fa prima di aprire il file: chi carica dichiara
   * «due pagine a testa» e poi vede che erano tre. Le pagine già archiviate
   * restano dove sono — sono documenti, non più pagine di questo PDF — e si
   * rifà soltanto quel che era ancora in ballo.
   */
  /** Apre il PDF originale, per guardare com'è fatto. */
  | { tipo: 'smistamento.apri'; smistamentoId: string }
  /** Butta via tutto quel che resta di uno smistamento, file compreso. */
  | { tipo: 'smistamento.elimina'; smistamentoId: string }
  /** Apre le impostazioni sulla lettura automatica delle scansioni. */
  | { tipo: 'smistamento.impostazioni' }
  | { tipo: 'recapito.salva'; classeId: string; recapito: Recapito }
  | { tipo: 'recapito.elimina'; classeId: string; recapitoId: string }
  | { tipo: 'comunicazione.salva'; classeId: string; comunicazione: Comunicazione }
  | { tipo: 'comunicazione.elimina'; classeId: string; comunicazioneId: string }
  | { tipo: 'comunicazione.invia'; classeId: string; comunicazioneId: string }
  /**
   * La spunta: chi ha mandato la bozza dal programma di posta lo dice qui,
   * e il registro gli crede. Con `spedita: false` torna bozza.
   */
  | { tipo: 'comunicazione.spunta'; classeId: string; comunicazioneId: string; spedita: boolean }
  // ---------------------------------------------------------------- assenze
  | { tipo: 'assenze.salva'; classeId: string; blocco: BloccoAssenze }
  | { tipo: 'assenze.elimina'; classeId: string; bloccoId: string }
  /**
   * Un foglio alla volta: si sceglie il file, viene archiviato nella cartella
   * dei dati e finisce nella riga di quell'allievo. La riga nasce qui, se non
   * c'era: chi non ha assenze non compare nel periodo finché non arriva il suo
   * primo foglio.
   */
  | {
    tipo: 'assenze.foglio.aggiungi'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  | {
    tipo: 'assenze.foglio.apri'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /** Toglie il foglio: il file va nel cestino e quella casella torna vuota. */
  | {
    tipo: 'assenze.foglio.togli'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /**
   * Venticinque PDF in un colpo solo, riconosciuti dal nome del file.
   *
   * È il modo in cui i fogli arrivano davvero — la segreteria consegna una
   * cartella — e sceglierli uno per uno vorrebbe dire cinquanta finestre di
   * dialogo per un trimestre. Quel che non si riconosce non viene assegnato a
   * caso: si dice quali file sono rimasti fuori.
   */
  | {
    tipo: 'assenze.importa'
    classeId: string
    bloccoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /**
   * La richiesta di firma: una mail per allievo, all'azienda, con dentro i
   * suoi fogli vergini. `allieviIds` vuoto vuol dire «tutti quelli pronti e
   * non ancora spediti».
   */
  | { tipo: 'assenze.invia'; classeId: string; bloccoId: string; allieviIds: string[] }
  /** La spunta sulla richiesta di un allievo: partita, o tornata da mandare. */
  | { tipo: 'assenze.spunta'; classeId: string; bloccoId: string; allievoId: string; spedita: boolean }
  /**
   * Con `ruolo: 'recupero'` l'allievo è facoltativo: senza è il testo della
   * prova di recupero, con è il compito rifatto da quell'allievo. La sua
   * soluzione è `recupero-soluzione`, e di allievo non ne ha uno.
   */
  | { tipo: 'allegato.aggiungi'; valutazioneId: string; ruolo: RuoloAllegato; allievoId?: string | null }
  | { tipo: 'allegato.apri'; valutazioneId: string; allegatoId: string }
  | { tipo: 'allegato.elimina'; valutazioneId: string; allegatoId: string }
  | { tipo: 'impostazioni.salva'; impostazioni: Impostazioni }
  /**
   * Un'impostazione del programma — quelle che stanno in `impostazioni.json` e
   * non dentro il documento d'anno.
   *
   * Sono due mondi diversi e la differenza conta: `impostazioni.salva` scrive
   * dentro il `.registro` e viaggia con il file, questa scrive sulla macchina e
   * resta qui. La pagina Impostazioni le tiene sotto due schede separate per
   * non far sbagliare, e il valore passa di qui perché il webview vive in una
   * sandbox e il file delle impostazioni non lo vede.
   */
  | { tipo: 'programma.salva'; chiave: string; valore: string | number | boolean }
  /** Ritira il valore scritto: si torna al predefinito del manifesto. */
  | { tipo: 'programma.azzera'; chiave: string }
  /**
   * Un rapporto in PDF.
   *
   * Un'azione sola per tutti i rapporti: quel che cambia è il modello — un file
   * in `templates/` — e i dati che ci si mettono dentro. Sei azioni quasi
   * uguali sarebbero state sei posti in cui cambiare la stessa cosa.
   *
   * Scrive e basta: non apre più niente fuori dal registro. Il percorso torna
   * in `Risposta.documento`, e chi ha premuto — la pagina Documenti — lo mostra
   * nella sua cornice. Aprirlo con il programma di sistema voleva dire una
   * finestra in più per ogni foglio rifatto, proprio mentre la pagina ne ha una
   * che lo fa vedere senza uscire.
   */
  | {
    tipo: 'rapporto.genera'
    genere:
        | 'lezione'
        | 'piano'
        | 'valutazioni'
        | 'presenze'
        | 'fascicolo'
        | 'allievo'
        | 'momento'
        | 'foto-classe'
    /**
       * L'id di quel che si stampa: la lezione, il piano, il corso per
       * valutazioni e presenze, la classe per il fascicolo e per la parete di
       * ritratti, l'allievo per la scheda, il momento di valutazione per la
       * scheda di una prova.
       */
    id: string
    /**
       * Solo per la scheda dell'allievo: di quale corso parla.
       *
       * Un allievo sta in una classe e la classe può portare due materie: una
       * scheda che le mette insieme dà una media che non è la media di niente,
       * e non saprebbe nemmeno in quale cartella andare. Vuoto vuol dire «la
       * classe non ha corsi», ed è l'unico caso in cui la scheda resta del
       * docente di classe.
       */
    corsoId?: string | null
    /** Solo per valutazioni e scheda dell'allievo: il periodo da guardare. */
    semestreId?: string | null
  }
  /**
   * Tutto quel che un corso sa dire, in un colpo solo: il conto delle
   * presenze, la griglia dei voti e una scheda per ogni allievo che lo segue.
   *
   * Esistono già le azioni per farne uno alla volta, e restano: servono quando
   * si vuole quel foglio lì. Questa serve al momento in cui i fogli si
   * consegnano tutti insieme — la fine di un semestre, un colloquio con
   * l'azienda — e farli uno per uno vuol dire venticinque giri di pulsanti e
   * la certezza di saltarne uno.
   *
   * `corsoId` nullo vuol dire tutti i corsi dell'anno: è la stessa operazione,
   * ripetuta, e chiederla corso per corso sarebbe la stessa noia spostata di
   * un passo.
   */
  | { tipo: 'rapporto.completo'; corsoId: string | null; semestreId: string | null }
  | { tipo: 'rapporto.modelli' }
  // Il testo di un modello e la sua anteprima non stanno più qui. Erano
  // `modello.leggi` e `modello.prova`: due azioni che non scrivevano niente,
  // e che per rispondere avevano fatto crescere la busta di tutte le altre di
  // tre campi — `testo`, `nomi`, `pdf` — usati da loro sole. Adesso sono due
  // procedure di sola lettura, `modelli.leggi` e `modelli.prova`, e la pagina
  // le chiede con `chiedi()` sul canale delle domande.
  /** Scrive il modello com’è adesso nella pagina. */
  | {
    tipo: 'modello.salva'
    nome: string
    testo: string
    /**
     * L'impronta del testo che la pagina credeva ci fosse sul disco.
     *
     * I modelli sono file veri, dentro `templates/`, e si correggono anche con
     * un editor qualsiasi: è il motivo per cui stanno fuori dal codice.
     * Salvando senza guardare, il registro scriveva sopra la correzione fatta
     * da fuori senza dire niente. Con l'impronta l'host se ne accorge e si
     * ferma. Manca quando la pagina non ha mai letto il file.
     */
    attesoSuDisco?: string
  }
  /** Rimette il modello di serie, buttando via quel che c'era. */
  | { tipo: 'modello.ripristina'; nome: string }
  /** Porta un'immagine dentro `templates/`: il logo della sede. */
  | { tipo: 'modello.immagine' }
  /**
   * Apre un documento già esportato con il programma del sistema.
   *
   * Non è `rapporto.genera`: quella lo rifà e poi lo apre, e rifare venticinque
   * schede per rileggerne una è il giro lungo. Qui si guarda quel che c'è nella
   * cartella — che è anche il solo modo di vedere *che cosa si è consegnato*,
   * che non è sempre quel che il registro direbbe adesso.
   */
  | { tipo: 'esportazione.apri'; percorso: string }
  /**
   * Lo stesso documento, guardato *dentro* il registro.
   *
   * Una finestra dell'applicazione con il lettore di PDF di Chromium: pagine,
   * zoom, ricerca, stampa. È la forma giusta del controllo prima di consegnare
   * — «questa scheda è quella che voglio dare?» — che con il programma di
   * sistema portava fuori dal registro e lasciava mezza barra delle
   * applicazioni piena di finestre uguali.
   *
   * Vale per i PDF. Un CSV o un testo vanno al programma di sistema, che è
   * quello in cui si aprono davvero: `esportazione.apri`.
   */
  | { tipo: 'esportazione.mostra'; percorso: string; titolo?: string }
  /**
   * Butta via un documento esportato.
   *
   * Si può: sotto `esportazioni/` non c'è niente di unico — è una fotografia
   * del registro, e il registro c'è ancora. Serve quando un documento non ha
   * più motivo di stare lì: la scheda di chi ha lasciato la classe, le presenze
   * di un periodo rinominato, i fogli di un modello vecchio.
   */
  | { tipo: 'esportazione.elimina'; percorso: string }
  /**
   * Un fascicolo nuovo: i documenti spuntati, in fila, sotto un nome.
   *
   * Il nome non è un vezzo: è il nome del PDF che ne esce, ed è come lo si
   * ritrova l'anno dopo. L'ordine è quello in cui i percorsi arrivano — cioè
   * quello in cui la pagina li elenca — e resta scritto nella ricetta.
   */
  | { tipo: 'composizione.crea'; nome: string; percorsi: string[] }
  /**
   * Rifà il PDF di un fascicolo con i fogli che stanno nella cartella adesso.
   *
   * È il motivo per cui la ricetta esiste: le schede cambiano fino all'ultimo
   * giorno, e un fascicolo consegnato con la versione di ottobre è peggio di
   * nessun fascicolo.
   */
  | { tipo: 'composizione.aggiorna'; id: string }
  /** Butta via un fascicolo: la ricetta e il PDF. I fogli restano dove sono. */
  | { tipo: 'composizione.elimina'; id: string }
  /**
   * Butta via i momenti di valutazione che nessuna tappa del piano ha fatto
   * nascere. Gli id si passano espliciti: si guarda l'elenco, si decide, e non
   * si cancella «tutto quel che il registro considera sganciato» a scatola
   * chiusa — dentro ci sono dei voti.
   */
  | { tipo: 'valutazione.eliminaOrfane'; ids: string[] }
  /**
   * Le valutazioni di un corso in CSV. Di un corso e non di una classe: una
   * media che mescola due materie non è la media di niente.
   */
  | { tipo: 'esporta.valutazioni'; corsoId: string; semestreId: string | null }
  /**
   * Le presenze di un corso in CSV. Di un corso e non di una classe: le ore
   * sono di un insegnamento, e sommare le assenze di due materie diverse dà un
   * numero che non risponde a nessuna domanda.
   */
  | { tipo: 'esporta.presenze'; corsoId: string; semestreId: string | null }
  | { tipo: 'esporta.lezione'; lezioneId: string }
  /** Applica tutte le correzioni che il registro sa fare da solo. */
  | { tipo: 'manutenzione.ripara' }
  | { tipo: 'sistema.apriCartella' }
  /**
   * Quanto è grande quel che si vede, di un passo per volta.
   *
   * Passa dall'host perché lo zoom è una proprietà della finestra e non della
   * pagina: cambiarlo nel CSS vorrebbe dire rifare ogni misura del registro,
   * mentre Chromium lo sa fare su tutto insieme — ed è quel che fa già
   * `Ctrl+`, che nel menu dell'applicazione c'è da sempre.
   *
   * Sta nel protocollo e non solo nel menu nativo perché su Windows e Linux il
   * registro si disegna la barra del titolo da sé e la barra dei menu non si
   * vede più: senza questa via, «Ingrandisci» esisterebbe solo per chi conosce
   * la scorciatoia.
   */
  | { tipo: 'finestra.zoom'; verso: 'avanti' | 'indietro' | 'azzera' }
  /**
   * La finestra a schermo intero, e di nuovo indietro.
   *
   * È la finestra *di chi insegna*, e non ha niente a che vedere con
   * `proiezione.schermo`: quella manda lo schermo della classe sul secondo
   * monitor, questa allarga la finestra su cui si sta lavorando.
   */
  | { tipo: 'finestra.schermoIntero' }
  /** Chiude il registro. Il documento si salva da sé: non c'è niente da perdere. */
  | { tipo: 'programma.esci' }
  /**
   * Compone un numero con il programma che sa telefonare.
   *
   * Il registro non telefona: passa il numero al sistema, che lo consegna a chi
   * ha detto di saper gestire i `tel:` — Teams, Skype, il telefono appaiato al
   * computer. Quale sia lo dice un'impostazione, perché un `tel:` che su una
   * macchina apre Teams su un'altra non apre niente, e la differenza non la può
   * indovinare il registro.
   *
   * Passa dall'host e non da un `<a href="tel:">` nella pagina perché il
   * webview vive in una sandbox: un collegamento a uno schema che non sia
   * `https` non arriva da nessuna parte, e il clic morirebbe in silenzio.
   */
  | { tipo: 'sistema.chiama'; numero: string }
  /**
   * Apre il programma di posta su un messaggio nuovo a quell'indirizzo.
   *
   * Non è la posta del registro — quella spedisce da sé le comunicazioni alla
   * classe — è il `mailto:` di sempre: una riga a una persona sola, scritta a
   * mano da chi la scrive, che finisce nella cartella «inviati» del suo
   * programma e non nel registro.
   */
  | { tipo: 'sistema.scrivi'; indirizzo: string }
  /**
   * Domanda alla casella di chi è, senza mandare niente.
   *
   * È la prova del collegamento: fin qui «il registro sa spedire» era una cosa
   * che si poteva verificare solo mandando una mail vera a qualcuno. La
   * risposta torna come messaggio, con l'indirizzo scritto dentro.
   */
  | { tipo: 'posta.prova' }
  /**
   * Manda una mail di prova a un indirizzo che si sceglie, e dice com'è andata.
   *
   * È l'altra metà di `posta.prova`, e ci vogliono tutte e due: quella
   * verifica che si entri nella casella, questa che se ne esca. Il permesso di
   * spedire è un'altra cosa dal permesso di entrare, e la firma si carica o
   * non si carica solo quando un messaggio parte davvero.
   *
   * L'indirizzo lo chiede l'host, non il webview: è una finestra del sistema,
   * e parte una mail vera — chi la scrive deve vedere il campo già riempito
   * con il proprio indirizzo, che è dove la prova va quasi sempre.
   */
  | { tipo: 'posta.invioProva' }
  /**
   * Collega la casella: chiede l'indirizzo, fa accedere a Microsoft dal
   * browser, prova, e salva solo se il server accetta. Il gettone non passa di
   * qui — resta nell'host, che lo mette nel portachiavi del sistema. Il
   * webview non lo vede mai.
   */
  | { tipo: 'posta.collega' }
  /** Toglie dal portachiavi quel che apre la casella: si torna alle bozze. */
  | { tipo: 'posta.scollega' }
  | { tipo: 'sistema.messaggio'; livello: 'info' | 'avviso' | 'errore'; testo: string }
  // ------------------------------------------------------------------- mappa
  /**
   * Cerca le coordinate degli indirizzi che non le hanno ancora: il domicilio e
   * il posto di lavoro di chi frequenta le classi indicate.
   *
   * Parte da un gesto e non da un'apertura di pagina, ed è tutto il senso di
   * questa azione: gli indirizzi escono dalla macchina — vanno al
   * geocodificatore di OpenStreetMap — e una cosa del genere la si fa quando la
   * si è chiesta. Le coordinate tornate restano scritte nell'anagrafica, così la
   * domanda si fa una volta sola per indirizzo.
   *
   * Senza `classeIds` vale per tutte le classi dell'anno. `rifaiTutto` rimette
   * in fila anche quelli già risolti, per chi sospetta una risposta finita nel
   * posto sbagliato.
   *
   * Con `allievoId` vale per una persona sola: è il gesto che si fa dalla sua
   * scheda, dopo aver corretto un indirizzo, senza rimettere in fila la classe.
   */
  | { tipo: 'mappa.geocodifica'; classeIds?: string[]; allievoId?: string; rifaiTutto?: boolean }
  // ---------------------------------------------------------------- proiezione
  /**
   * Apre lo schermo per la classe. Un secondo pannello, non una copia di
   * questo: mostra un sottoinsieme del registro, in sola lettura e in caratteri
   * grandi, e va spostato sul proiettore.
   */
  | { tipo: 'proiezione.apri' }
  | { tipo: 'proiezione.chiudi' }
  /**
   * Dove sta guardando il registro. La manda il pannello a ogni cambio di
   * vista: la proiezione segue l'ora aperta senza che si debba dirglielo.
   */
  | { tipo: 'proiezione.mira'; mira: MiraProiezione }
  /**
   * Che cosa si vede sullo schermo grande: i blocchi accesi, i nomi, la pausa.
   * Si decide da qui — dal pannello del docente — e non dalla proiezione, che
   * sta davanti alla classe e non ha comandi.
   */
  | { tipo: 'proiezione.impostazioni'; impostazioni: ImpostazioniProiezione }
  /**
   * Stacca l'assistente: il riquadro si chiude e si riapre in una finestra sua.
   *
   * La conversazione viaggia con lui. Chi stacca lo fa quasi sempre **a metà**
   * di una domanda — la risposta è lunga, o si vuole tenerla aperta accanto a
   * un'altra cosa — e un riquadro che si svuota spostandosi è un riquadro che
   * non si sposta: si ricomincerebbe da capo, con la stessa domanda.
   *
   * L'host la tiene per l'istante fra una finestra e l'altra e poi la lascia:
   * dentro ci sono i nomi delle persone in formazione, e `panels/assistant.ts`
   * spiega perché non resta.
   *
   * **E viaggia anche la domanda che non ha ancora risposta.** `giro` c'è
   * quando si stacca mentre il modello sta leggendo: l'host tiene il filo da
   * parte invece di lasciarlo cadere, e la finestra che arriva lo riprende dal
   * punto in cui l'altra l'ha lasciato. Senza, il giro più lungo — quello per
   * cui si stacca, perché la risposta non arriva e il riquadro sta stretto —
   * era anche il solo che si perdeva.
   *
   * **Il rientro non è un'azione**, ed è asimmetrico apposta: a staccare è il
   * riquadro, che la conversazione ce l'ha in mano; a riattaccare è la
   * finestra, per la stessa ragione. Un'azione «riattacca» partita dal pannello
   * dovrebbe chiedere la conversazione a una finestra che sta per chiudersi —
   * cioè un giro in più per farsi dare quel che l'altra può consegnare da sé, e
   * un modo in più di perderla per strada.
   */
  | { tipo: 'assistente.stacca'; storia: TurnoAssistente[]; bozza?: string; giro?: GiroAssistente }
  /**
   * Dove sta guardando chi chiede. La manda il pannello a ogni cambio di vista.
   *
   * È la gemella di `proiezione.mira`, per un altro schermo: là si dice a un
   * proiettore che cosa mostrare, qui si dice a un modello di che cosa si sta
   * parlando. Senza, «quante ore ha perso la 4a» partiva senza la 4a — il
   * modello chiamava `corsi.elenco`, sceglieva un corso a caso fra quelli che
   * tornavano e rispondeva su un altro; e una risposta su un altro corso, in un
   * registro, è indistinguibile da una risposta giusta finché non la si
   * controlla.
   *
   * **La tiene l'host, non la busta della domanda.** La conversazione parte da
   * due finestre — il riquadro e quella staccata — e la finestra staccata non
   * ha il registro in mano: non saprebbe comporla. Passando di qui la compone
   * chi ce l'ha, una volta sola, e tutte e due la usano.
   */
  | { tipo: 'assistente.contesto'; contesto: ContestoAssistente | null }
  /**
   * Apri una pagina del registro, con quel che le serve per aprirsi giusta.
   *
   * La stessa cosa che fanno il menu nativo, il widget dell'agenda e la palette
   * — `MessaggioNavigazione` — detta come azione, perché di qui passa anche
   * l'assistente: chiedere «fammi vedere le valutazioni della 4a» e ritrovarsi
   * spiegato a parole dove cliccare è la risposta che fa chiudere l'assistente.
   *
   * Non porta `nuovo` né `avvio`, e non è una dimenticanza: quelli aprono un
   * modulo di creazione, e un modulo aperto da un modello è il primo passo
   * verso una scrittura che nessuno ha chiesto. Si apre la pagina; a creare è
   * chi insegna.
   */
  | { tipo: 'vista.apri'; vista: Vista; elementoId?: string; data?: Iso }
  /**
   * Scarica un modello del linguaggio da Hugging Face.
   *
   * Un'azione e non una domanda, benché non tocchi il registro: dura mezz'ora,
   * scrive gigabyte sul disco di chi insegna e si può annullare. Le tre cose
   * insieme vogliono la coda delle scritture — due scarichi avviati per sbaglio
   * sullo stesso file sono due file a metà — e vogliono un giornale che ne
   * tenga traccia, che è quel che le domande non hanno.
   *
   * Quel che scende non è scelto qui: arriva `deposito` e `file` come la pagina
   * li ha letti dall'albero del deposito, e comporre l'indirizzo è mestiere di
   * `data/huggingFace.ts`.
   */
  | { tipo: 'llm.scarica'; deposito: string; file: string; per?: UsoModello }
  /** Ferma lo scarico in corso. Quel che era sceso a metà se ne va con lui. */
  | { tipo: 'llm.annulla' }
  /**
   * Porta fra i modelli un `.gguf` che si ha già.
   *
   * È la stessa cosa che fa lo scarico, con la rete tolta di mezzo: ci si
   * trascina sopra un file, o lo si sceglie con il dialogo. Il percorso arriva
   * dalla pagina, e **non è il percorso che verrà aperto**: `data/gguf.ts` lo
   * controlla, guarda che sia davvero un GGUF e ne fa una copia nella cartella
   * dei modelli.
   */
  | { tipo: 'llm.importa'; file: string }
  /** Toglie un modello dalla cartella. Solo di lì, e solo un `.gguf`. */
  | { tipo: 'llm.elimina'; nome: string }
  /**
   * Dice quale modello lavora per quale mestiere.
   *
   * Scrive nelle impostazioni, non nel registro: è l'unica azione che lo fa, e
   * passa di qui perché la pagina non scrive impostazioni da sé — non le ha, e
   * non deve averle.
   */
  | { tipo: 'llm.scegli'; uso: UsoModello; modello: string; proiettore?: string }

/**
 * Per quale mestiere un modello lavora.
 *
 * Sono i due usi di `data/llm.ts` detti a chi guarda: l'assistente conversa, la
 * lettura delle scansioni guarda. Un modello serve a uno dei due e quasi mai a
 * tutti e due — chi chiama gli attrezzi di solito non vede, chi vede di solito
 * non chiama gli attrezzi — ed è per questo che si sceglie due volte.
 */
export type UsoModello = 'assistente' | 'ocr'

/**
 * Un turno della conversazione con l'assistente, come si vede.
 *
 * Non è la stessa cosa di `Conversazione.storia`, ed è bene che non lo sia:
 * quella è quel che si manda al modello — chi ha parlato e che cosa ha detto,
 * niente altro — e questa è quel che sta sullo schermo, con dentro le procedure
 * aperte e il segno dei guasti. Fondere le due forme vorrebbe dire mandare al
 * modello l'elenco dei propri errori come se fosse conversazione.
 *
 * Viaggia solo quando l'assistente si sposta fra il riquadro e la sua finestra.
 */
export interface TurnoAssistente {
  ruolo: 'utente' | 'assistente'
  testo: string
  /**
   * Le procedure aperte per scrivere questa risposta.
   *
   * `messaggio` è il motivo per cui una non è andata, come in
   * `MessaggioAssistente.attrezzo`: viaggia con il turno perché **è** il turno
   * — la pastiglia rossa senza la sua riga dice soltanto che qualcosa non ha
   * funzionato.
   */
  attrezzi?: Array<{ nome: string, ok: boolean, codice?: string, messaggio?: string }>
  /**
   * Gli id incontrati leggendo per scrivere questo turno.
   *
   * Viaggiano nel turno e non in un magazzino a parte per una ragione sola:
   * così muoiono quando la conversazione si svuota. Chi preme «svuota» vuole
   * che quei nomi spariscano, e una lista tenuta altrove gli sopravviverebbe
   * senza che nulla lo dica. Nel turno invece seguono la conversazione
   * dappertutto — compresa la finestra che si stacca — e finiscono con lei.
   */
  visti?: IdVisto[]
  /**
   * Quel che quelle procedure hanno letto, già impaginato dal contratto.
   *
   * Viaggia con il turno perché **è** il turno: la frase dell'assistente dice
   * «sono 24», la tabella sotto dice quali. Stando fuori di qui, staccare la
   * conversazione lasciava indietro tutte le tabelle — le bolle arrivavano al
   * posto giusto e sotto non c'era più niente, cioè proprio i dati letti dal
   * registro, che sono la sola cosa che distingue una risposta vera da una
   * immaginata.
   *
   * Sono gli stessi `RisultatoAssistente` che `api/presentation.ts` compone e
   * che `MessaggioAssistente` porta mentre si risponde: non si ricompongono,
   * si trasportano.
   */
  risultati?: RisultatoAssistente[]
  /** Il servizio non ha risposto: si disegna in un altro modo. */
  guasto?: boolean
  /**
   * Chi ha chiesto ha smesso di aspettare: non è un guasto.
   *
   * Era segnato `guasto: true`, e così un gesto **voluto** — premere «Ferma» —
   * si disegnava con lo stile dell'errore e si annunciava come un errore a chi
   * usa lo schermo che parla. Resta comunque fuori dalla storia che si manda al
   * modello, come i guasti: «Fermato.» non è una battuta di nessuno.
   */
  fermato?: boolean
}

/** Una richiesta con il suo numero d'ordine: la risposta lo riporta identico. */
export interface Richiesta {
  id: number
  azione: Azione
}

/**
 * Una domanda: si chiede qualcosa al registro e non si cambia niente.
 *
 * Il pannello quasi tutto ce l'ha già — l'host gli spinge il `Registro` intero
 * dopo ogni scrittura — e per quel che sta nei dati continua a leggerselo da
 * sé, che è più svelto di qualunque andata e ritorno. Questo canale serve a
 * quel che nel registro **non c'è**: il sorgente di un modello, l'inventario
 * dei file scritti, un PDF composto per prova, la diagnosi delle cose rotte.
 * Erano azioni con dentro un campo di ritorno buono per loro sole —
 * `Risposta.testo`, `.nomi`, `.pdf` — cioè letture travestite da scritture.
 *
 * E serve soprattutto a chi il registro non ce l'ha affatto: il widget
 * dell'agenda, che riceve schede già composte e non ha modo di chiedere niente.
 *
 * **Una domanda non può scrivere.** Non è una convenzione: l'host rifiuta una
 * procedura che non sia dichiarata `genere: 'lettura'`, e quel controllo sta
 * nel nucleo, una volta, per tutti i trasporti. È anche il motivo per cui le
 * domande non entrano nella coda delle scritture: una lettura è sincrona sul
 * registro in memoria, e metterla in fila dietro la generazione di venti PDF
 * vorrebbe dire un'agenda ferma dieci secondi per disegnare la settimana.
 */
export interface Domanda {
  id: number
  /** Il nome di una procedura di lettura: `corso.presenze`, `modelli.leggi`. */
  procedura: string
  ingresso?: unknown
}

/** Quel che torna a una domanda. */
export interface Riscontro {
  tipo: 'riscontro'
  id: number
  ok: boolean
  /** Quel che la procedura ha risposto, nella forma che dichiara. */
  dati?: unknown
  /** Le frasi da mostrare, già in italiano. */
  errori?: string[]
  /** Il codice dell'API: `non-trovato`, `rifiutato`, `ingresso-non-valido`… */
  codice?: string
}

/**
 * Una conversazione con l'assistente: una domanda scritta in italiano, e il
 * modello locale che per risponderle legge il registro.
 *
 * È **la terza busta** che parte dal pannello, accanto alla `Richiesta` e alla
 * `Domanda`, e non un'azione, per la ragione per cui `modello.leggi` smise di
 * esserlo: un'azione è una scrittura, e questa non scrive. Il conto torna anche
 * dall'altra parte — `tests/api/coverage.test.mjs` pretende che ogni voce
 * dell'unione `Azione` abbia una procedura che la prende in carico, e una
 * conversazione non è una procedura.
 *
 * Non è nemmeno una `Domanda`: una domanda nomina la procedura e i suoi
 * argomenti, e qui è proprio quello che il pannello non decide. Chi li compone
 * è il modello, e quel che ha diritto di toccare lo stabilisce
 * `api/transports/assistant.ts` — che ricontrolla il genere di ogni procedura
 * prima di chiamarla, e non concede che le letture.
 *
 * **Fuori dalla coda delle scritture**, come le domande e per una ragione in
 * più: un giro di conversazione dura dieci o venti secondi, e in fila davanti
 * alle scritture terrebbe fermo il registro per tutto quel tempo.
 *
 * `storia` la tiene la pagina e non l'host: chi sta davanti può cancellarla, e
 * una conversazione dimenticata deve sparire davvero — non restare in una
 * mappa del main process finché la finestra si chiude.
 */
/**
 * Una scelta fatta in una tendina, come si legge e come si passa.
 *
 * Due campi e non uno: «DIC4a · Matematica» è quel che c'è scritto nella barra
 * ed è la parola con cui chi chiede ne parla, `cor-0003` è quel che un attrezzo
 * vuole. Mandando solo il primo il modello avrebbe dovuto ritrovare l'id
 * chiamando un elenco — cioè indovinare di nuovo proprio quel che qui si sta
 * dicendo; mandando solo il secondo non avrebbe potuto riconoscere la classe di
 * cui gli si sta parlando per nome.
 */
export interface VoceContesto {
  /** Come si chiama il campo nella barra: «Corso», «Classe», «Semestre». */
  campo: string
  /**
   * Il campo da cui questo dipende: «Corso» sta dentro «Classe», che sta
   * dentro «Anno scolastico».
   *
   * Senza, le scelte arrivavano come un elenco piatto di tendine che non si
   * parlano, e il modello non aveva modo di sapere che restringere la classe
   * restringe i corsi — né che «e la terza?» vuol dire un altro corso **di
   * quella classe** e non un corso qualunque dell’anno. Le alternative di una
   * voce sono quelle ammesse dalla scelta di sopra, non tutte quelle che
   * esistono: è la gerarchia vera della barra, scritta invece che sottintesa.
   *
   * Assente per le voci che non dipendono da niente.
   */
  dentro?: string
  /** Il valore come si legge a schermo: «DIC4a · Matematica», «Tutti i corsi». */
  valore: string
  /** L'id da passare agli attrezzi, quando quel valore ne ha uno. */
  id: string | null
  /**
   * Le altre voci di quella tendina: che cosa si potrebbe scegliere.
   *
   * Senza, il contesto diceva *dove si è* e non *dove si può andare*, e le due
   * cose non si equivalgono: a «e la terza?» il modello rispondeva chiedendo
   * quale classe, oppure — peggio — chiamando un elenco e scegliendo la riga
   * che gli sembrava. Con le alternative accanto, la domanda che segue una
   * risposta si risolve senza una seconda lettura e senza indovinare.
   *
   * Assente dove una scelta non c'è: un valore che non si cambia non è una
   * tendina, ed elencare una voce sola è un modo di dire che ce n'erano altre.
   */
  opzioni?: Array<{ valore: string, id: string | null }>
}

/**
 * Gli id su cui la pagina è puntata, già risolti.
 *
 * Tutti nullabili e tutti presenti: `null` vuol dire «qui non c'è», non «non lo
 * dico». Un campo che manca lascerebbe il modello a chiedersi se la pagina non
 * abbia un corso o se il contesto sia incompleto, e nel dubbio a inventarselo.
 */
export interface RiferimentiContesto {
  annoId: string | null
  semestreId: string | null
  corsoId: string | null
  classeId: string | null
  lezioneId: string | null
  allievoId: string | null
  pianoId: string | null
  valutazioneId: string | null
}

/**
 * Il periodo su cui la pagina fa i conti, **già in date**.
 *
 * `semestreId` da solo non basta e non è un dettaglio: nessun attrezzo lo
 * accetta — `corso.presenze` vuole `dal` e `al` — e un contesto che dicesse
 * soltanto «secondo semestre» lascerebbe il modello a scegliere fra due strade
 * sbagliate: chiedere l'anno intero, o inventarsi le due date del semestre.
 * Qui le due date sono quelle che il registro sta usando per i suoi conti, e si
 * passano agli attrezzi così come stanno.
 *
 * `null` tutti e due quando non c'è ancora un anno: non ci sono date da dare,
 * e due estremi inventati sarebbero peggio di nessun estremo.
 */
export interface PeriodoContesto {
  /** Come si legge nella tendina: «2° semestre», «Anno intero». */
  etichetta: string
  /** Il primo giorno che conta, da passare come `dal`. */
  dal: Iso | null
  /** L'ultimo giorno che conta, da passare come `al`. */
  al: Iso | null
}

/**
 * Quel che l'elenco della pagina sta mostrando **adesso**, filtrato com'è a
 * schermo.
 *
 * È la metà che fa la differenza fra un assistente e un oracolo. Chi guarda la
 * 4a con il filtro sul secondo semestre e chiede «chi ha più assenze» intende
 * fra questi, in questo periodo — e un modello che chiama l'elenco intero
 * risponde su un anno che non si sta guardando. Gli id arrivano nell'ordine in
 * cui si vedono, perché «il terzo della lista» è un modo in cui si chiede.
 *
 * `troncato` non è un dettaglio: un elenco tagliato senza dirlo diventa una
 * risposta sicura su una parte, e in un registro una risposta sicura e parziale
 * è peggio di un «non lo so».
 */
export interface ElencoVisibile {
  /** Di che cosa è l'elenco: «corsi», «persone in formazione», «ore». */
  cosa: string
  /** Quanti ne mostra la pagina in tutto, anche oltre quelli che si mandano. */
  quanti: number
  /** Gli id di quelli mostrati, nell'ordine in cui si vedono. */
  ids: string[]
  /** Vero se la pagina ne mostra più di quanti se ne sono mandati. */
  troncato: boolean
}

/**
 * Di che cosa si sta parlando: la pagina, la scheda, le tendine, i filtri.
 *
 * Il contesto non lo scrive chi chiede: lo si deduce da dove sta guardando, ed
 * è esattamente quel che una domanda in italiano dà per scontato. «Quante ore
 * ha perso la 4a» detto dalla pagina delle valutazioni della 4a, nel secondo
 * semestre, vuol dire *quel* corso e *quel* periodo — e senza dirlo il modello
 * sceglieva un corso a caso fra quelli che gli tornavano da un elenco.
 *
 * Viaggia come `assistente.contesto` a ogni cambio di vista, e l'host tiene
 * l'ultimo: vedi la nota su quell'azione.
 */
export interface ContestoAssistente {
  /**
   * La pagina aperta, con il nome che ha nel codice.
   *
   * `null` quando chi chiede ha spento «la pagina che guardo»: là dentro si
   * spegne il nome della pagina, e lasciare la vista vorrebbe dire togliere
   * «Valutazioni» dalla busta e mandare `valutazioni` due righe più in là. Il
   * resto del contesto — tendine, filtri, periodo, elenco — non dipende da
   * questa: vedi `ui/assistant/parts.ts`.
   */
  vista: Vista | null
  /** Come si chiama nella barra laterale: «Registro della lezione». `null` come sopra. */
  pagina: string | null
  /** La scheda aperta dentro la pagina, quando ne ha: «Appello». */
  scheda: string | null
  /**
   * La sezione aperta dentro la scheda, quando la pagina ne ha due livelli.
   *
   * Oggi sono le impostazioni: la scheda dice di chi sono — il programma o il
   * documento — e la sezione dice quale delle sei si sta leggendo. La scheda
   * da sola rispondeva «Il programma» a chi sta guardando «Assistente», cioè
   * il nome della metà invece del nome di quel che si ha sotto gli occhi.
   */
  sezione: string | null
  /** Le scelte fatte nelle tendine in cima, come si leggono. */
  scelte: VoceContesto[]
  /** Quel che la pagina sta restringendo: vale anche per quel che si chiede. */
  filtri: VoceContesto[]
  riferimenti: RiferimentiContesto
  /**
   * Il periodo dei conti, in date: è quel che gli attrezzi chiedono.
   *
   * `null` quando chi chiede non lo vuole dire: nella testata dell'assistente
   * ogni parte del contesto si accende e si spegne per conto suo, e il periodo
   * spento vuol dire «rispondi senza restringere», non «non c'è un periodo».
   */
  periodo: PeriodoContesto | null
  /** Il giorno che la pagina sta mostrando. */
  data: Iso
  /** Oggi: la pagina può benissimo non starlo mostrando. */
  oggi: Iso
  /** La ricerca battuta nella pagina, quando ce n'è una. */
  ricerca: string | null
  visibili: ElencoVisibile | null
}

export interface Conversazione {
  id: number
  /** I turni già detti, il più recente per ultimo. Le istruzioni le mette l'host. */
  storia: Array<{ ruolo: 'utente' | 'assistente', testo: string }>
  /**
   * Gli id già incontrati, raccolti dai turni di questa conversazione.
   *
   * `storia` qui è ristretta a ruolo e testo — è quel che il modello rilegge —
   * quindi gli id non ci viaggiano dentro e si mandano accanto. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /**
   * Dove si sta guardando **nel momento in cui si è premuto Invio**.
   *
   * Viaggiava per un canale suo — `assistente.contesto`, una scrittura che si
   * mette in coda — mentre la domanda la coda la salta. Il guasto si vedeva
   * così: si genera un rapporto PDF che impiega dieci secondi, si cambia corso
   * dalla tendina (il contesto si accoda dietro il PDF), si scrive la domanda e
   * si preme Invio. La domanda scavalca la coda, l'host legge la veduta di
   * prima, e il modello risponde **sul corso precedente dichiarando con
   * precisione la classe sbagliata**.
   *
   * Qui il contesto viaggia dentro la busta della domanda, cioè fotografato
   * nell'istante giusto e per quella domanda sola. `undefined` vuol dire «non
   * lo so comporre»: è la finestra staccata, che il registro non ce l'ha e si
   * affida a quel che il pannello ha mandato per ultimo. `null` vuol dire
   * «chi chiede non lo vuole dire», cioè l'interruttore del contesto spento.
   */
  contesto?: ContestoAssistente | null
}

/**
 * Una domanda ancora senza risposta, mentre l'assistente cambia finestra.
 *
 * Il giro vive nell'host — è lui che sta parlando con il modello — e non nella
 * pagina: chiudere la finestra non lo ferma, e finora quel che tornava non
 * trovava più nessuno. Qui si dichiara quel che la finestra che se ne va deve
 * dire per non perderlo: **quanti eventi ha già ricevuto**. Sotto la risposta
 * stanno gli attrezzi aperti e le tabelle lette, e sono già dentro i turni che
 * viaggiano: rimandarli tutti li scriverebbe due volte, rimandarne troppo pochi
 * lascerebbe un buco.
 */
export interface GiroAssistente {
  /** Quanti eventi di questo giro la finestra che consegna ha già ricevuto. */
  visti: number
  /**
   * L'id della busta con cui **questa pagina** aveva chiesto.
   *
   * Serve a dire *quale* giro sospendere. Senza, l'host sceglieva «il più
   * recente» — e due conversazioni insieme sono un caso previsto, non un caso
   * limite: il riquadro chiede, la finestra staccata chiede, la finestra
   * riattacca, e a essere messo da parte era il giro del riquadro. Quello
   * smetteva di ricevere per sempre, e la finestra si riprendeva un conto di
   * eventi contato su un altro filo — attrezzi e tabelle di una conversazione
   * sotto la risposta di un'altra.
   *
   * Opzionale perché una pagina più vecchia non lo manda, e perché lo schema
   * d'ingresso di `assistente.stacca` lo scarta finché non lo dichiara: senza,
   * si ricade sul giro più recente **della pagina che consegna**, che è già un
   * errore in meno di prima.
   */
  busta?: number
}

/** Lo stesso giro, come l'host lo restituisce: con il numero per riprenderlo. */
export interface GiroDaRiprendere extends GiroAssistente {
  /** Il numero con cui l'host lo tiene da parte: torna nella busta «segui». */
  id: number
}

/**
 * «Quel giro lì lo ascolto io»: la finestra arrivata riprende la domanda in
 * volo.
 *
 * Non è una `Conversazione` e non ne fa partire una: la domanda è già dal
 * modello, e mandarla di nuovo vorrebbe dire due giri sulla stessa frase — il
 * doppio dell'attesa, e due risposte che si contraddicono.
 */
export interface SeguiConversazione {
  /** Il giro che l'host tiene da parte: `GiroDaRiprendere.id`. */
  segui: number
  /** L'id su cui questa finestra vuole sentirsi rispondere. */
  id: number
  /** Da quale evento in poi: quelli prima li ha già visti chi ha consegnato. */
  da: number
}

/**
 * Come sta l'assistente: acceso o no, chi risponde, e dove vive adesso.
 *
 * Lo ricevono tutte e due le finestre, e ciascuna ne usa una metà. Il pannello
 * guarda `staccato` — per sapere se il riquadro deve farsi da parte — e la
 * finestra guarda `acceso` e `modello`, che sono le due sole cose che sa del
 * registro: non ha il `Registro` e non lo vuole, perché il suo bundle non porta
 * dentro le viste che sanno modificare i dati.
 *
 * `storia` c'è solo nel messaggio che arriva **subito dopo uno spostamento**:
 * è la conversazione che l'ospite di prima ha consegnato. Poi non c'è più.
 */
export interface MessaggioStatoAssistente {
  tipo: 'assistente.stato'
  acceso: boolean
  modello: string
  staccato: boolean
  /**
   * Se il microfono si può accendere: la dettatura ha un interruttore suo.
   *
   * Viaggia qui perché la finestra staccata non riceve l'elenco delle
   * impostazioni — sa del registro due fatti e mezzo, e questo è il mezzo. Il
   * riquadro dentro il pannello lo saprebbe da sé, e lo legge lo stesso da qui:
   * due strade per la stessa domanda sono la prima a restare indietro.
   */
  dettatura: boolean
  storia?: TurnoAssistente[]
  /**
   * Quel che era battuto nel campo e non ancora mandato.
   *
   * Si stacca «quasi sempre a metà di una domanda» — lo dice
   * `panels/assistant.ts`, ed è la ragione per cui la conversazione
   * viaggia. La mezza domanda però restava indietro: si prendeva la finestra
   * nuova e si ribatteva da capo quel che si stava scrivendo.
   */
  bozza?: string
  /**
   * La domanda che era in volo quando l'assistente si è spostato.
   *
   * C'è soltanto nel messaggio che arriva subito dopo uno spostamento, come
   * `storia`, e per la stessa ragione: è la metà della conversazione che non è
   * ancora scritta da nessuna parte. Chi lo riceve manda una
   * `SeguiConversazione` e si ritrova la rotella che girava, gli attrezzi che
   * passano e la risposta quando arriva — invece di un «Fermato.» per una
   * domanda che il modello stava ancora leggendo.
   */
  giro?: GiroDaRiprendere
  /**
   * La finestra ha appena consegnato: il riquadro si riapre.
   *
   * Serve perché `staccato: false` da solo non distingue i due modi in cui la
   * finestra sparisce. Premendo «Riattacca» l'assistente **si sposta**, e il
   * riquadro deve riaprirsi dov'era; chiudendo la finestra dalla sua crocetta
   * l'assistente si chiude e basta, e riaprire il riquadro vorrebbe dire una
   * colonna da richiudere a mano dopo ogni chiusura.
   *
   * Non si deduce dalla presenza di `storia`: una conversazione vuota è una
   * conversazione, e dedurlo da lì faceva esattamente il difetto per cui questo
   * campo esiste — «Riattacca» premuto senza aver ancora chiesto niente
   * chiudeva la finestra e non riapriva niente.
   */
  rientro?: boolean
}

/**
 * Come procede una conversazione. Ne arrivano parecchi per ogni domanda.
 *
 * L'evento che conta mentre si aspetta è `'attrezzo'`, non il testo: la parte
 * lenta è quella in cui il modello apre le procedure una dopo l'altra, e
 * vederle passare è l'unica cosa che distingua un registro che sta lavorando da
 * uno che si è piantato. Il testo arriva in un colpo solo — lo streaming resta
 * spento finché ci sono attrezzi in tavola, perché i `tool_calls` spezzati fra
 * i pezzi sono il punto in cui un modello piccolo fa più danno — e `'pezzo'`
 * c'è lo stesso: il giorno in cui si streammerà, la pagina lo sa già leggere e
 * il protocollo non cambia.
 */
export interface MessaggioAssistente {
  tipo: 'assistente'
  id: number
  evento: 'attrezzo' | 'risultato' | 'pezzo' | 'fine' | 'guasto'
  /**
   * Su `'attrezzo'`: quale procedura è stata aperta, e com'è andata.
   *
   * `messaggio` è il **motivo** quando non è andata, scritto per chi legge:
   * «la classe non è in questo semestre», e non il codice che le sta accanto.
   * L'host lo componeva già — è la frase che rimanda al modello perché
   * rimedi — e alla pagina arrivava soltanto il codice: il motivo finiva nel
   * `title` della pastiglia, cioè in un posto che su un portatile col trackpad
   * non si apre e che lo schermo che parla non legge.
   */
  attrezzo?: { nome: string, ok: boolean, codice?: string, messaggio?: string }
  /** Su `'risultato'`: quel che quella procedura ha letto, già impaginato. */
  risultato?: RisultatoAssistente
  /**
   * Su `'fine'`: gli id incontrati leggendo, da tenere nel turno.
   *
   * Tornano con la fine e non con ogni risultato perché è una lista sola,
   * già unita a quella che era entrata: la pagina la scrive nel turno e la
   * rimanda con la domanda dopo. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /** Su `'pezzo'` e su `'fine'`: quel che il modello ha risposto. */
  testo?: string
  /** Su `'guasto'`: le frasi da mostrare, già in italiano. */
  errori?: string[]
}

/**
 * Un id incontrato leggendo, con il nome con cui si legge.
 *
 * **Solo l'id e il nome, mai le cifre.** È la distinzione che tiene in piedi
 * tutta questa memoria: un id è stabile — `alv-7` è quella persona oggi, domani
 * e l'anno prossimo — mentre una quota di assenza cambia appena qualcuno fa
 * l'appello. Ricordare l'id fa risparmiare la lettura che serviva a ritrovarlo;
 * ricordare la cifra vorrebbe dire rispondere «otto UD» dopo che sono diventate
 * nove, con un numero che viene davvero da una lettura vera — di ieri — e che
 * niente segnalerebbe come vecchio. In un registro di classe quello è il guasto
 * peggiore, perché la cifra è plausibile e si trascrive.
 */
export interface IdVisto {
  id: string
  /** Come si legge: «Bernasconi Elia», «DIC4a — Matematica». */
  nome: string
  /** Di che cosa è l'id: «allievo», «classe», «corso». */
  cosa: string
}

/**
 * Quel che una lettura ha letto, pronto da impaginare.
 *
 * **I dati non passano più dal modello.** Fin qui una risposta con dei numeri
 * dentro era il modello che li ricopiava in una tabella di markdown: venticinque
 * righe ribattute da chi ha il vizio di inventare, in un registro di classe, e
 * ogni cifra da controllare a mano. Adesso la busta della procedura arriva
 * **intera** alla pagina, già divisa in colonne dal contratto, e il modello
 * scrive quel che sa fare — una riga di introduzione e il commento.
 *
 * La forma la dichiara la procedura (`presentazione`, in `api/contract.ts`) e
 * la costruisce `api/presentation.ts`: qui c'è solo quel che viaggia, perché
 * lo leggono tutte e due le finestre e nessuna delle due conosce l'API.
 */
export interface RisultatoAssistente {
  /** La procedura che l'ha letto: `corso.presenze`. */
  procedura: string
  /** Come si intitola quel che si vede: «Presenze del corso». */
  titolo: string
  /** I blocchi, nell'ordine in cui si leggono. */
  blocchi: BloccoRisultato[]
}

export type BloccoRisultato =
  /** Poche cose con il loro nome: il periodo, la classe, quante UD. */
  | { tipo: 'valori', titolo?: string, voci: Array<{ etichetta: string, valore: string }> }
  /** Una tabella, già impaginata: le colonne sanno da che parte stanno. */
  | {
    tipo: 'tabella'
    titolo?: string
    colonne: Array<{ testo: string, allinea: 'sinistra' | 'destra' }>
    righe: string[][]
    /** Quante righe ci sono in tutto: `righe` può essere più corta. */
    quante: number
    /** Vero se se ne mostrano meno di quante ce ne sono. */
    troncata: boolean
  }
  /**
   * Un elenco di frasi: le rotture dell'integrità, i fogli di un fascicolo.
   *
   * `quante` e `troncata` come nella tabella, e per lo stesso motivo: anche
   * l'elenco si taglia a un tetto di righe, e fin qui lo faceva **senza dirlo**
   * — dodici rotture su quarantasei si leggevano come tutte quelle che c'erano.
   * Un elenco tagliato senza dirlo è una risposta sicura su una parte, che è
   * peggio di un «non lo so».
   *
   * Opzionali perché chi impagina può non saperlo ancora: senza, l'elenco si
   * disegna come prima e non dichiara niente — mai il contrario.
   */
  | { tipo: 'elenco', titolo?: string, voci: string[], quante?: number, troncata?: boolean }

/**
 * Quel che si è detto al microfono, da trascrivere.
 *
 * Non è una `Domanda` e non è un'`Azione`, per la stessa ragione della
 * `Conversazione`: non nomina una procedura, e quel che torna non è un dato del
 * registro ma una frase che chi ha parlato deve ancora poter rileggere e
 * correggere. Non tocca l'archivio in nessun punto — chi la prende in carico è
 * `panels/transcription.ts`, che parla con un programma sul disco e basta.
 *
 * I campioni viaggiano **come campioni** e non come un file: sono PCM a 16 bit
 * a 16 kHz, un canale, cioè già il formato che whisper.cpp vuole. Scriverli in
 * un WAV è mestiere di chi lo consegna al programma, e farlo nella pagina
 * vorrebbe dire mandare in giro quarantaquattro byte di intestazione che il
 * protocollo non saprebbe controllare.
 *
 * Fuori dalla coda delle scritture, come le domande: una trascrizione impiega
 * secondi e non scrive niente.
 */
export interface Dettatura {
  id: number
  campioni: Int16Array
  /** Sempre 16000: viaggia lo stesso, così chi riceve non lo deve supporre. */
  frequenza: number
}

/**
 * Com'è andata la trascrizione.
 *
 * Uno solo per dettatura, ed è quello che la chiude: mentre si trascrive non
 * c'è niente da mostrare che non sia «sto trascrivendo», e quello lo sa già la
 * pagina che ha premuto. Quando invece manca il corredo e il registro se lo va
 * a prendere, prima di questo arrivano i `MessaggioCorredo` — che sono l'unica
 * cosa che si muove in dei minuti di attesa.
 *
 * `motivo` non è un errore di programma: è la riga da mettere sotto la casella
 * — «non ho sentito niente», «manca il modello» — e chi la legge ha in mano una
 * cosa da fare, non un codice.
 */
export interface MessaggioDettatura {
  tipo: 'dettatura'
  id: number
  ok: boolean
  testo?: string
  motivo?: string
}

/**
 * A che punto è lo scarico di quel che serve per dettare.
 *
 * Porta l'`id` della dettatura che l'ha fatto partire, e non un identificatore
 * suo: chi guarda non ha chiesto uno scarico, ha premuto un microfono, e la
 * riga che legge sta sotto quella casella lì. Finisce quando arriva il
 * `MessaggioDettatura` con lo stesso `id` — non c'è un messaggio di fine
 * apposta, perché non c'è niente che possa succedere fra i due.
 *
 * `titolo` è già in italiano — «il modello che riconosce la voce» — e non un
 * nome di file: chi aspetta non deve sapere che cosa sia un `ggml`, deve sapere
 * che cosa sta scendendo e quanto manca. Il nome vero resta nel giornale.
 */
export interface MessaggioCorredo {
  tipo: 'dettatura.corredo'
  /** La dettatura che aspetta: è la stessa di `MessaggioDettatura`. */
  id: number
  titolo: string
  byte: number
  totale: number
  /**
   * L'ultimo: da qui in poi si trascrive, e la barra ha finito il suo lavoro.
   *
   * Non si deduce da `byte === totale`, perché i file sono due e il primo ci
   * arriva a metà dell'attesa. Vedi `AvanzamentoCorredo` in
   * `data/voiceKit.ts`, che è dove questo campo nasce.
   */
  finito?: boolean
}

/**
 * A che punto è lo scarico di un modello.
 *
 * Ne arrivano molti, uno ogni frazione di secondo: quattro gigabyte su una
 * linea di scuola sono venti minuti, e venti minuti senza un numero che si
 * muove sono venti minuti in cui chi guarda chiude la finestra convinto che si
 * sia piantato.
 *
 * `byte` e `totale` e non una percentuale già fatta: chi disegna la barra sa
 * anche scrivere «1,2 GB di 4,7 GB», che è la cosa che dice davvero quanto
 * manca. `totale` sta a zero finché il sito non lo dichiara.
 *
 * L'ultimo messaggio porta `finito`: o con il nome del file arrivato, o con il
 * motivo per cui non è arrivato — annullato, la linea caduta, il disco pieno.
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
}

export interface Risposta {
  tipo: 'risposta'
  id: number
  ok: boolean
  errori?: string[]
  /**
   * Perche' non e' riuscita: `non-trovato`, `rifiutato`, `non-disponibile`…
   *
   * Qui non c'era, ed era la lacuna piu' larga del contratto: il ponte
   * (`api/core.ts`, `aEsitoAzione`) lo buttava via, e le 141 scritture
   * chiamate dal pannello — la strada che fa quasi tutto il traffico —
   * ricevevano le sole frasi, cioe' esattamente quel che ricevevano prima che
   * il contratto esistesse. Serve a chi deve decidere se ritentare: «non c'e'
   * piu'» si ritenta dopo aver riletto, «non si puo'» no.
   *
   * E' `string` e non `Codice` perche' il protocollo sta sotto al contratto e
   * non deve conoscerne l'unione — la stessa scelta gia' fatta per il
   * `codice` del `Riscontro`, poche righe piu' su.
   */
  codice?: string
  /** Il numero della chiamata nel giornale: quel che si cita per ritrovarla. */
  tracciato?: string
  /** Riferimento all'entità appena creata, per la vista che deve aprircisi sopra. */
  creato?: { id: string }
  /**
   * Il documento appena scritto, relativo alla cartella dei dati.
   *
   * Lo rimanda indietro chi genera un rapporto, e la pagina Documenti lo apre
   * nella sua cornice: rifare un foglio e vederlo sono lo stesso gesto, e il
   * nome del file — che porta dentro il periodo o il giorno — lo sa soltanto
   * chi lo ha appena composto.
   */
  documento?: string
  /**
   * Quel che l'host vuole dire a chi ha chiesto: «12 lezioni aggiunte», «3
   * spediti, 1 indietro». Lo mostra il pannello come notifica, così tutte le
   * voci del registro parlano dallo stesso posto.
   */
  messaggio?: Messaggio
  /**
   * Qui stavano `testo`, `nomi` e `pdf`.
   *
   * Erano la risposta di `modello.leggi` e `modello.prova`, e sono stati per
   * un pezzo la prova che al protocollo mancava qualcosa: tre campi facoltativi
   * nella busta di ogni scrittura — un salvataggio di voto, una spunta, una
   * riga d'appello — per servire due chiamate che scrittura non erano.
   *
   * Adesso il protocollo ha un canale per le domande, e quelle due sono
   * diventate procedure di lettura: `modelli.leggi` e `modelli.prova`. Quel
   * che tornano lo dichiara il loro schema d'uscita, e `Riscontro.dati` lo
   * porta senza che nessun altro debba portarselo dietro.
   */
}

/**
 * I nomi che un rapporto sa riempire: quel che la pagina Modelli elenca
 * accanto all'editor, e su cui controlla quel che si scrive.
 */
export interface NomiModello {
  /** I `{{segnaposto}}` che quel rapporto produce. */
  valori: string[]
  elenchi: string[]
  tabelle: string[]
  grafici: string[]
  gallerie: string[]
  /** I gruppi su cui `ripeti:` gira. */
  gruppi: string[]
  /** I pezzi di `_blocchi.tpl` che `usa:` richiama. */
  blocchi: string[]
  /** Le frasi di `_testi.tpl`: `{{frase.nome}}`. */
  frasi: string[]
  /** Le immagini che stanno in `templates/`. */
  immagini: string[]
  /** I modelli che `estende:` può nominare. */
  modelli: string[]
}

/** Una cosa da dire a chi guarda, con il tono giusto. */
export interface Messaggio {
  livello: 'info' | 'avviso' | 'errore'
  testo: string
}

/**
 * Un'impostazione del programma come la vede la pagina: il manifesto, più lo
 * stato di adesso.
 *
 * `scritta` è la differenza fra «vale il predefinito» e «l'ho deciso io», ed è
 * quel che permette di offrire il ritiro solo dove c'è qualcosa da ritirare.
 */
export interface VoceProgramma {
  /** `registroDocenti.agenda.attiva`: è anche la chiave con cui si scrive. */
  chiave: string
  tipo: 'string' | 'number' | 'boolean'
  descrizione: string
  formato: 'email' | null
  scelte: Array<{ valore: string | number, aiuto: string }> | null
  /** Gli estremi di un numero, quando ce ne sono: diventano `min` e `max` del campo. */
  minimo: number | null
  massimo: number | null
  predefinito: string | number | boolean
  valore: string | number | boolean
  /** Se il valore di adesso è scritto nel file o viene dal predefinito. */
  scritta: boolean
  /**
   * La chiave che deve essere accesa perché questa conti, se ce n'è una.
   *
   * Viaggia perché chi disegna lo **dice**: «sospesa · Condotto è spento». Che
   * cosa farne non lo decide più la superficie — vedi `sospesa` qui sotto.
   */
  dipendeDa: string | null
  /**
   * Se il padre è spento, e quindi questa voce non conta.
   *
   * Calcolata da `vociImpostazioni()` e non da chi disegna, apposta: le
   * superfici sono due — la pagina del pannello e la finestra nativa — e la
   * regola applicata solo dalla prima lasciava la seconda mostrare
   * `api.lettura` spuntata e modificabile con il condotto spento. Qui il conto
   * si fa una volta, dove l'elenco nasce.
   */
  sospesa: boolean
  /** Si tocca una volta ogni tre anni: sta in fondo alla sezione, in un gruppo che si apre. */
  avanzata: boolean
}

/**
 * Un file di `templates/` come lo vede la pagina: che cos’è, quanto misura, e
 * se qualcuno l'ha toccato.
 *
 * Senza il testo dentro, apposta: l'elenco serve a scegliere quale aprire, e
 * il testo lo si chiede aprendolo.
 */
export interface VoceModello {
  /** `_base`, `verbale-lezione`, `_firma.html`. */
  nome: string
  /** Come si chiama su disco: `_base.tpl`. */
  file: string
  titolo: string
  ruolo: RuoloModello
  aiuto: string
  /** Il rapporto su cui se ne guarda l'anteprima, se ce n’è uno. */
  genere: GenereRapporto | null
  misura: number
  /** Se il file c’è davvero: quel che manca vale nella copia di serie. */
  suDisco: boolean
  /** Se il registro ne ha una copia di serie a cui si può tornare. */
  haDiSerie: boolean
  /** Se quel che c’è su disco è diverso dalla copia di serie. */
  modificato: boolean
  /**
   * Se è modificato *e* la copia di serie è cambiata da quando lo si è
   * salvato: il file funziona ancora, ma non ha le novità dell'originale.
   *
   * È la sola cosa che il registro sa e chi lo usa no — un modello su disco
   * non porta scritto da quale versione viene — ed è il motivo per cui la
   * pagina lo dice: senza, una sezione nuova di un verbale non arriverebbe
   * mai a chi quel verbale se l'era personalizzato.
   */
  arretrato: boolean
}

export interface MessaggioStato {
  tipo: 'stato'
  registro: Registro
  /**
   * Le impostazioni del programma, che il webview non può leggere da sé.
   *
   * Arrivano con lo stato — e lo stato si rifà quando un'impostazione cambia —
   * perché la pagina Impostazioni le mostra accanto a quelle del documento: due
   * schede, un posto solo da aprire.
   */
  programma: VoceProgramma[]
  avvisi: string[]
  /**
   * La cartella dei dati vista dal webview. Serve solo per le immagini: dentro
   * la sandbox un percorso di disco non si può caricare, ci vuole l'indirizzo
   * `registro://` che l'applicazione concede a quella cartella, e lo sa
   * soltanto il pannello.
   */
  radiceDati: string | null
  /**
   * La radice dei file dell'applicazione, come indirizzo che il webview può
   * caricare.
   *
   * Serve a una cosa sola: dire a pdfjs, che nel pannello disegna le pagine dei
   * PDF da dividere, dove stanno i caratteri standard del PDF. Senza, un
   * documento che nomina Helvetica senza portarsela dentro viene disegnato con
   * un carattere di ripiego — e la miniatura mostra un foglio che non è quello
   * che si stamperebbe.
   */
  radiceApp: string | null
  /**
   * Se la lettura automatica delle scansioni è accesa. Il webview non può
   * leggere le impostazioni — vive in una sandbox — e senza saperlo
   * offrirebbe un pulsante «leggi la scansione» che risponde soltanto che è
   * spento: la quarantena invece propone di accenderlo.
   */
  ocrAttivo: boolean
  /**
   * Com'è messa la posta, per la scheda che lo dice.
   *
   * Come `ocrAttivo`, e per lo stesso motivo: sono impostazioni e
   * il webview vive in una sandbox che non le legge. Qui c'è quel che si sa
   * senza chiedere niente a nessuno — se la casella è collegata, se Outlook
   * c'è, se l'invio diretto è acceso, che mittente è scritto. Che il server
   * risponda davvero lo dice `posta.prova`, che deve andare a bussare e ci
   * mette qualche secondo: non è roba da spingere a ogni modifica del
   * registro.
   */
  posta: {
    /**
     * Vero quando la casella è collegata: l'indirizzo è scritto e la password
     * sta nel portachiavi. È la strada migliore delle due, e quella per cui il
     * registro sa che cosa è partito e che cosa no.
     */
    exchange: boolean
    /** Il server a cui si consegna, per la scheda che lo dice. */
    server: string
    invioDiretto: boolean
    /** L'indirizzo da cui si scrive: quello che le famiglie vedono in «Da». */
    mittente: string
    /**
     * Il nome con cui si entra, quando è diverso dall'indirizzo.
     *
     * Nel tenant di una scuola lo è quasi sempre — una sigla — e chi guarda la
     * scheda deve poter vedere tutti e due senza andarli a cercare fra le
     * chiavi: sono i due che, scambiati, fanno rifiutare l'invio.
     */
    accesso: string
  }
  /**
   * I documenti d'anno che si conoscono: i recenti e quelli messi da parte,
   * più quello aperto adesso.
   *
   * Non sono dati del registro — parlano di file che stanno in altre cartelle —
   * e il webview non li può leggere da sé: vive in una sandbox che non vede il
   * disco. Arrivano di qui, con lo stato, perché è il canale che si rifà ogni
   * volta che uno di quei file viene aperto.
   */
  documenti: {
    /** Il percorso del documento in uso, o `null` se non ce n'è ancora uno. */
    corrente: string | null
    elenco: DocumentoRecente[]
  }
  /**
   * Che cosa c'è adesso sotto `esportazioni/`: l'inventario dei documenti già
   * fatti.
   *
   * Serve alla pagina Documenti, che senza di questo poteva solo offrire di
   * rifare tutto: un elenco di pulsanti non dice quali fogli stanno nella
   * cartella, e chi deve consegnare una cartella intera vuole sapere che cosa
   * manca — non ristampare venticinque schede per sicurezza.
   *
   * Arriva con lo stato perché il webview vive in una sandbox e il disco non lo
   * vede, e perché cambia esattamente quando cambia il registro: ogni rapporto
   * scritto passa dal deposito, e il deposito fa rispingere lo stato.
   */
  esportati: DocumentoEsportato[]
  /**
   * Che cosa c'è adesso sotto `archivio/`: i documenti raccolti, uno per file.
   *
   * Stessa forma delle esportazioni e stessa ragione — il webview non vede
   * dentro il documento dell'anno — ma un mestiere diverso: qui non si tratta
   * di sapere che cosa manca, perché quello lo dice il registro con le sue
   * spunte. Serve all'anteprima dell'archivio documentale, che di ogni foglio
   * deve sapere tre cose: che c'è ancora, quanto misura, e quante volte è
   * stato riscritto — una scansione rifatta meglio sta allo stesso percorso di
   * prima, e senza un numero che cambia il lettore mostrerebbe quella vecchia.
   */
  archiviati: DocumentoEsportato[]
  /**
   * I fascicoli composti dell'anno: nome, di che cosa sono fatti, quando sono
   * stati rifatti l'ultima volta.
   *
   * Arrivano con lo stato come le esportazioni, e per lo stesso motivo: sono
   * file dentro il documento dell'anno, e il webview il documento non lo vede.
   */
  composizioni: Composizione[]
  /**
   * Che cosa c’è in `templates/`: i modelli dei rapporti, la firma delle
   * e-mail, le immagini che i modelli mostrano.
   *
   * Arriva con lo stato per la stessa ragione delle esportazioni — il webview
   * vive in una sandbox e la cartella non la vede — e senza il testo dei file:
   * quello si chiede aprendone uno, con `modello.leggi`.
   */
  modelli: VoceModello[]
}

/** Un documento che sta nella cartella delle esportazioni. */
interface DocumentoEsportato {
  /** Il percorso relativo alla cartella dei dati, `esportazioni/` compreso. */
  percorso: string
  /** Quanto misura, in byte: un PDF da zero byte è un foglio da rifare. */
  misura: number
  /**
   * Quante volte è stato riscritto da quando l'anno è aperto; zero se sta come
   * lo si è trovato.
   *
   * Serve all'anteprima della pagina Documenti: il lettore di PDF tiene in
   * memoria quel che ha caricato, e un rapporto rifatto sta allo stesso
   * percorso di prima — senza un numero che cambia, mostrerebbe il foglio
   * vecchio dicendo che è quello nuovo. La misura non basta: un voto corretto
   * con un altro lungo uguale lascia il PDF della stessa misura.
   */
  revisione: number
}

/** Un anno che si è aperto, o che si tiene da parte. */
export interface DocumentoRecente {
  percorso: string
  /** Il nome dell'anno senza estensione: `2026-2027`. */
  nome: string
  /** La cartella che lo contiene: distingue due anni con lo stesso nome. */
  cartella: string
  preferito: boolean
  /** Vero se in questo momento sul disco non c'è: una chiavetta staccata. */
  mancante: boolean
  /**
   * Vero se e' l'anno aperto adesso.
   *
   * Arriva calcolato dall'ospite invece di essere dedotto qui: confrontare due
   * percorsi e' una regola del sistema operativo — su Windows le maiuscole non
   * contano, e le due barre sono la stessa — e il pannello, che vive in una
   * sandbox senza `path`, la rifaceva piu' povera. Le due risposte potevano
   * divergere, e allora l'elenco dei recenti non accendeva nessuna riga.
   */
  aperto: boolean
}

/**
 * Le sezioni del pannello.
 *
 * Sta nel protocollo perché è l'unico posto che host e webview leggono
 * entrambi: l'elenco era scritto due volte — qui e nello stato del webview — e
 * due elenchi da tenere allineati a mano si disallineano al primo che si
 * aggiunge, con l'host che sa navigare verso una vista che non esiste o non sa
 * navigare verso una che c'è.
 */
// Una vista dichiarata qui e non disegnata da `shell.ts` è una pagina bianca
// che l'host può chiedere: `'apri'` — l'elenco dei registri recenti come pagina
// — era dichiarata e mai instradata, e i recenti vivono nel menu «File». Chi ne
// aggiunge una la aggiunge anche a `vistaCorrente` e a `PAGINE`.
export type Vista =
  | 'calendario'
  | 'todo'
  | 'daSmistare'
  | 'lezione'
  | 'classi'
  | 'persone'
  | 'allievo'
  | 'docenteClasse'
  | 'corsi'
  | 'piani'
  | 'valutazioni'
  | 'documenti'
  | 'modelli'
  | 'modelliLinguistici'
  | 'mappa'
  | 'impostazioni'
  | 'guida'

/** Un comando della palette che chiede al webview di aprirsi su qualcosa. */
export interface MessaggioNavigazione {
  tipo: 'naviga'
  vista: Vista
  elementoId?: string
  data?: Iso
  /** Apre direttamente il modulo di creazione della vista di destinazione. */
  nuovo?: boolean
  /** Apre l'avvio guidato: anno, classe, materia e orario in una finestra sola. */
  avvio?: boolean
}

interface MessaggioNotifica {
  tipo: 'notifica'
  livello: 'info' | 'avviso' | 'errore'
  testo: string
}

/**
 * A che punto è la lettura delle scansioni: il blocco in corso, a che pagina, e
 * quel che aspetta in coda.
 *
 * È un messaggio a sé e non un pezzo dello stato perché cambia a ogni pagina —
 * ogni minuto circa — mentre il registro resta fermo: spingere tutto il registro
 * per dire «pagina 3 di 12» vorrebbe dire ridisegnare il pannello intero.
 */
interface MessaggioLavoro {
  tipo: 'lavoro'
  corrente: { smistamentoId: string, pagina: number, etichetta: string } | null
  /** Quante pagine sono già state lette in questa infornata, e quante erano. */
  fatte: number
  totale: number
  coda: Array<{ smistamentoId: string, pagina: number, etichetta: string }>
}

/**
 * Quel che va sullo schermo grande: il pacchetto già filtrato.
 *
 * Lo riceve solo il webview della proiezione, e contiene soltanto i blocchi
 * accesi — non il registro con dentro un interruttore. La scelta di che cosa
 * esce si applica qui, nell'host, dove sta scritta in un posto solo: la pagina
 * che guarda la classe riceve poco e non ha niente da nascondere.
 */
export interface MessaggioProiezione {
  tipo: 'proiezione'
  contenuto: ContenutoProiezione
  /** La cartella dei dati vista dal webview: serve alle immagini delle risorse. */
  radiceDati: string | null
}

/**
 * Come sta la proiezione, detto al pannello del docente: se è aperta e che cosa
 * sta mostrando. È lui a disegnarne i comandi — la proiezione non ne ha, perché
 * ogni comando sullo schermo grande è un comando che si preme davanti a tutti.
 */
export interface MessaggioStatoProiezione {
  tipo: 'proiezione.stato'
  aperta: boolean
  impostazioni: ImpostazioniProiezione
}

export type MessaggioVersoWebview =
  | MessaggioStato
  | MessaggioNavigazione
  | MessaggioNotifica
  | MessaggioLavoro
  | MessaggioProiezione
  | MessaggioStatoProiezione
  | MessaggioAssistente
  | MessaggioStatoAssistente
  | MessaggioDettatura
  | MessaggioCorredo
  | MessaggioScarico
  | Risposta
  | Riscontro
