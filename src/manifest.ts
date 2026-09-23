// Che cosa il registro sa fare e che cosa si può regolare: l'elenco dei
// comandi e lo schema delle impostazioni, in un posto solo.
//
// Prima queste due cose stavano in `contributes` dentro `package.json`, perché
// era di lì che VS Code le leggeva, ed esbuild le iniettava nei bundle a build
// time con tre `define`. Senza più l'editor di mezzo, `package.json` è tornato
// a essere quel che è — il manifesto di un pacchetto npm — e questo è un modulo
// TypeScript come gli altri: si importa, si tipizza, e chi sbaglia una chiave
// lo scopre da `tsc` invece che da una voce di menu che non fa niente.
//
// Resta la regola di prima, che era la ragione dei `define`: **questo è
// l'unico elenco**. Il menu dell'applicazione, la finestra delle impostazioni e
// i valori predefiniti nascono tutti da qui. Due elenchi da tenere allineati
// divergono in pochi mesi, e la divergenza si scopre dal comportamento.

import { PIF, il } from './domain/lexicon.js'

// ------------------------------------------------------------------ i comandi

export interface Comando {
  /** L'identificatore con cui lo si invoca: `registroDocenti.apri`. */
  readonly id: string
  /** Come si legge nel menu. Senza il prefisso «Registro:»: il menu è già suo. */
  readonly titolo: string
  /**
   * La scorciatoia nella grafia di Electron — `CommandOrControl+Alt+R` — o
   * niente. `CommandOrControl` e non `Control`: su macOS chi insegna prova il
   * tasto mela, e scritta `Control` la scorciatoia lì non risponderebbe.
   */
  readonly scorciatoia?: string
}

/**
 * Tutti i comandi del registro, nell'ordine in cui sono nati.
 *
 * L'ordine dei menu non è questo: sta in `GRUPPI`, dentro `shell/windows/menu.ts`,
 * perché è una scelta di presentazione e non un fatto del registro. Un comando
 * aggiunto qui e non nominato là non sparisce — finisce sotto «Altro».
 */
export const COMANDI: readonly Comando[] = [
  { id: 'registroDocenti.apri', titolo: 'Mostra il registro', scorciatoia: 'CommandOrControl+Alt+R' },
  { id: 'registroDocenti.guida', titolo: 'Guida' },
  { id: 'registroDocenti.impostazioni', titolo: 'Impostazioni', scorciatoia: 'CommandOrControl+,' },
  { id: 'registroDocenti.proietta', titolo: 'Proietta per la classe' },
  { id: 'registroDocenti.agenda', titolo: 'Agenda sul desktop', scorciatoia: 'CommandOrControl+Alt+A' },
  { id: 'registroDocenti.oggi', titolo: 'Oggi', scorciatoia: 'CommandOrControl+Alt+T' },
  { id: 'registroDocenti.nuovaLezione', titolo: 'Nuova lezione', scorciatoia: 'CommandOrControl+Alt+N' },
  { id: 'registroDocenti.nuovaClasse', titolo: 'Nuova classe' },
  { id: 'registroDocenti.nuovoCorso', titolo: 'Nuovo corso (una materia a una classe)' },
  { id: 'registroDocenti.avvio', titolo: 'Avvio guidato' },
  { id: 'registroDocenti.nuovoPiano', titolo: 'Nuovo piano lezione' },
  { id: 'registroDocenti.nuovaValutazione', titolo: 'Nuovo momento di valutazione' },
  { id: 'registroDocenti.nuovoAnno', titolo: 'Nuovo anno scolastico' },
  { id: 'registroDocenti.ricarica', titolo: 'Ricarica i dati' },
  { id: 'registroDocenti.chiudiDocumento', titolo: 'Chiudi l’anno' },
  { id: 'registroDocenti.provaPosta', titolo: 'Prova il collegamento della posta' },
  { id: 'registroDocenti.provaInvioPosta', titolo: 'Manda una mail di prova' },
  { id: 'registroDocenti.collegaPosta', titolo: 'Collega la casella di posta' },
  { id: 'registroDocenti.scollegaPosta', titolo: 'Scollega la casella di posta' },
  { id: 'registroDocenti.azzeraPosta', titolo: 'Azzera la posta (portachiavi, memoria, impostazioni)' },
  { id: 'registroDocenti.apriCartellaDati', titolo: 'Apri la cartella dei dati' },
]

// ------------------------------------------------------------- le impostazioni

/** Una scelta fra le poche possibili, con il perché accanto. */
export interface Scelta {
  readonly valore: string | number
  readonly aiuto: string
}

