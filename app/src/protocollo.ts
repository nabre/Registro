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
  Impostazioni,
  Iso,
  LetteraSettimana,
  Lezione,
  Materia,
  MomentoValutazione,
  Ora,
  Osservazione,
  PianoLezione,
  Presenza,
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
} from './dominio/modelli.js'
import type {
  ContenutoProiezione,
  ImpostazioniProiezione,
  MiraProiezione,
} from './dominio/proiezione.js'

export type {
  BloccoProiezione,
  ContenutoProiezione,
  ImpostazioniProiezione,
  MiraProiezione,
} from './dominio/proiezione.js'

export type Azione =
  | { tipo: 'stato.leggi' }
  | { tipo: 'stato.ricarica' }
  | {
      tipo: 'anno.crea'
      inizio: Iso
      fine: Iso
      etichetta?: string
      confine?: Iso
      /** Le pause dichiarate nel modulo di creazione: nascono con l'anno, non dopo. */
      sospensioni?: Sospensione[]
    }
  | { tipo: 'anno.salva'; anno: AnnoScolastico }
  | { tipo: 'anno.elimina'; annoId: string }
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
  | { tipo: 'anno.seleziona'; annoId: string }
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
  | { tipo: 'presenze.imposta'; lezioneId: string; presenze: Presenza[] }
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
   * Un PDF di classe da dividere adesso: si sceglie il file e lo si dà a questa
   * richiesta. È la stessa cosa che succede lasciandolo nella cassetta
   * «in-arrivo», detta a voce invece che con un trascinamento — serve quando il
   * file è già da qualche altra parte e non lo si vuole spostare.
   */
  | { tipo: 'smistamento.carica'; consegnaId: string }
  /**
   * Un PDF trascinato dentro il pannello, con i suoi byte in codifica base64.
   *
   * Il contenuto viaggia dentro il messaggio perché il webview vive in una
   * sandbox: di un file trascinato conosce i byte e il nome, non dove stia sul
   * disco. L'host lo posa nella cassetta e da lì il giro è quello di sempre.
   */
  | { tipo: 'smistamento.deposita'; consegnaId: string; nome: string; contenuto: string }
  /**
   * Un blocco in quarantena assegnato a mano: queste pagine, a questa persona.
   * Le pagine si possono restringere — è il modo in cui si separa un documento
   * di due pagine che il registro aveva tenuto insieme — e quel che avanza
   * resta in quarantena.
   */
  | { tipo: 'smistamento.assegna'; smistamentoId: string; bloccoId: string; allievoId: string; da?: number; a?: number }
  /** Pagine che non interessano: via dalla quarantena senza finire da nessuno. */
  | { tipo: 'smistamento.scarta'; smistamentoId: string; bloccoId: string }
  /**
   * Mette in coda la lettura OCR di un blocco. Torna subito: la lettura vera
   * dura decine di secondi a pagina, e a raccontarla ci pensa l'avanzamento.
   */
  | { tipo: 'smistamento.leggi'; smistamentoId: string; bloccoId: string }
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
  | { tipo: 'smistamento.assegnaManuale'; smistamentoId: string; consegnaId: string; allievoId: string; da: number; a: number }
  /** Mette in coda tutte le pagine ancora da leggere di un PDF. */
  | { tipo: 'smistamento.leggiTutto'; smistamentoId: string }
  /** Svuota la coda di lettura: quel che si sta leggendo finisce la pagina. */
  | { tipo: 'smistamento.fermaLettura' }
  /** Prepara la fotografia della prima pagina di un blocco, per guardarla. */
  | { tipo: 'smistamento.anteprima'; smistamentoId: string; bloccoId: string }
  /** Apre in un lettore esterno solo le pagine di un blocco. */
  | { tipo: 'smistamento.apriBlocco'; smistamentoId: string; bloccoId: string }
  /** Dice a quale richiesta appartiene un PDF che non si era saputo agganciare. */
  | { tipo: 'smistamento.aggancia'; smistamentoId: string; consegnaId: string }
  /** Apre il PDF originale, per guardare com'è fatto. */
  | { tipo: 'smistamento.apri'; smistamentoId: string }
  /** Butta via tutto quel che resta di uno smistamento, file compreso. */
  | { tipo: 'smistamento.elimina'; smistamentoId: string }
  /** Apre la cassetta dei PDF in arrivo nel gestore file del sistema. */
  | { tipo: 'smistamento.apriCassetta' }
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
   * Un rapporto in PDF.
   *
   * Un'azione sola per tutti i rapporti: quel che cambia è il modello — un file
   * in `templates/` — e i dati che ci si mettono dentro. Sei azioni quasi
   * uguali sarebbero state sei posti in cui cambiare la stessa cosa.
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
   * Domanda a Outlook di chi è la casella, senza mandare niente.
   *
   * È la prova del collegamento: fin qui «il registro parla con Outlook» era
   * una cosa che si poteva verificare solo mandando una mail vera a qualcuno.
   * La risposta torna come messaggio, con l'indirizzo scritto dentro.
   */
  | { tipo: 'posta.prova' }
  /**
   * Collega la casella: chiede l'indirizzo e la password, prova, e salva solo
   * se il server accetta. La password non passa di qui — resta nell'host, che
   * la mette nel portachiavi del sistema. Il webview non la vede mai.
   */
  | { tipo: 'posta.collega' }
  /** Toglie la password dal portachiavi: si torna alle bozze. */
  | { tipo: 'posta.scollega' }
  | { tipo: 'sistema.messaggio'; livello: 'info' | 'avviso' | 'errore'; testo: string }
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

