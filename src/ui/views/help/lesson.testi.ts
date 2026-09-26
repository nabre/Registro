// I testi della guida, parte «Registro»: lezione, appello, consegne, check,
// svolgimento e osservazioni, piani. Una chiave per sezione (`TestiSezione`,
// testa di `types.ts`); struttura in `lesson.ts`.

import { catalogo } from '../../../i18n/index.js'
import {
  CARTE,
  FASCIA,
  Molti,
  PIF,
  UD,
  Uno,
  corto,
  del,
  un,
} from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  lezione: {
    titolo: 'Lezione',
    sommario:
      'La schermata che si tiene aperta durante la lezione, e com’è messa la lezione.',
    scritte: {
      calendario: 'Calendario',
      pendenze: Molti(CARTE.pendenza),
      daSmistare: 'Da smistare',
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      pianificata: 'Pianificata',
      svolta: 'Svolta',
      annullata: 'Annullata',
      modificaOra: 'Modifica la lezione',
      testata: 'giovedì 14.11 · 08:20–10:00 · aula 12',
      statoPianificata: 'pianificata',
      presenti: 'presenti 18/20',
      ritardi: 'ritardi 1 · 1h 30',
      navigatore: '✓ 12. gio 14.11 · 08:20 · Frazioni',
      posizione: '12 di 38',
      amministrazione: 'Amministrazione',
      schedaLezione: 'Lezione',
      annotazioni: 'Annotazioni',
      appello: 'Appello',
      consegne: 'Consegne',
      proveDaRiconsegnare: 'Prove da riconsegnare',
      oraDaFare: 'la lezione da fare',
      daCompilare: 'Da compilare',
      passataNonChiusa: 'passata, non chiusa',
      chiusa: 'chiusa',
      oraPassa: 'la lezione passa',
      svoltaPrima: 'Svolta anche prima che finisca',
      restaNonConta: 'resta, non conta',
      conConferma: 'con conferma',
      nellaBarra: '«da compilare» nella barra in fondo',
      verbale: 'Verbale',
      inDocumenti: 'in Documenti',
    },
    figure: [
      {
        didascalia:
          'La pagina di una lezione. Il corso non si sceglie qui: è quello della tendina **Corso** ' +
          'in cima, uguale per le cinque pagine del Registro.',
        legenda: [
          'La riga delle azioni: i tre stati della lezione e **Modifica la lezione**.',
          'La testata: classe, giorno, orario, aula, e i conti dell’appello.',
          'Il navigatore: lezione prima, lezione dopo, e la tendina di tutte le lezioni del corso.',
          'Le tre schede, una per momento della lezione.',
          'Le due colonne della scheda scelta: in Amministrazione l’appello a sinistra; ' +
            'consegne, check e prove da ridare a destra.',
        ],
      },
      {
        didascalia:
          'Il ciclo di una lezione. I buchi li decide l’orologio, non lo stato: una lezione passata ' +
          'senza appello resta da compilare anche se è segnata svolta.',
        legenda: [
          '**Pianificata**: la lezione prevista. Il suo pulsante ce la riporta da svolta o ' +
            'annullata, senza perdere niente.',
          'Passata senza appello, o senza **Svolta**: la barra in fondo propone per primo il ' +
            'buco più vecchio.',
          `**Svolta** chiude la lezione: esce dalle ${CARTE.pendenza.plurale}, e da lì il verbale ` +
            'si può fare.',
          '**Annullata**: resta nel registro, ma senza numero, fuori dai conti e dai buchi.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Aprire una lezione',
        testo:
          'Un clic sulla lezione nel calendario — con **Modifica** accesa il clic la sceglie, e ' +
          '**Invio** la apre —, o sulla lezione proposta nella barra in fondo. Nella ' +
          'riga delle azioni **Lezione da compilare** — **Prossima lezione** se non manca niente — porta ' +
          'alla lezione che aspetta. Senza una lezione aperta la pagina offre **Apri l’ultima lezione**.',
      },
      {
        termine: 'Le lezioni del corso',
        testo:
          'Le frecce passano alla lezione prima e a quella dopo dello stesso corso, la tendina salta ' +
          'a una qualunque: «✓ 12. gio 14.11 · 08:20». **✓** è svolta, **×** annullata, e le ' +
          'annullate non hanno numero. Accanto, «12 di 38».',
      },
      {
        termine: 'La testata',
        testo:
          'Classe, giorno, orario e aula; poi lo stato e i conti dell’appello: presenti, ' +
          'assenti, **da fare** (le caselle ancora vuote), ritardi, durata — e «con pause» ' +
          'quando la lezione ne ha.',
      },
      {
        termine: 'Stato della lezione',
        testo:
          '**Pianificata**, **Svolta** e **Annullata** stanno nella riga delle azioni: quello ' +
          'acceso è in vigore, e si preme quello dove si vuole portare la lezione. **Svolta** resta ' +
          'in evidenza finché non la si preme; **Annullata** chiede conferma.',
      },
      {
        termine: 'Modifica la lezione',
        testo:
          'Nella riga delle azioni, con **Modifica** accesa (in alto, accanto a **Proietta**, ' +
          'o Ctrl+E): corso, data, aula, stato, orario e scaletta. In fondo **Duplica** — la ' +
          'copia va poi spostata di data — ed **Elimina**. Spenta, la lezione si legge e si fa ' +
          'l’appello, ma giorno e orario non si toccano per sbaglio.',
      },
      {
        termine: 'Fasce e pause',
        testo:
          `**${Uno(FASCIA)} di lezione** aggiunge in coda un tratto in UD, lungo quanto una ` +
          'lezione nuova; **Pausa** uno in minuti, lungo quanto una pausa nuova. Le due misure e ' +
          'la durata dell’UD stanno in Impostazioni › Anno e orario › **Calendario**. I tratti ' +
          'stanno attaccati: si scrive solo l’inizio del primo, la fine la calcola il registro. ' +
          'Si riordinano con la presa; il cestino è **Togli la fascia**.',
      },
      {
        termine: 'Segue le pause della giornata',
        testo:
          'C’è quando la giornata ha le sue pause, ed è accesa da sé: le UD finiscono prima ' +
          'della ricreazione e riprendono dopo, e l’inizio si aggancia alla griglia delle pause. ' +
          'Intanto **Pausa** è spento, perché le pause le mette la giornata. Spenta, l’ora torna ' +
          'com’era all’apertura del modulo e le fasce si scrivono a mano.',
      },
      {
        termine: 'Una lezione del calendario ICS',
        testo:
          'Agganciata a un evento della scuola ha corso, data e la fascia dell’evento spenti — ' +
          'l’aula anche, se l’evento la scrive — e niente Elimina; accanto si aggiungono fasce e ' +
          'pause. **Sincronizza da ICS**, in fondo a **Modifica la lezione** o col tasto destro ' +
          'sulla lezione nel calendario, riporta orario, aula e stato a quel che dice il calendario.',
      },
      {
        termine: 'Le tre schede',
        testo:
          '**Amministrazione** mentre la classe entra: appello, consegne, check, prove da ' +
          'ridare. ' +
          '**Lezione** durante: la scaletta e le valutazioni. **Annotazioni** a classe uscita: ' +
          'lo svolgimento e le osservazioni. Le frecce ← → girano fra le tre.',
      },
      {
        termine: 'Consegne',
        testo:
          'Nella scheda Amministrazione, accanto all’appello: quel che si è dato da fare e non ' +
          'è ancora tornato, e **Nuova consegna**. Come si danno e si spuntano sta nella ' +
          'sezione Consegne.',
      },
      {
        termine: 'Prove da riconsegnare',
        testo:
          'Le prove del corso ancora in mano a chi insegna, ognuna con quel che le manca: ' +
          '**Da completare** (la griglia con le sole caselle vuote), **Da ridare a** (con la ' +
          'colonna «Riconsegnata il»), **Recuperi da ridare**. **Resa a tutti** e le spunte ' +
          'scrivono la data di questa lezione, non quella di oggi.',
      },
      {
        termine: 'La scaletta in aula',
        testo:
          'Nella scheda Lezione, il piano tappa per tappa: tipo, durata, quando cade, e quattro ' +
          'segni — **·** da fare, **✓** svolta, **~** in parte, **×** saltata. In testa «% ' +
          'svolto», «in orario» o i minuti di troppo; l’intervallo ha la sua riga. Le risorse si ' +
          'aprono con un clic.',
      },
      {
        termine: 'Assegnare o cambiare il piano',
        testo:
          'Senza piano c’è **Assegna un piano**: i piani del corso, ciascuno con i minuti in più ' +
          'o in meno rispetto all’ora, e **Nuovo piano per questa lezione**. Con il piano, ' +
          '**Cambia** e la matita **Modifica la scaletta**, che la mostra sulle UD di quest’ora.',
      },
      {
        termine: 'Le prove della lezione',
        testo:
          'Una tappa che è una prova ha nella colonna Prova **Crea la prova**: nasce il momento ' +
          'di valutazione, con la data di questa lezione, e si apre la pagina Valutazioni su di lui. ' +
          'Poi il pulsante diventa **Voti**, che ci riporta. I voti si mettono anche qui, nella ' +
          'scheda Valutazioni accanto, con il grafico delle note sotto.',
      },
      {
        termine: 'Recuperi di oggi',
        testo:
          'In fondo alle valutazioni: chi in quest’ora rifà una prova di un’altra volta. Compare ' +
          'solo se qualcuno l’ha fissata per il giorno di quest’ora, con la griglia ridotta ai ' +
          'soli nomi che la ' +
          'rifanno.',
      },
      {
        termine: 'Verbale',
        testo:
          'Il PDF della lezione — presenze, scaletta, argomenti, consegne, osservazioni — si fa dalla ' +
          'pagina **Documenti**, scheda Lezioni. Solo per una lezione **Svolta**: prima uscirebbe ' +
          'senza appello e senza consuntivo.',
      },
    ],
    note: [
      'Segnare **Svolta** rifà il verbale di quella lezione e i PDF del corso — presenze, voti, ' +
        'schede — a ' +
        'meno che il rifacimento automatico non sia spento. Non aspetta: l’avviso arriva ' +
        'quando i file sono pronti.',
      '**Svolta** non fa l’appello al posto di nessuno: su un’ora senza appello mette le ' +
        'righe, tutte **-**. L’ora resta «senza appello» finché non si segna almeno una casella.',
    ],
  },
  appello: {
    titolo: 'Appello',
    sommario: `Chi c’era, ${UD.singolare} per ${UD.singolare}, e che cosa ne esce nei conti.`,
    scritte: {
      ud: corto(UD),
      min: 'min',
      nota: 'nota',
      trenoInRitardo: 'treno in ritardo',
      daCapo: 'e da capo',
      unClic: 'un clic: lo stato dopo',
      premuto: 'premuto a lungo, o tasto destro:',
      ilMenu: 'il menu con tutti gli stati',
    },
    figure: [
      {
        didascalia:
          'Chi entra alla terza UD ha le prime due **X** e la terza **R**. Una riga tutta ' +
          '**-** è appello ancora da fare; **·** su un pulsante vuol dire caselle diverse sotto.',
        legenda: [
          'Il pulsante di riga: lo stesso stato su tutta l’ora di una persona.',
          'Il pulsante di colonna: lo stesso stato a tutta la classe, in quella UD.',
          `Una casella per ${UD.singolare}, con l’ora d’inizio in testa.`,
          'La pausa non è una colonna: stacca le UD che separa.',
          'I minuti di ritardo: la casella c’è solo nelle righe con una **R**.',
          'Una nota per persona, per quest’ora.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Una casella per UD',
        testo:
          `Le ${PIF.plurale} in riga, le ${UD.plurale} in colonna: un’ora di quattro UD ` +
          'sono quattro caselle a testa. Così chi arriva alla terza UD è presente da lì in poi, ' +
          'e le due perse restano scritte.',
      },
      {
        termine: 'Il giro del clic',
        testo:
          'Ogni casella nasce **-**, non detta. Un clic la porta avanti: **P** presente, **X** ' +
          'assente, **R** in ritardo, **E** esonerato, e di nuovo **-**. Premuta a lungo, o con ' +
          'il tasto destro, apre il menu con tutti gli stati.',
      },
      {
        termine: 'Una riga, una colonna',
        testo:
          'Il pulsante in testa a una riga vale per tutta l’ora di quella persona; quello in ' +
          'testa a una colonna, per tutta la classe in quella UD. Se sotto c’è un po’ di tutto ' +
          'mostra **·**, e il primo clic mette tutti a **P**.',
      },
      {
        termine: 'Tutti presenti, Azzera',
        testo:
          '**Tutti presenti** segna **P** su ogni casella dell’ora. **Azzera** le rimette tutte ' +
          'a **-**, e chiede conferma: non si disfa.',
      },
      {
        termine: 'Ritardi e note',
        testo:
          'Nelle righe con una **R** compare il campo dei minuti; tolta l’ultima **R**, i minuti ' +
          'se ne vanno con lei. Ogni riga ha anche una nota breve, per quest’ora.',
      },
      {
        termine: 'Quanto manca',
        testo:
          'Il sottotitolo della scheda comincia da quel che resta: «6 caselle da fare · 18 ' +
          'presenti su 20 · 4 UD». Le caselle **-** non contano come presenze.',
      },
      {
        termine: 'Che cosa toglie un’ora',
        testo:
          'Nei conti — percentuali, soglia di assenza, rapporti — toglie un’ora soltanto **X**. ' +
          'Il ritardo vale come presenza: le UD perse sono già le **X** prima. L’esonero non ' +
          'abbassa la frequenza. I ritardi si contano a parte, con i minuti.',
      },
      {
        termine: 'Chi entra, chi esce',
        testo:
          'L’appello mostra chi frequenta adesso, in ogni ora: ' +
          `${un(PIF)} iscritta a metà anno compare anche nelle ore vecchie, con caselle **-**. ` +
          'Chi si ritira sparisce anche dalle passate, ma le sue righe restano nel registro, e ' +
          'con loro le sue assenze.',
      },
    ],
    note: [
      'A dire quali ore contano è l’appello, non lo stato: un’ora con l’appello fatto entra ' +
        'nelle percentuali anche se nessuno l’ha segnata svolta. Restano fuori le annullate e ' +
        'le caselle ancora **-**.',
      'In aula: **Tutti presenti**, poi un clic su chi manca. Chi arriva dopo si corregge ' +
        'dalla sua riga, casella per casella.',
    ],
  },
  consegne: {
    titolo: 'Consegne',
    sommario:
      'Quel che si dà da fare e deve tornare indietro: a chi, come, entro quando.',
    scritte: {
      aChiTocca: 'A chi tocca',
      conUnFoglio: 'Con un foglio?',
      chiLoPorta: 'Chi lo porta',
      entroQuando: 'Entro quando',
      tuttaLaClasse: 'Tutta la classe',
      soloAlcune: 'Solo alcune',
      aMe: 'A me',
      noSpunta: 'no: basta la spunta',
      siAllega: 'sì: ognuno lo allega',
      meLoConsegnano: 'me lo consegnano',
      loConsegnoIo: 'lo consegno io:',
      aMano: 'a mano o per e-mail',
      unaLezione: 'una lezione del corso',
      unGiorno: 'un giorno preciso',
      nessunTermine: 'nessun termine',
      foglioFirme: 'foglio firme',
    },
    figure: [
      {
        didascalia:
          'Le quattro domande del modulo **Nuova consegna**, dopo «Che cosa» e il tipo. I ' +
          'campi della seconda e della terza compaiono solo se servono.',
        legenda: [
          `**Tutta la classe**, **Solo alcune ${PIF.plurale}** (scelte per nome) o **A me**.`,
          '**Si spunta consegnando un documento**: la spunta di ognuno è il suo file.',
          'Da che parte va il foglio; consegnandolo, **A mano, in classe** o **Per e-mail, ' +
            'uno a uno**. In più, se serve, il foglio delle firme.',
          '**Una lezione del corso**, **Un giorno preciso** o **Nessun termine**.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Nuova consegna',
        testo:
          'Dalla scheda Amministrazione di un’ora prende corso e data dell’ora; dalla pagina ' +
          `**${Molti(CARTE.pendenza)}** si sceglie anche il corso. Chiede che cosa, il tipo — ` +
          'compito, studio, materiale da portare, da consegnare… — e delle note.',
      },
      {
        termine: 'A chi tocca',
        testo:
          `**Tutta la classe**, **Solo alcune ${PIF.plurale}** o **A me** — una cosa che devo ` +
          'fare io. In ogni caso la spunta è per nome: si vede chi ha fatto e chi manca.',
      },
      {
        termine: 'Con un documento',
        testo:
          'Spuntato **Si spunta consegnando un documento**, si dice che documento è e chi lo ' +
          `porta: **Me lo consegnano le ${PIF.plurale}** o **Lo consegno io alle ` +
          `${PIF.plurale}**. Spuntare un nome, allora, vuol dire scegliere il suo file.`,
      },
      {
        termine: 'Consegnare per e-mail',
        testo:
          'Quando il foglio lo consegno io, **Per e-mail, uno a uno** manda un messaggio a ' +
          'testa con il documento allegato, e l’invio fa da prova. **Serve il foglio delle ' +
          'firme di consegna** chiede un foglio solo per tutti, da allegare.',
      },
      {
        termine: 'Entro quando',
        testo:
          '**Una lezione del corso** propone le prossime ore della classe, anche di altre ' +
          'materie: spostando quella lezione si sposta il termine. Oppure **Un giorno preciso**, ' +
          'o **Nessun termine**.',
      },
      {
        termine: 'Nella lezione',
        testo:
          'Quattro gruppi: rimaste indietro, scadono oggi, date in questa lezione, ancora ' +
          'aperte. Una consegna torna in ogni ora del corso finché non è spuntata da tutti.',
      },
      {
        termine: 'Spuntare',
        testo:
          'Il conto «12/20 · mancano…» apre il ritiro: i nomi per esteso, **Segna tutti**, ' +
          '**Togli tutti**, e in fondo **Spunta tutti**, che segna e chiude. La spunta in riga ' +
          'fa lo stesso senza aprire niente.',
      },
      {
        termine: 'Modificare, togliere',
        testo:
          'La matita riapre il modulo; **Elimina** se ne porta via anche le spunte già messe.',
      },
    ],
    note: [
      'Su una consegna fatta da tutti, la spunta in riga toglie le spunte e la rimette fra ' +
        'quelle da chiedere, dopo una conferma. I documenti raccolti restano.',
      `Una consegna senza ${PIF.plurale} a cui toccare — a settembre, prima delle ` +
        'iscrizioni — resta aperta: contarla come fatta la farebbe sparire appena scritta.',
    ],
  },
  check: {
    titolo: 'Check',
    sommario: `Le cose da fare una volta, spuntate ${PIF.singolare} per ${PIF.singolare}, con il giorno.`,
    voci: [
      {
        termine: 'Le colonne',
        testo:
          'Ogni colonna è una cosa da fare una volta: il regolamento firmato, il quaderno, la ' +
          'relazione. **Aggiungi una colonna** nella riga delle azioni della pagina **Check**; ' +
          '**Colonne** le mostra tutte insieme, da rinominare, mettere in fila trascinandole e ' +
          'togliere.',
      },
      {
        termine: 'Spuntare',
        testo:
          'Un clic su una casella vuota la spunta. Un altro clic la toglie solo se è spuntata ' +
          'nel giorno di cui si parla — oggi nella pagina, il giorno dell’ora dentro un’ora: ' +
          'è il clic sbagliato di un momento fa. Una spuntata in un altro giorno col clic non ' +
          'cambia: si cambia dal tasto destro. Nella pagina la casella spuntata dice il ' +
          'giorno, corto: `07.09`; fermandosi sopra si legge per esteso.',
      },
      {
        termine: 'Quale giorno',
        testo:
          'Dalla pagina, se il corso ha lezione oggi, la spunta va in quella lezione; altrimenti ' +
          'porta la data di oggi. Dentro un’ora — la scheda **Amministrazione**, sotto le ' +
          'consegne — va sempre nell’ora aperta.',
      },
      {
        termine: 'Un altro giorno',
        testo:
          'Il tasto destro sulla casella, o il tasto Menu della tastiera: su una vuota **Spunta ' +
          'oggi** e **Scegli la data…**; su una spuntata **Cambia la data…** e **Togli la ' +
          'spunta**. Il giorno scelto a mano resta quello, qualunque cosa succeda alle lezioni.',
      },
      {
        termine: 'Il menu della colonna',
        testo:
          'Clic o tasto destro sul nome della colonna: **Spunta tutti oggi** (dentro un’ora, ' +
          '**Spunta tutti in questa lezione**), **Rinomina…**, **Sposta a sinistra**, **Sposta a ' +
          'destra**, **Togli la colonna…**, **Aggiungi una colonna…**. Sotto il nome, quanti ' +
          'l’hanno fatta su quanti.',
      },
      {
        termine: 'Fuori dalla sua pagina',
        testo:
          'Il check si spunta anche altrove. Nella scheda del corso i numeri dicono, colonna ' +
          'per colonna, quanti l’hanno fatta su quanti frequentano — «Regolamento: 18/22», in ' +
          'verde quando è completa. La matrice ha una colonna **Check** con le colonne fatte da ' +
          'ciascuno: fermandosi sopra si leggono quelle che mancano. Sotto c’è la griglia ' +
          'intera, e il pulsante col segno di spunta in cima apre la pagina **Check** del corso.',
      },
      {
        termine: 'Nella lezione',
        testo:
          'La stessa griglia, nella scheda **Amministrazione**. Le caselle spuntate in quest’ora ' +
          'hanno la spunta, e il clic le toglie; quelle di un altro giorno dicono quale, col ' +
          'bordo tratteggiato, e si cambiano solo dal tasto destro — dove **Assegna alla ' +
          'lezione corrente** le riporta a quest’ora, e da lì seguono la lezione. Un corso ' +
          'senza colonne mostra solo una riga verso la pagina.',
      },
    ],
    note: [
      'Una spunta data dentro un’ora segue l’ora: se la lezione si sposta, la data si sposta ' +
        'con lei. Il clic non cambia mai il giorno di una spunta: per quello c’è **Cambia la ' +
        'data…**, nel menu del tasto destro.',
      'Togliere una colonna si porta via le sue spunte: prima lo si dice, con il numero.',
      'Chi non frequenta più resta nella griglia solo se ha già qualcosa di spuntato: ' +
        'quel che ha fatto mentre c’era non sparisce.',
    ],
  },
  annotazioni: {
    titolo: 'Svolgimento e osservazioni',
    sommario:
      'Quel che si è fatto nell’ora, e quel che c’è da segnare su qualcuno.',
    scritte: {
      svolgimento: 'Svolgimento',
      argomentiSvolti: 'Argomenti svolti',
      materiali: 'Materiali',
      consuntivo: 'Consuntivo',
      siSalva: 'si salva quando si lascia il campo',
      osservazioni: 'Osservazioni',
      partecipazione: 'Partec.',
      impegno: 'Impegno',
      autonomia: 'Autonom.',
      successo: 'Rossi A. · Impegno — che cosa è successo',
      disciplina: 'disciplina',
      merito: 'merito',
      tuttaLaClasse: 'tutta la classe',
    },
    figure: [
      {
        didascalia:
          'La scheda **Annotazioni**, a classe uscita. Tutto quel che c’è qui finisce nel ' +
          'verbale dell’ora.',
        legenda: [
          'Lo svolgimento: tre campi di testo, che si salvano da sé.',
          'La matrice del comportamento: le persone in riga, gli aspetti osservati in colonna.',
          'Le annotazioni delle caselle segnate, una riga per casella.',
          'Le osservazioni scritte per esteso, con il loro tipo.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Argomenti, materiali, consuntivo',
        testo:
          '**Argomenti svolti** — che cosa si è fatto davvero —, **Materiali** e **Consuntivo** ' +
          '— com’è andata, che cosa riprendere. Si salvano quando si lascia il campo.',
      },
      {
        termine: 'La matrice del comportamento',
        testo:
          'Un clic gira la casella: vuota, **Molto bene**, **Da migliorare**, vuota. Le colonne ' +
          'sono gli «Aspetti osservati in classe» di **Impostazioni** › Liste: di ' +
          'fabbrica partecipazione, collaborazione, rispetto delle regole, impegno, autonomia.',
      },
      {
        termine: 'Annotare una casella',
        testo:
          'Il tasto destro sulla casella apre i segni, **Niente da segnare** e **Annota**: sotto ' +
          'la matrice compare la sua riga, «che cosa è successo». Ogni casella segnata ha già ' +
          'la sua.',
      },
      {
        termine: 'Osservazioni per esteso',
        testo:
          `**Aggiungi**: riguarda ${un(PIF)} o tutta la classe, ha un tipo — nota, merito, ` +
          'disciplina, compiti, materiale, colloquio — un testo e, se serve, l’ora. La matita ' +
          'la modifica o la elimina.',
      },
      {
        termine: 'Dove finiscono',
        testo:
          'Nel verbale dell’ora, osservazioni e matrice comprese. Le caselle segnate si contano ' +
          `nella colonna **Segnato** di Corsi, e tutto si rilegge nella scheda ${del(PIF)}.`,
      },
    ],
    note: [
      'Una casella senza segno e senza annotazione si toglie da sola: nel registro restano ' +
        'solo le caselle che dicono qualcosa.',
    ],
  },
  piani: {
    titolo: 'Piani lezione',
    sommario:
      'Le ore del corso e le loro scalette: che cosa è preparato, e che cosa no.',
    scritte: {
      materia: 'Matematica',
      ore: '18/24 ore',
      cerca: 'cerca per data, obiettivo, tappa',
      semestre: '1° semestre',
      preparate: '18/24 preparate',
      lezione1: '1ª lezione',
      data1: 'gio 12.09',
      lezione2: '2ª lezione',
      data2: 'gio 19.09 · 20 min scoperti',
      lezione3: '3ª lezione',
      senzaPiano: 'senza piano — preparala',
      nonAssegnati: 'Non ancora assegnati (1)',
      bozza: 'bozza del 02.09',
      ripasso: 'Ripasso · 3 attività',
      titoloEditor: 'Matematica · 1ª lezione',
      diCheCosaParla: 'Di che cosa parla',
      campi: 'obiettivi · prerequisiti · etichette · note',
      scaletta: 'Scaletta',
      gruppo1: 'Gruppo 1 · 2 UD attaccate · 08:20–09:50',
      liberi: '10 min liberi',
      correzione: 'Correzione compiti',
      esercizio: 'Esercizio',
      frazioni: 'Frazioni equivalenti',
      spiegazione: 'Spiegazione',
      coppie: 'Esercizi a coppie',
      intervallo: 'Intervallo · 15 min · 09:50–10:05',
      gruppo2: 'Gruppo 2 · 1 UD · 10:05–10:50',
      pieno: 'pieno',
      verificaBreve: 'Verifica breve',
      verifica: 'Verifica',
      piano: 'Piano',
      scalettaProva: 'scaletta, prova',
      ora: 'Ora',
      assegnaUnPiano: 'Assegna un piano',
      inAula: 'In aula',
      momento: 'Momento',
      creaLaProva: 'Crea la prova',
      copia: 'Copia',
    },
    figure: [
      {
        didascalia:
          'A sinistra le ore del corso scelto in cima, a destra il piano dell’ora scelta, ' +
          'posato sulle sue UD. Quel che si scrive si salva da sé.',
        legenda: [
          'Le ore per semestre: «preparate» sono quelle che la scaletta riempie tutta.',
          'Un’ora che la scaletta non copre dice quanti minuti restano scoperti.',
          'Un’ora senza piano: un clic crea la scaletta e la apre.',
          'Obiettivi, prerequisiti, etichette e note: quel che fa ritrovare il piano.',
          'Un gruppo di UD attaccate, fra un intervallo e l’altro, con i minuti liberi.',
          'Il filo sotto ogni tappa: quanto del suo gruppo occupa.',
          'L’intervallo ha la sua riga, con i minuti che dura.',
        ],
      },
      {
        didascalia:
          'Un piano sta su un’ora, e in aula diventa spunte e voti. Il momento di valutazione ' +
          'nasce solo lì, dalla tappa che dice di essere una prova.',
        legenda: [
          'La tappa dice di essere una prova: titolo, tipo, peso.',
          'Il piano si assegna a un’ora dal registro della lezione, o nasce da lei.',
          'In aula ogni tappa si spunta: da fare, svolta, in parte, saltata.',
          '**Crea la prova** fa nascere il momento, con la data dell’ora.',
          '**Duplica** copia scaletta e file: così un piano serve a un’altra ora.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Le ore, per semestre',
        testo:
          'La pagina è l’elenco delle ore del corso scelto in cima, raccolte per semestre — o ' +
          'solo quello della tendina **Periodo**. La testata dice quante ore aspettano ancora ' +
          'una scaletta. La casella di ricerca trova per data, obiettivo o tappa.',
      },
      {
        termine: 'Preparare un’ora',
        testo:
          'Un’ora senza piano dice **senza piano — preparala**: un clic crea la scaletta vuota e ' +
          'la apre. Non c’è un «nuovo piano» sciolto: un piano nasce da un’ora, qui o dal ' +
          'registro della lezione.',
      },
      {
        termine: 'Come si chiama un piano',
        testo:
          'Dall’ora a cui è appeso: **«3ª lezione»**, e per esteso con il corso davanti. Il ' +
          'numero riparte a ogni semestre e salta le annullate; «+1» se lo usano due ore. Un ' +
          'piano non assegnato è una **bozza**, «bozza del 02.09».',
      },
      {
        termine: 'Di che cosa parla',
        testo:
          'Un piano non ha un titolo: ha **Obiettivi** (uno per riga), **Prerequisiti**, ' +
          '**Etichette** separate da virgola e **Note** per sé. Sono quel che la ricerca trova, ' +
          'e il primo obiettivo fa da argomento nella riga piccola.',
      },
      {
        termine: 'Le tappe',
        testo:
          'Ogni tappa ha titolo, tipo e durata **in minuti**. Il tipo si sceglie premendo la sua ' +
          'pastiglia. Si riordinano trascinando la presa, o con ↑ ↓ quando la presa ha il ' +
          'fuoco. **Aggiungi attività** ne mette una in fondo, già aperta.',
      },
      {
        termine: 'Il dettaglio di una tappa',
        testo:
          'La freccia a destra lo apre: **Svolgimento** (come si svolge, come lavora la classe, ' +
          'materiale d’aula), i **Dettagli** del tipo — grandezza dei gruppi, durata e punteggio ' +
          'di una verifica, postazione di un laboratorio —, la **Valutazione**, il materiale.',
      },
      {
        termine: 'Ci sta nell’ora?',
        testo:
          'Con un’ora sotto, le tappe cadono nei gruppi di UD fra un intervallo e l’altro: ' +
          '«10 min liberi», «pieno», «15 min di troppo». Quel che non ci sta finisce sotto ' +
          '**Oltre la fine della lezione**. Nell’elenco, «20 min scoperti» o «10 min oltre ' +
          'l’ora».',
      },
      {
        termine: 'Una tappa che è una prova',
        testo:
          'Nel dettaglio, **Questa tappa è una prova**: titolo (vuoto vuol dire quello della ' +
          'tappa), tipo di prova, peso da 0 a 10 — zero non fa media. Il momento vero nasce ' +
          'in aula, dalla colonna Prova della scaletta.',
      },
      {
        termine: 'Risorse',
        testo:
          '**Collegamento**, **File**, **Immagine**: del piano intero o di una tappa. File e ' +
          'immagini si copiano nel documento dell’anno, con il nome della tappa. La matita ' +
          'cambia titolo e note, o la sposta su un’altra tappa con **Appesa a**.',
      },
      {
        termine: 'Riuso',
        testo:
          '**Duplica** fa una copia, file compresi, da adattare. In fondo all’elenco ' +
          '«Non ancora assegnati» raccoglie le bozze, e **Senza corso** i piani rimasti orfani ' +
          'da riagganciare.',
      },
      {
        termine: 'Dove finisce',
        testo:
          'Sotto l’editor: le lezioni che usano il piano — con «prova da fare» dove la prova ' +
          'prevista non è ancora nata — e le valutazioni che ne sono uscite.',
      },
      {
        termine: 'La riga delle azioni',
        testo:
          '**Vai al registro** apre la prima ora che usa il piano; **Duplica** ed **Elimina** ' +
          'lavorano sul piano aperto. **Ora in questo corso** apre il modulo di una lezione ' +
          'nuova del corso, e salvata ci porta dentro.',
      },
    ],
    note: [
      'Le durate si scrivono in minuti ma si tengono in UD: lo stesso piano riusato in un ' +
        'anno dove le UD sono da cinquanta riempie comunque l’ora. La durata dell’UD la dice ' +
        'il documento, in Impostazioni › Anno e orario › **Calendario**.',
      'Una scaletta usata da più ore cambia in tutte: per cambiarne una sola si duplica. ' +
        'Assegnare un altro piano a un’ora ne azzera le spunte; togliere una tappa toglie la ' +
        'sua. **Elimina** butta anche i file del piano.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    lezione: {
      titolo: Uno(DE.lezione),
      sommario:
        'Die Ansicht, die man während der Stunde offen hat, und wie es um die Stunde steht.',
      scritte: {
        calendario: 'Kalender',
        pendenze: Molti(DE.pendenza),
        daSmistare: 'Zuzuordnen',
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: Molti(DE.pianoLezione),
        documenti: 'Dokumente',
        pianificata: 'Geplant',
        svolta: 'Gehalten',
        annullata: 'Ausgefallen',
        modificaOra: 'Stunde bearbeiten',
        testata: 'Donnerstag 14.11. · 08:20–10:00 · Zimmer 12',
        statoPianificata: 'geplant',
        presenti: 'anwesend 18/20',
        ritardi: 'verspätet 1 · 1h 30',
        navigatore: '✓ 12. Do 14.11. · 08:20 · Brüche',
        posizione: '12 von 38',
        amministrazione: 'Verwaltung',
        schedaLezione: 'Unterricht',
        annotazioni: 'Notizen',
        appello: 'Präsenzkontrolle',
        consegne: Molti(DE.consegna),
        proveDaRiconsegnare: 'Zurückzugebende Prüfungen',
        oraDaFare: 'die kommende Stunde',
        daCompilare: 'Auszufüllen',
        passataNonChiusa: 'vorbei, nicht erledigt',
        chiusa: 'abgeschlossen',
        oraPassa: 'Zeit vergeht',
        svoltaPrima: 'Gehalten auch vor dem Ende',
        restaNonConta: 'bleibt, zählt nicht',
        conConferma: 'mit Bestätigung',
        nellaBarra: '«auszufüllen» in der Leiste unten',
        verbale: 'Protokoll',
        inDocumenti: 'unter Dokumente',
      },
      figure: [
        {
          didascalia:
            'Die Seite einer Stunde. Den Kurs wählt man nicht hier: Es ist der aus der ' +
            'Auswahlliste **Kurs** oben, derselbe für die fünf Seiten des Klassenbuchs.',
          legenda: [
            'Die Aktionsleiste: die drei Status der Stunde und **Stunde bearbeiten**.',
            'Der Kopf: Klasse, Tag, Zeit, Zimmer und die Zahlen der Präsenzkontrolle.',
            'Der Navigator: Stunde davor, Stunde danach und die Auswahlliste aller Stunden des ' +
              'Kurses.',
            'Die drei Reiter, einer für jeden Moment der Stunde.',
            'Die zwei Spalten des gewählten Reiters: unter Verwaltung links die ' +
              'Präsenzkontrolle; rechts Aufträge, Check und zurückzugebende Prüfungen.',
          ],
        },
        {
          didascalia:
            'Der Lauf einer Stunde. Über Lücken entscheidet die Uhr, nicht der Status: Eine ' +
            'vergangene Stunde ohne Präsenzkontrolle bleibt auszufüllen, auch wenn sie als ' +
            'gehalten markiert ist.',
          legenda: [
            '**Geplant**: die vorgesehene Stunde. Ihre Schaltfläche holt sie von gehalten oder ' +
              'ausgefallen zurück, ohne etwas zu verlieren.',
            'Vorbei ohne Präsenzkontrolle oder ohne **Gehalten**: Die Leiste unten schlägt ' +
              'zuerst die älteste Lücke vor.',
            `**Gehalten** schliesst die Stunde ab: Sie verlässt die ${DE.pendenza.plurale}, ` +
              'und von da an lässt sich das Protokoll erstellen.',
            '**Ausgefallen**: bleibt im Klassenbuch, aber ohne Nummer, ausserhalb der ' +
              'Zählungen und der Lücken.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Eine Stunde öffnen',
          testo:
            'Ein Klick auf die Stunde im Kalender — mit eingeschaltetem ' +
            '**Bearbeiten** wählt der Klick sie aus, und **Enter** öffnet sie —, oder auf die ' +
            'vorgeschlagene Stunde in der Leiste unten. In der Aktionsleiste führt ' +
            '**Auszufüllende Stunde** — **Nächste Stunde**, wenn nichts fehlt — zur Stunde, die ' +
            'wartet. Ohne offene Stunde bietet die Seite **Letzte Stunde öffnen** an.',
        },
        {
          termine: 'Die Stunden des Kurses',
          testo:
            'Die Pfeile gehen zur Stunde davor und danach desselben Kurses, die Auswahlliste ' +
            'springt zu einer beliebigen: «✓ 12. Do 14.11. · 08:20». **✓** heisst gehalten, ' +
            '**×** ausgefallen, und ausgefallene haben keine Nummer. Daneben «12 von 38».',
        },
        {
          termine: 'Der Kopf',
          testo:
            'Klasse, Tag, Zeit und Zimmer; dann der Status und die Zahlen der ' +
            'Präsenzkontrolle: anwesend, abwesend, **offen** (die noch leeren Felder), ' +
            'Verspätungen, Dauer — und «mit Pausen», wenn die Stunde welche hat.',
        },
        {
          termine: 'Status der Stunde',
          testo:
            '**Geplant**, **Gehalten** und **Ausgefallen** stehen in der Aktionsleiste: Der ' +
            'eingeschaltete gilt, und man drückt den, zu dem man die Stunde bringen will. ' +
            '**Gehalten** bleibt hervorgehoben, bis man es drückt; **Ausgefallen** fragt nach ' +
            'einer Bestätigung.',
        },
        {
          termine: 'Stunde bearbeiten',
          testo:
            'In der Aktionsleiste, bei eingeschaltetem **Bearbeiten** (oben, neben ' +
            '**Projizieren**, oder Ctrl+E): Kurs, Datum, Zimmer, Status, Zeit und Ablauf. Unten ' +
            '**Duplizieren** — die Kopie muss man danach auf ein anderes Datum legen — und ' +
            '**Löschen**. Ausgeschaltet liest man die Stunde und macht die Präsenzkontrolle, ' +
            'aber Tag und Zeit ändert man nicht aus Versehen.',
        },
        {
          termine: 'Zeitfenster und Pausen',
          testo:
            '**Zeitfenster für Unterricht** hängt einen Abschnitt in Lektionen an, so lang wie ' +
            'eine neue Stunde; **Pause** einen in Minuten, so lang wie eine neue ' +
            'Pause. Die beiden Längen und die Dauer der Lektion stehen unter Einstellungen › ' +
            'Schuljahr und Stundenplan › **Kalender**. Die Abschnitte hängen aneinander: Man ' +
            'schreibt nur den Beginn des ersten, das Ende rechnet das Klassenbuch. Man ordnet ' +
            'sie mit dem Griff um; der Papierkorb ist **Zeitfenster entfernen**.',
        },
        {
          termine: 'Folgt den Pausen des Tages',
          testo:
            'Das gibt es, wenn der Tag seine Pausen hat, und es ist von selbst eingeschaltet: ' +
            'Die Lektionen enden vor der grossen Pause und gehen danach weiter, und der Beginn ' +
            'rastet am Raster der Pausen ein. Solange ist **Pause** ausgeschaltet, weil die ' +
            'Pausen der Tag setzt. Ausgeschaltet wird die Stunde wieder so, wie sie beim ' +
            'Öffnen des Formulars war, und die Zeitfenster schreibt man von Hand.',
        },
        {
          termine: 'Eine Stunde aus dem ICS-Kalender',
          testo:
            'An einen Termin der Schule gebunden, sind Kurs, Datum und das Zeitfenster des ' +
            'Termins gesperrt — auch das Zimmer, wenn der Termin es angibt — und Löschen gibt ' +
            'es nicht; daneben lassen sich Zeitfenster und Pausen hinzufügen. **Aus ICS ' +
            'synchronisieren**, unten in **Stunde bearbeiten** oder mit der rechten Maustaste ' +
            'auf der Stunde im Kalender, setzt Zeit, Zimmer und Status auf das zurück, was der ' +
            'Kalender sagt.',
        },
        {
          termine: 'Die drei Reiter',
          testo:
            '**Verwaltung**, während die Klasse hereinkommt: Präsenzkontrolle, Aufträge, ' +
            'Check, zurückzugebende Prüfungen. **Unterricht** währenddessen: der Ablauf und die ' +
            'Beurteilungen. **Notizen**, wenn die Klasse gegangen ist: die Durchführung und die ' +
            'Beobachtungen. Die Pfeile ← → wechseln zwischen den dreien.',
        },
        {
          termine: 'Aufträge',
          testo:
            'Im Reiter Verwaltung, neben der Präsenzkontrolle: was aufgegeben wurde und noch ' +
            'nicht zurückgekommen ist, und **Neuer Auftrag**. Wie man sie erteilt und abhakt, ' +
            'steht im Abschnitt Aufträge.',
        },
        {
          termine: 'Zurückzugebende Prüfungen',
          testo:
            'Die Prüfungen des Kurses, die noch bei der Lehrperson liegen, jede mit dem, was ' +
            'ihr fehlt: **Zu vervollständigen** (das Raster mit nur den leeren Feldern), ' +
            '**Zurückzugeben an** (mit der Spalte «Zurückgegeben am»), **Zurückzugebende ' +
            'Nachprüfungen**. **Allen zurückgegeben** und die Häkchen schreiben das Datum dieser ' +
            'Stunde, nicht das von heute.',
        },
        {
          termine: 'Der Ablauf im Zimmer',
          testo:
            'Im Reiter Unterricht der Plan Etappe für Etappe: Art, Dauer, wann sie fällt, und ' +
            'vier Zeichen — **·** offen, **✓** erledigt, **~** teilweise, **×** übersprungen. ' +
            'Oben «% erledigt», «im Zeitplan» oder die Minuten zu viel; die Pause hat ihre ' +
            'eigene Zeile. Die Ressourcen öffnen sich mit einem Klick.',
        },
        {
          termine: 'Den Plan zuweisen oder wechseln',
          testo:
            'Ohne Plan gibt es **Plan zuweisen**: die Pläne des Kurses, jeder mit den Minuten ' +
            'mehr oder weniger im Vergleich zur Stunde, und **Neuer Plan für diese ' +
            'Stunde**. Mit Plan **Wechseln** und der Stift **Ablauf bearbeiten**, ' +
            'der ihn auf den Lektionen dieser Stunde zeigt.',
        },
        {
          termine: 'Die Prüfungen der Stunde',
          testo:
            'Eine Etappe, die eine Prüfung ist, hat in der Spalte Prüfung **Prüfung ' +
            'erstellen**: Es entsteht die Leistungsbeurteilung, mit dem Datum dieser Stunde, ' +
            'und die Seite Beurteilungen öffnet sich darauf. Danach wird die Schaltfläche zu ' +
            '**Noten**, die dorthin zurückführt. Noten trägt man auch hier ein, im Reiter ' +
            'Beurteilungen daneben, mit dem Notendiagramm darunter.',
        },
        {
          termine: 'Nachprüfungen von heute',
          testo:
            'Unten bei den Beurteilungen: wer in dieser Stunde eine Prüfung von einem anderen ' +
            'Mal nachholt. Erscheint nur, wenn jemand sie auf den Tag dieser Stunde gelegt hat, ' +
            'mit dem Raster nur für die Namen, die sie nachholen.',
        },
        {
          termine: 'Protokoll',
          testo:
            'Das PDF der Stunde — Präsenzen, Ablauf, Themen, Aufträge, Beobachtungen — erstellt ' +
            'man auf der Seite **Dokumente**, Reiter Stunden. Nur für eine Stunde, ' +
            'die **Gehalten** ist: Vorher käme es ohne Präsenzkontrolle und ohne Rückblick ' +
            'heraus.',
        },
      ],
      note: [
        '**Gehalten** zu markieren erstellt das Protokoll dieser Stunde und die PDF des Kurses ' +
          '— Präsenzen, Noten, Blätter — neu, sofern das automatische Neuerstellen nicht ' +
          'ausgeschaltet ist. Es wartet nicht: Die Meldung kommt, wenn die Dateien bereit sind.',
        '**Gehalten** macht niemandem die Präsenzkontrolle: Auf einer Stunde ohne ' +
          'Präsenzkontrolle legt es die Zeilen an, alle **-**. Die Stunde bleibt «ohne ' +
          'Präsenzkontrolle», bis mindestens ein Feld gesetzt ist.',
      ],
    },
    appello: {
      titolo: 'Präsenzkontrolle',
      sommario:
        `Wer da war, ${DE.unitaDidattica.singolare} für ${DE.unitaDidattica.singolare}, und ` +
        'was daraus in den Zählungen wird.',
      scritte: {
        ud: corto(DE.unitaDidattica),
        min: 'Min.',
        nota: 'Notiz',
        trenoInRitardo: 'Zug verspätet',
        daCapo: 'und von vorn',
        unClic: 'ein Klick: der nächste Status',
        premuto: 'lange gedrückt oder Rechtsklick:',
        ilMenu: 'das Menü mit allen Status',
      },
      figure: [
        {
          didascalia:
            'Wer zur dritten Lektion kommt, hat bei den ersten beiden **X** und bei der dritten ' +
            '**R**. Eine Zeile nur mit **-** ist eine noch offene Präsenzkontrolle; **·** auf ' +
            'einer Schaltfläche heisst, dass die Felder darunter verschieden sind.',
          legenda: [
            'Die Schaltfläche der Zeile: derselbe Status für die ganze Stunde einer Person.',
            'Die Schaltfläche der Spalte: derselbe Status für die ganze Klasse, in dieser ' +
              'Lektion.',
            `Ein Feld pro ${DE.unitaDidattica.singolare}, mit der Anfangszeit oben.`,
            'Die Pause ist keine Spalte: Sie trennt die Lektionen, zwischen denen sie liegt.',
            'Die Minuten Verspätung: Das Feld gibt es nur in Zeilen mit einem **R**.',
            'Eine Notiz pro Person, für diese Stunde.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ein Feld pro Lektion',
          testo:
            `Die ${DE.pif.plurale} in Zeilen, die ${DE.unitaDidattica.plurale} in Spalten: ` +
            'Eine Stunde mit vier Lektionen sind vier Felder pro Person. So ist, wer zur ' +
            'dritten Lektion kommt, ab da anwesend, und die zwei verpassten bleiben ' +
            'festgehalten.',
        },
        {
          termine: 'Die Runde des Klicks',
          testo:
            'Jedes Feld beginnt mit **-**, nicht erfasst. Ein Klick bringt es weiter: **P** ' +
            'anwesend, **X** abwesend, **R** verspätet, **E** dispensiert, und wieder **-**. ' +
            'Lange gedrückt oder mit der rechten Maustaste öffnet es das Menü mit allen Status.',
        },
        {
          termine: 'Eine Zeile, eine Spalte',
          testo:
            'Die Schaltfläche am Anfang einer Zeile gilt für die ganze Stunde dieser Person; ' +
            'die oben an einer Spalte für die ganze Klasse in dieser Lektion. Ist darunter von ' +
            'allem etwas, zeigt sie **·**, und der erste Klick setzt alle auf **P**.',
        },
        {
          termine: 'Alle anwesend, Zurücksetzen',
          testo:
            '**Alle anwesend** setzt **P** in jedes Feld der Stunde. **Zurücksetzen** stellt ' +
            'alle wieder auf **-** und fragt nach einer Bestätigung: Es lässt sich nicht ' +
            'rückgängig machen.',
        },
        {
          termine: 'Verspätungen und Notizen',
          testo:
            'In Zeilen mit einem **R** erscheint das Feld für die Minuten; ist das letzte **R** ' +
            'weg, gehen die Minuten mit. Jede Zeile hat auch eine kurze Notiz, für diese Stunde.',
        },
        {
          termine: 'Wie viel fehlt',
          testo:
            'Der Untertitel des Reiters beginnt mit dem, was bleibt: «6 Felder offen · 18 ' +
            'anwesend von 20 · 4 Lekt.». Felder mit **-** zählen nicht als anwesend.',
        },
        {
          termine: 'Was eine Stunde abzieht',
          testo:
            'In den Zählungen — Prozente, Absenzenschwelle, Berichte — zieht nur **X** eine ' +
            'Stunde ab. Die Verspätung zählt als anwesend: Die verpassten Lektionen sind schon ' +
            'die **X** davor. Die Dispens senkt die Anwesenheit nicht. Verspätungen zählt man ' +
            'separat, mit den Minuten.',
        },
        {
          termine: 'Wer kommt, wer geht',
          testo:
            'Die Präsenzkontrolle zeigt, wer jetzt dabei ist, in jeder Stunde: Lernende, die ' +
            'mitten im Jahr eintreten, erscheinen auch in den alten Stunden, mit Feldern **-**. ' +
            'Wer austritt, verschwindet auch aus den vergangenen, aber die Zeilen bleiben im ' +
            'Klassenbuch, und mit ihnen die Absenzen.',
        },
      ],
      note: [
        'Welche Stunden zählen, sagt die Präsenzkontrolle, nicht der Status: Eine Stunde mit ' +
          'erledigter Präsenzkontrolle geht in die Prozente ein, auch wenn niemand sie als ' +
          'gehalten markiert hat. Draussen bleiben die ausgefallenen und die Felder, die noch ' +
          '**-** sind.',
        'Im Zimmer: **Alle anwesend**, dann ein Klick auf die, die fehlen. Wer später kommt, ' +
          'wird in seiner Zeile korrigiert, Feld für Feld.',
      ],
    },
    consegne: {
      titolo: Molti(DE.consegna),
      sommario: 'Was man aufgibt und zurückkommen muss: an wen, wie, bis wann.',
      scritte: {
        aChiTocca: 'Für wen',
        conUnFoglio: 'Mit einem Blatt?',
        chiLoPorta: 'Wer es bringt',
        entroQuando: 'Bis wann',
        tuttaLaClasse: 'Die ganze Klasse',
        soloAlcune: 'Nur einzelne',
        aMe: 'Für mich',
        noSpunta: 'nein: Häkchen genügt',
        siAllega: 'ja: alle hängen es an',
        meLoConsegnano: 'sie geben es mir ab',
        loConsegnoIo: 'ich händige es aus:',
        aMano: 'persönlich oder per E-Mail',
        unaLezione: 'eine Stunde des Kurses',
        unGiorno: 'ein bestimmter Tag',
        nessunTermine: 'keine Frist',
        foglioFirme: 'Unterschriftenblatt',
      },
      figure: [
        {
          didascalia:
            'Die vier Fragen des Formulars **Neuer Auftrag**, nach «Was» und der Art. Die ' +
            'Felder der zweiten und der dritten erscheinen nur, wenn sie nötig sind.',
          legenda: [
            '**Die ganze Klasse**, **Nur einzelne Lernende** (nach Namen gewählt) oder **Für ' +
              'mich**.',
            '**Abgehakt wird mit der Abgabe eines Dokuments**: Das Häkchen jeder Person ist ' +
              'ihre Datei.',
            'In welche Richtung das Blatt geht; beim Ausgeben **Persönlich, in der Klasse** ' +
              'oder **Per E-Mail, einzeln**. Dazu, wenn nötig, das Unterschriftenblatt.',
            '**Eine Stunde des Kurses**, **Ein bestimmter Tag** oder **Keine Frist**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Neuer Auftrag',
          testo:
            'Aus dem Reiter Verwaltung einer Stunde übernimmt er Kurs und Datum der Stunde; auf ' +
            `der Seite **${Molti(DE.pendenza)}** wählt man auch den Kurs. Er fragt nach dem ` +
            'Was, der Art — Aufgabe, Lernen, mitzubringendes Material, Abzugebendes… — und ' +
            'nach Notizen.',
        },
        {
          termine: 'Für wen',
          testo:
            '**Die ganze Klasse**, **Nur einzelne Lernende** oder **Für mich** — etwas, das ich ' +
            'selbst tun muss. In jedem Fall wird nach Namen abgehakt: Man sieht, wer es erledigt ' +
            'hat und wer fehlt.',
        },
        {
          termine: 'Mit einem Dokument',
          testo:
            'Ist **Abgehakt wird mit der Abgabe eines Dokuments** angekreuzt, sagt man, was für ' +
            'ein Dokument es ist und wer es bringt: **Die Lernenden geben es mir ab** oder ' +
            '**Ich händige es den Lernenden aus**. Einen Namen abhaken heisst dann, seine Datei auszuwählen.',
        },
        {
          termine: 'Per E-Mail ausgeben',
          testo:
            'Wenn ich das Blatt ausgebe, schickt **Per E-Mail, einzeln** jeder Person eine ' +
            'Nachricht mit dem Dokument im Anhang, und der Versand dient als Nachweis. ' +
            '**Unterschriftenblatt für die Übergabe nötig** verlangt ein einziges Blatt für ' +
            'alle, zum Anhängen.',
        },
        {
          termine: 'Bis wann',
          testo:
            '**Eine Stunde des Kurses** schlägt die nächsten Stunden der Klasse vor, ' +
            'auch in anderen Fächern: Verschiebt sich diese Stunde, verschiebt sich die Frist. ' +
            'Oder **Ein bestimmter Tag**, oder **Keine Frist**.',
        },
        {
          termine: 'In der Stunde',
          testo:
            'Vier Gruppen: überfällig, heute fällig, in dieser Stunde ' +
            'aufgegeben, noch offen. Ein Auftrag kommt in jeder Stunde des Kurses wieder, bis ' +
            'alle abgehakt sind.',
        },
        {
          termine: 'Abhaken',
          testo:
            'Die Zählung «12/20 · es fehlen…» öffnet das Einsammeln: die ganzen Namen, **Alle ' +
            'markieren**, **Alle entfernen**, und unten **Alle abhaken**, das markiert und ' +
            'schliesst. Das Häkchen in der Zeile tut dasselbe, ohne etwas zu öffnen.',
        },
        {
          termine: 'Bearbeiten, entfernen',
          testo:
            'Der Stift öffnet das Formular wieder; **Löschen** nimmt auch die schon gesetzten ' +
            'Häkchen mit.',
        },
      ],
      note: [
        'Bei einem Auftrag, den alle erledigt haben, entfernt das Häkchen in der Zeile die ' +
          'Häkchen und stellt ihn wieder zu den einzufordernden, nach einer Bestätigung. Die ' +
          'gesammelten Dokumente bleiben.',
        `Ein Auftrag ohne ${DE.pif.plurale}, die ihn betreffen — im September, vor den ` +
          'Einschreibungen — bleibt offen: Ihn als erledigt zu zählen, liesse ihn gleich nach ' +
          'dem Schreiben verschwinden.',
      ],
    },
    check: {
      titolo: 'Check',
      sommario: 'Was einmal zu tun ist, pro Person abgehakt, mit dem Tag.',
      voci: [
        {
          termine: 'Die Spalten',
          testo:
            'Jede Spalte ist etwas, das einmal zu tun ist: das unterschriebene Reglement, das ' +
            'Heft, der Bericht. **Spalte hinzufügen** in der Aktionsleiste der Seite **Check**; ' +
            '**Spalten** zeigt sie alle zusammen, zum Umbenennen, zum Ordnen durch Ziehen und ' +
            'zum Entfernen.',
        },
        {
          termine: 'Abhaken',
          testo:
            'Ein Klick auf ein leeres Feld hakt es ab. Ein weiterer Klick entfernt das Häkchen ' +
            'nur, wenn es am Tag gesetzt wurde, um den es geht — heute auf der Seite, der Tag ' +
            'der Stunde in einer Stunde: Es ist der falsche Klick von eben. Ein an einem ' +
            'anderen Tag abgehaktes Feld ändert sich beim Klick nicht: Man ändert es mit der ' +
            'rechten Maustaste. Auf der Seite zeigt das abgehakte Feld den Tag, kurz: `07.09`; ' +
            'fährt man darüber, liest man ihn ausgeschrieben.',
        },
        {
          termine: 'Welcher Tag',
          testo:
            'Auf der Seite kommt das Häkchen, wenn der Kurs heute Unterricht hat, in diese ' +
            'Stunde; sonst trägt es das heutige Datum. In einer Stunde — im Reiter ' +
            '**Verwaltung**, unter den Aufträgen — kommt es immer in die offene Stunde.',
        },
        {
          termine: 'Ein anderer Tag',
          testo:
            'Die rechte Maustaste auf dem Feld, oder die Menütaste der Tastatur: auf einem ' +
            'leeren **Heute abhaken** und **Datum wählen…**; auf einem abgehakten **Datum ' +
            'ändern…** und **Häkchen entfernen**. Der von Hand gewählte Tag bleibt, was auch ' +
            'immer mit den Stunden geschieht.',
        },
        {
          termine: 'Das Menü der Spalte',
          testo:
            'Klick oder rechte Maustaste auf den Namen der Spalte: **Alle heute abhaken** (in ' +
            'einer Stunde **Alle in dieser Stunde abhaken**), **Umbenennen…**, **Nach ' +
            'links verschieben**, **Nach rechts verschieben**, **Spalte entfernen…**, **Spalte ' +
            'hinzufügen…**. Unter dem Namen, wie viele es erledigt haben, von wie vielen.',
        },
        {
          termine: 'Ausserhalb der eigenen Seite',
          testo:
            'Den Check hakt man auch anderswo ab. In der Kursübersicht sagen die Zahlen, Spalte ' +
            'für Spalte, wie viele es erledigt haben, von wie vielen, die dabei sind — ' +
            '«Reglement: 18/22», grün, wenn alles erledigt ist. Die Matrix hat eine Spalte ' +
            '**Check** mit den erledigten Spalten jeder Person: Fährt man darüber, liest man, ' +
            'welche fehlen. Darunter steht das ganze Raster, und die Schaltfläche mit dem ' +
            'Häkchen oben öffnet die Seite **Check** des Kurses.',
        },
        {
          termine: 'In der Stunde',
          testo:
            'Dasselbe Raster, im Reiter **Verwaltung**. Die in dieser Stunde abgehakten Felder ' +
            'tragen das Häkchen, und der Klick entfernt es; die von einem anderen Tag sagen ' +
            'welchen, mit gestricheltem Rand, und ändern sich nur mit der rechten Maustaste — ' +
            'wo **Der aktuellen Stunde zuordnen** sie zu dieser Stunde holt, und von ' +
            'da an folgen sie der Stunde. Ein Kurs ohne Spalten zeigt nur eine Zeile, ' +
            'die zur Seite führt.',
        },
      ],
      note: [
        'Ein Häkchen, das in einer Stunde gesetzt wurde, folgt der Stunde: Verschiebt sich ' +
          'die Stunde, verschiebt sich das Datum mit. Der Klick ändert nie den Tag ' +
          'eines Häkchens: Dafür gibt es **Datum ändern…** im Menü der rechten Maustaste.',
        'Eine Spalte zu entfernen, nimmt ihre Häkchen mit: Vorher sagt es das, mit der Zahl.',
        'Wer nicht mehr dabei ist, bleibt nur im Raster, wenn schon etwas abgehakt ist: Was ' +
          'die Person erledigt hat, solange sie da war, verschwindet nicht.',
      ],
    },
    annotazioni: {
      titolo: 'Durchführung und Beobachtungen',
      sommario:
        'Was man in der Stunde gemacht hat, und was es über jemanden festzuhalten gibt.',
      scritte: {
        svolgimento: 'Durchführung',
        argomentiSvolti: 'Behandelte Themen',
        materiali: 'Materialien',
        consuntivo: 'Rückblick',
        siSalva: 'speichert sich beim Verlassen des Felds',
        osservazioni: Molti(DE.osservazione),
        partecipazione: 'Beteil.',
        impegno: 'Einsatz',
        autonomia: 'Selbst.',
        successo: 'Rossi A. · Einsatz — was ist passiert',
        disciplina: 'Disziplin',
        merito: 'Lob',
        tuttaLaClasse: 'die ganze Klasse',
      },
      figure: [
        {
          didascalia:
            'Der Reiter **Notizen**, wenn die Klasse gegangen ist. Alles, was hier steht, ' +
            'kommt ins Protokoll der Stunde.',
          legenda: [
            'Die Durchführung: drei Textfelder, die sich selbst speichern.',
            'Die Matrix des Verhaltens: die Personen in Zeilen, die beobachteten Aspekte in ' +
              'Spalten.',
            'Die Anmerkungen zu den markierten Feldern, eine Zeile pro Feld.',
            'Die ausführlich geschriebenen Beobachtungen, mit ihrer Art.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Themen, Materialien, Rückblick',
          testo:
            '**Behandelte Themen** — was wirklich gemacht wurde —, **Materialien** und ' +
            '**Rückblick** — wie es gelaufen ist, was man wieder aufnimmt. Sie speichern sich, ' +
            'wenn man das Feld verlässt.',
        },
        {
          termine: 'Die Matrix des Verhaltens',
          testo:
            'Ein Klick dreht das Feld weiter: leer, **Sehr gut**, **Zu verbessern**, leer. Die ' +
            'Spalten sind die Liste «Beobachtete Aspekte im Unterricht» unter **Einstellungen** › ' +
            'Listen: ab Werk Beteiligung, Zusammenarbeit, Einhalten der Regeln, Einsatz, ' +
            'Selbstständigkeit.',
        },
        {
          termine: 'Ein Feld anmerken',
          testo:
            'Die rechte Maustaste auf dem Feld öffnet die Zeichen, **Nichts zu vermerken** und ' +
            '**Anmerken**: Unter der Matrix erscheint seine Zeile, «was ist passiert». Jedes ' +
            'markierte Feld hat seine schon.',
        },
        {
          termine: 'Ausführliche Beobachtungen',
          testo:
            '**Hinzufügen**: Sie betrifft eine lernende Person oder die ganze Klasse, hat eine ' +
            'Art — Notiz, Lob, Disziplin, Hausaufgaben, Material, Gespräch —, einen Text und, ' +
            'wenn nötig, die Uhrzeit. Der Stift bearbeitet oder löscht sie.',
        },
        {
          termine: 'Wohin sie gehen',
          testo:
            'Ins Protokoll der Stunde, Beobachtungen und Matrix inbegriffen. Die markierten ' +
            'Felder zählt die Spalte **Markiert** unter Kurse, und alles lässt sich im ' +
            'Personenblatt der lernenden Person nachlesen.',
        },
      ],
      note: [
        'Ein Feld ohne Zeichen und ohne Anmerkung entfernt sich von selbst: Im Klassenbuch ' +
          'bleiben nur die Felder, die etwas sagen.',
      ],
    },
    piani: {
      titolo: Molti(DE.pianoLezione),
      sommario:
        'Die Stunden des Kurses und ihre Abläufe: was vorbereitet ist, und was nicht.',
      scritte: {
        materia: 'Mathematik',
        ore: '18/24 Std.',
        cerca: 'nach Datum, Ziel, Etappe suchen',
        semestre: '1. Semester',
        preparate: '18/24 vorbereitet',
        lezione1: '1. Stunde',
        data1: 'Do 12.09.',
        lezione2: '2. Stunde',
        data2: 'Do 19.09. · 20 min offen',
        lezione3: '3. Stunde',
        senzaPiano: 'ohne Plan — bereite sie vor',
        nonAssegnati: 'Noch nicht zugewiesen (1)',
        bozza: 'Entwurf vom 02.09.',
        ripasso: `${DE.tipiAttivita.ripasso} · 3 Aktivitäten`,
        titoloEditor: 'Mathematik · 1. Stunde',
        diCheCosaParla: 'Worum es geht',
        campi: 'Lernziele · Voraussetzungen · Schlagwörter · Notizen',
        scaletta: 'Ablauf',
        gruppo1: 'Gruppe 1 · 2 Lekt. am Stück · 08:20–09:50',
        liberi: '10 min frei',
        correzione: 'Hausaufgaben korrigieren',
        esercizio: DE.tipiAttivita.esercizio,
        frazioni: 'Gleichwertige Brüche',
        spiegazione: DE.tipiAttivita.spiegazione,
        coppie: 'Übungen zu zweit',
        intervallo: 'Pause · 15 min · 09:50–10:05',
        gruppo2: 'Gruppe 2 · 1 Lekt. · 10:05–10:50',
        pieno: 'voll',
        verificaBreve: 'Kurze Prüfung',
        verifica: DE.tipiAttivita.verifica,
        piano: 'Plan',
        scalettaProva: 'Ablauf, Prüfung',
        ora: 'Stunde',
        assegnaUnPiano: 'Plan zuweisen',
        inAula: 'Im Zimmer',
        momento: 'Beurteilung',
        creaLaProva: 'Prüfung erstellen',
        copia: 'Kopie',
      },
      figure: [
        {
          didascalia:
            'Links die Stunden des oben gewählten Kurses, rechts der Plan der gewählten Stunde, ' +
            'auf ihre Lektionen gelegt. Was man schreibt, speichert sich selbst.',
          legenda: [
            'Die Stunden nach Semester: «vorbereitet» sind die, die der Ablauf ganz füllt.',
            'Eine Stunde, die der Ablauf nicht abdeckt, sagt, wie viele Minuten offen bleiben.',
            'Eine Stunde ohne Plan: Ein Klick erstellt den Ablauf und öffnet ihn.',
            'Lernziele, Voraussetzungen, Schlagwörter und Notizen: was den Plan wiederfinden ' +
              'lässt.',
            'Eine Gruppe von Lektionen am Stück, zwischen zwei Pausen, mit den freien Minuten.',
            'Der Faden unter jeder Etappe: wie viel ihrer Gruppe sie belegt.',
            'Die Pause hat ihre eigene Zeile, mit den Minuten, die sie dauert.',
          ],
        },
        {
          didascalia:
            'Ein Plan liegt auf einer Stunde, und im Zimmer wird er zu Häkchen und Noten. Die ' +
            'Leistungsbeurteilung entsteht erst dort, aus der Etappe, die sagt, dass sie eine ' +
            'Prüfung ist.',
          legenda: [
            'Die Etappe sagt, dass sie eine Prüfung ist: Titel, Art, Gewicht.',
            'Der Plan wird einer Stunde auf ihrer Seite zugewiesen, oder er entsteht ' +
              'aus ihr.',
            'Im Zimmer wird jede Etappe abgehakt: offen, erledigt, teilweise, übersprungen.',
            '**Prüfung erstellen** lässt die Beurteilung entstehen, mit dem Datum der Stunde.',
            '**Duplizieren** kopiert Ablauf und Dateien: So dient ein Plan einer anderen Stunde.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die Stunden, nach Semester',
          testo:
            'Die Seite ist die Liste der Stunden des oben gewählten Kurses, nach Semester ' +
            'gesammelt — oder nur das aus der Auswahlliste **Zeitraum**. Der Kopf sagt, wie ' +
            'viele Stunden noch auf einen Ablauf warten. Das Suchfeld findet nach Datum, Ziel ' +
            'oder Etappe.',
        },
        {
          termine: 'Eine Stunde vorbereiten',
          testo:
            'Eine Stunde ohne Plan sagt **ohne Plan — bereite sie vor**: Ein Klick erstellt ' +
            'den leeren Ablauf und öffnet ihn. Einen losen «neuen Plan» gibt es nicht: Ein Plan ' +
            'entsteht aus einer Stunde, hier oder auf der Seite der Stunde.',
        },
        {
          termine: 'Wie ein Plan heisst',
          testo:
            'Nach der Stunde, an der er hängt: **«3. Stunde»**, und ausgeschrieben mit ' +
            'dem Kurs davor. Die Nummer beginnt in jedem Semester neu und überspringt die ' +
            'ausgefallenen; «+1», wenn ihn zwei Stunden verwenden. Ein nicht zugewiesener Plan ' +
            'ist ein **Entwurf**, «Entwurf vom 02.09.».',
        },
        {
          termine: 'Worum es geht',
          testo:
            'Ein Plan hat keinen Titel: Er hat **Lernziele** (eines pro Zeile), ' +
            '**Voraussetzungen**, **Schlagwörter**, durch Komma getrennt, und **Notizen** für ' +
            'sich. Das findet die Suche, und das erste Lernziel dient als Thema in der kleinen ' +
            'Zeile.',
        },
        {
          termine: 'Die Etappen',
          testo:
            'Jede Etappe hat Titel, Art und Dauer **in Minuten**. Die Art wählt man durch Klick ' +
            'auf ihr Etikett. Man ordnet sie durch Ziehen am Griff um, oder mit ↑ ↓, wenn der ' +
            'Griff den Fokus hat. **Aktivität hinzufügen** setzt eine ans Ende, schon geöffnet.',
        },
        {
          termine: 'Die Details einer Etappe',
          testo:
            'Der Pfeil rechts öffnet sie: **Durchführung** (wie sie abläuft, wie die Klasse ' +
            'arbeitet, Material im Zimmer), die **Details** der Art — Grösse der Gruppen, Dauer ' +
            'und Punktzahl einer Prüfung, Arbeitsplatz eines Labors —, die **Beurteilung**, das ' +
            'Material.',
        },
        {
          termine: 'Passt es in die Stunde?',
          testo:
            'Mit einer Stunde darunter fallen die Etappen in die Gruppen von Lektionen zwischen ' +
            'zwei Pausen: «10 min frei», «voll», «15 min zu viel». Was nicht hineinpasst, ' +
            'landet unter **Über das Ende der Stunde hinaus**. In der Liste «20 min ' +
            'nicht abgedeckt» oder «10 min über die Stunde hinaus».',
        },
        {
          termine: 'Eine Etappe, die eine Prüfung ist',
          testo:
            'In den Details **Diese Etappe ist eine Prüfung**: Titel (leer heisst der der ' +
            'Etappe), Art der Prüfung, Gewicht von 0 bis 10 — null zählt nicht für den ' +
            'Durchschnitt. Die eigentliche Beurteilung entsteht im Zimmer, aus der Spalte ' +
            'Prüfung des Ablaufs.',
        },
        {
          termine: 'Ressourcen',
          testo:
            '**Link**, **Datei**, **Bild**: für den ganzen Plan oder für eine Etappe. Dateien ' +
            'und Bilder werden ins Dokument des Schuljahrs kopiert, mit dem Namen der Etappe. ' +
            'Der Stift ändert Titel und Notizen, oder hängt sie mit **Gehört zu** an eine ' +
            'andere Etappe.',
        },
        {
          termine: 'Wiederverwenden',
          testo:
            '**Duplizieren** macht eine Kopie, samt Dateien, zum Anpassen. Unten in der Liste ' +
            'sammelt «Noch nicht zugewiesen» die Entwürfe, und **Ohne Kurs** die verwaisten ' +
            'Pläne, die wieder anzuhängen sind.',
        },
        {
          termine: 'Wo er landet',
          testo:
            'Unter dem Editor: die Stunden, die den Plan verwenden — mit «Prüfung ' +
            'ausstehend», wo die vorgesehene Prüfung noch nicht entstanden ist — und die ' +
            'Beurteilungen, die daraus hervorgegangen sind.',
        },
        {
          termine: 'Die Aktionsleiste',
          testo:
            '**Zum Klassenbuch** öffnet die erste Stunde, die den Plan verwendet; ' +
            '**Duplizieren** und **Löschen** wirken auf den offenen Plan. **Stunde in diesem ' +
            'Kurs** öffnet das Formular einer neuen Stunde des Kurses und führt nach ' +
            'dem Speichern hinein.',
        },
      ],
      note: [
        'Dauern schreibt man in Minuten, gespeichert werden sie in Lektionen: Derselbe Plan, ' +
          'wiederverwendet in einem Jahr mit Lektionen zu fünfzig Minuten, füllt die Stunde ' +
          'trotzdem. Die Dauer der Lektion sagt das Dokument, unter Einstellungen › Schuljahr ' +
          'und Stundenplan › **Kalender**.',
        'Ein Ablauf, den mehrere Stunden verwenden, ändert sich in allen: Um nur einen zu ' +
          'ändern, dupliziert man. Einer Stunde einen anderen Plan zuzuweisen, setzt ihre ' +
          'Häkchen zurück; eine Etappe zu entfernen, entfernt ihres. **Löschen** wirft auch ' +
          'die Dateien des Plans weg.',
      ],
    },
  },
  fr: {
    lezione: {
      titolo: 'Leçon',
      sommario:
        'L’écran qu’on garde ouvert pendant la leçon, et où en est la leçon.',
      scritte: {
        calendario: 'Calendrier',
        pendenze: 'En suspens',
        daSmistare: 'À trier',
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        pianificata: 'Prévue',
        svolta: 'Donnée',
        annullata: 'Annulée',
        modificaOra: 'Modifier la leçon',
        testata: 'jeudi 14.11 · 08:20–10:00 · salle 12',
        statoPianificata: 'prévue',
        presenti: 'présents 18/20',
        ritardi: 'retards 1 · 1h 30',
        navigatore: '✓ 12. jeu 14.11 · 08:20 · Fractions',
        posizione: '12 sur 38',
        amministrazione: 'Administration',
        schedaLezione: 'Leçon',
        annotazioni: 'Annotations',
        appello: 'Appel',
        consegne: 'Devoirs',
        proveDaRiconsegnare: 'Épreuves à rendre',
        oraDaFare: 'la leçon à venir',
        daCompilare: 'À remplir',
        passataNonChiusa: 'passée, pas close',
        chiusa: 'close',
        oraPassa: 'l’heure passe',
        svoltaPrima: 'Donnée même avant la fin',
        restaNonConta: 'reste, ne compte pas',
        conConferma: 'avec confirmation',
        nellaBarra: '« à remplir » dans la barre du bas',
        verbale: 'Procès-verbal',
        inDocumenti: 'dans Documents',
      },
      figure: [
        {
          didascalia:
            'La page d’une leçon. Le cours ne se choisit pas ici : c’est celui de la liste ' +
            '**Cours** en haut, le même pour les cinq pages du Registre.',
          legenda: [
            'La barre d’actions : les trois états de la leçon et **Modifier la leçon**.',
            'L’en-tête : classe, jour, horaire, salle, et les comptes de l’appel.',
            'Le navigateur : leçon précédente, leçon suivante, et la liste de toutes les leçons ' +
              'du cours.',
            'Les trois onglets, un par moment de la leçon.',
            'Les deux colonnes de l’onglet choisi : dans Administration, l’appel à gauche ; ' +
              'devoirs, check et épreuves à rendre à droite.',
          ],
        },
        {
          didascalia:
            'Le cycle d’une leçon. Les trous, c’est l’horloge qui les décide, pas l’état : une ' +
            'leçon passée sans appel reste à remplir même si elle est marquée donnée.',
          legenda: [
            '**Prévue** : la leçon prévue. Son bouton l’y ramène depuis donnée ou annulée, ' +
              'sans rien perdre.',
            'Passée sans appel, ou sans **Donnée** : la barre du bas propose d’abord le trou le ' +
              'plus ancien.',
            `**Donnée** ferme la leçon : elle sort des ${FR.pendenza.plurale}, et dès lors le ` +
              'procès-verbal peut se faire.',
            '**Annulée** : reste dans le registre, mais sans numéro, hors des comptes et des ' +
              'trous.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Ouvrir une leçon',
          testo:
            'Un clic sur la leçon dans le calendrier — avec **Modifier** activé, le clic la ' +
            'sélectionne, et **Entrée** l’ouvre —, ou sur la leçon proposée dans la barre du ' +
            'bas. Dans la barre d’actions, **Leçon à remplir** — **Prochaine leçon** s’il ne ' +
            'manque rien — mène à la leçon qui attend. Sans leçon ouverte, la page propose ' +
            '**Ouvrir la dernière leçon**.',
        },
        {
          termine: 'Les leçons du cours',
          testo:
            'Les flèches passent à la leçon précédente et à la suivante du même cours, la liste ' +
            'saute à n’importe laquelle : « ✓ 12. jeu 14.11 · 08:20 ». **✓** veut dire donnée, ' +
            '**×** annulée, et les annulées n’ont pas de numéro. À côté, « 12 sur 38 ».',
        },
        {
          termine: 'L’en-tête',
          testo:
            'Classe, jour, horaire et salle ; puis l’état et les comptes de l’appel : présents, ' +
            'absents, **à faire** (les cases encore vides), retards, durée — et « avec pauses » ' +
            'quand la leçon en a.',
        },
        {
          termine: 'État de la leçon',
          testo:
            '**Prévue**, **Donnée** et **Annulée** sont dans la barre d’actions : celui qui est ' +
            'allumé est en vigueur, et on appuie sur celui où l’on veut amener la leçon. ' +
            '**Donnée** reste mis en avant tant qu’on ne l’a pas pressé ; **Annulée** demande ' +
            'une confirmation.',
        },
        {
          termine: 'Modifier la leçon',
          testo:
            'Dans la barre d’actions, avec **Modifier** activé (en haut, à côté de ' +
            '**Projeter**, ou Ctrl+E) : cours, date, salle, état, horaire et déroulement. En ' +
            'bas, **Dupliquer** — la copie doit ensuite être déplacée à une autre date — et ' +
            '**Supprimer**. Désactivé, on lit la leçon et on fait l’appel, mais le jour et ' +
            'l’horaire ne se touchent pas par erreur.',
        },
        {
          termine: 'Plages et pauses',
          testo:
            '**Plage de cours** ajoute à la fin un tronçon en périodes, aussi long qu’une ' +
            'nouvelle leçon ; **Pause** un tronçon en minutes, aussi long qu’une nouvelle ' +
            'pause. Les deux longueurs et la durée de la période sont dans Paramètres › Année ' +
            'et horaire › **Calendrier**. Les tronçons se suivent : on n’écrit que le début du ' +
            'premier, la fin, c’est le registre qui la calcule. On les réordonne avec la ' +
            'poignée ; la corbeille, c’est **Retirer la plage**.',
        },
        {
          termine: 'Suit les pauses de la journée',
          testo:
            'Il apparaît quand la journée a ses pauses, et il est activé tout seul : les ' +
            'périodes finissent avant la récréation et reprennent après, et le début ' +
            's’accroche à la grille des pauses. Pendant ce temps, **Pause** est désactivé, ' +
            'parce que les pauses, c’est la journée qui les met. Désactivé, la leçon redevient ' +
            'comme à l’ouverture du formulaire et les plages s’écrivent à la main.',
        },
        {
          termine: 'Une leçon du calendrier ICS',
          testo:
            'Ancrée à un événement de l’école, elle a le cours, la date et la plage de ' +
            'l’événement désactivés — la salle aussi, si l’événement l’indique — et pas de ' +
            'Supprimer ; à côté, on ajoute des plages et des pauses. **Synchroniser depuis ' +
            'ICS**, en bas de **Modifier la leçon** ou au clic droit sur la leçon dans le ' +
            'calendrier, ramène l’horaire, la salle et l’état à ce que dit le calendrier.',
        },
        {
          termine: 'Les trois onglets',
          testo:
            '**Administration** pendant que la classe entre : appel, devoirs, check, épreuves ' +
            'à rendre. **Leçon** pendant le cours : le déroulement et les évaluations. ' +
            '**Annotations** une fois la classe sortie : la mise en œuvre et les observations. ' +
            'Les flèches ← → passent de l’un à l’autre.',
        },
        {
          termine: 'Devoirs',
          testo:
            'Dans l’onglet Administration, à côté de l’appel : ce qui a été donné et n’est pas ' +
            'encore revenu, et **Nouveau devoir**. Comment on les donne et on les coche est ' +
            'dans la section Devoirs.',
        },
        {
          termine: 'Épreuves à rendre',
          testo:
            'Les épreuves du cours encore entre les mains de qui enseigne, chacune avec ce qui ' +
            'lui manque : **À compléter** (la grille avec seulement les cases vides), **À ' +
            'rendre à** (avec la colonne « Rendue le »), **Rattrapages à rendre**. **Rendue à ' +
            'tous** et les coches écrivent la date de cette leçon, pas celle d’aujourd’hui.',
        },
        {
          termine: 'Le déroulement en classe',
          testo:
            'Dans l’onglet Leçon, le plan étape par étape : type, durée, moment où elle tombe, ' +
            'et quatre signes — **·** à faire, **✓** faite, **~** en partie, **×** sautée. En ' +
            'haut, « % fait », « dans les temps » ou les minutes de trop ; la pause a sa ligne. ' +
            'Les ressources s’ouvrent d’un clic.',
        },
        {
          termine: 'Attribuer ou changer le plan',
          testo:
            'Sans plan, il y a **Attribuer un plan** : les plans du cours, chacun avec les ' +
            'minutes en plus ou en moins par rapport à la leçon, et **Nouveau plan pour cette ' +
            'leçon**. Avec un plan, **Changer** et le crayon **Modifier le déroulement**, qui le ' +
            'montre sur les périodes de cette leçon.',
        },
        {
          termine: 'Les épreuves de la leçon',
          testo:
            'Une étape qui est une épreuve a dans la colonne Épreuve **Créer l’épreuve** : ' +
            'l’évaluation naît, avec la date de cette leçon, et la page Évaluations s’ouvre ' +
            'dessus. Ensuite, le bouton devient **Notes**, qui y ramène. Les notes se mettent ' +
            'aussi ici, dans l’onglet Évaluations à côté, avec le graphique des notes dessous.',
        },
        {
          termine: 'Rattrapages du jour',
          testo:
            'En bas des évaluations : qui refait pendant cette leçon une épreuve d’une autre ' +
            'fois. N’apparaît que si quelqu’un l’a fixée au jour de cette leçon, avec la grille ' +
            'réduite aux seuls noms de ceux qui la refont.',
        },
        {
          termine: 'Procès-verbal',
          testo:
            'Le PDF de la leçon — présences, déroulement, sujets, devoirs, observations — se ' +
            'fait depuis la page **Documents**, onglet Leçons. Seulement pour une leçon ' +
            '**Donnée** : avant, il sortirait sans appel et sans bilan.',
        },
      ],
      note: [
        'Marquer **Donnée** refait le procès-verbal de cette leçon et les PDF du cours — ' +
          'présences, notes, fiches —, à moins que la régénération automatique ne soit ' +
          'désactivée. Il n’attend pas : l’avis arrive quand les fichiers sont prêts.',
        '**Donnée** ne fait l’appel à la place de personne : sur une leçon sans appel, il met ' +
          'les lignes, toutes à **-**. La leçon reste « sans appel » tant qu’on n’a pas ' +
          'marqué au moins une case.',
      ],
    },
    appello: {
      titolo: 'Appel',
      sommario:
        `Qui était là, ${FR.unitaDidattica.singolare} par ${FR.unitaDidattica.singolare}, et ` +
        'ce qui en sort dans les comptes.',
      scritte: {
        ud: corto(FR.unitaDidattica),
        min: 'min',
        nota: 'note',
        trenoInRitardo: 'train en retard',
        daCapo: 'et on recommence',
        unClic: 'un clic : l’état suivant',
        premuto: 'appui long, ou clic droit :',
        ilMenu: 'le menu avec tous les états',
      },
      figure: [
        {
          didascalia:
            'Qui arrive à la troisième période a **X** aux deux premières et **R** à la ' +
            'troisième. Une ligne tout en **-**, c’est un appel encore à faire ; **·** sur un ' +
            'bouton veut dire que les cases dessous sont différentes.',
          legenda: [
            'Le bouton de ligne : le même état sur toute la leçon d’une personne.',
            'Le bouton de colonne : le même état pour toute la classe, dans cette période.',
            `Une case par ${FR.unitaDidattica.singolare}, avec l’heure de début en tête.`,
            'La pause n’est pas une colonne : elle écarte les périodes qu’elle sépare.',
            'Les minutes de retard : la case n’existe que dans les lignes avec un **R**.',
            'Une note par personne, pour cette leçon.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Une case par période',
          testo:
            `Les ${FR.pif.plurale} en lignes, les ${FR.unitaDidattica.plurale} en colonnes : ` +
            'une leçon de quatre périodes, ce sont quatre cases par personne. Ainsi, qui arrive ' +
            'à la troisième période est présent à partir de là, et les deux manquées restent ' +
            'écrites.',
        },
        {
          termine: 'Le tour du clic',
          testo:
            'Chaque case naît **-**, non saisie. Un clic la fait avancer : **P** présent, **X** ' +
            'absent, **R** en retard, **E** dispensé, et de nouveau **-**. En appui long, ou au ' +
            'clic droit, elle ouvre le menu avec tous les états.',
        },
        {
          termine: 'Une ligne, une colonne',
          testo:
            'Le bouton en tête d’une ligne vaut pour toute la leçon de cette personne ; celui ' +
            'en tête d’une colonne, pour toute la classe dans cette période. S’il y a un peu de ' +
            'tout dessous, il montre **·**, et le premier clic met tout le monde à **P**.',
        },
        {
          termine: 'Tous présents, Réinitialiser',
          testo:
            '**Tous présents** met **P** dans chaque case de la leçon. **Réinitialiser** les ' +
            'remet toutes à **-**, et demande une confirmation : cela ne se défait pas.',
        },
        {
          termine: 'Retards et notes',
          testo:
            'Dans les lignes avec un **R** apparaît le champ des minutes ; une fois le dernier ' +
            '**R** retiré, les minutes s’en vont avec lui. Chaque ligne a aussi une courte ' +
            'note, pour cette leçon.',
        },
        {
          termine: 'Ce qui manque',
          testo:
            'Le sous-titre de l’onglet commence par ce qui reste : « 6 cases à faire · 18 ' +
            'présents sur 20 · 4 pér. ». Les cases **-** ne comptent pas comme présences.',
        },
        {
          termine: 'Ce qu’une leçon retire',
          testo:
            'Dans les comptes — pourcentages, seuil d’absence, rapports —, seul **X** retire ' +
            'une leçon. Le retard compte comme présence : les périodes manquées sont déjà les ' +
            '**X** d’avant. La dispense ne fait pas baisser la fréquentation. Les retards se ' +
            'comptent à part, avec les minutes.',
        },
        {
          termine: 'Qui arrive, qui part',
          testo:
            'L’appel montre qui suit les cours maintenant, dans chaque leçon : une personne en ' +
            'formation inscrite en cours d’année apparaît aussi dans les anciennes leçons, avec ' +
            'des cases **-**. Qui se retire disparaît aussi des leçons passées, mais ses lignes ' +
            'restent dans le registre, et avec elles ses absences.',
        },
      ],
      note: [
        'Ce qui dit quelles leçons comptent, c’est l’appel, pas l’état : une leçon avec ' +
          'l’appel fait entre dans les pourcentages même si personne ne l’a marquée donnée. ' +
          'Restent dehors les annulées et les cases encore à **-**.',
        'En classe : **Tous présents**, puis un clic sur qui manque. Qui arrive plus tard se ' +
          'corrige depuis sa ligne, case par case.',
      ],
    },
    consegne: {
      titolo: 'Devoirs',
      sommario:
        'Ce qu’on donne à faire et qui doit revenir : à qui, comment, pour quand.',
      scritte: {
        aChiTocca: 'Pour qui',
        conUnFoglio: 'Avec feuille ?',
        chiLoPorta: 'Qui l’apporte',
        entroQuando: 'Pour quand',
        tuttaLaClasse: 'Toute la classe',
        soloAlcune: 'Seulement certaines',
        aMe: 'Pour moi',
        noSpunta: 'non : la coche suffit',
        siAllega: 'oui : chacun le joint',
        meLoConsegnano: 'on me le remet',
        loConsegnoIo: 'je le remets :',
        aMano: 'en main propre ou e-mail',
        unaLezione: 'une leçon du cours',
        unGiorno: 'un jour précis',
        nessunTermine: 'pas d’échéance',
        foglioFirme: 'liste de signatures',
      },
      figure: [
        {
          didascalia:
            'Les quatre questions du formulaire **Nouveau devoir**, après « Quoi » et le type. ' +
            'Les champs de la deuxième et de la troisième n’apparaissent que si nécessaire.',
          legenda: [
            `**Toute la classe**, **Seulement certaines ${FR.pif.plurale}** (choisies par ` +
              'nom) ou **Pour moi**.',
            '**Se coche en remettant un document** : la coche de chacun, c’est son fichier.',
            'Dans quel sens va la feuille ; si c’est moi qui la remets, **En main propre, en ' +
              'classe** ou **Par e-mail, un par un**. En plus, si besoin, la feuille des ' +
              'signatures.',
            '**Une leçon du cours**, **Un jour précis** ou **Pas d’échéance**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Nouveau devoir',
          testo:
            'Depuis l’onglet Administration d’une leçon, il prend le cours et la date de la ' +
            `leçon ; depuis la page **${Molti(FR.pendenza)}**, on choisit aussi le cours. Il ` +
            'demande quoi, le type — devoir, étude, matériel à apporter, à rendre… — et des ' +
            'remarques.',
        },
        {
          termine: 'Pour qui',
          testo:
            `**Toute la classe**, **Seulement certaines ${FR.pif.plurale}** ou **Pour moi** — ` +
            'une chose que je dois faire moi-même. Dans tous les cas, la coche est nominative : ' +
            'on voit qui a fait et qui manque.',
        },
        {
          termine: 'Avec un document',
          testo:
            'Une fois coché **Se coche en remettant un document**, on dit quel document c’est ' +
            `et qui l’apporte : **Les ${FR.pif.plurale} me le remettent** ou **Je le remets aux ` +
            `${FR.pif.plurale}**. Cocher un nom, alors, veut dire choisir son fichier.`,
        },
        {
          termine: 'Remettre par e-mail',
          testo:
            'Quand c’est moi qui remets la feuille, **Par e-mail, un par un** envoie un message ' +
            'à chacun avec le document en pièce jointe, et l’envoi fait foi. **Il faut la ' +
            'feuille des signatures de remise** demande une seule feuille pour tous, à joindre.',
        },
        {
          termine: 'Pour quand',
          testo:
            '**Une leçon du cours** propose les prochaines leçons de la classe, même d’autres ' +
            'branches : si cette leçon se déplace, l’échéance se déplace. Sinon **Un jour ' +
            'précis**, ou **Pas d’échéance**.',
        },
        {
          termine: 'Dans la leçon',
          testo:
            'Quatre groupes : en retard, échéance aujourd’hui, donnés dans cette leçon, ' +
            'encore ouverts. Un devoir revient dans chaque leçon du cours tant qu’il n’est pas ' +
            'coché pour tout le monde.',
        },
        {
          termine: 'Cocher',
          testo:
            'Le compte « 12/20 · manquent… » ouvre le ramassage : les noms en entier, **Marquer ' +
            'tout le monde**, **Retirer tout le monde**, et en bas **Cocher tout le monde**, ' +
            'qui marque et ferme. La coche sur la ligne fait la même chose sans rien ouvrir.',
        },
        {
          termine: 'Modifier, retirer',
          testo:
            'Le crayon rouvre le formulaire ; **Supprimer** emporte aussi les coches déjà ' +
            'mises.',
        },
      ],
      note: [
        'Sur un devoir fait par tout le monde, la coche sur la ligne retire les coches et le ' +
          'remet parmi ceux à réclamer, après une confirmation. Les documents recueillis ' +
          'restent.',
        `Un devoir sans ${FR.pif.plurale} concernées — en septembre, avant les inscriptions — ` +
          'reste ouvert : le compter comme fait le ferait disparaître à peine écrit.',
      ],
    },
    check: {
      titolo: 'Check',
      sommario:
        'Les choses à faire une fois, cochées personne par personne, avec le jour.',
      voci: [
        {
          termine: 'Les colonnes',
          testo:
            'Chaque colonne est une chose à faire une fois : le règlement signé, le cahier, le ' +
            'rapport. **Ajouter une colonne** dans la barre d’actions de la page **Check** ; ' +
            '**Colonnes** les montre toutes ensemble, pour les renommer, les ordonner en les ' +
            'glissant et les retirer.',
        },
        {
          termine: 'Cocher',
          testo:
            'Un clic sur une case vide la coche. Un autre clic ne la décoche que si elle a été ' +
            'cochée le jour dont il est question — aujourd’hui sur la page, le jour de la leçon ' +
            'dans une leçon : c’est le mauvais clic d’il y a un instant. Une case cochée un ' +
            'autre jour ne change pas au clic : elle se change au clic droit. Sur la page, la ' +
            'case cochée indique le jour, en bref : `07.09` ; en s’arrêtant dessus, on le lit ' +
            'en entier.',
        },
        {
          termine: 'Quel jour',
          testo:
            'Depuis la page, si le cours a leçon aujourd’hui, la coche va dans cette leçon ; ' +
            'sinon, elle porte la date du jour. Dans une leçon — l’onglet **Administration**, ' +
            'sous les devoirs —, elle va toujours dans la leçon ouverte.',
        },
        {
          termine: 'Un autre jour',
          testo:
            'Le clic droit sur la case, ou la touche Menu du clavier : sur une case vide ' +
            '**Cocher aujourd’hui** et **Choisir la date…** ; sur une case cochée **Changer la ' +
            'date…** et **Retirer la coche**. Le jour choisi à la main reste celui-là, quoi ' +
            'qu’il arrive aux leçons.',
        },
        {
          termine: 'Le menu de la colonne',
          testo:
            'Clic ou clic droit sur le nom de la colonne : **Cocher pour tous aujourd’hui** ' +
            '(dans une leçon, **Cocher pour tous dans cette leçon**), **Renommer…**, **Déplacer ' +
            'à gauche**, **Déplacer à droite**, **Retirer la colonne…**, **Ajouter une ' +
            'colonne…**. Sous le nom, combien l’ont faite sur combien.',
        },
        {
          termine: 'En dehors de sa page',
          testo:
            'Le check se coche aussi ailleurs. Dans la fiche du cours, les chiffres disent, ' +
            'colonne par colonne, combien l’ont faite sur combien suivent le cours — ' +
            '« Règlement : 18/22 », en vert quand c’est complet. La matrice a une colonne ' +
            '**Check** avec les colonnes faites par chacun : en s’arrêtant dessus, on lit ' +
            'celles qui manquent. Dessous, il y a la grille entière, et le bouton avec la coche ' +
            'en haut ouvre la page **Check** du cours.',
        },
        {
          termine: 'Dans la leçon',
          testo:
            'La même grille, dans l’onglet **Administration**. Les cases cochées pendant cette ' +
            'leçon ont la coche, et le clic la retire ; celles d’un autre jour disent lequel, ' +
            'avec la bordure en pointillé, et ne se changent qu’au clic droit — où **Attribuer ' +
            'à la leçon en cours** les ramène à cette leçon, et dès lors elles suivent la ' +
            'leçon. Un cours sans colonnes ne montre qu’une ligne vers la page.',
        },
      ],
      note: [
        'Une coche mise dans une leçon suit la leçon : si la leçon se déplace, la date se ' +
          'déplace avec elle. Le clic ne change jamais le jour d’une coche : pour cela, il y a ' +
          '**Changer la date…**, dans le menu du clic droit.',
        'Retirer une colonne emporte ses coches : on le dit avant, avec le nombre.',
        'Qui ne suit plus le cours ne reste dans la grille que s’il a déjà quelque chose de ' +
          'coché : ce qu’il a fait pendant qu’il était là ne disparaît pas.',
      ],
    },
    annotazioni: {
      titolo: 'Mise en œuvre et observations',
      sommario:
        'Ce qu’on a fait pendant la leçon, et ce qu’il y a à noter sur quelqu’un.',
      scritte: {
        svolgimento: 'Mise en œuvre',
        argomentiSvolti: 'Sujets traités',
        materiali: 'Matériel',
        consuntivo: 'Bilan',
        siSalva: 's’enregistre quand on quitte le champ',
        osservazioni: Molti(FR.osservazione),
        partecipazione: 'Particip.',
        impegno: 'Effort',
        autonomia: 'Autonom.',
        successo: 'Rossi A. · Effort — ce qui s’est passé',
        disciplina: 'discipline',
        merito: 'mérite',
        tuttaLaClasse: 'toute la classe',
      },
      figure: [
        {
          didascalia:
            'L’onglet **Annotations**, une fois la classe sortie. Tout ce qui est ici finit ' +
            'dans le procès-verbal de la leçon.',
          legenda: [
            'La mise en œuvre : trois champs de texte, qui s’enregistrent tout seuls.',
            'La matrice du comportement : les personnes en lignes, les aspects observés en ' +
              'colonnes.',
            'Les annotations des cases marquées, une ligne par case.',
            'Les observations écrites en entier, avec leur type.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Sujets, matériel, bilan',
          testo:
            '**Sujets traités** — ce qu’on a vraiment fait —, **Matériel** et **Bilan** — ' +
            'comment ça s’est passé, ce qu’il faut reprendre. Ils s’enregistrent quand on ' +
            'quitte le champ.',
        },
        {
          termine: 'La matrice du comportement',
          testo:
            'Un clic fait tourner la case : vide, **Très bien**, **À améliorer**, vide. Les ' +
            'colonnes sont les « Aspects observés en classe » de **Paramètres** › Listes : ' +
            'par défaut participation, collaboration, respect des règles, effort, autonomie.',
        },
        {
          termine: 'Annoter une case',
          testo:
            'Le clic droit sur la case ouvre les signes, **Rien à signaler** et **Annoter** : ' +
            'sous la matrice apparaît sa ligne, « ce qui s’est passé ». Chaque case marquée a ' +
            'déjà la sienne.',
        },
        {
          termine: 'Observations en entier',
          testo:
            '**Ajouter** : elle concerne une personne en formation ou toute la classe, a un ' +
            'type — note, mérite, discipline, devoirs, matériel, entretien —, un texte et, si ' +
            'besoin, l’heure. Le crayon la modifie ou la supprime.',
        },
        {
          termine: 'Où elles aboutissent',
          testo:
            'Dans le procès-verbal de la leçon, observations et matrice comprises. Les cases ' +
            'marquées se comptent dans la colonne **Marqué** de Cours, et tout se relit dans ' +
            'la fiche de la personne en formation.',
        },
      ],
      note: [
        'Une case sans signe et sans annotation se retire toute seule : dans le registre ne ' +
          'restent que les cases qui disent quelque chose.',
      ],
    },
    piani: {
      titolo: 'Plans de leçon',
      sommario:
        'Les leçons du cours et leurs déroulements : ce qui est préparé, et ce qui ne l’est pas.',
      scritte: {
        materia: 'Mathématiques',
        ore: '18/24 leçons',
        cerca: 'date, objectif, étape',
        semestre: '1er semestre',
        preparate: '18/24 préparées',
        lezione1: '1re leçon',
        data1: 'jeu 12.09',
        lezione2: '2e leçon',
        data2: 'jeu 19.09 · 20 min non couverts',
        lezione3: '3e leçon',
        senzaPiano: 'sans plan — prépare-la',
        nonAssegnati: 'Pas encore attribués (1)',
        bozza: 'brouillon du 02.09',
        ripasso: `${FR.tipiAttivita.ripasso} · 3 activités`,
        titoloEditor: 'Mathématiques · 1re leçon',
        diCheCosaParla: 'De quoi il parle',
        campi: 'objectifs · prérequis · mots-clés · notes',
        scaletta: 'Déroulement',
        gruppo1: 'Groupe 1 · 2 pér. d’affilée · 08:20–09:50',
        liberi: '10 min libres',
        correzione: 'Correction des devoirs',
        esercizio: FR.tipiAttivita.esercizio,
        frazioni: 'Fractions équivalentes',
        spiegazione: FR.tipiAttivita.spiegazione,
        coppie: 'Exercices à deux',
        intervallo: 'Pause · 15 min · 09:50–10:05',
        gruppo2: 'Groupe 2 · 1 pér. · 10:05–10:50',
        pieno: 'plein',
        verificaBreve: 'Contrôle court',
        verifica: FR.tipiAttivita.verifica,
        piano: 'Plan',
        scalettaProva: 'déroulement, épreuve',
        ora: 'Leçon',
        assegnaUnPiano: 'Attribuer un plan',
        inAula: 'En classe',
        momento: 'Évaluation',
        creaLaProva: 'Créer l’épreuve',
        copia: 'Copie',
      },
      figure: [
        {
          didascalia:
            'À gauche, les leçons du cours choisi en haut ; à droite, le plan de la leçon ' +
            'choisie, posé sur ses périodes. Ce qu’on écrit s’enregistre tout seul.',
          legenda: [
            'Les leçons par semestre : « préparées », ce sont celles que le déroulement remplit ' +
              'entièrement.',
            'Une leçon que le déroulement ne couvre pas dit combien de minutes restent à ' +
              'couvrir.',
            'Une leçon sans plan : un clic crée le déroulement et l’ouvre.',
            'Objectifs, prérequis, mots-clés et notes : ce qui permet de retrouver le plan.',
            'Un groupe de périodes d’affilée, entre deux pauses, avec les minutes libres.',
            'Le fil sous chaque étape : combien de son groupe elle occupe.',
            'La pause a sa ligne, avec les minutes qu’elle dure.',
          ],
        },
        {
          didascalia:
            'Un plan est posé sur une leçon, et en classe il devient coches et notes. ' +
            'L’évaluation ne naît que là, de l’étape qui dit être une épreuve.',
          legenda: [
            'L’étape dit être une épreuve : titre, type, poids.',
            'Le plan s’attribue à une leçon depuis la leçon elle-même, ou naît d’elle.',
            'En classe, chaque étape se coche : à faire, faite, en partie, sautée.',
            '**Créer l’épreuve** fait naître l’évaluation, avec la date de la leçon.',
            '**Dupliquer** copie déroulement et fichiers : ainsi un plan sert à une autre leçon.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Les leçons, par semestre',
          testo:
            'La page est la liste des leçons du cours choisi en haut, regroupées par semestre — ' +
            'ou seulement celui de la liste **Période**. L’en-tête dit combien de leçons ' +
            'attendent encore un déroulement. La case de recherche trouve par date, objectif ' +
            'ou étape.',
        },
        {
          termine: 'Préparer une leçon',
          testo:
            'Une leçon sans plan indique **sans plan — prépare-la** : un clic crée le ' +
            'déroulement vide et l’ouvre. Il n’y a pas de « nouveau plan » isolé : un plan naît ' +
            'd’une leçon, ici ou depuis la leçon elle-même.',
        },
        {
          termine: 'Comment s’appelle un plan',
          testo:
            'D’après la leçon à laquelle il est accroché : **« 3e leçon »**, et en entier avec ' +
            'le cours devant. Le numéro repart à chaque semestre et saute les annulées ; ' +
            '« +1 » si deux leçons l’utilisent. Un plan non attribué est un **brouillon**, ' +
            '« brouillon du 02.09 ».',
        },
        {
          termine: 'De quoi il parle',
          testo:
            'Un plan n’a pas de titre : il a des **Objectifs** (un par ligne), des ' +
            '**Prérequis**, des **Mots-clés** séparés par des virgules et des **Notes** pour ' +
            'soi. C’est ce que trouve la recherche, et le premier objectif sert de sujet dans ' +
            'la petite ligne.',
        },
        {
          termine: 'Les étapes',
          testo:
            'Chaque étape a un titre, un type et une durée **en minutes**. Le type se choisit ' +
            'en appuyant sur sa pastille. On les réordonne en glissant la poignée, ou avec ↑ ↓ ' +
            'quand la poignée a le focus. **Ajouter une activité** en met une à la fin, déjà ' +
            'ouverte.',
        },
        {
          termine: 'Le détail d’une étape',
          testo:
            'La flèche à droite l’ouvre : **Mise en œuvre** (comment elle se déroule, comment ' +
            'la classe travaille, matériel en classe), les **Détails** du type — taille des ' +
            'groupes, durée et barème d’un contrôle, poste d’un laboratoire —, l’**Évaluation**, ' +
            'le matériel.',
        },
        {
          termine: 'Ça tient dans la leçon ?',
          testo:
            'Avec une leçon dessous, les étapes tombent dans les groupes de périodes entre ' +
            'deux pauses : « 10 min libres », « plein », « 15 min de trop ». Ce qui ne tient ' +
            'pas finit sous **Au-delà de la fin de la leçon**. Dans la liste, « 20 min non ' +
            'couverts » ou « 10 min au-delà de la leçon ».',
        },
        {
          termine: 'Une étape qui est une épreuve',
          testo:
            'Dans le détail, **Cette étape est une épreuve** : titre (vide veut dire celui de ' +
            'l’étape), type d’épreuve, poids de 0 à 10 — zéro ne compte pas dans la moyenne. ' +
            'La vraie évaluation naît en classe, depuis la colonne Épreuve du déroulement.',
        },
        {
          termine: 'Ressources',
          testo:
            '**Lien**, **Fichier**, **Image** : du plan entier ou d’une étape. Fichiers et ' +
            'images se copient dans le document de l’année, avec le nom de l’étape. Le crayon ' +
            'change le titre et les notes, ou la déplace sur une autre étape avec **Rattachée ' +
            'à**.',
        },
        {
          termine: 'Réutilisation',
          testo:
            '**Dupliquer** fait une copie, fichiers compris, à adapter. En bas de la liste, ' +
            '« Pas encore attribués » rassemble les brouillons, et **Sans cours** les plans ' +
            'restés orphelins, à raccrocher.',
        },
        {
          termine: 'Où il aboutit',
          testo:
            'Sous l’éditeur : les leçons qui utilisent le plan — avec « épreuve à faire » là où ' +
            'l’épreuve prévue n’est pas encore née — et les évaluations qui en sont sorties.',
        },
        {
          termine: 'La barre d’actions',
          testo:
            '**Aller au registre** ouvre la première leçon qui utilise le plan ; **Dupliquer** ' +
            'et **Supprimer** agissent sur le plan ouvert. **Leçon dans ce cours** ouvre le ' +
            'formulaire d’une nouvelle leçon du cours, et une fois enregistrée y fait entrer.',
        },
      ],
      note: [
        'Les durées s’écrivent en minutes mais se gardent en périodes : le même plan réutilisé ' +
          'une année où les périodes durent cinquante minutes remplit quand même la leçon. La ' +
          'durée de la période, c’est le document qui la dit, dans Paramètres › Année et ' +
          'horaire › **Calendrier**.',
        'Un déroulement utilisé par plusieurs leçons change dans toutes : pour n’en changer ' +
          'qu’une, on duplique. Attribuer un autre plan à une leçon remet ses coches à zéro ; ' +
          'retirer une étape retire la sienne. **Supprimer** jette aussi les fichiers du plan.',
      ],
    },
  },
  en: {
    lezione: {
      titolo: 'Lesson',
      sommario:
        'The screen you keep open during the lesson, and where the lesson stands.',
      scritte: {
        calendario: 'Calendar',
        pendenze: Molti(EN.pendenza),
        daSmistare: 'To sort',
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        pianificata: 'Planned',
        svolta: 'Held',
        annullata: 'Cancelled',
        modificaOra: 'Edit the lesson',
        testata: 'Thursday 14.11 · 08:20–10:00 · room 12',
        statoPianificata: 'planned',
        presenti: 'present 18/20',
        ritardi: 'late 1 · 1h 30',
        navigatore: '✓ 12. Thu 14.11 · 08:20 · Fractions',
        posizione: '12 of 38',
        amministrazione: 'Admin',
        schedaLezione: 'Lesson',
        annotazioni: 'Notes',
        appello: 'Attendance',
        consegne: 'Assignments',
        proveDaRiconsegnare: 'Tests to hand back',
        oraDaFare: 'the lesson to come',
        daCompilare: 'To fill in',
        passataNonChiusa: 'past, not closed',
        chiusa: 'closed',
        oraPassa: 'time passes',
        svoltaPrima: 'Held even before it ends',
        restaNonConta: 'stays, doesn’t count',
        conConferma: 'with confirmation',
        nellaBarra: '“to fill in” in the bottom bar',
        verbale: 'Lesson record',
        inDocumenti: 'in Documents',
      },
      figure: [
        {
          didascalia:
            'The page of a lesson. The course is not chosen here: it is the one in the ' +
            '**Course** drop-down at the top, the same for all five Register pages.',
          legenda: [
            'The action bar: the lesson’s three states and **Edit the lesson**.',
            'The header: class, day, time, room, and the attendance counts.',
            'The navigator: previous lesson, next lesson, and the drop-down of all the ' +
              'course’s lessons.',
            'The three tabs, one for each moment of the lesson.',
            'The two columns of the chosen tab: in Admin, attendance on the left; ' +
              'assignments, check and tests to hand back on the right.',
          ],
        },
        {
          didascalia:
            'A lesson’s cycle. Gaps are decided by the clock, not the state: a past lesson ' +
            'without attendance stays to be filled in even if it is marked as held.',
          legenda: [
            '**Planned**: the scheduled lesson. Its button brings it back from held or ' +
              'cancelled, without losing anything.',
            'Past without attendance, or without **Held**: the bottom bar suggests the oldest ' +
              'gap first.',
            `**Held** closes the lesson: it leaves the ${EN.pendenza.plurale}, and from then ` +
              'on the lesson record can be made.',
            '**Cancelled**: stays in the register, but with no number, out of the counts and ' +
              'the gaps.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Opening a lesson',
          testo:
            'A click on the lesson in the calendar — with **Edit** on the click selects it, and ' +
            '**Enter** opens it —, or on the lesson suggested in the bottom bar. In the action ' +
            'bar **Lesson to fill in** — **Next lesson** if nothing is missing — takes you to ' +
            'the lesson that is waiting. With no lesson open the page offers **Open the last ' +
            'lesson**.',
        },
        {
          termine: 'The course’s lessons',
          testo:
            'The arrows go to the previous and next lesson of the same course, the drop-down ' +
            'jumps to any of them: “✓ 12. Thu 14.11 · 08:20”. **✓** means held, **×** ' +
            'cancelled, and cancelled lessons have no number. Next to it, “12 of 38”.',
        },
        {
          termine: 'The header',
          testo:
            'Class, day, time and room; then the state and the attendance counts: present, ' +
            'absent, **to do** (the cells still empty), late, length — and “with breaks” when ' +
            'the lesson has any.',
        },
        {
          termine: 'State of the lesson',
          testo:
            '**Planned**, **Held** and **Cancelled** are in the action bar: the one lit up is ' +
            'in force, and you press the one you want to take the lesson to. **Held** stays ' +
            'highlighted until you press it; **Cancelled** asks for confirmation.',
        },
        {
          termine: 'Edit the lesson',
          testo:
            'In the action bar, with **Edit** on (at the top, next to **Project**, or Ctrl+E): ' +
            'course, date, room, state, time and outline. At the bottom **Duplicate** — the ' +
            'copy then needs moving to another date — and **Delete**. With it off, you read ' +
            'the lesson and take attendance, but day and time cannot be changed by mistake.',
        },
        {
          termine: 'Slots and breaks',
          testo:
            '**Teaching slot** adds a stretch in periods at the end, as long as a new lesson; ' +
            '**Break** one in minutes, as long as a new break. Both lengths and the length of ' +
            'a period are in Settings › Year and timetable › **Calendar**. The stretches are ' +
            'joined together: you only write the start of the first, the register works out ' +
            'the end. They are reordered with the handle; the bin is **Remove the slot**.',
        },
        {
          termine: 'Follows the day’s breaks',
          testo:
            'It is there when the day has its breaks, and it is on by itself: the periods end ' +
            'before the break and resume after it, and the start snaps to the grid of breaks. ' +
            'Meanwhile **Break** is off, because the breaks are set by the day. Off, the ' +
            'lesson goes back to how it was when the form opened and the slots are written by ' +
            'hand.',
        },
        {
          termine: 'A lesson from the ICS calendar',
          testo:
            'Tied to a school event, it has course, date and the event’s slot locked — the ' +
            'room too, if the event gives one — and no Delete; alongside, slots and breaks can ' +
            'be added. **Sync from ICS**, at the bottom of **Edit the lesson** or by ' +
            'right-clicking the lesson in the calendar, brings time, room and state back to ' +
            'what the calendar says.',
        },
        {
          termine: 'The three tabs',
          testo:
            '**Admin** while the class comes in: attendance, assignments, check, tests to hand ' +
            'back. **Lesson** during it: the outline and the assessments. **Notes** once the ' +
            'class has left: the delivery and the observations. The ← → arrows move ' +
            'between the three.',
        },
        {
          termine: 'Assignments',
          testo:
            'In the Admin tab, next to attendance: what has been set and has not come back ' +
            'yet, and **New assignment**. How they are set and ticked off is in the ' +
            'Assignments section.',
        },
        {
          termine: 'Tests to hand back',
          testo:
            'The course’s tests still in the teacher’s hands, each with what it is missing: ' +
            '**To complete** (the grid with only the empty cells), **To hand back to** (with ' +
            'the “Handed back on” column), **Resits to hand back**. **Handed back to all** and ' +
            'the ticks write this lesson’s date, not today’s.',
        },
        {
          termine: 'The outline in class',
          testo:
            'In the Lesson tab, the plan step by step: type, length, when it falls, and four ' +
            'marks — **·** to do, **✓** done, **~** partly, **×** skipped. At the top “% ' +
            'done”, “on time” or the minutes too many; the break has its own row. Resources ' +
            'open with a click.',
        },
        {
          termine: 'Assigning or changing the plan',
          testo:
            'Without a plan there is **Assign a plan**: the course’s plans, each with the ' +
            'minutes over or under compared with the lesson, and **New plan for this lesson**. ' +
            'With a plan, **Change** and the pencil **Edit the outline**, which shows it on ' +
            'this lesson’s periods.',
        },
        {
          termine: 'The lesson’s tests',
          testo:
            'A step that is a test has **Create the test** in the Test column: the assessment ' +
            'is created, with this lesson’s date, and the Assessments page opens on it. Then ' +
            'the button becomes **Grades**, which takes you back. Grades can also be entered ' +
            'here, in the Assessments tab alongside, with the grade chart below.',
        },
        {
          termine: 'Today’s resits',
          testo:
            'At the bottom of the assessments: who is retaking a test from another time in ' +
            'this lesson. It only appears if someone scheduled it for this lesson’s day, with ' +
            'the grid reduced to just the names retaking it.',
        },
        {
          termine: 'Lesson record',
          testo:
            'The lesson’s PDF — attendance, outline, topics, assignments, observations — is ' +
            'made from the **Documents** page, Lessons tab. Only for a lesson that is ' +
            '**Held**: before that it would come out without attendance and without a review.',
        },
      ],
      note: [
        'Marking **Held** remakes that lesson’s record and the course PDFs — attendance, ' +
          'grades, sheets — unless automatic remaking is turned off. It does not wait: the ' +
          'notice arrives when the files are ready.',
        '**Held** does not take attendance for anyone: on a lesson without attendance it ' +
          'adds the rows, all **-**. The lesson stays “without attendance” until at least one ' +
          'cell is marked.',
      ],
    },
    appello: {
      titolo: 'Attendance',
      sommario:
        `Who was there, ${EN.unitaDidattica.singolare} by ${EN.unitaDidattica.singolare}, and ` +
        'what comes of it in the counts.',
      scritte: {
        ud: corto(EN.unitaDidattica),
        min: 'min',
        nota: 'note',
        trenoInRitardo: 'train delayed',
        daCapo: 'and round again',
        unClic: 'one click: the next state',
        premuto: 'press and hold, or right-click:',
        ilMenu: 'the menu with every state',
      },
      figure: [
        {
          didascalia:
            'Someone arriving for the third period has **X** in the first two and **R** in the ' +
            'third. A row of all **-** is attendance still to be taken; **·** on a button means ' +
            'the cells below differ.',
          legenda: [
            'The row button: the same state for a person’s whole lesson.',
            'The column button: the same state for the whole class, in that period.',
            `One cell per ${EN.unitaDidattica.singolare}, with the start time at the top.`,
            'The break is not a column: it separates the periods either side of it.',
            'Minutes late: the cell is only there in rows with an **R**.',
            'One note per person, for this lesson.',
          ],
        },
      ],
      voci: [
        {
          termine: 'One cell per period',
          testo:
            `${Molti(EN.pif)} in rows, ${EN.unitaDidattica.plurale} in columns: a lesson of ` +
            'four periods is four cells each. So someone arriving for the third period is ' +
            'present from then on, and the two missed stay on record.',
        },
        {
          termine: 'The click cycle',
          testo:
            'Every cell starts as **-**, not set. A click moves it on: **P** present, **X** ' +
            'absent, **R** late, **E** excused, and back to **-**. Pressed and held, or with the ' +
            'right button, it opens the menu with every state.',
        },
        {
          termine: 'A row, a column',
          testo:
            'The button at the start of a row applies to that person’s whole lesson; the one ' +
            'at the top of a column, to the whole class in that period. If there is a bit of ' +
            'everything below it shows **·**, and the first click sets everyone to **P**.',
        },
        {
          termine: 'All present, Reset',
          testo:
            '**All present** puts **P** in every cell of the lesson. **Reset** sets them all ' +
            'back to **-**, and asks for confirmation: it cannot be undone.',
        },
        {
          termine: 'Late arrivals and notes',
          testo:
            'In rows with an **R** the minutes field appears; once the last **R** is removed, ' +
            'the minutes go with it. Each row also has a short note, for this lesson.',
        },
        {
          termine: 'How much is left',
          testo:
            'The tab’s subtitle starts with what is left: “6 cells to do · 18 present of 20 · 4 ' +
            'per.”. Cells with **-** do not count as present.',
        },
        {
          termine: 'What takes away a lesson',
          testo:
            'In the counts — percentages, absence threshold, reports — only **X** takes away a ' +
            'lesson. Being late counts as present: the periods missed are already the **X** ' +
            'before. Being excused does not lower attendance. Late arrivals are counted ' +
            'separately, with the minutes.',
        },
        {
          termine: 'Who joins, who leaves',
          testo:
            'Attendance shows who is enrolled now, in every lesson: a learner who joined ' +
            'mid-year also appears in the old lessons, with **-** cells. Someone who leaves ' +
            'disappears from past lessons too, but their rows stay in the register, and with ' +
            'them their absences.',
        },
      ],
      note: [
        'What decides which lessons count is attendance, not the state: a lesson with ' +
          'attendance taken goes into the percentages even if nobody marked it as held. ' +
          'Cancelled lessons and cells still at **-** stay out.',
        'In class: **All present**, then a click on whoever is missing. Someone arriving ' +
          'later is corrected from their row, cell by cell.',
      ],
    },
    consegne: {
      titolo: 'Assignments',
      sommario: 'What you set and has to come back: to whom, how, by when.',
      scritte: {
        aChiTocca: 'For whom',
        conUnFoglio: 'With a sheet?',
        chiLoPorta: 'Who brings it',
        entroQuando: 'By when',
        tuttaLaClasse: 'The whole class',
        soloAlcune: 'Only some',
        aMe: 'Me',
        noSpunta: 'no: a tick is enough',
        siAllega: 'yes: each attaches it',
        meLoConsegnano: 'they hand it in',
        loConsegnoIo: 'I hand it out:',
        aMano: 'by hand or by email',
        unaLezione: 'a lesson of the course',
        unGiorno: 'a specific day',
        nessunTermine: 'no deadline',
        foglioFirme: 'signature sheet',
      },
      figure: [
        {
          didascalia:
            'The four questions of the **New assignment** form, after “What” and the type. The ' +
            'fields for the second and third only appear when needed.',
          legenda: [
            `**The whole class**, **Only some ${EN.pif.plurale}** (chosen by name) or **Me**.`,
            '**Ticked off by handing in a document**: each person’s tick is their file.',
            'Which way the sheet goes; when handing it out, **By hand, in class** or **By ' +
              'email, one by one**. On top of that, if needed, the signature sheet.',
            '**A lesson of the course**, **A specific day** or **No deadline**.',
          ],
        },
      ],
      voci: [
        {
          termine: 'New assignment',
          testo:
            'From a lesson’s Admin tab it takes the lesson’s course and date; from the ' +
            `**${Molti(EN.pendenza)}** page you choose the course as well. It asks what, the ` +
            'type — task, study, materials to bring, to hand in… — and any notes.',
        },
        {
          termine: 'For whom',
          testo:
            `**The whole class**, **Only some ${EN.pif.plurale}** or **Me** — something I have ` +
            'to do myself. Either way the tick is by name: you can see who has done it and who ' +
            'is missing.',
        },
        {
          termine: 'With a document',
          testo:
            'Once **Ticked off by handing in a document** is ticked, you say what document it ' +
            `is and who brings it: **The ${EN.pif.plurale} hand it in to me** or **I hand it ` +
            `out to the ${EN.pif.plurale}**. Ticking a name then means choosing their file.`,
        },
        {
          termine: 'Handing out by email',
          testo:
            'When I hand the sheet out, **By email, one by one** sends one message each with ' +
            'the document attached, and the sending serves as proof. **A signed hand-over ' +
            'sheet is needed** asks for a single sheet for everyone, to attach.',
        },
        {
          termine: 'By when',
          testo:
            '**A lesson of the course** suggests the class’s next lessons, in other subjects ' +
            'too: moving that lesson moves the deadline. Or **A specific day**, or **No ' +
            'deadline**.',
        },
        {
          termine: 'In the lesson',
          testo:
            'Four groups: overdue, due today, set in this lesson, still open. An assignment ' +
            'comes back in every lesson of the course until it is ticked off for everyone.',
        },
        {
          termine: 'Ticking off',
          testo:
            'The count “12/20 · missing…” opens the collection: the names in full, **Mark ' +
            'all**, **Remove all**, and at the bottom **Tick all**, which marks and closes. The ' +
            'tick on the row does the same without opening anything.',
        },
        {
          termine: 'Editing, removing',
          testo:
            'The pencil reopens the form; **Delete** takes the ticks already given with it.',
        },
      ],
      note: [
        'On an assignment everyone has done, the tick on the row removes the ticks and puts ' +
          'it back among those to chase, after a confirmation. Documents collected stay.',
        `An assignment with no ${EN.pif.plurale} it applies to — in September, before ` +
          'enrolment — stays open: counting it as done would make it vanish as soon as it was ' +
          'written.',
      ],
    },
    check: {
      titolo: 'Check',
      sommario: 'Things to do once, ticked off person by person, with the day.',
      voci: [
        {
          termine: 'The columns',
          testo:
            'Each column is something to do once: the signed rules, the exercise book, the ' +
            'report. **Add a column** in the action bar of the **Check** page; **Columns** shows ' +
            'them all together, to rename, put in order by dragging, and remove.',
        },
        {
          termine: 'Ticking',
          testo:
            'A click on an empty cell ticks it. Another click removes the tick only if it was ' +
            'given on the day in question — today on the page, the lesson’s day inside a ' +
            'lesson: it is the wrong click of a moment ago. A cell ticked on another day does ' +
            'not change on click: it is changed with the right button. On the page the ticked ' +
            'cell shows the day, short: `07.09`; hovering shows it in full.',
        },
        {
          termine: 'Which day',
          testo:
            'From the page, if the course has a lesson today, the tick goes into that lesson; ' +
            'otherwise it carries today’s date. Inside a lesson — the **Admin** tab, below the ' +
            'assignments — it always goes into the open lesson.',
        },
        {
          termine: 'Another day',
          testo:
            'Right-click on the cell, or the Menu key on the keyboard: on an empty one **Tick ' +
            'today** and **Choose the date…**; on a ticked one **Change the date…** and ' +
            '**Remove the tick**. A day chosen by hand stays that day, whatever happens to the ' +
            'lessons.',
        },
        {
          termine: 'The column menu',
          testo:
            'Click or right-click on the column name: **Tick everyone today** (inside a lesson, ' +
            '**Tick everyone in this lesson**), **Rename…**, **Move left**, **Move right**, ' +
            '**Remove the column…**, **Add a column…**. Below the name, how many have done it ' +
            'out of how many.',
        },
        {
          termine: 'Outside its own page',
          testo:
            'The check can be ticked elsewhere too. On the course card the figures say, column ' +
            'by column, how many have done it out of those enrolled — “Rules: 18/22”, in ' +
            'green when complete. The matrix has a **Check** column with the columns each ' +
            'person has done: hovering shows those missing. Below is the whole grid, and the ' +
            'button with the tick mark at the top opens the course’s **Check** page.',
        },
        {
          termine: 'In the lesson',
          testo:
            'The same grid, in the **Admin** tab. Cells ticked in this lesson have the tick, ' +
            'and a click removes it; those from another day say which, with a dashed border, ' +
            'and can only be changed with the right button — where **Assign to the current ' +
            'lesson** brings them back to this lesson, and from then on they follow the ' +
            'lesson. A course with no columns shows just a row leading to the page.',
        },
      ],
      note: [
        'A tick given inside a lesson follows the lesson: if the lesson moves, the date moves ' +
          'with it. A click never changes a tick’s day: for that there is **Change the ' +
          'date…**, in the right-click menu.',
        'Removing a column takes its ticks with it: you are told first, with the number.',
        'Someone no longer enrolled stays in the grid only if they already have something ' +
          'ticked: what they did while they were there does not disappear.',
      ],
    },
    annotazioni: {
      titolo: 'Delivery and observations',
      sommario:
        'What was done in the lesson, and what needs noting about someone.',
      scritte: {
        svolgimento: 'Delivery',
        argomentiSvolti: 'Topics covered',
        materiali: 'Materials',
        consuntivo: 'Review',
        siSalva: 'saved when you leave the field',
        osservazioni: Molti(EN.osservazione),
        partecipazione: 'Particip.',
        impegno: 'Effort',
        autonomia: 'Independ.',
        successo: 'Rossi A. · Effort — what happened',
        disciplina: 'discipline',
        merito: 'merit',
        tuttaLaClasse: 'the whole class',
      },
      figure: [
        {
          didascalia:
            'The **Notes** tab, once the class has left. Everything here ends up in the ' +
            'lesson record.',
          legenda: [
            'The delivery: three text fields, which save themselves.',
            'The behaviour matrix: people in rows, the aspects observed in columns.',
            'The notes on marked cells, one row per cell.',
            'The observations written in full, with their type.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Topics, materials, review',
          testo:
            '**Topics covered** — what was actually done —, **Materials** and **Review** — how ' +
            'it went, what to pick up again. They are saved when you leave the field.',
        },
        {
          termine: 'The behaviour matrix',
          testo:
            'A click turns the cell: empty, **Very good**, **Needs work**, empty. The columns ' +
            'are the “Aspects observed in class” in **Settings** › Lists: out of the box ' +
            'participation, collaboration, respect for the rules, effort, independence.',
        },
        {
          termine: 'Noting a cell',
          testo:
            'Right-click on the cell opens the marks, **Nothing to mark** and **Add a note**: ' +
            'below the matrix its row appears, “what happened”. Every marked cell already has ' +
            'its own.',
        },
        {
          termine: 'Observations in full',
          testo:
            '**Add**: it concerns a learner or the whole class, has a type — note, merit, ' +
            'discipline, homework, materials, meeting — a text and, if needed, the time. The ' +
            'pencil edits or deletes it.',
        },
        {
          termine: 'Where they end up',
          testo:
            'In the lesson record, observations and matrix included. Marked cells are counted ' +
            'in the **Marked** column of Courses, and everything can be read again on the ' +
            'learner’s record.',
        },
      ],
      note: [
        'A cell with no mark and no note removes itself: only the cells that say something ' +
          'stay in the register.',
      ],
    },
    piani: {
      titolo: 'Lesson plans',
      sommario:
        'The course’s lessons and their outlines: what is prepared, and what is not.',
      scritte: {
        materia: 'Maths',
        ore: '18/24 lessons',
        cerca: 'search by date, objective, step',
        semestre: '1st semester',
        preparate: '18/24 prepared',
        lezione1: '1st lesson',
        data1: 'Thu 12.09',
        lezione2: '2nd lesson',
        data2: 'Thu 19.09 · 20 min uncovered',
        lezione3: '3rd lesson',
        senzaPiano: 'no plan — prepare it',
        nonAssegnati: 'Not yet assigned (1)',
        bozza: 'draft from 02.09',
        ripasso: `${EN.tipiAttivita.ripasso} · 3 activities`,
        titoloEditor: 'Maths · 1st lesson',
        diCheCosaParla: 'What it is about',
        campi: 'objectives · prerequisites · tags · notes',
        scaletta: 'Outline',
        gruppo1: 'Group 1 · 2 per. back to back · 08:20–09:50',
        liberi: '10 min free',
        correzione: 'Homework correction',
        esercizio: EN.tipiAttivita.esercizio,
        frazioni: 'Equivalent fractions',
        spiegazione: EN.tipiAttivita.spiegazione,
        coppie: 'Exercises in pairs',
        intervallo: 'Break · 15 min · 09:50–10:05',
        gruppo2: 'Group 2 · 1 per. · 10:05–10:50',
        pieno: 'full',
        verificaBreve: 'Short test',
        verifica: EN.tipiAttivita.verifica,
        piano: 'Plan',
        scalettaProva: 'outline, test',
        ora: 'Lesson',
        assegnaUnPiano: 'Assign a plan',
        inAula: 'In class',
        momento: 'Assessment',
        creaLaProva: 'Create the test',
        copia: 'Copy',
      },
      figure: [
        {
          didascalia:
            'On the left the lessons of the course chosen at the top, on the right the plan of ' +
            'the chosen lesson, laid over its periods. What you write is saved by itself.',
          legenda: [
            'The lessons by semester: “prepared” are the ones the outline fills completely.',
            'A lesson the outline does not cover says how many minutes are left uncovered.',
            'A lesson with no plan: a click creates the outline and opens it.',
            'Objectives, prerequisites, tags and notes: what helps you find the plan again.',
            'A group of back-to-back periods, between one break and the next, with the free ' +
              'minutes.',
            'The line under each step: how much of its group it takes up.',
            'The break has its own row, with the minutes it lasts.',
          ],
        },
        {
          didascalia:
            'A plan sits on a lesson, and in class it turns into ticks and grades. The ' +
            'assessment is created only there, from the step that says it is a test.',
          legenda: [
            'The step says it is a test: title, type, weight.',
            'The plan is assigned to a lesson from the lesson itself, or is created from it.',
            'In class each step is ticked off: to do, done, partly, skipped.',
            '**Create the test** creates the assessment, with the lesson’s date.',
            '**Duplicate** copies outline and files: that way a plan serves another lesson.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The lessons, by semester',
          testo:
            'The page is the list of lessons of the course chosen at the top, grouped by ' +
            'semester — or only the one in the **Period** drop-down. The header says how many ' +
            'lessons are still waiting for an outline. The search box finds by date, objective ' +
            'or step.',
        },
        {
          termine: 'Preparing a lesson',
          testo:
            'A lesson with no plan says **no plan — prepare it**: a click creates the empty ' +
            'outline and opens it. There is no free-standing “new plan”: a plan is born from a ' +
            'lesson, here or from the lesson itself.',
        },
        {
          termine: 'What a plan is called',
          testo:
            'After the lesson it hangs on: **“3rd lesson”**, and in full with the course in ' +
            'front. The number restarts each semester and skips cancelled lessons; “+1” if two ' +
            'lessons use it. An unassigned plan is a **draft**, “draft from 02.09”.',
        },
        {
          termine: 'What it is about',
          testo:
            'A plan has no title: it has **Objectives** (one per line), **Prerequisites**, ' +
            '**Tags** separated by commas and **Notes** for yourself. That is what the search ' +
            'finds, and the first objective serves as the topic in the small row.',
        },
        {
          termine: 'The steps',
          testo:
            'Each step has a title, a type and a length **in minutes**. The type is chosen by ' +
            'pressing its badge. They are reordered by dragging the handle, or with ↑ ↓ when ' +
            'the handle has focus. **Add activity** puts one at the end, already open.',
        },
        {
          termine: 'A step’s details',
          testo:
            'The arrow on the right opens them: **Delivery** (how it runs, how the class ' +
            'works, classroom materials), the type’s **Details** — group size, length and ' +
            'score of a test, workstation in a lab —, the **Assessment**, the materials.',
        },
        {
          termine: 'Does it fit the lesson?',
          testo:
            'With a lesson underneath, the steps fall into the groups of periods between one ' +
            'break and the next: “10 min free”, “full”, “15 min too many”. What does not fit ' +
            'ends up under **Past the end of the lesson**. In the list, “20 min uncovered” or ' +
            '“10 min over the lesson”.',
        },
        {
          termine: 'A step that is a test',
          testo:
            'In the details, **This step is a test**: title (empty means the step’s), type of ' +
            'test, weight from 0 to 10 — zero does not count towards the average. The real ' +
            'assessment is created in class, from the outline’s Test column.',
        },
        {
          termine: 'Resources',
          testo:
            '**Link**, **File**, **Image**: for the whole plan or a step. Files and images are ' +
            'copied into the year’s document, with the step’s name. The pencil changes title ' +
            'and notes, or moves it to another step with **Attached to**.',
        },
        {
          termine: 'Reuse',
          testo:
            '**Duplicate** makes a copy, files included, to adapt. At the bottom of the list ' +
            '“Not yet assigned” gathers the drafts, and **No course** the orphaned plans to ' +
            'reattach.',
        },
        {
          termine: 'Where it ends up',
          testo:
            'Below the editor: the lessons that use the plan — with “test to do” where the ' +
            'planned test has not been created yet — and the assessments that came out of it.',
        },
        {
          termine: 'The action bar',
          testo:
            '**Go to the register** opens the first lesson that uses the plan; **Duplicate** ' +
            'and **Delete** work on the open plan. **Lesson in this course** opens the form for ' +
            'a new lesson of the course, and once saved takes you into it.',
        },
      ],
      note: [
        'Lengths are written in minutes but kept in periods: the same plan reused in a year ' +
          'with fifty-minute periods still fills the lesson. The length of a period is set by ' +
          'the document, in Settings › Year and timetable › **Calendar**.',
        'An outline used by several lessons changes in all of them: to change just one, ' +
          'duplicate it. Assigning another plan to a lesson resets its ticks; removing a step ' +
          'removes its tick. **Delete** throws away the plan’s files too.',
      ],
    },
  },
})
