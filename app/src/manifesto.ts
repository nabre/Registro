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
 * L'ordine dei menu non è questo: sta in `GRUPPI`, dentro `guscio/menu.ts`,
 * perché è una scelta di presentazione e non un fatto del registro. Un comando
 * aggiunto qui e non nominato là non sparisce — finisce sotto «Altro».
 */
export const COMANDI: readonly Comando[] = [
  { id: 'registroDocenti.apri', titolo: 'Apri', scorciatoia: 'CommandOrControl+Alt+R' },
  { id: 'registroDocenti.guida', titolo: 'Guida' },
  { id: 'registroDocenti.proietta', titolo: 'Proietta per la classe' },
  { id: 'registroDocenti.oggi', titolo: 'Vai a oggi', scorciatoia: 'CommandOrControl+Alt+T' },
  { id: 'registroDocenti.nuovaLezione', titolo: 'Nuova lezione', scorciatoia: 'CommandOrControl+Alt+N' },
  { id: 'registroDocenti.nuovaClasse', titolo: 'Nuova classe' },
  { id: 'registroDocenti.nuovoCorso', titolo: 'Nuovo corso (una materia a una classe)' },
  { id: 'registroDocenti.avvio', titolo: 'Avvio guidato' },
  { id: 'registroDocenti.nuovoPiano', titolo: 'Nuovo piano lezione' },
  { id: 'registroDocenti.nuovaValutazione', titolo: 'Nuovo momento di valutazione' },
  { id: 'registroDocenti.nuovoAnno', titolo: 'Nuovo anno scolastico' },
  { id: 'registroDocenti.ricarica', titolo: 'Ricarica i dati' },
  { id: 'registroDocenti.provaPosta', titolo: 'Prova il collegamento della posta' },
  { id: 'registroDocenti.collegaPosta', titolo: 'Collega la casella di posta' },
  { id: 'registroDocenti.scollegaPosta', titolo: 'Scollega la casella di posta' },
  { id: 'registroDocenti.azzeraPosta', titolo: 'Azzera la posta (portachiavi, memoria, impostazioni)' },
  { id: 'registroDocenti.apriCartellaDati', titolo: 'Apri la cartella dei dati' },
  { id: 'registroDocenti.apriInArrivo', titolo: 'Apri la cassetta dei PDF in arrivo' },
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
  /** Un tipo di campo più stretto per la finestra: per ora solo `email`. */
  readonly formato?: 'email'
}

/**
 * Le chiavi restano piatte e puntate — `registroDocenti.posta.mittente` — ed è
 * la forma in cui il registro le chiede: `getConfiguration('registroDocenti.posta')`
 * più `get('mittente')`. Cambiare la forma vorrebbe dire toccare i venti punti
 * che leggono un'impostazione, per guadagnarci niente.
 */