export interface VoceImpostazione {
  readonly tipo: 'string' | 'number' | 'boolean'
  readonly predefinito: string | number | boolean
  /**
   * Il testo che si legge sotto il campo. Sono discorsivi apposta: chi apre le
   * impostazioni di solito non sa già che cosa cerca, e un'etichetta di tre
   * parole gli direbbe soltanto il nome della cosa che non ha capito.
   */
  readonly descrizione: string
  /** Le sole risposte accettate, se sono poche e note. */
  readonly scelte?: readonly Scelta[]
  /**
   * Una forma più stretta del tipo: per ora solo `email`.
   *
   * Non è un suggerimento per il campo, è una **dogana**: `valoreAccettabile`
   * la fa rispettare, e quindi vale anche per chi scrive dalla riga di comando.
   * Era soltanto un `type="email"` nella finestra nativa, e da ogni altra parte
   * `posta.mittente = "pippo"` entrava senza una parola — per riemergere mesi
   * dopo come un rifiuto del server di posta, che è il posto peggiore in cui
   * scoprire un refuso.
   *
   * Il vuoto resta lecito: è il predefinito, e vuol dire «l'altro».
   */
  readonly formato?: 'email'
  /**
   * Gli estremi di un numero, quando fuori di lì non vuol dire niente.
   *
   * Sono una dogana come `scelte`, e per la stessa ragione: senza, un −30 in
   * «minuti di anticipo» si salvava, restava scritto nel campo, e a valle
   * veniva stretto in silenzio da un `Math.max`. Il docente leggeva un numero
   * che non aveva nessun effetto e niente gli diceva perché. Quei `Math.max`
   * restano dove sono — sono la rete, non la dogana.
   */
  readonly minimo?: number
  readonly massimo?: number
  /**
   * Non è una scelta da offrire: è **stato**, e lo scrive il programma.
   *
   * Dove sta l'agenda, quanto è larga, quale linguetta era premuta: le scrive
   * il trascinamento del widget, e battute a mano non hanno effetto finché
   * l'agenda non si riapre. Restano nel manifesto — sono chiavi vere, con un
   * predefinito e una dogana, e `valoreAccettabile` le accetta perché è di lì
   * che il widget le scrive — ma non compaiono in nessuna delle due superfici:
   * le salta `vociImpostazioni()`, che è l'unico posto da cui tutte e due
   * prendono l'elenco.
   */
  readonly nascosta?: boolean
  /**
   * Si tocca una volta ogni tre anni: sta in fondo alla sua sezione, in un
   * gruppo che si apre.
   *
   * Sono i percorsi degli eseguibili e le attese massime. Non sono meno
   * importanti — un percorso sbagliato ferma la dettatura — ma in fila con il
   * tema fanno sembrare lunga e tecnica una pagina che per il resto si legge
   * in un minuto.
   */
  readonly avanzata?: boolean
  /**
   * La chiave booleana che deve essere accesa perché questa conti.
   *
   * Non è un vezzo dell'interfaccia: è il modo in cui una concessione fatta di
   * più voci si spegne tutta insieme. Il registro la legge — chi decide i
   * permessi del condotto guarda prima il padre — e la pagina delle
   * impostazioni la mostra: figlia disabilitata e **non spuntata** finché il
   * padre è spento, perché una casella accesa sotto un interruttore spento
   * direbbe che qualcosa è concesso quando non lo è, e in una pagina che
   * governa un accesso quella è la bugia che conta.
   *
   * Il valore scritto resta dov'è: riacceso il padre, le figlie tornano come
   * erano. Spegnere per un pomeriggio non deve costare il doverle ricomporre.
   */
  readonly dipendeDa?: string
}

/**
 * Le chiavi restano piatte e puntate — `registroDocenti.posta.mittente` — ed è
 * la forma in cui il registro le chiede:
 * `apparato.impostazioni.leggi('registroDocenti.posta')` più `get('mittente')`.
 * Cambiare la forma vorrebbe dire toccare i venti punti
 * che leggono un'impostazione, per guadagnarci niente.
 */
