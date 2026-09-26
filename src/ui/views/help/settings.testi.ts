// I testi della guida, parte «Il programma». Una chiave per sezione con la
// forma di `TestiSezione` (testa di `types.ts`); struttura e schemi in
// `settings.ts`. I nomi delle impostazioni sono le etichette di
// `manifest.testi.ts`, lettera per lettera.

import { catalogo } from '../../../i18n/index.js'
import { LIMITI_PAUSE } from '../../../domain/breaks.js'
import { LIMITI_UD } from '../../../domain/dates.js'
import { CARTE, FASCIA, Molti, PIF, Uno, un } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  impostazioni: {
    titolo: 'Impostazioni',
    sommario:
      'Una pagina, due mondi: quel che resta su questo computer e quel che viaggia dentro il ' +
      'file dell’anno.',
    scritte: {
      titolo: 'Impostazioni',
      anno: 'Anno e orario',
      didattica: 'Didattica',
      liste: 'Liste',
      documenti: 'Documenti e stampa',
      comunicazioni: 'Comunicazioni',
      programma: 'Programma',
      generale: 'Generale',
      aggiornamentiUno: 'Aggiornamenti 1',
      modelli: 'Modelli linguistici',
      condotto: 'Condotto e riga di comando',
      filtro: 'Filtra le impostazioni per nome, chiave o descrizione…',
      aggiornamenti: 'Aggiornamenti',
      ripristina: 'Ripristina (1)',
      scaricaSubito: 'Scarica subito la versione nuova',
      modificata: 'modificata · prima: acceso',
      ritira: 'Ritira',
      questoComputer: 'Questo computer',
      cartellaDati: 'la cartella dei dati del programma',
      tema: 'tema',
      avvio: 'avvio',
      promemoria: 'promemoria',
      posta: 'posta',
      recapiti: 'recapiti',
      modelliLinguistici: 'modelli linguistici',
      assistente: 'assistente',
      aggiornamentiVoce: 'aggiornamenti',
      condottoVoce: 'condotto',
      anniRecenti: 'anni recenti',
      fileAnno: 'Il file dell’anno',
      file: 'file',
      annoESemestri: 'anno e semestri',
      chiusure: 'chiusure',
      tipiSettimana: 'tipi di settimana',
      giornata: 'giornata',
      calendariIcs: 'calendari ICS',
      scalaVoti: 'scala dei voti',
      materie: 'materie',
      listeVoce: 'liste',
      intestazione: 'intestazione',
      firma: 'firma',
      restaQui: 'resta su questo computer',
      viaggia: 'viaggia con il file',
    },
    figure: [
      {
        didascalia:
          'La pagina Impostazioni: in cima la fascia con i gruppi e, sotto, le sezioni di quello ' +
          'acceso; scorrendo resta attaccata in alto. Sotto la fascia la sezione aperta, dove ' +
          'ogni riga dice se il valore è quello di fabbrica o se l’hai deciso tu.',
        legenda: [
          'I sei gruppi, per argomento: dall’anno scolastico al programma.',
          'Le sezioni del gruppo acceso. Il numero accanto al nome conta i valori decisi a mano; ' +
            'le sezioni che stanno nel file dell’anno portano invece la pastiglia **file**.',
          'Il filtro: cerca nome, chiave e descrizione, fra le impostazioni del computer.',
          'La pastiglia dice da che cosa si è cambiato; **Ritira** torna al predefinito.',
          '**Ripristina** ritira tutta la sezione, dopo una conferma.',
        ],
      },
      {
        didascalia:
          'Dove finisce ogni valore. Aprendo lo stesso anno su un altro computer si ritrovano ' +
          'la giornata di scuola, i voti, le materie, l’intestazione e la firma, ma valgono ' +
          'tema, posta e modelli linguistici di quel computer.',
      },
    ],
    voci: [
      {
        termine: 'Aprirle',
        tasti: 'Ctrl+,',
        testo:
          'Oppure dalla barra laterale, o dalla ricerca (Ctrl+K). Senza nessun ' +
          'anno aperto la pagina non c’è: dal menu **Registro** dell’applicazione si apre ' +
          '**Impostazioni del programma…**, una finestra a parte con le voci di questo computer ' +
          'e il pulsante **Apri nel registro**.',
      },
      {
        termine: 'La fascia in cima',
        testo:
          'Sotto il titolo, due righe che scorrendo restano attaccate in alto: i gruppi, e le ' +
          'sezioni di quello acceso. Premendo un gruppo si apre la sua prima sezione. ' +
          '**Liste** e **Comunicazioni** hanno una sezione sola, e la seconda riga non c’è.',
      },
      {
        termine: 'Dove sta che cosa',
        testo:
          '**Anno e orario**: Anno scolastico, Calendario, Calendari ICS. **Didattica**: ' +
          'Materie, Valutazione. **Liste**: le voci dei menu a tendina. **Documenti e ' +
          'stampa**: Intestazione, Questo file. **Comunicazioni**: la posta e la firma. ' +
          '**Programma**: Generale, Aggiornamenti, Modelli linguistici, Condotto e riga di ' +
          'comando. In questa guida un posto si scrive così: Impostazioni › Anno e orario › ' +
          'Calendario.',
      },
      {
        termine: 'La pastiglia «file»',
        testo:
          'Le sezioni con **file** accanto al nome stanno dentro il file dell’anno aperto e ' +
          'viaggiano con lui: tutte quelle di Anno e orario, Didattica, Liste e Documenti e ' +
          'stampa, più la scheda **Firma delle e-mail**. Le altre restano su questo computer e ' +
          'valgono per tutti gli anni.',
      },
      {
        termine: 'Il numero accanto a una sezione',
        testo:
          'Solo sulle sezioni del computer: quanti valori sono stati decisi a mano. Aprendo le ' +
          'impostazioni dopo mesi, dice dove si era messo mano.',
      },
      {
        termine: 'Cercare un’impostazione',
        testo:
          'In cima a ogni sezione del computer: «Filtra le impostazioni per nome, chiave o ' +
          'descrizione…». I risultati si raccolgono sotto il nome della loro sezione, e nella ' +
          'fascia nessuna resta accesa; scegliendo una sezione o un gruppo il filtro si ' +
          'svuota. Quelle dell’anno non si filtrano.',
      },
      {
        termine: 'Modificata o predefinita',
        testo:
          'Ogni riga porta una pastiglia: «predefinito: …», oppure «modificata · prima: …», che ' +
          'dice anche il valore di fabbrica. **Ritira** su una riga la riporta lì; ' +
          '**Ripristina** lo fa per tutta la sezione, e non tocca il file dell’anno.',
      },
      {
        termine: 'Sospesa',
        testo:
          'Una riga grigia con «sospesa · … è spento» dipende da un interruttore spento sopra ' +
          'di lei: si mostra spenta e non si tocca. Il valore scritto resta, e torna ' +
          'riaccendendo l’interruttore.',
      },
      {
        termine: 'Non si accende',
        testo:
          'L’assistente e la lettura delle scansioni non si accendono finché manca il loro ' +
          'modello: la casella resta spenta, con accanto «non si accende» e che cosa manca. Si ' +
          'sceglie il modello in testa a Impostazioni › Programma › **Modelli linguistici**, e ' +
          'l’interruttore ' +
          'torna com’era. Vale anche per chi scrive da riga di comando o dall’API: senza modello ' +
          'l’accensione viene rifiutata, e togliendo il modello l’interruttore si spegne.',
      },
      {
        termine: 'Programmi già installati',
        testo:
          'Un gruppo chiuso in fondo a **Modelli linguistici**, con il numero delle voci: ' +
          '**Programma llama-mtmd-cli** e **Indirizzo di voicebox**, che si toccano di rado. ' +
          'Si apre da sé se dentro c’è qualcosa di modificato.',
      },
      {
        termine: 'Quando valgono',
        testo:
          'Si salvano appena si lascia il campo, e quasi tutte valgono subito. L’icona accanto ' +
          'all’orologio vale dal prossimo avvio: decide anche che cosa fa la X delle finestre.',
      },
    ],
    note: [
      'La domanda che decide dove sta un valore: aprendo questo anno su un altro computer, ' +
        'ti aspetteresti di ritrovarlo? Sì — la scala dei voti — e sta nel file. No — il ' +
        'tema, la casella di posta — e resta sul computer.',
      'Ogni riga del computer porta scritta in piccolo la sua chiave, per esempio ' +
        '`registroDocenti.posta.mittente`: è quella che citano i messaggi d’errore, e battuta ' +
        'nel filtro porta dritti alla riga.',
    ],
  },
  impostazioniProgramma: {
    titolo: 'Le impostazioni del programma',
    sommario: 'Che cosa si regola su questo computer, sezione per sezione.',
    scritte: {
      accensione: 'Accensione del PC',
      partiConWindows: '«Parti con Windows» acceso',
      lancio: 'Lancio a mano',
      partiSenza: '«Parti senza aprire…» acceso',
      senzaFinestra: 'Parte senza finestra',
      icona: 'L’icona',
      quandoLaChiedi: 'la finestra, quando la chiedi',
      finestraAperta: 'Finestra aperta',
      seNonCe: 'se l’icona non c’è',
      sistema: 'Sistema',
      sistemaAdesso: 'adesso: chiaro, come Windows',
      chiaro: 'Chiaro',
      chiaroSempre: 'sempre, anche di sera',
      scuro: 'Scuro',
      scuroSempre: 'sempre, anche di giorno',
      daTastiera: 'Da tastiera, sulle schede:',
    },
    figure: [
      {
        didascalia:
          'Accendersi e aprirsi sono due domande diverse, nel gruppo «Avvio» di **Generale**. ' +
          'Tutte e due portano a un registro acceso ma senza finestra.',
        legenda: [
          '**Parti con Windows**: accende il registro con il computer, senza finestre. Anche ' +
            'nella versione portabile.',
          '**Parti senza aprire il registro**: senza finestra anche quando lo si lancia a mano.',
          'La rete di sicurezza: se non resta niente da premere, la finestra si apre lo stesso.',
        ],
      },
      {
        didascalia:
          'Il tema non si sceglie da una tendina: tre schede, ognuna con il registro in piccolo ' +
          'com’è in quel tema. La stessa scelta c’è nella finestra **Impostazioni del programma…**.',
        legenda: [
          '**Sistema**: mezzo chiaro e mezzo scuro, perché segue Windows e cambia insieme a lui.',
          'Solo sotto Sistema, quando è la scelta: che cosa sta seguendo adesso. Cambia da sé ' +
            'quando cambia Windows.',
          'Le frecce passano alla scheda accanto e la scelgono subito; dall’ultima si torna ' +
            'alla prima.',
        ],
      },
    ],
    voci: [
      {
        termine: 'La lingua',
        testo:
          'In cima a Impostazioni › Programma › **Generale**, prima del tema, le schede ' +
          '**Lingua**. **Sistema**, di serie, parla la lingua di Windows se il registro la sa, ' +
          'e altrimenti l’italiano; oppure si sceglie a mano fra Italiano, Deutsch, Français ed ' +
          'English: ognuna con la sua bandiera e scritta nella sua lingua, così si trova anche ' +
          'in un registro che parla una lingua che non si legge. Cambiandola, le finestre del registro si ' +
          'ricaricano e ripartono nella lingua nuova. Quel che è già scritto nel documento — ' +
          'nomi, note, titoli delle lezioni — resta com’è: non si traduce. La stessa ' +
          'scelta c’è nella finestra **Impostazioni del programma…**.',
      },
      {
        termine: 'Il tema',
        testo:
          'In cima a Impostazioni › Programma › **Generale**: **Sistema**, **Chiaro** o ' +
          '**Scuro**, con un clic sulla scheda. Vale per il registro, per lo schermo della ' +
          'classe e per la finestra delle impostazioni. **Chiaro** è quello che si legge ' +
          'meglio proiettato.',
      },
      {
        termine: 'L’icona e l’avvio',
        testo:
          'Sempre in **Generale**. **Icona accanto all’orologio** e, sotto, **La X lascia il ' +
          'registro nell’icona**: accesa, chiudere l’ultima finestra non esce. Poi **Parti con ' +
          'Windows** e **Parti senza aprire il registro**: accesa, il programma parte con la ' +
          'sola icona.',
      },
      {
        termine: 'Promemoria e proiezione',
        testo:
          'Ancora in **Generale**. **Avviso prima della lezione** è una notifica con la classe ' +
          'e quel che resta aperto; premuta, apre quella lezione. **Minuti di anticipo**: di serie ' +
          'cinque. **Proiezione a schermo intero** manda la proiezione a tutto schermo appena ' +
          'si apre.',
      },
      {
        termine: 'Comunicazioni',
        testo:
          'In cima la scheda **Posta**, con i gesti per la casella, e la **Firma delle ' +
          'e-mail** — vedi la sezione **Posta** di questa guida. Sotto, nel gruppo «Chiamate e ' +
          'mail dall’anagrafica», che cosa succede premendo un numero o un indirizzo. ' +
          '**Chiamate**: il programma di Windows (`tel:`), Teams, Skype o nessuno. **Mail**: il ' +
          'programma predefinito, Outlook, Outlook sul web o nessuno. «Nessuno» lascia il ' +
          'recapito solo da leggere e copiare.',
      },
      {
        termine: 'Aggiornamenti',
        testo:
          'In cima la scheda «Versione …», con la frase e il gesto che ha senso adesso — ' +
          'controllare, scaricare, installare —, e sotto le tre caselle. Tutto nella sezione ' +
          '**Aggiornamenti** di questa guida.',
      },
      {
        termine: 'Modelli linguistici',
        testo:
          'In cima chi risponde per ogni mestiere e i file sul computer — scaricarli, ' +
          'sceglierli, toglierli —; sotto la **Cartella dei modelli** e gli interruttori ' +
          '**Lettura delle scansioni**, **Assistente** e **Dettatura**, spenti di serie, con ' +
          'il **Modello della voce** della dettatura.',
      },
      {
        termine: 'Scarica da sé i programmi che mancano',
        testo:
          'Nel gruppo «Cartella e scarichi» di **Modelli linguistici**, acceso di serie: la ' +
          'prima volta che serve, il registro scarica da sé il programma che legge le ' +
          'scansioni. Spento — su una linea a consumo —, lo si indica a mano in **Programma ' +
          'llama-mtmd-cli**. I modelli si scaricano a parte, e la dettatura non c’entra.',
      },
      {
        termine: 'Un programma che si ha già',
        testo:
          'In fondo a **Modelli linguistici**, chiuso. **Programma llama-mtmd-cli**: una ' +
          'copia di `llama-mtmd-cli.exe` che si ha già, e vince su quella del registro. ' +
          '**Indirizzo di voicebox**: si cambia solo se voicebox gira su un’altra porta, e ' +
          'dev’essere di questo computer. Tutte e due restano sospese finché il loro ' +
          'interruttore è spento.',
      },
      {
        termine: 'Condotto e riga di comando',
        testo:
          '**Condotto locale** spento di serie: acceso, il comando `regi` e gli script ' +
          'possono parlare con il registro. **Permetti di leggere** e **Permetti di scrivere** ' +
          'dicono che cosa possono fare, e restano sospese finché il condotto è spento.',
      },
      {
        termine: 'Gli anni recenti',
        testo:
          'Non stanno fra le impostazioni: sono nel menu **File**, sotto la voce dell’anno in ' +
          'fondo a destra nella barra di stato e nel benvenuto, con **Apri un anno…**; il tasto ' +
          'destro su una riga mette o toglie la stella. Restano i dodici aperti più di recente, più quelli con la stella.',
      },
    ],
    note: [
      'Le impostazioni stanno in `impostazioni.json` e gli anni recenti in ' +
        '`documenti.json`, nella cartella dei dati del programma. Nella versione portabile ' +
        'quella cartella è «Regiclass - dati», accanto all’eseguibile, e se ne va ' +
        'insieme a lui.',
      'La sezione del condotto si legge prima di spuntare: acceso, qualunque programma che ' +
        'gira con il tuo accesso può leggere i dati delle persone senza chiedere. Si accende ' +
        'per il tempo che serve, e si spegne.',
    ],
  },
  impostazioniAnno: {
    titolo: 'Le impostazioni dell’anno',
    sommario:
      'Le sezioni con la pastiglia **file**: quel che sta dentro il file dell’anno e vale per ' +
      'chiunque lo apra.',
    scritte: {
      primoSemestre: '1° semestre',
      secondoSemestre: '2° semestre',
      inizioPrimo: 'inizio 1°',
      finePrimo: 'fine 1° · il 2° dal giorno dopo',
      fineSecondo: 'fine 2°',
      vacanza: 'vacanza',
      unitaDidattica: 'Unità didattica',
      unaUd: '1 UD = 45 min',
      pause: 'Pause',
      primaConOrario: 'la prima con l’orario',
      inizioEFine: 'Inizio e fine',
      sullaGriglia: 'sulla griglia',
      giorni: 'Giorni',
      lunVen: 'lun–ven',
      portaAlle: 'Porta alle 08:15',
      pranzo: 'pranzo',
      udIntere: '7 UD intere',
      avanzi: '2 avanzi',
      nonFannoUnUd: 'minuti che non fanno un’UD',
    },
    figure: [
      {
        didascalia:
          'L’anno visto da Impostazioni › Anno e orario › **Anno scolastico**: due semestri, i ' +
          'giorni senza ' +
          'lezione, le settimane A e B. La vacanza non consuma il turno: dopo una A chiusa, ' +
          'riprende la B.',
        legenda: [
          'Tre date bastano: inizio del 1°, fine del 1°, fine del 2°.',
          'Un giorno senza lezione: la generazione dell’orario lo salta.',
          'La settimana marcata da cui **Alterna** riempie il resto.',
        ],
      },
      {
        didascalia:
          'Impostazioni › Anno e orario › **Calendario**: quattro passi, nell’ordine in cui le ' +
          'misure dipendono l’una dall’altra. Sotto il terzo, la giornata disegnata UD per UD: ' +
          'qui con UD da 45 minuti, la ricreazione alle 09:45 e il pranzo due UD dopo.',
        legenda: [
          'Quanto dura un’UD, e quante UD una lezione nuova.',
          'Le pause: la prima con l’orario, le altre a quante UD dalla precedente.',
          'La prima e l’ultima ora mostrate, con **Porta alle …** quando non stanno sulla ' +
            'griglia.',
          'I giorni che il calendario e la proiezione mostrano.',
          'Un avanzo: la giornata comincia alle 08:00, e la prima UD intera prima della ' +
            'ricreazione alle 08:15. **Porta alle 08:15** lo toglie.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Anno scolastico',
        testo:
          'La scheda dell’anno con **Modifica** — lo stesso di «Modifica l’anno», che si trova ' +
          'anche con `Ctrl+K` —: nome, date e nomi dei due semestri, e accanto a ciascuno quante ' +
          'valutazioni ci cadono. Sotto, **Apri un anno…** e **Nuovo anno**; senza anno, ' +
          '**Crea l’anno scolastico**.',
      },
      {
        termine: 'Giorni senza lezione',
        testo:
          'Vacanze e chiusure: **Aggiungi** — o **Aggiungi le vacanze**, sul vuoto —, la matita ' +
          'e il cestino; anche dalla ricerca, «Vacanze e sospensioni». La generazione ' +
          'dell’orario salta quei giorni, e nel calendario si spengono. Salvando una chiusura ' +
          'nuova, le ore ancora intatte che ci cadono dentro se ne vanno nello stesso gesto; ' +
          'quelle con l’appello, dei testi o dei voti restano, e il messaggio lo dice.',
      },
      {
        termine: 'Le vacanze tipiche',
        testo:
          'Nel modulo delle chiusure, accanto ad **Aggiungi pausa**, un clic per ognuna: ' +
          '**Vacanze autunnali**, **di Natale**, **di carnevale**, **di Pasqua**, **Giornata ' +
          'd’istituto**. Arrivano nel periodo in cui cadono di solito: si correggono le date.',
      },
      {
        termine: 'Il calendario ufficiale',
        testo:
          'Il registro porta con sé il calendario scolastico del Ticino: inizio e fine delle ' +
          'lezioni, vacanze e festivi. Un anno nuovo si sceglie fra quelli del calendario — ' +
          'dal benvenuto, da «Nuovo anno scolastico» o dalla tendina **Anno scolastico** in ' +
          'cima al modulo, che all’apertura ha già scelto l’anno in corso — e vacanze e festivi ' +
          'arrivano con lui, collegati: quel che non serve si toglie dalle pause. Nel modulo ' +
          'dell’anno e in quello delle chiusure una casella per ogni voce che l’anno non ha — da ' +
          'aggiungere, con date diverse, o già scritta a mano e da collegare —, e **Importa le ' +
          'voci scelte**. ' +
          'Le chiusure importate restano collegate: se una versione nuova ne corregge le date, ' +
          'la scheda dell’anno lo dice.',
      },
      {
        termine: 'Tipi di settimana',
        testo:
          'Dove l’orario va a turni: tutte le settimane in griglia, ognuna con un pulsante per ' +
          'tipo. I tipi — A e B di partenza — sono la lista **Tipi di settimana** di ' +
          'Impostazioni › Liste: aggiunta una voce, compare qui. **Alterna** riempie l’anno ' +
          'dalla prima marcata girando sulla lista nel suo ordine, **Pulisci** toglie tutti i ' +
          'tipi — orario e lezioni non si toccano. Un tipo tolto dalla lista resta sulle ' +
          'settimane che l’avevano, tratteggiato, finché non lo si toglie.',
      },
      {
        termine: 'La giornata, in quattro passi',
        testo:
          'In Anno e orario › **Calendario**, quattro schede numerate nell’ordine in cui le ' +
          'misure dipendono l’una dall’altra: l’unità didattica, le pause, l’inizio e la fine, ' +
          'i giorni. Si salva ogni campo appena lo si lascia. I calendari esterni hanno la loro ' +
          'sezione accanto, **Calendari ICS**.',
      },
      {
        termine: '1 · L’unità didattica',
        testo:
          '**Durata di un’UD (minuti)**: quanto dura un’unità didattica nella tua scuola, da ' +
          `${LIMITI_UD.minimo} a ${LIMITI_UD.massimo} minuti, di serie ${LIMITI_UD.predefinita}. ` +
          'È il passo di tutto il resto: le fasce dell’orario ne sono multipli, le pause dopo la ' +
          'prima si contano in UD, l’appello ha una casella per UD. Accanto, ' +
          `**${Uno(FASCIA)} di una lezione nuova (UD)**: quante UD dura di solito un’ora nuova. ` +
          'Sotto, due pastiglie fanno il conto in minuti.',
      },
      {
        termine: 'Cambiare la durata dell’UD',
        testo:
          'Con fasce dell’orario od ore già sul calendario il registro chiede prima conferma: ' +
          'tengono il loro numero di UD, non i minuti — un’ora da due UD, con UD da 50, diventa ' +
          'di un’ora e quaranta —, e le pause dopo la prima si spostano con loro. Un’ora che ' +
          'uscirebbe dal giorno resta com’era, e un avviso lo dice. Appena un’ora ha l’appello ' +
          'la durata è **fissata**: il campo si spegne, e sotto c’è il perché.',
      },
      {
        termine: '2 · Le pause della giornata',
        testo:
          'La ricreazione, il pranzo. **Aggiungi la prima pausa** la propone due UD dopo la ' +
          'prima ora mostrata. La **prima pausa** si dichiara con l’**Inizio** e la **Durata ' +
          '(minuti)**; le altre con quante UD stanno **dopo** la fine della precedente — ' +
          'l’etichetta dice quanto dura l’UD del documento —, così fra due pause ci stanno ' +
          'sempre UD intere. Accanto a ognuna l’orario che ne viene fuori; **Aggiungi una ' +
          `pausa** ne mette un’altra in fondo, fino a ${LIMITI_PAUSE.quante}.`,
      },
      {
        termine: 'Togliere una pausa',
        testo:
          'Il cestino accanto al nome. Togliendo la prima, la seconda resta dov’è e prende il ' +
          'suo orario; togliendone una in mezzo, la successiva si conta dalla precedente, e ' +
          'arriva prima.',
      },
      {
        termine: 'Pausa nuova',
        testo:
          'In fondo alla scheda delle pause, **Pausa nuova (minuti)**: quanto dura una pausa ' +
          'appena aggiunta, qui o dentro un’ora quando la giornata non ne ha. Poi si corregge.',
      },
      {
        termine: 'Le lezioni seguono le pause',
        testo:
          'Da lì il registro ci pensa da sé, ogni volta che un’ora nasce o si muove — creata, ' +
          'cambiata nel modulo, trascinata, copiata, stirata dalle maniglie: le UD finiscono ' +
          'dove comincia una pausa e riprendono dove finisce, e restano quante erano. Un’ora ' +
          'nuova o lasciata su un punto del calendario si aggancia anche alla griglia delle ' +
          'pause. Nel modulo della lezione lo dice la casella **Segue le pause della ' +
          'giornata**, sempre accesa; spenta, l’ora torna com’era e le fasce si scrivono a mano. ' +
          'Cambiando le pause, le ore già scritte che ci cadono sopra si spezzano e si spostano ' +
          'subito, con le stesse UD, e un avviso le conta; le altre restano come sono.',
      },
      {
        termine: '3 · Inizio e fine della giornata',
        testo:
          '**Prima ora mostrata** e **Ultima ora mostrata**: da che ora a che ora il calendario ' +
          'mostra la settimana, uguale in tutto l’anno. Con le pause dichiarate conviene ' +
          'sceglierle sulla griglia: quando un orario non ci sta, sotto il campo compare **Porta ' +
          'alle …**, che lo sposta all’ora più vicina da cui le UD cadono intere — per ' +
          'l’inizio — o in cui un’UD finisce intera, per la fine.',
      },
      {
        termine: 'La giornata disegnata',
        testo:
          'Sotto i due orari, la giornata UD per UD: le unità numerate, le pause, e in fondo ' +
          'quante UD intere ci stanno. Un **avanzo** sono minuti che non fanno un’UD: l’inizio ' +
          'o la fine non stanno sulla griglia delle pause. Non è un errore — il calendario si ' +
          'vede lo stesso —, ma un’ora che ci cade sopra comincia sfasata. Fermandosi su un ' +
          'tratto se ne leggono orario e durata.',
      },
      {
        termine: '4 · Giorni mostrati',
        testo:
          'Un pulsante per giorno: valgono per il calendario e per la proiezione, e almeno uno ' +
          'resta acceso. È da qui che si accendono sabato e domenica.',
      },
      {
        termine: 'Scala dei voti',
        testo:
          'In Didattica › **Valutazione**: minimo, massimo, sufficienza e passo. Sono i valori ' +
          '**proposti** ' +
          'a un momento di valutazione nuovo, che può poi averne di suoi.',
      },
      {
        termine: 'Nota di fine semestre e assenze',
        testo:
          '**Passo della nota di fine semestre**: l’arrotondamento della media, di solito più ' +
          'largo — 0,5 per i mezzi punti, 0 per non arrotondare. **Segnala l’assenza oltre ' +
          'il**: la percentuale di assenze, corso per corso, oltre cui una persona compare fra ' +
          `le ${CARTE.pendenza.plurale}; 0 vuol dire mai.`,
      },
      {
        termine: 'Materie',
        testo:
          '**Nuova materia**, con sigla e colore; accanto a ognuna, quante classi, corsi e ' +
          'piani ci stanno appesi. Due materie nate dalla stessa cosa si uniscono; eliminarne ' +
          'una chiede prima conferma, e dice che cosa se ne va insieme.',
      },
      {
        termine: 'Liste',
        testo:
          'Le voci dei menu a tendina, una linguetta per lista: tipi di attività e di prova, ' +
          'come lavora la classe, supporti, aspetti osservati. Si rinominano e si riordinano; ' +
          'dove il valore è testo libero se ne aggiungono e se ne tolgono. Ogni tipo di ' +
          'attività ha anche il suo **Colore**: è il filetto della tappa nella scaletta, nel ' +
          'registro dell’ora e sullo schermo in aula. **Rimetti le voci di fabbrica** torna ' +
          'all’inizio, colori compresi.',
      },
      {
        termine: 'Intestazione',
        testo:
          'In Documenti e stampa › **Intestazione**: per ogni carta intestata il **Nome della ' +
          'scuola**, il logo e la sua **Altezza del logo (mm)**, e sotto **Chi firma**. Vanno su ' +
          'ogni foglio, e stanno dentro il documento. Il logo si carica, si sostituisce e si ' +
          'toglie con **Carica il logo…**, **Sostituisci…** e **Togli**. La firma delle e-mail ' +
          'sta nel file anche lei, ma si scrive in **Comunicazioni**.',
      },
      {
        termine: 'Questo file',
        testo:
          'In Documenti e stampa › **Questo file**, la scheda **Documento e dati**: quale file è ' +
          'aperto e dove, quanto contiene, e se i riferimenti fra classi, lezioni, piani e ' +
          'valutazioni tornano. **Apri un altro registro…**, **Mostra nella cartella**, ' +
          '**Ricarica**; un anno non ancora salvato ha qui **Salva l’anno con nome…**.',
      },
      {
        termine: 'Riferimenti che non tornano',
        testo:
          'Quando qualcosa non torna, una riga d’avviso dice «N riferimenti non tornano: …», ' +
          'con **Ripara** se il registro sa rimediare da sé. **Dettagli** porta dritti a ' +
          'Documenti e stampa › **Questo file**, dove sono elencati.',
      },
    ],
    note: [
      'Qui ogni campo si salva appena lo si lascia, e vale per chiunque apra il file — ' +
        'anche fra due anni. Se il registro corregge un valore impossibile, la notifica dice ' +
        '«corrette: …» invece di «salvate».',
      'I tipi di attività e di prova si rinominano ma non si inventano: decidono quali ' +
        'campi chiede una tappa del piano. Il colore di un tipo invece è solo quel che si ' +
        'vede, e cambiarlo ritinge ogni tappa di quel tipo, anche nei piani già fatti. ' +
        'Togliendo una voce di una lista, quel che l’aveva scelta resta com’era.',
    ],
  },
  posta: {
    titolo: 'Posta',
    sommario:
      'Impostazioni › **Comunicazioni**: da quale casella escono le mail, se partono da ' +
      'sole, e con che firma.',
    scritte: {
      collega: 'Collega la casella',
      chiedeIndirizzo: 'chiede l’indirizzo',
      accessoNelBrowser: 'accesso nel browser',
      portachiavi: 'Portachiavi',
      gettone: 'il gettone',
      porta: 'porta 587',
      comunicazione: 'Comunicazione',
      daMandare: 'da mandare',
      parte: 'Parte dal registro',
      parteQuando: 'casella collegata + senza bozza',
      fileEml: 'File .eml',
      fileEmlQuando: 'da rileggere e spedire a mano',
    },
    figure: [
      {
        didascalia:
          'Sopra, come si collega una casella; sotto, dove va una comunicazione. Il sottotitolo ' +
          'della scheda **Posta** dice quale delle due strade vale adesso.',
        legenda: [
          '**Collega la casella**: salva solo se il server accetta. Poi diventa **Ricollega la ' +
            'casella**.',
          'Nel portachiavi del sistema, non nelle impostazioni: `impostazioni.json` è un file ' +
            'in chiaro.',
          'Con la casella collegata e **Spedisci senza bozza** acceso: chiede conferma, poi ' +
            'spedisce.',
          'In tutti gli altri casi: il programma di posta apre la bozza da rileggere.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Indirizzo del mittente e nome di accesso',
        testo:
          '**Indirizzo del mittente**: quello che le famiglie vedono in «Da». **Nome di ' +
          'accesso**: il nome con cui si entra, nelle scuole spesso una sigla come ' +
          '`xxx000@edu.ti.ch`. Vuoto, ognuno vale l’altro; quando sono diversi, la scheda li ' +
          'mostra tutti e due.',
      },
      {
        termine: 'Prova il collegamento',
        testo:
          'Bussa alla casella, si fa dire di chi è, e non manda niente. La risposta resta ' +
          'scritta sotto i pulsanti mentre si correggono le impostazioni.',
      },
      {
        termine: 'Manda una prova',
        testo:
          'C’è solo con la casella collegata. Manda una mail vera all’indirizzo che scrivi — di ' +
          'solito il tuo. È l’unico modo di vedere se il permesso di spedire c’è e se la firma ' +
          'arriva com’è scritta.',
      },
      {
        termine: 'Dalla ricerca',
        testo:
          'Gli stessi gesti stanno nella ricerca (Ctrl+K): **Collega ' +
          'la posta**, **Prova la posta**, **Manda una mail di prova**, **Scollega la posta**. ' +
          'Senza casella collegata le ultime tre sono spente.',
      },
      {
        termine: 'Spedisci senza bozza',
        testo:
          'Sotto «Quando parte». Acceso, le comunicazioni partono dal registro invece di ' +
          'diventare bozze; prima di ogni giro il registro chiede conferma. Senza casella ' +
          'collegata non ha effetto.',
      },
      {
        termine: 'La firma',
        testo:
          'Va in fondo alle mail che spedisce il registro — comunicazioni, richieste alle ' +
          `aziende, documenti a ${un(PIF)} —; le bozze \`.eml\` escono senza, perché la firma ` +
          'la mette il programma di posta. Si scrive nella scheda **Firma delle e-mail**, sotto ' +
          'la posta, come in un programma di posta: grassetto, corsivo, sottolineato, tre ' +
          'misure, il colore, i collegamenti. Se ne può incollare una da Outlook, e i colori ' +
          'restano. Lasciata vuota vale la firma di serie, che si vede in grigio: chi firma e ' +
          'la scuola della prima carta intestata, dall’**Intestazione**.',
      },
      {
        termine: 'La firma sta nel file',
        testo:
          'La scheda porta la pastiglia **file**: la firma si salva nel file dell’anno, non su ' +
          'questo computer, e aprendo l’anno altrove la si ritrova.',
      },
      {
        termine: 'Scollega',
        testo:
          'Toglie dal portachiavi il gettone di Microsoft, e si torna ai file `.eml`. Il ' +
          'permesso dato al programma si revoca dal proprio profilo Microsoft.',
      },
    ],
    note: [
      'Il registro chiede a Microsoft il solo permesso di spedire, non quello di leggere la ' +
        'casella. Il prezzo: niente bozze sul server e niente copia in «Posta inviata».',
      'Se l’accesso a Microsoft riesce ma il server rifiuta, può darsi che la scuola tenga ' +
        'spento l’invio autenticato (SMTP AUTH) sulla casella: lo riaccende l’amministratore. ' +
        'Indirizzo del mittente e nome di accesso scambiati danno invece `5.7.60`: il ' +
        'permesso di spedire come un ' +
        'altro.',
    ],
  },
  aggiornamenti: {
    titolo: 'Aggiornamenti',
    sommario: 'Quale versione gira, se ce n’è una nuova, e quando si installa.',
    scritte: {
      controllo: 'Controllo',
      chiedeGithub: 'chiede a GitHub',
      disponibile: 'Disponibile',
      ceLaNuova: 'c’è la nuova',
      scarico: 'Scarico',
      barraDeiMb: 'barra dei MB',
      pronta: 'Pronta',
      aspettaUscita: 'aspetta l’uscita',
      installata: 'Installata',
      versioneNuova: 'versione nuova',
      controllaAdesso: 'Controlla adesso',
      riavvia: 'Riavvia e aggiorna',
      barraTitolo: 'la barra del titolo',
      file: 'File ▾',
      percorso: '2026-2027 › Calendario › lun 14 set',
      ceLa: 'c’è la 1.7.0',
      barraFondo: 'la barra in fondo',
      benvenutoFondo: 'il benvenuto, in fondo',
      versione: 'Versione 1.6.0',
      eLUltima: 'è l’ultima',
    },
    figure: [
      {
        didascalia:
          'Il giro di una versione nuova. Ogni passo lo fa da sé una delle tre caselle; spenta, ' +
          'lo fa il pulsante sotto.',
        legenda: [
          '**Cerca versioni nuove**: mezzo minuto dopo l’avvio, poi ogni sei ore.',
          '**Scarica subito la versione nuova**: appena trovata, senza chiedere.',
          '**Installa uscendo dal registro**: alla prossima uscita dal registro.',
        ],
      },
      {
        didascalia:
          'Dove si vede a che punto sono gli aggiornamenti. Le parole sono le stesse dappertutto: ' +
          'la pastiglia della sezione, il filetto, la voce in fondo, il benvenuto e la notifica ' +
          'di «pronta» le prendono dallo stesso posto.',
        legenda: [
          'Il filetto: c’è solo quando è uscita una versione nuova. La notizia in due parole — ' +
            'un clic porta qui —, il gesto che ha senso adesso, e la ✕ che lo nasconde fino alla ' +
            'notizia successiva. Durante lo scarico un filo lungo il bordo dice a che punto è.',
          'La voce della barra in fondo, anche lei solo con una versione nuova: un clic porta ' +
            'qui.',
          'Il benvenuto, senza aprire un anno: accanto alla versione la pastiglia e il gesto. ' +
            'Quando c’è una versione nuova anche lui ha il filetto, in cima.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Dove',
        testo:
          'Impostazioni › Programma › **Aggiornamenti**. La scheda «Versione …» dice in una ' +
          'pastiglia com’è messa — «è l’ultima», «c’è la 1.7.0», «scarico la 1.7.0: 40%», ' +
          '«1.7.0 pronta», «controllo non riuscito» —; sotto, la frase intera e un pulsante ' +
          'solo, quello del gesto che ha senso adesso. Le tre caselle stanno sotto la scheda, ' +
          'nel gruppo «Versioni nuove».',
      },
      {
        termine: 'Il filetto nella barra del titolo',
        testo:
          'Quando è uscita una versione nuova, a destra nella barra del titolo compare un ' +
          'filetto sottile: la notizia in due parole, **Scarica** o **Riavvia e aggiorna**, e ' +
          'la ✕. Chiuso, torna solo con la notizia successiva — la stessa versione, pronta. Le ' +
          'due parole portano qui, dove ci sono la frase intera e le note della versione.',
      },
      {
        termine: 'Nel benvenuto',
        testo:
          'Anche senza un anno aperto: in fondo, accanto alla versione, la pastiglia con lo ' +
          'stato e il pulsante del gesto, per esempio **Controlla adesso**. Quando c’è una ' +
          'versione nuova il gesto sale nel filetto in cima, con la frase intera.',
      },
      {
        termine: 'Da sé',
        testo:
          'Di serie tutte e tre le caselle sono accese: si controlla, si scarica e si installa ' +
          'all’uscita senza domande. Quando una versione è pronta arriva una notifica, anche ' +
          'con la finestra chiusa.',
      },
      {
        termine: 'A mano',
        testo:
          '**Controlla adesso**, **Scarica** — con la barra dei MB sotto la frase —, **Riavvia ' +
          'e aggiorna**, che chiede conferma: è l’unico gesto che chiude il registro. «Che cosa ' +
          'cambia nella …», chiuso sotto la frase, mostra le note della versione.',
      },
      {
        termine: 'Ogni quanto',
        testo:
          'Non si regola: con **Cerca versioni nuove** acceso, il primo controllo è mezzo ' +
          'minuto dopo l’avvio e poi ogni sei ore, anche per il registro che resta acceso ' +
          'accanto all’orologio per giorni. Chi non vuole aspettare preme **Controlla adesso**.',
      },
      {
        termine: 'Che cosa esce',
        testo:
          'Il controllo chiede a GitHub soltanto qual è l’ultima versione pubblicata; niente ' +
          'del registro esce dal computer.',
      },
      {
        termine: 'Quando non si aggiorna da sé',
        testo:
          'Si aggiorna da sé solo la versione installata su Windows. La portabile e gli altri ' +
          'sistemi dicono «aggiornamento a mano», il motivo e **Apri le release**: si scarica a ' +
          'mano e si mette al posto della vecchia.',
      },
      {
        termine: 'Se non va',
        testo:
          'La pastiglia dice «controllo non riuscito» e la frase il motivo in chiaro: GitHub ' +
          'che non risponde, per esempio, si riprova al controllo successivo. Uno scarico ' +
          'interrotto tiene la versione trovata, lo dice in coda alla frase, e **Scarica** ' +
          'riprova.',
      },
    ],
    note: [
      'Installare vuol dire chiudere: il registro salva, esce, e una finestra con i suoi ' +
        'colori mostra l’aggiornamento mentre il programma si sostituisce nella stessa ' +
        'cartella. Con **Riavvia e aggiorna** lo riapre da sé; installata all’uscita, la ' +
        'trovi nuova la prossima volta che lo apri. Il file dell’anno non si tocca, e un ' +
        'installatore che non corrisponde a quello pubblicato viene scartato.',
      'Su una linea a consumo si spegne **Scarica subito la versione nuova**: il registro ' +
        'dice che c’è una versione nuova e aspetta **Scarica**.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    impostazioni: {
      titolo: 'Einstellungen',
      sommario:
        'Eine Seite, zwei Welten: was auf diesem Computer bleibt, und was in der Datei des ' +
        'Schuljahrs mitreist.',
      scritte: {
        titolo: 'Einstellungen',
        anno: 'Schuljahr und Stundenplan',
        didattica: 'Unterricht',
        liste: 'Listen',
        documenti: 'Dokumente und Druck',
        comunicazioni: 'Kommunikation',
        programma: 'Programm',
        generale: 'Allgemein',
        aggiornamentiUno: 'Aktualisierungen 1',
        modelli: 'Sprachmodelle',
        condotto: 'Kanal und Befehlszeile',
        filtro: 'Einstellungen nach Name, Schlüssel oder Beschreibung filtern…',
        aggiornamenti: 'Aktualisierungen',
        ripristina: 'Zurücksetzen (1)',
        scaricaSubito: 'Neue Version sofort herunterladen',
        modificata: 'geändert · vorher: an',
        ritira: 'Zurücknehmen',
        questoComputer: 'Dieser Computer',
        cartellaDati: 'der Datenordner des Programms',
        tema: 'Design',
        avvio: 'Start',
        promemoria: 'Erinnerung',
        posta: 'E-Mail',
        recapiti: 'Kontakte',
        modelliLinguistici: 'Sprachmodelle',
        assistente: 'Assistent',
        aggiornamentiVoce: 'Aktualisierungen',
        condottoVoce: 'Kanal',
        anniRecenti: 'letzte Jahre',
        fileAnno: 'Die Jahresdatei',
        file: 'Datei',
        annoESemestri: 'Jahr, Semester',
        chiusure: 'Ferien',
        tipiSettimana: 'Wochentypen',
        giornata: 'Schultag',
        calendariIcs: 'ICS-Kalender',
        scalaVoti: 'Notenskala',
        materie: 'Fächer',
        listeVoce: 'Listen',
        intestazione: 'Briefkopf',
        firma: 'Signatur',
        restaQui: 'bleibt auf diesem Computer',
        viaggia: 'reist mit der Datei',
      },
      figure: [
        {
          didascalia:
            'Die Seite Einstellungen: oben das Band mit den Gruppen und darunter den Bereichen ' +
            'der gewählten Gruppe; beim Scrollen bleibt es oben haften. Unter dem Band der offene ' +
            'Bereich, in dem jede Zeile sagt, ob der Wert der ab Werk ist oder ob du ihn ' +
            'festgelegt hast.',
          legenda: [
            'Die sechs Gruppen, nach Thema: vom Schuljahr bis zum Programm.',
            'Die Bereiche der gewählten Gruppe. Die Zahl neben dem Namen zählt die von Hand ' +
              'festgelegten Werte; die Bereiche, die in der Datei des Schuljahrs liegen, tragen ' +
              'dagegen das Etikett **Datei**.',
            'Der Filter: sucht in Name, Schlüssel und Beschreibung, unter den Einstellungen des ' +
              'Computers.',
            'Das Etikett sagt, welcher Wert vorher galt; **Zurücknehmen** kehrt zum Standard ' +
              'zurück.',
            '**Zurücksetzen** nimmt den ganzen Bereich zurück, nach einer Bestätigung.',
          ],
        },
        {
          didascalia:
            'Wo jeder Wert landet. Öffnet man dasselbe Schuljahr auf einem anderen Computer, ' +
            'findet man Schultag, Noten, Fächer, Briefkopf und Signatur wieder, aber es gelten ' +
            'Design, E-Mail und Sprachmodelle jenes Computers.',
        },
      ],
      voci: [
        {
          termine: 'Öffnen',
          tasti: 'Ctrl+,',
          testo:
            'Oder über die Seitenleiste, oder über die Suche (Ctrl+K). Ohne offenes Schuljahr ' +
            'gibt es die Seite nicht: Im Menü **Klassenbuch** der Anwendung öffnet ' +
            '**Programmeinstellungen…** ein eigenes Fenster mit den Einträgen dieses Computers ' +
            'und der Schaltfläche **Im Klassenbuch öffnen**.',
        },
        {
          termine: 'Das Band oben',
          testo:
            'Unter dem Titel zwei Zeilen, die beim Scrollen oben haften bleiben: die Gruppen, ' +
            'und die Bereiche der gewählten Gruppe. Ein Klick auf eine Gruppe öffnet ihren ' +
            'ersten Bereich. **Listen** und **Kommunikation** haben nur einen Bereich, und die ' +
            'zweite Zeile fehlt.',
        },
        {
          termine: 'Was wo steht',
          testo:
            '**Schuljahr und Stundenplan**: Schuljahr, Kalender, ICS-Kalender. **Unterricht**: ' +
            'Fächer, Beurteilung. **Listen**: die Einträge der Auswahllisten. **Dokumente und ' +
            'Druck**: Briefkopf, Diese Datei. **Kommunikation**: E-Mail und Signatur. ' +
            '**Programm**: Allgemein, Aktualisierungen, Sprachmodelle, Kanal und Befehlszeile. ' +
            'In dieser Hilfe schreibt man einen Ort so: Einstellungen › Schuljahr und ' +
            'Stundenplan › Kalender.',
        },
        {
          termine: 'Das Etikett «Datei»',
          testo:
            'Die Bereiche mit **Datei** neben dem Namen liegen in der Datei des offenen ' +
            'Schuljahrs und reisen mit ihr: alle unter Schuljahr und Stundenplan, Unterricht, ' +
            'Listen sowie Dokumente und Druck, dazu die Karte **E-Mail-Signatur**. Die anderen ' +
            'bleiben auf diesem Computer und gelten für alle Schuljahre.',
        },
        {
          termine: 'Die Zahl neben einem Bereich',
          testo:
            'Nur bei den Bereichen des Computers: wie viele Werte von Hand festgelegt wurden. ' +
            'Wer die Einstellungen nach Monaten öffnet, sieht so, wo er etwas geändert hat.',
        },
        {
          termine: 'Eine Einstellung suchen',
          testo:
            'Oben in jedem Bereich des Computers: «Einstellungen nach Name, Schlüssel oder ' +
            'Beschreibung filtern…». Die Treffer stehen unter dem Namen ihres Bereichs, und im ' +
            'Band ist keiner mehr gewählt; wählt man einen Bereich oder eine Gruppe, leert sich ' +
            'der Filter. Die Einstellungen des Schuljahrs lassen sich nicht filtern.',
        },
        {
          termine: 'Geändert oder Standard',
          testo:
            'Jede Zeile trägt ein Etikett: «Standard: …» oder «geändert · vorher: …», das auch ' +
            'den Wert ab Werk nennt. **Zurücknehmen** auf einer Zeile stellt ihn wieder her; ' +
            '**Zurücksetzen** tut das für den ganzen Bereich und rührt die Datei des Schuljahrs ' +
            'nicht an.',
        },
        {
          termine: 'Ausgesetzt',
          testo:
            'Eine graue Zeile mit «ausgesetzt · … ist aus» hängt an einem ausgeschalteten ' +
            'Schalter darüber: Sie erscheint inaktiv und lässt sich nicht ändern. Der ' +
            'eingetragene Wert bleibt und kommt zurück, wenn man den Schalter wieder einschaltet.',
        },
        {
          termine: 'Startet nicht',
          testo:
            'Der Assistent und das Lesen der Scans lassen sich nicht einschalten, solange ihr ' +
            'Modell fehlt: Das Kästchen bleibt aus, daneben «startet nicht» und was fehlt. Man ' +
            'wählt das Modell oben unter Einstellungen › Programm › **Sprachmodelle**, und der ' +
            'Schalter ist wieder wie vorher. Das gilt auch über die Befehlszeile oder die API: ' +
            'Ohne Modell wird das Einschalten abgelehnt, und wird das Modell entfernt, schaltet ' +
            'sich der Schalter aus.',
        },
        {
          termine: 'Bereits installierte Programme',
          testo:
            'Eine zugeklappte Gruppe ganz unten in **Sprachmodelle**, mit der Zahl der ' +
            'Einträge: **Programm llama-mtmd-cli** und **Adresse von voicebox**, die man selten ' +
            'anfasst. Sie klappt von selbst auf, wenn darin etwas geändert ist.',
        },
        {
          termine: 'Wann sie gelten',
          testo:
            'Sie werden gespeichert, sobald man das Feld verlässt, und fast alle gelten sofort. ' +
            'Das Symbol neben der Uhr gilt ab dem nächsten Start: Es bestimmt auch, was das X ' +
            'der Fenster tut.',
        },
      ],
      note: [
        'Die Frage, die entscheidet, wo ein Wert liegt: Wenn du dieses Schuljahr auf einem ' +
          'anderen Computer öffnest, würdest du ihn dort erwarten? Ja — die Notenskala — und er ' +
          'liegt in der Datei. Nein — das Design, das Postfach — und er bleibt auf dem Computer.',
        'Jede Zeile des Computers trägt klein ihren Schlüssel, zum Beispiel ' +
          '`registroDocenti.posta.mittente`: Ihn nennen die Fehlermeldungen, und im Filter ' +
          'eingetippt führt er direkt zur Zeile.',
      ],
    },
    impostazioniProgramma: {
      titolo: 'Die Einstellungen des Programms',
      sommario: 'Was man auf diesem Computer einstellt, Bereich für Bereich.',
      scritte: {
        accensione: 'PC wird gestartet',
        partiConWindows: '«Mit Windows starten» an',
        lancio: 'Manueller Start',
        partiSenza: '«Starten, ohne…» an',
        senzaFinestra: 'Startet ohne Fenster',
        icona: 'Das Symbol',
        quandoLaChiedi: 'das Fenster auf Wunsch',
        finestraAperta: 'Fenster offen',
        seNonCe: 'wenn das Symbol fehlt',
        sistema: 'System',
        sistemaAdesso: 'jetzt: hell, wie Windows',
        chiaro: 'Hell',
        chiaroSempre: 'immer, auch abends',
        scuro: 'Dunkel',
        scuroSempre: 'immer, auch tagsüber',
        daTastiera: 'Tastatur, auf den Karten:',
      },
      figure: [
        {
          didascalia:
            'Starten und Öffnen sind zwei verschiedene Fragen, in der Gruppe «Start» unter ' +
            '**Allgemein**. Beide führen zu einem Klassenbuch, das läuft, aber ohne Fenster.',
          legenda: [
            '**Mit Windows starten**: startet das Klassenbuch mit dem Computer, ohne Fenster. ' +
              'Auch in der portablen Version.',
            '**Starten, ohne das Klassenbuch zu öffnen**: ohne Fenster, auch wenn man es von ' +
              'Hand startet.',
            'Das Sicherheitsnetz: Bleibt nichts zum Anklicken, öffnet sich das Fenster trotzdem.',
          ],
        },
        {
          didascalia:
            'Das Design wählt man nicht aus einer Liste: drei Karten, jede mit dem Klassenbuch ' +
            'in klein, wie es in diesem Design aussieht. Dieselbe Wahl gibt es im Fenster ' +
            '**Programmeinstellungen…**.',
          legenda: [
            '**System**: halb hell, halb dunkel, weil es Windows folgt und mit ihm wechselt.',
            'Nur unter System, wenn es gewählt ist: was es gerade übernimmt. Wechselt von ' +
              'selbst, wenn Windows wechselt.',
            'Die Pfeile gehen zur Karte daneben und wählen sie sofort; von der letzten geht es ' +
              'zurück zur ersten.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die Sprache',
          testo:
            'Oben unter Einstellungen › Programm › **Allgemein**, vor dem Design, die ' +
            'Auswahl **Sprache**. **System**, der Standard, spricht die Sprache von ' +
            'Windows, sofern das Klassenbuch sie kennt, und sonst Italienisch; oder man wählt ' +
            'von Hand zwischen Italiano, Deutsch, Français und English: jede mit ihrer Flagge ' +
            'und in ihrer eigenen Sprache geschrieben, damit man sie auch in einem Klassenbuch ' +
            'findet, dessen Sprache man nicht liest. Wechselt man sie, laden die Fenster des Klassenbuchs neu und ' +
            'erscheinen in der neuen Sprache. Was schon im Dokument steht — Namen, Notizen, ' +
            'Titel der Stunden — bleibt, wie es ist: Es wird nicht übersetzt. Dieselbe ' +
            'Auswahl gibt es im Fenster **Programmeinstellungen…**.',
        },
        {
          termine: 'Das Design',
          testo:
            'Oben unter Einstellungen › Programm › **Allgemein**: **System**, **Hell** oder ' +
            '**Dunkel**, mit einem Klick auf die Karte. Gilt für das Klassenbuch, für den ' +
            'Bildschirm der Klasse und für das Einstellungsfenster. **Hell** ist projiziert am ' +
            'besten lesbar.',
        },
        {
          termine: 'Das Symbol und der Start',
          testo:
            'Ebenfalls unter **Allgemein**. **Symbol neben der Uhr** und darunter **Das X lässt ' +
            'das Klassenbuch im Symbol**: eingeschaltet beendet das Schliessen des letzten ' +
            'Fensters das Programm nicht. Dann **Mit Windows starten** und **Starten, ohne das ' +
            'Klassenbuch zu öffnen**: eingeschaltet startet das Programm nur mit dem Symbol.',
        },
        {
          termine: 'Erinnerung und Projektion',
          testo:
            'Noch unter **Allgemein**. **Hinweis vor der Stunde** ist eine Benachrichtigung mit ' +
            'der Klasse und dem, was noch offen ist; angeklickt öffnet sie diese Stunde. ' +
            '**Minuten im Voraus**: standardmässig fünf. **Projektion im Vollbild** zeigt die ' +
            'Projektion im Vollbild, sobald sie sich öffnet.',
        },
        {
          termine: 'Kommunikation',
          testo:
            'Oben die Karte **E-Mail** mit den Schritten für das Postfach, und die ' +
            '**E-Mail-Signatur** — siehe den Abschnitt **E-Mail** dieser Hilfe. Darunter, in der ' +
            'Gruppe «Anrufe und Mails aus den Personalien», was ein Klick auf eine Nummer oder ' +
            'eine Adresse auslöst. **Anrufe**: das Windows-Programm (`tel:`), Teams, Skype oder ' +
            'keines. **E-Mail**: das Standardprogramm, Outlook, Outlook im Web oder keines. ' +
            '«Keines» lässt die Kontaktadresse nur zum Lesen und Kopieren.',
        },
        {
          termine: 'Aktualisierungen',
          testo:
            'Oben die Karte «Version …» mit dem Satz und dem Schritt, der jetzt Sinn ergibt — ' +
            'prüfen, herunterladen, installieren —, und darunter die drei Kästchen. Alles im ' +
            'Abschnitt **Aktualisierungen** dieser Hilfe.',
        },
        {
          termine: 'Sprachmodelle',
          testo:
            'Oben, wer für jede Aufgabe antwortet, und die Dateien auf dem Computer — ' +
            'herunterladen, wählen, entfernen —; darunter der **Modellordner** und die ' +
            'Schalter **Scans lesen**, **Assistent** und **Diktat**, standardmässig aus, mit dem ' +
            '**Modell für die Stimme** des Diktats.',
        },
        {
          termine: 'Fehlende Programme selbst herunterladen',
          testo:
            'In der Gruppe «Ordner und Downloads» unter **Sprachmodelle**, standardmässig an: ' +
            'Beim ersten Bedarf lädt das Klassenbuch das Programm, das die Scans liest, selbst ' +
            'herunter. Ausgeschaltet — bei einer getakteten Verbindung — gibt man es von Hand ' +
            'unter **Programm llama-mtmd-cli** an. Die Modelle werden separat heruntergeladen, ' +
            'und das Diktat hat damit nichts zu tun.',
        },
        {
          termine: 'Ein Programm, das man schon hat',
          testo:
            'Ganz unten in **Sprachmodelle**, zugeklappt. **Programm llama-mtmd-cli**: eine ' +
            'Kopie von `llama-mtmd-cli.exe`, die man schon hat; sie hat Vorrang vor der des ' +
            'Klassenbuchs. **Adresse von voicebox**: ändert man nur, wenn voicebox auf einem ' +
            'anderen Port läuft, und sie muss auf diesem Computer liegen. Beide bleiben ' +
            'ausgesetzt, solange ihr Schalter aus ist.',
        },
        {
          termine: 'Kanal und Befehlszeile',
          testo:
            '**Lokaler Kanal**, standardmässig aus: Eingeschaltet können der Befehl `regi` und ' +
            'Skripte mit dem Klassenbuch sprechen. **Lesen erlauben** und **Schreiben erlauben** ' +
            'sagen, was sie dürfen, und bleiben ausgesetzt, solange der Kanal aus ist.',
        },
        {
          termine: 'Die letzten Schuljahre',
          testo:
            'Sie stehen nicht in den Einstellungen: Man findet sie im Menü **Datei**, unter dem ' +
            'Eintrag des Schuljahrs unten rechts in der Statusleiste und im ' +
            'Willkommensbildschirm, mit **Schuljahr öffnen…**; die rechte Maustaste auf einer ' +
            'Zeile setzt oder entfernt den Stern. Es bleiben die zwölf zuletzt geöffneten, dazu ' +
            'die mit Stern.',
        },
      ],
      note: [
        'Die Einstellungen liegen in `impostazioni.json` und die letzten Schuljahre in ' +
          '`documenti.json`, im Datenordner des Programms. In der portablen Version ist dieser ' +
          'Ordner «Regiclass - dati», neben der ausführbaren Datei, und wandert mit ihr.',
        'Den Bereich des Kanals liest man, bevor man ein Häkchen setzt: Eingeschaltet kann ' +
          'jedes Programm, das mit deinem Zugang läuft, die Daten der Personen ohne Nachfrage ' +
          'lesen. Man schaltet ihn für die nötige Zeit ein, und dann wieder aus.',
      ],
    },
    impostazioniAnno: {
      titolo: 'Die Einstellungen des Schuljahrs',
      sommario:
        'Die Bereiche mit dem Etikett **Datei**: was in der Datei des Schuljahrs liegt und für ' +
        'alle gilt, die sie öffnen.',
      scritte: {
        primoSemestre: '1. Semester',
        secondoSemestre: '2. Semester',
        inizioPrimo: 'Beginn 1.',
        finePrimo: 'Ende 1. · das 2. ab dem Tag danach',
        fineSecondo: 'Ende 2.',
        vacanza: 'Ferien',
        unitaDidattica: Uno(DE.unitaDidattica),
        unaUd: '1 Lekt. = 45 Min.',
        pause: Molti(DE.pausa),
        primaConOrario: 'die erste mit Uhrzeit',
        inizioEFine: 'Beginn und Ende',
        sullaGriglia: 'auf dem Raster',
        giorni: 'Tage',
        lunVen: 'Mo–Fr',
        portaAlle: 'Auf 08:15 setzen',
        pranzo: 'Mittag',
        udIntere: '7 ganze Lektionen',
        avanzi: '2 Reste',
        nonFannoUnUd: 'Minuten, die keine Lektion ergeben',
      },
      figure: [
        {
          didascalia:
            'Das Schuljahr unter Einstellungen › Schuljahr und Stundenplan › **Schuljahr**: ' +
            'zwei Semester, die Tage ohne Unterricht, die Wochen A und B. Die Ferien ' +
            'verbrauchen keinen Turnus: Nach einer abgeschlossenen A geht es mit B weiter.',
          legenda: [
            'Drei Daten genügen: Beginn des 1., Ende des 1., Ende des 2. Semesters.',
            'Ein Tag ohne Unterricht: Beim Erzeugen aus dem Stundenplan wird er übersprungen.',
            'Die markierte Woche, von der aus **Abwechseln** den Rest füllt.',
          ],
        },
        {
          didascalia:
            'Einstellungen › Schuljahr und Stundenplan › **Kalender**: vier Schritte, in der ' +
            'Reihenfolge, in der die Masse voneinander abhängen. Unter dem dritten der ' +
            'gezeichnete Tag, Lektion für Lektion: hier mit Lektionen zu 45 Minuten, der Pause ' +
            'um 09:45 und dem Mittag zwei Lektionen später.',
          legenda: [
            'Wie lange eine Lektion dauert, und wie viele Lektionen eine neue Stunde.',
            'Die Pausen: die erste mit Uhrzeit, die anderen mit der Zahl der Lektionen seit der ' +
              'vorherigen.',
            'Die erste und die letzte angezeigte Uhrzeit, mit **Auf … setzen**, wenn sie nicht ' +
              'auf dem Raster liegen.',
            'Die Tage, die Kalender und Projektion anzeigen.',
            'Ein Rest: Der Tag beginnt um 08:00, die erste ganze Lektion vor der Pause um ' +
              '08:15. **Auf 08:15 setzen** entfernt ihn.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Schuljahr',
          testo:
            'Die Karte des Schuljahrs mit **Bearbeiten** — dasselbe wie «Schuljahr bearbeiten», ' +
            'das man auch mit `Ctrl+K` findet —: Name, Daten und Namen der beiden Semester, und ' +
            'neben jedem, wie viele Beurteilungen hineinfallen. Darunter **Schuljahr öffnen…** ' +
            'und **Neues Jahr**; ohne Schuljahr **Schuljahr erstellen**.',
        },
        {
          termine: 'Tage ohne Unterricht',
          testo:
            'Ferien und Schliessungen: **Hinzufügen** — oder **Ferien hinzufügen**, wenn noch ' +
            'nichts da ist —, der Stift und der Papierkorb; auch über die Suche, «Ferien und ' +
            'Unterbrüche». Beim Erzeugen aus dem Stundenplan werden diese Tage übersprungen, und ' +
            'im Kalender erscheinen sie ausgegraut. Speichert man eine neue Schliessung, ' +
            'verschwinden die noch unberührten Stunden darin im selben Schritt; die mit ' +
            'Präsenzkontrolle, Texten oder Noten bleiben, und die Meldung sagt es.',
        },
        {
          termine: 'Die üblichen Ferien',
          testo:
            'Im Formular der Schliessungen, neben **Unterbruch hinzufügen**, ein Klick für jede: ' +
            '**Herbstferien**, **Weihnachtsferien**, **Fasnachtsferien**, **Osterferien**, ' +
            '**Schulinterner Tag**. Sie kommen in dem Zeitraum, in dem sie üblicherweise liegen: ' +
            'Die Daten korrigiert man.',
        },
        {
          termine: 'Der offizielle Schulkalender',
          testo:
            'Das Klassenbuch bringt den Schulkalender des Tessins mit: Beginn und Ende des ' +
            'Unterrichts, Ferien und Feiertage. Ein neues Schuljahr wählt man aus denen des ' +
            'Kalenders — im Willkommensbildschirm, über «Neues Schuljahr» oder in der ' +
            'Auswahlliste **Schuljahr** oben im Formular, die beim Öffnen schon das laufende ' +
            'Schuljahr gewählt hat — und Ferien und Feiertage kommen mit, verknüpft: Was nicht ' +
            'gebraucht wird, entfernt man aus den Unterbrüchen. Im Formular des Schuljahrs und ' +
            'in dem der Schliessungen gibt es ein Kästchen für jeden Eintrag, den das Schuljahr ' +
            'nicht hat — hinzuzufügen, mit anderen Daten, oder schon von Hand eingetragen und zu ' +
            'verknüpfen —, und **Gewählte Einträge importieren**. Importierte Schliessungen ' +
            'bleiben verknüpft: Korrigiert eine neue Version ihre Daten, sagt es die Karte des ' +
            'Schuljahrs.',
        },
        {
          termine: 'Wochentypen',
          testo:
            'Wo der Stundenplan im Turnus läuft: alle Wochen in einem Raster, jede mit einer ' +
            'Schaltfläche pro Typ. Die Typen — zu Beginn A und B — sind die Liste ' +
            '**Wochentypen** unter Einstellungen › Listen: Wird ein Eintrag hinzugefügt, ' +
            'erscheint er hier. **Abwechseln** füllt das Jahr ab der ersten markierten Woche und ' +
            'geht die Liste in ihrer Reihenfolge durch, **Leeren** entfernt alle Typen — ' +
            'Stundenplan und Stunden bleiben unberührt. Ein aus der Liste entfernter ' +
            'Typ bleibt gestrichelt auf den Wochen, die ihn hatten, bis man ihn entfernt.',
        },
        {
          termine: 'Der Schultag, in vier Schritten',
          testo:
            'Unter Schuljahr und Stundenplan › **Kalender** vier nummerierte Karten, in der ' +
            'Reihenfolge, in der die Masse voneinander abhängen: die Lektion, die Pausen, Beginn ' +
            'und Ende, die Tage. Jedes Feld wird gespeichert, sobald man es verlässt. Externe ' +
            'Kalender haben ihren eigenen Bereich daneben, **ICS-Kalender**.',
        },
        {
          termine: '1 · Die Lektion',
          testo:
            '**Dauer einer Lektion (Minuten)**: wie lange eine Lektion an deiner Schule dauert, ' +
            `von ${LIMITI_UD.minimo} bis ${LIMITI_UD.massimo} Minuten, standardmässig ` +
            `${LIMITI_UD.predefinita}. Sie ist der Takt für alles andere: Die Zeitfenster des ` +
            'Stundenplans sind Vielfache davon, die Pausen nach der ersten zählen in Lektionen, ' +
            'die Präsenzkontrolle hat ein Kästchen pro Lektion. Daneben ' +
            `**${Uno(DE.fascia)} einer neuen Stunde (Lektionen)**: wie viele ` +
            'Lektionen eine neue Stunde meist dauert. Darunter rechnen zwei Etiketten in Minuten ' +
            'um.',
        },
        {
          termine: 'Die Dauer der Lektion ändern',
          testo:
            'Gibt es schon Zeitfenster im Stundenplan oder Stunden im Kalender, fragt das ' +
            'Klassenbuch zuerst nach: Sie behalten ihre Zahl an Lektionen, nicht die Minuten — ' +
            'eine Stunde von zwei Lektionen wird mit Lektionen zu 50 Minuten eine Stunde und ' +
            'vierzig lang —, und die Pausen nach der ersten verschieben sich mit. Eine Stunde, ' +
            'die aus dem Tag fallen würde, bleibt, wie sie war, und eine Meldung sagt es. Sobald ' +
            'eine Stunde eine Präsenzkontrolle hat, ist die Dauer **festgelegt**: Das Feld wird ' +
            'inaktiv, und darunter steht der Grund.',
        },
        {
          termine: '2 · Die Pausen des Tages',
          testo:
            'Die grosse Pause, das Mittagessen. **Erste Pause hinzufügen** schlägt sie zwei ' +
            'Lektionen nach der ersten angezeigten Uhrzeit vor. Die **erste Pause** gibt man mit ' +
            '**Beginn** und **Dauer (Minuten)** an; die anderen mit der Zahl der Lektionen ' +
            '**nach** dem Ende der vorherigen — die Beschriftung nennt die Lektionsdauer des ' +
            'Dokuments —, so passen zwischen zwei Pausen immer ganze Lektionen. Neben jeder die ' +
            'Uhrzeit, die sich daraus ergibt; **Pause hinzufügen** hängt eine weitere ' +
            `an, bis zu ${LIMITI_PAUSE.quante}.`,
        },
        {
          termine: 'Eine Pause entfernen',
          testo:
            'Der Papierkorb neben dem Namen. Entfernt man die erste, bleibt die zweite, wo sie ' +
            'ist, und bekommt ihre Uhrzeit; entfernt man eine in der Mitte, zählt die nächste ab ' +
            'der vorherigen und kommt früher.',
        },
        {
          termine: 'Neue Pause',
          testo:
            'Unten auf der Karte der Pausen, **Neue Pause (Minuten)**: wie lange eine eben ' +
            'hinzugefügte Pause dauert, hier oder in einer Stunde, wenn der Tag keine hat. Dann ' +
            'korrigiert man sie.',
        },
        {
          termine: 'Der Unterricht folgt den Pausen',
          testo:
            'Von da an kümmert sich das Klassenbuch selbst darum, jedes Mal, wenn eine Stunde ' +
            'entsteht oder sich bewegt — erstellt, im Formular geändert, gezogen, kopiert, an ' +
            'den Griffen gedehnt: Die Lektionen enden, wo eine Pause beginnt, und gehen weiter, ' +
            'wo sie endet, und es bleiben gleich viele. Eine neue oder an einer Stelle des ' +
            'Kalenders abgelegte Stunde rastet auch am Raster der Pausen ein. Im Formular der ' +
            'Stunde zeigt das das Kästchen **Folgt den Pausen des Tages**, immer an; ' +
            'ausgeschaltet wird die Stunde wieder, wie sie war, und die Zeitfenster schreibt man ' +
            'von Hand. Ändert man die Pausen, werden die schon eingetragenen Stunden, auf die sie ' +
            'fallen, sofort geteilt und verschoben, mit denselben Lektionen, und eine Meldung ' +
            'zählt sie; die anderen bleiben, wie sie sind.',
        },
        {
          termine: '3 · Beginn und Ende des Tages',
          testo:
            '**Erste angezeigte Uhrzeit** und **Letzte angezeigte Uhrzeit**: von wann bis wann der ' +
            'Kalender die Woche zeigt, gleich für das ganze Jahr. Mit festgelegten Pausen wählt ' +
            'man sie am besten auf dem Raster: Liegt eine Uhrzeit nicht darauf, erscheint unter ' +
            'dem Feld **Auf … setzen**, das sie auf die nächste Uhrzeit verschiebt, ab der die ' +
            'Lektionen ganz fallen — für den Beginn — oder zu der eine Lektion ganz endet, für ' +
            'das Ende.',
        },
        {
          termine: 'Der gezeichnete Tag',
          testo:
            'Unter den beiden Uhrzeiten der Tag, Lektion für Lektion: die nummerierten ' +
            'Lektionen, die Pausen, und am Ende, wie viele ganze Lektionen hineinpassen. Ein ' +
            '**Rest** sind Minuten, die keine Lektion ergeben: Beginn oder Ende liegen nicht auf ' +
            'dem Raster der Pausen. Das ist kein Fehler — der Kalender erscheint trotzdem —, ' +
            'aber eine Stunde, die darauf fällt, beginnt versetzt. Verweilt man auf einem ' +
            'Abschnitt, liest man Uhrzeit und Dauer.',
        },
        {
          termine: '4 · Angezeigte Tage',
          testo:
            'Eine Schaltfläche pro Tag: Sie gelten für den Kalender und für die Projektion, und ' +
            'mindestens einer bleibt eingeschaltet. Hier schaltet man Samstag und Sonntag ein.',
        },
        {
          termine: 'Notenskala',
          testo:
            'Unter Unterricht › **Beurteilung**: Minimum, Maximum, genügende Note und ' +
            'Schrittweite. Es sind die **vorgeschlagenen** Werte für eine neue ' +
            'Leistungsbeurteilung, die danach eigene haben kann.',
        },
        {
          termine: 'Semesternote und Absenzen',
          testo:
            '**Schritt der Semesternote**: die Rundung des Durchschnitts, meist gröber — ' +
            '0,5 für halbe Noten, 0 für keine Rundung. **Absenz melden über**: der Anteil ' +
            'Absenzen, Kurs für Kurs, über dem eine Person unter den ' +
            `${Molti(DE.pendenza)} erscheint; 0 heisst nie.`,
        },
        {
          termine: 'Fächer',
          testo:
            '**Neues Fach**, mit Kürzel und Farbe; neben jedem, wie viele Klassen, Kurse und ' +
            'Pläne daran hängen. Zwei Fächer, die aus derselben Sache entstanden sind, lassen ' +
            'sich zusammenführen; eines zu löschen verlangt zuerst eine Bestätigung und sagt, ' +
            'was mit ihm verschwindet.',
        },
        {
          termine: 'Listen',
          testo:
            'Die Einträge der Auswahllisten, ein Reiter pro Liste: Arten von Aktivitäten und ' +
            'Prüfungen, wie die Klasse arbeitet, Hilfsmittel, beobachtete Aspekte. Man benennt ' +
            'sie um und ordnet sie neu; wo der Wert freier Text ist, fügt man welche hinzu und ' +
            'entfernt welche. Jede Art von Aktivität hat auch ihre **Farbe**: Es ist der Streifen ' +
            'der Etappe im Ablauf, im Klassenbuch der Stunde und auf dem Bildschirm im ' +
            'Schulzimmer. **Werkseinträge wiederherstellen** stellt den Anfangszustand wieder ' +
            'her, Farben inbegriffen.',
        },
        {
          termine: 'Briefkopf',
          testo:
            'Unter Dokumente und Druck › **Briefkopf**: für jeden Briefkopf der **Name der ' +
            'Schule**, das Logo und seine **Höhe des Logos (mm)**, und darunter **Wer ' +
            'unterschreibt**. Sie stehen auf jedem Blatt und liegen im Dokument. Das Logo lädt, ' +
            'ersetzt und entfernt man mit **Logo laden…**, **Ersetzen…** und **Entfernen**. Die ' +
            'E-Mail-Signatur liegt auch in der Datei, wird aber unter **Kommunikation** ' +
            'geschrieben.',
        },
        {
          termine: 'Diese Datei',
          testo:
            'Unter Dokumente und Druck › **Diese Datei** die Karte **Dokument und Daten**: ' +
            'welche Datei offen ist und wo, was sie enthält, und ob die Verweise zwischen ' +
            'Klassen, Stunden, Plänen und Beurteilungen stimmen. **Anderes ' +
            'Klassenbuch öffnen…**, **Im Ordner anzeigen**, **Neu laden**; ein noch nicht ' +
            'gespeichertes Schuljahr hat hier **Schuljahr speichern unter…**.',
        },
        {
          termine: 'Verweise, die nicht stimmen',
          testo:
            'Stimmt etwas nicht, sagt eine Hinweiszeile «N Verweise stimmen nicht: …», mit ' +
            '**Reparieren**, wenn das Klassenbuch selbst Abhilfe weiss. **Details** führt direkt ' +
            'zu Dokumente und Druck › **Diese Datei**, wo sie aufgelistet sind.',
        },
      ],
      note: [
        'Hier wird jedes Feld gespeichert, sobald man es verlässt, und es gilt für alle, die ' +
          'die Datei öffnen — auch in zwei Jahren. Korrigiert das Klassenbuch einen unmöglichen ' +
          'Wert, sagt die Benachrichtigung «korrigiert: …» statt «gespeichert».',
        'Die Arten von Aktivitäten und Prüfungen benennt man um, erfindet aber keine neuen: ' +
          'Sie bestimmen, welche Felder eine Etappe des Plans verlangt. Die Farbe einer Art ' +
          'dagegen ist nur das, was man sieht, und sie zu ändern färbt jede Etappe dieser Art ' +
          'neu, auch in schon fertigen Plänen. Entfernt man einen Eintrag aus einer Liste, ' +
          'bleibt, was ihn gewählt hatte, wie es war.',
      ],
    },
    posta: {
      titolo: 'E-Mail',
      sommario:
        'Einstellungen › **Kommunikation**: aus welchem Postfach die E-Mails gehen, ob sie von ' +
        'selbst abgehen, und mit welcher Signatur.',
      scritte: {
        collega: 'Postfach verbinden',
        chiedeIndirizzo: 'fragt nach der Adresse',
        accessoNelBrowser: 'Anmeldung im Browser',
        portachiavi: 'Schlüsselbund',
        gettone: 'das Token',
        porta: 'Port 587',
        comunicazione: 'Mitteilung',
        daMandare: 'zu versenden',
        parte: 'Geht vom Klassenbuch ab',
        parteQuando: 'Postfach verbunden + ohne Entwurf',
        fileEml: '.eml-Datei',
        fileEmlQuando: 'durchlesen und von Hand senden',
      },
      figure: [
        {
          didascalia:
            'Oben, wie man ein Postfach verbindet; unten, wohin eine Mitteilung geht. Der ' +
            'Untertitel der Karte **E-Mail** sagt, welcher der beiden Wege gerade gilt.',
          legenda: [
            '**Postfach verbinden**: speichert nur, wenn der Server annimmt. Danach heisst es ' +
              '**Postfach neu verbinden**.',
            'Im Schlüsselbund des Systems, nicht in den Einstellungen: `impostazioni.json` ist ' +
              'eine Datei im Klartext.',
            'Mit verbundenem Postfach und eingeschaltetem **Ohne Entwurf senden**: fragt nach, ' +
              'dann wird versendet.',
            'In allen anderen Fällen: Das Mailprogramm öffnet den Entwurf zum Durchlesen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Absenderadresse und Anmeldename',
          testo:
            '**Absenderadresse**: die, welche die Familien unter «Von» sehen. **Anmeldename**: ' +
            'der Name, mit dem man sich anmeldet, an Schulen oft ein Kürzel wie ' +
            '`xxx000@edu.ti.ch`. Leer gilt das eine für das andere; sind sie verschieden, zeigt ' +
            'die Karte beide.',
        },
        {
          termine: 'Verbindung testen',
          testo:
            'Klopft beim Postfach an, lässt sich sagen, wem es gehört, und sendet nichts. Die ' +
            'Antwort bleibt unter den Schaltflächen stehen, während man die Einstellungen ' +
            'korrigiert.',
        },
        {
          termine: 'Test senden',
          testo:
            'Gibt es nur mit verbundenem Postfach. Sendet eine echte E-Mail an die Adresse, die ' +
            'du eingibst — meist deine eigene. Nur so sieht man, ob die Berechtigung zum Senden ' +
            'besteht und ob die Signatur so ankommt, wie sie geschrieben ist.',
        },
        {
          termine: 'Über die Suche',
          testo:
            'Dieselben Schritte stehen in der Suche (Ctrl+K): **E-Mail verbinden**, ' +
            '**E-Mail testen**, **Test-E-Mail senden**, **E-Mail trennen**. Ohne ' +
            'verbundenes Postfach sind die letzten drei inaktiv.',
        },
        {
          termine: 'Ohne Entwurf senden',
          testo:
            'Unter «Wann es verschickt wird». Eingeschaltet gehen die Mitteilungen vom Klassenbuch ' +
            'ab, statt Entwürfe zu werden; vor jedem Durchgang fragt das Klassenbuch nach. Ohne ' +
            'verbundenes Postfach hat es keine Wirkung.',
        },
        {
          termine: 'Die Signatur',
          testo:
            'Sie steht am Ende der E-Mails, die das Klassenbuch versendet — Mitteilungen, ' +
            `Anfragen an ${DE.azienda.plurale}, Dokumente an ${DE.pif.plurale} —; die ` +
            '`.eml`-Entwürfe gehen ohne hinaus, weil die Signatur das Mailprogramm setzt. Man ' +
            'schreibt sie auf der Karte **E-Mail-Signatur**, unter der E-Mail, wie in einem ' +
            'Mailprogramm: fett, kursiv, unterstrichen, drei Grössen, die Farbe, Links. Man kann ' +
            'eine aus Outlook einfügen, und die Farben bleiben. Leer gilt die ' +
            'Standardsignatur, die grau erscheint: wer unterschreibt und die Schule des ersten ' +
            'Briefkopfs, aus dem **Briefkopf**.',
        },
        {
          termine: 'Die Signatur liegt in der Datei',
          testo:
            'Die Karte trägt das Etikett **Datei**: Die Signatur wird in der Datei des ' +
            'Schuljahrs gespeichert, nicht auf diesem Computer, und öffnet man das Schuljahr ' +
            'anderswo, ist sie wieder da.',
        },
        {
          termine: 'Trennen',
          testo:
            'Entfernt das Microsoft-Token aus dem Schlüsselbund, und es gibt wieder ' +
            '`.eml`-Dateien. Die dem Programm erteilte Berechtigung widerruft man im eigenen ' +
            'Microsoft-Profil.',
        },
      ],
      note: [
        'Das Klassenbuch verlangt von Microsoft nur die Berechtigung zum Senden, nicht die zum ' +
          'Lesen des Postfachs. Der Preis: keine Entwürfe auf dem Server und keine Kopie unter ' +
          '«Gesendete Elemente».',
        'Klappt die Anmeldung bei Microsoft, aber der Server lehnt ab, hat die Schule ' +
          'vielleicht das authentifizierte Senden (SMTP AUTH) für das Postfach ausgeschaltet: ' +
          'Die Administration schaltet es wieder ein. Vertauschte Absenderadresse und ' +
          'Anmeldename ergeben dagegen `5.7.60`: die Berechtigung, als jemand anderes zu senden.',
      ],
    },
    aggiornamenti: {
      titolo: 'Aktualisierungen',
      sommario:
        'Welche Version läuft, ob es eine neue gibt, und wann sie installiert wird.',
      scritte: {
        controllo: 'Prüfung',
        chiedeGithub: 'fragt GitHub',
        disponibile: 'Verfügbar',
        ceLaNuova: 'die neue ist da',
        scarico: 'Download',
        barraDeiMb: 'MB-Balken',
        pronta: 'Bereit',
        aspettaUscita: 'wartet aufs Ende',
        installata: 'Installiert',
        versioneNuova: 'neue Version',
        controllaAdesso: 'Jetzt prüfen',
        riavvia: 'Neu starten und aktualisieren',
        barraTitolo: 'die Titelleiste',
        file: 'Datei ▾',
        percorso: '2026-2027 › Kalender › Mo 14. Sep',
        ceLa: 'neu: 1.7.0',
        barraFondo: 'die Leiste unten',
        benvenutoFondo: 'der Willkommensbildschirm, unten',
        versione: 'Version 1.6.0',
        eLUltima: 'ist die neueste',
      },
      figure: [
        {
          didascalia:
            'Der Weg einer neuen Version. Jeden Schritt erledigt eines der drei Kästchen von ' +
            'selbst; ist es aus, erledigt ihn die Schaltfläche darunter.',
          legenda: [
            '**Nach neuen Versionen suchen**: eine halbe Minute nach dem Start, dann alle sechs ' +
              'Stunden.',
            '**Neue Version sofort herunterladen**: sobald gefunden, ohne zu fragen.',
            '**Beim Beenden installieren**: beim nächsten Beenden des Klassenbuchs.',
          ],
        },
        {
          didascalia:
            'Wo man sieht, wie weit die Aktualisierungen sind. Die Worte sind überall dieselben: ' +
            'das Etikett des Bereichs, der Hinweis, der Eintrag unten, der ' +
            'Willkommensbildschirm und die Benachrichtigung «bereit» holen sie vom selben Ort.',
          legenda: [
            'Der Hinweis: Er erscheint nur, wenn eine neue Version herausgekommen ist. Die ' +
              'Neuigkeit in zwei Worten — ein Klick führt hierher —, der Schritt, der jetzt Sinn ' +
              'ergibt, und das ✕, das ihn bis zur nächsten Neuigkeit ausblendet. Während des ' +
              'Downloads zeigt ein Faden am Rand, wie weit er ist.',
            'Der Eintrag in der Leiste unten, ebenfalls nur bei einer neuen Version: Ein Klick ' +
              'führt hierher.',
            'Der Willkommensbildschirm, ohne ein Schuljahr zu öffnen: neben der Version das ' +
              'Etikett und der Schritt. Gibt es eine neue Version, hat auch er oben den Hinweis.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Wo',
          testo:
            'Einstellungen › Programm › **Aktualisierungen**. Die Karte «Version …» sagt in einem ' +
            'Etikett, wie es steht — «ist die neueste», «neu: 1.7.0», «lade 1.7.0 herunter: ' +
            '40%», «1.7.0 bereit», «Prüfung fehlgeschlagen» —; darunter der ganze Satz und eine ' +
            'einzige Schaltfläche, die für den Schritt, der jetzt Sinn ergibt. Die drei ' +
            'Kästchen stehen unter der Karte, in der Gruppe «Neue Versionen».',
        },
        {
          termine: 'Der Hinweis in der Titelleiste',
          testo:
            'Ist eine neue Version herausgekommen, erscheint rechts in der Titelleiste ein ' +
            'schmaler Hinweis: die Neuigkeit in zwei Worten, **Herunterladen** oder **Neu ' +
            'starten und aktualisieren**, und das ✕. Geschlossen kommt er erst mit der nächsten ' +
            'Neuigkeit wieder — dieselbe Version, bereit. Die zwei Worte führen hierher, wo der ' +
            'ganze Satz und die Versionshinweise stehen.',
        },
        {
          termine: 'Im Willkommensbildschirm',
          testo:
            'Auch ohne offenes Schuljahr: unten, neben der Version, das Etikett mit dem Stand ' +
            'und die Schaltfläche für den Schritt, zum Beispiel **Jetzt prüfen**. Gibt es eine ' +
            'neue Version, wandert der Schritt in den Hinweis oben, mit dem ganzen Satz.',
        },
        {
          termine: 'Von selbst',
          testo:
            'Standardmässig sind alle drei Kästchen an: Es wird geprüft, heruntergeladen und ' +
            'beim Beenden ohne Nachfrage installiert. Ist eine Version bereit, kommt eine ' +
            'Benachrichtigung, auch bei geschlossenem Fenster.',
        },
        {
          termine: 'Von Hand',
          testo:
            '**Jetzt prüfen**, **Herunterladen** — mit dem MB-Balken unter dem Satz —, **Neu ' +
            'starten und aktualisieren**, das nachfragt: Es ist der einzige Schritt, der das ' +
            'Klassenbuch schliesst. «Was ist neu in …», zugeklappt unter dem Satz, zeigt die ' +
            'Versionshinweise.',
        },
        {
          termine: 'Wie oft',
          testo:
            'Das lässt sich nicht einstellen: Mit **Nach neuen Versionen suchen** eingeschaltet ' +
            'ist die erste Prüfung eine halbe Minute nach dem Start und dann alle sechs Stunden, ' +
            'auch für das Klassenbuch, das tagelang neben der Uhr läuft. Wer nicht warten will, ' +
            'klickt **Jetzt prüfen**.',
        },
        {
          termine: 'Was hinausgeht',
          testo:
            'Die Prüfung fragt GitHub nur, welches die letzte veröffentlichte Version ist; nichts ' +
            'aus dem Klassenbuch verlässt den Computer.',
        },
        {
          termine: 'Wann es sich nicht selbst aktualisiert',
          testo:
            'Von selbst aktualisiert sich nur die unter Windows installierte Version. Die ' +
            'portable Version und die anderen Systeme sagen «Aktualisierung von Hand», den Grund ' +
            'und **Releases öffnen**: Man lädt von Hand herunter und ersetzt die alte.',
        },
        {
          termine: 'Wenn es nicht klappt',
          testo:
            'Das Etikett sagt «Prüfung fehlgeschlagen» und der Satz den Grund im Klartext: ' +
            'Antwortet GitHub zum Beispiel nicht, wird es bei der nächsten Prüfung wieder ' +
            'versucht. Ein unterbrochener Download behält die gefundene Version, sagt es am Ende ' +
            'des Satzes, und **Herunterladen** versucht es erneut.',
        },
      ],
      note: [
        'Installieren heisst schliessen: Das Klassenbuch speichert, beendet sich, und ein ' +
          'Fenster in seinen Farben zeigt die Aktualisierung, während sich das Programm im ' +
          'selben Ordner ersetzt. Mit **Neu starten und aktualisieren** öffnet es sich danach ' +
          'von selbst; beim Beenden installiert, findest du es beim nächsten Öffnen neu vor. ' +
          'Die Datei des Schuljahrs wird nicht angerührt, und ein Installationsprogramm, das ' +
          'nicht dem veröffentlichten entspricht, wird verworfen.',
        'Bei einer getakteten Verbindung schaltet man **Neue Version sofort herunterladen** ' +
          'aus: Das Klassenbuch meldet dann die neue Version und wartet auf **Herunterladen**.',
      ],
    },
  },
  fr: {
    impostazioni: {
      titolo: 'Paramètres',
      sommario:
        'Une page, deux mondes : ce qui reste sur cet ordinateur et ce qui voyage dans le ' +
        'fichier de l’année.',
      scritte: {
        titolo: 'Paramètres',
        anno: 'Année et horaire',
        didattica: 'Enseignement',
        liste: 'Listes',
        documenti: 'Documents et impression',
        comunicazioni: 'Communications',
        programma: 'Programme',
        generale: 'Général',
        aggiornamentiUno: 'Mises à jour 1',
        modelli: 'Modèles de langage',
        condotto: 'Canal et ligne de commande',
        filtro: 'Filtrer les paramètres par nom, clé ou description…',
        aggiornamenti: 'Mises à jour',
        ripristina: 'Réinitialiser (1)',
        scaricaSubito: 'Télécharger tout de suite la nouvelle version',
        modificata: 'modifié · avant : activé',
        ritira: 'Retirer',
        questoComputer: 'Cet ordinateur',
        cartellaDati: 'le dossier des données du programme',
        tema: 'thème',
        avvio: 'démarrage',
        promemoria: 'rappel',
        posta: 'messagerie',
        recapiti: 'contacts',
        modelliLinguistici: 'modèles de langage',
        assistente: 'assistant',
        aggiornamentiVoce: 'mises à jour',
        condottoVoce: 'canal',
        anniRecenti: 'années récentes',
        fileAnno: 'Le fichier de l’année',
        file: 'fichier',
        annoESemestri: 'année, semestres',
        chiusure: 'congés',
        tipiSettimana: 'types de semaine',
        giornata: 'journée',
        calendariIcs: 'calendriers ICS',
        scalaVoti: 'barème',
        materie: 'branches',
        listeVoce: 'listes',
        intestazione: 'en-tête',
        firma: 'signature',
        restaQui: 'reste sur cet ordinateur',
        viaggia: 'voyage avec le fichier',
      },
      figure: [
        {
          didascalia:
            'La page Paramètres : en haut le bandeau des groupes et, dessous, les sections de ' +
            'celui qui est choisi ; en faisant défiler, il reste collé en haut. Sous le bandeau, ' +
            'la section ouverte, où chaque ligne dit si la valeur est celle d’usine ou si tu ' +
            'l’as choisie.',
          legenda: [
            'Les six groupes, par thème : de l’année scolaire au programme.',
            'Les sections du groupe choisi. Le nombre à côté du nom compte les valeurs choisies ' +
              'à la main ; les sections qui sont dans le fichier de l’année portent à la place ' +
              'la pastille **fichier**.',
            'Le filtre : il cherche nom, clé et description, parmi les paramètres de ' +
              'l’ordinateur.',
            'La pastille dit depuis quoi on a changé ; **Retirer** revient à la valeur par ' +
              'défaut.',
            '**Réinitialiser** retire toute la section, après une confirmation.',
          ],
        },
        {
          didascalia:
            'Où va chaque valeur. En ouvrant la même année sur un autre ordinateur, on retrouve ' +
            'la journée d’école, les notes, les branches, l’en-tête et la signature, mais ce ' +
            'sont le thème, la messagerie et les modèles de langage de cet ordinateur-là qui ' +
            'valent.',
        },
      ],
      voci: [
        {
          termine: 'Les ouvrir',
          tasti: 'Ctrl+,',
          testo:
            'Ou depuis la barre latérale, ou depuis la recherche (Ctrl+K). Sans année ouverte, ' +
            'la page n’existe pas : dans le menu **Registre** de l’application, ' +
            '**Paramètres du programme…** ouvre une fenêtre à part avec les réglages de cet ' +
            'ordinateur et le bouton **Ouvrir dans le registre**.',
        },
        {
          termine: 'Le bandeau en haut',
          testo:
            'Sous le titre, deux lignes qui restent collées en haut quand on fait défiler : les ' +
            'groupes, et les sections de celui qui est choisi. Un clic sur un groupe ouvre sa ' +
            'première section. **Listes** et **Communications** n’ont qu’une section, et la ' +
            'deuxième ligne n’existe pas.',
        },
        {
          termine: 'Où se trouve quoi',
          testo:
            '**Année et horaire** : Année scolaire, Calendrier, Calendriers ICS. ' +
            '**Enseignement** : Branches, Évaluation. **Listes** : les entrées des listes ' +
            'déroulantes. **Documents et impression** : En-tête, Ce fichier. **Communications** ' +
            ': la messagerie et la signature. **Programme** : Général, Mises à jour, Modèles de ' +
            'langage, Canal et ligne de commande. Dans cette aide, un endroit s’écrit ainsi : ' +
            'Paramètres › Année et horaire › Calendrier.',
        },
        {
          termine: 'La pastille « fichier »',
          testo:
            'Les sections avec **fichier** à côté du nom sont dans le fichier de l’année ouverte ' +
            'et voyagent avec lui : toutes celles d’Année et horaire, d’Enseignement, de Listes ' +
            'et de Documents et impression, plus la carte **Signature des e-mails**. Les autres ' +
            'restent sur cet ordinateur et valent pour toutes les années.',
        },
        {
          termine: 'Le nombre à côté d’une section',
          testo:
            'Seulement sur les sections de l’ordinateur : combien de valeurs ont été choisies à ' +
            'la main. En ouvrant les paramètres après des mois, il dit où l’on avait touché ' +
            'quelque chose.',
        },
        {
          termine: 'Chercher un paramètre',
          testo:
            'En haut de chaque section de l’ordinateur : « Filtrer les paramètres par nom, clé ' +
            'ou description… ». Les résultats se regroupent sous le nom de leur section, et dans ' +
            'le bandeau aucune ne reste choisie ; en choisissant une section ou un groupe, le ' +
            'filtre se vide. Ceux de l’année ne se filtrent pas.',
        },
        {
          termine: 'Modifié ou par défaut',
          testo:
            'Chaque ligne porte une pastille : « par défaut : … », ou « modifié · avant : … », ' +
            'qui dit aussi la valeur d’usine. **Retirer** sur une ligne l’y ramène ; ' +
            '**Réinitialiser** le fait pour toute la section, sans toucher au fichier de ' +
            'l’année.',
        },
        {
          termine: 'Suspendu',
          testo:
            'Une ligne grise avec « suspendu · … est désactivé » dépend d’un interrupteur ' +
            'désactivé au-dessus d’elle : elle paraît éteinte et ne se modifie pas. La valeur ' +
            'inscrite reste, et revient quand on réactive l’interrupteur.',
        },
        {
          termine: 'Ne démarre pas',
          testo:
            'L’assistant et la lecture des scans ne s’activent pas tant que leur modèle manque : ' +
            'la case reste décochée, avec à côté « ne démarre pas » et ce qui manque. On choisit ' +
            'le modèle en haut de Paramètres › Programme › **Modèles de langage**, et ' +
            'l’interrupteur revient comme il était. Cela vaut aussi depuis la ligne de commande ' +
            'ou l’API : sans modèle, l’activation est refusée, et en retirant le modèle ' +
            'l’interrupteur se désactive.',
        },
        {
          termine: 'Programmes déjà installés',
          testo:
            'Un groupe replié tout en bas de **Modèles de langage**, avec le nombre de ' +
            'réglages : **Programme llama-mtmd-cli** et **Adresse de voicebox**, qu’on touche ' +
            'rarement. Il s’ouvre de lui-même si quelque chose y est modifié.',
        },
        {
          termine: 'Quand ils prennent effet',
          testo:
            'Ils s’enregistrent dès qu’on quitte le champ, et presque tous valent tout de suite. ' +
            'L’icône près de l’horloge vaut dès le prochain démarrage : elle décide aussi de ce ' +
            'que fait le X des fenêtres.',
        },
      ],
      note: [
        'La question qui décide où va une valeur : en ouvrant cette année sur un autre ' +
          'ordinateur, t’attendrais-tu à la retrouver ? Oui — le barème — et elle est dans le ' +
          'fichier. Non — le thème, la boîte aux lettres — et elle reste sur l’ordinateur.',
        'Chaque ligne de l’ordinateur porte en petit sa clé, par exemple ' +
          '`registroDocenti.posta.mittente` : c’est celle que citent les messages d’erreur, ' +
          'et tapée dans le filtre elle mène droit à la ligne.',
      ],
    },
    impostazioniProgramma: {
      titolo: 'Les paramètres du programme',
      sommario: 'Ce qui se règle sur cet ordinateur, section par section.',
      scritte: {
        accensione: 'Allumage du PC',
        partiConWindows: '« Démarrer avec… » activé',
        lancio: 'Lancement à la main',
        partiSenza: '« Démarrer sans… » activé',
        senzaFinestra: 'Démarre sans fenêtre',
        icona: 'L’icône',
        quandoLaChiedi: 'la fenêtre, sur demande',
        finestraAperta: 'Fenêtre ouverte',
        seNonCe: 'si l’icône manque',
        sistema: 'Système',
        sistemaAdesso: 'maintenant : clair (Windows)',
        chiaro: 'Clair',
        chiaroSempre: 'toujours, même le soir',
        scuro: 'Sombre',
        scuroSempre: 'toujours, même le jour',
        daTastiera: 'Clavier, sur les cartes :',
      },
      figure: [
        {
          didascalia:
            'Démarrer et s’ouvrir sont deux questions différentes, dans le groupe « Démarrage » ' +
            'de **Général**. Les deux mènent à un registre actif mais sans fenêtre.',
          legenda: [
            '**Démarrer avec Windows** : démarre le registre avec l’ordinateur, sans fenêtres. ' +
              'Aussi dans la version portable.',
            '**Démarrer sans ouvrir le registre** : sans fenêtre même quand on le lance à la ' +
              'main.',
            'Le filet de sécurité : s’il ne reste rien sur quoi cliquer, la fenêtre s’ouvre ' +
              'quand même.',
          ],
        },
        {
          didascalia:
            'Le thème ne se choisit pas dans une liste : trois cartes, chacune avec le registre ' +
            'en petit tel qu’il est dans ce thème. Le même choix existe dans la fenêtre ' +
            '**Paramètres du programme…**.',
          legenda: [
            '**Système** : moitié clair, moitié sombre, parce qu’il suit Windows et change avec ' +
              'lui.',
            'Seulement sous Système, quand c’est le choix : ce qu’il suit en ce moment. Change ' +
              'tout seul quand Windows change.',
            'Les flèches passent à la carte voisine et la choisissent aussitôt ; de la dernière ' +
              'on revient à la première.',
          ],
        },
      ],
      voci: [
        {
          termine: 'La langue',
          testo:
            'En haut de Paramètres › Programme › **Général**, avant le thème, le choix ' +
            '**Langue**. **Système**, par défaut, parle la langue de Windows si le registre la ' +
            'connaît, et sinon l’italien ; ou on choisit à la main entre Italiano, Deutsch, ' +
            'Français et English : chacune avec son drapeau et écrite dans sa langue, pour la ' +
            'trouver même dans un registre qui parle une langue qu’on ne lit pas. Quand on la change, les ' +
            'fenêtres du registre se rechargent et repartent dans la nouvelle langue. Ce qui est ' +
            'déjà écrit dans le document — noms, notes, titres des leçons — reste tel quel : il ' +
            'ne se traduit pas. Le même choix existe dans la fenêtre **Paramètres du ' +
            'programme…**.',
        },
        {
          termine: 'Le thème',
          testo:
            'En haut de Paramètres › Programme › **Général** : **Système**, **Clair** ou ' +
            '**Sombre**, d’un clic sur la carte. Vaut pour le registre, pour l’écran de la ' +
            'classe et pour la fenêtre des paramètres. **Clair** est le plus lisible en ' +
            'projection.',
        },
        {
          termine: 'L’icône et le démarrage',
          testo:
            'Toujours dans **Général**. **Icône près de l’horloge** et, dessous, **Le X laisse ' +
            'le registre dans l’icône** : activé, fermer la dernière fenêtre ne quitte pas. ' +
            'Puis **Démarrer avec Windows** et **Démarrer sans ouvrir le registre** : activé, ' +
            'le programme démarre avec la seule icône.',
        },
        {
          termine: 'Rappel et projection',
          testo:
            'Encore dans **Général**. **Rappel avant la leçon** est une notification avec la ' +
            'classe et ce qui reste ouvert ; un clic dessus ouvre cette leçon. **Minutes ' +
            'd’avance** : cinq par défaut. **Projection en plein écran** met la projection en ' +
            'plein écran dès qu’elle s’ouvre.',
        },
        {
          termine: 'Communications',
          testo:
            'En haut la carte **Messagerie**, avec les gestes pour la boîte, et la **Signature ' +
            'des e-mails** — voir la section **Messagerie** de cette aide. Dessous, dans le ' +
            'groupe « Appels et e-mails depuis les données personnelles », ce qui se passe quand ' +
            'on clique sur un numéro ou une adresse. **Appels** : le programme de Windows ' +
            '(`tel:`), Teams, Skype ou aucun. **E-mail** : le programme par défaut, Outlook, ' +
            'Outlook sur le web ou aucun. « Aucun » laisse l’adresse de contact seulement à lire et à ' +
            'copier.',
        },
        {
          termine: 'Mises à jour',
          testo:
            'En haut la carte « Version … », avec la phrase et le geste qui a du sens maintenant ' +
            '— vérifier, télécharger, installer —, et dessous les trois cases. Tout est dans la ' +
            'section **Mises à jour** de cette aide.',
        },
        {
          termine: 'Modèles de langage',
          testo:
            'En haut, qui répond pour chaque tâche et les fichiers sur l’ordinateur — les ' +
            'télécharger, les choisir, les retirer — ; dessous le **Dossier des modèles** et les ' +
            'interrupteurs **Lecture des scans**, **Assistant** et **Dictée**, désactivés par ' +
            'défaut, avec le **Modèle de la voix** de la dictée.',
        },
        {
          termine: 'Télécharger automatiquement les programmes manquants',
          testo:
            'Dans le groupe « Dossier et téléchargements » de **Modèles de langage**, activé par ' +
            'défaut : la première fois qu’il en a besoin, le registre télécharge lui-même le ' +
            'programme qui lit les scans. Désactivé — sur une connexion limitée —, on l’indique ' +
            'à la main dans **Programme llama-mtmd-cli**. Les modèles se téléchargent à part, et ' +
            'la dictée n’est pas concernée.',
        },
        {
          termine: 'Un programme qu’on a déjà',
          testo:
            'Tout en bas de **Modèles de langage**, replié. **Programme llama-mtmd-cli** : une ' +
            'copie de `llama-mtmd-cli.exe` qu’on a déjà, et qui l’emporte sur celle du registre. ' +
            '**Adresse de voicebox** : ne se change que si voicebox tourne sur un autre port, et ' +
            'doit être de cet ordinateur. Tous deux restent suspendus tant que leur ' +
            'interrupteur est désactivé.',
        },
        {
          termine: 'Canal et ligne de commande',
          testo:
            '**Canal local** désactivé par défaut : activé, la commande `regi` et les scripts ' +
            'peuvent parler au registre. **Autoriser la lecture** et **Autoriser l’écriture** ' +
            'disent ce qu’ils peuvent faire, et restent suspendus tant que le canal est ' +
            'désactivé.',
        },
        {
          termine: 'Les années récentes',
          testo:
            'Elles ne sont pas dans les paramètres : elles sont dans le menu **Fichier**, sous ' +
            'l’entrée de l’année en bas à droite dans la barre d’état et dans l’écran ' +
            'd’accueil, avec **Ouvrir une année…** ; le clic droit sur une ligne met ou retire ' +
            'l’étoile. Restent les douze ouvertes le plus récemment, plus celles qui ont ' +
            'l’étoile.',
        },
      ],
      note: [
        'Les paramètres sont dans `impostazioni.json` et les années récentes dans ' +
          '`documenti.json`, dans le dossier des données du programme. Dans la version ' +
          'portable, ce dossier est « Regiclass - dati », à côté de l’exécutable, et ' +
          'part avec lui.',
        'La section du canal se lit avant de cocher : activé, n’importe quel programme qui ' +
          'tourne avec ton accès peut lire les données des personnes sans demander. On ' +
          'l’active le temps qu’il faut, et on le désactive.',
      ],
    },
    impostazioniAnno: {
      titolo: 'Les paramètres de l’année',
      sommario:
        'Les sections avec la pastille **fichier** : ce qui est dans le fichier de l’année et ' +
        'vaut pour quiconque l’ouvre.',
      scritte: {
        primoSemestre: '1er semestre',
        secondoSemestre: '2e semestre',
        inizioPrimo: 'début 1er',
        finePrimo: 'fin 1er · le 2e dès le lendemain',
        fineSecondo: 'fin 2e',
        vacanza: 'vacances',
        unitaDidattica: Uno(FR.unitaDidattica),
        unaUd: '1 pér. = 45 min',
        pause: Molti(FR.pausa),
        primaConOrario: 'la 1re avec l’heure',
        inizioEFine: 'Début et fin',
        sullaGriglia: 'sur la grille',
        giorni: 'Jours',
        lunVen: 'lun–ven',
        portaAlle: 'Mettre à 08:15',
        pranzo: 'midi',
        udIntere: '7 périodes entières',
        avanzi: '2 restes',
        nonFannoUnUd: 'minutes qui ne font pas une période',
      },
      figure: [
        {
          didascalia:
            'L’année vue depuis Paramètres › Année et horaire › **Année scolaire** : deux ' +
            'semestres, les jours sans cours, les semaines A et B. Les vacances ne consomment ' +
            'pas le tour : après une A terminée, la B reprend.',
          legenda: [
            'Trois dates suffisent : début du 1er, fin du 1er, fin du 2e.',
            'Un jour sans cours : la génération depuis l’horaire le saute.',
            'La semaine marquée à partir de laquelle **Alterner** remplit le reste.',
          ],
        },
        {
          didascalia:
            'Paramètres › Année et horaire › **Calendrier** : quatre étapes, dans l’ordre où les ' +
            'mesures dépendent les unes des autres. Sous la troisième, la journée dessinée ' +
            'période par période : ici avec des périodes de 45 minutes, la récréation à 09:45 ' +
            'et le repas de midi deux périodes plus tard.',
          legenda: [
            'Combien dure une période, et combien de périodes une nouvelle leçon.',
            'Les pauses : la première avec l’heure, les autres à combien de périodes de la ' +
              'précédente.',
            'La première et la dernière heure affichées, avec **Mettre à …** quand elles ne sont ' +
              'pas sur la grille.',
            'Les jours que le calendrier et la projection affichent.',
            'Un reste : la journée commence à 08:00, et la première période entière avant la ' +
              'récréation à 08:15. **Mettre à 08:15** le supprime.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Année scolaire',
          testo:
            'La carte de l’année avec **Modifier** — la même chose que « Modifier l’année », qui ' +
            'se trouve aussi avec `Ctrl+K` — : nom, dates et noms des deux semestres, et à côté ' +
            'de chacun, combien d’évaluations y tombent. Dessous, **Ouvrir une année…** et ' +
            '**Nouvelle année** ; sans année, **Créer l’année scolaire**.',
        },
        {
          termine: 'Jours sans cours',
          testo:
            'Vacances et fermetures : **Ajouter** — ou **Ajouter les vacances**, quand il n’y a ' +
            'encore rien —, le crayon et la corbeille ; aussi depuis la recherche, « Vacances ' +
            'et interruptions ». La génération depuis l’horaire saute ces jours, et dans le ' +
            'calendrier ils s’éteignent. En enregistrant une nouvelle fermeture, les leçons ' +
            'encore intactes qui y tombent disparaissent dans le même geste ; celles qui ont ' +
            'l’appel, des textes ou des notes restent, et le message le dit.',
        },
        {
          termine: 'Les vacances habituelles',
          testo:
            'Dans le formulaire des fermetures, à côté de **Ajouter une interruption**, un clic ' +
            'pour chacune : **Vacances d’automne**, **de Noël**, **de carnaval**, **de ' +
            'Pâques**, **Journée d’établissement**. Elles arrivent à la période où elles tombent ' +
            'd’habitude : on corrige les dates.',
        },
        {
          termine: 'Le calendrier officiel',
          testo:
            'Le registre apporte le calendrier scolaire du Tessin : début et fin des cours, ' +
            'vacances et jours fériés. Une nouvelle année se choisit parmi celles du calendrier ' +
            '— depuis l’écran d’accueil, depuis « Nouvelle année scolaire » ou dans la liste ' +
            '**Année scolaire** en haut du formulaire, qui à l’ouverture a déjà choisi l’année ' +
            'en cours — et vacances et jours fériés arrivent avec elle, liés : ce qui ne sert ' +
            'pas se retire des interruptions. Dans le formulaire de l’année et dans celui des ' +
            'fermetures, une case pour chaque entrée que l’année n’a pas — à ajouter, avec des ' +
            'dates différentes, ou déjà écrite à la main et à lier —, et **Importer les entrées ' +
            'choisies**. Les fermetures importées restent liées : si une nouvelle version en ' +
            'corrige les dates, la carte de l’année le dit.',
        },
        {
          termine: 'Types de semaine',
          testo:
            'Là où l’horaire tourne par alternance : toutes les semaines dans une grille, ' +
            'chacune avec un bouton par type. Les types — A et B au départ — sont la liste ' +
            '**Types de semaine** de Paramètres › Listes : une entrée ajoutée apparaît ici. ' +
            '**Alterner** remplit l’année depuis la première semaine marquée en parcourant la ' +
            'liste dans son ordre, **Vider** retire tous les types — l’horaire et les leçons ' +
            'ne sont pas touchés. Un type retiré de la liste reste, en pointillé, sur les ' +
            'semaines qui l’avaient, jusqu’à ce qu’on le retire.',
        },
        {
          termine: 'La journée, en quatre étapes',
          testo:
            'Dans Année et horaire › **Calendrier**, quatre cartes numérotées dans l’ordre où ' +
            'les mesures dépendent les unes des autres : la période, les pauses, le début et la ' +
            'fin, les jours. Chaque champ s’enregistre dès qu’on le quitte. Les calendriers ' +
            'externes ont leur propre section à côté, **Calendriers ICS**.',
        },
        {
          termine: '1 · La période',
          testo:
            '**Durée d’une période (minutes)** : combien dure une période dans ton école, de ' +
            `${LIMITI_UD.minimo} à ${LIMITI_UD.massimo} minutes, ${LIMITI_UD.predefinita} par ` +
            'défaut. C’est le pas de tout le reste : les plages de l’horaire en sont des ' +
            'multiples, les pauses après la première se comptent en périodes, l’appel a une ' +
            `case par période. À côté, **${Uno(FR.fascia)} d’une nouvelle leçon (périodes)** : ` +
            'combien de périodes dure d’habitude une nouvelle leçon. Dessous, deux pastilles ' +
            'font le calcul en minutes.',
        },
        {
          termine: 'Changer la durée de la période',
          testo:
            'Avec des plages horaires ou des leçons déjà au calendrier, le registre demande ' +
            'd’abord confirmation : elles gardent leur nombre de périodes, pas les minutes — ' +
            'une leçon de deux périodes, avec des périodes de 50, dure une heure quarante —, et ' +
            'les pauses après la première se déplacent avec elles. Une leçon qui sortirait de la ' +
            'journée reste comme elle était, et un avertissement le dit. Dès qu’une leçon a ' +
            'l’appel, la durée est **fixée** : le champ s’éteint, et dessous il y a le pourquoi.',
        },
        {
          termine: '2 · Les pauses de la journée',
          testo:
            'La récréation, le repas de midi. **Ajouter la première pause** la propose deux ' +
            'périodes après la première heure affichée. La **première pause** se déclare avec le ' +
            '**Début** et la **Durée (minutes)** ; les autres avec le nombre de périodes ' +
            '**après** la fin de la précédente — l’étiquette dit combien dure la période du ' +
            'document —, ainsi entre deux pauses il y a toujours des périodes entières. À côté ' +
            'de chacune, l’horaire qui en résulte ; **Ajouter une pause** en met une autre à la ' +
            `fin, jusqu’à ${LIMITI_PAUSE.quante}.`,
        },
        {
          termine: 'Retirer une pause',
          testo:
            'La corbeille à côté du nom. En retirant la première, la deuxième reste où elle est ' +
            'et prend son horaire ; en en retirant une au milieu, la suivante se compte depuis ' +
            'la précédente, et arrive plus tôt.',
        },
        {
          termine: 'Nouvelle pause',
          testo:
            'En bas de la carte des pauses, **Nouvelle pause (minutes)** : combien dure une ' +
            'pause qu’on vient d’ajouter, ici ou dans une leçon quand la journée n’en a pas. ' +
            'Ensuite on la corrige.',
        },
        {
          termine: 'Les leçons suivent les pauses',
          testo:
            'Dès lors le registre s’en occupe tout seul, chaque fois qu’une leçon naît ou bouge ' +
            '— créée, changée dans le formulaire, glissée, copiée, étirée par les poignées : les ' +
            'périodes s’arrêtent où commence une pause et reprennent où elle finit, et restent ' +
            'aussi nombreuses. Une leçon nouvelle ou déposée à un endroit du calendrier ' +
            's’accroche aussi à la grille des pauses. Dans le formulaire de la leçon, c’est la ' +
            'case **Suit les pauses de la journée** qui le dit, toujours cochée ; décochée, ' +
            'la leçon redevient comme elle était et les plages s’écrivent à la main. Quand on ' +
            'change les pauses, les leçons déjà inscrites sur lesquelles elles tombent se ' +
            'coupent et se déplacent aussitôt, avec les mêmes périodes, et un avertissement les ' +
            'compte ; les autres restent comme elles sont.',
        },
        {
          termine: '3 · Début et fin de la journée',
          testo:
            '**Première heure affichée** et **Dernière heure affichée** : de quelle heure à ' +
            'quelle heure le calendrier montre la semaine, la même toute l’année. Avec des ' +
            'pauses déclarées, mieux vaut les choisir sur la grille : quand un horaire n’y est ' +
            'pas, sous le champ apparaît **Mettre à …**, qui le déplace à l’heure la plus proche ' +
            'à partir de laquelle les périodes tombent entières — pour le début — ou à laquelle ' +
            'une période finit entière, pour la fin.',
        },
        {
          termine: 'La journée dessinée',
          testo:
            'Sous les deux horaires, la journée période par période : les périodes numérotées, ' +
            'les pauses, et à la fin combien de périodes entières y tiennent. Un **reste**, ce ' +
            'sont des minutes qui ne font pas une période : le début ou la fin ne sont pas sur ' +
            'la grille des pauses. Ce n’est pas une erreur — le calendrier s’affiche quand même ' +
            '—, mais une leçon qui tombe dessus commence décalée. En s’arrêtant sur un tronçon, ' +
            'on en lit l’horaire et la durée.',
        },
        {
          termine: '4 · Jours affichés',
          testo:
            'Un bouton par jour : ils valent pour le calendrier et pour la projection, et au ' +
            'moins un reste activé. C’est ici qu’on active le samedi et le dimanche.',
        },
        {
          termine: 'Barème',
          testo:
            'Dans Enseignement › **Évaluation** : minimum, maximum, note suffisante et pas. Ce ' +
            'sont les valeurs **proposées** à une nouvelle évaluation, qui peut ensuite avoir ' +
            'les siennes.',
        },
        {
          termine: 'Note semestrielle et absences',
          testo:
            '**Pas de la note semestrielle** : l’arrondi de la moyenne, d’habitude plus large — ' +
            '0,5 pour les demi-points, 0 pour ne pas arrondir. **Signaler l’absence au-delà de** ' +
            ': le pourcentage d’absences, cours par cours, au-delà duquel une personne apparaît ' +
            `parmi les ${FR.pendenza.plurale} ; 0 veut dire jamais.`,
        },
        {
          termine: 'Branches',
          testo:
            '**Nouvelle branche**, avec sigle et couleur ; à côté de chacune, combien de classes, ' +
            'de cours et de plans y sont rattachés. Deux branches nées de la même chose se ' +
            'fusionnent ; en supprimer une demande d’abord confirmation, et dit ce qui part avec ' +
            'elle.',
        },
        {
          termine: 'Listes',
          testo:
            'Les entrées des listes déroulantes, un onglet par liste : types d’activité et ' +
            'd’épreuve, façons de travailler de la classe, supports, aspects observés. On les ' +
            'renomme et on les réordonne ; là où la valeur est un texte libre, on en ajoute et ' +
            'on en retire. Chaque type d’activité a aussi sa **Couleur** : c’est le liseré de ' +
            'l’étape dans le déroulement, dans le registre de la leçon et sur l’écran en classe. ' +
            '**Remettre les entrées d’origine** revient au début, couleurs comprises.',
        },
        {
          termine: 'En-tête',
          testo:
            'Dans Documents et impression › **En-tête** : pour chaque papier à en-tête le **Nom ' +
            'de l’école**, le logo et sa **Hauteur du logo (mm)**, et dessous **Qui signe**. Ils ' +
            'vont sur chaque feuille, et sont dans le document. Le logo se charge, se remplace ' +
            'et se retire avec **Charger le logo…**, **Remplacer…** et **Retirer**. La ' +
            'signature des e-mails est aussi dans le fichier, mais elle s’écrit dans ' +
            '**Communications**.',
        },
        {
          termine: 'Ce fichier',
          testo:
            'Dans Documents et impression › **Ce fichier**, la carte **Document et données** : ' +
            'quel fichier est ouvert et où, ce qu’il contient, et si les références entre ' +
            'classes, leçons, plans et évaluations tiennent. **Ouvrir un autre registre…**, ' +
            '**Afficher dans le dossier**, **Recharger** ; une année pas encore enregistrée a ' +
            'ici **Enregistrer l’année sous…**.',
        },
        {
          termine: 'Références qui ne tiennent pas',
          testo:
            'Quand quelque chose ne tient pas, une ligne d’avertissement dit « N références ne ' +
            'tiennent pas : … », avec **Réparer** si le registre sait y remédier tout seul. ' +
            '**Détails** mène droit à Documents et impression › **Ce fichier**, où elles sont ' +
            'listées.',
        },
      ],
      note: [
        'Ici chaque champ s’enregistre dès qu’on le quitte, et vaut pour quiconque ouvre le ' +
          'fichier — même dans deux ans. Si le registre corrige une valeur impossible, la ' +
          'notification dit « corrigés : … » au lieu de « enregistrés ».',
        'Les types d’activité et d’épreuve se renomment mais ne s’inventent pas : ils ' +
          'décident des champs que demande une étape du plan. La couleur d’un type, elle, ' +
          'n’est que ce qu’on voit, et la changer reteint chaque étape de ce type, même dans ' +
          'les plans déjà faits. En retirant une entrée d’une liste, ce qui l’avait choisie ' +
          'reste comme c’était.',
      ],
    },
    posta: {
      titolo: 'Messagerie',
      sommario:
        'Paramètres › **Communications** : depuis quelle boîte partent les e-mails, s’ils ' +
        'partent tout seuls, et avec quelle signature.',
      scritte: {
        collega: 'Connecter la boîte',
        chiedeIndirizzo: 'demande l’adresse',
        accessoNelBrowser: 'dans le navigateur',
        portachiavi: 'Trousseau',
        gettone: 'le jeton',
        porta: 'port 587',
        comunicazione: 'Communication',
        daMandare: 'à envoyer',
        parte: 'Part du registre',
        parteQuando: 'boîte connectée + sans brouillon',
        fileEml: 'Fichier .eml',
        fileEmlQuando: 'à relire, envoyer à la main',
      },
      figure: [
        {
          didascalia:
            'En haut, comment on connecte une boîte ; en bas, où va une communication. Le ' +
            'sous-titre de la carte **Messagerie** dit lequel des deux chemins vaut maintenant.',
          legenda: [
            '**Connecter la boîte** : n’enregistre que si le serveur accepte. Ensuite il devient ' +
              '**Reconnecter la boîte**.',
            'Dans le trousseau du système, pas dans les paramètres : `impostazioni.json` est un ' +
              'fichier en clair.',
            'Avec la boîte connectée et **Envoyer sans brouillon** activé : il demande ' +
              'confirmation, puis envoie.',
            'Dans tous les autres cas : le programme de messagerie ouvre le brouillon à relire.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Adresse de l’expéditeur et nom d’utilisateur',
          testo:
            '**Adresse de l’expéditeur** : celle que les familles voient dans « De ». **Nom ' +
            'd’utilisateur** : le nom avec lequel on se connecte, dans les écoles souvent un ' +
            'sigle comme `xxx000@edu.ti.ch`. Vide, l’un vaut l’autre ; quand ils sont ' +
            'différents, la carte les montre tous les deux.',
        },
        {
          termine: 'Tester la connexion',
          testo:
            'Frappe à la boîte, se fait dire à qui elle est, et n’envoie rien. La réponse reste ' +
            'écrite sous les boutons pendant qu’on corrige les paramètres.',
        },
        {
          termine: 'Envoyer un test',
          testo:
            'N’existe qu’avec la boîte connectée. Envoie un vrai e-mail à l’adresse que tu ' +
            'écris — d’habitude la tienne. C’est le seul moyen de voir si l’autorisation ' +
            'd’envoyer existe et si la signature arrive telle qu’elle est écrite.',
        },
        {
          termine: 'Depuis la recherche',
          testo:
            'Les mêmes gestes sont dans la recherche (Ctrl+K) : **Connecter le ' +
            'courrier**, **Tester le courrier**, **Envoyer un e-mail de test**, ' +
            '**Déconnecter le courrier**. Sans boîte connectée, les trois derniers sont ' +
            'éteints.',
        },
        {
          termine: 'Envoyer sans brouillon',
          testo:
            'Sous « Quand ça part ». Activé, les communications partent du registre au lieu de ' +
            'devenir des brouillons ; avant chaque envoi le registre demande confirmation. Sans ' +
            'boîte connectée, il n’a pas d’effet.',
        },
        {
          termine: 'La signature',
          testo:
            'Elle va à la fin des e-mails qu’envoie le registre — communications, demandes aux ' +
            `${FR.azienda.plurale}, documents à une ${FR.pif.singolare} — ; les brouillons ` +
            '`.eml` partent sans, parce que c’est le programme de messagerie qui met la ' +
            'signature. Elle s’écrit dans la carte **Signature des e-mails**, sous la ' +
            'messagerie, comme dans un programme de messagerie : gras, italique, souligné, trois ' +
            'tailles, la couleur, les liens. On peut en coller une depuis Outlook, et les ' +
            'couleurs restent. Laissée vide, c’est la signature par défaut qui vaut, affichée en ' +
            'gris : qui signe et l’école du premier papier à en-tête, depuis l’**En-tête**.',
        },
        {
          termine: 'La signature est dans le fichier',
          testo:
            'La carte porte la pastille **fichier** : la signature s’enregistre dans le fichier ' +
            'de l’année, pas sur cet ordinateur, et en ouvrant l’année ailleurs on la retrouve.',
        },
        {
          termine: 'Déconnecter',
          testo:
            'Retire du trousseau le jeton de Microsoft, et on revient aux fichiers `.eml`. ' +
            'L’autorisation donnée au programme se révoque depuis son propre profil Microsoft.',
        },
      ],
      note: [
        'Le registre demande à Microsoft la seule autorisation d’envoyer, pas celle de lire la ' +
          'boîte. Le prix : pas de brouillons sur le serveur et pas de copie dans « Éléments ' +
          'envoyés ».',
        'Si la connexion à Microsoft réussit mais que le serveur refuse, il se peut que ' +
          'l’école garde désactivé l’envoi authentifié (SMTP AUTH) sur la boîte : c’est ' +
          'l’administrateur qui le réactive. Adresse de l’expéditeur et nom d’utilisateur ' +
          'inversés donnent en revanche `5.7.60` : l’autorisation d’envoyer en tant qu’un autre.',
      ],
    },
    aggiornamenti: {
      titolo: 'Mises à jour',
      sommario:
        'Quelle version tourne, s’il y en a une nouvelle, et quand elle s’installe.',
      scritte: {
        controllo: 'Vérification',
        chiedeGithub: 'demande à GitHub',
        disponibile: 'Disponible',
        ceLaNuova: 'la nouvelle est là',
        scarico: 'Téléchargement',
        barraDeiMb: 'barre des Mo',
        pronta: 'Prête',
        aspettaUscita: 'attend la sortie',
        installata: 'Installée',
        versioneNuova: 'nouvelle version',
        controllaAdesso: 'Vérifier maintenant',
        riavvia: 'Redémarrer et mettre à jour',
        barraTitolo: 'la barre de titre',
        file: 'Fichier ▾',
        percorso: '2026-2027 › Calendrier › lun 14 sept',
        ceLa: 'la 1.7.0 est sortie',
        barraFondo: 'la barre du bas',
        benvenutoFondo: 'l’écran d’accueil, en bas',
        versione: 'Version 1.6.0',
        eLUltima: 'c’est la dernière',
      },
      figure: [
        {
          didascalia:
            'Le parcours d’une nouvelle version. Chaque étape, l’une des trois cases la fait ' +
            'toute seule ; désactivée, c’est le bouton dessous qui la fait.',
          legenda: [
            '**Chercher les nouvelles versions** : une demi-minute après le démarrage, puis ' +
              'toutes les six heures.',
            '**Télécharger tout de suite la nouvelle version** : dès qu’elle est trouvée, sans ' +
              'demander.',
            '**Installer en quittant le registre** : à la prochaine sortie du registre.',
          ],
        },
        {
          didascalia:
            'Où l’on voit où en sont les mises à jour. Les mots sont partout les mêmes : la ' +
            'pastille de la section, le bandeau, l’entrée en bas, l’écran d’accueil et la ' +
            'notification « prête » les prennent au même endroit.',
          legenda: [
            'Le bandeau : il n’apparaît que quand une nouvelle version est sortie. La nouvelle ' +
              'en deux mots — un clic mène ici —, le geste qui a du sens maintenant, et la ✕ ' +
              'qui le masque jusqu’à la nouvelle suivante. Pendant le téléchargement, un fil le ' +
              'long du bord dit où il en est.',
            'L’entrée de la barre du bas, elle aussi seulement avec une nouvelle version : un ' +
              'clic mène ici.',
            'L’écran d’accueil, sans ouvrir d’année : à côté de la version, la pastille et le ' +
              'geste. Quand il y a une nouvelle version, il a lui aussi le bandeau, en haut.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Où',
          testo:
            'Paramètres › Programme › **Mises à jour**. La carte « Version … » dit dans une ' +
            'pastille où on en est — « c’est la dernière », « la 1.7.0 est sortie », ' +
            '« téléchargement de la 1.7.0 : 40 % », « 1.7.0 prête », « vérification échouée » ' +
            '— ; dessous, la phrase entière et un seul bouton, celui du geste qui a du sens ' +
            'maintenant. Les trois cases sont sous la carte, dans le groupe « Nouvelles ' +
            'versions ».',
        },
        {
          termine: 'Le bandeau dans la barre de titre',
          testo:
            'Quand une nouvelle version est sortie, à droite dans la barre de titre apparaît un ' +
            'bandeau fin : la nouvelle en deux mots, **Télécharger** ou **Redémarrer et mettre ' +
            'à jour**, et la ✕. Fermé, il ne revient qu’avec la nouvelle suivante — la même ' +
            'version, prête. Les deux mots mènent ici, où il y a la phrase entière et les notes ' +
            'de version.',
        },
        {
          termine: 'Dans l’écran d’accueil',
          testo:
            'Même sans année ouverte : en bas, à côté de la version, la pastille avec l’état et ' +
            'le bouton du geste, par exemple **Vérifier maintenant**. Quand il y a une nouvelle ' +
            'version, le geste monte dans le bandeau en haut, avec la phrase entière.',
        },
        {
          termine: 'Tout seul',
          testo:
            'Par défaut, les trois cases sont activées : on vérifie, on télécharge et on ' +
            'installe à la sortie sans questions. Quand une version est prête, une notification ' +
            'arrive, même avec la fenêtre fermée.',
        },
        {
          termine: 'À la main',
          testo:
            '**Vérifier maintenant**, **Télécharger** — avec la barre des Mo sous la phrase —, ' +
            '**Redémarrer et mettre à jour**, qui demande confirmation : c’est le seul geste qui ' +
            'ferme le registre. « Ce qui change dans la … », replié sous la phrase, montre les ' +
            'notes de version.',
        },
        {
          termine: 'À quelle fréquence',
          testo:
            'Cela ne se règle pas : avec **Chercher les nouvelles versions** activé, la première ' +
            'vérification a lieu une demi-minute après le démarrage, puis toutes les six heures, ' +
            'même pour le registre qui reste allumé près de l’horloge pendant des jours. Qui ne ' +
            'veut pas attendre appuie sur **Vérifier maintenant**.',
        },
        {
          termine: 'Ce qui sort',
          testo:
            'La vérification demande seulement à GitHub quelle est la dernière version publiée ; ' +
            'rien du registre ne sort de l’ordinateur.',
        },
        {
          termine: 'Quand il ne se met pas à jour tout seul',
          testo:
            'Seule la version installée sous Windows se met à jour toute seule. La version ' +
            'portable et les autres systèmes disent « mise à jour à la main », la raison et ' +
            '**Ouvrir les versions publiées** : on télécharge à la main et on la met à la place de ' +
            'l’ancienne.',
        },
        {
          termine: 'Si ça ne marche pas',
          testo:
            'La pastille dit « vérification échouée » et la phrase la raison en clair : GitHub ' +
            'qui ne répond pas, par exemple, on réessaie à la vérification suivante. Un ' +
            'téléchargement interrompu garde la version trouvée, le dit à la fin de la phrase, ' +
            'et **Télécharger** réessaie.',
        },
      ],
      note: [
        'Installer veut dire fermer : le registre enregistre, quitte, et une fenêtre à ses ' +
          'couleurs montre la mise à jour pendant que le programme se remplace dans le même ' +
          'dossier. Avec **Redémarrer et mettre à jour** il se rouvre tout seul ; installée à ' +
          'la sortie, tu la trouves nouvelle la prochaine fois que tu l’ouvres. Le fichier de ' +
          'l’année n’est pas touché, et un installateur qui ne correspond pas à celui publié ' +
          'est écarté.',
        'Sur une connexion limitée, on désactive **Télécharger tout de suite la nouvelle ' +
          'version** : le registre dit qu’il y a une nouvelle version et attend ' +
          '**Télécharger**.',
      ],
    },
  },
  en: {
    impostazioni: {
      titolo: 'Settings',
      sommario:
        'One page, two worlds: what stays on this computer and what travels inside the ' +
        'year’s file.',
      scritte: {
        titolo: 'Settings',
        anno: 'Year and timetable',
        didattica: 'Teaching',
        liste: 'Lists',
        documenti: 'Documents and printing',
        comunicazioni: 'Communications',
        programma: 'Program',
        generale: 'General',
        aggiornamentiUno: 'Updates 1',
        modelli: 'Language models',
        condotto: 'Pipe and command line',
        filtro: 'Filter settings by name, key or description…',
        aggiornamenti: 'Updates',
        ripristina: 'Reset (1)',
        scaricaSubito: 'Download the new version right away',
        modificata: 'changed · was: on',
        ritira: 'Revert',
        questoComputer: 'This computer',
        cartellaDati: 'the program’s data folder',
        tema: 'theme',
        avvio: 'start-up',
        promemoria: 'reminder',
        posta: 'mail',
        recapiti: 'contacts',
        modelliLinguistici: 'language models',
        assistente: 'assistant',
        aggiornamentiVoce: 'updates',
        condottoVoce: 'pipe',
        anniRecenti: 'recent years',
        fileAnno: 'The year’s file',
        file: 'file',
        annoESemestri: 'year and semesters',
        chiusure: 'closures',
        tipiSettimana: 'week types',
        giornata: 'school day',
        calendariIcs: 'ICS calendars',
        scalaVoti: 'grading scale',
        materie: 'subjects',
        listeVoce: 'lists',
        intestazione: 'letterhead',
        firma: 'signature',
        restaQui: 'stays on this computer',
        viaggia: 'travels with the file',
      },
      figure: [
        {
          didascalia:
            'The Settings page: at the top the band with the groups and, below, the sections of ' +
            'the chosen one; when you scroll it stays stuck at the top. Below the band the open ' +
            'section, where every row says whether the value is the factory one or one you ' +
            'chose.',
          legenda: [
            'The six groups, by topic: from the school year to the program.',
            'The sections of the chosen group. The number next to the name counts the values ' +
              'set by hand; the sections that live in the year’s file carry the **file** badge ' +
              'instead.',
            'The filter: it searches name, key and description, among the computer’s settings.',
            'The badge says what it was changed from; **Revert** goes back to the default.',
            '**Reset** reverts the whole section, after a confirmation.',
          ],
        },
        {
          didascalia:
            'Where each value ends up. Opening the same year on another computer you find the ' +
            'school day, the grades, the subjects, the letterhead and the signature again, but ' +
            'the theme, the mail and the language models of that computer apply.',
        },
      ],
      voci: [
        {
          termine: 'Opening them',
          tasti: 'Ctrl+,',
          testo:
            'Or from the sidebar, or from the search (Ctrl+K). With no year open the page is not ' +
            'there: in the application’s **Register** menu, **Program settings…** opens a ' +
            'separate window with this computer’s settings and the **Open in the register** ' +
            'button.',
        },
        {
          termine: 'The band at the top',
          testo:
            'Under the title, two rows that stay stuck at the top when you scroll: the groups, ' +
            'and the sections of the chosen one. Clicking a group opens its first section. ' +
            '**Lists** and **Communications** have one section only, and the second row is ' +
            'not there.',
        },
        {
          termine: 'Where things are',
          testo:
            '**Year and timetable**: School year, Calendar, ICS calendars. **Teaching**: ' +
            'Subjects, Assessment. **Lists**: the items of the drop-downs. **Documents and ' +
            'printing**: Letterhead, This file. **Communications**: the mail and the signature. ' +
            '**Program**: General, Updates, Language models, Pipe and command line. In this ' +
            'guide a place is written like this: Settings › Year and timetable › Calendar.',
        },
        {
          termine: 'The “file” badge',
          testo:
            'The sections with **file** next to their name live inside the file of the open ' +
            'year and travel with it: all those of Year and timetable, Teaching, Lists and ' +
            'Documents and printing, plus the **Email signature** card. The others stay on this ' +
            'computer and apply to every year.',
        },
        {
          termine: 'The number next to a section',
          testo:
            'Only on the computer’s sections: how many values have been set by hand. Opening ' +
            'the settings after months, it tells you where you had changed something.',
        },
        {
          termine: 'Finding a setting',
          testo:
            'At the top of each computer section: “Filter settings by name, key or ' +
            'description…”. The results gather under the name of their section, and in the band ' +
            'none stays chosen; choosing a section or a group empties the filter. The year’s ' +
            'settings cannot be filtered.',
        },
        {
          termine: 'Changed or default',
          testo:
            'Every row carries a badge: “default: …”, or “changed · was: …”, which also gives ' +
            'the factory value. **Revert** on a row takes it back there; **Reset** does it for ' +
            'the whole section, and does not touch the year’s file.',
        },
        {
          termine: 'Suspended',
          testo:
            'A grey row with “suspended · … is off” depends on a switch that is off above it: it ' +
            'shows as off and cannot be changed. The value written stays, and comes back when ' +
            'you turn the switch on again.',
        },
        {
          termine: 'Won’t start',
          testo:
            'The assistant and scan reading cannot be turned on while their model is missing: ' +
            'the box stays off, with “won’t start” and what is missing next to it. Choose the ' +
            'model at the top of Settings › Program › **Language models**, and the switch goes ' +
            'back to how it was. The same holds from the command line or the API: without a ' +
            'model, turning it on is refused, and removing the model turns the switch off.',
        },
        {
          termine: 'Programs already installed',
          testo:
            'A closed group at the bottom of **Language models**, with the number of items: ' +
            '**llama-mtmd-cli program** and **voicebox address**, which you rarely touch. It ' +
            'opens by itself if something inside has been changed.',
        },
        {
          termine: 'When they apply',
          testo:
            'They are saved as soon as you leave the field, and almost all apply at once. The ' +
            'icon next to the clock applies from the next start: it also decides what the ' +
            'windows’ X does.',
        },
      ],
      note: [
        'The question that decides where a value lives: opening this year on another ' +
          'computer, would you expect to find it there? Yes — the grading scale — and it is in ' +
          'the file. No — the theme, the mailbox — and it stays on the computer.',
        'Every computer row shows its key in small print, for example ' +
          '`registroDocenti.posta.mittente`: it is the one error messages quote, and typed ' +
          'into the filter it takes you straight to the row.',
      ],
    },
    impostazioniProgramma: {
      titolo: 'The program settings',
      sommario: 'What you set on this computer, section by section.',
      scritte: {
        accensione: 'PC switched on',
        partiConWindows: '“Start with Windows” on',
        lancio: 'Started by hand',
        partiSenza: '“Start without…” on',
        senzaFinestra: 'Starts with no window',
        icona: 'The icon',
        quandoLaChiedi: 'the window, when you ask',
        finestraAperta: 'Window open',
        seNonCe: 'if there is no icon',
        sistema: 'System',
        sistemaAdesso: 'now: light, like Windows',
        chiaro: 'Light',
        chiaroSempre: 'always, even at night',
        scuro: 'Dark',
        scuroSempre: 'always, even by day',
        daTastiera: 'By keyboard, on the cards:',
      },
      figure: [
        {
          didascalia:
            'Starting up and opening are two different questions, in the “Start-up” group of ' +
            '**General**. Both lead to a register that is running but has no window.',
          legenda: [
            '**Start with Windows**: starts the register with the computer, without windows. ' +
              'In the portable version too.',
            '**Start without opening the register**: no window even when you launch it by hand.',
            'The safety net: if nothing is left to click, the window opens anyway.',
          ],
        },
        {
          didascalia:
            'The theme is not chosen from a drop-down: three cards, each with the register in ' +
            'small as it looks in that theme. The same choice is in the **Program settings…** ' +
            'window.',
          legenda: [
            '**System**: half light and half dark, because it follows Windows and changes along ' +
              'with it.',
            'Only under System, when it is the choice: what it is following right now. It ' +
              'changes by itself when Windows changes.',
            'The arrows move to the next card and choose it at once; from the last one you go ' +
              'back to the first.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The language',
          testo:
            'At the top of Settings › Program › **General**, before the theme, the **Language** ' +
            'cards. **System**, the default, speaks the language of Windows if the register ' +
            'knows it, and Italian otherwise; or you choose by hand among Italiano, Deutsch, ' +
            'Français and English: each with its flag and written in its own language, so you ' +
            'can find it even in a register speaking a language you cannot read. When you change it, the ' +
            'register’s windows reload and come back in the new language. What is already ' +
            'written in the document — names, notes, lesson titles — stays as it is: it is not ' +
            'translated. The same choice is in the **Program settings…** window.',
        },
        {
          termine: 'The theme',
          testo:
            'At the top of Settings › Program › **General**: **System**, **Light** or ' +
            '**Dark**, with a click on the card. It applies to the register, to the class ' +
            'screen and to the settings window. **Light** is the easiest to read when ' +
            'projected.',
        },
        {
          termine: 'The icon and start-up',
          testo:
            'Also in **General**. **Icon next to the clock** and, below it, **The X leaves the ' +
            'register in the icon**: when on, closing the last window does not quit. Then ' +
            '**Start with Windows** and **Start without opening the register**: when on, the ' +
            'program starts with just the icon.',
        },
        {
          termine: 'Reminder and projection',
          testo:
            'Still in **General**. **Reminder before the lesson** is a notification with the ' +
            'class and what is still open; clicked, it opens that lesson. **Minutes in ' +
            'advance**: five by default. **Full-screen projection** puts the projection in full ' +
            'screen as soon as it opens.',
        },
        {
          termine: 'Communications',
          testo:
            'At the top the **Mail** card, with the steps for the mailbox, and the **Email ' +
            'signature** — see the **Mail** section of this guide. Below, in the “Calls and ' +
            'emails from the personal details” group, what happens when you click a number or an ' +
            'address. **Calls**: the Windows program (`tel:`), Teams, Skype or none. ' +
            '**Email**: the default program, Outlook, Outlook on the web or none. “None” leaves ' +
            'the contact address only to be read and copied.',
        },
        {
          termine: 'Updates',
          testo:
            'At the top the “Version …” card, with the sentence and the step that makes sense ' +
            'now — checking, downloading, installing —, and below it the three boxes. It is all ' +
            'in the **Updates** section of this guide.',
        },
        {
          termine: 'Language models',
          testo:
            'At the top, who answers for each job and the files on the computer — downloading ' +
            'them, choosing them, removing them —; below, the **Models folder** and the ' +
            'switches **Reading scans**, **Assistant** and **Dictation**, off by default, with ' +
            'the dictation’s **Voice model**.',
        },
        {
          termine: 'Download missing programs automatically',
          testo:
            'In the “Folder and downloads” group of **Language models**, on by default: the ' +
            'first time it is needed, the register downloads by itself the program that reads ' +
            'scans. Off — on a metered connection —, you point to it by hand in ' +
            '**llama-mtmd-cli program**. The models are downloaded separately, and dictation is ' +
            'not involved.',
        },
        {
          termine: 'A program you already have',
          testo:
            'At the bottom of **Language models**, closed. **llama-mtmd-cli program**: a copy ' +
            'of `llama-mtmd-cli.exe` you already have, and it wins over the register’s own. ' +
            '**voicebox address**: change it only if voicebox runs on another port, and it must ' +
            'be on this computer. Both stay suspended while their switch is off.',
        },
        {
          termine: 'Pipe and command line',
          testo:
            '**Local pipe** is off by default: when on, the `regi` command and scripts can ' +
            'talk to the register. **Allow reading** and **Allow writing** say what they may ' +
            'do, and stay suspended while the pipe is off.',
        },
        {
          termine: 'Recent years',
          testo:
            'They are not among the settings: they are in the **File** menu, under the year ' +
            'item at the bottom right of the status bar and in the welcome screen, with **Open ' +
            'a year…**; right-clicking a row adds or removes the star. The twelve most recently ' +
            'opened stay, plus the starred ones.',
        },
      ],
      note: [
        'The settings live in `impostazioni.json` and the recent years in ' +
          '`documenti.json`, in the program’s data folder. In the portable version that ' +
          'folder is “Regiclass - dati”, next to the executable, and goes wherever it ' +
          'goes.',
        'Read the pipe section before ticking anything: when on, any program running with ' +
          'your account can read people’s data without asking. Turn it on for as long as you ' +
          'need, then off.',
      ],
    },
    impostazioniAnno: {
      titolo: 'The year settings',
      sommario:
        'The sections with the **file** badge: what lives inside the year’s file and applies ' +
        'to whoever opens it.',
      scritte: {
        primoSemestre: '1st semester',
        secondoSemestre: '2nd semester',
        inizioPrimo: 'start 1st',
        finePrimo: 'end 1st · 2nd from the next day',
        fineSecondo: 'end 2nd',
        vacanza: 'holiday',
        unitaDidattica: Uno(EN.unitaDidattica),
        unaUd: '1 period = 45 min',
        pause: Molti(EN.pausa),
        primaConOrario: 'the first with a time',
        inizioEFine: 'Start and end',
        sullaGriglia: 'on the grid',
        giorni: 'Days',
        lunVen: 'Mon–Fri',
        portaAlle: 'Move to 08:15',
        pranzo: 'lunch',
        udIntere: '7 whole periods',
        avanzi: '2 leftovers',
        nonFannoUnUd: 'minutes that do not make a period',
      },
      figure: [
        {
          didascalia:
            'The year as seen from Settings › Year and timetable › **School year**: two ' +
            'semesters, the days without lessons, weeks A and B. A holiday does not use up the ' +
            'rotation: after a finished A, B comes next.',
          legenda: [
            'Three dates are enough: start of the 1st, end of the 1st, end of the 2nd.',
            'A day without lessons: generating from the timetable skips it.',
            'The marked week from which **Rotate** fills in the rest.',
          ],
        },
        {
          didascalia:
            'Settings › Year and timetable › **Calendar**: four steps, in the order in which ' +
            'the measures depend on each other. Under the third, the day drawn period by ' +
            'period: here with 45-minute periods, the break at 09:45 and lunch two periods ' +
            'later.',
          legenda: [
            'How long a period lasts, and how many periods a new lesson.',
            'The breaks: the first with a time, the others by how many periods after the ' +
              'previous one.',
            'The first and last hour shown, with **Move to …** when they are not on the grid.',
            'The days the calendar and the projection show.',
            'A leftover: the day starts at 08:00, and the first whole period before the break ' +
              'at 08:15. **Move to 08:15** removes it.',
          ],
        },
      ],
      voci: [
        {
          termine: 'School year',
          testo:
            'The year card with **Edit** — the same as “Edit the year”, which you also find ' +
            'with `Ctrl+K` —: name, dates and names of the two semesters, and next to each one ' +
            'how many assessments fall into it. Below, **Open a year…** and **New year**; with ' +
            'no year, **Create the school year**.',
        },
        {
          termine: 'Days without lessons',
          testo:
            'Holidays and closures: **Add** — or **Add the holidays**, when there are none yet ' +
            '—, the pencil and the bin; also from the search, “Holidays and breaks”. Generating ' +
            'from the timetable skips those days, and in the calendar they are greyed out. When ' +
            'you save a new closure, the untouched lessons that fall inside it go in the same ' +
            'step; those with attendance, texts or grades stay, and the message says so.',
        },
        {
          termine: 'The usual holidays',
          testo:
            'In the closures form, next to **Add a break**, one click for each: **Autumn ' +
            'holidays**, **Christmas holidays**, **Carnival holidays**, **Easter holidays**, ' +
            '**In-service day**. They arrive at the time they usually fall: you correct the ' +
            'dates.',
        },
        {
          termine: 'The official calendar',
          testo:
            'The register carries the Ticino school calendar: start and end of lessons, ' +
            'holidays and public holidays. A new year is chosen from those of the calendar — ' +
            'from the welcome screen, from “New school year” or from the **School year** ' +
            'drop-down at the top of the form, which on opening has already chosen the current ' +
            'year — and holidays and public holidays come with it, linked: what you do not need ' +
            'you remove from the breaks. In the year form and in the closures form there is a ' +
            'box for each entry the year does not have — to be added, with different dates, or ' +
            'already written by hand and to be linked —, and **Import the chosen entries**. ' +
            'Imported closures stay linked: if a new version corrects their dates, the year ' +
            'card says so.',
        },
        {
          termine: 'Week types',
          testo:
            'Where the timetable rotates: every week in a grid, each with one button per type. ' +
            'The types — A and B to start with — are the **Week types** list in Settings › ' +
            'Lists: add an item there and it appears here. **Rotate** fills the year from the ' +
            'first marked week, going round the list in its order; **Clear** removes all the ' +
            'types — timetable and lessons are not touched. A type removed from the list stays, ' +
            'dashed, on the weeks that had it, until you remove it.',
        },
        {
          termine: 'The day, in four steps',
          testo:
            'In Year and timetable › **Calendar**, four numbered cards in the order in which the ' +
            'measures depend on each other: the period, the breaks, the start and the end, the ' +
            'days. Each field is saved as soon as you leave it. External calendars have their ' +
            'own section next to it, **ICS calendars**.',
        },
        {
          termine: '1 · The period',
          testo:
            '**Length of a period (minutes)**: how long a teaching period lasts at your school, ' +
            `from ${LIMITI_UD.minimo} to ${LIMITI_UD.massimo} minutes, ${LIMITI_UD.predefinita} by ` +
            'default. It is the step for everything else: the timetable’s slots are multiples ' +
            'of it, the breaks after the first are counted in periods, attendance has one box ' +
            `per period. Next to it, **${Uno(EN.fascia)} of a new lesson (periods)**: how many ` +
            'periods a new lesson usually lasts. Below, two badges do the sum in minutes.',
        },
        {
          termine: 'Changing the length of a period',
          testo:
            'With timetable slots or lessons already on the calendar, the register asks for ' +
            'confirmation first: they keep their number of periods, not their minutes — a ' +
            'two-period lesson, with 50-minute periods, becomes an hour and forty long —, and ' +
            'the breaks after the first move with them. A lesson that would run past the end of ' +
            'the day stays as it was, and a notice says so. As soon as a lesson has attendance ' +
            'the length is **fixed**: the field turns off, and the reason is written below it.',
        },
        {
          termine: '2 · The day’s breaks',
          testo:
            'Morning break, lunch. **Add the first break** proposes it two periods after the ' +
            'first hour shown. The **first break** is set with its **Start** and **Length ' +
            '(minutes)**; the others with how many periods they come **after** the end of the ' +
            'previous one — the label says how long the document’s period is —, so between two ' +
            'breaks there are always whole periods. Next to each one, the time that results; ' +
            `**Add a break** puts another at the end, up to ${LIMITI_PAUSE.quante}.`,
        },
        {
          termine: 'Removing a break',
          testo:
            'The bin next to the name. Removing the first, the second stays where it is and ' +
            'takes its time; removing one in the middle, the next is counted from the previous ' +
            'one, and comes earlier.',
        },
        {
          termine: 'New break',
          testo:
            'At the bottom of the breaks card, **New break (minutes)**: how long a break lasts ' +
            'when just added, here or inside a lesson when the day has none. Then you correct ' +
            'it.',
        },
        {
          termine: 'Lessons follow the breaks',
          testo:
            'From there the register sees to it by itself, every time a lesson is created or ' +
            'moves — created, changed in the form, dragged, copied, stretched by its handles: the ' +
            'periods stop where a break starts and resume where it ends, and there are as many ' +
            'as before. A lesson that is new or dropped on a spot in the calendar also snaps to ' +
            'the breaks grid. In the lesson form the **Follows the day’s breaks** box says so, ' +
            'always ticked; untick it and the lesson goes back to how it was and the slots are ' +
            'written by hand. When you change the breaks, lessons already written that they ' +
            'fall on are split and moved at once, with the same periods, and a notice counts ' +
            'them; the others stay as they are.',
        },
        {
          termine: '3 · Start and end of the day',
          testo:
            '**First hour shown** and **Last hour shown**: from what time to what time the ' +
            'calendar shows the week, the same all year. With breaks set, it pays to choose ' +
            'them on the grid: when a time does not fit, **Move to …** appears under the field, ' +
            'moving it to the nearest time from which the periods fall whole — for the start — ' +
            'or at which a period ends whole, for the end.',
        },
        {
          termine: 'The day drawn',
          testo:
            'Under the two times, the day period by period: the numbered periods, the breaks, ' +
            'and at the end how many whole periods fit. A **leftover** is minutes that do not ' +
            'make a period: the start or the end is not on the breaks grid. It is not an error ' +
            '— the calendar shows anyway —, but a lesson that falls on it starts out of step. ' +
            'Hovering over a stretch shows its time and length.',
        },
        {
          termine: '4 · Days shown',
          testo:
            'One button per day: they apply to the calendar and to the projection, and at least ' +
            'one stays on. This is where you turn on Saturday and Sunday.',
        },
        {
          termine: 'Grading scale',
          testo:
            'In Teaching › **Assessment**: minimum, maximum, pass mark and step. They are the ' +
            'values **proposed** to a new assessment, which can then have its own.',
        },
        {
          termine: 'Semester grade and absences',
          testo:
            '**Step of the semester grade**: how the average is rounded, usually more coarsely — 0.5 ' +
            'for half marks, 0 for no rounding. **Flag absence above**: the percentage of ' +
            'absences, course by course, above which a person appears among the ' +
            `${EN.pendenza.plurale}; 0 means never.`,
        },
        {
          termine: 'Subjects',
          testo:
            '**New subject**, with code and colour; next to each one, how many classes, courses ' +
            'and plans hang on it. Two subjects born from the same thing can be merged; deleting ' +
            'one asks for confirmation first, and says what goes with it.',
        },
        {
          termine: 'Lists',
          testo:
            'The items of the drop-downs, one tab per list: types of activity and of test, how ' +
            'the class works, materials, aspects observed. They can be renamed and reordered; ' +
            'where the value is free text, items can be added and removed. Each type of activity ' +
            'also has its **Colour**: it is the stripe of the step in the outline, in the ' +
            'lesson’s register and on the classroom screen. **Restore the factory entries** goes back ' +
            'to the start, colours included.',
        },
        {
          termine: 'Letterhead',
          testo:
            'In Documents and printing › **Letterhead**: for each letterhead the **School ' +
            'name**, the logo and its **Logo height (mm)**, and below **Who signs**. They go on ' +
            'every sheet, and live inside the document. The logo is loaded, replaced and removed ' +
            'with **Load the logo…**, **Replace…** and **Remove**. The email signature is in the ' +
            'file too, but it is written in **Communications**.',
        },
        {
          termine: 'This file',
          testo:
            'In Documents and printing › **This file**, the **Document and data** card: which ' +
            'file is open and where, what it contains, and whether the references between ' +
            'classes, lessons, plans and assessments add up. **Open another register…**, **Show ' +
            'in folder**, **Reload**; a year not saved yet has **Save the year as…** here.',
        },
        {
          termine: 'References that do not add up',
          testo:
            'When something does not add up, a notice row says “N references do not add up: …”, ' +
            'with **Repair** if the register can fix it by itself. **Details** takes you straight ' +
            'to Documents and printing › **This file**, where they are listed.',
        },
      ],
      note: [
        'Here each field is saved as soon as you leave it, and applies to whoever opens the ' +
          'file — even two years from now. If the register corrects an impossible value, the ' +
          'notification says “corrected: …” instead of “saved”.',
        'Activity and test types can be renamed but not invented: they decide which fields a ' +
          'plan step asks for. A type’s colour, on the other hand, is only what you see, and ' +
          'changing it recolours every step of that type, even in plans already made. Removing ' +
          'an item from a list, whatever had chosen it stays as it was.',
      ],
    },
    posta: {
      titolo: 'Mail',
      sommario:
        'Settings › **Communications**: which mailbox the emails leave from, whether they go ' +
        'by themselves, and with what signature.',
      scritte: {
        collega: 'Connect the mailbox',
        chiedeIndirizzo: 'asks for the address',
        accessoNelBrowser: 'sign-in in the browser',
        portachiavi: 'Keychain',
        gettone: 'the token',
        porta: 'port 587',
        comunicazione: 'Message',
        daMandare: 'to send',
        parte: 'Sent by the register',
        parteQuando: 'mailbox connected + no draft',
        fileEml: '.eml file',
        fileEmlQuando: 'to reread and send by hand',
      },
      figure: [
        {
          didascalia:
            'Above, how a mailbox is connected; below, where a message goes. The subtitle of ' +
            'the **Mail** card says which of the two paths applies now.',
          legenda: [
            '**Connect the mailbox**: saves only if the server accepts. Then it becomes ' +
              '**Reconnect the mailbox**.',
            'In the system keychain, not in the settings: `impostazioni.json` is a plain-text ' +
              'file.',
            'With the mailbox connected and **Send without a draft** on: it asks for ' +
              'confirmation, then sends.',
            'In every other case: the mail program opens the draft for you to reread.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Sender address and sign-in name',
          testo:
            '**Sender address**: the one families see in “From”. **Sign-in name**: the name you ' +
            'sign in with, in schools often a code such as `xxx000@edu.ti.ch`. Empty, each ' +
            'stands for the other; when they differ, the card shows both.',
        },
        {
          termine: 'Test the connection',
          testo:
            'Knocks on the mailbox, asks whose it is, and sends nothing. The answer stays ' +
            'written under the buttons while you correct the settings.',
        },
        {
          termine: 'Send a test',
          testo:
            'Only there with the mailbox connected. Sends a real email to the address you type ' +
            '— usually your own. It is the only way to see whether permission to send is there ' +
            'and whether the signature arrives as written.',
        },
        {
          termine: 'From the search',
          testo:
            'The same steps are in the search (Ctrl+K): **Connect mail**, **Test ' +
            'mail**, **Send a test email**, **Disconnect mail**. With no ' +
            'mailbox connected, the last three are off.',
        },
        {
          termine: 'Send without a draft',
          testo:
            'Under “When it goes out”. When on, messages leave from the register instead of ' +
            'becoming drafts; before each round the register asks for confirmation. With no ' +
            'mailbox connected it has no effect.',
        },
        {
          termine: 'The signature',
          testo:
            'It goes at the end of the emails the register sends — messages, requests to ' +
            `${EN.azienda.plurale}, documents to a ${EN.pif.singolare} —; \`.eml\` drafts go out ` +
            'without it, because the mail program adds the signature. It is written in the ' +
            '**Email signature** card, under the mail, as in a mail program: bold, italic, ' +
            'underline, three sizes, colour, links. You can paste one from Outlook, and the ' +
            'colours stay. Left empty, the default signature applies, shown in grey: who signs ' +
            'and the school of the first letterhead, from the **Letterhead**.',
        },
        {
          termine: 'The signature is in the file',
          testo:
            'The card carries the **file** badge: the signature is saved in the year’s file, not ' +
            'on this computer, and opening the year elsewhere you find it again.',
        },
        {
          termine: 'Disconnect',
          testo:
            'Removes the Microsoft token from the keychain, and you are back to `.eml` files. ' +
            'The permission given to the program is revoked from your own Microsoft profile.',
        },
      ],
      note: [
        'The register asks Microsoft only for permission to send, not to read the mailbox. ' +
          'The price: no drafts on the server and no copy in “Sent Items”.',
        'If signing in to Microsoft works but the server refuses, the school may keep ' +
          'authenticated sending (SMTP AUTH) turned off for the mailbox: the administrator ' +
          'turns it back on. Sender address and sign-in name swapped give `5.7.60` instead: ' +
          'the permission to send as someone else.',
      ],
    },
    aggiornamenti: {
      titolo: 'Updates',
      sommario:
        'Which version is running, whether there is a new one, and when it is installed.',
      scritte: {
        controllo: 'Check',
        chiedeGithub: 'asks GitHub',
        disponibile: 'Available',
        ceLaNuova: 'a new one is out',
        scarico: 'Downloading',
        barraDeiMb: 'MB bar',
        pronta: 'Ready',
        aspettaUscita: 'waits for quitting',
        installata: 'Installed',
        versioneNuova: 'new version',
        controllaAdesso: 'Check now',
        riavvia: 'Restart and update',
        barraTitolo: 'the title bar',
        file: 'File ▾',
        percorso: '2026-2027 › Calendar › Mon 14 Sep',
        ceLa: '1.7.0 is out',
        barraFondo: 'the bottom bar',
        benvenutoFondo: 'the welcome screen, at the bottom',
        versione: 'Version 1.6.0',
        eLUltima: 'it’s the latest',
      },
      figure: [
        {
          didascalia:
            'The round of a new version. Each step is done by one of the three boxes on its ' +
            'own; when it is off, the button below does it.',
          legenda: [
            '**Look for new versions**: half a minute after start-up, then every six hours.',
            '**Download the new version right away**: as soon as it is found, without asking.',
            '**Install when quitting the register**: the next time you quit the register.',
          ],
        },
        {
          didascalia:
            'Where you can see how the updates stand. The words are the same everywhere: the ' +
            'section’s badge, the strip, the item at the bottom, the welcome screen and the ' +
            '“ready” notification take them from the same place.',
          legenda: [
            'The strip: it is only there when a new version is out. The news in two words — a ' +
              'click leads here —, the step that makes sense now, and the ✕ that hides it until ' +
              'the next news. While downloading, a thread along the edge shows how far it has ' +
              'got.',
            'The item in the bottom bar, also only with a new version: a click leads here.',
            'The welcome screen, without opening a year: next to the version, the badge and the ' +
              'step. When there is a new version it has the strip too, at the top.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Where',
          testo:
            'Settings › Program › **Updates**. The “Version …” card says in a badge how things ' +
            'stand — “it’s the latest”, “1.7.0 is out”, “downloading 1.7.0: 40%”, “1.7.0 ' +
            'ready”, “check failed” —; below, the full sentence and a single button, the one for ' +
            'the step that makes sense now. The three boxes are under the card, in the “New ' +
            'versions” group.',
        },
        {
          termine: 'The strip in the title bar',
          testo:
            'When a new version is out, a thin strip appears on the right of the title bar: the ' +
            'news in two words, **Download** or **Restart and update**, and the ✕. Once closed, ' +
            'it comes back only with the next news — the same version, ready. The two words lead ' +
            'here, where the full sentence and the release notes are.',
        },
        {
          termine: 'In the welcome screen',
          testo:
            'Even with no year open: at the bottom, next to the version, the badge with the ' +
            'status and the button for the step, for example **Check now**. When there is a new ' +
            'version the step moves up into the strip at the top, with the full sentence.',
        },
        {
          termine: 'By itself',
          testo:
            'By default all three boxes are on: it checks, downloads and installs on quitting ' +
            'without asking. When a version is ready a notification arrives, even with the ' +
            'window closed.',
        },
        {
          termine: 'By hand',
          testo:
            '**Check now**, **Download** — with the MB bar under the sentence —, **Restart and ' +
            'update**, which asks for confirmation: it is the only step that closes the ' +
            'register. “What changes in …”, closed under the sentence, shows the release notes.',
        },
        {
          termine: 'How often',
          testo:
            'It cannot be set: with **Look for new versions** on, the first check is half a ' +
            'minute after start-up and then every six hours, even for the register that stays ' +
            'on next to the clock for days. Anyone who does not want to wait presses **Check ' +
            'now**.',
        },
        {
          termine: 'What goes out',
          testo:
            'The check only asks GitHub which is the latest published version; nothing from the ' +
            'register leaves the computer.',
        },
        {
          termine: 'When it does not update by itself',
          testo:
            'Only the version installed on Windows updates by itself. The portable version and ' +
            'the other systems say “manual update”, the reason and **Open the releases**: you ' +
            'download by hand and put it in place of the old one.',
        },
        {
          termine: 'If it does not work',
          testo:
            'The badge says “check failed” and the sentence gives the reason in plain words: ' +
            'GitHub not answering, for example, is tried again at the next check. An ' +
            'interrupted download keeps the version it found, says so at the end of the ' +
            'sentence, and **Download** tries again.',
        },
      ],
      note: [
        'Installing means closing: the register saves, quits, and a window in its colours ' +
          'shows the update while the program replaces itself in the same folder. With ' +
          '**Restart and update** it reopens by itself; installed on quitting, you find it new ' +
          'the next time you open it. The year’s file is not touched, and an installer that ' +
          'does not match the published one is discarded.',
        'On a metered connection, turn off **Download the new version right away**: the ' +
          'register says there is a new version and waits for **Download**.',
      ],
    },
  },
})
