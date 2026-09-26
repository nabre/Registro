// Il contratto fra webview e host: lo importano entrambi, così una richiesta
// con un campo sbagliato non compila.
//
// Il webview non tocca il disco: costruisce l'entità completa con le fabbriche
// del dominio e la manda intera; l'host la applica e rispedisce lo stato, che è
// l'unica verità.

import type {
  AnnoScolastico,
  BloccoAssenze,
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
import type { Composizione } from './domain/compositions.js'
import type { AllineamentoDaCalendario, LezioneDaCalendario } from './domain/calendar.js'
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

/** Una classe di un altro registro da importare: le persone con le foto, i corsi con l'orario. */
interface ClasseDaImportare {
  classeId: string
  anagrafica: boolean
  corsi: boolean
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
    /** I nomi dei due semestri, se scritti nel modulo. */
    etichetteSemestri?: [string, string]
  }
  | { tipo: 'anno.salva'; anno: AnnoScolastico }
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
  /** Rinomina un calendario o ne cambia l'origine; un'origine illeggibile non cambia niente. */
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
  | { tipo: 'piano.perLezione'; lezioneId: string; daPianoId?: string | null }
  | { tipo: 'classe.salva'; classe: Classe }
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
  | { tipo: 'allievo.foto.imposta'; classeId: string; allievoId: string }
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
  /** Minuti di ritardo e nota di una riga; caselle e righe altrui restano com'erano. */
  | { tipo: 'presenze.campi'; lezioneId: string; allievoId: string; minuti?: number; nota?: string }
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
  | { tipo: 'consegna.raccogli'; consegnaId: string; chi: string }
  /** Apre il file con cui qualcuno ha spuntato. */
  | { tipo: 'consegna.file.apri'; consegnaId: string; chi: string }
  // ------------------------------------------------- distribuire un documento
  /**
   * Il documento pronto per qualcuno, prima di consegnarlo. `allievoId` nullo =
   * lo stesso per tutti. Averlo non è averlo consegnato: quello è un gesto a parte.
   */
  | { tipo: 'consegna.documento.allega'; consegnaId: string; allievoId: string | null }
  | { tipo: 'consegna.documento.apri'; consegnaId: string; allievoId: string | null }
  | { tipo: 'consegna.documento.togli'; consegnaId: string; allievoId: string | null }
  /** Consegnato a mano: solo la spunta. */
  | { tipo: 'consegna.consegnato'; consegnaId: string; allievoId: string; fatta: boolean }
  /**
   * Distribuzione per mail: un messaggio a testa col documento. Senza
   * `allieviIds` parte per tutti quelli in attesa con documento pronto; chi non
   * ha un indirizzo resta indietro e viene nominato.
   */
  | { tipo: 'consegna.distribuisci'; consegnaId: string; allieviIds?: string[] }
  /**
   * Il foglio firme della consegna: uno per tutta la richiesta, ha senso solo
   * quando è il docente a consegnare.
   */
  | { tipo: 'consegna.firme.aggiungi'; consegnaId: string }
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
  // prove. Vedi `src/actions/sorting.ts`.
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
  | { tipo: 'comunicazione.invia'; classeId: string; comunicazioneId: string }
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
  | { tipo: 'assenze.invia'; classeId: string; bloccoId: string; allieviIds: string[] }
  /** La spunta sulla richiesta di un allievo: partita, o tornata da mandare. */
  | { tipo: 'assenze.spunta'; classeId: string; bloccoId: string; allievoId: string; spedita: boolean }
  /**
   * Con `ruolo: 'recupero'` l'allievo è facoltativo: senza è il testo della
   * prova, con è il compito rifatto. `recupero-soluzione` non ha allievo.
   */
  | { tipo: 'allegato.aggiungi'; valutazioneId: string; ruolo: RuoloAllegato; allievoId?: string | null }
  | { tipo: 'allegato.apri'; valutazioneId: string; allegatoId: string }
  | { tipo: 'allegato.elimina'; valutazioneId: string; allegatoId: string }
  /**
   * Le impostazioni del documento, tutte insieme. Senza intestazione quella
   * salvata resta. Il logo passa da `intestazione.logo`/`intestazione.togliLogo`.
   */
  | { tipo: 'impostazioni.salva'; impostazioni: ImpostazioniDaSalvare }
  /** Sceglie il logo della carta intestata e lo porta dentro il documento. */
  | { tipo: 'intestazione.logo'; cartaId: string }
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
    /**
     * L'id di quel che si stampa: lezione, piano, corso (valutazioni, presenze),
     * classe (fascicolo, ritratti), allievo (scheda), momento (scheda della prova).
     */
    id: string
    /**
     * Solo per la scheda dell'allievo: il corso di cui parla, perché una media fra
     * due materie non ha senso. Vuoto solo se la classe non ha corsi.
     */
    corsoId?: string | null
    /** Solo per valutazioni e scheda dell'allievo: il periodo da guardare. */
    semestreId?: string | null
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
   * Un fascicolo nuovo: i documenti spuntati, in fila, sotto un nome (quello del
   * PDF che ne esce). L'ordine è quello dei percorsi e resta nella ricetta.
   */
  | { tipo: 'composizione.crea'; nome: string; percorsi: string[] }
  /** Rifà il PDF di un fascicolo con i fogli presenti adesso nella cartella. */
  | { tipo: 'composizione.aggiorna'; id: string }
  /** Butta via un fascicolo: la ricetta e il PDF. I fogli restano dove sono. */
  | { tipo: 'composizione.elimina'; id: string }
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

/**
 * Per quale uso lavora un modello (`data/llm.ts`): l'assistente conversa, l'OCR
 * guarda. Un modello di solito fa bene uno dei due, per questo si sceglie due
 * volte.
 */
export type UsoModello = 'assistente' | 'ocr'

/**
 * Un turno della conversazione come si vede a schermo, con procedure e guasti.
 * Diverso da `Conversazione.storia`, che è quel che si manda al modello.
 * Viaggia solo quando l'assistente passa fra riquadro e finestra.
 */
export interface TurnoAssistente {
  ruolo: 'utente' | 'assistente'
  testo: string
  /**
   * Le procedure aperte per questa risposta; `messaggio` è il motivo di un
   * fallimento, come in `MessaggioAssistente.attrezzo`.
   */
  attrezzi?: Array<{ nome: string, ok: boolean, codice?: string, messaggio?: string }>
  /**
   * Gli id incontrati leggendo per questo turno. Stanno nel turno così spariscono
   * con la conversazione quando la si svuota.
   */
  visti?: IdVisto[]
  /**
   * Quel che le procedure hanno letto, già impaginato (`api/presentation.ts`):
   * viaggia con il turno così le tabelle seguono la conversazione staccata.
   */
  risultati?: RisultatoAssistente[]
  /** Il servizio non ha risposto: si disegna in un altro modo. */
  guasto?: boolean
  /**
   * Chi ha chiesto ha premuto «Ferma»: non è un guasto. Resta comunque fuori
   * dalla storia mandata al modello.
   */
  fermato?: boolean
  /** Il modello ha finito le chiamate concesse: la nota sotto la risposta lo dice. */
  esaurito?: boolean
}

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

/**
 * Una scelta in una tendina: l'etichetta a schermo, con cui chi chiede ne
 * parla, e l'id che gli attrezzi vogliono.
 */
export interface VoceContesto {
  /** Come si chiama il campo nella barra: «Corso», «Classe», «Semestre». */
  campo: string
  /**
   * Il campo da cui questo dipende («Corso» dentro «Classe»): dice al modello la
   * gerarchia della barra. Assente per le voci indipendenti.
   */
  dentro?: string
  /** Il valore come si legge a schermo: «DIC4a · Matematica», «Tutti i corsi». */
  valore: string
  /** L'id da passare agli attrezzi, quando quel valore ne ha uno. */
  id: string | null
  /**
   * Le altre voci della tendina, ammesse dalla scelta di sopra: così «e la
   * terza?» si risolve senza una seconda lettura. Assente se non c'è scelta.
   */
  opzioni?: Array<{ valore: string, id: string | null }>
}

/**
 * Gli id su cui la pagina è puntata. Tutti presenti: `null` vuol dire «qui non
 * c'è», così il modello non deve indovinare.
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
 * Il periodo dei conti, già in date: gli attrezzi vogliono `dal` e `al`, non un
 * `semestreId`. `null` tutti e due quando non c'è ancora un anno.
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
 * Quel che l'elenco della pagina mostra adesso, filtrato, con gli id
 * nell'ordine a schermo («il terzo della lista»). `troncato` dice se l'elenco
 * è parziale, perché il modello non risponda sicuro su una parte.
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
 * Di che cosa si sta parlando, dedotto da dove si guarda: pagina, scheda,
 * tendine, filtri. Viaggia con `assistente.contesto` e l'host tiene l'ultimo.
 */
export interface ContestoAssistente {
  /**
   * La pagina aperta, con il nome del codice. `null` quando «la pagina che
   * guardo» è spento; il resto del contesto è indipendente (`ui/assistant/parts.ts`).
   */
  vista: Vista | null
  /** Come si chiama nella barra laterale: «Lezione». `null` come sopra. */
  pagina: string | null
  /** La scheda aperta dentro la pagina, quando ne ha: «Appello». */
  scheda: string | null
  /**
   * La sezione dentro la scheda, per le pagine a due livelli (le impostazioni:
   * scheda programma/documento, poi la sezione).
   */
  sezione: string | null
  /** Le scelte fatte nelle tendine in cima, come si leggono. */
  scelte: VoceContesto[]
  /** Quel che la pagina sta restringendo: vale anche per quel che si chiede. */
  filtri: VoceContesto[]
  riferimenti: RiferimentiContesto
  /**
   * Il periodo dei conti, in date. `null` quando chi chiede l'ha spento: vuol
   * dire «rispondi senza restringere».
   */
  periodo: PeriodoContesto | null
  /** Il giorno che la pagina sta mostrando. */
  data: Iso
  /** Oggi, che non è per forza il giorno mostrato. */
  oggi: Iso
  /** La ricerca battuta nella pagina, quando ce n'è una. */
  ricerca: string | null
  visibili: ElencoVisibile | null
}

/**
 * Una conversazione con l'assistente: una domanda in linguaggio naturale, a cui
 * il modello locale risponde leggendo il registro. Non è un'`Azione` (non
 * scrive) né una `Domanda` (le procedure le sceglie il modello, e
 * `api/transports/assistant.ts` concede solo le letture). Fuori dalla coda
 * delle scritture perché dura secondi. `storia` la tiene la pagina, così
 * cancellarla la fa sparire davvero.
 */
export interface Conversazione {
  id: number
  /** I turni già detti, il più recente per ultimo. Le istruzioni le mette l'host. */
  storia: Array<{ ruolo: 'utente' | 'assistente', testo: string }>
  /**
   * Gli id già incontrati nei turni: `storia` ha solo ruolo e testo, quindi si
   * mandano accanto. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /**
   * Il contesto nel momento dell'Invio, dentro la busta: la domanda salta la
   * coda, e `assistente.contesto` accodato dietro un lavoro lungo sarebbe
   * vecchio. `undefined`: la finestra staccata non sa comporlo e vale l'ultimo
   * mandato dal pannello; `null`: contesto spento.
   */
  contesto?: ContestoAssistente | null
  /**
   * «Ferma» il giro con questo `id`: stessa busta perché è il canale già aperto
   * verso l'host; `storia` c'è, vuota. Vedi `panels/conversation.ts`.
   */
  ferma?: true
}

/**
 * Una domanda in corso mentre l'assistente cambia finestra. Il giro vive
 * nell'host; la finestra che se ne va dice quanti eventi ha già ricevuto, così
 * la nuova riprende senza doppioni né buchi.
 */
export interface GiroAssistente {
  /** Quanti eventi di questo giro la finestra che consegna ha già ricevuto. */
  visti: number
  /**
   * L'id della busta con cui questa pagina ha chiesto: dice quale giro sospendere
   * quando ce ne sono due insieme. Opzionale: senza, si prende il più recente
   * della pagina che consegna.
   */
  busta?: number
}

/** Lo stesso giro, come l'host lo restituisce: con il numero per riprenderlo. */
export interface GiroDaRiprendere extends GiroAssistente {
  /** Il numero con cui l'host lo tiene da parte: torna nella busta «segui». */
  id: number
}

/**
 * La finestra arrivata riprende la domanda in volo, senza rimandarla al
 * modello.
 */
export interface SeguiConversazione {
  /** Il giro che l'host tiene da parte: `GiroDaRiprendere.id`. */
  segui: number
  /** L'id su cui questa finestra vuole sentirsi rispondere. */
  id: number
  /** Da quale evento in poi: i precedenti li ha già visti chi ha consegnato. */
  da: number
}

/**
 * Come sta l'assistente, per tutte e due le finestre: il pannello guarda
 * `staccato`, la finestra staccata `acceso` e `modello` (non ha il `Registro`).
 * `storia` c'è solo subito dopo uno spostamento.
 */
export interface MessaggioStatoAssistente {
  tipo: 'assistente.stato'
  acceso: boolean
  modello: string
  staccato: boolean
  /**
   * Se il microfono si può accendere (interruttore della dettatura). Viaggia qui
   * perché la finestra staccata non riceve le impostazioni; il riquadro lo legge
   * da qui lo stesso, per avere una fonte sola.
   */
  dettatura: boolean
  storia?: TurnoAssistente[]
  /** Quel che era battuto nel campo e non ancora mandato, per non ribatterlo dopo lo spostamento. */
  bozza?: string
  /**
   * La domanda in volo durante lo spostamento, solo nel messaggio subito dopo:
   * chi lo riceve manda una `SeguiConversazione` e continua ad ascoltare il giro.
   */
  giro?: GiroDaRiprendere
  /**
   * La finestra ha consegnato con «Riattacca»: il riquadro si riapre. Serve
   * perché `staccato: false` da solo non distingue il rientro dalla chiusura con
   * la crocetta, e una conversazione vuota è comunque una conversazione.
   */
  rientro?: boolean
}

/**
 * Come procede una conversazione: più eventi per domanda. Mentre si aspetta
 * conta `'attrezzo'`, che mostra le procedure aperte. Il testo arriva intero
 * (lo streaming resta spento con gli attrezzi in tavola: i `tool_calls`
 * spezzati confondono i modelli piccoli); `'pezzo'` è pronto per quando si
 * accenderà.
 */
export interface MessaggioAssistente {
  tipo: 'assistente'
  id: number
  evento: 'attrezzo' | 'risultato' | 'limite' | 'pezzo' | 'fine' | 'guasto'
  /**
   * Su `'limite'`: quante letture erano fatte quando il motore ha finito le
   * chiamate concesse; la pagina lo dice sotto la risposta.
   */
  chiamate?: number
  /** Su `'fine'`: vero se il motore ha finito le chiamate prima della risposta. */
  esaurito?: boolean
  /**
   * Su `'attrezzo'`: la procedura aperta e com'è andata. `messaggio` è il motivo
   * leggibile di un fallimento, da mostrare accanto (non in un `title`).
   */
  attrezzo?: { nome: string, ok: boolean, codice?: string, messaggio?: string }
  /** Su `'risultato'`: quel che quella procedura ha letto, già impaginato. */
  risultato?: RisultatoAssistente
  /**
   * Su `'fine'`: gli id incontrati, già uniti a quelli entrati; la pagina li
   * tiene nel turno e li rimanda con la domanda dopo. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /** Su `'pezzo'` e su `'fine'`: quel che il modello ha risposto. */
  testo?: string
  /** Su `'guasto'`: le frasi da mostrare, già tradotte. */
  errori?: string[]
}

/**
 * Un id incontrato leggendo, con il suo nome. Mai le cifre: un id è stabile,
 * una quota di assenza cambia all'appello dopo, e una cifra ricordata sarebbe
 * plausibile e sbagliata.
 */
export interface IdVisto {
  id: string
  /** Come si legge: «Bernasconi Elia», «DIC4a — Matematica». */
  nome: string
  /** Di che cosa è l'id: «allievo», «classe», «corso». */
  cosa: string
}

/**
 * Quel che una lettura ha letto, pronto da impaginare: i dati arrivano interi
 * alla pagina senza passare dal modello, che scrive solo introduzione e
 * commento. La forma la dichiara la procedura (`presentazione` in
 * `api/contract.ts`) e la costruisce `api/presentation.ts`.
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
   * Un elenco di frasi (rotture dell'integrità, fogli di un fascicolo).
   * `quante` e `troncata` come nella tabella, perché un elenco tagliato senza
   * dirlo sembra completo. Opzionali: senza, l'elenco non dichiara niente.
   */
  | { tipo: 'elenco', titolo?: string, voci: string[], quante?: number, troncata?: boolean }

/**
 * Quel che si è detto al microfono, da trascrivere. Non nomina una procedura e
 * non tocca l'archivio: la prende `panels/transcription.ts`, che parla con
 * voicebox. I campioni sono PCM 16 bit, 16 kHz, mono, già il formato di
 * Whisper; il WAV lo scrive chi li consegna. Fuori dalla coda delle scritture.
 */
export interface Dettatura {
  id: number
  campioni: Int16Array
  /** Sempre 16000: viaggia lo stesso, così chi riceve non lo suppone. */
  frequenza: number
}

/**
 * L'esito della trascrizione, uno per dettatura. `motivo` è la riga da mostrare
 * sotto la casella («non ho sentito niente»), non un codice.
 */
export interface MessaggioDettatura {
  tipo: 'dettatura'
  id: number
  ok: boolean
  testo?: string
  motivo?: string
}

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

export interface MessaggioStato {
  tipo: 'stato'
  registro: Registro
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
    invioDiretto: boolean
    /** L'indirizzo da cui si scrive: quello che le famiglie vedono in «Da». */
    mittente: string
    /**
     * Il nome d'accesso, quando è diverso dall'indirizzo (nelle scuole spesso una
     * sigla): scambiati, fanno rifiutare l'invio.
     */
    accesso: string
  }
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
  /** I fascicoli composti dell'anno, con la loro ricetta e l'ultimo rifacimento. */
  composizioni: Composizione[]
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
  | 'valutazioni'
  | 'check'
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
  /** Apre l'importazione da un altro registro, dopo aver creato un anno. */
  importa?: boolean
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
  | MessaggioNavigazione
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