export const IMPOSTAZIONI: Readonly<Record<string, VoceImpostazione>> = {
  'registroDocenti.aperturaAutomatica': {
    tipo: 'boolean',
    predefinito: true,
    descrizione:
      'Apre il registro all’avvio dell’applicazione quando la cartella dei dati esiste. Spento, ' +
      'l’applicazione parte senza finestre e il registro si apre dal menu.',
  },
  'registroDocenti.vassoio.attivo': {
    tipo: 'boolean',
    predefinito: true,
    descrizione:
      'Tiene un’icona del registro accanto all’orologio. Il suo menu elenca i corsi dell’anno e, ' +
      'dentro ognuno, le ore divise fra svolte, da chiudere, in corso e in programma: si apre con ' +
      'il tasto destro e porta sull’ora con un clic. Da lì passa anche l’uscita dall’applicazione. ' +
      'Cambiandola, ha effetto al prossimo avvio: l’icona decide anche che cosa fa la X delle ' +
      'finestre, e spostarla a metà sessione cambierebbe quel gesto sotto le mani.',
  },
  'registroDocenti.vassoio.chiusuraNelVassoio': {
    tipo: 'boolean',
    predefinito: true,
    descrizione:
      'Chiudendo l’ultima finestra il registro resta acceso accanto all’orologio invece di uscire, ' +
      'e si riapre con un clic sull’icona. Si esce con «Esci dal registro», nel menu dell’icona. ' +
      'Spento, la X chiude l’applicazione come prima. Senza icona nel vassoio non ha effetto.',
  },
  'registroDocenti.agenda.attiva': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Tiene la settimana appesa al bordo destro del desktop: una striscia con le ore di ogni ' +
      'giorno, che si preme per aprire il registro su quell’ora. È agganciata come la barra ' +
      'delle applicazioni — le icone del desktop le fanno posto, «Mostra desktop» non la ' +
      'nasconde e una finestra massimizzata si ferma al suo bordo. Solo su Windows.',
  },
  'registroDocenti.agenda.scheda': {
    tipo: 'string',
    predefinito: 'calendario',
    nascosta: true,
    scelte: [
      { valore: 'calendario', aiuto: 'Calendario: il mese in testa e la settimana sotto, ora per ora.' },
      { valore: 'pendenze', aiuto: 'Pendenze: le ore rimaste aperte, e quel che ogni classe aspetta.' },
      { valore: 'lezione', aiuto: 'Lezione: l’ora di adesso, con l’appello e l’argomento da scrivere.' },
    ],
    descrizione:
      'Con quale delle tre schede l’agenda si riapre. La scrive la linguetta premuta: si cambia ' +
      'scheda nel widget, non qui, e questa riga è solo il posto dove la scelta resta scritta ' +
      'fra un avvio e l’altro.',
  },
  'registroDocenti.agenda.ancorata': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Incolla l’agenda al bordo destro dello schermo come una barra di sistema. Agganciata, le ' +
      'icone del desktop le fanno posto e una finestra massimizzata si ferma al suo bordo; in ' +
      'cambio non la si può più spostare dove si vuole. Spenta, l’agenda è un riquadro libero: ' +
      'si trascina per la testata e sta dove la si lascia.',
  },
  'registroDocenti.agenda.celle': {
    tipo: 'number',
    predefinito: 3,
    nascosta: true,
    minimo: 1,
    descrizione:
      'Quanto è larga la striscia dell’agenda, contata in colonne di icone del desktop. Si ' +
      'cambia trascinandone il bordo sinistro, e scatta di colonna in colonna: così il suo ' +
      'bordo cade dove cadrebbe comunque quello di una colonna di icone. Il numero scritto qui ' +
      'è quello dell’ultimo trascinamento.',
  },
  'registroDocenti.agenda.celleAltezza': {
    tipo: 'number',
    predefinito: 0,
    nascosta: true,
    minimo: 0,
    descrizione:
      'Quanto è alta la striscia dell’agenda, contata in righe di icone del desktop. Zero vuol ' +
      'dire alta quanto lo schermo, che è come sta una barra agganciata. Si cambia trascinandone ' +
      'il bordo di sotto, e scatta di riga in riga; trascinata fino in fondo torna a zero.',
  },
  'registroDocenti.agenda.colonna': {
    tipo: 'number',
    predefinito: -1,
    nascosta: true,
    // −1 è un valore vero e non un errore: vuol dire «mai spostata».
    minimo: -1,
    descrizione:
      'Dove sta l’agenda libera, contata in colonne di icone dal bordo sinistro dello schermo. ' +
      'La scrive il trascinamento; −1 vuol dire «mai spostata», e allora l’agenda si mette in ' +
      'alto a destra.',
  },
  'registroDocenti.agenda.riga': {
    tipo: 'number',
    predefinito: -1,
    nascosta: true,
    minimo: -1,
    descrizione:
      'Dove sta l’agenda libera, contata in righe di icone dal bordo alto dello schermo. Come ' +
      'sopra: la scrive il trascinamento, e −1 vuol dire «mai spostata».',
  },
  'registroDocenti.avvio.conWindows': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Accende il registro insieme al computer, senza aprire nessuna finestra: restano l’icona ' +
      'accanto all’orologio e — se accesa — l’agenda sul desktop. Vale solo per l’applicazione ' +
      'installata: in sviluppo non si tocca la voce d’avvio di Windows.',
  },
  'registroDocenti.avvio.soloVassoio': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Parte senza aprire il registro, anche lanciandolo a mano: si trova l’icona accanto ' +
      'all’orologio e l’agenda sul desktop, e la finestra si apre quando la si chiede. Se non ' +
      'c’è né icona né agenda la finestra si apre lo stesso — un’applicazione viva e invisibile ' +
      'non si riprenderebbe più.',
  },
  'registroDocenti.aspetto.tema': {
    tipo: 'string',
    predefinito: 'sistema',
    // L'aiuto di una scelta è anche la sua etichetta: la finestra delle
    // impostazioni lo mette dentro l'`<option>`, perché è mentre si sceglie che
    // serve saperlo. Va quindi scritto in modo da leggersi da solo, con il nome
    // della scelta davanti — è la forma che hanno tutte le altre.
    scelte: [
      { valore: 'sistema', aiuto: 'Sistema: chiaro o scuro come Windows, e cambia insieme a lui.' },
      { valore: 'chiaro', aiuto: 'Chiaro: sempre, anche di sera. È quello che si legge meglio proiettato.' },
      { valore: 'scuro', aiuto: 'Scuro: sempre, anche di giorno.' },
    ],
    descrizione:
      'Chiaro o scuro. Vale per il registro, per lo schermo della classe e per questa finestra. ' +
      '«Sistema» segue l’impostazione di Windows e cambia da sé quando cambia lei.',
  },
  'registroDocenti.promemoria.attivo': {
    tipo: 'boolean',
    predefinito: true,
    descrizione:
      'Avvisa con una notifica del sistema poco prima che una lezione cominci, dicendo quale ' +
      'classe e che cosa resta aperto per quel corso. La notifica si preme e apre il registro ' +
      'di quell’ora. Non arriva mentre si sta già guardando il registro, e non arriva due volte ' +
      'per la stessa ora.',
  },
  'registroDocenti.promemoria.anticipoMinuti': {
    tipo: 'number',
    predefinito: 5,
    minimo: 0,
    // Due ore: oltre non è più un promemoria della lezione, è un promemoria
    // della mattinata — e chi lo scriveva per sbaglio si ritrovava l'avviso
    // dell'ora dopo mentre ne stava facendo un'altra.
    massimo: 120,
    descrizione:
      'Quanti minuti prima dell’inizio arriva l’avviso. Cinque è il tempo di prendere il ' +
      'computer e salire una rampa di scale; zero lo fa arrivare all’ora esatta. Un’ora già ' +
      'cominciata si annuncia ancora per un quarto d’ora — serve al portatile riaperto in aula.',
  },
  'registroDocenti.proiezione.schermoIntero': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Mette la finestra della proiezione a schermo intero appena aperta. Utile quando il secondo ' +
      'schermo è solo il proiettore; da spegnere se la si tiene accanto al registro.',
  },
  'registroDocenti.posta.mittente': {
    tipo: 'string',
    predefinito: '',
    formato: 'email',
    descrizione:
      'L’indirizzo da cui si scrive, quello che le famiglie vedono in «Da» e a cui rispondono: per ' +
      'esempio nome.cognome@edu.ti.ch. Non è una credenziale. Vale in tutti e due i casi — il ' +
      'server e il file .eml — e serve anche perché una comunicazione tutta in copia nascosta ' +
      'abbia qualcuno nel campo «A». Vuoto vuol dire «lo stesso del nome di accesso».',
  },
  'registroDocenti.posta.utente': {
    tipo: 'string',
    predefinito: '',
    // È un indirizzo quanto il mittente — `xxx000@edu.ti.ch` — e non lo
    // dichiarava: la dogana lasciava passare una sigla senza dominio, che il
    // server rifiuta all'invio e non un minuto prima.
    formato: 'email',
    descrizione:
      'Il nome con cui il registro entra nella casella: nel tenant di una scuola è la sigla che dà ' +
      'l’amministrazione, per esempio xxx000@edu.ti.ch, diversa dall’indirizzo con nome e cognome. ' +
      'Vuoto vuol dire «lo stesso del mittente». Quel che apre la casella non sta qui — sta nel ' +
      'portachiavi del sistema, e ce lo mette il comando «Collega la casella di posta».',
  },
  'registroDocenti.posta.invioDiretto': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Spedisce le comunicazioni da sé invece di preparare una bozza da rileggere e mandare a mano. ' +
      'Vuole la casella collegata: senza, non c’è niente da cui far partire qualcosa, e le ' +
      'comunicazioni restano bozze comunque. Prima di ogni giro il registro chiede conferma, e ' +
      'quel che parte non si può richiamare.',
  },
  'registroDocenti.recapiti.telefono': {
    tipo: 'string',
    predefinito: 'tel',
    scelte: [
      { valore: 'tel', aiuto: 'tel: — il programma che Windows tiene per le chiamate (Collegamento al telefono, Teams, Skype).' },
      { valore: 'callto', aiuto: 'callto: — il vecchio schema di Skype, per chi ha ancora quello registrato.' },
      { valore: 'skype', aiuto: 'skype: — chiama con Skype, saltando la scelta del sistema.' },
      { valore: 'msteams', aiuto: 'msteams: — chiama con Teams, saltando la scelta del sistema.' },
      { valore: 'nessuno', aiuto: 'Nessuno: i numeri restano scritti e si copiano, come prima.' },
    ],
    descrizione:
      'Con che cosa si compone un numero premuto nell’anagrafica. «tel:» è la scelta giusta quasi ' +
      'sempre — lo consegna al programma che il sistema tiene per le chiamate — ma su una macchina ' +
      'dove nessuno l’ha registrato non apre niente: lì si nomina il programma, oppure si mette ' +
      '«nessuno» e i numeri tornano a essere solo da leggere e da copiare.',
  },
  'registroDocenti.recapiti.posta': {
    tipo: 'string',
    predefinito: 'sistema',
    scelte: [
      { valore: 'sistema', aiuto: 'Il programma predefinito — «mailto:», cioè quello che il sistema tiene per la posta.' },
      { valore: 'outlook', aiuto: 'Outlook — lo apre anche quando il predefinito è un altro programma.' },
      { valore: 'outlookWeb', aiuto: 'Outlook sul web — apre la composizione di outlook.office.com nel browser.' },
      { valore: 'nessuno', aiuto: 'Nessuno: gli indirizzi restano scritti e si copiano, come prima.' },
    ],
    descrizione:
      'Con che cosa si apre una mail nuova premendo un indirizzo nell’anagrafica. «Outlook» è la ' +
      'scelta da fare quando Outlook c’è ma il predefinito è un altro — un browser che si è preso ' +
      'l’associazione, un client installato una volta e mai più aperto — perché scrivere da un ' +
      'programma diverso vuol dire scrivere da un’altra casella. Non riuscendo ad aprirlo il ' +
      'registro ripiega sul predefinito e lo dice.',
  },
  'registroDocenti.recapiti.outlook': {
    tipo: 'string',
    predefinito: '',
    avanzata: true,
    descrizione:
      'Dove sta OUTLOOK.EXE, quando il registro non riesce a trovarlo da sé. Vuoto — il caso ' +
      'normale — lo cerca dove Office si installa e, non trovandolo, lo chiede a Windows. Si ' +
      'riempie solo su una macchina con Office in un posto suo: è il percorso intero del file, ' +
      'quello che si legge nelle proprietà del collegamento a Outlook. Serve soltanto con ' +
      '«Outlook» qui sopra.',
  },
  'registroDocenti.modelli.cartella': {
    tipo: 'string',
    predefinito: '',
    descrizione:
      'Dove il registro tiene i modelli del linguaggio — i file .gguf che scarica o che ci si ' +
      'trascina dentro. Vuoto — il caso normale — li tiene accanto alle impostazioni del ' +
      'programma. Si riempie con il percorso intero di una cartella per due motivi: tenerli su ' +
      'un altro disco, perché pesano gigabyte, oppure usare quelli che si hanno già, scaricati ' +
      'con un altro programma. Indicando una cartella che ne contiene, il registro li vede ' +
      'tutti e non ne copia nessuno.',
  },
  'registroDocenti.ocr.attivo': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Legge con un modello locale le pagine dei PDF che non contengono testo (scansioni), per ' +
      `riconoscere ${il(PIF)}. Vuole due cose, e se le procura in due modi diversi: un ` +
      'modello che sappia guardare, che si sceglie dalla pagina «Modelli linguistici» perché ' +
      'quale ci stia su questa macchina lo sai solo tu, e il programma «llama-mtmd-cli», che ' +
      'invece è sempre lo stesso e se lo scarica il registro alla prima pagina.',
  },
  'registroDocenti.ocr.modello': {
    tipo: 'string',
    predefinito: '',
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Il file .gguf con cui si leggono le scansioni: deve essere un modello che sappia ' +
      'guardare le immagini. Si sceglie dalla pagina «Modelli linguistici», che è anche il ' +
      'posto da cui si scarica.',
  },
  'registroDocenti.ocr.proiettore': {
    tipo: 'string',
    predefinito: '',
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Il secondo file del modello che guarda — quello con «mmproj» nel nome —, che trasforma ' +
      'l’immagine in qualcosa che il modello sappia leggere. Senza, il programma parte, ignora ' +
      'la pagina e risponde immaginando: è il guasto peggiore, perché non sembra un guasto. Lo ' +
      'scarica insieme al modello la pagina «Modelli linguistici».',
  },
  'registroDocenti.ocr.scaricoAutomatico': {
    tipo: 'boolean',
    predefinito: true,
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Alla prima pagina da leggere, se «llama-mtmd-cli» non c’è ancora, il registro se lo ' +
      'prende da sé: una ventina di megabyte, una volta sola, in una cartella sua dentro i ' +
      'dati dell’applicazione — non installa niente e non tocca nient’altro della macchina. ' +
      'Di quel che scarica controlla l’impronta prima di farlo partire, e la versione di ' +
      'llama.cpp è fissata nel programma, non «l’ultima». Scarica la versione senza scheda ' +
      'video, che è la sola che funzioni dappertutto: chi ha una scheda e la vuole usare ' +
      'prende la sua e ne scrive il percorso qui sotto. I modelli non c’entrano — quelli si ' +
      'scelgono dalla pagina «Modelli linguistici», perché quale ci stia su questa macchina ' +
      'non lo può decidere il registro.',
  },
  'registroDocenti.ocr.programma': {
    tipo: 'string',
    predefinito: '',
    avanzata: true,
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Dove sta «llama-mtmd-cli.exe», con il percorso intero. Lasciandolo vuoto se ne occupa ' +
      'il registro, se lo scarico automatico è acceso; si compila per usare una copia che si ' +
      'ha già — compilata, o con l’accelerazione della propria scheda video — e allora vince ' +
      'questa. È il programma di llama.cpp per i modelli che guardano e si scarica da ' +
      'github.com/ggml-org/llama.cpp. Serve solo per le scansioni: l’assistente non ne ha ' +
      'bisogno, perché il suo modello gira dentro il registro. Il registro fa partire ' +
      'esattamente questo programma e nient’altro: dev’essere un .exe, non uno script .bat o ' +
      '.cmd, e non un collegamento.',
  },
  'registroDocenti.ocr.cartella': {
    tipo: 'string',
    predefinito: '',
    avanzata: true,
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Dove il registro tiene il programma che scarica da sé. Vuoto vuol dire una cartella ' +
      '«lettura» dentro i dati dell’applicazione; si cambia per tenerlo su un altro disco, e ' +
      'ci vuole un percorso intero. Non è dove stanno i modelli — quella è ' +
      '«registroDocenti.modelli.cartella» — e non è dove cercare un programma scaricato da ' +
      'te: quello si dice con la voce qui sopra.',
  },
  'registroDocenti.ocr.attesaMassimaSecondi': {
    tipo: 'number',
    predefinito: 180,
    avanzata: true,
    // «Sotto i dieci secondi il registro non va»: la dice la descrizione, e
    // adesso lo dice anche la dogana. Mezz'ora è il tetto oltre il quale non si
    // sta più aspettando una pagina, si sta aspettando che qualcosa si sblocchi.
    minimo: 10,
    massimo: 1800,
    dipendeDa: 'registroDocenti.ocr.attivo',
    descrizione:
      'Quanti secondi aspettare la lettura di una pagina prima di rinunciare. Su una macchina ' +
      'senza scheda video un modello che guarda impiega fra i trenta secondi e i due minuti a ' +
      'pagina. Sotto i dieci secondi il registro non va, comunque sia scritto qui: un’attesa ' +
      'più corta non è una configurazione, è un modo di non leggere mai niente.',
  },
  'registroDocenti.assistente.attivo': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Accende la pagina «Assistente»: si scrive una domanda in italiano — «quante ore ha ' +
      'perso la 4a in matematica?» — e un modello che gira sulla tua macchina la risponde ' +
      'leggendo il registro. Può soltanto leggere: non segna, non corregge e non manda ' +
      'niente a nessuno, e non c’è nessuna impostazione per concederglielo. Il modello è un ' +
      'file che sta sul tuo computer e si scarica dalla pagina «Modelli linguistici»: non ' +
      'serve installare nessun altro programma, e niente di quel che si chiede esce di qui.',
  },
  'registroDocenti.assistente.modello': {
    tipo: 'string',
    predefinito: '',
    dipendeDa: 'registroDocenti.assistente.attivo',
    descrizione:
      'Il file .gguf con cui risponde l’assistente: deve saper chiamare gli strumenti «tool ' +
      'calling». Sotto i 3 miliardi di parametri quella capacità diventa inaffidabile, e ' +
      'l’assistente comincia a inventarsi i nomi delle procedure invece di aprirle. Si sceglie ' +
      'dalla pagina «Modelli linguistici», che ne consiglia due e li scarica.',
  },
  'registroDocenti.assistente.attesaMassimaSecondi': {
    tipo: 'number',
    predefinito: 120,
    avanzata: true,
    minimo: 10,
    massimo: 1800,
    dipendeDa: 'registroDocenti.assistente.attivo',
    descrizione:
      'Quanti secondi aspettare prima di rinunciare. Valgono due volte e non una: una per ' +
      'caricare il modello, una per la risposta, che comincia quando il modello è pronto — ' +
      'così il tempo del disco non viene tolto a quello della domanda, e la prima domanda ' +
      'dopo l’avvio non scade mentre i pesi si stanno ancora leggendo. Un giro non è una ' +
      'risposta: l’assistente apre le procedure una dopo l’altra e poi scrive, e su una ' +
      'macchina senza scheda video una domanda che tocca tre classi ci mette più di una che ' +
      'ne tocca una. Sotto i dieci secondi il registro non va, comunque sia scritto qui.',
  },
  'registroDocenti.dettatura.attivo': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Mette un microfono accanto alla casella dell’assistente: si tiene premuto, si dice la ' +
      'domanda, e quel che si è detto viene scritto nella casella — dove si rilegge e si ' +
      'corregge prima di mandarla. Riconosce l’italiano, sulla tua macchina e senza rete: ' +
      'servono whisper.cpp e il suo modello, che la prima volta il registro si scarica da sé ' +
      '— 580 MB, una volta sola. La voce non esce dal computer e il file audio viene ' +
      'cancellato appena la frase è scritta.',
  },
  'registroDocenti.dettatura.scaricoAutomatico': {
    tipo: 'boolean',
    predefinito: true,
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'La prima volta che detti, se il programma e il modello non ci sono ancora, il registro ' +
      'se li prende da sé: sono 580 MB in tutto, scendono una volta sola e finiscono in una ' +
      'cartella sua, dentro i dati dell’applicazione — non installa niente e non tocca nient’' +
      'altro della macchina. Di quel che scarica controlla l’impronta prima di farlo partire, ' +
      'e la versione di whisper.cpp è fissata nel programma, non «l’ultima». Spegnilo se ' +
      'preferisci scaricarli a mano e scrivere i percorsi qui sotto, o se sei su una ' +
      'connessione a consumo.',
  },
  'registroDocenti.dettatura.programma': {
    tipo: 'string',
    predefinito: '',
    avanzata: true,
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'Dove sta «whisper-cli.exe», con il percorso intero. Lasciandolo vuoto se ne occupa il ' +
      'registro, se lo scarico automatico è acceso; si compila qui per usare una copia che si ' +
      'ha già, e allora vince questa. Si scarica da github.com/ggml-org/whisper.cpp — la ' +
      'versione già compilata per Windows va bene. Il registro fa partire esattamente questo ' +
      'programma e nient’altro: dev’essere un .exe, non uno script .bat o .cmd, e non un ' +
      'collegamento.',
  },
  'registroDocenti.dettatura.modello': {
    tipo: 'string',
    predefinito: '',
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'Dove sta il modello che riconosce la voce, con il percorso intero: uno dei file «ggml» ' +
      'di whisper. Vuoto vuol dire quello che scarica il registro, cioè ' +
      '«ggml-large-v3-turbo-q5_0.bin», che per l’italiano è il più accurato fra quelli che ' +
      'vanno veloci anche senza scheda video; «ggml-medium.bin» capisce quasi come lui e ' +
      'impiega il doppio; i modelli «small» e «base» sbagliano i cognomi e la punteggiatura ' +
      'abbastanza da far rileggere ogni frase.',
  },
  'registroDocenti.dettatura.cartella': {
    tipo: 'string',
    predefinito: '',
    avanzata: true,
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'Dove il registro tiene il programma e il modello che scarica da sé. Vuoto vuol dire ' +
      'una cartella «dettatura» dentro i dati dell’applicazione; si cambia per tenerli su un ' +
      'altro disco, e ci vuole un percorso intero. Non è dove cercare i file che hai ' +
      'scaricato tu: quelli si dicono con le due voci qui sopra.',
  },
  'registroDocenti.dettatura.durataMassimaSecondi': {
    tipo: 'number',
    predefinito: 60,
    avanzata: true,
    // Gli stessi due estremi che la descrizione dichiara da sempre.
    minimo: 5,
    massimo: 300,
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'Quanti secondi di voce al massimo si trascrivono. Quel che si dice oltre viene tagliato: ' +
      'è la rete per il microfono lasciato acceso, non un limite alla domanda. Sotto i cinque ' +
      'secondi e sopra i cinque minuti il registro non va, comunque sia scritto qui.',
  },
  'registroDocenti.dettatura.attesaMassimaSecondi': {
    tipo: 'number',
    predefinito: 120,
    avanzata: true,
    minimo: 10,
    massimo: 1800,
    dipendeDa: 'registroDocenti.dettatura.attivo',
    descrizione:
      'Quanti secondi aspettare che la trascrizione finisca prima di rinunciare. Su una ' +
      'macchina senza scheda video un modello grande impiega più o meno quanto dura quel che ' +
      'si è detto, a volte il doppio.',
  },
  'registroDocenti.api.condotto': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Fa rispondere il registro anche fuori dalle sue finestre, su un condotto locale — una ' +
      '«named pipe» su Windows — così che il comando «regdoc» e uno script possano parlargli ' +
      'senza aprire il pannello. Non apre nessuna porta di rete e non esce dalla macchina. È ' +
      'l’interruttore generale: spento non c’è niente in ascolto, e le due voci qui sotto non ' +
      'valgono. Acceso, però, ogni programma che gira con il tuo stesso accesso può usarlo ' +
      'senza chiedertelo — quanto, lo dicono le due voci qui sotto. Accendilo se ti serve ' +
      'davvero, e spegnilo quando hai finito.',
  },
  'registroDocenti.api.lettura': {
    tipo: 'boolean',
    predefinito: true,
    dipendeDa: 'registroDocenti.api.condotto',
    descrizione:
      'Lascia che dal condotto si guardi: presenze, assenze, medie, calendario, i dati delle ' +
      'persone in formazione già calcolati, senza dover aprire il documento. È la concessione ' +
      'che serve quasi sempre, e da sola non lascia cambiare niente. Non è però innocua: quel ' +
      'che esce di qui sono dati di persone, e ogni programma che gira con il tuo accesso può ' +
      'chiederli.',
  },
  'registroDocenti.api.scrittura': {
    tipo: 'boolean',
    predefinito: false,
    dipendeDa: 'registroDocenti.api.condotto',
    descrizione:
      'Lascia che dal condotto si scriva e non solo si legga: segnare un appello, mettere un ' +
      'voto, creare una lezione, far partire posta a tuo nome. È la concessione che non si ' +
      'disfa — quel che uno script scrive per sbaglio resta scritto — e per questo sta staccata ' +
      'dalla lettura. Accendila solo per il tempo che serve a quello script.',
  },
}

