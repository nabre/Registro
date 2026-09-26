// I testi della guida: Agenda (Dashboard, calendari e pagine da smistare) e
// Pendenze del Registro. Una
// chiave per sezione con la forma di `TestiSezione` (testa di `types.ts`);
// struttura e schemi stanno in `calendar.ts`.

import { catalogo } from '../../../i18n/index.js'
import { CARTE, Molti, PIF, Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  oggi: {
    titolo: 'Dashboard',
    sommario:
      'La giornata in una schermata: le lezioni di oggi, quel che resta aperto, e dove andare. Si ' +
      'guarda e si va.',
    scritte: {
      ora1: 'DIC4a · Matematica',
      ora2: 'DIC2b · Fisica',
      prova1: 'Prova Unità 2 · DIC2b',
      prova2: 'Orale · DIC4a',
      festeggiato: 'Ferrari Giulia',
    },
    figure: [
      {
        didascalia:
          'Al primo avvio il registro si apre qui. Sulla pagina non si fa niente: ogni riquadro ' +
          'porta dove la cosa si fa.',
        legenda: [
          `Le quattro tessere: le lezioni di oggi, quelle da compilare, le ${CARTE.pendenza.plurale} ` +
            'aperte, le pagine da smistare. Un clic porta alla loro pagina.',
          'La lezione in corso — o, fra una lezione e l’altra, la prossima — è accesa. Ogni lezione dice la ' +
            'sua fase, e un clic la apre.',
          'Le prossime valutazioni, con i giorni che mancano.',
          'I compleanni del giorno, quando ce n’è uno.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Si guarda e si va',
        testo:
          'La pagina non cambia niente del registro e non ha comandi nella riga delle azioni: ' +
          'dice com’è messa la giornata e porta dove si lavora. I gesti stanno nelle loro ' +
          'pagine.',
      },
      {
        termine: 'Le quattro tessere',
        testo:
          '**Lezioni di oggi** porta al calendario su oggi, e sotto dice a che ora è la prossima o ' +
          'fin quando dura quella in corso. **Da compilare** conta le lezioni rimaste senza ' +
          'registro nel periodo scelto e apre la più vecchia — o la prossima, se sono tutte in ' +
          `ordine. **${Molti(CARTE.pendenza)}** e **Da smistare** portano alle loro pagine, con ` +
          'lo stesso numero della barra laterale e della barra in fondo.',
      },
      {
        termine: 'Le lezioni di oggi',
        testo:
          'In ordine di calendario: inizio e fine, classe e materia, argomento e aula. La ' +
          'pastiglia dice la fase — **In corso**, **Da chiudere**, **Svolta**, **Da ' +
          'preparare**, **In programma**, **Annullata**. La lezione in corso porta la scritta ' +
          '«Adesso»; fra una lezione e l’altra è la prossima ad accendersi, con «Prossima». Un clic ' +
          'apre la lezione.',
      },
      {
        termine: 'Prossime valutazioni',
        testo:
          'Le prossime cinque dei corsi dell’anno, dalla più vicina, con i giorni che mancano: ' +
          '«oggi», «domani», «fra 3 giorni». Un clic apre la valutazione.',
      },
      {
        termine: 'Compleanni di oggi',
        testo:
          `Le ${PIF.plurale} che compiono gli anni oggi, con la loro classe. Il riquadro c’è ` +
          'solo quando c’è qualcuno da festeggiare.',
      },
      {
        termine: 'La prima pagina',
        tasti: 'Ctrl+1',
        testo:
          'Al primo avvio il registro si apre qui; poi riapre la pagina su cui lo si era ' +
          'lasciato. Da ogni pagina ci si torna con `Ctrl+1`: è la prima voce della barra ' +
          'laterale.',
      },
    ],
    note: [
      'I numeri sono quelli delle pagine a cui le tessere portano, contati nello stesso modo: ' +
        'una tessera che dicesse «3» e aprisse una pagina che ne mostra due insegnerebbe a non ' +
        'crederle. Il filtro **Periodo** limita la Dashboard; senza lezioni oggi mostra la ' +
        'prossima giornata di lezione del periodo.',
    ],
  },
  calendario: {
    titolo: 'Calendario',
    sommario:
      'Quando si fa lezione. Quattro viste delle stesse lezioni, e il giorno scelto passa dall’una ' +
      'all’altra.',
    scritte: {
      calendario: 'Calendario',
      pendenze: Molti(CARTE.pendenza),
      daSmistare: 'Da smistare',
      stato: 'da compilare: DIC4a · lun',
      anno: 'Anno',
      agenda: 'Agenda',
      nuovaOra: 'Nuova lezione',
      striscia: 'Settimane dell’anno · 34 su 38 con lezioni',
      lun: 'lun 14',
      mar: 'mar 15',
      mer: 'mer 16',
      gio: 'gio 17',
      ven: 'ven 18',
      svolta: 'svolta',
      pianificata: 'pianificata',
      inCorso: 'in corso',
      annullata: 'annullata',
    },
    figure: [
      {
        didascalia:
          'La vista Settimana: in cima quel che si fa alla pagina, sotto l’anno in una striscia, e ' +
          'la griglia dei giorni con le ore alte quanto durano.',
        legenda: [
          '**Oggi**, le frecce **Indietro** e **Avanti**, le quattro viste e, con **Modifica** ' +
            'accesa (in alto, accanto a **Proietta**), **Nuova lezione**.',
          'Tutte le settimane dell’anno, anche le vuote: numero, lettera A/B, quante ore. La ' +
            'freccia in cima a destra la ripiega, e il registro se lo ricorda.',
          'I giorni: vacanze spente, confini di semestre, la torta dei compleanni.',
          'Una lezione: tratteggiata se pianificata, piena se svolta, sbiadita e barrata se annullata.',
          'La riga di adesso, nella colonna di oggi: si muove da sola.',
          'Le ore: dalla prima all’ultima della giornata scelta nelle Impostazioni, a ore piene — ' +
            'o, con le pause della giornata, sui confini delle UD —, alla stessa altezza in tutto ' +
            'l’anno.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Settimana',
        testo:
          'La vista di lavoro: le ore alte quanto durano, con le pause e le sovrapposizioni, un ' +
          'giorno per colonna.',
      },
      {
        termine: 'Le ore della settimana',
        testo:
          'La griglia va dalla **Prima ora mostrata** all’**Ultima ora mostrata** di ' +
          'Impostazioni › Anno e orario › Calendario, arrotondate all’ora piena: le 10 stanno ' +
          'alla stessa altezza in tutto l’anno. Solo una lezione o un evento ICS che ne esce la ' +
          'allarga, e solo per la sua settimana.',
      },
      {
        termine: 'Le righe sulle pause',
        testo:
          'Con le **Pause della giornata** dichiarate in Impostazioni le righe non segnano le ore ' +
          'piene ma i confini delle unità didattiche fra una pausa e l’altra, con l’inizio e la ' +
          'fine di ogni pausa. Un’ora trascinata o disegnata si aggancia a quelle righe, e la ' +
          'guida mostra già dove cadrà.',
      },
      {
        termine: 'Sabato e domenica',
        testo:
          'Si accendono e si spengono dai **Giorni mostrati**, in Impostazioni › Anno e ' +
          'orario › Calendario: valgono per la settimana, il mese e la proiezione.',
      },
      {
        termine: 'Modifica',
        testo:
          'In alto, accanto a **Proietta** (Ctrl+E); nel calendario vale nella settimana e nel ' +
          'mese: la griglia smette di ' +
          'aprire le lezioni al clic e le prende in mano. Premendo e tirando sul vuoto si disegna ' +
          'una lezione, a unità didattiche intere; un clic secco la mette lunga quanto la ' +
          '**Fascia oraria di una lezione nuova** di Impostazioni › Anno e orario › Calendario. ' +
          'Con un corso nel filtro la lezione nasce subito per quel corso; senza, si apre ' +
          'il modulo con giorno, ora e durata già messi. Le maniglie sopra e sotto un blocco lo ' +
          'allungano o lo accorciano. Con la modifica accesa compaiono anche **Nuova lezione** e i ' +
          'comandi del calendario ICS, e un clic su un evento ICS libero ne genera la lezione — ' +
          'su uno già abbinato apre il modulo della sua. Un clic ' +
          'sceglie una lezione: le frecce la spostano (nella settimana ↑ ↓ di cinque minuti, con ' +
          'Maiusc di una UD; nel mese di una settimana; ← → di un giorno), **Ctrl+D** la copia ' +
          'alla settimana dopo, **Invio** la apre, **F2** ' +
          'ne apre il modulo, **Canc** la elimina — subito se è vuota, chiedendo se ha già ' +
          'appello o note. Ogni gesto è un passo solo della storia: Ctrl+Z lo toglie. **Esc** ' +
          'lascia la scelta, e un secondo Esc esce dalla modifica. Le ore ancorate al ' +
          'calendario ICS restano ferme: le loro maniglie aggiungono o tolgono fasce prima e ' +
          'dopo l’ora dell’evento, che non si muove.',
      },
      {
        termine: 'La striscia delle settimane',
        testo:
          'Sopra la settimana, «Settimane dell’anno» e tutte quelle dell’anno in fila: il ' +
          'numero, la lettera A/B e quante ore ci cadono — anche le vuote, che sono i buchi da ' +
          'riempire. Un segno chiude la settimana in cui finisce il primo semestre; un clic ' +
          'porta su una settimana.',
      },
      {
        termine: 'Ripiegare la striscia',
        testo:
          'La freccia in cima a destra della striscia la chiude, lasciando la sola testata, e ' +
          'la riapre. Il registro se lo ricorda anche alla prossima apertura: su uno schermo ' +
          'basso sono ore di settimana in più.',
      },
      {
        termine: 'Mese',
        testo:
          'Una striscia continua che scorre dentro l’anno, senza il salto fra un mese e ' +
          'l’altro: il nome del mese resta in alto. Nella prima colonna il numero della ' +
          'settimana, che con un clic la apre. Oltre quattro ore in un giorno compare «+N».',
      },
      {
        termine: 'Anno',
        testo:
          'Il foglio che la sede stampa e appende: i mesi in colonna, i giorni in riga, divisi ' +
          'per semestre. In ogni casella il nome della vacanza, o quanti corsi ci sono quel ' +
          'giorno; un clic apre quella settimana. Sotto, che cosa vogliono dire i colori.',
      },
      {
        termine: 'Agenda',
        testo:
          'Le ore in elenco, una riga ciascuna, divise per settimana: tutto l’anno, e aprendola ' +
          'si porta sul giorno scelto. Ogni riga dice orario, classe, materia e durata; a ora ' +
          'svolta, anche i presenti.',
      },
      {
        termine: 'Oggi e le frecce',
        testo:
          'Nella riga delle azioni. **Oggi** torna a oggi e, nella settimana, scorre fino ' +
          'all’ora di adesso. **Indietro** e **Avanti** spostano di un mese nella vista Mese, ' +
          'di una settimana in tutte le altre.',
        tasti: 'Ctrl+Alt+T',
      },
      {
        termine: 'Le scorciatoie del menu',
        testo:
          '`Ctrl+Alt+T` e `Ctrl+Alt+N` le ascolta il menu, da qualunque pagina: portano al ' +
          'calendario e fanno quel che fanno **Dashboard** e **Nuova lezione**. Con una finestra aperta ' +
          'non fanno niente, e un avviso chiede di chiuderla prima.',
      },
      {
        termine: 'I numeri in testata',
        testo:
          'Accanto al titolo il periodo e il semestre in cui cade; sotto, quattro conti della ' +
          'settimana scelta: lezioni, UD, ore effettive e quante restano da svolgere.',
      },
      {
        termine: 'Filtro per corso',
        testo:
          'Nella riga delle scelte, «Corso» con «Tutti i corsi»: il calendario mostra solo le ' +
          'ore di quello scelto. Non cambia il corso su cui sono puntate le pagine del Registro; ' +
          'aprendo da fuori una lezione di un altro corso, il filtro passa su quello.',
      },
      {
        termine: 'Vacanze, semestri e settimane A/B',
        testo:
          'I giorni di chiusura si spengono in tutte le viste, con il nome nel suggerimento; ' +
          'accanto al numero del giorno un segno dice dove un semestre finisce o comincia. ' +
          'Tutto si decide in Impostazioni › Anno e orario › **Anno scolastico**.',
      },
      {
        termine: 'Ore in un giorno di chiusura',
        testo:
          'Una vacanza dichiarata dopo aver messo l’orario, o un’ora messa a mano in un giorno ' +
          'chiuso: nella settimana un avviso dice quante ore cadono in un giorno di chiusura, e ' +
          'quale. Con **Modifica** accesa, **Rimuovi le ore nelle vacanze** le toglie tutte ' +
          'insieme, dopo una conferma; `Ctrl+Z` le riporta.',
      },
      {
        termine: 'Compleanni',
        testo:
          'Una torta con il nome e gli anni nel mese e nell’agenda, dove un clic apre la scheda ' +
          'della persona. Nella settimana e nell’anno è solo un segno sul giorno: i nomi stanno ' +
          'nel suggerimento. Quelli di una classe che quel giorno non si ha in aula restano ' +
          'sbiaditi; con un corso nel filtro si vedono quelli della sua classe.',
      },
    ],
    note: [
      'Il giorno scelto è uno solo per le quattro viste: si guarda il mese, si passa alla ' +
        'settimana, e si è ancora lì. Anche lo scorrimento si ricorda: nella settimana lo ' +
        'cambia solo **Oggi**, che porta all’ora di adesso; nel mese **Oggi** e le frecce ' +
        'riportano la striscia sul giorno scelto.',
      'Il semestre di una prova è quello in cui cade la sua data: una verifica messa il ' +
        'giorno dopo il confine finisce nell’altra pagella. Il segno sul giorno serve a ' +
        'vederlo prima.',
    ],
  },
  calendarioOre: {
    titolo: 'Le lezioni sul calendario',
    sommario:
      'Come si mettono, si spostano e si copiano le lezioni, e che cosa si fa loro senza aprirle.',
    scritte: {
      mar: 'mar',
      mer: 'mer',
      presa: 'presa',
      trascinare: 'Trascinare sposta;',
      o: 'o',
      copia: 'mentre si lascia: copia',
      apriLezione: 'Apri la lezione',
      modifica: 'Modifica…',
      segnaSvolta: 'Segna come svolta',
      annullaLezione: 'Annulla la lezione',
      assegnaPiano: 'Assegna un piano lezione',
      copiaSettimana: 'Copia alla settimana prossima',
    },
    figure: [
      {
        didascalia:
          'Una lezione si prende con il mouse e si lascia dove va. Il menu del tasto destro fa il resto ' +
          'senza aprirla.',
        legenda: [
          'La lezione presa resta al suo posto, sbiadita, finché non la si lascia.',
          'La riga dice dove cadrà: ai cinque minuti, o sulle righe delle UD quando la giornata ha ' +
            'le sue pause. Nel mese si cambia solo il giorno.',
          'Con `Ctrl` o `Alt` premuto nasce una copia, e l’originale resta dov’era.',
          'Il tasto destro su una lezione: quel che si fa senza aprirla.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Una lezione nuova',
        testo:
          'Si crea con **Modifica** accesa: fuori, il calendario si guarda. Nella settimana si ' +
          'preme e si tira sul vuoto; nel mese un doppio clic sul giorno. Con un corso nel ' +
          'filtro, la lezione nasce per quel corso. **Nuova lezione**, che con **Modifica** accesa compare ' +
          'nella riga delle azioni, la apre sul giorno scelto con il corso del momento. La ' +
          'scorciatoia vale dappertutto, e accende la modifica da sé.',
        tasti: 'Ctrl+Alt+N',
      },
      {
        termine: 'Il tasto destro sul vuoto',
        testo:
          'Guardando: **Vai a questo giorno** e **Modifica il calendario**. In modifica: ' +
          '«Nuova lezione alle …» con l’ora su cui si è premuto (nel mese, «in questo giorno») — ' +
          'subito, se il filtro dice il corso, e allora c’è anche **Nuova lezione con il ' +
          'modulo…**; senza filtro apre il modulo già compilato — ed **Esci dalla modifica**.',
      },
      {
        termine: 'Spostare',
        testo:
          'In modifica si prende la lezione e la si lascia dove va: nella settimana cambiano giorno ' +
          'e orario, agganciati ai cinque minuti — o, con le pause della giornata, alle righe delle ' +
          'UD —; nel mese solo il giorno. Appello e testi viaggiano con lei: è la stessa lezione, ' +
          'spostata. Con le pause della giornata le sue UD si ridispongono attorno alla ' +
          'ricreazione, e le pause fatte a mano lasciano il posto a quelle della giornata.',
      },
      {
        termine: 'Copiare',
        testo:
          '`Ctrl` (o `Alt`) premuto mentre si lascia: nasce una copia pianificata con lo stesso ' +
          'orario, l’aula e il piano, ma senza appello, osservazioni né argomenti. Si resta nel ' +
          'calendario, pronti per la prossima.',
      },
      {
        termine: 'Due lezioni alla stessa ora',
        testo:
          'Si possono volere — una classe divisa, una compresenza — e il registro non le ' +
          'rifiuta: lo dice nell’avviso, con le classi su cui l’ora è finita. Guarda tutte le ' +
          'classi, anche quelle nascoste dal filtro.',
      },
      {
        termine: 'Il tasto destro su una lezione',
        testo:
          'Sempre: **Apri la lezione**, **Segna come svolta** (o **Riporta a pianificata**), ' +
          '**Annulla la lezione** (o **Non è più annullata**) e le voci del piano — apri, ' +
          'assegna, cambia, togli. In modifica il tasto destro sceglie l’ora e aggiunge ' +
          'quel che tocca l’orario: **Modifica…** (F2), nella settimana **Allunga** e ' +
          '**Accorcia** di un’unità didattica, **Al giorno prima** e **Al giorno dopo** (← →), ' +
          '**Copia alla settimana prossima** (Ctrl+D) ed **Elimina** (Canc). Su un’ora con la ' +
          'catena restano **Modifica…**, **Sincronizza da ICS**, **Allunga** e **Accorcia**: ' +
          'giorno e ora dell’evento li detta il calendario della scuola, e le ultime due ' +
          'lavorano sulle fasce aggiunte accanto.',
      },
      {
        termine: 'Annullare o eliminare',
        testo:
          'Una lezione annullata resta nel registro, barrata, con quel che c’era dentro, e non porta ' +
          'più il suo numero. **Elimina** la toglie del tutto, dopo una conferma.',
      },
      {
        termine: 'Generare le lezioni',
        testo:
          'Le lezioni non si mettono una per una: si dichiara l’orario fisso del corso, e ' +
          '**Genera le lezioni**, nella finestra del corso, mette quelle che mancano fra **Dal** ' +
          'e **Al**, saltando le chiusure. Per un corso nuovo basta la spunta «Genera le lezioni ' +
          'appena creato il corso».',
      },
      {
        termine: 'Lezione da compilare',
        testo:
          'Nella riga delle azioni apre il buco più vecchio — una lezione passata senza appello, o ' +
          'non segnata svolta —; quando non ce ne sono si chiama **Prossima lezione**. Tiene conto ' +
          'del corso nel filtro e del periodo scelto.',
      },
    ],
    note: [
      'L’orario è uno stampo, non un vincolo: ogni ora generata si sposta e si cambia per ' +
        'conto suo, e rigenerare non tocca quelle che ci sono già. Si può rilanciare a ogni ' +
        'cambio d’orario.',
      'Un’ora con la catena — legata al calendario della scuola — non si trascina e non si ' +
        'elimina. Vedi la sezione sul calendario ICS.',
    ],
  },
  ics: {
    titolo: 'Il calendario della scuola (ICS)',
    sommario:
      'L’orario ufficiale della sede accanto alle lezioni: il calendario propone, il registro ' +
      'decide, e niente si cancella.',
    scritte: {
      mer: 'mer 16',
      corso: 'DIC4a · Matematica',
      nessunEvento: 'nessun evento sotto',
      riunione: 'Riunione',
      libero: 'libero',
      calendarioIcs: 'Calendario ICS',
      inModifica: 'in modifica, nella Settimana',
      senzaLezione: '+  evento senza lezione',
      senzaEvento: '−  lezione senza evento',
      senzaRegola: '?  abbinati senza regola',
    },
    figure: [
      {
        didascalia:
          'Gli eventi del calendario della scuola stanno in una corsia tratteggiata accanto alle ' +
          'ore del registro: un buco da una parte o dall’altra salta all’occhio.',
        legenda: [
          'La striscia delle settimane: `+`, `−` e `?` dicono dove calendario e registro non ' +
            'tornano.',
          'La catena: l’ora è ancorata a eventi del calendario. Il numero accanto dice quanti.',
          'La corsia ICS, a destra di ogni giorno: gli eventi della scuola, tratteggiati.',
          'Un evento senza ora è «libero»; il triangolo dice che nessuna regola sa di che corso ' +
            'sia.',
          'L’interruttore, nel riquadro «Calendario ICS» della riga delle azioni: c’è con ' +
            '**Modifica** accesa, e accende corsia e segni insieme.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Aggiungere un calendario',
        testo:
          'Impostazioni › Anno e orario › **Calendari ICS**: si incolla il link da ' +
          'abbonare della sede (`https://…` o `webcal://…`) e **Aggiungi**, oppure **Un file…** ' +
          'per un `.ics` dal disco. Possono essere più d’uno — l’orario di sede, quello dei ' +
          'laboratori — e si aggiungono anche dalla finestra di **Confronta con il calendario**.',
      },
      {
        termine: 'La copia nel documento',
        testo:
          'Di ogni calendario il registro tiene una copia dentro il documento e legge sempre ' +
          'quella: il confronto funziona senza rete e su un altro computer. **Aggiorna** la rifà ' +
          'dall’origine; se l’origine non si legge, resta quella di prima.',
      },
      {
        termine: 'Nome, indirizzo, cestino',
        testo:
          'Il nome si cambia nel suo campo. Della provenienza si vede solo il sito, mai il link ' +
          'intero, che spesso porta una chiave personale: si corregge in «Cambia indirizzo o ' +
          'file», e il nuovo sostituisce il vecchio solo se si legge. Il cestino toglie il ' +
          'calendario e la sua copia; **Rimuovi tutto**, in testa alla scheda, toglie calendari, ' +
          'copie e regole. Le lezioni già scritte restano sempre.',
      },
      {
        termine: 'Nella settimana',
        testo:
          '**Calendario ICS**, nella riga delle azioni con **Modifica** accesa, mette gli ' +
          'eventi in una corsia ' +
          'tratteggiata a destra di ogni giorno. Riaccenderlo rilegge le copie; un calendario ' +
          'che non si legge lo dice il sottotitolo della pagina. Spento, nasconde anche ' +
          'i segni della striscia e **Confronta con il calendario**.',
      },
      {
        termine: 'Evento e ora, legati',
        testo:
          'Un evento che cade su un’ora del suo corso ne prende il colore, e l’ora porta una ' +
          'catena; passando sopra l’uno si accende l’altro. Un evento senza ora dice «libero».',
      },
      {
        termine: 'I segni della striscia',
        testo:
          'Con **Calendario ICS** acceso, nella settimana, la striscia segna dove calendario ' +
          'e registro non tornano: `+` un ' +
          'evento senza lezione, `−` una lezione senza evento, `?` tutti e due, ma legati per ' +
          'indizio e non da una regola. Aperta la settimana, l’ora o l’evento che non torna ' +
          'prende lo stesso colore.',
      },
      {
        termine: 'Sugli eventi',
        testo:
          'Un clic su un evento legato apre la sua ora; `Ctrl`+clic ne sceglie più d’uno dello ' +
          'stesso giorno. Col tasto destro: **Genera la lezione dall’evento…**, **Abbina a un ' +
          'corso…** (o **Cambia l’abbinamento al corso…**) e **Togli la scelta**.',
      },
      {
        termine: 'Genera la lezione dall’evento',
        testo:
          'La finestra chiede corso e aula, e propone il testo con cui riconoscere gli eventi ' +
          'simili: con «Ricorda l’abbinamento per gli eventi simili» la scelta diventa una ' +
          'regola. Gli eventi scelti — o le due metà di un blocco — fanno un’ora sola, con la ' +
          'pausa in mezzo. Se il corso ha già un’ora che si sovrappone, si ferma e lo dice.',
      },
    ],
    note: [
      'Un’ora con la catena non si trascina e non si elimina, e nel suo modulo corso, data ' +
        'e la fascia dell’evento sono spenti — anche l’aula, quando l’evento ne scrive una: ' +
        'li detta il calendario della scuola. Se l’ora cambia davvero, la si cambia lì; dopo ' +
        '**Aggiorna**, **Sincronizza da ICS** (tasto destro sull’ora) la allinea subito.',
      'Gli eventi si vedono solo nella settimana: nel mese, nell’anno e nell’agenda il ' +
        'calendario della scuola è come spento. Il blocco delle ore ancorate invece resta ' +
        'sempre: dipende dall’orario, non da che cosa si guarda.',
      'Accanto all’ora dell’evento se ne possono aggiungere altre, o una pausa: nel modulo ' +
        '(**Fascia oraria di lezione**, **Pausa**, e la riga si trascina sopra o sotto la fascia ' +
        'con la catena), o tirando le maniglie in modifica. Non sono una differenza col ' +
        'calendario, e se l’evento si sposta vengono dietro: quelle prima col suo inizio, ' +
        'quelle dopo con la sua fine.',
    ],
  },
  icsRegole: {
    titolo: 'Confronto e regole di abbinamento',
    sommario:
      'Come il registro capisce di che corso è un evento, e come il calendario propone le ore ' +
      'senza scriverle da sé.',
    scritte: {
      evento: 'Evento',
      titoloELuogo: 'titolo e luogo',
      corso: 'Corso',
      quattroProve: 'quattro prove',
      lezione: 'Lezione',
      piuSovrapposta: 'la più sovrapposta',
      proposta: 'Proposta',
      daSpuntare: 'da spuntare',
      giornoIntero: 'giorno intero o',
      mezzanotte: 'a cavallo di mezzanotte:',
      lasciatoFuori: 'lasciato fuori',
      prova1: '1  una regola',
      prova2: '2  il nome della classe',
      prova3: '3  l’orario ricorrente',
      prova4: '4  un’ora già a calendario',
      nessunaSotto: 'nessuna sotto:',
      oraDaCreare: 'un’ora da creare',
      daCreare: 'da creare',
      daAllineare: 'da allineare',
      daAnnullare: 'da annullare',
      maiDaCancellare: 'mai: da cancellare',
    },
    figure: [
      {
        didascalia:
          'Ogni evento trova prima il suo corso, poi l’ora di quel corso con cui si sovrappone di ' +
          'più. Quel che ne esce è una proposta: il registro scrive solo quel che si spunta.',
        legenda: [
          'Le prove, dalla più esplicita alla più indiziaria: decide la prima che risponde con un ' +
            'corso solo. Due risposte valgono come nessuna.',
          'I tre mucchi della revisione. Nessuno cancella: un’ora che il calendario non ha si ' +
            'elenca e basta.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Confronta con il calendario',
        testo:
          'Nella riga delle azioni del calendario, nel riquadro **Calendario ICS** dopo il suo ' +
          'interruttore, con **Calendario ICS** acceso: apre l’elenco dei calendari del ' +
          'documento, e ' +
          '**Confronta** mette quello scelto a fronte delle lezioni. Si confronta la copia: per ' +
          'il calendario di oggi, prima **Aggiorna**.',
      },
      {
        termine: 'I mucchi della revisione',
        testo:
          '**Da creare**: eventi di un corso senza un’ora sotto. **Da allineare**: l’ora c’è, ' +
          'ma a un’altra ora o in un’altra aula. **Da annullare**: il calendario la dà ' +
          'annullata. Ogni mucchio ha la sua spunta «Tutte»; quelle che combaciano stanno ' +
          'chiuse in fondo.',
      },
      {
        termine: 'Applica le spunte',
        testo:
          'Cambia solo quel che è spuntato, tutto insieme. Allineando, appello, piano e testi ' +
          'restano; le ore già svolte partono senza spunta. Annullare segna annullata, non ' +
          'cancella.',
      },
      {
        termine: 'Nel registro ma non nel calendario',
        testo:
          'Solo elencate, senza spunta. Contano i soli corsi che il calendario conosce e i soli ' +
          'giorni che copre; un’ora che non c’è davvero si toglie o si annulla dalla sua scheda.',
      },
      {
        termine: 'Eventi senza corso',
        testo:
          'Per ogni gruppo un testo e una tendina: si sceglie il corso, o «Non è una lezione», ' +
          'e la scelta diventa una regola. Il confronto si rifà subito; le regole si salvano con ' +
          'le spunte. Accorciato — `DIC4a` invece del titolo intero — il testo vale per tutti ' +
          'gli eventi che lo contengono.',
      },
      {
        termine: 'Come si scrive una regola',
        testo:
          'Tutte le parole, in qualsiasi ordine, nel titolo o nel luogo, senza badare a ' +
          'maiuscole e accenti. `A | B` vale per l’una o l’altra, `DIC1*` per ogni parola che ' +
          'comincia così, `/…/` è un’espressione regolare. Fra due regole che valgono vince ' +
          'quella che dice di più.',
      },
      {
        termine: 'La scheda delle regole',
        testo:
          'In Impostazioni › Anno e orario › **Calendari ICS**, sotto i calendari, comuni a ' +
          'tutti. Accanto a ' +
          'ognuna quanti eventi decide e quanti ne riconosce, conto che si rifà mentre si ' +
          'scrive. Si segnalano i doppioni, le espressioni che non si leggono e i corsi che non ' +
          'ci sono più; **Togli tutte** le svuota. Dalla finestra dei calendari ci si arriva ' +
          'con **Apri le regole**.',
      },
      {
        termine: 'Senza una regola',
        testo:
          'Il registro prova da sé: il nome della classe nel titolo, l’orario ricorrente di un ' +
          'corso solo, un’ora già a calendario. Sono indizi, e la pastiglia accanto a ogni ' +
          'proposta dice quale ha deciso: «per regola», «dal nome», «dall’orario», ' +
          '«dall’ora già a calendario».',
      },
    ],
    note: [
      'Due eventi della stessa regola separati da al più quindici minuti sono la stessa ora ' +
        'con la ricreazione in mezzo, e diventano un’ora sola con una pausa. Oltre, sono due ' +
        'ore.',
      'Una regola vale per tutti i calendari del documento: `DIC4a CP` vuol dire quel corso ' +
        'dovunque compaia. Meglio poche regole corte che una per titolo.',
    ],
  },
  todo: {
    titolo: Molti(CARTE.pendenza),
    sommario:
      'Quel che resta aperto nel corso scelto, senza mescolare altre classi o materie.',
    scritte: {
      corso: 'DIC4a · Comunicazione',
      ruolo: 'Docente del corso',
      nuovaConsegna: 'Nuova consegna',
      consegnaLaClasse: 'Consegna la classe',
      rimasteIndietro: 'Rimaste indietro',
      entroLaSettimana: 'Entro la settimana',
      fatto: 'Fatto · Mostra quel che è stato chiuso',
      momenti: 'Momenti di valutazione',
      consegnaUnFoglio: 'consegna un foglio',
      svolgeQualcosa: 'svolge qualcosa',
      toccaAllaClasse: 'tocca alla classe',
      toccaAlDocente: 'tocca al docente',
      svolgeLaClasse: 'Svolge la classe',
      consegnaIlDocente: 'Consegna il docente',
      svolgeIlDocente: 'Svolge il docente',
      inCimaInFondo:
        'In cima quel che aspetta altri, in fondo quel che dipende da chi insegna',
    },
    figure: [
      {
        didascalia:
          'La pagina appartiene al corso indicato nella testata. Mostra cinque famiglie, ' +
          'gli elementi aperti per urgenza e, in fondo, quelli già chiusi.',
        legenda: [
          'Corso e ruolo rendono esplicito il contesto; qui si lavora come docente del corso.',
          'Cinque riquadri: valutazioni e quattro tipi di consegna. Il rosso indica il ritardo.',
          'Ogni famiglia raccoglie solo elementi del corso selezionato, ordinati per urgenza.',
          'Quel che è stato chiuso: si apre quando lo si cerca.',
        ],
      },
      {
        didascalia:
          'Le valutazioni formano una famiglia. Le altre quattro nascono dall’incrocio fra chi ' +
          'agisce — classe o docente — e il gesto: consegnare o svolgere.',
      },
    ],
    voci: [
      {
        termine: 'Un corso alla volta',
        testo:
          'Pendenze sta nel gruppo **Registro**. Usa il corso scelto nella barra: cambiando corso ' +
          'cambia tutta la pagina, compreso il comando **Nuova consegna**.',
      },
      {
        termine: 'Chi deve fare che cosa',
        testo:
          '**Consegna la classe**: i fogli che le ' +
          PIF.plurale +
          ' devono portare. **Svolge ' +
          'la classe**: quel che è stato assegnato. **Consegna il docente**: pagelle, ' +
          'convocazioni, moduli da far firmare a casa. **Svolge il docente**: fotocopie, ' +
          'preparazioni, amministrazione.',
      },
      {
        termine: 'L’ordine è la fretta',
        testo:
          'Dentro ogni tipologia: **Rimaste indietro**, **Scadono oggi**, **Entro la ' +
          'settimana**, **Più avanti, o senza termine**. Il corso è già dichiarato nella testata.',
      },
      {
        termine: 'Le consegne',
        testo:
          'Ogni riga dice chi manca — «mancano Rossi, Bianchi, Verdi +2» — e quel riassunto ' +
          'apre il ritiro, con un nome per riga, **Segna tutti** e **Togli tutti**. La spunta ' +
          'in fondo alla riga segna in un gesto chi manca; la matita apre la consegna.',
      },
      {
        termine: 'I recuperi',
        testo:
          'In **Momenti di valutazione**, le prove da rifare a chi non c’era: da fissare, di ' +
          'oggi, della settimana, più avanti, non rifatte. Il calendario le fissa alla prossima ' +
          'ora del corso, la graffetta allega la scansione, la matita apre data e nota, la ' +
          'crocetta dichiara che non si recuperano. Scrivere il voto le chiude.',
      },
      {
        termine: 'Le prove svolte',
        testo:
          '**Da correggere** si chiude mettendo i voti; **Da riconsegnare** va detto: **Resa a ' +
          'tutti** scrive il giorno su chi non ha ancora la sua data. Ferma da più di due ' +
          'settimane, la riga si fa rossa.',
      },
      {
        termine: 'Chi non c’era alla riconsegna',
        testo:
          '**Da ridare a** elenca a chi la prova non è ancora tornata: la data della ' +
          'riconsegna è di ogni riga, non della prova. Anche i recuperi valutati hanno il loro ' +
          '«resa il».',
      },
      {
        termine: 'Il riquadro «Fatto»',
        testo:
          'In fondo, chiuso: **Mostra quel che è stato chiuso** apre recuperi chiusi, prove ' +
          'riconsegnate e consegne fatte. Serve a «l’ho già ridata a Rossi?», e da ' +
          'lì una riga si riapre.',
      },
    ],
    note: [
      `Le ${CARTE.pendenza.plurale} delle valutazioni si deducono dai voti e dagli appelli; ` +
        'le quattro famiglie di consegne si creano e si completano qui o nella lezione.',
      'La data della riconsegna non è contabilità: da lì si contano i termini di un ricorso. ' +
        'Il tasto accanto al campo scrive il giorno da cui si guarda — dentro un’ora quello ' +
        'dell’ora, altrove oggi —, e si corregge a mano.',
    ],
  },
  smistare: {
    titolo: 'Da smistare',
    sommario:
      'I PDF di classe che hanno ancora pagine senza padrone, di tutte le classi insieme.',
    scritte: {
      trascinato: 'trascinato o caricato',
      lettura: 'Lettura',
      ocr: 'testo, o OCR in coda',
      proposte: 'Proposte',
      unNome: 'un nome, un blocco',
      fascicolo: 'Fascicolo',
      archiviato: 'archiviato e spuntato',
      conferma: 'trascina · Conferma N proposte',
      senzaGesto: 'niente si archivia senza un gesto',
      nonAttribuiti: 'Non attribuiti',
      qualeClasse: 'Di quale classe è?',
    },
    figure: [
      {
        didascalia:
          'Un PDF di classe entra intero, si legge pagina per pagina, e ne escono proposte. ' +
          'Diventano documenti di qualcuno solo con un gesto.',
        legenda: [
          'Il testo di ogni pagina. Le scansioni mute vanno in coda di lettura, decine di secondi ' +
            'a pagina.',
          'Una pagina che nomina qualcuno apre il suo blocco, e le seguenti senza nome ci restano ' +
            'attaccate.',
          'Si archivia trascinando le pagine sulla casella, o confermando in blocco le proposte.',
          'Un PDF senza classe resta fuori da ogni fascicolo finché non gliene si dà una.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Far entrare un PDF',
        testo:
          'Dall’**Archivio documentale** della classe: trascinandolo sulla pagina, o con ' +
          '**Carica dei PDF**. Entra nel documento dell’anno e si apre da sé nella cornice, ' +
          'pronto da dividere.',
      },
      {
        termine: 'Un mucchio per classe',
        testo:
          'Ogni classe di cui si è docente ha il suo: «classe · N pagine da collocare», e sotto ' +
          'un PDF per riga con le pagine che restano e il giorno in cui è entrato. Un file che ' +
          'non si apre porta la pastiglia «non si apre».',
      },
      {
        termine: 'Smista',
        testo:
          'Porta nell’**Archivio documentale** di quella classe con il PDF già aperto nella ' +
          'cornice: è lì che si smista, perché lì ci sono le caselle su cui lasciare le pagine.',
      },
      {
        termine: 'Le proposte',
        testo:
          'Il registro legge ogni pagina e cerca i nomi della classe. Nome e cognome insieme ' +
          'valgono una certezza; un cognome che in classe portano in due non si tira a sorte, ' +
          'e la pagina aspetta una mano.',
      },
      {
        termine: 'Dividere le pagine',
        testo:
          'Nella cornice una pagina si sceglie con un clic — `Ctrl` per aggiungerne, `Maiusc` ' +
          'per un tratto — e si trascina sulla casella di chi è. **Conferma N proposte** ' +
          'archivia in un gesto quelle già riconosciute, quando il PDF sa di quale documento è.',
      },
      {
        termine: 'Il tasto destro su una pagina',
        testo:
          '**Assegna a…** chiede persona e documento, **Rileggi la scansione** la rimette in ' +
          'coda, **Apri nel lettore** la mostra nel programma del sistema, **Butta via** la ' +
          'toglie — la copertina dello scanner, un foglio bianco.',
      },
      {
        termine: 'Le scansioni',
        testo:
          '**Leggi le scansioni (N)** mette in coda le pagine senza testo; **Rileggi** rifà ' +
          'anche quelle già lette. La coda dice a che punto è, e **Ferma** la svuota. A ' +
          'lettura spenta il pulsante dice **Lettura spenta** e porta all’impostazione.',
      },
      {
        termine: 'Sposta in…',
        testo:
          'Un PDF finito nella classe sbagliata — o una scansione che attraversa due classi — si ' +
          'manda a un’altra con la tendina. Le pagine già archiviate restano dove sono, e il ' +
          'registro rifà le proposte con i nomi della classe nuova.',
      },
      {
        termine: 'Non attribuiti a una classe',
        testo:
          'I PDF entrati senza dire di chi fossero — di solito dalla vecchia cartella ' +
          '`in-arrivo/`, che il registro svuota all’apertura — stanno in un mucchio a parte, ' +
          'con la tendina «Di quale classe è?». Dichiarata la classe, il registro li rilegge ' +
          'cercando i nomi.',
      },
      {
        termine: 'Quando è vuota',
        testo:
          '«Niente da smistare», con **Vai all’archivio documentale**. Il numero accanto a «Da ' +
          'smistare» nella barra laterale conta le pagine che aspettano.',
      },
    ],
    note: [
      'Riconoscere un nome è un’ipotesi: per questo niente si archivia da sé. La pagina ' +
        'archiviata viene ritagliata, messa nel fascicolo della persona e spuntata nella sua ' +
        'consegna.',
      'Una casella già piena rifiuta le pagine: il documento di chi ha già consegnato non ' +
        'si sovrascrive.',
      'La lettura delle scansioni gira sulla macchina, con un modello scelto in Impostazioni ' +
        '› Programma › **Modelli linguistici**, ed è lenta: meglio lanciarla su tutto il ' +
        'mucchio e intanto fare altro.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    oggi: {
      titolo: 'Dashboard',
      sommario:
        'Der Tag auf einen Blick: die Stunden von heute, was noch offen ist, und wohin es ' +
        'weitergeht. Man schaut und geht.',
      scritte: {
        ora1: 'DIC4a · Mathematik',
        ora2: 'DIC2b · Physik',
        prova1: 'Prüfung Einheit 2 · DIC2b',
        prova2: 'Mündlich · DIC4a',
        festeggiato: 'Ferrari Giulia',
      },
      figure: [
        {
          didascalia:
            'Beim ersten Start öffnet sich das Klassenbuch hier. Auf der Seite selbst tut man ' +
            'nichts: Jedes Feld führt dorthin, wo man die Sache erledigt.',
          legenda: [
            'Die vier Kacheln: die Stunden von heute, die nachzutragenden, die offenen ' +
              `${DE.pendenza.plurale}, die zuzuordnenden Seiten. Ein Klick führt zu ihrer Seite.`,
            'Die laufende Stunde — oder, zwischen zwei Stunden, die nächste — ist ' +
              'hervorgehoben. Jede Stunde zeigt ihren Stand, und ein Klick öffnet sie.',
            'Die nächsten Beurteilungen, mit den Tagen, die noch bleiben.',
            'Die Geburtstage des Tages, wenn es einen gibt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Man schaut und geht',
          testo:
            'Die Seite ändert nichts am Klassenbuch und hat keine Befehle in der Aktionsleiste: ' +
            'Sie sagt, wie der Tag steht, und führt dorthin, wo man arbeitet. Die Handgriffe ' +
            'stehen auf ihren Seiten.',
        },
        {
          termine: 'Die vier Kacheln',
          testo:
            '**Stunden heute** führt zum Kalender auf heute und sagt darunter, wann die nächste ' +
            'ist oder wie lange die laufende dauert. **Nachzutragen** zählt die Stunden ohne ' +
            'Eintrag im gewählten Zeitraum und öffnet die älteste — oder die nächste, wenn alles ' +
            `in Ordnung ist. **${Molti(DE.pendenza)}** und **Zuzuordnen** führen zu ihren Seiten, ` +
            'mit derselben Zahl wie die Seitenleiste und die Leiste unten.',
        },
        {
          termine: 'Die Stunden von heute',
          testo:
            'In der Reihenfolge des Kalenders: Beginn und Ende, Klasse und Fach, Thema und ' +
            'Zimmer. Die Plakette zeigt den Stand — **Läuft**, **Abzuschliessen**, **Gehalten**, ' +
            '**Vorzubereiten**, **Geplant**, **Ausgefallen**. Die laufende Stunde trägt «Jetzt»; ' +
            'zwischen zwei Stunden ist die nächste hervorgehoben, mit «Als Nächstes». Ein Klick ' +
            'öffnet die Stunde.',
        },
        {
          termine: 'Nächste Beurteilungen',
          testo:
            'Die nächsten fünf aus den Kursen des Schuljahrs, die nächstliegende zuerst, mit den ' +
            'Tagen, die noch bleiben: «heute», «morgen», «in 3 Tagen». Ein Klick öffnet die ' +
            'Beurteilung.',
        },
        {
          termine: 'Geburtstage heute',
          testo:
            `Die ${DE.pif.plurale}, die heute Geburtstag haben, mit ihrer Klasse. Das Feld ` +
            'erscheint nur, wenn es jemanden zu feiern gibt.',
        },
        {
          termine: 'Die erste Seite',
          tasti: 'Ctrl+1',
          testo:
            'Beim ersten Start öffnet sich das Klassenbuch hier; danach öffnet es die Seite, auf ' +
            'der man es verlassen hat. Von jeder Seite kommt man mit `Ctrl+1` zurück: Es ist ' +
            'der erste Eintrag der Seitenleiste.',
        },
      ],
      note: [
        'Die Zahlen sind die der Seiten, zu denen die Kacheln führen, und gleich gezählt: Eine ' +
          'Kachel, die «3» sagt und eine Seite mit zweien öffnet, würde lehren, ihr nicht zu ' +
          'glauben. Der Filter **Zeitraum** begrenzt das Dashboard; gibt es heute keinen ' +
          'Unterricht, zeigt es den nächsten Unterrichtstag des Zeitraums.',
      ],
    },
    calendario: {
      titolo: 'Kalender',
      sommario:
        'Wann unterrichtet wird. Vier Ansichten derselben Stunden, und der gewählte Tag geht ' +
        'von einer zur anderen mit.',
      scritte: {
        calendario: 'Kalender',
        pendenze: Molti(DE.pendenza),
        daSmistare: 'Zuzuordnen',
        stato: 'auszufüllen: DIC4a · Mo',
        anno: 'Jahr',
        agenda: 'Agenda',
        nuovaOra: 'Neue Stunde',
        striscia: 'Wochen des Schuljahrs · 34 von 38 mit Stunden',
        lun: 'Mo 14',
        mar: 'Di 15',
        mer: 'Mi 16',
        gio: 'Do 17',
        ven: 'Fr 18',
        svolta: 'gehalten',
        pianificata: 'geplant',
        inCorso: 'läuft',
        annullata: 'ausgefallen',
      },
      figure: [
        {
          didascalia:
            'Die Ansicht Woche: oben, was man mit der Seite tut, darunter das Schuljahr in einem ' +
            'Streifen, und das Raster der Tage mit Stunden, die so hoch sind, wie sie dauern.',
          legenda: [
            '**Heute**, die Pfeile **Zurück** und **Weiter**, die vier Ansichten und, mit ' +
              'eingeschaltetem **Bearbeiten** (oben, neben **Projizieren**), **Neue Stunde**.',
            'Alle Wochen des Schuljahrs, auch die leeren: Nummer, Buchstabe A/B, wie viele ' +
              'Stunden. Der Pfeil oben rechts klappt den Streifen ein, und das Klassenbuch ' +
              'merkt es sich.',
            'Die Tage: Ferien ausgegraut, Semestergrenzen, die Torte der Geburtstage.',
            'Eine Stunde: gestrichelt, wenn geplant, voll, wenn gehalten, blass und ' +
              'durchgestrichen, wenn ausgefallen.',
            'Die Linie von jetzt, in der Spalte von heute: Sie bewegt sich von selbst.',
            'Die Stunden: von der ersten bis zur letzten des Tages, wie in den Einstellungen ' +
              'gewählt, zu vollen Stunden — oder, mit den Pausen des Tages, an den ' +
              'Lektionsgrenzen —, auf derselben Höhe im ganzen Schuljahr.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Woche',
          testo:
            'Die Arbeitsansicht: Stunden, so hoch, wie sie dauern, mit Pausen und ' +
            'Überschneidungen, ein Tag pro Spalte.',
        },
        {
          termine: 'Die Stunden der Woche',
          testo:
            'Das Raster reicht von **Erste angezeigte Uhrzeit** bis **Letzte angezeigte Uhrzeit** ' +
            'unter Einstellungen › Schuljahr und Stundenplan › Kalender, auf volle Stunden ' +
            'gerundet: 10 Uhr steht im ganzen Schuljahr auf derselben Höhe. Nur eine ' +
            'Stunde oder ein ICS-Termin, der darüber hinausgeht, vergrössert es, und ' +
            'nur für seine Woche.',
        },
        {
          termine: 'Die Linien an den Pausen',
          testo:
            'Sind in den Einstellungen **Pausen des Tages** festgelegt, markieren die Linien ' +
            'nicht die vollen Stunden, sondern die Grenzen der Lektionen zwischen zwei Pausen, ' +
            'mit Beginn und Ende jeder Pause. Eine gezogene oder gezeichnete Stunde rastet an ' +
            'diesen Linien ein, und die Hilfslinie zeigt schon, wo sie landet.',
        },
        {
          termine: 'Samstag und Sonntag',
          testo:
            'Man blendet sie unter **Angezeigte Tage** ein und aus, in Einstellungen › ' +
            'Schuljahr und Stundenplan › Kalender: Das gilt für die Woche, den Monat und die ' +
            'Projektion.',
        },
        {
          termine: 'Bearbeiten',
          testo:
            'Oben, neben **Projizieren** (Ctrl+E); im Kalender gilt es in der Woche und im ' +
            'Monat: Das Raster öffnet die Stunden beim Klick nicht mehr, sondern nimmt sie in ' +
            'die Hand. Drücken und Ziehen im leeren Bereich zeichnet eine Stunde, in ' +
            'ganzen Lektionen; ein kurzer Klick macht sie so lang wie das **Zeitfenster einer ' +
            'neuen Stunde** unter Einstellungen › Schuljahr und Stundenplan › ' +
            'Kalender. Mit einem Kurs im Filter gehört die Stunde sofort zu diesem Kurs; ohne ' +
            'öffnet sich das Formular mit Tag, Zeit und Dauer schon ausgefüllt. Die Griffe oben ' +
            'und unten an einem Block verlängern oder kürzen ihn. Beim Bearbeiten erscheinen ' +
            'auch **Neue Stunde** und die Befehle des ICS-Kalenders, und ein Klick auf einen ' +
            'freien ICS-Termin erzeugt seine Stunde — auf einem schon zugeordneten ' +
            'öffnet er das Formular ihrer Stunde. Ein Klick wählt eine Stunde: Die Pfeile ' +
            'verschieben sie (in der Woche ↑ ↓ um fünf Minuten, mit Umschalt um eine Lektion; ' +
            'im Monat um eine Woche; ← → um einen Tag), **Ctrl+D** kopiert sie in die nächste ' +
            'Woche, **Enter** öffnet sie, **F2** öffnet ihr Formular, **Entf** löscht sie — ' +
            'sofort, wenn sie leer ist, mit Rückfrage, wenn sie schon eine Präsenzkontrolle ' +
            'oder Notizen hat. Jeder Handgriff ist ein einziger Schritt im Verlauf: Ctrl+Z ' +
            'nimmt ihn zurück. **Esc** hebt die Auswahl auf, ein zweites Esc beendet das ' +
            'Bearbeiten. Die an den ICS-Kalender gebundenen Stunden bleiben stehen: Ihre Griffe ' +
            'fügen vor und nach der Zeit des Termins, die sich nicht bewegt, Zeitfenster hinzu ' +
            'oder nehmen sie weg.',
        },
        {
          termine: 'Der Streifen der Wochen',
          testo:
            'Über der Woche «Wochen des Schuljahrs» und alle Wochen des Jahres in einer Reihe: ' +
            'die Nummer, der Buchstabe A/B und wie viele Stunden hineinfallen — auch die ' +
            'leeren, also die Lücken, die zu füllen sind. Ein Zeichen schliesst die Woche ab, ' +
            'in der das erste Semester endet; ein Klick führt zu einer Woche.',
        },
        {
          termine: 'Den Streifen einklappen',
          testo:
            'Der Pfeil oben rechts am Streifen schliesst ihn, sodass nur der Kopf bleibt, und ' +
            'öffnet ihn wieder. Das Klassenbuch merkt es sich auch fürs nächste Mal: Auf einem ' +
            'niedrigen Bildschirm sind das mehr Stunden der Woche im Blick.',
        },
        {
          termine: 'Monat',
          testo:
            'Ein durchgehender Streifen, der durch das Schuljahr scrollt, ohne Sprung von einem ' +
            'Monat zum nächsten: Der Name des Monats bleibt oben. In der ersten Spalte die ' +
            'Nummer der Woche, die sich mit einem Klick öffnet. Bei mehr als vier Stunden an ' +
            'einem Tag erscheint «+N».',
        },
        {
          termine: 'Jahr',
          testo:
            'Das Blatt, das die Schule druckt und aufhängt: die Monate in Spalten, die Tage in ' +
            'Zeilen, nach Semester geteilt. In jedem Feld der Name der Ferien oder wie viele ' +
            'Kurse an dem Tag stattfinden; ein Klick öffnet diese Woche. Darunter, was die ' +
            'Farben bedeuten.',
        },
        {
          termine: 'Agenda',
          testo:
            'Die Stunden als Liste, eine Zeile pro Stunde, nach Woche geteilt: das ganze ' +
            'Schuljahr, und beim Öffnen springt sie zum gewählten Tag. Jede Zeile nennt Zeit, ' +
            'Klasse, Fach und Dauer; bei gehaltener Stunde auch die Anwesenden.',
        },
        {
          termine: 'Heute und die Pfeile',
          testo:
            'In der Aktionsleiste. **Heute** kehrt zu heute zurück und scrollt in der Woche bis ' +
            'zur aktuellen Uhrzeit. **Zurück** und **Weiter** blättern in der Ansicht Monat um ' +
            'einen Monat, in allen anderen um eine Woche.',
          tasti: 'Ctrl+Alt+T',
        },
        {
          termine: 'Die Tastenkürzel des Menüs',
          testo:
            '`Ctrl+Alt+T` und `Ctrl+Alt+N` hört das Menü, von jeder Seite aus: Sie führen zum ' +
            'Kalender und tun, was **Heute** und **Neue Stunde** tun. Ist ein Fenster offen, ' +
            'tun sie nichts, und eine Meldung bittet, es zuerst zu schliessen.',
        },
        {
          termine: 'Die Zahlen im Kopf',
          testo:
            'Neben dem Titel der Zeitraum und das Semester, in das er fällt; darunter vier ' +
            'Zählungen der gewählten Woche: Stunden, Lektionen, effektive Zeitstunden und ' +
            'wie viele noch zu halten sind.',
        },
        {
          termine: 'Filter nach Kurs',
          testo:
            'In der Auswahlzeile «Kurs» mit «Alle Kurse»: Der Kalender zeigt nur die Stunden ' +
            'des gewählten Kurses. Er ändert nicht den Kurs, auf den die Seiten des ' +
            'Klassenbuchs eingestellt sind; öffnet man von aussen eine Stunde eines anderen ' +
            'Kurses, wechselt der Filter auf diesen.',
        },
        {
          termine: 'Ferien, Semester und Wochen A/B',
          testo:
            'Schliesstage sind in allen Ansichten ausgegraut, mit dem Namen im Hinweis; neben ' +
            'der Tageszahl zeigt ein Zeichen, wo ein Semester endet oder beginnt. Festgelegt ' +
            'wird alles unter Einstellungen › Schuljahr und Stundenplan › **Schuljahr**.',
        },
        {
          termine: 'Stunden an einem Schliesstag',
          testo:
            'Ferien, die nach dem Eintragen des Stundenplans festgelegt wurden, oder eine von ' +
            'Hand gesetzte Stunde an einem geschlossenen Tag: In der Woche sagt eine Meldung, ' +
            'wie viele Stunden auf einen Schliesstag fallen, und auf welchen. Mit ' +
            'eingeschaltetem **Bearbeiten** entfernt **Stunden in den Ferien entfernen** sie ' +
            'alle zusammen, nach einer Bestätigung; `Ctrl+Z` bringt sie zurück.',
        },
        {
          termine: 'Geburtstage',
          testo:
            'Eine Torte mit Name und Alter im Monat und in der Agenda, wo ein Klick das ' +
            'Personenblatt öffnet. In der Woche und im Jahr ist es nur ein Zeichen am Tag: Die ' +
            'Namen stehen im Hinweis. Die einer Klasse, die man an dem Tag nicht im Zimmer hat, ' +
            'bleiben blass; mit einem Kurs im Filter sieht man die seiner Klasse.',
        },
      ],
      note: [
        'Der gewählte Tag ist für alle vier Ansichten derselbe: Man schaut den Monat an, ' +
          'wechselt zur Woche und ist noch am selben Ort. Auch die Scrollposition bleibt: In ' +
          'der Woche ändert sie nur **Heute**, das zur aktuellen Uhrzeit führt; im Monat ' +
          'bringen **Heute** und die Pfeile den Streifen zum gewählten Tag zurück.',
        'Das Semester einer Prüfung ist das, in das ihr Datum fällt: Eine Prüfung am Tag nach ' +
          'der Grenze landet im anderen Zeugnis. Das Zeichen am Tag hilft, es vorher zu sehen.',
      ],
    },
    calendarioOre: {
      titolo: 'Die Stunden im Kalender',
      sommario:
        'Wie man Stunden einträgt, verschiebt und kopiert, und was man mit ihnen tut, ohne sie ' +
        'zu öffnen.',
      scritte: {
        mar: 'Di',
        mer: 'Mi',
        presa: 'genommen',
        trascinare: 'Ziehen verschiebt;',
        o: 'oder',
        copia: 'beim Loslassen: Kopie',
        apriLezione: 'Stunde öffnen',
        modifica: 'Bearbeiten…',
        segnaSvolta: 'Als gehalten markieren',
        annullaLezione: 'Als ausgefallen markieren',
        assegnaPiano: 'Unterrichtsplan zuweisen',
        copiaSettimana: 'In die nächste Woche kopieren',
      },
      figure: [
        {
          didascalia:
            'Eine Stunde nimmt man mit der Maus und lässt sie los, wo sie hin soll. Das Menü der ' +
            'rechten Maustaste erledigt den Rest, ohne sie zu öffnen.',
          legenda: [
            'Die genommene Stunde bleibt blass an ihrem Platz, bis man sie loslässt.',
            'Die Linie zeigt, wo sie landet: auf fünf Minuten genau, oder an den Linien der ' +
              'Lektionen, wenn der Tag seine Pausen hat. Im Monat ändert sich nur der Tag.',
            'Mit gedrückter `Ctrl`- oder `Alt`-Taste entsteht eine Kopie, und das Original ' +
              'bleibt, wo es war.',
            'Die rechte Maustaste auf einer Stunde: was man tut, ohne sie zu öffnen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Eine neue Stunde',
          testo:
            'Man legt sie mit eingeschaltetem **Bearbeiten** an: sonst schaut man den Kalender ' +
            'nur an. In der Woche drückt und zieht man im leeren Bereich; im Monat genügt ein ' +
            'Doppelklick auf den Tag. Mit einem Kurs im Filter gehört die Stunde zu diesem ' +
            'Kurs. **Neue Stunde**, das mit eingeschaltetem **Bearbeiten** in der Aktionsleiste ' +
            'erscheint, öffnet sie am gewählten Tag mit dem aktuellen Kurs. Das Tastenkürzel ' +
            'gilt überall und schaltet das Bearbeiten selbst ein.',
          tasti: 'Ctrl+Alt+N',
        },
        {
          termine: 'Die rechte Maustaste im leeren Bereich',
          testo:
            'Beim Anschauen: **Zu diesem Tag** und **Kalender bearbeiten**. Beim Bearbeiten: ' +
            '«Neue Stunde um …» mit der angeklickten Zeit (im Monat «an diesem Tag») ' +
            '— sofort, wenn der Filter den Kurs nennt, und dann gibt es auch **Neue ' +
            'Stunde mit dem Formular…**; ohne Filter öffnet es das schon ausgefüllte ' +
            'Formular — und **Bearbeiten beenden**.',
        },
        {
          termine: 'Verschieben',
          testo:
            'Beim Bearbeiten nimmt man die Stunde und lässt sie los, wo sie hin soll: In der ' +
            'Woche ändern sich Tag und Zeit, auf fünf Minuten eingerastet — oder, mit den ' +
            'Pausen des Tages, an den Linien der Lektionen —; im Monat nur der Tag. ' +
            'Präsenzkontrolle und Texte reisen mit: Es ist dieselbe Stunde, verschoben. Mit den ' +
            'Pausen des Tages ordnen sich ihre Lektionen um die grosse Pause herum neu, und von ' +
            'Hand gesetzte Pausen weichen denen des Tages.',
        },
        {
          termine: 'Kopieren',
          testo:
            '`Ctrl` (oder `Alt`) gedrückt halten beim Loslassen: Es entsteht eine geplante ' +
            'Kopie mit derselben Zeit, demselben Zimmer und demselben Plan, aber ohne ' +
            'Präsenzkontrolle, Beobachtungen und Themen. Man bleibt im Kalender, bereit für die ' +
            'nächste.',
        },
        {
          termine: 'Zwei Stunden zur selben Zeit',
          testo:
            'Das kann gewollt sein — eine geteilte Klasse, Teamteaching — und das Klassenbuch ' +
            'lehnt es nicht ab: Es sagt es in der Meldung, mit den Klassen, auf die die Stunde ' +
            'gefallen ist. Es prüft alle Klassen, auch die vom Filter ausgeblendeten.',
        },
        {
          termine: 'Die rechte Maustaste auf einer Stunde',
          testo:
            'Immer: **Stunde öffnen**, **Als gehalten markieren** (oder **Auf geplant ' +
            'zurücksetzen**), **Als ausgefallen markieren** (oder **Nicht mehr ausgefallen**) ' +
            'und die Einträge zum Plan — öffnen, zuweisen, wechseln, entfernen. Beim Bearbeiten ' +
            'wählt die rechte Maustaste die Stunde und fügt hinzu, was den Stundenplan ' +
            'betrifft: **Bearbeiten…** (F2), in der Woche **Um eine Lektion verlängern** und ' +
            '**Um eine Lektion kürzen**, **Auf den Vortag** und **Auf den Folgetag** (← →), ' +
            '**In die nächste Woche kopieren** (Ctrl+D) und **Löschen** (Entf). Bei einer ' +
            'Stunde mit Kette bleiben **Bearbeiten…**, **Aus ICS synchronisieren**, **Um eine ' +
            'Lektion verlängern** und **Um eine Lektion kürzen**: Tag und Zeit des Termins ' +
            'bestimmt der Kalender der Schule, und die letzten beiden wirken auf die daneben ' +
            'hinzugefügten Zeitfenster.',
        },
        {
          termine: 'Ausfallen lassen oder löschen',
          testo:
            'Eine ausgefallene Stunde bleibt im Klassenbuch, durchgestrichen, mit allem, was ' +
            'darin war, und trägt keine Nummer mehr. **Löschen** entfernt sie ganz, nach einer ' +
            'Bestätigung.',
        },
        {
          termine: 'Stunden erzeugen',
          testo:
            'Die Stunden trägt man nicht einzeln ein: Man legt den festen ' +
            'Stundenplan des Kurses fest, und **Stunden erzeugen** im Fenster des ' +
            'Kurses setzt die fehlenden zwischen **Von** und **Bis**, ohne die Schliesstage. ' +
            'Für einen neuen Kurs genügt das Häkchen «Stunden gleich beim Erstellen ' +
            'des Kurses erzeugen».',
        },
        {
          termine: 'Auszufüllende Stunde',
          testo:
            'In der Aktionsleiste öffnet sie die älteste Lücke — eine vergangene Stunde ohne ' +
            'Präsenzkontrolle oder nicht als gehalten markiert —; gibt es keine, heisst sie ' +
            '**Nächste Stunde**. Sie berücksichtigt den Kurs im Filter und den gewählten ' +
            'Zeitraum.',
        },
      ],
      note: [
        'Der Stundenplan ist eine Vorlage, keine Fessel: Jede erzeugte Stunde lässt sich für ' +
          'sich verschieben und ändern, und erneutes Erzeugen rührt die vorhandenen nicht an. ' +
          'Man kann es bei jeder Änderung des Stundenplans wieder starten.',
        'Eine Stunde mit Kette — an den Kalender der Schule gebunden — lässt sich weder ziehen ' +
          'noch löschen. Siehe den Abschnitt zum ICS-Kalender.',
      ],
    },
    ics: {
      titolo: 'Der Kalender der Schule (ICS)',
      sommario:
        'Der offizielle Stundenplan der Schule neben den Stunden: Der Kalender schlägt vor, ' +
        'das Klassenbuch entscheidet, und nichts wird gelöscht.',
      scritte: {
        mer: 'Mi 16',
        corso: 'DIC4a · Mathematik',
        nessunEvento: 'kein Termin darunter',
        riunione: 'Sitzung',
        libero: 'frei',
        calendarioIcs: 'ICS-Kalender',
        inModifica: 'beim Bearbeiten, in der Woche',
        senzaLezione: '+  Termin ohne Stunde',
        senzaEvento: '−  Stunde ohne Termin',
        senzaRegola: '?  zugeordnet ohne Regel',
      },
      figure: [
        {
          didascalia:
            'Die Termine aus dem Kalender der Schule stehen in einer gestrichelten Spur neben ' +
            'den Stunden des Klassenbuchs: Eine Lücke auf der einen oder anderen Seite fällt ' +
            'sofort auf.',
          legenda: [
            'Der Streifen der Wochen: `+`, `−` und `?` zeigen, wo Kalender und Klassenbuch ' +
              'nicht übereinstimmen.',
            'Die Kette: Die Stunde ist an Termine des Kalenders gebunden. Die Zahl daneben ' +
              'sagt, an wie viele.',
            'Die ICS-Spur, rechts von jedem Tag: die Termine der Schule, gestrichelt.',
            'Ein Termin ohne Stunde ist «frei»; das Dreieck zeigt, dass keine Regel weiss, zu ' +
              'welchem Kurs er gehört.',
            'Der Schalter im Feld «ICS-Kalender» der Aktionsleiste: Es gibt ihn bei ' +
              'eingeschaltetem **Bearbeiten**, und er schaltet Spur und Zeichen zusammen ein.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Einen Kalender hinzufügen',
          testo:
            'Einstellungen › Schuljahr und Stundenplan › **ICS-Kalender**: Man fügt den ' +
            'Abonnement-Link der Schule ein (`https://…` oder `webcal://…`) und klickt ' +
            '**Hinzufügen**, oder **Eine Datei…** für eine `.ics`-Datei von der Festplatte. Es ' +
            'können mehrere sein — der Stundenplan der Schule, der der Labors — und man fügt ' +
            'sie auch im Fenster von **Mit dem Kalender abgleichen** hinzu.',
        },
        {
          termine: 'Die Kopie im Dokument',
          testo:
            'Von jedem Kalender behält das Klassenbuch eine Kopie im Dokument und liest immer ' +
            'diese: Der Abgleich funktioniert ohne Netz und auf einem anderen Computer. ' +
            '**Aktualisieren** holt sie neu von der Quelle; lässt sich die Quelle nicht lesen, ' +
            'bleibt die bisherige.',
        },
        {
          termine: 'Name, Adresse, Papierkorb',
          testo:
            'Den Namen ändert man in seinem Feld. Von der Herkunft sieht man nur die Website, ' +
            'nie den ganzen Link, der oft einen persönlichen Schlüssel enthält: Man korrigiert ' +
            'ihn unter «Adresse oder Datei ändern», und die neue ersetzt die alte nur, wenn sie ' +
            'sich lesen lässt. Der Papierkorb entfernt den Kalender und seine Kopie; **Alles ' +
            'entfernen**, oben im Bereich, entfernt Kalender, Kopien und Regeln. Die schon ' +
            'geschriebenen Stunden bleiben immer.',
        },
        {
          termine: 'In der Woche',
          testo:
            '**ICS-Kalender** in der Aktionsleiste, bei eingeschaltetem **Bearbeiten**, legt ' +
            'die Termine in eine gestrichelte Spur rechts von jedem Tag. Erneutes Einschalten ' +
            'liest die Kopien neu; einen Kalender, der sich nicht lesen lässt, meldet der ' +
            'Untertitel der Seite. Ausgeschaltet blendet er auch die Zeichen des Streifens und ' +
            '**Mit dem Kalender abgleichen** aus.',
        },
        {
          termine: 'Termin und Stunde, verbunden',
          testo:
            'Ein Termin, der auf eine Stunde seines Kurses fällt, übernimmt deren Farbe, und ' +
            'die Stunde trägt eine Kette; fährt man über das eine, leuchtet das andere auf. Ein ' +
            'Termin ohne Stunde sagt «frei».',
        },
        {
          termine: 'Die Zeichen des Streifens',
          testo:
            'Bei eingeschaltetem **ICS-Kalender** zeigt der Streifen in der Woche, wo Kalender ' +
            'und Klassenbuch nicht übereinstimmen: `+` ein Termin ohne Stunde, `−` ' +
            'eine Stunde ohne Termin, `?` beides, aber nur durch ein Indiz verbunden ' +
            'und nicht durch eine Regel. Öffnet man die Woche, nimmt die Stunde oder der ' +
            'Termin, der nicht passt, dieselbe Farbe an.',
        },
        {
          termine: 'Auf den Terminen',
          testo:
            'Ein Klick auf einen verbundenen Termin öffnet seine Stunde; `Ctrl`+Klick wählt ' +
            'mehrere desselben Tages. Mit der rechten Maustaste: **Stunde aus dem ' +
            'Termin erstellen…**, **Einem Kurs zuordnen…** (oder **Kurszuordnung ändern…**) ' +
            'und **Auswahl aufheben**.',
        },
        {
          termine: 'Stunde aus dem Termin erstellen',
          testo:
            'Das Fenster fragt nach Kurs und Zimmer und schlägt den Text vor, an dem ähnliche ' +
            'Termine erkannt werden: Mit «Zuordnung für ähnliche Termine merken» wird die Wahl ' +
            'zur Regel. Die gewählten Termine — oder die beiden Hälften eines Blocks — ergeben ' +
            'eine einzige Stunde, mit der Pause dazwischen. Hat der Kurs schon eine Stunde, die ' +
            'sich damit überschneidet, hält es an und sagt es.',
        },
      ],
      note: [
        'Eine Stunde mit Kette lässt sich weder ziehen noch löschen, und in ihrem Formular ' +
          'sind Kurs, Datum und das Zeitfenster des Termins gesperrt — auch das Zimmer, wenn ' +
          'der Termin eines angibt: Das bestimmt der Kalender der Schule. Ändert sich die ' +
          'Stunde wirklich, ändert man sie dort; nach **Aktualisieren** gleicht **Aus ICS ' +
          'synchronisieren** (rechte Maustaste auf der Stunde) sie sofort an.',
        'Die Termine sieht man nur in der Woche: Im Monat, im Jahr und in der Agenda ist der ' +
          'Kalender der Schule wie ausgeschaltet. Die Sperre der gebundenen Stunden bleibt ' +
          'dagegen immer: Sie hängt vom Stundenplan ab, nicht davon, was man anschaut.',
        'Neben der Zeit des Termins kann man weitere hinzufügen, oder eine Pause: im Formular ' +
          '(**Zeitfenster für Unterricht**, **Pause**, und die Zeile lässt sich über oder unter ' +
          'das Zeitfenster mit der Kette ziehen) oder durch Ziehen an den Griffen beim ' +
          'Bearbeiten. Sie sind keine Abweichung vom Kalender, und verschiebt sich der Termin, ' +
          'gehen sie mit: die davor mit seinem Beginn, die danach mit seinem Ende.',
      ],
    },
    icsRegole: {
      titolo: 'Abgleich und Zuordnungsregeln',
      sommario:
        'Wie das Klassenbuch erkennt, zu welchem Kurs ein Termin gehört, und wie der Kalender ' +
        'Stunden vorschlägt, ohne sie selbst zu schreiben.',
      scritte: {
        evento: 'Termin',
        titoloELuogo: 'Titel und Ort',
        corso: 'Kurs',
        quattroProve: 'vier Kriterien',
        lezione: Uno(DE.lezione),
        piuSovrapposta: 'grösste Überlappung',
        proposta: 'Vorschlag',
        daSpuntare: 'abzuhaken',
        giornoIntero: 'ganztägig oder',
        mezzanotte: 'über Mitternacht:',
        lasciatoFuori: 'bleibt draussen',
        prova1: '1  eine Regel',
        prova2: '2  der Klassenname',
        prova3: '3  der feste Stundenplan',
        prova4: '4  eine Stunde im Kalender',
        nessunaSotto: 'keine darunter:',
        oraDaCreare: 'Stunde erstellen',
        daCreare: 'zu erstellen',
        daAllineare: 'anzugleichen',
        daAnnullare: 'abzusagen',
        maiDaCancellare: 'nie: zu löschen',
      },
      figure: [
        {
          didascalia:
            'Jeder Termin findet zuerst seinen Kurs, dann die Stunde dieses Kurses, mit der er ' +
            'sich am meisten überschneidet. Heraus kommt ein Vorschlag: Das Klassenbuch schreibt ' +
            'nur, was man abhakt.',
          legenda: [
            'Die Kriterien, vom deutlichsten zum schwächsten Indiz: Es entscheidet das erste, ' +
              'das genau einen Kurs nennt. Zwei Antworten zählen wie keine.',
            'Die drei Stapel der Durchsicht. Keiner löscht: Eine Stunde, die der Kalender ' +
              'nicht hat, wird nur aufgeführt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Mit dem Kalender abgleichen',
          testo:
            'In der Aktionsleiste des Kalenders, im Feld **ICS-Kalender** nach seinem Schalter, ' +
            'bei eingeschaltetem **ICS-Kalender**: Es öffnet die Liste der Kalender des ' +
            'Dokuments, und **Abgleichen** stellt den gewählten den Stunden gegenüber. ' +
            'Abgeglichen wird die Kopie: Für den Kalender von heute zuerst **Aktualisieren**.',
        },
        {
          termine: 'Die Stapel der Durchsicht',
          testo:
            '**Zu erstellen**: Termine eines Kurses ohne Stunde darunter. **Anzugleichen**: ' +
            'Die Stunde gibt es, aber zu einer anderen Zeit oder in einem anderen Zimmer. ' +
            '**Abzusagen**: Der Kalender meldet sie als ausgefallen. Jeder Stapel hat sein ' +
            'Häkchen «Alle»; die übereinstimmenden liegen zugeklappt am Ende.',
        },
        {
          termine: 'Die Häkchen anwenden',
          testo:
            'Ändert nur, was abgehakt ist, alles auf einmal. Beim Angleichen bleiben ' +
            'Präsenzkontrolle, Plan und Texte; schon gehaltene Stunden sind nicht abgehakt. ' +
            'Absagen markiert als ausgefallen, es löscht nicht.',
        },
        {
          termine: 'Im Klassenbuch, aber nicht im Kalender',
          testo:
            'Nur aufgeführt, ohne Häkchen. Es zählen nur die Kurse, die der Kalender kennt, ' +
            'und nur die Tage, die er abdeckt; eine Stunde, die es wirklich nicht gibt, ' +
            'entfernt man oder lässt sie auf ihrer Seite ausfallen.',
        },
        {
          termine: 'Termine ohne Kurs',
          testo:
            'Für jede Gruppe ein Text und eine Auswahlliste: Man wählt den Kurs oder «Keine ' +
            'Stunde», und die Wahl wird zur Regel. Der Abgleich läuft sofort neu; die ' +
            'Regeln werden mit den Häkchen gespeichert. Gekürzt — `DIC4a` statt des ganzen ' +
            'Titels — gilt der Text für alle Termine, die ihn enthalten.',
        },
        {
          termine: 'Wie man eine Regel schreibt',
          testo:
            'Alle Wörter, in beliebiger Reihenfolge, im Titel oder im Ort, ohne auf Gross- und ' +
            'Kleinschreibung oder Akzente zu achten. `A | B` gilt für das eine oder das andere, ' +
            '`DIC1*` für jedes Wort, das so beginnt, `/…/` ist ein regulärer Ausdruck. Von zwei ' +
            'zutreffenden Regeln gewinnt die, die mehr sagt.',
        },
        {
          termine: 'Der Bereich der Regeln',
          testo:
            'Unter Einstellungen › Schuljahr und Stundenplan › **ICS-Kalender**, unter den ' +
            'Kalendern, für alle gemeinsam. Neben jeder Regel, wie viele Termine sie entscheidet ' +
            'und wie viele sie erkennt, eine Zählung, die sich beim Schreiben erneuert. Gemeldet ' +
            'werden Doppelte, Ausdrücke, die sich nicht lesen lassen, und Kurse, die es nicht ' +
            'mehr gibt; **Alle entfernen** leert sie. Vom Fenster der Kalender kommt man mit ' +
            '**Regeln öffnen** dorthin.',
        },
        {
          termine: 'Ohne Regel',
          testo:
            'Das Klassenbuch versucht es selbst: der Name der Klasse im Titel, der feste ' +
            'Stundenplan eines einzigen Kurses, eine Stunde, die schon im Kalender steht. Das ' +
            'sind Indizien, und das Etikett neben jedem Vorschlag sagt, welches entschieden hat: ' +
            '«per Regel», «aus dem Namen», «aus dem Stundenplan», «aus der schon eingetragenen ' +
            'Stunde».',
        },
      ],
      note: [
        'Zwei Termine derselben Regel, höchstens fünfzehn Minuten auseinander, sind dieselbe ' +
          'Stunde mit der Pause dazwischen und werden zu einer einzigen Stunde mit einer Pause. ' +
          'Mehr Abstand, und es sind zwei Stunden.',
        'Eine Regel gilt für alle Kalender des Dokuments: `DIC4a CP` bedeutet diesen Kurs, wo ' +
          'immer er auftaucht. Besser wenige kurze Regeln als eine pro Titel.',
      ],
    },
    todo: {
      titolo: Molti(DE.pendenza),
      sommario:
        'Was im gewählten Kurs offen ist, ohne andere Klassen oder Fächer zu mischen.',
      scritte: {
        corso: 'DIC4a · Kommunikation',
        ruolo: 'Lehrperson des Kurses',
        nuovaConsegna: 'Neuer Auftrag',
        consegnaLaClasse: 'Die Klasse gibt ab',
        rimasteIndietro: 'Überfällig',
        entroLaSettimana: 'Bis Ende Woche',
        fatto: 'Erledigt · Erledigtes anzeigen',
        momenti: 'Leistungsbeurteilungen',
        consegnaUnFoglio: 'gibt ein Blatt ab',
        svolgeQualcosa: 'erledigt etwas',
        toccaAllaClasse: 'Sache der Klasse',
        toccaAlDocente: 'Sache der Lehrperson',
        svolgeLaClasse: 'Die Klasse erledigt',
        consegnaIlDocente: 'Die Lehrperson gibt aus',
        svolgeIlDocente: 'Die Lehrperson erledigt',
        inCimaInFondo:
          'Oben, was auf andere wartet, unten, was von der Lehrperson abhängt',
      },
      figure: [
        {
          didascalia:
            'Die Seite gehört zum Kurs in der Kopfzeile. Sie zeigt fünf Bereiche, offene ' +
            'Einträge nach Dringlichkeit und unten die erledigten.',
          legenda: [
            'Kurs und Rolle zeigen den Kontext: Hier arbeitet man als Lehrperson des Kurses.',
            'Fünf Felder: Beurteilungen und vier Auftragsarten. Rot bedeutet überfällig.',
            'Jeder Bereich enthält nur Einträge des gewählten Kurses, nach Dringlichkeit.',
            'Was erledigt wurde: Es öffnet sich, wenn man es sucht.',
          ],
        },
        {
          didascalia:
            'Beurteilungen bilden einen Bereich. Die anderen vier entstehen aus der Verbindung ' +
            'von Handelnden — Klasse oder Lehrperson — und Handlung: abgeben oder erledigen.',
        },
      ],
      voci: [
        {
          termine: 'Ein Kurs auf einmal',
          testo:
            `${Molti(DE.pendenza)} steht im Bereich **Klassenbuch**. Die Seite verwendet den ` +
            'gewählten Kurs; beim Kurswechsel ändern sich die ganze Seite und **Neuer Auftrag**.',
        },
        {
          termine: 'Wer muss was tun',
          testo:
            `**Die Klasse gibt ab**: die Blätter, die die ${DE.pif.plurale} bringen müssen. ` +
            '**Die Klasse erledigt**: was aufgegeben wurde. **Die Lehrperson gibt aus**: ' +
            'Zeugnisse, Einladungen, Formulare, die zu Hause zu unterschreiben sind. **Die ' +
            'Lehrperson erledigt**: Kopien, Vorbereitungen, Administratives.',
        },
        {
          termine: 'Die Reihenfolge ist die Dringlichkeit',
          testo:
            'In jeder Art: **Überfällig**, **Heute fällig**, **Bis Ende Woche**, **Später ' +
            'oder ohne Frist**. Der Kurs steht bereits in der Kopfzeile.',
        },
        {
          termine: 'Die Aufträge',
          testo:
            'Jede Zeile sagt, wer fehlt — «es fehlen Rossi, Bianchi, Verdi +2» — und diese ' +
            'Übersicht öffnet das Einsammeln, mit einem Namen pro Zeile, **Alle markieren** und ' +
            '**Alle entfernen**. Das Häkchen am Ende der Zeile markiert alle Fehlenden auf ' +
            'einmal; der Stift öffnet den Auftrag.',
        },
        {
          termine: 'Die Nachprüfungen',
          testo:
            'Unter **Leistungsbeurteilungen** die Prüfungen, die nachzuholen sind, für alle, ' +
            'die nicht da waren: festzulegen, heute, diese Woche, später, nicht nachgeholt. Der ' +
            'Kalender legt sie auf die nächste Stunde des Kurses, die Büroklammer hängt den ' +
            'Scan an, der Stift öffnet Datum und Notiz, das Kreuzchen erklärt, dass sie nicht ' +
            'nachgeholt werden. Das Eintragen der Note schliesst sie.',
        },
        {
          termine: 'Die geschriebenen Prüfungen',
          testo:
            '**Zu korrigieren** schliesst sich mit dem Eintragen der Noten; **Zurückzugeben** ' +
            'muss man melden: **Allen zurückgegeben** schreibt den Tag bei allen, die noch kein ' +
            'Datum haben. Liegt es länger als zwei Wochen, wird die Zeile rot.',
        },
        {
          termine: 'Wer bei der Rückgabe fehlte',
          testo:
            '**Zurückzugeben an** führt auf, wem die Prüfung noch nicht zurückgegeben wurde: ' +
            'Das Rückgabedatum gehört zu jeder Zeile, nicht zur Prüfung. Auch bewertete ' +
            'Nachprüfungen haben ihr «zurückgegeben am».',
        },
        {
          termine: 'Das Feld «Erledigt»',
          testo:
            'Ganz unten, zugeklappt: **Erledigtes anzeigen** öffnet abgeschlossene ' +
            'Nachprüfungen, zurückgegebene Prüfungen und erledigte Aufträge. Es ' +
            'dient für «Habe ich sie Rossi schon zurückgegeben?», und von dort lässt sich eine ' +
            'Zeile wieder öffnen.',
        },
      ],
      note: [
        `${Molti(DE.pendenza)} der Beurteilungen werden aus Noten und Präsenzkontrollen ` +
          'abgeleitet; die vier Auftragsarten werden hier oder in der Stunde erstellt und erledigt.',
        'Das Rückgabedatum ist keine Buchhaltung: Von ihm aus laufen die Fristen eines ' +
          'Rekurses. Die Taste neben dem Feld schreibt den Tag, von dem aus man schaut — in ' +
          'einer Stunde den der Stunde, sonst heute —, und man korrigiert ihn von Hand.',
      ],
    },
    smistare: {
      titolo: 'Zuzuordnen',
      sommario:
        'Die Klassen-PDF, die noch Seiten ohne Besitzer haben, aus allen Klassen zusammen.',
      scritte: {
        trascinato: 'gezogen oder geladen',
        lettura: 'Lesen',
        ocr: 'Text, sonst OCR',
        proposte: 'Vorschläge',
        unNome: 'ein Name, ein Block',
        fascicolo: 'Dossier',
        archiviato: 'abgelegt und abgehakt',
        conferma: 'ziehen · N Vorschläge bestätigen',
        senzaGesto: 'ohne Handgriff wird nichts abgelegt',
        nonAttribuiti: 'Nicht zugeordnet',
        qualeClasse: 'Zu welcher Klasse?',
      },
      figure: [
        {
          didascalia:
            'Ein Klassen-PDF kommt als Ganzes herein, wird Seite für Seite gelesen, und heraus ' +
            'kommen Vorschläge. Zu Dokumenten einer Person werden sie erst mit einem Handgriff.',
          legenda: [
            'Der Text jeder Seite. Stumme Scans kommen in die Warteschlange zum Lesen, ' +
              'Dutzende Sekunden pro Seite.',
            'Eine Seite, die jemanden nennt, eröffnet ihren Block, und die folgenden ohne Namen ' +
              'bleiben daran hängen.',
            'Abgelegt wird, indem man die Seiten auf das Feld zieht oder die Vorschläge ' +
              'gesammelt bestätigt.',
            'Ein PDF ohne Klasse bleibt ausserhalb jedes Dossiers, bis man ihm eine gibt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ein PDF hereinholen',
          testo:
            'Aus dem **Dokumentenarchiv** der Klasse: indem man es auf die Seite zieht, oder mit ' +
            '**PDFs laden**. Es kommt ins Dokument des Schuljahrs und öffnet sich von selbst im ' +
            'Rahmen, bereit zum Aufteilen.',
        },
        {
          termine: 'Ein Stapel pro Klasse',
          testo:
            'Jede Klasse, in der man unterrichtet, hat ihren: «Klasse · N Seiten zuzuordnen», ' +
            'und darunter ein PDF pro Zeile mit den übrigen Seiten und dem Tag, an dem es ' +
            'hereinkam. Eine Datei, die sich nicht öffnen lässt, trägt das Etikett «lässt sich ' +
            'nicht öffnen».',
        },
        {
          termine: 'Zuordnen',
          testo:
            'Führt ins **Dokumentenarchiv** dieser Klasse, mit dem PDF schon im Rahmen ' +
            'geöffnet: Dort ordnet man zu, weil dort die Felder sind, auf die man die Seiten ' +
            'legt.',
        },
        {
          termine: 'Die Vorschläge',
          testo:
            'Das Klassenbuch liest jede Seite und sucht die Namen der Klasse. Vor- und Nachname ' +
            'zusammen gelten als sicher; einen Nachnamen, den in der Klasse zwei tragen, lost ' +
            'es nicht aus, und die Seite wartet auf eine Hand.',
        },
        {
          termine: 'Die Seiten aufteilen',
          testo:
            'Im Rahmen wählt man eine Seite mit einem Klick — `Ctrl`, um weitere dazuzunehmen, ' +
            '`Umschalt` für einen Bereich — und zieht sie auf das Feld der Person. **N ' +
            'Vorschläge bestätigen** legt die schon erkannten mit einem Handgriff ab, wenn das ' +
            'PDF weiss, zu welchem Dokument es gehört.',
        },
        {
          termine: 'Die rechte Maustaste auf einer Seite',
          testo:
            '**Zuweisen an…** fragt nach Person und Dokument, **Scan neu lesen** stellt sie ' +
            'wieder in die Warteschlange, **Im Betrachter öffnen** zeigt sie im Programm des ' +
            'Systems, **Wegwerfen** entfernt sie — das Deckblatt des Scanners, ein leeres Blatt.',
        },
        {
          termine: 'Die Scans',
          testo:
            '**Scans lesen (N)** stellt die Seiten ohne Text in die Warteschlange; **Neu ' +
            'lesen** liest auch die schon gelesenen noch einmal. Die Warteschlange zeigt, wie ' +
            'weit sie ist, und **Anhalten** leert sie. Ist das Lesen ausgeschaltet, heisst die ' +
            'Schaltfläche **Lesen aus** und führt zur Einstellung.',
        },
        {
          termine: 'Verschieben nach…',
          testo:
            'Ein PDF, das in der falschen Klasse gelandet ist — oder ein Scan, der zwei Klassen ' +
            'umfasst —, schickt man mit der Auswahlliste an eine andere. Die schon abgelegten ' +
            'Seiten bleiben, wo sie sind, und das Klassenbuch macht die Vorschläge mit den ' +
            'Namen der neuen Klasse neu.',
        },
        {
          termine: 'Keiner Klasse zugeordnet',
          testo:
            'Die PDF, die hereinkamen, ohne zu sagen, wem sie gehören — meist aus dem alten ' +
            'Ordner `in-arrivo/`, den das Klassenbuch beim Öffnen leert —, liegen auf einem ' +
            'eigenen Stapel, mit der Auswahlliste «Zu welcher Klasse gehört es?». Ist die ' +
            'Klasse angegeben, liest das Klassenbuch sie neu und sucht die Namen.',
        },
        {
          termine: 'Wenn sie leer ist',
          testo:
            '«Nichts zuzuordnen», mit **Zum Dokumentenarchiv**. Die Zahl neben «Zuzuordnen» in ' +
            'der Seitenleiste zählt die Seiten, die warten.',
        },
      ],
      note: [
        'Einen Namen zu erkennen ist eine Vermutung: Darum wird nichts von selbst abgelegt. ' +
          'Die abgelegte Seite wird ausgeschnitten, ins Dossier der Person gelegt und in ihrem ' +
          'Auftrag abgehakt.',
        'Ein schon volles Feld nimmt keine Seiten an: Das Dokument von jemandem, der schon ' +
          'abgegeben hat, wird nicht überschrieben.',
        'Das Lesen der Scans läuft auf dem Rechner, mit einem Modell, das unter Einstellungen ' +
          '› Programm › **Sprachmodelle** gewählt wird, und es ist langsam: Am besten startet ' +
          'man es für den ganzen Stapel und macht inzwischen etwas anderes.',
      ],
    },
  },
  fr: {
    oggi: {
      titolo: 'Tableau de bord',
      sommario:
        'La journée en un coup d’œil : les leçons d’aujourd’hui, ce qui reste ouvert, et où ' +
        'aller. On regarde, et on y va.',
      scritte: {
        ora1: 'DIC4a · Mathématiques',
        ora2: 'DIC2b · Physique',
        prova1: 'Épreuve unité 2 · DIC2b',
        prova2: 'Oral · DIC4a',
        festeggiato: 'Ferrari Giulia',
      },
      figure: [
        {
          didascalia:
            'Au premier démarrage, le registre s’ouvre ici. Sur la page, on ne fait rien : ' +
            'chaque cadre mène là où la chose se fait.',
          legenda: [
            'Les quatre tuiles : les leçons du jour, celles à compléter, les ' +
              `${FR.pendenza.plurale} ouvertes, les pages à trier. Un clic mène à leur page.`,
            'La leçon en cours — ou, entre deux leçons, la prochaine — est mise en évidence. ' +
              'Chaque leçon dit où elle en est, et un clic l’ouvre.',
            'Les prochaines évaluations, avec les jours qui restent.',
            'Les anniversaires du jour, quand il y en a un.',
          ],
        },
      ],
      voci: [
        {
          termine: 'On regarde, et on y va',
          testo:
            'La page ne change rien au registre et n’a pas de commandes dans la barre ' +
            'd’actions : elle dit où en est la journée et mène là où l’on travaille. Les gestes ' +
            'se trouvent sur leurs pages.',
        },
        {
          termine: 'Les quatre tuiles',
          testo:
            '**Leçons du jour** mène au calendrier sur aujourd’hui, et dit dessous à quelle ' +
            'heure est la prochaine ou jusqu’à quand dure celle en cours. **À compléter** compte ' +
            'les leçons restées sans registre dans la période choisie et ouvre la plus ' +
            'ancienne — ou la prochaine, si tout est en ordre. ' +
            `**${Molti(FR.pendenza)}** et **À trier** mènent à leurs pages, avec le même nombre ` +
            'que la barre latérale et la barre du bas.',
        },
        {
          termine: 'Les leçons d’aujourd’hui',
          testo:
            'Dans l’ordre du calendrier : début et fin, classe et branche, sujet et salle. La ' +
            'pastille dit où en est la leçon — **En cours**, **À clôturer**, **Donnée**, ' +
            '**À préparer**, **Prévue**, **Annulée**. La leçon en cours porte « Maintenant » ; ' +
            'entre deux leçons, c’est la prochaine qui s’allume, avec « Ensuite ». Un clic ouvre ' +
            'la leçon.',
        },
        {
          termine: 'Prochaines évaluations',
          testo:
            'Les cinq prochaines des cours de l’année, de la plus proche à la plus lointaine, ' +
            'avec les jours qui restent : « aujourd’hui », « demain », « dans 3 jours ». Un clic ' +
            'ouvre l’évaluation.',
        },
        {
          termine: 'Anniversaires du jour',
          testo:
            `Les ${FR.pif.plurale} qui fêtent leur anniversaire aujourd’hui, avec leur classe. ` +
            'Le cadre n’apparaît que s’il y a quelqu’un à fêter.',
        },
        {
          termine: 'La première page',
          tasti: 'Ctrl+1',
          testo:
            'Au premier démarrage, le registre s’ouvre ici ; ensuite, il rouvre la page où on ' +
            'l’avait laissé. On y revient de n’importe quelle page avec `Ctrl+1` : c’est la ' +
            'première entrée de la barre latérale.',
        },
      ],
      note: [
        'Les nombres sont ceux des pages où mènent les tuiles, comptés de la même façon : une ' +
          'tuile qui dirait « 3 » et ouvrirait une page qui en montre deux apprendrait à ne pas ' +
          'la croire. Le filtre **Période** limite le Tableau de bord ; sans cours aujourd’hui, ' +
          'il montre la prochaine journée de cours de la période.',
      ],
    },
    calendario: {
      titolo: 'Calendrier',
      sommario:
        'Quand on donne cours. Quatre vues des mêmes leçons, et le jour choisi passe de l’une ' +
        'à l’autre.',
      scritte: {
        calendario: 'Calendrier',
        pendenze: 'En suspens',
        daSmistare: 'À trier',
        stato: 'à remplir : DIC4a · lun',
        anno: 'Année',
        agenda: 'Agenda',
        nuovaOra: 'Nouvelle leçon',
        striscia: 'Semaines de l’année · 34 sur 38 avec des leçons',
        lun: 'lun 14',
        mar: 'mar 15',
        mer: 'mer 16',
        gio: 'jeu 17',
        ven: 'ven 18',
        svolta: 'donnée',
        pianificata: 'prévue',
        inCorso: 'en cours',
        annullata: 'annulée',
      },
      figure: [
        {
          didascalia:
            'La vue Semaine : en haut, ce qu’on fait avec la page, dessous l’année dans une ' +
            'bande, et la grille des jours avec des leçons aussi hautes qu’elles durent.',
          legenda: [
            '**Aujourd’hui**, les flèches **Retour** et **Suivant**, les quatre vues et, avec ' +
              '**Modifier** activé (en haut, à côté de **Projeter**), **Nouvelle leçon**.',
            'Toutes les semaines de l’année, même les vides : numéro, lettre A/B, combien de ' +
              'leçons. La flèche en haut à droite la replie, et le registre s’en souvient.',
            'Les jours : vacances grisées, limites de semestre, le gâteau des anniversaires.',
            'Une leçon : en pointillé si prévue, pleine si donnée, pâle et barrée si annulée.',
            'La ligne de maintenant, dans la colonne d’aujourd’hui : elle bouge toute seule.',
            'Les heures : de la première à la dernière de la journée choisie dans les ' +
              'Paramètres, à l’heure pleine — ou, avec les pauses de la journée, aux limites ' +
              'des périodes —, à la même hauteur toute l’année.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Semaine',
          testo:
            'La vue de travail : des leçons aussi hautes qu’elles durent, avec les pauses et ' +
            'les chevauchements, un jour par colonne.',
        },
        {
          termine: 'Les heures de la semaine',
          testo:
            'La grille va de **Première heure affichée** à **Dernière heure affichée** dans ' +
            'Paramètres › Année et horaire › Calendrier, arrondies à l’heure pleine : 10 h est ' +
            'à la même hauteur toute l’année. Seule une leçon ou un événement ICS qui en sort ' +
            'l’agrandit, et seulement pour sa semaine.',
        },
        {
          termine: 'Les lignes sur les pauses',
          testo:
            'Avec des **Pauses de la journée** définies dans les Paramètres, les lignes ne ' +
            'marquent pas les heures pleines mais les limites des périodes entre deux pauses, ' +
            'avec le début et la fin de chaque pause. Une leçon glissée ou dessinée s’accroche ' +
            'à ces lignes, et le repère montre déjà où elle tombera.',
        },
        {
          termine: 'Samedi et dimanche',
          testo:
            'On les affiche et on les masque dans **Jours affichés**, sous Paramètres › Année ' +
            'et horaire › Calendrier : cela vaut pour la semaine, le mois et la projection.',
        },
        {
          termine: 'Modifier',
          testo:
            'En haut, à côté de **Projeter** (Ctrl+E) ; dans le calendrier, il vaut pour la ' +
            'semaine et le mois : la grille n’ouvre plus les leçons au clic, elle les prend en ' +
            'main. En appuyant et en tirant sur le vide, on dessine une leçon, en périodes ' +
            'entières ; un clic simple lui donne la longueur de la **Plage horaire d’une ' +
            'nouvelle leçon** définie dans Paramètres › Année et horaire › Calendrier. Avec un ' +
            'cours dans le filtre, la leçon appartient aussitôt à ce cours ; sans, le ' +
            'formulaire s’ouvre avec le jour, l’heure et la durée déjà remplis. Les poignées ' +
            'en haut et en bas d’un bloc l’allongent ou le raccourcissent. En modification ' +
            'apparaissent aussi **Nouvelle leçon** et les commandes du calendrier ICS, et un ' +
            'clic sur un événement ICS libre en génère la leçon — sur un événement déjà associé, ' +
            'il ouvre le formulaire de la sienne. Un clic choisit une leçon : les flèches la ' +
            'déplacent (dans la semaine ↑ ↓ de cinq minutes, avec Maj d’une période ; dans le ' +
            'mois d’une semaine ; ← → d’un jour), **Ctrl+D** la copie à la semaine suivante, ' +
            '**Entrée** l’ouvre, **F2** ouvre son formulaire, **Suppr** la supprime — tout de ' +
            'suite si elle est vide, en demandant si elle a déjà un appel ou des notes. Chaque ' +
            'geste est un seul pas de l’historique : Ctrl+Z l’annule. **Échap** abandonne la ' +
            'sélection, et un second Échap quitte la modification. Les leçons ancrées au ' +
            'calendrier ICS restent fixes : leurs poignées ajoutent ou retirent des plages ' +
            'avant et après l’heure de l’événement, qui ne bouge pas.',
        },
        {
          termine: 'La bande des semaines',
          testo:
            'Au-dessus de la semaine, « Semaines de l’année » et toutes celles de l’année à la ' +
            'file : le numéro, la lettre A/B et combien de leçons y tombent — même les vides, ' +
            'qui sont les trous à combler. Un signe ferme la semaine où finit le premier ' +
            'semestre ; un clic mène à une semaine.',
        },
        {
          termine: 'Replier la bande',
          testo:
            'La flèche en haut à droite de la bande la ferme, en ne laissant que l’en-tête, et ' +
            'la rouvre. Le registre s’en souvient aussi à la prochaine ouverture : sur un écran ' +
            'bas, ce sont des heures de semaine en plus.',
        },
        {
          termine: 'Mois',
          testo:
            'Une bande continue qui défile dans l’année, sans saut d’un mois à l’autre : le nom ' +
            'du mois reste en haut. Dans la première colonne, le numéro de la semaine, qui ' +
            's’ouvre d’un clic. Au-delà de quatre leçons dans un jour apparaît « +N ».',
        },
        {
          termine: 'Année',
          testo:
            'La feuille que l’école imprime et affiche : les mois en colonnes, les jours en ' +
            'lignes, divisés par semestre. Dans chaque case, le nom des vacances, ou combien de ' +
            'cours il y a ce jour-là ; un clic ouvre cette semaine. Dessous, ce que veulent dire ' +
            'les couleurs.',
        },
        {
          termine: 'Agenda',
          testo:
            'Les leçons en liste, une ligne chacune, divisées par semaine : toute l’année, et en ' +
            'l’ouvrant on arrive sur le jour choisi. Chaque ligne indique l’horaire, la classe, ' +
            'la branche et la durée ; pour une leçon donnée, aussi les présents.',
        },
        {
          termine: 'Aujourd’hui et les flèches',
          testo:
            'Dans la barre d’actions. **Aujourd’hui** revient à aujourd’hui et, dans la semaine, ' +
            'défile jusqu’à l’heure actuelle. **Retour** et **Suivant** avancent d’un mois dans ' +
            'la vue Mois, d’une semaine dans toutes les autres.',
          tasti: 'Ctrl+Alt+T',
        },
        {
          termine: 'Les raccourcis du menu',
          testo:
            '`Ctrl+Alt+T` et `Ctrl+Alt+N` sont écoutés par le menu, depuis n’importe quelle ' +
            'page : ils mènent au calendrier et font ce que font **Aujourd’hui** et **Nouvelle ' +
            'leçon**. Avec une fenêtre ouverte, ils ne font rien, et un avis demande de la ' +
            'fermer d’abord.',
        },
        {
          termine: 'Les chiffres de l’en-tête',
          testo:
            'À côté du titre, la période et le semestre où elle tombe ; dessous, quatre comptes ' +
            'de la semaine choisie : leçons, périodes, heures effectives et combien il en reste ' +
            'à donner.',
        },
        {
          termine: 'Filtre par cours',
          testo:
            'Dans la ligne des choix, « Cours » avec « Tous les cours » : le calendrier ne ' +
            'montre que les leçons du cours choisi. Il ne change pas le cours sur lequel sont ' +
            'réglées les pages du Registre ; en ouvrant depuis ailleurs une leçon d’un autre ' +
            'cours, le filtre passe sur celui-ci.',
        },
        {
          termine: 'Vacances, semestres et semaines A/B',
          testo:
            'Les jours de fermeture sont grisés dans toutes les vues, avec le nom dans ' +
            'l’info-bulle ; à côté du numéro du jour, un signe indique où un semestre finit ou ' +
            'commence. Tout se décide dans Paramètres › Année et horaire › **Année scolaire**.',
        },
        {
          termine: 'Leçons un jour de fermeture',
          testo:
            'Des vacances définies après avoir mis l’horaire, ou une leçon placée à la main un ' +
            'jour fermé : dans la semaine, un avis dit combien de leçons tombent un jour de ' +
            'fermeture, et lequel. Avec **Modifier** activé, **Retirer les leçons pendant les ' +
            'vacances** les retire toutes ensemble, après confirmation ; `Ctrl+Z` les ramène.',
        },
        {
          termine: 'Anniversaires',
          testo:
            'Un gâteau avec le nom et l’âge dans le mois et dans l’agenda, où un clic ouvre la ' +
            'fiche de la personne. Dans la semaine et dans l’année, ce n’est qu’un signe sur le ' +
            'jour : les noms sont dans l’info-bulle. Ceux d’une classe qu’on n’a pas en cours ce ' +
            'jour-là restent pâles ; avec un cours dans le filtre, on voit ceux de sa classe.',
        },
      ],
      note: [
        'Le jour choisi est le même pour les quatre vues : on regarde le mois, on passe à la ' +
          'semaine, et on est toujours au même endroit. Le défilement aussi est mémorisé : ' +
          'dans la semaine, seul **Aujourd’hui** le change, en menant à l’heure actuelle ; ' +
          'dans le mois, **Aujourd’hui** et les flèches ramènent la bande sur le jour choisi.',
        'Le semestre d’une épreuve est celui où tombe sa date : un contrôle placé le ' +
          'lendemain de la limite finit dans l’autre bulletin. Le signe sur le jour sert à le ' +
          'voir avant.',
      ],
    },
    calendarioOre: {
      titolo: 'Les leçons dans le calendrier',
      sommario:
        'Comment on place, déplace et copie les leçons, et ce qu’on en fait sans les ouvrir.',
      scritte: {
        mar: 'mar',
        mer: 'mer',
        presa: 'saisie',
        trascinare: 'Glisser déplace ;',
        o: 'ou',
        copia: 'en relâchant : copie',
        apriLezione: 'Ouvrir la leçon',
        modifica: 'Modifier…',
        segnaSvolta: 'Marquer comme donnée',
        annullaLezione: 'Annuler la leçon',
        assegnaPiano: 'Attribuer un plan de leçon',
        copiaSettimana: 'Copier à la semaine suivante',
      },
      figure: [
        {
          didascalia:
            'Une leçon se prend avec la souris et se lâche là où elle va. Le menu du clic droit ' +
            'fait le reste sans l’ouvrir.',
          legenda: [
            'La leçon saisie reste à sa place, pâle, tant qu’on ne l’a pas lâchée.',
            'La ligne indique où elle tombera : aux cinq minutes, ou sur les lignes des ' +
              'périodes quand la journée a ses pauses. Dans le mois, seul le jour change.',
            'Avec `Ctrl` ou `Alt` enfoncé naît une copie, et l’original reste où il était.',
            'Le clic droit sur une leçon : ce qu’on fait sans l’ouvrir.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Une nouvelle leçon',
          testo:
            'Elle se crée avec **Modifier** activé : sinon, le calendrier se regarde. Dans la ' +
            'semaine, on appuie et on tire sur le vide ; dans le mois, un double clic sur le ' +
            'jour. Avec un cours dans le filtre, la leçon appartient à ce cours. **Nouvelle ' +
            'leçon**, qui apparaît dans la barre d’actions avec **Modifier** activé, l’ouvre ' +
            'sur le jour choisi avec le cours du moment. Le raccourci vaut partout, et active ' +
            'la modification tout seul.',
          tasti: 'Ctrl+Alt+N',
        },
        {
          termine: 'Le clic droit sur le vide',
          testo:
            'En consultation : **Aller à ce jour** et **Modifier le calendrier**. En ' +
            'modification : « Nouvelle leçon à … » avec l’heure où l’on a cliqué (dans le ' +
            'mois, « ce jour-là ») — tout de suite si le filtre indique le cours, et il y a ' +
            'alors aussi **Nouvelle leçon avec le formulaire…** ; sans filtre, il ouvre le ' +
            'formulaire déjà rempli — et **Quitter la modification**.',
        },
        {
          termine: 'Déplacer',
          testo:
            'En modification, on prend la leçon et on la lâche là où elle va : dans la semaine, ' +
            'le jour et l’heure changent, calés sur les cinq minutes — ou, avec les pauses de la ' +
            'journée, sur les lignes des périodes — ; dans le mois, seulement le jour. L’appel ' +
            'et les textes voyagent avec elle : c’est la même leçon, déplacée. Avec les pauses ' +
            'de la journée, ses périodes se redisposent autour de la récréation, et les pauses ' +
            'faites à la main cèdent la place à celles de la journée.',
        },
        {
          termine: 'Copier',
          testo:
            '`Ctrl` (ou `Alt`) enfoncé en lâchant : naît une copie prévue avec le même horaire, ' +
            'la même salle et le même plan, mais sans appel, observations ni sujets. On reste ' +
            'dans le calendrier, prêt pour la suivante.',
        },
        {
          termine: 'Deux leçons à la même heure',
          testo:
            'On peut le vouloir — une classe divisée, un co-enseignement — et le registre ne le ' +
            'refuse pas : il le dit dans l’avis, avec les classes sur lesquelles la leçon est ' +
            'tombée. Il regarde toutes les classes, même celles masquées par le filtre.',
        },
        {
          termine: 'Le clic droit sur une leçon',
          testo:
            'Toujours : **Ouvrir la leçon**, **Marquer comme donnée** (ou **Remettre en ' +
            'prévue**), **Annuler la leçon** (ou **N’est plus annulée**) et les entrées du ' +
            'plan — ouvrir, attribuer, changer, retirer. En modification, le clic droit choisit ' +
            'la leçon et ajoute ce qui touche l’horaire : **Modifier…** (F2), dans la semaine ' +
            '**Allonger d’une période** et **Raccourcir d’une période**, **Au jour précédent** ' +
            'et **Au jour suivant** (← →), **Copier à la semaine suivante** (Ctrl+D) et ' +
            '**Supprimer** (Suppr). Sur une leçon avec la chaîne restent **Modifier…**, ' +
            '**Synchroniser depuis l’ICS**, **Allonger d’une période** et **Raccourcir d’une ' +
            'période** : le jour et l’heure de l’événement sont dictés par le calendrier de ' +
            'l’école, et les deux dernières agissent sur les plages ajoutées à côté.',
        },
        {
          termine: 'Annuler ou supprimer',
          testo:
            'Une leçon annulée reste dans le registre, barrée, avec ce qu’elle contenait, et ne ' +
            'porte plus son numéro. **Supprimer** la retire complètement, après confirmation.',
        },
        {
          termine: 'Générer les leçons',
          testo:
            'Les leçons ne se placent pas une à une : on définit l’horaire fixe du cours, et ' +
            '**Générer les leçons**, dans la fenêtre du cours, place celles qui manquent entre ' +
            '**Du** et **Au**, en sautant les fermetures. Pour un nouveau cours, il suffit de ' +
            'cocher « Générer les leçons dès la création du cours ».',
        },
        {
          termine: 'Leçon à remplir',
          testo:
            'Dans la barre d’actions, elle ouvre le trou le plus ancien — une leçon passée sans ' +
            'appel, ou pas marquée donnée — ; quand il n’y en a pas, elle s’appelle ' +
            '**Prochaine leçon**. Elle tient compte du cours du filtre et de la période choisie.',
        },
      ],
      note: [
        'L’horaire est un moule, pas une contrainte : chaque leçon générée se déplace et se ' +
          'modifie pour son compte, et regénérer ne touche pas celles qui existent déjà. On ' +
          'peut relancer à chaque changement d’horaire.',
        'Une leçon avec la chaîne — liée au calendrier de l’école — ne se glisse pas et ne se ' +
          'supprime pas. Voir la section sur le calendrier ICS.',
      ],
    },
    ics: {
      titolo: 'Le calendrier de l’école (ICS)',
      sommario:
        'L’horaire officiel de l’école à côté des leçons : le calendrier propose, le registre ' +
        'décide, et rien ne s’efface.',
      scritte: {
        mer: 'mer 16',
        corso: 'DIC4a · Mathématiques',
        nessunEvento: 'aucun événement dessous',
        riunione: 'Réunion',
        libero: 'libre',
        calendarioIcs: 'Calendrier ICS',
        inModifica: 'en modification, dans Semaine',
        senzaLezione: '+  événement sans leçon',
        senzaEvento: '−  leçon sans événement',
        senzaRegola: '?  associés sans règle',
      },
      figure: [
        {
          didascalia:
            'Les événements du calendrier de l’école sont dans un couloir en pointillé à côté ' +
            'des leçons du registre : un trou d’un côté ou de l’autre saute aux yeux.',
          legenda: [
            'La bande des semaines : `+`, `−` et `?` indiquent où calendrier et registre ne ' +
              'concordent pas.',
            'La chaîne : la leçon est ancrée à des événements du calendrier. Le nombre à côté ' +
              'dit combien.',
            'Le couloir ICS, à droite de chaque jour : les événements de l’école, en ' +
              'pointillé.',
            'Un événement sans leçon est « libre » ; le triangle dit qu’aucune règle ne sait de ' +
              'quel cours il est.',
            'L’interrupteur, dans le cadre « Calendrier ICS » de la barre d’actions : il est là ' +
              'avec **Modifier** activé, et allume couloir et signes ensemble.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ajouter un calendrier',
          testo:
            'Paramètres › Année et horaire › **Calendriers ICS** : on colle le lien ' +
            'd’abonnement de l’école (`https://…` ou `webcal://…`) et **Ajouter**, ou **Un ' +
            'fichier…** pour un `.ics` du disque. Il peut y en avoir plusieurs — l’horaire de ' +
            'l’école, celui des laboratoires — et on les ajoute aussi depuis la fenêtre de ' +
            '**Comparer avec le calendrier**.',
        },
        {
          termine: 'La copie dans le document',
          testo:
            'De chaque calendrier, le registre garde une copie dans le document et lit toujours ' +
            'celle-là : la comparaison fonctionne sans réseau et sur un autre ordinateur. ' +
            '**Mettre à jour** la refait depuis la source ; si la source ne se lit pas, la ' +
            'précédente reste.',
        },
        {
          termine: 'Nom, adresse, corbeille',
          testo:
            'Le nom se change dans son champ. De la provenance, on ne voit que le site, jamais ' +
            'le lien entier, qui porte souvent une clé personnelle : on le corrige dans ' +
            '« Changer d’adresse ou de fichier », et le nouveau ne remplace l’ancien que s’il se ' +
            'lit. La corbeille retire le calendrier et sa copie ; **Tout supprimer**, en tête de ' +
            'la section, retire calendriers, copies et règles. Les leçons déjà écrites restent ' +
            'toujours.',
        },
        {
          termine: 'Dans la semaine',
          testo:
            '**Calendrier ICS**, dans la barre d’actions avec **Modifier** activé, place les ' +
            'événements dans un couloir en pointillé à droite de chaque jour. Le rallumer ' +
            'relit les copies ; un calendrier qui ne se lit pas est signalé par le sous-titre de ' +
            'la page. Éteint, il masque aussi les signes de la bande et **Comparer avec le ' +
            'calendrier**.',
        },
        {
          termine: 'Événement et leçon, liés',
          testo:
            'Un événement qui tombe sur une leçon de son cours en prend la couleur, et la leçon ' +
            'porte une chaîne ; en passant sur l’un, l’autre s’allume. Un événement sans leçon ' +
            'dit « libre ».',
        },
        {
          termine: 'Les signes de la bande',
          testo:
            'Avec **Calendrier ICS** allumé, dans la semaine, la bande marque où calendrier et ' +
            'registre ne concordent pas : `+` un événement sans leçon, `−` une leçon sans ' +
            'événement, `?` les deux, mais liés par indice et non par une règle. Une fois la ' +
            'semaine ouverte, la leçon ou l’événement qui ne concorde pas prend la même couleur.',
        },
        {
          termine: 'Sur les événements',
          testo:
            'Un clic sur un événement lié ouvre sa leçon ; `Ctrl`+clic en choisit plusieurs du ' +
            'même jour. Au clic droit : **Générer la leçon à partir de l’événement…**, ' +
            '**Associer à un cours…** (ou **Changer l’association au cours…**) et **Annuler la ' +
            'sélection**.',
        },
        {
          termine: 'Générer la leçon à partir de l’événement',
          testo:
            'La fenêtre demande le cours et la salle, et propose le texte qui reconnaîtra les ' +
            'événements semblables : avec « Retenir l’association pour les événements ' +
            'similaires », le choix devient une règle. Les événements choisis — ou les deux ' +
            'moitiés d’un bloc — font une seule leçon, avec la pause au milieu. Si le cours a ' +
            'déjà une leçon qui chevauche, elle s’arrête et le dit.',
        },
      ],
      note: [
        'Une leçon avec la chaîne ne se glisse pas et ne se supprime pas, et dans son ' +
          'formulaire, le cours, la date et la plage de l’événement sont désactivés — la salle ' +
          'aussi, quand l’événement en indique une : c’est le calendrier de l’école qui les ' +
          'dicte. Si la leçon change vraiment, on la change là-bas ; après **Mettre à jour**, ' +
          '**Synchroniser depuis l’ICS** (clic droit sur la leçon) l’aligne tout de suite.',
        'Les événements ne se voient que dans la semaine : dans le mois, l’année et l’agenda, ' +
          'le calendrier de l’école est comme éteint. Le blocage des leçons ancrées, lui, ' +
          'reste toujours : il dépend de l’horaire, pas de ce qu’on regarde.',
        'À côté de l’heure de l’événement, on peut en ajouter d’autres, ou une pause : dans le ' +
          'formulaire (**Plage de cours**, **Pause**, et la ligne se glisse au-dessus ou ' +
          'au-dessous de la plage avec la chaîne), ou en tirant les poignées en modification. ' +
          'Ce ne sont pas des écarts avec le calendrier, et si l’événement se déplace, elles ' +
          'suivent : celles d’avant avec son début, celles d’après avec sa fin.',
      ],
    },
    icsRegole: {
      titolo: 'Comparaison et règles d’association',
      sommario:
        'Comment le registre comprend de quel cours est un événement, et comment le calendrier ' +
        'propose les leçons sans les écrire lui-même.',
      scritte: {
        evento: 'Événement',
        titoloELuogo: 'titre et lieu',
        corso: 'Cours',
        quattroProve: 'quatre critères',
        lezione: 'Leçon',
        piuSovrapposta: 'recouvrement max.',
        proposta: 'Proposition',
        daSpuntare: 'à cocher',
        giornoIntero: 'journée entière ou',
        mezzanotte: 'à cheval sur minuit :',
        lasciatoFuori: 'laissé de côté',
        prova1: '1  une règle',
        prova2: '2  le nom de la classe',
        prova3: '3  l’horaire récurrent',
        prova4: '4  une leçon déjà prévue',
        nessunaSotto: 'aucune dessous :',
        oraDaCreare: 'une leçon à créer',
        daCreare: 'à créer',
        daAllineare: 'à aligner',
        daAnnullare: 'à annuler',
        maiDaCancellare: 'jamais : à supprimer',
      },
      figure: [
        {
          didascalia:
            'Chaque événement trouve d’abord son cours, puis la leçon de ce cours avec laquelle ' +
            'il se chevauche le plus. Ce qui en sort est une proposition : le registre n’écrit ' +
            'que ce qu’on coche.',
          legenda: [
            'Les critères, du plus explicite au plus indirect : décide le premier qui répond ' +
              'avec un seul cours. Deux réponses valent comme aucune.',
            'Les trois tas de la révision. Aucun n’efface : une leçon que le calendrier n’a ' +
              'pas est seulement listée.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Comparer avec le calendrier',
          testo:
            'Dans la barre d’actions du calendrier, dans le cadre **Calendrier ICS** après son ' +
            'interrupteur, avec **Calendrier ICS** allumé : ouvre la liste des calendriers du ' +
            'document, et **Comparer** met celui qu’on a choisi en regard des leçons. On compare ' +
            'la copie : pour le calendrier d’aujourd’hui, d’abord **Mettre à jour**.',
        },
        {
          termine: 'Les tas de la révision',
          testo:
            '**À créer** : des événements d’un cours sans leçon dessous. **À aligner** : la ' +
            'leçon existe, mais à une autre heure ou dans une autre salle. **À annuler** : le ' +
            'calendrier la donne pour annulée. Chaque tas a sa case « Toutes » ; celles qui ' +
            'concordent sont repliées en bas.',
        },
        {
          termine: 'Appliquer les coches',
          testo:
            'Ne change que ce qui est coché, tout ensemble. En alignant, l’appel, le plan et les ' +
            'textes restent ; les leçons déjà données partent sans coche. Annuler marque ' +
            'annulée, n’efface pas.',
        },
        {
          termine: 'Dans le registre mais pas dans le calendrier',
          testo:
            'Seulement listées, sans coche. Ne comptent que les cours que le calendrier connaît ' +
            'et les jours qu’il couvre ; une leçon qui n’a vraiment pas lieu se retire ou ' +
            's’annule depuis sa fiche.',
        },
        {
          termine: 'Événements sans cours',
          testo:
            'Pour chaque groupe, un texte et une liste déroulante : on choisit le cours, ou ' +
            '« Pas une leçon », et le choix devient une règle. La comparaison se refait tout de ' +
            'suite ; les règles s’enregistrent avec les coches. Raccourci — `DIC4a` au lieu du ' +
            'titre entier — le texte vaut pour tous les événements qui le contiennent.',
        },
        {
          termine: 'Comment écrire une règle',
          testo:
            'Tous les mots, dans n’importe quel ordre, dans le titre ou le lieu, sans tenir ' +
            'compte des majuscules ni des accents. `A | B` vaut pour l’un ou l’autre, `DIC1*` ' +
            'pour chaque mot qui commence ainsi, `/…/` est une expression régulière. Entre deux ' +
            'règles qui s’appliquent, gagne celle qui en dit le plus.',
        },
        {
          termine: 'La section des règles',
          testo:
            'Dans Paramètres › Année et horaire › **Calendriers ICS**, sous les calendriers, ' +
            'communes à tous. À côté de chacune, combien d’événements elle décide et combien ' +
            'elle en reconnaît, un compte qui se refait pendant qu’on écrit. Sont signalés les ' +
            'doublons, les expressions illisibles et les cours qui n’existent plus ; **Tout ' +
            'retirer** les vide. Depuis la fenêtre des calendriers, on y arrive avec **Ouvrir ' +
            'les règles**.',
        },
        {
          termine: 'Sans règle',
          testo:
            'Le registre essaie tout seul : le nom de la classe dans le titre, l’horaire ' +
            'récurrent d’un seul cours, une leçon déjà au calendrier. Ce sont des indices, et ' +
            'la pastille à côté de chaque proposition dit lequel a décidé : « par règle », ' +
            '« d’après le nom », « d’après l’horaire », « d’après la leçon déjà au calendrier ».',
        },
      ],
      note: [
        'Deux événements de la même règle séparés d’au plus quinze minutes sont la même leçon ' +
          'avec la récréation au milieu, et deviennent une seule leçon avec une pause. Au-delà, ' +
          'ce sont deux leçons.',
        'Une règle vaut pour tous les calendriers du document : `DIC4a CP` veut dire ce cours ' +
          'partout où il apparaît. Mieux vaut peu de règles courtes qu’une par titre.',
      ],
    },
    todo: {
      titolo: Molti(FR.pendenza),
      sommario:
        'Ce qui reste ouvert dans le cours choisi, sans mélanger d’autres classes ou matières.',
      scritte: {
        corso: 'DIC4a · Communication',
        ruolo: 'Enseignant du cours',
        nuovaConsegna: 'Nouveau devoir',
        consegnaLaClasse: 'La classe rend',
        rimasteIndietro: 'En retard',
        entroLaSettimana: 'D’ici la fin de la semaine',
        fatto: 'Terminé · Afficher ce qui a été clos',
        momenti: 'Évaluations',
        consegnaUnFoglio: 'remet une feuille',
        svolgeQualcosa: 'fait quelque chose',
        toccaAllaClasse: 'au tour de la classe',
        toccaAlDocente: 'au tour de l’enseignant',
        svolgeLaClasse: 'La classe fait',
        consegnaIlDocente: 'L’enseignant distribue',
        svolgeIlDocente: 'L’enseignant fait',
        inCimaInFondo:
          'En haut ce qui attend les autres, en bas ce qui dépend de qui enseigne',
      },
      figure: [
        {
          didascalia:
            'La page appartient au cours indiqué dans l’en-tête. Elle montre cinq familles, ' +
            'les éléments ouverts par urgence et, en bas, ceux qui sont terminés.',
          legenda: [
            'Le cours et le rôle indiquent le contexte : ici, on agit comme enseignant du cours.',
            'Cinq cadres : évaluations et quatre types de devoir. Le rouge indique le retard.',
            'Chaque famille contient seulement les éléments du cours choisi, classés par urgence.',
            'Ce qui a été clos : il s’ouvre quand on le cherche.',
          ],
        },
        {
          didascalia:
            'Les évaluations forment une famille. Les quatre autres croisent qui agit — classe ' +
            'ou enseignant — avec le geste : rendre ou faire.',
        },
      ],
      voci: [
        {
          termine: 'Un cours à la fois',
          testo:
            `${Molti(FR.pendenza)} se trouve dans **Registre**. La page utilise le cours choisi ; ` +
            'changer de cours change toute la page et **Nouveau devoir**.',
        },
        {
          termine: 'Qui doit faire quoi',
          testo:
            `**La classe rend** : les feuilles que les ${FR.pif.plurale} doivent apporter. ` +
            '**La classe fait** : ce qui a été donné. **L’enseignant distribue** : bulletins, ' +
            'convocations, formulaires à faire signer à la maison. **L’enseignant fait** : ' +
            'photocopies, préparations, administration.',
        },
        {
          termine: 'L’ordre, c’est l’urgence',
          testo:
            'Dans chaque type : **En retard**, **Échéance aujourd’hui**, **D’ici la fin de ' +
            'la semaine**, **Plus tard, ou sans échéance**. Le cours figure déjà dans l’en-tête.',
        },
        {
          termine: 'Les devoirs',
          testo:
            'Chaque ligne dit qui manque — « manquent Rossi, Bianchi, Verdi +2 » — et ce résumé ' +
            'ouvre le ramassage, avec un nom par ligne, **Marquer tout le monde** et **Retirer ' +
            'tout le monde**. La coche au bout de la ligne marque d’un geste ceux qui manquent ; ' +
            'le crayon ouvre le devoir.',
        },
        {
          termine: 'Les rattrapages',
          testo:
            'Dans **Évaluations**, les épreuves à refaire pour qui n’était pas là : à fixer, ' +
            'd’aujourd’hui, de la semaine, plus tard, non refaites. Le calendrier les fixe à la ' +
            'prochaine leçon du cours, le trombone joint le scan, le crayon ouvre la date et la ' +
            'remarque, la petite croix déclare qu’elles ne se rattrapent pas. Écrire la note ' +
            'les ferme.',
        },
        {
          termine: 'Les épreuves passées',
          testo:
            '**À corriger** se ferme en mettant les notes ; **À rendre** doit être signalé : ' +
            '**Rendue à tous** écrit le jour pour ceux qui n’ont pas encore leur date. Arrêtée ' +
            'depuis plus de deux semaines, la ligne devient rouge.',
        },
        {
          termine: 'Qui n’était pas là à la restitution',
          testo:
            '**À rendre à** liste ceux à qui l’épreuve n’est pas encore revenue : la date de la ' +
            'restitution appartient à chaque ligne, pas à l’épreuve. Les rattrapages évalués ' +
            'ont aussi leur « rendue le ».',
        },
        {
          termine: 'Le cadre « Terminé »',
          testo:
            'En bas, replié : **Afficher ce qui a été clos** ouvre les rattrapages clos, les ' +
            'épreuves rendues et les devoirs faits. Il sert pour « l’ai-je ' +
            'déjà rendue à Rossi ? », et de là une ligne se rouvre.',
        },
      ],
      note: [
        `Les ${FR.pendenza.plurale} des évaluations se déduisent des notes et des appels ; ` +
          'les quatre familles de devoirs se créent et se terminent ici ou dans la leçon.',
        'La date de restitution n’est pas de la comptabilité : c’est d’elle que partent les ' +
          'délais d’un recours. Le bouton à côté du champ écrit le jour d’où l’on regarde — ' +
          'dans une leçon celui de la leçon, ailleurs aujourd’hui —, et on le corrige à la ' +
          'main.',
      ],
    },
    smistare: {
      titolo: 'À trier',
      sommario:
        'Les PDF de classe qui ont encore des pages sans propriétaire, de toutes les classes ' +
        'ensemble.',
      scritte: {
        trascinato: 'glissé ou chargé',
        lettura: 'Lecture',
        ocr: 'texte, ou OCR en file',
        proposte: 'Propositions',
        unNome: 'un nom, un bloc',
        fascicolo: 'Dossier',
        archiviato: 'archivé et coché',
        conferma: 'glisser · Confirmer N propositions',
        senzaGesto: 'rien n’est archivé sans un geste',
        nonAttribuiti: 'Non attribués',
        qualeClasse: 'De quelle classe ?',
      },
      figure: [
        {
          didascalia:
            'Un PDF de classe entre entier, se lit page par page, et il en sort des ' +
            'propositions. Elles ne deviennent les documents de quelqu’un qu’avec un geste.',
          legenda: [
            'Le texte de chaque page. Les scans muets vont dans la file de lecture, des ' +
              'dizaines de secondes par page.',
            'Une page qui nomme quelqu’un ouvre son bloc, et les suivantes sans nom y restent ' +
              'attachées.',
            'On archive en glissant les pages sur la case, ou en confirmant les propositions en ' +
              'bloc.',
            'Un PDF sans classe reste hors de tout dossier tant qu’on ne lui en donne pas une.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Faire entrer un PDF',
          testo:
            'Depuis l’**Archive des documents** de la classe : en le glissant sur la page, ou ' +
            'avec **Charger des PDF**. Il entre dans le document de l’année et s’ouvre tout ' +
            'seul dans le cadre, prêt à être divisé.',
        },
        {
          termine: 'Un tas par classe',
          testo:
            'Chaque classe dont on est enseignant a le sien : « classe · N pages à placer », et ' +
            'dessous un PDF par ligne avec les pages qui restent et le jour où il est entré. Un ' +
            'fichier qui ne s’ouvre pas porte la pastille « ne s’ouvre pas ».',
        },
        {
          termine: 'Trier',
          testo:
            'Mène à l’**Archive des documents** de cette classe avec le PDF déjà ouvert dans le ' +
            'cadre : c’est là qu’on trie, parce que c’est là que se trouvent les cases où ' +
            'déposer les pages.',
        },
        {
          termine: 'Les propositions',
          testo:
            'Le registre lit chaque page et cherche les noms de la classe. Nom et prénom ' +
            'ensemble valent une certitude ; un nom de famille que portent deux personnes de la ' +
            'classe ne se tire pas au sort, et la page attend une main.',
        },
        {
          termine: 'Diviser les pages',
          testo:
            'Dans le cadre, une page se choisit d’un clic — `Ctrl` pour en ajouter, `Maj` pour ' +
            'une plage — et se glisse sur la case de la personne. **Confirmer N propositions** ' +
            'archive d’un geste celles déjà reconnues, quand le PDF sait de quel document il ' +
            's’agit.',
        },
        {
          termine: 'Le clic droit sur une page',
          testo:
            '**Attribuer à…** demande la personne et le document, **Relire le scan** la remet ' +
            'dans la file, **Ouvrir dans la visionneuse** l’affiche dans le programme du système, ' +
            '**Jeter** la retire — la page de garde du scanner, une feuille blanche.',
        },
        {
          termine: 'Les scans',
          testo:
            '**Lire les scans (N)** met dans la file les pages sans texte ; **Relire** refait ' +
            'aussi celles déjà lues. La file dit où elle en est, et **Arrêter** la vide. Lecture ' +
            'désactivée, le bouton indique **Lecture désactivée** et mène au réglage.',
        },
        {
          termine: 'Déplacer vers…',
          testo:
            'Un PDF arrivé dans la mauvaise classe — ou un scan qui couvre deux classes — ' +
            's’envoie à une autre avec la liste déroulante. Les pages déjà archivées restent où ' +
            'elles sont, et le registre refait les propositions avec les noms de la nouvelle ' +
            'classe.',
        },
        {
          termine: 'Non attribués à une classe',
          testo:
            'Les PDF entrés sans dire à qui ils étaient — en général depuis l’ancien dossier ' +
            '`in-arrivo/`, que le registre vide à l’ouverture — sont dans un tas à part, avec ' +
            'la liste « De quelle classe est-il ? ». Une fois la classe indiquée, le registre ' +
            'les relit en cherchant les noms.',
        },
        {
          termine: 'Quand c’est vide',
          testo:
            '« Rien à trier », avec **Aller à l’archive des documents**. Le nombre à côté de ' +
            '« À trier » dans la barre latérale compte les pages qui attendent.',
        },
      ],
      note: [
        'Reconnaître un nom est une hypothèse : c’est pourquoi rien ne s’archive tout seul. La ' +
          'page archivée est découpée, mise dans le dossier de la personne et cochée dans son ' +
          'devoir.',
        'Une case déjà pleine refuse les pages : le document de qui a déjà rendu ne s’écrase ' +
          'pas.',
        'La lecture des scans tourne sur la machine, avec un modèle choisi dans Paramètres › ' +
          'Programme › **Modèles de langage**, et elle est lente : mieux vaut la lancer sur ' +
          'tout le tas et faire autre chose en attendant.',
      ],
    },
  },
  en: {
    oggi: {
      titolo: 'Dashboard',
      sommario:
        'The day at a glance: today’s lessons, what is still open, and where to go next. You ' +
        'look, and you go.',
      scritte: {
        ora1: 'DIC4a · Maths',
        ora2: 'DIC2b · Physics',
        prova1: 'Unit 2 test · DIC2b',
        prova2: 'Oral · DIC4a',
        festeggiato: 'Ferrari Giulia',
      },
      figure: [
        {
          didascalia:
            'On first start the register opens here. Nothing is done on the page itself: each ' +
            'box takes you to where the thing gets done.',
          legenda: [
            'The four tiles: today’s lessons, the ones to fill in, the open ' +
              `${EN.pendenza.plurale}, the pages to sort. A click takes you to their page.`,
            'The lesson in progress — or, between lessons, the next one — is highlighted. Each ' +
              'lesson shows its stage, and a click opens it.',
            'The upcoming assessments, with the days left.',
            'Today’s birthdays, when there is one.',
          ],
        },
      ],
      voci: [
        {
          termine: 'You look, and you go',
          testo:
            'The page changes nothing in the register and has no commands in the action bar: ' +
            'it shows how the day stands and takes you where the work is. The actions live on ' +
            'their own pages.',
        },
        {
          termine: 'The four tiles',
          testo:
            '**Lessons today** takes you to the calendar on today, and underneath says when the ' +
            'next one starts or how long the current one lasts. **To fill in** counts the ' +
            'lessons left without a record in the chosen period and opens the oldest — or the ' +
            `next one, if everything is in order. **${Molti(EN.pendenza)}** and **To sort** take ` +
            'you to their pages, with the same number as the sidebar and the bar at the bottom.',
        },
        {
          termine: 'Today’s lessons',
          testo:
            'In calendar order: start and end, class and subject, topic and room. The badge ' +
            'shows the stage — **In progress**, **To close**, **Held**, **To prepare**, ' +
            '**Planned**, **Cancelled**. The lesson in progress is marked “Now”; between lessons ' +
            'the next one lights up, marked “Next”. A click opens the lesson.',
        },
        {
          termine: 'Upcoming assessments',
          testo:
            'The next five from the year’s courses, nearest first, with the days left: “today”, ' +
            '“tomorrow”, “in 3 days”. A click opens the assessment.',
        },
        {
          termine: 'Birthdays today',
          testo:
            `The ${EN.pif.plurale} whose birthday is today, with their class. The box only ` +
            'appears when there is someone to celebrate.',
        },
        {
          termine: 'The first page',
          tasti: 'Ctrl+1',
          testo:
            'On first start the register opens here; after that it reopens the page you left it ' +
            'on. From any page `Ctrl+1` brings you back: it is the first item in the sidebar.',
        },
      ],
      note: [
        'The numbers are those of the pages the tiles lead to, counted the same way: a tile ' +
          'that said “3” and opened a page showing two would teach you not to believe it. The ' +
          '**Period** limits the Dashboard; when today has no lessons, it shows the next ' +
          'teaching day in that period.',
      ],
    },
    calendario: {
      titolo: 'Calendar',
      sommario:
        'When you teach. Four views of the same lessons, and the chosen day carries over from ' +
        'one to the next.',
      scritte: {
        calendario: 'Calendar',
        pendenze: Molti(EN.pendenza),
        daSmistare: 'To sort',
        stato: 'to fill in: DIC4a · Mon',
        anno: 'Year',
        agenda: 'Agenda',
        nuovaOra: 'New lesson',
        striscia: 'Weeks of the year · 34 of 38 with lessons',
        lun: 'Mon 14',
        mar: 'Tue 15',
        mer: 'Wed 16',
        gio: 'Thu 17',
        ven: 'Fri 18',
        svolta: 'held',
        pianificata: 'planned',
        inCorso: 'in progress',
        annullata: 'cancelled',
      },
      figure: [
        {
          didascalia:
            'The Week view: at the top what you do with the page, below it the year in a strip, ' +
            'and the grid of days with lessons as tall as they last.',
          legenda: [
            '**Today**, the **Back** and **Next** arrows, the four views and, with **Edit** on ' +
              '(at the top, next to **Project**), **New lesson**.',
            'All the weeks of the year, empty ones too: number, letter A/B, how many lessons. ' +
              'The arrow at the top right folds it away, and the register remembers.',
            'The days: holidays greyed out, semester boundaries, the birthday cake.',
            'A lesson: dashed if planned, solid if held, faded and struck through if cancelled.',
            'The line for now, in today’s column: it moves on its own.',
            'The hours: from the first to the last of the day chosen in Settings, on the hour — ' +
              'or, with the day’s breaks, on the period boundaries —, at the same height all ' +
              'year.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Week',
          testo:
            'The working view: lessons as tall as they last, with breaks and overlaps, one day ' +
            'per column.',
        },
        {
          termine: 'The hours of the week',
          testo:
            'The grid runs from **First hour shown** to **Last hour shown** in Settings › Year ' +
            'and timetable › Calendar, rounded to the full hour: 10 o’clock sits at the same ' +
            'height all year. Only a lesson or an ICS event that goes beyond it stretches it, ' +
            'and only for its own week.',
        },
        {
          termine: 'The lines on the breaks',
          testo:
            'With **Breaks in the day** set in Settings, the lines mark not the full hours but ' +
            'the boundaries of the periods between one break and the next, with the start and ' +
            'end of each break. A lesson dragged or drawn snaps to those lines, and the guide ' +
            'line already shows where it will land.',
        },
        {
          termine: 'Saturday and Sunday',
          testo:
            'They are shown and hidden with **Days shown**, in Settings › Year and timetable › ' +
            'Calendar: this applies to the week, the month and the projection.',
        },
        {
          termine: 'Edit',
          testo:
            'At the top, next to **Project** (Ctrl+E); in the calendar it works in the week and ' +
            'the month: the grid stops opening lessons on click and takes them in hand. Pressing ' +
            'and dragging on an empty spot draws a lesson, in whole periods; a single click ' +
            'makes it as long as the **Time slot of a new lesson** in Settings › Year and ' +
            'timetable › Calendar. With a course in the filter the lesson belongs to that ' +
            'course straight away; without one, the form opens with day, time and length ' +
            'already filled in. The handles above and below a block lengthen or shorten it. ' +
            'While editing, **New lesson** and the ICS calendar commands appear too, and a click ' +
            'on a free ICS event creates its lesson — on one already matched it opens the form ' +
            'of its lesson. A click selects a lesson: the arrows move it (in the week ↑ ↓ by ' +
            'five minutes, with Shift by one period; in the month by a week; ← → by a day), ' +
            '**Ctrl+D** copies it to the following week, **Enter** opens it, **F2** opens its ' +
            'form, **Del** deletes it — at once if it is empty, asking first if it already has ' +
            'attendance or notes. Every action is a single step in the history: Ctrl+Z undoes ' +
            'it. **Esc** clears the selection, and a second Esc leaves editing. Lessons ' +
            'anchored to the ICS calendar stay put: their handles add or remove slots before ' +
            'and after the time of the event, which does not move.',
        },
        {
          termine: 'The strip of weeks',
          testo:
            'Above the week, “Weeks of the year” and all the weeks of the year in a row: the ' +
            'number, the letter A/B and how many lessons fall in it — the empty ones too, which ' +
            'are the gaps to fill. A mark closes the week in which the first semester ends; a ' +
            'click takes you to a week.',
        },
        {
          termine: 'Folding the strip',
          testo:
            'The arrow at the top right of the strip closes it, leaving only the header, and ' +
            'opens it again. The register remembers the next time too: on a short screen that ' +
            'means more hours of the week in view.',
        },
        {
          termine: 'Month',
          testo:
            'A continuous strip that scrolls through the year, with no jump from one month to ' +
            'the next: the month’s name stays at the top. In the first column the week number, ' +
            'which opens the week with a click. With more than four lessons in a day, “+N” ' +
            'appears.',
        },
        {
          termine: 'Year',
          testo:
            'The sheet the school prints and pins up: months in columns, days in rows, split by ' +
            'semester. In each cell the name of the holiday, or how many courses there are that ' +
            'day; a click opens that week. Below, what the colours mean.',
        },
        {
          termine: 'Agenda',
          testo:
            'The lessons as a list, one row each, split by week: the whole year, and opening it ' +
            'takes you to the chosen day. Each row gives time, class, subject and length; once ' +
            'the lesson is held, the learners present too.',
        },
        {
          termine: 'Today and the arrows',
          testo:
            'In the action bar. **Today** goes back to today and, in the week, scrolls to the ' +
            'current time. **Back** and **Next** move by a month in the Month view, by a week in ' +
            'all the others.',
          tasti: 'Ctrl+Alt+T',
        },
        {
          termine: 'The menu shortcuts',
          testo:
            '`Ctrl+Alt+T` and `Ctrl+Alt+N` are handled by the menu, from any page: they take you ' +
            'to the calendar and do what **Today** and **New lesson** do. With a window open ' +
            'they do nothing, and a notice asks you to close it first.',
        },
        {
          termine: 'The figures in the header',
          testo:
            'Next to the title, the period and the semester it falls in; below, four counts for ' +
            'the chosen week: lessons, periods, actual hours and how many are still to be held.',
        },
        {
          termine: 'Filter by course',
          testo:
            'In the choices row, “Course” with “All courses”: the calendar shows only the ' +
            'lessons of the chosen one. It does not change the course the Register pages are ' +
            'set to; opening a lesson of another course from elsewhere switches the filter to ' +
            'that course.',
        },
        {
          termine: 'Holidays, semesters and A/B weeks',
          testo:
            'Closure days are greyed out in every view, with the name in the tooltip; next to ' +
            'the day number a mark shows where a semester ends or begins. It is all set in ' +
            'Settings › Year and timetable › **School year**.',
        },
        {
          termine: 'Lessons on a closure day',
          testo:
            'A holiday set after the timetable was entered, or a lesson placed by hand on a ' +
            'closed day: in the week a notice says how many lessons fall on a closure day, and ' +
            'which one. With **Edit** on, **Remove the lessons in the holidays** removes them ' +
            'all at once, after a confirmation; `Ctrl+Z` brings them back.',
        },
        {
          termine: 'Birthdays',
          testo:
            'A cake with the name and age in the month and in the agenda, where a click opens ' +
            'the person’s record. In the week and the year it is just a mark on the day: the ' +
            'names are in the tooltip. Those of a class you do not have in the room that day ' +
            'stay faded; with a course in the filter you see those of its class.',
        },
      ],
      note: [
        'The chosen day is one and the same for all four views: you look at the month, switch ' +
          'to the week, and you are still there. Scrolling is remembered too: in the week only ' +
          '**Today** changes it, taking you to the current time; in the month **Today** and ' +
          'the arrows bring the strip back to the chosen day.',
        'A test’s semester is the one its date falls in: a test set the day after the ' +
          'boundary ends up on the other report. The mark on the day is there so you see it ' +
          'beforehand.',
      ],
    },
    calendarioOre: {
      titolo: 'Lessons on the calendar',
      sommario:
        'How lessons are added, moved and copied, and what you can do to them without opening ' +
        'them.',
      scritte: {
        mar: 'Tue',
        mer: 'Wed',
        presa: 'picked up',
        trascinare: 'Dragging moves;',
        o: 'or',
        copia: 'while dropping: copy',
        apriLezione: 'Open the lesson',
        modifica: 'Edit…',
        segnaSvolta: 'Mark as held',
        annullaLezione: 'Cancel the lesson',
        assegnaPiano: 'Assign a lesson plan',
        copiaSettimana: 'Copy to next week',
      },
      figure: [
        {
          didascalia:
            'You pick a lesson up with the mouse and drop it where it goes. The right-click ' +
            'menu does the rest without opening it.',
          legenda: [
            'The lesson you picked up stays in its place, faded, until you drop it.',
            'The line shows where it will land: to the nearest five minutes, or on the period ' +
              'lines when the day has its breaks. In the month only the day changes.',
            'With `Ctrl` or `Alt` held down a copy is made, and the original stays where it ' +
              'was.',
            'Right-click on a lesson: what you can do without opening it.',
          ],
        },
      ],
      voci: [
        {
          termine: 'A new lesson',
          testo:
            'It is created with **Edit** on: otherwise the calendar is just for looking. In the ' +
            'week you press and drag on an empty spot; in the month, a double click on the day. ' +
            'With a course in the filter, the lesson belongs to that course. **New lesson**, ' +
            'which appears in the action bar with **Edit** on, opens it on the chosen day with ' +
            'the current course. The shortcut works everywhere, and turns editing on by itself.',
          tasti: 'Ctrl+Alt+N',
        },
        {
          termine: 'Right-click on an empty spot',
          testo:
            'While viewing: **Go to this day** and **Edit the calendar**. While editing: “New ' +
            'lesson at …” with the time you clicked on (in the month, “on this day”) — at ' +
            'once if the filter names the course, and then there is also **New lesson using ' +
            'the form…**; without a filter it opens the form already filled in — and **Exit ' +
            'editing**.',
        },
        {
          termine: 'Moving',
          testo:
            'While editing you pick up the lesson and drop it where it goes: in the week day ' +
            'and time change, snapped to five minutes — or, with the day’s breaks, to the ' +
            'period lines —; in the month only the day. Attendance and texts travel with it: ' +
            'it is the same lesson, moved. With the day’s breaks its periods rearrange around ' +
            'the break, and breaks added by hand give way to the day’s.',
        },
        {
          termine: 'Copying',
          testo:
            '`Ctrl` (or `Alt`) held down as you drop: a planned copy is made with the same ' +
            'time, room and plan, but without attendance, observations or topics. You stay in ' +
            'the calendar, ready for the next one.',
        },
        {
          termine: 'Two lessons at the same time',
          testo:
            'You may want them — a split class, team teaching — and the register does not ' +
            'refuse them: it says so in the notice, with the classes the lesson landed on. It ' +
            'checks every class, including those hidden by the filter.',
        },
        {
          termine: 'Right-click on a lesson',
          testo:
            'Always: **Open the lesson**, **Mark as held** (or **Set back to planned**), ' +
            '**Cancel the lesson** (or **No longer cancelled**) and the plan items — open, ' +
            'assign, change, remove. While editing, right-click selects the lesson and adds ' +
            'what concerns the timetable: **Edit…** (F2), in the week **Lengthen by one ' +
            'period** and **Shorten by one period**, **To the day before** and **To the day ' +
            'after** (← →), **Copy to next week** (Ctrl+D) and **Delete** (Del). On a lesson ' +
            'with the chain, **Edit…**, **Sync from ICS**, **Lengthen by one period** and ' +
            '**Shorten by one period** remain: the school calendar sets the day and time of ' +
            'the event, and the last two work on the slots added alongside.',
        },
        {
          termine: 'Cancelling or deleting',
          testo:
            'A cancelled lesson stays in the register, struck through, with whatever was in it, ' +
            'and no longer carries its number. **Delete** removes it altogether, after a ' +
            'confirmation.',
        },
        {
          termine: 'Generating the lessons',
          testo:
            'Lessons are not added one by one: you set the course’s fixed timetable, and ' +
            '**Generate lessons**, in the course window, adds the missing ones between **From** ' +
            'and **To**, skipping closures. For a new course, the tick “Generate lessons as soon ' +
            'as the course is created” is enough.',
        },
        {
          termine: 'Lesson to fill in',
          testo:
            'In the action bar it opens the oldest gap — a past lesson without attendance, or ' +
            'not marked as held —; when there are none it is called **Next lesson**. It takes ' +
            'the course in the filter and the chosen period into account.',
        },
      ],
      note: [
        'The timetable is a mould, not a constraint: every generated lesson can be moved and ' +
          'changed on its own, and generating again leaves the existing ones alone. You can ' +
          'run it again every time the timetable changes.',
        'A lesson with the chain — tied to the school calendar — cannot be dragged or ' +
          'deleted. See the section on the ICS calendar.',
      ],
    },
    ics: {
      titolo: 'The school calendar (ICS)',
      sommario:
        'The school’s official timetable next to the lessons: the calendar suggests, the ' +
        'register decides, and nothing gets deleted.',
      scritte: {
        mer: 'Wed 16',
        corso: 'DIC4a · Maths',
        nessunEvento: 'no event underneath',
        riunione: 'Meeting',
        libero: 'free',
        calendarioIcs: 'ICS calendar',
        inModifica: 'while editing, in Week view',
        senzaLezione: '+  event with no lesson',
        senzaEvento: '−  lesson with no event',
        senzaRegola: '?  matched with no rule',
      },
      figure: [
        {
          didascalia:
            'The events of the school calendar sit in a dashed lane next to the register’s ' +
            'lessons: a gap on one side or the other stands out at once.',
          legenda: [
            'The strip of weeks: `+`, `−` and `?` show where calendar and register do not ' +
              'match.',
            'The chain: the lesson is anchored to calendar events. The number next to it says ' +
              'how many.',
            'The ICS lane, to the right of each day: the school’s events, dashed.',
            'An event without a lesson is “free”; the triangle means no rule knows which ' +
              'course it belongs to.',
            'The switch, in the “ICS calendar” box of the action bar: it is there with **Edit** ' +
              'on, and turns on lane and marks together.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Adding a calendar',
          testo:
            'Settings › Year and timetable › **ICS calendars**: paste the school’s subscription ' +
            'link (`https://…` or `webcal://…`) and **Add**, or **A file…** for an `.ics` from ' +
            'disk. There can be more than one — the school timetable, the labs’ one — and they ' +
            'can also be added from the **Compare with the calendar** window.',
        },
        {
          termine: 'The copy in the document',
          testo:
            'Of every calendar the register keeps a copy inside the document and always reads ' +
            'that: the comparison works offline and on another computer. **Update** fetches it ' +
            'again from the source; if the source cannot be read, the previous copy stays.',
        },
        {
          termine: 'Name, address, bin',
          testo:
            'The name is changed in its field. Of the source you only see the site, never the ' +
            'full link, which often carries a personal key: it is corrected in “Change address ' +
            'or file”, and the new one replaces the old only if it can be read. The bin removes ' +
            'the calendar and its copy; **Remove everything**, at the top of the section, ' +
            'removes calendars, copies and rules. Lessons already written always stay.',
        },
        {
          termine: 'In the week',
          testo:
            '**ICS calendar**, in the action bar with **Edit** on, puts the events in a dashed ' +
            'lane to the right of each day. Turning it on again rereads the copies; a calendar ' +
            'that cannot be read is flagged in the page subtitle. Off, it also hides the marks ' +
            'on the strip and **Compare with the calendar**.',
        },
        {
          termine: 'Event and lesson, linked',
          testo:
            'An event that falls on a lesson of its course takes on its colour, and the lesson ' +
            'carries a chain; hovering over one lights up the other. An event without a lesson ' +
            'says “free”.',
        },
        {
          termine: 'The marks on the strip',
          testo:
            'With **ICS calendar** on, in the week, the strip marks where calendar and register ' +
            'do not match: `+` an event with no lesson, `−` a lesson with no event, `?` both, ' +
            'but linked by a clue rather than a rule. Once the week is open, the lesson or ' +
            'event that does not match takes on the same colour.',
        },
        {
          termine: 'On the events',
          testo:
            'A click on a linked event opens its lesson; `Ctrl`+click selects several on the ' +
            'same day. With the right button: **Create the lesson from the event…**, **Match to ' +
            'a course…** (or **Change the course match…**) and **Clear the selection**.',
        },
        {
          termine: 'Create the lesson from the event',
          testo:
            'The window asks for course and room, and suggests the text that will recognise ' +
            'similar events: with “Remember the match for similar events” the choice becomes a ' +
            'rule. The selected events — or the two halves of a block — make a single lesson, ' +
            'with the break in between. If the course already has an overlapping lesson, it ' +
            'stops and says so.',
        },
      ],
      note: [
        'A lesson with the chain cannot be dragged or deleted, and in its form the course, ' +
          'the date and the event’s slot are locked — the room too, when the event gives one: ' +
          'the school calendar sets them. If the lesson really changes, change it there; after ' +
          '**Update**, **Sync from ICS** (right-click on the lesson) brings it into line at ' +
          'once.',
        'Events are shown only in the week: in the month, the year and the agenda the school ' +
          'calendar is as good as off. The lock on anchored lessons, though, always stays: it ' +
          'depends on the timetable, not on what you are looking at.',
        'Next to the event’s time you can add more slots, or a break: in the form (**Teaching ' +
          'slot**, **Break**, and the row can be dragged above or below the slot with the ' +
          'chain), or by pulling the handles while editing. They do not count as a difference ' +
          'from the calendar, and if the event moves they follow: those before with its start, ' +
          'those after with its end.',
      ],
    },
    icsRegole: {
      titolo: 'Comparison and matching rules',
      sommario:
        'How the register works out which course an event belongs to, and how the calendar ' +
        'suggests lessons without writing them itself.',
      scritte: {
        evento: 'Event',
        titoloELuogo: 'title and place',
        corso: 'Course',
        quattroProve: 'four checks',
        lezione: 'Lesson',
        piuSovrapposta: 'most overlap',
        proposta: 'Suggestion',
        daSpuntare: 'to tick',
        giornoIntero: 'all-day or',
        mezzanotte: 'spanning midnight:',
        lasciatoFuori: 'left out',
        prova1: '1  a rule',
        prova2: '2  the class name',
        prova3: '3  the recurring timetable',
        prova4: '4  a lesson already set',
        nessunaSotto: 'none underneath:',
        oraDaCreare: 'a lesson to create',
        daCreare: 'to create',
        daAllineare: 'to align',
        daAnnullare: 'to cancel',
        maiDaCancellare: 'never: to delete',
      },
      figure: [
        {
          didascalia:
            'Each event first finds its course, then the lesson of that course it overlaps ' +
            'most. What comes out is a suggestion: the register writes only what you tick.',
          legenda: [
            'The checks, from the most explicit to the most circumstantial: the first one that ' +
              'answers with a single course decides. Two answers count as none.',
            'The three piles of the review. None of them deletes: a lesson the calendar does ' +
              'not have is simply listed.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Compare with the calendar',
          testo:
            'In the calendar’s action bar, in the **ICS calendar** box after its switch, with ' +
            '**ICS calendar** on: it opens the list of the document’s calendars, and **Compare** ' +
            'sets the chosen one against the lessons. It is the copy that gets compared: for ' +
            'today’s calendar, **Update** first.',
        },
        {
          termine: 'The piles of the review',
          testo:
            '**To create**: events of a course with no lesson underneath. **To align**: the ' +
            'lesson is there, but at another time or in another room. **To cancel**: the ' +
            'calendar has it as cancelled. Each pile has its own “All” tick; the ones that ' +
            'match are folded away at the bottom.',
        },
        {
          termine: 'Apply the ticks',
          testo:
            'Changes only what is ticked, all at once. When aligning, attendance, plan and ' +
            'texts stay; lessons already held start unticked. Cancelling marks as cancelled, it ' +
            'does not delete.',
        },
        {
          termine: 'In the register but not in the calendar',
          testo:
            'Only listed, without a tick. Only the courses the calendar knows count, and only ' +
            'the days it covers; a lesson that really is not happening is removed or cancelled ' +
            'from its own page.',
        },
        {
          termine: 'Events with no course',
          testo:
            'For each group a text and a drop-down: you choose the course, or “Not a lesson”, ' +
            'and the choice becomes a rule. The comparison reruns at once; the rules are saved ' +
            'with the ticks. Shortened — `DIC4a` instead of the whole title — the text applies ' +
            'to every event that contains it.',
        },
        {
          termine: 'How to write a rule',
          testo:
            'All the words, in any order, in the title or the place, ignoring capitals and ' +
            'accents. `A | B` matches one or the other, `DIC1*` any word that starts like that, ' +
            '`/…/` is a regular expression. Between two rules that apply, the one that says ' +
            'more wins.',
        },
        {
          termine: 'The rules section',
          testo:
            'In Settings › Year and timetable › **ICS calendars**, under the calendars, shared ' +
            'by all. Next to each one, how many events it decides and how many it recognises, a ' +
            'count that updates as you type. Duplicates, expressions that cannot be read and ' +
            'courses that no longer exist are flagged; **Remove all** empties them. From the ' +
            'calendars window you get there with **Open the rules**.',
        },
        {
          termine: 'Without a rule',
          testo:
            'The register tries on its own: the class name in the title, the recurring ' +
            'timetable of a single course, a lesson already on the calendar. These are clues, ' +
            'and the badge next to each suggestion says which one decided: “by rule”, “from the ' +
            'name”, “from the timetable”, “from the lesson already scheduled”.',
        },
      ],
      note: [
        'Two events of the same rule at most fifteen minutes apart are the same lesson with ' +
          'the break in between, and become a single lesson with a break. Any further apart, ' +
          'they are two lessons.',
        'A rule applies to all the document’s calendars: `DIC4a CP` means that course ' +
          'wherever it appears. Better a few short rules than one per title.',
      ],
    },
    todo: {
      titolo: Molti(EN.pendenza),
      sommario:
        'What remains open in the selected course, without mixing classes or subjects.',
      scritte: {
        corso: 'DIC4a · Communication',
        ruolo: 'Course teacher',
        nuovaConsegna: 'New assignment',
        consegnaLaClasse: 'The class hands in',
        rimasteIndietro: 'Overdue',
        entroLaSettimana: 'Within the week',
        fatto: 'Done · Show what has been closed',
        momenti: 'Assessments',
        consegnaUnFoglio: 'hands in a sheet',
        svolgeQualcosa: 'does something',
        toccaAllaClasse: 'up to the class',
        toccaAlDocente: 'up to the teacher',
        svolgeLaClasse: 'The class does',
        consegnaIlDocente: 'The teacher hands out',
        svolgeIlDocente: 'The teacher does',
        inCimaInFondo:
          'At the top what waits on others, at the bottom what is up to the teacher',
      },
      figure: [
        {
          didascalia:
            'The page belongs to the course shown in the heading. It shows five families, ' +
            'open items by urgency and, at the bottom, completed items.',
          legenda: [
            'Course and role make the context explicit: here you act as course teacher.',
            'Five boxes: assessments and four assignment types. Red means overdue.',
            'Each family contains only items from the selected course, ordered by urgency.',
            'What has been closed: it opens when you look for it.',
          ],
        },
        {
          didascalia:
            'Assessments form one family. The other four combine who acts — class or teacher — ' +
            'with the action: handing in or doing.',
        },
      ],
      voci: [
        {
          termine: 'One course at a time',
          testo:
            `${Molti(EN.pendenza)} is in **Register**. The page uses the selected course; ` +
            'changing course changes the entire page and **New assignment**.',
        },
        {
          termine: 'Who has to do what',
          testo:
            `**The class hands in**: the papers the ${EN.pif.plurale} have to bring. **The ` +
            'class does**: what has been set. **The teacher hands out**: reports, ' +
            'invitations to meetings, forms to be signed at home. **The teacher does**: ' +
            'photocopies, preparation, admin.',
        },
        {
          termine: 'The order is urgency',
          testo:
            'Within each type: **Overdue**, **Due today**, **Within the week**, **Later, or no ' +
            'deadline**. The course is already stated in the heading.',
        },
        {
          termine: 'Assignments',
          testo:
            'Each row says who is missing — “missing Rossi, Bianchi, Verdi +2” — and that ' +
            'summary opens the collection, with one name per row, **Mark all** and **Remove ' +
            'all**. The tick at the end of the row marks everyone missing in one go; the pencil ' +
            'opens the assignment.',
        },
        {
          termine: 'Resits',
          testo:
            'Under **Assessments**, the tests to be retaken by those who were absent: to ' +
            'schedule, today, this week, later, not retaken. The calendar schedules them for ' +
            'the course’s next lesson, the paperclip attaches the scan, the pencil opens date ' +
            'and note, the little cross declares they will not be retaken. Entering the grade ' +
            'closes them.',
        },
        {
          termine: 'Tests sat',
          testo:
            '**To mark** closes once the grades are in; **To hand back** has to be recorded: ' +
            '**Handed back to all** writes the day for everyone who does not have a date yet. ' +
            'Left for more than two weeks, the row turns red.',
        },
        {
          termine: 'Who was absent at the hand-back',
          testo:
            '**To hand back to** lists who has not yet had the test back: the hand-back date ' +
            'belongs to each row, not to the test. Graded resits have their “handed back on” ' +
            'too.',
        },
        {
          termine: 'The “Done” box',
          testo:
            'At the bottom, folded: **Show what has been closed** opens closed resits, tests ' +
            'handed back and assignments done. It is there for “have I already ' +
            'given it back to Rossi?”, and from there a row can be reopened.',
        },
      ],
      note: [
        `Assessment ${EN.pendenza.plurale} are derived from grades and attendance; ` +
          'the four assignment families are created and completed here or in the lesson.',
        'The hand-back date is not bookkeeping: the time limits for an appeal run from it. ' +
          'The button next to the field writes the day you are looking from — inside a lesson ' +
          'that lesson’s, elsewhere today —, and it can be corrected by hand.',
      ],
    },
    smistare: {
      titolo: 'To sort',
      sommario:
        'Class PDFs that still have pages with no owner, from all classes together.',
      scritte: {
        trascinato: 'dragged or loaded',
        lettura: 'Reading',
        ocr: 'text, or queued OCR',
        proposte: 'Suggestions',
        unNome: 'one name, one block',
        fascicolo: 'Class file',
        archiviato: 'filed and ticked',
        conferma: 'drag · Confirm N suggestions',
        senzaGesto: 'nothing is filed without you',
        nonAttribuiti: 'Not assigned',
        qualeClasse: 'Which class?',
      },
      figure: [
        {
          didascalia:
            'A class PDF comes in whole, is read page by page, and suggestions come out. They ' +
            'become someone’s documents only when you act.',
          legenda: [
            'The text of each page. Silent scans go into the reading queue, tens of seconds a ' +
              'page.',
            'A page that names someone starts their block, and the following pages without a ' +
              'name stay attached to it.',
            'You file by dragging the pages onto the box, or by confirming the suggestions in ' +
              'one go.',
            'A PDF without a class stays out of every class file until you give it one.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Bringing in a PDF',
          testo:
            'From the class’s **Document archive**: by dragging it onto the page, or with ' +
            '**Load PDFs**. It goes into the year’s document and opens by itself in the ' +
            'frame, ready to be split.',
        },
        {
          termine: 'One pile per class',
          testo:
            'Every class you teach has its own: “class · N pages to place”, and below it one ' +
            'PDF per row with the pages left and the day it came in. A file that will not open ' +
            'carries the badge “won’t open”.',
        },
        {
          termine: 'Sort',
          testo:
            'Takes you to that class’s **Document archive** with the PDF already open in the ' +
            'frame: that is where you sort, because that is where the boxes to drop the pages ' +
            'on are.',
        },
        {
          termine: 'The suggestions',
          testo:
            'The register reads every page and looks for the class’s names. First name and ' +
            'surname together count as certain; a surname two people in the class share is not ' +
            'decided by chance, and the page waits for a human.',
        },
        {
          termine: 'Splitting the pages',
          testo:
            'In the frame a page is selected with a click — `Ctrl` to add more, `Shift` for a ' +
            'range — and dragged onto the box of whoever it belongs to. **Confirm N ' +
            'suggestions** files the ones already recognised in one go, when the PDF knows ' +
            'which document it is.',
        },
        {
          termine: 'Right-click on a page',
          testo:
            '**Assign to…** asks for person and document, **Reread the scan** puts it back in ' +
            'the queue, **Open in the viewer** shows it in the system’s program, **Throw away** ' +
            'removes it — the scanner’s cover sheet, a blank page.',
        },
        {
          termine: 'The scans',
          testo:
            '**Read the scans (N)** queues the pages with no text; **Reread** does the ones ' +
            'already read as well. The queue shows how far it has got, and **Stop** empties it. ' +
            'With reading off, the button says **Reading off** and takes you to the setting.',
        },
        {
          termine: 'Move to…',
          testo:
            'A PDF that ended up in the wrong class — or a scan that spans two classes — is ' +
            'sent to another with the drop-down. Pages already filed stay where they are, and ' +
            'the register redoes the suggestions with the new class’s names.',
        },
        {
          termine: 'Not assigned to a class',
          testo:
            'PDFs that came in without saying whose they were — usually from the old ' +
            '`in-arrivo/` folder, which the register empties when it opens — sit in a separate ' +
            'pile, with the drop-down “Which class is it for?”. Once the class is set, the register ' +
            'reads them again looking for the names.',
        },
        {
          termine: 'When it is empty',
          testo:
            '“Nothing to sort”, with **Go to the document archive**. The number next to “To ' +
            'sort” in the sidebar counts the pages waiting.',
        },
      ],
      note: [
        'Recognising a name is a guess: that is why nothing is filed on its own. The filed ' +
          'page is cropped, put in the person’s class file and ticked in their assignment.',
        'A box that is already full refuses pages: the document of someone who has already ' +
          'handed in is not overwritten.',
        'Reading the scans runs on the machine, with a model chosen in Settings › Program › ' +
          '**Language models**, and it is slow: better to start it on the whole pile and do ' +
          'something else meanwhile.',
      ],
    },
  },
})