export type TipoAzione = Azione['tipo']

/** Una richiesta con il suo numero d'ordine: la risposta lo riporta identico. */
export interface Richiesta {
  id: number
  azione: Azione
}

export interface Risposta {
  tipo: 'risposta'
  id: number
  ok: boolean
  errori?: string[]
  /** Riferimento all'entità appena creata, per la vista che deve aprircisi sopra. */
  creato?: { id: string }
  /**
   * Quel che l'host vuole dire a chi ha chiesto: «12 lezioni aggiunte», «3
   * spediti, 1 indietro». Lo mostra il pannello come notifica, così tutte le
   * voci del registro parlano dallo stesso posto.
   */
  messaggio?: Messaggio
}

/** Una cosa da dire a chi guarda, con il tono giusto. */
export interface Messaggio {
  livello: 'info' | 'avviso' | 'errore'
  testo: string
}

/** Lo stato completo spinto dall'host: dopo ogni modifica e dopo ogni ricarica. */
export interface MessaggioStato {
  tipo: 'stato'
  registro: Registro
  avvisi: string[]
  /**
   * La cartella dei dati vista dal webview. Serve solo per le immagini: dentro
   * la sandbox un percorso di disco non si può caricare, ci vuole l'indirizzo
   * `registro://` che l'applicazione concede a quella cartella, e lo sa
   * soltanto il pannello.
   */
  radiceDati: string | null
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
    /** Vero dove Outlook si può comandare: Windows. */
    outlook: boolean
    /**
     * Vero quando la casella è collegata: l'indirizzo è scritto e la password
     * sta nel portachiavi. È la strada migliore delle due, e quella per cui il
     * registro sa che cosa è partito e che cosa no.
     */
    exchange: boolean
    /** Il server a cui si consegna, per la scheda che lo dice. */
    server: string
    /** Come si entra: con l'account Microsoft, o con una password. */
    modo: 'oauth' | 'password'
    invioDiretto: boolean
    mittente: string
  }
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
export type Vista =
  | 'calendario'
  | 'todo'
  | 'lezione'
  | 'classi'
  | 'allievo'
  | 'docenteClasse'
  | 'corsi'
  | 'piani'
  | 'valutazioni'
  | 'documenti'
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

export interface MessaggioNotifica {
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
export interface MessaggioLavoro {
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
  | Risposta
