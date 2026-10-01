// I testi della guida, parte «Registro»: lezione, appello, consegne, check,
// svolgimento e osservazioni, piani. Una chiave per sezione (`TestiSezione`,
// testa di `types.ts`); struttura in `lesson.ts`.

import { catalogo } from '#core/i18n/index.js'
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
} from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
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
      pianificata: 'Modificabile',
      svolta: 'Conclusa',
      annullata: 'Annullata',
      testata: 'giovedì 14.11 · 08:20–10:00 · aula 12',
      statoPianificata: 'modificabile',
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
      chiusa: 'sola lettura',
      oraPassa: 'la lezione passa',
      riapri: 'Riapri',
      restaNonConta: 'resta, non conta',
      conConferma: 'con conferma',
      nellaBarra: '«da chiudere» nella barra in fondo',
      verbale: 'Verbale',
      inDocumenti: 'in Documenti',
    },
    figure: [
      {
        didascalia:
          'La pagina di una lezione. Il corso non si sceglie qui: è quello della tendina **Corso** ' +
          'in cima, uguale per le cinque pagine del Registro.',
        legenda: [
          'La riga delle azioni: i tre stati della lezione.',
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
          'senza appello resta da compilare anche se è conclusa.',
        legenda: [
          '**Modificabile**: la lezione da fare, che si scrive e si corregge. **Riapri** ce la ' +
            'riporta da conclusa, il suo pulsante da annullata, senza perdere niente.',
          'Passata senza appello, o non **Conclusa**: la barra in fondo propone per primo il ' +
            'buco più vecchio.',
          `**Conclusa** chiude la lezione quando è finita: esce dalle ${CARTE.pendenza.plurale}, ` +
            'diventa di sola lettura, e da lì il verbale si può fare.',
          '**Annullata**: resta nel registro, ma senza numero, fuori dai conti e dai buchi. ' +
            'Solo una lezione ancora vuota si annulla; il piano assegnato si stacca, dopo una ' +
            'domanda.',
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
          'a una qualunque: «✓ 12. gio 14.11 · 08:20». **✓** è conclusa, **×** annullata, e le ' +
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
          '**Modificabile**, **Conclusa** e **Annullata** stanno nella riga delle azioni: quello ' +
          'acceso è in vigore, e si preme quello dove si vuole portare la lezione. **Conclusa** si ' +
          'accende solo a lezione finita — un giorno passato, o oggi dopo la sua ultima fascia — e ' +
          'resta in evidenza finché non la si preme. **Annullata** vale solo per una lezione ancora ' +
          'vuota e chiede conferma. In alto, nella barra dei comandi, una pastiglia dice il ' +
          'tempo della lezione: **Passata**, **In corso** o **Da venire**.',
      },
      {
        termine: 'Lezione conclusa, in sola lettura',
        testo:
          'Una lezione **Conclusa** non si modifica più dalle sue schede: appello, consegne, ' +
          'check, piano, valutazioni, svolgimento e osservazioni restano da leggere. Anche ' +
          'riga di comando e assistente trovano la porta chiusa. **Riapri**, nell’avviso in ' +
          'testa, la rimette a **Modificabile** per correggerla; poi la si conclude di nuovo.',
      },
      {
        termine: 'Giorno, orario, aula',
        testo:
          'Dalla pagina della lezione non si cambiano. Si cambiano nel calendario, con ' +
          '**Modifica** accesa (in alto, accanto a **Proietta**, o Ctrl+E): un clic sulla ' +
          'lezione apre il suo modulo — corso, data, aula, stato, orario e scaletta; in fondo ' +
          '**Duplica** ed **Elimina**.',
      },
      {
        termine: 'Fasce e pause',
        testo:
          `**${Uno(FASCIA)} di lezione** aggiunge in coda un tratto in UD, lungo quanto una ` +
          'lezione nuova; **Pausa** uno in minuti, lungo quanto una pausa nuova. Le due misure e ' +
          'la durata dell’UD stanno in Impostazioni › Calendario › **Giornata**. I tratti ' +
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
          'pause. **Sincronizza da ICS**, in fondo al modulo della lezione o col tasto destro ' +
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
          '**Cambia** e la matita **Modifica la scaletta**, che apre il piano nella sua pagina, con ' +
          'quest’ora accanto.',
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
          'pagina **Documenti**, scheda Lezioni. Solo per una lezione **Conclusa**: prima uscirebbe ' +
          'senza appello e senza consuntivo.',
      },
      {
        termine: 'Supplenza',
        testo:
          'Un’ora tenuta al posto di un altro docente: con **Modifica** accesa, dal calendario si ' +
          'apre la lezione e si spunta **Supplenza**. Le ore così segnate, se **Concluse**, finiscono ' +
          'nella pagina **Documenti**, scheda Docente: la scheda del corso con quelle sole. Il suo ' +
          'PDF si rifà da sé con gli altri documenti del corso, anche quando si cambia una supplenza.',
      },
    ],
    note: [
      'Concludere una lezione rifà il verbale di quella lezione e i PDF del corso — presenze, voti, ' +
        'schede — a ' +
        'meno che il rifacimento automatico non sia spento. Non aspetta: l’avviso arriva ' +
        'quando i file sono pronti.',
      '**Conclusa** non fa l’appello al posto di nessuno: su un’ora senza appello mette le ' +
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
          'Chi entra dopo la pausa ha le prime due **X** e la terza **R**. Una riga tutta ' +
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
          'il tasto destro, apre il menu con tutti gli stati. La **R** c’è solo nella prima ' +
          'UD della lezione e nella prima dopo una pausa: lì si arriva in ritardo; il ' +
          'pulsante di riga non la offre. Con la tastiera le frecce passano da una casella ' +
          'all’altra; dentro minuti e nota muovono il cursore.',
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
        'nelle percentuali anche se nessuno l’ha conclusa. Restano fuori le annullate e ' +
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
          'cambia: il clic, come il tasto destro, apre il suo menu. Nella pagina la casella spuntata dice il ' +
          'giorno, corto: `07.09`; fermandosi sopra si legge per esteso. Le frecce passano da ' +
          'una casella all’altra.',
      },
      {
        termine: 'Quale giorno',
        testo:
          'Dalla pagina, se il corso ha lezione oggi e non è conclusa, la spunta va in quella ' +
          'lezione; altrimenti ' +
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
          'bordo tratteggiato, e il clic o il tasto destro aprono il loro menu — dove **Assegna alla ' +
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
          'sono gli «Aspetti osservati in classe» di **Impostazioni** › Didattica › Liste: di ' +
          'fabbrica partecipazione, collaborazione, rispetto delle regole, impegno, autonomia. ' +
          'Le frecce passano da una casella all’altra.',
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
      cerca: 'cerca per data, numero, obiettivo',
      preparate: '18 su 24 preparate',
      conto: '18 su 24',
      ora1: '#1 · gio 12.09',
      stato1: 'preparata · Frazioni',
      ora2: '#2 · gio 19.09',
      stato2: '20 min scoperti · Misure',
      ora3: '#3 · gio 26.09',
      stato3: 'senza piano',
      nonAssegnati: 'Piani non assegnati',
      campi: 'obiettivi · prerequisiti',
      materia: 'Matematica',
      semestre: '1° semestre',
      bozza: 'bozza del 02.09',
      ripasso: 'Ripasso · 3 attività',
      titoloEditor: 'Matematica · 1ª lezione',
      diCheCosaParla: 'Di che cosa parla',
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
          'In cima il navigatore fra le ore del corso scelto; sotto, largo quanto la ' +
          'pagina, il piano dell’ora scelta, posato sulle sue UD. Quel che si scrive si ' +
          'salva da sé.',
        legenda: [
          'Le frecce passano all’ora prima e a quella dopo; da tastiera **Alt+↑** e ' +
            '**Alt+↓**.',
          'L’ora di adesso, con il suo stato: un clic apre l’elenco di tutte le ore.',
          'Quante ore hanno una scaletta che le riempie tutte, e quante sono da calibrare.',
          'Obiettivi e prerequisiti: quel che fa ritrovare il piano.',
          'Un gruppo di UD attaccate, fra un intervallo e l’altro, con i minuti liberi.',
          'Il filo sotto ogni tappa: quanto del suo gruppo occupa.',
          'L’intervallo ha la sua riga, con i minuti che dura.',
        ],
      },
      {
        didascalia:
          'L’elenco del navigatore: tutte le ore del corso per semestre, ciascuna col suo ' +
          'stato e l’argomento del piano, e in fondo i piani che nessuna ora usa.',
        legenda: [
          'La ricerca trova per data, numero, obiettivo o tappa; le frecce scorrono ' +
            'l’elenco, **Invio** apre.',
          'Il semestre, con quante sue ore sono preparate.',
          'Un’ora preparata: la scaletta riempie l’ora esatta.',
          'Un’ora da calibrare dice quanti minuti restano scoperti, o quanti sforano.',
          'Un’ora senza piano: aperta, si crea il piano o se ne assegna uno che c’è.',
          'Le bozze e i piani rimasti senza corso, che nessuna ora usa.',
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
        termine: 'La pagina',
        testo:
          'In cima il navigatore fra le ore del corso scelto nella tendina in alto; sotto, ' +
          'il piano dell’ora scelta, largo quanto la pagina. La testata dice quante ore ' +
          'aspettano ancora una scaletta.',
      },
      {
        termine: 'Preparare un’ora',
        testo:
          'Un’ora senza piano mostra **Crea il piano**, che ne fa uno vuoto sul corso ' +
          'dell’ora, glielo assegna e lo apre, e **Assegna un piano che c’è**, che sceglie ' +
          'fra i piani del corso o ne fa uno nuovo. Dal registro della lezione lo stesso ' +
          'fa **Assegna un piano**. Obiettivi e scaletta li scrive chi insegna: il ' +
          'registro non ne inventa.',
      },
      {
        termine: 'Il navigatore',
        testo:
          'Le frecce ‹ › (**Lezione precedente**, **Lezione successiva**) passano da ' +
          'un’ora all’altra del corso; fuori dai campi lo fanno anche **Alt+↑** e ' +
          '**Alt+↓**, perché **Alt+←** e **Alt+→** restano il passo indietro e avanti fra ' +
          'le pagine. Al centro l’ora di adesso, «#3 · gio 26.09»: un clic apre l’elenco ' +
          'di tutte le ore, per semestre, ciascuna con il suo stato — ✓ preparata, senza ' +
          'piano, da calibrare con i minuti scoperti o di troppo, annullata — e ' +
          'l’argomento del piano. La casella in cima cerca per data, numero, obiettivo o ' +
          'tappa; ↑ ↓ scorrono, **Invio** apre, **Esc** chiude. In fondo **Piani non ' +
          'assegnati** raccoglie le bozze e i piani rimasti senza corso. Accanto, «18 su ' +
          '24 preparate» conta le ore la cui scaletta riempie l’ora esatta.',
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
          'Un piano non ha un titolo: ha **Obiettivi** (uno per riga) e **Prerequisiti**. ' +
          'Sono quel che la ricerca trova, e il primo obiettivo fa da argomento ' +
          'nell’elenco del navigatore.',
      },
      {
        termine: 'Le tappe',
        testo:
          'Ogni tappa ha titolo, tipo e durata **in minuti**, a blocchi di 5 (almeno 5): i ' +
          'tasti «-5 min» e «+5 min» la cambiano di un blocco. Il tipo si sceglie premendo ' +
          'la sua pastiglia. Si riordinano trascinando la presa, o con ↑ ↓ quando la presa ' +
          'ha il fuoco. **Aggiungi attività** ne mette una in fondo, già aperta. Nella ' +
          'pagina si salva subito; nella finestra di modifica solo con **Salva**.',
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
          '**Oltre la fine della lezione**. Nell’elenco del navigatore, «20 min scoperti» ' +
          'o «10 min oltre l’ora».',
      },
      {
        termine: 'Una tappa che è una prova',
        testo:
          'Nel dettaglio, **Questa tappa è una prova**: titolo (vuoto vuol dire quello della ' +
          'tappa), tipo di prova, peso da 0 a 10 — zero non fa media. Il momento vero nasce ' +
          'in aula, dalla colonna Prova della scaletta.',
      },
      {
        termine: 'Pendenze e Check',
        testo:
          'Nel dettaglio di una tappa, **Dedica all’evasione di pendenze** la lega a una ' +
          'consegna del corso, o a tutte quelle della lezione, e **Dedica a un check** a una ' +
          'o più colonne del check, spuntate una per una. Sotto l’editor, **Pendenze e Check del corso** elenca le consegne ' +
          'ancora aperte e le colonne del check: **Inserisci nella scaletta** aggiunge in fondo ' +
          'una tappa di 5 minuti per evaderle, e «già in scaletta» segna quelle che l’hanno. ' +
          'Se la scaletta ha già una tappa che verifica il check, un’altra colonna non ne ' +
          'aggiunge una nuova: **Lega alla tappa del check** la verifica in quella. ' +
          'Nel registro della lezione le colonne **Pendenze** e **Check** della scaletta aprono ' +
          'quel che la tappa deve evadere.',
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
          '**Duplica** fa una copia, file compresi, da adattare. In fondo all’elenco del ' +
          'navigatore, **Piani non assegnati** raccoglie le bozze e i piani rimasti senza ' +
          'corso, da riagganciare.',
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
          'lavorano sul piano aperto. **Lezione in questo corso** apre il modulo di una lezione ' +
          'nuova del corso, e salvata ci porta dentro.',
      },
    ],
    note: [
      'Le durate si scrivono in minuti ma si tengono in UD: lo stesso piano riusato in un ' +
        'anno dove le UD sono da cinquanta riempie comunque l’ora. La durata dell’UD la dice ' +
        'il documento, in Impostazioni › Calendario › **Giornata**.',
      'Una scaletta usata da più ore cambia in tutte: per cambiarne una sola si duplica. ' +
        'Assegnare un altro piano a un’ora ne azzera le spunte; togliere una tappa toglie la ' +
        'sua. **Elimina** butta anche i file del piano.',
      'I piani dei documenti di prima non hanno più le **Note**: quel che c’era ' +
        'scritto è in fondo ai **Prerequisiti**, dopo «Note:».',
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
        pianificata: 'Bearbeitbar',
        svolta: 'Abgeschlossen',
        annullata: 'Ausgefallen',
        testata: 'Donnerstag 14.11. · 08:20–10:00 · Zimmer 12',
        statoPianificata: 'bearbeitbar',
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
        chiusa: 'schreibgeschützt',
        oraPassa: 'Zeit vergeht',
        riapri: 'Wieder öffnen',
        restaNonConta: 'bleibt, zählt nicht',
        conConferma: 'mit Bestätigung',
        nellaBarra: '«abzuschliessen» in der Leiste unten',
        verbale: 'Protokoll',
        inDocumenti: 'unter Dokumente',
      },
      figure: [
        {
          didascalia:
            'Die Seite einer Stunde. Den Kurs wählt man nicht hier: Es ist der aus der ' +
            'Auswahlliste **Kurs** oben, derselbe für die fünf Seiten des Klassenbuchs.',
          legenda: [
            'Die Aktionsleiste: die drei Status der Stunde.',
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
            'vergangene Stunde ohne Präsenzkontrolle bleibt auszufüllen, auch wenn sie ' +
            'abgeschlossen ist.',
          legenda: [
            '**Bearbeitbar**: die Stunde, die man schreibt und korrigiert. **Wieder öffnen** holt ' +
              'sie von abgeschlossen zurück, ihre Schaltfläche von ausgefallen, ohne etwas zu verlieren.',
            'Vorbei ohne Präsenzkontrolle oder nicht **Abgeschlossen**: Die Leiste unten schlägt ' +
              'zuerst die älteste Lücke vor.',
            '**Abgeschlossen** schliesst die Stunde ab, wenn sie vorbei ist: Sie verlässt die ' +
              `${DE.pendenza.plurale}, wird schreibgeschützt, und von da an lässt sich das ` +
              'Protokoll erstellen.',
            '**Ausgefallen**: bleibt im Klassenbuch, aber ohne Nummer, ausserhalb der ' +
              'Zählungen und der Lücken. Nur eine noch leere Stunde fällt aus; der zugewiesene ' +
              'Plan wird nach einer Rückfrage entfernt.',
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
            'springt zu einer beliebigen: «✓ 12. Do 14.11. · 08:20». **✓** heisst abgeschlossen, ' +
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
            '**Bearbeitbar**, **Abgeschlossen** und **Ausgefallen** stehen in der Aktionsleiste: Der ' +
            'eingeschaltete gilt, und man drückt den, zu dem man die Stunde bringen will. ' +
            '**Abgeschlossen** geht erst, wenn die Stunde vorbei ist — ein vergangener Tag oder ' +
            'heute nach ihrem letzten Zeitfenster —, und bleibt hervorgehoben, bis man es drückt. ' +
            '**Ausgefallen** gilt nur für eine noch leere Stunde und fragt nach einer Bestätigung. ' +
            'Oben in der Befehlsleiste sagt ein Abzeichen, wo die Stunde zeitlich steht: ' +
            '**Vorbei**, **Läuft** oder **Kommt noch**.',
        },
        {
          termine: 'Abgeschlossene Stunde, schreibgeschützt',
          testo:
            'Eine **Abgeschlossene** Stunde lässt sich in ihren Registern nicht mehr ändern: ' +
            'Präsenzkontrolle, Aufträge, Checks, Plan, Bewertungen, Verlauf und Beobachtungen ' +
            'bleiben zum Lesen. Auch Kommandozeile und Assistent finden die Tür zu. ' +
            '**Wieder öffnen** im Hinweis oben setzt sie auf **Bearbeitbar** zurück, um sie zu ' +
            'korrigieren; danach schliesst man sie wieder ab.',
        },
        {
          termine: 'Tag, Zeit, Zimmer',
          testo:
            'Auf der Seite der Stunde ändert man sie nicht. Man ändert sie im Kalender, bei ' +
            'eingeschaltetem **Bearbeiten** (oben, neben **Projizieren**, oder Ctrl+E): Ein ' +
            'Klick auf die Stunde öffnet ihr Formular — Kurs, Datum, Zimmer, Status, Zeit und ' +
            'Ablauf; unten **Duplizieren** und **Löschen**.',
        },
        {
          termine: 'Zeitfenster und Pausen',
          testo:
            '**Zeitfenster für Unterricht** hängt einen Abschnitt in Lektionen an, so lang wie ' +
            'eine neue Stunde; **Pause** einen in Minuten, so lang wie eine neue ' +
            'Pause. Die beiden Längen und die Dauer der Lektion stehen unter Einstellungen › ' +
            'Kalender › **Schultag**. Die Abschnitte hängen aneinander: Man ' +
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
            'synchronisieren**, unten im Formular der Stunde oder mit der rechten Maustaste ' +
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
            'der den Plan auf seiner Seite öffnet, mit dieser Stunde daneben.',
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
            'die **Abgeschlossen** ist: Vorher käme es ohne Präsenzkontrolle und ohne Rückblick ' +
            'heraus.',
        },
        {
          termine: 'Stellvertretung',
          testo:
            'Eine Stunde an Stelle einer anderen Lehrperson: Mit eingeschaltetem **Bearbeiten** ' +
            'öffnet man die Stunde im Kalender und hakt **Stellvertretung** an. So markierte ' +
            'Stunden, wenn **Abgeschlossen**, landen auf der Seite **Dokumente**, Reiter Lehrperson: ' +
            'das Kursblatt nur mit diesen. Sein PDF wird mit den anderen Dokumenten des Kurses von ' +
            'selbst neu erstellt, auch wenn man eine Stellvertretung ändert.',
        },
      ],
      note: [
        'Eine Stunde abzuschliessen erstellt das Protokoll dieser Stunde und die PDF des Kurses ' +
          '— Präsenzen, Noten, Blätter — neu, sofern das automatische Neuerstellen nicht ' +
          'ausgeschaltet ist. Es wartet nicht: Die Meldung kommt, wenn die Dateien bereit sind.',
        '**Abgeschlossen** macht niemandem die Präsenzkontrolle: Auf einer Stunde ohne ' +
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
            'Wer nach der Pause kommt, hat bei den ersten beiden **X** und bei der dritten ' +
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
            'Lange gedrückt oder mit der rechten Maustaste öffnet es das Menü mit allen Status. ' +
            'Das **R** gibt es nur in der ersten Lektion der Stunde und in der ersten nach einer ' +
            'Pause: Nur dort kommt man zu spät; die Zeilentaste bietet es nicht an. Mit der ' +
            'Tastatur gehen die Pfeiltasten von Feld zu Feld; in Minuten und Notiz bewegen sie ' +
            'den Cursor.',
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
          'erledigter Präsenzkontrolle geht in die Prozente ein, auch wenn niemand sie ' +
          'abgeschlossen hat. Draussen bleiben die ausgefallenen und die Felder, die noch ' +
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
            'anderen Tag abgehaktes Feld ändert sich beim Klick nicht: Der Klick öffnet, wie die ' +
            'rechte Maustaste, sein Menü. Auf der Seite zeigt das abgehakte Feld den Tag, kurz: `07.09`; ' +
            'fährt man darüber, liest man ihn ausgeschrieben. Die Pfeiltasten springen von Feld ' +
            'zu Feld.',
        },
        {
          termine: 'Welcher Tag',
          testo:
            'Auf der Seite kommt das Häkchen, wenn der Kurs heute Unterricht hat und die Stunde ' +
            'nicht abgeschlossen ist, in diese ' +
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
            'welchen, mit gestricheltem Rand, und Klick oder rechte Maustaste öffnen ihr Menü — ' +
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
            'Unterricht › Listen: ab Werk Beteiligung, Zusammenarbeit, Einhalten der Regeln, Einsatz, ' +
            'Selbstständigkeit. Die Pfeiltasten gehen von Feld zu Feld.',
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
        cerca: 'nach Datum, Nummer, Ziel suchen',
        preparate: '18 von 24 vorbereitet',
        conto: '18 von 24',
        ora1: '#1 · Do 12.09.',
        stato1: 'vorbereitet · Brüche',
        ora2: '#2 · Do 19.09.',
        stato2: '20 min nicht abgedeckt · Messen',
        ora3: '#3 · Do 26.09.',
        stato3: 'ohne Plan',
        nonAssegnati: 'Nicht zugewiesene Pläne',
        campi: 'Lernziele · Voraussetzungen',
        materia: 'Mathematik',
        semestre: '1. Semester',
        bozza: 'Entwurf vom 02.09.',
        ripasso: `${DE.tipiAttivita.ripasso} · 3 Aktivitäten`,
        titoloEditor: 'Mathematik · 1. Stunde',
        diCheCosaParla: 'Worum es geht',
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
            'Oben der Navigator durch die Stunden des gewählten Kurses; darunter, so breit ' +
            'wie die Seite, der Plan der gewählten Stunde, auf ihre Lektionen gelegt. Was ' +
            'man schreibt, speichert sich selbst.',
          legenda: [
            'Die Pfeile wechseln zur Stunde davor und danach; mit der Tastatur **Alt+↑** und ' +
              '**Alt+↓**.',
            'Die aktuelle Stunde mit ihrem Status: Ein Klick öffnet die Liste aller Stunden.',
            'Wie viele Stunden einen Ablauf haben, der sie ganz füllt, und wie viele ' +
              'anzupassen sind.',
            'Lernziele und Voraussetzungen: was den Plan wiederfinden lässt.',
            'Eine Gruppe von Lektionen am Stück, zwischen zwei Pausen, mit den freien ' +
              'Minuten.',
            'Der Faden unter jeder Etappe: wie viel ihrer Gruppe sie belegt.',
            'Die Pause hat ihre eigene Zeile, mit den Minuten, die sie dauert.',
          ],
        },
        {
          didascalia:
            'Die Liste des Navigators: alle Stunden des Kurses nach Semester, jede mit ihrem ' +
            'Status und dem Thema des Plans, und unten die Pläne, die keine Stunde verwendet.',
          legenda: [
            'Die Suche findet nach Datum, Nummer, Ziel oder Etappe; die Pfeiltasten ' +
              'blättern, **Enter** öffnet.',
            'Das Semester, mit der Zahl seiner vorbereiteten Stunden.',
            'Eine vorbereitete Stunde: Der Ablauf füllt die Stunde genau.',
            'Eine anzupassende Stunde sagt, wie viele Minuten offen bleiben oder zu viel ' +
              'sind.',
            'Eine Stunde ohne Plan: Geöffnet, erstellt man den Plan oder weist einen ' +
              'bestehenden zu.',
            'Die Entwürfe und die Pläne ohne Kurs, die keine Stunde verwendet.',
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
          termine: 'Die Seite',
          testo:
            'Oben der Navigator durch die Stunden des in der Auswahlliste oben gewählten ' +
            'Kurses; darunter der Plan der gewählten Stunde, so breit wie die Seite. Der ' +
            'Kopf sagt, wie viele Stunden noch auf einen Ablauf warten.',
        },
        {
          termine: 'Eine Stunde vorbereiten',
          testo:
            'Eine Stunde ohne Plan zeigt **Plan erstellen**, das einen leeren Plan auf dem ' +
            'Kurs der Stunde anlegt, ihn ihr zuweist und öffnet, und **Bestehenden Plan ' +
            'zuweisen**, das unter den Plänen des Kurses wählt oder einen neuen anlegt. Auf ' +
            'der Seite der Stunde macht **Plan zuweisen** dasselbe. Lernziele und Ablauf ' +
            'schreibt, wer unterrichtet: Das Klassenbuch erfindet keine.',
        },
        {
          termine: 'Der Navigator',
          testo:
            'Die Pfeile ‹ › (**Vorherige Stunde**, **Nächste Stunde**) wechseln von einer ' +
            'Stunde des Kurses zur anderen; ausserhalb der Felder auch **Alt+↑** und ' +
            '**Alt+↓**, denn **Alt+←** und **Alt+→** bleiben der Schritt zurück und vor ' +
            'zwischen den Seiten. In der Mitte die aktuelle Stunde, «#3 · Do 26.09.»: Ein ' +
            'Klick öffnet die Liste aller Stunden nach Semester, jede mit ihrem Status — ✓ ' +
            'vorbereitet, ohne Plan, anzupassen mit den offenen oder überzähligen Minuten, ' +
            'ausgefallen — und dem Thema des Plans. Das Feld oben sucht nach Datum, Nummer, ' +
            'Ziel oder Etappe; ↑ ↓ blättern, **Enter** öffnet, **Esc** schliesst. Unten ' +
            'sammelt **Nicht zugewiesene Pläne** die Entwürfe und die Pläne ohne Kurs. ' +
            'Daneben zählt «18 von 24 vorbereitet» die Stunden, deren Ablauf die Stunde ' +
            'genau füllt.',
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
            'Ein Plan hat keinen Titel: Er hat **Lernziele** (eines pro Zeile) und ' +
            '**Voraussetzungen**. Das findet die Suche, und das erste Lernziel dient als ' +
            'Thema in der Liste des Navigators.',
        },
        {
          termine: 'Die Etappen',
          testo:
            'Jede Etappe hat Titel, Art und Dauer **in Minuten**, in Blöcken von 5 ' +
            '(mindestens 5): Die Tasten «-5 Min.» und «+5 Min.» ändern sie um einen Block. ' +
            'Die Art wählt man durch Klick auf ihr Etikett. Man ordnet sie durch Ziehen am ' +
            'Griff um, oder mit ↑ ↓, wenn der Griff den Fokus hat. **Aktivität hinzufügen** ' +
            'setzt eine ans Ende, schon geöffnet. Auf der Seite speichert sich das sofort, ' +
            'im Bearbeitungsfenster erst mit **Speichern**.',
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
            'Mit einer Stunde darunter fallen die Etappen in die Gruppen von Lektionen ' +
            'zwischen zwei Pausen: «10 min frei», «voll», «15 min zu viel». Was nicht ' +
            'hineinpasst, landet unter **Über das Ende der Stunde hinaus**. In der Liste des ' +
            'Navigators «20 min nicht abgedeckt» oder «10 min über die Stunde hinaus».',
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
          termine: 'Pendenzen und Checks',
          testo:
            'In den Details einer Etappe verknüpft **Für die Erledigung von Pendenzen ' +
            'vorsehen** sie mit einem Auftrag des Kurses, oder mit allen der Stunde, und **Für ' +
            'einen Check vorsehen** mit einer oder mehreren angehakten Spalten des Checks. Unter dem Editor listet ' +
            '**Pendenzen und Checks des Kurses** die offenen Aufträge und die Spalten des ' +
            'Checks auf: **In Ablauf einfügen** fügt am Ende eine Etappe von 5 Minuten hinzu, ' +
            'um sie zu erledigen, und «bereits im Ablauf» markiert die, die schon eine haben. ' +
            'Hat der Ablauf schon eine Etappe, die den Check prüft, fügt eine weitere Spalte ' +
            'keine neue hinzu: **Mit Check-Etappe verknüpfen** prüft sie in jener. ' +
            'Auf der Seite der Stunde öffnen die Spalten **Pendenzen** und **Check** des ' +
            'Ablaufs, was die Etappe erledigen soll.',
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
            '**Duplizieren** macht eine Kopie, samt Dateien, zum Anpassen. Unten in der ' +
            'Liste des Navigators sammelt **Nicht zugewiesene Pläne** die Entwürfe und die ' +
            'Pläne ohne Kurs, die wieder anzuhängen sind.',
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
          'trotzdem. Die Dauer der Lektion sagt das Dokument, unter Einstellungen › Kalender ' +
          '› **Schultag**.',
        'Ein Ablauf, den mehrere Stunden verwenden, ändert sich in allen: Um nur einen zu ' +
          'ändern, dupliziert man. Einer Stunde einen anderen Plan zuzuweisen, setzt ihre ' +
          'Häkchen zurück; eine Etappe zu entfernen, entfernt ihres. **Löschen** wirft auch ' +
          'die Dateien des Plans weg.',
        'Die Pläne von früher haben keine **Notizen** mehr: Was dort stand, steht am ' +
          'Ende der **Voraussetzungen**, nach «Notizen:».',
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
        pianificata: 'Modifiable',
        svolta: 'Terminée',
        annullata: 'Annulée',
        testata: 'jeudi 14.11 · 08:20–10:00 · salle 12',
        statoPianificata: 'modifiable',
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
        chiusa: 'lecture seule',
        oraPassa: 'l’heure passe',
        riapri: 'Rouvrir',
        restaNonConta: 'reste, ne compte pas',
        conConferma: 'avec confirmation',
        nellaBarra: '« à clôturer » dans la barre du bas',
        verbale: 'Procès-verbal',
        inDocumenti: 'dans Documents',
      },
      figure: [
        {
          didascalia:
            'La page d’une leçon. Le cours ne se choisit pas ici : c’est celui de la liste ' +
            '**Cours** en haut, le même pour les cinq pages du Registre.',
          legenda: [
            'La barre d’actions : les trois états de la leçon.',
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
            'leçon passée sans appel reste à remplir même si elle est terminée.',
          legenda: [
            '**Modifiable** : la leçon à faire, qu’on écrit et qu’on corrige. **Rouvrir** l’y ' +
              'ramène depuis terminée, son bouton depuis annulée, sans rien perdre.',
            'Passée sans appel, ou pas **Terminée** : la barre du bas propose d’abord le trou le ' +
              'plus ancien.',
            `**Terminée** ferme la leçon une fois finie : elle sort des ${FR.pendenza.plurale}, ` +
              'passe en lecture seule, et dès lors le procès-verbal peut se faire.',
            '**Annulée** : reste dans le registre, mais sans numéro, hors des comptes et des ' +
              'trous. Seule une leçon encore vide s’annule ; le plan attribué est retiré, après ' +
              'une question.',
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
            'saute à n’importe laquelle : « ✓ 12. jeu 14.11 · 08:20 ». **✓** veut dire terminée, ' +
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
            '**Modifiable**, **Terminée** et **Annulée** sont dans la barre d’actions : celui qui est ' +
            'allumé est en vigueur, et on appuie sur celui où l’on veut amener la leçon. ' +
            '**Terminée** ne s’active qu’une fois la leçon finie — un jour passé, ou aujourd’hui ' +
            'après sa dernière plage — et reste mis en avant tant qu’on ne l’a pas pressé. ' +
            '**Annulée** ne vaut que pour une leçon encore vide et demande une confirmation. ' +
            'En haut, dans la barre de commandes, une pastille dit où en est la leçon : ' +
            '**Passée**, **En cours** ou **À venir**.',
        },
        {
          termine: 'Leçon terminée, en lecture seule',
          testo:
            'Une leçon **Terminée** ne se modifie plus depuis ses onglets : appel, devoirs, ' +
            'checks, plan, évaluations, déroulement et observations restent à lire. La ligne ' +
            'de commande et l’assistant trouvent aussi porte close. **Rouvrir**, dans l’avis en ' +
            'haut, la remet à **Modifiable** pour la corriger ; ensuite on la termine de nouveau.',
        },
        {
          termine: 'Jour, horaire, salle',
          testo:
            'Ils ne se changent pas depuis la page de la leçon, mais dans le calendrier, avec ' +
            '**Modifier** activé (en haut, à côté de **Projeter**, ou Ctrl+E) : un clic sur la ' +
            'leçon ouvre son formulaire — cours, date, salle, état, horaire et déroulement ; en ' +
            'bas, **Dupliquer** et **Supprimer**.',
        },
        {
          termine: 'Plages et pauses',
          testo:
            '**Plage de cours** ajoute à la fin un tronçon en périodes, aussi long qu’une ' +
            'nouvelle leçon ; **Pause** un tronçon en minutes, aussi long qu’une nouvelle ' +
            'pause. Les deux longueurs et la durée de la période sont dans Paramètres › ' +
            'Calendrier › **Journée**. Les tronçons se suivent : on n’écrit que le début du ' +
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
            'ICS**, en bas du formulaire de la leçon ou au clic droit sur la leçon dans le ' +
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
            'leçon**. Avec un plan, **Changer** et le crayon **Modifier le déroulement**, qui ' +
            'ouvre le plan sur sa page, avec cette leçon à côté.',
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
            '**Terminée** : avant, il sortirait sans appel et sans bilan.',
        },
        {
          termine: 'Remplacement',
          testo:
            'Une leçon donnée à la place d’un autre enseignant : avec **Modifier** activé, on ' +
            'ouvre la leçon depuis le calendrier et on coche **Remplacement**. Les leçons ainsi ' +
            'marquées, si **Terminées**, arrivent dans la page **Documents**, onglet Enseignant : ' +
            'la fiche du cours avec elles seules. Son PDF se refait tout seul avec les autres ' +
            'documents du cours, même quand on modifie un remplacement.',
        },
      ],
      note: [
        'Terminer une leçon refait le procès-verbal de cette leçon et les PDF du cours — ' +
          'présences, notes, fiches —, à moins que la régénération automatique ne soit ' +
          'désactivée. Il n’attend pas : l’avis arrive quand les fichiers sont prêts.',
        '**Terminée** ne fait l’appel à la place de personne : sur une leçon sans appel, il met ' +
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
            'Qui arrive après la pause a **X** aux deux premières périodes et **R** à la ' +
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
            'clic droit, elle ouvre le menu avec tous les états. Le **R** n’existe qu’à la ' +
            'première période de la leçon et à la première après une pause : c’est là qu’on ' +
            'arrive en retard ; le bouton de ligne ne le propose pas. Au clavier, les flèches ' +
            'passent d’une case à l’autre ; dans les minutes et la note, elles déplacent le curseur.',
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
          'l’appel fait entre dans les pourcentages même si personne ne l’a terminée. ' +
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
            'autre jour ne change pas au clic : le clic, comme le clic droit, ouvre son menu. Sur la page, la ' +
            'case cochée indique le jour, en bref : `07.09` ; en s’arrêtant dessus, on le lit ' +
            'en entier. Les flèches passent d’une case à l’autre.',
        },
        {
          termine: 'Quel jour',
          testo:
            'Depuis la page, si le cours a leçon aujourd’hui et qu’elle n’est pas terminée, la ' +
            'coche va dans cette leçon ; ' +
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
            'avec la bordure en pointillé, et le clic ou le clic droit ouvrent leur menu — où **Attribuer ' +
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
            'colonnes sont les « Aspects observés en classe » de **Paramètres** › Enseignement › Listes : ' +
            'par défaut participation, collaboration, respect des règles, effort, autonomie. ' +
            'Les flèches passent d’une case à l’autre.',
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
        cerca: 'date, numéro, objectif',
        preparate: '18 sur 24 préparées',
        conto: '18 sur 24',
        ora1: '#1 · jeu 12.09',
        stato1: 'préparée · Fractions',
        ora2: '#2 · jeu 19.09',
        stato2: '20 min non couverts · Mesures',
        ora3: '#3 · jeu 26.09',
        stato3: 'sans plan',
        nonAssegnati: 'Plans non attribués',
        campi: 'objectifs · prérequis',
        materia: 'Mathématiques',
        semestre: '1er semestre',
        bozza: 'brouillon du 02.09',
        ripasso: `${FR.tipiAttivita.ripasso} · 3 activités`,
        titoloEditor: 'Mathématiques · 1re leçon',
        diCheCosaParla: 'De quoi il parle',
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
            'En haut, le navigateur entre les leçons du cours choisi ; dessous, sur toute la ' +
            'largeur de la page, le plan de la leçon choisie, posé sur ses périodes. Ce ' +
            'qu’on écrit s’enregistre tout seul.',
          legenda: [
            'Les flèches passent à la leçon d’avant et à celle d’après ; au clavier ' +
              '**Alt+↑** et **Alt+↓**.',
            'La leçon actuelle, avec son état : un clic ouvre la liste de toutes les leçons.',
            'Combien de leçons ont un déroulement qui les remplit entièrement, et combien ' +
              'sont à ajuster.',
            'Objectifs et prérequis : ce qui permet de retrouver le plan.',
            'Un groupe de périodes d’affilée, entre deux pauses, avec les minutes libres.',
            'Le fil sous chaque étape : combien de son groupe elle occupe.',
            'La pause a sa ligne, avec les minutes qu’elle dure.',
          ],
        },
        {
          didascalia:
            'La liste du navigateur : toutes les leçons du cours par semestre, chacune avec ' +
            'son état et le sujet du plan, et en bas les plans qu’aucune leçon n’utilise.',
          legenda: [
            'La recherche trouve par date, numéro, objectif ou étape ; les flèches ' +
              'parcourent la liste, **Entrée** ouvre.',
            'Le semestre, avec combien de ses leçons sont préparées.',
            'Une leçon préparée : le déroulement remplit exactement la leçon.',
            'Une leçon à ajuster dit combien de minutes restent non couvertes, ou débordent.',
            'Une leçon sans plan : ouverte, on crée le plan ou on en attribue un qui existe.',
            'Les brouillons et les plans restés sans cours, qu’aucune leçon n’utilise.',
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
          termine: 'La page',
          testo:
            'En haut, le navigateur entre les leçons du cours choisi dans la liste en haut ; ' +
            'dessous, le plan de la leçon choisie, sur toute la largeur de la page. ' +
            'L’en-tête dit combien de leçons attendent encore un déroulement.',
        },
        {
          termine: 'Préparer une leçon',
          testo:
            'Une leçon sans plan montre **Créer le plan**, qui en fait un vide sur le cours ' +
            'de la leçon, le lui attribue et l’ouvre, et **Attribuer un plan existant**, qui ' +
            'choisit parmi les plans du cours ou en fait un nouveau. Depuis la leçon, ' +
            '**Attribuer un plan** fait de même. Objectifs et déroulement, c’est ' +
            'l’enseignant qui les écrit : le registre n’en invente pas.',
        },
        {
          termine: 'Le navigateur',
          testo:
            'Les flèches ‹ › (**Leçon précédente**, **Leçon suivante**) passent d’une leçon ' +
            'du cours à l’autre ; hors des champs, **Alt+↑** et **Alt+↓** aussi, car ' +
            '**Alt+←** et **Alt+→** restent le pas en arrière et en avant entre les pages. ' +
            'Au centre la leçon actuelle, « #3 · jeu 26.09 » : un clic ouvre la liste de ' +
            'toutes les leçons, par semestre, chacune avec son état — ✓ préparée, sans plan, ' +
            'à ajuster avec les minutes non couvertes ou en trop, annulée — et le sujet du ' +
            'plan. La case en haut cherche par date, numéro, objectif ou étape ; ↑ ↓ ' +
            'parcourent, **Entrée** ouvre, **Échap** ferme. En bas, **Plans non attribués** ' +
            'rassemble les brouillons et les plans restés sans cours. À côté, « 18 sur 24 ' +
            'préparées » compte les leçons dont le déroulement remplit exactement la leçon.',
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
            'Un plan n’a pas de titre : il a des **Objectifs** (un par ligne) et des ' +
            '**Prérequis**. C’est ce que trouve la recherche, et le premier objectif sert de ' +
            'sujet dans la liste du navigateur.',
        },
        {
          termine: 'Les étapes',
          testo:
            'Chaque étape a un titre, un type et une durée **en minutes**, par blocs de 5 ' +
            '(au moins 5) : les boutons « -5 min » et « +5 min » la changent d’un bloc. Le ' +
            'type se choisit en appuyant sur sa pastille. On les réordonne en glissant la ' +
            'poignée, ou avec ↑ ↓ quand la poignée a le focus. **Ajouter une activité** en ' +
            'met une à la fin, déjà ouverte. Dans la page, cela s’enregistre aussitôt ; dans ' +
            'la fenêtre de modification, seulement avec **Enregistrer**.',
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
            'pas finit sous **Au-delà de la fin de la leçon**. Dans la liste du navigateur, ' +
            '« 20 min non couverts » ou « 10 min au-delà de la leçon ».',
        },
        {
          termine: 'Une étape qui est une épreuve',
          testo:
            'Dans le détail, **Cette étape est une épreuve** : titre (vide veut dire celui de ' +
            'l’étape), type d’épreuve, poids de 0 à 10 — zéro ne compte pas dans la moyenne. ' +
            'La vraie évaluation naît en classe, depuis la colonne Épreuve du déroulement.',
        },
        {
          termine: 'Tâches en suspens et checks',
          testo:
            'Dans le détail d’une étape, **Consacrer au traitement des tâches en suspens** la ' +
            'lie à un devoir du cours, ou à tous ceux de la leçon, et **Consacrer à un check** ' +
            'à une ou plusieurs colonnes du check, cochées une à une. Sous l’éditeur, **Tâches en suspens et checks du cours** ' +
            'liste les devoirs encore ouverts et les colonnes du check : **Insérer dans le ' +
            'déroulement** ajoute à la fin une étape de 5 minutes pour les traiter, et « déjà ' +
            'dans le déroulement » signale ceux qui l’ont. Si le déroulement a déjà une étape ' +
            'qui vérifie le check, une autre colonne n’en ajoute pas de nouvelle : **Lier à ' +
            'l’étape du check** la vérifie dans celle-là. Depuis la leçon, les colonnes ' +
            '**Tâches en suspens** et **Check** du déroulement ouvrent ce que l’étape doit ' +
            'traiter.',
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
            '**Dupliquer** fait une copie, fichiers compris, à adapter. En bas de la liste ' +
            'du navigateur, **Plans non attribués** rassemble les brouillons et les plans ' +
            'restés sans cours, à raccrocher.',
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
          'durée de la période, c’est le document qui la dit, dans Paramètres › Calendrier ' +
          '› **Journée**.',
        'Un déroulement utilisé par plusieurs leçons change dans toutes : pour n’en changer ' +
          'qu’une, on duplique. Attribuer un autre plan à une leçon remet ses coches à zéro ; ' +
          'retirer une étape retire la sienne. **Supprimer** jette aussi les fichiers du plan.',
        'Les plans d’avant n’ont plus de **Notes** : ce qui y était écrit se trouve à la ' +
          'fin des **Prérequis**, après « Notes : ».',
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
        pianificata: 'Editable',
        svolta: 'Completed',
        annullata: 'Cancelled',
        testata: 'Thursday 14.11 · 08:20–10:00 · room 12',
        statoPianificata: 'editable',
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
        chiusa: 'read-only',
        oraPassa: 'time passes',
        riapri: 'Reopen',
        restaNonConta: 'stays, doesn’t count',
        conConferma: 'with confirmation',
        nellaBarra: '“to close” in the bottom bar',
        verbale: 'Lesson record',
        inDocumenti: 'in Documents',
      },
      figure: [
        {
          didascalia:
            'The page of a lesson. The course is not chosen here: it is the one in the ' +
            '**Course** drop-down at the top, the same for all five Register pages.',
          legenda: [
            'The action bar: the lesson’s three states.',
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
            'without attendance stays to be filled in even if it is completed.',
          legenda: [
            '**Editable**: the lesson to do, which you write and correct. **Reopen** brings it ' +
              'back from completed, its button from cancelled, without losing anything.',
            'Past without attendance, or not **Completed**: the bottom bar suggests the oldest ' +
              'gap first.',
            `**Completed** closes the lesson once it is over: it leaves the ${EN.pendenza.plurale}, ` +
              'becomes read-only, and from then on the lesson record can be made.',
            '**Cancelled**: stays in the register, but with no number, out of the counts and ' +
              'the gaps. Only a lesson still empty can be cancelled; the assigned plan is ' +
              'removed, after a question.',
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
            'jumps to any of them: “✓ 12. Thu 14.11 · 08:20”. **✓** means completed, **×** ' +
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
            '**Editable**, **Completed** and **Cancelled** are in the action bar: the one lit up is ' +
            'in force, and you press the one you want to take the lesson to. **Completed** only ' +
            'works once the lesson is over — a past day, or today after its last time slot — and ' +
            'stays highlighted until you press it. **Cancelled** is only for a lesson still empty ' +
            'and asks for confirmation. At the top, in the command bar, a badge tells where the ' +
            'lesson stands in time: **Over**, **In progress** or **Upcoming**.',
        },
        {
          termine: 'Completed lesson, read-only',
          testo:
            'A **Completed** lesson can no longer be changed from its tabs: attendance, assignments, ' +
            'checks, plan, assessments, record and observations stay readable. The command ' +
            'line and the assistant find the door shut too. **Reopen**, in the notice at the ' +
            'top, sets it back to **Editable** to correct it; then you complete it again.',
        },
        {
          termine: 'Day, time, room',
          testo:
            'They are not changed from the lesson’s page, but in the calendar, with **Edit** on ' +
            '(at the top, next to **Project**, or Ctrl+E): a click on the lesson opens its ' +
            'form — course, date, room, state, time and outline; at the bottom **Duplicate** ' +
            'and **Delete**.',
        },
        {
          termine: 'Slots and breaks',
          testo:
            '**Teaching slot** adds a stretch in periods at the end, as long as a new lesson; ' +
            '**Break** one in minutes, as long as a new break. Both lengths and the length of ' +
            'a period are in Settings › Calendar › **School day**. The stretches are ' +
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
            'be added. **Sync from ICS**, at the bottom of the lesson’s form or by ' +
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
            'With a plan, **Change** and the pencil **Edit the outline**, which opens ' +
            'the plan on its page, with this lesson alongside.',
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
            '**Completed**: before that it would come out without attendance and without a review.',
        },
        {
          termine: 'Substitution',
          testo:
            'A lesson taught in place of another teacher: with **Edit** on, open the lesson from ' +
            'the calendar and tick **Substitution**. Lessons marked this way, once **Completed**, end ' +
            'up on the **Documents** page, Teacher tab: the course sheet with those alone. Its PDF ' +
            'is remade on its own with the other course documents, also when a substitution changes.',
        },
      ],
      note: [
        'Completing a lesson remakes that lesson’s record and the course PDFs — attendance, ' +
          'grades, sheets — unless automatic remaking is turned off. It does not wait: the ' +
          'notice arrives when the files are ready.',
        '**Completed** does not take attendance for anyone: on a lesson without attendance it ' +
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
            'Someone arriving after the break has **X** in the first two periods and **R** in the ' +
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
            'right button, it opens the menu with every state. **R** exists only in the first ' +
            'period of the lesson and the first after a break: that is where someone arrives ' +
            'late; the row button doesn’t offer it. With the keyboard the arrows move from one ' +
            'box to the next; inside minutes and note they move the cursor.',
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
          'attendance taken goes into the percentages even if nobody completed it. ' +
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
            'not change on click: a click, like the right button, opens its menu. On the page the ticked ' +
            'cell shows the day, short: `07.09`; hovering shows it in full. The arrow keys move ' +
            'from cell to cell.',
        },
        {
          termine: 'Which day',
          testo:
            'From the page, if the course has a lesson today that is not concluded, the tick goes ' +
            'into that lesson; ' +
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
            'and a click or the right button opens their menu — where **Assign to the current ' +
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
            'are the “Aspects observed in class” in **Settings** › Teaching › Lists: out of the box ' +
            'participation, collaboration, respect for the rules, effort, independence. The ' +
            'arrows move from one box to the next.',
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
        cerca: 'search by date, number, objective',
        preparate: '18 of 24 prepared',
        conto: '18 of 24',
        ora1: '#1 · Thu 12.09',
        stato1: 'prepared · Fractions',
        ora2: '#2 · Thu 19.09',
        stato2: '20 min uncovered · Measuring',
        ora3: '#3 · Thu 26.09',
        stato3: 'no plan',
        nonAssegnati: 'Unassigned plans',
        campi: 'objectives · prerequisites',
        materia: 'Maths',
        semestre: '1st semester',
        bozza: 'draft from 02.09',
        ripasso: `${EN.tipiAttivita.ripasso} · 3 activities`,
        titoloEditor: 'Maths · 1st lesson',
        diCheCosaParla: 'What it is about',
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
            'At the top the navigator through the lessons of the chosen course; below, as ' +
            'wide as the page, the plan of the chosen lesson, laid over its periods. What ' +
            'you write is saved by itself.',
          legenda: [
            'The arrows move to the lesson before and the one after; from the keyboard ' +
              '**Alt+↑** and **Alt+↓**.',
            'The current lesson, with its status: a click opens the list of all lessons.',
            'How many lessons have an outline that fills them completely, and how many need ' +
              'adjusting.',
            'Objectives and prerequisites: what helps you find the plan again.',
            'A group of back-to-back periods, between one break and the next, with the free ' +
              'minutes.',
            'The line under each step: how much of its group it takes up.',
            'The break has its own row, with the minutes it lasts.',
          ],
        },
        {
          didascalia:
            'The navigator’s list: all the course’s lessons by semester, each with its ' +
            'status and the plan’s topic, and at the bottom the plans no lesson uses.',
          legenda: [
            'The search finds by date, number, objective or step; the arrow keys move ' +
              'through the list, **Enter** opens.',
            'The semester, with how many of its lessons are prepared.',
            'A prepared lesson: the outline fills the lesson exactly.',
            'A lesson to adjust says how many minutes are left uncovered, or run over.',
            'A lesson with no plan: once open, you create the plan or assign an existing one.',
            'The drafts and the plans left without a course, which no lesson uses.',
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
          termine: 'The page',
          testo:
            'At the top the navigator through the lessons of the course chosen in the ' +
            'drop-down above; below, the plan of the chosen lesson, as wide as the page. The ' +
            'header says how many lessons are still waiting for an outline.',
        },
        {
          termine: 'Preparing a lesson',
          testo:
            'A lesson with no plan shows **Create the plan**, which makes an empty one on ' +
            'the lesson’s course, assigns it and opens it, and **Assign an existing plan**, ' +
            'which picks among the course’s plans or makes a new one. From the lesson ' +
            'itself, **Assign a plan** does the same. Objectives and outline are written by ' +
            'whoever teaches: the register does not invent any.',
        },
        {
          termine: 'The navigator',
          testo:
            'The arrows ‹ › (**Previous lesson**, **Next lesson**) move from one lesson of ' +
            'the course to another; outside the fields **Alt+↑** and **Alt+↓** do too, ' +
            'because **Alt+←** and **Alt+→** stay the step back and forward between pages. ' +
            'In the middle the current lesson, “#3 · Thu 26.09”: a click opens the list of ' +
            'all lessons, by semester, each with its status — ✓ prepared, no plan, to adjust ' +
            'with the minutes uncovered or over, cancelled — and the plan’s topic. The box ' +
            'at the top searches by date, number, objective or step; ↑ ↓ move, **Enter** ' +
            'opens, **Esc** closes. At the bottom **Unassigned plans** gathers the drafts ' +
            'and the plans left without a course. Alongside, “18 of 24 prepared” counts the ' +
            'lessons whose outline fills the lesson exactly.',
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
            'A plan has no title: it has **Objectives** (one per line) and ' +
            '**Prerequisites**. That is what the search finds, and the first objective ' +
            'serves as the topic in the navigator’s list.',
        },
        {
          termine: 'The steps',
          testo:
            'Each step has a title, a type and a length **in minutes**, in blocks of 5 (at ' +
            'least 5): the “-5 min” and “+5 min” buttons change it by one block. The type is ' +
            'chosen by pressing its badge. They are reordered by dragging the handle, or ' +
            'with ↑ ↓ when the handle has focus. **Add activity** puts one at the end, ' +
            'already open. On the page this is saved at once; in the edit window only with ' +
            '**Save**.',
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
            'ends up under **Past the end of the lesson**. In the navigator’s list, “20 min ' +
            'uncovered” or “10 min over the lesson”.',
        },
        {
          termine: 'A step that is a test',
          testo:
            'In the details, **This step is a test**: title (empty means the step’s), type of ' +
            'test, weight from 0 to 10 — zero does not count towards the average. The real ' +
            'assessment is created in class, from the outline’s Test column.',
        },
        {
          termine: 'Pending items and checks',
          testo:
            'In a step’s details, **Dedicate to clearing pending items** links it to a ' +
            'submission of the course, or to all those of the lesson, and **Dedicate to a ' +
            'check** to one or more ticked columns of the check. Below the editor, **Pending items and checks of ' +
            'the course** lists the submissions still open and the check’s columns: **Insert ' +
            'into plan** adds a 5-minute step at the end to clear them, and “already in plan” ' +
            'marks those that have one. If the outline already has a step that checks the ' +
            'check, another column adds no new one: **Link to check step** checks it in that ' +
            'step. In the lesson, the outline’s **Pending items** and ' +
            '**Check** columns open what the step is meant to clear.',
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
            '**Duplicate** makes a copy, files included, to adapt. At the bottom of the ' +
            'navigator’s list **Unassigned plans** gathers the drafts and the plans left ' +
            'without a course, to reattach.',
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
          'the document, in Settings › Calendar › **School day**.',
        'An outline used by several lessons changes in all of them: to change just one, ' +
          'duplicate it. Assigning another plan to a lesson resets its ticks; removing a step ' +
          'removes its tick. **Delete** throws away the plan’s files too.',
        'Plans from before no longer have **Notes**: what was written there is at the ' +
          'end of the **Prerequisites**, after “Notes:”.',
      ],
    },
  },
})