export const IMPOSTAZIONI: Readonly<Record<string, VoceImpostazione>> = {
  'registroDocenti.cartellaDati': {
    tipo: 'string',
    predefinito: 'registro',
    descrizione:
      'Cartella (relativa alla cartella di lavoro) in cui il registro salva i propri file JSON.',
  },
  'registroDocenti.aperturaAutomatica': {
    tipo: 'boolean',
    predefinito: true,
    descrizione:
      'Apre il registro all’avvio dell’applicazione quando la cartella dei dati esiste. Spento, ' +
      'l’applicazione parte senza finestre e il registro si apre dal menu.',
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
      'esempio nome.cognome@edu.ti.ch. Non è una credenziale. Vale per ogni via d’uscita — il ' +
      'server, Outlook, il file .eml — e serve anche perché una comunicazione tutta in copia ' +
      'nascosta abbia qualcuno nel campo «A». Vuoto vuol dire «lo stesso del nome di accesso».',
  },
  'registroDocenti.posta.server': {
    tipo: 'string',
    predefinito: 'smtp.office365.com',
    descrizione:
      'Il server a cui il registro consegna le comunicazioni. Per una casella Microsoft 365 — come ' +
      'quella della scuola — è smtp.office365.com e non va cambiato. Si tocca solo con un server ' +
      'di posta di altra specie.',
  },
  'registroDocenti.posta.porta': {
    tipo: 'number',
    predefinito: 587,
    scelte: [
      { valore: 587, aiuto: '587: consegna autenticata con STARTTLS. È quella di Microsoft 365.' },
      { valore: 465, aiuto: '465: canale cifrato fin dall’apertura, per i server che vogliono così.' },
      { valore: 25, aiuto: '25: da usare solo con un server interno che lo richieda.' },
    ],
    descrizione:
      'La porta del server. Il canale è sempre cifrato: se il server non lo offre, il registro non ' +
      'spedisce — di lì passerebbero la password e gli indirizzi delle famiglie.',
  },
  'registroDocenti.posta.utente': {
    tipo: 'string',
    predefinito: '',
    descrizione:
      'Il nome con cui il registro entra nella casella: nel tenant di una scuola è la sigla che dà ' +
      'l’amministrazione, per esempio xxx000@edu.ti.ch, diversa dall’indirizzo con nome e cognome. ' +
      'Vuoto vuol dire «lo stesso del mittente». La password non sta qui — sta nel portachiavi del ' +
      'sistema, e ce la mette il comando «Collega la casella di posta».',
  },
  'registroDocenti.posta.autenticazione': {
    tipo: 'string',
    predefinito: 'oauth',
    scelte: [
      {
        valore: 'oauth',
        aiuto:
          'Account Microsoft con il codice: la pagina di Microsoft aperta da qualunque browser. ' +
          'Richiede un ID applicazione, registrato una volta sola.',
      },
      {
        valore: 'password',
        aiuto:
          'Password per le app: una password generata dal profilo Microsoft, valida solo per ' +
          'questo. Non serve registrare niente, ma molti tenant la rifiutano.',
      },
    ],
    descrizione:
      'Come il registro entra nella casella. Lo imposta da sé il comando «Collega la casella di ' +
      'posta», che fa scegliere fra i due modi.',
  },
  'registroDocenti.posta.clientId': {
    tipo: 'string',
    predefinito: '',
    descrizione:
      'L’«ID applicazione (client)» con cui il registro si presenta a Microsoft. Se ne registra uno ' +
      'su entra.microsoft.com (Registrazioni app → Nuova registrazione; URI di reindirizzamento ' +
      'come client pubblico: http://localhost; flussi client pubblici su Sì; autorizzazione ' +
      'delegata SMTP.Send) e lo si incolla qui. Il comando «Collega la casella di posta» stampa la ' +
      'procedura per intero. Non è un segreto: identifica il programma, non la persona.',
  },
  'registroDocenti.posta.tenant': {
    tipo: 'string',
    predefinito: '',
    descrizione:
      'L’organizzazione a cui bussare per l’accesso con l’account. Vuoto vuol dire «ricavala ' +
      'dall’indirizzo», che è quel che serve quasi sempre: si tocca solo con una casella il cui ' +
      'dominio non coincide con quello del tenant.',
  },
  'registroDocenti.posta.invioDiretto': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Spedisce le comunicazioni da sé invece di preparare una bozza da rileggere e mandare a mano. ' +
      'Con l’account collegato le consegna direttamente al server Exchange, e il registro sa quali ' +
      'sono partite e quali no; senza account collegato le passa a Outlook classico, se «bozze» è ' +
      'su outlook. Prima di ogni giro il registro chiede conferma, e quel che parte non si può ' +
      'richiamare.',
  },
  'registroDocenti.posta.bozze': {
    tipo: 'string',
    predefinito: 'file',
    scelte: [
      {
        valore: 'file',
        aiuto:
          'File .eml: il registro scrive la bozza in esportazioni/ e la apre con il programma di ' +
          'posta predefinito per i file .eml. Funziona dappertutto, anche con il nuovo Outlook.',
      },
      {
        valore: 'outlook',
        aiuto:
          'Outlook classico: la bozza nasce dentro Outlook, comandato dal registro. Solo Windows, ' +
          'solo Outlook classico installato e con la casella configurata.',
      },
    ],
    descrizione:
      'Come nascono le bozze quando il registro non spedisce da sé. In tutti e due i casi a ' +
      'mandarle sei tu, e la comunicazione si segna spedita con la spunta nell’elenco: il registro ' +
      'non domanda più «l’hai spedita?».',
  },
  'registroDocenti.ocr.attivo': {
    tipo: 'boolean',
    predefinito: false,
    descrizione:
      'Legge con un OCR locale le pagine dei PDF che non contengono testo (scansioni), per ' +
      'riconoscere l’allievo. Richiede Ollama in esecuzione sulla propria macchina.',
  },
  'registroDocenti.ocr.url': {
    tipo: 'string',
    predefinito: 'http://127.0.0.1:11434',
    descrizione: 'Indirizzo del servizio Ollama con cui leggere le scansioni.',
  },
  'registroDocenti.ocr.modello': {
    tipo: 'string',
    predefinito: 'glm-ocr:latest',
    descrizione: 'Modello Ollama usato per le scansioni: deve saper guardare le immagini.',
  },
  'registroDocenti.ocr.attesaMassimaSecondi': {
    tipo: 'number',
    predefinito: 180,
    descrizione: 'Quanti secondi aspettare la lettura di una pagina prima di rinunciare.',
  },
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
