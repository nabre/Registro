// I testi della guida, parte «Per cominciare». Una chiave per sezione con la
// forma di `TestiSezione` (testa di `types.ts`); struttura e schemi stanno in
// `start.ts`.

import { catalogo } from '../../../i18n/index.js'
import {
  CARTE,
  Molti,
  PERSONE,
  PIF,
  Uno,
  dei,
  quanti,
} from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const PENDENZE = Molti(CARTE.pendenza)

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  primiPassi: {
    titolo: 'Primi passi',
    sommario:
      'Da un registro vuoto alla prima ora compilata, in sette mosse. Il resto della guida ' +
      'si legge quando serve.',
    scritte: {
      benvenuto: 'Benvenuto',
      nuovoAnno: 'nuovo anno',
      classi: 'Classi',
      eCorsi: 'e corsi',
      elenco: 'Elenco',
      inClassi: 'in Classi',
      ora: 'L’ora',
      calendario: 'calendario',
      svolta: 'Svolta',
      aFineOra: 'a fine ora',
      pendenze: PENDENZE,
      agenda: 'Agenda',
      unaVolta: 'una volta, a inizio anno',
      ogniGiorno: 'poi, ogni giorno',
    },
    figure: [
      {
        didascalia:
          'Le prime quattro mosse si fanno una volta all’anno; le ultime tre sono il giro di ' +
          'ogni giorno.',
      },
    ],
    voci: [
      {
        termine: 'Il benvenuto',
        testo:
          'Senza un anno aperto il registro mostra una finestra sola: **Apri un anno…** per un ' +
          '`.regi` che c’è già, **Crea un nuovo anno…** per cominciare. Sotto, i recenti: ' +
          'la stella tiene un anno fra i preferiti, la croce lo toglie dall’elenco senza ' +
          'toccare il file. In fondo, accanto alla versione, a che punto sono gli aggiornamenti.',
      },
      {
        termine: 'Crea un nuovo anno',
        testo:
          'Si sceglie l’anno fra quelli del calendario ufficiale: date, vacanze e festivi ' +
          'arrivano con lui. Se ci sono altri registri, il registro chiede se portarne dentro ' +
          'classi, corsi e impostazioni; poi apre la scheda dell’anno. Dal pannello è lo stesso ' +
          'modulo: **Nuovo anno** in Impostazioni › Anno e orario › Anno scolastico, o sulla ' +
          'pagina di un registro vuoto.',
      },
      {
        termine: 'Classi e corsi',
        testo:
          '**Importa da un altro registro…**, nel menu File, porta classi con le persone, corsi, ' +
          'materie e piani da un anno di prima. Per partire da zero: **Nuova classe** in Classi, ' +
          '**Nuovo corso** in Corsi con le lezioni della settimana, e **Lezioni sul calendario** ' +
          'mette le lezioni fino a fine anno.',
      },
      {
        termine: 'Salva l’anno',
        testo:
          'Un anno nuovo nasce **non salvato**, in una cartella provvisoria: la barra del ' +
          'titolo lo dice. `Ctrl+S` chiede nome e posto — il Desktop, una chiavetta, una ' +
          'cartella sincronizzata — e da lì in poi ogni modifica si scrive da sé.',
      },
      {
        termine: 'Metti le persone',
        testo:
          'In **Classi**, scelta la classe, dalla riga delle azioni: **Incolla elenco** prende i ' +
          `nomi ${dei(PIF)} copiati da un foglio o da un’e-mail, **Aggiungi al gruppo** ` +
          `aggiunge un nome alla volta. Recapiti, ${PERSONE.azienda.singolare} e foto si ` +
          'mettono dopo, con calma.',
      },
      {
        termine: 'Apri la lezione',
        testo:
          'Un clic su una lezione del calendario — con **Modifica** spenta —, o sull’ora ' +
          'proposta in fondo a sinistra, apre ' +
          'la pagina **Lezione**: **Amministrazione** per appello e consegne, **Lezione** per ' +
          'scaletta e valutazioni, **Annotazioni** per argomenti e osservazioni.',
      },
      {
        termine: 'Segna la lezione svolta',
        testo:
          'Finita la lezione, **Svolta** nella riga delle azioni: la lezione conta fra le lezioni ' +
          'svolte. Un’ora passata senza appello o non segnata resta un buco, e la barra in ' +
          'fondo continua a proporla.',
      },
      {
        termine: 'Guarda che cosa resta',
        testo:
          'La **Dashboard**, prima pagina dell’Agenda, riassume la giornata e porta dove serve. ' +
          `**${PENDENZE}** mostra valutazioni e consegne del corso scelto; il gruppo ` +
          '**Docente di classe** raccoglie invece pratiche e consegne dovute dalla classe.',
      },
    ],
    note: [
      'Un anno nuovo parte con le materie e le impostazioni di quello aperto; classi, ' +
        'corsi e piani li porta l’importazione, una casella per classe.',
      'Una vacanza del calendario che nella tua sede non vale si toglie dall’elenco delle ' +
        'pause prima di salvare l’anno, o dopo, da Giorni senza lezione.',
    ],
  },
  inizio: {
    titolo: 'Come è fatto il registro',
    sommario:
      'Una catena sola, e tutto il resto pende da lì: anno → classe, materia → corso → ' +
      'orario → lezioni.',
    scritte: {
      anno: 'Anno',
      classe: 'Classe',
      ilGruppo: 'il gruppo',
      corso: 'Corso',
      materiaPerClasse: 'materia × classe',
      orario: 'Orario',
      oreFisse: 'le ore fisse',
      materia: 'Materia',
      dalCatalogo: 'dal catalogo',
      lezioni: 'Lezioni',
      sulCalendario: 'sul calendario',
      agganciate: 'Lezioni, valutazioni e piani si agganciano al corso',
    },
    figure: [
      {
        didascalia:
          'Ogni cosa del registro pende da quella alla sua sinistra, e la materia entra dal ' +
          'basso: il corso è il nodo in cui le due strade si incontrano.',
        legenda: [
          'Il **corso** è una materia insegnata a una classe: due materie alla stessa classe ' +
            'sono due corsi.',
          'Le **lezioni** nascono dall’orario, una per ogni ora fissa della settimana.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Il corso è il perno',
        testo:
          'Lezioni, valutazioni e piani si agganciano al corso e non alla classe: due materie ' +
          'allo stesso gruppo sono due corsi, con due medie e due conti di presenza.',
      },
      {
        termine: 'Un anno, un documento',
        testo:
          'Ogni anno scolastico è un file `.regi` con dentro tutto, anche i PDF stampati e ' +
          'le scansioni. Si apre con un doppio clic; per cambiare anno si apre un altro ' +
          'documento.',
      },
      {
        termine: 'L’anno e i suoi semestri',
        testo:
          'I due semestri nascono con l’anno, tagliati a fine gennaio. Date e semestri si ' +
          'cambiano in **Impostazioni** › **Anno scolastico**, o con **Modifica l’anno** da ' +
          '`Ctrl+K`; le vacanze da **Vacanze e sospensioni**. ' +
          'La tendina **Periodo** ferma i conti — medie, assenze, lezioni — a un semestre o ' +
          'all’«Anno intero».',
      },
      {
        termine: 'Il «+» accanto alle tendine',
        testo:
          'Dove una tendina chiede qualcosa che non esiste ancora, il «+» accanto la crea sul ' +
          'momento e la sceglie da sola. Non c’è un ordine obbligato da indovinare, e quel che ' +
          'si stava scrivendo non si perde.',
      },
      {
        termine: 'Tutto si salva da sé',
        testo:
          'Nelle pagine di lavoro non c’è un pulsante «Salva»: l’appello parte al primo clic, ' +
          'i testi quando si lascia il campo. I moduli in finestra hanno il loro pulsante di ' +
          'conferma, e `Ctrl+Invio` li conferma anche da dentro un testo lungo.',
      },
      {
        termine: 'Un comando spento dice perché',
        testo:
          'Un pulsante grigio non è rotto: fermandosi sopra, il suggerimento dice che cosa ' +
          'manca — quasi sempre un corso da scegliere in cima. Lanciato da tastiera o dalla ' +
          'ricerca, lo dice un avviso.',
      },
      {
        termine: 'Le finestre si ritrovano dov’erano',
        testo:
          'Posto, misura, schermo e «ingrandita» si ricordano per il registro, il lettore dei ' +
          'documenti, le impostazioni e il benvenuto. Se lo schermo di ieri non c’è più, la ' +
          'finestra si riapre dentro uno di quelli attaccati.',
      },
    ],
    note: [
      'Eliminare una classe si porta via i suoi corsi, e con loro lezioni, valutazioni e ' +
        'consegne. Per una classe finita basta la spunta **Archiviata** nei **Dettagli** della ' +
        'classe, in Classi: esce dagli elenchi e lo storico resta.',
    ],
  },
  finestra: {
    titolo: 'La finestra del registro',
    sommario:
      'A sinistra dove si va, in cima di che cosa si parla e che cosa si può fare, in fondo ' +
      'che cosa manca.',
    scritte: {
      stato: 'da compilare: DIC4a · lun 14 set',
      file: 'File ▾',
      percorso: '2026-2027 › Calendario › lun 14 set',
      registro: 'Registro',
      gruppoAgenda: 'Agenda',
      calendario: 'Calendario',
      pendenze: PENDENZE,
      daSmistare: 'Da smistare',
      gruppoRegistro: 'Registro — DIC4a · Matematica',
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      gruppoAnno: 'L’anno',
      classi: 'Classi',
      corso: 'Corso',
      tuttiICorsi: 'Tutti i corsi ▾',
      annoIntero: 'Anno intero ▾',
      proietta: 'Proietta',
      nuovaOra: 'Nuova lezione',
    },
    figure: [
      {
        didascalia:
          'La barra del titolo e quella laterale parlano del registro intero; le due righe in ' +
          'cima e la barra in fondo cambiano con la pagina aperta.',
        legenda: [
          'La barra del titolo: **File** con le frecce ↶ ↷, l’anno aperto e il percorso; a ' +
            'destra **Cerca…**, e il filetto degli aggiornamenti quando esce una versione nuova.',
          'La barra laterale: in cima il pulsante che la stringe alle icone, sotto tutte le ' +
            'pagine nei loro gruppi, con quella aperta accesa.',
          'La riga delle scelte: di che cosa si parla.',
          'La riga delle azioni: che cosa si può fare qui.',
          'La pagina.',
          'La barra di stato: che cosa manca.',
        ],
      },
    ],
    voci: [
      {
        termine: 'La barra del titolo',
        testo:
          'A sinistra il segno del registro, **File** e le frecce ↶ ↷ — annulla e ripristina; al centro il nome dell’anno aperto e il ' +
          'percorso fin dove si è — con «(non salvato)» su un anno nuovo, e il file con la sua ' +
          'cartella nel suggerimento. A destra, contro i pulsanti della finestra, **Cerca…** con ' +
          'il suo `Ctrl+K`: apre la ricerca come il tasto, e in una finestra stretta resta la ' +
          'sola lente. Accanto, quando esce una versione nuova, il filetto degli aggiornamenti: ' +
          'due parole, il gesto che serve adesso, e la ✕ che lo nasconde fino alla prossima ' +
          'novità. Trascinando la barra si sposta la finestra, un doppio clic la ingrandisce.',
      },
      {
        termine: 'Il percorso',
        testo:
          'Subito dopo il nome dell’anno, dal largo allo stretto: il corso o la classe, la ' +
          'pagina, quel che è aperto — l’ora, la persona, il piano. Il gruppo della barra ' +
          'laterale e la linguetta accesa non si ripetono: si vedono già, un palmo più in là. ' +
          'L’ultimo anello, in chiaro, è dove si è. Si legge e non si preme; stringendo la ' +
          'finestra spariscono prima gli anelli larghi.',
      },
      {
        termine: 'La barra laterale',
        testo:
          `**Agenda**: Oggi, Calendario, ${PENDENZE}, Da smistare. **Registro**: Lezione, ` +
          'Valutazioni, Check, Piani lezione, Documenti, tutte del corso scelto in cima — il ' +
          'titolo del gruppo lo dice: «Registro — DIC4a · Matematica». ' +
          `**Docente di classe**: ${PENDENZE} della classe, Archivio documentale, Assenze, ` +
          'Messaggistica — solo se una classe ha la spunta «Sono docente di classe», e il ' +
          'titolo porta la classe. ' +
          `**L’anno**: Classi, ${Molti(PIF)}, Mappa, Corsi. ` +
          '**Il programma**, staccato in fondo alla colonna: Impostazioni, Guida. La pagina ' +
          'aperta è la voce accesa. L’intestazione dei fogli e i modelli linguistici stanno ' +
          'dentro le Impostazioni.',
      },
      {
        termine: 'Stringerla alle icone',
        testo:
          'Il pulsante in cima alla barra, accanto a «Registro», la riduce alle sole icone e ' +
          'la riapre; `Esc`, dentro la barra, la riduce. L’intestazione resta ferma mentre le ' +
          'pagine scorrono sotto. Nelle finestre strette si apre a richiesta e si richiude ' +
          'dopo la scelta; se lì è aperto anche l’assistente, resta alle icone.',
      },
      {
        termine: 'Un tasto per pagina',
        tasti: 'Ctrl+1…9',
        testo:
          'Le prime nove voci della barra, nell’ordine in cui si vedono: `Ctrl+1` è Dashboard, ' +
          '`Ctrl+2` il Calendario, e così giù fino a `Ctrl+9`, Documenti. Il tasto è scritto ' +
          'nel suggerimento della voce.',
      },
      {
        termine: 'I numeri accanto alle voci',
        testo:
          `Due voci portano un numero: **${PENDENZE}**, quante cose restano aperte — lo stesso ` +
          'numero della barra in fondo —, e **Da smistare**, le pagine di PDF ancora da ' +
          'assegnare. Zero non si scrive.',
      },
      {
        termine: 'Indietro e avanti',
        tasti: 'Alt+← / Alt+→',
        testo:
          '`Alt+←` torna al posto di prima — la pagina, l’ora, la scheda — e la ritrova ' +
          'scorsa fin dove la si era lasciata; `Alt+→` rifà il passo. Vanno anche i due tasti ' +
          'laterali del mouse. Non sono le frecce ↶ ↷ della barra del titolo: quelle disfano ' +
          'un gesto sul registro, queste cambiano solo dove si guarda.',
      },
      {
        termine: 'La riga delle scelte',
        testo:
          'Le tendine che dicono di che cosa si parla: **Corso** nelle pagine del Registro, ' +
          '**Classe** in quelle del Docente di classe, in Classi e nella Mappa, un filtro ' +
          '**Corso** con «Tutti i corsi» nel calendario; altrove nessuna. Accanto l’**Anno** ' +
          'aperto, che si legge e non si sceglie, e il **Periodo**: i semestri o «Anno intero».',
      },
      {
        termine: 'La riga delle azioni',
        testo:
          'Soltanto quel che si può fare nella pagina aperta: nel calendario **Oggi** e, con ' +
          '**Modifica** accesa, **Nuova lezione**; nella lezione **Pianificata**, **Svolta** e ' +
          '**Annullata**. Il ' +
          'comando più usato è in evidenza, un interruttore acceso si vede premuto. La ' +
          'freccia in fondo alla riga delle scelte la nasconde, come `Ctrl+B`. La guida e le ' +
          'impostazioni non hanno né questa riga né quella delle scelte, finché lo schermo per ' +
          'la classe è spento: i loro gesti stanno nella pagina.',
      },
      {
        termine: 'Modifica, Proietta e Assistente',
        testo:
          'In fondo alla riga delle scelte, da ogni pagina. **Modifica** (`Ctrl+E`) prende in ' +
          'mano le lezioni: nel calendario si disegnano, si stirano e si spostano; nella pagina di ' +
          'una lezione apre «Modifica la lezione». **Proietta** accende lo schermo per la classe e ' +
          'diventa **Spegni lo schermo**; acceso, compare **Proiezione**, che mette nella riga ' +
          'delle azioni i comandi dello schermo. **Assistente** c’è solo se è acceso nelle ' +
          'impostazioni.',
      },
      {
        termine: 'Il menu «File»',
        testo:
          'Il minimo per il documento dell’anno: un anno nuovo e **Apri un anno…**, con subito ' +
          'sotto i registri recenti e preferiti; **Importa da un altro registro…**, per portare ' +
          'in questo le classi e le impostazioni di un altro anno; **Chiudi l’anno** e **Apri la cartella ' +
          'del file**; da solo in fondo, **Esci dal registro**. Il registro salva da sé: **Salva l’anno con ' +
          'nome…** compare solo per un anno nuovo mai salvato. Modificare l’anno e la posta ' +
          'stanno nella loro sezione delle impostazioni, e tutto si trova anche con `Ctrl+K`.',
      },
      {
        termine: 'I preferiti, col tasto destro',
        testo:
          'Il tasto destro su un registro recente, nel menu **File** o in quello dell’anno ' +
          'in fondo a destra — o la freccia a destra, da tastiera — apre accanto **Aggiungi ai ' +
          'preferiti** o **Togli dai preferiti**, e **Togli dall’elenco**, che toglie la riga e ' +
          'lascia il file dov’è. Il menu resta aperto: si può mettere la stella a un altro ' +
          'anno senza riaprirlo.',
      },
      {
        termine: 'Ingrandire e schermo intero',
        testo:
          '`Ctrl+più` e `Ctrl+meno` ingrandiscono e rimpiccioliscono testo e riquadri, `Ctrl+0` ' +
          'torna alla misura normale, `F11` porta la finestra a tutto schermo. Non sono ' +
          'impostazioni: si ritrovano con `Ctrl+K` e nel menu del sistema, che compare con `Alt`.',
      },
      {
        termine: 'La riga degli avvisi',
        testo:
          'Quando qualcosa nel documento non torna — un corso che ha perso la sua materia — ' +
          'sopra la pagina compare «1 riferimento non torna», con il primo che manca. **Ripara**, ' +
          'quando c’è, sistema dopo una conferma quel che si corregge senza perdere niente; ' +
          '**Dettagli** porta nelle impostazioni.',
      },
      {
        termine: 'Il filo in cima',
        testo:
          'Un filo sottile che scorre sul bordo alto dice che il registro sta ancora lavorando, ' +
          'anche se il pulsante premuto si è già ridisegnato. Quando sparisce, la risposta è ' +
          'arrivata.',
      },
      {
        termine: 'Il menu del sistema',
        testo:
          'Su Windows e Linux la barra dei menu classica è nascosta, e `Alt` la fa comparire. ' +
          'Ha menu suoi — **Registro**, **Vai a**, **Nuovo**, **Schermo**, **Posta**, ' +
          '**Cartelle**, **Modifica**, **Visualizza** — e sotto **Registro** c’è ' +
          '**Impostazioni del programma…**: la finestra nativa, per quando la pagina delle ' +
          'impostazioni non si apre.',
      },
    ],
    note: [
      'Il **Corso** in cima vale per tutte e cinque le pagine del Registro e le segue: si ' +
        'sceglie una volta, fra i corsi che nel periodo hanno almeno un’ora o che di ore non ' +
        'ne hanno ancora. Il **Corso** del ' +
        'calendario è un altro campo: restringe la settimana e non sposta il corso su cui si ' +
        'lavora.',
      'Su uno schermo piccolo, `Ctrl+B` nasconde la riga delle azioni e `Ctrl+K` le ' +
        'raggiunge lo stesso: è la coppia che lascia più posto alla pagina.',
    ],
  },
  ricerca: {
    titolo: 'Cerca pagine, comandi e persone',
    sommario:
      'Una riga in cui scrivere quel che si cerca — una pagina, un comando, una persona, un ' +
      'corso, una classe — quando non si sa dove sta.',
    scritte: {
      cercato: 'nuov',
      nuovaOra: 'Nuova lezione',
      nuovaOraAiuto: 'Un’ora fuori orario, o la prima di un corso…',
      nuovoAnno: 'Nuovo anno scolastico',
      nuovoAnnoAiuto: 'Un anno nuovo, in un documento suo…',
      nuovaConsegna: 'Nuova consegna',
      altrove: 'Si fa dalla sua pagina: aprila, e lo trovi nella barra.',
      cercatoNome: 'dic4a',
      persona1: 'Bernasconi Luca',
      persona2: 'Ferrari Giulia',
      corso: 'DIC4a · Matematica',
      classe: 'DIC4a',
    },
    figure: [
      {
        didascalia:
          'Si scrive, e l’elenco si restringe a ogni lettera: ogni specie sotto il suo ' +
          'titoletto, e in ogni gruppo prima quel che si può fare adesso. Qui si è nel ' +
          'calendario con **Modifica** ' +
          `accesa: **Nuova lezione** va, **Nuova consegna** è delle ${CARTE.pendenza.plurale} e ` +
          'scende in fondo.',
        legenda: [
          'Le parole, in qualunque ordine e senza accenti: si cercano nel nome, nel gruppo e ' +
            'nella spiegazione.',
          'La riga scelta: le frecce la spostano, `Invio` la esegue.',
          'La scorciatoia, quando il comando ne ha una.',
          'Un comando che adesso non si può fare — anche perché è di un’altra pagina — scende ' +
            'in fondo, e dice perché.',
        ],
      },
      {
        didascalia:
          `Scrivendo un nome, dopo pagine e comandi vengono le ${PIF.plurale}, i corsi e le ` +
          'classi dell’anno aperto. Ogni gruppo mostra poche righe, e il titoletto dice quante ' +
          'ne restano fuori.',
        legenda: [
          'Il titoletto del gruppo, con il conto quando è tagliato: sei righe di ventuno. Una ' +
            'lettera in più restringe.',
          'La persona, con la sua classe sotto: `Invio` apre la sua scheda.',
          'Il corso porta alla sua scheda, nella pagina Corsi.',
          'La classe porta in Classi, con quella classe scelta.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Aprirla',
        tasti: 'Ctrl+K',
        testo:
          'Da qualunque pagina, anche da dentro un campo, o con un clic su **Cerca…** in alto ' +
          'a destra, nella barra del titolo. Non si apre mentre è aperta una finestra di modulo.',
      },
      {
        termine: 'Pagine e comandi insieme',
        testo:
          'Ci sono tutte le pagine e tutti i comandi. Si eseguono da dovunque le pagine, i ' +
          'comandi del menu **File** e quelli dello schermo per la classe; il comando di ' +
          'un’altra pagina resta spento, in fondo, e dice «Si fa dalla sua pagina»: **Nuova ' +
          'ora** si lancia dal calendario con **Modifica** accesa, o da ogni pagina con ' +
          '`Ctrl+Alt+N`, che la accende da sé.',
      },
      {
        termine: 'Persone, corsi e classi',
        testo:
          `Appena si scrive, sotto pagine e comandi compaiono anche le ${PIF.plurale} ` +
          'dell’anno aperto, con la classe accanto — «rossi dic4a» restringe ai Rossi di quella ' +
          'classe —, i corsi e le classi. `Invio` apre la scheda della persona, la scheda del ' +
          'corso, o la classe in **Classi**. Chi si è ritirato c’è, in fondo.',
      },
      {
        termine: 'Poche righe per gruppo',
        testo:
          'A campo vuoto dieci righe: sei pagine e quattro comandi. Scrivendo, ogni gruppo ha ' +
          'le sue — quattro pagine, cinque comandi, sei persone, tre corsi, tre classi — e ' +
          'nessuno ruba il posto agli altri. Quando ne restano fuori il titoletto lo dice, ' +
          '«6 di 12»: basta una lettera in più. «Niente con questo nome.» vuol dire che ' +
          'nessuna voce contiene tutte le parole.',
      },
      {
        termine: 'Chiuderla',
        testo: '`Esc`, di nuovo `Ctrl+K`, o un clic fuori dal riquadro.',
      },
      {
        termine: 'Cercare in questa guida',
        tasti: '/',
        testo:
          'La casella in cima alla guida capisce le parole di chi cerca: «voto» trova le ' +
          `valutazioni, «allievo» le ${PIF.plurale}, e plurali, verbi e accenti non ` +
          'contano. In cima compaiono le **Risposte migliori**; le frecce le scorrono, ' +
          '`Invio` porta alla prima, `Esc` svuota.',
      },
      {
        termine: 'Forse cercavi',
        testo:
          'Una parola sbagliata di una lettera non lascia a mani vuote: la guida propone la ' +
          'più vicina con **Forse cercavi «…»**. **Mostra tutta la guida** torna a tutto.',
      },
      {
        termine: 'La guida della pagina in cui si è',
        tasti: 'F1',
        testo:
          'Da qualunque pagina apre la guida sulla sezione che la racconta. Aperta in un altro ' +
          'modo — dalla barra laterale o dalla ricerca — la guida ricorda da dove ' +
          'si veniva e lo propone in cima, con ' +
          '**Leggi come funziona**; **Apri la pagina**, accanto al titolo di una sezione, ' +
          'riporta alla pagina vera.',
      },
      {
        termine: 'Le figure',
        testo:
          'Passando su un numero della figura si accende la riga che lo spiega, e al ' +
          'contrario. Un clic sulla figura la ingrandisce: le frecce sfogliano tutte le ' +
          'figure della guida, `Esc` chiude. Nell’indice, l’immagine accanto a una sezione ' +
          'dice che ha uno schema, e la voce accesa è quella che si sta leggendo.',
      },
    ],
    note: [
      'Tre lettere e `Invio` bastano quasi sempre: quel che si può fare adesso viene prima, ' +
        'e la prima riga è quasi sempre quella che si cercava.',
    ],
  },
  barraStato: {
    titolo: 'La barra in fondo',
    sommario:
      'Che cosa manca, e com’è messa la macchina. Si guarda senza cercare niente.',
    scritte: {
      aSinistra: 'a sinistra',
      daCompilare: 'da compilare: DIC4a · lun 14 set',
      pendenze: quanti(3, CARTE.pendenza),
      tuttiICorsi: 'Tutti i corsi ▾',
      semestre: '1° semestre ▾',
      aDestra: 'a destra',
      assistente: 'Assistente acceso',
      casella: 'casella collegata',
      leOre: 'Le lezioni',
      diCorsoEPeriodo: 'di corso e periodo',
      buco: 'C’è un buco?',
      buco2: 'ora passata e non chiusa',
      si: 'sì',
      compilare: 'da compilare',
      piuVecchio: 'il buco più vecchio',
      no: 'no',
      inArrivo: 'Un’ora in arrivo?',
      nonAnnullata: 'non annullata',
      prossima: 'prossima',
      classeGiornoOra: 'classe · giorno ora',
    },
    figure: [
      {
        didascalia:
          'Nella finestra le due metà stanno sulla stessa riga: a sinistra quel che chiede ' +
          'qualcosa, a destra com’è messa la macchina.',
        legenda: [
          'La lezione da compilare, o la prossima.',
          `Le ${CARTE.pendenza.plurale} aperte.`,
          'Corso e periodo dell’ora proposta.',
          'L’assistente e la lettura delle scansioni: accesi o spenti.',
          'La posta, o «senza rete».',
          'L’anno aperto.',
        ],
      },
      {
        didascalia:
          'Prima i buchi, poi il futuro: un’ora di martedì senza appello resta proposta anche ' +
          'giovedì, finché non la si chiude. Senza né buchi né ore in arrivo la voce dice ' +
          '«nessuna lezione in programma».',
      },
    ],
    voci: [
      {
        termine: 'La lezione da compilare',
        testo:
          'In fondo a sinistra, con il triangolo giallo: «da compilare: classe · giorno». ' +
          'Senza buchi dice «prossima: classe · giorno ora». Un clic apre quella lezione, e ' +
          'il suggerimento ne dice la data per esteso.',
      },
      {
        termine: PENDENZE,
        testo:
          'Quante cose restano aperte in tutte le classi: le stesse della pagina a cui porta ' +
          'il clic. Fermandosi sopra si legge quante sono in ritardo.',
      },
      {
        termine: 'Corso e periodo',
        testo:
          'Restringono l’ora proposta, così chi lavora su una classe sola non si vede proporre ' +
          'i buchi delle altre. Sono gli stessi campi del filtro del calendario e del ' +
          '**Periodo** in cima: si cambiano di qua e si ritrovano cambiati di là.',
      },
      {
        termine: 'La lettura delle scansioni',
        testo:
          'Mentre il registro legge i PDF compare «legge 3 di 12», e fermandosi sopra si vede ' +
          'quale. Poi sparisce da sé.',
      },
      {
        termine: 'La posta e la rete',
        testo:
          '«casella collegata», «spedisce da sé» o «bozze in file .eml»: da dove escono le ' +
          'comunicazioni; un clic porta nelle impostazioni. Senza rete la voce diventa **senza ' +
          'rete**, in rosso: quel che si scrive si salva lo stesso, ma le comunicazioni non ' +
          'partono e le scansioni non si leggono.',
      },
      {
        termine: 'L’assistente e la lettura delle scansioni',
        testo:
          'Due interruttori: «acceso» o «spento», e un clic cambia. Quando manca quel che serve ' +
          '— il modello, per la lettura anche il proiettore — dicono «non si accende», e il ' +
          'clic porta nei **Modelli linguistici**.',
      },
      {
        termine: 'La versione nuova',
        testo:
          'Quando esce una versione del registro compare «c’è la …», poi «scarico la …» e ' +
          '«… pronta»: le stesse parole del filetto nella barra del titolo. Un clic porta agli ' +
          'aggiornamenti nelle impostazioni.',
      },
      {
        termine: 'L’anno',
        testo:
          'In fondo a destra il nome dell’anno aperto: un clic apre i registri preferiti e ' +
          'recenti, con sotto **Apri un anno…**, **Nuovo anno scolastico** e **Chiudi ' +
          'l’anno**. Il tasto destro su una riga mette o toglie la stella.',
      },
      {
        termine: 'Il promemoria prima della lezione',
        testo:
          'Poco prima di un’ora arriva una notifica del sistema, fuori da questa barra: la ' +
          'racconta la sezione del promemoria.',
      },
    ],
    note: [
      `Una voce che non ha niente da dire non compare: nessuna ${CARTE.pendenza.singolare} ` +
        'aperta, nessuna lettura in corso, nessuna versione nuova. Restano la posta, l’anno ' +
        'e i due interruttori, dove anche «spento» è una risposta. Una barra che dice sempre ' +
        'le stesse ' +
        'otto cose diventa sfondo, e il giorno che dice «senza rete» non la legge più nessuno.',
    ],
  },
  scorciatoie: {
    titolo: 'Scorciatoie da tastiera',
    sommario:
      'Le mani restano sulla tastiera. Valgono quando una finestra del registro ha il fuoco.',
    scritte: {
      dalMenu: 'Dal menu del programma',
      dallaPagina: 'Dalla pagina',
      moduloAperto: 'Modulo aperto',
      tacciono: 'qui tacciono',
    },
    figure: [
      {
        didascalia:
          'Due orecchie diverse, una regola sola: con un modulo aperto nessuna delle due porta ' +
          'altrove. `Ctrl+Alt+N` lì si ferma con un avviso, `Ctrl+S` non fa niente.',
        legenda: [
          'Li ascolta il menu del programma, anche quando non si vede. Quelli che cambiano ' +
            'pagina — `Ctrl+Alt+T`, `Ctrl+Alt+N`, `Ctrl+,` — con un modulo aperto si fermano e ' +
            'lo dicono.',
          'Li ascolta la pagina: valgono anche dentro un campo — `Alt+←` e `Alt+→` no, lì la ' +
            'freccia è di chi scrive —, ma tacciono mentre una finestra di modulo è aperta: lì ' +
            '`Invio` ed `Esc` sono del modulo.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Cerca pagine, comandi e persone',
        tasti: 'Ctrl+K',
        testo:
          'Anche con un clic su **Cerca…**, in alto a destra. Frecce per scegliere, `Invio` per ' +
          'aprire, `Esc` per chiudere.',
      },
      {
        termine: 'Indietro e avanti',
        tasti: 'Alt+← / Alt+→',
        testo:
          'Fra i posti in cui si è stati, come in un browser; anche i due tasti laterali del ' +
          'mouse. Tornando, la pagina si ritrova scorsa fin dove la si era lasciata. Non dentro ' +
          'un campo in cui si scrive.',
      },
      {
        termine: 'Le pagine della barra laterale',
        tasti: 'Ctrl+1…9',
        testo:
          'Le prime nove voci, nell’ordine in cui si vedono: da Dashboard a Documenti. Il tasto è ' +
          'scritto nel suggerimento della voce.',
      },
      {
        termine: 'La guida di questa pagina',
        tasti: 'F1',
        testo:
          'Da qualunque pagina: apre la guida sulla sezione che la racconta.',
      },
      {
        termine: 'Cerca nella guida',
        tasti: '/',
        testo:
          'Dentro la guida, fuori da un campo: porta il cursore nella casella della ricerca.',
      },
      {
        termine: 'Salva',
        tasti: 'Ctrl+S',
        testo:
          'Consegna il campo in cui si sta scrivendo e salva; su un anno nuovo chiede nome e ' +
          'posto.',
      },
      {
        termine: 'Annulla e ripristina',
        tasti: 'Ctrl+Z / Ctrl+Y',
        testo:
          'Fuori da un campo di testo tornano indietro dell’ultimo gesto fatto sul registro, e ' +
          'lo rifanno; dentro un campo annullano le battute, come sempre. Anche `Ctrl+Maiusc+Z` ' +
          'ripristina, e ci sono le frecce ↶ ↷ nella barra del titolo. La storia vive finché ' +
          'il registro è aperto: chiuso o riaperto l’anno, riparte da capo.',
      },
      {
        termine: 'Apri un anno',
        tasti: 'Ctrl+O',
        testo: 'Sceglie un altro documento `.regi` dal disco.',
      },
      {
        termine: 'Mostra o nascondi le azioni',
        tasti: 'Ctrl+B',
        testo: 'Non dentro un campo di testo.',
      },
      {
        termine: 'Modifica le lezioni',
        tasti: 'Ctrl+E',
        testo:
          'Da qualunque pagina, come l’interruttore **Modifica**: nel calendario le lezioni si ' +
          'disegnano, si stirano e si spostano; nella pagina di un’ora si apre «Modifica ' +
          'l’ora». Di nuovo `Ctrl+E`, o `Esc` nel calendario, ed esce.',
      },
      {
        termine: 'Oggi',
        tasti: 'Ctrl+Alt+T',
        testo:
          'Da qualunque pagina, come il pulsante **Oggi**: il calendario torna a oggi nel modo ' +
          'in cui lo si guarda, e in settimana scorre fino all’ora di adesso.',
      },
      {
        termine: 'Nuova lezione',
        tasti: 'Ctrl+Alt+N',
        testo:
          'Da qualunque pagina, come il pulsante **Nuova lezione**: porta nel calendario, accende ' +
          '**Modifica** e apre il modulo sul giorno scelto, con il corso su cui si lavora; ' +
          'salvata, apre l’ora.',
      },
      {
        termine: 'Mostra il registro',
        tasti: 'Ctrl+Alt+R',
        testo: 'Riporta davanti la finestra del registro.',
      },
      {
        termine: 'Impostazioni',
        tasti: 'Ctrl+,',
        testo: 'Apre la pagina delle impostazioni.',
      },
      {
        termine: 'Ingrandisci, riduci, normale',
        tasti: 'Ctrl+più / Ctrl+- / Ctrl+0',
        testo:
          'Testo e riquadri più grandi o più piccoli, un passo alla volta.',
      },
      {
        termine: 'Schermo intero',
        tasti: 'F11',
        testo:
          'Della finestra di chi insegna, non dello schermo per la classe.',
      },
      {
        termine: 'Il menu del sistema',
        tasti: 'Alt',
        testo:
          'Su Windows e Linux fa comparire la barra dei menu, che resta nascosta.',
      },
      {
        termine: 'Nelle finestre di modulo',
        tasti: 'Invio / Ctrl+Invio / Esc',
        testo:
          '`Invio` conferma, `Ctrl+Invio` conferma anche da dentro un testo lungo, `Esc` ' +
          'annulla. `Tab` gira dentro la finestra senza uscirne.',
      },
      {
        termine: 'Nei campi data',
        tasti: '↑ / ↓ / PagSu / PagGiù',
        testo: 'Un giorno avanti o indietro, un mese avanti o indietro.',
      },
      {
        termine: 'Nella griglia dei voti',
        tasti: '← / → / ↑ / ↓ / Invio',
        testo:
          'Ci si sposta come in un foglio di calcolo; `Invio` scende, e a fine colonna passa ' +
          'in cima a quella dopo.',
      },
      {
        termine: 'Nei menu',
        tasti: '↑ / ↓ / → / ← / Home / Fine / Esc',
        testo:
          'Anche in quelli del tasto destro; `Tab` chiude il menu. Freccia giù su **File** o su ' +
          'un altro pulsante con la tendina la apre. Su un registro recente la freccia a ' +
          'destra apre i suoi comandi — i preferiti, togli dall’elenco — e quella a sinistra ' +
          'li richiude.',
      },
      {
        termine: 'Nelle linguette',
        tasti: '← / →',
        testo:
          'Nella lezione — **Amministrazione**, **Lezione**, **Annotazioni** — nella mappa e ' +
          'nella scheda di una persona le frecce girano fra le linguette.',
      },
      {
        termine: 'Spostare una riga',
        tasti: '↑ / ↓',
        testo:
          'Con il fuoco sulla presa di una riga — una tappa del piano, un’ora dell’orario.',
      },
      {
        termine: 'Aggiungere a un elenco',
        tasti: 'Invio',
        testo:
          'Nei campi che aggiungono una voce — un calendario ICS, una scelta nelle ' +
          'impostazioni — senza cercare il pulsante.',
      },
      {
        termine: 'Ridurre la barra laterale',
        tasti: 'Esc',
        testo: 'Con il fuoco nella barra laterale, la stringe alle icone.',
      },
      {
        termine: 'Scegliere più cose',
        tasti: 'Ctrl+clic / Maiusc+clic',
        testo:
          'Fra le pagine da smistare e fra i PDF dei documenti: Ctrl aggiunge o toglie, Maiusc ' +
          'prende un tratto. Nel calendario, Ctrl+clic su più eventi ICS dello stesso giorno ne ' +
          'fa una lezione sola.',
      },
      {
        termine: 'Copiare una lezione nel calendario',
        tasti: 'Ctrl+trascina',
        testo:
          'Trascinare sposta; con Ctrl (o Alt) premuto si lascia una copia.',
      },
      {
        termine: 'Rinunciare a un trascinamento',
        tasti: 'Esc',
        testo:
          'Fra le pagine da smistare: la pagina torna dov’era, senza avvisi.',
      },
      {
        termine: 'Nell’assistente',
        tasti: 'Invio / Maiusc+Invio / Esc',
        testo:
          '`Invio` manda la domanda, `Maiusc+Invio` va a capo, `Esc` chiude il riquadro. Con ' +
          'il microfono aperto `Esc` ferma solo la dettatura, senza scrivere niente, e il ' +
          'riquadro resta aperto.',
      },
      {
        termine: 'Nel benvenuto',
        tasti: 'Esc',
        testo: 'Vale **Esci**.',
      },
    ],
    note: [
      'Il suggerimento di ogni pulsante della riga delle azioni e di ogni voce della barra ' +
        'laterale, le voci di **File** e le righe della ricerca scrivono la scorciatoia ' +
        'accanto al nome: è lì che si imparano.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    primiPassi: {
      titolo: 'Erste Schritte',
      sommario:
        'Vom leeren Klassenbuch zur ersten ausgefüllten Stunde, in sieben Schritten. Den Rest ' +
        'der Hilfe liest man, wenn man ihn braucht.',
      scritte: {
        benvenuto: 'Willkommen',
        nuovoAnno: 'neues Jahr',
        classi: 'Klassen',
        eCorsi: 'und Kurse',
        elenco: 'Liste',
        inClassi: 'in Klassen',
        ora: 'Die Stunde',
        calendario: 'Kalender',
        svolta: 'Gehalten',
        aFineOra: 'am Schluss',
        pendenze: Molti(DE.pendenza),
        agenda: 'Agenda',
        unaVolta: 'einmal, zu Beginn des Jahres',
        ogniGiorno: 'dann jeden Tag',
      },
      figure: [
        {
          didascalia:
            'Die ersten vier Schritte macht man einmal im Jahr; die letzten drei sind die ' +
            'tägliche Runde.',
        },
      ],
      voci: [
        {
          termine: 'Der Willkommensbildschirm',
          testo:
            'Ohne offenes Schuljahr zeigt das Klassenbuch nur ein Fenster: **Schuljahr ' +
            'öffnen…** für eine `.regi`-Datei, die es schon gibt, **Neues Schuljahr ' +
            'anlegen…** für den Anfang. Darunter die zuletzt geöffneten: Der Stern macht ein ' +
            'Schuljahr zum Favoriten, das Kreuz nimmt es aus der Liste, ohne die Datei ' +
            'anzurühren. Ganz unten, neben der Version, der Stand der Aktualisierungen.',
        },
        {
          termine: 'Ein neues Schuljahr erstellen',
          testo:
            'Man wählt das Schuljahr aus dem offiziellen Kalender: Daten, Ferien und Feiertage ' +
            'kommen mit. Gibt es schon andere Klassenbücher, fragt das Klassenbuch, ob es ' +
            'Klassen, Kurse und Einstellungen daraus übernehmen soll; dann öffnet es die Seite ' +
            'des Schuljahrs. Im Hauptfenster ist es dasselbe Formular: **Neues Jahr** unter ' +
            'Einstellungen › Schuljahr und Stundenplan › Schuljahr, oder auf der Seite eines ' +
            'leeren Klassenbuchs.',
        },
        {
          termine: 'Klassen und Kurse',
          testo:
            '**Aus einem anderen Klassenbuch importieren…** im Menü Datei holt Klassen mit ' +
            'ihren Personen, Kurse, Fächer und Pläne aus einem früheren Jahr. Wer bei null ' +
            'anfängt: **Neue Klasse** unter Klassen, **Neuer Kurs** unter Kurse mit den Stunden ' +
            'der Woche, und **Stunden im Kalender** trägt die Stunden bis zum Jahresende ein.',
        },
        {
          termine: 'Das Schuljahr speichern',
          testo:
            'Ein neues Schuljahr ist zuerst **nicht gespeichert** und liegt in einem ' +
            'vorläufigen Ordner: Die Titelleiste sagt es. `Ctrl+S` fragt nach Name und Ort — ' +
            'der Desktop, ein USB-Stick, ein synchronisierter Ordner — und von da an wird jede ' +
            'Änderung von selbst geschrieben.',
        },
        {
          termine: 'Die Personen eintragen',
          testo:
            'Unter **Klassen** die Klasse wählen, dann in der Aktionsleiste: **Liste einfügen** ' +
            `übernimmt die Namen der ${DE.pif.plurale}, kopiert aus einer Tabelle oder einer ` +
            'E-Mail, **Zur Gruppe hinzufügen** fügt einen Namen nach dem anderen hinzu. ' +
            `Kontaktadressen, ${DE.azienda.singolare} und Foto kommen später, in aller Ruhe.`,
        },
        {
          termine: 'Die Stunde öffnen',
          testo:
            'Ein Klick auf eine Stunde im Kalender — mit ausgeschaltetem ' +
            '**Bearbeiten** — oder auf die vorgeschlagene Stunde unten links öffnet die Seite ' +
            '**Stunde**: **Verwaltung** für Präsenzkontrolle und Aufträge, ' +
            '**Unterricht** für Ablauf und Beurteilungen, **Notizen** für Themen und ' +
            'Beobachtungen.',
        },
        {
          termine: 'Die Stunde als gehalten markieren',
          testo:
            'Nach dem Unterricht **Gehalten** in der Aktionsleiste: Die Stunde zählt zu den ' +
            'gehaltenen Stunden. Eine vergangene Stunde ohne Präsenzkontrolle oder ohne ' +
            'Markierung bleibt eine Lücke, und die Leiste unten schlägt sie weiter vor.',
        },
        {
          termine: 'Schauen, was noch offen ist',
          testo:
            'Das **Dashboard**, die erste Seite der Agenda, fasst den Tag zusammen und führt ' +
            `weiter. **${Molti(DE.pendenza)}** zeigt Beurteilungen und Aufträge des gewählten ` +
            'Kurses; **Klassenlehrperson** sammelt Vorgänge und Pflichten der Klasse.',
        },
      ],
      note: [
        'Ein neues Schuljahr beginnt mit den Fächern und Einstellungen des offenen; Klassen, ' +
          'Kurse und Pläne bringt der Import, mit einem Häkchen pro Klasse.',
        'Ferien aus dem Kalender, die an deiner Schule nicht gelten, entfernt man aus der Liste ' +
          'der Unterbrüche, bevor man das Schuljahr speichert, oder später unter ' +
          'Tage ohne Unterricht.',
      ],
    },
    inizio: {
      titolo: 'Wie das Klassenbuch aufgebaut ist',
      sommario:
        'Eine einzige Kette, und alles andere hängt daran: Schuljahr → Klasse, Fach → Kurs → ' +
        'Stundenplan → Stunden.',
      scritte: {
        anno: 'Schuljahr',
        classe: 'Klasse',
        ilGruppo: 'die Gruppe',
        corso: 'Kurs',
        materiaPerClasse: 'Fach × Klasse',
        orario: 'Stundenplan',
        oreFisse: 'die festen Stunden',
        materia: 'Fach',
        dalCatalogo: 'aus dem Katalog',
        lezioni: 'Stunden',
        sulCalendario: 'im Kalender',
        agganciate: 'Stunden, Beurteilungen und Pläne hängen am Kurs',
      },
      figure: [
        {
          didascalia:
            'Alles im Klassenbuch hängt an dem, was links davon steht, und das Fach kommt von ' +
            'unten dazu: Der Kurs ist der Knoten, in dem sich die beiden Wege treffen.',
          legenda: [
            'Der **Kurs** ist ein Fach, das in einer Klasse unterrichtet wird: zwei Fächer in ' +
              'derselben Klasse sind zwei Kurse.',
            'Die **Stunden** entstehen aus dem Stundenplan, eine für jede feste ' +
              'Unterrichtsstunde der Woche.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Der Kurs ist der Dreh- und Angelpunkt',
          testo:
            'Stunden, Beurteilungen und Pläne hängen am Kurs, nicht an der Klasse: zwei ' +
            'Fächer in derselben Gruppe sind zwei Kurse, mit zwei Durchschnitten und zwei ' +
            'Präsenzzählungen.',
        },
        {
          termine: 'Ein Schuljahr, ein Dokument',
          testo:
            'Jedes Schuljahr ist eine `.regi`-Datei, in der alles steckt, auch die ' +
            'gedruckten PDF und die Scans. Man öffnet sie mit einem Doppelklick; für ein anderes ' +
            'Schuljahr öffnet man ein anderes Dokument.',
        },
        {
          termine: 'Das Schuljahr und seine Semester',
          testo:
            'Die beiden Semester entstehen mit dem Schuljahr, getrennt Ende Januar. Daten und ' +
            'Semester ändert man unter **Einstellungen** › **Schuljahr** oder mit **Schuljahr ' +
            'bearbeiten** über `Ctrl+K`; die Ferien unter **Ferien und Unterbrüche**. Die ' +
            'Auswahl **Zeitraum** begrenzt die Zählungen — Durchschnitte, Absenzen, Stunden — ' +
            'auf ein Semester oder auf «Ganzes Jahr».',
        },
        {
          termine: 'Das «+» neben den Auswahllisten',
          testo:
            'Wo eine Auswahlliste etwas verlangt, das es noch nicht gibt, legt das «+» daneben ' +
            'es sofort an und wählt es gleich aus. Es gibt keine Reihenfolge zu erraten, und ' +
            'was man gerade schrieb, geht nicht verloren.',
        },
        {
          termine: 'Alles speichert sich selbst',
          testo:
            'Auf den Arbeitsseiten gibt es keine Schaltfläche «Speichern»: Die ' +
            'Präsenzkontrolle wird beim ersten Klick gespeichert, Texte beim Verlassen des ' +
            'Felds. Formulare im Fenster haben ihre eigene Bestätigungsschaltfläche, und ' +
            '`Ctrl+Enter` bestätigt sie auch mitten in einem langen Text.',
        },
        {
          termine: 'Ein inaktiver Befehl sagt, warum',
          testo:
            'Eine graue Schaltfläche ist nicht kaputt: Wer mit der Maus darauf verweilt, liest ' +
            'im Hinweis, was fehlt — fast immer ein Kurs, der oben zu wählen ist. Über die ' +
            'Tastatur oder die Suche aufgerufen, sagt es eine Meldung.',
        },
        {
          termine: 'Die Fenster bleiben, wo sie waren',
          testo:
            'Position, Grösse, Bildschirm und «maximiert» merkt sich das Klassenbuch für das ' +
            'Hauptfenster, den Dokumentbetrachter, die Einstellungen und den ' +
            'Willkommensbildschirm. Gibt es den Bildschirm von gestern nicht mehr, öffnet sich ' +
            'das Fenster auf einem der angeschlossenen.',
        },
      ],
      note: [
        'Wer eine Klasse löscht, löscht ihre Kurse mit, und damit Stunden, Beurteilungen ' +
          'und Aufträge. Für eine abgeschlossene Klasse genügt das Häkchen **Archiviert** in den ' +
          '**Details** der Klasse, unter Klassen: Sie verschwindet aus den Listen, und ihre ' +
          'Geschichte bleibt.',
      ],
    },
    finestra: {
      titolo: 'Das Fenster des Klassenbuchs',
      sommario:
        'Links, wohin man geht; oben, worum es geht und was man tun kann; unten, was fehlt.',
      scritte: {
        stato: 'auszufüllen: DIC4a · Mo 14. Sep',
        file: 'Datei ▾',
        percorso: '2026-2027 › Kalender › Mo 14. Sep',
        registro: 'Klassenbuch',
        gruppoAgenda: 'Agenda',
        calendario: 'Kalender',
        pendenze: Molti(DE.pendenza),
        daSmistare: 'Zuzuordnen',
        gruppoRegistro: 'Klassenbuch — DIC4a · Mathematik',
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: Molti(DE.pianoLezione),
        documenti: 'Dokumente',
        gruppoAnno: 'Schuljahr',
        classi: 'Klassen',
        corso: 'Kurs',
        tuttiICorsi: 'Alle Kurse ▾',
        annoIntero: 'Ganzes Jahr ▾',
        proietta: 'Projizieren',
        nuovaOra: 'Neue Stunde',
      },
      figure: [
        {
          didascalia:
            'Titelleiste und Seitenleiste gelten für das ganze Klassenbuch; die beiden Zeilen ' +
            'oben und die Leiste unten wechseln mit der offenen Seite.',
          legenda: [
            'Die Titelleiste: **Datei** mit den Pfeilen ↶ ↷, das offene Schuljahr und der ' +
              'Pfad; rechts **Suchen…**, und der Hinweis auf die Aktualisierung, wenn eine neue ' +
              'Version erscheint.',
            'Die Seitenleiste: oben die Schaltfläche, die sie auf die Symbole verkleinert, ' +
              'darunter alle Seiten in ihren Gruppen, die offene hervorgehoben.',
            'Die Auswahlzeile: worum es geht.',
            'Die Aktionsleiste: was man hier tun kann.',
            'Die Seite.',
            'Die Statusleiste: was fehlt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die Titelleiste',
          testo:
            'Links das Zeichen des Klassenbuchs, **Datei** und die Pfeile ↶ ↷ — rückgängig und ' +
            'wiederherstellen; in der Mitte der Name des offenen Schuljahrs und der Pfad bis ' +
            'dorthin, wo man ist — mit «(nicht gespeichert)» bei einem neuen Schuljahr, und ' +
            'der Datei samt Ordner im Hinweis. Rechts, direkt vor den Fensterschaltflächen, ' +
            '**Suchen…** mit seinem `Ctrl+K`: Es öffnet die Suche wie die Taste, und in einem ' +
            'schmalen Fenster bleibt nur die Lupe. Daneben, wenn eine neue Version erscheint, ' +
            'der Hinweis auf die Aktualisierung: zwei Wörter, der Schritt, der jetzt nötig ist, ' +
            'und das ✕, das ihn bis zur nächsten Neuigkeit ausblendet. Wer die Leiste zieht, ' +
            'verschiebt das Fenster; ein Doppelklick maximiert es.',
        },
        {
          termine: 'Der Pfad',
          testo:
            'Gleich nach dem Namen des Schuljahrs, vom Weiten zum Engen: Kurs oder Klasse, ' +
            'Seite, was offen ist — die Stunde, die Person, der Plan. Die Gruppe der ' +
            'Seitenleiste und der aktive Reiter wiederholen sich hier nicht: Man sieht sie ' +
            'schon, eine Handbreit daneben. Das letzte Glied, hell, ist der Ort, an dem man ist. ' +
            'Man liest ihn und klickt nicht darauf; wird das Fenster schmaler, verschwinden ' +
            'zuerst die weiten Glieder.',
        },
        {
          termine: 'Die Seitenleiste',
          testo:
            `**Agenda**: Heute, Kalender, ${Molti(DE.pendenza)}, Zuzuordnen. **Klassenbuch**: ` +
            `${Uno(DE.lezione)}, Beurteilungen, Check, ${Molti(DE.pianoLezione)}, Dokumente, ` +
            'alle zum oben gewählten Kurs — der Titel der Gruppe sagt es: «Klassenbuch — DIC4a ' +
            '· Mathematik». ' +
            `**${Uno(DE.docenteClasse)}**: ${Molti(DE.pendenza)} der Klasse, Dokumentenarchiv, ` +
            'Absenzen, Mitteilungen — nur wenn eine Klasse das Häkchen «Ich bin ' +
            'Klassenlehrperson» hat, und der Titel nennt die Klasse. ' +
            `**Schuljahr**: Klassen, ${Molti(DE.pif)}, Karte, Kurse. **Programm**, abgesetzt ` +
            'ganz unten in der Spalte: Einstellungen, Hilfe. Die offene Seite ist der ' +
            'hervorgehobene Eintrag. Der Briefkopf und die Sprachmodelle liegen in den ' +
            'Einstellungen.',
        },
        {
          termine: 'Auf die Symbole verkleinern',
          testo:
            'Die Schaltfläche oben in der Leiste, neben «Klassenbuch», verkleinert sie auf die ' +
            'Symbole und öffnet sie wieder; `Esc` in der Leiste verkleinert sie. Der Kopf ' +
            'bleibt stehen, während die Seiten darunter scrollen. In schmalen Fenstern öffnet ' +
            'sie sich auf Wunsch und schliesst sich nach der Wahl wieder; ist dort auch der ' +
            'Assistent offen, bleibt sie bei den Symbolen.',
        },
        {
          termine: 'Eine Taste pro Seite',
          tasti: 'Ctrl+1…9',
          testo:
            'Die ersten neun Einträge der Leiste, in der Reihenfolge, in der man sie sieht: ' +
            '`Ctrl+1` ist Dashboard, `Ctrl+2` der Kalender, und so weiter bis `Ctrl+9`, Dokumente. ' +
            'Die Taste steht im Hinweis des Eintrags.',
        },
        {
          termine: 'Die Zahlen neben den Einträgen',
          testo:
            `Zwei Einträge tragen eine Zahl: **${Molti(DE.pendenza)}**, wie viel noch offen ist ` +
            '— dieselbe Zahl wie in der Leiste unten —, und **Zuzuordnen**, die PDF-Seiten, die ' +
            'noch zuzuordnen sind. Null wird nicht angezeigt.',
        },
        {
          termine: 'Zurück und vorwärts',
          tasti: 'Alt+← / Alt+→',
          testo:
            '`Alt+←` kehrt zum vorigen Ort zurück — die Seite, die Stunde, das Blatt — und ' +
            'findet sie so weit gescrollt wieder, wie man sie verlassen hat; `Alt+→` macht den ' +
            'Schritt wieder. Auch die beiden Seitentasten der Maus gehen. Das sind nicht die ' +
            'Pfeile ↶ ↷ der Titelleiste: Die machen einen Schritt im Klassenbuch rückgängig, ' +
            'diese ändern nur, wohin man schaut.',
        },
        {
          termine: 'Die Auswahlzeile',
          testo:
            'Die Auswahllisten, die sagen, worum es geht: **Kurs** auf den Seiten des ' +
            'Klassenbuchs, **Klasse** auf denen der Klassenlehrperson, unter Klassen und in der ' +
            'Karte, ein Filter **Kurs** mit «Alle Kurse» im Kalender; sonst keine. Daneben ' +
            'das offene **Schuljahr**, das man liest und nicht wählt, und der **Zeitraum**: die ' +
            'Semester oder «Ganzes Jahr».',
        },
        {
          termine: 'Die Aktionsleiste',
          testo:
            'Nur, was man auf der offenen Seite tun kann: im Kalender **Heute** und, mit ' +
            'eingeschaltetem **Bearbeiten**, **Neue Stunde**; in der Stunde **Geplant**, ' +
            '**Gehalten** und **Ausgefallen**. Der meistgebrauchte Befehl ist hervorgehoben, ' +
            'ein eingeschalteter Schalter sieht gedrückt aus. Der Pfeil am Ende der ' +
            'Auswahlzeile blendet die Leiste aus, wie `Ctrl+B`. Hilfe und Einstellungen haben ' +
            'weder diese Leiste noch die Auswahlzeile, solange der Bildschirm für die Klasse ' +
            'aus ist: Ihre Befehle stehen auf der Seite.',
        },
        {
          termine: 'Bearbeiten, Projizieren und Assistent',
          testo:
            'Am Ende der Auswahlzeile, auf jeder Seite. **Bearbeiten** (`Ctrl+E`) nimmt die ' +
            'Stunden in die Hand: Im Kalender zeichnet man sie, zieht sie länger und ' +
            'verschiebt sie; auf der Seite einer Stunde öffnet es «Stunde bearbeiten». ' +
            '**Projizieren** schaltet den Bildschirm für die Klasse ein und wird zu ' +
            '**Bildschirm ausschalten**; ist er an, erscheint **Projektion**, die die Befehle ' +
            'des Bildschirms in die Aktionsleiste bringt. **Assistent** gibt es nur, wenn er in ' +
            'den Einstellungen eingeschaltet ist.',
        },
        {
          termine: 'Das Menü «Datei»',
          testo:
            'Das Nötigste für das Dokument des Schuljahrs: ein neues Schuljahr und ' +
            '**Schuljahr öffnen…**, gleich darunter die zuletzt geöffneten und die ' +
            'Favoriten; **Aus einem anderen Klassenbuch importieren…**, um Klassen und ' +
            'Einstellungen eines anderen Jahres in dieses zu holen; **Schuljahr schliessen** ' +
            'und **Ordner der Datei öffnen**; allein ganz unten **Klassenbuch beenden**. Das ' +
            'Klassenbuch speichert selbst: **Schuljahr speichern unter…** erscheint nur bei ' +
            'einem neuen, nie gespeicherten Schuljahr. Schuljahr bearbeiten und E-Mail stehen ' +
            'in ihrem Bereich der Einstellungen, und alles findet sich auch mit `Ctrl+K`.',
        },
        {
          termine: 'Favoriten, mit der rechten Maustaste',
          testo:
            'Die rechte Maustaste auf einem zuletzt geöffneten Klassenbuch, im Menü **Datei** ' +
            'oder in dem des Schuljahrs unten rechts — oder der Pfeil nach rechts auf der ' +
            'Tastatur — öffnet daneben **Zu den Favoriten hinzufügen** oder **Aus den Favoriten ' +
            'entfernen**, und **Aus der Liste entfernen**, das die Zeile entfernt und die ' +
            'Datei lässt, wo sie ist. Das Menü bleibt offen: Man kann einem anderen Schuljahr ' +
            'den Stern geben, ohne es neu zu öffnen.',
        },
        {
          termine: 'Vergrössern und Vollbild',
          testo:
            '`Ctrl+Plus` und `Ctrl+Minus` vergrössern und verkleinern Text und Felder, ' +
            '`Ctrl+0` kehrt zur normalen Grösse zurück, `F11` bringt das Fenster auf den ganzen ' +
            'Bildschirm. Das sind keine Einstellungen: Man findet sie mit `Ctrl+K` und im ' +
            'Systemmenü, das mit `Alt` erscheint.',
        },
        {
          termine: 'Die Meldezeile',
          testo:
            'Wenn im Dokument etwas nicht stimmt — ein Kurs, der sein Fach verloren hat —, ' +
            'erscheint über der Seite «1 Verweis stimmt nicht», mit dem ersten, der fehlt. ' +
            '**Reparieren**, wenn vorhanden, behebt nach einer Bestätigung, was sich ohne ' +
            'Verlust korrigieren lässt; **Details** führt in die Einstellungen.',
        },
        {
          termine: 'Der Faden oben',
          testo:
            'Ein dünner Faden, der über den oberen Rand läuft, zeigt, dass das Klassenbuch noch ' +
            'arbeitet, auch wenn die gedrückte Schaltfläche schon neu gezeichnet ist. ' +
            'Verschwindet er, ist die Antwort da.',
        },
        {
          termine: 'Das Systemmenü',
          testo:
            'Unter Windows und Linux ist die klassische Menüleiste ausgeblendet, und `Alt` ' +
            'zeigt sie an. Sie hat eigene Menüs — **Klassenbuch**, **Gehe zu**, **Neu**, ' +
            '**Bildschirm**, **E-Mail**, **Ordner**, **Bearbeiten**, **Ansicht** — und unter ' +
            '**Klassenbuch** steht **Programmeinstellungen…**: das native Fenster, für den ' +
            'Fall, dass sich die Seite der Einstellungen nicht öffnet.',
        },
      ],
      note: [
        'Der **Kurs** oben gilt für alle fünf Seiten des Klassenbuchs und folgt ihnen: Man ' +
          'wählt ihn einmal, unter den Kursen, die im Zeitraum mindestens eine Stunde haben ' +
          'oder noch gar keine. Der **Kurs** des Kalenders ist ein anderes Feld: Er grenzt die ' +
          'Woche ein und ändert den Kurs nicht, an dem man arbeitet.',
        'Auf einem kleinen Bildschirm blendet `Ctrl+B` die Aktionsleiste aus, und `Ctrl+K` ' +
          'erreicht die Befehle trotzdem: Das ist das Paar, das der Seite am meisten Platz ' +
          'lässt.',
      ],
    },
    ricerca: {
      titolo: 'Seiten, Befehle und Personen suchen',
      sommario:
        'Eine Zeile, in die man schreibt, was man sucht — eine Seite, einen Befehl, eine ' +
        'Person, einen Kurs, eine Klasse —, wenn man nicht weiss, wo es ist.',
      scritte: {
        cercato: 'neu',
        nuovaOra: 'Neue Stunde',
        nuovaOraAiuto: 'Eine Stunde ausser Plan, oder die erste eines Kurses…',
        nuovoAnno: 'Neues Schuljahr',
        nuovoAnnoAiuto: 'Ein neues Jahr, in einem eigenen Dokument…',
        nuovaConsegna: 'Neuer Auftrag',
        altrove: 'Das geht auf der eigenen Seite: Öffne sie, dort ist es.',
        cercatoNome: 'dic4a',
        persona1: 'Bernasconi Luca',
        persona2: 'Ferrari Giulia',
        corso: 'DIC4a · Mathematik',
        classe: 'DIC4a',
      },
      figure: [
        {
          didascalia:
            'Man schreibt, und die Liste wird mit jedem Buchstaben kürzer: jede Art unter ihrem ' +
            'Zwischentitel, und in jeder Gruppe zuerst, was man jetzt tun kann. Hier ist man im Kalender mit ' +
            'eingeschaltetem **Bearbeiten**: **Neue Stunde** geht, **Neuer Auftrag** gehört zu ' +
            `den ${DE.pendenza.plurale} und rutscht nach unten.`,
          legenda: [
            'Die Wörter, in beliebiger Reihenfolge und ohne Akzente: gesucht wird im Namen, ' +
              'in der Gruppe und in der Erklärung.',
            'Die gewählte Zeile: Die Pfeile bewegen sie, `Enter` führt sie aus.',
            'Das Tastenkürzel, wenn der Befehl eines hat.',
            'Ein Befehl, der jetzt nicht geht — auch weil er zu einer anderen Seite gehört —, ' +
              'rutscht nach unten und sagt, warum.',
          ],
        },
        {
          didascalia:
            `Schreibt man einen Namen, kommen nach Seiten und Befehlen die ${DE.pif.plurale}, ` +
            'die Kurse und die Klassen des offenen Schuljahrs. Jede Gruppe zeigt wenige Zeilen, ' +
            'und der Zwischentitel sagt, wie viele draussen bleiben.',
          legenda: [
            'Der Zwischentitel der Gruppe, mit der Zählung, wenn sie gekürzt ist: sechs Zeilen ' +
              'von einundzwanzig. Ein Buchstabe mehr grenzt ein.',
            'Die Person, mit ihrer Klasse darunter: `Enter` öffnet ihr Personenblatt.',
            'Der Kurs führt zu seinem Blatt, auf der Seite Kurse.',
            'Die Klasse führt zu Klassen, mit dieser Klasse gewählt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Öffnen',
          tasti: 'Ctrl+K',
          testo:
            'Von jeder Seite aus, auch mitten in einem Feld, oder mit einem Klick auf ' +
            '**Suchen…** oben rechts in der Titelleiste. Sie öffnet sich nicht, solange ein ' +
            'Formularfenster offen ist.',
        },
        {
          termine: 'Seiten und Befehle zusammen',
          testo:
            'Alle Seiten und alle Befehle sind da. Von überall ausführen lassen sich die ' +
            'Seiten, die Befehle des Menüs **Datei** und die des Bildschirms für die Klasse; ' +
            'der Befehl einer anderen Seite bleibt inaktiv, unten, und sagt «Das geht auf der ' +
            'eigenen Seite»: **Neue Stunde** startet man im Kalender mit eingeschaltetem ' +
            '**Bearbeiten** oder von jeder Seite mit `Ctrl+Alt+N`, das es selbst einschaltet.',
        },
        {
          termine: 'Personen, Kurse und Klassen',
          testo:
            `Sobald man schreibt, erscheinen unter Seiten und Befehlen auch die ${DE.pif.plurale} ` +
            'des offenen Schuljahrs, mit der Klasse daneben — «rossi dic4a» grenzt auf die ' +
            'Rossi dieser Klasse ein —, die Kurse und die Klassen. `Enter` öffnet das ' +
            'Personenblatt, das Blatt des Kurses oder die Klasse unter **Klassen**. Wer ' +
            'ausgetreten ist, ist auch da, ganz unten.',
        },
        {
          termine: 'Wenige Zeilen pro Gruppe',
          testo:
            'Bei leerem Feld zehn Zeilen: sechs Seiten und vier Befehle. Beim Schreiben hat jede ' +
            'Gruppe ihre eigenen — vier Seiten, fünf Befehle, sechs Personen, drei Kurse, drei ' +
            'Klassen —, und keine nimmt den anderen den Platz weg. Bleiben welche draussen, sagt ' +
            'es der Zwischentitel, «6 von 12»: Ein Buchstabe mehr genügt. «Nichts mit diesem ' +
            'Namen.» heisst, dass kein Eintrag alle Wörter enthält.',
        },
        {
          termine: 'Schliessen',
          testo:
            '`Esc`, noch einmal `Ctrl+K` oder ein Klick ausserhalb des Felds.',
        },
        {
          termine: 'In dieser Hilfe suchen',
          tasti: '/',
          testo:
            'Das Feld oben in der Hilfe versteht die Wörter der Suchenden: «Schüler» findet ' +
            `die ${DE.pif.plurale}, «Test» die Prüfungen, und Mehrzahl, Verbformen und ` +
            'Akzente spielen keine Rolle. Oben erscheint **Beste Antworten**; die Pfeile ' +
            'gehen sie durch, `Enter` führt zur ersten, `Esc` leert das Feld.',
        },
        {
          termine: 'Meintest du',
          testo:
            'Ein Wort mit einem falschen Buchstaben lässt einen nicht mit leeren Händen stehen: ' +
            'Die Hilfe schlägt das nächstliegende vor, mit **Meintest du «…»?**. **Ganze Hilfe ' +
            'anzeigen** führt zu allem zurück.',
        },
        {
          termine: 'Die Hilfe zur Seite, auf der man ist',
          tasti: 'F1',
          testo:
            'Öffnet von jeder Seite aus die Hilfe beim Abschnitt, der sie beschreibt. Anders ' +
            'geöffnet — über die Seitenleiste oder die Suche —, merkt sich die Hilfe, woher man ' +
            'kam, und schlägt es oben vor, mit **So funktioniert es**; **Seite öffnen** neben ' +
            'dem Titel eines Abschnitts führt zur echten Seite zurück.',
        },
        {
          termine: 'Die Abbildungen',
          testo:
            'Fährt man über eine Zahl der Abbildung, leuchtet die Zeile auf, die sie erklärt, ' +
            'und umgekehrt. Ein Klick auf die Abbildung vergrössert sie: Die Pfeile blättern ' +
            'durch alle Abbildungen der Hilfe, `Esc` schliesst. Im Inhaltsverzeichnis zeigt das ' +
            'Bildchen neben einem Abschnitt, dass er ein Schema hat, und der hervorgehobene ' +
            'Eintrag ist der, den man gerade liest.',
        },
      ],
      note: [
        'Drei Buchstaben und `Enter` genügen fast immer: Was man jetzt tun kann, kommt zuerst, ' +
          'und die erste Zeile ist fast immer die gesuchte.',
      ],
    },
    barraStato: {
      titolo: 'Die Leiste unten',
      sommario:
        'Was fehlt und wie es um den Computer steht. Man sieht es, ohne zu suchen.',
      scritte: {
        aSinistra: 'links',
        daCompilare: 'auszufüllen: DIC4a · Mo 14. Sep',
        pendenze: quanti(3, DE.pendenza),
        tuttiICorsi: 'Alle Kurse ▾',
        semestre: '1. Semester ▾',
        aDestra: 'rechts',
        assistente: 'Assistent an',
        casella: 'Postfach verbunden',
        leOre: 'Die Stunden',
        diCorsoEPeriodo: 'von Kurs und Zeitraum',
        buco: 'Eine Lücke?',
        buco2: 'vorbei und nicht erfasst',
        si: 'ja',
        compilare: 'auszufüllen',
        piuVecchio: 'die älteste Lücke',
        no: 'nein',
        inArrivo: 'Kommt eine Stunde?',
        nonAnnullata: 'nicht ausgefallen',
        prossima: 'nächste',
        classeGiornoOra: 'Klasse · Tag Zeit',
      },
      figure: [
        {
          didascalia:
            'Im Fenster stehen die beiden Hälften auf derselben Zeile: links, was etwas ' +
            'verlangt, rechts, wie es um den Computer steht.',
          legenda: [
            'Die auszufüllende Stunde, oder die nächste.',
            `Die offenen ${DE.pendenza.plurale}.`,
            'Kurs und Zeitraum der vorgeschlagenen Stunde.',
            'Der Assistent und das Lesen der Scans: an oder aus.',
            'Die E-Mail, oder «kein Netz».',
            'Das offene Schuljahr.',
          ],
        },
        {
          didascalia:
            'Zuerst die Lücken, dann die Zukunft: Eine Stunde vom Dienstag ohne ' +
            'Präsenzkontrolle wird auch am Donnerstag noch vorgeschlagen, bis man sie ' +
            'abschliesst. Ohne Lücken und ohne kommende Stunden steht da «keine Stunde geplant».',
        },
      ],
      voci: [
        {
          termine: 'Die auszufüllende Stunde',
          testo:
            'Unten links, mit dem gelben Dreieck: «auszufüllen: Klasse · Tag». Ohne Lücken ' +
            'steht da «nächste: Klasse · Tag Zeit». Ein Klick öffnet diese Stunde, ' +
            'und der Hinweis nennt das Datum ausgeschrieben.',
        },
        {
          termine: Molti(DE.pendenza),
          testo:
            'Wie viel in allen Klassen offen ist: dasselbe wie auf der Seite, zu der der Klick ' +
            'führt. Wer mit der Maus darauf verweilt, liest, wie viel davon überfällig ist.',
        },
        {
          termine: 'Kurs und Zeitraum',
          testo:
            'Sie grenzen die vorgeschlagene Stunde ein, damit wer nur mit einer Klasse arbeitet ' +
            'nicht die Lücken der anderen vorgeschlagen bekommt. Es sind dieselben Felder wie ' +
            'der Filter des Kalenders und der **Zeitraum** oben: Ändert man sie hier, sind sie ' +
            'dort auch geändert.',
        },
        {
          termine: 'Das Lesen der Scans',
          testo:
            'Während das Klassenbuch die PDF liest, erscheint «liest 3 von 12», und wer mit der ' +
            'Maus darauf verweilt, sieht, welches. Dann verschwindet es von selbst.',
        },
        {
          termine: 'E-Mail und Netz',
          testo:
            '«Postfach verbunden», «sendet selbst» oder «Entwürfe als .eml-Dateien»: woher die ' +
            'Mitteilungen gehen; ein Klick führt in die Einstellungen. Ohne Netz wird daraus ' +
            '**kein Netz**, in Rot: Was man schreibt, wird trotzdem gespeichert, aber die ' +
            'Mitteilungen gehen nicht hinaus und die Scans werden nicht gelesen.',
        },
        {
          termine: 'Der Assistent und das Lesen der Scans',
          testo:
            'Zwei Schalter: «an» oder «aus», und ein Klick wechselt. Fehlt, was nötig ist — das ' +
            'Modell, für das Lesen auch der Projektor —, steht da «startet nicht», und der ' +
            'Klick führt in den Bereich **Sprachmodelle**.',
        },
        {
          termine: 'Die neue Version',
          testo:
            'Erscheint eine Version des Klassenbuchs, steht da «… ist da», dann «lade … herunter» ' +
            'und «… bereit»: dieselben Worte wie der Hinweis in der Titelleiste. Ein Klick ' +
            'führt zu den Aktualisierungen in den Einstellungen.',
        },
        {
          termine: 'Das Schuljahr',
          testo:
            'Unten rechts der Name des offenen Schuljahrs: Ein Klick öffnet die ' +
            'Favoriten und die zuletzt geöffneten Klassenbücher, darunter **Schuljahr ' +
            'öffnen…**, **Neues Schuljahr** und **Schuljahr schliessen**. Die rechte Maustaste ' +
            'auf einer Zeile setzt oder entfernt den Stern.',
        },
        {
          termine: 'Die Erinnerung vor dem Unterricht',
          testo:
            'Kurz vor einer Stunde kommt eine Systembenachrichtigung, ausserhalb dieser ' +
            'Leiste: Davon erzählt der Abschnitt über die Erinnerung.',
        },
      ],
      note: [
        'Ein Eintrag, der nichts zu sagen hat, erscheint nicht: keine offene ' +
          `${DE.pendenza.singolare}, kein laufendes Lesen, keine neue Version. Es bleiben ` +
          'E-Mail, Schuljahr und die beiden Schalter, bei denen auch «aus» eine Antwort ist. ' +
          'Eine Leiste, die immer dieselben acht Dinge sagt, wird zum Hintergrund, und am Tag, ' +
          'an dem sie «kein Netz» sagt, liest sie niemand mehr.',
      ],
    },
    scorciatoie: {
      titolo: 'Tastenkürzel',
      sommario:
        'Die Hände bleiben auf der Tastatur. Sie gelten, wenn ein Fenster des Klassenbuchs den ' +
        'Fokus hat.',
      scritte: {
        dalMenu: 'Aus dem Programmmenü',
        dallaPagina: 'Auf der Seite',
        moduloAperto: 'Formular offen',
        tacciono: 'hier schweigen sie',
      },
      figure: [
        {
          didascalia:
            'Zwei verschiedene Ohren, eine einzige Regel: Mit offenem Formular führt keines von ' +
            'beiden woandershin. `Ctrl+Alt+N` hält dort mit einer Meldung an, `Ctrl+S` tut ' +
            'nichts.',
          legenda: [
            'Auf sie hört das Programmmenü, auch wenn man es nicht sieht. Die, die die Seite ' +
              'wechseln — `Ctrl+Alt+T`, `Ctrl+Alt+N`, `Ctrl+,` —, halten bei offenem Formular ' +
              'an und sagen es.',
            'Auf sie hört die Seite: Sie gelten auch in einem Feld — `Alt+←` und `Alt+→` nicht, ' +
              'dort gehört der Pfeil dem Schreibenden —, schweigen aber, solange ein ' +
              'Formularfenster offen ist: Dort gehören `Enter` und `Esc` dem Formular.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Seiten, Befehle und Personen suchen',
          tasti: 'Ctrl+K',
          testo:
            'Auch mit einem Klick auf **Suchen…** oben rechts. Pfeile zum Wählen, `Enter` zum ' +
            'Öffnen, `Esc` zum Schliessen.',
        },
        {
          termine: 'Zurück und vorwärts',
          tasti: 'Alt+← / Alt+→',
          testo:
            'Zwischen den Orten, an denen man war, wie in einem Browser; auch die beiden ' +
            'Seitentasten der Maus. Beim Zurückkehren ist die Seite so weit gescrollt, wie man ' +
            'sie verlassen hat. Nicht in einem Feld, in dem man schreibt.',
        },
        {
          termine: 'Die Seiten der Seitenleiste',
          tasti: 'Ctrl+1…9',
          testo:
            'Die ersten neun Einträge, in der Reihenfolge, in der man sie sieht: von Dashboard bis ' +
            'Dokumente. Die Taste steht im Hinweis des Eintrags.',
        },
        {
          termine: 'Die Hilfe zu dieser Seite',
          tasti: 'F1',
          testo:
            'Von jeder Seite: öffnet die Hilfe beim Abschnitt, der sie beschreibt.',
        },
        {
          termine: 'In der Hilfe suchen',
          tasti: '/',
          testo:
            'In der Hilfe, ausserhalb eines Felds: setzt den Cursor ins Suchfeld.',
        },
        {
          termine: 'Speichern',
          tasti: 'Ctrl+S',
          testo:
            'Übernimmt das Feld, in dem man schreibt, und speichert; bei einem neuen Schuljahr ' +
            'fragt es nach Name und Ort.',
        },
        {
          termine: 'Rückgängig und wiederherstellen',
          tasti: 'Ctrl+Z / Ctrl+Y',
          testo:
            'Ausserhalb eines Textfelds machen sie den letzten Schritt im Klassenbuch ' +
            'rückgängig und wiederholen ihn; in einem Feld nehmen sie Tastenanschläge zurück, ' +
            'wie immer. Auch `Ctrl+Umschalt+Z` stellt wieder her, und in der Titelleiste gibt ' +
            'es die Pfeile ↶ ↷. Der Verlauf lebt, solange das Klassenbuch offen ist: Wird das ' +
            'Schuljahr geschlossen oder neu geöffnet, beginnt er von vorn.',
        },
        {
          termine: 'Schuljahr öffnen',
          tasti: 'Ctrl+O',
          testo: 'Wählt ein anderes `.regi`-Dokument auf dem Datenträger.',
        },
        {
          termine: 'Aktionen ein- oder ausblenden',
          tasti: 'Ctrl+B',
          testo: 'Nicht in einem Textfeld.',
        },
        {
          termine: 'Stunden bearbeiten',
          tasti: 'Ctrl+E',
          testo:
            'Von jeder Seite, wie der Schalter **Bearbeiten**: Im Kalender zeichnet man die ' +
            'Stunden, zieht sie länger und verschiebt sie; auf der Seite einer Stunde öffnet ' +
            'sich «Stunde bearbeiten». Noch einmal `Ctrl+E`, oder `Esc` im Kalender, und man ' +
            'ist wieder draussen.',
        },
        {
          termine: 'Heute',
          tasti: 'Ctrl+Alt+T',
          testo:
            'Von jeder Seite, wie die Schaltfläche **Heute**: Der Kalender springt auf heute, in ' +
            'der Ansicht, in der man ihn gerade anschaut, und in der Woche scrollt er bis zur ' +
            'aktuellen Uhrzeit.',
        },
        {
          termine: 'Neue Stunde',
          tasti: 'Ctrl+Alt+N',
          testo:
            'Von jeder Seite, wie die Schaltfläche **Neue Stunde**: führt in den Kalender, ' +
            'schaltet **Bearbeiten** ein und öffnet das Formular am gewählten Tag, mit dem Kurs, ' +
            'an dem man arbeitet; gespeichert, öffnet es die Stunde.',
        },
        {
          termine: 'Klassenbuch anzeigen',
          tasti: 'Ctrl+Alt+R',
          testo: 'Holt das Fenster des Klassenbuchs wieder nach vorn.',
        },
        {
          termine: 'Einstellungen',
          tasti: 'Ctrl+,',
          testo: 'Öffnet die Seite der Einstellungen.',
        },
        {
          termine: 'Vergrössern, verkleinern, normal',
          tasti: 'Ctrl+Plus / Ctrl+- / Ctrl+0',
          testo: 'Text und Felder grösser oder kleiner, Schritt für Schritt.',
        },
        {
          termine: 'Vollbild',
          tasti: 'F11',
          testo:
            'Für das Fenster der Lehrperson, nicht für den Bildschirm der Klasse.',
        },
        {
          termine: 'Das Systemmenü',
          tasti: 'Alt',
          testo:
            'Unter Windows und Linux zeigt es die Menüleiste an, die sonst verborgen ist.',
        },
        {
          termine: 'In Formularfenstern',
          tasti: 'Enter / Ctrl+Enter / Esc',
          testo:
            '`Enter` bestätigt, `Ctrl+Enter` bestätigt auch mitten in einem langen Text, `Esc` ' +
            'bricht ab. `Tab` wandert im Fenster herum, ohne es zu verlassen.',
        },
        {
          termine: 'In Datumsfeldern',
          tasti: '↑ / ↓ / Bild↑ / Bild↓',
          testo: 'Einen Tag vor oder zurück, einen Monat vor oder zurück.',
        },
        {
          termine: 'Im Notenraster',
          tasti: '← / → / ↑ / ↓ / Enter',
          testo:
            'Man bewegt sich wie in einer Tabellenkalkulation; `Enter` geht nach unten und ' +
            'springt am Ende der Spalte an den Anfang der nächsten.',
        },
        {
          termine: 'In Menüs',
          tasti: '↑ / ↓ / → / ← / Pos1 / Ende / Esc',
          testo:
            'Auch in den Kontextmenüs; `Tab` schliesst das Menü. Pfeil nach unten auf **Datei** ' +
            'oder auf einer anderen Schaltfläche mit Auswahlliste öffnet sie. Auf einem zuletzt ' +
            'geöffneten Klassenbuch öffnet der Pfeil nach rechts seine Befehle — die Favoriten, ' +
            'aus der Liste entfernen — und der Pfeil nach links schliesst sie wieder.',
        },
        {
          termine: 'In Reitern',
          tasti: '← / →',
          testo:
            'In der Stunde — **Verwaltung**, **Unterricht**, **Notizen** —, in der ' +
            'Karte und im Personenblatt wechseln die Pfeile zwischen den Reitern.',
        },
        {
          termine: 'Eine Zeile verschieben',
          tasti: '↑ / ↓',
          testo:
            'Mit dem Fokus auf dem Griff einer Zeile — einer Etappe des Plans, einer Stunde des ' +
            'Stundenplans.',
        },
        {
          termine: 'Zu einer Liste hinzufügen',
          tasti: 'Enter',
          testo:
            'In Feldern, die einen Eintrag hinzufügen — einen ICS-Kalender, eine Auswahl in ' +
            'den Einstellungen —, ohne die Schaltfläche zu suchen.',
        },
        {
          termine: 'Die Seitenleiste verkleinern',
          tasti: 'Esc',
          testo:
            'Mit dem Fokus in der Seitenleiste verkleinert es sie auf die Symbole.',
        },
        {
          termine: 'Mehreres auswählen',
          tasti: 'Ctrl+Klick / Umschalt+Klick',
          testo:
            'Bei den zuzuordnenden Seiten und bei den PDF der Dokumente: Ctrl fügt hinzu oder ' +
            'nimmt weg, Umschalt nimmt einen ganzen Bereich. Im Kalender macht Ctrl+Klick auf ' +
            'mehrere ICS-Termine desselben Tages daraus eine einzige Stunde.',
        },
        {
          termine: 'Eine Stunde im Kalender kopieren',
          tasti: 'Ctrl+Ziehen',
          testo:
            'Ziehen verschiebt; mit gedrückter Ctrl- (oder Alt-)Taste bleibt eine Kopie.',
        },
        {
          termine: 'Ein Ziehen abbrechen',
          tasti: 'Esc',
          testo:
            'Bei den zuzuordnenden Seiten: Die Seite geht zurück, wo sie war, ohne Meldung.',
        },
        {
          termine: 'Im Assistenten',
          tasti: 'Enter / Umschalt+Enter / Esc',
          testo:
            '`Enter` schickt die Frage, `Umschalt+Enter` macht einen Zeilenumbruch, `Esc` ' +
            'schliesst das Feld. Bei offenem Mikrofon beendet `Esc` nur das Diktat, ohne etwas ' +
            'zu schreiben, und das Feld bleibt offen.',
        },
        {
          termine: 'Im Willkommensbildschirm',
          tasti: 'Esc',
          testo: 'Wirkt wie **Beenden**.',
        },
      ],
      note: [
        'Der Hinweis jeder Schaltfläche der Aktionsleiste und jedes Eintrags der Seitenleiste, ' +
          'die Einträge von **Datei** und die Zeilen der Suche nennen das Tastenkürzel neben ' +
          'dem Namen: Dort lernt man sie.',
      ],
    },
  },
  fr: {
    primiPassi: {
      titolo: 'Premiers pas',
      sommario:
        'D’un registre vide à la première leçon remplie, en sept étapes. Le reste de l’aide ' +
        'se lit au besoin.',
      scritte: {
        benvenuto: 'Bienvenue',
        nuovoAnno: 'créer l’année',
        classi: 'Classes',
        eCorsi: 'et cours',
        elenco: 'Liste',
        inClassi: 'dans Classes',
        ora: 'La leçon',
        calendario: 'calendrier',
        svolta: 'Donnée',
        aFineOra: 'fin du cours',
        pendenze: 'En suspens',
        agenda: 'Agenda',
        unaVolta: 'une fois, en début d’année',
        ogniGiorno: 'puis, chaque jour',
      },
      figure: [
        {
          didascalia:
            'Les quatre premières étapes se font une fois par année ; les trois dernières sont ' +
            'la tournée de chaque jour.',
        },
      ],
      voci: [
        {
          termine: 'L’écran d’accueil',
          testo:
            'Sans année ouverte, le registre n’affiche qu’une fenêtre : **Ouvrir une année…** ' +
            'pour un `.regi` qui existe déjà, **Créer une nouvelle année…** pour commencer. ' +
            'En dessous, les récents : l’étoile met une année dans les favoris, la croix la ' +
            'retire de la liste sans toucher au fichier. Tout en bas, à côté de la version, ' +
            'l’état des mises à jour.',
        },
        {
          termine: 'Créer une nouvelle année',
          testo:
            'On choisit l’année parmi celles du calendrier officiel : dates, vacances et jours ' +
            'fériés viennent avec. S’il existe d’autres registres, le registre demande s’il ' +
            'faut en reprendre les classes, les cours et les paramètres ; puis il ouvre la ' +
            'fiche de l’année. Depuis la fenêtre principale, c’est le même formulaire : ' +
            '**Nouvelle année** dans Paramètres › Année et horaire › Année scolaire, ou sur la ' +
            'page d’un registre vide.',
        },
        {
          termine: 'Classes et cours',
          testo:
            '**Importer d’un autre registre…**, dans le menu Fichier, reprend les classes avec ' +
            'leurs personnes, les cours, les branches et les plans d’une année précédente. ' +
            'Pour partir de zéro : **Nouvelle classe** dans Classes, **Nouveau cours** dans ' +
            'Cours avec l’horaire de la semaine, et **Leçons au calendrier** place les leçons ' +
            'jusqu’à la fin de l’année.',
        },
        {
          termine: 'Enregistrer l’année',
          testo:
            'Une nouvelle année naît **non enregistrée**, dans un dossier provisoire : la barre ' +
            'de titre l’indique. `Ctrl+S` demande un nom et un emplacement — le Bureau, une clé ' +
            'USB, un dossier synchronisé — et à partir de là chaque modification s’écrit ' +
            'd’elle-même.',
        },
        {
          termine: 'Ajouter les personnes',
          testo:
            'Dans **Classes**, une fois la classe choisie, depuis la barre d’actions : **Coller ' +
            `la liste** reprend les noms des ${FR.pif.plurale} copiés d’un tableau ou d’un ` +
            'e-mail, **Ajouter au groupe** ajoute un nom à la fois. Adresses de contact, ' +
            `${FR.azienda.singolare} et photo viennent ensuite, tranquillement.`,
        },
        {
          termine: 'Ouvrir la leçon',
          testo:
            'Un clic sur une leçon du calendrier — avec **Modifier** désactivé —, ou sur la ' +
            'leçon proposée en bas à gauche, ouvre la page **Leçon** : **Administration** pour ' +
            'l’appel et les devoirs, **Leçon** pour le déroulement et les évaluations, ' +
            '**Annotations** pour les sujets et les observations.',
        },
        {
          termine: 'Marquer la leçon comme donnée',
          testo:
            'Une fois le cours terminé, **Donnée** dans la barre d’actions : la leçon compte ' +
            'parmi les leçons données. Une leçon passée sans appel ou non marquée reste un ' +
            'trou, et la barre du bas continue à la proposer.',
        },
        {
          termine: 'Voir ce qui reste',
          testo:
            'Le **Tableau de bord**, première page de l’Agenda, résume la journée et mène là où ' +
            `il faut. **${Molti(FR.pendenza)}** montre les évaluations et devoirs du cours choisi ; ` +
            '**Enseignant de classe** rassemble les démarches et devoirs dus par la classe.',
        },
      ],
      note: [
        'Une nouvelle année part avec les branches et les paramètres de celle qui est ouverte ; ' +
          'classes, cours et plans arrivent par l’importation, une case par classe.',
        'Des vacances du calendrier qui ne valent pas dans ton établissement se retirent de ' +
          'la liste des interruptions avant d’enregistrer l’année, ou après, depuis Jours sans ' +
          'cours.',
      ],
    },
    inizio: {
      titolo: 'Comment le registre est construit',
      sommario:
        'Une seule chaîne, et tout le reste en dépend : année → classe, branche → cours → ' +
        'horaire → leçons.',
      scritte: {
        anno: 'Année',
        classe: 'Classe',
        ilGruppo: 'le groupe',
        corso: 'Cours',
        materiaPerClasse: 'branche × classe',
        orario: 'Horaire',
        oreFisse: 'les leçons fixes',
        materia: 'Branche',
        dalCatalogo: 'du catalogue',
        lezioni: 'Leçons',
        sulCalendario: 'au calendrier',
        agganciate: 'Leçons, évaluations et plans s’accrochent au cours',
      },
      figure: [
        {
          didascalia:
            'Chaque élément du registre dépend de celui à sa gauche, et la branche arrive par ' +
            'le bas : le cours est le nœud où les deux chemins se rejoignent.',
          legenda: [
            'Le **cours** est une branche enseignée à une classe : deux branches dans la même ' +
              'classe font deux cours.',
            'Les **leçons** naissent de l’horaire, une pour chaque plage fixe de la semaine.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Le cours est le pivot',
          testo:
            'Leçons, évaluations et plans s’accrochent au cours et non à la classe : deux ' +
            'branches dans le même groupe font deux cours, avec deux moyennes et deux décomptes ' +
            'de présence.',
        },
        {
          termine: 'Une année, un document',
          testo:
            'Chaque année scolaire est un fichier `.regi` qui contient tout, même les PDF ' +
            'imprimés et les scans. Il s’ouvre d’un double clic ; pour changer d’année, on ' +
            'ouvre un autre document.',
        },
        {
          termine: 'L’année et ses semestres',
          testo:
            'Les deux semestres naissent avec l’année, coupés à fin janvier. Dates et semestres ' +
            'se changent dans **Paramètres** › **Année scolaire**, ou avec **Modifier ' +
            'l’année** depuis `Ctrl+K` ; les vacances depuis **Vacances et interruptions**. ' +
            'La liste **Période** arrête les calculs — moyennes, absences, leçons — à un ' +
            'semestre ou à l’« Année entière ».',
        },
        {
          termine: 'Le « + » à côté des listes',
          testo:
            'Là où une liste demande quelque chose qui n’existe pas encore, le « + » à côté le ' +
            'crée sur le moment et le sélectionne tout seul. Il n’y a pas d’ordre imposé à ' +
            'deviner, et ce qu’on était en train d’écrire ne se perd pas.',
        },
        {
          termine: 'Tout s’enregistre tout seul',
          testo:
            'Dans les pages de travail, il n’y a pas de bouton « Enregistrer » : l’appel ' +
            'part au premier clic, les textes quand on quitte le champ. Les formulaires en ' +
            'fenêtre ont leur bouton de confirmation, et `Ctrl+Entrée` les confirme même depuis ' +
            'un long texte.',
        },
        {
          termine: 'Une commande grisée dit pourquoi',
          testo:
            'Un bouton gris n’est pas cassé : en s’arrêtant dessus, l’info-bulle dit ce qui ' +
            'manque — presque toujours un cours à choisir en haut. Lancée au clavier ou depuis ' +
            'la recherche, un message le dit.',
        },
        {
          termine: 'Les fenêtres reviennent là où elles étaient',
          testo:
            'Position, taille, écran et « agrandie » sont mémorisés pour le registre, la ' +
            'visionneuse de documents, les paramètres et l’écran d’accueil. Si l’écran d’hier ' +
            'n’est plus là, la fenêtre se rouvre sur l’un de ceux qui sont branchés.',
        },
      ],
      note: [
        'Supprimer une classe emporte ses cours, et avec eux leçons, évaluations et devoirs. ' +
          'Pour une classe terminée, il suffit de cocher **Archivée** dans les **Détails** de ' +
          'la classe, dans Classes : elle sort des listes et l’historique reste.',
      ],
    },
    finestra: {
      titolo: 'La fenêtre du registre',
      sommario:
        'À gauche, où l’on va ; en haut, de quoi on parle et ce qu’on peut faire ; en bas, ce ' +
        'qui manque.',
      scritte: {
        stato: 'à remplir : DIC4a · lun 14 sept',
        file: 'Fichier ▾',
        percorso: '2026-2027 › Calendrier › lun 14 sept',
        registro: 'Registre',
        gruppoAgenda: 'Agenda',
        calendario: 'Calendrier',
        pendenze: 'En suspens',
        daSmistare: 'À trier',
        gruppoRegistro: 'Registre — DIC4a · Mathématiques',
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        gruppoAnno: 'L’année',
        classi: 'Classes',
        corso: 'Cours',
        tuttiICorsi: 'Tous les cours ▾',
        annoIntero: 'Année entière ▾',
        proietta: 'Projeter',
        nuovaOra: 'Nouvelle leçon',
      },
      figure: [
        {
          didascalia:
            'La barre de titre et la barre latérale parlent du registre entier ; les deux ' +
            'lignes du haut et la barre du bas changent avec la page ouverte.',
          legenda: [
            'La barre de titre : **Fichier** avec les flèches ↶ ↷, l’année ouverte et le ' +
              'chemin ; à droite **Rechercher…**, et le bandeau des mises à jour quand une ' +
              'nouvelle version sort.',
            'La barre latérale : en haut le bouton qui la réduit aux icônes, en dessous toutes ' +
              'les pages dans leurs groupes, celle qui est ouverte mise en évidence.',
            'La ligne des choix : de quoi on parle.',
            'La barre d’actions : ce qu’on peut faire ici.',
            'La page.',
            'La barre d’état : ce qui manque.',
          ],
        },
      ],
      voci: [
        {
          termine: 'La barre de titre',
          testo:
            'À gauche, le signe du registre, **Fichier** et les flèches ↶ ↷ — annuler et ' +
            'rétablir ; au centre, le nom de l’année ouverte et le chemin jusqu’à l’endroit où ' +
            'l’on se trouve — avec « (non enregistrée) » sur une nouvelle année, et le fichier ' +
            'avec son dossier dans l’info-bulle. À droite, contre les boutons de la fenêtre, ' +
            '**Rechercher…** avec son `Ctrl+K` : il ouvre la recherche comme la touche, et dans ' +
            'une fenêtre étroite il ne reste que la loupe. À côté, quand une nouvelle version ' +
            'sort, le bandeau des mises à jour : deux mots, le geste à faire maintenant, et la ✕ ' +
            'qui le masque jusqu’à la prochaine nouveauté. En faisant glisser la barre, on ' +
            'déplace la fenêtre ; un double clic l’agrandit.',
        },
        {
          termine: 'Le chemin',
          testo:
            'Juste après le nom de l’année, du plus large au plus étroit : cours ou classe, ' +
            'page, ce qui est ouvert — la leçon, la personne, le plan. Le groupe de la barre ' +
            'latérale et l’onglet actif ne se répètent pas : on les voit déjà, à deux pas. Le ' +
            'dernier maillon, en clair, est l’endroit où l’on est. Il se lit et ne se clique ' +
            'pas ; quand la fenêtre rétrécit, les maillons larges disparaissent en premier.',
        },
        {
          termine: 'La barre latérale',
          testo:
            `**Agenda** : Aujourd’hui, Calendrier, ${Molti(FR.pendenza)}, À trier. **Registre** : ` +
            'Leçon, Évaluations, Check, Plans de leçon, Documents, toutes du cours choisi en ' +
            'haut — le titre du groupe le dit : « Registre — DIC4a · Mathématiques ». ' +
            `**${Uno(FR.docenteClasse)}** : ${Molti(FR.pendenza)} de la classe, ` +
            'Archive des documents, Absences, Messagerie — seulement si une classe a la case « Je suis maître de ' +
            'classe », et le titre porte la classe. ' +
            `**L’année** : Classes, ${Molti(FR.pif)}, Carte, Cours. ` +
            '**Le programme**, détaché tout en bas de la colonne : Paramètres, Aide. La page ' +
            'ouverte est l’entrée mise en évidence. L’en-tête des feuilles et les modèles de ' +
            'langage se trouvent dans les Paramètres.',
        },
        {
          termine: 'La réduire aux icônes',
          testo:
            'Le bouton en haut de la barre, à côté de « Registre », la réduit aux seules icônes ' +
            'et la rouvre ; `Échap`, dans la barre, la réduit. L’en-tête reste fixe pendant que ' +
            'les pages défilent dessous. Dans les fenêtres étroites, elle s’ouvre à la demande ' +
            'et se referme après le choix ; si l’assistant y est aussi ouvert, elle reste aux ' +
            'icônes.',
        },
        {
          termine: 'Une touche par page',
          tasti: 'Ctrl+1…9',
          testo:
            'Les neuf premières entrées de la barre, dans l’ordre où on les voit : `Ctrl+1` est ' +
            'Tableau de bord, `Ctrl+2` le Calendrier, et ainsi de suite jusqu’à `Ctrl+9`, Documents. ' +
            'La touche est écrite dans l’info-bulle de l’entrée.',
        },
        {
          termine: 'Les nombres à côté des entrées',
          testo:
            `Deux entrées portent un nombre : **${Molti(FR.pendenza)}**, combien de choses ` +
            'restent ouvertes — le même nombre que dans la barre du bas —, et **À trier**, les ' +
            'pages PDF encore à attribuer. Zéro ne s’affiche pas.',
        },
        {
          termine: 'Retour et avance',
          tasti: 'Alt+← / Alt+→',
          testo:
            '`Alt+←` revient à l’endroit d’avant — la page, la leçon, la fiche — et la retrouve ' +
            'défilée là où on l’avait laissée ; `Alt+→` refait le pas. Les deux boutons ' +
            'latéraux de la souris marchent aussi. Ce ne sont pas les flèches ↶ ↷ de la barre ' +
            'de titre : celles-là défont un geste sur le registre, celles-ci changent seulement ' +
            'ce qu’on regarde.',
        },
        {
          termine: 'La ligne des choix',
          testo:
            'Les listes qui disent de quoi on parle : **Cours** dans les pages du Registre, ' +
            '**Classe** dans celles du Maître de classe, dans Classes et dans la Carte, un filtre ' +
            '**Cours** avec « Tous les cours » dans le calendrier ; ailleurs, aucune. À côté, ' +
            'l’**Année** ouverte, qui se lit et ne se choisit pas, et la **Période** : les ' +
            'semestres ou « Année entière ».',
        },
        {
          termine: 'La barre d’actions',
          testo:
            'Uniquement ce qu’on peut faire dans la page ouverte : dans le calendrier ' +
            '**Aujourd’hui** et, avec **Modifier** activé, **Nouvelle leçon** ; dans la leçon ' +
            '**Prévue**, **Donnée** et **Annulée**. La commande la plus utilisée est mise en ' +
            'avant, un interrupteur activé paraît enfoncé. La flèche au bout de la ligne des ' +
            'choix la masque, comme `Ctrl+B`. L’aide et les paramètres n’ont ni cette barre ni ' +
            'celle des choix, tant que l’écran pour la classe est éteint : leurs gestes sont ' +
            'dans la page.',
        },
        {
          termine: 'Modifier, Projeter et Assistant',
          testo:
            'Au bout de la ligne des choix, depuis chaque page. **Modifier** (`Ctrl+E`) prend ' +
            'les leçons en main : dans le calendrier, on les dessine, on les étire et on les ' +
            'déplace ; dans la page d’une leçon, il ouvre « Modifier la leçon ». **Projeter** ' +
            'allume l’écran pour la classe et devient **Éteindre l’écran** ; allumé, ' +
            '**Projection** apparaît et met dans la barre d’actions les commandes de l’écran. ' +
            '**Assistant** n’est là que s’il est activé dans les paramètres.',
        },
        {
          termine: 'Le menu « Fichier »',
          testo:
            'Le minimum pour le document de l’année : une nouvelle année et **Ouvrir une ' +
            'année…**, avec juste en dessous les registres récents et favoris ; **Importer ' +
            'd’un autre registre…**, pour reprendre dans celui-ci les classes et les paramètres ' +
            'd’une autre année ; **Fermer l’année** et **Ouvrir le dossier du fichier** ; seul ' +
            'tout en bas, **Quitter le registre**. Le registre enregistre tout seul : ' +
            '**Enregistrer l’année sous…** n’apparaît que pour une nouvelle année jamais ' +
            'enregistrée. Modifier l’année et la messagerie ont leur section dans les ' +
            'paramètres, et tout se trouve aussi avec `Ctrl+K`.',
        },
        {
          termine: 'Les favoris, avec le clic droit',
          testo:
            'Le clic droit sur un registre récent, dans le menu **Fichier** ou dans celui de ' +
            'l’année en bas à droite — ou la flèche droite, au clavier — ouvre à côté **Ajouter ' +
            'aux favoris** ou **Retirer des favoris**, et **Retirer de la liste**, qui retire la ' +
            'ligne et laisse le fichier où il est. Le menu reste ouvert : on peut mettre ' +
            'l’étoile à une autre année sans le rouvrir.',
        },
        {
          termine: 'Agrandir et plein écran',
          testo:
            '`Ctrl+plus` et `Ctrl+moins` agrandissent et réduisent textes et cadres, `Ctrl+0` ' +
            'revient à la taille normale, `F11` passe la fenêtre en plein écran. Ce ne sont pas ' +
            'des paramètres : on les retrouve avec `Ctrl+K` et dans le menu du système, qui ' +
            'apparaît avec `Alt`.',
        },
        {
          termine: 'La ligne des avertissements',
          testo:
            'Quand quelque chose ne va pas dans le document — un cours qui a perdu sa branche —, ' +
            'au-dessus de la page apparaît « 1 référence ne correspond pas », avec la première ' +
            'qui manque. **Réparer**, quand il est là, corrige après confirmation ce qui peut ' +
            'l’être sans rien perdre ; **Détails** mène aux paramètres.',
        },
        {
          termine: 'Le fil en haut',
          testo:
            'Un fil fin qui court sur le bord supérieur dit que le registre travaille encore, ' +
            'même si le bouton pressé s’est déjà redessiné. Quand il disparaît, la réponse est ' +
            'arrivée.',
        },
        {
          termine: 'Le menu du système',
          testo:
            'Sous Windows et Linux, la barre de menus classique est masquée, et `Alt` la fait ' +
            'apparaître. Elle a ses propres menus — **Registre**, **Aller à**, **Nouveau**, ' +
            '**Écran**, **Messagerie**, **Dossiers**, **Édition**, **Affichage** — et sous ' +
            '**Registre** se trouve **Paramètres du programme…** : la fenêtre native, pour ' +
            'quand la page des paramètres ne s’ouvre pas.',
        },
      ],
      note: [
        'Le **Cours** en haut vaut pour les cinq pages du Registre et les suit : on le ' +
          'choisit une fois, parmi les cours qui ont au moins une leçon dans la période ou qui ' +
          'n’en ont encore aucune. Le **Cours** du calendrier est un autre champ : il ' +
          'restreint la semaine et ne change pas le cours sur lequel on travaille.',
        'Sur un petit écran, `Ctrl+B` masque la barre d’actions et `Ctrl+K` atteint ' +
          'quand même ses commandes : c’est le duo qui laisse le plus de place à la page.',
      ],
    },
    ricerca: {
      titolo: 'Chercher pages, commandes et personnes',
      sommario:
        'Une ligne où écrire ce qu’on cherche — une page, une commande, une personne, un ' +
        'cours, une classe — quand on ne sait pas où ça se trouve.',
      scritte: {
        cercato: 'nouv',
        nuovaOra: 'Nouvelle leçon',
        nuovaOraAiuto: 'Une leçon hors horaire, ou la première d’un cours…',
        nuovoAnno: 'Nouvelle année scolaire',
        nuovoAnnoAiuto: 'Une nouvelle année, dans son propre document…',
        nuovaConsegna: 'Nouveau devoir',
        altrove: 'Cela se fait depuis sa page : ouvre-la d’abord.',
        cercatoNome: 'dic4a',
        persona1: 'Bernasconi Luca',
        persona2: 'Ferrari Giulia',
        corso: 'DIC4a · Mathématiques',
        classe: 'DIC4a',
      },
      figure: [
        {
          didascalia:
            'On écrit, et la liste se resserre à chaque lettre : chaque sorte sous son ' +
            'intertitre, et dans chaque groupe d’abord ce qu’on peut faire maintenant. Ici on est dans le calendrier avec ' +
            '**Modifier** activé : **Nouvelle leçon** fonctionne, **Nouveau devoir** appartient ' +
            `aux ${FR.pendenza.plurale} et descend en bas.`,
          legenda: [
            'Les mots, dans n’importe quel ordre et sans accents : on les cherche dans le nom, ' +
              'dans le groupe et dans l’explication.',
            'La ligne choisie : les flèches la déplacent, `Entrée` l’exécute.',
            'Le raccourci, quand la commande en a un.',
            'Une commande qu’on ne peut pas faire maintenant — y compris parce qu’elle est ' +
              'd’une autre page — descend en bas et dit pourquoi.',
          ],
        },
        {
          didascalia:
            `Quand on écrit un nom, après les pages et les commandes viennent les ${FR.pif.plurale}, ` +
            'les cours et les classes de l’année ouverte. Chaque groupe montre peu de lignes, et ' +
            'l’intertitre dit combien restent dehors.',
          legenda: [
            'L’intertitre du groupe, avec le compte quand il est coupé : six lignes sur ' +
              'vingt et une. Une lettre de plus resserre.',
            'La personne, avec sa classe dessous : `Entrée` ouvre sa fiche.',
            'Le cours mène à sa fiche, dans la page Cours.',
            'La classe mène à Classes, avec cette classe choisie.',
          ],
        },
      ],
      voci: [
        {
          termine: 'L’ouvrir',
          tasti: 'Ctrl+K',
          testo:
            'Depuis n’importe quelle page, même depuis un champ, ou d’un clic sur ' +
            '**Rechercher…** en haut à droite, dans la barre de titre. Elle ne s’ouvre pas tant ' +
            'qu’une fenêtre de formulaire est ouverte.',
        },
        {
          termine: 'Pages et commandes ensemble',
          testo:
            'Toutes les pages et toutes les commandes y sont. S’exécutent de partout les ' +
            'pages, les commandes du menu **Fichier** et celles de l’écran pour la classe ; la ' +
            'commande d’une autre page reste grisée, en bas, et dit « Cela se fait depuis sa ' +
            'page » : **Nouvelle leçon** se lance depuis le calendrier avec **Modifier** ' +
            'activé, ou depuis chaque page avec `Ctrl+Alt+N`, qui l’active tout seul.',
        },
        {
          termine: 'Personnes, cours et classes',
          testo:
            `Dès qu’on écrit, sous les pages et les commandes apparaissent aussi les ${FR.pif.plurale} ` +
            'de l’année ouverte, avec la classe à côté — « rossi dic4a » resserre aux Rossi de ' +
            'cette classe —, les cours et les classes. `Entrée` ouvre la fiche de la personne, ' +
            'la fiche du cours, ou la classe dans **Classes**. Qui s’est retiré y est aussi, en bas.',
        },
        {
          termine: 'Peu de lignes par groupe',
          testo:
            'Champ vide, dix lignes : six pages et quatre commandes. En écrivant, chaque groupe ' +
            'a les siennes — quatre pages, cinq commandes, six personnes, trois cours, trois ' +
            'classes — et aucun ne prend la place des autres. Quand il en reste dehors, ' +
            'l’intertitre le dit, « 6 sur 12 » : une lettre de plus suffit. « Rien avec ce nom. » ' +
            'veut dire qu’aucune entrée ne contient tous les mots.',
        },
        {
          termine: 'La fermer',
          testo: '`Échap`, à nouveau `Ctrl+K`, ou un clic en dehors du cadre.',
        },
        {
          termine: 'Chercher dans cette aide',
          tasti: '/',
          testo:
            'La case en haut de l’aide comprend les mots de celui qui cherche : « élève » ' +
            `trouve les ${FR.pif.plurale}, « test » les épreuves, et pluriels, verbes et ` +
            'accents ne comptent pas. En haut apparaissent les **Meilleures réponses** ; les ' +
            'flèches les parcourent, `Entrée` mène à la première, `Échap` vide la case.',
        },
        {
          termine: 'Voulais-tu dire',
          testo:
            'Un mot faux d’une lettre ne laisse pas les mains vides : l’aide propose le plus ' +
            'proche avec **Voulais-tu dire « … » ?**. **Afficher toute l’aide** revient à tout.',
        },
        {
          termine: 'L’aide de la page où l’on est',
          tasti: 'F1',
          testo:
            'Depuis n’importe quelle page, ouvre l’aide à la section qui la décrit. Ouverte ' +
            'autrement — par la barre latérale ou la recherche —, l’aide se souvient d’où l’on ' +
            'venait et le propose en haut, avec **Lire comment ça marche** ; **Ouvrir la ' +
            'page**, à côté du titre d’une section, ramène à la vraie page.',
        },
        {
          termine: 'Les figures',
          testo:
            'En passant sur un numéro de la figure, la ligne qui l’explique s’allume, et ' +
            'inversement. Un clic sur la figure l’agrandit : les flèches font défiler toutes ' +
            'les figures de l’aide, `Échap` ferme. Dans la table des matières, l’image à côté ' +
            'd’une section indique qu’elle a un schéma, et l’entrée allumée est celle qu’on ' +
            'est en train de lire.',
        },
      ],
      note: [
        'Trois lettres et `Entrée` suffisent presque toujours : ce qu’on peut faire ' +
          'maintenant vient d’abord, et la première ligne est presque toujours celle qu’on ' +
          'cherchait.',
      ],
    },
    barraStato: {
      titolo: 'La barre du bas',
      sommario:
        'Ce qui manque, et l’état de la machine. On la regarde sans rien chercher.',
      scritte: {
        aSinistra: 'à gauche',
        daCompilare: 'à remplir : DIC4a · lun 14 sept',
        pendenze: '3 en suspens',
        tuttiICorsi: 'Tous les cours ▾',
        semestre: '1er semestre ▾',
        aDestra: 'à droite',
        assistente: 'Assistant activé',
        casella: 'boîte connectée',
        leOre: 'Les leçons',
        diCorsoEPeriodo: 'du cours et de la période',
        buco: 'Un trou ?',
        buco2: 'passée et pas fermée',
        si: 'oui',
        compilare: 'à remplir',
        piuVecchio: 'le plus ancien trou',
        no: 'non',
        inArrivo: 'Une leçon à venir ?',
        nonAnnullata: 'non annulée',
        prossima: 'prochaine',
        classeGiornoOra: 'classe · jour heure',
      },
      figure: [
        {
          didascalia:
            'Dans la fenêtre, les deux moitiés sont sur la même ligne : à gauche ce qui ' +
            'demande quelque chose, à droite l’état de la machine.',
          legenda: [
            'La leçon à remplir, ou la prochaine.',
            `Les ${FR.pendenza.plurale} ouvertes.`,
            'Cours et période de la leçon proposée.',
            'L’assistant et la lecture des scans : activés ou désactivés.',
            'Le courrier, ou « hors ligne ».',
            'L’année ouverte.',
          ],
        },
        {
          didascalia:
            'D’abord les trous, puis l’avenir : une leçon du mardi sans appel reste proposée ' +
            'même le jeudi, tant qu’on ne la ferme pas. Sans trous ni leçons à venir, l’entrée ' +
            'dit « aucune leçon prévue ».',
        },
      ],
      voci: [
        {
          termine: 'La leçon à remplir',
          testo:
            'En bas à gauche, avec le triangle jaune : « à remplir : classe · jour ». Sans ' +
            'trous, elle dit « prochaine : classe · jour heure ». Un clic ouvre cette leçon, ' +
            'et l’info-bulle en donne la date en toutes lettres.',
        },
        {
          termine: Molti(FR.pendenza),
          testo:
            'Combien de choses restent ouvertes dans toutes les classes : les mêmes que sur la ' +
            'page où mène le clic. En s’arrêtant dessus, on lit combien sont en retard.',
        },
        {
          termine: 'Cours et période',
          testo:
            'Ils restreignent la leçon proposée : qui travaille sur une seule classe ne se voit ' +
            'pas proposer les trous des autres. Ce sont les mêmes champs que le filtre du ' +
            'calendrier et la **Période** en haut : changés ici, on les retrouve changés là.',
        },
        {
          termine: 'La lecture des scans',
          testo:
            'Pendant que le registre lit les PDF apparaît « lit 3 sur 12 », et en s’arrêtant ' +
            'dessus on voit lequel. Puis ça disparaît tout seul.',
        },
        {
          termine: 'Le courrier et le réseau',
          testo:
            '« boîte connectée », « envoie tout seul » ou « brouillons en fichiers .eml » : ' +
            'd’où partent les communications ; un clic mène aux paramètres. Sans réseau, ' +
            'l’entrée devient **hors ligne**, en rouge : ce qu’on écrit s’enregistre quand ' +
            'même, mais les communications ne partent pas et les scans ne se lisent pas.',
        },
        {
          termine: 'L’assistant et la lecture des scans',
          testo:
            'Deux interrupteurs : « activé » ou « désactivé », et un clic change. Quand il ' +
            'manque ce qu’il faut — le modèle, pour la lecture aussi le projecteur —, ils ' +
            'disent « ne démarre pas », et le clic mène aux **Modèles de langage**.',
        },
        {
          termine: 'La nouvelle version',
          testo:
            'Quand une version du registre sort, apparaît « la … est là », puis ' +
            '« téléchargement de la … » et « … prête » : les mêmes mots que le bandeau de la ' +
            'barre de titre. Un clic mène aux mises à jour dans les paramètres.',
        },
        {
          termine: 'L’année',
          testo:
            'En bas à droite, le nom de l’année ouverte : un clic ouvre les registres favoris ' +
            'et récents, avec en dessous **Ouvrir une année…**, **Nouvelle année scolaire** et ' +
            '**Fermer l’année**. Le clic droit sur une ligne met ou retire l’étoile.',
        },
        {
          termine: 'Le rappel avant la leçon',
          testo:
            'Peu avant une leçon arrive une notification du système, en dehors de cette ' +
            'barre : la section du rappel la décrit.',
        },
      ],
      note: [
        'Une entrée qui n’a rien à dire n’apparaît pas : aucune ' +
          `${FR.pendenza.singolare} ouverte, aucune lecture en cours, aucune nouvelle ` +
          'version. Restent le courrier, l’année et les deux interrupteurs, où « désactivé » ' +
          'est aussi une réponse. Une barre qui dit toujours les huit mêmes choses devient ' +
          'un décor, et le jour où elle dit « hors ligne », plus personne ne la lit.',
      ],
    },
    scorciatoie: {
      titolo: 'Raccourcis clavier',
      sommario:
        'Les mains restent sur le clavier. Ils valent quand une fenêtre du registre a le focus.',
      scritte: {
        dalMenu: 'Depuis le menu du programme',
        dallaPagina: 'Depuis la page',
        moduloAperto: 'Formulaire ouvert',
        tacciono: 'ils se taisent ici',
      },
      figure: [
        {
          didascalia:
            'Deux oreilles différentes, une seule règle : avec un formulaire ouvert, aucune des ' +
            'deux n’emmène ailleurs. `Ctrl+Alt+N` s’y arrête avec un message, `Ctrl+S` ne fait ' +
            'rien.',
          legenda: [
            'Le menu du programme les écoute, même quand on ne le voit pas. Ceux qui changent ' +
              'de page — `Ctrl+Alt+T`, `Ctrl+Alt+N`, `Ctrl+,` — s’arrêtent avec un formulaire ' +
              'ouvert et le disent.',
            'La page les écoute : ils valent aussi dans un champ — `Alt+←` et `Alt+→` non, là ' +
              'la flèche appartient à qui écrit —, mais se taisent tant qu’une fenêtre de ' +
              'formulaire est ouverte : là, `Entrée` et `Échap` appartiennent au formulaire.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Chercher pages, commandes et personnes',
          tasti: 'Ctrl+K',
          testo:
            'Aussi d’un clic sur **Rechercher…**, en haut à droite. Flèches pour choisir, ' +
            '`Entrée` pour ouvrir, `Échap` pour fermer.',
        },
        {
          termine: 'Retour et avance',
          tasti: 'Alt+← / Alt+→',
          testo:
            'Entre les endroits où l’on est passé, comme dans un navigateur ; aussi les deux ' +
            'boutons latéraux de la souris. En revenant, la page est défilée là où on l’avait ' +
            'laissée. Pas dans un champ où l’on écrit.',
        },
        {
          termine: 'Les pages de la barre latérale',
          tasti: 'Ctrl+1…9',
          testo:
            'Les neuf premières entrées, dans l’ordre où on les voit : de Tableau de bord à ' +
            'Documents. La touche est écrite dans l’info-bulle de l’entrée.',
        },
        {
          termine: 'L’aide de cette page',
          tasti: 'F1',
          testo:
            'Depuis n’importe quelle page : ouvre l’aide à la section qui la décrit.',
        },
        {
          termine: 'Chercher dans l’aide',
          tasti: '/',
          testo:
            'Dans l’aide, hors d’un champ : met le curseur dans la case de recherche.',
        },
        {
          termine: 'Enregistrer',
          tasti: 'Ctrl+S',
          testo:
            'Valide le champ où l’on écrit et enregistre ; sur une nouvelle année, demande un ' +
            'nom et un emplacement.',
        },
        {
          termine: 'Annuler et rétablir',
          tasti: 'Ctrl+Z / Ctrl+Y',
          testo:
            'Hors d’un champ de texte, ils reviennent sur le dernier geste fait dans le ' +
            'registre, et le refont ; dans un champ, ils annulent la frappe, comme toujours. ' +
            '`Ctrl+Maj+Z` rétablit aussi, et il y a les flèches ↶ ↷ dans la barre de titre. ' +
            'L’historique vit tant que le registre est ouvert : l’année fermée ou rouverte, ' +
            'il repart de zéro.',
        },
        {
          termine: 'Ouvrir une année',
          tasti: 'Ctrl+O',
          testo: 'Choisit un autre document `.regi` sur le disque.',
        },
        {
          termine: 'Afficher ou masquer les actions',
          tasti: 'Ctrl+B',
          testo: 'Pas dans un champ de texte.',
        },
        {
          termine: 'Modifier les leçons',
          tasti: 'Ctrl+E',
          testo:
            'Depuis n’importe quelle page, comme l’interrupteur **Modifier** : dans le ' +
            'calendrier, on dessine, étire et déplace les leçons ; dans la page d’une leçon ' +
            's’ouvre « Modifier la leçon ». À nouveau `Ctrl+E`, ou `Échap` dans le calendrier, ' +
            'et on en sort.',
        },
        {
          termine: 'Aujourd’hui',
          tasti: 'Ctrl+Alt+T',
          testo:
            'Depuis n’importe quelle page, comme le bouton **Aujourd’hui** : le calendrier ' +
            'revient à aujourd’hui dans la vue où on le regarde, et en semaine défile ' +
            'jusqu’à l’heure actuelle.',
        },
        {
          termine: 'Nouvelle leçon',
          tasti: 'Ctrl+Alt+N',
          testo:
            'Depuis n’importe quelle page, comme le bouton **Nouvelle leçon** : mène au ' +
            'calendrier, active **Modifier** et ouvre le formulaire sur le jour choisi, avec le ' +
            'cours sur lequel on travaille ; une fois enregistrée, ouvre la leçon.',
        },
        {
          termine: 'Afficher le registre',
          tasti: 'Ctrl+Alt+R',
          testo: 'Ramène au premier plan la fenêtre du registre.',
        },
        {
          termine: 'Paramètres',
          tasti: 'Ctrl+,',
          testo: 'Ouvre la page des paramètres.',
        },
        {
          termine: 'Agrandir, réduire, normal',
          tasti: 'Ctrl+plus / Ctrl+- / Ctrl+0',
          testo:
            'Textes et cadres plus grands ou plus petits, un pas à la fois.',
        },
        {
          termine: 'Plein écran',
          tasti: 'F11',
          testo:
            'Pour la fenêtre de l’enseignant, pas pour l’écran de la classe.',
        },
        {
          termine: 'Le menu du système',
          tasti: 'Alt',
          testo:
            'Sous Windows et Linux, fait apparaître la barre de menus, qui reste masquée.',
        },
        {
          termine: 'Dans les fenêtres de formulaire',
          tasti: 'Entrée / Ctrl+Entrée / Échap',
          testo:
            '`Entrée` confirme, `Ctrl+Entrée` confirme même depuis un long texte, `Échap` ' +
            'annule. `Tab` tourne dans la fenêtre sans en sortir.',
        },
        {
          termine: 'Dans les champs de date',
          tasti: '↑ / ↓ / Pg préc / Pg suiv',
          testo:
            'Un jour en avant ou en arrière, un mois en avant ou en arrière.',
        },
        {
          termine: 'Dans la grille des notes',
          tasti: '← / → / ↑ / ↓ / Entrée',
          testo:
            'On se déplace comme dans un tableur ; `Entrée` descend et, en bas de la colonne, ' +
            'passe en haut de la suivante.',
        },
        {
          termine: 'Dans les menus',
          tasti: '↑ / ↓ / → / ← / Début / Fin / Échap',
          testo:
            'Aussi dans ceux du clic droit ; `Tab` ferme le menu. Flèche bas sur **Fichier** ou ' +
            'sur un autre bouton à liste l’ouvre. Sur un registre récent, la flèche droite ' +
            'ouvre ses commandes — les favoris, retirer de la liste — et la flèche gauche les ' +
            'referme.',
        },
        {
          termine: 'Dans les onglets',
          tasti: '← / →',
          testo:
            'Dans la leçon — **Administration**, **Leçon**, **Annotations** —, dans la carte ' +
            'et dans la fiche d’une personne, les flèches passent d’un onglet à l’autre.',
        },
        {
          termine: 'Déplacer une ligne',
          tasti: '↑ / ↓',
          testo:
            'Avec le focus sur la poignée d’une ligne — une étape du plan, une plage de ' +
            'l’horaire.',
        },
        {
          termine: 'Ajouter à une liste',
          tasti: 'Entrée',
          testo:
            'Dans les champs qui ajoutent une entrée — un calendrier ICS, un choix dans les ' +
            'paramètres —, sans chercher le bouton.',
        },
        {
          termine: 'Réduire la barre latérale',
          tasti: 'Échap',
          testo: 'Avec le focus dans la barre latérale, la réduit aux icônes.',
        },
        {
          termine: 'Choisir plusieurs éléments',
          tasti: 'Ctrl+clic / Maj+clic',
          testo:
            'Parmi les pages à trier et parmi les PDF des documents : Ctrl ajoute ou retire, ' +
            'Maj prend toute une plage. Dans le calendrier, Ctrl+clic sur plusieurs événements ' +
            'ICS du même jour en fait une seule leçon.',
        },
        {
          termine: 'Copier une leçon dans le calendrier',
          tasti: 'Ctrl+glisser',
          testo:
            'Glisser déplace ; avec Ctrl (ou Alt) enfoncé, on laisse une copie.',
        },
        {
          termine: 'Renoncer à un glisser',
          tasti: 'Échap',
          testo:
            'Parmi les pages à trier : la page revient où elle était, sans message.',
        },
        {
          termine: 'Dans l’assistant',
          tasti: 'Entrée / Maj+Entrée / Échap',
          testo:
            '`Entrée` envoie la question, `Maj+Entrée` va à la ligne, `Échap` ferme le panneau. ' +
            'Avec le micro ouvert, `Échap` arrête seulement la dictée, sans rien écrire, et le ' +
            'panneau reste ouvert.',
        },
        {
          termine: 'Dans l’écran d’accueil',
          tasti: 'Échap',
          testo: 'Équivaut à **Quitter**.',
        },
      ],
      note: [
        'L’info-bulle de chaque bouton de la barre d’actions et de chaque entrée de la barre ' +
          'latérale, les entrées de **Fichier** et les lignes de la recherche écrivent le ' +
          'raccourci à côté du nom : c’est là qu’on les apprend.',
      ],
    },
  },
  en: {
    primiPassi: {
      titolo: 'First steps',
      sommario:
        'From an empty register to the first lesson filled in, in seven moves. The rest of ' +
        'the guide can be read when needed.',
      scritte: {
        benvenuto: 'Welcome',
        nuovoAnno: 'new year',
        classi: 'Classes',
        eCorsi: 'and courses',
        elenco: 'List',
        inClassi: 'in Classes',
        ora: 'The lesson',
        calendario: 'calendar',
        svolta: 'Held',
        aFineOra: 'at the end',
        pendenze: 'Pending',
        agenda: 'Planner',
        unaVolta: 'once, at the start of the year',
        ogniGiorno: 'then, every day',
      },
      figure: [
        {
          didascalia:
            'The first four moves are made once a year; the last three are the daily round.',
        },
      ],
      voci: [
        {
          termine: 'The welcome screen',
          testo:
            'With no year open, the register shows a single window: **Open a year…** for a ' +
            '`.regi` that already exists, **Create a new year…** to begin. Below, the ' +
            'recent ones: the star keeps a year among the favourites, the cross removes it from ' +
            'the list without touching the file. At the bottom, next to the version, how the ' +
            'updates are getting on.',
        },
        {
          termine: 'Create a new year',
          testo:
            'You choose the year from those in the official calendar: dates, holidays and bank ' +
            'holidays come with it. If there are other registers, the register asks whether ' +
            'to bring in their classes, courses and settings; then it opens the year’s page. ' +
            'From the main window it is the same form: **New year** in Settings › Year and ' +
            'timetable › School year, or on the page of an empty register.',
        },
        {
          termine: 'Classes and courses',
          testo:
            '**Import from another register…**, in the File menu, brings in classes with their ' +
            'people, courses, subjects and plans from a previous year. To start from scratch: ' +
            '**New class** in Classes, **New course** in Courses with the week’s lessons, and ' +
            '**Lessons on the calendar** puts in the lessons until the end of the year.',
        },
        {
          termine: 'Save the year',
          testo:
            'A new year starts out **unsaved**, in a temporary folder: the title bar says so. ' +
            '`Ctrl+S` asks for a name and a place — the Desktop, a USB stick, a synced ' +
            'folder — and from then on every change is written by itself.',
        },
        {
          termine: 'Add the people',
          testo:
            'In **Classes**, with the class chosen, from the action bar: **Paste list** takes ' +
            `the names of the ${EN.pif.plurale} copied from a spreadsheet or an email, **Add to ` +
            'group** adds one name at a time. Contact addresses, ' +
            `${EN.azienda.singolare} and photo can be added later, at leisure.`,
        },
        {
          termine: 'Open the lesson',
          testo:
            'A click on a lesson in the calendar — with **Edit** off —, or on the lesson ' +
            'suggested at the bottom left, opens the **Lesson** page: **Admin** for ' +
            'attendance and assignments, **Lesson** for the outline and assessments, **Notes** ' +
            'for topics and observations.',
        },
        {
          termine: 'Mark the lesson as held',
          testo:
            'Once the lesson is over, **Held** in the action bar: the lesson counts among the ' +
            'lessons held. A past lesson with no attendance taken or not marked stays a gap, ' +
            'and the bar at the bottom keeps suggesting it.',
        },
        {
          termine: 'See what is left',
          testo:
            'The **Dashboard**, the first Planner page, summarises the day and takes you where ' +
            `you need to go. **${Molti(EN.pendenza)}** shows assessments and assignments for ` +
            'the selected course; **Class teacher** gathers class paperwork and obligations.',
        },
      ],
      note: [
        'A new year starts with the subjects and settings of the one that is open; classes, ' +
          'courses and plans come with the import, one tick box per class.',
        'A holiday from the calendar that does not apply at your school is removed from the ' +
          'list of breaks before saving the year, or afterwards, from Days without lessons.',
      ],
    },
    inizio: {
      titolo: 'How the register is built',
      sommario:
        'A single chain, and everything else hangs from it: year → class, subject → course → ' +
        'timetable → lessons.',
      scritte: {
        anno: 'Year',
        classe: 'Class',
        ilGruppo: 'the group',
        corso: 'Course',
        materiaPerClasse: 'subject × class',
        orario: 'Timetable',
        oreFisse: 'the fixed lessons',
        materia: 'Subject',
        dalCatalogo: 'from the catalogue',
        lezioni: 'Lessons',
        sulCalendario: 'on the calendar',
        agganciate: 'Lessons, assessments and plans hang on the course',
      },
      figure: [
        {
          didascalia:
            'Everything in the register hangs from what is on its left, and the subject comes ' +
            'in from below: the course is the knot where the two paths meet.',
          legenda: [
            'The **course** is a subject taught to a class: two subjects for the same class are ' +
              'two courses.',
            'The **lessons** come from the timetable, one for each fixed slot of the week.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The course is the pivot',
          testo:
            'Lessons, assessments and plans hang on the course, not on the class: two subjects ' +
            'for the same group are two courses, with two averages and two attendance counts.',
        },
        {
          termine: 'One year, one document',
          testo:
            'Each school year is a `.regi` file with everything inside, even the printed ' +
            'PDFs and the scans. It opens with a double click; to change year, you open another ' +
            'document.',
        },
        {
          termine: 'The year and its semesters',
          testo:
            'The two semesters are created with the year, split at the end of January. Dates ' +
            'and semesters are changed in **Settings** › **School year**, or with **Edit the ' +
            'year** from `Ctrl+K`; the holidays from **Holidays and breaks**. The **Period** ' +
            'drop-down limits the counts — averages, absences, lessons — to one semester or to ' +
            'the “Whole year”.',
        },
        {
          termine: 'The “+” next to the drop-downs',
          testo:
            'Where a drop-down asks for something that does not exist yet, the “+” next to it ' +
            'creates it on the spot and selects it by itself. There is no set order to guess, ' +
            'and what you were typing is not lost.',
        },
        {
          termine: 'Everything saves itself',
          testo:
            'On the working pages there is no “Save” button: attendance is saved on the ' +
            'first click, texts when you leave the field. Forms in a window have their own ' +
            'confirm button, and `Ctrl+Enter` confirms them even from inside a long text.',
        },
        {
          termine: 'A greyed-out command says why',
          testo:
            'A grey button is not broken: hover over it and the tooltip says what is ' +
            'missing — nearly always a course to choose at the top. Run from the keyboard or ' +
            'from the search, a notice says so.',
        },
        {
          termine: 'Windows come back where they were',
          testo:
            'Position, size, screen and “maximised” are remembered for the register, the ' +
            'document viewer, the settings and the welcome screen. If yesterday’s screen is no ' +
            'longer there, the window reopens on one of those connected.',
        },
      ],
      note: [
        'Deleting a class takes its courses with it, and with them lessons, assessments and ' +
          'assignments. For a finished class, the **Archived** tick in the class’s ' +
          '**Details**, in Classes, is enough: it leaves the lists and its history stays.',
      ],
    },
    finestra: {
      titolo: 'The register window',
      sommario:
        'On the left, where to go; at the top, what you are working on and what you can do; ' +
        'at the bottom, what is missing.',
      scritte: {
        stato: 'to fill in: DIC4a · Mon 14 Sep',
        file: 'File ▾',
        percorso: '2026-2027 › Calendar › Mon 14 Sep',
        registro: 'Register',
        gruppoAgenda: 'Planner',
        calendario: 'Calendar',
        pendenze: Molti(EN.pendenza),
        daSmistare: 'To sort',
        gruppoRegistro: 'Register — DIC4a · Maths',
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        gruppoAnno: 'The year',
        classi: 'Classes',
        corso: 'Course',
        tuttiICorsi: 'All courses ▾',
        annoIntero: 'Whole year ▾',
        proietta: 'Project',
        nuovaOra: 'New lesson',
      },
      figure: [
        {
          didascalia:
            'The title bar and the sidebar are about the whole register; the two rows at the ' +
            'top and the bar at the bottom change with the open page.',
          legenda: [
            'The title bar: **File** with the ↶ ↷ arrows, the open year and the path; on the ' +
              'right **Search…**, and the update strip when a new version comes out.',
            'The sidebar: at the top the button that shrinks it to icons, below it all the ' +
              'pages in their groups, with the open one highlighted.',
            'The choices row: what you are working on.',
            'The action bar: what you can do here.',
            'The page.',
            'The status bar: what is missing.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The title bar',
          testo:
            'On the left the register’s mark, **File** and the ↶ ↷ arrows — undo and redo; in ' +
            'the middle the name of the open year and the path to where you are — with ' +
            '“(unsaved)” on a new year, and the file with its folder in the tooltip. On the ' +
            'right, against the window buttons, **Search…** with its `Ctrl+K`: it opens the ' +
            'search like the key does, and in a narrow window only the magnifier is left. ' +
            'Next to it, when a new version comes out, the update strip: two words, the step ' +
            'needed now, and the ✕ that hides it until the next news. Dragging the bar moves ' +
            'the window, a double click maximises it.',
        },
        {
          termine: 'The path',
          testo:
            'Right after the name of the year, from broad to narrow: course or class, page, ' +
            'what is open — the lesson, the person, the plan. The sidebar group and the active ' +
            'tab are not repeated here: you can already see them, a hand’s width away. The ' +
            'last link, highlighted, is where you are. It is for reading, not clicking; as the ' +
            'window narrows, the broad links disappear first.',
        },
        {
          termine: 'The sidebar',
          testo:
            `**Planner**: Today, Calendar, ${Molti(EN.pendenza)}, To sort. **Register**: Lesson, ` +
            'Assessments, Check, Lesson plans, Documents, all for the course chosen at the ' +
            'top — the group title says which: “Register — DIC4a · Maths”. ' +
            `**${Uno(EN.docenteClasse)}**: ${Molti(EN.pendenza)} for the class, Document ` +
            'archive, Absences, Messages — only if a class has the “I’m the class teacher” ' +
            'tick, and the title carries the class. ' +
            `**The year**: Classes, ${Molti(EN.pif)}, Map, Courses. **The program**, set apart ` +
            'at the bottom of the column: Settings, Help. The open page is the highlighted ' +
            'item. The letterhead and the language models are inside the Settings.',
        },
        {
          termine: 'Shrinking it to icons',
          testo:
            'The button at the top of the bar, next to “Register”, shrinks it to icons only ' +
            'and opens it again; `Esc`, inside the bar, shrinks it. The header stays put while ' +
            'the pages scroll underneath. In narrow windows it opens on request and closes ' +
            'again after the choice; if the assistant is open there too, it stays as icons.',
        },
        {
          termine: 'One key per page',
          tasti: 'Ctrl+1…9',
          testo:
            'The first nine items in the bar, in the order you see them: `Ctrl+1` is Dashboard, ' +
            '`Ctrl+2` the Calendar, and so on down to `Ctrl+9`, Documents. The key is written ' +
            'in the item’s tooltip.',
        },
        {
          termine: 'The numbers next to the items',
          testo:
            `Two items carry a number: **${Molti(EN.pendenza)}**, how many things are still ` +
            'open — the same number as the bar at the bottom —, and **To sort**, the PDF pages ' +
            'still to be assigned. Zero is not shown.',
        },
        {
          termine: 'Back and forward',
          tasti: 'Alt+← / Alt+→',
          testo:
            '`Alt+←` goes back to the previous place — the page, the lesson, the record — and ' +
            'finds it scrolled to where you left it; `Alt+→` takes the step again. The two ' +
            'side buttons of the mouse work too. These are not the ↶ ↷ arrows in the title ' +
            'bar: those undo a change to the register, these only change where you are looking.',
        },
        {
          termine: 'The choices row',
          testo:
            'The drop-downs that say what you are working on: **Course** on the Register ' +
            'pages, **Class** on the Class teacher pages, in Classes and in the Map, a ' +
            '**Course** filter with “All courses” in the calendar; elsewhere none. Next to them ' +
            'the open **Year**, which is shown and not chosen, and the **Period**: the ' +
            'semesters or “Whole year”.',
        },
        {
          termine: 'The action bar',
          testo:
            'Only what can be done on the open page: in the calendar **Today** and, with ' +
            '**Edit** on, **New lesson**; in the lesson **Planned**, **Held** and ' +
            '**Cancelled**. The most used command stands out, a switch that is on looks ' +
            'pressed. The arrow at the end of the choices row hides it, like `Ctrl+B`. The ' +
            'guide and the settings have neither this bar nor the choices row, as long as the ' +
            'class screen is off: their actions are on the page.',
        },
        {
          termine: 'Edit, Project and Assistant',
          testo:
            'At the end of the choices row, from every page. **Edit** (`Ctrl+E`) takes the ' +
            'lessons in hand: in the calendar you draw, stretch and move them; on a lesson’s ' +
            'page it opens “Edit the lesson”. **Project** turns on the class screen and ' +
            'becomes **Turn off the screen**; once on, **Projection** appears, which puts the ' +
            'screen’s commands in the action bar. **Assistant** is there only if it is turned ' +
            'on in the settings.',
        },
        {
          termine: 'The “File” menu',
          testo:
            'The bare minimum for the year’s document: a new year and **Open a year…**, with ' +
            'the recent and favourite registers just below; **Import from another ' +
            'register…**, to bring the classes and settings of another year into this one; ' +
            '**Close the year** and **Open the file’s folder**; on its own at the bottom, ' +
            '**Quit the register**. The register saves by itself: **Save the year as…** ' +
            'appears only for a new year that has never been saved. Editing the year and the ' +
            'mail have their own section in the settings, and everything can also be found ' +
            'with `Ctrl+K`.',
        },
        {
          termine: 'Favourites, with the right mouse button',
          testo:
            'A right click on a recent register, in the **File** menu or in the year menu at ' +
            'the bottom right — or the right arrow, from the keyboard — opens **Add to ' +
            'favourites** or **Remove from favourites** alongside, and **Remove from list**, ' +
            'which removes the row and leaves the file where it is. The menu stays open: you ' +
            'can star another year without reopening it.',
        },
        {
          termine: 'Zoom and full screen',
          testo:
            '`Ctrl+plus` and `Ctrl+minus` enlarge and shrink text and boxes, `Ctrl+0` goes back ' +
            'to normal size, `F11` takes the window full screen. They are not settings: you ' +
            'find them with `Ctrl+K` and in the system menu, which appears with `Alt`.',
        },
        {
          termine: 'The warnings row',
          testo:
            'When something in the document does not add up — a course that has lost its ' +
            'subject — “1 reference does not match” appears above the page, with the first one ' +
            'missing. **Repair**, when it is there, fixes after a confirmation whatever can be ' +
            'corrected without losing anything; **Details** leads to the settings.',
        },
        {
          termine: 'The thread at the top',
          testo:
            'A thin thread running along the top edge says the register is still working, even ' +
            'if the button you pressed has already been redrawn. When it disappears, the answer ' +
            'has arrived.',
        },
        {
          termine: 'The system menu',
          testo:
            'On Windows and Linux the classic menu bar is hidden, and `Alt` makes it appear. ' +
            'It has menus of its own — **Register**, **Go to**, **New**, **Screen**, **Mail**, ' +
            '**Folders**, **Edit**, **View** — and under **Register** there is **Program ' +
            'settings…**: the native window, for when the settings page will not open.',
        },
      ],
      note: [
        'The **Course** at the top applies to all five Register pages and follows them: you ' +
          'choose it once, among the courses that have at least one lesson in the period or ' +
          'have no lessons yet. The calendar’s **Course** is another field: it narrows the ' +
          'week and does not change the course you are working on.',
        'On a small screen, `Ctrl+B` hides the action bar and `Ctrl+K` still reaches its ' +
          'commands: it is the pair that leaves the most room for the page.',
      ],
    },
    ricerca: {
      titolo: 'Search pages, commands and people',
      sommario:
        'A line to type what you are looking for — a page, a command, a person, a course, a ' +
        'class — when you do not know where it is.',
      scritte: {
        cercato: 'new',
        nuovaOra: 'New lesson',
        nuovaOraAiuto: 'A lesson outside the timetable, or a course’s first…',
        nuovoAnno: 'New school year',
        nuovoAnnoAiuto: 'A new year, in a document of its own…',
        nuovaConsegna: 'New assignment',
        altrove: 'This is done from its own page: open it, it’s in the bar.',
        cercatoNome: 'dic4a',
        persona1: 'Bernasconi Luca',
        persona2: 'Ferrari Giulia',
        corso: 'DIC4a · Maths',
        classe: 'DIC4a',
      },
      figure: [
        {
          didascalia:
            'You type, and the list narrows with every letter: each kind under its heading, ' +
            'and in each group what can be done now first. Here you are in the calendar with **Edit** on: ' +
            `**New lesson** works, **New assignment** belongs to the ${EN.pendenza.plurale} ` +
            'and drops to the bottom.',
          legenda: [
            'The words, in any order and without accents: they are searched in the name, the ' +
              'group and the explanation.',
            'The chosen row: the arrows move it, `Enter` runs it.',
            'The shortcut, when the command has one.',
            'A command that cannot be done now — including because it belongs to another ' +
              'page — drops to the bottom and says why.',
          ],
        },
        {
          didascalia:
            `When you type a name, after pages and commands come the ${EN.pif.plurale}, the ` +
            'courses and the classes of the open year. Each group shows a few rows, and the ' +
            'heading says how many are left out.',
          legenda: [
            'The group heading, with the count when it is cut: six rows of twenty-one. One ' +
              'more letter narrows it.',
            'The person, with their class underneath: `Enter` opens their record.',
            'The course takes you to its sheet, on the Courses page.',
            'The class takes you to Classes, with that class chosen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Opening it',
          tasti: 'Ctrl+K',
          testo:
            'From any page, even from inside a field, or with a click on **Search…** at the ' +
            'top right, in the title bar. It does not open while a form window is open.',
        },
        {
          termine: 'Pages and commands together',
          testo:
            'All the pages and all the commands are there. Pages, the **File** menu commands ' +
            'and those of the class screen run from anywhere; a command from another page ' +
            'stays greyed out, at the bottom, and says “This is done from its own page”: **New lesson** ' +
            'is run from the calendar with **Edit** on, or from any page with `Ctrl+Alt+N`, ' +
            'which turns it on by itself.',
        },
        {
          termine: 'People, courses and classes',
          testo:
            `As soon as you type, below pages and commands the ${EN.pif.plurale} of the open ` +
            'year appear too, with their class alongside — “rossi dic4a” narrows to the Rossis ' +
            'of that class —, and the courses and the classes. `Enter` opens the person’s ' +
            'record, the course sheet, or the class in **Classes**. Those who have left are ' +
            'there too, at the bottom.',
        },
        {
          termine: 'A few rows per group',
          testo:
            'With the box empty, ten rows: six pages and four commands. As you type, each group ' +
            'gets its own — four pages, five commands, six people, three courses, three ' +
            'classes — and none takes the others’ place. When some are left out the heading ' +
            'says so, “6 of 12”: one more letter is enough. “Nothing by that name.” means no ' +
            'item contains all the words.',
        },
        {
          termine: 'Closing it',
          testo: '`Esc`, `Ctrl+K` again, or a click outside the box.',
        },
        {
          termine: 'Searching this guide',
          tasti: '/',
          testo:
            'The box at the top of the guide understands the searcher’s own words: “pupil” ' +
            `finds the ${EN.pif.plurale}, “mark” the grades, and plurals, verb forms and ` +
            'accents do not matter. The **Best answers** appear at the top; the arrows go ' +
            'through them, `Enter` goes to the first, `Esc` clears the box.',
        },
        {
          termine: 'Did you mean',
          testo:
            'A word with one wrong letter does not leave you empty-handed: the guide suggests ' +
            'the nearest one with **Did you mean “…”?**. **Show the whole guide** goes back to ' +
            'everything.',
        },
        {
          termine: 'The guide for the page you are on',
          tasti: 'F1',
          testo:
            'From any page it opens the guide at the section that describes it. Opened another ' +
            'way — from the sidebar or the search — the guide remembers where you came from ' +
            'and suggests it at the top, with **Read how it works**; **Open the page**, next to ' +
            'a section title, takes you back to the real page.',
        },
        {
          termine: 'The figures',
          testo:
            'Hovering over a number in a figure lights up the row that explains it, and the ' +
            'other way round. A click on the figure enlarges it: the arrows leaf through all ' +
            'the figures in the guide, `Esc` closes. In the contents, the picture next to a ' +
            'section says it has a diagram, and the highlighted item is the one you are reading.',
        },
      ],
      note: [
        'Three letters and `Enter` are nearly always enough: what can be done now comes ' +
          'first, and the first row is nearly always the one you were looking for.',
      ],
    },
    barraStato: {
      titolo: 'The bar at the bottom',
      sommario:
        'What is missing, and how the machine is doing. You glance at it, not search it.',
      scritte: {
        aSinistra: 'left',
        daCompilare: 'to fill in: DIC4a · Mon 14 Sep',
        pendenze: '3 pending',
        tuttiICorsi: 'All courses ▾',
        semestre: '1st semester ▾',
        aDestra: 'right',
        assistente: 'Assistant on',
        casella: 'mailbox connected',
        leOre: 'The lessons',
        diCorsoEPeriodo: 'of course and period',
        buco: 'A gap?',
        buco2: 'past and not closed',
        si: 'yes',
        compilare: 'to fill in',
        piuVecchio: 'the oldest gap',
        no: 'no',
        inArrivo: 'A lesson coming?',
        nonAnnullata: 'not cancelled',
        prossima: 'next',
        classeGiornoOra: 'class · day time',
      },
      figure: [
        {
          didascalia:
            'In the window the two halves sit on the same row: on the left what asks for ' +
            'something, on the right how the machine is doing.',
          legenda: [
            'The lesson to fill in, or the next one.',
            `The open ${EN.pendenza.plurale}.`,
            'Course and period of the suggested lesson.',
            'The assistant and scan reading: on or off.',
            'The mail, or “offline”.',
            'The open year.',
          ],
        },
        {
          didascalia:
            'Gaps first, then the future: a Tuesday lesson with no attendance taken is still ' +
            'suggested on Thursday, until it is closed. With neither gaps nor lessons coming, ' +
            'the item says “no lessons scheduled”.',
        },
      ],
      voci: [
        {
          termine: 'The lesson to fill in',
          testo:
            'At the bottom left, with the yellow triangle: “to fill in: class · day”. With no ' +
            'gaps it says “next: class · day time”. A click opens that lesson, and the tooltip ' +
            'gives its full date.',
        },
        {
          termine: Molti(EN.pendenza),
          testo:
            'How many things are still open in all the classes: the same as on the page the ' +
            'click leads to. Hovering over it shows how many are overdue.',
        },
        {
          termine: 'Course and period',
          testo:
            'They narrow the suggested lesson, so someone working on a single class is not ' +
            'offered the gaps of the others. They are the same fields as the calendar filter ' +
            'and the **Period** at the top: change them here and they are changed there too.',
        },
        {
          termine: 'Scan reading',
          testo:
            'While the register reads the PDFs, “reading 3 of 12” appears, and hovering over ' +
            'it shows which one. Then it disappears by itself.',
        },
        {
          termine: 'Mail and network',
          testo:
            '“mailbox connected”, “sends by itself” or “drafts as .eml files”: where the ' +
            'messages go out from; a click leads to the settings. Without a network the item ' +
            'becomes **offline**, in red: what you write is saved all the same, but messages ' +
            'do not go out and scans are not read.',
        },
        {
          termine: 'The assistant and scan reading',
          testo:
            'Two switches: “on” or “off”, and a click toggles. When something needed is ' +
            'missing — the model, and for reading also the projector — they say “won’t ' +
            'start”, and the click leads to the **Language models**.',
        },
        {
          termine: 'The new version',
          testo:
            'When a version of the register comes out, “… is out” appears, then “downloading ' +
            '…” and “… ready”: the same words as the strip in the title bar. A click leads to ' +
            'the updates in the settings.',
        },
        {
          termine: 'The year',
          testo:
            'At the bottom right the name of the open year: a click opens the favourite and ' +
            'recent registers, with **Open a year…**, **New school year** and **Close the ' +
            'year** below. A right click on a row stars or unstars it.',
        },
        {
          termine: 'The reminder before the lesson',
          testo:
            'Shortly before a lesson a system notification arrives, outside this bar: the ' +
            'reminder section describes it.',
        },
      ],
      note: [
        'An item with nothing to say does not appear: no open ' +
          `${EN.pendenza.singolare}, no reading under way, no new version. What remains is ` +
          'the mail, the year and the two switches, where “off” is an answer too. A bar that ' +
          'always says the same eight things becomes background, and the day it says ' +
          '“offline” nobody reads it any more.',
      ],
    },
    scorciatoie: {
      titolo: 'Keyboard shortcuts',
      sommario:
        'Your hands stay on the keyboard. They work when a register window has the focus.',
      scritte: {
        dalMenu: 'From the program menu',
        dallaPagina: 'From the page',
        moduloAperto: 'Form open',
        tacciono: 'silent here',
      },
      figure: [
        {
          didascalia:
            'Two different ears, a single rule: with a form open, neither takes you elsewhere. ' +
            '`Ctrl+Alt+N` stops there with a notice, `Ctrl+S` does nothing.',
          legenda: [
            'The program menu listens for these, even when it cannot be seen. Those that ' +
              'change page — `Ctrl+Alt+T`, `Ctrl+Alt+N`, `Ctrl+,` — stop when a form is open ' +
              'and say so.',
            'The page listens for these: they work inside a field too — `Alt+←` and `Alt+→` ' +
              'do not, there the arrow belongs to whoever is typing —, but stay silent while a ' +
              'form window is open: there `Enter` and `Esc` belong to the form.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Search pages, commands and people',
          tasti: 'Ctrl+K',
          testo:
            'Also with a click on **Search…**, at the top right. Arrows to choose, `Enter` to ' +
            'open, `Esc` to close.',
        },
        {
          termine: 'Back and forward',
          tasti: 'Alt+← / Alt+→',
          testo:
            'Between the places you have been, as in a browser; the two side buttons of the ' +
            'mouse too. Going back, the page is scrolled to where you left it. Not inside a ' +
            'field you are typing in.',
        },
        {
          termine: 'The sidebar pages',
          tasti: 'Ctrl+1…9',
          testo:
            'The first nine items, in the order you see them: from Dashboard to Documents. The key ' +
            'is written in the item’s tooltip.',
        },
        {
          termine: 'The guide for this page',
          tasti: 'F1',
          testo:
            'From any page: opens the guide at the section that describes it.',
        },
        {
          termine: 'Search the guide',
          tasti: '/',
          testo:
            'Inside the guide, outside a field: puts the cursor in the search box.',
        },
        {
          termine: 'Save',
          tasti: 'Ctrl+S',
          testo:
            'Commits the field you are typing in and saves; on a new year it asks for a name ' +
            'and a place.',
        },
        {
          termine: 'Undo and redo',
          tasti: 'Ctrl+Z / Ctrl+Y',
          testo:
            'Outside a text field they go back over the last action made in the register, and ' +
            'redo it; inside a field they undo keystrokes, as always. `Ctrl+Shift+Z` redoes ' +
            'too, and there are the ↶ ↷ arrows in the title bar. The history lives as long as ' +
            'the register is open: once the year is closed or reopened, it starts afresh.',
        },
        {
          termine: 'Open a year',
          tasti: 'Ctrl+O',
          testo: 'Chooses another `.regi` document from the disk.',
        },
        {
          termine: 'Show or hide the actions',
          tasti: 'Ctrl+B',
          testo: 'Not inside a text field.',
        },
        {
          termine: 'Edit the lessons',
          tasti: 'Ctrl+E',
          testo:
            'From any page, like the **Edit** switch: in the calendar lessons are drawn, ' +
            'stretched and moved; on a lesson’s page “Edit the lesson” opens. `Ctrl+E` again, ' +
            'or `Esc` in the calendar, and you are out.',
        },
        {
          termine: 'Today',
          tasti: 'Ctrl+Alt+T',
          testo:
            'From any page, like the **Today** button: the calendar goes back to today in the ' +
            'view you are using, and in the week view scrolls to the current time.',
        },
        {
          termine: 'New lesson',
          tasti: 'Ctrl+Alt+N',
          testo:
            'From any page, like the **New lesson** button: goes to the calendar, turns on ' +
            '**Edit** and opens the form on the chosen day, with the course you are working ' +
            'on; once saved, it opens the lesson.',
        },
        {
          termine: 'Show the register',
          tasti: 'Ctrl+Alt+R',
          testo: 'Brings the register window back to the front.',
        },
        {
          termine: 'Settings',
          tasti: 'Ctrl+,',
          testo: 'Opens the settings page.',
        },
        {
          termine: 'Zoom in, zoom out, normal',
          tasti: 'Ctrl+plus / Ctrl+- / Ctrl+0',
          testo: 'Text and boxes bigger or smaller, one step at a time.',
        },
        {
          termine: 'Full screen',
          tasti: 'F11',
          testo: 'For the teacher’s window, not for the class screen.',
        },
        {
          termine: 'The system menu',
          tasti: 'Alt',
          testo:
            'On Windows and Linux it shows the menu bar, which stays hidden otherwise.',
        },
        {
          termine: 'In form windows',
          tasti: 'Enter / Ctrl+Enter / Esc',
          testo:
            '`Enter` confirms, `Ctrl+Enter` confirms even from inside a long text, `Esc` ' +
            'cancels. `Tab` goes round inside the window without leaving it.',
        },
        {
          termine: 'In date fields',
          tasti: '↑ / ↓ / PgUp / PgDn',
          testo: 'One day forward or back, one month forward or back.',
        },
        {
          termine: 'In the grades grid',
          tasti: '← / → / ↑ / ↓ / Enter',
          testo:
            'You move as in a spreadsheet; `Enter` goes down, and at the end of the column ' +
            'moves to the top of the next one.',
        },
        {
          termine: 'In menus',
          tasti: '↑ / ↓ / → / ← / Home / End / Esc',
          testo:
            'Including right-click menus; `Tab` closes the menu. Down arrow on **File** or on ' +
            'another button with a drop-down opens it. On a recent register the right arrow ' +
            'opens its commands — favourites, remove from list — and the left arrow closes them ' +
            'again.',
        },
        {
          termine: 'In tabs',
          tasti: '← / →',
          testo:
            'In the lesson — **Admin**, **Lesson**, **Notes** — in the map and in a person’s ' +
            'record the arrows move between the tabs.',
        },
        {
          termine: 'Moving a row',
          tasti: '↑ / ↓',
          testo:
            'With the focus on a row’s handle — a step of the plan, a lesson in the timetable.',
        },
        {
          termine: 'Adding to a list',
          tasti: 'Enter',
          testo:
            'In fields that add an item — an ICS calendar, a choice in the settings — without ' +
            'looking for the button.',
        },
        {
          termine: 'Shrinking the sidebar',
          tasti: 'Esc',
          testo: 'With the focus in the sidebar, shrinks it to icons.',
        },
        {
          termine: 'Choosing several things',
          tasti: 'Ctrl+click / Shift+click',
          testo:
            'Among the pages to sort and among the PDFs of the documents: Ctrl adds or removes, ' +
            'Shift takes a range. In the calendar, Ctrl+click on several ICS events on the same ' +
            'day makes them a single lesson.',
        },
        {
          termine: 'Copying a lesson in the calendar',
          tasti: 'Ctrl+drag',
          testo:
            'Dragging moves; with Ctrl (or Alt) held down, a copy is left behind.',
        },
        {
          termine: 'Giving up a drag',
          tasti: 'Esc',
          testo:
            'Among the pages to sort: the page goes back where it was, with no notice.',
        },
        {
          termine: 'In the assistant',
          tasti: 'Enter / Shift+Enter / Esc',
          testo:
            '`Enter` sends the question, `Shift+Enter` starts a new line, `Esc` closes the ' +
            'panel. With the microphone open `Esc` only stops the dictation, without writing ' +
            'anything, and the panel stays open.',
        },
        {
          termine: 'On the welcome screen',
          tasti: 'Esc',
          testo: 'Same as **Quit**.',
        },
      ],
      note: [
        'The tooltip of every button in the action bar and of every sidebar item, the ' +
          '**File** items and the search rows show the shortcut next to the name: that is ' +
          'where you learn them.',
      ],
    },
  },
})