/**
 * Una voce come la guarda la regola qui sotto: il nome, il valore di adesso e
 * il padre dichiarato.
 *
 * È la parte in comune fra la riga del manifesto e la voce che viaggia verso
 * le due superfici, scritta a parte perché la regola si applichi all'una e
 * all'altra senza che il manifesto debba conoscere il protocollo.
 */
interface VoceConPadre {
  readonly chiave: string
  readonly valore: unknown
  readonly dipendeDa?: string | null
}

/**
 * Se una voce è sospesa: dichiara un padre — `dipendeDa` — e quel padre è
 * spento.
 *
 * Sta qui, accanto alla dichiarazione del padre, e non nella pagina che la
 * disegna: le superfici sono due — il pannello e la finestra nativa — e la
 * seconda è una pagina HTML senza import, che di questa regola può solo
 * ricevere il risultato. Finché la regola stava dentro il pannello, la
 * finestra nativa mostrava `api.lettura` spuntata e modificabile con il
 * condotto spento: una pagina che governa un accesso dichiarava concessa una
 * cosa che il condotto non concede. Adesso l'applica `vociImpostazioni()`, che
 * è l'unico posto da cui tutte e due prendono l'elenco.
 *
 * Il padre che non c'è lascia libera la figlia. Un refuso nel manifesto deve
 * costare una voce che si può toccare quando non dovrebbe, non una pagina in
 * cui non si tocca più niente e non si capisce perché.
 */
