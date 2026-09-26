// I testi dei comandi del pannello (`commands.ts`): nomi, aiuti, riquadri e
// motivi per cui non si possono fare. La guida cita i nomi dei pulsanti fra
// virgolette: cambiandone uno va cambiato anche là, in tutte le lingue.

import { catalogo, minuscolo } from '../i18n/index.js'
import { PIF } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'
import { plurale } from '../domain/text.js'
import type { StatoLezione } from '../domain/models.js'

const it = {
  /** I riquadri della riga delle azioni, e i gruppi del menu e della palette. */
  gruppi: {
    documento: 'Il documento',
    anno: 'L’anno',
    modifica: 'Modifica',
    finestra: 'La finestra',
    manutenzione: 'Manutenzione',
    adesso: 'Adesso',
    comeSiGuarda: 'Come si guarda',
    modificaLeOre: 'Modifica le ore',
    calendarioIcs: 'Calendario ICS',
    cheCosaSiGuarda: 'Che cosa si guarda',
    crea: 'Crea',
    statoDellOra: 'Stato dell’ora',
    ora: 'L’ora',
    piano: 'Il piano',
    check: 'Il check',
    indirizzi: 'Indirizzi',
    elenco: 'Elenco',
    famiglie: 'Famiglie',
    classe: 'Classe',
    gestione: 'Gestione',
    schermo: 'Lo schermo',
    sulloSchermo: 'Sullo schermo',
    comeSiVede: 'Come si vede',
    calendarioProiettato: 'Calendario proiettato',
    documentiDi: 'Documenti di',
    genera: 'Genera',
    composizioni: 'Composizioni',
    chiLiRifa: 'Chi li rifà',
    posta: 'Posta',
  },

  // Perché un comando non si fa da qui.
  nonConQuelCheMostra: 'Non con quel che la pagina mostra adesso.',
  dallaSuaPagina: 'Si fa dalla sua pagina: aprila, e lo trovi nella barra.',
  schermoSpento: 'Lo schermo per la classe è spento.',
  unaSchedaSola: 'C’è una scheda sola accesa: non c’è niente fra cui scorrere.',
  nessunCorsoPerLezioni: 'Non c’è ancora nessun corso a cui dare le lezioni.',
  nessunPianoAperto: 'Nessun piano aperto.',
  selezionaClasse: 'Seleziona una classe di cui sei docente',
  primaUnCorso: 'Crea prima un corso per questa classe',

  // I blocchi dello schermo per la classe.
  bloccoRiservato: (nome: string) =>
    `${nome}: parla delle singole persone. Aprendolo, lo vede tutta la classe.`,
  mostraBlocco: (nome: string) => `Mostra ${minuscolo(nome)} alla classe`,

  /** Che cosa vuol dire mettere un'ora in uno dei suoi tre stati. */
  statiOra: {
    pianificata: 'L’ora torna fra quelle da fare: quel che è già scritto resta',
    svolta: 'L’ora è fatta: esce dalle pendenze e conta nel monte ore',
    annullata: 'Resta nel registro, segnata come non svolta: i dati inseriti non si perdono',
  } satisfies Record<StatoLezione, string>,
  /** La notifica dopo il cambio di stato. */
  segnata: {
    pianificata: 'Lezione pianificata.',
    svolta: 'Lezione segnata come svolta.',
    annullata: 'Lezione annullata.',
  } satisfies Record<StatoLezione, string>,
  annullareTitolo: 'Annullare la lezione?',
  annullareTesto:
    'Resta nel registro, segnata come non svolta. I dati già inseriti non si perdono.',
  annullareConferma: 'Annulla la lezione',

  // File.
  nuovoAnno: 'Nuovo anno scolastico',
  nuovoAnnoAiuto:
    'Un anno nuovo, in un documento suo: si apre subito, e lo salvi con nome quando vuoi',
  apri: 'Apri un anno…',
  apriAiuto: 'Un altro documento «.regi», scelto dal disco',
  importaRegistro: 'Importa da un altro registro…',
  importaRegistroAiuto:
    'Da un altro documento «.regi»: impostazioni, materie, classi con persone e corsi, ' +
    'piani e calendari. Mai lezioni né voti',
  salvaConNome: 'Salva l’anno con nome…',
  salvaConNomeAiuto:
    'L’anno nuovo non è ancora salvato: scegli come chiamarlo e in che cartella tenerlo',
  salvaAiuto: 'Il registro salva da sé: questo smette di aspettare, e lo dice',
  ricarica: 'Ricarica',
  ricaricaAiuto: 'Rilegge il documento dal disco: serve se lo ha toccato qualcun altro',
  chiudi: 'Chiudi l’anno',
  chiudiAiuto:
    'Chiude il documento e lascia il file libero: serve per farlo salire su OneDrive, ' +
    'o per riprenderlo da un altro computer',
  nessunDocumento: 'Non c’è nessun documento aperto.',
  cartella: 'Apri la cartella del file',
  cartellaAiuto: 'Apre la cartella in cui sta il file aperto, con il file già evidenziato',
  modificaAnno: 'Modifica l’anno',
  modificaAnnoAiuto: 'Date, semestri e settimane dell’anno in uso',
  pause: 'Vacanze e sospensioni',

  // Modifica.
  annulla: 'Annulla',
  annullaAiuto: 'Torna indietro dell’ultimo gesto fatto sul registro',
  annullaAiutoPassi: (passi: number) =>
    `Torna indietro dell’ultimo gesto fatto sul registro (${plurale(passi, 'passo', 'passi')})`,
  nienteDaAnnullare: 'Non c’è niente da annullare.',
  ripristina: 'Ripristina',
  ripristinaAiuto: 'Rifà il gesto appena annullato',
  ripristinaAiutoPassi: (passi: number) =>
    `Rifà il gesto appena annullato (${plurale(passi, 'passo', 'passi')})`,
  nienteDaRipristinare: 'Non c’è niente da ripristinare.',

  // La finestra.
  ingrandisci: 'Ingrandisci',
  ingrandisciAiuto: 'Testo e riquadri più grandi, di un passo',
  riduci: 'Riduci',
  riduciAiuto: 'Testo e riquadri più piccoli, di un passo: ce ne sta di più',
  dimensioneNormale: 'Dimensione normale',
  dimensioneNormaleAiuto: 'Rimette la finestra alla sua misura',
  schermoIntero: 'Schermo intero',
  schermoInteroAiuto:
    'La finestra di chi insegna occupa tutto lo schermo — non è lo schermo per la classe',
  esci: 'Esci dal registro',
  esciAiuto:
    'Spegne il registro del tutto, icona accanto all’orologio compresa. ' +
    'Quel che si è scritto è già salvato',

  // Manutenzione.
  ripara: 'Ripara il registro',
  riparaAiuto: 'Rimette a posto i riferimenti rotti che si correggono senza perdere niente',
  nienteDaRiparare: 'Non c’è niente da riparare.',

  // Il calendario.
  oggiAiuto: 'Il calendario sulla settimana di oggi',
  mesePrima: 'Il mese prima',
  settimanaPrima: 'La settimana prima',
  meseDopo: 'Il mese dopo',
  settimanaDopo: 'La settimana dopo',
  modificaAiuto:
    'Le lezioni in mano: nel calendario tira sul vuoto per crearne una, tira le maniglie per ' +
    'allungarla, frecce per spostarla, Ctrl+D per copiarla, Canc per eliminarla, Esc per uscire; ' +
    'nella pagina di un’ora apre «Modifica l’ora»',
  calendarioIcs: 'Calendario ICS',
  calendarioIcsAiuto:
    'Mostra, tratteggiati accanto alle lezioni, gli eventi del calendario ICS del documento',
  nessunCalendarioIcs:
    'Nessun calendario ICS nel documento: si aggiunge da Impostazioni › Anno e orario › ' +
    'Calendari ICS.',
  confronta: 'Confronta con il calendario',
  confrontaAiuto:
    'I calendari ICS del documento: se ne sceglie uno da confrontare, e il registro propone le ' +
    'lezioni da creare o allineare',
  oraDaCompilare: 'Ora da compilare',
  prossimaOra: 'Prossima ora',
  oraDaCompilareAiuto: 'Apre l’ora che aspetta: il buco da riempire, o quella che viene',
  nessunOraDaCompilare: 'Non c’è nessun’ora da compilare.',
  stai: 'È l’ora che stai compilando.',
  nuovaOra: 'Nuova ora',
  nuovaOraAiuto: 'Un’ora fuori orario, o la prima di un corso appena fatto',
  nuovaConsegna: 'Nuova consegna',
  nuovaConsegnaAiuto: 'Qualcosa che si dà e deve tornare indietro: un compito, un documento',
  nessunCorsoPerConsegna: 'Non c’è ancora nessun corso a cui darla.',
  nuovoCorso: 'Nuovo corso',
  nuovoCorsoAiuto: 'Una materia a una classe, con il suo orario',
  nuovaClasse: 'Nuova classe',

  // L'ora aperta.
  modificaOra: 'Modifica l’ora',
  modificaOraAiuto: 'Giorno, orario, aula e pause di quest’ora',
  accendiModifica: 'Accendi «Modifica» (Ctrl+E) per cambiare l’ora.',

  // Il piano aperto.
  vaiAlRegistro: 'Vai al registro',
  vaiAlRegistroAiuto: 'Apre il registro dell’ora che usa questa scaletta',
  pianoSenzaOra:
    'Questa scaletta non sta ancora su nessun’ora: assegnala da un’ora del calendario.',
  duplicaAiuto: 'Una copia da adattare: è così che lo stesso piano serve un altro corso',
  eliminaAiuto: 'Toglie la scaletta e il materiale che ci sta attaccato',
  oraInQuestoCorso: 'Ora in questo corso',

  // Il check.
  aggiungiColonna: 'Aggiungi una colonna',
  aggiungiColonnaAiuto: 'Una cosa da fare una volta, da spuntare persona per persona',
  colonne: 'Colonne',
  colonneAiuto: 'Tutte le colonne insieme: rinominarle, metterle in fila, toglierle',
  senzaColonne: 'Il check di questo corso non ha ancora colonne.',

  // La mappa.
  trovaIndirizzi: 'Trova gli indirizzi',
  trovaIndirizziAiuto:
    'Chiede a OpenStreetMap dove cadono gli indirizzi che non hanno ancora un punto. ' +
    'È l’unico gesto del registro che manda fuori un dato dell’anagrafica, ed è per questo ' +
    'che si preme a mano: la risposta resta scritta, e non si richiede più.',
  tuttiTrovati: 'Ogni indirizzo scritto ha già il suo punto sulla mappa.',
  rifaiIndirizzi: 'Rifai gli indirizzi',
  rifaiIndirizziAiuto:
    'Richiede anche quelli che un punto ce l’hanno già: serve quando un indirizzo ' +
    'incompleto è caduto nel paese sbagliato, e lo si è corretto nell’anagrafica.',
  rifareTitolo: 'Rifare tutti gli indirizzi?',
  rifareTesto:
    'Gli indirizzi delle classi in mappa tornano al geocodificatore, anche quelli ' +
    'già risolti. Ci vuole circa un secondo per indirizzo.',
  rifai: 'Rifai',
  inquadra: 'Inquadra tutto',
  inquadraAiuto: 'Riporta la mappa sul riquadro che contiene tutti i punti accesi',

  // Le persone e la classe.
  nuovaPersona: `Nuova ${PIF.singolare}`,
  nuovaPersonaAiuto:
    'Una persona nuova in una classe dell’anno: la classe si sceglie, se ce n’è più d’una',
  aggiungiAlGruppo: 'Aggiungi al gruppo',
  incollaElenco: 'Incolla elenco',
  incollaElencoAiuto: 'Un elenco copiato da un foglio diventa il gruppo della classe',
  importaClasse: 'Importa classe dall’anno…',
  importaClasseAiuto:
    `Una classe di un altro anno, con le sue ${PIF.plurale} e se si vuole i suoi corsi`,
  nessunAltroAnno: 'Fra i recenti non c’è un altro anno da cui portare una classe.',
  nuovaComunicazione: 'Nuova comunicazione',
  nuovoPeriodoAssenze: 'Nuovo periodo assenze',
  nuovoPeriodoAssenzeAiuto: 'Il foglio delle assenze da far firmare, per un periodo',

  // Il docente di classe.
  nuovaPendenza: 'Nuova pendenza',
  chiediDocumento: 'Chiedi un documento',
  caricaPdf: 'Carica dei PDF',
  rileggiScansioni: 'Rileggi le scansioni',
  rileggiScansioniAiuto:
    'Rimette in coda la lettura di tutte le pagine ancora da smistare, in tutti i PDF di ' +
    'questa classe. Le pagine già archiviate restano dove sono.',
  ocrSpento: 'La lettura automatica delle scansioni è spenta',
  nessunPdf: 'Non c’è nessun PDF da dividere',
  documentoPersonale: 'Documento personale',
  nuovoPeriodo: 'Nuovo periodo',
  nuovoRecapito: 'Nuovo recapito',
  elencoClasse: 'Elenco della classe',

  // La proiezione.
  spegniSchermo: 'Spegni lo schermo',
  proietta: 'Proietta',
  spegniSchermoAiuto: 'Chiude la finestra che sta sul proiettore',
  proiettaAiuto: 'Apre lo schermo per la classe, in una finestra da portare sul proiettore',
  riprendi: 'Riprendi',
  pausa: 'Pausa',
  pausaAiuto: 'Spegne il contenuto lasciando la finestra dov’è: si riprende com’era',
  schedaPrecedente: 'Scheda precedente',
  schedaSuccessiva: 'Scheda successiva',
  nomiVisibili: 'Nomi visibili',
  senzaNomi: 'Senza nomi',
  nomiAiuto: 'Se accanto ai voti e ai documenti mancanti compaiono i nomi',
  misureStrette: 'Misure strette',
  misureLarghe: 'Misure larghe',
  misureStretteAiuto: 'Caratteri più piccoli: ci sta più roba nella pagina',
  misureLargheAiuto: 'Caratteri più grandi: si legge da più lontano, ma ci sta meno',
  vistaProiettataAiuto: 'Il giorno è quello aperto nel calendario del registro',
  calendarioNonAperto: 'La scheda Calendario non è quella aperta sullo schermo.',

  // I documenti.
  aggiornaTutto: 'Aggiorna tutto',
  aggiornaTuttoAiuto: (semestre: string) =>
    'Tutto quel che il corso sa stampare: presenze, voti, una scheda per ogni ' +
    `${PIF.singolare} e per ogni prova, il verbale di ogni ora svolta, i piani, le facce ` +
    `e il fascicolo di classe, nel ${semestre}`,
  combinaScelti: (quanti: number) => `Combina i ${quanti} scelti`,
  combinaDocumenti: 'Combina i documenti scelti',
  combinaAiuto: 'Un PDF solo con dentro, in fila, i documenti spuntati: chiede come chiamarlo',
  almenoDue:
    'Spunta almeno due documenti nelle righe: la composizione li mette in fila in un PDF solo.',
  togliSpunte: 'Togli le spunte',
  togliSpunteAiuto: 'Nessun documento scelto: si riparte da zero',
  nessunoSpuntato: 'Non c’è nessun documento spuntato.',

  // La posta.
  collegaPosta: 'Collega la posta',
  collegaPostaAiuto:
    'Chiede l’indirizzo e fa accedere dal browser: il gettone resta nel portachiavi',
  provaPosta: 'Prova la posta',
  provaPostaAiuto: 'Domanda di chi è la casella, senza mandare niente',
  provaInvio: 'Manda una mail di prova',
  provaInvioAiuto:
    'Manda una mail vera all’indirizzo che scrivi: è l’unico modo di provare l’invio',
  scollegaPosta: 'Scollega la posta',
}

