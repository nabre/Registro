// Il contratto fra webview e host: lo importano entrambi, così una richiesta
// con un campo sbagliato non compila.
//
// Il webview non tocca il disco: costruisce l'entità completa con le fabbriche
// del dominio e la manda intera; l'host la applica e rispedisce lo stato, che è
// l'unica verità.

import type {
  AnnoScolastico,
  BloccoAssenze,
  CalendarioDellAnno,
  Classe,
  ColonnaCheck,
  Comunicazione,
  Consegna,
  Corso,
  Divisione,
  Impostazioni,
  Intestazione,
  CartaIntestata,
  Iso,
  LetteraSettimana,
  RegolaCalendario,
  Lezione,
  Materia,
  MomentoValutazione,
  Ora,
  Osservazione,
  SegnoOsservato,
  PianoLezione,
  Progetto,
  Recapito,
  Ricorrenza,
  Risorsa,
  RuoloAllegato,
  Sospensione,
  StatoAttivita,
  StatoLezione,
  StatoPresenza,
  TipoRapporto,
  TipoRisorsa,
} from '#core/dominio/models.js'
import type { AllineamentoDaCalendario, LezioneDaCalendario } from '#core/dominio/calendar.js'
import type {
  ImpostazioniProiezione,
  MiraProiezione,
} from '#core/dominio/projection.js'
import type { ContestoAssistente, GiroAssistente, TurnoAssistente } from './protocol/assistant.js'

export type {
  BloccoProiezione,
  ContenutoProiezione,
  ImpostazioniProiezione,
  MiraProiezione,
} from '#core/dominio/projection.js'

// Qui restano le azioni, le buste di richiesta e risposta e le viste, che
// prove e strumenti leggono dal sorgente di questo file. L'assistente con la
// dettatura e i messaggi spinti alla webview stanno a parte; si riesportano
// perché nessun importatore debba sapere dove.
export type {
  BloccoRisultato,
  ContestoAssistente,
  Conversazione,
  Dettatura,
  ElencoVisibile,
  GiroAssistente,
  GiroDaRiprendere,
  IdVisto,
  MessaggioAssistente,
  MessaggioDettatura,
  MessaggioStatoAssistente,
  PeriodoContesto,
  RiferimentiContesto,
  RisultatoAssistente,
  SeguiConversazione,
  TurnoAssistente,
  VoceContesto,
} from './protocol/assistant.js'
export type {
  ChiestaStatoIntero,
  DocumentoRecente,
  FaseAggiornamenti,
  MessaggioAggiornamenti,
  MessaggioDifferenze,
  MessaggioNavigazione,
  MessaggioProiezione,
  MessaggioScarico,
  MessaggioStato,
  MessaggioStatoProiezione,
  MessaggioVersoWebview,
  PatchRegistro,
  RaccontoAggiornamenti,
  StatoAggiornamenti,
  VoceProgramma,
} from './protocol/webview.js'

/** Una classe di un altro registro da importare: le persone con le foto, i corsi con l'orario. */
interface ClasseDaImportare {
  classeId: string
  anagrafica: boolean
  corsi: boolean
}

/**
 * Un compito del progetto come lo manda chi lo scrive: senza inizi, proroghe e
 * spunte, che hanno le loro azioni. Senza `id` è un compito nuovo.
 */
interface CompitoDaSalvare {
  id?: string
  titolo: string
  descrizione?: string
  fine: Iso | null
  /**
   * La lezione del corso entro cui finisce: la fine ne segue il giorno. Omessa,
   * resta quella di prima se `fine` è ancora il suo giorno.
   */
  fineLezioneId?: string | null
}

/**
 * Il progetto come lo manda chi salva la testata: le fasi si possono omettere
 * (restano quelle di prima, o una di serie se è nuovo); date, sono tutte.
 */
export type ProgettoDaSalvare = Omit<Progetto, 'fasi'> & { fasi?: Progetto['fasi'] }

/** Un giudizio del progetto: senza `id` è nuovo; con `lezioneId` la data è quella dell'ora. */
interface GiudizioDaSalvare {
  id?: string
  allievoId: string | null
  testo: string
  data?: Iso | null
  lezioneId?: string | null
}