export function sospesa (voce: VoceConPadre, tutte: readonly VoceConPadre[]): boolean {
  if (!voce.dipendeDa) return false
  const padre = tutte.find((altra) => altra.chiave === voce.dipendeDa)
  return padre !== undefined && !padre.valore
}

/**
 * Le chiavi che sono stato e non scelta: quelle che nessuna superficie mostra.
 *
 * Serve a chi offre di rimetterle a posto tutte insieme — il pulsante che
 * riporta l'agenda dov'è nata. Ricavato di qui e non riscritto là: una sesta
 * chiave di posa aggiunta domani entrerebbe nell'elenco da sola, mentre un
 * elenco a mano resterebbe di cinque e il pulsante mentirebbe per metà.
 */
export function chiaviNascoste (): string[] {
  return Object.entries(IMPOSTAZIONI)
    .filter(([, voce]) => voce.nascosta)
    .map(([chiave]) => chiave)
}

/** Il titolo della finestra delle impostazioni. */
export const TITOLO_IMPOSTAZIONI = 'Registro docenti'

/**
 * I valori predefiniti, per chiave piatta. È quel che lo shim restituisce
 * quando nel file di `userData` non c'è scritto niente.
 */
export function predefinitiImpostazioni (): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(IMPOSTAZIONI).map(([chiave, voce]) => [chiave, voce.predefinito]),
  )
}
