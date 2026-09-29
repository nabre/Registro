// I testi della guida, parte «Il programma»: modelli linguistici, assistente,
// contesto, dettatura, che cosa esce dal computer. Una chiave per sezione
// (`TestiSezione`, testa di `types.ts`); struttura in `assistant.ts`.
// Nomi di prodotti (voicebox, Whisper, Hugging Face, llama.cpp) e di procedure
// (`corso.presenze`) non si traducono. Assistente e dettatura usano la lingua
// del registro (`lingua: lingua()` in `data/dictation.ts`).

import { catalogo } from '../../../../core/i18n/index.js'
import { Molti, PIF, Uno, dei, i } from '../../../../core/dominio/lexicon.js'
import { lessico } from '../../../../core/dominio/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  modelliLinguistici: {
    titolo: 'Assistente e modelli',
    sommario:
      'Impostazioni › Programma › **Assistente e modelli**: chi risponde per ogni uso, e i ' +
      'file dei modelli sul computer: scaricarli, sceglierli, toglierli.',
    scritte: {
      impostazioni: 'Impostazioni',
      guida: 'Guida',
      chiRisponde: 'Chi risponde',
      assistente: 'Assistente',
      pronto: 'pronto',
      scansioni: 'Scansioni',
      nessuno: '— nessuno —',
      spento: 'spento',
      dettatura: 'Dettatura',
      sulComputer: 'Sul computer',
      cartella: 'Cartella dei modelli',
      peso: '4,7 GB',
      trascina: 'Trascina qui un .gguf, oppure',
      caricaFile: 'Carica un file…',
      scaricaModelli: 'Scarica modelli',
      avanzate: 'Avanzate (1)',
    },
    figure: [
      {
        didascalia:
          'La sezione dall’alto: in cima chi risponde, sotto la cartella e i file che ci sono, ' +
          'in fondo due gruppi chiusi. Mentre un file scende, sopra tutto compare **Sta ' +
          'scendendo**.',
        legenda: [
          '**Chi risponde**: una riga per uso, con l’interruttore, la tendina del modello e lo ' +
            'stato — «pronto», «manca qualcosa» o «spento» — con il motivo.',
          '**Sul computer**: la **Cartella dei modelli**, i file con il peso e il cestino, e il ' +
            'riquadro dove trascinarne uno.',
          '**Scarica modelli**: i consigliati, i file di un deposito, la ricerca su Hugging ' +
            'Face. Si apre da sé solo se non c’è ancora nessun modello.',
          '**Avanzate**: la **Porta di voicebox**. Chiuso, si apre a mano.',
        ],
      },
    ],
    voci: [
      {
        termine: 'A che cosa servono',
        testo:
          'A tre usi: l’**assistente**, che risponde alle domande sul registro, la **lettura ' +
          'delle scansioni**, che cerca i nomi nei PDF senza testo, e la **dettatura**, che ' +
          'scrive quel che dici. I primi due hanno il loro modello: un file `.gguf`, da mezzo ' +
          'gigabyte a sei. La dettatura si appoggia a voicebox.',
      },
      {
        termine: 'Chi risponde',
        testo:
          'Tre righe in cima, una per uso, ognuna con il suo interruttore e il suo stato: ' +
          '«pronto», «manca qualcosa» o «spento», con il motivo. **Assistente**: la tendina ' +
          'del modello, uno che sappia chiamare gli strumenti. **Lettura delle scansioni**: il ' +
          'modello che guarda, la tendina del **proiettore (mmproj)** — il file con `mmproj` ' +
          'nel nome — e il **Programma di lettura**. **Dettatura**: il **Modello della voce**; ' +
          'accesa, ricorda che voicebox dev’essere aperto. Un modello si sceglie solo da ' +
          'queste tendine.',
      },
      {
        termine: 'Programma di lettura',
        testo:
          'Il programma che fa leggere le scansioni al modello. **Lo scarica il registro**, di ' +
          'serie: la prima volta che serve prende da sé `llama-mtmd-cli`, in una versione ' +
          'fissa, e ne controlla l’impronta. **Questo .exe**: una copia tua, per esempio con ' +
          'l’accelerazione della scheda video; mostra il percorso e **Sfoglia…**, e finché non ' +
          'scegli un file vale la scelta di prima. **Non scaricare**, su una connessione a ' +
          'consumo: il registro non prende niente da internet.',
      },
      {
        termine: 'I consigliati',
        testo:
          'Nel gruppo chiuso **Scarica modelli**, che si apre da sé solo se non c’è ancora ' +
          'nessun modello. Per l’assistente **Qwen 2.5 — 7 miliardi** (circa 5 GB, vuole 8 GB di memoria ' +
          'libera) o **Qwen 2.5 — 3 miliardi** (2 GB, più rapido ma sbaglia più spesso). Per le ' +
          'scansioni **Qwen 2.5 VL** (6 GB, legge anche la scrittura a mano) o **SmolVLM** ' +
          '(sotto 1 GB, solo stampato).',
      },
      {
        termine: 'Scaricare',
        testo:
          '**Scarica** prende il taglio consigliato e, arrivato in fondo, lo sceglie per il suo ' +
          'mestiere, se intanto non ne hai scelto un altro. Non accende l’uso: se era spento, ' +
          'l’interruttore in **Chi risponde** si gira a mano. Per un modello che guarda, il ' +
          'proiettore si scarica dopo, dall’elenco dei file che si apre sotto, e si sceglie a ' +
          'mano nella sua tendina.',
      },
      {
        termine: 'Mentre scende',
        testo:
          'Scende un file alla volta: gli altri si mettono in fila con **Metti in coda**. In ' +
          'cima alla pagina la scheda **Sta scendendo** dice a che punto è, e **Ferma** lo ' +
          'interrompe.',
      },
      {
        termine: 'Uno scarico rimasto a metà',
        testo:
          'Resta nell’elenco con «sceso a metà»: **Riprendi** riparte da dov’era, non da capo; ' +
          '**Butta** libera lo spazio.',
      },
      {
        termine: 'Un file che hai già',
        testo:
          'Si trascina nel riquadro tratteggio di **Sul computer**, o si prende con **Carica un ' +
          'file…**: il registro lo copia nella cartella dei modelli.',
      },
      {
        termine: 'Cerca su Hugging Face',
        testo:
          'In fondo a **Scarica modelli**, per chi sa che cosa vuole: «qwen», «vision», «7b», ' +
          'poi **Cerca**. **Vedi i file** ' +
          'mostra i tagli di un deposito, con il peso e «consigliato» dove vale. I depositi con ' +
          '«chiede il permesso» da qui non si scaricano.',
      },
      {
        termine: 'Togliere un modello',
        testo:
          'Il cestino accanto al file, poi **Togli** nella conferma: il file si cancella dal ' +
          'disco. Se era al lavoro, il registro lo scarica dalla memoria prima.',
      },
      {
        termine: 'Dove stanno',
        testo:
          'Un posto solo: il campo **Cartella dei modelli**, in **Sul computer**. Vuoto, ci ' +
          'pensa il registro, e sotto si legge dove stanno: di serie accanto alle impostazioni ' +
          'del programma. Per un altro disco, o per modelli già scaricati altrove, si indica ' +
          'un’altra cartella: il registro li vede tutti senza copiarli.',
      },
      {
        termine: 'Porta di voicebox',
        testo:
          'Nel gruppo chiuso **Avanzate**, in fondo: la porta su cui risponde voicebox, da 1 a ' +
          '65535, di serie 17493. L’host è fisso, 127.0.0.1: la voce non esce dal computer.',
      },
    ],
    note: [
      'Per cominciare basta il primo dei consigliati. Il 3 miliardi è per le macchine ' +
        'senza scheda video o con poca memoria; la scheda video, se c’è, il registro la usa ' +
        'da sé.',
      'Il modello dell’assistente si carica dentro il registro; per le scansioni il ' +
        'registro fa partire un programma di llama.cpp, che di serie si scarica da sé la prima ' +
        'volta (una ventina di MB). Nessuno dei due è un servizio da installare.',
    ],
  },
  assistente: {
    titolo: 'Assistente',
    sommario:
      'Chiedi del registro a parole tue: un modello sul computer legge i dati e risponde. ' +
      'Non scrive niente.',
    scritte: {
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      corso: 'Corso',
      proietta: 'Proietta',
      assistente: 'Assistente',
      nonScrive: 'modello · non scrive',
      chiedi: 'Chiedi',
    },
    figure: [
      {
        didascalia:
          'Il riquadro si apre a destra e la pagina si stringe, senza essere coperta: si chiede ' +
          'mentre si guarda la cosa di cui si chiede.',
        legenda: [
          'Il pulsante col robot, accanto a **Proietta**: apre e chiude il riquadro.',
          'Il filtro del contesto: che cosa il modello sa della pagina.',
          'Stacca il riquadro in una finestra sua. Accanto, il cestino e la crocetta.',
          'Le letture che il modello ha fatto, col nome della procedura.',
          'I dati letti, impaginati dal registro: non ricopiati dal modello.',
          'La casella, il microfono della dettatura e **Chiedi**.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Accenderlo',
        testo:
          'È spento di serie. In Impostazioni › Programma › **Assistente e modelli**, nella ' +
          'riga **Assistente** di **Chi risponde**, si sceglie un modello e si accende. Da quel momento, a destra della riga ' +
          'delle tendine, accanto a **Proietta**, compare il pulsante col robot.',
      },
      {
        termine: 'Chiedere',
        tasti: 'Invio / Maiusc+Invio',
        testo:
          'Si scrive nella casella e Invio, o **Chiedi**; Maiusc+Invio va a capo. Mentre ' +
          'risponde, **Ferma** lo ferma davvero: il modello smette di leggere, e al posto della ' +
          'risposta resta «Fermato.». Esc chiude il riquadro, ma non ferma la risposta.',
      },
      {
        termine: 'Che cosa sa leggere',
        testo:
          'Corsi e classi, presenze e medie per semestre, chi supera la soglia di assenze, la ' +
          `scheda e i recapiti ${dei(PIF)}, le ore a calendario, l’appello di un’ora, ` +
          'la prossima lezione, voti e momenti di valutazione, piani, pendenze aperte, la ' +
          'mappa e un riassunto del registro in cifre.',
      },
      {
        termine: 'Aprire una pagina',
        testo:
          '«Portami alle valutazioni della 4a»: oltre a leggere, l’assistente può spostare il ' +
          'registro su una pagina. Si torna indietro come sempre, con un clic.',
      },
      {
        termine: 'Che cosa non fa',
        testo:
          'Non segna, non corregge, non spedisce: le procedure che scrivono non gli arrivano, ' +
          'e nessuna impostazione glielo concede. La testata lo ricorda: «non scrive».',
      },
      {
        termine: 'Controllare una risposta',
        testo:
          'In testa alla risposta stanno le procedure che ha aperto (`corso.presenze`), con una ' +
          'spunta o, se non sono riuscite, il motivo. Sotto, i dati letti in tabella; se sono ' +
          'tagliati, lo dice: «Se ne vedono 12 di 25».',
      },
      {
        termine: 'La nota sotto la risposta',
        testo:
          '«Ho finito le letture che posso fare per una domanda»: il modello ha aperto tutte le ' +
          'procedure che un giro concede, e ha risposto con quel che aveva letto fin lì. Se manca ' +
          'qualcosa, chiedi una cosa più stretta.',
      },
      {
        termine: 'Domande di seguito',
        testo:
          '«E in seconda?», «e la settimana scorsa?»: l’assistente ricorda la conversazione e ' +
          'le persone e i corsi che ha già trovato, e non li ricerca ogni volta.',
      },
      {
        termine: 'In una finestra sua',
        testo:
          'Il pulsante con i due riquadri, nella testata, porta la conversazione in una ' +
          'finestra che si sposta e si allarga, anche a metà di una risposta. **Riattacca** la ' +
          'riporta nel riquadro, anche con una risposta in corso; chiusa dalla crocetta, la ' +
          'conversazione se ne va con lei, e la risposta che stava aspettando si ferma.',
      },
      {
        termine: 'Dimenticare',
        testo:
          'La conversazione non si salva da nessuna parte: chiudendo il registro si perde, e il ' +
          'cestino **Dimentica la conversazione** la toglie subito.',
      },
      {
        termine: 'Se è lento',
        testo:
          'La prima domanda carica il modello, dai cinque ai trenta secondi; poi resta in ' +
          'memoria. Senza scheda video una risposta può chiedere più di un minuto, e più ' +
          'classi tocca più ci mette. Un modello più piccolo, scelto in Impostazioni › ' +
          'Programma › **Assistente e modelli**, risponde prima.',
      },
    ],
    note: [
      'Una risposta senza nessuna procedura in testa non ha letto niente del registro: ' +
        'nomi e cifre vanno presi con le pinze.',
      'In un giro il modello apre al massimo dieci procedure: oltre, gli si risponde che ' +
        'sono finite e di concludere con quel che ha letto, dicendo che cosa non ha trovato. ' +
        'Se insiste tre volte, gli attrezzi gli si tolgono.',
    ],
  },
  contestoAssistente: {
    titolo: 'Che cosa sa della pagina',
    sommario:
      'Il filtro nella testata dell’assistente: quanto della pagina aperta accompagna la ' +
      'domanda.',
    scritte: {
      pagina: 'Pagina',
      tendineFiltri: 'tendine, filtri, elenco',
      filtro: 'Filtro',
      partiAccese: 'le parti accese',
      modello: 'Modello',
      sulComputer: 'sul computer',
      risposta: 'Risposta',
      testoETabelle: 'testo e tabelle',
      domanda: 'Domanda',
      quelCheScrivi: 'quel che scrivi',
      letture: 'Letture',
      soloLettura: 'solo lettura',
      finoA10: 'fino a 10 volte',
    },
    figure: [
      {
        didascalia:
          'La domanda parte con quel che resta della pagina dopo il filtro. Il modello legge ' +
          'il registro quante volte gli serve, poi risponde.',
        legenda: [
          'Il filtro si applica quando premi Invio: conta com’è in quel momento.',
          'Le letture passano solo per procedure che non cambiano niente.',
          'Nella risposta, i dati letti arrivano come tabelle del registro.',
        ],
      },
    ],
    voci: [
      {
        termine: 'In un gesto',
        testo:
          'In cima al menu del filtro: **Tutto il contesto** (il caso normale), **Solo dove ' +
          'sono** — pagina, scheda e periodo, niente tendine né elenchi — e **Niente del tutto**.',
      },
      {
        termine: 'Una parte per volta',
        testo:
          'Sotto, otto interruttori indipendenti: **La pagina che guardo**, **Le tendine della ' +
          'barra**, **Le altre voci delle tendine**, **I filtri della pagina**, **Periodo dei ' +
          'conti**, **Gli identificatori**, **La ricerca battuta**, **L’elenco a schermo**. ' +
          'Sotto ogni voce si legge il valore di adesso.',
      },
      {
        termine: 'Una tendina sola',
        testo:
          'Le tendine e i filtri si spengono anche uno per uno: «e negli altri corsi?» vuole ' +
          'togliere il corso e tenere il periodo. Il menu resta aperto fra una spunta e l’altra.',
      },
      {
        termine: 'Come si vede',
        testo:
          'La riga sotto «Assistente» lo dice senza aprire niente: «contesto ridotto (2)» ' +
          'quando due cose sono spente, parti o tendine singole, «senza contesto» quando non va ' +
          'niente. Tutto acceso non si scrive.',
      },
      {
        termine: 'Quando spegnerlo',
        testo:
          'Per una domanda generale — «come si calcola la quota di assenza?» — che i filtri ' +
          'della pagina restringerebbero senza motivo. O per non nominare al modello la classe ' +
          'che si ha davanti.',
      },
      {
        termine: 'Resta com’era',
        testo:
          'La scelta si ricorda da una volta all’altra, anche chiudendo il registro.',
      },
    ],
    note: [
      'Senza **Gli identificatori** l’elenco a schermo arriva come conto — «25 ' +
        `${i(PIF)}» — e non come elenco di nomi: per trovarne uno, l’assistente deve ` +
        'cercarlo.',
      'Se la risposta parla del corso sbagliato, guarda il filtro: una tendina spenta ' +
        'lascia il modello a indovinare. Meglio ancora, nomina corso e classe nella domanda.',
    ],
  },
  dettatura: {
    titolo: 'Dettatura',
    sommario:
      'Dire la domanda all’assistente invece di batterla. La voce la riconosce voicebox, ' +
      'un programma a parte che gira sul computer.',
    scritte: {
      microfono: 'Microfono',
      pezzi: 'Pezzi',
      tagliati: 'tagliati alle pause',
      sulComputer: 'sul computer',
      casella: 'Casella',
      siRilegge: 'si rilegge',
      chiedi: 'Chiedi',
      soloQuestoPc: 'solo questo PC',
      primaVolta: 'Prima volta',
      scaricaModello: 'voicebox scarica il modello',
    },
    figure: [
      {
        didascalia:
          'La voce si taglia alle pause e ogni pezzo si trascrive appena chiuso: le parole ' +
          'compaiono mentre si parla. A mandare la domanda sei tu.',
        legenda: [
          'Un pezzo si chiude a ogni pausa di poco più di mezzo secondo, o dopo dodici secondi.',
          'voicebox riconosce l’italiano con Whisper, sul computer e senza rete.',
          'Il testo si aggiunge a quel che era già scritto nella casella.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Prima: voicebox',
        testo:
          'La voce non la riconosce il registro ma **voicebox**, un programma gratuito che si ' +
          'scarica da github.com/jamiepine/voicebox e si installa come gli altri. Mentre si ' +
          'detta dev’essere aperto: il registro lo cerca su http://127.0.0.1:17493, che è ' +
          'l’indirizzo che voicebox usa da sé. Se lo avvii su un’altra porta, la si cambia in ' +
          '**Porta di voicebox**, nelle **Avanzate** di Assistente e modelli.',
      },
      {
        termine: 'Accenderla',
        testo:
          'In Impostazioni › Programma › **Assistente e modelli**, nella riga **Dettatura** di ' +
          '**Chi risponde**. Compare il ' +
          'microfono accanto alla casella dell’assistente, nel riquadro e nella finestra staccata.',
      },
      {
        termine: 'Dettare',
        testo:
          'Si preme il microfono e si parla; il pulsante diventa **Ferma**, che chiude ' +
          'l’ascolto e scrive l’ultimo pezzo. Poi si rilegge, si corregge e **Chiedi**.',
      },
      {
        termine: 'Lasciar perdere',
        tasti: 'Esc',
        testo:
          'Esc nella casella, mentre ascolta, butta via quel che non è ancora scritto e chiude ' +
          'il microfono. ' +
          'Quel che era già nella casella resta.',
      },
      {
        termine: 'La prima volta',
        testo:
          'voicebox scarica il modello scelto la prima volta che gli si chiede, per conto ' +
          'suo: intanto la riga sotto la casella dice «riprova fra poco». Se voicebox è ' +
          'chiuso, la stessa riga dice che non risponde. Se Windows nega il microfono alle ' +
          'app, lo dice anche questo: si concede in Privacy e sicurezza › Microfono.',
      },
      {
        termine: 'Il modello',
        testo:
          'Nella riga **Dettatura** di Impostazioni › Programma › **Assistente e modelli** si ' +
          'sceglie ' +
          'la taglia di Whisper: **turbo**, di serie, è il più accurato fra i veloci; **large** è un ' +
          'poco più preciso e lento senza scheda video; **medium** è una via di mezzo per un ' +
          'computer che fatica con turbo; **small** sbaglia i cognomi; **base** è solo per provare.',
      },
      {
        termine: 'Parole di scuola',
        testo:
          'voicebox non riceve un vocabolario: «giustificazione», «insufficienza» o il nome di ' +
          'una classe li riconosce come li riconosce il modello da solo. Si rilegge prima di ' +
          'mandare.',
      },
      {
        termine: 'Microfono dimenticato',
        testo:
          'Dopo dieci minuti di ascolto il microfono si chiude da sé.',
      },
    ],
    note: [
      'Ogni pezzo di voce va a voicebox in memoria, senza passare dal disco del registro; ' +
        'voicebox lo tiene in un file temporaneo il tempo di trascriverlo e poi lo cancella, ' +
        'senza metterlo fra le sue «Captures». L’indirizzo può essere solo di questo ' +
        'computer — 127.0.0.1, localhost o [::1] —: la voce non esce di qui.',
    ],
  },
  privacyAssistente: {
    titolo: 'Che cosa esce dal computer',
    sommario:
      `Domande, risposte e dati ${dei(PIF)} restano sulla macchina. Dall’assistente e dalla ` +
      'sezione dei modelli linguistici verso la rete partono solo richieste di file.',
    scritte: {
      ilTuoComputer: 'Il tuo computer',
      registro: 'Registro',
      conDentro: 'con dentro il modello',
      cartellaModelli: 'Cartella modelli',
      fileGguf: 'file .gguf',
      dettatura: 'Dettatura',
      condotto: 'Condotto',
      spentoDiSerie: 'spento di serie',
      modelliPubblici: 'modelli pubblici',
      altriProgrammi: 'Altri programmi',
      fuoriDalRegistro: 'fuori dal registro',
      richieste: 'richieste',
      pesi: 'pesi',
    },
    figure: [
      {
        didascalia:
          'Dentro il tratteggio lavora tutto: registro, modello, dettatura. Da fuori entrano ' +
          'solo i file scaricati.',
        legenda: [
          'Il modello è un file caricato dentro il registro: nessuna richiesta di rete.',
          'Verso Hugging Face partono le parole cercate e i nomi dei file da scaricare; ' +
            'tornano i pesi.',
          'Il condotto, se lo accendi, lascia leggere il registro ad altri programmi.',
        ],
      },
    ],
    voci: [
      {
        termine: 'La conversazione',
        testo:
          'Domanda, contesto della pagina, letture e risposta non passano dalla rete: il ' +
          'modello gira nel processo del registro, e non c’è un indirizzo da configurare.',
      },
      {
        termine: 'I nomi delle persone',
        testo:
          `Nomi, voti e assenze ${dei(PIF)} arrivano al modello solo se servono alla domanda, ` +
          'e il modello sta sul computer. Per non nominare nemmeno a lui la classe aperta, ' +
          'si spegne il contesto.',
      },
      {
        termine: 'Quel che va in rete',
        testo:
          'Richieste di file, nient’altro: le parole battute in **Cerca su Hugging Face** e i ' +
          'nomi dei depositi e dei file da scaricare. Nessuna porta dati del registro.',
      },
      {
        termine: 'Che cosa si controlla all’arrivo',
        testo:
          'Il programma di llama.cpp che legge le scansioni ha versione fissata e impronta ' +
          'controllata. Di un `.gguf` preso da Hugging Face si controlla solo che sia davvero ' +
          'un GGUF. I modelli della dettatura li scarica voicebox, non il registro.',
      },
      {
        termine: 'Le altre uscite del registro',
        testo:
          'Fuori dall’assistente, il registro parla con la rete in altri punti. La mappa manda ' +
          'gli indirizzi dell’anagrafica a OpenStreetMap per collocarli, e ne scarica le carte ' +
          'della zona guardata. La posta passa dall’accesso Microsoft quando colleghi la casella, ' +
          'e spedisce i messaggi solo con «Spedisci senza bozza» acceso. OneDrive si legge da ' +
          'Microsoft Graph solo per gli account che colleghi, quando sfogli o cerchi i ' +
          'documenti. Il calendario ' +
          'ICS della scuola si scarica dal link che hai scritto, senza mandare dati del registro. ' +
          'Gli aggiornamenti chiedono a GitHub l’ultima versione e, se c’è, ne scaricano da lì ' +
          'l’installatore. La prima volta che legge una ' +
          'scansione, il registro scarica da GitHub il programma di llama.cpp, se il **Programma ' +
          'di lettura** è «Lo scarica il registro».',
      },
      {
        termine: 'La finestra staccata',
        testo:
          'Non riceve il registro: sa solo se l’assistente è acceso, quale modello risponde e se ' +
          'la dettatura è accesa. ' +
          'Dentro ci sono la conversazione e nient’altro.',
      },
      {
        termine: 'Dopo',
        testo:
          'Niente resta: la conversazione non si scrive sul disco, e l’audio della dettatura ' +
          'si cancella appena trascritto.',
      },
    ],
    note: [
      'Il condotto è un’altra porta. Acceso in Impostazioni › Programma › ' +
        `**Avanzate**, lascia leggere i dati ${dei(PIF)} a ogni programma che gira con il tuo ` +
        'utente, senza chiedere — anche a uno che li manda a un modello in rete. Di serie è ' +
        'spento. Su Windows il suo nome porta un segreto rifatto a ogni accensione: tiene fuori gli ' +
        'altri utenti del computer, non i programmi del tuo.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    modelliLinguistici: {
      titolo: 'Assistent und Modelle',
      sommario:
        'Einstellungen › Programm › **Assistent und Modelle**: wer für jede Verwendung ' +
        'antwortet, und die Dateien der Modelle auf dem Computer: herunterladen, auswählen, ' +
        'entfernen.',
      scritte: {
        impostazioni: 'Einstellungen',
        guida: 'Hilfe',
        chiRisponde: 'Wer antwortet',
        assistente: 'Assistent',
        pronto: 'bereit',
        scansioni: 'Scans',
        nessuno: '— keines —',
        spento: 'aus',
        dettatura: 'Diktat',
        sulComputer: 'Auf dem Computer',
        cartella: 'Modellordner',
        peso: '4.7 GB',
        trascina: 'Ziehe eine .gguf hierher oder',
        caricaFile: 'Datei laden…',
        scaricaModelli: 'Modelle herunterladen',
        avanzate: 'Erweitert (1)',
      },
      figure: [
        {
          didascalia:
            'Der Bereich von oben: zuoberst, wer antwortet, darunter der Ordner und die ' +
            'vorhandenen Dateien, ganz unten zwei zugeklappte Gruppen. Während eine Datei ' +
            'heruntergeladen wird, erscheint über allem **Wird heruntergeladen**.',
          legenda: [
            '**Wer antwortet**: eine Zeile pro Verwendung, mit dem Schalter, der Auswahlliste ' +
              'des Modells und dem Stand — «bereit», «etwas fehlt» oder «aus» — mit dem Grund.',
            '**Auf dem Computer**: der **Modellordner**, die Dateien mit ihrer Grösse und dem ' +
              'Papierkorb, und das Feld, in das man eine hineinzieht.',
            '**Modelle herunterladen**: die empfohlenen, die Dateien eines Repositorys, die ' +
              'Suche auf Hugging Face. Klappt nur von selbst auf, wenn noch kein Modell da ist.',
            '**Erweitert**: der **Port von voicebox**. Zugeklappt, man öffnet es von Hand.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Wozu sie dienen',
          testo:
            'Für drei Verwendungen: den **Assistenten**, der Fragen zum Klassenbuch beantwortet, ' +
            'das **Lesen der Scans**, das die Namen in PDF ohne Text sucht, und das **Diktat**, ' +
            'das schreibt, was du sagst. Die ersten zwei haben ihr eigenes Modell: eine ' +
            '`.gguf`-Datei, von einem halben bis zu sechs Gigabyte. Das Diktat stützt sich auf ' +
            'voicebox.',
        },
        {
          termine: 'Wer antwortet',
          testo:
            'Drei Zeilen zuoberst, eine pro Verwendung, jede mit ihrem Schalter und ihrem ' +
            'Stand: «bereit», «etwas fehlt» oder «aus», mit dem Grund. **Assistent**: die ' +
            'Auswahlliste des Modells, eines, das Werkzeuge aufrufen kann. **Lesen der Scans**: ' +
            'das Modell, das sieht, die Auswahlliste des **Projektors (mmproj)** — die Datei mit ' +
            '`mmproj` im Namen — und das **Leseprogramm**. **Diktat**: das **Modell für die ' +
            'Stimme**; eingeschaltet erinnert es daran, dass voicebox offen sein muss. Ein ' +
            'Modell wählt man nur in diesen Auswahllisten.',
        },
        {
          termine: 'Leseprogramm',
          testo:
            'Das Programm, mit dem das Modell die Scans liest. **Vom Klassenbuch**, der ' +
            'Standard: Beim ersten Bedarf holt es `llama-mtmd-cli` selbst, in einer festen ' +
            'Version, und prüft den Fingerabdruck. **Diese .exe**: eine eigene Kopie, zum ' +
            'Beispiel mit der Beschleunigung der Grafikkarte; zeigt den Pfad und ' +
            '**Durchsuchen…**, und solange du keine Datei wählst, gilt die vorherige Wahl. ' +
            '**Nicht herunterladen**, bei einer getakteten Verbindung: Das Klassenbuch holt ' +
            'nichts aus dem Internet.',
        },
        {
          termine: 'Die empfohlenen',
          testo:
            'In der zugeklappten Gruppe **Modelle herunterladen**, die nur von selbst ' +
            'aufklappt, wenn noch kein Modell da ist. Für den Assistenten **Qwen 2.5 — 7 ' +
            'Milliarden** (etwa 5 GB, braucht 8 GB freien ' +
            'Arbeitsspeicher) oder **Qwen 2.5 — 3 Milliarden** (2 GB, schneller, irrt sich aber ' +
            'öfter). Für die Scans **Qwen 2.5 VL** (6 GB, liest auch Handschrift) oder ' +
            '**SmolVLM** (unter 1 GB, nur Gedrucktes).',
        },
        {
          termine: 'Herunterladen',
          testo:
            '**Herunterladen** holt die empfohlene Variante und wählt sie am Ende für ihre ' +
            'Aufgabe, sofern du inzwischen keine andere gewählt hast. Eingeschaltet wird dabei ' +
            'nichts: War die Verwendung aus, legt man den Schalter unter **Wer antwortet** von ' +
            'Hand um. Bei einem Modell, das sieht, wird der Projektor danach heruntergeladen, ' +
            'aus der Liste der Dateien, die sich darunter öffnet, und von Hand in seiner ' +
            'Auswahlliste gewählt.',
        },
        {
          termine: 'Während des Herunterladens',
          testo:
            'Es wird eine Datei aufs Mal heruntergeladen: Die anderen stellt man mit ' +
            '**Einreihen** an. Oben auf der Seite zeigt die Karte **Wird heruntergeladen**, ' +
            'wie weit es ist, und **Anhalten** bricht ab.',
        },
        {
          termine: 'Ein halb fertiger Download',
          testo:
            'Er bleibt mit «halb heruntergeladen» in der Liste: **Fortsetzen** macht dort ' +
            'weiter, wo er war, nicht von vorn; **Wegwerfen** gibt den Platz frei.',
        },
        {
          termine: 'Eine Datei, die du schon hast',
          testo:
            'Man zieht sie in das gestrichelte Feld von **Auf dem Computer** oder holt sie mit ' +
            '**Datei laden…**: Das Klassenbuch kopiert sie in den Ordner der Modelle.',
        },
        {
          termine: 'Auf Hugging Face suchen',
          testo:
            'Ganz unten in **Modelle herunterladen**, für alle, die wissen, was sie wollen: ' +
            '«qwen», «vision», «7b», dann **Suchen**. ' +
            '**Dateien ansehen** zeigt die Varianten eines Repositorys, mit der Grösse und ' +
            '«empfohlen», wo es passt. Repositorys mit «verlangt eine Erlaubnis» lassen sich ' +
            'von hier aus nicht herunterladen.',
        },
        {
          termine: 'Ein Modell entfernen',
          testo:
            'Der Papierkorb neben der Datei, dann **Entfernen** in der Bestätigung: Die Datei ' +
            'wird von der Festplatte gelöscht. War sie im Einsatz, entlädt das Klassenbuch sie ' +
            'vorher aus dem Arbeitsspeicher.',
        },
        {
          termine: 'Wo sie liegen',
          testo:
            'Ein einziger Ort: das Feld **Modellordner** unter **Auf dem Computer**. Leer ' +
            'kümmert sich das Klassenbuch darum, und darunter steht, wo sie liegen: ' +
            'standardmässig neben den Einstellungen des Programms. Für eine andere Festplatte ' +
            'oder für Modelle, die schon anderswo heruntergeladen sind, gibt man einen anderen ' +
            'Ordner an: Das Klassenbuch sieht sie alle, ohne sie zu kopieren.',
        },
        {
          termine: 'Port von voicebox',
          testo:
            'In der zugeklappten Gruppe **Erweitert**, ganz unten: der Port, auf dem voicebox ' +
            'antwortet, von 1 bis 65535, standardmässig 17493. Der Host ist fest, 127.0.0.1: ' +
            'Die Stimme verlässt den Computer nicht.',
        },
      ],
      note: [
        'Für den Anfang genügt das erste der empfohlenen. Das 3-Milliarden-Modell ist für ' +
          'Rechner ohne Grafikkarte oder mit wenig Arbeitsspeicher; eine Grafikkarte, falls ' +
          'vorhanden, nutzt das Klassenbuch von selbst.',
        'Das Modell des Assistenten wird im Klassenbuch selbst geladen; für die Scans startet ' +
          'das Klassenbuch ein Programm von llama.cpp, das sich standardmässig beim ersten Mal ' +
          'selbst herunterlädt (rund zwanzig MB). Keines von beiden ist ein Dienst, den man ' +
          'installieren muss.',
      ],
    },
    assistente: {
      titolo: 'Assistent',
      sommario:
        'Frag das Klassenbuch in deinen eigenen Worten: Ein Modell auf dem Computer liest die ' +
        'Daten und antwortet. Es schreibt nichts.',
      scritte: {
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: Molti(DE.pianoLezione),
        documenti: 'Dokumente',
        corso: 'Kurs',
        proietta: 'Projizieren',
        assistente: 'Assistent',
        nonScrive: 'Modell · schreibt nicht',
        chiedi: 'Fragen',
      },
      figure: [
        {
          didascalia:
            'Der Bereich öffnet sich rechts, und die Seite wird schmaler, ohne verdeckt zu ' +
            'werden: Man fragt, während man die Sache ansieht, nach der man fragt.',
          legenda: [
            'Die Schaltfläche mit dem Roboter, neben **Projizieren**: öffnet und schliesst den ' +
              'Bereich.',
            'Der Filter des Kontexts: was das Modell von der Seite weiss.',
            'Löst den Bereich in ein eigenes Fenster. Daneben der Papierkorb und das Kreuz.',
            'Die Lesezugriffe des Modells, mit dem Namen der Prozedur.',
            'Die gelesenen Daten, vom Klassenbuch dargestellt: nicht vom Modell abgeschrieben.',
            'Das Eingabefeld, das Mikrofon des Diktats und **Fragen**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Einschalten',
          testo:
            'Standardmässig ist er aus. Unter Einstellungen › Programm › **Assistent und ' +
            'Modelle**, in der Zeile **Assistent** von **Wer antwortet**, wählt man ein Modell ' +
            'und schaltet ihn ein. Von da an ' +
            'erscheint rechts in der Zeile der Auswahllisten, neben **Projizieren**, die ' +
            'Schaltfläche mit dem Roboter.',
        },
        {
          termine: 'Fragen',
          tasti: 'Enter / Umschalt+Enter',
          testo:
            'Man schreibt ins Feld und drückt Enter oder **Fragen**; Umschalt+Enter macht einen ' +
            'Zeilenumbruch. Während er antwortet, hält **Stopp** ihn wirklich an: Das Modell ' +
            'hört auf zu lesen, und statt der Antwort bleibt «Angehalten.». Esc schliesst den ' +
            'Bereich, hält die Antwort aber nicht an.',
        },
        {
          termine: 'Was er lesen kann',
          testo:
            'Kurse und Klassen, Präsenzen und Durchschnitte pro Semester, wer die ' +
            `Absenzengrenze überschreitet, Personenblatt und Kontaktadressen der ${DE.pif.plurale}, ` +
            'die Stunden im Kalender, die Präsenzkontrolle einer Stunde, die nächste Stunde, ' +
            `Noten und ${DE.momento.plurale}, Pläne, offene ${DE.pendenza.plurale}, die Karte ` +
            'und eine Zusammenfassung des Klassenbuchs in Zahlen.',
        },
        {
          termine: 'Eine Seite öffnen',
          testo:
            '«Bring mich zu den Beurteilungen der 4a»: Ausser lesen kann der Assistent das ' +
            'Klassenbuch auf eine Seite bringen. Zurück geht es wie immer, mit einem Klick.',
        },
        {
          termine: 'Was er nicht tut',
          testo:
            'Er erfasst nichts, korrigiert nichts, verschickt nichts: Die Prozeduren, die ' +
            'schreiben, erreichen ihn nicht, und keine Einstellung erlaubt es ihm. Der Kopf ' +
            'erinnert daran: «schreibt nicht».',
        },
        {
          termine: 'Eine Antwort prüfen',
          testo:
            'Oben in der Antwort stehen die Prozeduren, die er aufgerufen hat ' +
            '(`corso.presenze`), mit einem Häkchen oder, wenn sie nicht geklappt haben, dem ' +
            'Grund. Darunter die gelesenen Daten als Tabelle; sind sie gekürzt, steht es da: ' +
            '«12 von 25 sichtbar».',
        },
        {
          termine: 'Der Hinweis unter der Antwort',
          testo:
            '«Ich habe alle Abfragen gemacht, die ich für eine Frage machen kann»: Das Modell ' +
            'hat alle Prozeduren aufgerufen, die eine Runde erlaubt, und mit dem geantwortet, ' +
            'was es bis dahin gelesen hatte. Fehlt etwas, frag etwas Engeres.',
        },
        {
          termine: 'Anschlussfragen',
          testo:
            '«Und in der zweiten?», «und letzte Woche?»: Der Assistent erinnert sich an das ' +
            'Gespräch und an die Personen und Kurse, die er schon gefunden hat, und sucht sie ' +
            'nicht jedes Mal neu.',
        },
        {
          termine: 'In einem eigenen Fenster',
          testo:
            'Die Schaltfläche mit den zwei Rechtecken im Kopf bringt das Gespräch in ein ' +
            'Fenster, das man verschieben und vergrössern kann, auch mitten in einer Antwort. ' +
            '**Wieder andocken** bringt es in den Bereich zurück, auch mit einer laufenden ' +
            'Antwort; schliesst man es mit dem Kreuz, verschwindet das Gespräch mit ihm, und die ' +
            'Antwort, auf die es wartete, bricht ab.',
        },
        {
          termine: 'Vergessen',
          testo:
            'Das Gespräch wird nirgends gespeichert: Beim Schliessen des Klassenbuchs geht es ' +
            'verloren, und der Papierkorb **Gespräch vergessen** löscht es sofort.',
        },
        {
          termine: 'Wenn er langsam ist',
          testo:
            'Die erste Frage lädt das Modell, fünf bis dreissig Sekunden; danach bleibt es im ' +
            'Arbeitsspeicher. Ohne Grafikkarte kann eine Antwort mehr als eine Minute dauern, ' +
            'und je mehr Klassen sie betrifft, desto länger. Ein kleineres Modell, gewählt ' +
            'unter Einstellungen › Programm › **Assistent und Modelle**, antwortet schneller.',
        },
      ],
      note: [
        'Eine Antwort ohne Prozedur oben hat nichts aus dem Klassenbuch gelesen: Namen und ' +
          'Zahlen sind mit Vorsicht zu geniessen.',
        'In einer Runde ruft das Modell höchstens zehn Prozeduren auf: Danach bekommt es zur ' +
          'Antwort, dass keine mehr übrig sind und es mit dem Gelesenen abschliessen soll, ' +
          'samt dem, was es nicht gefunden hat. Besteht es dreimal darauf, werden ihm die ' +
          'Werkzeuge weggenommen.',
      ],
    },
    contestoAssistente: {
      titolo: 'Was er von der Seite weiss',
      sommario:
        'Der Filter im Kopf des Assistenten: wie viel von der offenen Seite die Frage ' +
        'begleitet.',
      scritte: {
        pagina: 'Seite',
        tendineFiltri: 'Auswahl, Filter, Liste',
        filtro: 'Filter',
        partiAccese: 'die aktiven Teile',
        modello: 'Modell',
        sulComputer: 'auf dem Computer',
        risposta: 'Antwort',
        testoETabelle: 'Text und Tabellen',
        domanda: 'Frage',
        quelCheScrivi: 'was du schreibst',
        letture: 'Lesezugriffe',
        soloLettura: 'nur lesend',
        finoA10: 'bis zu 10-mal',
      },
      figure: [
        {
          didascalia:
            'Die Frage geht mit dem los, was nach dem Filter von der Seite übrig bleibt. Das ' +
            'Modell liest im Klassenbuch, so oft es muss, und antwortet dann.',
          legenda: [
            'Der Filter gilt, wenn du Enter drückst: Es zählt, wie er in diesem Moment ist.',
            'Die Lesezugriffe gehen nur über Prozeduren, die nichts ändern.',
            'In der Antwort kommen die gelesenen Daten als Tabellen des Klassenbuchs.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Mit einem Griff',
          testo:
            'Zuoberst im Menü des Filters: **Der ganze Kontext** (der Normalfall), **Nur wo ich ' +
            'bin** — Seite, Karte und Zeitraum, keine Auswahllisten und keine Listen — und ' +
            '**Gar nichts**.',
        },
        {
          termine: 'Ein Teil nach dem anderen',
          testo:
            'Darunter acht unabhängige Schalter: **Die Seite, die ich anschaue**, **Die ' +
            'Auswahlmenüs der Leiste**, **Die anderen Einträge der Auswahlmenüs**, **Die ' +
            'Filter der Seite**, **Zeitraum der Zählungen**, **Die Kennungen**, **Die ' +
            'eingegebene Suche**, **Die Liste auf dem Bildschirm**. Unter jedem Eintrag steht ' +
            'der aktuelle Wert.',
        },
        {
          termine: 'Eine einzelne Auswahlliste',
          testo:
            'Auswahllisten und Filter lassen sich auch einzeln ausschalten: «und in den anderen ' +
            'Kursen?» will den Kurs weglassen und den Zeitraum behalten. Das Menü bleibt ' +
            'zwischen zwei Häkchen offen.',
        },
        {
          termine: 'Woran man es sieht',
          testo:
            'Die Zeile unter «Assistent» sagt es, ohne dass man etwas öffnet: «Kontext ' +
            'reduziert (2)», wenn zwei Dinge aus sind, Teile oder einzelne Auswahllisten, ' +
            '«ohne Kontext», wenn nichts mitgeht. Ist alles an, steht nichts da.',
        },
        {
          termine: 'Wann ausschalten',
          testo:
            'Für eine allgemeine Frage — «wie wird die Absenzenquote berechnet?» —, die die ' +
            'Filter der Seite ohne Grund einengen würden. Oder um dem Modell die Klasse nicht ' +
            'zu nennen, die man gerade vor sich hat.',
        },
        {
          termine: 'Es bleibt, wie es war',
          testo:
            'Die Wahl wird von einem Mal zum nächsten gespeichert, auch über das Schliessen des ' +
            'Klassenbuchs hinaus.',
        },
      ],
      note: [
        'Ohne **Die Kennungen** kommt die Liste auf dem Bildschirm als Zahl an — «25 ' +
          `${DE.pif.plurale}» — und nicht als Liste von Namen: Um einen davon zu finden, muss ` +
          'der Assistent ihn suchen.',
        'Spricht die Antwort vom falschen Kurs, schau dir den Filter an: Eine ausgeschaltete ' +
          'Auswahlliste lässt das Modell raten. Noch besser: Nenne Kurs und Klasse in der ' +
          'Frage.',
      ],
    },
    dettatura: {
      titolo: 'Diktat',
      sommario:
        'Die Frage an den Assistenten sprechen, statt sie zu tippen. Die Stimme erkennt ' +
        'voicebox, ein eigenes Programm, das auf dem Computer läuft.',
      scritte: {
        microfono: 'Mikrofon',
        pezzi: 'Stücke',
        tagliati: 'an Pausen getrennt',
        sulComputer: 'auf dem Computer',
        casella: 'Feld',
        siRilegge: 'nochmals lesen',
        chiedi: 'Fragen',
        soloQuestoPc: 'nur dieser PC',
        primaVolta: 'Beim ersten Mal',
        scaricaModello: 'voicebox lädt das Modell',
      },
      figure: [
        {
          didascalia:
            'Die Stimme wird an den Pausen getrennt, und jedes Stück wird transkribiert, sobald ' +
            'es abgeschlossen ist: Die Wörter erscheinen, während man spricht. Die Frage ' +
            'abschicken tust du.',
          legenda: [
            'Ein Stück endet bei jeder Pause von etwas mehr als einer halben Sekunde oder nach ' +
              'zwölf Sekunden.',
            'voicebox erkennt Deutsch mit Whisper, auf dem Computer und ohne Netz.',
            'Der Text kommt zu dem hinzu, was schon im Feld stand.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Zuerst: voicebox',
          testo:
            'Die Stimme erkennt nicht das Klassenbuch, sondern **voicebox**, ein kostenloses ' +
            'Programm, das man von github.com/jamiepine/voicebox herunterlädt und wie andere ' +
            'installiert. Während man diktiert, muss es offen sein: Das Klassenbuch sucht es ' +
            'unter http://127.0.0.1:17493, der Adresse, die voicebox von selbst verwendet. ' +
            'Startest du es auf einem anderen Port, änderst du ihn unter **Port von voicebox**, ' +
            'in **Erweitert** von Assistent und Modelle.',
        },
        {
          termine: 'Einschalten',
          testo:
            'Unter Einstellungen › Programm › **Assistent und Modelle**, in der Zeile ' +
            '**Diktat** von **Wer antwortet**. Dann erscheint ' +
            'das Mikrofon neben dem Eingabefeld des Assistenten, im Bereich und im abgelösten ' +
            'Fenster.',
        },
        {
          termine: 'Diktieren',
          testo:
            'Man drückt auf das Mikrofon und spricht; die Schaltfläche wird zu **Stopp**, das ' +
            'das Zuhören beendet und das letzte Stück schreibt. Dann liest man nochmals, ' +
            'korrigiert und drückt **Fragen**.',
        },
        {
          termine: 'Abbrechen',
          tasti: 'Esc',
          testo:
            'Esc im Feld verwirft während des Zuhörens, was noch nicht geschrieben ist, und ' +
            'schliesst das Mikrofon. Was schon im Feld stand, bleibt.',
        },
        {
          termine: 'Beim ersten Mal',
          testo:
            'voicebox lädt das gewählte Modell von sich aus herunter, wenn man es zum ersten ' +
            'Mal braucht: Solange sagt die Zeile unter dem Feld «gleich nochmals versuchen». ' +
            'Ist voicebox geschlossen, sagt dieselbe Zeile, dass es nicht antwortet. Verweigert ' +
            'Windows den Apps das Mikrofon, sagt sie auch das: Man erlaubt es unter ' +
            'Datenschutz und Sicherheit › Mikrofon.',
        },
        {
          termine: 'Das Modell',
          testo:
            'In der Zeile **Diktat** unter Einstellungen › Programm › **Assistent und Modelle** ' +
            'wählt man die ' +
            'Grösse von Whisper: **turbo**, der Standard, ist das genaueste der schnellen; ' +
            '**large** ist etwas genauer und ohne Grafikkarte langsam; **medium** ist ein ' +
            'Mittelweg für einen Computer, der mit turbo Mühe hat; **small** macht Fehler bei ' +
            'Nachnamen; **base** ist nur zum Ausprobieren.',
        },
        {
          termine: 'Wörter aus der Schule',
          testo:
            'voicebox bekommt keinen Wortschatz: «Dispensation», «ungenügend» oder den ' +
            'Namen einer Klasse erkennt es so, wie das Modell sie von sich aus erkennt. Vor dem ' +
            'Abschicken nochmals lesen.',
        },
        {
          termine: 'Vergessenes Mikrofon',
          testo:
            'Nach zehn Minuten Zuhören schliesst sich das Mikrofon von selbst.',
        },
      ],
      note: [
        'Jedes Stück Stimme geht im Arbeitsspeicher an voicebox, ohne über die Festplatte des ' +
          'Klassenbuchs zu laufen; voicebox hält es für die Dauer der Transkription in einer ' +
          'temporären Datei und löscht es dann, ohne es unter seine «Captures» zu legen. Die ' +
          'Adresse darf nur zu diesem Computer gehören — 127.0.0.1, localhost oder [::1] —: ' +
          'Die Stimme verlässt ihn nicht.',
      ],
    },
    privacyAssistente: {
      titolo: 'Was den Computer verlässt',
      sommario:
        `Fragen, Antworten und Daten der ${DE.pif.plurale} bleiben auf dem Rechner. Vom ` +
        'Assistenten und vom Bereich der Sprachmodelle gehen nur Anfragen nach Dateien ins ' +
        'Netz.',
      scritte: {
        ilTuoComputer: 'Dein Computer',
        registro: 'Klassenbuch',
        conDentro: 'mit dem Modell darin',
        cartellaModelli: 'Modellordner',
        fileGguf: '.gguf-Dateien',
        dettatura: 'Diktat',
        condotto: 'Kanal',
        spentoDiSerie: 'standardmässig aus',
        modelliPubblici: 'öffentliche Modelle',
        altriProgrammi: 'Andere Programme',
        fuoriDalRegistro: 'nicht im Klassenbuch',
        richieste: 'Anfragen',
        pesi: 'Gewichte',
      },
      figure: [
        {
          didascalia:
            'Innerhalb der gestrichelten Linie arbeitet alles: Klassenbuch, Modell, Diktat. Von ' +
            'aussen kommen nur die heruntergeladenen Dateien herein.',
          legenda: [
            'Das Modell ist eine Datei, die im Klassenbuch geladen wird: keine Anfrage ins Netz.',
            'Zu Hugging Face gehen die Suchbegriffe und die Namen der herunterzuladenden ' +
              'Dateien; zurück kommen die Gewichte.',
            'Der Kanal, wenn du ihn einschaltest, lässt andere Programme das Klassenbuch lesen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Das Gespräch',
          testo:
            'Frage, Kontext der Seite, Lesezugriffe und Antwort gehen nicht übers Netz: Das ' +
            'Modell läuft im Prozess des Klassenbuchs, und es gibt keine Adresse einzurichten.',
        },
        {
          termine: 'Die Namen der Personen',
          testo:
            `Namen, Noten und Absenzen der ${DE.pif.plurale} erreichen das Modell nur, wenn ` +
            'die Frage sie braucht, und das Modell ist auf dem Computer. Um ihm nicht einmal die ' +
            'offene Klasse zu nennen, schaltet man den Kontext aus.',
        },
        {
          termine: 'Was ins Netz geht',
          testo:
            'Anfragen nach Dateien, nichts anderes: die unter **Auf Hugging Face suchen** ' +
            'eingetippten Wörter und die Namen der Repositorys und Dateien, die ' +
            'heruntergeladen werden. Keine trägt Daten des Klassenbuchs.',
        },
        {
          termine: 'Was beim Eintreffen geprüft wird',
          testo:
            'Das Programm von llama.cpp, das die Scans liest, hat eine feste Version und einen ' +
            'geprüften Fingerabdruck. Bei einer `.gguf`-Datei von Hugging Face wird nur geprüft, ' +
            'dass sie wirklich ein GGUF ist. Die Modelle des Diktats lädt voicebox herunter, ' +
            'nicht das Klassenbuch.',
        },
        {
          termine: 'Die anderen Wege des Klassenbuchs nach draussen',
          testo:
            'Ausserhalb des Assistenten spricht das Klassenbuch an anderen Stellen mit dem ' +
            'Netz. Die Karte schickt die Adressen aus den Personalien an OpenStreetMap, um sie ' +
            'zu verorten, und lädt die Karten des betrachteten Gebiets herunter. Die E-Mail ' +
            'läuft über die Microsoft-Anmeldung, wenn du das Postfach verbindest, und verschickt ' +
            'Nachrichten nur, wenn «Ohne Entwurf senden» eingeschaltet ist. OneDrive wird über ' +
            'Microsoft Graph nur für die Konten gelesen, die du verbindest, wenn du Dokumente ' +
            'durchsuchst oder suchst. Der ICS-Kalender ' +
            'der Schule wird vom Link heruntergeladen, den du eingetragen hast, ohne Daten des ' +
            'Klassenbuchs zu senden. Die Aktualisierungen fragen GitHub nach der neuesten ' +
            'Version und laden, falls es eine gibt, das Installationsprogramm von dort ' +
            'herunter. Beim ersten Lesen eines Scans lädt das Klassenbuch das Programm von ' +
            'llama.cpp von GitHub herunter, wenn das **Leseprogramm** auf «Vom Klassenbuch» ' +
            'steht.',
        },
        {
          termine: 'Das abgelöste Fenster',
          testo:
            'Es bekommt das Klassenbuch nicht: Es weiss nur, ob der Assistent eingeschaltet ist, ' +
            'welches Modell antwortet und ob das Diktat eingeschaltet ist. Darin sind das ' +
            'Gespräch und sonst nichts.',
        },
        {
          termine: 'Danach',
          testo:
            'Nichts bleibt: Das Gespräch wird nicht auf die Festplatte geschrieben, und der Ton ' +
            'des Diktats wird gelöscht, sobald er transkribiert ist.',
        },
      ],
      note: [
        'Der Kanal ist eine andere Tür. Unter Einstellungen › Programm › **Erweitert** ' +
          'eingeschaltet, lässt er jedes Programm, das unter deinem Benutzer ' +
          `läuft, die Daten der ${DE.pif.plurale} lesen, ohne zu fragen — auch eines, das sie ` +
          'an ein Modell im Netz schickt. Standardmässig ist er aus. Unter Windows trägt sein ' +
          'Name ein Geheimnis, das bei jedem Einschalten neu erzeugt wird: Es hält die anderen ' +
          'Benutzer des Computers fern, nicht die Programme deines eigenen.',
      ],
    },
  },
  fr: {
    modelliLinguistici: {
      titolo: 'Assistant et modèles',
      sommario:
        'Paramètres › Programme › **Assistant et modèles** : qui répond pour chaque usage, et ' +
        'les fichiers des modèles sur l’ordinateur : les télécharger, les choisir, les retirer.',
      scritte: {
        impostazioni: 'Paramètres',
        guida: 'Aide',
        chiRisponde: 'Qui répond',
        assistente: 'Assistant',
        pronto: 'prêt',
        scansioni: 'Scans',
        nessuno: '— aucun —',
        spento: 'désactivé',
        dettatura: 'Dictée',
        sulComputer: 'Sur l’ordinateur',
        cartella: 'Dossier des modèles',
        peso: '4,7 Go',
        trascina: 'Glisse ici un .gguf, ou',
        caricaFile: 'Charger un fichier…',
        scaricaModelli: 'Télécharger des modèles',
        avanzate: 'Avancé (1)',
      },
      figure: [
        {
          didascalia:
            'La section vue d’en haut : en tête qui répond, en dessous le dossier et les ' +
            'fichiers présents, tout en bas deux groupes repliés. Pendant qu’un fichier se ' +
            'télécharge, **Téléchargement en cours** apparaît au-dessus de tout.',
          legenda: [
            '**Qui répond** : une ligne par usage, avec l’interrupteur, la liste déroulante du ' +
              'modèle et l’état — « prêt », « il manque quelque chose » ou « désactivé » — avec ' +
              'la raison.',
            '**Sur l’ordinateur** : le **Dossier des modèles**, les fichiers avec leur taille et ' +
              'la corbeille, et le cadre où en glisser un.',
            '**Télécharger des modèles** : les recommandés, les fichiers d’un dépôt, la ' +
              'recherche sur Hugging Face. Il ne s’ouvre tout seul que s’il n’y a encore aucun ' +
              'modèle.',
            '**Avancé** : le **Port de voicebox**. Replié, on l’ouvre à la main.',
          ],
        },
      ],
      voci: [
        {
          termine: 'À quoi ils servent',
          testo:
            'À trois usages : l’**assistant**, qui répond aux questions sur le registre, la ' +
            '**lecture des scans**, qui cherche les noms dans les PDF sans texte, et la ' +
            '**dictée**, qui écrit ce que tu dis. Les deux premiers ont leur modèle : un fichier ' +
            '`.gguf`, d’un demi-gigaoctet à six. La dictée s’appuie sur voicebox.',
        },
        {
          termine: 'Qui répond',
          testo:
            'Trois lignes en tête, une par usage, chacune avec son interrupteur et son état : ' +
            '« prêt », « il manque quelque chose » ou « désactivé », avec la raison. ' +
            '**Assistant** : la liste du modèle, un modèle qui sache appeler des outils. ' +
            '**Lecture des scans** : le modèle qui voit, la liste du **projecteur (mmproj)** — ' +
            'le fichier avec `mmproj` dans le nom — et le **Programme de lecture**. **Dictée** : ' +
            'le **Modèle de la voix** ; activée, elle rappelle que voicebox doit être ouvert. Un ' +
            'modèle se choisit seulement dans ces listes.',
        },
        {
          termine: 'Programme de lecture',
          testo:
            'Le programme qui fait lire les scans au modèle. **Par le registre**, par défaut : ' +
            'la première fois qu’il en a besoin, il prend lui-même `llama-mtmd-cli`, dans une ' +
            'version fixe, et en vérifie l’empreinte. **Ce .exe** : une copie à toi, par exemple ' +
            'avec l’accélération de la carte graphique ; il montre le chemin et **Parcourir…**, ' +
            'et tant que tu ne choisis pas de fichier, le choix précédent reste valable. **Ne ' +
            'pas télécharger**, avec une connexion limitée : le registre ne prend rien sur ' +
            'internet.',
        },
        {
          termine: 'Les recommandés',
          testo:
            'Dans le groupe replié **Télécharger des modèles**, qui ne s’ouvre tout seul que ' +
            's’il n’y a encore aucun modèle. Pour l’assistant **Qwen 2.5 — 7 milliards** ' +
            '(environ 5 Go, demande 8 Go de mémoire ' +
            'libre) ou **Qwen 2.5 — 3 milliards** (2 Go, plus rapide mais se trompe plus ' +
            'souvent). Pour les scans **Qwen 2.5 VL** (6 Go, lit aussi l’écriture manuscrite) ' +
            'ou **SmolVLM** (moins de 1 Go, imprimé seulement).',
        },
        {
          termine: 'Télécharger',
          testo:
            '**Télécharger** prend la variante recommandée et, une fois arrivée au bout, la ' +
            'choisit pour sa tâche, si tu n’en as pas choisi une autre entre-temps. Rien ne ' +
            's’active pour autant : si l’usage était éteint, on bascule l’interrupteur dans ' +
            '**Qui répond** à la main. Pour un modèle qui voit, le projecteur se télécharge ' +
            'ensuite, depuis la liste des fichiers qui s’ouvre en dessous, et se choisit à la ' +
            'main dans sa liste déroulante.',
        },
        {
          termine: 'Pendant le téléchargement',
          testo:
            'Un seul fichier se télécharge à la fois : les autres se mettent en attente avec ' +
            '**Mettre en file**. En haut de la page, la fiche **Téléchargement en ' +
            'cours** dit où il en est, et **Arrêter** l’interrompt.',
        },
        {
          termine: 'Un téléchargement resté à moitié',
          testo:
            'Il reste dans la liste avec « à moitié téléchargé » : **Reprendre** repart d’où il ' +
            'en était, pas de zéro ; **Jeter** libère la place.',
        },
        {
          termine: 'Un fichier que tu as déjà',
          testo:
            'On le glisse dans le cadre en pointillé de **Sur l’ordinateur**, ou on le prend ' +
            'avec **Charger un fichier…** : le registre le copie dans le dossier des modèles.',
        },
        {
          termine: 'Chercher sur Hugging Face',
          testo:
            'Tout en bas de **Télécharger des modèles**, pour qui sait ce qu’il veut : « qwen », ' +
            '« vision », « 7b », puis **Rechercher**. ' +
            '**Voir les fichiers** montre les variantes d’un dépôt, avec la taille et ' +
            '« recommandé » là où ça vaut. Les dépôts marqués « demande une autorisation » ne ' +
            'se téléchargent pas d’ici.',
        },
        {
          termine: 'Retirer un modèle',
          testo:
            'La corbeille à côté du fichier, puis **Retirer** dans la confirmation : le fichier ' +
            'est effacé du disque. S’il était au travail, le registre le décharge d’abord de la ' +
            'mémoire.',
        },
        {
          termine: 'Où ils sont',
          testo:
            'Un seul endroit : le champ **Dossier des modèles**, dans **Sur l’ordinateur**. ' +
            'Vide, le registre s’en occupe, et en dessous on lit où ils sont : par défaut à côté ' +
            'des paramètres du programme. Pour un autre disque, ou pour des modèles déjà ' +
            'téléchargés ailleurs, on indique un autre dossier : le registre les voit tous sans ' +
            'les copier.',
        },
        {
          termine: 'Port de voicebox',
          testo:
            'Dans le groupe replié **Avancé**, tout en bas : le port sur lequel voicebox répond, ' +
            'de 1 à 65535, par défaut 17493. L’hôte est fixe, 127.0.0.1 : la voix ne sort pas ' +
            'de l’ordinateur.',
        },
      ],
      note: [
        'Pour commencer, le premier des recommandés suffit. Le 3 milliards est pour les ' +
          'machines sans carte graphique ou avec peu de mémoire ; la carte graphique, s’il y ' +
          'en a une, le registre l’utilise tout seul.',
        'Le modèle de l’assistant se charge à l’intérieur du registre ; pour les scans, le ' +
          'registre lance un programme de llama.cpp, qui par défaut se télécharge tout seul la ' +
          'première fois (une vingtaine de Mo). Aucun des deux n’est un service à installer.',
      ],
    },
    assistente: {
      titolo: 'Assistant',
      sommario:
        'Pose tes questions sur le registre avec tes mots : un modèle sur l’ordinateur lit ' +
        'les données et répond. Il n’écrit rien.',
      scritte: {
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        corso: 'Cours',
        proietta: 'Projeter',
        assistente: 'Assistant',
        nonScrive: 'modèle · n’écrit pas',
        chiedi: 'Demander',
      },
      figure: [
        {
          didascalia:
            'Le panneau s’ouvre à droite et la page se resserre, sans être couverte : on ' +
            'demande en regardant la chose sur laquelle on demande.',
          legenda: [
            'Le bouton au robot, à côté de **Projeter** : ouvre et ferme le panneau.',
            'Le filtre du contexte : ce que le modèle sait de la page.',
            'Détache le panneau dans sa propre fenêtre. À côté, la corbeille et la croix.',
            'Les lectures que le modèle a faites, avec le nom de la procédure.',
            'Les données lues, mises en page par le registre : pas recopiées par le modèle.',
            'Le champ, le micro de la dictée et **Demander**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'L’activer',
          testo:
            'Il est désactivé par défaut. Dans Paramètres › Programme › **Assistant et ' +
            'modèles**, à la ligne **Assistant** de **Qui répond**, on choisit un modèle et on ' +
            'l’active. Dès lors, ' +
            'à droite de la ligne des listes déroulantes, à côté de **Projeter**, apparaît le ' +
            'bouton au robot.',
        },
        {
          termine: 'Demander',
          tasti: 'Entrée / Maj+Entrée',
          testo:
            'On écrit dans le champ puis Entrée, ou **Demander** ; Maj+Entrée va à la ligne. ' +
            'Pendant qu’il répond, **Arrêter** l’arrête vraiment : le modèle cesse de lire, et ' +
            'à la place de la réponse il reste « Arrêté. ». Échap ferme le panneau, mais ' +
            'n’arrête pas la réponse.',
        },
        {
          termine: 'Ce qu’il sait lire',
          testo:
            'Cours et classes, présences et moyennes par semestre, qui dépasse le seuil ' +
            `d’absences, la fiche et les adresses de contact des ${FR.pif.plurale}, les leçons au ` +
            'calendrier, l’appel d’une leçon, la prochaine leçon, notes et évaluations, plans, ' +
            `${FR.pendenza.plurale}, la carte et un résumé du registre en chiffres.`,
        },
        {
          termine: 'Ouvrir une page',
          testo:
            '« Emmène-moi aux évaluations de la 4a » : en plus de lire, l’assistant peut amener ' +
            'le registre sur une page. On revient en arrière comme toujours, d’un clic.',
        },
        {
          termine: 'Ce qu’il ne fait pas',
          testo:
            'Il ne saisit rien, ne corrige rien, n’envoie rien : les procédures qui écrivent ne ' +
            'lui parviennent pas, et aucun paramètre ne le lui permet. L’en-tête le rappelle : ' +
            '« n’écrit pas ».',
        },
        {
          termine: 'Vérifier une réponse',
          testo:
            'En tête de la réponse figurent les procédures qu’il a ouvertes (`corso.presenze`), ' +
            'avec une coche ou, si elles n’ont pas abouti, la raison. En dessous, les données ' +
            'lues en tableau ; si elles sont coupées, il le dit : « On en voit 12 sur 25 ».',
        },
        {
          termine: 'La note sous la réponse',
          testo:
            '« J’ai fait toutes les lectures que je peux faire pour une question » : le modèle ' +
            'a ouvert toutes les procédures qu’un tour permet, et a répondu avec ce qu’il avait ' +
            'lu jusque-là. S’il manque quelque chose, pose une question plus précise.',
        },
        {
          termine: 'Questions à la suite',
          testo:
            '« Et en deuxième ? », « et la semaine passée ? » : l’assistant se souvient de la ' +
            'conversation, des personnes et des cours qu’il a déjà trouvés, et ne les recherche ' +
            'pas à chaque fois.',
        },
        {
          termine: 'Dans sa propre fenêtre',
          testo:
            'Le bouton aux deux rectangles, dans l’en-tête, emmène la conversation dans une ' +
            'fenêtre qu’on déplace et qu’on agrandit, même au milieu d’une réponse. ' +
            '**Rattacher** la ramène dans le panneau, même avec une réponse en cours ; fermée ' +
            'par la croix, la conversation s’en va avec elle, et la réponse qu’elle attendait ' +
            's’arrête.',
        },
        {
          termine: 'Oublier',
          testo:
            'La conversation n’est enregistrée nulle part : en fermant le registre, elle est ' +
            'perdue, et la corbeille **Oublier la conversation** l’efface tout de suite.',
        },
        {
          termine: 'S’il est lent',
          testo:
            'La première question charge le modèle, de cinq à trente secondes ; ensuite il ' +
            'reste en mémoire. Sans carte graphique, une réponse peut prendre plus d’une ' +
            'minute, et plus elle touche de classes, plus elle est longue. Un modèle plus ' +
            'petit, choisi dans Paramètres › Programme › **Assistant et modèles**, répond plus ' +
            'vite.',
        },
      ],
      note: [
        'Une réponse sans aucune procédure en tête n’a rien lu du registre : noms et chiffres ' +
          'sont à prendre avec des pincettes.',
        'En un tour, le modèle ouvre au plus dix procédures : au-delà, on lui répond qu’il ' +
          'n’y en a plus et qu’il doit conclure avec ce qu’il a lu, en disant ce qu’il n’a pas ' +
          'trouvé. S’il insiste trois fois, on lui retire les outils.',
      ],
    },
    contestoAssistente: {
      titolo: 'Ce qu’il sait de la page',
      sommario:
        'Le filtre dans l’en-tête de l’assistant : ce qui, de la page ouverte, accompagne la ' +
        'question.',
      scritte: {
        pagina: 'Page',
        tendineFiltri: 'menus, filtres, liste',
        filtro: 'Filtre',
        partiAccese: 'les parties actives',
        modello: 'Modèle',
        sulComputer: 'sur l’ordinateur',
        risposta: 'Réponse',
        testoETabelle: 'texte et tableaux',
        domanda: 'Question',
        quelCheScrivi: 'ce que tu écris',
        letture: 'Lectures',
        soloLettura: 'lecture seule',
        finoA10: 'jusqu’à 10 fois',
      },
      figure: [
        {
          didascalia:
            'La question part avec ce qui reste de la page après le filtre. Le modèle lit le ' +
            'registre autant de fois qu’il lui faut, puis répond.',
          legenda: [
            'Le filtre s’applique quand tu appuies sur Entrée : c’est son état à ce moment ' +
              'qui compte.',
            'Les lectures passent seulement par des procédures qui ne changent rien.',
            'Dans la réponse, les données lues arrivent comme des tableaux du registre.',
          ],
        },
      ],
      voci: [
        {
          termine: 'En un geste',
          testo:
            'En haut du menu du filtre : **Tout le contexte** (le cas normal), **Seulement où ' +
            'je suis** — page, onglet et période, ni listes déroulantes ni listes — et **Rien ' +
            'du tout**.',
        },
        {
          termine: 'Une partie à la fois',
          testo:
            'En dessous, huit interrupteurs indépendants : **La page que je regarde**, **Les ' +
            'listes déroulantes de la barre**, **Les autres entrées des listes déroulantes**, ' +
            '**Les filtres de la page**, **Période des comptes**, **Les identifiants**, **La recherche tapée**, ' +
            '**La liste à l’écran**. Sous chaque entrée se lit la valeur actuelle.',
        },
        {
          termine: 'Une seule liste',
          testo:
            'Les listes déroulantes et les filtres se désactivent aussi un par un : « et dans ' +
            'les autres cours ? » veut enlever le cours et garder la période. Le menu reste ' +
            'ouvert entre deux coches.',
        },
        {
          termine: 'Comment on le voit',
          testo:
            'La ligne sous « Assistant » le dit sans rien ouvrir : « contexte réduit (2) » ' +
            'quand deux choses sont désactivées, parties ou listes seules, « sans contexte » ' +
            'quand rien ne part. Tout activé, rien ne s’affiche.',
        },
        {
          termine: 'Quand le désactiver',
          testo:
            'Pour une question générale — « comment se calcule le taux d’absence ? » — que les ' +
            'filtres de la page restreindraient sans raison. Ou pour ne pas nommer au modèle la ' +
            'classe qu’on a devant soi.',
        },
        {
          termine: 'Ça reste comme c’était',
          testo:
            'Le choix est gardé d’une fois à l’autre, même en fermant le registre.',
        },
      ],
      note: [
        'Sans **Les identifiants**, la liste à l’écran arrive comme un nombre — « 25 ' +
          `${FR.pif.plurale} » — et non comme une liste de noms : pour en trouver un, ` +
          'l’assistant doit le chercher.',
        'Si la réponse parle du mauvais cours, regarde le filtre : une liste désactivée ' +
          'laisse le modèle deviner. Mieux encore, nomme le cours et la classe dans la ' +
          'question.',
      ],
    },
    dettatura: {
      titolo: 'Dictée',
      sommario:
        'Dire la question à l’assistant au lieu de la taper. La voix, c’est voicebox qui la ' +
        'reconnaît, un programme à part qui tourne sur l’ordinateur.',
      scritte: {
        microfono: 'Microphone',
        pezzi: 'Morceaux',
        tagliati: 'coupés aux pauses',
        sulComputer: 'sur l’ordinateur',
        casella: 'Champ',
        siRilegge: 'on relit',
        chiedi: 'Demander',
        soloQuestoPc: 'ce PC seulement',
        primaVolta: 'La première fois',
        scaricaModello: 'voicebox télécharge le modèle',
      },
      figure: [
        {
          didascalia:
            'La voix se coupe aux pauses et chaque morceau se transcrit dès qu’il est fermé : ' +
            'les mots apparaissent pendant qu’on parle. C’est toi qui envoies la question.',
          legenda: [
            'Un morceau se ferme à chaque pause d’un peu plus d’une demi-seconde, ou après ' +
              'douze secondes.',
            'voicebox reconnaît le français avec Whisper, sur l’ordinateur et sans réseau.',
            'Le texte s’ajoute à ce qui était déjà écrit dans le champ.',
          ],
        },
      ],
      voci: [
        {
          termine: 'D’abord : voicebox',
          testo:
            'Ce n’est pas le registre qui reconnaît la voix, mais **voicebox**, un programme ' +
            'gratuit qui se télécharge sur github.com/jamiepine/voicebox et s’installe comme ' +
            'les autres. Pendant la dictée, il doit être ouvert : le registre le cherche sur ' +
            'http://127.0.0.1:17493, l’adresse que voicebox utilise de lui-même. Si tu le ' +
            'lances sur un autre port, on le change dans **Port de voicebox**, dans **Avancé** ' +
            'd’Assistant et modèles.',
        },
        {
          termine: 'L’activer',
          testo:
            'Dans Paramètres › Programme › **Assistant et modèles**, à la ligne **Dictée** de ' +
            '**Qui répond**. Le micro ' +
            'apparaît à côté du champ de l’assistant, dans le panneau et dans la fenêtre ' +
            'détachée.',
        },
        {
          termine: 'Dicter',
          testo:
            'On appuie sur le micro et on parle ; le bouton devient **Arrêter**, qui termine ' +
            'l’écoute et écrit le dernier morceau. Puis on relit, on corrige et **Demander**.',
        },
        {
          termine: 'Laisser tomber',
          tasti: 'Échap',
          testo:
            'Échap dans le champ, pendant l’écoute, jette ce qui n’est pas encore écrit et ' +
            'ferme le micro. Ce qui était déjà dans le champ reste.',
        },
        {
          termine: 'La première fois',
          testo:
            'voicebox télécharge de lui-même le modèle choisi la première fois qu’on le lui ' +
            'demande : pendant ce temps, la ligne sous le champ dit « réessaie dans un ' +
            'instant ». Si voicebox est fermé, la même ligne dit qu’il ne répond pas. Si ' +
            'Windows refuse le micro aux applications, elle le dit aussi : on l’autorise dans ' +
            'Confidentialité et sécurité › Microphone.',
        },
        {
          termine: 'Le modèle',
          testo:
            'À la ligne **Dictée** de Paramètres › Programme › **Assistant et modèles**, on ' +
            'choisit ' +
            'la taille de Whisper : **turbo**, par défaut, est le plus précis des rapides ; ' +
            '**large** est un peu plus précis et lent sans carte graphique ; **medium** est un ' +
            'entre-deux pour un ordinateur qui peine avec turbo ; **small** se trompe sur les ' +
            'noms de famille ; **base** ne sert qu’à essayer.',
        },
        {
          termine: 'Mots d’école',
          testo:
            'voicebox ne reçoit pas de vocabulaire : « justificatif », « insuffisant » ou ' +
            'le nom d’une classe, il les reconnaît comme le modèle les reconnaît tout seul. On ' +
            'relit avant d’envoyer.',
        },
        {
          termine: 'Micro oublié',
          testo:
            'Après dix minutes d’écoute, le micro se ferme tout seul.',
        },
      ],
      note: [
        'Chaque morceau de voix va à voicebox en mémoire, sans passer par le disque du ' +
          'registre ; voicebox le garde dans un fichier temporaire le temps de le transcrire, ' +
          'puis l’efface, sans le mettre parmi ses « Captures ». L’adresse ne peut être que ' +
          'celle de cet ordinateur — 127.0.0.1, localhost ou [::1] — : la voix ne sort pas ' +
          'd’ici.',
      ],
    },
    privacyAssistente: {
      titolo: 'Ce qui sort de l’ordinateur',
      sommario:
        `Questions, réponses et données des ${FR.pif.plurale} restent sur la machine. De ` +
        'l’assistant et de la section des modèles de langage ne partent vers le réseau que ' +
        'des demandes de fichiers.',
      scritte: {
        ilTuoComputer: 'Ton ordinateur',
        registro: 'Registre',
        conDentro: 'avec le modèle dedans',
        cartellaModelli: 'Dossier des modèles',
        fileGguf: 'fichiers .gguf',
        dettatura: 'Dictée',
        condotto: 'Canal',
        spentoDiSerie: 'désactivé par défaut',
        modelliPubblici: 'modèles publics',
        altriProgrammi: 'Autres programmes',
        fuoriDalRegistro: 'hors du registre',
        richieste: 'requêtes',
        pesi: 'poids',
      },
      figure: [
        {
          didascalia:
            'À l’intérieur du pointillé, tout travaille : registre, modèle, dictée. De ' +
            'l’extérieur n’entrent que les fichiers téléchargés.',
          legenda: [
            'Le modèle est un fichier chargé dans le registre : aucune requête réseau.',
            'Vers Hugging Face partent les mots cherchés et les noms des fichiers à ' +
              'télécharger ; les poids reviennent.',
            'Le canal, si tu l’actives, laisse d’autres programmes lire le registre.',
          ],
        },
      ],
      voci: [
        {
          termine: 'La conversation',
          testo:
            'Question, contexte de la page, lectures et réponse ne passent pas par le réseau : ' +
            'le modèle tourne dans le processus du registre, et il n’y a pas d’adresse à ' +
            'configurer.',
        },
        {
          termine: 'Les noms des personnes',
          testo:
            `Noms, notes et absences des ${FR.pif.plurale} n’arrivent au modèle que s’ils ` +
            'servent à la question, et le modèle est sur l’ordinateur. Pour ne pas même lui ' +
            'nommer la classe ouverte, on désactive le contexte.',
        },
        {
          termine: 'Ce qui va sur le réseau',
          testo:
            'Des demandes de fichiers, rien d’autre : les mots tapés dans **Chercher sur ' +
            'Hugging Face** et les noms des dépôts et des fichiers à télécharger. Aucune ne ' +
            'porte de données du registre.',
        },
        {
          termine: 'Ce qui est vérifié à l’arrivée',
          testo:
            'Le programme de llama.cpp qui lit les scans a une version fixée et une empreinte ' +
            'vérifiée. D’un `.gguf` pris sur Hugging Face, on vérifie seulement que c’est bien ' +
            'un GGUF. Les modèles de la dictée, c’est voicebox qui les télécharge, pas le ' +
            'registre.',
        },
        {
          termine: 'Les autres sorties du registre',
          testo:
            'En dehors de l’assistant, le registre parle avec le réseau à d’autres endroits. La ' +
            'carte envoie les adresses des données personnelles à OpenStreetMap pour les ' +
            'situer, et télécharge les fonds de carte de la zone regardée. Le courrier passe ' +
            'par la connexion Microsoft quand tu connectes la boîte, et n’envoie les messages ' +
            'qu’avec « Envoyer sans brouillon » activé. OneDrive se lit par Microsoft Graph ' +
            'seulement pour les comptes que tu connectes, quand tu parcours ou cherches les ' +
            'documents. Le calendrier ICS de l’école se ' +
            'télécharge depuis le lien que tu as saisi, sans envoyer de données du registre. ' +
            'Les mises à jour demandent à GitHub la dernière version et, s’il y en a une, en ' +
            'téléchargent l’installateur depuis là. La première fois qu’il lit un scan, le ' +
            'registre télécharge depuis GitHub le programme de llama.cpp, si le **Programme de ' +
            'lecture** est « Par le registre ».',
        },
        {
          termine: 'La fenêtre détachée',
          testo:
            'Elle ne reçoit pas le registre : elle sait seulement si l’assistant est activé, ' +
            'quel modèle répond et si la dictée est activée. Dedans, il y a la conversation et ' +
            'rien d’autre.',
        },
        {
          termine: 'Après',
          testo:
            'Rien ne reste : la conversation ne s’écrit pas sur le disque, et l’audio de la ' +
            'dictée s’efface dès qu’il est transcrit.',
        },
      ],
      note: [
        'Le canal est une autre porte. Activé dans Paramètres › Programme › **Avancé**, il ' +
          'laisse lire les données des ' +
          `${FR.pif.plurale} à tout programme qui tourne sous ton utilisateur, sans ` +
          'demander — même à un programme qui les envoie à un modèle en ligne. Par défaut, il ' +
          'est désactivé. Sous Windows, son nom porte un secret refait à chaque activation : ' +
          'il tient à l’écart les autres utilisateurs de l’ordinateur, pas les programmes du ' +
          'tien.',
      ],
    },
  },
  en: {
    modelliLinguistici: {
      titolo: 'Assistant and models',
      sommario:
        'Settings › Program › **Assistant and models**: who answers for each use, and the ' +
        'model files on the computer: downloading them, choosing them, removing them.',
      scritte: {
        impostazioni: 'Settings',
        guida: 'Help',
        chiRisponde: 'Who answers',
        assistente: 'Assistant',
        pronto: 'ready',
        scansioni: 'Scans',
        nessuno: '— none —',
        spento: 'off',
        dettatura: 'Dictation',
        sulComputer: 'On this computer',
        cartella: 'Models folder',
        peso: '4.7 GB',
        trascina: 'Drag a .gguf here, or',
        caricaFile: 'Load a file…',
        scaricaModelli: 'Download models',
        avanzate: 'Advanced (1)',
      },
      figure: [
        {
          didascalia:
            'The section from above: at the top who answers, below the folder and the files ' +
            'already there, at the bottom two closed groups. While a file is downloading, ' +
            '**Downloading** appears above everything.',
          legenda: [
            '**Who answers**: one row per use, with the switch, the model drop-down and the ' +
              'state — “ready”, “something missing” or “off” — with the reason.',
            '**On this computer**: the **Models folder**, the files with their size and the ' +
              'bin, and the box to drag one into.',
            '**Download models**: the recommended ones, the files of a repository, the Hugging ' +
              'Face search. It only opens by itself when there is no model yet.',
            '**Advanced**: the **voicebox port**. Closed; you open it by hand.',
          ],
        },
      ],
      voci: [
        {
          termine: 'What they are for',
          testo:
            'Three uses: the **assistant**, which answers questions about the register, **scan ' +
            'reading**, which looks for the names in PDFs without text, and **dictation**, ' +
            'which writes what you say. The first two have their own model: a `.gguf` file, ' +
            'from half a gigabyte to six. Dictation relies on voicebox.',
        },
        {
          termine: 'Who answers',
          testo:
            'Three rows at the top, one per use, each with its switch and its state: “ready”, ' +
            '“something missing” or “off”, with the reason. **Assistant**: the model ' +
            'drop-down, a model that can call tools. **Scan reading**: the model that can ' +
            'see, the **projector (mmproj)** drop-down — the file with `mmproj` in its name — ' +
            'and the **Reading program**. **Dictation**: the **Voice model**; when on, it ' +
            'reminds you that voicebox must be open. A model is chosen only from these ' +
            'drop-downs.',
        },
        {
          termine: 'Reading program',
          testo:
            'The program that lets the model read scans. **By the register**, the default: the ' +
            'first time it is needed it fetches `llama-mtmd-cli` on its own, in a fixed ' +
            'version, and checks its fingerprint. **This .exe**: a copy of your own, for ' +
            'example with graphics card acceleration; it shows the path and **Browse…**, and ' +
            'until you pick a file the previous choice still applies. **Do not download**, on ' +
            'a metered connection: the register fetches nothing from the internet.',
        },
        {
          termine: 'The recommended ones',
          testo:
            'In the closed group **Download models**, which only opens by itself when there is ' +
            'no model yet. For the assistant **Qwen 2.5 — 7 billion** (about 5 GB, needs 8 GB of free ' +
            'memory) or **Qwen 2.5 — 3 billion** (2 GB, faster but wrong more often). For ' +
            'scans **Qwen 2.5 VL** (6 GB, reads handwriting too) or **SmolVLM** (under 1 GB, ' +
            'print only).',
        },
        {
          termine: 'Downloading',
          testo:
            '**Download** fetches the recommended variant and, once finished, chooses it for its ' +
            'job, unless you have chosen another one in the meantime. It switches nothing on: ' +
            'if the use was off, you turn its switch in **Who answers** by hand. For a model ' +
            'that sees, the projector is downloaded afterwards, from the list of files that ' +
            'opens below, and chosen by hand in its drop-down.',
        },
        {
          termine: 'While it downloads',
          testo:
            'One file downloads at a time: the others line up with **Add to queue**. At the top of ' +
            'the page the **Downloading** card shows how far it has got, and **Stop** ' +
            'interrupts it.',
        },
        {
          termine: 'A download left half-way',
          testo:
            'It stays in the list with “half downloaded”: **Resume** carries on from where it ' +
            'was, not from the start; **Throw away** frees the space.',
        },
        {
          termine: 'A file you already have',
          testo:
            'Drag it into the dashed box of **On this computer**, or pick it with **Load a ' +
            'file…**: the register copies it into the models folder.',
        },
        {
          termine: 'Search Hugging Face',
          testo:
            'At the bottom of **Download models**, for those who know what they want: “qwen”, ' +
            '“vision”, “7b”, then **Search**. ' +
            '**See the files** shows the variants in a repository, with the size and ' +
            '“recommended” where it applies. Repositories marked “requires permission” can’t ' +
            'be downloaded from here.',
        },
        {
          termine: 'Removing a model',
          testo:
            'The bin next to the file, then **Remove** in the confirmation: the file is deleted ' +
            'from the disk. If it was at work, the register unloads it from memory first.',
        },
        {
          termine: 'Where they are kept',
          testo:
            'One place only: the **Models folder** field, in **On this computer**. Left empty, ' +
            'the register takes care of it, and below you can read where they are: by default ' +
            'next to the program settings. For another disk, or for models already downloaded ' +
            'elsewhere, you set another folder: the register sees them all without copying ' +
            'them.',
        },
        {
          termine: 'voicebox port',
          testo:
            'In the closed group **Advanced**, at the bottom: the port voicebox answers on, ' +
            'from 1 to 65535, 17493 by default. The host is fixed, 127.0.0.1: your voice does ' +
            'not leave the computer.',
        },
      ],
      note: [
        'To get started, the first of the recommended ones is enough. The 3 billion one is ' +
          'for machines without a graphics card or with little memory; the graphics card, if ' +
          'there is one, the register uses by itself.',
        'The assistant’s model is loaded inside the register; for scans the register starts a ' +
          'llama.cpp program, which by default downloads itself the first time (about twenty ' +
          'MB). ' +
          'Neither is a service to install.',
      ],
    },
    assistente: {
      titolo: 'Assistant',
      sommario:
        'Ask about the register in your own words: a model on the computer reads the data and ' +
        'answers. It writes nothing.',
      scritte: {
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        corso: 'Course',
        proietta: 'Project',
        assistente: 'Assistant',
        nonScrive: 'model · doesn’t write',
        chiedi: 'Ask',
      },
      figure: [
        {
          didascalia:
            'The panel opens on the right and the page narrows, without being covered: you ask ' +
            'while looking at the thing you are asking about.',
          legenda: [
            'The robot button, next to **Project**: opens and closes the panel.',
            'The context filter: what the model knows about the page.',
            'Detaches the panel into a window of its own. Next to it, the bin and the cross.',
            'The look-ups the model made, with the name of the procedure.',
            'The data read, laid out by the register: not copied out by the model.',
            'The box, the dictation microphone and **Ask**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Turning it on',
          testo:
            'It is off by default. In Settings › Program › **Assistant and models**, on the ' +
            '**Assistant** row of **Who answers**, you choose a model and turn it on. From then ' +
            'on, to the ' +
            'right of the drop-downs row, next to **Project**, the robot button appears.',
        },
        {
          termine: 'Asking',
          tasti: 'Enter / Shift+Enter',
          testo:
            'Type in the box and press Enter, or **Ask**; Shift+Enter starts a new line. While ' +
            'it answers, **Stop** really stops it: the model stops reading, and in place of the ' +
            'answer “Stopped.” remains. Esc closes the panel, but doesn’t stop the answer.',
        },
        {
          termine: 'What it can read',
          testo:
            'Courses and classes, attendance and averages per semester, who is over the ' +
            `absence threshold, the ${EN.pif.plurale}’ records and contact addresses, the ` +
            'lessons on the calendar, the attendance of a lesson, the next lesson, grades and ' +
            `${EN.momento.plurale}, plans, open ${EN.pendenza.plurale}, the map and a summary ` +
            'of the register in figures.',
        },
        {
          termine: 'Opening a page',
          testo:
            '“Take me to the assessments of 4a”: as well as reading, the assistant can move the ' +
            'register to a page. You go back as always, with a click.',
        },
        {
          termine: 'What it doesn’t do',
          testo:
            'It doesn’t record, correct or send anything: the procedures that write don’t reach ' +
            'it, and no setting allows it. The header reminds you: “doesn’t write”.',
        },
        {
          termine: 'Checking an answer',
          testo:
            'At the top of the answer are the procedures it opened (`corso.presenze`), with a ' +
            'tick or, if they failed, the reason. Below, the data read in a table; if it is ' +
            'cut short, it says so: “Showing 12 of 25”.',
        },
        {
          termine: 'The note under the answer',
          testo:
            '“I have used up the look-ups I can make for one question”: the model opened all ' +
            'the procedures a round allows, and answered with what it had read so far. If ' +
            'something is missing, ask something narrower.',
        },
        {
          termine: 'Follow-up questions',
          testo:
            '“And in the second year?”, “and last week?”: the assistant remembers the ' +
            'conversation and the people and courses it has already found, and doesn’t look ' +
            'them up again each time.',
        },
        {
          termine: 'In a window of its own',
          testo:
            'The button with the two rectangles, in the header, takes the conversation into a ' +
            'window you can move and enlarge, even half-way through an answer. **Reattach** ' +
            'returns it to the panel, even with an answer in progress; closed with the cross, ' +
            'the conversation goes with it, and the answer it was waiting for stops.',
        },
        {
          termine: 'Forgetting',
          testo:
            'The conversation isn’t saved anywhere: closing the register loses it, and the bin ' +
            '**Forget the conversation** clears it at once.',
        },
        {
          termine: 'If it is slow',
          testo:
            'The first question loads the model, from five to thirty seconds; then it stays in ' +
            'memory. Without a graphics card an answer can take more than a minute, and the ' +
            'more classes it touches, the longer it takes. A smaller model, chosen in Settings ' +
            '› Program › **Assistant and models**, answers sooner.',
        },
      ],
      note: [
        'An answer with no procedure at the top hasn’t read anything from the register: take ' +
          'names and figures with a pinch of salt.',
        'In one round the model opens at most ten procedures: beyond that, it is told they ' +
          'have run out and to conclude with what it has read, saying what it didn’t find. If ' +
          'it insists three times, its tools are taken away.',
      ],
    },
    contestoAssistente: {
      titolo: 'What it knows about the page',
      sommario:
        'The filter in the assistant’s header: how much of the open page goes with the ' +
        'question.',
      scritte: {
        pagina: 'Page',
        tendineFiltri: 'menus, filters, list',
        filtro: 'Filter',
        partiAccese: 'the parts left on',
        modello: 'Model',
        sulComputer: 'on the computer',
        risposta: 'Answer',
        testoETabelle: 'text and tables',
        domanda: 'Question',
        quelCheScrivi: 'what you type',
        letture: 'Look-ups',
        soloLettura: 'read-only',
        finoA10: 'up to 10 times',
      },
      figure: [
        {
          didascalia:
            'The question sets off with whatever is left of the page after the filter. The ' +
            'model reads the register as many times as it needs, then answers.',
          legenda: [
            'The filter applies when you press Enter: what counts is how it is at that moment.',
            'Look-ups only go through procedures that change nothing.',
            'In the answer, the data read arrives as the register’s tables.',
          ],
        },
      ],
      voci: [
        {
          termine: 'In one go',
          testo:
            'At the top of the filter menu: **All the context** (the normal case), **Only ' +
            'where I am** — page, tab and period, no drop-downs or lists — and **Nothing at ' +
            'all**.',
        },
        {
          termine: 'One part at a time',
          testo:
            'Below, eight independent switches: **The page I’m looking at**, **The drop-downs ' +
            'in the bar**, **The other items in the drop-downs**, **The page’s filters**, ' +
            '**Period for the counts**, **The identifiers**, **The search typed**, **The list ' +
            'on screen**. ' +
            'Under each item you can read its current value.',
        },
        {
          termine: 'A single drop-down',
          testo:
            'Drop-downs and filters can also be switched off one by one: “and in the other ' +
            'courses?” wants to drop the course and keep the period. The menu stays open ' +
            'between one tick and the next.',
        },
        {
          termine: 'How you can tell',
          testo:
            'The line under “Assistant” says so without opening anything: “reduced context ' +
            '(2)” when two things are off, parts or single drop-downs, “no context” when ' +
            'nothing goes. When everything is on, nothing is shown.',
        },
        {
          termine: 'When to turn it off',
          testo:
            'For a general question — “how is the absence rate worked out?” — that the page ' +
            'filters would narrow for no reason. Or so as not to name to the model the class ' +
            'you have in front of you.',
        },
        {
          termine: 'It stays as it was',
          testo:
            'The choice is remembered from one time to the next, even after closing the ' +
            'register.',
        },
      ],
      note: [
        'Without **The identifiers** the list on screen arrives as a count — “25 ' +
          `${EN.pif.plurale}” — and not as a list of names: to find one, the assistant has ` +
          'to look them up.',
        'If the answer talks about the wrong course, check the filter: a drop-down switched ' +
          'off leaves the model guessing. Better still, name the course and class in the ' +
          'question.',
      ],
    },
    dettatura: {
      titolo: 'Dictation',
      sommario:
        'Saying the question to the assistant instead of typing it. The voice is recognised ' +
        'by voicebox, a separate program that runs on the computer.',
      scritte: {
        microfono: 'Microphone',
        pezzi: 'Chunks',
        tagliati: 'cut at pauses',
        sulComputer: 'on the computer',
        casella: 'Box',
        siRilegge: 'read it over',
        chiedi: 'Ask',
        soloQuestoPc: 'this PC only',
        primaVolta: 'First time',
        scaricaModello: 'voicebox downloads the model',
      },
      figure: [
        {
          didascalia:
            'The voice is cut at the pauses and each chunk is transcribed as soon as it closes: ' +
            'the words appear while you speak. Sending the question is up to you.',
          legenda: [
            'A chunk closes at every pause of just over half a second, or after twelve seconds.',
            'voicebox recognises English with Whisper, on the computer and without a network.',
            'The text is added to whatever was already written in the box.',
          ],
        },
      ],
      voci: [
        {
          termine: 'First: voicebox',
          testo:
            'The voice isn’t recognised by the register but by **voicebox**, a free program ' +
            'you download from github.com/jamiepine/voicebox and install like any other. While ' +
            'you dictate it must be open: the register looks for it at ' +
            'http://127.0.0.1:17493, which is the address voicebox uses by itself. If you start ' +
            'it on another port, you change it in **voicebox port**, under **Advanced** in ' +
            'Assistant and models.',
        },
        {
          termine: 'Turning it on',
          testo:
            'In Settings › Program › **Assistant and models**, on the **Dictation** row of ' +
            '**Who answers**. The microphone ' +
            'appears next to the assistant’s box, in the panel and in the detached window.',
        },
        {
          termine: 'Dictating',
          testo:
            'Press the microphone and speak; the button becomes **Stop**, which ends the ' +
            'listening and writes the last chunk. Then read it over, correct it and **Ask**.',
        },
        {
          termine: 'Giving up',
          tasti: 'Esc',
          testo:
            'Esc in the box, while it is listening, throws away what hasn’t been written yet ' +
            'and closes the microphone. Whatever was already in the box stays.',
        },
        {
          termine: 'The first time',
          testo:
            'voicebox downloads the chosen model on its own the first time it is asked for: ' +
            'meanwhile the line under the box says “try again shortly”. If voicebox is closed, ' +
            'the same line says it isn’t responding. If Windows denies apps the microphone, it ' +
            'says that too: you allow it in Privacy & security › Microphone.',
        },
        {
          termine: 'The model',
          testo:
            'On the **Dictation** row of Settings › Program › **Assistant and models** you ' +
            'choose the ' +
            'size of Whisper: **turbo**, the default, is the most accurate of the fast ones; ' +
            '**large** is a little more precise and slow without a graphics card; **medium** ' +
            'is a middle way for a computer that struggles with turbo; **small** gets surnames ' +
            'wrong; **base** is only for trying out.',
        },
        {
          termine: 'School words',
          testo:
            'voicebox isn’t given a vocabulary: “excuse note”, “insufficient” or the name ' +
            'of a class are recognised as the model recognises them on its own. Read it over ' +
            'before sending.',
        },
        {
          termine: 'Microphone left on',
          testo:
            'After ten minutes of listening the microphone closes by itself.',
        },
      ],
      note: [
        'Each chunk of voice goes to voicebox in memory, without passing through the ' +
          'register’s disk; voicebox keeps it in a temporary file for as long as it takes to ' +
          'transcribe it and then deletes it, without putting it among its “Captures”. The ' +
          'address can only be this computer’s — 127.0.0.1, localhost or [::1] —: the voice ' +
          'doesn’t leave it.',
      ],
    },
    privacyAssistente: {
      titolo: 'What leaves the computer',
      sommario:
        `Questions, answers and ${EN.pif.plurale}’ data stay on the machine. From the ` +
        'assistant and the language models section, only requests for files go out to the ' +
        'network.',
      scritte: {
        ilTuoComputer: 'Your computer',
        registro: 'Register',
        conDentro: 'with the model inside',
        cartellaModelli: 'Models folder',
        fileGguf: '.gguf files',
        dettatura: 'Dictation',
        condotto: 'Pipe',
        spentoDiSerie: 'off by default',
        modelliPubblici: 'public models',
        altriProgrammi: 'Other programs',
        fuoriDalRegistro: 'outside the register',
        richieste: 'requests',
        pesi: 'weights',
      },
      figure: [
        {
          didascalia:
            'Inside the dashed line everything works: register, model, dictation. From outside ' +
            'only the downloaded files come in.',
          legenda: [
            'The model is a file loaded inside the register: no network requests.',
            'The search words and the names of the files to download go to Hugging Face; the ' +
              'weights come back.',
            'The pipe, if you turn it on, lets other programs read the register.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The conversation',
          testo:
            'Question, page context, look-ups and answer don’t go over the network: the model ' +
            'runs in the register’s process, and there is no address to configure.',
        },
        {
          termine: 'People’s names',
          testo:
            `The ${EN.pif.plurale}’ names, grades and absences reach the model only if the ` +
            'question needs them, and the model is on the computer. To avoid naming even the ' +
            'open class to it, turn off the context.',
        },
        {
          termine: 'What goes over the network',
          testo:
            'Requests for files, nothing else: the words typed in **Search Hugging Face** and ' +
            'the names of the repositories and files to download. None carries data from the ' +
            'register.',
        },
        {
          termine: 'What is checked on arrival',
          testo:
            'The llama.cpp program that reads scans has a pinned version and a checked ' +
            'fingerprint. For a `.gguf` taken from Hugging Face, the only check is that it ' +
            'really is a GGUF. The dictation models are downloaded by voicebox, not by the ' +
            'register.',
        },
        {
          termine: 'The register’s other ways out',
          testo:
            'Outside the assistant, the register talks to the network in other places. The map ' +
            'sends the addresses from the personal details to OpenStreetMap to place them, and ' +
            'downloads the map tiles of the area being viewed. Mail goes through the Microsoft ' +
            'sign-in when you connect the mailbox, and sends messages only with “Send without a ' +
            'draft” turned on. OneDrive is read through Microsoft Graph only for the accounts ' +
            'you connect, when you browse or look for documents. The school’s ICS calendar is ' +
            'downloaded from the link you ' +
            'entered, without sending any register data. Updates ask GitHub for the latest ' +
            'version and, if there is one, download the installer from there. The first time ' +
            'it reads a scan, the register downloads the llama.cpp program from GitHub, if ' +
            'the **Reading program** is set to “By the register”.',
        },
        {
          termine: 'The detached window',
          testo:
            'It doesn’t receive the register: it only knows whether the assistant is on, which ' +
            'model is answering and whether dictation is on. Inside there is the conversation ' +
            'and nothing else.',
        },
        {
          termine: 'Afterwards',
          testo:
            'Nothing remains: the conversation isn’t written to disk, and the dictation audio ' +
            'is deleted as soon as it is transcribed.',
        },
      ],
      note: [
        'The pipe is another door. Turned on in Settings › Program › **Advanced**, it ' +
          `lets every program running under your user read the ${EN.pif.plurale}’ ` +
          'data, without asking — even one that sends it to an online model. By default it is ' +
          'off. On Windows its name carries a secret remade every time it is turned on: it ' +
          'keeps out the computer’s other users, not the programs of your own.',
      ],
    },
  },
})