export type Azione =
  | { tipo: 'stato.leggi' }
  | { tipo: 'stato.ricarica' }
  /** Ctrl+S: scrive subito quel che è in attesa (il documento si salva comunque da sé). */
  | { tipo: 'stato.salva' }
  /**
   * Apre un documento d'anno; senza percorso apre il dialogo del sistema.
   * Lo esegue il guscio, e può finire con un riavvio se il documento sta in
   * un'altra cartella di lavoro.
   */
  | { tipo: 'documento.apri'; percorso?: string }
  /**
   * Chiude l'anno aperto: libera il file e la sua serratura, e al posto del
   * pannello torna il benvenuto.
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
    /** Le pause dichiarate nel modulo di creazione: nascono con l'anno. */
    sospensioni?: Sospensione[]
    /**
     * L'anno del calendario ufficiale che l'anno segue: date e chiusure devono
     * essere quelle (`motivoCalendarioToccato`).
     */
    calendarioUfficiale?: CalendarioDellAnno
  }
  | { tipo: 'anno.salva'; anno: AnnoScolastico }
  /**
   * Collega l'anno al calendario ufficiale del suo anno scolastico (date e
   * chiusure ufficiali, e il marcatore che le blocca), lo riallinea se è già
   * collegato, o lo stacca: via il marcatore, date e chiusure restano.
   */
  | { tipo: 'anno.calendario'; annoId: string; collega: boolean }
  /**
   * Dice se la settimana di `giorno` è A, B o nessuna delle due. Azione a sé e non
   * `anno.salva`: rimandare l'anno intero farebbe sovrascrivere le vacanze fra due
   * finestre aperte sullo stesso registro.
   */
  | { tipo: 'anno.settimana'; annoId: string; giorno: Iso; lettera: LetteraSettimana | null }
  | { tipo: 'materia.salva'; materia: Materia }
  | { tipo: 'materia.elimina'; materiaId: string }
  | { tipo: 'materia.unisci'; daId: string; aId: string }
  /** Apre un corso (materia × classe): è l'unico modo di crearne uno. */
  | { tipo: 'corso.crea'; classeId: string; materiaId: string; titolo?: string }
  | { tipo: 'corso.salva'; corso: Corso }
  | { tipo: 'corso.elimina'; corsoId: string }
  /** Le ore fisse di un corso, senza dover rimandare indietro il corso intero. */
  | { tipo: 'orario.imposta'; corsoId: string; orario: Ricorrenza[] }
  /** Mette sul calendario le lezioni che l'orario del corso prevede e non ci sono. */
  | { tipo: 'orario.genera'; corsoId: string; dal: Iso; al: Iso }
  /**
   * Aggiunge un calendario ICS e ne fa subito la copia. `origine` è un indirizzo
   * `https://`/`webcal://` o un percorso; vuota apre il dialogo. Se l'origine non
   * si legge il calendario non si aggiunge.
   */
  | { tipo: 'calendario.aggiungi'; origine: string; nome?: string }
  /** Rilegge l'origine di un calendario e ne rifà la copia nel documento. */
  | { tipo: 'calendario.aggiorna'; calendarioId: string }
  /**
   * Riscarica tutti i calendari collegati con un indirizzo di rete; quelli che
   * non si leggono tengono la copia di prima. Lo fa anche l'avvio.
   */
  | { tipo: 'calendario.aggiornaTutti' }
  /**
   * Rinomina un calendario o ne cambia l'origine; un'origine illeggibile non
   * cambia niente, vuota apre il dialogo.
   */
  | { tipo: 'calendario.modifica'; calendarioId: string; nome?: string; origine?: string }
  /** Toglie un calendario dal documento, con la sua copia. Le regole restano. */
  | { tipo: 'calendario.togli'; calendarioId: string }
  /**
   * Quel che si è spuntato nel confronto con il calendario: lezioni da creare,
   * da allineare, da annullare, e le regole di abbinamento. Non cancella niente,
   * apposta.
   */
  | {
    tipo: 'calendario.applica'
    /** Senza `id` è una regola nuova. Senza il campo le regole salvate restano. */
    regole?: Array<Omit<RegolaCalendario, 'id'> & { id?: string }>
    /** Dall'allineamento automatico: l'host ricontrolla ogni voce sul registro attuale. */
    automatico?: boolean
    crea: LezioneDaCalendario[]
    allinea: AllineamentoDaCalendario[]
    annulla: string[]
  }
  | { tipo: 'classe.salva'; classe: Classe }
  | {
    tipo: 'classe.modifica'
    classeId: string
    nome?: string
    colore?: string
    note?: string
    docenteDiClasse?: boolean
    archiviata?: boolean
  }
  | { tipo: 'classe.elimina'; classeId: string }
  | { tipo: 'classe.duplica'; classeId: string; annoId: string; nome: string }
  /**
   * Porta nell'anno aperto una classe di un altro `.regi`, letto e non aperto.
   * `anagrafica`: persone e foto; `corsi`: corsi con materie abbinate per nome.
   * Mai lezioni né voti.
   */
  | {
    tipo: 'classe.importa'
    percorso: string
    classeId: string
    nome: string
    anagrafica: boolean
    corsi: boolean
  }
  /**
   * Importa a blocchi da un altro registro: impostazioni, materie, classi, piani,
   * calendari. Mai lezioni, presenze, voti, osservazioni, consegne. Una classe
   * con lo stesso nome si salta, e l'esito lo dice.
   */
  | {
    tipo: 'registro.importa'
    percorso: string
    impostazioni: boolean
    materie: boolean
    classi: ClasseDaImportare[]
    piani: boolean
    calendari: boolean
  }
  | { tipo: 'allievi.importa'; classeId: string; testo: string }
  /**
   * Toglie un allievo con presenze, voti e osservazioni. Per un ritiro basta la
   * spunta «frequenta»; questo è per un nome sbagliato.
   */
  | { tipo: 'allievo.elimina'; classeId: string; allievoId: string }
  /**
   * Il ritratto di un allievo: il dialogo di sistema sceglie il file e l'host ne
   * tiene una copia in `foto/`.
   */
  | { tipo: 'allievo.foto.imposta'; classeId: string; allievoId: string; file?: string }
  | { tipo: 'allievo.foto.togli'; classeId: string; allievoId: string }
  | { tipo: 'lezione.salva'; lezione: Lezione }
  /**
   * I testi dell'ora, uno alla volta. Non `lezione.salva`: rimandare la lezione
   * intera dalla copia del campo sovrascriverebbe quel che un altro campo ha
   * appena salvato.
   */
  | { tipo: 'lezione.testi'; lezioneId: string; argomenti?: string; materiali?: string; consuntivo?: string }
  | { tipo: 'lezione.elimina'; lezioneId: string }
  /** Toglie le ore cadute in giorni di chiusura fra due date; Ctrl+Z le riporta insieme. */
  | { tipo: 'lezione.togliNelleChiusure'; dal: Iso; al: Iso }
  /** Una copia della lezione altrove: stessa scaletta, appello e voti no. */
  | { tipo: 'lezione.duplica'; lezioneId: string; data: Iso; inizio?: Ora }
  | { tipo: 'lezione.stato'; lezioneId: string; stato: StatoLezione }
  /** La stessa lezione, un altro giorno e — se si dice — un'altra ora. */
  | { tipo: 'lezione.sposta'; lezioneId: string; data: Iso; inizio?: Ora }
  /**
   * Una casella della matrice (allievo × unità didattica). La casella e non
   * l'elenco perché rimandare tutte le righe a ogni clic riscriverebbe quelle
   * cambiate nel frattempo.
   */
  | { tipo: 'presenze.ud'; lezioneId: string; allievoId: string; ud: number; stato: StatoPresenza }
  /** Tutta la riga di un allievo: assente per l'ora intera. */
  | { tipo: 'presenze.riga'; lezioneId: string; allievoId: string; stato: StatoPresenza }
  /** Tutta una colonna: l'unità didattica in cui la classe non c'era. */
  | { tipo: 'presenze.colonna'; lezioneId: string; ud: number; stato: StatoPresenza }
  | { tipo: 'presenze.tutti'; lezioneId: string; stato: StatoPresenza }
  /**
   * Minuti di ritardo di un'UD (`ud`, se no la prima in ritardo) e nota di una
   * riga; caselle e righe altrui restano com'erano.
   */
  | {
    tipo: 'presenze.campi'
    lezioneId: string
    allievoId: string
    ud?: number
    minuti?: number
    nota?: string
  }
  /**
   * Una casella del comportamento (persona × aspetto), per la stessa ragione
   * dell'appello. Un campo omesso resta; `segno: null` toglie il segno e lascia
   * la nota; una casella vuota sparisce.
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
  // Risorse di un piano: `attivitaId` nullo = del piano intero, altrimenti di quella tappa.
  | {
    tipo: 'risorsa.aggiungi'
    pianoId: string
    attivitaId: string | null
    genere: TipoRisorsa
    titolo?: string
    url?: string
    file?: string
  }
  | { tipo: 'risorsa.salva'; pianoId: string; attivitaId: string | null; risorsa: Risorsa }
  /** Sposta la risorsa a un'altra tappa o al piano, senza perdere il file. */
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
   * Il momento di valutazione che nasce da una tappa del piano, già compilato
   * (titolo, tipo, peso dal piano; data e corso dalla lezione). Idempotente: se
   * esiste già si torna quello.
   */
  | { tipo: 'valutazione.daAttivita'; lezioneId: string; attivitaId: string }
  | { tipo: 'valutazione.salva'; valutazione: MomentoValutazione }
  | { tipo: 'valutazione.elimina'; valutazioneId: string }
  | { tipo: 'voto.imposta'; valutazioneId: string; allievoId: string; valore: number | null; assente: boolean; nota?: string }
  /**
   * Il giorno in cui un allievo ha riavuto la prova corretta. `null` la rimette
   * fra quelle da ridare.
   */
  | { tipo: 'voto.riconsegna'; valutazioneId: string; allievoId: string; il: string | null }
  /**
   * Quando si rifà la prova mancata, o che non si rifà. `previstoIl: null` senza
   * `dispensato` rimette il recupero fra quelli da fissare.
   */
  | {
    tipo: 'recupero.imposta'
    valutazioneId: string
    allievoId: string
    previstoIl: string | null
    nota?: string
    dispensato?: boolean
    /** Riconsegna della prova rifatta. Assente: resta com'era; `null`: la toglie. */
    riconsegnataIl?: string | null
  }
  /**
   * Prova corretta riconsegnata a tutti: la stessa data su ogni riga (da qui si
   * contano i termini di un ricorso). Chi ha già la sua la tiene. `il: null`
   * toglie la data a tutti.
   */
  | { tipo: 'valutazione.riconsegna'; valutazioneId: string; il: string | null }
  // ---------------------------------------------------------------- consegne
  | { tipo: 'consegna.salva'; consegna: Consegna }
  | { tipo: 'consegna.elimina'; consegnaId: string }
  /**
   * La spunta di una persona. Non `consegna.salva`: si spunta un nome dopo
   * l'altro, e salvare la consegna intera perderebbe quel che scrive un'altra
   * finestra.
   */
  | { tipo: 'consegna.spunta'; consegnaId: string; chi: string; fatta: boolean }
  /**
   * Spunta tutti i destinatari, uno per nome. `fatta: false` toglie solo le
   * spunte senza documento raccolto.
   */
  | { tipo: 'consegna.spuntaTutti'; consegnaId: string; fatta: boolean }
  /**
   * Spunta consegnando un file, archiviato nella cartella dei dati. Annullando
   * la scelta la consegna resta da fare.
   */
  | { tipo: 'consegna.raccogli'; consegnaId: string; chi: string; file?: string }
  /** Apre il file con cui qualcuno ha spuntato. */
  | { tipo: 'consegna.file.apri'; consegnaId: string; chi: string }
  // ------------------------------------------------- distribuire un documento
  /**
   * Il documento pronto per qualcuno, prima di consegnarlo. `allievoId` nullo =
   * lo stesso per tutti. Averlo non è averlo consegnato: quello è un gesto a parte.
   */
  | { tipo: 'consegna.documento.allega'; consegnaId: string; allievoId: string | null; file?: string }
  | { tipo: 'consegna.documento.apri'; consegnaId: string; allievoId: string | null }
  | { tipo: 'consegna.documento.togli'; consegnaId: string; allievoId: string | null }
  /** Consegnato a mano: solo la spunta. */
  | { tipo: 'consegna.consegnato'; consegnaId: string; allievoId: string; fatta: boolean }
  /**
   * Distribuzione per mail: un messaggio a testa col documento. Senza
   * `allieviIds` parte per tutti quelli in attesa con documento pronto; chi non
   * ha un indirizzo resta indietro e viene nominato.
   */
  | { tipo: 'consegna.distribuisci'; consegnaId: string; allieviIds?: string[]; conferma?: boolean }
  /**
   * Il foglio firme della consegna: uno per tutta la richiesta, ha senso solo
   * quando è il docente a consegnare.
   */
  | { tipo: 'consegna.firme.aggiungi'; consegnaId: string; file?: string }
  | { tipo: 'consegna.firme.apri'; consegnaId: string }
  | { tipo: 'consegna.firme.togli'; consegnaId: string }
  /** Toglie il file e la spunta: il documento torna atteso. */
  | { tipo: 'consegna.file.togli'; consegnaId: string; chi: string }
  // ---------------------------------------------------------------- check
  /**
   * Le colonne della lista di controllo di un corso, tutte e in ordine:
   * aggiungere, rinominare, riordinare e togliere sono lo stesso gesto. Una
   * colonna tolta si porta via le sue spunte; senza colonne la lista sparisce.
   */
  | { tipo: 'check.colonne'; corsoId: string; colonne: ColonnaCheck[] }
  /**
   * Spunta o toglie una casella. Con `lezioneId` la data segue quella dell'ora;
   * senza vale `data`, o oggi. Rispuntare non cambia il quando (un doppio clic
   * non riscrive niente).
   */
  | {
    tipo: 'check.spunta'
    corsoId: string
    allievoId: string
    colonnaId: string
    fatta: boolean
    lezioneId?: string | null
    data?: Iso | null
  }
  /** Data scelta a mano: la casella è spuntata e non segue più una lezione. */
  | { tipo: 'check.data'; corsoId: string; allievoId: string; colonnaId: string; data: Iso }
  /** Aggancia la spunta a un'ora del corso: la data segue la lezione. */
  | {
    tipo: 'check.lezione'
    corsoId: string
    allievoId: string
    colonnaId: string
    lezioneId: string
  }
  // ---------------------------------------------------------------- progetti
  /**
   * La testata del progetto: titolo, descrizione, obiettivi, fasi, stato,
   * criteri, livelli, risorse, note. Di un progetto che c'è già, compiti,
   * giudizi e matrice restano quelli del registro (hanno le loro azioni). Un
   * criterio o una fase senza id con il titolo di uno che c'è ne riprende
   * l'id. Le fasi sono tutte e in ordine, mai nessuna (rifiuto); omesse
   * restano quelle di prima. Le tappe dei piani di una fase tolta passano
   * alla fase rimasta che la precedeva, o alla prima, e lo si dice. Celle che
   * cadrebbero (criterio tolto, livello tolto o rinominato) fanno rifiutare,
   * salvo `scartaCelle`. Un id che non c'è lo crea.
   */
  | { tipo: 'progetto.salva'; progetto: ProgettoDaSalvare; scartaCelle?: boolean }
  /** Toglie il progetto; tappe dei piani e momenti restano, sganciati. */
  | { tipo: 'progetto.elimina'; progettoId: string }
  | { tipo: 'progetto.compito.salva'; progettoId: string; compito: CompitoDaSalvare }
  | { tipo: 'progetto.compito.elimina'; progettoId: string; compitoId: string }
  /**
   * Chi comincia il compito, e quando: in un'ora (la data la segue) o in un
   * giorno; con l'uno o l'altro chi l'aveva già cominciato lo sposta lì.
   * Senza, oggi, e solo per chi non aveva cominciato.
   */
  | {
    tipo: 'progetto.compito.inizia'
    progettoId: string
    compitoId: string
    allieviIds: string[]
    data?: Iso | null
    lezioneId?: string | null
  }
  | { tipo: 'progetto.compito.togliInizio'; progettoId: string; compitoId: string; allieviIds: string[] }
  /** Una fine sua per un allievo; `fine: null` la toglie e torna quella comune. */
  | {
    tipo: 'progetto.compito.proroga'
    progettoId: string
    compitoId: string
    allievoId: string
    fine: Iso | null
    nota?: string
  }
  /** La spunta di un allievo; rispuntare non cambia il quando, ma la nota sì. */
  | {
    tipo: 'progetto.compito.fatto'
    progettoId: string
    compitoId: string
    allievoId: string
    fatto: boolean
    nota?: string
  }
  /** Spunta il compito a chi frequenta; `fatto: false` toglie tutte le spunte, ritirati compresi. */
  | { tipo: 'progetto.compito.fattoTutti'; progettoId: string; compitoId: string; fatto: boolean }
  | { tipo: 'progetto.giudizio.salva'; progettoId: string; giudizio: GiudizioDaSalvare }
  | { tipo: 'progetto.giudizio.elimina'; progettoId: string; giudizioId: string }
  /**
   * Una cella della matrice: allievo × criterio in un giorno (quello dell'ora,
   * se data in un'ora; se no `data` o oggi). Un altro giorno è un'altra cella:
   * così si vede la progressione. Livello nullo e nota vuota la tolgono.
   */
  | {
    tipo: 'progetto.cella'
    progettoId: string
    allievoId: string
    criterioId: string
    data?: Iso | null
    lezioneId?: string | null
    livello: string | null
    nota?: string
  }
  // ------------------------------------------------------------- smistamento
  /**
   * PDF di classe scelti dal disco da dividere; i byte entrano nel documento
   * dell'anno, l'originale resta dov'è. `consegnaId` può essere nullo.
   * `divisione` dice dove tagliare (nomi sulle pagine, ogni N pagine, a mano):
   * lo sa solo chi carica.
   */
  | {
    tipo: 'smistamento.carica'
    /** La richiesta a cui appartiene, se nota. */
    consegnaId: string | null
    /**
     * La classe da cui il file è entrato. Senza, una scansione muta finirebbe in
     * quarantena senza classe, cioè invisibile.
     */
    classeId?: string | null
    divisione: Divisione
  }
  /**
   * Un PDF trascinato nel pannello, in base64: la sandbox del webview conosce i
   * byte e il nome, non il percorso. L'host lo posa in quarantena nel documento.
   */
  | {
    tipo: 'smistamento.deposita'
    consegnaId: string | null
    /** Vedi `smistamento.carica`. */
    classeId?: string | null
    nome: string
    contenuto: string
    divisione: Divisione
  }
  /**
   * Assorbe un PDF rimasto nella cartella `in-arrivo/` del disco nel documento corrente.
   * L'originale va nel cestino solo se è entrato nel documento.
   */
  | {
    tipo: 'smistamento.cassetta.assorbi'
    percorso: string
  }
  /** Rimette in coda la lettura delle pagine scelte (nome letto male o mancante). */
  | { tipo: 'smistamento.leggiPagine'; smistamentoId: string; pagine: number[] }
  /** Apre solo quelle pagine nel lettore del sistema. */
  | { tipo: 'smistamento.apriPagine'; smistamentoId: string; pagine: number[] }
  /**
   * Riprende pagine già archiviate: il documento esce dal fascicolo e le pagine
   * tornano da smistare. Rimedia a una pagina lasciata sulla riga sbagliata.
   */
  | { tipo: 'smistamento.riprendiPagine'; smistamentoId: string; pagine: number[] }
  /** Scarta le pagine scelte (copertina, fogli bianchi): escono senza finire da nessuno. */
  | { tipo: 'smistamento.scartaPagine'; smistamentoId: string; pagine: number[] }
  /** Archivia tutte le proposte di un PDF che hanno già un nome; il resto resta. */
  | { tipo: 'smistamento.confermaTutto'; smistamentoId: string }
  // Le due azioni del flusso a blocchi: nessuna vista le manda, le esercitano le
  // prove. Vedi `core/azioni/sorting.ts`.
  | { tipo: 'smistamento.assegnaManuale'; smistamentoId: string; consegnaId: string; allievoId: string; da: number; a: number }
  | { tipo: 'smistamento.dividi'; smistamentoId: string; divisione: Divisione }
  /**
   * Pagine trascinate sulla casella di qualcuno: queste, a questa persona, in
   * questo documento. Anche non contigue: le due facciate di una persona
   * possono stare a dieci fogli di distanza, e restano un documento solo.
   */
  | {
    tipo: 'smistamento.assegnaPagine'
    smistamentoId: string
    consegnaId: string
    allievoId: string
    pagine: number[]
  }
  /**
   * Pagine trascinate su una casella della matrice delle assenze: questo rapporto,
   * di questa persona, in questo periodo. Genere e firma li dice chi guarda, non
   * il riconoscimento.
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
  /** Pagine trascinate sulla casella delle firme: il foglio firme della richiesta. */
  | { tipo: 'smistamento.assegnaFirme'; smistamentoId: string; consegnaId: string; pagine: number[] }
  /** Mette in coda tutte le pagine ancora da leggere di un PDF. */
  | { tipo: 'smistamento.leggiTutto'; smistamentoId: string }
  /**
   * Rilegge con l'OCR le pagine non archiviate dei PDF indicati, anche quelle con
   * un testo già letto. L'elenco lo dà il pannello, perché è quel che la pagina
   * mostra (periodo, richieste aperte).
   */
  | { tipo: 'smistamento.rileggiAttive'; smistamentiId: string[] }
  /** Svuota la coda di lettura; la pagina in corso si finisce. */
  | { tipo: 'smistamento.fermaLettura' }
  /**
   * Dice di quale classe è un PDF, la prima volta o cambiando idea. Le pagine già
   * archiviate non si muovono; la richiesta agganciata si lascia andare.
   */
  | { tipo: 'smistamento.attribuisci'; smistamentoId: string; classeId: string }
  /** Apre il PDF originale. */
  | { tipo: 'smistamento.apri'; smistamentoId: string }
  /** Butta via tutto quel che resta di uno smistamento, file compreso. */
  | { tipo: 'smistamento.elimina'; smistamentoId: string }
  /** Apre le impostazioni sulla lettura automatica delle scansioni. */
  | { tipo: 'smistamento.impostazioni' }
  | { tipo: 'recapito.salva'; classeId: string; recapito: Recapito }
  | { tipo: 'recapito.elimina'; classeId: string; recapitoId: string }
  | { tipo: 'comunicazione.salva'; classeId: string; comunicazione: Comunicazione }
  | { tipo: 'comunicazione.elimina'; classeId: string; comunicazioneId: string }
  | { tipo: 'comunicazione.invia'; classeId: string; comunicazioneId: string; conferma?: boolean }
  /** Spunta «spedita» data a mano dopo l'invio dal programma di posta; `false` torna bozza. */
  | { tipo: 'comunicazione.spunta'; classeId: string; comunicazioneId: string; spedita: boolean }
  // ---------------------------------------------------------------- assenze
  | { tipo: 'assenze.salva'; classeId: string; blocco: BloccoAssenze }
  | { tipo: 'assenze.elimina'; classeId: string; bloccoId: string }
  /**
   * Aggiunge un foglio scelto dal disco alla riga dell'allievo; la riga nasce
   * qui se non c'era.
   */
  | {
    tipo: 'assenze.foglio.aggiungi'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
    file?: string
  }
  | {
    tipo: 'assenze.foglio.apri'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /** Toglie il foglio: il file va nel cestino e la casella torna vuota. */
  | {
    tipo: 'assenze.foglio.togli'
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /**
   * Importa molti PDF insieme, riconosciuti dal nome del file. I non riconosciuti
   * non si assegnano a caso: l'esito li elenca.
   */
  | {
    tipo: 'assenze.importa'
    classeId: string
    bloccoId: string
    genere: TipoRapporto
    firmato: boolean
  }
  /**
   * Richiesta di firma: una mail per allievo all'azienda, con i fogli vergini.
   * `allieviIds` vuoto = tutti i pronti non ancora spediti.
   */
  | { tipo: 'assenze.invia'; classeId: string; bloccoId: string; allieviIds: string[]; conferma?: boolean }
  /** La spunta sulla richiesta di un allievo: partita, o tornata da mandare. */
  | { tipo: 'assenze.spunta'; classeId: string; bloccoId: string; allievoId: string; spedita: boolean }
  /**
   * Con `ruolo: 'recupero'` l'allievo è facoltativo: senza è il testo della
   * prova, con è il compito rifatto. `recupero-soluzione` non ha allievo.
   */
  | { tipo: 'allegato.aggiungi'; valutazioneId: string; ruolo: RuoloAllegato; allievoId?: string | null; file?: string }
  | { tipo: 'allegato.apri'; valutazioneId: string; allegatoId: string }
  | { tipo: 'allegato.elimina'; valutazioneId: string; allegatoId: string }
  /**
   * Le impostazioni del documento, tutte insieme. Senza intestazione quella
   * salvata resta. Il logo passa da `intestazione.logo`/`intestazione.togliLogo`.
   */
  | { tipo: 'impostazioni.salva'; impostazioni: ImpostazioniDaSalvare }
  /** Sceglie il logo della carta intestata e lo porta dentro il documento. */
  | { tipo: 'intestazione.logo'; cartaId: string; file?: string }
  /** Toglie il logo dalla carta intestata. */
  | { tipo: 'intestazione.togliLogo'; cartaId: string }
  /**
   * Un'impostazione del programma (`impostazioni.json`, sulla macchina), non del
   * documento `.regi`. Passa di qui perché il webview non vede quel file.
   */
  | { tipo: 'programma.salva'; chiave: string; valore: string | number | boolean }
  /** Ritira il valore scritto: si torna al predefinito del manifesto. */
  | { tipo: 'programma.azzera'; chiave: string }
  /**
   * Dialogo del sistema per una voce che tiene un percorso (cartella, `.exe`,
   * file). Il valore scelto passa dalla dogana di `programma.salva`.
   */
  | { tipo: 'programma.sfoglia'; chiave: string }
  /**
   * Un rapporto in PDF. Un'azione per tutti: cambiano il modello in `templates/`
   * e i dati. Scrive e basta: il percorso torna in `Risposta.documento` e la
   * pagina Documenti lo mostra nella sua cornice.
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
        | 'diario'
        | 'corso'
        | 'supplenze'
        | 'progetto-classe'
        | 'progetto-allievo'
    /**
     * L'id di quel che si stampa: lezione, piano, corso (valutazioni, presenze, diario, corso, supplenze),
     * classe (fascicolo, ritratti), allievo (scheda), momento (scheda della prova),
     * progetto (tutti e due i rapporti del progetto).
     */
    id: string
    /** Solo per il rapporto individuale del progetto: di chi è. */
    allievoId?: string | null
    /**
     * Solo per la scheda dell'allievo: il corso di cui parla, perché una media fra
     * due materie non ha senso. Vuoto se la scheda è per il docente di classe.
     */
    corsoId?: string | null
    /** Solo per valutazioni e scheda dell'allievo: il periodo da guardare. */
    semestreId?: string | null
    /** Scheda allievo dal punto di vista del docente di classe (tutte le materie). */
    docenteDiClasse?: boolean
  }
  /**
   * Tutti i fogli di un corso in un colpo: presenze, griglia dei voti, una scheda
   * per allievo (fine semestre, colloqui). `corsoId` nullo = tutti i corsi
   * dell'anno.
   */
  | { tipo: 'rapporto.completo'; corsoId: string | null; semestreId: string | null }
  // I modelli dei rapporti sono del programma e non si scrivono da qui. Del
  // documento resta la carta intestata: `intestazione.logo` e `impostazioni.salva`.
  /**
   * Apre un documento già esportato con il programma del sistema, senza
   * rifarlo: mostra quel che si è consegnato davvero.
   */
  | { tipo: 'esportazione.apri'; percorso: string }
  /**
   * Mostra un PDF esportato dentro il registro, nel lettore di Chromium. Solo
   * PDF: CSV e testi vanno a `esportazione.apri`.
   */
  | { tipo: 'esportazione.mostra'; percorso: string; titolo?: string }
  /** Butta via un documento esportato: sotto `esportazioni/` tutto si può rifare. */
  | { tipo: 'esportazione.elimina'; percorso: string }
  /**
   * Butta via i momenti di valutazione non nati da una tappa del piano. Gli id
   * sono espliciti perché dentro ci sono dei voti.
   */
  | { tipo: 'valutazione.eliminaOrfane'; ids: string[] }
  /** Le valutazioni di un corso in CSV (di un corso: una media fra materie non ha senso). */
  | { tipo: 'esporta.valutazioni'; corsoId: string; semestreId: string | null }
  /** Le presenze di un corso in CSV (di un corso: sommare materie diverse non ha senso). */
  | { tipo: 'esporta.presenze'; corsoId: string; semestreId: string | null }
  | { tipo: 'esporta.lezione'; lezioneId: string }
  /**
   * Il pacchetto per chi tiene le mie ore mentre manco: uno zip accanto al
   * documento con gli allievi e le foto, il piano e le risorse di ogni ora. Con
   * un indirizzo parte anche la mail che lo porta (spedita, o bozza `.eml`);
   * `segretariato` dice che va a chi la girerà.
   */
  | {
    tipo: 'supplenza.prepara'
    lezioniIds: string[]
    supplente?: string
    email?: string
    segretariato?: boolean
    conferma?: boolean
  }
  /** Applica tutte le correzioni che il registro sa fare da solo. */
  | { tipo: 'manutenzione.ripara' }
  | { tipo: 'sistema.apriCartella' }
  /**
   * Zoom della finestra, un passo per volta: lo fa Chromium su tutto. Sta nel
   * protocollo perché su Windows e Linux la barra dei menu non si vede.
   */
  | { tipo: 'finestra.zoom'; verso: 'avanti' | 'indietro' | 'azzera' }
  /** Schermo intero della finestra di lavoro (non la proiezione per la classe). */
  | { tipo: 'finestra.schermoIntero' }
  /** Chiude il registro. Il documento si salva da sé: non c'è niente da perdere. */
  | { tipo: 'programma.esci' }
  /**
   * Annulla l'ultimo gesto: tutte le scritture di quell'azione insieme. La storia
   * è solo in memoria (`data/history.ts`); se le stesse collezioni sono cambiate
   * per altra via, si rifiuta.
   */
  | { tipo: 'storia.annulla' }
  /** Rifà l'ultimo gesto annullato; un gesto nuovo lo toglie di mezzo. */
  | { tipo: 'storia.ripristina' }
  /**
   * Passa un numero al programma di sistema per i `tel:`, scelto da
   * un'impostazione. Passa dall'host perché nella sandbox un link non `https`
   * morirebbe in silenzio.
   */
  | { tipo: 'sistema.chiama'; numero: string }
  /** Apre il programma di posta su un messaggio nuovo (`mailto:`), fuori dal registro. */
  | { tipo: 'sistema.scrivi'; indirizzo: string }
  /** Verifica l'accesso alla casella senza spedire; l'esito torna come messaggio. */
  | { tipo: 'posta.prova' }
  /**
   * Spedisce una mail di prova a un indirizzo scelto: verifica il permesso di
   * spedire, che è diverso da quello di entrare. L'indirizzo lo chiede l'host
   * con un dialogo di sistema.
   */
  | { tipo: 'posta.invioProva' }
  /**
   * Collega la casella: indirizzo, accesso Microsoft dal browser, prova, e salva
   * solo se il server accetta. Il gettone resta nell'host (portachiavi del
   * sistema), mai nel webview.
   */
  | { tipo: 'posta.collega' }
  /** Toglie dal portachiavi le credenziali della casella: si torna alle bozze. */
  | { tipo: 'posta.scollega' }
  /**
   * Azzera la posta per intero: il gettone come `posta.scollega`, e in più gli
   * indirizzi letti da Microsoft, i tenant ricordati e le impostazioni
   * `registroDocenti.posta.*`. Si ricollega da capo.
   */
  | { tipo: 'posta.azzera' }
  /**
   * Collega un account Microsoft per leggere il suo OneDrive: l'indirizzo (dato,
   * o chiesto dall'host con la casella della posta già scritta) e l'accesso dal
   * browser. Il gettone resta nel portachiavi dell'host, mai nel webview.
   */
  | { tipo: 'microsoft.aggiungi'; indirizzo?: string }
  /** Scollega un account Microsoft: toglie il suo gettone dal portachiavi. */
  | { tipo: 'microsoft.togli'; indirizzo: string }
  /**
   * Apre un documento `.regi` trovato su OneDrive: il file sincronizzato sul
   * computer se c'è, altrimenti una copia scaricata dove si sceglie.
   */
  | { tipo: 'onedrive.apri'; account: string; drive: string; id: string }
  | { tipo: 'sistema.messaggio'; livello: 'info' | 'avviso' | 'errore'; testo: string }
  // ------------------------------------------------------------------- mappa
  /**
   * Geocodifica (OpenStreetMap) domicilio e lavoro di chi frequenta le classi
   * indicate. Solo su richiesta, perché gli indirizzi escono dalla macchina; le
   * coordinate restano nell'anagrafica. Senza `classeIds` = tutte; `allievoId` =
   * una persona; `rifaiTutto` rifà anche i già risolti.
   */
  | { tipo: 'mappa.geocodifica'; classeIds?: string[]; allievoId?: string; rifaiTutto?: boolean }
  // ---------------------------------------------------------------- proiezione
  /**
   * Apre lo schermo per la classe: un secondo pannello in sola lettura e a
   * caratteri grandi, da spostare sul proiettore.
   */
  | { tipo: 'proiezione.apri' }
  | { tipo: 'proiezione.chiudi' }
  /** Dove sta guardando il registro, a ogni cambio di vista: la proiezione lo segue. */
  | { tipo: 'proiezione.mira'; mira: MiraProiezione }
  /** Che cosa mostra lo schermo grande; si decide dal pannello del docente. */
  | { tipo: 'proiezione.impostazioni'; impostazioni: ImpostazioniProiezione }
  /**
   * Stacca l'assistente in una finestra sua, con la conversazione, la bozza e,
   * se c'è, la domanda in corso (`giro`), che la nuova finestra riprende. L'host
   * la tiene solo per il passaggio (vedi `panels/assistant.ts`).
   *
   * Il rientro non è un'azione: lo fa la finestra staccata, che ha la
   * conversazione in mano.
   */
  | { tipo: 'assistente.stacca'; storia: TurnoAssistente[]; bozza?: string; giro?: GiroAssistente }
  /**
   * Dove sta guardando chi chiede, a ogni cambio di vista: dà al modello il
   * contesto (senza, «la 4a» finirebbe su un corso a caso). La tiene l'host,
   * perché la finestra staccata non ha il registro per comporla.
   */
  | { tipo: 'assistente.contesto'; contesto: ContestoAssistente | null }
  /**
   * Apre una pagina del registro, come `MessaggioNavigazione`: così la usa anche
   * l'assistente. Niente `nuovo` né `avvio`: un modulo di creazione non lo apre
   * un modello.
   */
  | { tipo: 'vista.apri'; vista: Vista; elementoId?: string; data?: Iso }
  /**
   * Scarica un modello da Hugging Face. È un'azione perché scrive gigabyte, dura
   * a lungo e si annulla: serve la coda delle scritture. L'indirizzo lo compone
   * `data/huggingFace.ts`.
   */
  | { tipo: 'llm.scarica'; deposito: string; file: string; per?: UsoModello }
  /**
   * Senza `file` ferma lo scarico in corso e la coda prosegue; con `file` toglie
   * quello, dalla coda o fermandolo. Il parziale si cancella.
   */
  | { tipo: 'llm.annulla'; file?: string }
  /**
   * Importa un `.gguf` che si ha già. `data/gguf.ts` controlla che sia un GGUF e
   * lo copia nella cartella dei modelli: il percorso ricevuto non viene aperto.
   */
  | { tipo: 'llm.importa'; file: string }
  /** Toglie un modello dalla cartella: solo di lì, e solo un `.gguf`. */
  | { tipo: 'llm.elimina'; nome: string }
  /** Sceglie il modello per un uso. Scrive nelle impostazioni del programma, non nel registro. */
  | { tipo: 'llm.scegli'; uso: UsoModello; modello: string; proiettore?: string }
  /**
   * Chiede subito a GitHub se c'è una versione nuova; con lo scarico automatico
   * acceso la scarica. L'esito arriva con `MessaggioAggiornamenti`.
   */
  | { tipo: 'aggiornamenti.controlla' }
  /** Scarica la versione già trovata, quando lo scarico automatico è spento. */
  | { tipo: 'aggiornamenti.scarica' }
  /**
   * Esce, installa la versione scaricata e riapre. Solo con stato `pronto`;
   * l'uscita passa da `before-quit`, così l'ultimo salvataggio viene aspettato.
   */
  | { tipo: 'aggiornamenti.installa' }
  /** Chiede di non mostrare più la notizia del filetto finché il testo non cambia. */
  | { tipo: 'aggiornamenti.nascondiNotizia'; notizia: string }

/**
 * Per quale uso lavora un modello (`data/llm.ts`): l'assistente conversa, l'OCR
 * guarda. Un modello di solito fa bene uno dei due, per questo si sceglie due
 * volte.
 */
export type UsoModello = 'assistente' | 'ocr'

/** Una richiesta con il suo numero d'ordine: la risposta lo riporta identico. */
export interface Richiesta {
  id: number
  azione: Azione
}

/**
 * Una domanda: legge dal registro, non cambia niente. Serve a quel che il
 * `Registro` spinto al pannello non contiene (sorgente di un modello, file
 * scritti, PDF di prova, diagnosi).
 *
 * Una domanda non può scrivere: `rispondiDomanda` (`panels/panel.ts`) rifiuta
 * le procedure non `genere: 'lettura'`. Per questo salta la coda delle
 * scritture e non aspetta dietro lavori lunghi.
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
  /** Le frasi da mostrare, già tradotte. */
  errori?: string[]
  /** Il codice dell'API: `non-trovato`, `rifiutato`, `ingresso-non-valido`… */
  codice?: string
}

