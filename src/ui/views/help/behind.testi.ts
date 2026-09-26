// I testi della guida, parte «Dietro le quinte»: date, dati, salvataggio,
// aprire e chiudere, copie, guai. Una chiave per sezione (`TestiSezione`,
// testa di `types.ts`); struttura in `behind.ts`. I nomi di file e cartelle
// (`.storico/`, `versioni-precedenti/`, `2026-2027.regi`) non si traducono.

import { catalogo } from '../../../i18n/index.js'
import type { TestiSezione } from './types.js'

const it = {
  date: {
    titolo: 'Scrivere e leggere le date',
    sommario: 'I campi data si scrivono come su un foglio, non si compilano casella per casella.',
    scritte: {
      nelCampo: 'Nel campo c’era 01.09.2026, e si batte:',
      dueCifre: 'due cifre: anni Duemila',
      annoDalCampo: 'l’anno viene dal campo',
      meseEAnno: 'mese e anno dal campo',
      diFila: 'cifre di fila',
      nonEsiste: 'non esiste: resta, in rosso',
      unGiorno: 'un giorno',
      unMese: 'un mese',
      pagSu: 'PagSu',
      pagGiu: 'PagGiù',
    },
    figure: [
      {
        didascalia:
          'A sinistra quel che si batte, a destra quel che il registro legge quando si lascia ' +
          'il campo.',
        legenda: [
          'Quel che manca si prende dalla data che il campo aveva, o da oggi se era vuoto.',
          'Un giorno che non esiste non scivola a quello dopo: si segna in rosso, e il modulo ' +
            'non si conferma.',
          'Dentro il campo le frecce spostano la data senza riscriverla.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Che cosa si accetta',
        testo:
          '`7.9.2026`, e al posto del punto la barra, il trattino, lo spazio o la virgola; ' +
          '`7.9.26` con due cifre d’anno; `0709`, `070926` e `07092026` scritte di fila, come ' +
          'su un modulo; e `2026-09-07`.',
      },
      {
        termine: 'Quando manca un pezzo',
        testo:
          '`7.9` prende l’anno della data che il campo aveva, o di oggi se era vuoto. `12` da ' +
          'solo prende anche il mese.',
      },
      {
        termine: 'Spostarla di poco',
        tasti: '↑ / ↓ / PagSu / PagGiù',
        testo:
          '**↑** porta avanti di un giorno e **↓** indietro, **PagSu** e **PagGiù** di un mese. ' +
          'Quel che si vede cambia subito; si salva quando si smette di premere.',
      },
      {
        termine: 'Se non si legge',
        testo:
          'Quel che è stato scritto resta e si segna in rosso, invece di essere cancellato, e il ' +
          'modulo non si conferma finché non torna: «Data non leggibile. Si scrive gg.mm.aaaa — ' +
          'per esempio 7.9.26.»',
      },
      {
        termine: 'Dove c’è il calendario',
        testo:
          '**Dal** e **Al** di un periodo di assenze aprono il calendario del sistema: gli ' +
          'estremi di un periodo si cercano guardando, e fuori dall’anno scolastico non si ' +
          'possono prendere.',
      },
      {
        termine: 'Come si leggono',
        testo:
          'Di solito `07.09.2026`; nei titoli per esteso, «lunedì 7 settembre 2026». La ' +
          'settimana comincia il lunedì, e il numero accanto a ogni settimana del calendario è ' +
          'quello ISO.',
      },
      {
        termine: 'Nei nomi dei file',
        testo:
          'Anno, mese e giorno di fila, senza punti: `260907`, e l’ora come `08.20`. È l’unica ' +
          'forma che mette i file in ordine di data quando la cartella li ordina per nome.',
      },
    ],
    note: [
      'Dentro, ogni data è `2026-09-07`: come la si è scritta non conta, e chi salva riceve ' +
        'sempre la stessa forma. È anche il motivo per cui il campo non dipende dalla lingua ' +
        'del computer, come succede ai campi data del sistema.',
      'Due cifre d’anno sono sempre anni Duemila: `7.9.98` è il 2098. E **PagSu** dal 31 ' +
        'gennaio porta all’ultimo di febbraio, non al 3 marzo.',
    ],
  },
  dati: {
    titolo: 'Dove stanno i dati',
    sommario:
      'Un file per anno scolastico, dove vuoi tu. Niente database, niente servizi in rete.',
    scritte: {
      manifesto: 'che file è, che versione',
      registro: 'anno, materie, impostazioni',
      collezioni: 'persone, ore, voti, piani',
      archivio: 'i PDF raccolti e stampati',
      storico: 'le copie di prima',
      serratura: 'c’è finché è aperto',
      cartellaAccanto: 'bozze, versioni di prima',
      impostazioni: 'le impostazioni del programma',
      documenti: 'recenti e preferiti',
      anniNuovi: 'gli anni non ancora salvati',
      materializzati: 'le copie dei PDF aperti',
      cartellaTua: 'La cartella che scegli tu',
      zip: 'un archivio ZIP',
      questoComputer: 'Questo computer',
      portachiavi: 'portachiavi del sistema',
      password: 'la password della posta',
    },
    figure: [
      {
        didascalia:
          'A sinistra quel che viaggia con l’anno, a destra quel che resta sul computer su cui ' +
          'lo si usa.',
        legenda: [
          'L’anno, le materie e le impostazioni delle sezioni segnate **file**: viaggiano con il ' +
            'file.',
          'Le scansioni archiviate, gli allegati e i rapporti stampati stanno dentro il file, ' +
            'non accanto.',
          'Le versioni precedenti di ogni collezione: vedi «Copie e cancellazioni».',
          'Accanto al file finché il registro lo tiene aperto: dice su quale computer.',
          'La sola cartella vera accanto al file, con il suo nome: le bozze che il programma ' +
            'di posta apre, e in `versioni-precedenti/` la copia di un anno portato al formato ' +
            'di oggi.',
          'In `%APPDATA%\\Regiclass` — nella versione portabile, in `Regiclass - dati` accanto ' +
            'al programma. Non viaggia con l’anno. Quella delle versioni di prima, ' +
            '`%APPDATA%\\Registro docenti`, ci si sposta da sé al primo avvio.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Un anno, un file',
        testo:
          '`2026-2027.regi` contiene l’anno intero: classi e persone, corsi, lezioni, piani, ' +
          'valutazioni, fascicoli, consegne, smistamenti, e anche i PDF. Si apre con un doppio ' +
          'clic; spostare o copiare il file vuol dire spostare o copiare l’anno.',
      },
      {
        termine: 'Nome e posto li scegli tu',
        testo:
          'Il Desktop, una chiavetta, una cartella sincronizzata: il registro apre il file che ' +
          'gli dai, e non tiene un elenco suo da cui pescarlo.',
      },
      {
        termine: 'Aprire un PDF dell’anno',
        testo:
          'Il registro ne estrae una copia in una cartella sua e la apre con il programma del ' +
          'sistema. Le copie si buttano quando si chiude il registro.',
      },
      {
        termine: 'Due tipi di impostazioni',
        testo:
          'Le sezioni delle impostazioni segnate **file** — anno, calendario e calendari ICS, ' +
          'valutazione, materie, liste, intestazione — stanno nel file e passano con lui a chi ' +
          'lo riceve. Le altre sono del programma, e restano sul computer.',
      },
      {
        termine: 'La password della posta',
        testo:
          'Sta nel portachiavi del sistema, mai in un file: non finisce né nell’anno né nelle ' +
          'cartelle sincronizzate.',
      },
      {
        termine: 'Trovare il file',
        testo:
          '**Apri la cartella del file**, nel menu **File**, apre la cartella in cui sta. Il ' +
          'percorso intero è anche in Impostazioni › Documenti e stampa › **Questo file**.',
      },
      {
        termine: 'Guardarci dentro senza il registro',
        testo:
          'È un archivio ZIP con dentro dei JSON: una copia rinominata in `.zip` la apre ' +
          'qualunque computer, anche uno senza il registro.',
      },
    ],
    note: [
      'Un PDF aperto dal registro è una copia: annotarlo con un altro programma non cambia ' +
        'quello dentro l’anno, e la copia sparisce alla chiusura.',
      'Per consegnare l’anno a chi subentra, o per metterlo al sicuro: **Chiudi l’anno**, ' +
        'poi copia il file. Chiuso, è scritto per intero e nessuno lo sta usando.',
    ],
  },
  salvataggio: {
    titolo: 'Il salvataggio',
    sommario:
      'Ogni modifica arriva sul disco da sola, entro due secondi. `Ctrl+S` non serve, ma c’è.',
    scritte: {
      modifica: 'Modifica',
      unClic: 'un clic, un testo',
      attesa: 'Attesa',
      tempi: '0,35 s – 2 s',
      copia: 'Copia',
      inStorico: 'in .storico/',
      scrittura: 'Scrittura',
      inCoda: 'in coda al file',
      salvato: 'Salvato',
      sulDisco: 'sul disco',
      riprova: 'riprova da sé',
      nonRiesce: 'Non riesce',
      discoCheManca: 'disco che manca',
      saltaAttesa: 'salta l’attesa: «Tutto salvato.»',
      uscendo: 'Uscendo, il registro aspetta l’ultima scrittura e lascia libero il file.',
    },
    figure: [
      {
        didascalia:
          'Una modifica passa dalla memoria al file in pochi istanti, e prima di riscrivere si ' +
          'mette da parte com’era.',
        legenda: [
          'Si scrive un terzo di secondo dopo l’ultima modifica, e mai più di due secondi dopo ' +
            'la prima: una frase battuta di fila è una scrittura sola.',
          'In fondo al file si aggiunge solo quel che è cambiato; l’indice si scrive per ultimo, ' +
            'e finché non c’è vale quello di prima.',
          'Le modifiche restano in memoria e il registro riprova, aspettando da un secondo fino ' +
            'a un minuto fra un tentativo e l’altro.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Si salva da sé',
        testo:
          'Un clic nell’appello, un campo lasciato, un PDF archiviato: tutto si scrive da solo. ' +
          'Non c’è un «Salva» da ricordarsi prima di chiudere.',
      },
      {
        termine: 'Salva',
        tasti: 'Ctrl+S',
        testo:
          'Scrive subito quel che aspetta e risponde «Tutto salvato.». Su un anno nuovo non ' +
          'ancora salvato chiede nome e posto.',
      },
      {
        termine: 'Guardare non scrive',
        testo:
          'Un anno aperto solo per consultarlo non tocca il file: su una cartella sincronizzata ' +
          'non c’è niente da caricare.',
      },
      {
        termine: 'Se il disco non risponde',
        testo:
          'Compare «Salvataggio dell’anno non riuscito: …». Quel che si è fatto resta in memoria ' +
          'e il registro riprova da solo: basta rimettere la chiavetta o aspettare che OneDrive ' +
          'lasci il file.',
      },
      {
        termine: 'Uscire',
        testo:
          'Il registro ferma le letture delle scansioni, finisce i rapporti che sta scrivendo, ' +
          'fa l’ultimo salvataggio e toglie la serratura. Poi se ne va.',
      },
    ],
    note: [
      'Aggiungere in coda lascia indietro le versioni vecchie. Quando superano un terzo del ' +
        'file, il registro lo riscrive da capo in un file temporaneo e poi lo rinomina: in ' +
        'tutti e due i modi, se la corrente salta a metà resta l’ultimo file buono.',
      'Finché il salvataggio non riesce, non uscire: all’uscita il registro prova un’ultima ' +
        'volta, e se il disco manca ancora quel che era in memoria si perde.',
    ],
  },
  aprire: {
    titolo: 'Aprire, chiudere, cambiare computer',
    sommario:
      'Un anno aperto alla volta, e una serratura che avvisa se lo stesso file è aperto altrove.',
    scritte: {
      cartellaSincronizzata: 'cartella sincronizzata',
      serratura: 'serratura: PC di scuola',
      pcScuola: 'PC di scuola',
      annoAperto: 'anno aperto',
      pcCasa: 'PC di casa',
      loVuoleAprire: 'lo vuole aprire',
      giaAperto: 'L’anno risulta già aperto su…',
      apriLoStesso: 'Apri lo stesso',
      rilegge: 'Rilegge da sé',
      quelCheLAltro: 'quel che l’altro ha salvato',
    },
    figure: [
      {
        didascalia:
          'Lo stesso file visto da due computer. La serratura non blocca niente: fa la domanda ' +
          'prima che due registri si scrivano sopra a vicenda. Conviene che i due registri ' +
          'siano della stessa versione: un anno che il più nuovo ha portato al formato di oggi, ' +
          'il più vecchio non lo apre più.',
        legenda: [
          'Finché l’anno è aperto, accanto al file c’è una serratura con il nome del computer e ' +
            'di chi lo usa.',
          'Chi lo apre altrove viene avvisato prima. **Apri lo stesso** è la risposta giusta ' +
            'solo se l’altro registro è chiuso, o si è chiuso male.',
          'Quando il file cambia sul disco — l’ha salvato l’altro computer — il registro lo ' +
            'rilegge da sé.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Apri un anno…',
        tasti: 'Ctrl+O',
        testo:
          'Sceglie un file `.regi` con il dialogo del sistema. Lo stesso fa un doppio clic ' +
          'sul file, anche con il registro già acceso: non parte una seconda copia, cambia anno ' +
          'quella che c’è.',
      },
      {
        termine: 'Un anno alla volta',
        testo:
          'Aprendone un altro, quello di prima si salva e si chiude. All’avvio si riapre ' +
          'l’ultimo anno aperto; se il file non c’è più, compare il benvenuto.',
      },
      {
        termine: 'Un anno di un registro più vecchio',
        testo:
          'Si apre lo stesso: il registro lo porta alla forma di oggi. Prima ne mette da parte ' +
          'una copia com’era, nella cartella accanto al file che ha il suo nome — ' +
          '`2026-2027/versioni-precedenti/` —, poi lo riscrive e lo dice, con dove sta la ' +
          'copia. Se la copia non si può fare, all’apertura il file non si riscrive, e lo si ' +
          'dice lo stesso.',
      },
      {
        termine: 'Un anno di un registro più recente',
        testo:
          'Non si apre, apposta: dentro ci possono essere cose che questo registro non sa ' +
          'leggere, e alla prima scrittura andrebbero perse. Una finestra dice le due versioni ' +
          'e propone **Scarica la versione nuova** o **Apri un altro anno…**.',
      },
      {
        termine: 'Recenti e preferiti',
        testo:
          'Nel menu **File**, nel menu dell’anno in fondo a destra nella barra di stato e nel ' +
          'benvenuto: i dodici più recenti, più quelli con la stella, che non scadono. Nei due ' +
          'menu il tasto destro su una riga apre **Aggiungi ai preferiti** o **Togli dai ' +
          'preferiti**, e **Togli dall’elenco**; nel benvenuto lo fanno la stella e la croce. ' +
          'Togliere la riga non tocca il file. Un file cancellato o spostato esce dall’elenco da sé; «non disponibile» vuol ' +
          'dire che adesso non risponde nemmeno la sua cartella — una chiavetta staccata, la ' +
          'rete assente — e la riga resta finché non torna.',
      },
      {
        termine: 'Un anno nuovo',
        testo:
          '**Nuovo anno scolastico** lo apre subito, con le materie e le impostazioni dell’anno ' +
          'aperto, in una cartella provvisoria: il titolo dice «(non salvato)». `Ctrl+S` sceglie ' +
          'nome e posto.',
      },
      {
        termine: 'Importa da un altro registro…',
        testo:
          'Nel menu **File**, e come casella nel modulo dell’anno nuovo: da un altro `.regi` ' +
          '— fra i recenti, o con **Sfoglia…** — si porta in quello aperto quel che vale ancora, ' +
          'una casella per blocco con accanto quanto c’è. **Impostazioni del documento**: scala, ' +
          'arrotondamenti, soglia d’assenza, la giornata di scuola — l’UD, le pause, i giorni —, ' +
          'tendine, carta intestata con logo e firma, non le date dell’anno; se qui un’ora ha già ' +
          'l’appello, la durata dell’UD resta quella di qui. **Materie**, abbinate per nome. ' +
          '**Le classi spuntate qui sotto**, una casella per classe, con **Anagrafica e foto** e ' +
          '**Corsi con orario** — l’orario tiene le sue UD —; una classe che qui c’è già con lo ' +
          'stesso nome si salta. ' +
          '**Piani lezione** e **Calendari ICS e regole**, spenti di partenza. Lezioni, presenze e ' +
          'voti restano di là, e l’altro registro si legge soltanto.',
      },
      {
        termine: 'Un anno nuovo mai salvato',
        testo:
          'Chiudendolo, il registro chiede: **Salva con nome…** o **Butta l’anno**. Uscendo dal ' +
          'programma invece lo tiene, e lo riapre al prossimo avvio.',
      },
      {
        termine: 'Chiudi l’anno',
        testo:
          'Nel menu **File**: l’ultimo salvataggio, il file lasciato libero, e al suo posto il ' +
          'benvenuto. Al prossimo avvio non si riapre da sé, ma resta fra i recenti.',
      },
      {
        termine: 'Cartelle sincronizzate',
        testo:
          'OneDrive e simili vanno bene: il registro scrive solo quel che cambia, e quando il ' +
          'file arriva cambiato da un altro computer lo rilegge. **Ricarica**, in Impostazioni › ' +
          'Documenti e stampa › **Questo file** o con `Ctrl+K`, lo rilegge a comando.',
      },
    ],
    note: [
      'Per passare da un computer all’altro: **Chiudi l’anno** sul primo, aspetta che la ' +
        'cartella sincronizzata abbia caricato, e aprilo sul secondo.',
      'Due registri aperti insieme sullo stesso anno non si fondono: chi salva per ultimo ' +
        'copre il lavoro dell’altro.',
      'Una serratura lasciata dallo stesso computer e dallo stesso utente — un registro ' +
        'chiuso male — non ferma nessuno: è il registro stesso che torna.',
    ],
  },
  copie: {
    titolo: 'Copie e cancellazioni',
    sommario:
      'Il file tiene da sé le versioni di prima; `Ctrl+Z` torna indietro dei gesti di adesso. ' +
      'Prima di eliminare, il registro dice che cosa se ne va.',
    scritte: {
      unaPerSettimana: 'una per settimana',
      unaAlGiorno: 'una al giorno, 30 giorni',
      ultime: 'ultime 10',
      settembre: 'settembre',
      unMeseFa: 'un mese fa',
      adesso: 'adesso',
    },
    figure: [
      {
        didascalia:
          'Le copie di una collezione che restano dentro il file: fitte vicino ad adesso, più ' +
          'rade andando indietro.',
        legenda: [
          'Le ultime dieci scritture: il «com’era cinque minuti fa».',
          'Poi la più recente di ognuno degli ultimi trenta giorni.',
          'Oltre, una a settimana. In tutto non più di sessanta copie per collezione.',
          'Il nome dice collezione, giorno e ora — in tempo universale (UTC), cioè una o due ore ' +
            'indietro rispetto all’orologio svizzero.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Che cosa si mette da parte',
        testo:
          'Prima di riscrivere una collezione — le classi, le lezioni, le valutazioni… — la ' +
          'versione di prima va in `.storico/`, dentro lo stesso file. Segue l’anno dovunque lo ' +
          'si porti.',
      },
      {
        termine: 'Come si guardano',
        testo:
          'Non c’è un pulsante per tornarci. Si copia il file, lo si rinomina in `.zip`, e in ' +
          '`.storico/` ci sono i JSON di com’era, uno per momento.',
      },
      {
        termine: 'Annullare ha un limite',
        testo:
          'Ogni modifica si scrive subito. `Ctrl+Z` e le frecce ↶ ↷ nella barra del titolo ' +
          'tornano indietro gesto per gesto finché l’anno resta aperto; chiuso o riaperto, la ' +
          'storia riparte da capo. Qualche gesto non si disfa — `Ctrl+Z` subito dopo lo dice — ' +
          'e per questo le cose che non si rifanno chiedono conferma prima.',
      },
      {
        termine: 'Prima di eliminare',
        testo:
          'La domanda «Eliminare …?» elenca per intero che cosa sparisce insieme («Se ne va ' +
          'anche») e che cosa resta staccato. Una classe con dodici ore e sessanta voti lo dice ' +
          'prima, non dopo.',
      },
      {
        termine: 'Invece di eliminare',
        testo:
          'La stessa domanda propone la via che non perde niente, dove c’è: archiviare la ' +
          'classe, unire la materia a un’altra.',
      },
      {
        termine: 'Un rapporto buttato',
        testo:
          'Quel che il registro stampa si rifà dai dati: nella pagina Documenti con **Aggiorna ' +
          'tutto**, o con il pulsante accanto al foglio.',
      },
    ],
    note: [
      'Le copie stanno nello stesso file: se si perde il file, si perdono anche loro. Una ' +
        'copia di sicurezza vera è il file intero su un altro disco, fatta con l’anno chiuso.',
    ],
  },
  guai: {
    titolo: 'Se qualcosa non torna',
    sommario:
      'Che cosa vuol dire quel che il registro dice quando c’è un problema, e che cosa fare.',
    scritte: {
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      nonTornano: '2 riferimenti non tornano: il corso …',
      ripara: 'Ripara',
    },
    figure: [
      {
        didascalia:
          'Quando un collegamento fra le cose del registro si rompe, lo dice una barra in cima ' +
          'alla pagina, qualunque pagina sia.',
        legenda: [
          'Quanti riferimenti non tornano, e il primo: un corso che ha perso la materia, un ' +
            'piano che non c’è più.',
          '**Ripara** c’è solo se la correzione non perde niente, e prima di farla elenca che ' +
            'cosa cambierà.',
          '**Dettagli** apre le impostazioni: l’elenco intero sta in Documenti e stampa › ' +
            '**Questo file**.',
        ],
      },
    ],
    voci: [
      {
        termine: '«Risulta già aperto su…»',
        testo:
          'Accanto al file c’è la serratura di un altro computer o di un altro utente. Se ' +
          'l’altro registro è acceso, chiudi l’anno là; se si è chiuso male — un portatile ' +
          'spento di colpo — **Apri lo stesso**.',
      },
      {
        termine: '«… viene da un registro più recente»',
        testo:
          'Un collega o un altro computer ha un registro più nuovo. L’anno non si apre, apposta: ' +
          'dentro ci possono essere cose che questo non sa leggere, e il file resta com’è. La ' +
          'finestra dice le due versioni, quella del file e quella a cui arriva questo registro; ' +
          '**Scarica la versione nuova**, aggiorna e riaprilo, oppure **Apri un altro anno…**.',
      },
      {
        termine: '«Non è un documento del registro» o «non si apre»',
        testo:
          'Il file è rovinato o arrivato a metà da una sincronizzazione. Il registro non ci ' +
          'scrive sopra: aspetta che la sincronizzazione finisca, o riprendi una copia intera.',
      },
      {
        termine: '«… non è un JSON valido»',
        testo:
          'Una collezione non si legge, di solito dopo una modifica a mano. L’anno si apre lo ' +
          'stesso con quella parte vuota; alla prima modifica la versione rotta resta nel file ' +
          'come `….rotto-<data>.json`, non viene coperta.',
      },
      {
        termine: '«Salvataggio dell’anno non riuscito»',
        testo:
          'Disco pieno, chiavetta tolta, file bloccato dalla sincronizzazione. Il lavoro resta ' +
          'in memoria e il registro riprova da solo: ridagli il disco e non uscire prima.',
      },
      {
        termine: 'Si apre il benvenuto invece dell’anno',
        testo:
          'L’ultimo file non si trova — una chiavetta staccata, una cartella non ancora scesa — ' +
          'oppure era stato chiuso con **Chiudi l’anno**. Riaprilo dai recenti o con **Apri un ' +
          'anno…**.',
      },
      {
        termine: 'Mancano le modifiche dell’altro computer',
        testo:
          'Di solito arrivano da sole quando la sincronizzazione ha finito. Se no, **Ricarica** ' +
          '— in Impostazioni › Documenti e stampa › **Questo file**, o con `Ctrl+K` — rilegge ' +
          'il file dal disco.',
      },
      {
        termine: '«Il documento c’è, ma non si è potuto aprire da qui»',
        testo:
          'Manca il programma per quel tipo di file, o non risponde. Il registro prova a ' +
          'mostrarlo nella sua cartella; un PDF si guarda anche nella cornice della pagina ' +
          'Documenti.',
      },
      {
        termine: 'Valutazioni sganciate',
        testo:
          'I momenti che nessuna tappa ha fatto nascere si elencano in cima alla pagina ' +
          '**Valutazioni**, con quanti voti si porterebbero via: si decide guardandoli, non a ' +
          'scatola chiusa.',
      },
      {
        termine: 'La lettura delle scansioni non parte',
        testo:
          'Il pulsante dice «Lettura spenta»: va accesa «Lettura delle scansioni» in ' +
          'Impostazioni › Programma › **Modelli linguistici**, con il modello scelto in cima, in ' +
          '**Chi risponde**, alla riga «Lettura delle scansioni». Senza, le pagine ' +
          'si assegnano a mano — trascinando, o con il tasto destro.',
      },
      {
        termine: 'La posta non parte',
        testo:
          'Se la barra in fondo dice «senza rete», aspetta la rete. Altrimenti Impostazioni › ' +
          '**Comunicazioni** ha **Prova il collegamento** e **Manda una prova**: dicono dove si ' +
          'ferma.',
      },
    ],
    note: [
      '**Ripara** sta nella riga degli avvisi sopra la pagina; **Ripara il registro** si ' +
        'trova anche con `Ctrl+K`, ed è spento quando non c’è niente da riparare.',
      'Correggere a mano i JSON dentro il file è il modo più sicuro di rompere i ' +
        'riferimenti. Se proprio serve, fallo su una copia e con il registro chiuso.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    date: {
      titolo: 'Daten schreiben und lesen',
      sommario:
        'Datumsfelder schreibt man wie auf einem Blatt Papier, nicht Kästchen für Kästchen.',
      scritte: {
        nelCampo: 'Im Feld stand 01.09.2026, und man tippt:',
        dueCifre: 'zwei Ziffern: 2000er-Jahre',
        annoDalCampo: 'das Jahr kommt aus dem Feld',
        meseEAnno: 'Monat und Jahr aus dem Feld',
        diFila: 'Ziffern am Stück',
        nonEsiste: 'gibt es nicht: bleibt, in Rot',
        unGiorno: 'ein Tag',
        unMese: 'ein Monat',
        pagSu: 'Bild↑',
        pagGiu: 'Bild↓',
      },
      figure: [
        {
          didascalia:
            'Links, was man tippt, rechts, was das Klassenbuch liest, wenn man das Feld ' +
            'verlässt.',
          legenda: [
            'Was fehlt, kommt aus dem Datum, das im Feld stand, oder von heute, wenn es leer war.',
            'Ein Tag, den es nicht gibt, rutscht nicht auf den nächsten: Er wird rot markiert, ' +
              'und das Formular lässt sich nicht bestätigen.',
            'Im Feld verschieben die Pfeiltasten das Datum, ohne dass man es neu schreibt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Was angenommen wird',
          testo:
            '`7.9.2026`, und statt des Punkts der Schrägstrich, der Bindestrich, das ' +
            'Leerzeichen oder das Komma; `7.9.26` mit zwei Ziffern für das Jahr; `0709`, ' +
            '`070926` und `07092026` am Stück geschrieben, wie auf einem Formular; und ' +
            '`2026-09-07`.',
        },
        {
          termine: 'Wenn ein Teil fehlt',
          testo:
            '`7.9` nimmt das Jahr des Datums, das im Feld stand, oder von heute, wenn es leer ' +
            'war. `12` allein nimmt auch den Monat.',
        },
        {
          termine: 'Ein wenig verschieben',
          tasti: '↑ / ↓ / Bild↑ / Bild↓',
          testo:
            '**↑** geht einen Tag vor und **↓** zurück, **Bild↑** und **Bild↓** einen Monat. ' +
            'Was man sieht, ändert sich sofort; gespeichert wird, wenn man aufhört zu drücken.',
        },
        {
          termine: 'Wenn es sich nicht lesen lässt',
          testo:
            'Was geschrieben wurde, bleibt stehen und wird rot markiert, statt gelöscht zu ' +
            'werden, und das Formular lässt sich erst bestätigen, wenn es stimmt: «Datum nicht ' +
            'lesbar. Man schreibt TT.MM.JJJJ — zum Beispiel 7.9.26.»',
        },
        {
          termine: 'Wo es den Kalender gibt',
          testo:
            '**Von** und **Bis** eines Absenzzeitraums öffnen den Kalender des Systems: Die ' +
            'Grenzen eines Zeitraums sucht man mit dem Auge, und ausserhalb des Schuljahrs ' +
            'lassen sie sich nicht wählen.',
        },
        {
          termine: 'Wie sie angezeigt werden',
          testo:
            'Meistens `07.09.2026`; in Titeln ausgeschrieben, «Montag 7 September 2026». Die ' +
            'Woche beginnt am Montag, und die Zahl neben jeder Woche im Kalender ist die ' +
            'ISO-Kalenderwoche.',
        },
        {
          termine: 'In Dateinamen',
          testo:
            'Jahr, Monat und Tag am Stück, ohne Punkte: `260907`, und die Uhrzeit als `08.20`. ' +
            'Nur so stehen die Dateien in der Reihenfolge der Daten, wenn der Ordner sie nach ' +
            'Namen sortiert.',
        },
      ],
      note: [
        'Intern ist jedes Datum `2026-09-07`: Wie man es geschrieben hat, spielt keine Rolle, ' +
          'und wer speichert, bekommt immer dieselbe Form. Deshalb hängt das Feld auch nicht ' +
          'von der Sprache des Computers ab, wie es die Datumsfelder des Systems tun.',
        'Zwei Ziffern für das Jahr sind immer 2000er-Jahre: `7.9.98` ist 2098. Und **Bild↑** ' +
          'vom 31. Januar führt zum letzten Februartag, nicht zum 3. März.',
      ],
    },
    dati: {
      titolo: 'Wo die Daten liegen',
      sommario:
        'Eine Datei pro Schuljahr, wo du willst. Keine Datenbank, keine Dienste im Netz.',
      scritte: {
        manifesto: 'welche Datei, welche Version',
        registro: 'Jahr, Fächer, Einstellungen',
        collezioni: 'Personen, Std., Noten, Pläne',
        archivio: 'gesammelte und gedruckte PDF',
        storico: 'die früheren Kopien',
        serratura: 'da, solange offen',
        cartellaAccanto: 'Entwürfe, alte Versionen',
        impostazioni: 'die Einstellungen des Programms',
        documenti: 'zuletzt geöffnet und Favoriten',
        anniNuovi: 'noch nicht gespeicherte Jahre',
        materializzati: 'Kopien der geöffneten PDF',
        cartellaTua: 'Der Ordner, den du wählst',
        zip: 'ein ZIP-Archiv',
        questoComputer: 'Dieser Computer',
        portachiavi: 'Schlüsselbund des Systems',
        password: 'das E-Mail-Passwort',
      },
      figure: [
        {
          didascalia:
            'Links, was mit dem Schuljahr reist, rechts, was auf dem Computer bleibt, auf dem ' +
            'man es benutzt.',
          legenda: [
            'Das Schuljahr, die Fächer und die Einstellungen der mit **Datei** markierten ' +
              'Bereiche: Sie reisen mit der Datei.',
            'Die archivierten Scans, die Anhänge und die gedruckten Berichte liegen in der ' +
              'Datei, nicht daneben.',
            'Die früheren Versionen jeder Sammlung: siehe «Kopien und Löschungen».',
            'Neben der Datei, solange das Klassenbuch sie offen hält: Sie sagt, auf welchem ' +
              'Computer.',
            'Der einzige echte Ordner neben der Datei, mit ihrem Namen: die Entwürfe, die das ' +
              'Mailprogramm öffnet, und in `versioni-precedenti/` die Kopie eines Schuljahrs, ' +
              'das ins heutige Format gebracht wurde.',
            'In `%APPDATA%\\Regiclass` — in der portablen Version in `Regiclass - dati` neben ' +
              'dem Programm. Reist nicht mit dem Schuljahr. Der Ordner früherer Versionen, ' +
              '`%APPDATA%\\Registro docenti`, zieht beim ersten Start von selbst hierher um.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ein Schuljahr, eine Datei',
          testo:
            '`2026-2027.regi` enthält das ganze Schuljahr: Klassen und Personen, Kurse, ' +
            'Stunden, Pläne, Beurteilungen, Klassendossiers, Aufträge, Zuordnungen und ' +
            'auch die PDF. Man öffnet es mit einem Doppelklick; die Datei verschieben oder ' +
            'kopieren heisst, das Schuljahr verschieben oder kopieren.',
        },
        {
          termine: 'Name und Ort wählst du',
          testo:
            'Der Desktop, ein USB-Stick, ein synchronisierter Ordner: Das Klassenbuch öffnet ' +
            'die Datei, die du ihm gibst, und führt keine eigene Liste, aus der es sie holt.',
        },
        {
          termine: 'Ein PDF des Schuljahrs öffnen',
          testo:
            'Das Klassenbuch legt eine Kopie davon in einem eigenen Ordner ab und öffnet sie ' +
            'mit dem Programm des Systems. Die Kopien werden gelöscht, wenn man das ' +
            'Klassenbuch schliesst.',
        },
        {
          termine: 'Zwei Arten von Einstellungen',
          testo:
            'Die mit **Datei** markierten Bereiche der Einstellungen — Schuljahr, Kalender und ' +
            'ICS-Kalender, Beurteilung, Fächer, Listen, Briefkopf — liegen in der Datei und ' +
            'gehen mit ihr zu dem, der sie bekommt. Die anderen gehören zum Programm und ' +
            'bleiben auf dem Computer.',
        },
        {
          termine: 'Das E-Mail-Passwort',
          testo:
            'Es liegt im Schlüsselbund des Systems, nie in einer Datei: Es landet weder im ' +
            'Schuljahr noch in synchronisierten Ordnern.',
        },
        {
          termine: 'Die Datei finden',
          testo:
            '**Ordner der Datei öffnen** im Menü **Datei** öffnet den Ordner, in dem sie liegt. ' +
            'Den ganzen Pfad gibt es auch unter Einstellungen › Dokumente und Druck › **Diese ' +
            'Datei**.',
        },
        {
          termine: 'Ohne das Klassenbuch hineinschauen',
          testo:
            'Es ist ein ZIP-Archiv mit JSON-Dateien darin: Eine in `.zip` umbenannte Kopie ' +
            'öffnet jeder Computer, auch einer ohne das Klassenbuch.',
        },
      ],
      note: [
        'Ein vom Klassenbuch geöffnetes PDF ist eine Kopie: Wer es mit einem anderen Programm ' +
          'kommentiert, ändert nicht das im Schuljahr, und die Kopie verschwindet beim ' +
          'Schliessen.',
        'Um das Schuljahr einer Nachfolge zu übergeben oder es in Sicherheit zu bringen: ' +
          '**Schuljahr schliessen**, dann die Datei kopieren. Geschlossen ist sie ganz ' +
          'geschrieben, und niemand benutzt sie.',
      ],
    },
    salvataggio: {
      titolo: 'Das Speichern',
      sommario:
        'Jede Änderung kommt von selbst auf die Festplatte, innerhalb von zwei Sekunden. ' +
        '`Ctrl+S` braucht es nicht, aber es gibt es.',
      scritte: {
        modifica: 'Änderung',
        unClic: 'Klick oder Text',
        attesa: 'Warten',
        tempi: '0.35 s – 2 s',
        copia: 'Kopie',
        inStorico: 'in .storico/',
        scrittura: 'Schreiben',
        inCoda: 'ans Dateiende',
        salvato: 'Gespeichert',
        sulDisco: 'auf der Platte',
        riprova: 'versucht es wieder',
        nonRiesce: 'Klappt nicht',
        discoCheManca: 'Platte fehlt',
        saltaAttesa: 'überspringt das Warten: «Alles gespeichert.»',
        uscendo:
          'Beim Beenden wartet das Klassenbuch auf das letzte Schreiben und gibt die Datei frei.',
      },
      figure: [
        {
          didascalia:
            'Eine Änderung gelangt in wenigen Augenblicken aus dem Speicher in die Datei, und ' +
            'bevor neu geschrieben wird, wird der alte Stand beiseitegelegt.',
          legenda: [
            'Geschrieben wird eine Drittelsekunde nach der letzten Änderung und nie später als ' +
              'zwei Sekunden nach der ersten: Ein in einem Zug getippter Satz ist ein einziges ' +
              'Schreiben.',
            'Ans Ende der Datei kommt nur, was sich geändert hat; das Verzeichnis wird zuletzt ' +
              'geschrieben, und solange es fehlt, gilt das vorherige.',
            'Die Änderungen bleiben im Speicher, und das Klassenbuch versucht es wieder, mit ' +
              'einer Pause von einer Sekunde bis zu einer Minute zwischen zwei Versuchen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Es speichert von selbst',
          testo:
            'Ein Klick in der Präsenzkontrolle, ein verlassenes Feld, ein archiviertes PDF: ' +
            'Alles wird von selbst geschrieben. Es gibt kein «Speichern», an das man vor dem ' +
            'Schliessen denken muss.',
        },
        {
          termine: 'Speichern',
          tasti: 'Ctrl+S',
          testo:
            'Schreibt sofort, was noch wartet, und antwortet «Alles gespeichert.». Bei einem ' +
            'neuen, noch nicht gespeicherten Schuljahr fragt es nach Name und Ort.',
        },
        {
          termine: 'Anschauen schreibt nicht',
          testo:
            'Ein Schuljahr, das man nur zum Nachschauen öffnet, rührt die Datei nicht an: In ' +
            'einem synchronisierten Ordner gibt es nichts hochzuladen.',
        },
        {
          termine: 'Wenn die Festplatte nicht antwortet',
          testo:
            'Es erscheint «Speichern des Schuljahrs fehlgeschlagen: …». Was man getan hat, ' +
            'bleibt im Speicher, und das Klassenbuch versucht es von selbst wieder: Es genügt, ' +
            'den USB-Stick wieder einzustecken oder zu warten, bis OneDrive die Datei freigibt.',
        },
        {
          termine: 'Beenden',
          testo:
            'Das Klassenbuch stoppt das Lesen der Scans, schliesst die Berichte ab, die es ' +
            'gerade schreibt, speichert ein letztes Mal und entfernt die Sperre. Dann geht es.',
        },
      ],
      note: [
        'Wer ans Ende anhängt, lässt alte Versionen zurück. Wenn sie mehr als ein Drittel der ' +
          'Datei ausmachen, schreibt das Klassenbuch sie von Grund auf in eine temporäre ' +
          'Datei und benennt diese dann um: Auf beide Arten bleibt, wenn der Strom mittendrin ' +
          'ausfällt, die letzte gute Datei.',
        'Solange das Speichern nicht klappt, nicht beenden: Beim Beenden versucht es das ' +
          'Klassenbuch ein letztes Mal, und fehlt die Platte dann immer noch, geht verloren, ' +
          'was im Speicher war.',
      ],
    },
    aprire: {
      titolo: 'Öffnen, schliessen, den Computer wechseln',
      sommario:
        'Ein offenes Schuljahr aufs Mal, und eine Sperre, die warnt, wenn dieselbe Datei ' +
        'anderswo offen ist.',
      scritte: {
        cartellaSincronizzata: 'synchronisierter Ordner',
        serratura: 'Sperre: Schul-PC',
        pcScuola: 'Schul-PC',
        annoAperto: 'Schuljahr offen',
        pcCasa: 'PC zu Hause',
        loVuoleAprire: 'will es öffnen',
        giaAperto: 'Das Schuljahr ist schon offen auf…',
        apriLoStesso: 'Trotzdem öffnen',
        rilegge: 'Liest neu ein',
        quelCheLAltro: 'was der andere gespeichert hat',
      },
      figure: [
        {
          didascalia:
            'Dieselbe Datei von zwei Computern aus gesehen. Die Sperre blockiert nichts: Sie ' +
            'stellt die Frage, bevor zwei Klassenbücher sich gegenseitig überschreiben. Die ' +
            'beiden Klassenbücher sollten dieselbe Version haben: Ein Schuljahr, das das neuere ' +
            'ins heutige Format gebracht hat, öffnet das ältere nicht mehr.',
          legenda: [
            'Solange das Schuljahr offen ist, liegt neben der Datei eine Sperre mit dem Namen ' +
              'des Computers und der Person, die es benutzt.',
            'Wer es anderswo öffnet, wird vorher gewarnt. **Trotzdem öffnen** ist nur dann die ' +
              'richtige Antwort, wenn das andere Klassenbuch geschlossen ist oder nicht sauber ' +
              'beendet wurde.',
            'Ändert sich die Datei auf der Festplatte — der andere Computer hat gespeichert —, ' +
              'liest das Klassenbuch sie von selbst neu ein.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Schuljahr öffnen…',
          tasti: 'Ctrl+O',
          testo:
            'Wählt eine `.regi`-Datei mit dem Dialog des Systems. Dasselbe tut ein ' +
            'Doppelklick auf die Datei, auch wenn das Klassenbuch schon läuft: Es startet ' +
            'keine zweite Kopie, das laufende wechselt das Schuljahr.',
        },
        {
          termine: 'Ein Schuljahr aufs Mal',
          testo:
            'Öffnet man ein anderes, wird das vorherige gespeichert und geschlossen. Beim Start ' +
            'öffnet sich das zuletzt offene Schuljahr wieder; gibt es die Datei nicht mehr, ' +
            'erscheint der Willkommensbildschirm.',
        },
        {
          termine: 'Ein Schuljahr aus einem älteren Klassenbuch',
          testo:
            'Es öffnet sich trotzdem: Das Klassenbuch bringt es in die heutige Form. Vorher legt ' +
            'es eine Kopie im alten Zustand beiseite, im Ordner neben der Datei, der ihren ' +
            'Namen trägt — `2026-2027/versioni-precedenti/` —, dann schreibt es sie neu und ' +
            'sagt es, samt dem Ort der Kopie. Lässt sich die Kopie nicht anlegen, wird die ' +
            'Datei beim Öffnen nicht neu geschrieben, und auch das wird gesagt.',
        },
        {
          termine: 'Ein Schuljahr aus einem neueren Klassenbuch',
          testo:
            'Es öffnet sich nicht, mit Absicht: Darin kann etwas stehen, das dieses ' +
            'Klassenbuch nicht lesen kann, und beim ersten Schreiben ginge es verloren. Ein ' +
            'Fenster nennt die beiden Versionen und schlägt **Neue Version herunterladen** oder ' +
            '**Anderes Schuljahr öffnen…** vor.',
        },
        {
          termine: 'Zuletzt geöffnet und Favoriten',
          testo:
            'Im Menü **Datei**, im Menü des Schuljahrs unten rechts in der Statusleiste und im ' +
            'Willkommensbildschirm: die zwölf zuletzt geöffneten, dazu die mit dem Stern, die ' +
            'nicht verfallen. In den beiden Menüs öffnet die rechte Maustaste auf einer Zeile ' +
            '**Zu den Favoriten hinzufügen** oder **Aus den Favoriten entfernen** und **Aus der Liste ' +
            'entfernen**; im Willkommensbildschirm tun es der Stern und das Kreuz. Die Zeile ' +
            'zu entfernen, rührt die Datei nicht an. Eine gelöschte oder verschobene Datei ' +
            'verschwindet von selbst aus der Liste; «nicht verfügbar» heisst, dass jetzt nicht ' +
            'einmal ihr Ordner antwortet — ein abgezogener USB-Stick, kein Netz —, und die ' +
            'Zeile bleibt, bis er wieder da ist.',
        },
        {
          termine: 'Ein neues Schuljahr',
          testo:
            '**Neues Schuljahr** öffnet es sofort, mit den Fächern und Einstellungen des offenen ' +
            'Schuljahrs, in einem vorläufigen Ordner: Der Titel sagt «(nicht gespeichert)». ' +
            '`Ctrl+S` wählt Name und Ort.',
        },
        {
          termine: 'Aus einem anderen Klassenbuch importieren…',
          testo:
            'Im Menü **Datei**, und als Häkchen im Formular des neuen Schuljahrs: Aus einer ' +
            'anderen `.regi`-Datei — aus den zuletzt geöffneten oder mit ' +
            '**Durchsuchen…** — holt man ins offene, was noch gilt, ein Häkchen pro Block, ' +
            'daneben, wie viel es ist. **Dokumenteinstellungen**: Skala, Rundungen, ' +
            'Absenzengrenze, der Schultag — die Lektion, die Pausen, die Tage —, Auswahllisten, ' +
            'Briefkopf mit Logo und Unterschrift, nicht die Daten des Schuljahrs; hat hier eine ' +
            'Stunde schon eine Präsenzkontrolle, bleibt die Dauer der Lektion die von hier. ' +
            '**Fächer**, nach Namen zugeordnet. **Die unten angehakten Klassen**, ein Häkchen ' +
            'pro Klasse, mit **Personalien und Fotos** und **Kurse mit Stundenplan** — der ' +
            'Stundenplan behält seine Lektionen —; eine Klasse, die es hier schon mit demselben ' +
            'Namen gibt, wird übersprungen. **Unterrichtspläne** und **ICS-Kalender und ' +
            'Regeln**, anfangs nicht angehakt. Stunden, Präsenzen und Noten bleiben ' +
            'drüben, und das andere Klassenbuch wird nur gelesen.',
        },
        {
          termine: 'Ein nie gespeichertes neues Schuljahr',
          testo:
            'Beim Schliessen fragt das Klassenbuch: **Speichern unter…** oder **Schuljahr ' +
            'verwerfen**. Beim Beenden des Programms dagegen behält es das Schuljahr und öffnet ' +
            'es beim nächsten Start wieder.',
        },
        {
          termine: 'Schuljahr schliessen',
          testo:
            'Im Menü **Datei**: das letzte Speichern, die Datei freigegeben, und an ihrer ' +
            'Stelle der Willkommensbildschirm. Beim nächsten Start öffnet es sich nicht von ' +
            'selbst, bleibt aber unter den zuletzt geöffneten.',
        },
        {
          termine: 'Synchronisierte Ordner',
          testo:
            'OneDrive und Ähnliches sind kein Problem: Das Klassenbuch schreibt nur, was sich ' +
            'ändert, und kommt die Datei verändert von einem anderen Computer, liest es sie neu ' +
            'ein. **Neu laden**, unter Einstellungen › Dokumente und Druck › **Diese Datei** ' +
            'oder mit `Ctrl+K`, liest sie auf Befehl neu ein.',
        },
      ],
      note: [
        'Um von einem Computer zum anderen zu wechseln: **Schuljahr schliessen** auf dem ' +
          'ersten, warten, bis der synchronisierte Ordner hochgeladen hat, und es auf dem ' +
          'zweiten öffnen.',
        'Zwei gleichzeitig offene Klassenbücher auf demselben Schuljahr werden nicht ' +
          'zusammengeführt: Wer zuletzt speichert, überschreibt die Arbeit des anderen.',
        'Eine Sperre, die vom selben Computer und vom selben Benutzer stammt — ein nicht ' +
          'sauber beendetes Klassenbuch —, hält niemanden auf: Es ist das Klassenbuch selbst, ' +
          'das zurückkommt.',
      ],
    },
    copie: {
      titolo: 'Kopien und Löschungen',
      sommario:
        'Die Datei behält die früheren Versionen von selbst; `Ctrl+Z` macht die Schritte von ' +
        'jetzt rückgängig. Vor dem Löschen sagt das Klassenbuch, was verschwindet.',
      scritte: {
        unaPerSettimana: 'eine pro Woche',
        unaAlGiorno: 'eine pro Tag, 30 Tage',
        ultime: 'letzte 10',
        settembre: 'September',
        unMeseFa: 'vor einem Monat',
        adesso: 'jetzt',
      },
      figure: [
        {
          didascalia:
            'Die Kopien einer Sammlung, die in der Datei bleiben: dicht nahe bei jetzt, immer ' +
            'dünner, je weiter zurück.',
          legenda: [
            'Die letzten zehn Schreibvorgänge: das «wie es vor fünf Minuten war».',
            'Dann die jüngste von jedem der letzten dreissig Tage.',
            'Darüber hinaus eine pro Woche. Insgesamt höchstens sechzig Kopien pro Sammlung.',
            'Der Name nennt Sammlung, Tag und Uhrzeit — in Weltzeit (UTC), also eine oder zwei ' +
              'Stunden hinter der Schweizer Uhr.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Was beiseitegelegt wird',
          testo:
            'Bevor eine Sammlung neu geschrieben wird — die Klassen, die Stunden, die ' +
            'Beurteilungen… —, kommt die vorherige Version nach `.storico/`, in dieselbe Datei. ' +
            'Sie folgt dem Schuljahr, wohin man es auch bringt.',
        },
        {
          termine: 'Wie man sie ansieht',
          testo:
            'Es gibt keine Schaltfläche, um dorthin zurückzukehren. Man kopiert die Datei, ' +
            'benennt sie in `.zip` um, und in `.storico/` liegen die JSON-Dateien des früheren ' +
            'Stands, eine pro Zeitpunkt.',
        },
        {
          termine: 'Rückgängig hat Grenzen',
          testo:
            'Jede Änderung wird sofort geschrieben. `Ctrl+Z` und die Pfeile ↶ ↷ in der ' +
            'Titelleiste gehen Schritt für Schritt zurück, solange das Schuljahr offen bleibt; ' +
            'geschlossen oder neu geöffnet, beginnt die Geschichte von vorn. Manche Schritte ' +
            'lassen sich nicht rückgängig machen — `Ctrl+Z` gleich danach sagt es —, und ' +
            'deshalb fragen Dinge, die sich nicht wiederholen lassen, vorher nach einer ' +
            'Bestätigung.',
        },
        {
          termine: 'Vor dem Löschen',
          testo:
            'Die Frage «… löschen?» zählt vollständig auf, was mit verschwindet («Ebenfalls ' +
            'gelöscht wird») und was losgelöst bleibt. Eine Klasse mit zwölf Stunden und ' +
            'sechzig Noten sagt es vorher, nicht nachher.',
        },
        {
          termine: 'Statt zu löschen',
          testo:
            'Dieselbe Frage schlägt, wo es ihn gibt, den Weg vor, der nichts verliert: die ' +
            'Klasse archivieren, das Fach mit einem anderen zusammenlegen.',
        },
        {
          termine: 'Ein weggeworfener Bericht',
          testo:
            'Was das Klassenbuch druckt, lässt sich aus den Daten neu erstellen: auf der Seite ' +
            'Dokumente mit **Alles aktualisieren** oder mit der Schaltfläche neben dem Blatt.',
        },
      ],
      note: [
        'Die Kopien liegen in derselben Datei: Geht die Datei verloren, gehen auch sie ' +
          'verloren. Eine echte Sicherungskopie ist die ganze Datei auf einer anderen ' +
          'Festplatte, gemacht bei geschlossenem Schuljahr.',
      ],
    },
    guai: {
      titolo: 'Wenn etwas nicht stimmt',
      sommario:
        'Was das Klassenbuch meint, wenn es ein Problem meldet, und was zu tun ist.',
      scritte: {
        lezione: 'Stunde',
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: 'Unterrichtspläne',
        documenti: 'Dokumente',
        nonTornano: '2 Verweise stimmen nicht: der Kurs …',
        ripara: 'Reparieren',
      },
      figure: [
        {
          didascalia:
            'Wenn eine Verbindung zwischen den Dingen des Klassenbuchs reisst, meldet es eine ' +
            'Leiste oben auf der Seite, egal welche Seite es ist.',
          legenda: [
            'Wie viele Verweise nicht stimmen, und der erste: ein Kurs, der sein Fach verloren ' +
              'hat, ein Plan, den es nicht mehr gibt.',
            '**Reparieren** gibt es nur, wenn die Korrektur nichts verliert, und bevor sie ' +
              'ausgeführt wird, zählt sie auf, was sich ändert.',
            '**Details** öffnet die Einstellungen: Die ganze Liste steht unter Dokumente und ' +
              'Druck › **Diese Datei**.',
          ],
        },
      ],
      voci: [
        {
          termine: '«Ist schon offen auf…»',
          testo:
            'Neben der Datei liegt die Sperre eines anderen Computers oder eines anderen ' +
            'Benutzers. Läuft das andere Klassenbuch, schliess das Schuljahr dort; wurde es ' +
            'nicht sauber beendet — ein plötzlich ausgeschalteter Laptop —, **Trotzdem öffnen**.',
        },
        {
          termine: '«… stammt aus einem neueren Klassenbuch»',
          testo:
            'Eine Kollegin, ein Kollege oder ein anderer Computer hat ein neueres Klassenbuch. ' +
            'Das Schuljahr öffnet sich nicht, mit Absicht: Darin kann etwas stehen, das dieses ' +
            'nicht lesen kann, und die Datei bleibt, wie sie ist. Das Fenster nennt die beiden ' +
            'Versionen, die der Datei und die, bis zu der dieses Klassenbuch reicht; **Neue ' +
            'Version herunterladen**, aktualisieren und neu öffnen, oder **Anderes Schuljahr ' +
            'öffnen…**.',
        },
        {
          termine: '«Kein Dokument des Klassenbuchs» oder «lässt sich nicht öffnen»',
          testo:
            'Die Datei ist beschädigt oder nur halb von einer Synchronisierung angekommen. Das ' +
            'Klassenbuch schreibt nicht darüber: Warte, bis die Synchronisierung fertig ist, ' +
            'oder hol eine vollständige Kopie zurück.',
        },
        {
          termine: '«… ist kein gültiges JSON»',
          testo:
            'Eine Sammlung lässt sich nicht lesen, meist nach einer Änderung von Hand. Das ' +
            'Schuljahr öffnet sich trotzdem, mit diesem Teil leer; bei der ersten Änderung ' +
            'bleibt die kaputte Version als `….rotto-<data>.json` in der Datei und wird nicht ' +
            'überschrieben.',
        },
        {
          termine: '«Speichern des Schuljahrs fehlgeschlagen»',
          testo:
            'Platte voll, USB-Stick abgezogen, Datei von der Synchronisierung gesperrt. Die ' +
            'Arbeit bleibt im Speicher, und das Klassenbuch versucht es von selbst wieder: Gib ' +
            'ihm die Platte zurück, und beende es nicht vorher.',
        },
        {
          termine: 'Statt des Schuljahrs erscheint der Willkommensbildschirm',
          testo:
            'Die letzte Datei ist nicht zu finden — ein abgezogener USB-Stick, ein noch nicht ' +
            'heruntergeladener Ordner —, oder sie wurde mit **Schuljahr schliessen** ' +
            'geschlossen. Öffne sie wieder aus den zuletzt geöffneten oder mit **Schuljahr ' +
            'öffnen…**.',
        },
        {
          termine: 'Die Änderungen des anderen Computers fehlen',
          testo:
            'Meistens kommen sie von selbst, wenn die Synchronisierung fertig ist. Sonst liest ' +
            '**Neu laden** — unter Einstellungen › Dokumente und Druck › **Diese Datei** oder ' +
            'mit `Ctrl+K` — die Datei von der Festplatte neu ein.',
        },
        {
          termine: '«Das Dokument ist da, liess sich aber von hier aus nicht öffnen»',
          testo:
            'Das Programm für diesen Dateityp fehlt oder antwortet nicht. Das Klassenbuch ' +
            'versucht, die Datei in ihrem Ordner zu zeigen; ein PDF sieht man auch im Rahmen ' +
            'der Seite Dokumente.',
        },
        {
          termine: 'Nicht verknüpfte Beurteilungen',
          testo:
            'Die Leistungsbeurteilungen, die keine Etappe hervorgebracht hat, stehen oben auf ' +
            'der Seite **Beurteilungen**, mit der Zahl der Noten, die sie mitnehmen würden: Man ' +
            'entscheidet, indem man sie ansieht, nicht blind.',
        },
        {
          termine: 'Das Lesen der Scans startet nicht',
          testo:
            'Die Schaltfläche sagt «Lesen aus»: «Scans lesen» muss unter Einstellungen › ' +
            'Programm › **Sprachmodelle** eingeschaltet sein, mit dem Modell, das oben unter ' +
            '**Wer antwortet** in der Zeile «Scans lesen» gewählt ist. Ohne werden die Seiten ' +
            'von Hand zugeordnet — durch Ziehen oder mit der rechten Maustaste.',
        },
        {
          termine: 'Die E-Mail geht nicht hinaus',
          testo:
            'Sagt die Leiste unten «kein Netz», warte auf das Netz. Sonst gibt es unter ' +
            'Einstellungen › **Kommunikation** **Verbindung testen** und **Test senden**: Sie ' +
            'sagen, wo es hängt.',
        },
      ],
      note: [
        '**Reparieren** steht in der Meldezeile über der Seite; **Klassenbuch reparieren** ' +
          'findet man auch mit `Ctrl+K`, und es ist inaktiv, wenn es nichts zu reparieren gibt.',
        'Die JSON-Dateien in der Datei von Hand zu korrigieren, ist der sicherste Weg, die ' +
          'Verweise zu zerstören. Wenn es wirklich sein muss, dann an einer Kopie und bei ' +
          'geschlossenem Klassenbuch.',
      ],
    },
  },
  fr: {
    date: {
      titolo: 'Écrire et lire les dates',
      sommario:
        'Les champs de date s’écrivent comme sur une feuille, pas case par case.',
      scritte: {
        nelCampo: 'Le champ contenait 01.09.2026, et on tape :',
        dueCifre: 'deux chiffres : années 2000',
        annoDalCampo: 'l’année vient du champ',
        meseEAnno: 'mois et année du champ',
        diFila: 'chiffres à la suite',
        nonEsiste: 'n’existe pas : reste, en rouge',
        unGiorno: 'un jour',
        unMese: 'un mois',
        pagSu: 'Pg préc',
        pagGiu: 'Pg suiv',
      },
      figure: [
        {
          didascalia:
            'À gauche ce qu’on tape, à droite ce que le registre lit quand on quitte le champ.',
          legenda: [
            'Ce qui manque est pris dans la date que le champ contenait, ou dans celle ' +
              'd’aujourd’hui s’il était vide.',
            'Un jour qui n’existe pas ne glisse pas au suivant : il est marqué en rouge, et le ' +
              'formulaire ne se confirme pas.',
            'Dans le champ, les flèches déplacent la date sans la réécrire.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ce qui est accepté',
          testo:
            '`7.9.2026`, et à la place du point la barre oblique, le tiret, l’espace ou la ' +
            'virgule ; `7.9.26` avec deux chiffres pour l’année ; `0709`, `070926` et ' +
            '`07092026` écrits à la suite, comme sur un formulaire ; et `2026-09-07`.',
        },
        {
          termine: 'Quand il manque un morceau',
          testo:
            '`7.9` prend l’année de la date que le champ contenait, ou d’aujourd’hui s’il était ' +
            'vide. `12` tout seul prend aussi le mois.',
        },
        {
          termine: 'La déplacer un peu',
          tasti: '↑ / ↓ / Pg préc / Pg suiv',
          testo:
            '**↑** avance d’un jour et **↓** recule, **Pg préc** et **Pg suiv** d’un mois. Ce ' +
            'qu’on voit change tout de suite ; l’enregistrement se fait quand on arrête ' +
            'd’appuyer.',
        },
        {
          termine: 'Si elle ne se lit pas',
          testo:
            'Ce qui a été écrit reste et se marque en rouge, au lieu d’être effacé, et le ' +
            'formulaire ne se confirme pas tant que ce n’est pas juste : « Date illisible. On ' +
            'écrit jj.mm.aaaa — par exemple 7.9.26. »',
        },
        {
          termine: 'Où il y a le calendrier',
          testo:
            '**Du** et **Au** d’une période d’absence ouvrent le calendrier du système : les ' +
            'bornes d’une période se cherchent du regard, et en dehors de l’année scolaire on ' +
            'ne peut pas les choisir.',
        },
        {
          termine: 'Comment elles s’affichent',
          testo:
            'D’habitude `07.09.2026` ; dans les titres en toutes lettres, « lundi 7 septembre ' +
            '2026 ». La semaine commence le lundi, et le numéro à côté de chaque semaine du ' +
            'calendrier est celui de la norme ISO.',
        },
        {
          termine: 'Dans les noms de fichier',
          testo:
            'Année, mois et jour à la suite, sans points : `260907`, et l’heure comme `08.20`. ' +
            'C’est la seule forme qui range les fichiers par date quand le dossier les trie ' +
            'par nom.',
        },
      ],
      note: [
        'À l’intérieur, chaque date est `2026-09-07` : la façon dont on l’a écrite ne compte ' +
          'pas, et qui enregistre reçoit toujours la même forme. C’est aussi pour cela que le ' +
          'champ ne dépend pas de la langue de l’ordinateur, comme c’est le cas des champs de ' +
          'date du système.',
        'Deux chiffres pour l’année, ce sont toujours les années 2000 : `7.9.98`, c’est 2098. ' +
          'Et **Pg préc** depuis le 31 janvier mène au dernier jour de février, pas au 3 mars.',
      ],
    },
    dati: {
      titolo: 'Où sont les données',
      sommario:
        'Un fichier par année scolaire, là où tu veux. Pas de base de données, pas de service ' +
        'en ligne.',
      scritte: {
        manifesto: 'quel fichier, quelle version',
        registro: 'année, branches, paramètres',
        collezioni: 'classes, leçons, notes, plans',
        archivio: 'les PDF archivés et imprimés',
        storico: 'les copies d’avant',
        serratura: 'là tant qu’il est ouvert',
        cartellaAccanto: 'brouillons, copies d’avant',
        impostazioni: 'les paramètres du programme',
        documenti: 'récents et favoris',
        anniNuovi: 'années pas encore enregistrées',
        materializzati: 'les copies des PDF ouverts',
        cartellaTua: 'Le dossier que tu choisis',
        zip: 'une archive ZIP',
        questoComputer: 'Cet ordinateur',
        portachiavi: 'trousseau du système',
        password: 'le mot de passe du courrier',
      },
      figure: [
        {
          didascalia:
            'À gauche ce qui voyage avec l’année, à droite ce qui reste sur l’ordinateur où on ' +
            'l’utilise.',
          legenda: [
            'L’année, les branches et les paramètres des sections marquées **fichier** : ils ' +
              'voyagent avec le fichier.',
            'Les scans archivés, les pièces jointes et les rapports imprimés sont dans le ' +
              'fichier, pas à côté.',
            'Les versions précédentes de chaque collection : voir « Copies et suppressions ».',
            'À côté du fichier tant que le registre le garde ouvert : il dit sur quel ' +
              'ordinateur.',
            'Le seul vrai dossier à côté du fichier, avec son nom : les brouillons que la ' +
              'messagerie ouvre, et dans `versioni-precedenti/` la copie d’une année amenée au ' +
              'format d’aujourd’hui.',
            'Dans `%APPDATA%\\Regiclass` — dans la version portable, dans `Regiclass - dati` à ' +
              'côté du programme. Ne voyage pas avec l’année. Celui des versions précédentes, ' +
              '`%APPDATA%\\Registro docenti`, s’y déplace tout seul au premier démarrage.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Une année, un fichier',
          testo:
            '`2026-2027.regi` contient l’année entière : classes et personnes, cours, ' +
            'leçons, plans, évaluations, dossiers de classe, devoirs, tris, et aussi les PDF. ' +
            'Il s’ouvre d’un double clic ; déplacer ou copier le fichier, c’est déplacer ou ' +
            'copier l’année.',
        },
        {
          termine: 'Le nom et l’emplacement, c’est toi qui les choisis',
          testo:
            'Le Bureau, une clé USB, un dossier synchronisé : le registre ouvre le fichier que ' +
            'tu lui donnes, et ne tient pas de liste à lui où aller le chercher.',
        },
        {
          termine: 'Ouvrir un PDF de l’année',
          testo:
            'Le registre en extrait une copie dans un dossier à lui et l’ouvre avec le ' +
            'programme du système. Les copies sont jetées quand on ferme le registre.',
        },
        {
          termine: 'Deux sortes de paramètres',
          testo:
            'Les sections des paramètres marquées **fichier** — année, calendrier et ' +
            'calendriers ICS, évaluation, branches, listes, en-tête — sont dans le fichier et ' +
            'passent avec lui à qui le reçoit. Les autres appartiennent au programme, et ' +
            'restent sur l’ordinateur.',
        },
        {
          termine: 'Le mot de passe du courrier',
          testo:
            'Il est dans le trousseau du système, jamais dans un fichier : il ne finit ni dans ' +
            'l’année ni dans les dossiers synchronisés.',
        },
        {
          termine: 'Trouver le fichier',
          testo:
            '**Ouvrir le dossier du fichier**, dans le menu **Fichier**, ouvre le dossier où il ' +
            'se trouve. Le chemin complet est aussi dans Paramètres › Documents et impression › ' +
            '**Ce fichier**.',
        },
        {
          termine: 'Regarder dedans sans le registre',
          testo:
            'C’est une archive ZIP qui contient des JSON : une copie renommée en `.zip` ' +
            's’ouvre sur n’importe quel ordinateur, même sans le registre.',
        },
      ],
      note: [
        'Un PDF ouvert par le registre est une copie : l’annoter avec un autre programme ne ' +
          'change pas celui qui est dans l’année, et la copie disparaît à la fermeture.',
        'Pour remettre l’année à qui prend la suite, ou pour la mettre à l’abri : **Fermer ' +
          'l’année**, puis copier le fichier. Fermé, il est écrit en entier et personne ne ' +
          'l’utilise.',
      ],
    },
    salvataggio: {
      titolo: 'L’enregistrement',
      sommario:
        'Chaque modification arrive toute seule sur le disque, en moins de deux secondes. ' +
        '`Ctrl+S` ne sert à rien, mais il existe.',
      scritte: {
        modifica: 'Modification',
        unClic: 'un clic, un texte',
        attesa: 'Attente',
        tempi: '0,35 s – 2 s',
        copia: 'Copie',
        inStorico: 'dans .storico/',
        scrittura: 'Écriture',
        inCoda: 'en fin de fichier',
        salvato: 'Enregistré',
        sulDisco: 'sur le disque',
        riprova: 'réessaie tout seul',
        nonRiesce: 'Échec',
        discoCheManca: 'disque absent',
        saltaAttesa: 'saute l’attente : « Tout est enregistré. »',
        uscendo:
          'En quittant, le registre attend la dernière écriture et libère le fichier.',
      },
      figure: [
        {
          didascalia:
            'Une modification passe de la mémoire au fichier en quelques instants, et avant de ' +
            'réécrire, on met de côté l’état d’avant.',
          legenda: [
            'On écrit un tiers de seconde après la dernière modification, et jamais plus de ' +
              'deux secondes après la première : une phrase tapée d’un trait est une seule ' +
              'écriture.',
            'À la fin du fichier ne s’ajoute que ce qui a changé ; l’index s’écrit en dernier, ' +
              'et tant qu’il n’est pas là, c’est celui d’avant qui vaut.',
            'Les modifications restent en mémoire et le registre réessaie, en attendant d’une ' +
              'seconde à une minute entre deux tentatives.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ça s’enregistre tout seul',
          testo:
            'Un clic dans l’appel, un champ quitté, un PDF archivé : tout s’écrit tout seul. Il ' +
            'n’y a pas d’« Enregistrer » à ne pas oublier avant de fermer.',
        },
        {
          termine: 'Enregistrer',
          tasti: 'Ctrl+S',
          testo:
            'Écrit tout de suite ce qui attend et répond « Tout est enregistré. ». Sur une ' +
            'nouvelle année pas encore enregistrée, demande un nom et un emplacement.',
        },
        {
          termine: 'Regarder n’écrit pas',
          testo:
            'Une année ouverte seulement pour la consulter ne touche pas au fichier : sur un ' +
            'dossier synchronisé, il n’y a rien à téléverser.',
        },
        {
          termine: 'Si le disque ne répond pas',
          testo:
            '« Enregistrement de l’année échoué : … » apparaît. Ce qu’on a fait reste en ' +
            'mémoire et le registre réessaie tout seul : il suffit de remettre la clé USB ou ' +
            'd’attendre que OneDrive libère le fichier.',
        },
        {
          termine: 'Quitter',
          testo:
            'Le registre arrête la lecture des scans, termine les rapports qu’il est en train ' +
            'd’écrire, fait le dernier enregistrement et retire le verrou. Puis il s’en va.',
        },
      ],
      note: [
        'Ajouter en fin de fichier laisse derrière les anciennes versions. Quand elles ' +
          'dépassent un tiers du fichier, le registre le réécrit de zéro dans un fichier ' +
          'temporaire puis le renomme : dans les deux cas, si le courant saute au milieu, le ' +
          'dernier bon fichier reste.',
        'Tant que l’enregistrement n’aboutit pas, ne quitte pas : en quittant, le registre ' +
          'essaie une dernière fois, et si le disque manque encore, ce qui était en mémoire ' +
          'est perdu.',
      ],
    },
    aprire: {
      titolo: 'Ouvrir, fermer, changer d’ordinateur',
      sommario:
        'Une seule année ouverte à la fois, et un verrou qui avertit si le même fichier est ' +
        'ouvert ailleurs.',
      scritte: {
        cartellaSincronizzata: 'dossier synchronisé',
        serratura: 'verrou : PC de l’école',
        pcScuola: 'PC de l’école',
        annoAperto: 'année ouverte',
        pcCasa: 'PC à la maison',
        loVuoleAprire: 'veut l’ouvrir',
        giaAperto: 'L’année est déjà ouverte sur…',
        apriLoStesso: 'Ouvrir quand même',
        rilegge: 'Relit tout seul',
        quelCheLAltro: 'ce que l’autre a enregistré',
      },
      figure: [
        {
          didascalia:
            'Le même fichier vu depuis deux ordinateurs. Le verrou ne bloque rien : il pose la ' +
            'question avant que deux registres n’écrivent l’un par-dessus l’autre. Mieux vaut ' +
            'que les deux registres aient la même version : une année que le plus récent a ' +
            'amenée au format d’aujourd’hui, le plus ancien ne l’ouvre plus.',
          legenda: [
            'Tant que l’année est ouverte, il y a à côté du fichier un verrou avec le nom de ' +
              'l’ordinateur et de la personne qui l’utilise.',
            'Qui l’ouvre ailleurs est averti avant. **Ouvrir quand même** n’est la bonne ' +
              'réponse que si l’autre registre est fermé, ou s’est mal fermé.',
            'Quand le fichier change sur le disque — l’autre ordinateur l’a enregistré —, le ' +
              'registre le relit tout seul.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ouvrir une année…',
          tasti: 'Ctrl+O',
          testo:
            'Choisit un fichier `.regi` avec la boîte de dialogue du système. Un double ' +
            'clic sur le fichier fait de même, même avec le registre déjà lancé : aucune ' +
            'deuxième copie ne démarre, c’est celle qui tourne qui change d’année.',
        },
        {
          termine: 'Une année à la fois',
          testo:
            'Quand on en ouvre une autre, celle d’avant s’enregistre et se ferme. Au démarrage, ' +
            'la dernière année ouverte se rouvre ; si le fichier n’existe plus, l’écran ' +
            'd’accueil apparaît.',
        },
        {
          termine: 'Une année d’un registre plus ancien',
          testo:
            'Elle s’ouvre quand même : le registre l’amène à la forme d’aujourd’hui. Avant, il ' +
            'en met de côté une copie telle qu’elle était, dans le dossier à côté du fichier ' +
            'qui porte son nom — `2026-2027/versioni-precedenti/` —, puis il la réécrit et le ' +
            'dit, avec l’endroit où se trouve la copie. Si la copie ne peut pas se faire, le ' +
            'fichier n’est pas réécrit à l’ouverture, et on le dit quand même.',
        },
        {
          termine: 'Une année d’un registre plus récent',
          testo:
            'Elle ne s’ouvre pas, exprès : elle peut contenir des choses que ce registre ne sait ' +
            'pas lire, et elles seraient perdues à la première écriture. Une fenêtre indique ' +
            'les deux versions et propose **Télécharger la nouvelle version** ou **Ouvrir une ' +
            'autre année…**.',
        },
        {
          termine: 'Récents et favoris',
          testo:
            'Dans le menu **Fichier**, dans le menu de l’année en bas à droite dans la barre ' +
            'd’état et dans l’écran d’accueil : les douze plus récents, plus ceux avec ' +
            'l’étoile, qui n’expirent pas. Dans les deux menus, le clic droit sur une ligne ' +
            'ouvre **Ajouter aux favoris** ou **Retirer des favoris**, et **Retirer de la ' +
            'liste** ; dans l’écran d’accueil, ce sont l’étoile et la croix. Retirer la ligne ' +
            'ne touche pas au fichier. Un fichier supprimé ou déplacé sort tout seul de la ' +
            'liste ; « non disponible » veut dire que même son dossier ne répond pas pour ' +
            'l’instant — une clé USB débranchée, pas de réseau — et la ligne reste jusqu’à ce ' +
            'qu’il revienne.',
        },
        {
          termine: 'Une nouvelle année',
          testo:
            '**Nouvelle année scolaire** l’ouvre tout de suite, avec les branches et les ' +
            'paramètres de l’année ouverte, dans un dossier provisoire : le titre dit « (non ' +
            'enregistrée) ». `Ctrl+S` choisit le nom et l’emplacement.',
        },
        {
          termine: 'Importer d’un autre registre…',
          testo:
            'Dans le menu **Fichier**, et comme case dans le formulaire de la nouvelle année : ' +
            'd’un autre `.regi` — parmi les récents, ou avec **Parcourir…** — on reprend ' +
            'dans celui qui est ouvert ce qui vaut encore, une case par bloc avec à côté ce ' +
            'qu’il y a. **Paramètres du document** : barème, arrondis, seuil d’absences, la ' +
            'journée d’école — la période, les pauses, les jours —, listes déroulantes, papier ' +
            'à en-tête avec logo et signature, pas les dates de l’année ; si une leçon a déjà ' +
            'l’appel ici, la durée de la période reste celle d’ici. **Branches**, associées par ' +
            'nom. **Les classes cochées ci-dessous**, une case par classe, avec **Données ' +
            'personnelles et photos** et **Cours avec horaire** — l’horaire garde ses périodes ' +
            '— ; une classe qui existe déjà ici sous le même nom est sautée. **Plans de leçon** ' +
            'et **Calendriers ICS et règles**, décochés au départ. Leçons, présences et notes ' +
            'restent là-bas, et l’autre registre est seulement lu.',
        },
        {
          termine: 'Une nouvelle année jamais enregistrée',
          testo:
            'En la fermant, le registre demande : **Enregistrer sous…** ou **Jeter l’année**. ' +
            'En quittant le programme, en revanche, il la garde et la rouvre au prochain ' +
            'démarrage.',
        },
        {
          termine: 'Fermer l’année',
          testo:
            'Dans le menu **Fichier** : le dernier enregistrement, le fichier libéré, et à sa ' +
            'place l’écran d’accueil. Au prochain démarrage, elle ne se rouvre pas toute seule, ' +
            'mais reste parmi les récents.',
        },
        {
          termine: 'Dossiers synchronisés',
          testo:
            'OneDrive et consorts conviennent : le registre n’écrit que ce qui change, et quand ' +
            'le fichier arrive modifié d’un autre ordinateur, il le relit. **Recharger**, dans ' +
            'Paramètres › Documents et impression › **Ce fichier** ou avec `Ctrl+K`, le relit ' +
            'sur commande.',
        },
      ],
      note: [
        'Pour passer d’un ordinateur à l’autre : **Fermer l’année** sur le premier, attends que ' +
          'le dossier synchronisé ait téléversé, et ouvre-la sur le second.',
        'Deux registres ouverts en même temps sur la même année ne fusionnent pas : celui qui ' +
          'enregistre en dernier écrase le travail de l’autre.',
        'Un verrou laissé par le même ordinateur et le même utilisateur — un registre mal ' +
          'fermé — n’arrête personne : c’est le registre lui-même qui revient.',
      ],
    },
    copie: {
      titolo: 'Copies et suppressions',
      sommario:
        'Le fichier garde tout seul les versions d’avant ; `Ctrl+Z` revient sur les gestes ' +
        'd’à présent. Avant de supprimer, le registre dit ce qui s’en va.',
      scritte: {
        unaPerSettimana: 'une par semaine',
        unaAlGiorno: 'une par jour, 30 jours',
        ultime: '10 dernières',
        settembre: 'septembre',
        unMeseFa: 'il y a un mois',
        adesso: 'maintenant',
      },
      figure: [
        {
          didascalia:
            'Les copies d’une collection qui restent dans le fichier : serrées près de ' +
            'maintenant, plus espacées en remontant.',
          legenda: [
            'Les dix dernières écritures : le « comment c’était il y a cinq minutes ».',
            'Puis la plus récente de chacun des trente derniers jours.',
            'Au-delà, une par semaine. En tout, pas plus de soixante copies par collection.',
            'Le nom indique collection, jour et heure — en temps universel (UTC), c’est-à-dire ' +
              'une ou deux heures de retard sur l’heure suisse.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ce qui est mis de côté',
          testo:
            'Avant de réécrire une collection — les classes, les leçons, les évaluations… —, la ' +
            'version d’avant va dans `.storico/`, dans le même fichier. Elle suit l’année ' +
            'partout où on l’emporte.',
        },
        {
          termine: 'Comment les regarder',
          testo:
            'Il n’y a pas de bouton pour y revenir. On copie le fichier, on le renomme en ' +
            '`.zip`, et dans `.storico/` il y a les JSON de l’état d’avant, un par moment.',
        },
        {
          termine: 'Annuler a une limite',
          testo:
            'Chaque modification s’écrit tout de suite. `Ctrl+Z` et les flèches ↶ ↷ dans la ' +
            'barre de titre reviennent en arrière geste par geste tant que l’année reste ' +
            'ouverte ; fermée ou rouverte, l’historique repart de zéro. Certains gestes ne se ' +
            'défont pas — `Ctrl+Z` juste après le dit —, et c’est pour cela que les choses qui ' +
            'ne se refont pas demandent une confirmation avant.',
        },
        {
          termine: 'Avant de supprimer',
          testo:
            'La question « Supprimer … ? » énumère en entier ce qui disparaît avec (« Disparaît ' +
            'aussi ») et ce qui reste détaché. Une classe avec douze leçons et soixante notes ' +
            'le dit avant, pas après.',
        },
        {
          termine: 'Au lieu de supprimer',
          testo:
            'La même question propose la voie qui ne perd rien, quand il y en a une : archiver ' +
            'la classe, fusionner la branche avec une autre.',
        },
        {
          termine: 'Un rapport jeté',
          testo:
            'Ce que le registre imprime se refait à partir des données : dans la page ' +
            'Documents avec **Tout mettre à jour**, ou avec le bouton à côté de la feuille.',
        },
      ],
      note: [
        'Les copies sont dans le même fichier : si on perd le fichier, on les perd aussi. Une ' +
          'vraie copie de sauvegarde, c’est le fichier entier sur un autre disque, faite avec ' +
          'l’année fermée.',
      ],
    },
    guai: {
      titolo: 'Si quelque chose ne va pas',
      sommario:
        'Ce que veut dire ce que le registre affiche quand il y a un problème, et que faire.',
      scritte: {
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        nonTornano: '2 références ne correspondent pas : le cours …',
        ripara: 'Réparer',
      },
      figure: [
        {
          didascalia:
            'Quand un lien entre les choses du registre se rompt, une barre le dit en haut de ' +
            'la page, quelle que soit la page.',
          legenda: [
            'Combien de références ne correspondent pas, et la première : un cours qui a perdu ' +
              'sa branche, un plan qui n’existe plus.',
            '**Réparer** n’est là que si la correction ne perd rien, et avant de la faire, il ' +
              'énumère ce qui va changer.',
            '**Détails** ouvre les paramètres : la liste entière est dans Documents et ' +
              'impression › **Ce fichier**.',
          ],
        },
      ],
      voci: [
        {
          termine: '« Est déjà ouverte sur… »',
          testo:
            'À côté du fichier, il y a le verrou d’un autre ordinateur ou d’un autre ' +
            'utilisateur. Si l’autre registre est allumé, ferme l’année là-bas ; s’il s’est mal ' +
            'fermé — un portable éteint d’un coup —, **Ouvrir quand même**.',
        },
        {
          termine: '« … vient d’un registre plus récent »',
          testo:
            'Un ou une collègue, ou un autre ordinateur, a un registre plus récent. L’année ne ' +
            's’ouvre pas, exprès : elle peut contenir des choses que celui-ci ne sait pas lire, ' +
            'et le fichier reste tel quel. La fenêtre indique les deux versions, celle du ' +
            'fichier et celle jusqu’où va ce registre ; **Télécharger la nouvelle version**, ' +
            'mets à jour et rouvre-la, ou **Ouvrir une autre année…**.',
        },
        {
          termine: '« Ce n’est pas un document du registre » ou « ne s’ouvre pas »',
          testo:
            'Le fichier est abîmé ou arrivé à moitié par une synchronisation. Le registre ' +
            'n’écrit pas dessus : attends que la synchronisation se termine, ou reprends une ' +
            'copie complète.',
        },
        {
          termine: '« … n’est pas un JSON valide »',
          testo:
            'Une collection ne se lit pas, en général après une modification à la main. ' +
            'L’année s’ouvre quand même avec cette partie vide ; à la première modification, ' +
            'la version cassée reste dans le fichier sous le nom `….rotto-<data>.json`, elle ' +
            'n’est pas écrasée.',
        },
        {
          termine: '« Enregistrement de l’année échoué »',
          testo:
            'Disque plein, clé USB retirée, fichier bloqué par la synchronisation. Le travail ' +
            'reste en mémoire et le registre réessaie tout seul : rends-lui le disque et ne ' +
            'quitte pas avant.',
        },
        {
          termine: 'L’écran d’accueil s’ouvre au lieu de l’année',
          testo:
            'Le dernier fichier est introuvable — une clé USB débranchée, un dossier pas encore ' +
            'téléchargé — ou il avait été fermé avec **Fermer l’année**. Rouvre-le depuis les ' +
            'récents ou avec **Ouvrir une année…**.',
        },
        {
          termine: 'Il manque les modifications de l’autre ordinateur',
          testo:
            'D’habitude, elles arrivent toutes seules quand la synchronisation est finie. Sinon, ' +
            '**Recharger** — dans Paramètres › Documents et impression › **Ce fichier**, ou ' +
            'avec `Ctrl+K` — relit le fichier depuis le disque.',
        },
        {
          termine: '« Le document existe, mais n’a pas pu être ouvert d’ici »',
          testo:
            'Le programme pour ce type de fichier manque, ou ne répond pas. Le registre essaie ' +
            'de le montrer dans son dossier ; un PDF se regarde aussi dans le cadre de la page ' +
            'Documents.',
        },
        {
          termine: 'Évaluations détachées',
          testo:
            'Les évaluations qu’aucune étape n’a fait naître sont listées en haut de la page ' +
            '**Évaluations**, avec le nombre de notes qu’elles emporteraient : on décide en les ' +
            'regardant, pas les yeux fermés.',
        },
        {
          termine: 'La lecture des scans ne démarre pas',
          testo:
            'Le bouton dit « Lecture désactivée » : il faut activer « Lecture des scans » dans ' +
            'Paramètres › Programme › **Modèles de langage**, avec le modèle choisi en haut, ' +
            'dans **Qui répond**, à la ligne « Lecture des scans ». Sinon, les pages ' +
            's’attribuent à la main — en les glissant, ou avec le clic droit.',
        },
        {
          termine: 'Le courrier ne part pas',
          testo:
            'Si la barre du bas dit « hors ligne », attends le réseau. Sinon, Paramètres › ' +
            '**Communications** a **Tester la connexion** et **Envoyer un test** : ils disent ' +
            'où ça bloque.',
        },
      ],
      note: [
        '**Réparer** est dans la ligne des avertissements au-dessus de la page ; **Réparer le ' +
          'registre** se trouve aussi avec `Ctrl+K`, et il est désactivé quand il n’y a rien ' +
          'à réparer.',
        'Corriger à la main les JSON dans le fichier est le moyen le plus sûr de casser les ' +
          'références. Si c’est vraiment nécessaire, fais-le sur une copie et avec le registre ' +
          'fermé.',
      ],
    },
  },
  en: {
    date: {
      titolo: 'Writing and reading dates',
      sommario:
        'Date fields are written as on a sheet of paper, not filled in box by box.',
      scritte: {
        nelCampo: 'The field held 01.09.2026, and you type:',
        dueCifre: 'two digits: the 2000s',
        annoDalCampo: 'the year comes from the field',
        meseEAnno: 'month and year from the field',
        diFila: 'digits in a row',
        nonEsiste: 'doesn’t exist: stays, in red',
        unGiorno: 'one day',
        unMese: 'one month',
        pagSu: 'PgUp',
        pagGiu: 'PgDn',
      },
      figure: [
        {
          didascalia:
            'On the left what you type, on the right what the register reads when you leave ' +
            'the field.',
          legenda: [
            'Whatever is missing is taken from the date the field held, or from today if it ' +
              'was empty.',
            'A day that doesn’t exist doesn’t slide to the next one: it is marked in red, and ' +
              'the form can’t be confirmed.',
            'Inside the field the arrows move the date without retyping it.',
          ],
        },
      ],
      voci: [
        {
          termine: 'What is accepted',
          testo:
            '`7.9.2026`, and instead of the full stop a slash, a hyphen, a space or a comma; ' +
            '`7.9.26` with two digits for the year; `0709`, `070926` and `07092026` typed in a ' +
            'row, as on a form; and `2026-09-07`.',
        },
        {
          termine: 'When a piece is missing',
          testo:
            '`7.9` takes the year of the date the field held, or of today if it was empty. ' +
            '`12` on its own takes the month too.',
        },
        {
          termine: 'Nudging it',
          tasti: '↑ / ↓ / PgUp / PgDn',
          testo:
            '**↑** moves forward a day and **↓** back, **PgUp** and **PgDn** a month. What you ' +
            'see changes at once; it is saved when you stop pressing.',
        },
        {
          termine: 'If it can’t be read',
          testo:
            'What was typed stays and is marked in red, instead of being deleted, and the form ' +
            'can’t be confirmed until it is right: “Date not readable. Write it as dd.mm.yyyy ' +
            '— for example 7.9.26.”',
        },
        {
          termine: 'Where there is a calendar',
          testo:
            '**From** and **To** of an absence period open the system calendar: the ends of a ' +
            'period are easier to find by looking, and dates outside the school year can’t be ' +
            'picked.',
        },
        {
          termine: 'How they are shown',
          testo:
            'Usually `07.09.2026`; in headings in full, “Monday 7 September 2026”. The week ' +
            'starts on Monday, and the number next to each week in the calendar is the ISO ' +
            'week number.',
        },
        {
          termine: 'In file names',
          testo:
            'Year, month and day in a row, without full stops: `260907`, and the time as ' +
            '`08.20`. It is the only form that puts files in date order when the folder sorts ' +
            'them by name.',
        },
      ],
      note: [
        'Inside, every date is `2026-09-07`: how you typed it doesn’t matter, and whatever ' +
          'saves it always gets the same form. It is also why the field doesn’t depend on the ' +
          'computer’s language, as the system’s date fields do.',
        'Two digits for the year always mean the 2000s: `7.9.98` is 2098. And **PgUp** from ' +
          '31 January goes to the last day of February, not to 3 March.',
      ],
    },
    dati: {
      titolo: 'Where the data lives',
      sommario:
        'One file per school year, wherever you like. No database, no online services.',
      scritte: {
        manifesto: 'which file, which version',
        registro: 'year, subjects, settings',
        collezioni: 'people, lessons, grades, plans',
        archivio: 'PDFs gathered and printed',
        storico: 'the earlier copies',
        serratura: 'there while it’s open',
        cartellaAccanto: 'drafts, earlier versions',
        impostazioni: 'the program settings',
        documenti: 'recent and favourites',
        anniNuovi: 'years not saved yet',
        materializzati: 'copies of the open PDFs',
        cartellaTua: 'The folder you choose',
        zip: 'a ZIP archive',
        questoComputer: 'This computer',
        portachiavi: 'system keychain',
        password: 'the mail password',
      },
      figure: [
        {
          didascalia:
            'On the left what travels with the year, on the right what stays on the computer ' +
            'you use it on.',
          legenda: [
            'The year, the subjects and the settings of the sections marked **file**: they ' +
              'travel with the file.',
            'The archived scans, the attachments and the printed reports are inside the file, ' +
              'not next to it.',
            'The earlier versions of each collection: see “Copies and deletions”.',
            'Next to the file while the register has it open: it says on which computer.',
            'The only real folder next to the file, with its name: the drafts the email ' +
              'program opens, and in `versioni-precedenti/` the copy of a year brought up to ' +
              'today’s format.',
            'In `%APPDATA%\\Regiclass` — in the portable version, in `Regiclass - dati` next to ' +
              'the program. It doesn’t travel with the year. The one from earlier versions, ' +
              '`%APPDATA%\\Registro docenti`, moves here by itself on the first start.',
          ],
        },
      ],
      voci: [
        {
          termine: 'One year, one file',
          testo:
            '`2026-2027.regi` holds the whole year: classes and people, courses, lessons, ' +
            'plans, assessments, class files, assignments, sortings, and the PDFs too. It opens ' +
            'with a double click; moving or copying the file means moving or copying the year.',
        },
        {
          termine: 'You choose the name and the place',
          testo:
            'The Desktop, a USB stick, a synced folder: the register opens the file you give ' +
            'it, and keeps no list of its own to fetch it from.',
        },
        {
          termine: 'Opening a PDF from the year',
          testo:
            'The register extracts a copy into a folder of its own and opens it with the ' +
            'system’s program. The copies are thrown away when the register closes.',
        },
        {
          termine: 'Two kinds of settings',
          testo:
            'The settings sections marked **file** — year, calendar and ICS calendars, ' +
            'assessment, subjects, lists, letterhead — live in the file and go with it to ' +
            'whoever receives it. The others belong to the program, and stay on the computer.',
        },
        {
          termine: 'The mail password',
          testo:
            'It is kept in the system keychain, never in a file: it ends up neither in the ' +
            'year nor in synced folders.',
        },
        {
          termine: 'Finding the file',
          testo:
            '**Open the file’s folder**, in the **File** menu, opens the folder it is in. The ' +
            'full path is also in Settings › Documents and printing › **This file**.',
        },
        {
          termine: 'Looking inside without the register',
          testo:
            'It is a ZIP archive with JSON files inside: a copy renamed to `.zip` opens on any ' +
            'computer, even one without the register.',
        },
      ],
      note: [
        'A PDF opened by the register is a copy: annotating it in another program doesn’t ' +
          'change the one inside the year, and the copy disappears when the register closes.',
        'To hand the year over to whoever takes over, or to keep it safe: **Close the year**, ' +
          'then copy the file. Closed, it is fully written and nobody is using it.',
      ],
    },
    salvataggio: {
      titolo: 'Saving',
      sommario:
        'Every change reaches the disk by itself, within two seconds. `Ctrl+S` isn’t needed, ' +
        'but it is there.',
      scritte: {
        modifica: 'Change',
        unClic: 'a click, a text',
        attesa: 'Wait',
        tempi: '0.35 s – 2 s',
        copia: 'Copy',
        inStorico: 'in .storico/',
        scrittura: 'Writing',
        inCoda: 'at the file’s end',
        salvato: 'Saved',
        sulDisco: 'on disk',
        riprova: 'retries by itself',
        nonRiesce: 'Fails',
        discoCheManca: 'disk missing',
        saltaAttesa: 'skips the wait: “All saved.”',
        uscendo: 'On quitting, the register waits for the last write and releases the file.',
      },
      figure: [
        {
          didascalia:
            'A change goes from memory to the file in a few moments, and before rewriting, ' +
            'the previous state is set aside.',
          legenda: [
            'Writing happens a third of a second after the last change, and never more than ' +
              'two seconds after the first: a sentence typed in one go is a single write.',
            'Only what has changed is added at the end of the file; the index is written last, ' +
              'and until it is there the previous one holds.',
            'The changes stay in memory and the register retries, waiting from one second up ' +
              'to a minute between one attempt and the next.',
          ],
        },
      ],
      voci: [
        {
          termine: 'It saves by itself',
          testo:
            'A click in the attendance, a field you leave, a PDF archived: everything is ' +
            'written by itself. There is no “Save” to remember before closing.',
        },
        {
          termine: 'Save',
          tasti: 'Ctrl+S',
          testo:
            'Writes at once whatever is waiting and replies “All saved.”. On a new year not ' +
            'saved yet it asks for a name and a place.',
        },
        {
          termine: 'Looking doesn’t write',
          testo:
            'A year opened just to look something up doesn’t touch the file: on a synced ' +
            'folder there is nothing to upload.',
        },
        {
          termine: 'If the disk doesn’t respond',
          testo:
            '“Saving the year failed: …” appears. What you have done stays in memory and the ' +
            'register retries by itself: just put the USB stick back in or wait for OneDrive ' +
            'to let go of the file.',
        },
        {
          termine: 'Quitting',
          testo:
            'The register stops reading scans, finishes the reports it is writing, saves one ' +
            'last time and removes the lock. Then it goes.',
        },
      ],
      note: [
        'Appending at the end leaves old versions behind. When they take up more than a third ' +
          'of the file, the register rewrites it from scratch in a temporary file and then ' +
          'renames it: either way, if the power goes halfway through, the last good file ' +
          'remains.',
        'As long as saving fails, don’t quit: on quitting the register tries one last time, ' +
          'and if the disk is still missing, whatever was in memory is lost.',
      ],
    },
    aprire: {
      titolo: 'Opening, closing, changing computer',
      sommario:
        'One year open at a time, and a lock that warns you if the same file is open ' +
        'elsewhere.',
      scritte: {
        cartellaSincronizzata: 'synced folder',
        serratura: 'lock: school PC',
        pcScuola: 'School PC',
        annoAperto: 'year open',
        pcCasa: 'Home PC',
        loVuoleAprire: 'wants to open it',
        giaAperto: 'The year is already open on…',
        apriLoStesso: 'Open anyway',
        rilegge: 'Rereads by itself',
        quelCheLAltro: 'what the other one saved',
      },
      figure: [
        {
          didascalia:
            'The same file seen from two computers. The lock blocks nothing: it asks the ' +
            'question before two registers write over each other. It is best if the two ' +
            'registers are the same version: a year the newer one has brought up to today’s ' +
            'format, the older one can no longer open.',
          legenda: [
            'While the year is open, next to the file there is a lock with the name of the ' +
              'computer and of whoever is using it.',
            'Whoever opens it elsewhere is warned first. **Open anyway** is the right answer ' +
              'only if the other register is closed, or closed badly.',
            'When the file changes on disk — the other computer saved it — the register ' +
              'rereads it by itself.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Open a year…',
          tasti: 'Ctrl+O',
          testo:
            'Chooses a `.regi` file with the system dialog. A double click on the file ' +
            'does the same, even with the register already running: no second copy starts, ' +
            'the one that is running changes year.',
        },
        {
          termine: 'One year at a time',
          testo:
            'Opening another one saves and closes the previous one. On start-up the last year ' +
            'open is reopened; if the file is no longer there, the welcome screen appears.',
        },
        {
          termine: 'A year from an older register',
          testo:
            'It opens anyway: the register brings it up to today’s form. First it sets aside ' +
            'a copy as it was, in the folder next to the file that bears its name — ' +
            '`2026-2027/versioni-precedenti/` —, then it rewrites it and says so, with where ' +
            'the copy is. If the copy can’t be made, the file isn’t rewritten on opening, and ' +
            'you are told all the same.',
        },
        {
          termine: 'A year from a newer register',
          testo:
            'It doesn’t open, on purpose: it may contain things this register can’t read, and ' +
            'they would be lost at the first write. A window shows the two versions and ' +
            'offers **Download the new version** or **Open another year…**.',
        },
        {
          termine: 'Recent and favourites',
          testo:
            'In the **File** menu, in the year menu at the bottom right of the status bar and ' +
            'on the welcome screen: the twelve most recent, plus the starred ones, which never ' +
            'expire. In the two menus a right click on a row opens **Add to favourites** or ' +
            '**Remove from favourites**, and **Remove from list**; on the welcome screen the ' +
            'star and the cross do it. Removing the row doesn’t touch the file. A deleted or ' +
            'moved file leaves the list by itself; “not available” means that right now not ' +
            'even its folder responds — a USB stick unplugged, no network — and the row stays ' +
            'until it comes back.',
        },
        {
          termine: 'A new year',
          testo:
            '**New school year** opens it straight away, with the subjects and settings of ' +
            'the open year, in a temporary folder: the title says “(unsaved)”. `Ctrl+S` ' +
            'chooses the name and the place.',
        },
        {
          termine: 'Import from another register…',
          testo:
            'In the **File** menu, and as a tick box in the new-year form: from another ' +
            '`.regi` — from the recent ones, or with **Browse…** — you bring into the open ' +
            'one whatever still applies, one tick box per block with how much there is next ' +
            'to it. **Document settings**: scale, rounding, absence threshold, the school ' +
            'day — the period, the breaks, the days —, drop-down lists, letterhead with logo ' +
            'and signature, not the dates of the year; if a lesson here already has its ' +
            'attendance taken, the length of the period stays as it is here. **Subjects**, ' +
            'matched by name. **The classes ticked below**, one tick box per class, with ' +
            '**Personal details and photos** and **Courses with timetable** — the timetable ' +
            'keeps its periods —; a class that already exists here with the same name is ' +
            'skipped. **Lesson plans** and **ICS calendars and rules**, unticked to start ' +
            'with. Lessons, attendance and grades stay over there, and the other register is ' +
            'only read.',
        },
        {
          termine: 'A new year never saved',
          testo:
            'When you close it, the register asks: **Save as…** or **Throw the year away**. When ' +
            'you quit the program, on the other hand, it keeps it and reopens it at the next ' +
            'start-up.',
        },
        {
          termine: 'Close the year',
          testo:
            'In the **File** menu: the last save, the file released, and the welcome screen in ' +
            'its place. At the next start-up it doesn’t reopen by itself, but it stays among ' +
            'the recent ones.',
        },
        {
          termine: 'Synced folders',
          testo:
            'OneDrive and the like are fine: the register writes only what changes, and when ' +
            'the file arrives changed from another computer it rereads it. **Reload**, in ' +
            'Settings › Documents and printing › **This file** or with `Ctrl+K`, rereads it on ' +
            'demand.',
        },
      ],
      note: [
        'To move from one computer to the other: **Close the year** on the first, wait for ' +
          'the synced folder to finish uploading, and open it on the second.',
        'Two registers open at the same time on the same year don’t merge: whoever saves last ' +
          'overwrites the other’s work.',
        'A lock left by the same computer and the same user — a register closed badly — ' +
          'stops nobody: it is the register itself coming back.',
      ],
    },
    copie: {
      titolo: 'Copies and deletions',
      sommario:
        'The file keeps the earlier versions by itself; `Ctrl+Z` steps back through what you ' +
        'are doing now. Before deleting, the register says what goes.',
      scritte: {
        unaPerSettimana: 'one a week',
        unaAlGiorno: 'one a day, 30 days',
        ultime: 'last 10',
        settembre: 'September',
        unMeseFa: 'a month ago',
        adesso: 'now',
      },
      figure: [
        {
          didascalia:
            'The copies of a collection that stay inside the file: dense close to now, sparser ' +
            'going back.',
          legenda: [
            'The last ten writes: the “how it was five minutes ago”.',
            'Then the most recent of each of the last thirty days.',
            'Beyond that, one a week. In all, no more than sixty copies per collection.',
            'The name gives collection, day and time — in universal time (UTC), that is one or ' +
              'two hours behind Swiss time.',
          ],
        },
      ],
      voci: [
        {
          termine: 'What is set aside',
          testo:
            'Before a collection is rewritten — the classes, the lessons, the assessments… — ' +
            'the previous version goes into `.storico/`, inside the same file. It follows the ' +
            'year wherever you take it.',
        },
        {
          termine: 'How to look at them',
          testo:
            'There is no button to go back to them. You copy the file, rename it to `.zip`, ' +
            'and in `.storico/` there are the JSON files of how it was, one per moment.',
        },
        {
          termine: 'Undo has a limit',
          testo:
            'Every change is written at once. `Ctrl+Z` and the ↶ ↷ arrows in the title bar ' +
            'step back one action at a time while the year stays open; once closed or ' +
            'reopened, the history starts afresh. Some actions can’t be undone — `Ctrl+Z` ' +
            'straight after says so — and that is why things that can’t be redone ask for ' +
            'confirmation first.',
        },
        {
          termine: 'Before deleting',
          testo:
            'The question “Delete …?” lists in full what disappears with it (“This also goes”) ' +
            'and what stays detached. A class with twelve lessons and sixty grades says so ' +
            'before, not after.',
        },
        {
          termine: 'Instead of deleting',
          testo:
            'The same question offers the way that loses nothing, where there is one: ' +
            'archiving the class, merging the subject into another.',
        },
        {
          termine: 'A report thrown away',
          testo:
            'What the register prints can be remade from the data: on the Documents page with ' +
            '**Update everything**, or with the button next to the sheet.',
        },
      ],
      note: [
        'The copies are in the same file: if you lose the file, you lose them too. A real ' +
          'backup is the whole file on another disk, made with the year closed.',
      ],
    },
    guai: {
      titolo: 'If something doesn’t add up',
      sommario:
        'What the register means when it reports a problem, and what to do.',
      scritte: {
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        nonTornano: '2 references don’t match: the course …',
        ripara: 'Repair',
      },
      figure: [
        {
          didascalia:
            'When a link between the things in the register breaks, a bar at the top of the ' +
            'page says so, whatever the page.',
          legenda: [
            'How many references don’t match, and the first one: a course that has lost its ' +
              'subject, a plan that no longer exists.',
            '**Repair** is there only if the fix loses nothing, and before making it, it lists ' +
              'what will change.',
            '**Details** opens the settings: the full list is in Documents and printing › ' +
              '**This file**.',
          ],
        },
      ],
      voci: [
        {
          termine: '“Is already open on…”',
          testo:
            'Next to the file there is the lock of another computer or another user. If the ' +
            'other register is running, close the year there; if it closed badly — a laptop ' +
            'switched off suddenly — **Open anyway**.',
        },
        {
          termine: '“… comes from a newer register”',
          testo:
            'A colleague or another computer has a newer register. The year doesn’t open, on ' +
            'purpose: it may contain things this one can’t read, and the file stays as it is. ' +
            'The window shows the two versions, the file’s and the one this register goes up ' +
            'to; **Download the new version**, update and reopen it, or **Open another year…**.',
        },
        {
          termine: '“Not a register document” or “won’t open”',
          testo:
            'The file is damaged or arrived only half-way through a sync. The register doesn’t ' +
            'write over it: wait for the sync to finish, or get a complete copy back.',
        },
        {
          termine: '“… is not valid JSON”',
          testo:
            'A collection can’t be read, usually after a change made by hand. The year opens ' +
            'anyway with that part empty; at the first change the broken version stays in the ' +
            'file as `….rotto-<data>.json`, it isn’t overwritten.',
        },
        {
          termine: '“Saving the year failed”',
          testo:
            'Disk full, USB stick removed, file locked by the sync. The work stays in memory and ' +
            'the register retries by itself: give it the disk back and don’t quit before then.',
        },
        {
          termine: 'The welcome screen opens instead of the year',
          testo:
            'The last file can’t be found — a USB stick unplugged, a folder not downloaded ' +
            'yet — or it had been closed with **Close the year**. Reopen it from the recent ' +
            'ones or with **Open a year…**.',
        },
        {
          termine: 'The other computer’s changes are missing',
          testo:
            'They usually arrive by themselves when the sync has finished. If not, **Reload** — ' +
            'in Settings › Documents and printing › **This file**, or with `Ctrl+K` — rereads ' +
            'the file from disk.',
        },
        {
          termine: '“The document is there, but couldn’t be opened from here”',
          testo:
            'The program for that type of file is missing, or doesn’t respond. The register ' +
            'tries to show it in its folder; a PDF can also be viewed in the frame on the ' +
            'Documents page.',
        },
        {
          termine: 'Unlinked assessments',
          testo:
            'Assessments that no step created are listed at the top of the **Assessments** ' +
            'page, with how many grades they would take with them: you decide by looking at ' +
            'them, not blindly.',
        },
        {
          termine: 'Scan reading won’t start',
          testo:
            'The button says “Reading off”: “Reading scans” needs to be switched on in ' +
            'Settings › Program › **Language models**, with the model chosen at the top, in ' +
            '**Who answers**, on the “Reading scans” row. Without it, pages are assigned by ' +
            'hand — by dragging, or with the right mouse button.',
        },
        {
          termine: 'Mail doesn’t go out',
          testo:
            'If the bar at the bottom says “offline”, wait for the network. Otherwise Settings › ' +
            '**Communications** has **Test the connection** and **Send a test**: they say where it ' +
            'gets stuck.',
        },
      ],
      note: [
        '**Repair** is in the warnings row above the page; **Repair the register** can also ' +
          'be found with `Ctrl+K`, and it is greyed out when there is nothing to repair.',
        'Correcting the JSON files inside the file by hand is the surest way to break the ' +
          'references. If you really must, do it on a copy and with the register closed.',
      ],
    },
  },
})
