// I testi della guida, parte del Docente di classe. Una chiave per sezione
// (`TestiSezione`, testa di `types.ts`); struttura in `classTeacher.ts`.

import { catalogo } from '../../../i18n/index.js'
import { CARTE, Molti, PERSONE, PIF, Uno, del, il } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { testi as pendenze } from '../../../domain/todo.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const TIPOLOGIE_DE = pendenze.in('de').nomi
const TIPOLOGIE_FR = pendenze.in('fr').nomi
const TIPOLOGIE_EN = pendenze.in('en').nomi

const it = {
  docente: {
    titolo: 'Docente di classe',
    sommario:
      'Il secondo mestiere, una classe alla volta: che cosa resta aperto, i documenti da ' +
      'riscuotere, le assenze da far firmare, le comunicazioni.',
    scritte: {
      pendenzeClasse: `${Molti(CARTE.pendenza)} della classe`,
      archivio: 'Archivio documentale',
      assenze: 'Assenze',
      messaggistica: 'Messaggistica',
      classe: 'Classe: 3A',
      periodo: 'Periodo: 1° sem.',
      nuovaPendenza: 'Nuova pendenza',
      daFirmare: 'Assenze da far firmare',
      oltreSoglia: 'Assenze oltre la soglia',
      momenti: 'Consegna la classe',
      consegnaClasse: 'Svolge la classe',
      inRitardo: '2 in ritardo',
      altre: '…e le altre tipologie, solo quando non sono vuote',
    },
    figure: [
      {
        didascalia:
          `La pagina **${Molti(CARTE.pendenza)} della classe**: tutto quel che resta aperto in ` +
          'quella classe, in tutte le materie, una tipologia per riga.',
        legenda: [
          'Il gruppo **Docente di classe** nella barra laterale: quattro pagine per la ' +
            'classe scelta.',
          'La tendina **Classe** dice di quale fascicolo si parla; **Periodo** restringe ' +
            'matrici, periodi e comunicazioni al semestre.',
          '**Nuova pendenza**, nella riga delle azioni.',
          'Una riga per tipologia, con il conto di quel che è aperto.',
          '«N in ritardo», l’unica cosa colorata nella testata di una tipologia: quel che ' +
            'preme adesso.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Accenderlo',
        testo:
          'In **Classi**, nei **Dettagli** della classe, la spunta «Sono docente di classe». Il ' +
          'gruppo nella barra laterale compare con la prima classe spuntata e sparisce con ' +
          'l’ultima.',
      },
      {
        termine: 'Le quattro tipologie',
        testo:
          'Assenze da far firmare, assenze oltre la soglia e le consegne che la classe o i ' +
          'singoli allievi devono consegnare o svolgere. Le consegne stanno in mucchi per ' +
          'scadenza: rimaste indietro, oggi, entro la settimana, più avanti. Valutazioni e ' +
          'lavori propri del docente non compaiono qui.',
      },
      {
        termine: 'Nuova pendenza',
        testo:
          'Apre il modulo di una consegna dovuta dalla classe o dagli allievi. Il corso si ' +
          'sceglie nel modulo. Senza corsi nella classe il comando è spento: ogni consegna ' +
          'appartiene a un corso.',
      },
      {
        termine: 'Che cosa è «in ritardo»',
        testo:
          'Una consegna dovuta dalla classe con la scadenza passata, una richiesta di firma ' +
          'ancora da spedire o un caso oltre la soglia con gli appelli completi.',
      },
      {
        termine: 'Elenco della classe',
        testo:
          'Nella riga delle azioni di tutte e quattro le pagine: porta in **Classi**, su questa ' +
          'classe, dove si aggiungono e si tolgono le persone.',
      },
      {
        termine: 'Il fascicolo in PDF',
        testo:
          `${Molti(PIF)} con i recapiti, documenti raccolti, periodi di assenze: il PDF da ` +
          'lasciare a chi subentra. Si fa da **Documenti**, riquadro «Della classe», con un ' +
          'corso di quella classe scelto.',
      },
      {
        termine: 'Nella scheda di una persona',
        testo:
          'La linguetta **Docente di classe** c’è solo su queste classi: i documenti chiesti a ' +
          'lei e le sue assenze da far firmare, periodo per periodo.',
      },
    ],
    note: [
      `La pagina **${Molti(CARTE.pendenza)}** del corso è separata e mostra il corso scelto. ` +
        'Quando una consegna dovuta dalla classe viene chiusa, si aggiorna anche questa vista.',
    ],
  },
  archivio: {
    titolo: 'Archivio documentale',
    sommario:
      `Che cosa si è chiesto e chi l’ha portato: ${PIF.plurale} in riga, documenti in colonna.`,
    scritte: {
      richieste: 'richieste 3',
      fogliRaccolti: 'fogli raccolti 12',
      inAttesa: 'in attesa 5',
      scadute: 'scadute 1',
      daDividere: 'Da dividere',
      pdf: 'pagelle.pdf · 24 pagine',
      persona: 'Persona',
      pagella: 'Pagella',
      certificato: 'Certif.',
      circolare: 'Circol.',
      suoi: 'Suoi',
      firme: 'Firme cons.',
      nome: 'Rossi Maria',
      conto: '3 di 12',
    },
    figure: [
      {
        didascalia:
          'Per colonna si vede a che punto è la classe, per riga a che punto è una persona. ' +
          'La cornice a destra compare solo con un foglio aperto.',
        legenda: [
          'I conti: richieste, personali, fogli raccolti, in attesa, e le scadute quando ce ne ' +
            'sono.',
          'I PDF ancora da dividere: un clic ne apre le pagine nella cornice.',
          'La testata di una colonna: «fatte/destinatari» e la scadenza. Un clic apre la consegna.',
          'La riga **Firme di consegna**: una casella per ogni richiesta che le chiede.',
          'Una casella: il gesto, il file e il cestino.',
          '**Suoi**: quante richieste la persona ha chiuso su quelle che la riguardano.',
          'Il foglio aperto, con le frecce per il prossimo, «3 di 12», apri fuori e cestino.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Chiedi un documento',
        testo:
          'Apre il modulo di una consegna che si spunta consegnando un documento, per tutta la ' +
          'classe: si dice **Che documento** è e **Chi lo porta** — «Me lo consegnano» o «Lo ' +
          'consegno io». Ne nasce una colonna. Senza un corso nella classe il comando è spento.',
      },
      {
        termine: 'Documento personale',
        testo:
          'Una raccolta «A me»: la circolare, il modulo da tenere pronto. Non è una colonna: sta ' +
          'sopra la matrice, in **Documenti personali**, «atteso» o «raccolto». Un clic sul nome ' +
          'sceglie il file; una volta raccolto si può allegare a una comunicazione.',
      },
      {
        termine: 'La casella',
        testo:
          'A sinistra il gesto — l’ha portato, o gliel’hai dato —, che diventa un avviso quando ' +
          'la scadenza è passata. Al centro il file: se manca si allega dal disco, se c’è si ' +
          'guarda. A destra il cestino. Chi non era fra i destinatari ha un «+» che lo aggiunge.',
      },
      {
        termine: 'Consegnare per e-mail',
        testo:
          'Con «Lo consegno io» e **Come lo consegno** «Per e-mail, uno a uno», in testa alla ' +
          'colonna compare **Prepara invio (N)**: un messaggio a testa con il suo documento in ' +
          'allegato, per chi non l’ha ancora ricevuto.',
      },
      {
        termine: 'Firme di consegna',
        testo:
          'Spuntando nel modulo «Serve il foglio delle firme di consegna», la riga in cima ' +
          'prende una casella sotto quella colonna: un foglio solo per tutta la richiesta, la ' +
          'prova di averlo distribuito. Prende anche le pagine trascinate da un PDF.',
      },
      {
        termine: 'Guardare un foglio',
        testo:
          'Una casella piena apre il documento nella cornice accanto, e le frecce passano al ' +
          'foglio dopo nell’ordine della matrice: venti scansioni si controllano di seguito. Se ' +
          'il file non c’è più, la cornice lo dice invece di mostrare un vuoto.',
      },
    ],
    note: [
      'Due fatti, due pulsanti: il gesto e il file non coincidono. Si spunta stamattina e ' +
        'si scansiona stasera; la pagella pronta da tre giorni si dà lunedì.',
      'Il cestino della cornice toglie il file e riporta indietro la spunta. Il file esce ' +
        'dal documento dell’anno (non va nel cestino del sistema), e spesso è l’unica copia ' +
        'che esiste.',
    ],
  },
  archivioPdf: {
    titolo: 'Dividere un PDF di classe',
    sommario:
      'La segreteria manda un file solo per tutta la classe: le pagine si posano sulla ' +
      'casella di chi sono, e il registro le ritaglia e le archivia.',
    scritte: {
      pdf: 'PDF di classe',
      trascinato: 'trascinato o caricato',
      pagine: 'Pagine',
      testoOScansione: 'testo o scansione',
      proposta: 'Proposta',
      nomeLetto: 'il nome letto',
      casella: 'Casella',
      personaDocumento: 'persona × documento',
      aMano: 'trascinate a mano',
      conferma: 'Conferma N proposte',
      sottoOgni: 'Sotto ogni pagina, una pastiglia sola:',
      nome: 'Rossi Maria',
      daLeggere: 'da leggere',
      nessunNome: 'nessun nome',
      inCoda: 'in coda',
      archiviata: 'Rossi Maria ✓',
    },
    figure: [
      {
        didascalia:
          'Il registro propone, chi guarda decide: niente viene archiviato prima di un gesto, ' +
          'che sia un trascinamento o una conferma.',
        legenda: [
          'Il file entra senza domande: di chi sia lo si dice dopo.',
          'Le pagine con testo si leggono subito; le scansioni mute aspettano la lettura ' +
            'automatica.',
          'Il nome riconosciuto diventa una proposta, scritta sotto la pagina.',
          'La casella che incrocia persona e documento: una casella piena non si sovrascrive.',
          'Il nome proposto: con la lente se l’ha letto la lettura automatica, col foglio se era ' +
            'nel testo del PDF.',
          '**da leggere** è una scansione muta; **nessun nome**, una pagina letta senza nessuno ' +
            'della classe.',
          'Spunta verde: già archiviata per quella persona.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Far entrare i PDF',
        testo:
          'Si trascinano sulla pagina — tutta la pagina è la cassetta — oppure **Carica dei ' +
          'PDF**. Solo PDF. Il primo che entra si apre da sé, a pagine, pronto da dividere.',
      },
      {
        termine: 'Da dividere',
        testo:
          'I PDF con pagine senza padrone stanno in una riga sopra la matrice. Il pulsante ' +
          '**Pagine** / **Leggi** passa dalle miniature al lettore di PDF, per quando bisogna ' +
          'proprio leggere; il cursore in alto ingrandisce le miniature.',
      },
      {
        termine: 'Scegliere le pagine',
        testo:
          'Un clic sceglie una pagina, **Ctrl** ne aggiunge, **Maiusc** prende un tratto. Con ' +
          'pagine scelte compaiono il cestino — per la copertina dello scanner, un foglio bianco ' +
          '— e **Lascia**, che le lascia andare.',
      },
      {
        termine: 'Trascinarle',
        testo:
          'Sulla casella che incrocia la persona con il documento: tutta la casella è ' +
          'bersaglio, e mentre si trascina si accendono. Se il PDF sa già a quale documento ' +
          'appartiene basta la **riga** della persona. Esc annulla; lasciate fuori, il registro ' +
          'lo dice.',
      },
      {
        termine: 'Conferma N proposte',
        testo:
          'Compare quando il PDF è agganciato a una richiesta: archivia in un gesto tutte le ' +
          'pagine di cui il registro ha già letto il nome.',
      },
      {
        termine: 'Controllare una proposta',
        testo:
          'Sulla pagina un rettangolo segna dove il nome è stato letto, con il nome accanto: ' +
          '**pieno** quando sta nel testo del PDF, **tratteggiato** quando l’ha letto la lettura ' +
          'automatica, che sa la striscia e non il punto. Fermandosi sulla pagina si leggono ' +
          'le sue prime parole.',
      },
      {
        termine: 'Il tasto destro su una pagina',
        testo:
          '**Assegna a…** chiede persona e documento e archivia: è la via quando il nome non si ' +
          'legge, o quando un file tiene due pratiche diverse. Poi **Rileggi la scansione**, ' +
          '**Apri nel lettore**, **Butta via**.',
      },
      {
        termine: 'Leggere e rileggere',
        testo:
          'In testa alla cornice **Leggi le scansioni (N)** mette in coda le pagine mute, ' +
          '**Rileggi** — «Rileggi le N pagine» quando non ne resta nessuna da leggere — rifà da ' +
          'capo tutte quelle ancora da smistare; fra i comandi della pagina ' +
          '**Rileggi le scansioni** fa lo stesso su tutti i PDF della classe. **Ferma** svuota ' +
          'la coda. Con la lettura spenta il pulsante dice **Lettura spenta** e porta alle ' +
          'Impostazioni.',
      },
      {
        termine: 'Le pagine archiviate',
        testo:
          'Spariscono dalla fila. **Archiviate (N)** le rimette in vista con il nome di chi le ' +
          'ha prese; tasto destro, **Riprendila**, e il documento esce dal fascicolo e la ' +
          'pagina torna da smistare.',
      },
      {
        termine: 'Sposta in…',
        testo:
          'La tendina in testa alla cornice manda a un’altra classe le pagine che restano: per ' +
          'la scansione che attraversa due classi.',
      },
    ],
    note: [
      'Il file entra nel documento dell’anno e l’originale su disco resta dov’era. Il PDF ' +
        'intero resta dentro finché ne rimane una pagina da decidere.',
      'Una casella già piena rifiuta le pagine e lo dice: per metterne altre, prima si ' +
        'toglie il documento che c’è.',
      'La lettura automatica gira su questo computer e costa decine di secondi per pagina: ' +
        'la si lancia, e intanto si smistano le pagine che il nome ce l’hanno già.',
    ],
  },
  assenze: {
    titolo: 'Assenze da far firmare',
    sommario:
      'Tre volte l’anno: i fogli della scuola partono, l’e-mail chiede la firma all’azienda, i ' +
      'fogli tornano firmati.',
    scritte: {
      partono: 'i fogli che partono',
      richiesta: 'la richiesta',
      tornano: 'i fogli che tornano',
      persona: 'Persona',
      assenze: 'ass.',
      ritardi: 'rit.',
      mail: 'mail',
      assenzeFirmate: 'ass. ✓',
      ritardiFirmati: 'rit. ✓',
      daSpedire: 'da spedire',
      senzaDatore: 'senza datore',
      faseDaSpedire: 'Da spedire',
      fogliCaricati: 'fogli caricati',
      faseInAttesa: 'In attesa',
      emailPartita: 'e-mail partita',
      faseFirmato: 'Firmato',
      firmeTornate: 'firme tornate',
    },
    figure: [
      {
        didascalia:
          'Un periodo per volta: una riga per persona, cinque caselle, e sotto le tre fasi che ' +
          'la colonna **Stato** riassume.',
        legenda: [
          '**ass.** e **rit.**: i fogli di assenze e ritardi da spedire. Il «+» ne carica uno.',
          '**mail**: la busta prepara la richiesta, il visto accanto la segna spedita.',
          '**ass. ✓** e **rit. ✓**: i fogli firmati. Tratteggiate finché si aspettano.',
          '**Stato**: da spedire, in attesa, firmato. Chi non ha fogli ha la riga spenta.',
          `«senza datore»: nella scheda manca l’e-mail ${del(PERSONE.datore)}, che deve firmare.`,
        ],
      },
    ],
    voci: [
      {
        termine: 'Nuovo periodo',
        testo:
          'Nella riga delle azioni. Il periodo *sono* le sue due date, scelte dal calendario e ' +
          'proposte sul semestre di oggi: il nome lo ricava il registro dal semestre, e le date ' +
          'finiscono nel nome dei fogli archiviati e nella lettera.',
      },
      {
        termine: 'La lettera all’azienda',
        testo:
          'Oggetto e testo si scrivono una volta per periodo; i segnaposto fra graffe — ' +
          '`{allievo}`, `{azienda}`, `{periodo}`, `{rapporti}`… — si riempiono persona per ' +
          `persona. Parte un’e-mail per persona, in chiaro all’indirizzo ${del(PERSONE.datore)}, ` +
          'con i suoi soli fogli.',
      },
      {
        termine: 'Anche a',
        testo:
          `Nel modulo del periodo: ${il(PIF)}, ${il(PERSONE.rappresentante)} e i recapiti fissi ` +
          'della classe. Quelli segnati «In copia a ogni comunicazione nuova» sono già spuntati.',
      },
      {
        termine: 'Far entrare i fogli',
        testo:
          '**Carica dei PDF** o il trascinamento, come nell’archivio: le pagine si posano sulla ' +
          'casella, ed è la casella a dire che foglio sono. **Importa fogli** chiede che fogli ' +
          'sono, poi prende più file insieme e assegna ciascuno dal nome che porta.',
      },
      {
        termine: 'Spedire',
        testo:
          '**Prepara invio (N)** prepara le richieste di tutto il periodo; N conta chi ha un ' +
          'indirizzo, e chi non ce l’ha resta indietro come non partito. La busta di una casella ' +
          '**mail** fa lo stesso per una persona sola, il visto accanto la segna spedita.',
      },
      {
        termine: 'Una richiesta non partita',
        testo:
          'La casella **mail** mostra l’avviso, e passandoci sopra si legge il motivo — quasi ' +
          'sempre un indirizzo da correggere nella scheda. Nell’elenco dei periodi compare ' +
          '«N non partite».',
      },
      {
        termine: 'Guardare un rapporto',
        testo:
          'Una casella piena apre il foglio nella cornice accanto: prima di mandarli all’azienda ' +
          'vanno guardati, e le frecce passano al successivo senza aprire venti finestre.',
      },
      {
        termine: 'Ogni periodo in sintesi',
        testo:
          'Nell’elenco: «12/18 firmati · 15 spediti», «completo», e la matita per cambiarlo o ' +
          'eliminarlo. Sopra la matrice i conti del periodo aperto: con assenze, spediti, firmati.',
      },
      {
        termine: 'Fra le pendenze',
        testo:
          'Ogni richiesta aperta sta anche nelle pendenze, in «Da spedire» o «In attesa della ' +
          'firma», con **Prepara l’e-mail** e i pulsanti per caricare i fogli firmati. Il nome ' +
          'riporta al periodo giusto.',
      },
    ],
    note: [
      'Firmato vuol dire che per ogni foglio partito ne è tornato uno firmato: chi ha ' +
        'spedito assenze e ritardi e riceve indietro solo le assenze resta «in attesa».',
      'Un segnaposto scritto male resta nella lettera com’è, fra graffe: si vede nella bozza ' +
        'prima di spedire, invece di diventare un buco.',
      'Eliminare un periodo toglie dal documento dell’anno anche tutti i suoi fogli, ' +
        'vergini e firmati (non vanno nel cestino del sistema).',
    ],
  },
  assenzeSoglia: {
    titolo: 'Assenze oltre la soglia',
    sommario:
      'Chi ha perso più ore di quelle che la scuola ammette compare da sé fra le pendenze, ' +
      'corso per corso.',
    scritte: {
      assenza: 'Assenza nel corso',
      conto: 'UD perse ÷ UD previste',
      oltre: 'Oltre la soglia?',
      impostazioni: 'in Impostazioni',
      daSegnalare: 'Da segnalare',
      completi: 'appelli completi',
      daGuardare: 'Da guardare',
      incompleti: 'appelli incompleti',
      sotto: 'sotto la soglia:',
      sparisce: 'la riga sparisce da sé',
    },
    figure: [
      {
        didascalia:
          'Una segnalazione è un conto, non uno stato: si rifà a ogni apertura, e non si chiude ' +
          'a mano.',
        legenda: [
          'Un corso alla volta, sul semestre in cui cade oggi; le ore annullate non contano.',
          'La soglia della scuola, in percento: 20 finché non la si cambia, 0 la spegne.',
          'Il caso «preme» solo se l’appello c’è su tutte le ore segnate svolte.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Dove si regola',
        testo:
          'Impostazioni › Didattica › **Valutazione**, riquadro «Scala dei voti», campo «Segnala l’assenza ' +
          'oltre il». Sta nel documento dell’anno: la decide la scuola.',
      },
      {
        termine: 'Che cosa si conta',
        testo:
          'Le UD perse sulle UD che l’orario del corso prevede nel semestre. Chi manca spesso a ' +
          'matematica compare per matematica, non «per la scuola».',
      },
      {
        termine: 'Da segnalare o da guardare',
        testo:
          'Con gli appelli completi il caso va in «Da segnalare», con la percentuale in rosso. ' +
          'Se qualche appello manca va in «Da guardare: appelli incompleti», con la pastiglia ' +
          '«appelli da completare»: prima si finiscono gli appelli.',
      },
      {
        termine: 'Apri la scheda, Apri il corso',
        testo:
          'I due pulsanti della riga: le ore di quella persona una per una, oppure la stessa ' +
          'percentuale accanto a quella degli altri.',
      },
      {
        termine: 'Anche sui fogli',
        testo:
          'La stessa soglia colora l’assenza nella scheda della persona, ed esce nel foglio ' +
          'delle presenze del corso, alla voce «Da seguire».',
      },
    ],
    note: [
      'Oltre vuol dire oltre: al 20 % con la soglia a 20 non si compare. Quando l’intero ' +
        'arrotondato sembrerebbe dentro, la percentuale si legge con un decimale — 20,1 %.',
      'Il registro non avvisa nessuno e non ricorda chi è già stato segnalato: dice che c’è ' +
        'un caso, e dove. La segnalazione vera resta un gesto tuo.',
    ],
  },
  messaggistica: {
    titolo: 'Comunicazioni e recapiti',
    sommario:
      'La pagina **Messaggistica**: scrivere alla classe e alle famiglie, e a chi scrivere.',
    scritte: {
      bozza: 'Bozza',
      salvaBozza: 'Salva bozza',
      preparaInvio: 'Prepara invio',
      salvaEApri: 'o Salva e apri',
      dalRegistro: 'Parte dal registro',
      casella: 'casella + senza bozza',
      eml: 'File .eml',
      spedisciTu: 'lo spedisci tu',
      visto: 'visto',
      inviata: 'inviata',
      dataDestinatari: 'data e destinatari',
    },
    figure: [
      {
        didascalia:
          'Con la casella collegata e «Spedisci senza bozza» acceso spedisce il registro; altrimenti ' +
          'la bozza passa al programma di posta e il visto dice che è partita.',
        legenda: [
          'Destinatari per gruppi, sempre in copia nascosta: nessuno vede gli altri.',
          'Il registro chiede conferma una volta per giro, e segna da sé quel che è partito.',
          'Il file si apre nel programma di posta; spedita la mail, il visto nell’elenco.',
          'Il visto su una inviata la riporta a bozza: la spunta era per sbaglio.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Nuova comunicazione',
        testo:
          'Nella riga delle azioni. **Oggetto**, **Testo**, e i destinatari per gruppi: ' +
          `**${Molti(PIF)}**, **${Molti(PERSONE.rappresentante)}**, i recapiti fissi. Sotto si ` +
          'legge quanti indirizzi ne ' +
          'escono e chi resta senza e-mail.',
      },
      {
        termine: 'Allegati',
        testo:
          'I documenti personali già raccolti nell’archivio — la circolare, il modulo — si ' +
          'allegano con una spunta. Parte il file com’è il giorno dell’invio.',
      },
      {
        termine: 'Salva bozza, Salva e apri nella posta',
        testo:
          'Il primo la tiene nell’elenco; il secondo la salva e la prepara subito, dopo una ' +
          'conferma con il numero dei destinatari. Con «Spedisci senza bozza» ne arriva una ' +
          'seconda, prima di spedire.',
      },
      {
        termine: 'L’elenco',
        testo:
          'Le comunicazioni del periodo scelto, dalla più recente, con lo stato: **bozza**, ' +
          '**inviata**, o **errore** se spedirla dal registro non è riuscito. Ogni bozza ha ' +
          '**Prepara invio** e il visto; un clic ' +
          'sull’oggetto la riapre, e una inviata si legge soltanto.',
      },
      {
        termine: 'Spedire dal registro',
        testo:
          'In Impostazioni › **Comunicazioni**: **Collega la casella** chiede l’indirizzo e apre ' +
          'il browser sulla pagina di accesso Microsoft, **Prova il collegamento** controlla senza ' +
          'mandare niente. Poi si accende «Spedisci senza bozza», sotto «Quando parte», che di ' +
          'suo è spento.',
      },
      {
        termine: 'La firma',
        testo:
          'Non si scrive nel testo. Nella bozza la mette il programma di posta; quando spedisce ' +
          'il registro, va quella scritta in Impostazioni › **Comunicazioni**.',
      },
      {
        termine: 'Recapiti',
        testo:
          'Gli indirizzi fissi della classe — segreteria, sede, capoclasse — con **Nuovo ' +
          'recapito**. «In copia a ogni comunicazione nuova» lo spunta da sé nelle comunicazioni ' +
          `e nei periodi di assenze nuovi. In cima, quante ${PIF.plurale} hanno un indirizzo.`,
      },
      {
        termine: 'Togliere una comunicazione',
        testo:
          'Dal suo modulo, anche se inviata: sparisce la traccia nel registro, l’e-mail resta ' +
          'nelle caselle di chi l’ha ricevuta.',
      },
    ],
    note: [
      'Gli indirizzi si ricavano al momento dell’invio, non quando si scrive: un’e-mail ' +
        'corretta a metà anno vale anche per le bozze di settembre.',
      'Nei giri da più messaggi — richieste di firma, documenti per e-mail — le bozze non si ' +
        'aprono tutte: finiscono nella cartella dell’anno, in `bozze/` sotto il nome della ' +
        'classe, che si apre da sé. Una sola si apre direttamente. Se spedire dal registro non ' +
        'riesce si ripiega sulle bozze.',
      'Quel che parte non si richiama: nessun tasto del registro lo toglie dalle caselle.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    docente: {
      titolo: Uno(DE.docenteClasse),
      sommario:
        'Der zweite Beruf, eine Klasse nach der anderen: was offen bleibt, die Dokumente zum ' +
        'Einsammeln, die Absenzen zum Unterschreiben, die Mitteilungen.',
      scritte: {
        pendenzeClasse: `${Molti(DE.pendenza)} der Klasse`,
        archivio: 'Dokumentenarchiv',
        assenze: 'Absenzen',
        messaggistica: 'Mitteilungen',
        classe: 'Klasse: 3A',
        periodo: 'Zeitraum: 1. Sem.',
        nuovaPendenza: 'Neue Pendenz',
        daFirmare: TIPOLOGIE_DE.assenze,
        oltreSoglia: TIPOLOGIE_DE.segnalazioni,
        momenti: TIPOLOGIE_DE.consegnaClasse,
        consegnaClasse: TIPOLOGIE_DE.svolgeClasse,
        inRitardo: '2 überfällig',
        altre: '… und die anderen Arten, nur wenn sie nicht leer sind',
      },
      figure: [
        {
          didascalia:
            `Die Seite **${Molti(DE.pendenza)} der Klasse**: alles, was in dieser Klasse offen ` +
            'bleibt, in allen Fächern, eine Art pro Zeile.',
          legenda: [
            `Die Gruppe **${Uno(DE.docenteClasse)}** in der Seitenleiste: vier Seiten für die ` +
              'gewählte Klasse.',
            'Die Auswahl **Klasse** sagt, um welches Klassendossier es geht; **Zeitraum** ' +
              'beschränkt Matrizen, Zeiträume und Mitteilungen auf das Semester.',
            '**Neue Pendenz** in der Aktionsleiste.',
            'Eine Zeile pro Art, mit der Zahl dessen, was offen ist.',
            '«N überfällig», das einzig Farbige im Kopf einer Art: was jetzt drängt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Einschalten',
          testo:
            'Unter **Klassen**, in den **Details** der Klasse, das Häkchen «Ich bin ' +
            'Klassenlehrperson». Die Gruppe in der Seitenleiste erscheint mit der ersten ' +
            'angehakten Klasse und verschwindet mit der letzten.',
        },
        {
          termine: 'Die vier Arten',
          testo:
            `${TIPOLOGIE_DE.assenze}, ${TIPOLOGIE_DE.segnalazioni} und die Aufträge, welche die ` +
            'Klasse oder einzelne Lernende abgeben oder erledigen müssen. Die Aufträge liegen ' +
            'nach Frist in Stapeln: überfällig, heute, bis Ende Woche, später. Beurteilungen und ' +
            'eigene Arbeiten der Lehrperson erscheinen hier nicht.',
        },
        {
          termine: 'Neue Pendenz',
          testo:
            'Öffnet das Formular eines Auftrags, den die Klasse oder einzelne Lernende schulden. ' +
            'Der Kurs wird im Formular ausdrücklich gewählt. Ohne Kurs in dieser Klasse ist der ' +
            'Befehl ausgeschaltet: Jeder Auftrag gehört zu einem Kurs.',
        },
        {
          termine: 'Was «überfällig» ist',
          testo:
            'Ein fälliger Auftrag der Klasse, eine noch nicht verschickte Unterschriftsanfrage ' +
            'oder ein Fall über der Schwelle mit vollständigen Präsenzkontrollen.',
        },
        {
          termine: 'Klassenliste',
          testo:
            'In der Aktionsleiste aller vier Seiten: führt zu **Klassen**, auf diese Klasse, wo ' +
            'man Personen hinzufügt und entfernt.',
        },
        {
          termine: 'Das Klassendossier als PDF',
          testo:
            `${Molti(DE.pif)} mit Kontaktangaben, gesammelte Dokumente, Absenzenzeiträume: das ` +
            'PDF für die Person, die übernimmt. Man erstellt es unter **Dokumente**, Feld «Zur ' +
            'Klasse», mit einem Kurs dieser Klasse gewählt.',
        },
        {
          termine: 'Im Personenblatt',
          testo:
            `Den Reiter **${Uno(DE.docenteClasse)}** gibt es nur bei diesen Klassen: die bei der ` +
            'Person angeforderten Dokumente und ihre Absenzen zum Unterschreiben, Zeitraum für ' +
            'Zeitraum.',
        },
      ],
      note: [
        `Die Seite **${Molti(DE.pendenza)}** eines Kurses ist getrennt und zeigt nur den ` +
          'gewählten Kurs. Wird ein Auftrag der Klasse erledigt, aktualisiert sich auch diese Ansicht.',
      ],
    },
    archivio: {
      titolo: 'Dokumentenarchiv',
      sommario:
        `Was verlangt wurde und wer es gebracht hat: die ${DE.pif.plurale} in den Zeilen, die ` +
        'Dokumente in den Spalten.',
      scritte: {
        richieste: 'Anfragen 3',
        fogliRaccolti: 'Blätter 12',
        inAttesa: 'ausstehend 5',
        scadute: 'überfällig 1',
        daDividere: 'Aufzuteilen',
        pdf: 'zeugnisse.pdf · 24 Seiten',
        persona: 'Person',
        pagella: 'Zeugnis',
        certificato: 'Attest',
        circolare: 'Rundschr.',
        suoi: 'Eigene',
        firme: 'Übergabe-Unt.',
        nome: 'Rossi Maria',
        conto: '3 von 12',
      },
      figure: [
        {
          didascalia:
            'Pro Spalte sieht man, wie weit die Klasse ist, pro Zeile, wie weit eine Person ist. ' +
            'Der Rahmen rechts erscheint nur mit einem geöffneten Blatt.',
          legenda: [
            'Die Zählungen: Anfragen, persönliche, eingesammelte Blätter, ausstehende, und die ' +
              'überfälligen, wenn es welche gibt.',
            'Die PDFs, die noch aufzuteilen sind: Ein Klick öffnet ihre Seiten im Rahmen.',
            'Der Kopf einer Spalte: «erledigt/Empfänger» und die Frist. Ein Klick öffnet den ' +
              'Auftrag.',
            'Die Zeile **Übergabe-Unterschriften**: ein Feld für jede Anfrage, die sie verlangt.',
            'Ein Feld: der Handgriff, die Datei und der Papierkorb.',
            '**Eigene**: wie viele Anfragen die Person von denen, die sie betreffen, erledigt hat.',
            'Das geöffnete Blatt, mit den Pfeilen zum nächsten, «3 von 12», extern öffnen und ' +
              'Papierkorb.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ein Dokument verlangen',
          testo:
            'Öffnet das Formular eines Auftrags, der mit der Abgabe eines Dokuments abgehakt ' +
            'wird, für die ganze Klasse: Man gibt an, **Welches Dokument** es ist und **Wer es ' +
            'bringt** — «Die Lernenden geben es mir ab» oder «Ich händige es den Lernenden aus». ' +
            'Daraus entsteht eine Spalte. Ohne Kurs in der Klasse ist der Befehl ausgeschaltet.',
        },
        {
          termine: 'Persönliches Dokument',
          testo:
            'Eine Sammlung «Für mich»: das Rundschreiben, das Formular, das man bereithalten ' +
            'will. Es ist keine Spalte: Es steht über der Matrix, unter **Persönliche ' +
            'Dokumente**, «ausstehend» oder «eingesammelt». Ein Klick auf den Namen wählt die ' +
            'Datei; einmal eingesammelt, kann man es an eine Mitteilung anhängen.',
        },
        {
          termine: 'Das Feld',
          testo:
            'Links der Handgriff — gebracht, oder von dir ausgehändigt —, der zu einer Warnung ' +
            'wird, wenn die Frist abgelaufen ist. In der Mitte die Datei: Fehlt sie, hängt man ' +
            'sie von der Festplatte an, ist sie da, sieht man sie an. Rechts der Papierkorb. Wer ' +
            'nicht unter den Empfängern war, hat ein «+», das die Person hinzufügt.',
        },
        {
          termine: 'Per E-Mail aushändigen',
          testo:
            'Mit «Ich händige es den Lernenden aus» und **Wie ich es aushändige** «Per E-Mail, ' +
            'einzeln» erscheint oben in der Spalte **Versand vorbereiten (N)**: eine Nachricht ' +
            'pro Person mit ihrem Dokument im Anhang, für alle, die es noch nicht erhalten haben.',
        },
        {
          termine: 'Übergabe-Unterschriften',
          testo:
            'Hakt man im Formular «Unterschriftenblatt für die Übergabe nötig» an, bekommt die ' +
            'Zeile oben ein Feld unter dieser Spalte: ein einziges Blatt für die ganze Anfrage, ' +
            'der Nachweis, dass es verteilt wurde. Es nimmt auch Seiten auf, die aus einem PDF ' +
            'gezogen werden.',
        },
        {
          termine: 'Ein Blatt ansehen',
          testo:
            'Ein volles Feld öffnet das Dokument im Rahmen daneben, und die Pfeile gehen zum ' +
            'nächsten Blatt in der Reihenfolge der Matrix: Zwanzig Scans prüft man am Stück. Ist ' +
            'die Datei nicht mehr da, sagt es der Rahmen, statt eine Leere zu zeigen.',
        },
      ],
      note: [
        'Zwei Tatsachen, zwei Schaltflächen: Handgriff und Datei fallen nicht zusammen. Man ' +
          'hakt heute Morgen ab und scannt heute Abend; das Zeugnis, das seit drei Tagen bereit ' +
          'ist, gibt man am Montag aus.',
        'Der Papierkorb im Rahmen entfernt die Datei und nimmt das Häkchen zurück. Die Datei ' +
          'verlässt das Dokument des Schuljahrs (sie kommt nicht in den Papierkorb des ' +
          'Systems), und oft ist sie die einzige Kopie, die es gibt.',
      ],
    },
    archivioPdf: {
      titolo: 'Ein Klassen-PDF aufteilen',
      sommario:
        'Das Sekretariat schickt eine einzige Datei für die ganze Klasse: Die Seiten legt man ' +
        'auf das Feld der Person, zu der sie gehören, und das Klassenbuch schneidet sie zu und ' +
        'archiviert sie.',
      scritte: {
        pdf: 'Klassen-PDF',
        trascinato: 'gezogen oder geladen',
        pagine: 'Seiten',
        testoOScansione: 'Text oder Scan',
        proposta: 'Vorschlag',
        nomeLetto: 'der gelesene Name',
        casella: 'Feld',
        personaDocumento: 'Person × Dokument',
        aMano: 'von Hand gezogen',
        conferma: 'N Vorschläge bestätigen',
        sottoOgni: 'Unter jeder Seite ein einziges Etikett:',
        nome: 'Rossi Maria',
        daLeggere: 'zu lesen',
        nessunNome: 'kein Name',
        inCoda: 'wartet',
        archiviata: 'Rossi Maria ✓',
      },
      figure: [
        {
          didascalia:
            'Das Klassenbuch schlägt vor, wer hinschaut, entscheidet: Nichts wird archiviert ' +
            'ohne einen Handgriff, sei es ein Ziehen oder eine Bestätigung.',
          legenda: [
            'Die Datei kommt ohne Fragen herein: Wem sie gehört, sagt man danach.',
            'Seiten mit Text werden sofort gelesen; stumme Scans warten auf das automatische ' +
              'Lesen.',
            'Der erkannte Name wird zu einem Vorschlag, der unter der Seite steht.',
            'Das Feld, in dem sich Person und Dokument kreuzen: Ein volles Feld wird nicht ' +
              'überschrieben.',
            'Der vorgeschlagene Name: mit der Lupe, wenn ihn das automatische Lesen gefunden ' +
            'hat, ' +
            '' +
              'mit dem Blatt, wenn er im Text des PDF stand.',
            '**zu lesen** ist ein stummer Scan; **kein Name**, eine gelesene Seite ohne jemanden ' +
              'aus der Klasse.',
            'Grünes Häkchen: schon für diese Person archiviert.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die PDFs hereinholen',
          testo:
            'Man zieht sie auf die Seite — die ganze Seite ist der Briefkasten — oder nimmt ' +
            '**PDFs laden**. Nur PDF. Das erste, das hereinkommt, öffnet sich von selbst, in ' +
            'Seiten, bereit zum Aufteilen.',
        },
        {
          termine: 'Aufzuteilen',
          testo:
            'Die PDFs mit Seiten ohne Besitzer stehen in einer Zeile über der Matrix. Die ' +
            'Schaltfläche **Seiten** / **Lesen** wechselt von den Miniaturen zum PDF-Betrachter, ' +
            'für die Fälle, in denen man wirklich lesen muss; der Regler oben vergrössert die ' +
            'Miniaturen.',
        },
        {
          termine: 'Seiten auswählen',
          testo:
            'Ein Klick wählt eine Seite, **Ctrl** fügt welche hinzu, **Umschalt** nimmt einen ' +
            'Bereich. Mit gewählten Seiten erscheinen der Papierkorb — für das Deckblatt des ' +
            'Scanners, ein leeres Blatt — und **Loslassen**, das sie wieder freigibt.',
        },
        {
          termine: 'Sie ziehen',
          testo:
            'Auf das Feld, in dem sich Person und Dokument kreuzen: Das ganze Feld ist Ziel, und ' +
            'während man zieht, leuchten die Felder auf. Weiss das PDF schon, zu welchem ' +
            'Dokument es gehört, genügt die **Zeile** der Person. Esc bricht ab; wer daneben ' +
            'loslässt, dem sagt es das Klassenbuch.',
        },
        {
          termine: 'N Vorschläge bestätigen',
          testo:
            'Erscheint, wenn das PDF mit einer Anfrage verknüpft ist: Es archiviert mit einem ' +
            'Handgriff alle Seiten, deren Namen das Klassenbuch schon gelesen hat.',
        },
        {
          termine: 'Einen Vorschlag prüfen',
          testo:
            'Auf der Seite markiert ein Rechteck, wo der Name gelesen wurde, mit dem Namen ' +
            'daneben: **voll**, wenn er im Text des PDF steht, **gestrichelt**, wenn ihn das ' +
            'automatische Lesen gefunden hat, das den Streifen kennt und nicht die Stelle. Mit ' +
            'der Maus auf der Seite liest man ihre ersten Wörter.',
        },
        {
          termine: 'Die rechte Maustaste auf einer Seite',
          testo:
            '**Zuweisen an…** fragt nach Person und Dokument und archiviert: der Weg, wenn sich ' +
            'der Name nicht lesen lässt oder eine Datei zwei verschiedene Vorgänge enthält. Dann ' +
            '**Scan neu lesen**, **Im Betrachter öffnen**, **Wegwerfen**.',
        },
        {
          termine: 'Lesen und neu lesen',
          testo:
            'Oben im Rahmen reiht **Scans lesen (N)** die stummen Seiten ein, **Neu lesen** — ' +
            '«Die N Seiten neu lesen», wenn keine mehr zu lesen ist — liest alle noch nicht ' +
            'zugeordneten von vorn; unter den Befehlen der Seite tut **Scans neu lesen** ' +
            'dasselbe ' +
            '' +
            'für alle PDFs der Klasse. **Anhalten** leert die Warteschlange. Ist das Lesen ' +
            'ausgeschaltet, sagt die Schaltfläche **Lesen aus** und führt zu den ' +
            'Einstellungen.',
        },
        {
          termine: 'Die archivierten Seiten',
          testo:
            'Sie verschwinden aus der Reihe. **Archiviert (N)** zeigt sie wieder, mit dem Namen ' +
            'der Person, zu der sie kamen; rechte Maustaste, **Zurückholen**, und das Dokument ' +
            'verlässt das Klassendossier, und die Seite ist wieder zuzuordnen.',
        },
        {
          termine: 'Verschieben nach…',
          testo:
            'Die Auswahl oben im Rahmen schickt die übrigen Seiten in eine andere Klasse: für ' +
            'den ' +
            '' +
            'Scan, der zwei Klassen umfasst.',
        },
      ],
      note: [
        'Die Datei kommt ins Dokument des Schuljahrs, und das Original auf der Festplatte ' +
          'bleibt, wo es war. Das ganze PDF bleibt drin, solange noch eine Seite zu entscheiden ' +
          'ist.',
        'Ein schon volles Feld weist die Seiten ab und sagt es: Um andere hineinzulegen, ' +
          'entfernt man zuerst das Dokument, das drin ist.',
        'Das automatische Lesen läuft auf diesem Computer und braucht Dutzende Sekunden pro ' +
          'Seite: Man startet es und ordnet unterdessen die Seiten zu, deren Namen schon ' +
          'bekannt sind.',
      ],
    },
    assenze: {
      titolo: 'Absenzen zum Unterschreiben',
      sommario:
        'Dreimal im Jahr: Die Blätter der Schule gehen hinaus, die E-Mail bittet den ' +
        'Lehrbetrieb um die Unterschrift, die Blätter kommen unterschrieben zurück.',
      scritte: {
        partono: 'Blätter, die rausgehen',
        richiesta: 'die Anfrage',
        tornano: 'Blätter, die zurückkommen',
        persona: 'Person',
        assenze: 'Abs.',
        ritardi: 'Versp.',
        mail: 'Mail',
        assenzeFirmate: 'Abs. ✓',
        ritardiFirmati: 'Versp. ✓',
        daSpedire: 'zu verschicken',
        senzaDatore: 'ohne Arbeitgeber',
        faseDaSpedire: 'Zu verschicken',
        fogliCaricati: 'Blätter geladen',
        faseInAttesa: 'Ausstehend',
        emailPartita: 'E-Mail verschickt',
        faseFirmato: 'Unterschrieben',
        firmeTornate: 'Unterschriften zurück',
      },
      figure: [
        {
          didascalia:
            'Ein Zeitraum nach dem anderen: eine Zeile pro Person, fünf Felder, und darunter die ' +
            'drei Schritte, die die Spalte **Status** zusammenfasst.',
          legenda: [
            '**Abs.** und **Versp.**: die Absenzen- und Verspätungsblätter zum Verschicken. Das ' +
              '«+» lädt eines hoch.',
            '**Mail**: Der Umschlag bereitet die Anfrage vor, das Häkchen daneben markiert sie ' +
              'als verschickt.',
            '**Abs. ✓** und **Versp. ✓**: die unterschriebenen Blätter. Gestrichelt, solange man ' +
              'auf sie wartet.',
            '**Status**: zu verschicken, ausstehend, unterschrieben. Wer keine Blätter hat, hat ' +
              'eine ausgegraute Zeile.',
            '«ohne Arbeitgeber»: Im Blatt fehlt die E-Mail des Arbeitgebers, der unterschreiben ' +
              'muss.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Neuer Zeitraum',
          testo:
            'In der Aktionsleiste. Der Zeitraum *sind* seine beiden Daten, aus dem Kalender ' +
            'gewählt und auf das laufende Semester vorgeschlagen: Den Namen leitet das ' +
            'Klassenbuch aus dem Semester ab, und die Daten kommen in den Namen der archivierten ' +
            'Blätter und in den Brief.',
        },
        {
          termine: 'Der Brief an den Lehrbetrieb',
          testo:
            'Betreff und Text schreibt man einmal pro Zeitraum; die Platzhalter in geschweiften ' +
            'Klammern — `{allievo}`, `{azienda}`, `{periodo}`, `{rapporti}` … — werden Person ' +
            'für ' +
            '' +
            'Person gefüllt. Pro Person geht eine E-Mail offen an die Adresse des Arbeitgebers, ' +
            'nur mit den eigenen Blättern.',
        },
        {
          termine: 'Auch an',
          testo:
            `Im Formular des Zeitraums: die ${DE.pif.singolare}, die ` +
            `${DE.rappresentante.singolare} und die festen Kontaktadressen der Klasse. Die mit «Bei ` +
            'jeder neuen Mitteilung in Kopie» markierten sind schon angehakt.',
        },
        {
          termine: 'Die Blätter hereinholen',
          testo:
            '**PDFs laden** oder Ziehen, wie im Archiv: Die Seiten legt man auf das Feld, und ' +
            'das Feld sagt, welches Blatt sie sind. **Blätter importieren** fragt, welche ' +
            'Blätter ' +
            '' +
            'es sind, nimmt dann mehrere Dateien auf einmal und ordnet jede nach dem Namen zu, ' +
            'den sie trägt.',
        },
        {
          termine: 'Verschicken',
          testo:
            '**Versand vorbereiten (N)** bereitet die Anfragen des ganzen Zeitraums vor; N ' +
            'zählt, ' +
            '' +
            'wer eine Adresse hat, und wer keine hat, bleibt als nicht verschickt zurück. Der ' +
            'Umschlag eines Felds **Mail** tut dasselbe für eine einzelne Person, das Häkchen ' +
            'daneben markiert sie als verschickt.',
        },
        {
          termine: 'Eine nicht verschickte Anfrage',
          testo:
            'Das Feld **Mail** zeigt die Warnung, und mit der Maus darauf liest man den Grund — ' +
            'fast immer eine Adresse, die im Blatt zu korrigieren ist. In der Liste der ' +
            'Zeiträume erscheint «N nicht verschickt».',
        },
        {
          termine: 'Einen Bericht ansehen',
          testo:
            'Ein volles Feld öffnet das Blatt im Rahmen daneben: Bevor man sie dem Lehrbetrieb ' +
            'schickt, sollte man sie ansehen, und die Pfeile gehen zum nächsten, ohne zwanzig ' +
            'Fenster zu öffnen.',
        },
        {
          termine: 'Jeder Zeitraum im Überblick',
          testo:
            'In der Liste: «12/18 unterschrieben · 15 verschickt», «vollständig», und der Stift, ' +
            'um ihn zu ändern oder zu löschen. Über der Matrix die Zahlen des geöffneten ' +
            'Zeitraums: mit Absenzen, verschickt, unterschrieben.',
        },
        {
          termine: 'Bei den Pendenzen',
          testo:
            'Jede offene Anfrage steht auch bei den Pendenzen, unter «Zu verschicken» oder ' +
            '«Warten auf Unterschrift», mit **E-Mail vorbereiten** und den Schaltflächen, um die ' +
            'unterschriebenen Blätter hochzuladen. Der Name führt zum richtigen Zeitraum.',
        },
      ],
      note: [
        'Unterschrieben heisst, dass für jedes verschickte Blatt ein unterschriebenes ' +
          'zurückgekommen ist: Wer Absenzen und Verspätungen verschickt hat und nur die Absenzen ' +
          'zurückbekommt, bleibt «ausstehend».',
        'Ein falsch geschriebener Platzhalter bleibt im Brief, wie er ist, in geschweiften ' +
          'Klammern: Man sieht ihn im Entwurf vor dem Verschicken, statt dass er zu einer Lücke ' +
          'wird.',
        'Wer einen Zeitraum löscht, entfernt aus dem Dokument des Schuljahrs auch alle seine ' +
          'Blätter, unterschriebene und nicht unterschriebene (sie kommen nicht in den ' +
          'Papierkorb des Systems).',
      ],
    },
    assenzeSoglia: {
      titolo: TIPOLOGIE_DE.segnalazioni,
      sommario:
        'Wer mehr Stunden verpasst hat, als die Schule zulässt, erscheint von selbst bei den ' +
        'Pendenzen, Kurs für Kurs.',
      scritte: {
        assenza: 'Absenz im Kurs',
        conto: 'Lekt. verpasst ÷ vorgesehen',
        oltre: 'Über der Schwelle?',
        impostazioni: 'in den Einstellungen',
        daSegnalare: 'Zu melden',
        completi: 'Präsenzkontrollen vollständig',
        daGuardare: 'Anschauen',
        incompleti: 'Präsenzkontrollen unvollständig',
        sotto: 'unter der Schwelle:',
        sparisce: 'die Zeile verschwindet von selbst',
      },
      figure: [
        {
          didascalia:
            'Eine Meldung ist eine Rechnung, kein Zustand: Sie wird bei jedem Öffnen neu ' +
            'gemacht, und man schliesst sie nicht von Hand.',
          legenda: [
            'Ein Kurs nach dem anderen, im Semester, in das heute fällt; ausgefallene Stunden ' +
              'zählen nicht.',
            'Die Schwelle der Schule, in Prozent: 20, solange man sie nicht ändert, 0 schaltet ' +
              'sie aus.',
            'Der Fall «drängt» nur, wenn es bei allen als gehalten markierten Stunden eine ' +
              'Präsenzkontrolle gibt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Wo man sie einstellt',
          testo:
            'Einstellungen › Unterricht › **Beurteilung**, Feld «Notenskala», Eingabe «Absenz ' +
            'melden über». Sie steht im Dokument des Schuljahrs: Die Schule legt sie fest.',
        },
        {
          termine: 'Was gezählt wird',
          testo:
            'Die verpassten Lektionen von denen, die der Stundenplan des Kurses im Semester ' +
            'vorsieht. Wer oft in Mathematik fehlt, erscheint für Mathematik, nicht «für die ' +
            'Schule».',
        },
        {
          termine: 'Zu melden oder anzuschauen',
          testo:
            'Mit vollständigen Präsenzkontrollen kommt der Fall unter «Zu melden», mit dem ' +
            'Prozentsatz in Rot. Fehlt eine Präsenzkontrolle, kommt er unter «Anschauen: ' +
            'unvollständige Präsenzkontrollen», mit dem Etikett «Präsenzkontrollen zu ' +
            'vervollständigen»: Zuerst macht man die Präsenzkontrollen fertig.',
        },
        {
          termine: 'Personenblatt öffnen, Kurs öffnen',
          testo:
            'Die beiden Schaltflächen der Zeile: die Stunden dieser Person, eine nach der ' +
            'anderen, oder derselbe Prozentsatz neben dem der anderen.',
        },
        {
          termine: 'Auch auf den Blättern',
          testo:
            'Dieselbe Schwelle färbt die Absenz im Personenblatt und erscheint im ' +
            'Präsenzblatt des Kurses, unter «Im Auge behalten».',
        },
      ],
      note: [
        'Über heisst über: Mit 20 % bei einer Schwelle von 20 erscheint man nicht. Wenn die ' +
          'gerundete ganze Zahl noch darunter zu liegen scheint, zeigt der Prozentsatz eine ' +
          'Dezimalstelle — 20.1 %.',
        'Das Klassenbuch benachrichtigt niemanden und merkt sich nicht, wer schon gemeldet ' +
          'wurde: Es sagt, dass es einen Fall gibt, und wo. Die eigentliche Meldung bleibt dein ' +
          'Handgriff.',
      ],
    },
    messaggistica: {
      titolo: 'Mitteilungen und Kontaktadressen',
      sommario:
        'Die Seite **Mitteilungen**: der Klasse und den Familien schreiben, und wem man ' +
        'schreibt.',
      scritte: {
        bozza: 'Entwurf',
        salvaBozza: 'Entwurf speichern',
        preparaInvio: 'Versand vorb.',
        salvaEApri: 'Speichern+öffnen',
        dalRegistro: 'Geht vom Klassenbuch',
        casella: 'Postfach + ohne Entwurf',
        eml: 'Datei .eml',
        spedisciTu: 'du verschickst sie',
        visto: 'Häkchen',
        inviata: 'versendet',
        dataDestinatari: 'Datum und Empfänger',
      },
      figure: [
        {
          didascalia:
            'Mit verbundenem Postfach und eingeschaltetem «Ohne Entwurf senden» verschickt das ' +
            'Klassenbuch; sonst geht der Entwurf ans Mailprogramm, und das Häkchen sagt, dass ' +
            'er verschickt ist.',
          legenda: [
            'Empfänger nach Gruppen, immer in Blindkopie: Niemand sieht die anderen.',
            'Das Klassenbuch fragt pro Durchgang einmal nach und markiert selbst, was ' +
              'verschickt ist.',
            'Die Datei öffnet sich im Mailprogramm; ist die Mail verschickt, das Häkchen in der ' +
              'Liste.',
            'Das Häkchen bei einer versendeten macht sie wieder zum Entwurf: Es war ein Versehen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Neue Mitteilung',
          testo:
            'In der Aktionsleiste. **Betreff**, **Text** und die Empfänger nach Gruppen: ' +
            `**${Molti(DE.pif)}**, **${Molti(DE.rappresentante)}**, die festen Kontaktadressen. ` +
            'Darunter steht, wie viele Adressen daraus werden und wer ohne E-Mail bleibt.',
        },
        {
          termine: 'Anhänge',
          testo:
            'Die persönlichen Dokumente, die schon im Archiv gesammelt sind — das ' +
            'Rundschreiben, das Formular —, hängt man mit einem Häkchen an. Verschickt wird die ' +
            'Datei so, wie sie am Tag des Versands ist.',
        },
        {
          termine: 'Entwurf speichern, Speichern und im Mailprogramm öffnen',
          testo:
            'Das erste behält sie in der Liste; das zweite speichert sie und bereitet sie ' +
            'sofort vor, nach einer Rückfrage mit der Zahl der Empfänger. Mit «Ohne Entwurf ' +
            'senden» kommt vor dem Verschicken eine zweite Rückfrage.',
        },
        {
          termine: 'Die Liste',
          testo:
            'Die Mitteilungen des gewählten Zeitraums, die neueste zuerst, mit dem Stand: ' +
            '**Entwurf**, **versendet** oder **Fehler**, wenn das Verschicken aus dem ' +
            'Klassenbuch nicht geklappt hat. Jeder Entwurf hat **Versand vorbereiten** und das ' +
            'Häkchen; ein Klick auf den Betreff öffnet ihn wieder, und eine versendete kann man ' +
            'nur noch lesen.',
        },
        {
          termine: 'Aus dem Klassenbuch verschicken',
          testo:
            'Unter Einstellungen › **Kommunikation**: **Postfach verbinden** fragt nach der ' +
            'Adresse und öffnet den Browser auf der Anmeldeseite von Microsoft, **Verbindung ' +
            'testen** prüft, ohne etwas zu schicken. Dann schaltet man «Ohne Entwurf senden» ' +
            'ein, unter «Wann es verschickt wird», das von sich aus ausgeschaltet ist.',
        },
        {
          termine: 'Die Signatur',
          testo:
            'Sie gehört nicht in den Text. Im Entwurf setzt sie das Mailprogramm; wenn das ' +
            'Klassenbuch verschickt, kommt die unter Einstellungen › **Kommunikation** ' +
            'geschriebene.',
        },
        {
          termine: 'Kontaktadressen',
          testo:
            'Die festen Adressen der Klasse — Sekretariat, Schule, Klassenchef — mit **Neue ' +
            'Kontaktadresse**. «Bei jeder neuen Mitteilung in Kopie» hakt sie in neuen ' +
            'Mitteilungen und Absenzenzeiträumen von selbst an. Oben, wie viele ' +
            `${DE.pif.plurale} eine Adresse haben.`,
        },
        {
          termine: 'Eine Mitteilung entfernen',
          testo:
            'Aus ihrem Formular, auch wenn sie versendet ist: Die Spur im Klassenbuch ' +
            'verschwindet, die E-Mail bleibt in den Postfächern derer, die sie erhalten haben.',
        },
      ],
      note: [
        'Die Adressen werden im Moment des Versands ermittelt, nicht beim Schreiben: Eine ' +
          'mitten im Jahr korrigierte E-Mail gilt auch für die Entwürfe vom September.',
        'Bei Durchgängen mit mehreren Nachrichten — Unterschriftsanfragen, Dokumente per ' +
          'E-Mail — öffnen sich die Entwürfe nicht alle: Sie landen im Ordner des Schuljahrs, ' +
          'in `bozze/` unter dem Namen der Klasse, der sich von selbst öffnet. Ein einzelner ' +
          'öffnet sich direkt. Klappt das Verschicken aus dem Klassenbuch nicht, weicht es auf ' +
          'die Entwürfe aus.',
        'Was verschickt ist, lässt sich nicht zurückholen: Keine Taste des Klassenbuchs ' +
          'entfernt es aus den Postfächern.',
      ],
    },
  },
  fr: {
    docente: {
      titolo: Uno(FR.docenteClasse),
      sommario:
        'Le deuxième métier, une classe à la fois : ce qui reste ouvert, les documents à ' +
        'récupérer, les absences à faire signer, les communications.',
      scritte: {
        pendenzeClasse: 'En suspens (classe)',
        archivio: 'Archives',
        assenze: 'Absences',
        messaggistica: 'Messagerie',
        classe: 'Classe : 3A',
        periodo: 'Période : S1',
        nuovaPendenza: 'Nouvelle tâche',
        daFirmare: TIPOLOGIE_FR.assenze,
        oltreSoglia: TIPOLOGIE_FR.segnalazioni,
        momenti: TIPOLOGIE_FR.consegnaClasse,
        consegnaClasse: TIPOLOGIE_FR.svolgeClasse,
        inRitardo: '2 en retard',
        altre: '… et les autres types, seulement quand ils ne sont pas vides',
      },
      figure: [
        {
          didascalia:
            `La page **${Molti(FR.pendenza)} de la classe** : tout ce qui reste ouvert dans ` +
            'cette classe, dans toutes les branches, un type par ligne.',
          legenda: [
            `Le groupe **${Uno(FR.docenteClasse)}** dans la barre latérale : quatre pages pour ` +
              'la classe choisie.',
            'La liste **Classe** dit de quel dossier de classe on parle ; **Période** restreint ' +
              'matrices, périodes et communications au semestre.',
            '**Nouvelle tâche en suspens**, dans la barre d’actions.',
            'Une ligne par type, avec le compte de ce qui est ouvert.',
            '« N en retard », la seule chose en couleur dans l’en-tête d’un type : ce qui presse ' +
              'maintenant.',
          ],
        },
      ],
      voci: [
        {
          termine: 'L’activer',
          testo:
            'Dans **Classes**, dans les **Détails** de la classe, la case « Je suis maître de ' +
            'classe ». Le groupe dans la barre latérale apparaît avec la première classe cochée ' +
            'et disparaît avec la dernière.',
        },
        {
          termine: 'Les quatre types',
          testo:
            'Absences à faire signer, absences au-delà du seuil et devoirs que la classe ou des ' +
            'élèves doivent rendre ou effectuer. Les devoirs sont groupés par échéance : en ' +
            'retard, aujourd’hui, d’ici la fin de la semaine, plus tard. Les évaluations et le ' +
            'travail propre de l’enseignant n’apparaissent pas ici.',
        },
        {
          termine: 'Nouvelle tâche en suspens',
          testo:
            'Ouvre le formulaire d’un devoir dû par la classe ou par des élèves. Le cours se ' +
            'choisit explicitement dans le formulaire. Sans cours dans cette classe, la commande ' +
            'est éteinte : chaque devoir appartient à un cours.',
        },
        {
          termine: 'Ce qui est « en retard »',
          testo:
            'Un devoir dû par la classe dont l’échéance est passée, une demande de signature ' +
            'encore à envoyer ou un cas au-delà du seuil avec les appels complets.',
        },
        {
          termine: 'Liste de la classe',
          testo:
            'Dans la barre d’actions des quatre pages : mène à **Classes**, sur cette classe, où ' +
            'l’on ajoute et retire les personnes.',
        },
        {
          termine: 'Le dossier de classe en PDF',
          testo:
            `${Molti(FR.pif)} avec leurs coordonnées, documents collectés, périodes ` +
            'd’absences : le PDF à laisser à qui reprend la classe. Il se fait depuis ' +
            '**Documents**, cadre « De la classe », avec un cours de cette classe choisi.',
        },
        {
          termine: 'Dans la fiche d’une personne',
          testo:
            `L’onglet **${Uno(FR.docenteClasse)}** n’existe que sur ces classes : les documents ` +
            'qui lui ont été demandés et ses absences à faire signer, période par période.',
        },
      ],
      note: [
        `La page **${Molti(FR.pendenza)}** d’un cours est séparée et montre le cours choisi. ` +
          'Lorsqu’un devoir dû par la classe est terminé, cette vue se met aussi à jour.',
      ],
    },
    archivio: {
      titolo: 'Archive des documents',
      sommario:
        `Ce qui a été demandé et qui l’a apporté : les ${FR.pif.plurale} en ligne, les ` +
        'documents en colonne.',
      scritte: {
        richieste: 'demandes 3',
        fogliRaccolti: 'feuilles 12',
        inAttesa: 'en attente 5',
        scadute: 'en retard 1',
        daDividere: 'À répartir',
        pdf: 'bulletins.pdf · 24 pages',
        persona: 'Personne',
        pagella: 'Bulletin',
        certificato: 'Certif.',
        circolare: 'Circul.',
        suoi: 'Siens',
        firme: 'Signat. remise',
        nome: 'Rossi Maria',
        conto: '3 sur 12',
      },
      figure: [
        {
          didascalia:
            'Par colonne, on voit où en est la classe ; par ligne, où en est une personne. Le ' +
            'cadre à droite n’apparaît qu’avec une feuille ouverte.',
          legenda: [
            'Les comptes : demandes, personnels, feuilles collectées, en attente, et celles en ' +
              'retard quand il y en a.',
            'Les PDF encore à répartir : un clic en ouvre les pages dans le cadre.',
            'L’en-tête d’une colonne : « faites/destinataires » et l’échéance. Un clic ouvre le ' +
              'devoir.',
            'La ligne **Signatures de remise** : une case pour chaque demande qui les exige.',
            'Une case : le geste, le fichier et la corbeille.',
            '**Les siens** : combien de demandes la personne a closes sur celles qui la ' +
              'concernent.',
            'La feuille ouverte, avec les flèches vers la suivante, « 3 sur 12 », ouvrir à part ' +
              'et corbeille.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Demander un document',
          testo:
            'Ouvre le formulaire d’un devoir qui se coche en remettant un document, pour toute ' +
            'la classe : on dit **Quel document** c’est et **Qui l’apporte** — « Les personnes ' +
            'en formation me le remettent » ou « Je le remets aux personnes en formation ». Il ' +
            'en naît une colonne. Sans cours dans la classe, la commande est éteinte.',
        },
        {
          termine: 'Document personnel',
          testo:
            'Une collecte « Pour moi » : la circulaire, le formulaire à garder prêt. Ce n’est ' +
            'pas une colonne : elle est au-dessus de la matrice, dans **Documents personnels**, ' +
            '« attendu » ou « collecté ». Un clic sur le nom choisit le fichier ; une fois ' +
            'collecté, on peut le joindre à une communication.',
        },
        {
          termine: 'La case',
          testo:
            'À gauche le geste — il l’a apporté, ou tu le lui as remis —, qui devient un ' +
            'avertissement quand l’échéance est passée. Au centre le fichier : s’il manque, on ' +
            'le joint depuis le disque ; s’il est là, on le regarde. À droite la corbeille. Qui ' +
            'n’était pas parmi les destinataires a un « + » qui l’ajoute.',
        },
        {
          termine: 'Remettre par e-mail',
          testo:
            'Avec « Je le remets aux personnes en formation » et **Comment je le remets** « Par ' +
            'e-mail, un par un », en tête de colonne apparaît **Préparer l’envoi (N)** : un ' +
            'message par personne avec son document en pièce jointe, pour qui ne l’a pas encore ' +
            'reçu.',
        },
        {
          termine: 'Signatures de remise',
          testo:
            'En cochant dans le formulaire « Il faut la feuille des signatures de remise », la ' +
            'ligne du haut reçoit une case sous cette colonne : une seule feuille pour toute la ' +
            'demande, la preuve de l’avoir distribué. Elle prend aussi les pages glissées depuis ' +
            'un PDF.',
        },
        {
          termine: 'Regarder une feuille',
          testo:
            'Une case pleine ouvre le document dans le cadre à côté, et les flèches passent à la ' +
            'feuille suivante dans l’ordre de la matrice : vingt scans se contrôlent à la suite. ' +
            'Si le fichier n’existe plus, le cadre le dit au lieu de montrer un vide.',
        },
      ],
      note: [
        'Deux faits, deux boutons : le geste et le fichier ne coïncident pas. On coche ce ' +
          'matin et on scanne ce soir ; le bulletin prêt depuis trois jours se donne lundi.',
        'La corbeille du cadre retire le fichier et annule la coche. Le fichier sort du ' +
          'document de l’année (il ne va pas dans la corbeille du système), et c’est souvent ' +
          'la seule copie qui existe.',
      ],
    },
    archivioPdf: {
      titolo: 'Répartir un PDF de classe',
      sommario:
        'Le secrétariat envoie un seul fichier pour toute la classe : les pages se posent sur ' +
        'la case de la personne concernée, et le registre les découpe et les archive.',
      scritte: {
        pdf: 'PDF de classe',
        trascinato: 'glissé ou chargé',
        pagine: 'Pages',
        testoOScansione: 'texte ou scan',
        proposta: 'Proposition',
        nomeLetto: 'le nom lu',
        casella: 'Case',
        personaDocumento: 'personne × document',
        aMano: 'glissées à la main',
        conferma: 'Confirmer N propositions',
        sottoOgni: 'Sous chaque page, une seule pastille :',
        nome: 'Rossi Maria',
        daLeggere: 'à lire',
        nessunNome: 'aucun nom',
        inCoda: 'en attente',
        archiviata: 'Rossi Maria ✓',
      },
      figure: [
        {
          didascalia:
            'Le registre propose, qui regarde décide : rien n’est archivé sans un geste, que ce ' +
            'soit un glisser-déposer ou une confirmation.',
          legenda: [
            'Le fichier entre sans questions : à qui il appartient, on le dit après.',
            'Les pages avec du texte se lisent tout de suite ; les scans muets attendent la ' +
              'lecture automatique.',
            'Le nom reconnu devient une proposition, écrite sous la page.',
            'La case qui croise personne et document : une case pleine ne s’écrase pas.',
            'Le nom proposé : avec la loupe si c’est la lecture automatique qui l’a lu, avec la ' +
              'feuille s’il était dans le texte du PDF.',
            '**à lire** est un scan muet ; **aucun nom**, une page lue sans personne de la ' +
              'classe.',
            'Coche verte : déjà archivée pour cette personne.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Faire entrer les PDF',
          testo:
            'On les glisse sur la page — toute la page est la boîte aux lettres — ou **Charger ' +
            'des PDF**. Seulement des PDF. Le premier qui entre s’ouvre tout seul, en pages, ' +
            'prêt à être réparti.',
        },
        {
          termine: 'À répartir',
          testo:
            'Les PDF avec des pages sans propriétaire sont dans une ligne au-dessus de la ' +
            'matrice. Le bouton **Pages** / **Lire** passe des miniatures au lecteur PDF, pour ' +
            'quand il faut vraiment lire ; le curseur en haut agrandit les miniatures.',
        },
        {
          termine: 'Choisir les pages',
          testo:
            'Un clic choisit une page, **Ctrl** en ajoute, **Maj** prend une plage. Avec des ' +
            'pages choisies apparaissent la corbeille — pour la page de garde du scanner, une ' +
            'feuille blanche — et **Relâcher**, qui les libère.',
        },
        {
          termine: 'Les glisser',
          testo:
            'Sur la case qui croise la personne et le document : toute la case est une cible, et ' +
            'pendant qu’on glisse, les cases s’allument. Si le PDF sait déjà à quel document il ' +
            'appartient, la **ligne** de la personne suffit. Échap annule ; lâchées à côté, le ' +
            'registre le dit.',
        },
        {
          termine: 'Confirmer N propositions',
          testo:
            'Apparaît quand le PDF est rattaché à une demande : archive d’un seul geste toutes ' +
            'les pages dont le registre a déjà lu le nom.',
        },
        {
          termine: 'Contrôler une proposition',
          testo:
            'Sur la page, un rectangle marque où le nom a été lu, avec le nom à côté : **plein** ' +
            'quand il est dans le texte du PDF, **pointillé** quand c’est la lecture automatique ' +
            'qui l’a lu, elle qui connaît la bande et pas l’endroit exact. En s’arrêtant sur la ' +
            'page, on lit ses premiers mots.',
        },
        {
          termine: 'Le clic droit sur une page',
          testo:
            '**Attribuer à…** demande personne et document et archive : c’est la voie quand le ' +
            'nom ne se lit pas, ou quand un fichier contient deux dossiers différents. Puis ' +
            '**Relire le scan**, **Ouvrir dans la visionneuse**, **Jeter**.',
        },
        {
          termine: 'Lire et relire',
          testo:
            'En tête du cadre, **Lire les scans (N)** met en file les pages muettes, **Relire** ' +
            '— « Relire les N pages » quand il n’en reste aucune à lire — refait depuis le début ' +
            'toutes celles encore à trier ; parmi les commandes de la page, **Relire les scans** ' +
            'fait de même sur tous les PDF de la classe. **Arrêter** vide la file. Avec la ' +
            'lecture éteinte, le bouton dit **Lecture désactivée** et mène aux Paramètres.',
        },
        {
          termine: 'Les pages archivées',
          testo:
            'Elles disparaissent de la file. **Archivées (N)** les remet en vue avec le nom de ' +
            'qui les a prises ; clic droit, **La reprendre**, et le document sort du dossier de ' +
            'classe et la page redevient à trier.',
        },
        {
          termine: 'Déplacer vers…',
          testo:
            'La liste en tête du cadre envoie à une autre classe les pages qui restent : pour le ' +
            'scan qui couvre deux classes.',
        },
      ],
      note: [
        'Le fichier entre dans le document de l’année et l’original sur le disque reste où il ' +
          'était. Le PDF entier reste dedans tant qu’il en reste une page à décider.',
        'Une case déjà pleine refuse les pages et le dit : pour en mettre d’autres, on retire ' +
          'd’abord le document qui s’y trouve.',
        'La lecture automatique tourne sur cet ordinateur et prend des dizaines de secondes ' +
          'par page : on la lance, et pendant ce temps on trie les pages dont le nom est déjà ' +
          'connu.',
      ],
    },
    assenze: {
      titolo: 'Absences à faire signer',
      sommario:
        'Trois fois par an : les feuilles de l’école partent, l’e-mail demande la signature à ' +
        'l’entreprise, les feuilles reviennent signées.',
      scritte: {
        partono: 'les feuilles qui partent',
        richiesta: 'la demande',
        tornano: 'les feuilles qui reviennent',
        persona: 'Personne',
        assenze: 'abs.',
        ritardi: 'ret.',
        mail: 'e-mail',
        assenzeFirmate: 'abs. ✓',
        ritardiFirmati: 'ret. ✓',
        daSpedire: 'à envoyer',
        senzaDatore: 'sans employeur',
        faseDaSpedire: 'À envoyer',
        fogliCaricati: 'feuilles chargées',
        faseInAttesa: 'En attente',
        emailPartita: 'e-mail parti',
        faseFirmato: 'Signé',
        firmeTornate: 'signatures revenues',
      },
      figure: [
        {
          didascalia:
            'Une période à la fois : une ligne par personne, cinq cases, et en dessous les trois ' +
            'étapes que la colonne **État** résume.',
          legenda: [
            '**abs.** et **ret.** : les feuilles d’absences et de retards à envoyer. Le « + » en ' +
              'charge une.',
            '**e-mail** : l’enveloppe prépare la demande, la coche à côté la marque comme ' +
              'envoyée.',
            '**abs. ✓** et **ret. ✓** : les feuilles signées. En pointillé tant qu’on les attend.',
            '**État** : à envoyer, en attente, signé. Qui n’a pas de feuilles a la ligne éteinte.',
            '« sans employeur » : dans la fiche manque l’e-mail de l’employeur, qui doit signer.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Nouvelle période',
          testo:
            'Dans la barre d’actions. La période, *ce sont* ses deux dates, choisies dans le ' +
            'calendrier et proposées sur le semestre en cours : le registre en tire le nom du ' +
            'semestre, et les dates vont dans le nom des feuilles archivées et dans la lettre.',
        },
        {
          termine: 'La lettre à l’entreprise',
          testo:
            'Objet et texte s’écrivent une fois par période ; les variables entre accolades — ' +
            '`{allievo}`, `{azienda}`, `{periodo}`, `{rapporti}`… — se remplissent personne par ' +
            'personne. Un e-mail part pour chaque personne, en clair à l’adresse de ' +
            'l’employeur, avec ses seules feuilles.',
        },
        {
          termine: 'Aussi à',
          testo:
            `Dans le formulaire de la période : la ${FR.pif.singolare}, le ` +
            `${FR.rappresentante.singolare} et les adresses de contact fixes de la classe. Celles ` +
            'marquées « En copie de chaque nouvelle communication » sont déjà cochées.',
        },
        {
          termine: 'Faire entrer les feuilles',
          testo:
            '**Charger des PDF** ou le glisser-déposer, comme dans les archives : les pages se ' +
            'posent sur la case, et c’est la case qui dit quelle feuille elles sont. **Importer ' +
            'des feuilles** demande quelles feuilles ce sont, puis prend plusieurs fichiers à la ' +
            'fois et attribue chacun d’après le nom qu’il porte.',
        },
        {
          termine: 'Envoyer',
          testo:
            '**Préparer l’envoi (N)** prépare les demandes de toute la période ; N compte ceux ' +
            'qui ont une adresse, et qui n’en a pas reste de côté comme non envoyé. L’enveloppe ' +
            'd’une case **e-mail** fait de même pour une seule personne, la coche à côté la ' +
            'marque comme envoyée.',
        },
        {
          termine: 'Une demande non envoyée',
          testo:
            'La case **e-mail** montre l’avertissement, et en passant dessus on lit la raison — ' +
            'presque toujours une adresse à corriger dans la fiche. Dans la liste des périodes ' +
            'apparaît « N non envoyés ».',
        },
        {
          termine: 'Regarder un rapport',
          testo:
            'Une case pleine ouvre la feuille dans le cadre à côté : avant de les envoyer à ' +
            'l’entreprise, il faut les regarder, et les flèches passent à la suivante sans ' +
            'ouvrir vingt fenêtres.',
        },
        {
          termine: 'Chaque période en bref',
          testo:
            'Dans la liste : « 12/18 signés · 15 envoyés », « complet », et le crayon pour la ' +
            'modifier ou la supprimer. Au-dessus de la matrice, les comptes de la période ' +
            'ouverte : avec absences, envoyés, signés.',
        },
        {
          termine: 'Parmi les tâches en suspens',
          testo:
            'Chaque demande ouverte figure aussi dans les tâches en suspens, sous « À envoyer » ' +
            'ou « En attente de signature », avec **Préparer l’e-mail** et les boutons pour ' +
            'charger les feuilles signées. Le nom ramène à la bonne période.',
        },
      ],
      note: [
        'Signé veut dire que pour chaque feuille partie, une feuille signée est revenue : qui ' +
          'a envoyé absences et retards et ne reçoit en retour que les absences reste « en ' +
          'attente ».',
        'Une variable mal écrite reste telle quelle dans la lettre, entre accolades : on la ' +
          'voit dans le brouillon avant d’envoyer, au lieu qu’elle devienne un trou.',
        'Supprimer une période retire aussi du document de l’année toutes ses feuilles, ' +
          'signées ou non (elles ne vont pas dans la corbeille du système).',
      ],
    },
    assenzeSoglia: {
      titolo: TIPOLOGIE_FR.segnalazioni,
      sommario:
        'Qui a manqué plus d’heures que l’école n’en admet apparaît tout seul parmi les tâches ' +
        'en suspens, cours par cours.',
      scritte: {
        assenza: 'Absence au cours',
        conto: 'pér. manquées ÷ prévues',
        oltre: 'Au-delà du seuil ?',
        impostazioni: 'dans les Paramètres',
        daSegnalare: 'À signaler',
        completi: 'appels complets',
        daGuardare: 'À vérifier',
        incompleti: 'appels incomplets',
        sotto: 'sous le seuil :',
        sparisce: 'la ligne disparaît d’elle-même',
      },
      figure: [
        {
          didascalia:
            'Un signalement est un calcul, pas un état : il se refait à chaque ouverture, et ne ' +
            'se clôt pas à la main.',
          legenda: [
            'Un cours à la fois, sur le semestre où tombe aujourd’hui ; les leçons annulées ne ' +
              'comptent pas.',
            'Le seuil de l’école, en pour cent : 20 tant qu’on ne le change pas, 0 le désactive.',
            'Le cas « presse » seulement si l’appel existe pour toutes les leçons marquées ' +
              'données.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Où il se règle',
          testo:
            'Paramètres › Enseignement › **Évaluation**, cadre « Barème », champ « Signaler ' +
            'l’absence au-delà de ». Il est dans le document de l’année : c’est l’école qui le ' +
            'décide.',
        },
        {
          termine: 'Ce qui se compte',
          testo:
            'Les périodes manquées sur les périodes que l’horaire du cours prévoit dans le ' +
            'semestre. Qui manque souvent en mathématiques apparaît pour les mathématiques, pas ' +
            '« pour l’école ».',
        },
        {
          termine: 'À signaler ou à vérifier',
          testo:
            'Avec les appels complets, le cas va dans « À signaler », avec le pourcentage en ' +
            'rouge. S’il manque un appel, il va dans « À vérifier : appels incomplets », avec la ' +
            'pastille « appels à compléter » : on termine d’abord les appels.',
        },
        {
          termine: 'Ouvrir la fiche, Ouvrir le cours',
          testo:
            'Les deux boutons de la ligne : les leçons de cette personne une par une, ou le même ' +
            'pourcentage à côté de celui des autres.',
        },
        {
          termine: 'Aussi sur les feuilles',
          testo:
            'Le même seuil colore l’absence dans la fiche de la personne, et figure dans la ' +
            'feuille des présences du cours, sous « À suivre ».',
        },
      ],
      note: [
        'Au-delà veut dire au-delà : à 20 % avec le seuil à 20, on n’apparaît pas. Quand ' +
          'l’entier arrondi semblerait en dessous, le pourcentage s’affiche avec une ' +
          'décimale — 20,1 %.',
        'Le registre n’avertit personne et ne retient pas qui a déjà été signalé : il dit ' +
          'qu’il y a un cas, et où. Le vrai signalement reste un geste à toi.',
      ],
    },
    messaggistica: {
      titolo: 'Communications et adresses de contact',
      sommario:
        'La page **Messagerie** : écrire à la classe et aux familles, et à qui écrire.',
      scritte: {
        bozza: 'Brouillon',
        salvaBozza: 'Enr. le brouillon',
        preparaInvio: 'Préparer l’envoi',
        salvaEApri: 'ou Enr. et ouvrir',
        dalRegistro: 'Part du registre',
        casella: 'boîte + sans brouillon',
        eml: 'Fichier .eml',
        spedisciTu: 'c’est toi qui l’envoies',
        visto: 'coche',
        inviata: 'envoyée',
        dataDestinatari: 'date, destinataires',
      },
      figure: [
        {
          didascalia:
            'Avec la boîte connectée et « Envoyer sans brouillon » activé, c’est le registre qui ' +
            'envoie ; sinon le brouillon passe au programme de messagerie et la coche dit qu’il ' +
            'est parti.',
          legenda: [
            'Destinataires par groupes, toujours en copie cachée : personne ne voit les autres.',
            'Le registre demande confirmation une fois par envoi groupé, et marque tout seul ce ' +
              'qui est parti.',
            'Le fichier s’ouvre dans le programme de messagerie ; l’e-mail envoyé, la coche ' +
              'dans la liste.',
            'La coche sur une communication envoyée la remet en brouillon : la coche était une ' +
              'erreur.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Nouvelle communication',
          testo:
            'Dans la barre d’actions. **Objet**, **Texte**, et les destinataires par groupes : ' +
            `**${Molti(FR.pif)}**, **${Molti(FR.rappresentante)}**, les adresses de contact fixes. En ` +
            'dessous, on lit combien d’adresses cela donne et qui reste sans e-mail.',
        },
        {
          termine: 'Pièces jointes',
          testo:
            'Les documents personnels déjà collectés dans les archives — la circulaire, le ' +
            'formulaire — se joignent d’une coche. Le fichier part tel qu’il est le jour de ' +
            'l’envoi.',
        },
        {
          termine: 'Enregistrer le brouillon, Enregistrer et ouvrir dans la messagerie',
          testo:
            'Le premier la garde dans la liste ; le second l’enregistre et la prépare tout de ' +
            'suite, après une confirmation avec le nombre de destinataires. Avec « Envoyer sans ' +
            'brouillon », une deuxième confirmation arrive avant l’envoi.',
        },
        {
          termine: 'La liste',
          testo:
            'Les communications de la période choisie, de la plus récente à la plus ancienne, ' +
            'avec leur état : **brouillon**, **envoyée**, ou **erreur** si l’envoi depuis le ' +
            'registre a échoué. Chaque brouillon a **Préparer l’envoi** et la coche ; un clic ' +
            'sur l’objet le rouvre, et une communication envoyée ne se fait plus que lire.',
        },
        {
          termine: 'Envoyer depuis le registre',
          testo:
            'Dans Paramètres › **Communications** : **Connecter la boîte** demande l’adresse et ' +
            'ouvre le navigateur sur la page de connexion Microsoft, **Tester la connexion** ' +
            'vérifie sans rien envoyer. Puis on active « Envoyer sans brouillon », sous « Quand ' +
            'ça part », qui est désactivé par défaut.',
        },
        {
          termine: 'La signature',
          testo:
            'Elle ne s’écrit pas dans le texte. Dans le brouillon, c’est le programme de ' +
            'messagerie qui la met ; quand le registre envoie, c’est celle écrite dans ' +
            'Paramètres › **Communications**.',
        },
        {
          termine: 'Adresses de contact',
          testo:
            'Les adresses fixes de la classe — secrétariat, école, délégué de classe — avec ' +
            '**Nouvelle adresse de contact**. « En copie de chaque nouvelle communication » la ' +
            'coche d’office dans les nouvelles communications et les nouvelles périodes ' +
            `d’absences. En haut, combien de ${FR.pif.plurale} ont une adresse.`,
        },
        {
          termine: 'Retirer une communication',
          testo:
            'Depuis son formulaire, même si elle est envoyée : sa trace disparaît du registre, ' +
            'l’e-mail reste dans les boîtes de ceux qui l’ont reçu.',
        },
      ],
      note: [
        'Les adresses sont relevées au moment de l’envoi, pas au moment où l’on écrit : un ' +
          'e-mail corrigé en milieu d’année vaut aussi pour les brouillons de septembre.',
        'Dans les envois de plusieurs messages — demandes de signature, documents par e-mail ' +
          '— les brouillons ne s’ouvrent pas tous : ils arrivent dans le dossier de l’année, ' +
          'dans `bozze/` sous le nom de la classe, qui s’ouvre tout seul. Un seul s’ouvre ' +
          'directement. Si l’envoi depuis le registre échoue, on se rabat sur les brouillons.',
        'Ce qui part ne se rappelle pas : aucune touche du registre ne le retire des boîtes.',
      ],
    },
  },
  en: {
    docente: {
      titolo: Uno(EN.docenteClasse),
      sommario:
        'The second job, one class at a time: what’s still open, the documents to collect, ' +
        'the absences to get signed, the messages.',
      scritte: {
        pendenzeClasse: 'Class pending items',
        archivio: 'Document archive',
        assenze: 'Absences',
        messaggistica: 'Messages',
        classe: 'Class: 3A',
        periodo: 'Period: Sem. 1',
        nuovaPendenza: 'New pending item',
        daFirmare: TIPOLOGIE_EN.assenze,
        oltreSoglia: TIPOLOGIE_EN.segnalazioni,
        momenti: TIPOLOGIE_EN.consegnaClasse,
        consegnaClasse: TIPOLOGIE_EN.svolgeClasse,
        inRitardo: '2 overdue',
        altre: '…and the other types, only when they aren’t empty',
      },
      figure: [
        {
          didascalia:
            'The **Class pending items** page: everything still open in that class, in every ' +
            'subject, one type per row.',
          legenda: [
            `The **${Uno(EN.docenteClasse)}** group in the sidebar: four pages for the chosen ` +
              'class.',
            'The **Class** drop-down says which class file you’re on; **Period** narrows grids, ' +
              'periods and messages to the semester.',
            '**New pending item**, in the action bar.',
            'One row per type, with the count of what’s open.',
            '“N overdue”, the only coloured thing in a type’s header: what’s pressing now.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Turning it on',
          testo:
            'In **Classes**, in the class **Details**, the “I’m the class teacher” tick. The ' +
            'group in the sidebar appears with the first ticked class and disappears with the ' +
            'last.',
        },
        {
          termine: 'The four types',
          testo:
            'Absences to get signed, absences over the threshold, and assignments the class or ' +
            'individual students must hand in or complete. Assignments sit in deadline groups: ' +
            'overdue, today, within the week, later. Assessments and the teacher’s own work do ' +
            'not appear here.',
        },
        {
          termine: 'New pending item',
          testo:
            'Opens the form for an assignment owed by the class or by individual students. The ' +
            'course is chosen explicitly in the form. With no course in that class, the command ' +
            'is off: every assignment belongs to a course.',
        },
        {
          termine: 'What counts as “overdue”',
          testo:
            'An assignment owed by the class and past its deadline, a signature request still ' +
            'to send, or a case over the threshold with complete attendance.',
        },
        {
          termine: 'Class list',
          testo:
            'In the action bar of all four pages: takes you to **Classes**, on this class, where ' +
            'people are added and removed.',
        },
        {
          termine: 'The class file as a PDF',
          testo:
            `${Molti(EN.pif)} with their contact details, documents collected, absence periods: ` +
            'the PDF to leave to whoever takes over. It’s made from **Documents**, box “For the class”, ' +
            'with a course of that class chosen.',
        },
        {
          termine: 'In a person’s record',
          testo:
            `The **${Uno(EN.docenteClasse)}** tab only exists for these classes: the documents ` +
            'requested from them and their absences to get signed, period by period.',
        },
      ],
      note: [
        `A course’s **${Molti(EN.pendenza)}** page is separate and shows the selected course. ` +
          'When an assignment owed by the class is completed, this view updates too.',
      ],
    },
    archivio: {
      titolo: 'Document archive',
      sommario:
        `What was requested and who brought it: ${EN.pif.plurale} in rows, documents in ` +
        'columns.',
      scritte: {
        richieste: 'requests 3',
        fogliRaccolti: 'sheets 12',
        inAttesa: 'waiting 5',
        scadute: 'overdue 1',
        daDividere: 'To split',
        pdf: 'reports.pdf · 24 pages',
        persona: 'Person',
        pagella: 'Report',
        certificato: 'Cert.',
        circolare: 'Circular',
        suoi: 'Theirs',
        firme: 'Handover sig.',
        nome: 'Rossi Maria',
        conto: '3 of 12',
      },
      figure: [
        {
          didascalia:
            'By column you see how far the class has got, by row how far one person has got. ' +
            'The frame on the right only appears with a sheet open.',
          legenda: [
            'The counts: requests, personal, sheets collected, waiting, and overdue when there ' +
              'are some.',
            'The PDFs still to split: a click opens their pages in the frame.',
            'A column header: “done/recipients” and the deadline. A click opens the assignment.',
            'The **Handover signatures** row: one box for each request that asks for them.',
            'A box: the action, the file and the bin.',
            '**Theirs**: how many of the requests that concern the person they have closed.',
            'The open sheet, with the arrows to the next, “3 of 12”, open outside and bin.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Request a document',
          testo:
            'Opens the form for an assignment ticked off by handing in a document, for the whole ' +
            'class: you say **Which document** it is and **Who brings it** — “The learners hand ' +
            'it in to me” or “I hand it out to the learners”. A column is born. With no course ' +
            'in the class the command is off.',
        },
        {
          termine: 'Personal document',
          testo:
            'A “Me” collection: the circular, the form to keep ready. It isn’t a column: it sits ' +
            'above the grid, in **Personal documents**, “expected” or “collected”. A click on ' +
            'the name chooses the file; once collected it can be attached to a message.',
        },
        {
          termine: 'The box',
          testo:
            'On the left the action — they brought it, or you gave it to them —, which turns ' +
            'into a warning when the deadline has passed. In the middle the file: if it’s ' +
            'missing you attach it from disk, if it’s there you view it. On the right the bin. ' +
            'Anyone who wasn’t among the recipients has a “+” that adds them.',
        },
        {
          termine: 'Handing out by email',
          testo:
            'With “I hand it out to the learners” and **How I hand it out** “By email, one by ' +
            'one”, **Prepare to send (N)** appears at the top of the column: one message each ' +
            'with their document attached, for whoever hasn’t received it yet.',
        },
        {
          termine: 'Handover signatures',
          testo:
            'Ticking “A signed hand-over sheet is needed” in the form gives the top row a box ' +
            'under that column: a single sheet for the whole request, proof that it was handed ' +
            'out. It also takes pages dragged from a PDF.',
        },
        {
          termine: 'Viewing a sheet',
          testo:
            'A filled box opens the document in the frame beside it, and the arrows move to the ' +
            'next sheet in grid order: twenty scans are checked in a row. If the file is gone, ' +
            'the frame says so instead of showing a blank.',
        },
      ],
      note: [
        'Two facts, two buttons: the action and the file don’t coincide. You tick it this ' +
          'morning and scan it tonight; the school report ready for three days is handed out ' +
          'on Monday.',
        'The frame’s bin removes the file and takes the tick back. The file leaves the year’s ' +
          'document (it doesn’t go to the system recycle bin), and it’s often the only copy ' +
          'there is.',
      ],
    },
    archivioPdf: {
      titolo: 'Splitting a class PDF',
      sommario:
        'The school office sends a single file for the whole class: the pages are dropped on ' +
        'the box of the person they belong to, and the register cuts them out and files them.',
      scritte: {
        pdf: 'Class PDF',
        trascinato: 'dragged or loaded',
        pagine: 'Pages',
        testoOScansione: 'text or scan',
        proposta: 'Suggestion',
        nomeLetto: 'the name read',
        casella: 'Box',
        personaDocumento: 'person × document',
        aMano: 'dragged by hand',
        conferma: 'Confirm N suggestions',
        sottoOgni: 'Under each page, a single tag:',
        nome: 'Rossi Maria',
        daLeggere: 'to read',
        nessunNome: 'no name',
        inCoda: 'queued',
        archiviata: 'Rossi Maria ✓',
      },
      figure: [
        {
          didascalia:
            'The register suggests, whoever is looking decides: nothing is filed without an ' +
            'action, be it a drag or a confirmation.',
          legenda: [
            'The file comes in without questions: whose it is gets said afterwards.',
            'Pages with text are read at once; silent scans wait for automatic reading.',
            'The recognised name becomes a suggestion, written under the page.',
            'The box where person and document cross: a filled box isn’t overwritten.',
            'The suggested name: with the magnifier if automatic reading found it, with the ' +
              'sheet if it was in the PDF’s text.',
            '**to read** is a silent scan; **no name**, a page read without anyone from the ' +
              'class.',
            'Green tick: already filed for that person.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Bringing the PDFs in',
          testo:
            'Drag them onto the page — the whole page is the letterbox — or use **Load ' +
            'PDFs**. PDFs only. The first one in opens by itself, as pages, ready to split.',
        },
        {
          termine: 'To split',
          testo:
            'PDFs with pages that belong to nobody yet sit in a row above the grid. The ' +
            '**Pages** / **Read** button switches from thumbnails to the PDF viewer, for when ' +
            'you really have to read; the slider at the top enlarges the thumbnails.',
        },
        {
          termine: 'Choosing pages',
          testo:
            'A click chooses a page, **Ctrl** adds more, **Shift** takes a range. With pages ' +
            'chosen, the bin appears — for the scanner’s cover sheet, a blank page — along with ' +
            '**Let go**, which releases them.',
        },
        {
          termine: 'Dragging them',
          testo:
            'Onto the box where the person crosses the document: the whole box is a target, and ' +
            'boxes light up while you drag. If the PDF already knows which document it belongs ' +
            'to, the person’s **row** is enough. Esc cancels; dropped outside, the register ' +
            'says so.',
        },
        {
          termine: 'Confirm N suggestions',
          testo:
            'Appears when the PDF is linked to a request: files in one go all the pages whose ' +
            'name the register has already read.',
        },
        {
          termine: 'Checking a suggestion',
          testo:
            'On the page a rectangle marks where the name was read, with the name beside it: ' +
            '**solid** when it’s in the PDF’s text, **dashed** when automatic reading found it, ' +
            'which knows the strip and not the exact spot. Hovering over the page shows its ' +
            'first words.',
        },
        {
          termine: 'Right-clicking a page',
          testo:
            '**Assign to…** asks for person and document and files it: the way to go when the ' +
            'name can’t be read, or when one file holds two different matters. Then **Reread ' +
            'the scan**, **Open in the viewer**, **Throw away**.',
        },
        {
          termine: 'Reading and rereading',
          testo:
            'At the top of the frame, **Read the scans (N)** queues the silent pages, **Reread** ' +
            '— “Reread the N pages” when none is left to read — redoes from scratch all those ' +
            'still to sort; among the page’s commands, **Reread the scans** does the same for ' +
            'all the class’s PDFs. **Stop** empties the queue. With reading off, the button ' +
            'says **Reading off** and takes you to the Settings.',
        },
        {
          termine: 'Filed pages',
          testo:
            'They vanish from the row. **Archived (N)** brings them back into view with the name ' +
            'of whoever took them; right-click, **Take it back**, and the document leaves the ' +
            'class file and the page is back to sort.',
        },
        {
          termine: 'Move to…',
          testo:
            'The drop-down at the top of the frame sends the remaining pages to another class: ' +
            'for a scan that spans two classes.',
        },
      ],
      note: [
        'The file goes into the year’s document and the original on disk stays where it was. ' +
          'The whole PDF stays inside as long as one page is still to be decided.',
        'A box that’s already filled refuses pages and says so: to put others in, first ' +
          'remove the document that’s there.',
        'Automatic reading runs on this computer and takes tens of seconds per page: start ' +
          'it, and meanwhile sort the pages whose names are already known.',
      ],
    },
    assenze: {
      titolo: 'Absences to get signed',
      sommario:
        'Three times a year: the school’s sheets go out, the email asks the company for a ' +
        'signature, the sheets come back signed.',
      scritte: {
        partono: 'sheets going out',
        richiesta: 'the request',
        tornano: 'sheets coming back',
        persona: 'Person',
        assenze: 'abs.',
        ritardi: 'late',
        mail: 'email',
        assenzeFirmate: 'abs. ✓',
        ritardiFirmati: 'late ✓',
        daSpedire: 'to send',
        senzaDatore: 'no employer',
        faseDaSpedire: 'To send',
        fogliCaricati: 'sheets uploaded',
        faseInAttesa: 'Waiting',
        emailPartita: 'email sent',
        faseFirmato: 'Signed',
        firmeTornate: 'signatures back',
      },
      figure: [
        {
          didascalia:
            'One period at a time: a row per person, five boxes, and below them the three stages ' +
            'the **Status** column sums up.',
          legenda: [
            '**abs.** and **late**: the absence and late-arrival sheets to send. The “+” uploads ' +
              'one.',
            '**email**: the envelope prepares the request, the tick next to it marks it as sent.',
            '**abs. ✓** and **late ✓**: the signed sheets. Dashed while you wait for them.',
            '**Status**: to send, waiting, signed. Anyone with no sheets has the row greyed out.',
            '“no employer”: the record lacks the email of the employer, who has to sign.',
          ],
        },
      ],
      voci: [
        {
          termine: 'New period',
          testo:
            'In the action bar. The period *is* its two dates, chosen from the calendar and ' +
            'suggested on the current semester: the register takes the name from the semester, ' +
            'and the dates go into the names of the filed sheets and into the letter.',
        },
        {
          termine: 'The letter to the company',
          testo:
            'Subject and text are written once per period; the placeholders in curly brackets — ' +
            '`{allievo}`, `{azienda}`, `{periodo}`, `{rapporti}`… — are filled in person by ' +
            'person. One email per person goes out, openly addressed to the employer, with ' +
            'only their own sheets.',
        },
        {
          termine: 'Also to',
          testo:
            `In the period’s form: the ${EN.pif.singolare}, the ${EN.rappresentante.singolare} ` +
            'and the class’s fixed contact addresses. Those marked “Copied on every new message” are ' +
            'already ticked.',
        },
        {
          termine: 'Bringing the sheets in',
          testo:
            '**Load PDFs** or dragging, as in the archive: the pages are dropped on the box, ' +
            'and it’s the box that says which sheet they are. **Import sheets** asks which ' +
            'sheets they are, then takes several files at once and assigns each by the name it ' +
            'bears.',
        },
        {
          termine: 'Sending',
          testo:
            '**Prepare to send (N)** prepares the requests for the whole period; N counts those ' +
            'with an address, and anyone without one is left behind as not sent. The envelope in ' +
            'an **email** box does the same for a single person, the tick next to it marks it as ' +
            'sent.',
        },
        {
          termine: 'A request not sent',
          testo:
            'The **email** box shows the warning, and hovering over it gives the reason — almost ' +
            'always an address to correct in the record. The list of periods shows “N not sent”.',
        },
        {
          termine: 'Viewing a report',
          testo:
            'A filled box opens the sheet in the frame beside it: before sending them to the ' +
            'company they should be checked, and the arrows move to the next without opening ' +
            'twenty windows.',
        },
        {
          termine: 'Each period at a glance',
          testo:
            'In the list: “12/18 signed · 15 sent”, “complete”, and the pencil to change or ' +
            'delete it. Above the grid, the open period’s counts: with absences, sent, signed.',
        },
        {
          termine: 'Among the pending items',
          testo:
            'Every open request is also among the pending items, under “To send” or “Waiting for ' +
            'signature”, with **Prepare the email** and the buttons to upload the signed ' +
            'sheets. The name takes you back to the right period.',
        },
      ],
      note: [
        'Signed means that for every sheet sent out a signed one has come back: anyone who ' +
          'sent absences and late arrivals and gets back only the absences stays “waiting”.',
        'A misspelt placeholder stays in the letter as it is, in curly brackets: you see it ' +
          'in the draft before sending, instead of it turning into a gap.',
        'Deleting a period also removes all its sheets from the year’s document, unsigned and ' +
          'signed (they don’t go to the system recycle bin).',
      ],
    },
    assenzeSoglia: {
      titolo: TIPOLOGIE_EN.segnalazioni,
      sommario:
        'Anyone who has missed more hours than the school allows shows up by themselves among ' +
        'the pending items, course by course.',
      scritte: {
        assenza: 'Absence in the course',
        conto: 'periods missed ÷ scheduled',
        oltre: 'Over the threshold?',
        impostazioni: 'in Settings',
        daSegnalare: 'To report',
        completi: 'attendance complete',
        daGuardare: 'To check',
        incompleti: 'attendance incomplete',
        sotto: 'below the threshold:',
        sparisce: 'the row disappears by itself',
      },
      figure: [
        {
          didascalia:
            'A flag is a calculation, not a state: it’s redone every time you open it, and it ' +
            'isn’t closed by hand.',
          legenda: [
            'One course at a time, over the semester today falls in; cancelled lessons don’t ' +
              'count.',
            'The school’s threshold, as a percentage: 20 until you change it, 0 turns it off.',
            'The case is “pressing” only if attendance was taken for every lesson marked held.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Where to set it',
          testo:
            'Settings › Teaching › **Assessment**, box “Grading scale”, field “Flag absence ' +
            'above”. It lives in the year’s document: the school decides it.',
        },
        {
          termine: 'What is counted',
          testo:
            'The periods missed out of those the course timetable sets for the semester. Anyone ' +
            'often missing maths shows up for maths, not “for school”.',
        },
        {
          termine: 'To report or to check',
          testo:
            'With complete attendance the case goes under “To report”, with the percentage in ' +
            'red. If attendance is missing it goes under “To check: incomplete attendance”, with ' +
            'the tag “attendance to complete”: finish taking attendance first.',
        },
        {
          termine: 'Open the record, Open the course',
          testo:
            'The row’s two buttons: that person’s lessons one by one, or the same percentage ' +
            'next to everyone else’s.',
        },
        {
          termine: 'On the sheets too',
          testo:
            'The same threshold colours the absence in the person’s record, and appears on the ' +
            'course’s attendance sheet, under “To follow up”.',
        },
      ],
      note: [
        'Over means over: at 20% with the threshold at 20 you don’t show up. When the rounded ' +
          'whole number would seem to be inside, the percentage is shown with one decimal — ' +
          '20.1%.',
        'The register tells no one and doesn’t remember who has already been reported: it ' +
          'says there is a case, and where. The actual report is still up to you.',
      ],
    },
    messaggistica: {
      titolo: 'Messages and contact addresses',
      sommario:
        'The **Messages** page: writing to the class and the families, and who to write to.',
      scritte: {
        bozza: 'Draft',
        salvaBozza: 'Save draft',
        preparaInvio: 'Prepare to send',
        salvaEApri: 'or Save and open',
        dalRegistro: 'Sent by the register',
        casella: 'mailbox + no draft',
        eml: '.eml file',
        spedisciTu: 'you send it',
        visto: 'tick',
        inviata: 'sent',
        dataDestinatari: 'date and recipients',
      },
      figure: [
        {
          didascalia:
            'With the mailbox connected and “Send without a draft” on, the register sends; ' +
            'otherwise the draft goes to your email program and the tick says it has gone.',
          legenda: [
            'Recipients by group, always in Bcc: nobody sees the others.',
            'The register asks for confirmation once per batch, and marks what has gone by ' +
              'itself.',
            'The file opens in your email program; once the email is sent, the tick in the list.',
            'The tick on a sent message turns it back into a draft: the tick was a mistake.',
          ],
        },
      ],
      voci: [
        {
          termine: 'New message',
          testo:
            'In the action bar. **Subject**, **Text**, and the recipients by group: ' +
            `**${Molti(EN.pif)}**, **${Molti(EN.rappresentante)}**, the fixed contact addresses. ` +
            'Below, you can read how many addresses that makes and who is left without an email.',
        },
        {
          termine: 'Attachments',
          testo:
            'Personal documents already collected in the archive — the circular, the form — are ' +
            'attached with a tick. The file goes out as it is on the day it’s sent.',
        },
        {
          termine: 'Save draft, Save and open in email',
          testo:
            'The first keeps it in the list; the second saves it and prepares it at once, after ' +
            'a confirmation with the number of recipients. With “Send without a draft” a second ' +
            'confirmation comes before sending.',
        },
        {
          termine: 'The list',
          testo:
            'The messages of the chosen period, newest first, with their status: **draft**, ' +
            '**sent**, or **error** if sending from the register didn’t work. Every draft has ' +
            '**Prepare to send** and the tick; a click on the subject reopens it, and a sent one ' +
            'can only be read.',
        },
        {
          termine: 'Sending from the register',
          testo:
            'In Settings › **Communications**: **Connect the mailbox** asks for the address and opens ' +
            'the browser on the Microsoft sign-in page, **Test the connection** checks without ' +
            'sending anything. Then turn on “Send without a draft”, under “When it goes out”, ' +
            'which is off by default.',
        },
        {
          termine: 'The signature',
          testo:
            'It isn’t written in the text. In the draft your email program adds it; when the ' +
            'register sends, the one written in Settings › **Communications** is used.',
        },
        {
          termine: 'Contact addresses',
          testo:
            'The class’s fixed addresses — school office, school site, class representative — ' +
            'with **New contact address**. “Copied on every new message” ticks it automatically ' +
            'in new messages and new absence periods. At the top, how many ' +
            `${EN.pif.plurale} have an address.`,
        },
        {
          termine: 'Removing a message',
          testo:
            'From its form, even if sent: its record in the register disappears, the email stays ' +
            'in the mailboxes of those who received it.',
        },
      ],
      note: [
        'Addresses are looked up at the moment of sending, not when you write: an email ' +
          'corrected mid-year also applies to September’s drafts.',
        'In batches of several messages — signature requests, documents by email — the drafts ' +
          'don’t all open: they go into the year’s folder, in `bozze/` under the class name, ' +
          'which opens by itself. A single one opens directly. If sending from the register ' +
          'fails, it falls back on drafts.',
        'What has gone can’t be recalled: no key in the register takes it out of the ' +
          'mailboxes.',
      ],
    },
  },
})
