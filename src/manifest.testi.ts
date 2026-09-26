// Titoli dei comandi e testi delle impostazioni, con le chiavi di `manifest.ts`
// tenute allineate dal compilatore. Le `scelte` vanno per valore, controllate da
// `tests/i18n/catalogs.test.mjs`. L'aiuto di una scelta fa da etichetta: forma
// «Nome: frase», che le schede di tema e lingua dividono in titolo e testo.
// Delle lingue qui c'è solo «Sistema»: le altre si chiamano da sé (`manifest.ts`).

import { catalogo } from './i18n/index.js'
import { PIF, il } from './domain/lexicon.js'
import type { ChiaveImpostazione, IdComando } from './manifest.js'

/** Quel che si legge di un'impostazione. */
interface TestoImpostazione {
  /** Il nome della voce come lo legge chi insegna («Minuti di anticipo»). */
  readonly etichetta: string
  /** Il testo discorsivo sotto il campo. */
  readonly descrizione: string
  /** L'aiuto di ogni scelta, per valore. */
  readonly scelte?: Readonly<Record<string, string>>
  /** Per un interruttore che `richiede` qualcosa: il perché, detto a chi lo preme. */
  readonly motivo?: string
}

interface TestiManifesto {
  /** Il titolo della finestra delle impostazioni. */
  readonly titoloImpostazioni: string
  readonly comandi: Readonly<Record<IdComando, string>>
  readonly impostazioni: Readonly<Record<ChiaveImpostazione, TestoImpostazione>>
}