export const testi = catalogo(it, {
  de: {
    gruppi: {
      documento: 'Das Dokument',
      anno: 'Das Schuljahr',
      modifica: 'Bearbeiten',
      finestra: 'Das Fenster',
      manutenzione: 'Wartung',
      adesso: 'Jetzt',
      comeSiGuarda: 'Ansicht',
      modificaLeOre: 'Stunden bearbeiten',
      calendarioIcs: 'ICS-Kalender',
      cheCosaSiGuarda: 'Was man sieht',
      crea: 'Erstellen',
      statoDellOra: 'Status der Stunde',
      ora: 'Die Stunde',
      piano: 'Der Plan',
      check: 'Der Check',
      indirizzi: 'Adressen',
      elenco: 'Liste',
      famiglie: 'Familien',
      classe: 'Klasse',
      gestione: 'Verwaltung',
      schermo: 'Der Bildschirm',
      sulloSchermo: 'Auf dem Bildschirm',
      comeSiVede: 'Darstellung',
      calendarioProiettato: 'Projizierter Kalender',
      documentiDi: 'Dokumente zu',
      genera: 'Erstellen',
      composizioni: 'Zusammenstellungen',
      chiLiRifa: 'Wer sie neu erstellt',
      posta: 'E-Mail',
    },
    nonConQuelCheMostra: 'Nicht mit dem, was die Seite gerade zeigt.',
    dallaSuaPagina: 'Das geht auf der eigenen Seite: Öffne sie, und du findest es in der Leiste.',
    schermoSpento: 'Der Bildschirm für die Klasse ist aus.',
    unaSchedaSola: 'Es ist nur eine Karte eingeschaltet: Es gibt nichts zum Durchblättern.',
    nessunCorsoPerLezioni: 'Es gibt noch keinen Kurs, für den man Stunden anlegen könnte.',
    nessunPianoAperto: 'Kein Plan geöffnet.',
    selezionaClasse: 'Wähle eine Klasse, deren Klassenlehrperson du bist',
    primaUnCorso: 'Erstelle zuerst einen Kurs für diese Klasse',
    bloccoRiservato: (nome) =>
      `${nome}: betrifft einzelne Personen. Wird es geöffnet, sieht es die ganze Klasse.`,
    mostraBlocco: (nome) => `${nome} der Klasse zeigen`,
    statiOra: {
      pianificata: 'Die Stunde kommt zurück zu den offenen: Was schon eingetragen ist, bleibt',
      svolta: 'Die Stunde ist gehalten: Sie verlässt die Pendenzen und zählt zum Stundentotal',
      annullata:
        'Bleibt im Klassenbuch, als nicht gehalten markiert: Die eingetragenen Daten gehen ' +
        'nicht verloren',
    },
    segnata: {
      pianificata: 'Stunde wieder geplant.',
      svolta: 'Stunde als gehalten markiert.',
      annullata: 'Stunde ausgefallen.',
    },
    annullareTitolo: 'Stunde ausfallen lassen?',
    annullareTesto:
      'Sie bleibt im Klassenbuch, als nicht gehalten markiert. Die eingetragenen Daten gehen ' +
      'nicht verloren.',
    annullareConferma: 'Stunde ausfallen lassen',
    nuovoAnno: 'Neues Schuljahr',
    nuovoAnnoAiuto:
      'Ein neues Schuljahr in einem eigenen Dokument: Es öffnet sich sofort, und du speicherst ' +
      'es unter einem Namen, wann du willst',
    apri: 'Schuljahr öffnen…',
    apriAiuto: 'Ein anderes «.regi»-Dokument, ausgewählt auf der Festplatte',
    importaRegistro: 'Aus einem anderen Klassenbuch importieren…',
    importaRegistroAiuto:
      'Aus einem anderen «.regi»-Dokument: Einstellungen, Fächer, Klassen mit Personen und ' +
      'Kursen, Pläne und Kalender. Nie Stunden oder Noten',
    salvaConNome: 'Schuljahr speichern unter…',
    salvaConNomeAiuto:
      'Das neue Schuljahr ist noch nicht gespeichert: Wähle, wie es heissen und in welchem ' +
      'Ordner es liegen soll',
    salvaAiuto: 'Das Klassenbuch speichert von selbst: Dieser Befehl wartet nicht länger und meldet es',
    ricarica: 'Neu laden',
    ricaricaAiuto:
      'Liest das Dokument neu von der Festplatte: nützlich, wenn jemand anderes es geändert hat',
    chiudi: 'Schuljahr schliessen',
    chiudiAiuto:
      'Schliesst das Dokument und gibt die Datei frei: So kann sie zu OneDrive hochgeladen ' +
      'oder auf einem anderen Computer weiterbearbeitet werden',
    nessunDocumento: 'Es ist kein Dokument geöffnet.',
    cartella: 'Ordner der Datei öffnen',
    cartellaAiuto: 'Öffnet den Ordner der offenen Datei, mit der Datei schon markiert',
    modificaAnno: 'Schuljahr bearbeiten',
    modificaAnnoAiuto: 'Daten, Semester und Wochen des laufenden Schuljahrs',
    pause: 'Ferien und Unterbrüche',
    annulla: 'Rückgängig',
    annullaAiuto: 'Macht den letzten Schritt im Klassenbuch rückgängig',
    annullaAiutoPassi: (passi) =>
      'Macht den letzten Schritt im Klassenbuch rückgängig ' +
      `(${plurale(passi, 'Schritt', 'Schritte')})`,
    nienteDaAnnullare: 'Es gibt nichts rückgängig zu machen.',
    ripristina: 'Wiederholen',
    ripristinaAiuto: 'Wiederholt den eben rückgängig gemachten Schritt',
    ripristinaAiutoPassi: (passi) =>
      `Wiederholt den eben rückgängig gemachten Schritt (${plurale(passi, 'Schritt', 'Schritte')})`,
    nienteDaRipristinare: 'Es gibt nichts zu wiederholen.',
    ingrandisci: 'Vergrössern',
    ingrandisciAiuto: 'Text und Felder um eine Stufe grösser',
    riduci: 'Verkleinern',
    riduciAiuto: 'Text und Felder um eine Stufe kleiner: Es passt mehr hinein',
    dimensioneNormale: 'Normale Grösse',
    dimensioneNormaleAiuto: 'Setzt das Fenster auf seine Grösse zurück',
    schermoIntero: 'Vollbild',
    schermoInteroAiuto:
      'Das Fenster der Lehrperson füllt den ganzen Bildschirm — nicht der Bildschirm für die ' +
      'Klasse',
    esci: 'Klassenbuch beenden',
    esciAiuto:
      'Beendet das Klassenbuch ganz, samt Symbol neben der Uhr. ' +
      'Was geschrieben wurde, ist schon gespeichert',
    ripara: 'Klassenbuch reparieren',
    riparaAiuto: 'Behebt kaputte Verweise, die sich ohne Verlust korrigieren lassen',
    nienteDaRiparare: 'Es gibt nichts zu reparieren.',
    oggiAiuto: 'Zeigt im Kalender die Woche von heute',
    mesePrima: 'Der Monat davor',
    settimanaPrima: 'Die Woche davor',
    meseDopo: 'Der Monat danach',
    settimanaDopo: 'Die Woche danach',
    modificaAiuto:
      'Die Stunden in der Hand: Im Kalender ins Leere ziehen, um eine zu erstellen, an den ' +
      'Griffen ziehen, um sie zu verlängern, Pfeiltasten zum Verschieben, Ctrl+D zum Kopieren, ' +
      'Entf zum Löschen, Esc zum Beenden; auf der Seite einer Stunde öffnet es «Stunde bearbeiten»',
    calendarioIcs: 'ICS-Kalender',
    calendarioIcsAiuto:
      'Zeigt gestrichelt neben den Stunden die Termine aus dem ICS-Kalender des Dokuments',
    nessunCalendarioIcs:
      'Kein ICS-Kalender im Dokument: Er wird unter Einstellungen › Schuljahr und Stundenplan › ' +
      'ICS-Kalender hinzugefügt.',
    confronta: 'Mit dem Kalender abgleichen',
    confrontaAiuto:
      'Die ICS-Kalender des Dokuments: Man wählt einen zum Vergleichen, und das Klassenbuch ' +
      'schlägt die Stunden vor, die zu erstellen oder anzugleichen sind',
    oraDaCompilare: 'Auszufüllende Stunde',
    prossimaOra: 'Nächste Stunde',
    oraDaCompilareAiuto: 'Öffnet die wartende Stunde: die Lücke zum Füllen, oder die nächste',
    nessunOraDaCompilare: 'Es gibt keine auszufüllende Stunde.',
    stai: 'Das ist die Stunde, die du gerade ausfüllst.',
    nuovaOra: 'Neue Stunde',
    nuovaOraAiuto: 'Eine Stunde ausserhalb des Stundenplans, oder die erste eines neuen Kurses',
    nuovaConsegna: 'Neuer Auftrag',
    nuovaConsegnaAiuto:
      'Etwas, das man ausgibt und das zurückkommen muss: eine Aufgabe, ein Dokument',
    nessunCorsoPerConsegna: 'Es gibt noch keinen Kurs, für den man ihn erteilen könnte.',
    nuovoCorso: 'Neuer Kurs',
    nuovoCorsoAiuto: 'Ein Fach für eine Klasse, mit seinem Stundenplan',
    nuovaClasse: 'Neue Klasse',
    modificaOra: 'Stunde bearbeiten',
    modificaOraAiuto: 'Tag, Zeit, Zimmer und Pausen dieser Stunde',
    accendiModifica: 'Schalte «Bearbeiten» (Ctrl+E) ein, um die Stunde zu ändern.',
    vaiAlRegistro: 'Zum Klassenbuch',
    vaiAlRegistroAiuto: 'Öffnet das Klassenbuch der Stunde, die diesen Ablauf verwendet',
    pianoSenzaOra:
      'Dieser Ablauf gehört noch zu keiner Stunde: Weise ihn von einer Stunde im Kalender aus zu.',
    duplicaAiuto: 'Eine Kopie zum Anpassen: So dient derselbe Plan einem anderen Kurs',
    eliminaAiuto: 'Entfernt den Ablauf und das daran hängende Material',
    oraInQuestoCorso: 'Stunde in diesem Kurs',
    aggiungiColonna: 'Spalte hinzufügen',
    aggiungiColonnaAiuto: 'Etwas, das einmal zu tun ist, Person für Person abzuhaken',
    colonne: 'Spalten',
    colonneAiuto: 'Alle Spalten zusammen: umbenennen, ordnen, entfernen',
    senzaColonne: 'Der Check dieses Kurses hat noch keine Spalten.',
    trovaIndirizzi: 'Adressen suchen',
    trovaIndirizziAiuto:
      'Fragt OpenStreetMap, wo die Adressen liegen, die noch keinen Punkt haben. Es ist der ' +
      'einzige Schritt des Klassenbuchs, der eine Angabe aus den Personalien nach aussen gibt, ' +
      'und deshalb löst man ihn von Hand aus: Die Antwort bleibt gespeichert und wird nicht ' +
      'erneut abgefragt.',
    tuttiTrovati: 'Jede erfasste Adresse hat schon ihren Punkt auf der Karte.',
    rifaiIndirizzi: 'Adressen neu suchen',
    rifaiIndirizziAiuto:
      'Fragt auch die ab, die schon einen Punkt haben: nützlich, wenn eine unvollständige ' +
      'Adresse im falschen Ort gelandet ist und man sie in den Personalien korrigiert hat.',
    rifareTitolo: 'Alle Adressen neu suchen?',
    rifareTesto:
      'Die Adressen der Klassen auf der Karte gehen erneut an den Geocodierer, auch die schon ' +
      'gefundenen. Das dauert etwa eine Sekunde pro Adresse.',
    rifai: 'Neu suchen',
    inquadra: 'Alles zeigen',
    inquadraAiuto: 'Bringt die Karte auf den Ausschnitt mit allen eingeschalteten Punkten',
    nuovaPersona: 'Neue Lernende',
    nuovaPersonaAiuto:
      'Eine neue Person in einer Klasse des Schuljahrs: Die Klasse wählt man, wenn es mehrere gibt',
    aggiungiAlGruppo: 'Zur Gruppe hinzufügen',
    incollaElenco: 'Liste einfügen',
    incollaElencoAiuto: 'Eine aus einer Tabelle kopierte Liste wird zur Gruppe der Klasse',
    importaClasse: 'Klasse aus einem Jahr importieren…',
    importaClasseAiuto:
      'Eine Klasse aus einem anderen Schuljahr, mit ihren Lernenden und, wenn gewünscht, ihren ' +
      'Kursen',
    nessunAltroAnno:
      'Unter den zuletzt geöffneten gibt es kein anderes Schuljahr, aus dem man eine Klasse ' +
      'holen könnte.',
    nuovaComunicazione: 'Neue Mitteilung',
    nuovoPeriodoAssenze: 'Neuer Absenzzeitraum',
    nuovoPeriodoAssenzeAiuto: 'Das Absenzenblatt zum Unterschreiben, für einen Zeitraum',
    nuovaPendenza: 'Neue Pendenz',
    chiediDocumento: 'Ein Dokument verlangen',
    caricaPdf: 'PDFs laden',
    rileggiScansioni: 'Scans neu lesen',
    rileggiScansioniAiuto:
      'Stellt das Lesen aller noch zuzuordnenden Seiten in allen PDFs dieser Klasse wieder in ' +
      'die Warteschlange. Schon archivierte Seiten bleiben, wo sie sind.',
    ocrSpento: 'Das automatische Lesen der Scans ist ausgeschaltet',
    nessunPdf: 'Es gibt kein PDF zum Aufteilen',
    documentoPersonale: 'Persönliches Dokument',
    nuovoPeriodo: 'Neuer Zeitraum',
    nuovoRecapito: 'Neue Kontaktadresse',
    elencoClasse: 'Klassenliste',
    spegniSchermo: 'Bildschirm ausschalten',
    proietta: 'Projizieren',
    spegniSchermoAiuto: 'Schliesst das Fenster auf dem Projektor',
    proiettaAiuto:
      'Öffnet den Bildschirm für die Klasse, in einem Fenster, das man auf den Projektor zieht',
    riprendi: 'Fortsetzen',
    pausa: 'Pause',
    pausaAiuto:
      'Blendet den Inhalt aus und lässt das Fenster, wo es ist: Es geht weiter wie vorher',
    schedaPrecedente: 'Vorherige Karte',
    schedaSuccessiva: 'Nächste Karte',
    nomiVisibili: 'Namen sichtbar',
    senzaNomi: 'Ohne Namen',
    nomiAiuto: 'Ob neben den Noten und den fehlenden Dokumenten die Namen erscheinen',
    misureStrette: 'Kompakt',
    misureLarghe: 'Gross',
    misureStretteAiuto: 'Kleinere Schrift: Es passt mehr auf die Seite',
    misureLargheAiuto: 'Grössere Schrift: Man liest es von weiter weg, aber es passt weniger hin',
    vistaProiettataAiuto: 'Der Tag ist der, der im Kalender des Klassenbuchs offen ist',
    calendarioNonAperto: 'Die Karte Kalender ist nicht die, die auf dem Bildschirm offen ist.',
    aggiornaTutto: 'Alles aktualisieren',
    aggiornaTuttoAiuto: (semestre) =>
      'Alles, was der Kurs drucken kann: Präsenzen, Noten, ein Blatt pro lernende Person und ' +
      'pro Prüfung, das Protokoll jeder gehaltenen Stunde, die Pläne, die Fotoliste und das ' +
      `Klassendossier (${semestre})`,
    combinaScelti: (quanti) => `Die ${quanti} ausgewählten zusammenstellen`,
    combinaDocumenti: 'Ausgewählte Dokumente zusammenstellen',
    combinaAiuto:
      'Ein einziges PDF mit den abgehakten Dokumenten der Reihe nach: Es fragt nach einem Namen',
    almenoDue:
      'Hake in den Zeilen mindestens zwei Dokumente ab: Die Zusammenstellung reiht sie in einem ' +
      'einzigen PDF auf.',
    togliSpunte: 'Häkchen entfernen',
    togliSpunteAiuto: 'Kein Dokument ausgewählt: Man beginnt von vorn',
    nessunoSpuntato: 'Es ist kein Dokument abgehakt.',
    collegaPosta: 'E-Mail verbinden',
    collegaPostaAiuto:
      'Fragt nach der Adresse und meldet dich im Browser an: Das Token bleibt im Schlüsselbund',
    provaPosta: 'E-Mail testen',
    provaPostaAiuto: 'Fragt, wem das Postfach gehört, ohne etwas zu senden',
    provaInvio: 'Test-E-Mail senden',
    provaInvioAiuto:
      'Sendet eine echte E-Mail an die Adresse, die du eingibst: Nur so lässt sich das Senden ' +
      'testen',
    scollegaPosta: 'E-Mail trennen',
  },
  fr: {
    gruppi: {
      documento: 'Le document',
      anno: 'L’année',
      modifica: 'Édition',
      finestra: 'La fenêtre',
      manutenzione: 'Maintenance',
      adesso: 'Maintenant',
      comeSiGuarda: 'Affichage',
      modificaLeOre: 'Modifier les leçons',
      calendarioIcs: 'Calendrier ICS',
      cheCosaSiGuarda: 'Ce qu’on regarde',
      crea: 'Créer',
      statoDellOra: 'État de la leçon',
      ora: 'La leçon',
      piano: 'Le plan',
      check: 'Le check',
      indirizzi: 'Adresses',
      elenco: 'Liste',
      famiglie: 'Familles',
      classe: 'Classe',
      gestione: 'Gestion',
      schermo: 'L’écran',
      sulloSchermo: 'À l’écran',
      comeSiVede: 'Présentation',
      calendarioProiettato: 'Calendrier projeté',
      documentiDi: 'Documents par',
      genera: 'Générer',
      composizioni: 'Compilations',
      chiLiRifa: 'Qui les refait',
      posta: 'Courrier',
    },
    nonConQuelCheMostra: 'Pas avec ce que la page montre maintenant.',
    dallaSuaPagina: 'Cela se fait depuis sa page : ouvre-la, et tu le trouves dans la barre.',
    schermoSpento: 'L’écran pour la classe est éteint.',
    unaSchedaSola: 'Une seule fiche est allumée : il n’y a rien à faire défiler.',
    nessunCorsoPerLezioni: 'Il n’y a encore aucun cours pour lequel créer des leçons.',
    nessunPianoAperto: 'Aucun plan ouvert.',
    selezionaClasse: 'Choisis une classe dont tu es maître de classe',
    primaUnCorso: 'Crée d’abord un cours pour cette classe',
    bloccoRiservato: (nome) =>
      `${nome} : parle de personnes précises. En l’ouvrant, toute la classe le voit.`,
    mostraBlocco: (nome) => `Montrer à la classe : ${minuscolo(nome)}`,
    statiOra: {
      pianificata: 'La leçon revient parmi celles à faire : ce qui est déjà écrit reste',
      svolta: 'La leçon est donnée : elle sort des tâches en suspens et compte dans le total des heures',
      annullata:
        'Reste dans le registre, marquée comme non donnée : les données saisies ne se perdent pas',
    },
    segnata: {
      pianificata: 'Leçon replanifiée.',
      svolta: 'Leçon marquée comme donnée.',
      annullata: 'Leçon annulée.',
    },
    annullareTitolo: 'Annuler la leçon ?',
    annullareTesto:
      'Elle reste dans le registre, marquée comme non donnée. Les données déjà saisies ne se ' +
      'perdent pas.',
    annullareConferma: 'Annuler la leçon',
    nuovoAnno: 'Nouvelle année scolaire',
    nuovoAnnoAiuto:
      'Une nouvelle année, dans son propre document : elle s’ouvre tout de suite, et tu ' +
      'l’enregistres sous un nom quand tu veux',
    apri: 'Ouvrir une année…',
    apriAiuto: 'Un autre document « .regi », choisi sur le disque',
    importaRegistro: 'Importer d’un autre registre…',
    importaRegistroAiuto:
      'D’un autre document « .regi » : paramètres, branches, classes avec personnes et ' +
      'cours, plans et calendriers. Jamais de leçons ni de notes',
    salvaConNome: 'Enregistrer l’année sous…',
    salvaConNomeAiuto:
      'La nouvelle année n’est pas encore enregistrée : choisis son nom et le dossier où la garder',
    salvaAiuto: 'Le registre enregistre tout seul : cette commande n’attend plus, et le signale',
    ricarica: 'Recharger',
    ricaricaAiuto: 'Relit le document sur le disque : utile si quelqu’un d’autre l’a modifié',
    chiudi: 'Fermer l’année',
    chiudiAiuto:
      'Ferme le document et libère le fichier : pour qu’il monte sur OneDrive, ou pour le ' +
      'reprendre depuis un autre ordinateur',
    nessunDocumento: 'Aucun document n’est ouvert.',
    cartella: 'Ouvrir le dossier du fichier',
    cartellaAiuto: 'Ouvre le dossier du fichier ouvert, avec le fichier déjà sélectionné',
    modificaAnno: 'Modifier l’année',
    modificaAnnoAiuto: 'Dates, semestres et semaines de l’année en cours',
    pause: 'Vacances et interruptions',
    annulla: 'Annuler',
    annullaAiuto: 'Revient sur le dernier geste fait dans le registre',
    annullaAiutoPassi: (passi) =>
      `Revient sur le dernier geste fait dans le registre (${plurale(passi, 'pas', 'pas')})`,
    nienteDaAnnullare: 'Il n’y a rien à annuler.',
    ripristina: 'Rétablir',
    ripristinaAiuto: 'Refait le geste qui vient d’être annulé',
    ripristinaAiutoPassi: (passi) =>
      `Refait le geste qui vient d’être annulé (${plurale(passi, 'pas', 'pas')})`,
    nienteDaRipristinare: 'Il n’y a rien à rétablir.',
    ingrandisci: 'Agrandir',
    ingrandisciAiuto: 'Texte et cadres plus grands, d’un cran',
    riduci: 'Réduire',
    riduciAiuto: 'Texte et cadres plus petits, d’un cran : on en voit davantage',
    dimensioneNormale: 'Taille normale',
    dimensioneNormaleAiuto: 'Remet la fenêtre à sa taille',
    schermoIntero: 'Plein écran',
    schermoInteroAiuto:
      'La fenêtre de l’enseignant occupe tout l’écran — ce n’est pas l’écran pour la classe',
    esci: 'Quitter le registre',
    esciAiuto:
      'Éteint complètement le registre, icône près de l’horloge comprise. ' +
      'Ce qui a été écrit est déjà enregistré',
    ripara: 'Réparer le registre',
    riparaAiuto: 'Remet en ordre les références cassées qui se corrigent sans rien perdre',
    nienteDaRiparare: 'Il n’y a rien à réparer.',
    oggiAiuto: 'Affiche dans le calendrier la semaine d’aujourd’hui',
    mesePrima: 'Le mois d’avant',
    settimanaPrima: 'La semaine d’avant',
    meseDopo: 'Le mois d’après',
    settimanaDopo: 'La semaine d’après',
    modificaAiuto:
      'Les leçons en main : dans le calendrier, tire sur le vide pour en créer une, tire les ' +
      'poignées pour l’allonger, flèches pour la déplacer, Ctrl+D pour la copier, Suppr pour la ' +
      'supprimer, Échap pour sortir ; dans la page d’une leçon, ouvre « Modifier la leçon »',
    calendarioIcs: 'Calendrier ICS',
    calendarioIcsAiuto:
      'Montre, en pointillé à côté des leçons, les événements du calendrier ICS du document',
    nessunCalendarioIcs:
      'Aucun calendrier ICS dans le document : il s’ajoute depuis Paramètres › Année et ' +
      'horaire › ' +
      'Calendriers ICS.',
    confronta: 'Comparer avec le calendrier',
    confrontaAiuto:
      'Les calendriers ICS du document : on en choisit un à comparer, et le registre propose les ' +
      'leçons à créer ou à aligner',
    oraDaCompilare: 'Leçon à remplir',
    prossimaOra: 'Prochaine leçon',
    oraDaCompilareAiuto: 'Ouvre la leçon qui attend : le trou à combler, ou celle qui vient',
    nessunOraDaCompilare: 'Il n’y a aucune leçon à remplir.',
    stai: 'C’est la leçon que tu es en train de remplir.',
    nuovaOra: 'Nouvelle leçon',
    nuovaOraAiuto: 'Une leçon hors horaire, ou la première d’un cours tout juste créé',
    nuovaConsegna: 'Nouveau devoir',
    nuovaConsegnaAiuto: 'Quelque chose qu’on donne et qui doit revenir : un devoir, un document',
    nessunCorsoPerConsegna: 'Il n’y a encore aucun cours auquel le donner.',
    nuovoCorso: 'Nouveau cours',
    nuovoCorsoAiuto: 'Une branche pour une classe, avec son horaire',
    nuovaClasse: 'Nouvelle classe',
    modificaOra: 'Modifier la leçon',
    modificaOraAiuto: 'Jour, horaire, salle et pauses de cette leçon',
    accendiModifica: 'Active « Modifier » (Ctrl+E) pour changer la leçon.',
    vaiAlRegistro: 'Aller au registre',
    vaiAlRegistroAiuto: 'Ouvre le registre de la leçon qui utilise ce déroulement',
    pianoSenzaOra:
      'Ce déroulement n’est encore sur aucune leçon : attribue-le depuis une leçon du calendrier.',
    duplicaAiuto: 'Une copie à adapter : c’est ainsi que le même plan sert à un autre cours',
    eliminaAiuto: 'Retire le déroulement et le matériel qui y est attaché',
    oraInQuestoCorso: 'Leçon dans ce cours',
    aggiungiColonna: 'Ajouter une colonne',
    aggiungiColonnaAiuto: 'Une chose à faire une fois, à cocher personne par personne',
    colonne: 'Colonnes',
    colonneAiuto: 'Toutes les colonnes ensemble : les renommer, les ordonner, les retirer',
    senzaColonne: 'Le check de ce cours n’a pas encore de colonnes.',
    trovaIndirizzi: 'Trouver les adresses',
    trovaIndirizziAiuto:
      'Demande à OpenStreetMap où se trouvent les adresses qui n’ont pas encore de point. ' +
      'C’est le seul geste du registre qui envoie à l’extérieur une donnée personnelle, et ' +
      'c’est pourquoi on le lance à la main : la réponse reste enregistrée, et n’est plus ' +
      'redemandée.',
    tuttiTrovati: 'Chaque adresse saisie a déjà son point sur la carte.',
    rifaiIndirizzi: 'Refaire les adresses',
    rifaiIndirizziAiuto:
      'Redemande aussi celles qui ont déjà un point : utile quand une adresse incomplète est ' +
      'tombée dans la mauvaise localité, et qu’on l’a corrigée dans les données personnelles.',
    rifareTitolo: 'Refaire toutes les adresses ?',
    rifareTesto:
      'Les adresses des classes sur la carte repartent au géocodeur, même celles déjà ' +
      'trouvées. Il faut environ une seconde par adresse.',
    rifai: 'Refaire',
    inquadra: 'Tout afficher',
    inquadraAiuto: 'Ramène la carte sur le cadre qui contient tous les points allumés',
    nuovaPersona: 'Nouvelle personne en formation',
    nuovaPersonaAiuto:
      'Une nouvelle personne dans une classe de l’année : on choisit la classe, s’il y en a ' +
      'plusieurs',
    aggiungiAlGruppo: 'Ajouter au groupe',
    incollaElenco: 'Coller la liste',
    incollaElencoAiuto: 'Une liste copiée depuis un tableau devient le groupe de la classe',
    importaClasse: 'Importer une classe d’une année…',
    importaClasseAiuto:
      `Une classe d’une autre année, avec ses ${lessico().pif.plurale} et, si on veut, ses cours`,
    nessunAltroAnno:
      'Parmi les récents, il n’y a pas d’autre année d’où reprendre une classe.',
    nuovaComunicazione: 'Nouvelle communication',
    nuovoPeriodoAssenze: 'Nouvelle période d’absence',
    nuovoPeriodoAssenzeAiuto: 'La feuille des absences à faire signer, pour une période',
    nuovaPendenza: 'Nouvelle tâche en suspens',
    chiediDocumento: 'Demander un document',
    caricaPdf: 'Charger des PDF',
    rileggiScansioni: 'Relire les scans',
    rileggiScansioniAiuto:
      'Remet en file la lecture de toutes les pages encore à trier, dans tous les PDF de ' +
      'cette classe. Les pages déjà archivées restent où elles sont.',
    ocrSpento: 'La lecture automatique des scans est désactivée',
    nessunPdf: 'Il n’y a aucun PDF à diviser',
    documentoPersonale: 'Document personnel',
    nuovoPeriodo: 'Nouvelle période',
    nuovoRecapito: 'Nouvelle adresse de contact',
    elencoClasse: 'Liste de la classe',
    spegniSchermo: 'Éteindre l’écran',
    proietta: 'Projeter',
    spegniSchermoAiuto: 'Ferme la fenêtre qui est sur le projecteur',
    proiettaAiuto:
      'Ouvre l’écran pour la classe, dans une fenêtre à amener sur le projecteur',
    riprendi: 'Reprendre',
    pausa: 'Pause',
    pausaAiuto: 'Masque le contenu en laissant la fenêtre où elle est : on reprend comme avant',
    schedaPrecedente: 'Fiche précédente',
    schedaSuccessiva: 'Fiche suivante',
    nomiVisibili: 'Noms visibles',
    senzaNomi: 'Sans noms',
    nomiAiuto: 'Si les noms apparaissent à côté des notes et des documents manquants',
    misureStrette: 'Compact',
    misureLarghe: 'Grand',
    misureStretteAiuto: 'Caractères plus petits : il tient plus de choses sur la page',
    misureLargheAiuto: 'Caractères plus grands : on lit de plus loin, mais il en tient moins',
    vistaProiettataAiuto: 'Le jour est celui ouvert dans le calendrier du registre',
    calendarioNonAperto: 'La fiche Calendrier n’est pas celle ouverte à l’écran.',
    aggiornaTutto: 'Tout mettre à jour',
    aggiornaTuttoAiuto: (semestre) =>
      'Tout ce que le cours sait imprimer : présences, notes, une fiche par personne en ' +
      'formation et par épreuve, le procès-verbal de chaque leçon donnée, les plans, le ' +
      `trombinoscope et le dossier de classe (${semestre})`,
    combinaScelti: (quanti) => `Combiner les ${quanti} choisis`,
    combinaDocumenti: 'Combiner les documents choisis',
    combinaAiuto: 'Un seul PDF avec, à la suite, les documents cochés : il demande un nom',
    almenoDue:
      'Coche au moins deux documents dans les lignes : la compilation les met à la suite dans ' +
      'un seul PDF.',
    togliSpunte: 'Retirer les coches',
    togliSpunteAiuto: 'Aucun document choisi : on repart de zéro',
    nessunoSpuntato: 'Aucun document n’est coché.',
    collegaPosta: 'Connecter le courrier',
    collegaPostaAiuto:
      'Demande l’adresse et fait se connecter depuis le navigateur : le jeton reste dans le ' +
      'trousseau',
    provaPosta: 'Tester le courrier',
    provaPostaAiuto: 'Demande à qui est la boîte, sans rien envoyer',
    provaInvio: 'Envoyer un e-mail de test',
    provaInvioAiuto:
      'Envoie un vrai e-mail à l’adresse que tu écris : c’est le seul moyen de tester l’envoi',
    scollegaPosta: 'Déconnecter le courrier',
  },
  en: {
    gruppi: {
      documento: 'The document',
      anno: 'The year',
      modifica: 'Edit',
      finestra: 'The window',
      manutenzione: 'Maintenance',
      adesso: 'Now',
      comeSiGuarda: 'View',
      modificaLeOre: 'Edit lessons',
      calendarioIcs: 'ICS calendar',
      cheCosaSiGuarda: 'What you see',
      crea: 'Create',
      statoDellOra: 'Lesson status',
      ora: 'The lesson',
      piano: 'The plan',
      check: 'The check',
      indirizzi: 'Addresses',
      elenco: 'List',
      famiglie: 'Families',
      classe: 'Class',
      gestione: 'Management',
      schermo: 'The screen',
      sulloSchermo: 'On screen',
      comeSiVede: 'Display',
      calendarioProiettato: 'Projected calendar',
      documentiDi: 'Documents by',
      genera: 'Generate',
      composizioni: 'Compilations',
      chiLiRifa: 'Who remakes them',
      posta: 'Mail',
    },
    nonConQuelCheMostra: 'Not with what the page is showing now.',
    dallaSuaPagina: 'This is done from its own page: open it, and you’ll find it in the bar.',
    schermoSpento: 'The class screen is off.',
    unaSchedaSola: 'Only one card is on: there is nothing to scroll through.',
    nessunCorsoPerLezioni: 'There is no course yet to create lessons for.',
    nessunPianoAperto: 'No plan open.',
    selezionaClasse: 'Select a class you are the class teacher of',
    primaUnCorso: 'Create a course for this class first',
    bloccoRiservato: (nome) =>
      `${nome}: this is about individual people. Open it and the whole class sees it.`,
    mostraBlocco: (nome) => `Show ${minuscolo(nome)} to the class`,
    statiOra: {
      pianificata: 'The lesson goes back among those to do: what is already written stays',
      svolta: 'The lesson is held: it leaves the pending items and counts towards the hours taught',
      annullata:
        'Stays in the register, marked as not held: the data entered is not lost',
    },
    segnata: {
      pianificata: 'Lesson planned again.',
      svolta: 'Lesson marked as held.',
      annullata: 'Lesson cancelled.',
    },
    annullareTitolo: 'Cancel the lesson?',
    annullareTesto:
      'It stays in the register, marked as not held. The data already entered is not lost.',
    annullareConferma: 'Cancel the lesson',
    nuovoAnno: 'New school year',
    nuovoAnnoAiuto:
      'A new year, in a document of its own: it opens straight away, and you save it under a ' +
      'name whenever you like',
    apri: 'Open a year…',
    apriAiuto: 'Another “.regi” document, chosen from the disk',
    importaRegistro: 'Import from another register…',
    importaRegistroAiuto:
      'From another “.regi” document: settings, subjects, classes with people and courses, ' +
      'plans and calendars. Never lessons or grades',
    salvaConNome: 'Save the year as…',
    salvaConNomeAiuto:
      'The new year is not saved yet: choose what to call it and which folder to keep it in',
    salvaAiuto: 'The register saves by itself: this saves right away instead of waiting, and says so',
    ricarica: 'Reload',
    ricaricaAiuto: 'Reads the document again from the disk: useful if someone else has changed it',
    chiudi: 'Close the year',
    chiudiAiuto:
      'Closes the document and frees the file: so it can upload to OneDrive, or be picked up ' +
      'on another computer',
    nessunDocumento: 'There is no document open.',
    cartella: 'Open the file’s folder',
    cartellaAiuto: 'Opens the folder the open file is in, with the file already highlighted',
    modificaAnno: 'Edit the year',
    modificaAnnoAiuto: 'Dates, semesters and weeks of the year in use',
    pause: 'Holidays and breaks',
    annulla: 'Undo',
    annullaAiuto: 'Undoes the last step taken in the register',
    annullaAiutoPassi: (passi) =>
      `Undoes the last step taken in the register (${plurale(passi, 'step', 'steps')})`,
    nienteDaAnnullare: 'There is nothing to undo.',
    ripristina: 'Redo',
    ripristinaAiuto: 'Redoes the step just undone',
    ripristinaAiutoPassi: (passi) =>
      `Redoes the step just undone (${plurale(passi, 'step', 'steps')})`,
    nienteDaRipristinare: 'There is nothing to redo.',
    ingrandisci: 'Zoom in',
    ingrandisciAiuto: 'Text and panels one step larger',
    riduci: 'Zoom out',
    riduciAiuto: 'Text and panels one step smaller: more fits in',
    dimensioneNormale: 'Actual size',
    dimensioneNormaleAiuto: 'Puts the window back to its size',
    schermoIntero: 'Full screen',
    schermoInteroAiuto:
      'The teacher’s window fills the whole screen — this is not the class screen',
    esci: 'Quit the register',
    esciAiuto:
      'Shuts the register down completely, including the icon next to the clock. ' +
      'Whatever has been written is already saved',
    ripara: 'Repair the register',
    riparaAiuto: 'Fixes broken references that can be corrected without losing anything',
    nienteDaRiparare: 'There is nothing to repair.',
    oggiAiuto: 'Shows this week in the calendar',
    mesePrima: 'The previous month',
    settimanaPrima: 'The previous week',
    meseDopo: 'The next month',
    settimanaDopo: 'The next week',
    modificaAiuto:
      'Lessons in hand: in the calendar drag on an empty spot to create one, drag the handles ' +
      'to lengthen it, arrows to move it, Ctrl+D to copy it, Del to delete it, Esc to leave; ' +
      'on a lesson’s page it opens “Edit the lesson”',
    calendarioIcs: 'ICS calendar',
    calendarioIcsAiuto:
      'Shows the events of the document’s ICS calendar, dashed, next to the lessons',
    nessunCalendarioIcs:
      'No ICS calendar in the document: add one from Settings › Year and timetable › ICS ' +
      'calendars.',
    confronta: 'Compare with the calendar',
    confrontaAiuto:
      'The document’s ICS calendars: you choose one to compare, and the register suggests the ' +
      'lessons to create or align',
    oraDaCompilare: 'Lesson to fill in',
    prossimaOra: 'Next lesson',
    oraDaCompilareAiuto: 'Opens the lesson that is waiting: the gap to fill, or the one coming up',
    nessunOraDaCompilare: 'There is no lesson to fill in.',
    stai: 'This is the lesson you are filling in.',
    nuovaOra: 'New lesson',
    nuovaOraAiuto: 'A lesson outside the timetable, or the first of a course just created',
    nuovaConsegna: 'New assignment',
    nuovaConsegnaAiuto: 'Something handed out that has to come back: a task, a document',
    nessunCorsoPerConsegna: 'There is no course yet to give it to.',
    nuovoCorso: 'New course',
    nuovoCorsoAiuto: 'A subject for a class, with its timetable',
    nuovaClasse: 'New class',
    modificaOra: 'Edit the lesson',
    modificaOraAiuto: 'Day, time, room and breaks of this lesson',
    accendiModifica: 'Turn on “Edit” (Ctrl+E) to change the lesson.',
    vaiAlRegistro: 'Go to the register',
    vaiAlRegistroAiuto: 'Opens the register of the lesson that uses this outline',
    pianoSenzaOra:
      'This outline is not on any lesson yet: assign it from a lesson in the calendar.',
    duplicaAiuto: 'A copy to adapt: that is how the same plan serves another course',
    eliminaAiuto: 'Removes the outline and the materials attached to it',
    oraInQuestoCorso: 'Lesson in this course',
    aggiungiColonna: 'Add a column',
    aggiungiColonnaAiuto: 'Something to do once, ticked off person by person',
    colonne: 'Columns',
    colonneAiuto: 'All the columns together: rename them, reorder them, remove them',
    senzaColonne: 'This course’s check has no columns yet.',
    trovaIndirizzi: 'Find addresses',
    trovaIndirizziAiuto:
      'Asks OpenStreetMap where the addresses that have no point yet are. It is the only step in ' +
      'the register that sends personal data outside, and that is why you press it by hand: ' +
      'the answer stays saved, and is not asked for again.',
    tuttiTrovati: 'Every address entered already has its point on the map.',
    rifaiIndirizzi: 'Redo the addresses',
    rifaiIndirizziAiuto:
      'Asks again for those that already have a point too: useful when an incomplete address ' +
      'landed in the wrong town, and it has been corrected in the personal details.',
    rifareTitolo: 'Redo all the addresses?',
    rifareTesto:
      'The addresses of the classes on the map go back to the geocoder, even those already ' +
      'resolved. It takes about a second per address.',
    rifai: 'Redo',
    inquadra: 'Fit everything',
    inquadraAiuto: 'Brings the map back to the frame that holds all the points shown',
    nuovaPersona: 'New learner',
    nuovaPersonaAiuto:
      'A new person in a class of the year: you choose the class, if there is more than one',
    aggiungiAlGruppo: 'Add to group',
    incollaElenco: 'Paste list',
    incollaElencoAiuto: 'A list copied from a spreadsheet becomes the class group',
    importaClasse: 'Import class from year…',
    importaClasseAiuto:
      `A class from another year, with its ${lessico().pif.plurale} and, if you like, its courses`,
    nessunAltroAnno: 'Among the recent ones there is no other year to bring a class from.',
    nuovaComunicazione: 'New message',
    nuovoPeriodoAssenze: 'New absence period',
    nuovoPeriodoAssenzeAiuto: 'The absence sheet to be signed, for one period',
    nuovaPendenza: 'New pending item',
    chiediDocumento: 'Request a document',
    caricaPdf: 'Load PDFs',
    rileggiScansioni: 'Reread the scans',
    rileggiScansioniAiuto:
      'Queues again the reading of all the pages still to sort, in all this class’s PDFs. ' +
      'Pages already filed stay where they are.',
    ocrSpento: 'Automatic reading of scans is off',
    nessunPdf: 'There is no PDF to split',
    documentoPersonale: 'Personal document',
    nuovoPeriodo: 'New period',
    nuovoRecapito: 'New contact address',
    elencoClasse: 'Class list',
    spegniSchermo: 'Turn off the screen',
    proietta: 'Project',
    spegniSchermoAiuto: 'Closes the window on the projector',
    proiettaAiuto: 'Opens the class screen, in a window to move onto the projector',
    riprendi: 'Resume',
    pausa: 'Pause',
    pausaAiuto: 'Hides the content and leaves the window where it is: it picks up as it was',
    schedaPrecedente: 'Previous card',
    schedaSuccessiva: 'Next card',
    nomiVisibili: 'Names shown',
    senzaNomi: 'No names',
    nomiAiuto: 'Whether the names appear next to the grades and the missing documents',
    misureStrette: 'Compact',
    misureLarghe: 'Large',
    misureStretteAiuto: 'Smaller type: more fits on the page',
    misureLargheAiuto: 'Larger type: it reads from further away, but less fits',
    vistaProiettataAiuto: 'The day is the one open in the register’s calendar',
    calendarioNonAperto: 'The Calendar card is not the one open on the screen.',
    aggiornaTutto: 'Update everything',
    aggiornaTuttoAiuto: (semestre) =>
      'Everything the course can print: attendance, grades, one sheet per learner and per ' +
      'test, the lesson record of each lesson held, the plans, the photo sheet and the class file ' +
      `(${semestre})`,
    combinaScelti: (quanti) => `Combine the ${quanti} chosen`,
    combinaDocumenti: 'Combine the chosen documents',
    combinaAiuto: 'A single PDF with the ticked documents in a row: it asks what to call it',
    almenoDue:
      'Tick at least two documents in the rows: the compilation puts them in a row in a single ' +
      'PDF.',
    togliSpunte: 'Clear the ticks',
    togliSpunteAiuto: 'No document chosen: start again from scratch',
    nessunoSpuntato: 'No document is ticked.',
    collegaPosta: 'Connect mail',
    collegaPostaAiuto:
      'Asks for the address and signs in from the browser: the token stays in the keychain',
    provaPosta: 'Test mail',
    provaPostaAiuto: 'Asks whose mailbox it is, without sending anything',
    provaInvio: 'Send a test email',
    provaInvioAiuto:
      'Sends a real email to the address you type: it is the only way to test sending',
    scollegaPosta: 'Disconnect mail',
  },
})
