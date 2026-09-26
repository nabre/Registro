// I testi della guida, parte del Registro: valutazioni, medie, recuperi,
// riconsegne, documenti, fogli. Una chiave per sezione (`TestiSezione`, testa
// di `types.ts`); struttura in `grades.ts`.

import { catalogo } from '../../../i18n/index.js'
import { CARTE, DOCUMENTO_SCHEDE, Molti, PIF, Uno, VALUTAZIONE } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { testi as automazione } from '../../../domain/automation.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const AUT_DE = automazione.in('de')
const AUT_FR = automazione.in('fr')
const AUT_EN = automazione.in('en')

const it = {
  valutazioni: {
    titolo: 'Valutazioni',
    sommario:
      `La griglia dei voti di un corso: righe le ${PIF.plurale}, colonne i ` +
      `${VALUTAZIONE.momento.plurale} del periodo.`,
    scritte: {
      // Le pagine del gruppo Registro nella barra laterale, nel loro ordine.
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      stato: 'Periodo · 1° semestre',
      sganciati: '2 momenti non sono agganciati a nessuna tappa del piano',
      media: 'Media',
      nota: 'Nota',
      sigla: 'R',
      mediaClasse: 'Media della classe',
      recuperi: 'Recuperi',
      daFissare: 'da fissare',
      recuperata: 'recuperata',
      prova: 'Verifica 4',
      numeri: 'media 4.88 · 75%',
      riconsegna: 'Riconsegna',
      resaATutti: 'Resa a tutti · 4',
      proveCorrette: 'Prove corrette 3/5',
    },
    figure: [
      {
        didascalia:
          'La pagina di un corso, nel periodo scelto: a sinistra si scrivono i voti, a destra si ' +
          'guarda la prova aperta.',
        legenda: [
          '**Momenti sganciati**: prove che nessuna tappa del piano ha fatto nascere. Il riquadro ' +
            'c’è solo quando ce ne sono.',
          'La **griglia**: una riga per persona, una colonna per prova. In testa il titolo della ' +
            'prova, sotto la data e il peso quando non è 1 (`×2`). Il titolo apre la prova a destra.',
          '**Media** e **Nota** della riga: la nota è verde dalla sufficienza in su, rossa sotto.',
          '**Media della classe**: la media di ogni prova, sui voti messi.',
          '**Recuperi** della prova aperta: chi la rifà, quando, con che voto.',
          'La **prova aperta**: i suoi numeri, il grafico a punti, **Modifica** e **Vai alla ' +
            'lezione**.',
          '**Riconsegna**: a che punto è la prova, e chi deve ancora riaverla.',
          '**Documenti**: verifica, soluzione e prove corrette, in PDF.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Si scrive come in un foglio',
        testo:
          'Ci si sposta con le frecce, si batte il voto e Invio scende; in fondo alla colonna ' +
          'riparte in cima a quella dopo. Ogni casella ha anche la tendina con i voti della ' +
          'sua scala.',
      },
      {
        termine: 'Che cosa si batte in una casella',
        testo:
          'Un numero, anche con la virgola; `X` per l’assenza, la stessa sigla dell’appello ' +
          '(valgono anche `a` e `ass`); `-` o niente per «nessun voto». Quel che non è un voto ' +
          'lampeggia in rosso e resta nel campo, da correggere.',
      },
      {
        termine: 'Chi era assente all’ora della prova',
        testo:
          'Se l’appello di quell’ora lo dà assente anche per una sola UD, la casella vuota ' +
          'mostra la `X` in trasparenza. Per il recupero non serve scriverla; per chiudere la ' +
          'correzione sì: finché la casella resta vuota la prova è «da correggere». Fissare il ' +
          'recupero, o dire che non si recupera, la scrive da sé.',
      },
      {
        termine: 'Da dove nasce una prova',
        testo:
          'Da una tappa del piano segnata «Questa tappa è una prova», con **Crea la prova** ' +
          'nella lezione in cui si ' +
          'fa: da lì prende titolo, tipo, peso e data. Per questo la pagina non ha un pulsante ' +
          'per crearne una.',
      },
      {
        termine: 'Un corso e un periodo alla volta',
        testo:
          'La griglia è del **Corso** scelto in cima e mostra le prove che cadono nel ' +
          '**Periodo**: medie e note sono di quel periodo. Mescolare due materie darebbe un ' +
          'numero che non è la media di niente.',
      },
      {
        termine: 'La prova aperta',
        testo:
          'Un clic sul titolo di una colonna la apre a destra; senza scelta è l’ultima. Data, ' +
          'tipo, peso, voti messi, media, minimo, massimo, quota di sufficienti — verde dal 60% ' +
          'in su — e il grafico a punti. **Vai alla lezione** porta all’ora della prova.',
      },
      {
        termine: 'Correggere o togliere una prova',
        testo:
          '**Modifica** cambia titolo, data, tipo, peso, estremi e sufficienza della scala, ' +
          'descrizione; l’ora e la tappa no, vengono dalla scaletta. Il cestino accanto la ' +
          'elimina, e la conferma dice che cosa se ne va.',
      },
      {
        termine: 'I documenti della prova',
        testo:
          'Nel riquadro **Documenti**, **Allega PDF** per la verifica, la soluzione e la prova ' +
          'corretta di ognuno; il conto dice quante ce ne sono. Un clic sul nome apre il file, ' +
          '**Sostituisci** lo cambia.',
      },
      {
        termine: 'Una «R» accanto al voto',
        testo:
          'Per quella casella c’è un recupero: fermandosi sopra si legge per quando è fissato, ' +
          'o che non si recupera.',
      },
      {
        termine: 'Momenti sganciati',
        testo:
          'Una prova che nessuna tappa ha fatto nascere — il piano o la tappa tolti, la tappa ' +
          'che non è più una prova — ' +
          'compare nel riquadro in cima con quanti voti si porterebbe via. Resta nelle medie ' +
          'finché non la si elimina, una per una o con **Elimina tutti**.',
      },
    ],
    note: [
      'I voti si scrivono in due posti — qui e nella lezione della prova — ma la griglia è ' +
        'una: stesse caselle, stesso voto. Qui si vede l’anno intero, e si correggono i voti ' +
        'vecchi o arrivati in ritardo.',
      'Eliminare una prova porta via i suoi voti, e i PDF allegati escono dal documento ' +
        'dell’anno (non vanno nel cestino del sistema). I voti sono la sola cosa del registro ' +
        'che non si ricostruisce guardando altrove.',
    ],
  },
  medie: {
    titolo: 'Medie e note',
    sommario:
      'Dal voto alla nota di fine semestre: una scala, i pesi, due arrotondamenti diversi.',
    scritte: {
      votoPeso: 'voto × peso',
      fuori: 'X · fuori',
      media: 'Media 4.44',
      conto: '17.75 ÷ 4, al centesimo',
      passo: 'passo 0.5',
      nota: 'Nota 4.5',
      pagella: 'in pagella',
      pesoZero: 'peso 0: il voto resta, la media no',
      passoZero: 'passo 0: la nota è la media',
    },
    figure: [
      {
        didascalia:
          'Tre prove di pesi diversi e un’assenza: la media pesata è 4.44, e la nota di fine ' +
          'semestre la porta al mezzo punto più vicino.',
        legenda: [
          'Ogni voto sta già sul **passo** della sua scala, e pesa quanto dice la prova.',
          'La **media**: somma dei voti per il peso, divisa la somma dei pesi, al centesimo.',
          'La **nota**: la media sul **Passo della nota di fine semestre**, contato da zero.',
        ],
      },
    ],
    voci: [
      {
        termine: 'La scala dei voti',
        testo:
          'Voto minimo, massimo, sufficienza e passo stanno in Impostazioni › ' +
          'Didattica › **Valutazione**; di serie 1–6, sufficienza 4, passo 0.25. Ogni prova se ne copia una ' +
          'quando nasce, e da **Modifica** può avere estremi e sufficienza suoi.',
      },
      {
        termine: 'Il voto sul passo',
        testo:
          'Un voto battuto va sul passo più vicino della sua scala, contato dal minimo: con ' +
          'passo 0.25, 4.6 diventa 4.5. Un voto fuori dalla scala è rifiutato.',
      },
      {
        termine: 'Il peso',
        testo:
          'Quanto conta la prova nella media: da 0 a 10, decimali ammessi. Lo porta la tappa ' +
          'da cui la prova nasce (altrimenti 1) e si cambia da **Modifica**. Con peso 0 il voto ' +
          'resta scritto ma non fa media.',
      },
      {
        termine: 'La media',
        testo:
          'Pesata: ogni voto per il suo peso, diviso la somma dei pesi, al centesimo. Contano ' +
          'le sole prove del **Periodo**; assenze e caselle vuote restano fuori e non abbassano ' +
          'niente.',
      },
      {
        termine: 'La nota di fine semestre',
        testo:
          'La media portata sul **Passo della nota di fine semestre** — di serie 0.5, i mezzi ' +
          'punti — contato da zero: 4.44 dà 4.5, 4.24 dà 4. Con passo 0 la nota è la media ' +
          'com’è.',
      },
      {
        termine: 'La media della classe',
        testo:
          'L’ultima riga della griglia: per ogni prova la media semplice dei voti messi. Il ' +
          'peso conta fra una prova e l’altra, non dentro la stessa.',
      },
      {
        termine: 'Quando al posto della nota c’è «≠»',
        testo:
          'Nel periodo ci sono prove con scale diverse: la media resta un’indicazione, ma non ' +
          'sta su nessuna delle due scale, e una nota calcolata da lì non vorrebbe dire niente.',
      },
    ],
    note: [
      'Due arrotondamenti e non uno: il passo dei voti è la grana con cui si corregge — i ' +
        'quarti — il passo della nota quella con cui si scrive la pagella — i mezzi. Tenuti ' +
        'separati, nessuno deve arrotondare a mente.',
      'Cambiare la scala nelle impostazioni non riscrive i voti già dati: vale per le prove ' +
        'che nasceranno. Il passo della nota invece vale subito, per tutte le note.',
    ],
  },
  recuperi: {
    titolo: 'Recuperi',
    sommario:
      'Chi non c’era alla prova: quando la rifà, o perché non la rifà. Il voto va nella ' +
      'colonna di sempre.',
    scritte: {
      assente: 'Assente',
      xOAppello: 'X o appello',
      daFissare: 'da fissare',
      nessunaData: 'nessuna data',
      fissato: 'fissato',
      giornoCe: 'il giorno c’è',
      recuperata: 'recuperata',
      votoMesso: 'voto messo',
      resa: 'resa',
      riconsegnataIl: 'riconsegnata il…',
      dichiarato: 'dichiarato',
      nonSiRecupera: 'non si recupera',
      senzaVoto: 'senza voto: la X',
      nonRifatta: 'non rifatta',
      dataPassata: 'data passata',
      ilVoto: 'il voto',
    },
    figure: [
      {
        didascalia:
          'Un recupero si chiude in due modi: con un voto, o dichiarando che non si fa. Anche ' +
          'rifatto e valutato, resta aperto finché il foglio non torna.',
        legenda: [
          'Nasce da solo: casella vuota, e `X` alla prova o almeno una UD di assenza all’appello ' +
            'di quell’ora.',
          'Fissare il giorno: il calendario della riga sceglie la prossima ora del corso, la ' +
            'matita una data qualsiasi. Quel giorno la riga dice **oggi**.',
          'Il voto, scritto nella riga o nella griglia, chiude il recupero — anche a data passata.',
          'La prova rifatta si riconsegna nella sua riga, con la sua data.',
          '**Non si recupera** chiude senza voto; **Torna a recuperarla** lo riapre.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Nascono da soli',
        testo:
          'Una riga compare per chi ha la casella vuota ed era segnato `X` alla prova, o assente ' +
          'all’appello di quell’ora anche per una sola UD — e allora la riga dice ' +
          '«dall’appello». Solo per chi frequenta ancora.',
      },
      {
        termine: 'Dove si trovano',
        testo:
          'Nella tabella **Recuperi** sotto la griglia, per la prova aperta; fra le ' +
          `${CARTE.pendenza.plurale}, per tutte le classi; nella lezione del giorno fissato, ` +
          'sotto **Recuperi di oggi**, con la griglia ristretta a chi rifà la prova.',
      },
      {
        termine: 'Fissare il giorno',
        testo:
          'Il calendario sulla riga fissa la prossima ora del corso. La matita apre **Recupero ' +
          'della prova**: **Si rifà il**, **Riconsegnata il**, una **Nota** e i documenti; ' +
          'svuotare la data lo rimette fra quelli da fissare.',
      },
      {
        termine: 'Il voto del recupero',
        testo:
          'Si scrive nella casella **Voto** della riga, o nella griglia: è la stessa casella. ' +
          'Finisce nella colonna di quella prova, con lo stesso peso, e chiude il recupero.',
      },
      {
        termine: 'Gli stati',
        testo:
          '**da fissare**, **fissato**, **oggi**, **non rifatta** (la data è passata senza ' +
          'voto), **recuperata**, **non si recupera**. I soli che chiedono un gesto sono quelli ' +
          'da fissare e quelli non rifatti.',
      },
      {
        termine: 'Quando non si rifà',
        testo:
          'La croce sulla riga, o **Non si recupera** nel modulo: la casella resta senza voto — ' +
          'prende la `X` — e il recupero si chiude come dichiarato. **Torna a recuperarla** lo riapre.',
      },
      {
        termine: 'Ridare la prova rifatta',
        testo:
          'Nella colonna **Riconsegnata il**: la data, e la spunta che scrive oggi. Finché ' +
          'manca, il recupero resta fra le cose da ridare anche se il voto c’è.',
      },
      {
        termine: 'I documenti del recupero',
        testo:
          'In cima alla tabella **Testo della prova di recupero** e **Soluzione del ' +
          'recupero**, uno per tutti; su ogni riga la **Scansione** di chi l’ha rifatta.',
      },
    ],
    note: [
      'Un recupero non è una prova nuova: è la stessa verifica fatta un altro giorno. Non ' +
        'aggiunge colonne, e il suo voto fa media come quello di chi l’ha fatta il primo ' +
        'giorno.',
      'Fissare il giorno serve a una cosa: che entrando in aula quel giorno la lezione dica ' +
        'chi rifà che cosa. Senza data, un recupero è un promemoria che nessuno rilegge.',
      'Il giorno del recupero non può venire prima della prova, né la riconsegna prima del ' +
        'recupero: il registro rifiuta le date al contrario.',
    ],
  },
  riconsegne: {
    titolo: 'Riconsegne',
    sommario:
      'Una prova svolta è finita quando ogni foglio corretto è tornato a chi l’ha scritto.',
    scritte: {
      daCorreggere: 'da correggere',
      daRiconsegnare: 'da riconsegnare',
      riconsegnata: 'riconsegnata',
      provaSvolta: 'prova svolta',
      ultimoVoto: 'l’ultimo voto',
      oltre: 'oltre 14 giorni',
      resaATutti: 'Resa a tutti',
      chiMancava: 'Chi mancava quel giorno',
      senzaData: 'resta senza data: la sua si segna a nome',
      chiHaRecuperato: 'Chi ha recuperato',
      nellaRiga: 'si riconsegna nella riga del recupero',
    },
    figure: [
      {
        didascalia:
          'I primi due stati li chiudono i voti; l’ultimo va detto, perché un voto messo non è un ' +
          'voto che la classe ha visto.',
        legenda: [
          '**da correggere** finché resta una casella vuota: una `X` conta come sistemata, ' +
            'l’assenza solo all’appello no.',
          '**Resa a tutti** scrive il giorno su ogni foglio con voto che non ha ancora il suo.',
          'Passati più di 14 giorni la riga dice «ferma da più di 2 settimane».',
          'Chi era assente alla riconsegna la riavrà un altro giorno: la sua data si scrive nella ' +
            'tabella dei nomi.',
          'Chi ha rifatto la prova ha un foglio solo, quello del recupero.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Tre stati',
        testo:
          '**da correggere** finché c’è una casella vuota — anche quella di chi risulta ' +
          'assente solo all’appello; **da riconsegnare** quando tutte hanno un voto o una `X`; ' +
          '**riconsegnata** quando ogni foglio con voto è tornato. L’ultima va detta.',
      },
      {
        termine: 'Resa a tutti',
        testo:
          'Nel riquadro **Riconsegna** della prova, **Resa a tutti · N** scrive il giorno su chi ' +
          'non ha ancora la sua data, e lascia com’è chi ce l’ha. Il giorno è oggi, o quello ' +
          'dell’ora aperta se lo si fa dalla lezione.',
      },
      {
        termine: 'Nome per nome',
        testo:
          'Sotto, una riga per chi ha un voto, con la data **Riconsegnata il** e la spunta ' +
          '**Riconsegnata oggi**. È il modo per chi mancava il giorno in cui la pila è tornata ' +
          'in classe.',
      },
      {
        termine: 'Ripensarci',
        testo:
          'Resa la prova, al posto del pulsante compare «resa a tutti entro il…» e accanto una ' +
          'freccia circolare che toglie la data a tutti: serve quando si è segnata la prova ' +
          'sbagliata.',
      },
      {
        termine: 'Dalla lezione',
        testo:
          'Nel registro dell’ora, **Prove da riconsegnare** raccoglie le prove del corso ancora ' +
          'aperte: la riga di stato, **Da completare** con i voti che mancano, **Da ridare a** ' +
          'con i nomi, **Recuperi da ridare**. Le date che si scrivono lì sono quelle dell’ora.',
      },
      {
        termine: 'In ritardo',
        testo:
          'Passati più di 14 giorni dalla prova senza che sia tornata a tutti, la riga si colora e lo ' +
          'dice: «ferma da più di 2 settimane». Non è una scadenza: indica quali guardare prima.',
      },
      {
        termine: 'Prima della prova, niente',
        testo:
          'Una prova che deve ancora svolgersi non ha riconsegne, e il registro non accetta ' +
          'una data di riconsegna che la precede.',
      },
    ],
    note: [
      'La data è per persona, non per prova: una data sola diceva «la classe l’ha riavuta» ' +
        'anche di chi quel giorno mancava, e proprio quei fogli restavano nella cartella. È ' +
        'anche la sola traccia che quella persona ha visto il suo voto.',
    ],
  },
  rapporti: {
    titolo: 'Documenti',
    sommario:
      'Quel che esce dal registro e va in mano ad altri: si fa, si guarda e si combina da qui.',
    scritte: {
      corso: 'Corso',
      lezioni: 'Lezioni',
      persone: Molti(PIF),
      aggiornaTutto: 'Aggiorna tutto',
      combina: 'Combina i 3 scelti',
      delCorso: 'Del corso',
      dueDiQuattro: '2 di 4',
      prove: 'Prove',
      treDiTre: '3 di 3',
      foglio: 'Presenze · 1° semestre',
      treDiDodici: '3 di 12',
      aOgniModifica: 'A ogni modifica',
      votoAppello: 'un voto, un appello',
      quiete: '8 s di quiete',
      alMassimo: 'al massimo 60 s',
      rifatti: 'rifatti',
      quali: 'presenze, voti, schede, prove',
      quandoSiChiude: 'Quando si chiude un’ora',
      svolta: 'Svolta',
      siChiude: 'l’ora si chiude',
      suoVerbale: 'il suo verbale, e gli stessi',
      soloAMano: 'Solo a mano',
      nessuno: 'nessuno dei due',
    },
    figure: [
      {
        didascalia:
          'A sinistra che cosa c’è, a destra il foglio che si sta guardando. Le schede e i comandi ' +
          'della pagina stanno nella riga delle azioni.',
        legenda: [
          'Le tre **schede**: di che cosa si guardano i fogli — del corso, delle ore, delle persone.',
          '**Aggiorna tutto**: rifà in un colpo tutti i fogli del corso.',
          'La **casella** di ogni foglio: i fogli spuntati si combinano in un PDF solo.',
          'Il **punto**: pieno se il file è nella cartella, vuoto se è da fare.',
          '**Lente**, **frecce**, **cestino**: guardarlo, farlo o rifarlo, buttarlo via.',
          'L’**anteprima**: «3 di 12» e le due frecce scorrono i fogli della scheda.',
        ],
      },
      {
        didascalia:
          'Le tre regole di **Chi li rifà**. Il periodo dei fogli rifatti è quello dei dati ' +
          'toccati: un voto di novembre rifà i fogli del primo semestre.',
      },
    ],
    voci: [
      {
        termine: 'Tre schede',
        testo:
          '**Corso**: i riquadri **Del corso** — presenze e valutazioni, in PDF e in CSV — ' +
          '**Della classe** con il fascicolo, **Prove** con una scheda per prova, **Piani ' +
          'lezione**. **Lezioni**: una riga per ora, con **Verbale** e **Piano lezione**. ' +
          `**${Molti(PIF)}**: la **Foto della classe** e una **${DOCUMENTO_SCHEDE}** a testa.`,
      },
      {
        termine: 'Ogni riga dice se il foglio c’è',
        testo:
          'Il punto pieno vuol dire che il file è nella cartella — fermandosi sopra, quanto ' +
          'pesa, o di che giorno è per foto e fascicolo — vuoto che è da fare. In testa a ogni ' +
          'riquadro il conto: «18 di 24 nella ' +
          'cartella».',
      },
      {
        termine: 'Lente, frecce, cestino',
        testo:
          'La **lente** mostra il foglio com’è nella cartella, che non è sempre quel che il ' +
          'registro direbbe adesso; lo stesso fa un clic sulla riga. Le **frecce** lo fanno o ' +
          'lo rifanno e lo mostrano; il **cestino** butta via il file, e i dati restano.',
      },
      {
        termine: 'Le ore non concluse',
        testo:
          'Nella scheda Lezioni stanno in grigio, col verbale spento: uscirebbe senza appello ' +
          'e senza consuntivo, e il pulsante dice perché. Il piano si stampa comunque. La ' +
          'matita accanto al verbale ne scrive la versione in testo, da correggere.',
      },
      {
        termine: 'Aggiorna tutto',
        testo:
          'Fa tutto quel che il corso sa stampare nel periodo: presenze, voti, una scheda per ' +
          'persona e per prova, il verbale di ogni ora svolta, ogni piano, la foto della classe ' +
          'e — per le classi di cui si è docente — il fascicolo; poi rifà le composizioni. Non ' +
          'apre niente: il messaggio dice quanti fogli.',
      },
      {
        termine: 'Chi li rifà',
        testo:
          'Tre pulsanti nella riga delle azioni: **Solo a mano**, **Quando si chiude un’ora**, ' +
          '**A ogni modifica** (di serie). Quello acceso è la regola in vigore, e viaggia con ' +
          'il documento d’anno.',
      },
      {
        termine: 'L’anteprima',
        testo:
          'Il foglio aperto sta a destra, nel lettore di PDF del registro: pagine, zoom, ' +
          'ricerca, stampa. In testa, «3 di 12» e due frecce per scorrere i fogli della scheda; ' +
          'accanto rifarlo, buttarlo, aprirlo in una finestra sua, **Chiudi**. Rifatto il file ' +
          'si ricarica; altrimenti resta alla pagina e allo zoom di prima.',
      },
      {
        termine: 'I CSV',
        testo:
          'Presenze e valutazioni escono anche in CSV, pronti per il foglio di calcolo: punto ' +
          'e virgola, virgola decimale, accenti a posto. Nell’anteprima si leggono come ' +
          'tabella, e il pulsante in testa li apre nel programma del sistema.',
      },
      {
        termine: 'Più fogli in un PDF solo',
        testo:
          'Ogni PDF già nella cartella ha una casella, e quella in testa al riquadro li spunta ' +
          'tutti; `Ctrl`+clic spunta una riga, `Maiusc`+clic fino a lì. Con almeno due spuntati, ' +
          '**Combina i N scelti** chiede un nome e li mette in fila nell’ordine della pagina; ' +
          'quelli spuntati in altre schede vanno in coda. **Togli le spunte** riparte da zero.',
      },
      {
        termine: 'Una composizione si aggiorna',
        testo:
          'Il registro si ricorda di che cosa è fatta: nel riquadro **Composizioni** le frecce ' +
          'la ricompongono con i fogli come sono adesso nella cartella. Se ne manca qualcuno, ' +
          'il conto lo dice — «18/20» — e rifarla adesso lo lascerebbe fuori.',
      },
      {
        termine: 'Qui non si esce',
        testo:
          'I nomi nelle righe non portano a nessun’altra pagina: una riga apre il suo foglio e ' +
          'basta. Chi mette insieme una consegna di venti fogli non si ritrova altrove a metà.',
      },
    ],
    note: [
      'Un PDF è una fotografia: nasce giusto e invecchia da solo, e un foglio vecchio non ' +
        'ha l’aria di esserlo. Per questo il registro li rifà da sé, e aspetta che le mani si ' +
        'fermino: venti caselle dell’appello rifanno i fogli una volta sola.',
      'Prima di consegnare: **Aggiorna tutto**, poi **Guarda il primo** e le frecce ' +
        'dell’anteprima. Si controllano i fogli uno dopo l’altro, senza cercare le righe.',
      'Il cestino butta via solo il file, che si rifà quando serve. Una composizione ' +
        'buttata via perde anche l’elenco di che cosa conteneva, e non si può più rifare: i ' +
        'suoi fogli restano, uno per uno.',
    ],
  },
  fogli: {
    titolo: 'Che cosa c’è nei fogli',
    sommario:
      'I documenti che il registro stampa, uno per uno: che cosa dicono, e di quale periodo.',
    scritte: {
      verifica: '12.10.2026 Verifica',
      orale: '09.11.2026 Orale',
      media: 'Media',
      nota: 'Nota',
      votoRecuperato: '4 R',
      recuperoFissato: 'R 20.10.2026',
      dispensato: 'disp.',
      assente: 'ass.',
    },
    figure: [
      {
        didascalia:
          'Un pezzo della griglia **Valutazioni** in PDF: una casella vuota non resta muta, dice ' +
          'perché è vuota.',
        legenda: [
          '`4 R`: un voto preso rifacendo la prova in un altro giorno.',
          '`R 20.10.2026`: il giorno fissato per il recupero.',
          '`disp.`: dichiarato che non si recupera.',
          '`ass.`: assente alla prova, recupero non ancora fissato.',
          '**Media** al centesimo e **Nota** sul passo di fine semestre, sulla scala delle ' +
            'impostazioni: il foglio non scrive «≠».',
        ],
      },
    ],
    voci: [
      {
        termine: 'Presenze',
        testo:
          'Per ogni persona le UD del corso, quelle seguite e quelle di assenza, i ritardi, le ' +
          'UD con appello e le percentuali; in fondo la riga della **Classe** e, in **Da ' +
          'seguire**, chi supera la soglia di assenza.',
      },
      {
        termine: 'Le tre percentuali',
        testo:
          '**% assenza** è quanto si è perso del monte ore che l’orario prevede nel periodo, ' +
          '**% presenza** è cento meno quella: le ore ancora da fare non pesano. La **% ' +
          'appello** sta sulle sole UD con l’appello fatto, e dice quanto le prime due sono ' +
          'affidabili.',
      },
      {
        termine: 'Valutazioni',
        testo:
          '**Voti e medie** è la griglia, con **Media** e **Nota**. **Esecuzione e ' +
          'riconsegna** dice per ogni casella quando la prova è stata fatta e quando è tornata, ' +
          '«12.10.2026 > 20.10.2026». Poi **I momenti**, **Recuperi** e **Prove ancora da ' +
          'ridare**.',
      },
      {
        termine: 'La scheda di una prova',
        testo:
          'Tipo, peso, media, voto più alto e più basso, sufficienti e insufficienti; la ' +
          '**Distribuzione**, un punto per persona al suo voto esatto con la riga della media; ' +
          'i voti e **Da recuperare**. È lo stesso grafico della pagina Valutazioni e della ' +
          'proiezione.',
      },
      {
        termine: `La ${DOCUMENTO_SCHEDE}`,
        testo:
          'L’anagrafica, il **Profitto** con media e nota per corso, **Le prove** con peso, ' +
          'voto, recupero e riconsegna, le **Presenze** con la griglia ora per ora, le ' +
          '**Annotazioni** e **Com’è andata**.',
      },
      {
        termine: 'Verbale e piano',
        testo:
          'Il **verbale** di un’ora: appello, obiettivi, scaletta svolta, argomenti, materiali, ' +
          'consegne date, osservazioni, com’è andata, consuntivo. Il **piano lezione**: obiettivi, ' +
          'prerequisiti, scaletta, materiali, note.',
      },
      {
        termine: 'Foto della classe e fascicolo',
        testo:
          'La **Foto della classe** è una faccia e un nome per persona, da portare in aula. Il ' +
          '**Fascicolo** è della classe, per tutte le materie: le persone con i recapiti, i ' +
          'documenti raccolti, i periodi di assenze.',
      },
      {
        termine: 'Di quale periodo',
        testo:
          `Presenze, valutazioni e ${DOCUMENTO_SCHEDE} sono del **Periodo** scelto, scritto in ` +
          'testata e nel nome del file: dello stesso foglio ci possono essere l’anno intero e i ' +
          'due semestri. Piani e fascicolo valgono per l’anno.',
      },
      {
        termine: 'L’aspetto dei fogli',
        testo:
          'Il nome della scuola e il logo stanno sulle carte intestate — ogni corso stampa sulla ' +
          'sua —, chi firma è uno per tutte: si scrivono in Impostazioni › Documenti e stampa › ' +
          '**Intestazione**, e valgono dalla prossima volta che i fogli si rifanno. ' +
          'Il resto — misure, sezioni, colonne — lo decidono i modelli, che sono del programma.',
      },
    ],
    note: [
      'I conti dei fogli sono quelli dello schermo: la stessa funzione fa la griglia, la ' +
        'matrice delle presenze, il PDF e il CSV. Un numero diverso fra foglio e pagina vuol ' +
        'dire un foglio vecchio: si rifà. Sola eccezione, la nota: il foglio la porta sempre ' +
        'sulla scala delle impostazioni, anche per le prove con una scala loro.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    valutazioni: {
      titolo: 'Beurteilungen',
      sommario:
        `Das Notenraster eines Kurses: in den Zeilen die ${DE.pif.plurale}, in den Spalten die ` +
        `${DE.momento.plurale} des Zeitraums.`,
      scritte: {
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: Molti(DE.pianoLezione),
        documenti: 'Dokumente',
        stato: 'Zeitraum · 1. Semester',
        sganciati: '2 Beurteilungen sind mit keiner Etappe des Plans verknüpft',
        media: 'Ø',
        nota: 'Note',
        sigla: 'N',
        mediaClasse: 'Klassendurchschnitt',
        recuperi: 'Nachprüfungen',
        daFissare: 'anzusetzen',
        recuperata: 'nachgeholt',
        prova: 'Prüfung 4',
        numeri: 'Ø 4.88 · 75 %',
        riconsegna: Uno(DE.riconsegna),
        resaATutti: 'Allen zurückgegeben · 4',
        proveCorrette: 'Korrigierte Prüfungen 3/5',
      },
      figure: [
        {
          didascalia:
            'Die Seite eines Kurses im gewählten Zeitraum: Links trägt man die Noten ein, rechts ' +
            'sieht man die geöffnete Prüfung.',
          legenda: [
            '**Nicht verknüpfte Beurteilungen**: Prüfungen, die aus keiner Etappe des Plans ' +
              'entstanden sind. Das Feld erscheint nur, wenn es solche gibt.',
            'Das **Raster**: eine Zeile pro Person, eine Spalte pro Prüfung. Oben der Titel der ' +
              'Prüfung, darunter das Datum und das Gewicht, wenn es nicht 1 ist (`×2`). Der ' +
              'Titel öffnet die Prüfung rechts.',
            '**Durchschnitt** und **Note** der Zeile: Die Note ist grün ab genügend, rot darunter.',
            '**Klassendurchschnitt**: der Durchschnitt jeder Prüfung, über die eingetragenen ' +
              'Noten.',
            '**Nachprüfungen** der geöffneten Prüfung: wer sie nachholt, wann, mit welcher Note.',
            'Die **geöffnete Prüfung**: ihre Zahlen, das Punktediagramm, **Bearbeiten** und ' +
              '**Zur Stunde**.',
            `**${Uno(DE.riconsegna)}**: wie weit die Prüfung ist und wer sie noch zurückbekommen ` +
              'muss.',
            '**Dokumente**: Aufgabenblatt, Lösung und korrigierte Prüfungen, als PDF.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Man schreibt wie in einer Tabelle',
          testo:
            'Man bewegt sich mit den Pfeiltasten, tippt die Note ein, und Enter geht eine Zeile ' +
            'nach unten; am Ende der Spalte geht es oben in der nächsten weiter. Jedes Feld hat ' +
            'auch eine Auswahlliste mit den Noten seiner Skala.',
        },
        {
          termine: 'Was man in ein Feld tippt',
          testo:
            'Eine Zahl, auch mit Komma; `X` für eine Absenz, dasselbe Kürzel wie bei der ' +
            'Präsenzkontrolle (es gehen auch `a` und `ass`); `-` oder nichts für «keine Note». ' +
            'Was keine Note ist, blinkt rot und bleibt zum Korrigieren im Feld.',
        },
        {
          termine: 'Wer in der Stunde der Prüfung fehlte',
          testo:
            'Meldet die Präsenzkontrolle jener Stunde die Person auch nur für eine Lektion als ' +
            'abwesend, zeigt das leere Feld das `X` durchscheinend. Für die Nachprüfung muss man ' +
            'es nicht eintragen, um die Korrektur abzuschliessen schon: Solange das Feld leer ' +
            'ist, ist die Prüfung «zu korrigieren». Setzt man die Nachprüfung an oder hält fest, ' +
            'dass es keine gibt, wird es von selbst eingetragen.',
        },
        {
          termine: 'Woher eine Prüfung kommt',
          testo:
            'Aus einer Etappe des Plans mit dem Häkchen «Diese Etappe ist eine Prüfung», über ' +
            '**Prüfung erstellen** in der Stunde, in der sie stattfindet: Von dort ' +
            'übernimmt sie Titel, Art, Gewicht und Datum. Deshalb hat die Seite keine ' +
            'Schaltfläche, um eine zu erstellen.',
        },
        {
          termine: 'Ein Kurs und ein Zeitraum aufs Mal',
          testo:
            'Das Raster gehört zum oben gewählten **Kurs** und zeigt die Prüfungen, die in den ' +
            '**Zeitraum** fallen: Durchschnitte und Noten gelten für diesen Zeitraum. Zwei ' +
            'Fächer zu mischen ergäbe eine Zahl, die der Durchschnitt von gar nichts ist.',
        },
        {
          termine: 'Die geöffnete Prüfung',
          testo:
            'Ein Klick auf den Titel einer Spalte öffnet sie rechts; ohne Auswahl ist es die ' +
            'letzte. Datum, Art, Gewicht, eingetragene Noten, Durchschnitt, Minimum, Maximum, ' +
            'Anteil genügender Noten — grün ab 60 % — und das Punktediagramm. **Zur ' +
            'Stunde** führt zur Stunde der Prüfung.',
        },
        {
          termine: 'Eine Prüfung korrigieren oder entfernen',
          testo:
            '**Bearbeiten** ändert Titel, Datum, Art, Gewicht, Grenzen und Genügend-Grenze der ' +
            'Skala sowie die Beschreibung; Stunde und Etappe nicht, die kommen aus dem Ablauf. ' +
            'Der Papierkorb daneben löscht sie, und die Rückfrage sagt, was dabei verloren geht.',
        },
        {
          termine: 'Die Dokumente der Prüfung',
          testo:
            'Im Feld **Dokumente** fügt **PDF anhängen** das Aufgabenblatt, die Lösung und die ' +
            'korrigierte Prüfung jeder Person hinzu; die Zählung sagt, wie viele es sind. Ein ' +
            'Klick auf den Namen öffnet die Datei, **Ersetzen** tauscht sie aus.',
        },
        {
          termine: 'Ein «N» neben der Note',
          testo:
            'Für dieses Feld gibt es eine Nachprüfung: Wer mit der Maus darauf verweilt, liest, ' +
            'auf wann sie angesetzt ist oder dass es keine gibt.',
        },
        {
          termine: 'Nicht verknüpfte Beurteilungen',
          testo:
            'Eine Prüfung, die aus keiner Etappe entstanden ist — Plan oder Etappe entfernt, die ' +
            'Etappe keine Prüfung mehr —, erscheint im Feld oben mit der Zahl der Noten, die sie ' +
            'mitnehmen würde. Sie zählt für die Durchschnitte, bis man sie löscht, einzeln oder ' +
            'mit **Alle löschen**.',
        },
      ],
      note: [
        'Die Noten trägt man an zwei Orten ein — hier und in der Stunde der Prüfung —, ' +
          'aber es ist ein einziges Raster: dieselben Felder, dieselbe Note. Hier sieht man das ' +
          'ganze Schuljahr und korrigiert alte oder verspätet eingetroffene Noten.',
        'Wer eine Prüfung löscht, löscht ihre Noten mit, und die angehängten PDFs verlassen ' +
          'das Dokument des Schuljahrs (sie kommen nicht in den Papierkorb des Systems). Die ' +
          'Noten sind das Einzige im Klassenbuch, das sich nicht anderswo rekonstruieren lässt.',
      ],
    },
    medie: {
      titolo: 'Durchschnitte und Noten',
      sommario:
        'Von der Note zur Semesternote: eine Skala, die Gewichte, zwei verschiedene Rundungen.',
      scritte: {
        votoPeso: 'Note × Gewicht',
        fuori: 'X · zählt nicht',
        media: 'Durchschnitt 4.44',
        conto: '17.75 ÷ 4, auf Hundertstel',
        passo: 'auf 0.5',
        nota: 'Note 4.5',
        pagella: 'im Zeugnis',
        pesoZero: 'Gewicht 0: Note bleibt, zählt aber nicht',
        passoZero: 'Schritt 0: Note = Durchschnitt',
      },
      figure: [
        {
          didascalia:
            'Drei Prüfungen mit verschiedenen Gewichten und eine Absenz: Der gewichtete ' +
            'Durchschnitt ist 4.44, und die Semesternote rundet ihn auf den nächsten halben Punkt.',
          legenda: [
            'Jede Note liegt schon auf dem **Schritt** ihrer Skala und zählt so viel, wie die ' +
              'Prüfung sagt.',
            'Der **Durchschnitt**: Summe der Noten mal Gewicht, geteilt durch die Summe der ' +
              'Gewichte, auf Hundertstel.',
            'Die **Note**: der Durchschnitt, gerundet auf den **Schritt der Semesternote**, von ' +
              'null an gezählt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die Notenskala',
          testo:
            'Tiefste und höchste Note, Genügend-Grenze und Schritt stehen unter Einstellungen › ' +
            'Unterricht › **Beurteilung**; standardmässig 1–6, genügend ab 4, Schritt 0.25. Jede ' +
            'Prüfung kopiert sich bei ihrer Entstehung eine, und über **Bearbeiten** kann sie ' +
            'eigene Grenzen und eine eigene Genügend-Grenze bekommen.',
        },
        {
          termine: 'Die Note auf dem Schritt',
          testo:
            'Eine eingetippte Note kommt auf den nächsten Schritt ihrer Skala, vom Minimum an ' +
            'gezählt: Mit Schritt 0.25 wird 4.6 zu 4.5. Eine Note ausserhalb der Skala wird ' +
            'abgelehnt.',
        },
        {
          termine: 'Das Gewicht',
          testo:
            'Wie stark die Prüfung im Durchschnitt zählt: von 0 bis 10, Dezimalstellen erlaubt. ' +
            'Es kommt von der Etappe, aus der die Prüfung entsteht (sonst 1), und wird über ' +
            '**Bearbeiten** geändert. Mit Gewicht 0 bleibt die Note stehen, zählt aber nicht für ' +
            'den Durchschnitt.',
        },
        {
          termine: 'Der Durchschnitt',
          testo:
            'Gewichtet: jede Note mal ihr Gewicht, geteilt durch die Summe der Gewichte, auf ' +
            'Hundertstel. Es zählen nur die Prüfungen im **Zeitraum**; Absenzen und leere Felder ' +
            'bleiben draussen und senken nichts.',
        },
        {
          termine: 'Die Semesternote',
          testo:
            'Der Durchschnitt, gerundet auf den **Schritt der Semesternote** — standardmässig ' +
            '0.5, die halben Noten — von null an gezählt: 4.44 ergibt 4.5, 4.24 ergibt 4. Mit ' +
            'Schritt 0 ist die Note der Durchschnitt, so wie er ist.',
        },
        {
          termine: 'Der Klassendurchschnitt',
          testo:
            'Die letzte Zeile des Rasters: für jede Prüfung der einfache Durchschnitt der ' +
            'eingetragenen Noten. Das Gewicht zählt zwischen verschiedenen Prüfungen, nicht ' +
            'innerhalb derselben.',
        },
        {
          termine: 'Wenn statt der Note «≠» steht',
          testo:
            'Im Zeitraum gibt es Prüfungen mit verschiedenen Skalen: Der Durchschnitt bleibt ein ' +
            'Anhaltspunkt, liegt aber auf keiner der beiden Skalen, und eine daraus berechnete ' +
            'Note würde nichts bedeuten.',
        },
      ],
      note: [
        'Zwei Rundungen, nicht eine: Der Schritt der Noten ist die Körnung, mit der man ' +
          'korrigiert — die Viertel —, der Schritt der Semesternote jene, mit der man das ' +
          'Zeugnis schreibt — die halben. Getrennt gehalten, muss niemand im Kopf runden.',
        'Eine geänderte Skala in den Einstellungen schreibt die schon erteilten Noten nicht ' +
          'um: Sie gilt für die Prüfungen, die noch entstehen. Der Schritt der Semesternote ' +
          'dagegen gilt sofort, für alle Noten.',
      ],
    },
    recuperi: {
      titolo: 'Nachprüfungen',
      sommario:
        'Wer an der Prüfung fehlte: wann die Person sie nachholt, oder warum nicht. Die Note ' +
        'kommt in die gewohnte Spalte.',
      scritte: {
        assente: 'Abwesend',
        xOAppello: 'X oder Präsenz',
        daFissare: 'anzusetzen',
        nessunaData: 'kein Datum',
        fissato: 'angesetzt',
        giornoCe: 'Tag steht fest',
        recuperata: 'nachgeholt',
        votoMesso: 'Note steht',
        resa: 'zurück',
        riconsegnataIl: 'Rückgabe am…',
        dichiarato: 'entschieden',
        nonSiRecupera: 'keine Nachprüfung',
        senzaVoto: 'ohne Note: das X',
        nonRifatta: 'verpasst',
        dataPassata: 'Datum vorbei',
        ilVoto: 'die Note',
      },
      figure: [
        {
          didascalia:
            'Eine Nachprüfung schliesst auf zwei Arten: mit einer Note, oder mit dem Entscheid, ' +
            'dass es keine gibt. Auch nachgeholt und benotet bleibt sie offen, bis das Blatt ' +
            'zurück ist.',
          legenda: [
            'Sie entsteht von selbst: leeres Feld, und `X` an der Prüfung oder mindestens eine ' +
              'Absenzlektion in der Präsenzkontrolle jener Stunde.',
            'Den Tag ansetzen: Der Kalender der Zeile wählt die nächste Stunde des Kurses, der ' +
              'Stift ein beliebiges Datum. An jenem Tag zeigt die Zeile **heute**.',
            'Die Note, eingetragen in der Zeile oder im Raster, schliesst die Nachprüfung — auch ' +
              'nach dem Datum.',
            'Die nachgeholte Prüfung gibt man in ihrer Zeile zurück, mit ihrem Datum.',
            '**Wird nicht nachgeholt** schliesst ohne Note; **Doch nachholen** öffnet sie wieder.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Sie entstehen von selbst',
          testo:
            'Eine Zeile erscheint für alle mit leerem Feld, die an der Prüfung mit `X` ' +
            'eingetragen waren oder in der Präsenzkontrolle jener Stunde auch nur eine Lektion ' +
            'fehlten — dann steht in der Zeile «aus der Präsenzkontrolle». Nur für Personen, die ' +
            'noch dabei sind.',
        },
        {
          termine: 'Wo sie stehen',
          testo:
            'In der Tabelle **Nachprüfungen** unter dem Raster, für die geöffnete Prüfung; bei ' +
            `den ${DE.pendenza.plurale}, für alle Klassen; in der Stunde des angesetzten ` +
            'Tages unter **Nachprüfungen heute**, mit dem Raster beschränkt auf die, die die ' +
            'Prüfung nachholen.',
        },
        {
          termine: 'Den Tag ansetzen',
          testo:
            'Der Kalender in der Zeile setzt die nächste Stunde des Kurses an. Der Stift öffnet ' +
            '**Nachprüfung**: **Nachgeholt am**, **Zurückgegeben am**, eine **Notiz** und die ' +
            'Dokumente; wer das Datum leert, legt sie zurück zu den noch anzusetzenden.',
        },
        {
          termine: 'Die Note der Nachprüfung',
          testo:
            'Man trägt sie im Feld **Note** der Zeile ein oder im Raster: Es ist dasselbe Feld. ' +
            'Sie kommt in die Spalte jener Prüfung, mit demselben Gewicht, und schliesst die ' +
            'Nachprüfung.',
        },
        {
          termine: 'Die Stände',
          testo:
            '**anzusetzen**, **angesetzt**, **heute**, **nicht nachgeholt** (das Datum ist ohne ' +
            'Note verstrichen), **nachgeholt**, **keine Nachprüfung**. Einen Handgriff verlangen ' +
            'nur die anzusetzenden und die nicht nachgeholten.',
        },
        {
          termine: 'Wenn nicht nachgeholt wird',
          testo:
            'Das Kreuz in der Zeile oder **Wird nicht nachgeholt** im Formular: Das Feld bleibt ' +
            'ohne Note — es bekommt das `X` —, und die Nachprüfung schliesst als entschieden. ' +
            '**Doch nachholen** öffnet sie wieder.',
        },
        {
          termine: 'Die nachgeholte Prüfung zurückgeben',
          testo:
            'In der Spalte **Zurückgegeben am**: das Datum, und das Häkchen, das heute einträgt. ' +
            'Solange es fehlt, bleibt die Nachprüfung bei dem, was zurückzugeben ist, auch wenn ' +
            'die Note schon steht.',
        },
        {
          termine: 'Die Dokumente der Nachprüfung',
          testo:
            'Oben in der Tabelle **Aufgabenblatt der Nachprüfung** und **Lösung der ' +
            'Nachprüfung**, eines für alle; in jeder Zeile der **Scan** der Person, die sie ' +
            'nachgeholt hat.',
        },
      ],
      note: [
        'Eine Nachprüfung ist keine neue Prüfung: Es ist dieselbe Prüfung an einem anderen ' +
          'Tag. Sie fügt keine Spalten hinzu, und ihre Note zählt für den Durchschnitt wie die ' +
          'Note derer, die sie am ersten Tag geschrieben haben.',
        'Den Tag anzusetzen hat einen Zweck: dass die Stunde an jenem Tag beim ' +
          'Betreten des Schulzimmers sagt, wer was nachholt. Ohne Datum ist eine Nachprüfung ' +
          'eine Erinnerung, die niemand mehr liest.',
        'Der Tag der Nachprüfung kann nicht vor der Prüfung liegen und die Rückgabe nicht vor ' +
          'der Nachprüfung: Das Klassenbuch lehnt umgekehrte Daten ab.',
      ],
    },
    riconsegne: {
      titolo: 'Rückgaben',
      sommario:
        'Eine geschriebene Prüfung ist abgeschlossen, wenn jedes korrigierte Blatt bei der ' +
        'Person ist, die es geschrieben hat.',
      scritte: {
        daCorreggere: 'zu korrigieren',
        daRiconsegnare: 'zurückzugeben',
        riconsegnata: 'zurückgegeben',
        provaSvolta: 'Prüfungstag',
        ultimoVoto: 'die letzte Note',
        oltre: 'über 14 Tage',
        resaATutti: 'Allen zurückgegeben',
        chiMancava: 'Wer an dem Tag fehlte',
        senzaData: 'bleibt ohne Datum: wird einzeln eingetragen',
        chiHaRecuperato: 'Wer nachgeholt hat',
        nellaRiga: 'Rückgabe in der Zeile der Nachprüfung',
      },
      figure: [
        {
          didascalia:
            'Die ersten beiden Stände schliessen die Noten; den letzten muss man melden, denn ' +
            'eine eingetragene Note ist noch keine Note, die die Klasse gesehen hat.',
          legenda: [
            '**zu korrigieren**, solange ein Feld leer ist: Ein `X` gilt als erledigt, eine ' +
              'Absenz nur in der Präsenzkontrolle nicht.',
            '**Allen zurückgegeben** trägt den Tag bei jedem Blatt mit Note ein, das noch keinen ' +
              'hat.',
            'Nach mehr als 14 Tagen steht in der Zeile «seit über 2 Wochen liegen geblieben».',
            'Wer bei der Rückgabe fehlte, bekommt das Blatt an einem anderen Tag: Das Datum ' +
              'trägt man in der Namenstabelle ein.',
            'Wer die Prüfung nachgeholt hat, hat nur ein Blatt, jenes der Nachprüfung.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Drei Stände',
          testo:
            '**zu korrigieren**, solange ein Feld leer ist — auch das von jemandem, der nur in ' +
            'der Präsenzkontrolle als abwesend gilt; **zurückzugeben**, wenn alle eine Note oder ' +
            'ein `X` haben; **zurückgegeben**, wenn jedes Blatt mit Note zurück ist. Den letzten ' +
            'Stand muss man melden.',
        },
        {
          termine: 'Allen zurückgegeben',
          testo:
            `Im Feld **${Uno(DE.riconsegna)}** der Prüfung trägt **Allen zurückgegeben · N** den ` +
            'Tag bei allen ein, die noch kein Datum haben, und lässt die anderen, wie sie sind. ' +
            'Der Tag ist heute, oder der der geöffneten Stunde, wenn man es aus der ' +
            'Stunde heraus tut.',
        },
        {
          termine: 'Name für Name',
          testo:
            'Darunter eine Zeile für alle mit einer Note, mit dem Datum **Zurückgegeben am** und ' +
            'dem Häkchen **Heute zurückgegeben**. So erfasst man die, die an dem Tag fehlten, an ' +
            'dem der Stapel in die Klasse zurückkam.',
        },
        {
          termine: 'Es sich anders überlegen',
          testo:
            'Ist die Prüfung zurückgegeben, steht statt der Schaltfläche «allen zurückgegeben ' +
            'bis ' +
            '…» ' +
            'und daneben ein Kreispfeil, der das Datum bei allen entfernt: für den Fall, dass ' +
            'man die falsche Prüfung markiert hat.',
        },
        {
          termine: 'Aus der Stunde',
          testo:
            'Im Klassenbuch der Stunde sammelt **Zurückzugebende Prüfungen** die noch offenen ' +
            'Prüfungen des Kurses: die Statuszeile, **Zu vervollständigen** mit den fehlenden ' +
            'Noten, **Zurückzugeben an** mit den Namen, **Zurückzugebende Nachprüfungen**. Die ' +
            'Daten, die man dort einträgt, sind die der Stunde.',
        },
        {
          termine: 'Im Verzug',
          testo:
            'Sind seit der Prüfung mehr als 14 Tage vergangen, ohne dass sie bei allen zurück ' +
            'ist, färbt sich die Zeile und sagt es: «seit über 2 Wochen liegen geblieben». Das ' +
            'ist keine Frist: Es zeigt, welche man zuerst anschauen soll.',
        },
        {
          termine: 'Vor der Prüfung nichts',
          testo:
            'Eine Prüfung, die noch nicht stattgefunden hat, hat keine Rückgaben, und das ' +
            'Klassenbuch nimmt kein Rückgabedatum an, das vor ihr liegt.',
        },
      ],
      note: [
        'Das Datum gilt pro Person, nicht pro Prüfung: Ein einziges Datum sagte «die Klasse ' +
          'hat sie zurück» auch von denen, die an dem Tag fehlten, und gerade diese Blätter ' +
          'blieben in der Mappe. Es ist auch der einzige Nachweis, dass die Person ihre Note ' +
          'gesehen hat.',
      ],
    },
    rapporti: {
      titolo: 'Dokumente',
      sommario:
        'Was aus dem Klassenbuch hinausgeht und anderen in die Hand kommt: Man erstellt es, ' +
        'sieht es an und stellt es hier zusammen.',
      scritte: {
        corso: 'Kurs',
        lezioni: 'Stunden',
        persone: Molti(DE.pif),
        aggiornaTutto: 'Alles aktualisieren',
        combina: 'Die 3 zusammenstellen',
        delCorso: 'Zum Kurs',
        dueDiQuattro: '2 von 4',
        prove: 'Prüfungen',
        treDiTre: '3 von 3',
        foglio: 'Präsenzen · 1. Semester',
        treDiDodici: '3 von 12',
        aOgniModifica: AUT_DE.sempre.nome,
        votoAppello: 'Note oder Präsenz',
        quiete: '8 s Ruhe',
        alMassimo: 'höchstens 60 s',
        rifatti: 'neu erstellt',
        quali: 'Präsenz, Noten, Blätter, Tests',
        quandoSiChiude: AUT_DE.chiusura.nome,
        svolta: 'Gehalten',
        siChiude: 'Stunde abgeschlossen',
        suoVerbale: 'ihr Protokoll und dieselben',
        soloAMano: AUT_DE.mai.nome,
        nessuno: 'keins von beiden',
      },
      figure: [
        {
          didascalia:
            'Links, was es gibt, rechts das Blatt, das man gerade ansieht. Die Reiter und die ' +
            'Befehle der Seite stehen in der Aktionsleiste.',
          legenda: [
            'Die drei **Reiter**: wovon man die Blätter ansieht — vom Kurs, von den Stunden, von ' +
              'den Personen.',
            '**Alles aktualisieren**: erstellt alle Blätter des Kurses auf einen Schlag neu.',
            'Das **Kästchen** jedes Blatts: Die angehakten Blätter werden zu einem einzigen PDF ' +
              'zusammengestellt.',
            'Der **Punkt**: voll, wenn die Datei im Ordner liegt, leer, wenn sie noch zu ' +
              'erstellen ist.',
            '**Lupe**, **Pfeile**, **Papierkorb**: ansehen, erstellen oder neu erstellen, ' +
              'wegwerfen.',
            'Die **Vorschau**: «3 von 12» und die beiden Pfeile blättern durch die Blätter des ' +
              'Reiters.',
          ],
        },
        {
          didascalia:
            'Die drei Regeln von **Wer sie neu erstellt**. Der Zeitraum der neu erstellten ' +
            'Blätter ist der der geänderten Daten: Eine Note vom November erstellt die Blätter ' +
            'des ersten Semesters neu.',
        },
      ],
      voci: [
        {
          termine: 'Drei Reiter',
          testo:
            '**Kurs**: die Felder **Zum Kurs** — Präsenzen und Beurteilungen, als PDF und als ' +
            'CSV —, **Zur Klasse** mit dem Klassendossier, **Prüfungen** mit einem Blatt pro ' +
            `Prüfung, **${Molti(DE.pianoLezione)}**. **Stunden**: eine Zeile pro Stunde, mit ` +
            `**Protokoll** und **${Uno(DE.pianoLezione)}**. **${Molti(DE.pif)}**: das ` +
            `**Klassenfoto** und ein **${DE.documentoSchede}** pro Person.`,
        },
        {
          termine: 'Jede Zeile sagt, ob es das Blatt gibt',
          testo:
            'Der volle Punkt bedeutet, dass die Datei im Ordner liegt — mit der Maus darauf, wie ' +
            'gross sie ist, oder bei Foto und Klassendossier, von welchem Tag —, der leere, dass ' +
            'sie noch zu erstellen ist. Oben in jedem Feld die Zählung: «18 von 24 im Ordner».',
        },
        {
          termine: 'Lupe, Pfeile, Papierkorb',
          testo:
            'Die **Lupe** zeigt das Blatt so, wie es im Ordner liegt, und das ist nicht immer, ' +
            'was das Klassenbuch jetzt sagen würde; dasselbe tut ein Klick auf die Zeile. Die ' +
            '**Pfeile** erstellen es oder erstellen es neu und zeigen es; der **Papierkorb** ' +
            'wirft die Datei weg, die Daten bleiben.',
        },
        {
          termine: 'Nicht abgeschlossene Stunden',
          testo:
            'Im Reiter Stunden stehen sie grau, mit ausgeschaltetem Protokoll: Es käme ohne ' +
            'Präsenzkontrolle und ohne Rückblick heraus, und die Schaltfläche sagt warum. Den ' +
            'Plan kann man trotzdem drucken. Der Stift neben dem Protokoll schreibt dessen ' +
            'Textfassung, zum Korrigieren.',
        },
        {
          termine: 'Alles aktualisieren',
          testo:
            'Erstellt alles, was der Kurs im Zeitraum drucken kann: Präsenzen, Noten, ein Blatt ' +
            'pro Person und pro Prüfung, das Protokoll jeder gehaltenen Stunde, jeden Plan, das ' +
            'Klassenfoto und — für die Klassen, in denen man Klassenlehrperson ist — das ' +
            'Klassendossier; dann stellt es die Zusammenstellungen neu zusammen. Es öffnet ' +
            'nichts: Die Meldung sagt, wie viele Blätter.',
        },
        {
          termine: 'Wer sie neu erstellt',
          testo:
            `Drei Schaltflächen in der Aktionsleiste: **${AUT_DE.mai.nome}**, ` +
            `**${AUT_DE.chiusura.nome}**, **${AUT_DE.sempre.nome}** (Standard). Die ` +
            'eingeschaltete ist die geltende Regel, und sie reist mit dem Dokument des ' +
            'Schuljahrs.',
        },
        {
          termine: 'Die Vorschau',
          testo:
            'Das geöffnete Blatt steht rechts, im PDF-Betrachter des Klassenbuchs: Seiten, Zoom, ' +
            'Suche, Drucken. Oben «3 von 12» und zwei Pfeile, um durch die Blätter des Reiters ' +
            'zu blättern; daneben neu erstellen, wegwerfen, in einem eigenen Fenster öffnen, ' +
            '**Schliessen**. Ist die Datei neu erstellt, lädt sie neu; sonst bleibt sie bei der ' +
            'Seite und beim Zoom von vorher.',
        },
        {
          termine: 'Die CSV',
          testo:
            'Präsenzen und Beurteilungen gibt es auch als CSV, bereit für die ' +
            'Tabellenkalkulation: Strichpunkt, Dezimalkomma, Akzente richtig. In der Vorschau ' +
            'liest man sie als Tabelle, und die Schaltfläche oben öffnet sie im Programm des ' +
            'Systems.',
        },
        {
          termine: 'Mehrere Blätter in einem PDF',
          testo:
            'Jedes PDF, das schon im Ordner liegt, hat ein Kästchen, und das Kästchen oben im ' +
            'Feld hakt alle an; `Ctrl`+Klick hakt eine Zeile an, `Umschalt`+Klick bis dorthin. ' +
            'Mit mindestens zwei angehakten fragt **Die N ausgewählten zusammenstellen** nach einem ' +
            'Namen und reiht sie in der Reihenfolge der Seite auf; die in anderen Reitern ' +
            'angehakten kommen ans Ende. **Häkchen entfernen** beginnt von vorn.',
        },
        {
          termine: 'Eine Zusammenstellung wird aktualisiert',
          testo:
            'Das Klassenbuch merkt sich, woraus sie besteht: Im Feld **Zusammenstellungen** ' +
            'stellen die Pfeile sie mit den Blättern neu zusammen, wie sie jetzt im Ordner ' +
            'liegen. Fehlt eines, sagt es die Zählung — «18/20» —, und wer sie jetzt neu ' +
            'erstellt, lässt es weg.',
        },
        {
          termine: 'Hier geht man nicht weg',
          testo:
            'Die Namen in den Zeilen führen auf keine andere Seite: Eine Zeile öffnet ihr Blatt, ' +
            'sonst nichts. Wer eine Abgabe von zwanzig Blättern zusammenstellt, findet sich ' +
            'nicht auf halbem Weg anderswo wieder.',
        },
      ],
      note: [
        'Ein PDF ist eine Fotografie: Es entsteht richtig und veraltet von selbst, und einem ' +
          'alten Blatt sieht man das nicht an. Darum erstellt das Klassenbuch sie selbst neu ' +
          'und wartet, bis die Hände ruhen: Zwanzig Felder der Präsenzkontrolle erstellen die ' +
          'Blätter nur einmal neu.',
        'Vor dem Abgeben: **Alles aktualisieren**, dann **Das erste ansehen** und die Pfeile ' +
          'der Vorschau. So prüft man die Blätter eins nach dem anderen, ohne die Zeilen zu ' +
          'suchen.',
        'Der Papierkorb wirft nur die Datei weg, die man bei Bedarf neu erstellt. Eine ' +
          'weggeworfene Zusammenstellung verliert auch die Liste dessen, was sie enthielt, und ' +
          'lässt sich nicht mehr neu erstellen: Ihre Blätter bleiben, jedes für sich.',
      ],
    },
    fogli: {
      titolo: 'Was auf den Blättern steht',
      sommario:
        'Die Dokumente, die das Klassenbuch druckt, eines nach dem anderen: was sie sagen, und ' +
        'für welchen Zeitraum.',
      scritte: {
        verifica: '12.10.2026 Prüfung',
        orale: '09.11.2026 Mündlich',
        media: 'Durchschnitt',
        nota: 'Note',
        votoRecuperato: '4 N',
        recuperoFissato: 'N 20.10.2026',
        dispensato: 'disp.',
        assente: 'abw.',
      },
      figure: [
        {
          didascalia:
            'Ein Ausschnitt aus dem Raster **Beurteilungen** als PDF: Ein leeres Feld bleibt ' +
            'nicht stumm, es sagt, warum es leer ist.',
          legenda: [
            '`4 N`: eine Note aus einer Nachprüfung an einem anderen Tag.',
            '`N 20.10.2026`: der für die Nachprüfung angesetzte Tag.',
            '`disp.`: festgehalten, dass es keine Nachprüfung gibt.',
            '`abw.`: an der Prüfung abwesend, Nachprüfung noch nicht angesetzt.',
            '**Durchschnitt** auf Hundertstel und **Note** auf den Schritt der Semesternote, ' +
              'auf der Skala der Einstellungen: Das Blatt schreibt kein «≠».',
          ],
        },
      ],
      voci: [
        {
          termine: 'Präsenzen',
          testo:
            'Für jede Person die Lektionen des Kurses, die besuchten und die verpassten, die ' +
            'Verspätungen, die Lektionen mit Präsenzkontrolle und die Prozentsätze; unten die ' +
            'Zeile der **Klasse** und, unter **Im Auge behalten**, wer die Absenzenschwelle ' +
            'überschreitet.',
        },
        {
          termine: 'Die drei Prozentsätze',
          testo:
            '**% Absenz** ist, wie viel man von den Stunden verpasst hat, die der Stundenplan im ' +
            'Zeitraum vorsieht, **% Anwesenheit** ist hundert minus das: Die Stunden, die noch ' +
            'kommen, zählen nicht. Die **% Kontrolle** bezieht sich nur auf die ' +
            'Lektionen mit gemachter Präsenzkontrolle und sagt, wie verlässlich die ersten ' +
            'beiden sind.',
        },
        {
          termine: 'Beurteilungen',
          testo:
            '**Noten und Durchschnitte** ist das Raster, mit **Durchschnitt** und **Note**. ' +
            '**Durchführung und Rückgabe** sagt für jedes Feld, wann die Prüfung geschrieben ' +
            'wurde und wann sie zurückkam, «12.10.2026 > 20.10.2026». Dann **Die ' +
            'Beurteilungen**, **Nachprüfungen** und **Noch zurückzugebende Prüfungen**.',
        },
        {
          termine: 'Das Blatt einer Prüfung',
          testo:
            'Art, Gewicht, Durchschnitt, höchste und tiefste Note, genügende und ungenügende; ' +
            'die **Verteilung**, ein Punkt pro Person auf ihrer genauen Note mit der Linie des ' +
            'Durchschnitts; die Noten und **Nachzuholen**. Es ist dasselbe Diagramm wie auf der ' +
            'Seite Beurteilungen und in der Projektion.',
        },
        {
          termine: `Das ${DE.documentoSchede}`,
          testo:
            'Die Personalien, die **Leistungen** mit Durchschnitt und Note pro Kurs, **Die ' +
            'Prüfungen** mit Gewicht, Note, Nachprüfung und Rückgabe, die **Anwesenheit** mit dem ' +
            'Raster Stunde für Stunde, die **Vermerke** und **Wie es lief**.',
        },
        {
          termine: 'Protokoll und Plan',
          testo:
            'Das **Protokoll** einer Stunde: Präsenzkontrolle, Ziele, gehaltener Ablauf, Themen, ' +
            'Material, erteilte Aufträge, Beobachtungen, wie es lief, Rückblick. Der ' +
            `**${Uno(DE.pianoLezione)}**: Ziele, Voraussetzungen, Ablauf, Material, Notizen.`,
        },
        {
          termine: 'Klassenfoto und Klassendossier',
          testo:
            'Das **Klassenfoto** ist ein Gesicht und ein Name pro Person, zum Mitnehmen ins ' +
            'Schulzimmer. Das **Klassendossier** gehört der Klasse, für alle Fächer: die ' +
            'Personen mit ihren Kontaktangaben, die gesammelten Dokumente, die ' +
            'Absenzenzeiträume.',
        },
        {
          termine: 'Für welchen Zeitraum',
          testo:
            `Präsenzen, Beurteilungen und ${DE.documentoSchede} gelten für den gewählten ` +
            '**Zeitraum**, der im Kopf und im Dateinamen steht: Vom selben Blatt kann es das ' +
            'ganze Jahr und die beiden Semester geben. Pläne und Klassendossier gelten für das ' +
            'Schuljahr.',
        },
        {
          termine: 'Das Aussehen der Blätter',
          testo:
            'Der Name der Schule und das Logo stehen auf den Briefköpfen — jeder Kurs druckt auf ' +
            'seinem —, wer unterschreibt, ist einer für alle: Man trägt sie unter Einstellungen ' +
            '› Dokumente und Druck › **Briefkopf** ein, und sie gelten ab dem nächsten Mal, wenn ' +
            'die Blätter neu erstellt werden. Den Rest — Masse, Abschnitte, Spalten — bestimmen ' +
            'die Vorlagen, die zum Programm gehören.',
        },
      ],
      note: [
        'Die Zahlen der Blätter sind die des Bildschirms: Dieselbe Funktion erstellt das ' +
          'Raster, die Präsenzmatrix, das PDF und die CSV. Eine andere Zahl auf Blatt und ' +
          'Seite bedeutet ein altes Blatt: Man erstellt es neu. Einzige Ausnahme ist die Note: ' +
          'Das Blatt setzt sie immer auf die Skala der Einstellungen, auch bei Prüfungen mit ' +
          'eigener Skala.',
      ],
    },
  },
  fr: {
    valutazioni: {
      titolo: 'Évaluations',
      sommario:
        `La grille des notes d’un cours : en ligne les ${FR.pif.plurale}, en colonne les ` +
        `${FR.momento.plurale} de la période.`,
      scritte: {
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        stato: 'Période · 1er semestre',
        sganciati: '2 évaluations ne sont rattachées à aucune étape du plan',
        media: 'Moy.',
        nota: 'Note',
        sigla: 'R',
        mediaClasse: 'Moyenne classe',
        recuperi: 'Rattrapages',
        daFissare: 'à fixer',
        recuperata: 'rattrapée',
        prova: 'Contrôle 4',
        numeri: 'moyenne 4.88 · 75 %',
        riconsegna: Uno(FR.riconsegna),
        resaATutti: 'Rendue à tous · 4',
        proveCorrette: 'Épreuves corrigées 3/5',
      },
      figure: [
        {
          didascalia:
            'La page d’un cours, dans la période choisie : à gauche on écrit les notes, à droite ' +
            'on regarde l’épreuve ouverte.',
          legenda: [
            '**Évaluations détachées** : des épreuves qu’aucune étape du plan n’a fait naître. ' +
              'Le cadre n’apparaît que s’il y en a.',
            'La **grille** : une ligne par personne, une colonne par épreuve. En tête le titre ' +
              'de l’épreuve, en dessous la date et le poids quand il n’est pas 1 (`×2`). Le ' +
              'titre ouvre l’épreuve à droite.',
            '**Moyenne** et **Note** de la ligne : la note est verte à partir du seuil de ' +
              'suffisance, rouge en dessous.',
            '**Moyenne de la classe** : la moyenne de chaque épreuve, sur les notes saisies.',
            '**Rattrapages** de l’épreuve ouverte : qui la refait, quand, avec quelle note.',
            'L’**épreuve ouverte** : ses chiffres, le graphique à points, **Modifier** et ' +
              '**Aller à la leçon**.',
            `**${Uno(FR.riconsegna)}** : où en est l’épreuve, et qui doit encore la récupérer.`,
            '**Documents** : énoncé, corrigé et épreuves corrigées, en PDF.',
          ],
        },
      ],
      voci: [
        {
          termine: 'On écrit comme dans un tableur',
          testo:
            'On se déplace avec les flèches, on tape la note et Entrée descend ; au bas de la ' +
            'colonne, on repart en haut de la suivante. Chaque case a aussi une liste avec les ' +
            'notes de son barème.',
        },
        {
          termine: 'Ce qu’on tape dans une case',
          testo:
            'Un nombre, même avec la virgule ; `X` pour l’absence, la même lettre qu’à l’appel ' +
            '(`a` et `ass` marchent aussi) ; `-` ou rien pour « pas de note ». Ce qui n’est pas ' +
            'une note clignote en rouge et reste dans le champ, à corriger.',
        },
        {
          termine: 'Qui était absent à la leçon de l’épreuve',
          testo:
            'Si l’appel de cette leçon-là le donne absent, même pour une seule période, la case ' +
            'vide montre le `X` en transparence. Pour le rattrapage, inutile de l’écrire ; pour ' +
            'clore la correction, si : tant que la case reste vide, l’épreuve est « à corriger ' +
            '». ' +
            '' +
            'Fixer le rattrapage, ou dire qu’il n’y en aura pas, l’écrit tout seul.',
        },
        {
          termine: 'D’où naît une épreuve',
          testo:
            'D’une étape du plan cochée « Cette étape est une épreuve », avec **Créer ' +
            'l’épreuve** ' +
            '' +
            'dans la leçon où elle a lieu : de là, elle prend titre, type, poids et date. C’est ' +
            'pourquoi la page n’a pas de bouton pour en créer une.',
        },
        {
          termine: 'Un cours et une période à la fois',
          testo:
            'La grille est celle du **Cours** choisi en haut et montre les épreuves qui tombent ' +
            'dans la **Période** : moyennes et notes sont celles de cette période. Mélanger deux ' +
            'branches donnerait un nombre qui n’est la moyenne de rien.',
        },
        {
          termine: 'L’épreuve ouverte',
          testo:
            'Un clic sur le titre d’une colonne l’ouvre à droite ; sans choix, c’est la ' +
            'dernière. Date, type, poids, notes saisies, moyenne, minimum, maximum, part de ' +
            'suffisantes — en vert dès 60 % — et le graphique à points. **Aller à la leçon** ' +
            'mène à la leçon de l’épreuve.',
        },
        {
          termine: 'Corriger ou retirer une épreuve',
          testo:
            '**Modifier** change titre, date, type, poids, bornes et seuil de suffisance du ' +
            'barème, description ; la leçon et l’étape non, elles viennent du déroulement. La ' +
            'corbeille à côté la supprime, et la confirmation dit ce qui disparaît.',
        },
        {
          termine: 'Les documents de l’épreuve',
          testo:
            'Dans le cadre **Documents**, **Joindre un PDF** pour l’énoncé, le corrigé et ' +
            'l’épreuve corrigée de chacun ; le compte dit combien il y en a. Un clic sur le nom ' +
            'ouvre le fichier, **Remplacer** le change.',
        },
        {
          termine: 'Un « R » à côté de la note',
          testo:
            'Pour cette case, il y a un rattrapage : en s’arrêtant dessus, on lit pour quand il ' +
            'est fixé, ou qu’il n’y en aura pas.',
        },
        {
          termine: 'Évaluations détachées',
          testo:
            'Une épreuve qu’aucune étape n’a fait naître — le plan ou l’étape retirés, l’étape ' +
            'qui n’est plus une épreuve — apparaît dans le cadre du haut avec le nombre de notes ' +
            'qu’elle emporterait. Elle reste dans les moyennes tant qu’on ne la supprime pas, ' +
            'une ' +
            '' +
            'par une ou avec **Tout supprimer**.',
        },
      ],
      note: [
        'Les notes s’écrivent à deux endroits — ici et dans la leçon de l’épreuve — mais la ' +
          'grille est une seule : mêmes cases, même note. Ici on voit l’année entière, et on ' +
          'corrige les notes anciennes ou arrivées en retard.',
        'Supprimer une épreuve emporte ses notes, et les PDF joints sortent du document de ' +
          'l’année (ils ne vont pas dans la corbeille du système). Les notes sont la seule ' +
          'chose du registre qu’on ne reconstruit pas en regardant ailleurs.',
      ],
    },
    medie: {
      titolo: 'Moyennes et notes',
      sommario:
        'De la note à la note semestrielle : un barème, les poids, deux arrondis différents.',
      scritte: {
        votoPeso: 'note × poids',
        fuori: 'X · hors calcul',
        media: 'Moyenne 4.44',
        conto: '17.75 ÷ 4, au centième',
        passo: 'pas 0.5',
        nota: 'Note 4.5',
        pagella: 'dans le bulletin',
        pesoZero: 'poids 0 : la note reste, la moyenne non',
        passoZero: 'pas 0 : la note est la moyenne',
      },
      figure: [
        {
          didascalia:
            'Trois épreuves de poids différents et une absence : la moyenne pondérée est 4.44, ' +
            'et la note semestrielle l’arrondit au demi-point le plus proche.',
          legenda: [
            'Chaque note est déjà sur le **pas** de son barème, et pèse ce que dit l’épreuve.',
            'La **moyenne** : somme des notes multipliées par le poids, divisée par la somme des ' +
              'poids, au centième.',
            'La **note** : la moyenne arrondie au **Pas de la note semestrielle**, compté ' +
              'depuis zéro.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Le barème',
          testo:
            'Note minimale, maximale, seuil de suffisance et pas se trouvent dans Paramètres › ' +
            'Enseignement › **Évaluation** ; par défaut 1–6, suffisance à 4, pas de 0.25. ' +
            'Chaque épreuve en copie un à sa naissance, et depuis **Modifier** elle peut avoir ' +
            'ses propres bornes et son propre seuil.',
        },
        {
          termine: 'La note sur le pas',
          testo:
            'Une note tapée va sur le pas le plus proche de son barème, compté depuis le ' +
            'minimum : avec un pas de 0.25, 4.6 devient 4.5. Une note hors du barème est refusée.',
        },
        {
          termine: 'Le poids',
          testo:
            'Ce que compte l’épreuve dans la moyenne : de 0 à 10, décimales admises. Il vient de ' +
            'l’étape dont naît l’épreuve (sinon 1) et se change depuis **Modifier**. Avec un ' +
            'poids 0, la note reste écrite mais ne compte pas dans la moyenne.',
        },
        {
          termine: 'La moyenne',
          testo:
            'Pondérée : chaque note multipliée par son poids, divisée par la somme des poids, ' +
            'au centième. Seules comptent les épreuves de la **Période** ; absences et cases ' +
            'vides restent dehors et ne font rien baisser.',
        },
        {
          termine: 'La note semestrielle',
          testo:
            'La moyenne arrondie au **Pas de la note semestrielle** — par défaut 0.5, les ' +
            'demi-points — compté depuis zéro : 4.44 donne 4.5, 4.24 donne 4. Avec un pas de 0, ' +
            'la note est la moyenne telle quelle.',
        },
        {
          termine: 'La moyenne de la classe',
          testo:
            'La dernière ligne de la grille : pour chaque épreuve, la moyenne simple des notes ' +
            'saisies. Le poids compte d’une épreuve à l’autre, pas à l’intérieur de la même.',
        },
        {
          termine: 'Quand il y a « ≠ » à la place de la note',
          testo:
            'La période contient des épreuves avec des barèmes différents : la moyenne reste une ' +
            'indication, mais elle ne correspond à aucun des deux barèmes, et une note calculée ' +
            'à partir de là ne voudrait rien dire.',
        },
      ],
      note: [
        'Deux arrondis et pas un seul : le pas des notes est la finesse avec laquelle on ' +
          'corrige — les quarts —, le pas de la note celle avec laquelle on remplit le bulletin ' +
          '— les demis. Tenus séparés, personne ne doit arrondir de tête.',
        'Changer le barème dans les paramètres ne réécrit pas les notes déjà données : il vaut ' +
          'pour les épreuves à venir. Le pas de la note, lui, vaut tout de suite, pour toutes ' +
          'les notes.',
      ],
    },
    recuperi: {
      titolo: 'Rattrapages',
      sommario:
        'Qui n’était pas là à l’épreuve : quand il la refait, ou pourquoi il ne la refait pas. ' +
        'La note va dans la colonne habituelle.',
      scritte: {
        assente: 'Absent',
        xOAppello: 'X ou appel',
        daFissare: 'à fixer',
        nessunaData: 'pas de date',
        fissato: 'fixé',
        giornoCe: 'date connue',
        recuperata: 'rattrapée',
        votoMesso: 'note saisie',
        resa: 'rendue',
        riconsegnataIl: 'rendue le…',
        dichiarato: 'déclaré',
        nonSiRecupera: 'pas de rattrapage',
        senzaVoto: 'sans note : le X',
        nonRifatta: 'pas rattrapée',
        dataPassata: 'date passée',
        ilVoto: 'la note',
      },
      figure: [
        {
          didascalia:
            'Un rattrapage se clôt de deux façons : avec une note, ou en déclarant qu’il n’aura ' +
            'pas lieu. Même refait et noté, il reste ouvert tant que la copie n’est pas revenue.',
          legenda: [
            'Il naît tout seul : case vide, et `X` à l’épreuve ou au moins une période ' +
              'd’absence à l’appel de cette leçon-là.',
            'Fixer le jour : le calendrier de la ligne choisit la prochaine leçon du cours, le ' +
              'crayon une date quelconque. Ce jour-là, la ligne dit **aujourd’hui**.',
            'La note, écrite dans la ligne ou dans la grille, clôt le rattrapage — même après la ' +
              'date.',
            'L’épreuve refaite se rend dans sa ligne, avec sa date.',
            '**Pas de rattrapage** clôt sans note ; **La rattraper quand même** le rouvre.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ils naissent tout seuls',
          testo:
            'Une ligne apparaît pour qui a la case vide et était noté `X` à l’épreuve, ou absent ' +
            'à l’appel de cette leçon-là même pour une seule période — et la ligne dit alors ' +
            '« d’après l’appel ». Seulement pour qui suit encore les cours.',
        },
        {
          termine: 'Où on les trouve',
          testo:
            'Dans le tableau **Rattrapages** sous la grille, pour l’épreuve ouverte ; parmi les ' +
            `${FR.pendenza.plurale}, pour toutes les classes ; dans la leçon du jour fixé, sous ` +
            '**Rattrapages du jour**, avec la grille réduite à ceux qui refont l’épreuve.',
        },
        {
          termine: 'Fixer le jour',
          testo:
            'Le calendrier sur la ligne fixe la prochaine leçon du cours. Le crayon ouvre ' +
            '**Rattrapage de l’épreuve** : **Rattrapage le**, **Rendue le**, une **Note** et les ' +
            'documents ; vider la date le remet parmi ceux à fixer.',
        },
        {
          termine: 'La note du rattrapage',
          testo:
            'Elle s’écrit dans la case **Note** de la ligne, ou dans la grille : c’est la même ' +
            'case. Elle va dans la colonne de cette épreuve, avec le même poids, et clôt le ' +
            'rattrapage.',
        },
        {
          termine: 'Les états',
          testo:
            '**à fixer**, **fixé**, **aujourd’hui**, **pas rattrapée** (la date est passée sans ' +
            'note), **rattrapée**, **pas de rattrapage**. Les seuls qui demandent un geste sont ' +
            'ceux à fixer et ceux pas rattrapés.',
        },
        {
          termine: 'Quand on ne la refait pas',
          testo:
            'La croix sur la ligne, ou **Pas de rattrapage** dans le formulaire : la case reste ' +
            'sans note — elle prend le `X` — et le rattrapage se clôt comme déclaré. **La ' +
            'rattraper quand même** le rouvre.',
        },
        {
          termine: 'Rendre l’épreuve refaite',
          testo:
            'Dans la colonne **Rendue le** : la date, et la coche qui écrit aujourd’hui. Tant ' +
            'qu’elle manque, le rattrapage reste parmi les choses à rendre, même si la note est ' +
            'là.',
        },
        {
          termine: 'Les documents du rattrapage',
          testo:
            'En haut du tableau, **Énoncé du rattrapage** et **Corrigé du rattrapage**, un pour ' +
            'tous ; sur chaque ligne, le **Scan** de qui l’a refaite.',
        },
      ],
      note: [
        'Un rattrapage n’est pas une nouvelle épreuve : c’est le même contrôle fait un autre ' +
          'jour. Il n’ajoute pas de colonnes, et sa note compte dans la moyenne comme celle de ' +
          'ceux qui l’ont faite le premier jour.',
        'Fixer le jour sert à une chose : qu’en entrant en classe ce jour-là, la leçon dise ' +
          'qui refait quoi. Sans date, un rattrapage est un pense-bête que personne ne relit.',
        'Le jour du rattrapage ne peut pas précéder l’épreuve, ni la restitution précéder le ' +
          'rattrapage : le registre refuse les dates à l’envers.',
      ],
    },
    riconsegne: {
      titolo: 'Restitutions',
      sommario:
        'Une épreuve passée est terminée quand chaque copie corrigée est revenue à qui l’a ' +
        'écrite.',
      scritte: {
        daCorreggere: 'à corriger',
        daRiconsegnare: 'à rendre',
        riconsegnata: 'rendue',
        provaSvolta: 'épreuve passée',
        ultimoVoto: 'la dernière note',
        oltre: 'plus de 14 jours',
        resaATutti: 'Rendue à tous',
        chiMancava: 'Qui manquait ce jour-là',
        senzaData: 'reste sans date : on l’inscrit nom par nom',
        chiHaRecuperato: 'Qui a rattrapé',
        nellaRiga: 'se rend dans la ligne du rattrapage',
      },
      figure: [
        {
          didascalia:
            'Les deux premiers états, ce sont les notes qui les closent ; le dernier doit être ' +
            'dit, parce qu’une note saisie n’est pas une note que la classe a vue.',
          legenda: [
            '**à corriger** tant qu’il reste une case vide : un `X` compte comme réglé, ' +
              'l’absence seulement à l’appel, non.',
            '**Rendue à tous** inscrit le jour sur chaque copie notée qui n’a pas encore le sien.',
            'Après plus de 14 jours, la ligne dit « en attente depuis plus de 2 semaines ».',
            'Qui était absent à la restitution la récupérera un autre jour : sa date s’inscrit ' +
              'dans le tableau des noms.',
            'Qui a refait l’épreuve n’a qu’une copie, celle du rattrapage.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Trois états',
          testo:
            '**à corriger** tant qu’il y a une case vide — même celle de qui n’est absent qu’à ' +
            'l’appel ; **à rendre** quand toutes ont une note ou un `X` ; **rendue** quand ' +
            'chaque copie notée est revenue. Le dernier doit être dit.',
        },
        {
          termine: 'Rendue à tous',
          testo:
            `Dans le cadre **${Uno(FR.riconsegna)}** de l’épreuve, **Rendue à tous · N** inscrit ` +
            'le jour pour ceux qui n’ont pas encore leur date, et laisse les autres tels quels. ' +
            'Le jour est aujourd’hui, ou celui de la leçon ouverte si on le fait depuis la leçon.',
        },
        {
          termine: 'Nom par nom',
          testo:
            'En dessous, une ligne pour chaque personne qui a une note, avec la date **Rendue ' +
            'le** et la coche **Rendue aujourd’hui**. C’est la façon de noter ceux qui ' +
            'manquaient le jour où la pile est revenue en classe.',
        },
        {
          termine: 'Revenir en arrière',
          testo:
            'L’épreuve rendue, à la place du bouton apparaît « rendue à tous au plus tard le… » ' +
            'et à côté une flèche circulaire qui retire la date pour tous : elle sert quand on a ' +
            'marqué la mauvaise épreuve.',
        },
        {
          termine: 'Depuis la leçon',
          testo:
            'Dans le registre de la leçon, **Épreuves à rendre** rassemble les épreuves du cours ' +
            'encore ouvertes : la ligne d’état, **À compléter** avec les notes qui manquent, ' +
            '**À rendre à** avec les noms, **Rattrapages à rendre**. Les dates qu’on y écrit ' +
            'sont celles de la leçon.',
        },
        {
          termine: 'En retard',
          testo:
            'Plus de 14 jours après l’épreuve sans qu’elle soit revenue à tous, la ligne se ' +
            'colore et le dit : « en attente depuis plus de 2 semaines ». Ce n’est pas une ' +
            'échéance : elle indique lesquelles regarder d’abord.',
        },
        {
          termine: 'Avant l’épreuve, rien',
          testo:
            'Une épreuve qui n’a pas encore eu lieu n’a pas de restitutions, et le registre ' +
            'n’accepte pas une date de restitution qui la précède.',
        },
      ],
      note: [
        'La date est par personne, pas par épreuve : une seule date disait « la classe l’a ' +
          'récupérée » même de ceux qui manquaient ce jour-là, et justement ces copies ' +
          'restaient dans le classeur. C’est aussi la seule trace que cette personne a vu sa ' +
          'note.',
      ],
    },
    rapporti: {
      titolo: 'Documents',
      sommario:
        'Ce qui sort du registre et passe dans d’autres mains : on le fait, on le regarde et on ' +
        'le combine d’ici.',
      scritte: {
        corso: 'Cours',
        lezioni: 'Leçons',
        persone: Molti(FR.pif),
        aggiornaTutto: 'Tout mettre à jour',
        combina: 'Combiner les 3',
        delCorso: 'Du cours',
        dueDiQuattro: '2 sur 4',
        prove: 'Épreuves',
        treDiTre: '3 sur 3',
        foglio: 'Présences · 1er sem.',
        treDiDodici: '3 sur 12',
        aOgniModifica: AUT_FR.sempre.nome,
        votoAppello: 'une note, un appel',
        quiete: '8 s de calme',
        alMassimo: '60 s au plus',
        rifatti: 'refaits',
        quali: 'présences, notes, fiches, tests',
        quandoSiChiude: AUT_FR.chiusura.nome,
        svolta: 'Donnée',
        siChiude: 'la leçon se clôt',
        suoVerbale: 'son procès-verbal, et les mêmes',
        soloAMano: AUT_FR.mai.nome,
        nessuno: 'ni l’un ni l’autre',
      },
      figure: [
        {
          didascalia:
            'À gauche ce qu’il y a, à droite la feuille qu’on est en train de regarder. Les ' +
            'onglets et les commandes de la page sont dans la barre d’actions.',
          legenda: [
            'Les trois **onglets** : de quoi on regarde les feuilles — du cours, des leçons, des ' +
              'personnes.',
            '**Tout mettre à jour** : refait d’un coup toutes les feuilles du cours.',
            'La **case** de chaque feuille : les feuilles cochées se combinent en un seul PDF.',
            'Le **point** : plein si le fichier est dans le dossier, vide s’il est à faire.',
            '**Loupe**, **flèches**, **corbeille** : la regarder, la faire ou la refaire, la ' +
              'jeter.',
            'L’**aperçu** : « 3 sur 12 » et les deux flèches font défiler les feuilles de ' +
              'l’onglet.',
          ],
        },
        {
          didascalia:
            'Les trois règles de **Qui les refait**. La période des feuilles refaites est celle ' +
            'des données touchées : une note de novembre refait les feuilles du premier semestre.',
        },
      ],
      voci: [
        {
          termine: 'Trois onglets',
          testo:
            '**Cours** : les cadres **Du cours** — présences et évaluations, en PDF et en CSV —, ' +
            '**De la classe** avec le dossier de classe, **Épreuves** avec une fiche par ' +
            'épreuve, **Plans de leçon**. **Leçons** : une ligne par leçon, avec ' +
            `**Procès-verbal** et **Plan de leçon**. **${Molti(FR.pif)}** : les **Photos de la ` +
            `classe** et une **${FR.documentoSchede}** chacune.`,
        },
        {
          termine: 'Chaque ligne dit si la feuille existe',
          testo:
            'Le point plein veut dire que le fichier est dans le dossier — en s’arrêtant dessus, ' +
            'sa taille, ou sa date pour la photo et le dossier de classe —, le vide qu’il est à ' +
            'faire. En tête de chaque cadre, le compte : « 18 sur 24 dans le dossier ».',
        },
        {
          termine: 'Loupe, flèches, corbeille',
          testo:
            'La **loupe** montre la feuille telle qu’elle est dans le dossier, qui n’est pas ' +
            'toujours ce que le registre dirait maintenant ; un clic sur la ligne fait de même. ' +
            'Les **flèches** la font ou la refont et la montrent ; la **corbeille** jette le ' +
            'fichier, et les données restent.',
        },
        {
          termine: 'Les leçons pas terminées',
          testo:
            'Dans l’onglet Leçons, elles sont en gris, avec le procès-verbal éteint : il ' +
            'sortirait sans appel et sans bilan, et le bouton dit pourquoi. Le plan s’imprime ' +
            'quand même. Le crayon à côté du procès-verbal en écrit la version texte, à corriger.',
        },
        {
          termine: 'Tout mettre à jour',
          testo:
            'Fait tout ce que le cours sait imprimer dans la période : présences, notes, une ' +
            'fiche par personne et par épreuve, le procès-verbal de chaque leçon donnée, chaque ' +
            'plan, la photo de classe et — pour les classes dont on est maître de classe — le ' +
            'dossier de classe ; puis il refait les compilations. Il n’ouvre rien : le message ' +
            'dit combien de feuilles.',
        },
        {
          termine: 'Qui les refait',
          testo:
            `Trois boutons dans la barre d’actions : **${AUT_FR.mai.nome}**, ` +
            `**${AUT_FR.chiusura.nome}**, **${AUT_FR.sempre.nome}** (par défaut). Celui qui est ` +
            'allumé est la règle en vigueur, et il voyage avec le document de l’année.',
        },
        {
          termine: 'L’aperçu',
          testo:
            'La feuille ouverte est à droite, dans le lecteur PDF du registre : pages, zoom, ' +
            'recherche, impression. En tête, « 3 sur 12 » et deux flèches pour faire défiler les ' +
            'feuilles de l’onglet ; à côté, la refaire, la jeter, l’ouvrir dans sa propre ' +
            'fenêtre, **Fermer**. Une fois refait, le fichier se recharge ; sinon il reste à la ' +
            'page et au zoom d’avant.',
        },
        {
          termine: 'Les CSV',
          testo:
            'Présences et évaluations sortent aussi en CSV, prêts pour le tableur : ' +
            'point-virgule, virgule décimale, accents en place. Dans l’aperçu, ils se lisent ' +
            'comme un tableau, et le bouton en tête les ouvre dans le programme du système.',
        },
        {
          termine: 'Plusieurs feuilles en un seul PDF',
          testo:
            'Chaque PDF déjà dans le dossier a une case, et celle en tête du cadre les coche ' +
            'toutes ; `Ctrl`+clic coche une ligne, `Maj`+clic jusque-là. Avec au moins deux ' +
            'cochés, **Combiner les N choisis** demande un nom et les met à la suite dans ' +
            'l’ordre de la page ; ceux cochés dans d’autres onglets vont à la fin. **Retirer ' +
            'les coches** repart de zéro.',
        },
        {
          termine: 'Une compilation se met à jour',
          testo:
            'Le registre se souvient de quoi elle est faite : dans le cadre **Compilations**, ' +
            'les flèches la recomposent avec les feuilles telles qu’elles sont maintenant dans ' +
            'le dossier. S’il en manque une, le compte le dit — « 18/20 » — et la refaire ' +
            'maintenant la laisserait de côté.',
        },
        {
          termine: 'Ici, on ne sort pas',
          testo:
            'Les noms dans les lignes ne mènent à aucune autre page : une ligne ouvre sa ' +
            'feuille, ' +
            '' +
            'c’est tout. Qui assemble un dossier de vingt feuilles ne se retrouve pas ailleurs à ' +
            'mi-chemin.',
        },
      ],
      note: [
        'Un PDF est une photographie : il naît juste et vieillit tout seul, et une vieille ' +
          'feuille n’a pas l’air de l’être. C’est pourquoi le registre les refait lui-même, et ' +
          'attend que les mains s’arrêtent : vingt cases de l’appel refont les feuilles une ' +
          'seule fois.',
        'Avant de remettre : **Tout mettre à jour**, puis **Regarder le premier** et les flèches ' +
        'de ' +
          'l’aperçu. On contrôle les feuilles l’une après l’autre, sans chercher les lignes.',
        'La corbeille ne jette que le fichier, qu’on refait au besoin. Une compilation jetée ' +
          'perd aussi la liste de ce qu’elle contenait, et ne peut plus être refaite : ses ' +
          'feuilles restent, une par une.',
      ],
    },
    fogli: {
      titolo: 'Ce que disent les feuilles',
      sommario:
        'Les documents que le registre imprime, un par un : ce qu’ils disent, et pour quelle ' +
        'période.',
      scritte: {
        verifica: '12.10.2026 Contrôle',
        orale: '09.11.2026 Oral',
        media: 'Moyenne',
        nota: 'Note',
        votoRecuperato: '4 R',
        recuperoFissato: 'R 20.10.2026',
        dispensato: 'disp.',
        assente: 'abs.',
      },
      figure: [
        {
          didascalia:
            'Un morceau de la grille **Évaluations** en PDF : une case vide ne reste pas muette, ' +
            'elle dit pourquoi elle est vide.',
          legenda: [
            '`4 R` : une note obtenue en refaisant l’épreuve un autre jour.',
            '`R 20.10.2026` : le jour fixé pour le rattrapage.',
            '`disp.` : déclaré sans rattrapage.',
            '`abs.` : absent à l’épreuve, rattrapage pas encore fixé.',
            '**Moyenne** au centième et **Note** sur le pas de la note semestrielle, sur le ' +
              'barème des paramètres : la feuille n’écrit pas « ≠ ».',
          ],
        },
      ],
      voci: [
        {
          termine: 'Présences',
          testo:
            'Pour chaque personne, les périodes du cours, celles suivies et celles d’absence, ' +
            'les retards, les périodes avec appel et les pourcentages ; en bas, la ligne de la ' +
            '**Classe** et, dans **À suivre**, qui dépasse le seuil d’absence.',
        },
        {
          termine: 'Les trois pourcentages',
          testo:
            '**% absence** est ce qu’on a perdu des heures que l’horaire prévoit dans la ' +
            'période, **% présence** est cent moins cela : les heures encore à venir ne ' +
            'comptent pas. Le **% appel** porte sur les seules périodes où l’appel a été fait, ' +
            'et dit à quel point les deux premiers sont fiables.',
        },
        {
          termine: 'Évaluations',
          testo:
            '**Notes et moyennes** est la grille, avec **Moyenne** et **Note**. **Passation et ' +
            'restitution** dit pour chaque case quand l’épreuve a été faite et quand elle est ' +
            'revenue, « 12.10.2026 > 20.10.2026 ». Puis **Les évaluations**, **Rattrapages** et ' +
            '**Épreuves encore à rendre**.',
        },
        {
          termine: 'La fiche d’une épreuve',
          testo:
            'Type, poids, moyenne, note la plus haute et la plus basse, suffisantes et ' +
            'insuffisantes ; la **Répartition**, un point par personne sur sa note exacte avec ' +
            'la ligne de la moyenne ; les notes et **À rattraper**. C’est le même graphique que ' +
            'sur la page Évaluations et dans la projection.',
        },
        {
          termine: `La ${FR.documentoSchede}`,
          testo:
            'Les données personnelles, les **Résultats** avec moyenne et note par cours, **Les ' +
            'épreuves** avec poids, note, rattrapage et restitution, les **Présences** avec la ' +
            'grille leçon par leçon, les **Annotations** et **Comment cela s’est passé**.',
        },
        {
          termine: 'Procès-verbal et plan',
          testo:
            'Le **procès-verbal** d’une leçon : appel, objectifs, déroulement effectué, sujets, ' +
            'matériel, devoirs donnés, observations, comment ça s’est passé, bilan. Le **plan de ' +
            'leçon** : objectifs, prérequis, déroulement, matériel, notes.',
        },
        {
          termine: 'Photos de la classe et dossier de classe',
          testo:
            'Les **Photos de la classe**, c’est un visage et un nom par personne, à emporter en ' +
            'classe. Le **Dossier de classe** appartient à la classe, pour toutes les branches : ' +
            'les personnes avec leurs coordonnées, les documents collectés, les périodes ' +
            'd’absences.',
        },
        {
          termine: 'Pour quelle période',
          testo:
            `Présences, évaluations et ${FR.documentoSchede} portent sur la **Période** ` +
            'choisie, écrite dans l’en-tête et dans le nom du fichier : de la même feuille, il ' +
            'peut y avoir l’année entière et les deux semestres. Plans et dossier de classe ' +
            'valent pour l’année.',
        },
        {
          termine: 'L’aspect des feuilles',
          testo:
            'Le nom de l’école et le logo sont sur les papiers à en-tête — chaque cours imprime ' +
            'sur le sien —, qui signe est un pour tous : ils s’écrivent dans Paramètres › ' +
            'Documents et impression › **En-tête**, et valent dès la prochaine fois que les ' +
            'feuilles se refont. Le reste — dimensions, sections, colonnes — ce sont les ' +
            'modèles qui le décident, et ils appartiennent au programme.',
        },
      ],
      note: [
        'Les comptes des feuilles sont ceux de l’écran : la même fonction fait la grille, la ' +
          'matrice des présences, le PDF et le CSV. Un nombre différent entre feuille et page ' +
          'veut dire une vieille feuille : on la refait. Seule exception, la note : la feuille ' +
          'la porte toujours sur le barème des paramètres, même pour les épreuves avec leur ' +
          'propre barème.',
      ],
    },
  },
  en: {
    valutazioni: {
      titolo: 'Assessments',
      sommario:
        `A course’s grade grid: ${EN.pif.plurale} in the rows, the period’s ` +
        `${EN.momento.plurale} in the columns.`,
      scritte: {
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        stato: 'Period · 1st semester',
        sganciati: '2 assessments aren’t linked to any step of the plan',
        media: 'Avg.',
        nota: 'Grade',
        sigla: 'R',
        mediaClasse: 'Class average',
        recuperi: 'Resits',
        daFissare: 'to schedule',
        recuperata: 'resat',
        prova: 'Test 4',
        numeri: 'average 4.88 · 75%',
        riconsegna: Uno(EN.riconsegna),
        resaATutti: 'Handed back to all · 4',
        proveCorrette: 'Marked tests 3/5',
      },
      figure: [
        {
          didascalia:
            'A course’s page, in the chosen period: on the left you enter the grades, on the ' +
            'right you look at the open test.',
          legenda: [
            '**Unlinked assessments**: tests that no plan step gave rise to. The box is only ' +
              'there when there are some.',
            'The **grid**: one row per person, one column per test. At the top the test’s ' +
              'title, below it the date and the weight when it isn’t 1 (`×2`). The title opens ' +
              'the test on the right.',
            '**Average** and **Grade** for the row: the grade is green from the pass mark up, ' +
              'red below.',
            '**Class average**: the average of each test, over the grades entered.',
            '**Resits** for the open test: who is resitting it, when, with what grade.',
            'The **open test**: its figures, the dot chart, **Edit** and **Go to the lesson**.',
            `**${Uno(EN.riconsegna)}**: where the test stands, and who still has to get it back.`,
            '**Documents**: test paper, solution and marked tests, as PDFs.',
          ],
        },
      ],
      voci: [
        {
          termine: 'You type as in a spreadsheet',
          testo:
            'You move with the arrow keys, type the grade and Enter moves down; at the bottom of ' +
            'the column it starts again at the top of the next. Every box also has a drop-down ' +
            'with the grades on its scale.',
        },
        {
          termine: 'What you type in a box',
          testo:
            'A number, decimals included; `X` for an absence, the same letter as in attendance ' +
            '(`a` and `ass` work too); `-` or nothing for “no grade”. Anything that isn’t a ' +
            'grade flashes red and stays in the field, to be corrected.',
        },
        {
          termine: 'Who was absent in the lesson of the test',
          testo:
            'If that lesson’s attendance has them absent, even for a single period, the empty box ' +
            'shows the `X` faintly. For the resit there’s no need to type it; to finish marking ' +
            'there is: as long as the box is empty, the test is “to mark”. Scheduling the ' +
            'resit, or saying there won’t be one, types it in for you.',
        },
        {
          termine: 'Where a test comes from',
          testo:
            'From a plan step ticked “This step is a test”, with **Create the test** in the ' +
            'lesson where it takes place: from there it takes its title, type, weight and date. ' +
            'That’s why the page has no button to create one.',
        },
        {
          termine: 'One course and one period at a time',
          testo:
            'The grid belongs to the **Course** chosen at the top and shows the tests that fall ' +
            'in the **Period**: averages and grades are for that period. Mixing two subjects ' +
            'would give a number that is the average of nothing.',
        },
        {
          termine: 'The open test',
          testo:
            'A click on a column’s title opens it on the right; with nothing chosen, it’s the ' +
            'latest. Date, type, weight, grades entered, average, lowest, highest, share of ' +
            'passes — green from 60% up — and the dot chart. **Go to the lesson** takes you to ' +
            'the lesson of the test.',
        },
        {
          termine: 'Correcting or removing a test',
          testo:
            '**Edit** changes the title, date, type, weight, the scale’s limits and pass mark, ' +
            'and the description; not the lesson or the step, which come from the outline. The ' +
            'bin next to it deletes it, and the confirmation says what goes with it.',
        },
        {
          termine: 'The test’s documents',
          testo:
            'In the **Documents** box, **Attach PDF** for the test paper, the solution and each ' +
            'person’s marked test; the count says how many there are. A click on the name opens ' +
            'the file, **Replace** swaps it.',
        },
        {
          termine: 'An “R” next to the grade',
          testo:
            'That box has a resit: hover over it to read when it’s scheduled for, or that there ' +
            'will be no resit.',
        },
        {
          termine: 'Unlinked assessments',
          testo:
            'A test that no step gave rise to — the plan or the step removed, the step no longer ' +
            'a test — appears in the box at the top with how many grades it would take with it. ' +
            'It stays in the averages until you delete it, one at a time or with **Delete all**.',
        },
      ],
      note: [
        'Grades are entered in two places — here and in the lesson of the test — but there is ' +
          'only one grid: same boxes, same grade. Here you see the whole year, and correct old ' +
          'or late grades.',
        'Deleting a test takes its grades with it, and the attached PDFs leave the year’s ' +
          'document (they don’t go to the system recycle bin). Grades are the one thing in the ' +
          'register that can’t be rebuilt by looking elsewhere.',
      ],
    },
    medie: {
      titolo: 'Averages and grades',
      sommario:
        'From the grade to the semester grade: one scale, the weights, two different roundings.',
      scritte: {
        votoPeso: 'grade × weight',
        fuori: 'X · left out',
        media: 'Average 4.44',
        conto: '17.75 ÷ 4, to two decimals',
        passo: 'step 0.5',
        nota: 'Grade 4.5',
        pagella: 'on the report',
        pesoZero: 'weight 0: kept, but not averaged',
        passoZero: 'step 0: grade = average',
      },
      figure: [
        {
          didascalia:
            'Three tests with different weights and one absence: the weighted average is 4.44, ' +
            'and the semester grade rounds it to the nearest half point.',
          legenda: [
            'Each grade is already on its scale’s **step**, and weighs what the test says.',
            'The **average**: the sum of grades times weight, divided by the sum of the weights, ' +
              'to two decimals.',
            'The **grade**: the average rounded to the **Step of the semester grade**, counted from ' +
              'zero.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The grading scale',
          testo:
            'Lowest and highest grade, pass mark and step are in Settings › Teaching › ' +
            '**Assessment**; by default 1–6, pass mark 4, step 0.25. Each test copies one when ' +
            'it’s created, and from **Edit** it can have its own limits and pass mark.',
        },
        {
          termine: 'The grade on the step',
          testo:
            'A grade you type goes to the nearest step on its scale, counted from the lowest: ' +
            'with a step of 0.25, 4.6 becomes 4.5. A grade outside the scale is rejected.',
        },
        {
          termine: 'The weight',
          testo:
            'How much the test counts in the average: 0 to 10, decimals allowed. It comes from ' +
            'the step the test is created from (otherwise 1) and is changed from **Edit**. With ' +
            'weight 0 the grade stays written but isn’t averaged.',
        },
        {
          termine: 'The average',
          testo:
            'Weighted: each grade times its weight, divided by the sum of the weights, to two ' +
            'decimals. Only the tests in the **Period** count; absences and empty boxes stay out ' +
            'and don’t pull anything down.',
        },
        {
          termine: 'The semester grade',
          testo:
            'The average rounded to the **Step of the semester grade** — by default 0.5, half points — ' +
            'counted from zero: 4.44 gives 4.5, 4.24 gives 4. With a step of 0 the grade is the ' +
            'average as it is.',
        },
        {
          termine: 'The class average',
          testo:
            'The grid’s last row: for each test, the plain average of the grades entered. ' +
            'Weight counts between one test and another, not within the same one.',
        },
        {
          termine: 'When there’s a “≠” instead of the grade',
          testo:
            'The period has tests on different scales: the average is still a guide, but it sits ' +
            'on neither scale, and a grade worked out from it would mean nothing.',
        },
      ],
      note: [
        'Two roundings, not one: the grade step is the fineness you mark with — quarters — the ' +
          'semester grade step the one you write the report with — halves. Kept apart, nobody ' +
          'has to round in their head.',
        'Changing the scale in the settings doesn’t rewrite grades already given: it applies ' +
          'to tests still to come. The semester grade step, on the other hand, applies at ' +
          'once, to every grade.',
      ],
    },
    recuperi: {
      titolo: 'Resits',
      sommario:
        'Who missed the test: when they resit it, or why they don’t. The grade goes in the usual ' +
        'column.',
      scritte: {
        assente: 'Absent',
        xOAppello: 'X or attendance',
        daFissare: 'to schedule',
        nessunaData: 'no date',
        fissato: 'scheduled',
        giornoCe: 'day is set',
        recuperata: 'resat',
        votoMesso: 'grade entered',
        resa: 'back',
        riconsegnataIl: 'handed back on…',
        dichiarato: 'declared',
        nonSiRecupera: 'no resit',
        senzaVoto: 'no grade: the X',
        nonRifatta: 'not resat',
        dataPassata: 'date passed',
        ilVoto: 'the grade',
      },
      figure: [
        {
          didascalia:
            'A resit closes in one of two ways: with a grade, or by declaring it won’t happen. ' +
            'Even resat and marked, it stays open until the paper goes back.',
          legenda: [
            'It appears by itself: an empty box, and `X` for the test or at least one period ' +
              'absent in that lesson’s attendance.',
            'Scheduling the day: the calendar on the row picks the course’s next lesson, the ' +
              'pencil any date. On that day the row says **today**.',
            'The grade, entered in the row or in the grid, closes the resit — even after the ' +
              'date.',
            'The resat test is handed back in its row, with its own date.',
            '**No resit** closes it without a grade; **Resit after all** reopens it.',
          ],
        },
      ],
      voci: [
        {
          termine: 'They appear by themselves',
          testo:
            'A row appears for anyone with an empty box who was marked `X` for the test, or ' +
            'absent in that lesson’s attendance for even a single period — and then the row says ' +
            '“from attendance”. Only for those still attending.',
        },
        {
          termine: 'Where to find them',
          testo:
            'In the **Resits** table under the grid, for the open test; among the ' +
            `${EN.pendenza.plurale}, for all classes; in the lesson on the scheduled day, under ` +
            '**Today’s resits**, with the grid narrowed to those resitting the test.',
        },
        {
          termine: 'Scheduling the day',
          testo:
            'The calendar on the row sets the course’s next lesson. The pencil opens **Test ' +
            'resit**: **Resit on**, **Returned on**, a **Note** and the documents; clearing the ' +
            'date puts it back among those still to schedule.',
        },
        {
          termine: 'The resit grade',
          testo:
            'It goes in the row’s **Grade** box, or in the grid: it’s the same box. It ends up ' +
            'in ' +
            '' +
            'that test’s column, with the same weight, and closes the resit.',
        },
        {
          termine: 'The states',
          testo:
            '**to schedule**, **scheduled**, **today**, **not resat** (the date passed without a ' +
            'grade), **resat**, **no resit**. The only ones that call for action are those to ' +
            'schedule and those not resat.',
        },
        {
          termine: 'When it isn’t resat',
          testo:
            'The cross on the row, or **No resit** in the form: the box stays without a grade — ' +
            'it gets the `X` — and the resit closes as declared. **Resit after all** reopens it.',
        },
        {
          termine: 'Handing back the resat test',
          testo:
            'In the **Handed back on** column: the date, and the tick that fills in today. Until ' +
            'it’s there, the resit stays among the things to hand back even if the grade is in.',
        },
        {
          termine: 'The resit documents',
          testo:
            'At the top of the table, **Resit paper** and **Resit solution**, one for everyone; ' +
            'on each row, the **Scan** of whoever resat it.',
        },
      ],
      note: [
        'A resit isn’t a new test: it’s the same test taken on another day. It adds no ' +
          'columns, and its grade counts in the average like those of the people who sat it ' +
          'on the first day.',
        'Scheduling the day serves one purpose: that when you walk into class that day, the ' +
          'lesson says who is resitting what. Without a date, a resit is a reminder nobody ' +
          'reads again.',
        'The resit day can’t come before the test, nor the hand-back before the resit: the ' +
          'register rejects dates the wrong way round.',
      ],
    },
    riconsegne: {
      titolo: 'Handing back',
      sommario:
        'A test that has been sat is finished when every marked paper is back with whoever ' +
        'wrote it.',
      scritte: {
        daCorreggere: 'to mark',
        daRiconsegnare: 'to hand back',
        riconsegnata: 'handed back',
        provaSvolta: 'test sat',
        ultimoVoto: 'the last grade',
        oltre: 'over 14 days',
        resaATutti: 'Handed back to all',
        chiMancava: 'Who was away that day',
        senzaData: 'stays without a date: set it by name',
        chiHaRecuperato: 'Who resat',
        nellaRiga: 'handed back in the resit row',
      },
      figure: [
        {
          didascalia:
            'The first two states are closed by the grades; the last one has to be recorded, ' +
            'because a grade entered isn’t a grade the class has seen.',
          legenda: [
            '**to mark** while a box is still empty: an `X` counts as done, an absence only in ' +
              'attendance doesn’t.',
            '**Handed back to all** writes the day on every graded paper that doesn’t have its ' +
              'own yet.',
            'After more than 14 days the row says “waiting for more than 2 weeks”.',
            'Anyone absent at the hand-back gets it another day: their date goes in the table ' +
              'of names.',
            'Anyone who resat the test has only one paper, the resit one.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Three states',
          testo:
            '**to mark** while there’s an empty box — including that of anyone absent only in ' +
            'attendance; **to hand back** when every box has a grade or an `X`; **handed ' +
            'back** when every graded paper has gone back. The last one has to be recorded.',
        },
        {
          termine: 'Handed back to all',
          testo:
            `In the test’s **${Uno(EN.riconsegna)}** box, **Handed back to all · N** writes the ` +
            'day for everyone who doesn’t have a date yet, and leaves the others as they are. ' +
            'The day is today, or that of the open lesson if you do it from the lesson.',
        },
        {
          termine: 'Name by name',
          testo:
            'Below, a row for everyone with a grade, with the **Handed back on** date and the ' +
            '**Handed back today** tick. It’s the way to record those who were away the day the ' +
            'pile came back to class.',
        },
        {
          termine: 'Changing your mind',
          testo:
            'Once the test is handed back, the button is replaced by “handed back to everyone ' +
            'by…” and, next to it, a circular arrow that removes the date for everyone: for when ' +
            'you marked the wrong test.',
        },
        {
          termine: 'From the lesson',
          testo:
            'In the lesson’s register, **Tests to hand back** gathers the course’s tests still ' +
            'open: the status line, **To complete** with the missing grades, **To hand back to** ' +
            'with the names, **Resits to hand back**. The dates you enter there are the ' +
            'lesson’s.',
        },
        {
          termine: 'Overdue',
          testo:
            'More than 14 days after the test without it being back with everyone, the row ' +
            'changes colour and says so: “waiting for more than 2 weeks”. It isn’t a deadline: ' +
            'it shows which ones to look at first.',
        },
        {
          termine: 'Before the test, nothing',
          testo:
            'A test that hasn’t taken place yet has nothing to hand back, and the register won’t ' +
            'accept a hand-back date before it.',
        },
      ],
      note: [
        'The date is per person, not per test: a single date said “the class has it back” ' +
          'even of those who were away that day, and those very papers stayed in the folder. ' +
          'It’s also the only record that the person has seen their grade.',
      ],
    },
    rapporti: {
      titolo: 'Documents',
      sommario:
        'What leaves the register and goes into other hands: you make it, check it and combine ' +
        'it from here.',
      scritte: {
        corso: 'Course',
        lezioni: 'Lessons',
        persone: Molti(EN.pif),
        aggiornaTutto: 'Update everything',
        combina: 'Combine the 3 chosen',
        delCorso: 'For the course',
        dueDiQuattro: '2 of 4',
        prove: 'Tests',
        treDiTre: '3 of 3',
        foglio: 'Attendance · Sem. 1',
        treDiDodici: '3 of 12',
        aOgniModifica: AUT_EN.sempre.nome,
        votoAppello: 'a grade, attendance',
        quiete: '8 s of quiet',
        alMassimo: 'at most 60 s',
        rifatti: 'remade',
        quali: 'attendance, grades, sheets, tests',
        quandoSiChiude: AUT_EN.chiusura.nome,
        svolta: 'Held',
        siChiude: 'the lesson closes',
        suoVerbale: 'its record, and the same ones',
        soloAMano: AUT_EN.mai.nome,
        nessuno: 'neither',
      },
      figure: [
        {
          didascalia:
            'On the left what there is, on the right the sheet you’re looking at. The page’s ' +
            'tabs and commands are in the action bar.',
          legenda: [
            'The three **tabs**: what the sheets are about — the course, the lessons, the ' +
              'people.',
            '**Update everything**: remakes all the course’s sheets in one go.',
            'Each sheet’s **tick box**: ticked sheets are combined into a single PDF.',
            'The **dot**: filled if the file is in the folder, hollow if it’s still to be made.',
            '**Magnifier**, **arrows**, **bin**: view it, make or remake it, throw it away.',
            'The **preview**: “3 of 12” and the two arrows scroll through the tab’s sheets.',
          ],
        },
        {
          didascalia:
            'The three rules of **Who remakes them**. The period of the remade sheets is that of ' +
            'the data touched: a grade in November remakes the first semester’s sheets.',
        },
      ],
      voci: [
        {
          termine: 'Three tabs',
          testo:
            '**Course**: the boxes **For the course** — attendance and assessments, as PDF and ' +
            'CSV —, ' +
            '**For the class** with the class file, **Tests** with a sheet per test, **Lesson ' +
            'plans**. ' +
            '**Lessons**: one row per lesson, with **Lesson record** and **Lesson plan**. ' +
            `**${Molti(EN.pif)}**: the **Class photos** and a **${EN.documentoSchede}** each.`,
        },
        {
          termine: 'Each row says whether the sheet exists',
          testo:
            'A filled dot means the file is in the folder — hover to see how big it is, or for ' +
            'the photo and the class file what day it’s from —, a hollow one that it’s still to ' +
            'be made. At the top of each box, the count: “18 of 24 in the folder”.',
        },
        {
          termine: 'Magnifier, arrows, bin',
          testo:
            'The **magnifier** shows the sheet as it is in the folder, which isn’t always what ' +
            'the register would say now; a click on the row does the same. The **arrows** make ' +
            'or remake it and show it; the **bin** throws the file away, and the data stays.',
        },
        {
          termine: 'Lessons not yet closed',
          testo:
            'In the Lessons tab they are greyed out, with the lesson record switched off: it ' +
            'would come out without attendance and without a review, and the button says why. ' +
            'The plan prints anyway. The pencil next to the lesson record writes its text version, to ' +
            'be corrected.',
        },
        {
          termine: 'Update everything',
          testo:
            'Makes everything the course can print for the period: attendance, grades, a sheet ' +
            'per person and per test, the record of every lesson held, every plan, the class ' +
            'photo and — for classes you’re class teacher of — the class file; then it rebuilds ' +
            'the compilations. It opens nothing: the message says how many sheets.',
        },
        {
          termine: 'Who remakes them',
          testo:
            `Three buttons in the action bar: **${AUT_EN.mai.nome}**, ` +
            `**${AUT_EN.chiusura.nome}**, **${AUT_EN.sempre.nome}** (the default). The one ` +
            'that’s on is the rule in force, and it travels with the year’s document.',
        },
        {
          termine: 'The preview',
          testo:
            'The open sheet is on the right, in the register’s PDF viewer: pages, zoom, search, ' +
            'print. At the top, “3 of 12” and two arrows to scroll through the tab’s sheets; ' +
            'next ' +
            '' +
            'to them remake it, throw it away, open it in its own window, **Close**. Once ' +
            'remade, ' +
            '' +
            'the file reloads; otherwise it stays on the page and zoom it had.',
        },
        {
          termine: 'The CSVs',
          testo:
            'Attendance and assessments also come out as CSV, ready for the spreadsheet: ' +
            'semicolons, decimal comma, accents intact. In the preview they read as a table, and ' +
            'the button at the top opens them in the system’s program.',
        },
        {
          termine: 'Several sheets in one PDF',
          testo:
            'Every PDF already in the folder has a tick box, and the one at the top of the box ' +
            'ticks them all; `Ctrl`+click ticks one row, `Shift`+click everything up to it. With ' +
            'at least two ticked, **Combine the N chosen** asks for a name and puts them in the ' +
            'page’s order; those ticked in other tabs go at the end. **Clear the ticks** starts ' +
            'again from scratch.',
        },
        {
          termine: 'A compilation can be updated',
          testo:
            'The register remembers what it’s made of: in the **Compilations** box the arrows ' +
            'rebuild it with the sheets as they are now in the folder. If one is missing, the ' +
            'count says so — “18/20” — and rebuilding it now would leave it out.',
        },
        {
          termine: 'You don’t leave from here',
          testo:
            'The names in the rows don’t lead to any other page: a row opens its sheet and ' +
            'that’s all. Whoever is putting together a batch of twenty sheets doesn’t end up ' +
            'somewhere else halfway through.',
        },
      ],
      note: [
        'A PDF is a photograph: it’s born right and ages by itself, and an old sheet doesn’t ' +
          'look old. That’s why the register remakes them itself, and waits for your hands to ' +
          'stop: twenty attendance boxes remake the sheets only once.',
        'Before handing in: **Update everything**, then **View the first** and the preview’s arrows. ' +
          'You check the sheets one after another, without hunting for the rows.',
        'The bin only throws away the file, which is remade when needed. A compilation thrown ' +
          'away also loses the list of what it contained, and can’t be rebuilt: its sheets ' +
          'stay, one by one.',
      ],
    },
    fogli: {
      titolo: 'What the sheets contain',
      sommario:
        'The documents the register prints, one by one: what they say, and for which period.',
      scritte: {
        verifica: '12.10.2026 Test',
        orale: '09.11.2026 Oral',
        media: 'Average',
        nota: 'Grade',
        votoRecuperato: '4 R',
        recuperoFissato: 'R 20.10.2026',
        dispensato: 'exc.',
        assente: 'abs.',
      },
      figure: [
        {
          didascalia:
            'Part of the **Assessments** grid as a PDF: an empty box doesn’t stay silent, it ' +
            'says ' +
            '' +
            'why it’s empty.',
          legenda: [
            '`4 R`: a grade from resitting the test on another day.',
            '`R 20.10.2026`: the day scheduled for the resit.',
            '`exc.`: declared as not being resat.',
            '`abs.`: absent from the test, resit not yet scheduled.',
            '**Average** to two decimals and **Grade** on the semester step, on the settings’ ' +
              'scale: the sheet never writes “≠”.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Attendance',
          testo:
            'For each person the course’s periods, those attended and those missed, late ' +
            'arrivals, the periods with attendance taken and the percentages; at the bottom ' +
            'the **Class** row and, under **To follow up**, anyone over the absence threshold.',
        },
        {
          termine: 'The three percentages',
          testo:
            '**% absence** is how much was missed of the hours the timetable sets for the ' +
            'period, **% attendance** is a hundred minus that: hours still to come don’t count. ' +
            'The **% recorded** covers only the periods with attendance taken, and says how ' +
            'reliable the first two are.',
        },
        {
          termine: 'Assessments',
          testo:
            '**Grades and averages** is the grid, with **Average** and **Grade**. **Taken and ' +
            'returned** says for each box when the test was taken and when it came back, ' +
            '“12.10.2026 > 20.10.2026”. Then **The assessments**, **Resits** and **Tests still ' +
            'to be handed back**.',
        },
        {
          termine: 'A test’s sheet',
          testo:
            'Type, weight, average, highest and lowest grade, passes and fails; the ' +
            '**Distribution**, one dot per person at their exact grade with the average line; ' +
            'the grades and **To be resat**. It’s the same chart as on the Assessments page and in ' +
            'the projection.',
        },
        {
          termine: `The ${EN.documentoSchede}`,
          testo:
            'The personal details, **Performance** with average and grade per course, **The ' +
            'tests** with weight, grade, resit and hand-back, **Attendance** with the grid ' +
            'lesson by lesson, the **Remarks** and **How it went**.',
        },
        {
          termine: 'Lesson record and plan',
          testo:
            'The **lesson record**: attendance, objectives, outline as taught, topics, ' +
            'materials, ' +
            'assignments set, observations, how it went, review. The **lesson plan**: ' +
            'objectives, prerequisites, outline, materials, notes.',
        },
        {
          termine: 'Class photos and class file',
          testo:
            'The **Class photos** sheet is a face and a name per person, to take into the ' +
            'classroom. ' +
            'The **Class file** belongs to the class, for all subjects: the people with their ' +
            'contact details, the documents collected, the absence periods.',
        },
        {
          termine: 'For which period',
          testo:
            `Attendance, assessments and ${EN.documentoSchede}s cover the chosen **Period**, ` +
            'written in the header and in the file name: the same sheet can exist for the whole ' +
            'year and for both semesters. Plans and the class file cover the year.',
        },
        {
          termine: 'What the sheets look like',
          testo:
            'The school name and logo are on the letterheads — each course prints on its own —, ' +
            'the signatory is one for all: they’re entered in Settings › Documents and ' +
            'printing › **Letterhead**, and apply from the next time the sheets are remade. The ' +
            'rest — sizes, sections, columns — is decided by the templates, which belong to the ' +
            'program.',
        },
      ],
      note: [
        'The sheets’ figures are the screen’s: the same function makes the grid, the ' +
          'attendance matrix, the PDF and the CSV. A different number between sheet and page ' +
          'means an old sheet: remake it. The one exception is the grade: the sheet always puts ' +
          'it on the settings’ scale, even for tests with a scale of their own.',
      ],
    },
  },
})
