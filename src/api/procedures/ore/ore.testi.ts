// I testi delle procedure di `ore`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento, o resterebbero nella lingua
// di prima.
//
// «Ora» è la voce del calendario (una `Lezione`): «Stunde», «leçon», «lesson»,
// come nel glossario. Esempi fra virgolette, valori ammessi («in-corso») e nomi
// di procedura («ore.elenco») restano uguali in ogni lingua.

import { catalogo } from '../../../i18n/index.js'

const it = {
  comune: {
    rimedioLezione: 'Le ore a calendario le elenca «ore.elenco», per corso o per periodo.',
    udInesistente: (quante: number) =>
      `Quell’unità didattica non esiste in questa ora: ce ne sono ${quante}, contate da zero.`,
    nonInClasse: 'Quella persona non è in questa classe.',
    soloDelCorso: 'Solo le ore di questo corso',
    soloDellaClasse: 'Solo le ore di questa classe',
    corsoComeSiLegge: 'Come si legge: «I MEC A — Matematica»',
    statiLezione: 'Pianificata, svolta o annullata',
  },
  appello: {
    campi: {
      titolo: 'I minuti di ritardo e la nota di una riga dell’appello',
      minuti: 'Minuti di ritardo. Lasciato fuori, resta quel che c’era',
    },
    casella: {
      titolo: 'Segna una casella dell’appello: una persona, un’unità didattica',
      lezioneId: 'L’ora su cui si scrive',
      allievoId: 'Chi si sta segnando',
      ud: 'L’unità didattica, contata da zero',
      stato: 'Come risulta quella persona in quell’unità',
    },
    colonna: {
      titolo: 'Segna un’unità didattica per tutta la classe',
    },
    leggi: {
      titolo: 'L’appello di un’ora, riga per riga, con i nomi di chi c’era',
      inizio: 'L’ora in cui comincia: «08:10»',
      fine: 'L’ora in cui finisce',
      nonPiuInClasse: '(non più in classe)',
      presentazione: {
        titolo: 'L’appello dell’ora',
        oraDi: 'Ora di',
        dalle: 'Dalle',
        alle: 'Alle',
        stato: 'Stato',
        appello: 'Appello',
        minutiDiRitardo: 'Minuti di ritardo',
        nota: 'Nota',
      },
    },
    riga: {
      titolo: 'Segna l’ora intera per una persona',
    },
    tutti: {
      titolo: 'Segna l’appello intero allo stesso modo',
    },
  },
  chiusure: {
    togli: {
      titolo: 'Toglie le ore dell’anno che cadono in un giorno di chiusura, fra due date',
      dal: 'Il primo giorno da guardare: di solito il lunedì della settimana',
      al: 'L’ultimo giorno da guardare, compreso',
    },
  },
  comportamento: {
    cella: {
      titolo: 'Una casella della matrice del comportamento: segno, nota, o tutti e due',
      aspetto: 'Una voce della lista «aspettoOsservato»',
      segno: 'null toglie il segno e lascia la nota; lasciato fuori, resta com’era',
    },
  },
  duplica: {
    titolo: 'Una copia dell’ora un altro giorno: stessa scaletta, appello e voti no',
    lezioneId: 'L’ora da ricopiare',
    data: 'Il giorno in cui va la copia',
    inizio: 'L’ora d’inizio della copia. Senza, restano le fasce dell’originale',
  },
  elenco: {
    titolo: 'Le ore a calendario in un periodo, con stato e argomenti',
    materiaId: 'Solo le ore di questa materia, in ogni classe',
    stato: 'Solo le ore in questo stato',
    /** Di che cosa parlano i filtri comuni: «Filtra le ore», «Solo le ore che…». */
    leOre: 'le ore',
    /** Dove cerca `cerca`: «Pezzi di argomento, corso o aula». */
    dove: 'argomento, corso o aula',
    cerca: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto',
    ha: 'I campi che si sono chiesti pieni',
    senza: 'I campi che si sono chiesti vuoti',
    numero: 'La quantesima del corso: le annullate non contano',
    minuti: 'Minuti di lezione effettiva, pause escluse',
    argomenti: 'Che cosa si è fatto, come l’ha scritto chi insegna',
    conAppello: 'Se l’appello è stato fatto almeno su una UD',
    presentazione: {
      titolo: 'Le ore a calendario',
      oreNelPeriodo: 'Ore nel periodo',
      dalle: 'Dalle',
      corso: 'Corso',
      stato: 'Stato',
      argomenti: 'Argomenti',
    },
  },
  elimina: {
    titolo: 'Toglie un’ora dal calendario, con appello, osservazioni e consuntivo',
  },
  leggi: {
    titolo: 'Un’ora per intero: argomenti, materiali, consuntivo, osservazioni',
    numero: 'La quantesima del corso',
    argomenti: 'Che cosa si è fatto',
    consuntivo: 'Com’è andata, scritto a fine ora',
    piano: 'Il piano assegnato, come si chiama',
    tipo: 'Di che genere è l’annotazione',
    chi: 'Di chi è, per esteso. Vuoto quando riguarda l’ora intera',
    presentazione: {
      titolo: 'L’ora del registro',
      corso: 'Corso',
      dalle: 'Dalle',
      alle: 'Alle',
      stato: 'Stato',
      quantesima: 'Quantesima',
      pianoAssegnato: 'Piano assegnato',
      argomenti: 'Argomenti',
      materiali: 'Materiali',
      consuntivo: 'Consuntivo',
      annotazioni: 'Annotazioni dell’ora',
      genere: 'Genere',
      annotazione: 'Annotazione',
    },
  },
  osservazione: {
    elimina: {
      titolo: 'Toglie un’annotazione da un’ora',
    },
    salva: {
      titolo: 'Scrive un’annotazione sull’ora: di una persona, o della classe intera',
      osservazione: 'L’annotazione intera. `allievoId` nullo vuol dire «tutta la classe»',
    },
  },
  prossima: {
    titolo:
      'La prossima lezione: quando comincia, di quale corso e con quale classe. ' +
      'Senza filtri è la prossima in assoluto',
    da: 'Da quale giorno guardare avanti. Senza, oggi',
    dalleOre: 'Da che ora guardare avanti, «HH:MM». Senza, adesso',
    quante: (massimo: number) => `Quante ore a venire, da 1 a ${massimo}. Senza, solo la prossima`,
    daUscita: 'Il giorno da cui si è guardato avanti',
    dalleOreUscita: 'L’ora da cui si è guardato avanti',
    aCalendario:
      'Quante ore non annullate ci sono in tutto con i filtri chiesti. Zero vuol dire che ' +
      'il calendario è vuoto, non che le lezioni siano finite',
    id: 'Da passare a «ore.leggi» per vedere l’ora per intero',
    inizio: 'Quando comincia. Nulla se quell’ora non ha un orario',
    fraGiorni: 'Zero è oggi, uno è domani',
    momento:
      'Solo sulla prima: «in-corso» se è cominciata e non è finita, «futura» se deve ' +
      'ancora cominciare. Nulla sulle altre',
    numero: 'La quantesima di quel corso',
    ud: 'Unità didattiche previste per quell’ora',
    argomenti: 'Quel che c’è scritto: vuoto se non è ancora stato segnato',
    presentazione: {
      titolo: 'La prossima lezione',
      da: 'Da',
      dalleOre: 'Dalle',
      aCalendario: 'Ore a calendario',
      dalle: 'Dalle',
      corso: 'Corso',
      argomento: 'Argomento',
    },
  },
  salva: {
    titolo: 'Scrive un’ora per intero: la crea se non c’era, la riscrive se c’era',
    lezione: 'L’ora per intero: corso, giorno, fasce, stato',
  },
  sposta: {
    titolo: 'La stessa ora un altro giorno, e — se si dice — a un’altra ora',
    data: 'Il giorno nuovo',
    inizio: 'Senza, il giorno cambia e le fasce restano dov’erano',
  },
  stato: {
    titolo: 'Pianificata, svolta o annullata',
  },
  testi: {
    titolo: 'Argomenti, materiali e consuntivo dell’ora, un campo alla volta',
    ingresso: 'Solo i campi presenti si scrivono: gli altri restano com’erano',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      rimedioLezione:
        'Die Stunden im Kalender listet «ore.elenco» auf, nach Kurs oder Zeitraum.',
      udInesistente: (quante) =>
        `Diese Lektion gibt es in dieser Stunde nicht: Es sind ${quante}, ` +
        'von null an gezählt.',
      nonInClasse: 'Diese Person ist nicht in dieser Klasse.',
      soloDelCorso: 'Nur die Stunden dieses Kurses',
      soloDellaClasse: 'Nur die Stunden dieser Klasse',
      corsoComeSiLegge: 'Wie man ihn liest: «I MEC A — Matematica»',
      statiLezione: 'Geplant, gehalten oder ausgefallen',
    },
    appello: {
      campi: {
        titolo: 'Die Verspätungsminuten und die Notiz einer Zeile der Präsenzkontrolle',
        minuti: 'Verspätung in Minuten. Weggelassen, bleibt, was schon da war',
      },
      casella: {
        titolo: 'Markiert ein Feld der Präsenzkontrolle: eine Person, eine Lektion',
        lezioneId: 'Die Stunde, in die geschrieben wird',
        allievoId: 'Wer gerade markiert wird',
        ud: 'Die Lektion, von null an gezählt',
        stato: 'Wie diese Person in dieser Lektion erfasst ist',
      },
      colonna: {
        titolo: 'Markiert eine Lektion für die ganze Klasse',
      },
      leggi: {
        titolo:
          'Die Präsenzkontrolle einer Stunde, Zeile für Zeile, mit den Namen ' +
          'derer, die dabei waren',
        inizio: 'Die Uhrzeit, zu der sie beginnt: «08:10»',
        fine: 'Die Uhrzeit, zu der sie endet',
        nonPiuInClasse: '(nicht mehr in der Klasse)',
        presentazione: {
          titolo: 'Die Präsenzkontrolle der Stunde',
          oraDi: 'Stunde',
          dalle: 'Von',
          alle: 'Bis',
          stato: 'Status',
          appello: 'Präsenz',
          minutiDiRitardo: 'Minuten Verspätung',
          nota: 'Notiz',
        },
      },
      riga: {
        titolo: 'Markiert die ganze Stunde für eine Person',
      },
      tutti: {
        titolo: 'Markiert die ganze Präsenzkontrolle auf die gleiche Weise',
      },
    },
    chiusure: {
      togli: {
        titolo:
          'Entfernt die Stunden des Jahres, die auf einen schulfreien Tag fallen, ' +
          'zwischen zwei Daten',
        dal: 'Der erste Tag, der geprüft wird: meist der Montag der Woche',
        al: 'Der letzte Tag, der geprüft wird, eingeschlossen',
      },
    },
    comportamento: {
      cella: {
        titolo: 'Ein Feld der Verhaltensmatrix: Zeichen, Notiz oder beides',
        aspetto: 'Ein Eintrag der Liste «aspettoOsservato»',
        segno: 'null entfernt das Zeichen und lässt die Notiz; weggelassen, bleibt es, wie es war',
      },
    },
    duplica: {
      titolo:
        'Eine Kopie der Stunde an einem anderen Tag: gleicher Ablauf, ' +
        'ohne Präsenzkontrolle und Noten',
      lezioneId: 'Die Stunde, die kopiert wird',
      data: 'Der Tag, an den die Kopie kommt',
      inizio: 'Die Anfangszeit der Kopie. Ohne sie bleiben die Zeitfenster des Originals',
    },
    elenco: {
      titolo: 'Die Stunden im Kalender in einem Zeitraum, mit Status und Themen',
      materiaId: 'Nur die Stunden dieses Fachs, in allen Klassen',
      stato: 'Nur die Stunden mit diesem Status',
      leOre: 'die Stunden',
      dove: 'Thema, Kurs oder Zimmer',
      cerca: 'Der angewendete Textfilter. Leer, wenn keiner verlangt wurde',
      ha: 'Die Felder, die ausgefüllt verlangt wurden',
      senza: 'Die Felder, die leer verlangt wurden',
      numero: 'Die wievielte Stunde des Kurses: Ausgefallene zählen nicht',
      minuti: 'Minuten effektiver Unterricht, ohne Pausen',
      argomenti: 'Was gemacht wurde, so wie die Lehrperson es geschrieben hat',
      conAppello: 'Ob die Präsenzkontrolle mindestens für eine Lektion gemacht wurde',
      presentazione: {
        titolo: 'Die Stunden im Kalender',
        oreNelPeriodo: 'Stunden im Zeitraum',
        dalle: 'Von',
        corso: 'Kurs',
        stato: 'Status',
        argomenti: 'Themen',
      },
    },
    elimina: {
      titolo:
        'Entfernt eine Stunde aus dem Kalender, samt Präsenzkontrolle, ' +
        'Beobachtungen und Rückblick',
    },
    leggi: {
      titolo: 'Eine Stunde vollständig: Themen, Materialien, Rückblick, Beobachtungen',
      numero: 'Die wievielte Stunde des Kurses',
      argomenti: 'Was gemacht wurde',
      consuntivo: 'Wie es gelaufen ist, am Ende der Stunde geschrieben',
      piano: 'Der zugewiesene Unterrichtsplan, mit seinem Namen',
      tipo: 'Welcher Art der Eintrag ist',
      chi: 'Wen er betrifft, ausgeschrieben. Leer, wenn er die ganze Stunde betrifft',
      presentazione: {
        titolo: 'Die Stunde im Klassenbuch',
        corso: 'Kurs',
        dalle: 'Von',
        alle: 'Bis',
        stato: 'Status',
        quantesima: 'Nummer',
        pianoAssegnato: 'Zugewiesener Plan',
        argomenti: 'Themen',
        materiali: 'Materialien',
        consuntivo: 'Rückblick',
        annotazioni: 'Einträge zur Stunde',
        genere: 'Art',
        annotazione: 'Eintrag',
      },
    },
    osservazione: {
      elimina: {
        titolo: 'Entfernt einen Eintrag aus einer Stunde',
      },
      salva: {
        titolo:
          'Schreibt einen Eintrag zur Stunde: über eine Person oder über die ' +
          'ganze Klasse',
        osservazione: 'Der ganze Eintrag. `allievoId` null heisst «die ganze Klasse»',
      },
    },
    prossima: {
      titolo:
        'Die nächste Stunde: wann sie beginnt, zu welchem Kurs und mit welcher Klasse. ' +
        'Ohne Filter ist es die nächste überhaupt',
      da: 'Ab welchem Tag vorausgeschaut wird. Ohne, ab heute',
      dalleOre: 'Ab welcher Uhrzeit vorausgeschaut wird, «HH:MM». Ohne, ab jetzt',
      quante: (massimo) =>
        `Wie viele kommende Stunden, von 1 bis ${massimo}. Ohne, nur die nächste`,
      daUscita: 'Der Tag, ab dem vorausgeschaut wurde',
      dalleOreUscita: 'Die Uhrzeit, ab der vorausgeschaut wurde',
      aCalendario:
        'Wie viele nicht ausgefallene Stunden es mit den verlangten Filtern ' +
        'insgesamt gibt. Null heisst, dass der Kalender leer ist, nicht dass der Unterricht ' +
        'vorbei ist',
      id: 'An «ore.leggi» zu übergeben, um die ganze Stunde zu sehen',
      inizio: 'Wann sie beginnt. Null, wenn diese Stunde keine Uhrzeit hat',
      fraGiorni: 'Null ist heute, eins ist morgen',
      momento:
        'Nur bei der ersten: «in-corso», wenn sie begonnen und noch nicht geendet hat, ' +
        '«futura», wenn sie erst noch beginnt. Null bei den anderen',
      numero: 'Die wievielte Stunde dieses Kurses',
      ud: 'Für diese Stunde vorgesehene Lektionen',
      argomenti: 'Was eingetragen ist: leer, wenn noch nichts eingetragen wurde',
      presentazione: {
        titolo: 'Die nächste Stunde',
        da: 'Ab',
        dalleOre: 'Ab',
        aCalendario: 'Stunden im Kalender',
        dalle: 'Von',
        corso: 'Kurs',
        argomento: 'Thema',
      },
    },
    salva: {
      titolo:
        'Schreibt eine ganze Stunde: Legt sie an, wenn es sie nicht gab, ' +
        'überschreibt sie, wenn es sie gab',
      lezione: 'Die ganze Stunde: Kurs, Tag, Zeitfenster, Status',
    },
    sposta: {
      titolo:
        'Dieselbe Stunde an einem anderen Tag und – wenn angegeben – ' +
        'zu einer anderen Uhrzeit',
      data: 'Der neue Tag',
      inizio: 'Ohne ändert sich der Tag, und die Zeitfenster bleiben, wo sie waren',
    },
    stato: {
      titolo: 'Geplant, gehalten oder ausgefallen',
    },
    testi: {
      titolo: 'Themen, Materialien und Rückblick der Stunde, ein Feld nach dem anderen',
      ingresso:
        'Nur die mitgegebenen Felder werden geschrieben: Die anderen bleiben, wie sie waren',
    },
  },
  fr: {
    comune: {
      rimedioLezione:
        'Les leçons du calendrier sont listées par « ore.elenco », par cours ou par ' +
        'intervalle de dates.',
      udInesistente: (quante) =>
        `Cette période n’existe pas dans cette leçon : il y en a ${quante}, ` +
        'comptées à partir de zéro.',
      nonInClasse: 'Cette personne n’est pas dans cette classe.',
      soloDelCorso: 'Seulement les leçons de ce cours',
      soloDellaClasse: 'Seulement les leçons de cette classe',
      corsoComeSiLegge: 'Comment il se lit : « I MEC A — Matematica »',
      statiLezione: 'Prévue, donnée ou annulée',
    },
    appello: {
      campi: {
        titolo: 'Les minutes de retard et la remarque d’une ligne de l’appel',
        minuti: 'Minutes de retard. Omis, ce qui était là reste',
      },
      casella: {
        titolo: 'Marque une case de l’appel : une personne, une période',
        lezioneId: 'La leçon sur laquelle on écrit',
        allievoId: 'La personne que l’on marque',
        ud: 'La période, comptée à partir de zéro',
        stato: 'Comment cette personne figure dans cette période',
      },
      colonna: {
        titolo: 'Marque une période pour toute la classe',
      },
      leggi: {
        titolo:
          'L’appel d’une leçon, ligne par ligne, avec les noms de ceux qui étaient là',
        inizio: 'L’heure à laquelle elle commence : « 08:10 »',
        fine: 'L’heure à laquelle elle se termine',
        nonPiuInClasse: '(n’est plus dans la classe)',
        presentazione: {
          titolo: 'L’appel de la leçon',
          oraDi: 'Leçon',
          dalle: 'De',
          alle: 'À',
          stato: 'Statut',
          appello: 'Appel',
          minutiDiRitardo: 'Minutes de retard',
          nota: 'Remarque',
        },
      },
      riga: {
        titolo: 'Marque toute la leçon pour une personne',
      },
      tutti: {
        titolo: 'Marque tout l’appel de la même façon',
      },
    },
    chiusure: {
      togli: {
        titolo:
          'Retire les leçons de l’année qui tombent un jour de fermeture, ' +
          'entre deux dates',
        dal: 'Le premier jour à examiner : en général le lundi de la semaine',
        al: 'Le dernier jour à examiner, inclus',
      },
    },
    comportamento: {
      cella: {
        titolo: 'Une case de la grille du comportement : signe, remarque, ou les deux',
        aspetto: 'Une entrée de la liste « aspettoOsservato »',
        segno: 'null retire le signe et garde la remarque ; omis, il reste tel quel',
      },
    },
    duplica: {
      titolo:
        'Une copie de la leçon un autre jour : même déroulement, sans l’appel ' +
        'ni les notes',
      lezioneId: 'La leçon à recopier',
      data: 'Le jour où va la copie',
      inizio: 'L’heure de début de la copie. Sans elle, les plages de l’original restent',
    },
    elenco: {
      titolo:
        'Les leçons du calendrier sur un intervalle de dates, avec statut et sujets',
      materiaId: 'Seulement les leçons de cette branche, dans toutes les classes',
      stato: 'Seulement les leçons dans ce statut',
      leOre: 'les leçons',
      dove: 'sujet, cours ou salle',
      cerca: 'Le filtre de texte appliqué. Vide quand on n’en a pas demandé',
      ha: 'Les champs demandés remplis',
      senza: 'Les champs demandés vides',
      numero: 'Son rang dans le cours : les leçons annulées ne comptent pas',
      minuti: 'Minutes de cours effectif, pauses exclues',
      argomenti: 'Ce qu’on a fait, tel que l’enseignant l’a écrit',
      conAppello: 'Si l’appel a été fait sur au moins une période',
      presentazione: {
        titolo: 'Les leçons du calendrier',
        oreNelPeriodo: 'Leçons sur la période',
        dalle: 'De',
        corso: 'Cours',
        stato: 'Statut',
        argomenti: 'Sujets',
      },
    },
    elimina: {
      titolo:
        'Retire une leçon du calendrier, avec l’appel, les observations et le bilan',
    },
    leggi: {
      titolo: 'Une leçon en entier : sujets, matériel, bilan, observations',
      numero: 'Son rang dans le cours',
      argomenti: 'Ce qu’on a fait',
      consuntivo: 'Comment ça s’est passé, écrit en fin de leçon',
      piano: 'Le plan de leçon attribué, sous son nom',
      tipo: 'De quel genre est l’annotation',
      chi: 'Qui elle concerne, en toutes lettres. Vide quand elle concerne toute la leçon',
      presentazione: {
        titolo: 'La leçon du registre',
        corso: 'Cours',
        dalle: 'De',
        alle: 'À',
        stato: 'Statut',
        quantesima: 'Rang',
        pianoAssegnato: 'Plan attribué',
        argomenti: 'Sujets',
        materiali: 'Matériel',
        consuntivo: 'Bilan',
        annotazioni: 'Annotations de la leçon',
        genere: 'Genre',
        annotazione: 'Annotation',
      },
    },
    osservazione: {
      elimina: {
        titolo: 'Retire une annotation d’une leçon',
      },
      salva: {
        titolo:
          'Écrit une annotation sur la leçon : sur une personne, ou sur toute la classe',
        osservazione: 'L’annotation entière. `allievoId` null veut dire « toute la classe »',
      },
    },
    prossima: {
      titolo:
        'La prochaine leçon : quand elle commence, de quel cours et avec quelle classe. ' +
        'Sans filtre, c’est la prochaine tout court',
      da: 'À partir de quel jour regarder en avant. Sans, aujourd’hui',
      dalleOre: 'À partir de quelle heure regarder en avant, « HH:MM ». Sans, maintenant',
      quante: (massimo) =>
        `Combien de leçons à venir, de 1 à ${massimo}. Sans, seulement la prochaine`,
      daUscita: 'Le jour à partir duquel on a regardé en avant',
      dalleOreUscita: 'L’heure à partir de laquelle on a regardé en avant',
      aCalendario:
        'Combien de leçons non annulées il y a en tout avec les filtres demandés. ' +
        'Zéro veut dire que le calendrier est vide, pas que les cours sont terminés',
      id: 'À passer à « ore.leggi » pour voir la leçon en entier',
      inizio: 'Quand elle commence. Null si cette leçon n’a pas d’horaire',
      fraGiorni: 'Zéro, c’est aujourd’hui ; un, c’est demain',
      momento:
        'Seulement sur la première : « in-corso » si elle a commencé et n’est pas finie, ' +
        '« futura » si elle doit encore commencer. Null sur les autres',
      numero: 'Son rang dans ce cours',
      ud: 'Périodes prévues pour cette leçon',
      argomenti: 'Ce qui est écrit : vide si rien n’a encore été noté',
      presentazione: {
        titolo: 'La prochaine leçon',
        da: 'À partir du',
        dalleOre: 'À partir de',
        aCalendario: 'Leçons au calendrier',
        dalle: 'De',
        corso: 'Cours',
        argomento: 'Sujet',
      },
    },
    salva: {
      titolo:
        'Écrit une leçon en entier : la crée si elle n’existait pas, la réécrit ' +
        'si elle existait',
      lezione: 'La leçon en entier : cours, jour, plages, statut',
    },
    sposta: {
      titolo: 'La même leçon un autre jour et – si on le précise – à une autre heure',
      data: 'Le nouveau jour',
      inizio: 'Sans, le jour change et les plages restent où elles étaient',
    },
    stato: {
      titolo: 'Prévue, donnée ou annulée',
    },
    testi: {
      titolo: 'Sujets, matériel et bilan de la leçon, un champ à la fois',
      ingresso: 'Seuls les champs présents sont écrits : les autres restent tels quels',
    },
  },
  en: {
    comune: {
      rimedioLezione:
        'Lessons on the calendar are listed by “ore.elenco”, by course or by date range.',
      udInesistente: (quante) =>
        `That period does not exist in this lesson: there are ${quante}, ` +
        'counted from zero.',
      nonInClasse: 'That person is not in this class.',
      soloDelCorso: 'Only the lessons of this course',
      soloDellaClasse: 'Only the lessons of this class',
      corsoComeSiLegge: 'How it reads: “I MEC A — Matematica”',
      statiLezione: 'Planned, held or cancelled',
    },
    appello: {
      campi: {
        titolo: 'The minutes late and the note on one attendance row',
        minuti: 'Minutes late. Left out, what was there stays',
      },
      casella: {
        titolo: 'Marks one attendance box: one person, one period',
        lezioneId: 'The lesson being written to',
        allievoId: 'Who is being marked',
        ud: 'The period, counted from zero',
        stato: 'How that person stands in that period',
      },
      colonna: {
        titolo: 'Marks one period for the whole class',
      },
      leggi: {
        titolo: 'The attendance of a lesson, row by row, with the names of who was there',
        inizio: 'The time it starts: “08:10”',
        fine: 'The time it ends',
        nonPiuInClasse: '(no longer in the class)',
        presentazione: {
          titolo: 'Attendance for the lesson',
          oraDi: 'Lesson',
          dalle: 'From',
          alle: 'To',
          stato: 'Status',
          appello: 'Attendance',
          minutiDiRitardo: 'Minutes late',
          nota: 'Note',
        },
      },
      riga: {
        titolo: 'Marks the whole lesson for one person',
      },
      tutti: {
        titolo: 'Marks the whole attendance the same way',
      },
    },
    chiusure: {
      togli: {
        titolo: 'Removes the year’s lessons that fall on a closure day, between two dates',
        dal: 'The first day to check: usually the Monday of the week',
        al: 'The last day to check, inclusive',
      },
    },
    comportamento: {
      cella: {
        titolo: 'One box of the behaviour grid: mark, note, or both',
        aspetto: 'An item from the “aspettoOsservato” list',
        segno: 'null removes the mark and keeps the note; left out, it stays as it was',
      },
    },
    duplica: {
      titolo: 'A copy of the lesson on another day: same outline, no attendance or grades',
      lezioneId: 'The lesson to copy',
      data: 'The day the copy goes on',
      inizio: 'The start time of the copy. Without it, the original’s time slots stay',
    },
    elenco: {
      titolo: 'The lessons on the calendar in a date range, with status and topics',
      materiaId: 'Only the lessons of this subject, in every class',
      stato: 'Only the lessons with this status',
      leOre: 'the lessons',
      dove: 'topic, course or room',
      cerca: 'The text filter applied. Empty when none was asked for',
      ha: 'The fields asked to be filled',
      senza: 'The fields asked to be empty',
      numero: 'Its number within the course: cancelled ones do not count',
      minuti: 'Minutes of actual teaching, breaks excluded',
      argomenti: 'What was done, as the teacher wrote it',
      conAppello: 'Whether attendance was taken for at least one period',
      presentazione: {
        titolo: 'Lessons on the calendar',
        oreNelPeriodo: 'Lessons in period',
        dalle: 'From',
        corso: 'Course',
        stato: 'Status',
        argomenti: 'Topics',
      },
    },
    elimina: {
      titolo:
        'Removes a lesson from the calendar, with its attendance, observations and review',
    },
    leggi: {
      titolo: 'A whole lesson: topics, materials, review, observations',
      numero: 'Its number within the course',
      argomenti: 'What was done',
      consuntivo: 'How it went, written at the end of the lesson',
      piano: 'The assigned lesson plan, by name',
      tipo: 'What kind of note it is',
      chi: 'Whom it is about, in full. Empty when it concerns the whole lesson',
      presentazione: {
        titolo: 'The lesson in the register',
        corso: 'Course',
        dalle: 'From',
        alle: 'To',
        stato: 'Status',
        quantesima: 'Number',
        pianoAssegnato: 'Assigned plan',
        argomenti: 'Topics',
        materiali: 'Materials',
        consuntivo: 'Review',
        annotazioni: 'Notes on the lesson',
        genere: 'Kind',
        annotazione: 'Note',
      },
    },
    osservazione: {
      elimina: {
        titolo: 'Removes a note from a lesson',
      },
      salva: {
        titolo: 'Writes a note on the lesson: about one person, or the whole class',
        osservazione: 'The whole note. A null `allievoId` means “the whole class”',
      },
    },
    prossima: {
      titolo:
        'The next lesson: when it starts, which course and which class. ' +
        'Without filters it is the very next one',
      da: 'From which day to look ahead. Without it, today',
      dalleOre: 'From what time to look ahead, “HH:MM”. Without it, now',
      quante: (massimo) =>
        `How many upcoming lessons, from 1 to ${massimo}. Without it, only the next one`,
      daUscita: 'The day from which it looked ahead',
      dalleOreUscita: 'The time from which it looked ahead',
      aCalendario:
        'How many non-cancelled lessons there are in total with the filters asked for. ' +
        'Zero means the calendar is empty, not that lessons are over',
      id: 'Pass it to “ore.leggi” to see the whole lesson',
      inizio: 'When it starts. Null if that lesson has no time',
      fraGiorni: 'Zero is today, one is tomorrow',
      momento:
        'Only on the first: “in-corso” if it has started and not finished, “futura” if it ' +
        'has yet to start. Null on the others',
      numero: 'Its number within that course',
      ud: 'Periods planned for that lesson',
      argomenti: 'What is written: empty if nothing has been entered yet',
      presentazione: {
        titolo: 'The next lesson',
        da: 'From',
        dalleOre: 'From',
        aCalendario: 'Lessons on the calendar',
        dalle: 'From',
        corso: 'Course',
        argomento: 'Topic',
      },
    },
    salva: {
      titolo: 'Writes a whole lesson: creates it if it was not there, rewrites it if it was',
      lezione: 'The whole lesson: course, day, time slots, status',
    },
    sposta: {
      titolo: 'The same lesson on another day and – if given – at another time',
      data: 'The new day',
      inizio: 'Without it, the day changes and the time slots stay where they were',
    },
    stato: {
      titolo: 'Planned, held or cancelled',
    },
    testi: {
      titolo: 'Topics, materials and review of the lesson, one field at a time',
      ingresso: 'Only the fields present are written: the others stay as they were',
    },
  },
})
