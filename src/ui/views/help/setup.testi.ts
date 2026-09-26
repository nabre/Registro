// I testi della guida, pagine dell'impianto: corsi, orario, classi,
// intestazione. Una chiave per sezione (`TestiSezione`, testa di `types.ts`);
// struttura in `setup.ts`.

import { catalogo } from '../../../i18n/index.js'
import { Molti, PERSONE, PIF, Uno, corto, del, il } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  corsi: {
    titolo: 'Corsi',
    sommario:
      'Quali corsi ci sono — una matrice di classi e materie — e, sotto, come sta andando ' +
      'quello scelto: le ore, i conti, l’orario.',
    scritte: {
      titolo: 'Corsi',
      periodo: 'i conti sono del periodo scelto',
      corso: 'I MEC A — Matematica',
      pif: corto(PIF),
      oreSvolte: 'ore svolte',
      udPreviste: 'UD previste',
      presenza: 'presenza',
      mediaValore: '4,6',
      media: 'media',
      piani: 'piani',
      martedi: 'mar 08:20–09:50 · 2 UD',
      giovedi: 'gio 13:30–15:00 · 2 UD',
      settimana: '4 UD a settimana',
      colAssenza: 'Assenza',
      colPresenza: 'Presenza',
      colUd: 'UD',
      colProve: 'Prove',
      colMedia: 'Media',
      colNota: 'Nota',
    },
    figure: [
      {
        didascalia:
          'In alto la scheda del corso con i suoi numeri e il suo orario, sotto una riga ' +
          `per ${PIF.singolare}. Tutto si conta sul periodo scelto in cima. Sopra, nella ` +
          'pagina, la matrice di classi e materie da cui il corso si apre.',
        legenda: [
          'Orario, nome e note; nuova lezione; il check del corso; le ore del corso e le loro ' +
            'scalette; elimina.',
          `${PIF.breve}, ore svolte, UD previste e a calendario, presenza sulle ore con appello, ` +
            'valutazioni, media, piani.',
          'L’orario fisso, con le UD della settimana.',
          `La tabella per ${PIF.singolare}: il nome apre la scheda personale.`,
        ],
      },
    ],
    voci: [
      {
        termine: 'La matrice',
        testo:
          'In cima, le classi dell’anno in colonna e le materie in riga: ogni incrocio è un ' +
          'corso. Una casella vuota si preme e il corso nasce, con il nome che si scrive da sé; ' +
          'una accesa, col colore del corso, si preme e il corso si apre qui sotto. Un corso ' +
          'senza lezioni si toglie dalla × che compare passandoci sopra, o dal tasto destro, ' +
          'che dice prima che cosa si porta via; uno con le ore no — prima si tolgono quelle. ' +
          'Dal tasto destro anche **Titolo e orario…**.',
      },
      {
        termine: 'Le materie, in riga',
        testo:
          'Ogni riga è una materia da scrivere lì: colore, sigla e nome si cambiano nel campo e ' +
          'si salvano uscendone, o con Invio (Esc torna com’era). La sigla vuota vale quella ' +
          'ricavata dal nome, che si legge in trasparenza. L’ultima riga ne fa una nuova: si ' +
          'scrive il nome e si preme Invio. Il cestino si accende solo per una materia che ' +
          'nessun corso usa; per una con i corsi, dal tasto destro **Unisci a un’altra ' +
          'materia…**.',
      },
      {
        termine: 'Quale corso',
        testo:
          'Quello aperto nella matrice, che è lo stesso della tendina **Corso** delle pagine del ' +
          'Registro: sceglierlo in un posto lo sceglie nell’altro. Se non se n’è scelto nessuno, ' +
          'il primo del periodo.',
      },
      {
        termine: 'Nuovo corso',
        testo:
          '**Nuovo corso**, nella riga delle azioni di Corsi: classe, materia, nome, ' +
          'ore fisse e note. Il nome si scrive da sé — «I MEC A — Matematica» — finché non lo ' +
          'si tocca, e il «+» accanto a Classe e Materia le crea sul momento.',
      },
      {
        termine: 'Il colore',
        testo:
          'Le ore di un corso, nel calendario e nella matrice, hanno il colore del corso: da sé ' +
          'è la media fra il colore della classe e quello della materia, così due materie ' +
          'della stessa classe restano parenti ma si distinguono. Nel modulo del corso ' +
          '**Un colore suo** ne sceglie uno a mano; tolta la spunta, torna la media.',
      },
      {
        termine: 'Classe e materia non si cambiano',
        testo:
          'Su un corso che esiste i due campi sono spenti: lezioni e voti sono di quella classe, ' +
          'i piani seguono quella materia. Per cambiarli si fa un corso nuovo.',
      },
      {
        termine: 'I numeri',
        testo:
          `${Molti(PIF)} che frequentano, ore svolte su quelle a calendario (un’ora passata ` +
          'conta come svolta), UD previste dall’orario e già a calendario, le annullate se ce ' +
          'ne sono, presenza sulle ore con appello, UD di assenza, valutazioni, media — «media ' +
          'di 18 su 22» quando non tutti hanno un voto — e piani.',
      },
      {
        termine: 'La scheda del corso',
        testo:
          'La matita apre il modulo del corso; il calendario una nuova lezione; la spunta porta ' +
          'al check del corso; il piano alle ore del corso e alle loro scalette; il cestino ' +
          'elimina il corso. Se il corso ha un check, sotto la tabella c’è la sua griglia, con ' +
          'lo stesso clic della pagina Check. La data dopo ' +
          '«Prossima ora» si preme e apre quell’ora. La riga «Lezione ricorrente» dice le ore ' +
          'fisse del corso, o «nessuna»: l’orario si dichiara da **Titolo e orario…**, col ' +
          'tasto destro sulla casella del corso nella matrice.',
      },
      {
        termine: `La tabella per ${PIF.singolare}`,
        testo:
          'Assenza, Presenza, UD di assenza, UD seguite, UD del corso, Ritardi, Segnato — le ' +
          'caselle della matrice del comportamento —, Prove, Media, Nota, e Check se il corso ne ' +
          'ha uno: quante colonne sono fatte, su quante. L’assenza è verde fino ' +
          'al 10%, gialla fino al 20%, rossa oltre; rossa comunque sopra la soglia di assenza di ' +
          'Impostazioni › Didattica › **Valutazione**.',
      },
      {
        termine: 'Le materie',
        testo:
          'Stanno in Impostazioni › Didattica › **Materie**: nome, sigla (`MAT`), colore. ' +
          'Scrivendo un nome che somiglia a uno che c’è, il modulo chiede se è la stessa materia ' +
          'scritta due volte.',
      },
      {
        termine: 'Unire due materie',
        testo:
          'L’icona di copia accanto a una materia — «Unisci questa materia a un’altra» — la ' +
          'fonde in un’altra: corsi e piani passano a ' +
          'quella che resta, e se due corsi della stessa classe diventano uguali si fondono con ' +
          'le loro lezioni. È il rimedio al doppione, e non perde niente.',
      },
      {
        termine: 'Da qui non esce niente',
        testo:
          'Presenze, valutazioni, schede, verbali e CSV stanno tutti in **Documenti**. Qui si ' +
          'tiene il corso, di là lo si consegna.',
      },
    ],
    note: [
      'Le percentuali della tabella sono sulle UD che l’orario prevede nel periodo, non su ' +
        'quelle già a calendario: è lo stesso conto del rapporto da consegnare, così il ' +
        'numero vero non si scopre al momento di stampare.',
      'Eliminare un corso — o la sua materia — porta via le sue lezioni e le sue ' +
        'valutazioni. La domanda di conferma elenca che cosa se ne va e che cosa resta staccato.',
    ],
  },
  orario: {
    titolo: 'Orario fisso e lezioni',
    sommario:
      'Le ore che un corso fa ogni settimana, e come diventano lezioni sul calendario.',
    scritte: {
      oreFisse: 'Ore fisse in settimana',
      giorno: 'mer',
      dueUd: '2 UD',
      settimana: '4 UD a settimana',
      genera: 'Genera le lezioni',
      senzaLezione: 'Giorni senza lezione',
      ceGia: 'c’è già',
      vacanze: 'vacanze',
    },
    figure: [
      {
        didascalia:
          'Le fasce di un giorno sono incatenate; **Genera le lezioni** le ripete ogni settimana ' +
          'fra due date, saltando quel che c’è già e i giorni senza lezione.',
        legenda: [
          'La prima fascia del giorno: la sua ora d’inizio è l’unica che si scrive.',
          'Le fasce dopo cominciano dove finisce quella sopra — dopo la pausa, se ce n’è una in ' +
            'mezzo —: il campo è spento.',
          '**Genera le lezioni** mette sul calendario le ore fra **Dal** e **Al**.',
          'Un’ora che c’è già — stesso giorno, stessa ora d’inizio — resta com’è.',
          'Le vacanze e i giorni di chiusura dell’anno si saltano.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Dove si scrive',
        testo:
          'Nel modulo del corso, sotto «Ore fisse in settimana»: la matita della scheda in ' +
          'Corsi, o **Titolo e orario…** col tasto destro sulla casella del corso nella ' +
          'matrice. La scheda dice nella riga «Lezione ricorrente» se ce n’è una.',
      },
      {
        termine: 'Una fascia',
        testo:
          'Giorno, ora d’inizio, durata in UD e aula. Quanto dura un’UD lo dice il documento, in ' +
          'Impostazioni › Anno e orario › **Calendario**: di serie 45 minuti. Accanto si legge ' +
          'a che ora finisce, pause della giornata comprese; in fondo le UD della settimana.',
      },
      {
        termine: 'Aggiungi una fascia',
        testo:
          'Ne mette una in coda all’ultimo giorno, attaccata. La prima di tutte prende ora e ' +
          'durata proposte da Impostazioni › Anno e orario › **Calendario**.',
      },
      {
        termine: 'Ripeti questa fascia in un altro giorno',
        testo:
          'Il pulsante di copia di una riga: la stessa ora, durata e aula sul primo giorno ' +
          'dopo il suo che non ha ancora fasce, ripartendo da lunedì dopo la domenica.',
      },
      {
        termine: 'Cambiare l’ordine o il giorno',
        testo:
          'Si trascina la riga per la presa, o con ↑ e ↓ sulla presa. Portata fra le fasce di ' +
          'un altro giorno, la fascia passa a quel giorno; cambiando la tendina del giorno va ' +
          'in coda a quel giorno.',
      },
      {
        termine: 'Genera le lezioni',
        testo:
          'Sotto «Lezioni sul calendario», fra **Dal** — oggi, se l’anno è già cominciato — e ' +
          '**Al**, la fine dell’anno. Su un corso nuovo lo fa la spunta «Genera le lezioni ' +
          'appena creato il corso»; su uno che esiste il pulsante, che prima salva l’orario.',
      },
      {
        termine: 'Si rilancia senza pensarci',
        testo:
          'Aggiunge solo le ore che mancano, e lo dice: quante aggiunte, quante c’erano già, ' +
          'quante si accavallano a un’altra classe. Quelle in conflitto si mettono lo stesso.',
      },
      {
        termine: 'Il monte ore',
        testo:
          'Le UD che l’orario prevede nel periodo, tolte le vacanze e le ore annullate, sono il ' +
          'cento per cento su cui si contano le assenze. Un corso senza orario non ne ha.',
      },
    ],
    note: [
      'Cambiare l’orario non sposta né toglie le lezioni già generate: quelle dell’orario ' +
        'vecchio restano sul calendario, e si tolgono a mano.',
      'Una giornata è un seguito: la seconda fascia comincia quando finisce la prima, o ' +
        'quando finisce la pausa che le sta in mezzo. Per questo si dichiara solo l’ora ' +
        'd’ingresso, e allungare una fascia spinge avanti quelle dietro invece di farle ' +
        'accavallare.',
      'Le fasce si contano in UD, non in minuti. Se il documento cambia la durata dell’UD, ' +
        'ogni fascia tiene il suo numero di UD e si allunga o si accorcia con lei; appena ' +
        'un’ora ha l’appello, la durata non si cambia più.',
    ],
  },
  classi: {
    titolo: 'Classi',
    sommario: `L’anagrafica delle ${PIF.plurale}: chi sono e come le si raggiunge.`,
    scritte: {
      titolo: `Classi e ${PIF.plurale}`,
      mappa: 'Mappa',
      elimina: 'Elimina la classe…',
      docenteClasse: 'Sono docente di classe',
      archiviata: 'Archiviata',
      gruppo: `18 ${corto(PIF)} · Matematica`,
      pif: corto(PIF),
      nascita: 'Nascita',
      datore: corto(PERSONE.datore),
    },
    figure: [
      {
        didascalia:
          'La classe si sceglie dalla tendina **Classe** nella barra in alto, dopo **Periodo**, ' +
          'come nelle altre pagine: qui sotto i suoi comandi e la sua anagrafica.',
        legenda: [
          `La classe scelta, con quante ${PIF.plurale} e quali materie; le archiviate ` +
            'in fondo alla tendina.',
          'Nella riga delle azioni **Aggiungi al gruppo**, **Incolla elenco** e **Importa ' +
            'classe dall’anno…**; nella pagina, il riquadro **Dettagli**.',
          'Una riga per persona: il nome apre la scheda personale, la matita il modulo.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Nuova classe',
        testo:
          '**Nuova classe**, nella riga delle azioni di Classi e di Corsi: nome, materia ' +
          'insegnata — scelta, fa nascere il corso —, sede, colore nel calendario, note.',
      },
      {
        termine: 'I dettagli',
        testo:
          'In cima alla pagina: colore, nome, **Sono docente di classe** — che accende il ' +
          'gruppo omonimo nella barra laterale —, **Archiviata** e note. Ogni campo si salva ' +
          'uscendone; Esc torna com’era. **Elimina la classe…** dice prima che cosa si porta ' +
          'via. Le materie della classe si danno dalla matrice di **Corsi**.',
      },
      {
        termine: 'Archiviata',
        testo:
          'La classe resta nello storico ma sparisce dalle tendine; in Classi scende in fondo ' +
          'con la scritta «archiviata».',
      },
      {
        termine: 'Che cosa c’è',
        testo:
          'Una riga per persona: nome, nascita, indirizzo, e-mail, ' +
          `${il(PERSONE.azienda)} — nella colonna «${Uno(PERSONE.datore)}» —, indirizzo ed ` +
          `e-mail ${del(PERSONE.datore)}. Le e-mail si premono e aprono la posta.`,
      },
      {
        termine: `Aggiungi ${PIF.singolare}`,
        testo:
          'Una alla volta, in quattro parti: chi è, come la si raggiunge, ' +
          `${il(PERSONE.rappresentante)} e ${il(PERSONE.azienda)}. La foto si aggiunge dopo il ` +
          'primo salvataggio, e vale subito.',
      },
      {
        termine: 'Incolla elenco',
        testo:
          'Una riga per persona: «Rossi Mario», «Rossi, Mario», o colonne copiate da un foglio ' +
          'di calcolo, con l’e-mail dove si vuole. I nomi già presenti si saltano, anche scritti ' +
          '«Muller» invece di «Müller».',
      },
      {
        termine: 'L’indirizzo a pezzi',
        testo:
          'Via e numero, NAP, località, presso, casella postale, paese: separati, perché la ' +
          'mappa e le buste li vogliono separati.',
      },
      {
        termine: 'I telefoni',
        testo:
          `Quanti se ne vogliono, ${del(PIF)}, ${del(PERSONE.rappresentante)} e ` +
          `${del(PERSONE.datore)}, ognuno con la sua etichetta. Il primo è quello stampato sui ` +
          'fogli: l’ordine si cambia trascinando la riga.',
      },
      {
        termine: 'Un ritiro non cancella',
        testo:
          `Togliendo la spunta «Frequenta» ${il(PIF)} esce dagli appelli ma resta nello ` +
          'storico, con la scritta «non frequenta»: presenze e voti restano leggibili.',
      },
      {
        termine: 'Importa classe dall’anno…',
        testo:
          'Una classe di un altro anno portata in questo: si sceglie l’anno fra i documenti ' +
          'recenti, poi la classe e il nome che avrà qui. **Anagrafica e foto**, accesa, porta ' +
          `le ${PIF.plurale} con i loro dati e le foto; spenta, la classe arriva vuota. **Corsi ` +
          'e materie**, spenta di partenza, accesa porta anche i corsi con il loro orario: una ' +
          'materia che qui ha ' +
          'lo stesso nome si usa quella, le altre si aggiungono. Lezioni, voti e piani restano ' +
          'nell’altro anno, che si legge soltanto: non si apre e non cambia.',
      },
      {
        termine: 'Tutte le classi di un altro registro',
        testo:
          '**File › Importa da un altro registro…** le porta insieme, una casella per classe, ' +
          'con le materie, le impostazioni e se si vuole i piani e i calendari. Le classi ' +
          'tengono il nome di là; una che qui c’è già con lo stesso nome si salta, e l’esito ' +
          'lo dice.',
      },
      {
        termine: 'Le altre azioni',
        testo:
          'Qui la riga delle azioni ha **Nuova classe**, **Aggiungi al gruppo**, **Incolla ' +
          'elenco** e **Importa classe dall’anno…**. **Nuova comunicazione** e **Nuovo periodo ' +
          'assenze** stanno nella scheda a tutta pagina di una persona e nel pannello del ' +
          'docente di classe; i corsi si aprono dalla matrice di **Corsi**.',
      },
    ],
    note: [
      `**Togli dalla classe**, nel modulo ${del(PIF)}, porta via anche presenze e voti; ` +
        '**Elimina la classe…**, nei Dettagli, porta via corsi, lezioni, voti e fascicolo. ' +
        'Per tenere lo storico si toglie «Frequenta», o si archivia.',
      'La foto è una copia, messa nella cartella dell’anno: il file d’origine si può ' +
        'cancellare. Servono JPEG o PNG, i due formati che finiscono nei PDF.',
    ],
  },
  intestazione: {
    titolo: 'Intestazione dei fogli',
    sommario:
      'Impostazioni › Documenti e stampa › **Intestazione**: chi firma e le **carte ' +
      'intestate** — la scuola e il logo in cima ai fogli —, con i corsi che stampano su ' +
      'ognuna. Stanno dentro il documento dell’anno.',
    scritte: {
      impostazioni: 'Impostazioni',
      guida: 'Guida',
      chiFirma: 'Chi firma',
      nome: 'Nome Cognome',
      scuolaA: 'Scuola A',
      predefinita: 'predefinita',
      matematica: 'Matematica',
      fisica: 'Fisica',
      scuolaB: 'Scuola B',
      storia: 'Storia',
    },
    figure: [
      {
        didascalia:
          'Due carte per due scuole: un corso trascinato dall’una all’altra stampa da lì in poi ' +
          'sulla carta nuova.',
        legenda: [
          'Chi firma: uno solo, in fondo a ogni foglio di tutte le carte.',
          'Una carta: il nome della scuola e il logo. La prima è la predefinita.',
          'I corsi della carta, raggruppati per classe: si trascinano su un’altra carta.',
          'Un foglio di un corso: in cima la scuola e il logo della sua carta, in fondo chi ' +
            'firma.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Chi firma',
        testo:
          'Il nome del docente: va in fondo a sinistra di ogni pagina, qualunque sia la carta, ' +
          'e nella firma di serie delle e-mail. È uno solo per tutto il documento.',
      },
      {
        termine: 'Carta intestata',
        testo:
          'Una scuola con il suo logo. Chi insegna in una scuola sola ne ha una e basta; chi ' +
          'insegna anche altrove — un corso serale, un modulo per un altro istituto — ne ' +
          'aggiunge una con **Nuova carta intestata**, e i fogli di quei corsi escono con ' +
          'l’altra testata.',
      },
      {
        termine: 'Nome della scuola',
        testo:
          'Va in cima a ogni foglio dei corsi di quella carta. Lasciato vuoto, quella riga ' +
          'sparisce.',
      },
      {
        termine: 'Logo della scuola',
        testo:
          '**Carica il logo…** chiede un PNG o un JPEG e lo copia dentro il documento: il file ' +
          'd’origine si può cancellare. Va in alto a destra sui fogli della carta. Con un logo ' +
          'già caricato, accanto alla miniatura ci sono **Sostituisci…** e **Togli**.',
      },
      {
        termine: 'Altezza del logo',
        testo:
          'In millimetri, da 6 a 40, carta per carta: la larghezza segue le proporzioni ' +
          'dell’immagine. Di serie 14.',
      },
      {
        termine: 'Quale corso su quale carta',
        testo:
          'Ogni corso sta su una carta e su **una sola**: non può restarne senza, né stare su ' +
          'due. Dentro ogni carta i corsi sono raggruppati per classe. Si spostano ' +
          '**trascinandoli** sulla zona dei corsi di un’altra carta; il nome di una classe si ' +
          'trascina e porta con sé tutti i suoi corsi di quella carta.',
      },
      {
        termine: 'Scegliere più corsi',
        testo:
          'Un clic sceglie un corso; **Ctrl**+clic ne aggiunge o ne toglie uno, ' +
          '**Maiuscolo**+clic prende tutti quelli in mezzo. Trascinandone uno scelto partono ' +
          'tutti gli scelti. Esc toglie la scelta.',
      },
      {
        termine: 'Sposta in…',
        testo:
          'Il pulsante accanto a ogni corso e a ogni classe: elenca le altre carte, e fa quel ' +
          'che farebbe il trascinamento. È la via da tastiera.',
      },
      {
        termine: 'La carta predefinita',
        testo:
          'È la prima. I corsi nuovi ci arrivano da soli, e ci stampano i fogli di una classe i ' +
          'cui corsi stanno su carte diverse — il fascicolo, la foto della classe.',
      },
      {
        termine: 'Elimina carta',
        testo:
          'Il cestino in cima alla carta. I suoi corsi passano alla prima carta rimasta, e se ' +
          'ce n’erano il registro lo dice prima. L’ultima carta non si elimina.',
      },
      {
        termine: 'La firma delle e-mail',
        testo:
          'Sta anche lei nel documento, ma si scrive in Impostazioni › **Comunicazioni**, con ' +
          'la posta. Lasciata vuota vale quella di serie: chi firma e la scuola della prima ' +
          'carta.',
      },
    ],
    note: [
      'Le carte, loghi compresi, stanno dentro il file `.regi` e viaggiano con lui: chi ' +
        'apre lo stesso documento su un altro computer trova gli stessi fogli. Com’è fatto il ' +
        'resto del foglio — misure, tabelle, frasi — lo decidono i modelli, che sono del ' +
        'programma e si aggiornano con lui.',
      'Ogni carta mostra i corsi dell’anno in uso; quelli degli anni passati restano dove ' +
        'sono, e la carta ne dice solo il numero.',
      'Un documento che aveva accanto la vecchia cartella `templates/` se la fa leggere una ' +
        'volta, all’apertura: la sede, il nome, il logo e la firma scritti lì passano qui. Da ' +
        'allora la cartella non conta più.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    corsi: {
      titolo: 'Kurse',
      sommario:
        'Welche Kurse es gibt — eine Matrix aus Klassen und Fächern — und darunter, wie es ' +
        'dem gewählten Kurs geht: die Stunden, die Zahlen, der Stundenplan.',
      scritte: {
        titolo: 'Kurse',
        periodo: 'die Zahlen gelten für den gewählten Zeitraum',
        corso: 'I MEC A — Mathematik',
        pif: corto(DE.pif),
        oreSvolte: 'gehalten',
        udPreviste: 'Lekt. Soll',
        presenza: 'Präsenz',
        mediaValore: '4.6',
        media: 'Schnitt',
        piani: 'Pläne',
        martedi: 'Di 08:20–09:50 · 2 Lekt.',
        giovedi: 'Do 13:30–15:00 · 2 Lekt.',
        settimana: '4 Lekt. pro Woche',
        colAssenza: 'Absenz',
        colPresenza: 'Anwesenheit',
        colUd: corto(DE.unitaDidattica),
        colProve: 'Prüf.',
        colMedia: 'Schnitt',
        colNota: corto(DE.nota),
      },
      figure: [
        {
          didascalia:
            'Oben die Kursübersicht mit seinen Zahlen und seinem Stundenplan, darunter eine ' +
            'Zeile pro Lernende. Gezählt wird alles über den oben gewählten Zeitraum. Darüber, ' +
            'auf der Seite, die Matrix aus Klassen und Fächern, aus der sich der Kurs öffnet.',
          legenda: [
            'Stundenplan, Name und Notizen; neue Stunde; der Check des Kurses; die ' +
              'Stunden des Kurses und ihr Ablauf; löschen.',
            `${DE.pif.breve}, gehaltene Stunden, geplante und eingetragene Lektionen, Präsenz ` +
              'in den Stunden mit Präsenzkontrolle, Beurteilungen, Durchschnitt, Pläne.',
            'Der feste Stundenplan, mit den Lektionen der Woche.',
            'Die Tabelle pro Lernende: Der Name öffnet das Personenblatt.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Die Matrix',
          testo:
            'Oben die Klassen des Schuljahrs in Spalten und die Fächer in Zeilen: Jeder ' +
            'Schnittpunkt ist ein Kurs. Ein Klick auf ein leeres Feld legt den Kurs an, mit ' +
            'einem Namen, der sich selbst schreibt; ein Klick auf ein farbiges Feld öffnet den ' +
            'Kurs hier unten. Ein Kurs ohne Stunden verschwindet über das ×, das beim ' +
            'Darüberfahren erscheint, oder über die rechte Maustaste, die vorher sagt, was ' +
            'mitgeht; einer mit Stunden nicht — zuerst müssen die weg. Über die rechte ' +
            'Maustaste auch **Titel und Stundenplan…**.',
        },
        {
          termine: 'Die Fächer, in Zeilen',
          testo:
            'Jede Zeile ist ein Fach, das man direkt dort schreibt: Farbe, Kürzel und Name ' +
            'ändert man im Feld und speichert sie beim Verlassen oder mit Enter (Esc stellt ' +
            'den alten Wert wieder her). Ein leeres Kürzel gilt als das aus dem Namen ' +
            'abgeleitete, das blass zu lesen ist. Die letzte Zeile legt ein neues an: Namen ' +
            'schreiben und Enter drücken. Der Papierkorb ist nur für ein Fach aktiv, das kein ' +
            'Kurs verwendet; für eines mit Kursen über die rechte Maustaste **Mit einem ' +
            'anderen Fach zusammenführen…**.',
        },
        {
          termine: 'Welcher Kurs',
          testo:
            'Der in der Matrix geöffnete, derselbe wie in der Auswahl **Kurs** auf den Seiten ' +
            'des Klassenbuchs: Wählt man ihn an einem Ort, ist er am anderen auch gewählt. Ist ' +
            'keiner gewählt, der erste des Zeitraums.',
        },
        {
          termine: 'Neuer Kurs',
          testo:
            '**Neuer Kurs** in der Aktionsleiste von Kurse: Klasse, Fach, Name, feste Stunden ' +
            'und Notizen. Der Name schreibt sich selbst — «I MEC A — Mathematik» —, bis man ' +
            'ihn anrührt, und das «+» neben Klasse und Fach legt sie sofort an.',
        },
        {
          termine: 'Die Farbe',
          testo:
            'Die Stunden eines Kurses haben im Kalender und in der Matrix die Farbe des ' +
            'Kurses: von selbst die Mitte zwischen der Farbe der Klasse und der des Fachs, so ' +
            'bleiben zwei Fächer derselben Klasse verwandt und doch unterscheidbar. Im ' +
            'Kursformular wählt man mit **Eine eigene Farbe** eine von Hand; ohne Häkchen gilt wieder die ' +
            'Mitte.',
        },
        {
          termine: 'Klasse und Fach bleiben',
          testo:
            'Bei einem bestehenden Kurs sind die beiden Felder gesperrt: Stunden und Noten ' +
            'gehören zu dieser Klasse, die Pläne folgen diesem Fach. Um sie zu ändern, legt man ' +
            'einen neuen Kurs an.',
        },
        {
          termine: 'Die Zahlen',
          testo:
            `${Molti(DE.pif)}, die den Kurs besuchen, gehaltene Stunden von denen im Kalender ` +
            '(eine vergangene Stunde zählt als gehalten), laut Stundenplan geplante und schon ' +
            'eingetragene Lektionen, die ausgefallenen, falls es welche gibt, Präsenz in den ' +
            'Stunden mit Präsenzkontrolle, Absenzlektionen, Beurteilungen, Durchschnitt — ' +
            '«Durchschnitt von 18 aus 22», wenn nicht alle eine Note haben — und Pläne.',
        },
        {
          termine: 'Die Kursübersicht',
          testo:
            'Der Stift öffnet das Kursformular; der Kalender eine neue Stunde; das ' +
            'Häkchen führt zum Check des Kurses; der Plan zu den Stunden des Kurses und ihrem ' +
            'Ablauf; der Papierkorb löscht den Kurs. Hat der Kurs einen Check, steht unter der ' +
            'Tabelle sein Raster, mit demselben Klick wie auf der Seite Check. Das Datum nach ' +
            '«Nächste Stunde» ist anklickbar und öffnet diese Stunde. Die Zeile ' +
            '«Regelmässiger Unterricht» nennt die festen Stunden des Kurses, oder «keine»: ' +
            'Den Stundenplan legt man über **Titel und Stundenplan…** fest, mit der rechten ' +
            'Maustaste auf dem Feld des Kurses in der Matrix.',
        },
        {
          termine: 'Die Tabelle pro Lernende',
          testo:
            'Absenz, Anwesenheit, Lekt. abwesend, Lekt. besucht, Lekt. des Kurses, ' +
            'Verspätungen, Markiert — die Felder der Verhaltensmatrix —, Prüfungen, ' +
            'Durchschnitt, Note, und Check, wenn der Kurs einen hat: wie viele Spalten erledigt ' +
            'sind, von wie vielen. Die Absenz ist grün bis 10 %, gelb bis 20 %, darüber rot; ' +
            'rot in jedem Fall über der Absenzgrenze unter Einstellungen › Unterricht › ' +
            '**Beurteilung**.',
        },
        {
          termine: 'Die Fächer',
          testo:
            'Sie stehen unter Einstellungen › Unterricht › **Fächer**: Name, Kürzel (`MAT`), ' +
            'Farbe. Wer einen Namen schreibt, der einem vorhandenen ähnelt, wird gefragt, ob es ' +
            'dasselbe Fach ist, zweimal geschrieben.',
        },
        {
          termine: 'Zwei Fächer zusammenführen',
          testo:
            'Das Kopiersymbol neben einem Fach — «Dieses Fach mit einem anderen ' +
            'zusammenführen» — verschmilzt es mit einem anderen: Kurse und Pläne gehen an das, ' +
            'das bleibt, und werden zwei Kurse derselben Klasse gleich, verschmelzen sie mit ' +
            'ihren Stunden. Das ist das Mittel gegen Doppelte, und es geht nichts verloren.',
        },
        {
          termine: 'Hier geht nichts hinaus',
          testo:
            'Präsenzen, Beurteilungen, Blätter, Protokolle und CSV liegen alle unter ' +
            '**Dokumente**. Hier führt man den Kurs, dort gibt man ihn ab.',
        },
      ],
      note: [
        'Die Prozente der Tabelle beziehen sich auf die Lektionen, die der Stundenplan im ' +
          'Zeitraum vorsieht, nicht auf die schon eingetragenen: Es ist dieselbe Rechnung wie ' +
          'im abzugebenden Bericht, so erlebt man beim Drucken keine Überraschung.',
        'Wer einen Kurs löscht — oder sein Fach —, löscht seine Stunden und seine ' +
          'Beurteilungen mit. Die Rückfrage zählt auf, was verschwindet und was losgelöst ' +
          'zurückbleibt.',
      ],
    },
    orario: {
      titolo: 'Fester Stundenplan und Stunden',
      sommario:
        'Die Stunden, die ein Kurs jede Woche hat, und wie sie zu Stunden im Kalender werden.',
      scritte: {
        oreFisse: 'Feste Wochenstunden',
        giorno: 'Mi',
        dueUd: '2 Lekt.',
        settimana: '4 Lekt. pro Woche',
        genera: 'Stunden erzeugen',
        senzaLezione: 'Tage ohne Unterricht',
        ceGia: 'schon da',
        vacanze: 'Ferien',
      },
      figure: [
        {
          didascalia:
            'Die Zeitfenster eines Tages hängen aneinander; **Stunden erzeugen** wiederholt sie ' +
            'jede Woche zwischen zwei Daten und überspringt, was schon da ist, und die ' +
            'Tage ohne Unterricht.',
          legenda: [
            'Das erste Zeitfenster des Tages: Seine Anfangszeit ist die einzige, die man ' +
              'schreibt.',
            'Die folgenden beginnen, wo das obere endet — nach der Pause, wenn eine ' +
              'dazwischenliegt —: Das Feld ist gesperrt.',
            '**Stunden erzeugen** trägt die Stunden zwischen **Von** und **Bis** in den ' +
              'Kalender ein.',
            'Eine Stunde, die es schon gibt — gleicher Tag, gleiche Anfangszeit —, bleibt, ' +
              'wie sie ist.',
            'Ferien und Schliesstage des Schuljahrs werden übersprungen.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Wo man ihn einträgt',
          testo:
            'Im Kursformular, unter «Feste Wochenstunden»: der Stift der Kursübersicht unter Kurse, ' +
            'oder **Titel und Stundenplan…** mit der rechten Maustaste auf dem Feld des Kurses ' +
            'in der Matrix. Die Kursübersicht sagt in der Zeile «Regelmässiger Unterricht», ob es ' +
            'einen gibt.',
        },
        {
          termine: 'Ein Zeitfenster',
          testo:
            'Tag, Anfangszeit, Dauer in Lektionen und Zimmer. Wie lange eine Lektion dauert, ' +
            'sagt das Dokument, unter Einstellungen › Schuljahr und Stundenplan › ' +
            '**Kalender**: standardmässig 45 Minuten. Daneben liest man, wann es endet, Pausen ' +
            'des Tages eingerechnet; unten die Lektionen der Woche.',
        },
        {
          termine: 'Zeitfenster hinzufügen',
          testo:
            'Hängt eines ans Ende des letzten Tages an. Das allererste nimmt Zeit und Dauer, die ' +
            'Einstellungen › Schuljahr und Stundenplan › **Kalender** vorschlägt.',
        },
        {
          termine: 'Dieses Zeitfenster an einem anderen Tag wiederholen',
          testo:
            'Die Kopierschaltfläche einer Zeile: dieselbe Zeit, Dauer und dasselbe Zimmer am ' +
            'ersten Tag danach, der noch keine Zeitfenster hat, nach Sonntag wieder ab Montag.',
        },
        {
          termine: 'Reihenfolge oder Tag ändern',
          testo:
            'Man zieht die Zeile am Griff, oder mit ↑ und ↓ auf dem Griff. Zwischen die ' +
            'Zeitfenster eines anderen Tages gezogen, wechselt das Zeitfenster zu diesem Tag; ' +
            'wechselt man die Auswahl des Tages, kommt es ans Ende dieses Tages.',
        },
        {
          termine: 'Stunden erzeugen',
          testo:
            'Unter «Stunden im Kalender», zwischen **Von** — heute, wenn das Schuljahr ' +
            'schon begonnen hat — und **Bis**, dem Ende des Schuljahrs. Bei einem neuen Kurs ' +
            'erledigt das das Häkchen «Stunden gleich beim Erstellen des Kurses erzeugen»; ' +
            'bei einem bestehenden die Schaltfläche, die vorher den Stundenplan speichert.',
        },
        {
          termine: 'Man startet es unbesorgt neu',
          testo:
            'Es fügt nur die fehlenden Stunden hinzu und sagt es: wie viele hinzugefügt, wie ' +
            'viele schon da waren, wie viele sich mit einer anderen Klasse überschneiden. Die ' +
            'mit Konflikt werden trotzdem eingetragen.',
        },
        {
          termine: 'Das Stundensoll',
          testo:
            'Die Lektionen, die der Stundenplan im Zeitraum vorsieht, ohne Ferien und ' +
            'ausgefallene Stunden, sind die hundert Prozent, an denen die Absenzen gemessen ' +
            'werden. Ein Kurs ohne Stundenplan hat keines.',
        },
      ],
      note: [
        'Den Stundenplan ändern verschiebt oder entfernt die schon erzeugten Stunden nicht: ' +
          'Die des alten Stundenplans bleiben im Kalender und werden von Hand entfernt.',
        'Ein Tag ist eine Folge: Das zweite Zeitfenster beginnt, wenn das erste endet, oder ' +
          'wenn die Pause dazwischen endet. Deshalb gibt man nur die Anfangszeit an, und ein ' +
          'verlängertes Zeitfenster schiebt die folgenden nach hinten, statt sie zu ' +
          'überschneiden.',
        'Zeitfenster zählen in Lektionen, nicht in Minuten. Ändert das Dokument die Dauer ' +
          'einer Lektion, behält jedes Zeitfenster seine Zahl an Lektionen und wird mit ihr ' +
          'länger oder kürzer; sobald eine Stunde eine Präsenzkontrolle hat, lässt sich die ' +
          'Dauer nicht mehr ändern.',
      ],
    },
    classi: {
      titolo: 'Klassen',
      sommario: `Die Personalien der ${DE.pif.plurale}: wer sie sind und wie man sie erreicht.`,
      scritte: {
        titolo: `Klassen und ${DE.pif.plurale}`,
        mappa: 'Karte',
        elimina: 'Klasse löschen…',
        docenteClasse: 'Ich bin Klassenlehrperson',
        archiviata: 'Archiviert',
        gruppo: `18 ${corto(DE.pif)} · Mathematik`,
        pif: corto(DE.pif),
        nascita: 'Geburtsdatum',
        datore: corto(DE.datore),
      },
      figure: [
        {
          didascalia:
            'Die Klasse wählt man in der Auswahl **Klasse** in der oberen Leiste, nach ' +
            '**Zeitraum**, wie auf den anderen Seiten: darunter ihre Befehle und ihre ' +
            'Personalien.',
          legenda: [
            `Die gewählte Klasse, mit der Zahl der ${DE.pif.plurale} und ihren Fächern; die ` +
              'archivierten ganz unten in der Auswahl.',
            'In der Aktionsleiste **Zur Gruppe hinzufügen**, **Liste einfügen** und **Klasse ' +
              'aus einem Jahr importieren…**; auf der Seite das Feld **Details**.',
            'Eine Zeile pro Person: Der Name öffnet das Personenblatt, der Stift das ' +
              'Formular.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Neue Klasse',
          testo:
            '**Neue Klasse** in der Aktionsleiste von Klassen und von Kurse: Name, ' +
            'unterrichtetes Fach — gewählt, entsteht daraus der Kurs —, Schulort, Farbe im ' +
            'Kalender, Notizen.',
        },
        {
          termine: 'Die Details',
          testo:
            'Oben auf der Seite: Farbe, Name, **Ich bin Klassenlehrperson** — schaltet die ' +
            'gleichnamige Gruppe in der Seitenleiste ein —, **Archiviert** und Notizen. Jedes ' +
            'Feld speichert sich beim Verlassen; Esc stellt den alten Wert wieder her. ' +
            '**Klasse löschen…** sagt vorher, was mitgeht. Die Fächer der Klasse vergibt man ' +
            'in der Matrix unter **Kurse**.',
        },
        {
          termine: 'Archiviert',
          testo:
            'Die Klasse bleibt in der Geschichte, verschwindet aber aus den Auswahllisten; ' +
            'unter Klassen rutscht sie nach unten, mit dem Vermerk «archiviert».',
        },
        {
          termine: 'Was darin steht',
          testo:
            'Eine Zeile pro Person: Name, Geburtsdatum, Adresse, E-Mail, ' +
            `${DE.azienda.singolare} — in der Spalte «${Uno(DE.datore)}» —, Adresse und ` +
            `E-Mail des ${DE.datore.singolare}s. Die E-Mail-Adressen sind anklickbar und ` +
            'öffnen das Mailprogramm.',
        },
        {
          termine: `${Uno(DE.pif)} hinzufügen`,
          testo:
            'Eine nach der anderen, in vier Teilen: wer sie ist, wie man sie erreicht, ' +
            `${DE.rappresentante.singolare} und ${DE.azienda.singolare}. Das Foto kommt nach ` +
            'dem ersten Speichern dazu und gilt sofort.',
        },
        {
          termine: 'Liste einfügen',
          testo:
            'Eine Zeile pro Person: «Rossi Mario», «Rossi, Mario», oder aus einer ' +
            'Tabellenkalkulation kopierte Spalten, mit der E-Mail, wo man will. Vorhandene ' +
            'Namen werden übersprungen, auch wenn sie «Muller» statt «Müller» geschrieben sind.',
        },
        {
          termine: 'Die Adresse in Teilen',
          testo:
            'Strasse und Nummer, PLZ, Ort, c/o, Postfach, Land: getrennt, weil die Karte und ' +
            'die Briefumschläge sie getrennt wollen.',
        },
        {
          termine: 'Die Telefonnummern',
          testo:
            `So viele man will, für ${DE.pif.singolare}, ${DE.rappresentante.singolare} und ` +
            `${DE.datore.singolare}, jede mit ihrer Bezeichnung. Die erste wird auf die Blätter ` +
            'gedruckt: Die Reihenfolge ändert man, indem man die Zeile zieht.',
        },
        {
          termine: 'Ein Austritt löscht nichts',
          testo:
            'Ohne das Häkchen «Besucht» fällt die Person aus den ' +
            'Präsenzkontrollen, bleibt aber in der Geschichte, mit dem Vermerk «besucht nicht ' +
            'mehr»: Präsenzen und Noten bleiben lesbar.',
        },
        {
          termine: 'Klasse aus einem Jahr importieren…',
          testo:
            'Eine Klasse aus einem anderen Schuljahr in dieses geholt: Man wählt das Schuljahr ' +
            'unter den zuletzt geöffneten Dokumenten, dann die Klasse und den Namen, den sie ' +
            'hier haben soll. **Personalien und Fotos**, eingeschaltet, bringt die ' +
            `${DE.pif.plurale} mit ihren Daten und Fotos; ausgeschaltet kommt die Klasse leer. ` +
            '**Kurse und Fächer**, anfangs ausgeschaltet, bringt eingeschaltet auch die Kurse ' +
            'mit ihrem Stundenplan: Ein Fach, das hier gleich heisst, wird verwendet, die ' +
            'anderen kommen dazu. Stunden, Noten und Pläne bleiben im anderen Schuljahr, ' +
            'das nur gelesen wird: Es wird nicht geöffnet und nicht verändert.',
        },
        {
          termine: 'Alle Klassen eines anderen Klassenbuchs',
          testo:
            '**Datei › Aus einem anderen Klassenbuch importieren…** holt sie zusammen, mit ' +
            'einem Häkchen pro Klasse, mit den Fächern, den Einstellungen und auf Wunsch den ' +
            'Plänen und Kalendern. Die Klassen behalten ihren Namen von dort; eine, die hier ' +
            'mit gleichem Namen schon existiert, wird übersprungen, und das Ergebnis sagt es.',
        },
        {
          termine: 'Die anderen Aktionen',
          testo:
            'Hier hat die Aktionsleiste **Neue Klasse**, **Zur Gruppe hinzufügen**, **Liste ' +
            'einfügen** und **Klasse aus einem Jahr importieren…**. **Neue Mitteilung** und ' +
            '**Neuer Absenzzeitraum** stehen im ganzseitigen Personenblatt und im Bereich ' +
            'der Klassenlehrperson; die Kurse öffnen sich aus der Matrix unter **Kurse**.',
        },
      ],
      note: [
        '**Aus der Klasse entfernen** im Formular der Person löscht auch ' +
          'Präsenzen und Noten; **Klasse löschen…** in den Details löscht Kurse, Stunden, ' +
          'Noten und Klassendossier. Um die Geschichte zu behalten, nimmt man das Häkchen ' +
          '«Besucht» weg, oder man archiviert.',
        'Das Foto ist eine Kopie im Ordner des Schuljahrs: Die Originaldatei kann man ' +
          'löschen. Es braucht JPEG oder PNG, die beiden Formate, die in PDF landen.',
      ],
    },
    intestazione: {
      titolo: 'Briefkopf der Blätter',
      sommario:
        'Einstellungen › Dokumente und Druck › **Briefkopf**: wer unterschreibt und die ' +
        '**Briefpapiere** — die Schule und das Logo oben auf den Blättern —, mit den Kursen, ' +
        'die auf jedes drucken. Sie liegen im Dokument des Schuljahrs.',
      scritte: {
        impostazioni: 'Einstellungen',
        guida: 'Hilfe',
        chiFirma: 'Unterschrift',
        nome: 'Vorname Name',
        scuolaA: 'Schule A',
        predefinita: 'Standard',
        matematica: 'Mathematik',
        fisica: 'Physik',
        scuolaB: 'Schule B',
        storia: 'Geschichte',
      },
      figure: [
        {
          didascalia:
            'Zwei Briefpapiere für zwei Schulen: Ein Kurs, der vom einen aufs andere gezogen ' +
            'wird, druckt ab dann auf dem neuen.',
          legenda: [
            'Unterschrift: eine einzige, unten auf jedem Blatt aller Briefpapiere.',
            'Ein Briefpapier: der Name der Schule und das Logo. Das erste ist der Standard.',
            'Die Kurse des Briefpapiers, nach Klasse gruppiert: Man zieht sie auf ein anderes.',
            'Ein Blatt eines Kurses: oben Schule und Logo seines Briefpapiers, unten die ' +
              'Unterschrift.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Wer unterschreibt',
          testo:
            'Der Name der Lehrperson: Er steht unten links auf jeder Seite, auf welchem ' +
            'Briefpapier auch immer, und in der Standardsignatur der E-Mails. Es gibt nur ' +
            'einen für das ganze Dokument.',
        },
        {
          termine: 'Briefpapier',
          testo:
            'Eine Schule mit ihrem Logo. Wer an einer einzigen Schule unterrichtet, hat eines ' +
            'und fertig; wer auch anderswo unterrichtet — ein Abendkurs, ein Modul für eine ' +
            'andere Schule —, fügt mit **Neues Briefpapier** eines hinzu, und die Blätter ' +
            'dieser Kurse erscheinen mit dem anderen Kopf.',
        },
        {
          termine: 'Name der Schule',
          testo:
            'Steht oben auf jedem Blatt der Kurse dieses Briefpapiers. Bleibt er leer, ' +
            'verschwindet die Zeile.',
        },
        {
          termine: 'Logo der Schule',
          testo:
            '**Logo laden…** verlangt ein PNG oder JPEG und kopiert es ins Dokument: Die ' +
            'Originaldatei kann man löschen. Es steht oben rechts auf den Blättern des ' +
            'Briefpapiers. Ist schon ein Logo geladen, stehen neben der Miniatur **Ersetzen…** ' +
            'und **Entfernen**.',
        },
        {
          termine: 'Höhe des Logos',
          testo:
            'In Millimetern, von 6 bis 40, für jedes Briefpapier einzeln: Die Breite folgt den ' +
            'Proportionen des Bildes. Standard 14.',
        },
        {
          termine: 'Welcher Kurs auf welchem Briefpapier',
          testo:
            'Jeder Kurs steht auf einem Briefpapier und auf **nur einem**: Er kann weder ohne ' +
            'sein noch auf zweien stehen. In jedem Briefpapier sind die Kurse nach Klasse ' +
            'gruppiert. Man verschiebt sie, indem man sie auf den Kursbereich eines anderen ' +
            'Briefpapiers **zieht**; der Name einer Klasse lässt sich ziehen und nimmt alle ' +
            'ihre Kurse dieses Briefpapiers mit.',
        },
        {
          termine: 'Mehrere Kurse wählen',
          testo:
            'Ein Klick wählt einen Kurs; **Ctrl**+Klick fügt einen hinzu oder nimmt ihn weg, ' +
            '**Umschalt**+Klick nimmt alle dazwischen. Zieht man einen gewählten, gehen alle ' +
            'gewählten mit. Esc hebt die Auswahl auf.',
        },
        {
          termine: 'Verschieben nach…',
          testo:
            'Die Schaltfläche neben jedem Kurs und jeder Klasse: Sie listet die anderen ' +
            'Briefpapiere auf und tut, was das Ziehen täte. Das ist der Weg über die Tastatur.',
        },
        {
          termine: 'Das Standard-Briefpapier',
          testo:
            'Es ist das erste. Neue Kurse landen von selbst dort, und darauf werden die Blätter ' +
            'einer Klasse gedruckt, deren Kurse auf verschiedenen Briefpapieren stehen — das ' +
            'Klassendossier, das Klassenfoto.',
        },
        {
          termine: 'Briefpapier löschen',
          testo:
            'Der Papierkorb oben auf dem Briefpapier. Seine Kurse gehen an das erste ' +
            'verbleibende, und wenn es welche gab, sagt es das Klassenbuch vorher. Das letzte ' +
            'Briefpapier lässt sich nicht löschen.',
        },
        {
          termine: 'Die Signatur der E-Mails',
          testo:
            'Auch sie liegt im Dokument, aber man schreibt sie unter Einstellungen › ' +
            '**Kommunikation**, bei der E-Mail. Bleibt sie leer, gilt die Standardsignatur: ' +
            'die Unterschrift und die Schule des ersten Briefpapiers.',
        },
      ],
      note: [
        'Die Briefpapiere, Logos eingeschlossen, liegen in der Datei `.regi` und reisen ' +
          'mit ihr: Wer dasselbe Dokument auf einem anderen Computer öffnet, findet dieselben ' +
          'Blätter. Wie der Rest des Blatts aussieht — Masse, Tabellen, Sätze —, bestimmen ' +
          'die Vorlagen, die zum Programm gehören und mit ihm aktualisiert werden.',
        'Jedes Briefpapier zeigt die Kurse des aktuellen Schuljahrs; die der vergangenen ' +
          'Jahre bleiben, wo sie sind, und das Briefpapier nennt nur ihre Zahl.',
        'Ein Dokument, das noch den alten Ordner `templates/` neben sich hatte, liest ihn ' +
          'einmal beim Öffnen: Schulort, Name, Logo und Unterschrift von dort gehen hierher ' +
          'über. Danach zählt der Ordner nicht mehr.',
      ],
    },
  },
  fr: {
    corsi: {
      titolo: 'Cours',
      sommario:
        'Quels cours il y a — une matrice de classes et de branches — et, en dessous, comment ' +
        'va celui qui est choisi : les leçons, les comptes, l’horaire.',
      scritte: {
        titolo: 'Cours',
        periodo: 'les comptes portent sur la période choisie',
        corso: 'I MEC A — Mathématiques',
        pif: corto(FR.pif),
        oreSvolte: 'données',
        udPreviste: 'pér. prévues',
        presenza: 'présence',
        mediaValore: '4,6',
        media: 'moyenne',
        piani: 'plans',
        martedi: 'mar 08:20–09:50 · 2 pér.',
        giovedi: 'jeu 13:30–15:00 · 2 pér.',
        settimana: '4 pér. par semaine',
        colAssenza: 'Absence',
        colPresenza: 'Présence',
        colUd: corto(FR.unitaDidattica),
        colProve: 'Épreuves',
        colMedia: 'Moyenne',
        colNota: corto(FR.nota),
      },
      figure: [
        {
          didascalia:
            'En haut la fiche du cours avec ses chiffres et son horaire, en dessous une ligne ' +
            `par ${FR.pif.singolare}. Tout se compte sur la période choisie en haut. Au-dessus, ` +
            'dans la page, la matrice de classes et de branches depuis laquelle le cours ' +
            's’ouvre.',
          legenda: [
            'Horaire, nom et notes ; nouvelle leçon ; le check du cours ; les leçons du cours ' +
              'et leur déroulement ; supprimer.',
            `${FR.pif.breve}, leçons données, périodes prévues et au calendrier, présence sur ` +
              'les leçons avec appel, évaluations, moyenne, plans.',
            'L’horaire fixe, avec les périodes de la semaine.',
            `Le tableau par ${FR.pif.singolare} : le nom ouvre la fiche personnelle.`,
          ],
        },
      ],
      voci: [
        {
          termine: 'La matrice',
          testo:
            'En haut, les classes de l’année en colonnes et les branches en lignes : chaque ' +
            'croisement est un cours. Un clic sur une case vide et le cours naît, avec un nom ' +
            'qui s’écrit tout seul ; un clic sur une case colorée et le cours s’ouvre ' +
            'ci-dessous. Un cours sans leçons se retire avec la × qui apparaît au survol, ou ' +
            'avec le clic droit, qui dit d’abord ce qu’il emporte ; un cours avec des leçons, ' +
            'non — il faut d’abord retirer celles-ci. Le clic droit donne aussi **Titre et ' +
            'horaire…**.',
        },
        {
          termine: 'Les branches, en lignes',
          testo:
            'Chaque ligne est une branche qu’on écrit sur place : couleur, sigle et nom se ' +
            'changent dans le champ et s’enregistrent en le quittant, ou avec Entrée (Échap ' +
            'remet l’ancienne valeur). Un sigle vide vaut celui tiré du nom, qu’on lit en ' +
            'transparence. La dernière ligne en crée une nouvelle : on écrit le nom et on ' +
            'appuie sur Entrée. La corbeille n’est active que pour une branche qu’aucun cours ' +
            'n’utilise ; pour une branche avec des cours, clic droit **Fusionner avec une ' +
            'autre branche…**.',
        },
        {
          termine: 'Quel cours',
          testo:
            'Celui qui est ouvert dans la matrice, le même que dans la liste **Cours** des ' +
            'pages du Registre : le choisir à un endroit le choisit à l’autre. Si aucun n’est ' +
            'choisi, le premier de la période.',
        },
        {
          termine: 'Nouveau cours',
          testo:
            '**Nouveau cours**, dans la barre d’actions de Cours : classe, branche, nom, leçons ' +
            'fixes et notes. Le nom s’écrit tout seul — « I MEC A — Mathématiques » — tant ' +
            'qu’on n’y touche pas, et le « + » à côté de Classe et Branche les crée sur le ' +
            'moment.',
        },
        {
          termine: 'La couleur',
          testo:
            'Les leçons d’un cours, dans le calendrier et dans la matrice, ont la couleur du ' +
            'cours : d’elle-même, c’est la moyenne entre la couleur de la classe et celle de la ' +
            'branche, ainsi deux branches de la même classe restent parentes mais se ' +
            'distinguent. Dans le formulaire du cours, **Sa propre couleur** en choisit une à ' +
            'la main ; sans la coche, la moyenne revient.',
        },
        {
          termine: 'Classe et branche ne changent pas',
          testo:
            'Sur un cours existant, les deux champs sont grisés : leçons et notes appartiennent ' +
            'à cette classe, les plans suivent cette branche. Pour les changer, on crée un ' +
            'nouveau cours.',
        },
        {
          termine: 'Les chiffres',
          testo:
            `${Molti(FR.pif)} qui suivent le cours, leçons données sur celles au calendrier ` +
            '(une leçon passée compte comme donnée), périodes prévues par l’horaire et déjà au ' +
            'calendrier, les annulées s’il y en a, présence sur les leçons avec appel, périodes ' +
            'd’absence, évaluations, moyenne — « moyenne de 18 sur 22 » quand tous n’ont pas de ' +
            'note — et plans.',
        },
        {
          termine: 'La fiche du cours',
          testo:
            'Le crayon ouvre le formulaire du cours ; le calendrier une nouvelle leçon ; la ' +
            'coche mène au check du cours ; le plan aux leçons du cours et à leur déroulement ; ' +
            'la corbeille supprime le cours. Si le cours a un check, sa grille est sous le ' +
            'tableau, avec le même clic que sur la page Check. La date après « Prochaine ' +
            'leçon » se clique et ouvre cette leçon. La ligne « Leçon récurrente » donne les ' +
            'leçons fixes du cours, ou « aucune » : l’horaire se déclare depuis **Titre et ' +
            'horaire…**, avec le clic droit sur la case du cours dans la matrice.',
        },
        {
          termine: `Le tableau par ${FR.pif.singolare}`,
          testo:
            'Absence, Présence, Pér. d’absence, Pér. suivies, Pér. du cours, ' +
            'Retards, Marqué — les cases de la matrice du comportement —, Épreuves, Moyenne, ' +
            'Note, et Check si le cours en a un : combien de colonnes sont faites, sur ' +
            'combien. L’absence est verte jusqu’à 10 %, jaune jusqu’à 20 %, rouge au-delà ; ' +
            'rouge de toute façon au-dessus du seuil d’absence de Paramètres › Enseignement › ' +
            '**Évaluation**.',
        },
        {
          termine: 'Les branches',
          testo:
            'Elles sont dans Paramètres › Enseignement › **Branches** : nom, sigle (`MAT`), ' +
            'couleur. En écrivant un nom qui ressemble à un nom existant, le formulaire demande ' +
            's’il s’agit de la même branche écrite deux fois.',
        },
        {
          termine: 'Fusionner deux branches',
          testo:
            'L’icône de copie à côté d’une branche — « Fusionner cette branche avec une ' +
            'autre » — la fond dans une autre : cours et plans passent à celle qui reste, et si ' +
            'deux cours de la même classe deviennent identiques, ils fusionnent avec leurs ' +
            'leçons. C’est le remède au doublon, et rien ne se perd.',
        },
        {
          termine: 'Rien ne sort d’ici',
          testo:
            'Présences, évaluations, fiches, procès-verbaux et CSV sont tous dans ' +
            '**Documents**. Ici on tient le cours, là-bas on le remet.',
        },
      ],
      note: [
        'Les pourcentages du tableau portent sur les périodes que l’horaire prévoit dans la ' +
          'période, pas sur celles déjà au calendrier : c’est le même calcul que le rapport à ' +
          'rendre, ainsi le vrai chiffre ne se découvre pas au moment d’imprimer.',
        'Supprimer un cours — ou sa branche — emporte ses leçons et ses évaluations. La ' +
          'demande de confirmation énumère ce qui s’en va et ce qui reste détaché.',
      ],
    },
    orario: {
      titolo: 'Horaire fixe et leçons',
      sommario:
        'Les heures qu’un cours donne chaque semaine, et comment elles deviennent des leçons au ' +
        'calendrier.',
      scritte: {
        oreFisse: 'Leçons fixes de la semaine',
        giorno: 'mer',
        dueUd: '2 pér.',
        settimana: '4 pér. par semaine',
        genera: 'Générer les leçons',
        senzaLezione: 'Jours sans cours',
        ceGia: 'existe déjà',
        vacanze: 'vacances',
      },
      figure: [
        {
          didascalia:
            'Les plages d’un jour sont enchaînées ; **Générer les leçons** les répète chaque ' +
            'semaine entre deux dates, en sautant ce qui existe déjà et les jours sans cours.',
          legenda: [
            'La première plage du jour : son heure de début est la seule qu’on écrit.',
            'Les plages suivantes commencent où finit celle du dessus — après la pause, s’il y ' +
              'en a une entre deux — : le champ est grisé.',
            '**Générer les leçons** met au calendrier les leçons entre **Du** et **Au**.',
            'Une leçon qui existe déjà — même jour, même heure de début — reste telle quelle.',
            'Les vacances et les jours de fermeture de l’année sont sautés.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Où on l’écrit',
          testo:
            'Dans le formulaire du cours, sous « Leçons fixes de la semaine » : le crayon de ' +
            'la fiche dans Cours, ou **Titre et horaire…** avec le clic droit sur la case du ' +
            'cours dans la matrice. La fiche dit dans la ligne « Leçon récurrente » s’il y en a ' +
            'une.',
        },
        {
          termine: 'Une plage',
          testo:
            'Jour, heure de début, durée en périodes et salle. La durée d’une période, c’est le ' +
            'document qui la dit, dans Paramètres › Année et horaire › **Calendrier** : 45 ' +
            'minutes par défaut. À côté, on lit à quelle heure elle finit, pauses de la journée ' +
            'comprises ; en bas, les périodes de la semaine.',
        },
        {
          termine: 'Ajouter une plage',
          testo:
            'En ajoute une à la suite du dernier jour, accolée. La toute première prend l’heure ' +
            'et la durée proposées par Paramètres › Année et horaire › **Calendrier**.',
        },
        {
          termine: 'Répéter cette plage un autre jour',
          testo:
            'Le bouton de copie d’une ligne : la même heure, durée et salle le premier jour ' +
            'suivant qui n’a pas encore de plages, en repartant du lundi après le dimanche.',
        },
        {
          termine: 'Changer l’ordre ou le jour',
          testo:
            'On fait glisser la ligne par la poignée, ou avec ↑ et ↓ sur la poignée. Amenée ' +
            'parmi les plages d’un autre jour, la plage passe à ce jour ; en changeant la liste ' +
            'du jour, elle va à la fin de ce jour.',
        },
        {
          termine: 'Générer les leçons',
          testo:
            'Sous « Leçons au calendrier », entre **Du** — aujourd’hui, si l’année a déjà ' +
            'commencé — et **Au**, la fin de l’année. Sur un nouveau cours, c’est la case ' +
            '« Générer les leçons dès la création du cours » qui s’en charge ; sur un cours ' +
            'existant, le bouton, qui enregistre d’abord l’horaire.',
        },
        {
          termine: 'On le relance sans y penser',
          testo:
            'Il n’ajoute que les leçons qui manquent, et le dit : combien ajoutées, combien ' +
            'existaient déjà, combien chevauchent une autre classe. Celles en conflit sont ' +
            'ajoutées quand même.',
        },
        {
          termine: 'La dotation horaire',
          testo:
            'Les périodes que l’horaire prévoit dans la période, sans les vacances ni les ' +
            'leçons annulées, sont les cent pour cent sur lesquels se comptent les absences. Un ' +
            'cours sans horaire n’en a pas.',
        },
      ],
      note: [
        'Changer l’horaire ne déplace ni ne retire les leçons déjà générées : celles de ' +
          'l’ancien horaire restent au calendrier, et se retirent à la main.',
        'Une journée est une suite : la deuxième plage commence quand la première finit, ou ' +
          'quand finit la pause entre les deux. C’est pourquoi on ne déclare que l’heure ' +
          'd’entrée, et allonger une plage pousse les suivantes au lieu de les faire ' +
          'chevaucher.',
        'Les plages se comptent en périodes, pas en minutes. Si le document change la durée ' +
          'de la période, chaque plage garde son nombre de périodes et s’allonge ou se ' +
          'raccourcit avec elle ; dès qu’une leçon a un appel, la durée ne change plus.',
      ],
    },
    classi: {
      titolo: 'Classes',
      sommario:
        `Les données personnelles des ${FR.pif.plurale} : qui elles sont et comment les ` +
        'joindre.',
      scritte: {
        titolo: `Classes et ${FR.pif.plurale}`,
        mappa: 'Carte',
        elimina: 'Supprimer…',
        docenteClasse: 'Je suis maître de classe',
        archiviata: 'Archivée',
        gruppo: `18 ${corto(FR.pif)} · Mathématiques`,
        pif: corto(FR.pif),
        nascita: 'Naissance',
        datore: corto(FR.datore),
      },
      figure: [
        {
          didascalia:
            'La classe se choisit dans la liste **Classe** de la barre du haut, après ' +
            '**Période**, comme dans les autres pages : ci-dessous ses commandes et ses données ' +
            'personnelles.',
          legenda: [
            `La classe choisie, avec le nombre de ${FR.pif.plurale} et les branches ; les ` +
              'archivées en bas de la liste.',
            'Dans la barre d’actions **Ajouter au groupe**, **Coller la liste** et **Importer ' +
              'une classe d’une année…** ; dans la page, le cadre **Détails**.',
            'Une ligne par personne : le nom ouvre la fiche personnelle, le crayon le ' +
              'formulaire.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Nouvelle classe',
          testo:
            '**Nouvelle classe**, dans la barre d’actions de Classes et de Cours : nom, branche ' +
            'enseignée — une fois choisie, elle crée le cours —, site, couleur dans le ' +
            'calendrier, notes.',
        },
        {
          termine: 'Les détails',
          testo:
            'En haut de la page : couleur, nom, **Je suis maître de classe** — qui allume le ' +
            'groupe du même nom dans la barre latérale —, **Archivée** et notes. Chaque champ ' +
            's’enregistre en le quittant ; Échap remet l’ancienne valeur. **Supprimer la ' +
            'classe…** dit d’abord ce qu’elle emporte. Les branches de la classe se donnent ' +
            'depuis la matrice de **Cours**.',
        },
        {
          termine: 'Archivée',
          testo:
            'La classe reste dans l’historique mais disparaît des listes ; dans Classes, elle ' +
            'descend en bas avec la mention « archivée ».',
        },
        {
          termine: 'Ce qu’il y a',
          testo:
            'Une ligne par personne : nom, naissance, adresse, e-mail, ' +
            `l’${FR.azienda.singolare} — dans la colonne « ${Uno(FR.datore)} » —, adresse et ` +
            `e-mail de l’${FR.datore.singolare}. Les e-mails se cliquent et ouvrent la ` +
            'messagerie.',
        },
        {
          termine: `Ajouter une ${FR.pif.singolare}`,
          testo:
            'Une à la fois, en quatre parties : qui elle est, comment la joindre, le ' +
            `${FR.rappresentante.singolare} et l’${FR.azienda.singolare}. La photo s’ajoute ` +
            'après le premier enregistrement, et vaut tout de suite.',
        },
        {
          termine: 'Coller la liste',
          testo:
            'Une ligne par personne : « Rossi Mario », « Rossi, Mario », ou des colonnes ' +
            'copiées d’un tableur, avec l’e-mail où l’on veut. Les noms déjà présents sont ' +
            'sautés, même écrits « Muller » au lieu de « Müller ».',
        },
        {
          termine: 'L’adresse en morceaux',
          testo:
            'Rue et numéro, NPA, localité, c/o, case postale, pays : séparés, parce que la ' +
            'carte et les enveloppes les veulent séparés.',
        },
        {
          termine: 'Les téléphones',
          testo:
            `Autant qu’on veut, de la ${FR.pif.singolare}, du ${FR.rappresentante.singolare} ` +
            `et de l’${FR.datore.singolare}, chacun avec son étiquette. Le premier est celui ` +
            'imprimé sur les feuilles : l’ordre se change en faisant glisser la ligne.',
        },
        {
          termine: 'Un départ n’efface rien',
          testo:
            `En décochant « Fréquente », la ${FR.pif.singolare} sort des appels mais reste ` +
            'dans l’historique, avec la mention « ne suit plus » : présences et notes ' +
            'restent lisibles.',
        },
        {
          termine: 'Importer une classe d’une année…',
          testo:
            'Une classe d’une autre année reprise dans celle-ci : on choisit l’année parmi les ' +
            'documents récents, puis la classe et le nom qu’elle aura ici. **Données personnelles et ' +
            `photos**, activé, amène les ${FR.pif.plurale} avec leurs données et leurs photos ; ` +
            'désactivé, la classe arrive vide. **Cours et branches**, désactivé au départ, ' +
            'amène aussi, une fois activé, les cours avec leur horaire : une branche qui porte ' +
            'ici le même nom est reprise, les autres s’ajoutent. Leçons, notes et plans restent ' +
            'dans l’autre année, qui est seulement lue : elle ne s’ouvre pas et ne change pas.',
        },
        {
          termine: 'Toutes les classes d’un autre registre',
          testo:
            '**Fichier › Importer d’un autre registre…** les amène ensemble, une case par ' +
            'classe, avec les branches, les paramètres et, si on veut, les plans et les ' +
            'calendriers. Les classes gardent leur nom de là-bas ; une classe qui existe déjà ' +
            'ici avec le même nom est sautée, et le résultat le dit.',
        },
        {
          termine: 'Les autres actions',
          testo:
            'Ici la barre d’actions a **Nouvelle classe**, **Ajouter au groupe**, **Coller la ' +
            'liste** et **Importer une classe d’une année…**. **Nouvelle communication** et ' +
            '**Nouvelle période d’absence** se trouvent dans la fiche pleine page d’une ' +
            'personne et dans le panneau du maître de classe ; les cours s’ouvrent depuis la ' +
            'matrice de **Cours**.',
        },
      ],
      note: [
        `**Retirer de la classe**, dans le formulaire de la ${FR.pif.singolare}, emporte ` +
          'aussi présences et notes ; **Supprimer la classe…**, dans les Détails, emporte ' +
          'cours, leçons, notes et dossier de classe. Pour garder l’historique, on décoche ' +
          '« Fréquente », ou on archive.',
        'La photo est une copie, placée dans le dossier de l’année : le fichier d’origine ' +
          'peut être effacé. Il faut du JPEG ou du PNG, les deux formats qui finissent dans ' +
          'les PDF.',
      ],
    },
    intestazione: {
      titolo: 'En-tête des feuilles',
      sommario:
        'Paramètres › Documents et impression › **En-tête** : le signataire et les **papiers ' +
        'à en-tête** — l’école et le logo en haut des feuilles —, avec les cours qui ' +
        'impriment sur chacun. Ils sont dans le document de l’année.',
      scritte: {
        impostazioni: 'Paramètres',
        guida: 'Aide',
        chiFirma: 'Qui signe',
        nome: 'Prénom Nom',
        scuolaA: 'École A',
        predefinita: 'par défaut',
        matematica: 'Mathématiques',
        fisica: 'Physique',
        scuolaB: 'École B',
        storia: 'Histoire',
      },
      figure: [
        {
          didascalia:
            'Deux papiers pour deux écoles : un cours glissé de l’un à l’autre imprime dès lors ' +
            'sur le nouveau papier.',
          legenda: [
            'Le signataire : un seul, en bas de chaque feuille de tous les papiers.',
            'Un papier : le nom de l’école et le logo. Le premier est celui par défaut.',
            'Les cours du papier, groupés par classe : on les fait glisser sur un autre papier.',
            'Une feuille d’un cours : en haut l’école et le logo de son papier, en bas le ' +
              'signataire.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Qui signe',
          testo:
            'Le nom de l’enseignant : il va en bas à gauche de chaque page, quel que soit le ' +
            'papier, et dans la signature par défaut des e-mails. Il n’y en a qu’un pour tout ' +
            'le document.',
        },
        {
          termine: 'Papier à en-tête',
          testo:
            'Une école avec son logo. Qui enseigne dans une seule école en a un, un point c’est ' +
            'tout ; qui enseigne aussi ailleurs — un cours du soir, un module pour un autre ' +
            'établissement — en ajoute un avec **Nouveau papier à en-tête**, et les feuilles de ' +
            'ces cours sortent avec l’autre en-tête.',
        },
        {
          termine: 'Nom de l’école',
          testo:
            'Il va en haut de chaque feuille des cours de ce papier. Laissé vide, cette ligne ' +
            'disparaît.',
        },
        {
          termine: 'Logo de l’école',
          testo:
            '**Charger le logo…** demande un PNG ou un JPEG et le copie dans le document : le ' +
            'fichier d’origine peut être effacé. Il va en haut à droite des feuilles du papier. ' +
            'Avec un logo déjà chargé, à côté de la miniature il y a **Remplacer…** et ' +
            '**Retirer**.',
        },
        {
          termine: 'Hauteur du logo',
          testo:
            'En millimètres, de 6 à 40, papier par papier : la largeur suit les proportions de ' +
            'l’image. Par défaut 14.',
        },
        {
          termine: 'Quel cours sur quel papier',
          testo:
            'Chaque cours est sur un papier et sur **un seul** : il ne peut pas rester sans, ni ' +
            'être sur deux. Dans chaque papier, les cours sont groupés par classe. On les ' +
            'déplace **en les faisant glisser** sur la zone des cours d’un autre papier ; le ' +
            'nom d’une classe se fait glisser et emporte tous ses cours de ce papier.',
        },
        {
          termine: 'Choisir plusieurs cours',
          testo:
            'Un clic choisit un cours ; **Ctrl**+clic en ajoute ou en retire un, **Maj**+clic ' +
            'prend tous ceux entre les deux. En faisant glisser un cours choisi, tous les ' +
            'choisis partent. Échap annule le choix.',
        },
        {
          termine: 'Déplacer vers…',
          testo:
            'Le bouton à côté de chaque cours et de chaque classe : il énumère les autres ' +
            'papiers, et fait ce que ferait le glisser. C’est la voie du clavier.',
        },
        {
          termine: 'Le papier par défaut',
          testo:
            'C’est le premier. Les nouveaux cours y arrivent tout seuls, et on y imprime les ' +
            'feuilles d’une classe dont les cours sont sur des papiers différents — le dossier ' +
            'de classe, la photo de classe.',
        },
        {
          termine: 'Supprimer le papier',
          testo:
            'La corbeille en haut du papier. Ses cours passent au premier papier restant, et ' +
            's’il y en avait, le registre le dit avant. Le dernier papier ne se supprime pas.',
        },
        {
          termine: 'La signature des e-mails',
          testo:
            'Elle aussi est dans le document, mais elle s’écrit dans Paramètres › ' +
            '**Communications**, avec le courrier. Laissée vide, c’est celle par défaut : le ' +
            'signataire et l’école du premier papier.',
        },
      ],
      note: [
        'Les papiers, logos compris, sont dans le fichier `.regi` et voyagent avec lui : ' +
          'qui ouvre le même document sur un autre ordinateur trouve les mêmes feuilles. La ' +
          'forme du reste de la feuille — mesures, tableaux, phrases — dépend des modèles, qui ' +
          'appartiennent au programme et se mettent à jour avec lui.',
        'Chaque papier montre les cours de l’année en cours ; ceux des années passées restent ' +
          'où ils sont, et le papier n’en donne que le nombre.',
        'Un document qui avait à côté de lui l’ancien dossier `templates/` le lit une fois, ' +
          'à l’ouverture : le site, le nom, le logo et la signature écrits là passent ici. ' +
          'Dès lors, le dossier ne compte plus.',
      ],
    },
  },
  en: {
    corsi: {
      titolo: 'Courses',
      sommario:
        'Which courses there are — a grid of classes and subjects — and, below, how the chosen ' +
        'one is going: the lessons, the figures, the timetable.',
      scritte: {
        titolo: 'Courses',
        periodo: 'the figures are for the chosen period',
        corso: 'I MEC A — Maths',
        pif: corto(EN.pif),
        oreSvolte: 'lessons held',
        udPreviste: 'periods due',
        presenza: 'attendance',
        mediaValore: '4.6',
        media: 'average',
        piani: 'plans',
        martedi: 'Tue 08:20–09:50 · 2 per.',
        giovedi: 'Thu 13:30–15:00 · 2 per.',
        settimana: '4 per. a week',
        colAssenza: 'Absence',
        colPresenza: 'Attendance',
        colUd: corto(EN.unitaDidattica),
        colProve: 'Tests',
        colMedia: 'Average',
        colNota: corto(EN.nota),
      },
      figure: [
        {
          didascalia:
            'At the top the course card with its figures and timetable, below it one row per ' +
            `${EN.pif.singolare}. Everything is counted over the period chosen at the top. ` +
            'Above, on the page, the grid of classes and subjects from which the course opens.',
          legenda: [
            'Timetable, name and notes; new lesson; the course check; the course’s lessons and ' +
              'their outlines; delete.',
            `${EN.pif.breve}, lessons held, periods due and on the calendar, attendance over ` +
              'lessons with attendance taken, assessments, average, plans.',
            'The fixed timetable, with the week’s periods.',
            `The table per ${EN.pif.singolare}: the name opens the personal record.`,
          ],
        },
      ],
      voci: [
        {
          termine: 'The grid',
          testo:
            'At the top, the year’s classes in columns and the subjects in rows: every crossing ' +
            'is a course. Click an empty cell and the course is created, with a name that ' +
            'writes itself; click a coloured one and the course opens below. A course with no ' +
            'lessons is removed with the × that appears on hover, or with a right click, which ' +
            'first says what it takes with it; one with lessons cannot — those go first. The ' +
            'right click also offers **Title and timetable…**.',
        },
        {
          termine: 'The subjects, in rows',
          testo:
            'Each row is a subject written right there: colour, code and name are changed in ' +
            'the field and saved on leaving it, or with Enter (Esc puts it back). An empty ' +
            'code means the one derived from the name, shown faintly. The last row makes a new ' +
            'one: type the name and press Enter. The bin is only active for a subject no course ' +
            'uses; for one with courses, right click **Merge with another subject…**.',
        },
        {
          termine: 'Which course',
          testo:
            'The one open in the grid, which is the same as in the **Course** drop-down on the ' +
            'Register pages: choosing it in one place chooses it in the other. If none has been ' +
            'chosen, the first in the period.',
        },
        {
          termine: 'New course',
          testo:
            '**New course**, in the Courses action bar: class, subject, name, fixed lessons and ' +
            'notes. The name writes itself — “I MEC A — Maths” — until you touch it, and the ' +
            '“+” next to Class and Subject creates them on the spot.',
        },
        {
          termine: 'The colour',
          testo:
            'A course’s lessons, in the calendar and in the grid, have the course’s colour: by ' +
            'default the midpoint between the class colour and the subject colour, so two ' +
            'subjects of the same class stay related but can be told apart. In the course form, ' +
            '**Its own colour** picks one by hand; untick it and the midpoint comes back.',
        },
        {
          termine: 'Class and subject do not change',
          testo:
            'On an existing course the two fields are greyed out: lessons and grades belong to ' +
            'that class, the plans follow that subject. To change them, you create a new course.',
        },
        {
          termine: 'The figures',
          testo:
            `${Molti(EN.pif)} attending, lessons held out of those on the calendar (a past ` +
            'lesson counts as held), periods due by the timetable and already on the calendar, ' +
            'the cancelled ones if any, attendance over lessons with attendance taken, ' +
            'periods of absence, assessments, average — “average of 18 out of 22” when not ' +
            'everyone has a grade — and plans.',
        },
        {
          termine: 'The course card',
          testo:
            'The pencil opens the course form; the calendar a new lesson; the tick leads to the ' +
            'course check; the plan to the course’s lessons and their outlines; the bin deletes ' +
            'the course. If the course has a check, its grid is below the table, with the same ' +
            'click as on the Check page. The date after “Next lesson” can be clicked and opens ' +
            'that lesson. The “Recurring lesson” row gives the course’s fixed lessons, or ' +
            '“none”: the timetable is set from **Title and timetable…**, with a right click on ' +
            'the course cell in the grid.',
        },
        {
          termine: `The table per ${EN.pif.singolare}`,
          testo:
            'Absence, Attendance, Periods absent, Periods attended, Course periods, Late arrivals, ' +
            'Marked — the cells of the behaviour grid —, Tests, Average, Grade, and Check if ' +
            'the course has one: how many columns are done, out of how many. Absence is green ' +
            'up to 10%, yellow up to 20%, red beyond; red in any case above the absence ' +
            'threshold in Settings › Teaching › **Assessment**.',
        },
        {
          termine: 'The subjects',
          testo:
            'They are in Settings › Teaching › **Subjects**: name, code (`MAT`), colour. Typing ' +
            'a name that looks like an existing one, the form asks whether it is the same ' +
            'subject written twice.',
        },
        {
          termine: 'Merging two subjects',
          testo:
            'The copy icon next to a subject — “Merge this subject into another” — folds it ' +
            'into another: courses and plans move to the one that stays, and if two courses of ' +
            'the same class become identical they merge with their lessons. It is the cure for ' +
            'duplicates, and nothing is lost.',
        },
        {
          termine: 'Nothing goes out from here',
          testo:
            'Attendance, assessments, sheets, lesson records and CSV are all in **Documents**. Here you ' +
            'keep the course, there you hand it in.',
        },
      ],
      note: [
        'The table’s percentages are over the periods the timetable plans in the period, not ' +
          'over those already on the calendar: it is the same count as the report to hand in, ' +
          'so the real figure is not discovered at printing time.',
        'Deleting a course — or its subject — takes its lessons and assessments with it. The ' +
          'confirmation question lists what goes and what is left detached.',
      ],
    },
    orario: {
      titolo: 'Fixed timetable and lessons',
      sommario:
        'The lessons a course has every week, and how they become lessons on the calendar.',
      scritte: {
        oreFisse: 'Fixed weekly lessons',
        giorno: 'Wed',
        dueUd: '2 per.',
        settimana: '4 per. a week',
        genera: 'Generate lessons',
        senzaLezione: 'Days without lessons',
        ceGia: 'already there',
        vacanze: 'holidays',
      },
      figure: [
        {
          didascalia:
            'A day’s slots are chained; **Generate lessons** repeats them every week between two ' +
            'dates, skipping what is already there and the days without lessons.',
          legenda: [
            'The first slot of the day: its start time is the only one you write.',
            'The following slots start where the one above ends — after the break, if there is ' +
              'one in between —: the field is greyed out.',
            '**Generate lessons** puts the lessons between **From** and **To** on the calendar.',
            'A lesson that is already there — same day, same start time — stays as it is.',
            'The year’s holidays and closure days are skipped.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Where it is written',
          testo:
            'In the course form, under “Fixed weekly lessons”: the pencil on the card in ' +
            'Courses, or **Title and timetable…** with a right click on the course cell in the ' +
            'grid. The card says in the “Recurring lesson” row whether there is one.',
        },
        {
          termine: 'A slot',
          testo:
            'Day, start time, length in periods and room. How long a period lasts is set by ' +
            'the document, in Settings › Year and timetable › **Calendar**: 45 minutes by ' +
            'default. Alongside you read when it ends, the day’s breaks included; at the ' +
            'bottom, the week’s periods.',
        },
        {
          termine: 'Add a slot',
          testo:
            'Adds one at the end of the last day, attached. The very first takes the time and ' +
            'length suggested by Settings › Year and timetable › **Calendar**.',
        },
        {
          termine: 'Repeat this slot on another day',
          testo:
            'A row’s copy button: the same time, length and room on the first following day ' +
            'that has no slots yet, starting again from Monday after Sunday.',
        },
        {
          termine: 'Changing the order or the day',
          testo:
            'Drag the row by its handle, or use ↑ and ↓ on the handle. Dropped among another ' +
            'day’s slots, the slot moves to that day; changing the day drop-down sends it to the ' +
            'end of that day.',
        },
        {
          termine: 'Generate lessons',
          testo:
            'Under “Lessons on the calendar”, between **From** — today, if the year has ' +
            'already started — and **To**, the end of the year. On a new course the “Generate ' +
            'lessons as soon as the course is created” tick does it; on an existing one the ' +
            'button, which saves the timetable first.',
        },
        {
          termine: 'Run it again without a second thought',
          testo:
            'It adds only the missing lessons, and says so: how many added, how many were ' +
            'already there, how many clash with another class. Those that clash are added all ' +
            'the same.',
        },
        {
          termine: 'The hours quota',
          testo:
            'The periods the timetable plans in the period, minus holidays and cancelled ' +
            'lessons, are the hundred per cent against which absences are counted. A course ' +
            'with no timetable has none.',
        },
      ],
      note: [
        'Changing the timetable neither moves nor removes lessons already generated: those ' +
          'of the old timetable stay on the calendar, and are removed by hand.',
        'A day is a sequence: the second slot starts when the first ends, or when the break ' +
          'between them ends. That is why only the start time is set, and lengthening a slot ' +
          'pushes the following ones along instead of making them overlap.',
        'Slots are counted in periods, not minutes. If the document changes the length of a ' +
          'period, each slot keeps its number of periods and grows or shrinks with it; as ' +
          'soon as a lesson has attendance taken, the length can no longer be changed.',
      ],
    },
    classi: {
      titolo: 'Classes',
      sommario:
        `The ${EN.pif.plurale}’ personal details: who they are and how to reach them.`,
      scritte: {
        titolo: `Classes and ${EN.pif.plurale}`,
        mappa: 'Map',
        elimina: 'Delete the class…',
        docenteClasse: 'I’m the class teacher',
        archiviata: 'Archived',
        gruppo: `18 ${EN.pif.plurale} · Maths`,
        pif: corto(EN.pif),
        nascita: 'Born',
        datore: corto(EN.datore),
      },
      figure: [
        {
          didascalia:
            'The class is chosen from the **Class** drop-down in the bar at the top, after ' +
            '**Period**, as on the other pages: below, its commands and its personal details.',
          legenda: [
            `The chosen class, with how many ${EN.pif.plurale} and which subjects; archived ` +
              'ones at the bottom of the drop-down.',
            'In the action bar **Add to group**, **Paste list** and **Import class from ' +
              'year…**; on the page, the **Details** box.',
            'One row per person: the name opens the personal record, the pencil the form.',
          ],
        },
      ],
      voci: [
        {
          termine: 'New class',
          testo:
            '**New class**, in the Classes and Courses action bars: name, subject taught — ' +
            'once chosen, it creates the course —, site, colour in the calendar, notes.',
        },
        {
          termine: 'The details',
          testo:
            'At the top of the page: colour, name, **I’m the class teacher** — which turns on ' +
            'the group of the same name in the sidebar —, **Archived** and notes. Each field ' +
            'saves on leaving it; Esc puts it back. **Delete the class…** first says what it ' +
            'takes with it. The class’s subjects are given from the **Courses** grid.',
        },
        {
          termine: 'Archived',
          testo:
            'The class stays in the history but disappears from the drop-downs; in Classes it ' +
            'drops to the bottom with the word “archived”.',
        },
        {
          termine: 'What is there',
          testo:
            'One row per person: name, date of birth, address, email, the ' +
            `${EN.azienda.singolare} — in the “${Uno(EN.datore)}” column —, the ` +
            `${EN.datore.singolare}’s address and email. Email addresses can be clicked and ` +
            'open the mail program.',
        },
        {
          termine: `Add a ${EN.pif.singolare}`,
          testo:
            'One at a time, in four parts: who they are, how to reach them, the ' +
            `${EN.rappresentante.singolare} and the ${EN.azienda.singolare}. The photo is ` +
            'added after the first save, and applies at once.',
        },
        {
          termine: 'Paste list',
          testo:
            'One row per person: “Rossi Mario”, “Rossi, Mario”, or columns copied from a ' +
            'spreadsheet, with the email wherever you like. Names already there are skipped, ' +
            'even written “Muller” instead of “Müller”.',
        },
        {
          termine: 'The address in pieces',
          testo:
            'Street and number, postcode, town, c/o, PO box, country: separate, because the ' +
            'map and the envelopes want them separate.',
        },
        {
          termine: 'The phone numbers',
          testo:
            `As many as you like, for the ${EN.pif.singolare}, the ` +
            `${EN.rappresentante.singolare} and the ${EN.datore.singolare}, each with its ` +
            'label. The first is the one printed on the sheets: change the order by dragging ' +
            'the row.',
        },
        {
          termine: 'Leaving does not erase',
          testo:
            `Untick “Attends” and the ${EN.pif.singolare} drops out of the attendance lists but ` +
            'stays in the history, marked “no longer attending”: attendance and grades remain ' +
            'readable.',
        },
        {
          termine: 'Import class from year…',
          testo:
            'A class from another year brought into this one: choose the year among the recent ' +
            'documents, then the class and the name it will have here. **Personal details and photos**, ' +
            `on, brings the ${EN.pif.plurale} with their details and photos; off, the class ` +
            'arrives empty. **Courses and subjects**, off to start with, when on also brings ' +
            'the courses with their timetable: a subject with the same name here is reused, ' +
            'the others are added. Lessons, grades and plans stay in the other year, which is ' +
            'only read: it is not opened and does not change.',
        },
        {
          termine: 'All the classes of another register',
          testo:
            '**File › Import from another register…** brings them in together, one tick box per ' +
            'class, with the subjects, the settings and, if you want, the plans and calendars. ' +
            'The classes keep their name from there; one that already exists here with the same ' +
            'name is skipped, and the result says so.',
        },
        {
          termine: 'The other actions',
          testo:
            'Here the action bar has **New class**, **Add to group**, **Paste list** and ' +
            '**Import class from year…**. **New message** and **New absence period** are on a ' +
            'person’s full-page record and in the class teacher panel; courses open from the ' +
            '**Courses** grid.',
        },
      ],
      note: [
        `**Remove from class**, in the ${EN.pif.singolare}’s form, also takes away ` +
          'attendance and grades; **Delete the class…**, in the Details, takes away courses, ' +
          'lessons, grades and class file. To keep the history, untick “Attends”, or archive.',
        'The photo is a copy, placed in the year’s folder: the original file can be deleted. ' +
          'JPEG or PNG are needed, the two formats that end up in PDFs.',
      ],
    },
    intestazione: {
      titolo: 'Letterhead',
      sommario:
        'Settings › Documents and printing › **Letterhead**: who signs and the ' +
        '**letterheads** — the school and the logo at the top of the sheets —, with the ' +
        'courses that print on each. They live inside the year’s document.',
      scritte: {
        impostazioni: 'Settings',
        guida: 'Help',
        chiFirma: 'Who signs',
        nome: 'First Last',
        scuolaA: 'School A',
        predefinita: 'default',
        matematica: 'Maths',
        fisica: 'Physics',
        scuolaB: 'School B',
        storia: 'History',
      },
      figure: [
        {
          didascalia:
            'Two letterheads for two schools: a course dragged from one to the other prints on ' +
            'the new letterhead from then on.',
          legenda: [
            'Who signs: a single person, at the bottom of every sheet of every letterhead.',
            'A letterhead: the school name and the logo. The first one is the default.',
            'The letterhead’s courses, grouped by class: they are dragged onto another one.',
            'A sheet from a course: at the top the school and logo of its letterhead, at the ' +
              'bottom who signs.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Who signs',
          testo:
            'The teacher’s name: it goes at the bottom left of every page, whatever the ' +
            'letterhead, and in the default email signature. There is one for the whole ' +
            'document.',
        },
        {
          termine: 'Letterhead',
          testo:
            'A school with its logo. Whoever teaches at a single school has one and that is ' +
            'that; whoever also teaches elsewhere — an evening course, a module for another ' +
            'institution — adds one with **New letterhead**, and those courses’ sheets come out ' +
            'with the other heading.',
        },
        {
          termine: 'School name',
          testo:
            'Goes at the top of every sheet of that letterhead’s courses. Left empty, that line ' +
            'disappears.',
        },
        {
          termine: 'School logo',
          testo:
            '**Load the logo…** asks for a PNG or a JPEG and copies it into the document: the ' +
            'original file can be deleted. It goes at the top right of the letterhead’s sheets. ' +
            'With a logo already loaded, next to the thumbnail there are **Replace…** and ' +
            '**Remove**.',
        },
        {
          termine: 'Logo height',
          testo:
            'In millimetres, from 6 to 40, letterhead by letterhead: the width follows the ' +
            'image’s proportions. 14 by default.',
        },
        {
          termine: 'Which course on which letterhead',
          testo:
            'Every course is on one letterhead and **one only**: it cannot be left without, ' +
            'nor be on two. Inside each letterhead the courses are grouped by class. They are ' +
            'moved **by dragging** them onto another letterhead’s course area; a class name can ' +
            'be dragged and takes all its courses on that letterhead with it.',
        },
        {
          termine: 'Choosing several courses',
          testo:
            'A click chooses a course; **Ctrl**+click adds or removes one, **Shift**+click ' +
            'takes all those in between. Dragging a chosen one moves all the chosen ones. Esc ' +
            'clears the choice.',
        },
        {
          termine: 'Move to…',
          testo:
            'The button next to every course and every class: it lists the other letterheads, ' +
            'and does what dragging would. It is the keyboard route.',
        },
        {
          termine: 'The default letterhead',
          testo:
            'It is the first one. New courses land there by themselves, and the sheets of a ' +
            'class whose courses are on different letterheads print on it — the class file, ' +
            'the class photo.',
        },
        {
          termine: 'Delete the letterhead',
          testo:
            'The bin at the top of the letterhead. Its courses move to the first one left, and ' +
            'if there were any the register says so first. The last letterhead cannot be ' +
            'deleted.',
        },
        {
          termine: 'The email signature',
          testo:
            'It is in the document too, but it is written in Settings › **Communications**, with the ' +
            'mail. Left empty, the default applies: who signs and the school of the first ' +
            'letterhead.',
        },
      ],
      note: [
        'Letterheads, logos included, live inside the `.regi` file and travel with it: ' +
          'whoever opens the same document on another computer finds the same sheets. How the ' +
          'rest of the sheet looks — sizes, tables, sentences — is decided by the templates, ' +
          'which belong to the program and are updated with it.',
        'Each letterhead shows the courses of the current year; those of past years stay ' +
          'where they are, and the letterhead only gives their number.',
        'A document that still had the old `templates/` folder beside it reads it once, on ' +
          'opening: the site, name, logo and signature written there move here. From then on ' +
          'the folder no longer counts.',
      ],
    },
  },
})