const it: TestiManifesto = {
  titoloImpostazioni: 'Regiclass',
  comandi: {
    'registroDocenti.apri': 'Mostra il registro',
    'registroDocenti.guida': 'Guida',
    'registroDocenti.impostazioni': 'Impostazioni',
    'registroDocenti.proietta': 'Proietta per la classe',
    'registroDocenti.oggi': 'Oggi',
    'registroDocenti.nuovaLezione': 'Nuova lezione',
    'registroDocenti.nuovaClasse': 'Nuova classe',
    'registroDocenti.nuovoCorso': 'Nuovo corso (una materia a una classe)',
    'registroDocenti.nuovoPiano': 'Nuovo piano lezione',
    'registroDocenti.nuovaValutazione': 'Nuovo momento di valutazione',
    'registroDocenti.nuovoAnno': 'Nuovo anno scolastico',
    'registroDocenti.ricarica': 'Ricarica i dati',
    'registroDocenti.salvaConNome': 'Salva l’anno con nome…',
    'registroDocenti.chiudiDocumento': 'Chiudi l’anno',
    'registroDocenti.provaPosta': 'Prova il collegamento della posta',
    'registroDocenti.provaInvioPosta': 'Manda una mail di prova',
    'registroDocenti.collegaPosta': 'Collega la casella di posta',
    'registroDocenti.scollegaPosta': 'Scollega la casella di posta',
    'registroDocenti.azzeraPosta': 'Azzera la posta (portachiavi, memoria, impostazioni)',
    'registroDocenti.apriCartellaDati': 'Apri la cartella dei dati',
  },
  impostazioni: {
    'registroDocenti.aspetto.lingua': {
      etichetta: 'Lingua',
      scelte: {
        sistema: 'Sistema: segue la lingua di Windows.',
      },
      descrizione:
        'La lingua in cui il registro parla: menu, pagine, stampe, e-mail e assistente. «Sistema» ' +
        'segue la lingua di Windows, e se il registro non la sa parla italiano. Quel che è già ' +
        'scritto nel documento — nomi, note, titoli delle lezioni — resta com’è.',
    },
    'registroDocenti.aspetto.tema': {
      etichetta: 'Tema',
      scelte: {
        sistema: 'Sistema: chiaro o scuro come Windows, e cambia insieme a lui.',
        chiaro: 'Chiaro: sempre, anche di sera. È quello che si legge meglio proiettato.',
        scuro: 'Scuro: sempre, anche di giorno.',
      },
      descrizione:
        'Chiaro o scuro. Vale per il registro, per lo schermo della classe e per la finestra ' +
        'delle impostazioni. «Sistema» segue Windows e cambia da sé quando cambia lui.',
    },
    'registroDocenti.vassoio.attivo': {
      etichetta: 'Icona accanto all’orologio',
      descrizione:
        'Tiene un’icona del registro accanto all’orologio. Il suo menu elenca i corsi dell’anno e, ' +
        'dentro ognuno, le ore divise fra svolte, da chiudere, in corso e in programma: porta ' +
        'sull’ora con un clic. Da lì passa anche l’uscita dall’applicazione. Ha effetto al ' +
        'prossimo avvio: l’icona decide anche che cosa fa la X delle finestre, e cambiarla a metà ' +
        'sessione cambierebbe quel gesto sotto le mani.',
    },
    'registroDocenti.vassoio.chiusuraNelVassoio': {
      etichetta: 'La X lascia il registro nell’icona',
      descrizione:
        'Chiudendo l’ultima finestra il registro resta acceso accanto all’orologio invece di uscire, ' +
        'e si riapre con un clic sull’icona. Si esce con «Esci dal registro», nel menu dell’icona. ' +
        'Spento, la X chiude l’applicazione.',
    },
    'registroDocenti.avvio.conWindows': {
      etichetta: 'Parti con Windows',
      descrizione:
        'Accende il registro insieme al computer, senza aprire nessuna finestra: resta l’icona ' +
        'accanto all’orologio. Vale per il registro installato e per quello portabile, purché il ' +
        'suo file resti dov’era.',
    },
    'registroDocenti.avvio.soloVassoio': {
      etichetta: 'Parti senza aprire il registro',
      descrizione:
        'All’avvio non apre la finestra del registro, anche lanciandolo a mano: si trova l’icona ' +
        'accanto all’orologio, e la finestra si apre quando la si chiede. Se l’icona non c’è la ' +
        'finestra si apre lo stesso — un’applicazione viva e invisibile non si riprenderebbe più.',
    },
    'registroDocenti.promemoria.attivo': {
      etichetta: 'Avviso prima della lezione',
      descrizione:
        'Avvisa con una notifica del sistema poco prima che una lezione cominci, dicendo quale ' +
        'classe e che cosa resta aperto per quel corso. La notifica si preme e apre il registro ' +
        'di quell’ora. Non arriva mentre si sta già guardando il registro, e non arriva due volte ' +
        'per la stessa ora.',
    },
    'registroDocenti.promemoria.anticipoMinuti': {
      etichetta: 'Minuti di anticipo',
      descrizione:
        'Quanti minuti prima dell’inizio arriva l’avviso. Cinque è il tempo di prendere il ' +
        'computer e salire una rampa di scale; zero lo fa arrivare all’ora esatta.',
    },
    'registroDocenti.proiezione.schermoIntero': {
      etichetta: 'Proiezione a schermo intero',
      descrizione:
        'Mette la finestra della proiezione a schermo intero appena aperta. Utile quando il secondo ' +
        'schermo è solo il proiettore; da spegnere se la si tiene accanto al registro.',
    },
    'registroDocenti.posta.mittente': {
      etichetta: 'Indirizzo del mittente',
      descrizione:
        'L’indirizzo da cui si scrive, quello che le famiglie vedono in «Da» e a cui rispondono: per ' +
        'esempio nome.cognome@edu.ti.ch. Non è una credenziale. Vale in tutti e due i casi — il ' +
        'server e il file .eml — e serve anche perché una comunicazione tutta in copia nascosta ' +
        'abbia qualcuno nel campo «A». Vuoto vuol dire «lo stesso del nome di accesso».',
    },
    'registroDocenti.posta.utente': {
      etichetta: 'Nome di accesso',
      descrizione:
        'Il nome con cui il registro entra nella casella: nel tenant di una scuola è la sigla che dà ' +
        'l’amministrazione, per esempio xxx000@edu.ti.ch, diversa dall’indirizzo con nome e cognome. ' +
        'Vuoto vuol dire «lo stesso del mittente». Quel che apre la casella non sta qui — sta nel ' +
        'portachiavi del sistema, e ce lo mette il comando «Collega la casella di posta».',
    },
    'registroDocenti.posta.invioDiretto': {
      etichetta: 'Spedisci senza bozza',
      descrizione:
        'Spedisce le comunicazioni da sé invece di preparare una bozza da rileggere e mandare a mano. ' +
        'Vuole la casella collegata: senza, le comunicazioni restano bozze comunque. Prima di ogni ' +
        'giro il registro chiede conferma, e quel che parte non si può richiamare.',
    },
    'registroDocenti.recapiti.telefono': {
      etichetta: 'Chiamate',
      scelte: {
        tel: 'Il programma di Windows per le chiamate (Collegamento al telefono, Teams, Skype).',
        msteams: 'Teams, saltando la scelta di Windows.',
        skype: 'Skype, saltando la scelta di Windows.',
        callto: 'Il vecchio schema di Skype, per chi ha ancora quello registrato.',
        nessuno: 'Nessuno: i numeri restano da leggere e da copiare.',
      },
      descrizione:
        'Con che cosa si compone un numero premuto nell’anagrafica. La prima scelta va bene quasi ' +
        'sempre; se su questa macchina non apre niente, si nomina il programma o si mette «nessuno».',
    },
    'registroDocenti.recapiti.posta': {
      etichetta: 'Mail',
      scelte: {
        sistema: 'Il programma di posta predefinito di Windows.',
        outlook: 'Outlook, anche quando il predefinito è un altro programma.',
        outlookWeb: 'Outlook sul web, nel browser.',
        nessuno: 'Nessuno: gli indirizzi restano da leggere e da copiare.',
      },
      descrizione:
        'Con che cosa si apre una mail nuova premendo un indirizzo nell’anagrafica. «Outlook» serve ' +
        'quando Outlook c’è ma il predefinito è un altro programma: scrivere da un programma ' +
        'diverso vuol dire scrivere da un’altra casella. Non riuscendo ad aprirlo il registro ' +
        'ripiega sul predefinito e lo dice.',
    },
    'registroDocenti.modelli.cartella': {
      etichetta: 'Cartella dei modelli',
      descrizione:
        'Dove il registro tiene i modelli del linguaggio — i file .gguf che scarica o che ci si ' +
        'trascina dentro. Vuota — il caso normale — li tiene accanto alle impostazioni del ' +
        'programma. Si sceglie un’altra cartella per tenerli su un altro disco, perché pesano ' +
        'gigabyte, o per usare quelli che si hanno già: il registro li vede tutti e non ne copia ' +
        'nessuno.',
    },
    'registroDocenti.modelli.scaricoAutomatico': {
      etichetta: 'Scarica da sé i programmi che mancano',
      descrizione:
        'La prima volta che serve, il registro si prende da sé il programma che fa leggere le ' +
        'scansioni — «llama-mtmd-cli», una volta sola — in una cartella sua dentro i dati ' +
        'dell’applicazione. Non installa niente, controlla l’impronta di quel che scarica e la ' +
        'versione è fissata nel programma. Spento, il programma si sceglie a mano più sotto: serve ' +
        'su una connessione a consumo. I modelli del linguaggio non c’entrano: quelli si scaricano ' +
        'dalla sezione «Modelli linguistici» delle impostazioni. Nemmeno la dettatura: quel che le ' +
        'serve lo scarica voicebox, per conto suo.',
    },
    'registroDocenti.ocr.attivo': {
      etichetta: 'Lettura delle scansioni',
      descrizione:
        'Legge con un modello locale le pagine dei PDF che non contengono testo (scansioni), per ' +
        `riconoscere ${il(PIF)}. Vuole un modello che sappia guardare, con il suo proiettore, ` +
        'scelti dalla sezione «Modelli linguistici» delle impostazioni.',
      motivo:
        'La lettura delle scansioni non si accende senza un modello che sappia guardare, con ' +
        'il suo proiettore: si sceglie dalla sezione «Modelli linguistici» delle impostazioni.',
    },
    'registroDocenti.ocr.modello': {
      etichetta: 'Modello che legge',
      descrizione:
        'Il modello con cui si leggono le scansioni: deve saper guardare le immagini. Si sceglie ' +
        'dalla sezione «Modelli linguistici» delle impostazioni, che è anche il posto da cui ' +
        'si scarica.',
    },
    'registroDocenti.ocr.proiettore': {
      etichetta: 'Proiettore',
      descrizione:
        'Il secondo file del modello che guarda — quello con «mmproj» nel nome —, che trasforma ' +
        'l’immagine in qualcosa che il modello sappia leggere. Lo scarica insieme al modello la ' +
        'sezione «Modelli linguistici» delle impostazioni.',
    },
    'registroDocenti.ocr.programma': {
      etichetta: 'Programma llama-mtmd-cli',
      descrizione:
        'Una copia di «llama-mtmd-cli.exe» che si ha già — compilata, o con l’accelerazione della ' +
        'propria scheda video —: se c’è vince su quella che scarica il registro. Vuoto, se ne ' +
        'occupa il registro. Dev’essere un .exe: il registro fa partire esattamente questo ' +
        'programma e nient’altro.',
    },
    'registroDocenti.assistente.attivo': {
      etichetta: 'Assistente',
      descrizione:
        'Accende la pagina «Assistente»: si scrive una domanda in italiano — «quante ore ha ' +
        'perso la 4a in matematica?» — e un modello che gira sulla tua macchina la risponde ' +
        'leggendo il registro. Può soltanto leggere: non segna, non corregge e non manda ' +
        'niente a nessuno, e niente di quel che si chiede esce di qui.',
      motivo:
        'L’assistente non si accende senza un modello: se ne sceglie uno dalla sezione ' +
        '«Modelli linguistici» delle impostazioni.',
    },
    'registroDocenti.assistente.modello': {
      etichetta: 'Modello dell’assistente',
      descrizione:
        'Il modello con cui risponde l’assistente: deve saper chiamare gli strumenti («tool ' +
        'calling»), cosa che sotto i 3 miliardi di parametri diventa inaffidabile. Si sceglie ' +
        'dalla sezione «Modelli linguistici» delle impostazioni, che ne consiglia due e li ' +
        'scarica.',
    },
    'registroDocenti.dettatura.attivo': {
      etichetta: 'Dettatura',
      descrizione:
        'Mette un microfono accanto alla casella dell’assistente: si preme, si dice la domanda, e ' +
        'quel che si è detto viene scritto nella casella, dove si rilegge prima di mandarla. A ' +
        'riconoscere la voce è voicebox, un programma gratuito che si installa a parte e deve ' +
        'essere aperto mentre si detta: gira su questo computer, e la voce non esce di qui.',
    },
    'registroDocenti.dettatura.taglia': {
      etichetta: 'Modello della voce',
      scelte: {
        turbo: 'turbo — il più accurato fra i veloci, anche senza scheda video. Quello consigliato.',
        large: 'large — un poco più preciso di turbo, e lento senza scheda video.',
        medium: 'medium — una via di mezzo, per un computer che fatica con turbo.',
        small: 'small — veloce e leggero, ma sbaglia i cognomi.',
        base: 'base — il più piccolo: per provare, non per dettare davvero.',
      },
      descrizione:
        'Quale modello Whisper usa voicebox per capire l’italiano. La prima volta che se ne sceglie ' +
        'uno, voicebox lo scarica per conto suo — da qualche centinaio di MB a un paio di GB — e ' +
        'intanto la dettatura risponde «riprova fra poco».',
    },
    'registroDocenti.dettatura.indirizzo': {
      etichetta: 'Indirizzo di voicebox',
      descrizione:
        'Dove il registro trova voicebox. Quello scritto è l’indirizzo che voicebox usa da sé ' +
        'quando lo si apre: si cambia solo se lo si è avviato su un’altra porta. Dev’essere un ' +
        'indirizzo di questo computer — 127.0.0.1, localhost o [::1] —, perché è lì che il ' +
        'registro manda la voce: un indirizzo di un’altra macchina la farebbe uscire di qui, e il ' +
        'registro non lo accetta.',
    },
    'registroDocenti.aggiornamenti.controlloAutomatico': {
      etichetta: 'Cerca versioni nuove',
      descrizione:
        'Guarda da sé se è uscita una versione nuova del registro, all’accensione e poi ogni ' +
        'qualche ora. Chiede soltanto quale sia l’ultima versione pubblicata su GitHub — non manda ' +
        'niente del registro. Spento, si controlla solo premendo «Controlla adesso».',
    },
    'registroDocenti.aggiornamenti.scaricoAutomatico': {
      etichetta: 'Scarica subito la versione nuova',
      descrizione:
        'Quando c’è una versione nuova, la scarica senza chiedere. Spento, il registro dice che ' +
        'c’è e aspetta che si prema «Scarica»: serve su una linea a consumo.',
    },
    'registroDocenti.aggiornamenti.installaAllaChiusura': {
      etichetta: 'Installa uscendo dal registro',
      descrizione:
        'Una versione già scaricata si installa da sé la prossima volta che si esce dal registro, ' +
        'e alla riapertura c’è quella nuova. Spento, aspetta che si prema «Riavvia e aggiorna».',
    },
    'registroDocenti.api.condotto': {
      etichetta: 'Condotto locale',
      descrizione:
        'Fa rispondere il registro anche fuori dalle sue finestre, su un condotto locale — una ' +
        '«named pipe» su Windows — così che il comando «regi» e uno script possano parlargli ' +
        'senza aprire il pannello. Non apre nessuna porta di rete e non esce dalla macchina. È ' +
        'l’interruttore generale: spento non c’è niente in ascolto, e le due voci qui sotto non ' +
        'valgono. Acceso, però, ogni programma che gira con il tuo stesso accesso può usarlo ' +
        'senza chiedertelo. Accendilo se ti serve davvero, e spegnilo quando hai finito.',
    },
    'registroDocenti.api.lettura': {
      etichetta: 'Permetti di leggere',
      descrizione:
        'Lascia che dal condotto si guardi: presenze, assenze, medie, calendario, i dati delle ' +
        'persone in formazione già calcolati. Da sola non lascia cambiare niente, ma quel che esce ' +
        'sono dati di persone, e ogni programma che gira con il tuo accesso può chiederli.',
    },
    'registroDocenti.api.scrittura': {
      etichetta: 'Permetti di scrivere',
      descrizione:
        'Lascia che dal condotto si scriva: segnare un appello, mettere un voto, creare una ' +
        'lezione, far partire posta a tuo nome. Quel che uno script scrive per sbaglio resta ' +
        'scritto: accendila solo per il tempo che serve a quello script.',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    titoloImpostazioni: 'Regiclass',
    comandi: {
      'registroDocenti.apri': 'Klassenbuch anzeigen',
      'registroDocenti.guida': 'Hilfe',
      'registroDocenti.impostazioni': 'Einstellungen',
      'registroDocenti.proietta': 'Für die Klasse projizieren',
      'registroDocenti.oggi': 'Heute',
      'registroDocenti.nuovaLezione': 'Neue Stunde',
      'registroDocenti.nuovaClasse': 'Neue Klasse',
      'registroDocenti.nuovoCorso': 'Neuer Kurs (ein Fach für eine Klasse)',
      'registroDocenti.nuovoPiano': 'Neuer Unterrichtsplan',
      'registroDocenti.nuovaValutazione': 'Neue Leistungsbeurteilung',
      'registroDocenti.nuovoAnno': 'Neues Schuljahr',
      'registroDocenti.ricarica': 'Daten neu laden',
      'registroDocenti.salvaConNome': 'Schuljahr speichern unter…',
      'registroDocenti.chiudiDocumento': 'Schuljahr schliessen',
      'registroDocenti.provaPosta': 'Mailverbindung testen',
      'registroDocenti.provaInvioPosta': 'Test-E-Mail senden',
      'registroDocenti.collegaPosta': 'Postfach verbinden',
      'registroDocenti.scollegaPosta': 'Postfach trennen',
      'registroDocenti.azzeraPosta': 'Mail zurücksetzen (Schlüsselbund, Speicher, Einstellungen)',
      'registroDocenti.apriCartellaDati': 'Datenordner öffnen',
    },
    impostazioni: {
      'registroDocenti.aspetto.lingua': {
        etichetta: 'Sprache',
        scelte: {
          sistema: 'System: folgt der Sprache von Windows.',
        },
        descrizione:
          'Die Sprache des Klassenbuchs: Menüs, Seiten, Ausdrucke, E-Mails und Assistent. «System» ' +
          'folgt der Sprache von Windows; kennt das Klassenbuch sie nicht, spricht es Italienisch. ' +
          'Was schon im Dokument steht — Namen, Notizen, Titel der Stunden — bleibt, wie es ist.',
      },
      'registroDocenti.aspetto.tema': {
        etichetta: 'Design',
        scelte: {
          sistema: 'System: hell oder dunkel wie Windows, und wechselt mit ihm.',
          chiaro: 'Hell: immer, auch abends. Projiziert am besten lesbar.',
          scuro: 'Dunkel: immer, auch tagsüber.',
        },
        descrizione:
          'Hell oder dunkel. Gilt für das Klassenbuch, für den Klassenbildschirm und für das ' +
          'Einstellungsfenster. «System» folgt Windows und wechselt von selbst, wenn Windows wechselt.',
      },
      'registroDocenti.vassoio.attivo': {
        etichetta: 'Symbol neben der Uhr',
        descrizione:
          'Zeigt ein Symbol des Klassenbuchs neben der Uhr. Sein Menü listet die Kurse des Jahres und ' +
          'in jedem die Stunden, aufgeteilt in gehalten, abzuschliessen, laufend und geplant: ein ' +
          'Klick führt zur Stunde. Dort wird das Programm auch beendet. Wirkt beim nächsten Start: ' +
          'das Symbol bestimmt auch, was das X der Fenster tut, und es mitten in der Sitzung zu ' +
          'ändern, würde diese Geste unter den Händen verändern.',
      },
      'registroDocenti.vassoio.chiusuraNelVassoio': {
        etichetta: 'Das X lässt das Klassenbuch im Symbol',
        descrizione:
          'Beim Schliessen des letzten Fensters bleibt das Klassenbuch neben der Uhr aktiv, statt sich ' +
          'zu beenden, und öffnet sich mit einem Klick auf das Symbol wieder. Beendet wird es mit ' +
          '«Klassenbuch beenden» im Menü des Symbols. Ausgeschaltet schliesst das X das Programm.',
      },
      'registroDocenti.avvio.conWindows': {
        etichetta: 'Mit Windows starten',
        descrizione:
          'Startet das Klassenbuch zusammen mit dem Computer, ohne ein Fenster zu öffnen: es bleibt ' +
          'das Symbol neben der Uhr. Gilt für die installierte und die portable Version, solange ' +
          'deren Datei am selben Ort bleibt.',
      },
      'registroDocenti.avvio.soloVassoio': {
        etichetta: 'Starten, ohne das Klassenbuch zu öffnen',
        descrizione:
          'Öffnet beim Start das Fenster des Klassenbuchs nicht, auch nicht bei manuellem Start: das ' +
          'Symbol steht neben der Uhr, und das Fenster öffnet sich auf Anfrage. Fehlt das Symbol, ' +
          'öffnet sich das Fenster trotzdem — ein laufendes, unsichtbares Programm liesse sich nicht ' +
          'mehr zurückholen.',
      },
      'registroDocenti.promemoria.attivo': {
        etichetta: 'Hinweis vor der Stunde',
        descrizione:
          'Meldet sich mit einer Systembenachrichtigung kurz bevor eine Stunde beginnt, und sagt, ' +
          'welche Klasse es ist und was für diesen Kurs noch offen ist. Ein Klick auf die ' +
          'Benachrichtigung öffnet das Klassenbuch bei dieser Stunde. Sie kommt nicht, während man ' +
          'das Klassenbuch schon ansieht, und nicht zweimal für dieselbe Stunde.',
      },
      'registroDocenti.promemoria.anticipoMinuti': {
        etichetta: 'Minuten im Voraus',
        descrizione:
          'Wie viele Minuten vor Beginn der Hinweis kommt. Fünf reichen, um den Computer zu nehmen ' +
          'und eine Treppe hinaufzugehen; null lässt ihn genau zur Anfangszeit kommen.',
      },
      'registroDocenti.proiezione.schermoIntero': {
        etichetta: 'Projektion im Vollbild',
        descrizione:
          'Öffnet das Projektionsfenster direkt im Vollbild. Nützlich, wenn der zweite Bildschirm ' +
          'nur der Projektor ist; ausschalten, wenn man es neben dem Klassenbuch behält.',
      },
      'registroDocenti.posta.mittente': {
        etichetta: 'Absenderadresse',
        descrizione:
          'Die Adresse, von der aus man schreibt, die die Familien unter «Von» sehen und an die sie ' +
          'antworten: zum Beispiel vorname.nachname@edu.ti.ch. Mit der Anmeldung hat sie nichts zu tun. ' +
          'Sie gilt in beiden Fällen — Server und .eml-Datei — und sorgt auch dafür, dass eine ' +
          'Mitteilung ganz in Blindkopie jemanden im Feld «An» hat. Leer heisst «gleich wie der ' +
          'Anmeldename».',
      },
      'registroDocenti.posta.utente': {
        etichetta: 'Anmeldename',
        descrizione:
          'Der Name, mit dem sich das Klassenbuch im Postfach anmeldet: im Tenant einer Schule das ' +
          'Kürzel der Verwaltung, zum Beispiel xxx000@edu.ti.ch, anders als die Adresse mit Vor- und ' +
          'Nachnamen. Leer heisst «gleich wie der Absender». Was das Postfach öffnet, steht nicht ' +
          'hier — es liegt im Schlüsselbund des Systems, und dort legt es der Befehl «Postfach ' +
          'verbinden» ab.',
      },
      'registroDocenti.posta.invioDiretto': {
        etichetta: 'Ohne Entwurf senden',
        descrizione:
          'Versendet die Mitteilungen selbst, statt einen Entwurf zum Durchlesen und manuellen ' +
          'Versenden vorzubereiten. Braucht ein verbundenes Postfach: ohne bleiben die Mitteilungen ' +
          'ohnehin Entwürfe. Vor jedem Durchgang fragt das Klassenbuch nach, und was versendet ist, ' +
          'lässt sich nicht zurückholen.',
      },
      'registroDocenti.recapiti.telefono': {
        etichetta: 'Anrufe',
        scelte: {
          tel: 'Das Windows-Programm für Anrufe (Smartphone-Link, Teams, Skype).',
          msteams: 'Teams, ohne die Auswahl von Windows.',
          skype: 'Skype, ohne die Auswahl von Windows.',
          callto: 'Das alte Skype-Schema, falls es bei dir noch registriert ist.',
          nessuno: 'Keines: die Nummern bleiben zum Lesen und Kopieren.',
        },
        descrizione:
          'Womit eine in den Personalien angeklickte Nummer gewählt wird. Die erste Wahl passt fast ' +
          'immer; öffnet sie auf diesem Computer nichts, nennt man das Programm oder wählt «keines».',
      },
      'registroDocenti.recapiti.posta': {
        etichetta: 'E-Mail',
        scelte: {
          sistema: 'Das Standard-Mailprogramm von Windows.',
          outlook: 'Outlook, auch wenn ein anderes Programm der Standard ist.',
          outlookWeb: 'Outlook im Web, im Browser.',
          nessuno: 'Keines: die Adressen bleiben zum Lesen und Kopieren.',
        },
        descrizione:
          'Womit sich eine neue E-Mail öffnet, wenn man in den Personalien auf eine Adresse klickt. ' +
          '«Outlook» dient, wenn Outlook vorhanden, aber ein anderes Programm Standard ist: aus einem ' +
          'anderen Programm schreiben heisst, aus einem anderen Postfach schreiben. Lässt es sich ' +
          'nicht öffnen, weicht das Klassenbuch auf den Standard aus und sagt es.',
      },
      'registroDocenti.modelli.cartella': {
        etichetta: 'Modellordner',
        descrizione:
          'Wo das Klassenbuch die Sprachmodelle aufbewahrt — die .gguf-Dateien, die es herunterlädt ' +
          'oder die man hineinzieht. Leer — der Normalfall — liegen sie neben den Einstellungen des ' +
          'Programms. Einen anderen Ordner wählt man, um sie auf einer anderen Festplatte zu halten, ' +
          'weil sie Gigabytes wiegen, oder um vorhandene zu nutzen: das Klassenbuch sieht sie alle ' +
          'und kopiert keine.',
      },
      'registroDocenti.modelli.scaricoAutomatico': {
        etichetta: 'Fehlende Programme selbst herunterladen',
        descrizione:
          'Beim ersten Bedarf holt sich das Klassenbuch selbst das Programm, das Scans liest — ' +
          '«llama-mtmd-cli», ein einziges Mal — in einen eigenen Ordner in den Programmdaten. Es ' +
          'installiert nichts, prüft den Fingerabdruck des Heruntergeladenen, und die Version ist ' +
          'im Programm festgelegt. Ausgeschaltet wählt man das Programm weiter unten von Hand: ' +
          'nützlich bei einer getakteten Verbindung. Die Sprachmodelle betrifft das nicht: sie ' +
          'werden im Bereich «Sprachmodelle» der Einstellungen heruntergeladen. Auch das Diktat ' +
          'nicht: was es braucht, lädt voicebox selbst herunter.',
      },
      'registroDocenti.ocr.attivo': {
        etichetta: 'Scans lesen',
        descrizione:
          'Liest mit einem lokalen Modell die PDF-Seiten ohne Text (Scans), um die lernende Person ' +
          'zu erkennen. Braucht ein Modell, das Bilder sehen kann, samt Projektor, ausgewählt im ' +
          'Bereich «Sprachmodelle» der Einstellungen.',
        motivo:
          'Das Lesen von Scans lässt sich nicht einschalten ohne ein Modell, das Bilder sehen kann, ' +
          'samt Projektor: man wählt es im Bereich «Sprachmodelle» der Einstellungen.',
      },
      'registroDocenti.ocr.modello': {
        etichetta: 'Modell zum Lesen',
        descrizione:
          'Das Modell, mit dem Scans gelesen werden: es muss Bilder sehen können. Man wählt es im ' +
          'Bereich «Sprachmodelle» der Einstellungen, von wo es auch heruntergeladen wird.',
      },
      'registroDocenti.ocr.proiettore': {
        etichetta: 'Projektor',
        descrizione:
          'Die zweite Datei des Modells, das Bilder sieht — die mit «mmproj» im Namen —, die das Bild in ' +
          'etwas verwandelt, das das Modell lesen kann. Der Bereich «Sprachmodelle» der ' +
          'Einstellungen lädt sie zusammen mit dem Modell herunter.',
      },
      'registroDocenti.ocr.programma': {
        etichetta: 'Programm llama-mtmd-cli',
        descrizione:
          'Eine bereits vorhandene Kopie von «llama-mtmd-cli.exe» — selbst kompiliert oder mit der ' +
          'Beschleunigung der eigenen Grafikkarte —: ist sie da, hat sie Vorrang vor der, die das ' +
          'Klassenbuch herunterlädt. Leer kümmert sich das Klassenbuch darum. Es muss eine .exe ' +
          'sein: das Klassenbuch startet genau dieses Programm und kein anderes.',
      },
      'registroDocenti.assistente.attivo': {
        etichetta: 'Assistent',
        descrizione:
          'Schaltet die Seite «Assistent» ein: man schreibt eine Frage — «wie viele Stunden hat ' +
          'die 4a in Mathematik verpasst?» — und ein Modell, das auf deinem Computer läuft, ' +
          'beantwortet sie, indem es das Klassenbuch liest. Es kann nur lesen: es trägt nichts ein, ' +
          'korrigiert nichts und sendet niemandem etwas, und nichts von dem Gefragten verlässt ' +
          'diesen Computer.',
        motivo:
          'Der Assistent lässt sich nicht ohne Modell einschalten: man wählt eines im Bereich ' +
          '«Sprachmodelle» der Einstellungen.',
      },
      'registroDocenti.assistente.modello': {
        etichetta: 'Modell des Assistenten',
        descrizione:
          'Das Modell, mit dem der Assistent antwortet: es muss Werkzeuge aufrufen können («tool ' +
          'calling»), was unter 3 Milliarden Parametern unzuverlässig wird. Man wählt es im Bereich ' +
          '«Sprachmodelle» der Einstellungen, der zwei empfiehlt und sie herunterlädt.',
      },
      'registroDocenti.dettatura.attivo': {
        etichetta: 'Diktat',
        descrizione:
          'Setzt ein Mikrofon neben das Eingabefeld des Assistenten: man drückt, spricht die Frage, ' +
          'und das Gesagte erscheint im Feld, wo man es vor dem Senden nachliest. Die Stimme erkennt ' +
          'voicebox, ein kostenloses Programm, das separat installiert wird und während des Diktats ' +
          'geöffnet sein muss: es läuft auf diesem Computer, und die Stimme verlässt ihn nicht.',
      },
      'registroDocenti.dettatura.taglia': {
        etichetta: 'Modell für die Stimme',
        scelte: {
          turbo: 'turbo — das genaueste der schnellen, auch ohne Grafikkarte. Empfohlen.',
          large: 'large — etwas genauer als turbo, und langsam ohne Grafikkarte.',
          medium: 'medium — ein Mittelweg, für einen Computer, der mit turbo Mühe hat.',
          small: 'small — schnell und leicht, aber es verschreibt die Nachnamen.',
          base: 'base — das kleinste: zum Ausprobieren, nicht zum echten Diktieren.',
        },
        descrizione:
          'Welches Whisper-Modell voicebox zum Verstehen der Sprache verwendet. Beim ersten Wählen ' +
          'lädt voicebox es selbst herunter — von einigen hundert MB bis zu ein paar GB — und bis ' +
          'dahin antwortet das Diktat «Versuch es gleich noch einmal».',
      },
      'registroDocenti.dettatura.indirizzo': {
        etichetta: 'Adresse von voicebox',
        descrizione:
          'Wo das Klassenbuch voicebox findet. Die eingetragene ist die Adresse, die voicebox von ' +
          'selbst verwendet: man ändert sie nur, wenn man es auf einem anderen Port gestartet hat. ' +
          'Es muss eine Adresse dieses Computers sein — 127.0.0.1, localhost oder [::1] —, denn ' +
          'dorthin schickt das Klassenbuch die Stimme: eine Adresse eines anderen Computers liesse ' +
          'sie hinaus, und das Klassenbuch nimmt sie nicht an.',
      },
      'registroDocenti.aggiornamenti.controlloAutomatico': {
        etichetta: 'Nach neuen Versionen suchen',
        descrizione:
          'Prüft selbst, ob eine neue Version des Klassenbuchs erschienen ist, beim Start und dann ' +
          'alle paar Stunden. Es fragt nur, welches die letzte auf GitHub veröffentlichte Version ' +
          'ist — es sendet nichts aus dem Klassenbuch. Ausgeschaltet wird nur beim Drücken von ' +
          '«Jetzt prüfen» gesucht.',
      },
      'registroDocenti.aggiornamenti.scaricoAutomatico': {
        etichetta: 'Neue Version sofort herunterladen',
        descrizione:
          'Gibt es eine neue Version, lädt es sie ohne Nachfrage herunter. Ausgeschaltet meldet das ' +
          'Klassenbuch sie und wartet auf «Herunterladen»: nützlich bei einer getakteten Verbindung.',
      },
      'registroDocenti.aggiornamenti.installaAllaChiusura': {
        etichetta: 'Beim Beenden installieren',
        descrizione:
          'Eine bereits heruntergeladene Version installiert sich beim nächsten Beenden des ' +
          'Klassenbuchs von selbst, und beim Wiederöffnen ist die neue da. Ausgeschaltet wartet sie ' +
          'auf «Neu starten und aktualisieren».',
      },
      'registroDocenti.api.condotto': {
        etichetta: 'Lokaler Kanal',
        descrizione:
          'Lässt das Klassenbuch auch ausserhalb seiner Fenster antworten, über einen lokalen Kanal — ' +
          'eine «named pipe» unter Windows —, damit der Befehl «regi» und ein Skript mit ihm ' +
          'sprechen können, ohne das Fenster zu öffnen. Er öffnet keinen Netzwerkport und verlässt ' +
          'den Computer nicht. Er ist der Hauptschalter: ausgeschaltet hört nichts zu, und die zwei ' +
          'Einträge darunter gelten nicht. Eingeschaltet kann ihn aber jedes Programm, das mit deinem ' +
          'Zugang läuft, ohne Nachfrage nutzen. Schalte ihn nur ein, wenn du ihn wirklich brauchst, ' +
          'und schalte ihn wieder aus, wenn du fertig bist.',
      },
      'registroDocenti.api.lettura': {
        etichetta: 'Lesen erlauben',
        descrizione:
          'Erlaubt, über den Kanal zu lesen: Anwesenheiten, Absenzen, Durchschnitte, Kalender, die ' +
          'berechneten Daten der lernenden Personen. Allein erlaubt es keine Änderungen, aber was ' +
          'herauskommt, sind Personendaten, und jedes Programm mit deinem Zugang kann sie abfragen.',
      },
      'registroDocenti.api.scrittura': {
        etichetta: 'Schreiben erlauben',
        descrizione:
          'Erlaubt, über den Kanal zu schreiben: eine Präsenzkontrolle erfassen, eine Note setzen, eine ' +
          'Stunde anlegen, Mails in deinem Namen versenden. Was ein Skript versehentlich schreibt, ' +
          'bleibt geschrieben: schalte es nur so lange ein, wie das Skript es braucht.',
      },
    },
  },
  fr: {
    titoloImpostazioni: 'Regiclass',
    comandi: {
      'registroDocenti.apri': 'Afficher le registre',
      'registroDocenti.guida': 'Aide',
      'registroDocenti.impostazioni': 'Paramètres',
      'registroDocenti.proietta': 'Projeter pour la classe',
      'registroDocenti.oggi': 'Aujourd’hui',
      'registroDocenti.nuovaLezione': 'Nouvelle leçon',
      'registroDocenti.nuovaClasse': 'Nouvelle classe',
      'registroDocenti.nuovoCorso': 'Nouveau cours (une branche pour une classe)',
      'registroDocenti.nuovoPiano': 'Nouveau plan de leçon',
      'registroDocenti.nuovaValutazione': 'Nouvelle évaluation',
      'registroDocenti.nuovoAnno': 'Nouvelle année scolaire',
      'registroDocenti.ricarica': 'Recharger les données',
      'registroDocenti.salvaConNome': 'Enregistrer l’année sous…',
      'registroDocenti.chiudiDocumento': 'Fermer l’année',
      'registroDocenti.provaPosta': 'Tester la connexion de messagerie',
      'registroDocenti.provaInvioPosta': 'Envoyer un e-mail de test',
      'registroDocenti.collegaPosta': 'Connecter la boîte aux lettres',
      'registroDocenti.scollegaPosta': 'Déconnecter la boîte aux lettres',
      'registroDocenti.azzeraPosta': 'Réinitialiser la messagerie (trousseau, mémoire, paramètres)',
      'registroDocenti.apriCartellaDati': 'Ouvrir le dossier des données',
    },
    impostazioni: {
      'registroDocenti.aspetto.lingua': {
        etichetta: 'Langue',
        scelte: {
          sistema: 'Système : suit la langue de Windows.',
        },
        descrizione:
          'La langue du registre : menus, pages, impressions, e-mails et assistant. « Système » suit ' +
          'la langue de Windows ; si le registre ne la connaît pas, il parle italien. Ce qui est ' +
          'déjà écrit dans le document — noms, notes, titres des leçons — reste tel quel.',
      },
      'registroDocenti.aspetto.tema': {
        etichetta: 'Thème',
        scelte: {
          sistema: 'Système : clair ou sombre comme Windows, et change avec lui.',
          chiaro: 'Clair : toujours, même le soir. C’est le plus lisible en projection.',
          scuro: 'Sombre : toujours, même le jour.',
        },
        descrizione:
          'Clair ou sombre. Vaut pour le registre, pour l’écran de la classe et pour la fenêtre ' +
          'des paramètres. « Système » suit Windows et change tout seul quand Windows change.',
      },
      'registroDocenti.vassoio.attivo': {
        etichetta: 'Icône près de l’horloge',
        descrizione:
          'Garde une icône du registre près de l’horloge. Son menu liste les cours de l’année et, ' +
          'dans chacun, les leçons réparties entre données, à clore, en cours et prévues : un clic ' +
          'mène à la leçon. C’est aussi par là qu’on quitte l’application. Prend effet au prochain ' +
          'démarrage : l’icône décide aussi de ce que fait le X des fenêtres, et la changer en ' +
          'cours de session changerait ce geste sous les doigts.',
      },
      'registroDocenti.vassoio.chiusuraNelVassoio': {
        etichetta: 'Le X laisse le registre dans l’icône',
        descrizione:
          'En fermant la dernière fenêtre, le registre reste actif près de l’horloge au lieu de se ' +
          'fermer, et se rouvre d’un clic sur l’icône. On le quitte avec « Quitter le registre », ' +
          'dans le menu de l’icône. Désactivé, le X ferme l’application.',
      },
      'registroDocenti.avvio.conWindows': {
        etichetta: 'Démarrer avec Windows',
        descrizione:
          'Démarre le registre avec l’ordinateur, sans ouvrir de fenêtre : il reste l’icône près ' +
          'de l’horloge. Vaut pour le registre installé et pour le portable, pourvu que son fichier ' +
          'reste à sa place.',
      },
      'registroDocenti.avvio.soloVassoio': {
        etichetta: 'Démarrer sans ouvrir le registre',
        descrizione:
          'Au démarrage, n’ouvre pas la fenêtre du registre, même lancé à la main : l’icône est ' +
          'près de l’horloge, et la fenêtre s’ouvre quand on la demande. Sans icône, la fenêtre ' +
          's’ouvre quand même — une application active et invisible ne se récupérerait plus.',
      },
      'registroDocenti.promemoria.attivo': {
        etichetta: 'Rappel avant la leçon',
        descrizione:
          'Avertit par une notification du système peu avant le début d’une leçon, en indiquant ' +
          'la classe et ce qui reste ouvert pour ce cours. Un clic sur la notification ouvre le ' +
          'registre à cette leçon. Elle n’arrive pas pendant qu’on regarde déjà le registre, ni ' +
          'deux fois pour la même leçon.',
      },
      'registroDocenti.promemoria.anticipoMinuti': {
        etichetta: 'Minutes d’avance',
        descrizione:
          'Combien de minutes avant le début arrive le rappel. Cinq, c’est le temps de prendre ' +
          'l’ordinateur et de monter un escalier ; zéro le fait arriver à l’heure exacte.',
      },
      'registroDocenti.proiezione.schermoIntero': {
        etichetta: 'Projection en plein écran',
        descrizione:
          'Met la fenêtre de projection en plein écran dès son ouverture. Utile quand le second ' +
          'écran n’est que le projecteur ; à désactiver si on la garde à côté du registre.',
      },
      'registroDocenti.posta.mittente': {
        etichetta: 'Adresse de l’expéditeur',
        descrizione:
          'L’adresse d’où l’on écrit, celle que les familles voient dans « De » et à laquelle ' +
          'elles répondent : par exemple prenom.nom@edu.ti.ch. Ce n’est pas une donnée de connexion. Elle ' +
          'vaut dans les deux cas — le serveur et le fichier .eml — et sert aussi à ce qu’une ' +
          'communication entièrement en copie cachée ait quelqu’un dans le champ « À ». Vide ' +
          'signifie « le même que le nom d’utilisateur ».',
      },
      'registroDocenti.posta.utente': {
        etichetta: 'Nom d’utilisateur',
        descrizione:
          'Le nom avec lequel le registre entre dans la boîte : dans le tenant d’une école, c’est ' +
          'le code attribué par l’administration, par exemple xxx000@edu.ti.ch, différent de ' +
          'l’adresse avec prénom et nom. Vide signifie « le même que l’expéditeur ». Ce qui ouvre ' +
          'la boîte n’est pas ici — c’est dans le trousseau du système, où le place la commande ' +
          '« Connecter la boîte aux lettres ».',
      },
      'registroDocenti.posta.invioDiretto': {
        etichetta: 'Envoyer sans brouillon',
        descrizione:
          'Envoie les communications directement au lieu de préparer un brouillon à relire et à ' +
          'envoyer à la main. Demande une boîte connectée : sans elle, les communications restent ' +
          'des brouillons de toute façon. Avant chaque envoi, le registre demande confirmation, et ' +
          'ce qui part ne peut pas être rappelé.',
      },
      'registroDocenti.recapiti.telefono': {
        etichetta: 'Appels',
        scelte: {
          tel: 'Le programme d’appels de Windows (Lien avec le téléphone, Teams, Skype).',
          msteams: 'Teams, sans passer par le choix de Windows.',
          skype: 'Skype, sans passer par le choix de Windows.',
          callto: 'L’ancien schéma de Skype, si tu l’as encore enregistré.',
          nessuno: 'Aucun : les numéros restent à lire et à copier.',
        },
        descrizione:
          'Avec quoi composer un numéro cliqué dans les données personnelles. Le premier choix ' +
          'convient presque toujours ; s’il n’ouvre rien sur cet ordinateur, on nomme le programme ' +
          'ou on choisit « aucun ».',
      },
      'registroDocenti.recapiti.posta': {
        etichetta: 'E-mail',
        scelte: {
          sistema: 'Le programme de messagerie par défaut de Windows.',
          outlook: 'Outlook, même quand un autre programme est celui par défaut.',
          outlookWeb: 'Outlook sur le web, dans le navigateur.',
          nessuno: 'Aucun : les adresses restent à lire et à copier.',
        },
        descrizione:
          'Avec quoi s’ouvre un nouvel e-mail en cliquant sur une adresse dans les données ' +
          'personnelles. « Outlook » sert quand Outlook est là mais qu’un autre programme est par ' +
          'défaut : écrire depuis un autre programme, c’est écrire depuis une autre boîte. S’il ne ' +
          'parvient pas à l’ouvrir, le registre se rabat sur celui par défaut et le dit.',
      },
      'registroDocenti.modelli.cartella': {
        etichetta: 'Dossier des modèles',
        descrizione:
          'Où le registre garde les modèles de langage — les fichiers .gguf qu’il télécharge ou ' +
          'qu’on y glisse. Vide — le cas normal — il les garde à côté des paramètres du programme. ' +
          'On choisit un autre dossier pour les garder sur un autre disque, parce qu’ils pèsent des ' +
          'gigaoctets, ou pour utiliser ceux qu’on a déjà : le registre les voit tous et n’en ' +
          'copie aucun.',
      },
      'registroDocenti.modelli.scaricoAutomatico': {
        etichetta: 'Télécharger automatiquement les programmes manquants',
        descrizione:
          'La première fois qu’il en a besoin, le registre télécharge lui-même le programme qui lit ' +
          'les scans — « llama-mtmd-cli », une seule fois — dans un dossier à lui parmi les données ' +
          'de l’application. Il n’installe rien, vérifie l’empreinte de ce qu’il télécharge, et la ' +
          'version est fixée dans le programme. Désactivé, on choisit le programme à la main plus ' +
          'bas : utile avec une connexion limitée. Les modèles de langage ne sont pas concernés : ' +
          'ils se téléchargent depuis la section « Modèles de langage » des paramètres. La dictée ' +
          'non plus : ce qu’il lui faut, voicebox le télécharge de son côté.',
      },
      'registroDocenti.ocr.attivo': {
        etichetta: 'Lecture des scans',
        descrizione:
          'Lit avec un modèle local les pages des PDF qui ne contiennent pas de texte (scans), pour ' +
          'reconnaître la personne en formation. Demande un modèle qui sait regarder les images, ' +
          'avec son projecteur, choisis dans la section « Modèles de langage » des paramètres.',
        motivo:
          'La lecture des scans ne s’active pas sans un modèle qui sait regarder les images, avec ' +
          'son projecteur : on le choisit dans la section « Modèles de langage » des paramètres.',
      },
      'registroDocenti.ocr.modello': {
        etichetta: 'Modèle qui lit',
        descrizione:
          'Le modèle avec lequel on lit les scans : il doit savoir regarder les images. On le ' +
          'choisit dans la section « Modèles de langage » des paramètres, d’où il se télécharge ' +
          'aussi.',
      },
      'registroDocenti.ocr.proiettore': {
        etichetta: 'Projecteur',
        descrizione:
          'Le second fichier du modèle qui regarde les images — celui avec « mmproj » dans le nom —, qui ' +
          'transforme l’image en quelque chose que le modèle sait lire. La section « Modèles de ' +
          'langage » des paramètres le télécharge avec le modèle.',
      },
      'registroDocenti.ocr.programma': {
        etichetta: 'Programme llama-mtmd-cli',
        descrizione:
          'Une copie de « llama-mtmd-cli.exe » qu’on a déjà — compilée, ou avec l’accélération de ' +
          'sa propre carte graphique — : si elle est là, elle l’emporte sur celle que télécharge le ' +
          'registre. Vide, le registre s’en occupe. Ce doit être un .exe : le registre lance ' +
          'exactement ce programme et rien d’autre.',
      },
      'registroDocenti.assistente.attivo': {
        etichetta: 'Assistant',
        descrizione:
          'Active la page « Assistant » : on écrit une question — « combien d’heures la 4a a-t-elle ' +
          'manquées en mathématiques ? » — et un modèle qui tourne sur ton ordinateur y répond en ' +
          'lisant le registre. Il peut seulement lire : il n’inscrit rien, ne corrige rien et ' +
          'n’envoie rien à personne, et rien de ce qu’on demande ne sort d’ici.',
        motivo:
          'L’assistant ne s’active pas sans modèle : on en choisit un dans la section « Modèles de ' +
          'langage » des paramètres.',
      },
      'registroDocenti.assistente.modello': {
        etichetta: 'Modèle de l’assistant',
        descrizione:
          'Le modèle avec lequel répond l’assistant : il doit savoir appeler des outils (« tool ' +
          'calling »), ce qui devient peu fiable en dessous de 3 milliards de paramètres. On le ' +
          'choisit dans la section « Modèles de langage » des paramètres, qui en recommande deux ' +
          'et les télécharge.',
      },
      'registroDocenti.dettatura.attivo': {
        etichetta: 'Dictée',
        descrizione:
          'Met un micro à côté du champ de l’assistant : on appuie, on dit la question, et ce qu’on ' +
          'a dit s’écrit dans le champ, où on le relit avant de l’envoyer. La voix est reconnue par ' +
          'voicebox, un programme gratuit qui s’installe à part et doit être ouvert pendant la ' +
          'dictée : il tourne sur cet ordinateur, et la voix ne sort pas d’ici.',
      },
      'registroDocenti.dettatura.taglia': {
        etichetta: 'Modèle de la voix',
        scelte: {
          turbo: 'turbo — le plus précis des rapides, même sans carte graphique. C’est celui qui est recommandé.',
          large: 'large — un peu plus précis que turbo, et lent sans carte graphique.',
          medium: 'medium — un compromis, pour un ordinateur qui peine avec turbo.',
          small: 'small — rapide et léger, mais il se trompe sur les noms de famille.',
          base: 'base — le plus petit : pour essayer, pas pour dicter vraiment.',
        },
        descrizione:
          'Quel modèle Whisper voicebox utilise pour comprendre la langue. La première fois qu’on ' +
          'en choisit un, voicebox le télécharge de son côté — de quelques centaines de Mo à ' +
          'quelques Go — et entre-temps la dictée répond « réessaie dans un instant ».',
      },
      'registroDocenti.dettatura.indirizzo': {
        etichetta: 'Adresse de voicebox',
        descrizione:
          'Où le registre trouve voicebox. L’adresse inscrite est celle que voicebox utilise de ' +
          'lui-même à l’ouverture : on ne la change que si on l’a lancé sur un autre port. Ce doit ' +
          'être une adresse de cet ordinateur — 127.0.0.1, localhost ou [::1] —, car c’est là que ' +
          'le registre envoie la voix : l’adresse d’une autre machine la ferait sortir d’ici, et le ' +
          'registre ne l’accepte pas.',
      },
      'registroDocenti.aggiornamenti.controlloAutomatico': {
        etichetta: 'Chercher les nouvelles versions',
        descrizione:
          'Vérifie de lui-même si une nouvelle version du registre est sortie, au démarrage puis ' +
          'toutes les deux ou trois heures. Il demande seulement quelle est la dernière version publiée ' +
          'sur GitHub — il n’envoie rien du registre. Désactivé, on vérifie seulement en appuyant ' +
          'sur « Vérifier maintenant ».',
      },
      'registroDocenti.aggiornamenti.scaricoAutomatico': {
        etichetta: 'Télécharger tout de suite la nouvelle version',
        descrizione:
          'Quand il y a une nouvelle version, il la télécharge sans demander. Désactivé, le ' +
          'registre signale qu’elle existe et attend qu’on appuie sur « Télécharger » : utile avec ' +
          'une connexion limitée.',
      },
      'registroDocenti.aggiornamenti.installaAllaChiusura': {
        etichetta: 'Installer en quittant le registre',
        descrizione:
          'Une version déjà téléchargée s’installe d’elle-même la prochaine fois qu’on quitte le ' +
          'registre, et à la réouverture c’est la nouvelle. Désactivé, elle attend qu’on appuie sur ' +
          '« Redémarrer et mettre à jour ».',
      },
      'registroDocenti.api.condotto': {
        etichetta: 'Canal local',
        descrizione:
          'Fait répondre le registre aussi en dehors de ses fenêtres, sur un canal local — une ' +
          '« named pipe » sous Windows — pour que la commande « regi » et un script puissent lui ' +
          'parler sans ouvrir le panneau. N’ouvre aucun port réseau et ne sort pas de la machine. ' +
          'C’est l’interrupteur général : désactivé, rien n’écoute, et les deux réglages ci-dessous ' +
          'ne valent pas. Activé, en revanche, tout programme qui tourne avec ton propre accès peut ' +
          'l’utiliser sans te le demander. Active-le si tu en as vraiment besoin, et désactive-le ' +
          'quand tu as terminé.',
      },
      'registroDocenti.api.lettura': {
        etichetta: 'Autoriser la lecture',
        descrizione:
          'Permet de consulter par le canal : présences, absences, moyennes, calendrier, les données ' +
          'déjà calculées des personnes en formation. À lui seul, il ne permet rien de modifier, mais ce ' +
          'qui sort, ce sont des données personnelles, et tout programme qui tourne avec ton accès ' +
          'peut les demander.',
      },
      'registroDocenti.api.scrittura': {
        etichetta: 'Autoriser l’écriture',
        descrizione:
          'Permet d’écrire par le canal : faire l’appel, mettre une note, créer une leçon, envoyer ' +
          'des e-mails en ton nom. Ce qu’un script écrit par erreur reste écrit : active-le ' +
          'seulement le temps dont le script a besoin.',
      },
    },
  },
  en: {
    titoloImpostazioni: 'Regiclass',
    comandi: {
      'registroDocenti.apri': 'Show the register',
      'registroDocenti.guida': 'Help',
      'registroDocenti.impostazioni': 'Settings',
      'registroDocenti.proietta': 'Project for the class',
      'registroDocenti.oggi': 'Today',
      'registroDocenti.nuovaLezione': 'New lesson',
      'registroDocenti.nuovaClasse': 'New class',
      'registroDocenti.nuovoCorso': 'New course (one subject for one class)',
      'registroDocenti.nuovoPiano': 'New lesson plan',
      'registroDocenti.nuovaValutazione': 'New assessment',
      'registroDocenti.nuovoAnno': 'New school year',
      'registroDocenti.ricarica': 'Reload data',
      'registroDocenti.salvaConNome': 'Save the year as…',
      'registroDocenti.chiudiDocumento': 'Close the year',
      'registroDocenti.provaPosta': 'Test the mail connection',
      'registroDocenti.provaInvioPosta': 'Send a test email',
      'registroDocenti.collegaPosta': 'Connect the mailbox',
      'registroDocenti.scollegaPosta': 'Disconnect the mailbox',
      'registroDocenti.azzeraPosta': 'Reset mail (keychain, memory, settings)',
      'registroDocenti.apriCartellaDati': 'Open the data folder',
    },
    impostazioni: {
      'registroDocenti.aspetto.lingua': {
        etichetta: 'Language',
        scelte: {
          sistema: 'System: follows the language of Windows.',
        },
        descrizione:
          'The language the register speaks: menus, pages, printouts, emails and assistant. ' +
          '“System” follows the language of Windows; if the register does not know it, it speaks ' +
          'Italian. What is already written in the document — names, notes, lesson titles — stays ' +
          'as it is.',
      },
      'registroDocenti.aspetto.tema': {
        etichetta: 'Theme',
        scelte: {
          sistema: 'System: light or dark like Windows, and changes along with it.',
          chiaro: 'Light: always, even in the evening. The easiest to read when projected.',
          scuro: 'Dark: always, even during the day.',
        },
        descrizione:
          'Light or dark. Applies to the register, to the class screen and to the settings window. ' +
          '“System” follows Windows and changes by itself when Windows does.',
      },
      'registroDocenti.vassoio.attivo': {
        etichetta: 'Icon next to the clock',
        descrizione:
          'Keeps a register icon next to the clock. Its menu lists the year’s courses and, inside ' +
          'each one, the lessons split into held, to close, in progress and scheduled: one click ' +
          'takes you to the lesson. It is also where you quit the application. Takes effect at the ' +
          'next start: the icon also decides what the windows’ X does, and changing it mid-session ' +
          'would change that gesture under your hands.',
      },
      'registroDocenti.vassoio.chiusuraNelVassoio': {
        etichetta: 'The X leaves the register in the icon',
        descrizione:
          'Closing the last window keeps the register running next to the clock instead of quitting, ' +
          'and it reopens with a click on the icon. You quit with “Quit the register”, in the icon’s ' +
          'menu. Off, the X closes the application.',
      },
      'registroDocenti.avvio.conWindows': {
        etichetta: 'Start with Windows',
        descrizione:
          'Starts the register together with the computer, without opening any window: the icon ' +
          'next to the clock remains. Applies to the installed and to the portable register, as ' +
          'long as its file stays where it was.',
      },
      'registroDocenti.avvio.soloVassoio': {
        etichetta: 'Start without opening the register',
        descrizione:
          'At start-up it does not open the register window, even when launched by hand: the icon ' +
          'is next to the clock, and the window opens when you ask for it. Without the icon the ' +
          'window opens anyway — a running, invisible application could never be brought back.',
      },
      'registroDocenti.promemoria.attivo': {
        etichetta: 'Reminder before the lesson',
        descrizione:
          'Sends a system notification shortly before a lesson begins, saying which class it is and ' +
          'what is still open for that course. Clicking the notification opens the register at ' +
          'that lesson. It does not arrive while you are already looking at the register, and never ' +
          'twice for the same lesson.',
      },
      'registroDocenti.promemoria.anticipoMinuti': {
        etichetta: 'Minutes in advance',
        descrizione:
          'How many minutes before the start the reminder arrives. Five is the time to pick up the ' +
          'computer and climb a flight of stairs; zero makes it arrive right on time.',
      },
      'registroDocenti.proiezione.schermoIntero': {
        etichetta: 'Full-screen projection',
        descrizione:
          'Puts the projection window in full screen as soon as it opens. Useful when the second ' +
          'screen is only the projector; turn it off if you keep it next to the register.',
      },
      'registroDocenti.posta.mittente': {
        etichetta: 'Sender address',
        descrizione:
          'The address you write from, the one families see in “From” and reply to: for example ' +
          'firstname.lastname@edu.ti.ch. It is not a credential. It applies in both cases — the ' +
          'server and the .eml file — and also makes sure a message sent entirely in blind copy has ' +
          'someone in the “To” field. Empty means “the same as the sign-in name”.',
      },
      'registroDocenti.posta.utente': {
        etichetta: 'Sign-in name',
        descrizione:
          'The name the register uses to sign in to the mailbox: in a school tenant it is the code ' +
          'given by the administration, for example xxx000@edu.ti.ch, different from the address ' +
          'with first and last name. Empty means “the same as the sender”. What opens the mailbox ' +
          'is not here — it is in the system keychain, where the “Connect the mailbox” command ' +
          'puts it.',
      },
      'registroDocenti.posta.invioDiretto': {
        etichetta: 'Send without a draft',
        descrizione:
          'Sends messages by itself instead of preparing a draft to reread and send by hand. Needs ' +
          'a connected mailbox: without one, messages stay drafts anyway. Before each round the ' +
          'register asks for confirmation, and what has been sent cannot be recalled.',
      },
      'registroDocenti.recapiti.telefono': {
        etichetta: 'Calls',
        scelte: {
          tel: 'The Windows program for calls (Phone Link, Teams, Skype).',
          msteams: 'Teams, skipping the Windows choice.',
          skype: 'Skype, skipping the Windows choice.',
          callto: 'The old Skype scheme, if you still have it registered.',
          nessuno: 'None: numbers are just there to read and copy.',
        },
        descrizione:
          'What dials a number clicked in the personal details. The first choice is almost always ' +
          'fine; if it opens nothing on this computer, name the program or choose “None”.',
      },
      'registroDocenti.recapiti.posta': {
        etichetta: 'Email',
        scelte: {
          sistema: 'The default Windows mail program.',
          outlook: 'Outlook, even when another program is the default.',
          outlookWeb: 'Outlook on the web, in the browser.',
          nessuno: 'None: addresses are just there to read and copy.',
        },
        descrizione:
          'What opens a new email when you click an address in the personal details. “Outlook” is ' +
          'for when Outlook is there but another program is the default: writing from a different ' +
          'program means writing from a different mailbox. If it cannot open it, the register falls ' +
          'back to the default and says so.',
      },
      'registroDocenti.modelli.cartella': {
        etichetta: 'Models folder',
        descrizione:
          'Where the register keeps the language models — the .gguf files it downloads or that you ' +
          'drag into it. Empty — the normal case — it keeps them next to the program settings. Choose ' +
          'another folder to keep them on another disk, because they weigh gigabytes, or to use the ' +
          'ones you already have: the register sees them all and copies none.',
      },
      'registroDocenti.modelli.scaricoAutomatico': {
        etichetta: 'Download missing programs automatically',
        descrizione:
          'The first time it is needed, the register fetches on its own the program that reads ' +
          'scans — “llama-mtmd-cli”, once only — into a folder of its own inside the application ' +
          'data. It installs nothing, checks the fingerprint of what it downloads, and the version ' +
          'is fixed in the program. Off, you choose the program by hand further down: useful on a ' +
          'metered connection. Language models are not involved: they are downloaded from the ' +
          '“Language models” section of the settings. Nor is dictation: what it needs, voicebox ' +
          'downloads on its own.',
      },
      'registroDocenti.ocr.attivo': {
        etichetta: 'Reading scans',
        descrizione:
          'Reads with a local model the PDF pages that contain no text (scans), to recognise the ' +
          'learner. Needs a model that can look at images, with its projector, chosen from the ' +
          '“Language models” section of the settings.',
        motivo:
          'Reading scans cannot be turned on without a model that can look at images, with its ' +
          'projector: choose one from the “Language models” section of the settings.',
      },
      'registroDocenti.ocr.modello': {
        etichetta: 'Reading model',
        descrizione:
          'The model used to read scans: it must be able to look at images. Choose it from the ' +
          '“Language models” section of the settings, which is also where it is downloaded.',
      },
      'registroDocenti.ocr.proiettore': {
        etichetta: 'Projector',
        descrizione:
          'The second file of the model that looks at images — the one with “mmproj” in its name —, which turns ' +
          'the image into something the model can read. The “Language models” section of the ' +
          'settings downloads it together with the model.',
      },
      'registroDocenti.ocr.programma': {
        etichetta: 'llama-mtmd-cli program',
        descrizione:
          'A copy of “llama-mtmd-cli.exe” you already have — compiled, or with your graphics card’s ' +
          'acceleration —: if present it wins over the one the register downloads. Empty, the ' +
          'register takes care of it. It must be an .exe: the register launches exactly this ' +
          'program and nothing else.',
      },
      'registroDocenti.assistente.attivo': {
        etichetta: 'Assistant',
        descrizione:
          'Turns on the “Assistant” page: you write a question — “how many lessons has 4a missed in ' +
          'maths?” — and a model running on your computer answers it by reading the register. It ' +
          'can only read: it records nothing, corrects nothing and sends nothing to anyone, and ' +
          'nothing you ask leaves this computer.',
        motivo:
          'The assistant cannot be turned on without a model: choose one from the “Language models” ' +
          'section of the settings.',
      },
      'registroDocenti.assistente.modello': {
        etichetta: 'Assistant model',
        descrizione:
          'The model the assistant answers with: it must be able to call tools (“tool calling”), ' +
          'which becomes unreliable below 3 billion parameters. Choose it from the “Language ' +
          'models” section of the settings, which recommends two and downloads them.',
      },
      'registroDocenti.dettatura.attivo': {
        etichetta: 'Dictation',
        descrizione:
          'Puts a microphone next to the assistant’s box: press it, say the question, and what you ' +
          'said is written in the box, where you reread it before sending. The voice is recognised ' +
          'by voicebox, a free program installed separately that must be open while you dictate: ' +
          'it runs on this computer, and your voice does not leave it.',
      },
      'registroDocenti.dettatura.taglia': {
        etichetta: 'Voice model',
        scelte: {
          turbo: 'turbo — the most accurate of the fast ones, even without a graphics card. Recommended.',
          large: 'large — a little more precise than turbo, and slow without a graphics card.',
          medium: 'medium — a middle way, for a computer that struggles with turbo.',
          small: 'small — fast and light, but it gets surnames wrong.',
          base: 'base — the smallest: for trying out, not for real dictation.',
        },
        descrizione:
          'Which Whisper model voicebox uses to understand speech. The first time you choose one, ' +
          'voicebox downloads it on its own — from a few hundred MB to a couple of GB — and ' +
          'meanwhile dictation answers “try again shortly”.',
      },
      'registroDocenti.dettatura.indirizzo': {
        etichetta: 'voicebox address',
        descrizione:
          'Where the register finds voicebox. The address filled in is the one voicebox uses by ' +
          'itself when opened: change it only if you started it on another port. It must be an ' +
          'address of this computer — 127.0.0.1, localhost or [::1] —, because that is where the ' +
          'register sends your voice: an address of another machine would send it out of here, and ' +
          'the register does not accept it.',
      },
      'registroDocenti.aggiornamenti.controlloAutomatico': {
        etichetta: 'Look for new versions',
        descrizione:
          'Checks by itself whether a new version of the register is out, at start-up and then ' +
          'every few hours. It only asks which is the latest version published on GitHub — it sends ' +
          'nothing from the register. Off, it checks only when you press “Check now”.',
      },
      'registroDocenti.aggiornamenti.scaricoAutomatico': {
        etichetta: 'Download the new version right away',
        descrizione:
          'When there is a new version, it downloads it without asking. Off, the register says it ' +
          'is there and waits for you to press “Download”: useful on a metered connection.',
      },
      'registroDocenti.aggiornamenti.installaAllaChiusura': {
        etichetta: 'Install when quitting the register',
        descrizione:
          'A version already downloaded installs itself the next time you quit the register, and ' +
          'when you reopen it the new one is there. Off, it waits for you to press “Restart and ' +
          'update”.',
      },
      'registroDocenti.api.condotto': {
        etichetta: 'Local pipe',
        descrizione:
          'Makes the register answer outside its windows too, on a local pipe — a “named pipe” on ' +
          'Windows — so that the “regi” command and a script can talk to it without opening the ' +
          'panel. It opens no network port and does not leave the machine. It is the main switch: ' +
          'off, nothing is listening, and the two items below do not apply. On, however, any ' +
          'program running with your own access can use it without asking you. Turn it on only if ' +
          'you really need it, and turn it off when you are done.',
      },
      'registroDocenti.api.lettura': {
        etichetta: 'Allow reading',
        descrizione:
          'Lets the pipe be used to look: attendance, absences, averages, calendar, the learners’ ' +
          'computed data. On its own it lets nothing be changed, but what comes out is personal ' +
          'data, and any program running with your access can ask for it.',
      },
      'registroDocenti.api.scrittura': {
        etichetta: 'Allow writing',
        descrizione:
          'Lets the pipe be used to write: take attendance, enter a grade, create a lesson, send ' +
          'mail in your name. What a script writes by mistake stays written: turn it on only for ' +
          'as long as that script needs it.',
      },
    },
  },
})