export interface Risposta {
  tipo: 'risposta'
  id: number
  ok: boolean
  errori?: string[]
  /**
   * Perché non è riuscita: `non-trovato`, `rifiutato`, `non-disponibile`… Serve a
   * decidere se ritentare. È `string` e non `Codice` perché il protocollo sta
   * sotto il contratto, come per `Riscontro.codice`.
   */
  codice?: string
  /** Il numero della chiamata nel giornale: quel che si cita per ritrovarla. */
  tracciato?: string
  /** Riferimento all'entità appena creata, per la vista che deve aprircisi sopra. */
  creato?: { id: string }
  /**
   * Il documento appena scritto, relativo alla cartella dei dati: la pagina
   * Documenti lo apre subito nella sua cornice.
   */
  documento?: string
  /** Quel che l'host vuole dire a chi ha chiesto («12 lezioni aggiunte»), come notifica. */
  messaggio?: Messaggio
}

/** I nomi che un rapporto sa riempire: li elenca e li controlla l'editor dei modelli. */
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
  /** Le immagini che un modello può chiedere per nome: il logo dell'intestazione, se c'è. */
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
 * Le impostazioni del documento da salvare, senza logo (ha le sue azioni) e
 * senza `vecchiaCartellaVista` (la scrive solo il registro). Senza intestazione
 * quella salvata resta.
 */
export type ImpostazioniDaSalvare = Omit<Impostazioni, 'intestazione'> & {
  intestazione?: Omit<Intestazione, 'carte' | 'vecchiaCartellaVista'> & {
    carte: Array<Omit<CartaIntestata, 'logo'>>
  }
}

/**
 * Le sezioni del pannello, qui perché host e webview le leggono entrambi. Una
 * vista dichiarata ma non disegnata da `shell.ts` è una pagina bianca: chi ne
 * aggiunge una la aggiunge anche a `vistaCorrente` e a `PAGINE`.
 */
export type Vista =
  | 'oggi'
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
  | 'progetti'
  | 'valutazioni'
  | 'check'
  | 'documenti'
  | 'overview'
  | 'modelli'
  | 'modelliLinguistici'
  | 'mappa'
  | 'impostazioni'
  | 'guida'
