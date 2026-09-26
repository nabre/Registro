// I testi delle procedure di `valutazioni`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento, o resterebbero nella lingua
// di prima.

import { catalogo, numero } from '../../../i18n/index.js'

const it = {
  comune: {
    rimedioMomento: 'I momenti di valutazione di un corso li elenca «valutazioni.elenco».',
  },
  daAttivita: {
    titolo: 'Apre il momento di valutazione previsto da una tappa del piano',
    lezioneId: 'L’ora dentro cui la prova si fa',
    attivitaId: 'La tappa della scaletta che prevedeva la prova',
  },
  elenco: {
    titolo: 'I momenti di valutazione di un corso in un periodo',
    corsoId: 'Solo le prove di questo corso',
    classeId: 'Solo le prove dei corsi di questa classe',
    /** Quel che il periodo e i campi pieni o vuoti filtrano: il buco nell’aiuto comune. */
    prove: 'le prove',
    /** Dove si cerca: il buco nell’aiuto comune di `cerca`. */
    doveCercare: 'titolo, genere o corso',
    corsoChiesto: 'Il corso chiesto, o nullo se erano tutti',
    corso: 'Come si legge: «I MEC A — Matematica». Vuoto se erano tutti',
    cerca: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto',
    ha: 'I campi che si sono chiesti pieni',
    senza: 'I campi che si sono chiesti vuoti',
    id: 'Da passare a «valutazioni.voti» per avere le righe',
    corsoIdMomento: 'Di quale corso è: serve quando si chiedono tutti',
    corsoMomento: 'Come si legge quel corso',
    tipo: 'Scritto, orale, pratico, progetto, compito, osservazione',
    peso: 'Quanto pesa nella media del semestre: zero vuol dire «non conta»',
    voti: 'Quanti voti sono già stati messi',
    assenti: 'Quante persone erano assenti alla prova',
    media: 'La media dei voti messi, zero se non ce n’è nessuno',
    daRiconsegnare: 'Fogli corretti ancora in mano a chi insegna',
    recuperi: 'Quante persone devono rifarla',
    conAllegati: 'Se ha dei fogli allegati',
    presentazione: {
      titolo: 'I momenti di valutazione',
      corso: 'Corso',
      prova: 'Prova',
      genere: 'Genere',
      peso: 'Peso',
      votiMessi: 'Voti messi',
      media: 'Media',
      daRiconsegnare: 'Da riconsegnare',
    },
  },
  elimina: {
    titolo: 'Butta via un momento di valutazione, con i suoi voti e i suoi PDF',
  },
  eliminaOrfane: {
    titolo: 'Butta via i momenti che nessuna tappa del piano ha fatto nascere',
    ids: 'Gli id visti nell’elenco: non «tutti quelli sganciati», che nel frattempo può cambiare',
  },
  riconsegna: {
    titolo: 'La prova corretta tornata in mano a tutta la classe, in un colpo',
    il: 'null toglie la data a tutti e rimette la prova fra quelle da ridare',
  },
  salva: {
    titolo: 'Salva un momento di valutazione intero, o ne crea uno nuovo',
  },
  voti: {
    titolo: 'I voti di un momento di valutazione, riga per riga',
    valutazioneId: 'Il momento, come lo elenca «valutazioni.elenco»',
    sufficienza: 'La soglia di quel giorno: la scala è una copia, e non cambia più',
    media:
      'La media dei voti che contano, nulla se non ce n’è nessuno: chi era assente non entra',
    voto: 'Nullo finché il voto non c’è: «non ancora messo» non è zero',
    sufficiente: 'Nullo dove il voto non c’è',
    riconsegnata: 'Il giorno in cui ha riavuto il foglio corretto',
    daRifare: 'Se è nella tabella dei recuperi e non è stato dispensato',
    recuperoIl: 'Quando rifà la prova, se è stato fissato',
    presentazione: {
      titolo: 'I voti della prova',
      prova: 'Prova',
      corso: 'Corso',
      peso: 'Peso',
      media: 'Media',
      insufficienti: 'Insufficienti',
      soglia: 'Soglia',
      voto: 'Voto',
      assente: 'Assente',
      daRifare: 'Da rifare',
      riconsegnata: 'Riconsegnata',
      nota: 'Nota',
    },
  },
  allegato: {
    aggiungi: {
      titolo:
        'Appende un PDF a una prova: il testo, la soluzione, o il compito corretto di qualcuno',
      ruolo: 'Che foglio è: testo, soluzione, prova corretta, recupero',
      allievoId: 'Di chi è il compito. Senza, il foglio è del momento e non di una persona',
    },
    apri: {
      titolo: 'Apre il PDF appeso a una prova con il visualizzatore del sistema',
    },
    elimina: {
      titolo:
        'Toglie un PDF da una prova e dal documento dell’anno (non va nel cestino di sistema)',
    },
  },
  recupero: {
    imposta: {
      titolo:
        'Che cosa si fa del buco lasciato da un’assenza: quando si rifà, o che non si rifà',
      previstoIl: 'Quando si rifà. null lo rimette fra quelli da fissare',
      dispensato: 'La prova non si recupera: niente data, niente foglio da ridare',
      riconsegnataIl:
        'Il giorno in cui la prova rifatta è tornata. Lasciato fuori resta com’era; null la toglie',
    },
  },
  voto: {
    imposta: {
      titolo: 'Il voto di una persona in una prova',
      valore:
        'null vuol dire «non ancora messo», che non è zero. Entra arrotondato al passo della scala',
      assente: 'Non ha fatto la prova: il voto non fa media e nasce un recupero',
      fuoriScala: (minimo: number, massimo: number, titolo: string) =>
        `Voto fuori dalla scala ${minimo}–${massimo} di «${titolo}».`,
    },
    riconsegna: {
      titolo: 'Il giorno in cui una persona ha riavuto la sua prova corretta',
      il: 'null la rimette fra quelle da ridare',
      senzaCasella: (titolo: string) =>
        `In «${titolo}» quella persona non ha una casella: non c’è niente da riconsegnare.`,
    },
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      rimedioMomento: 'Die Leistungsbeurteilungen eines Kurses listet «valutazioni.elenco» auf.',
    },
    daAttivita: {
      titolo: 'Öffnet die Leistungsbeurteilung, die eine Etappe des Unterrichtsplans vorsieht',
      lezioneId: 'Die Stunde, in der die Prüfung stattfindet',
      attivitaId: 'Die Etappe des Ablaufs, die die Prüfung vorsah',
    },
    elenco: {
      titolo: 'Die Leistungsbeurteilungen eines Kurses in einem Zeitraum',
      corsoId: 'Nur die Prüfungen dieses Kurses',
      classeId: 'Nur die Prüfungen der Kurse dieser Klasse',
      prove: 'die Prüfungen',
      doveCercare: 'Titel, Art oder Kurs',
      corsoChiesto: 'Der angefragte Kurs, oder null, wenn alle gefragt waren',
      corso: 'Wie er sich liest: «I MEC A — Matematica». Leer, wenn alle gefragt waren',
      cerca: 'Der angewandte Textfilter. Leer, wenn keiner verlangt wurde',
      ha: 'Die Felder, die gefüllt sein sollten',
      senza: 'Die Felder, die leer sein sollten',
      id: 'An «valutazioni.voti» übergeben, um die Zeilen zu erhalten',
      corsoIdMomento: 'Zu welchem Kurs sie gehört: nützlich, wenn alle abgefragt werden',
      corsoMomento: 'Wie sich dieser Kurs liest',
      tipo:
        'Einer der Werte `scritto`, `orale`, `pratico`, `progetto`, `compito`, `osservazione` ' +
        '(schriftlich, mündlich, praktisch, Projekt, Hausaufgabe, Beobachtung)',
      peso: 'Wie stark sie im Semesterdurchschnitt zählt: 0 heisst «zählt nicht»',
      voti: 'Wie viele Noten schon eingetragen wurden',
      assenti: 'Wie viele Personen bei der Prüfung abwesend waren',
      media: 'Der Durchschnitt der eingetragenen Noten, 0, wenn es keine gibt',
      daRiconsegnare: 'Korrigierte Blätter, die noch bei der Lehrperson liegen',
      recuperi: 'Wie viele Personen sie nachholen müssen',
      conAllegati: 'Ob Blätter angehängt sind',
      presentazione: {
        titolo: 'Die Leistungsbeurteilungen',
        corso: 'Kurs',
        prova: 'Prüfung',
        genere: 'Art',
        peso: 'Gewicht',
        votiMessi: 'Eingetragene Noten',
        media: 'Durchschnitt',
        daRiconsegnare: 'Zurückzugeben',
      },
    },
    elimina: {
      titolo: 'Löscht eine Leistungsbeurteilung mitsamt ihren Noten und PDFs',
    },
    eliminaOrfane: {
      titolo:
        'Löscht die Leistungsbeurteilungen, die aus keiner Etappe des Unterrichtsplans ' +
        'entstanden sind',
      ids:
        'Die in der Liste gesehenen IDs: nicht «alle abgekoppelten», denn das kann sich ' +
        'inzwischen ändern',
    },
    riconsegna: {
      titolo: 'Die korrigierte Prüfung an die ganze Klasse zurückgegeben, in einem Zug',
      il: 'null entfernt das Datum bei allen und setzt die Prüfung wieder auf «zurückzugeben»',
    },
    salva: {
      titolo: 'Speichert eine ganze Leistungsbeurteilung oder legt eine neue an',
    },
    voti: {
      titolo: 'Die Noten einer Leistungsbeurteilung, Zeile für Zeile',
      valutazioneId: 'Die Leistungsbeurteilung, wie «valutazioni.elenco» sie auflistet',
      sufficienza:
        'Die Genügend-Grenze jenes Tages: Die Skala ist eine Kopie und ändert sich nicht mehr',
      media:
        'Der Durchschnitt der zählenden Noten, null, wenn es keine gibt: Wer abwesend war, ' +
        'zählt nicht mit',
      voto: 'null, solange die Note fehlt: «noch nicht eingetragen» ist nicht die Zahl 0',
      sufficiente: 'null, wo die Note fehlt',
      riconsegnata: 'Der Tag, an dem die Person das korrigierte Blatt zurückbekommen hat',
      daRifare: 'Ob die Person in der Tabelle der Nachprüfungen steht und nicht dispensiert ist',
      recuperoIl: 'Wann die Person die Prüfung nachholt, falls das festgelegt ist',
      presentazione: {
        titolo: 'Die Noten der Prüfung',
        prova: 'Prüfung',
        corso: 'Kurs',
        peso: 'Gewicht',
        media: 'Durchschnitt',
        insufficienti: 'Ungenügend',
        soglia: 'Genügend ab',
        voto: 'Note',
        assente: 'Abwesend',
        daRifare: 'Nachzuholen',
        riconsegnata: 'Zurückgegeben',
        nota: 'Bemerkung',
      },
    },
    allegato: {
      aggiungi: {
        titolo:
          'Hängt ein PDF an eine Prüfung an: das Aufgabenblatt, die Lösung oder die ' +
          'korrigierte Arbeit einer Person',
        ruolo: 'Welches Blatt es ist: Aufgabenblatt, Lösung, korrigierte Prüfung, Nachprüfung',
        allievoId:
          'Wem die Arbeit gehört. Ohne gehört das Blatt zur Leistungsbeurteilung und nicht ' +
          'zu einer Person',
      },
      apri: {
        titolo: 'Öffnet das an eine Prüfung angehängte PDF mit dem Anzeigeprogramm des Systems',
      },
      elimina: {
        titolo:
          'Entfernt ein PDF aus einer Prüfung und aus dem Jahresdokument (es landet nicht im ' +
          'Papierkorb des Systems)',
      },
    },
    recupero: {
      imposta: {
        titolo:
          'Was mit der Lücke geschieht, die eine Abwesenheit hinterlässt: wann nachgeholt ' +
          'wird oder dass nicht nachgeholt wird',
        previstoIl:
          'Wann nachgeholt wird. null setzt die Nachprüfung wieder auf «noch festzulegen»',
        dispensato:
          'Die Prüfung wird nicht nachgeholt: kein Datum, kein Blatt zurückzugeben',
        riconsegnataIl:
          'Der Tag, an dem die nachgeholte Prüfung zurückgegeben wurde. Weggelassen bleibt ' +
          'er, wie er war; null entfernt ihn',
      },
    },
    voto: {
      imposta: {
        titolo: 'Die Note einer Person in einer Prüfung',
        valore:
          'null heisst «noch nicht eingetragen», und das ist nicht die Zahl 0. Wird auf den ' +
          'Schritt der Skala gerundet',
        assente:
          'Hat die Prüfung nicht geschrieben: Die Note zählt nicht zum Durchschnitt, und es ' +
          'entsteht eine Nachprüfung',
        fuoriScala: (minimo, massimo, titolo) =>
          `Note ausserhalb der Skala ${numero(minimo)}–${numero(massimo)} von «${titolo}».`,
      },
      riconsegna: {
        titolo: 'Der Tag, an dem eine Person ihre korrigierte Prüfung zurückbekommen hat',
        il: 'null setzt sie wieder auf «zurückzugeben»',
        senzaCasella: (titolo) =>
          `In «${titolo}» hat diese Person kein Feld: Es gibt nichts zurückzugeben.`,
      },
    },
  },
  fr: {
    comune: {
      rimedioMomento: 'Les évaluations d’un cours sont listées par « valutazioni.elenco ».',
    },
    daAttivita: {
      titolo: 'Ouvre l’évaluation prévue par une étape du plan de leçon',
      lezioneId: 'La leçon pendant laquelle l’épreuve a lieu',
      attivitaId: 'L’étape du déroulement qui prévoyait l’épreuve',
    },
    elenco: {
      titolo: 'Les évaluations d’un cours sur une période',
      corsoId: 'Seulement les épreuves de ce cours',
      classeId: 'Seulement les épreuves des cours de cette classe',
      prove: 'les épreuves',
      doveCercare: 'titre, type ou cours',
      corsoChiesto: 'Le cours demandé, ou null s’ils étaient tous demandés',
      corso: 'Comment il se lit : « I MEC A — Matematica ». Vide s’ils étaient tous demandés',
      cerca: 'Le filtre de texte appliqué. Vide quand aucun n’a été demandé',
      ha: 'Les champs demandés remplis',
      senza: 'Les champs demandés vides',
      id: 'À passer à « valutazioni.voti » pour obtenir les lignes',
      corsoIdMomento: 'À quel cours elle appartient : utile quand on les demande tous',
      corsoMomento: 'Comment ce cours se lit',
      tipo:
        'Une des valeurs `scritto`, `orale`, `pratico`, `progetto`, `compito`, `osservazione` ' +
        '(écrit, oral, pratique, projet, devoir à la maison, observation)',
      peso: 'Son poids dans la moyenne du semestre : zéro veut dire « ne compte pas »',
      voti: 'Combien de notes ont déjà été saisies',
      assenti: 'Combien de personnes étaient absentes à l’épreuve',
      media: 'La moyenne des notes saisies, zéro s’il n’y en a aucune',
      daRiconsegnare: 'Copies corrigées encore entre les mains de l’enseignant',
      recuperi: 'Combien de personnes doivent la refaire',
      conAllegati: 'Si des feuilles y sont jointes',
      presentazione: {
        titolo: 'Les évaluations',
        corso: 'Cours',
        prova: 'Épreuve',
        genere: 'Type',
        peso: 'Poids',
        votiMessi: 'Notes saisies',
        media: 'Moyenne',
        daRiconsegnare: 'À rendre',
      },
    },
    elimina: {
      titolo: 'Supprime une évaluation, avec ses notes et ses PDF',
    },
    eliminaOrfane: {
      titolo: 'Supprime les évaluations qu’aucune étape du plan de leçon n’a fait naître',
      ids:
        'Les id vus dans la liste : pas « tous ceux qui sont détachés », qui peut changer ' +
        'entre-temps',
    },
    riconsegna: {
      titolo: 'L’épreuve corrigée rendue à toute la classe, d’un coup',
      il: 'null retire la date à tous et remet l’épreuve parmi celles à rendre',
    },
    salva: {
      titolo: 'Enregistre une évaluation entière, ou en crée une nouvelle',
    },
    voti: {
      titolo: 'Les notes d’une évaluation, ligne par ligne',
      valutazioneId: 'L’évaluation, telle que « valutazioni.elenco » la liste',
      sufficienza: 'Le seuil de ce jour-là : le barème est une copie, et ne change plus',
      media:
        'La moyenne des notes qui comptent, null s’il n’y en a aucune : les absents n’y ' +
        'entrent pas',
      voto: 'Null tant que la note n’y est pas : « pas encore saisie » n’est pas zéro',
      sufficiente: 'Null là où la note manque',
      riconsegnata: 'Le jour où la personne a récupéré sa copie corrigée',
      daRifare: 'Si la personne figure dans le tableau des rattrapages sans avoir été dispensée',
      recuperoIl: 'Quand la personne refait l’épreuve, si la date est fixée',
      presentazione: {
        titolo: 'Les notes de l’épreuve',
        prova: 'Épreuve',
        corso: 'Cours',
        peso: 'Poids',
        media: 'Moyenne',
        insufficienti: 'Insuffisantes',
        soglia: 'Seuil',
        voto: 'Note',
        assente: 'Absent',
        daRifare: 'À refaire',
        riconsegnata: 'Rendue',
        nota: 'Remarque',
      },
    },
    allegato: {
      aggiungi: {
        titolo:
          'Joint un PDF à une épreuve : l’énoncé, le corrigé, ou la copie corrigée de ' +
          'quelqu’un',
        ruolo: 'Quelle feuille c’est : énoncé, corrigé, épreuve corrigée, rattrapage',
        allievoId:
          'À qui appartient la copie. Sans, la feuille est celle de l’évaluation et non ' +
          'd’une personne',
      },
      apri: {
        titolo: 'Ouvre le PDF joint à une épreuve avec la visionneuse du système',
      },
      elimina: {
        titolo:
          'Retire un PDF d’une épreuve et du document de l’année (il ne va pas dans la ' +
          'corbeille du système)',
      },
    },
    recupero: {
      imposta: {
        titolo:
          'Ce qu’on fait du trou laissé par une absence : quand on la rattrape, ou qu’on ne ' +
          'la rattrape pas',
        previstoIl: 'Quand on la rattrape. null remet le rattrapage parmi ceux à fixer',
        dispensato: 'L’épreuve ne se rattrape pas : pas de date, pas de copie à rendre',
        riconsegnataIl:
          'Le jour où l’épreuve refaite a été rendue. Omis, il reste tel quel ; null l’efface',
      },
    },
    voto: {
      imposta: {
        titolo: 'La note d’une personne à une épreuve',
        valore:
          'null veut dire « pas encore saisie », ce qui n’est pas zéro. Elle est arrondie au ' +
          'pas du barème',
        assente:
          'N’a pas passé l’épreuve : la note ne compte pas dans la moyenne et un rattrapage ' +
          'est créé',
        fuoriScala: (minimo, massimo, titolo) =>
          `Note hors du barème ${numero(minimo)}–${numero(massimo)} de « ${titolo} ».`,
      },
      riconsegna: {
        titolo: 'Le jour où une personne a récupéré son épreuve corrigée',
        il: 'null la remet parmi celles à rendre',
        senzaCasella: (titolo) =>
          `Dans « ${titolo} », cette personne n’a pas de case : il n’y a rien à rendre.`,
      },
    },
  },
  en: {
    comune: {
      rimedioMomento: 'The assessments of a course are listed by “valutazioni.elenco”.',
    },
    daAttivita: {
      titolo: 'Opens the assessment planned by a step of the lesson plan',
      lezioneId: 'The lesson in which the test takes place',
      attivitaId: 'The step of the outline that planned the test',
    },
    elenco: {
      titolo: 'The assessments of a course over a period',
      corsoId: 'Only the tests of this course',
      classeId: 'Only the tests of this class’s courses',
      prove: 'the tests',
      doveCercare: 'title, type or course',
      corsoChiesto: 'The course asked for, or null if all were asked for',
      corso: 'How it reads: “I MEC A — Matematica”. Empty if all were asked for',
      cerca: 'The text filter applied. Empty when none was asked for',
      ha: 'The fields asked to be filled',
      senza: 'The fields asked to be empty',
      id: 'Pass it to “valutazioni.voti” to get the rows',
      corsoIdMomento: 'Which course it belongs to: useful when all are asked for',
      corsoMomento: 'How that course reads',
      tipo:
        'One of `scritto`, `orale`, `pratico`, `progetto`, `compito`, `osservazione` ' +
        '(written, oral, practical, project, homework, observation)',
      peso: 'How much it weighs in the semester average: zero means “does not count”',
      voti: 'How many grades have already been entered',
      assenti: 'How many people were absent from the test',
      media: 'The average of the grades entered, zero if there are none',
      daRiconsegnare: 'Marked papers still in the teacher’s hands',
      recuperi: 'How many people have to resit it',
      conAllegati: 'Whether it has attached papers',
      presentazione: {
        titolo: 'The assessments',
        corso: 'Course',
        prova: 'Test',
        genere: 'Type',
        peso: 'Weight',
        votiMessi: 'Grades entered',
        media: 'Average',
        daRiconsegnare: 'To hand back',
      },
    },
    elimina: {
      titolo: 'Deletes an assessment, with its grades and its PDFs',
    },
    eliminaOrfane: {
      titolo: 'Deletes the assessments that no step of the lesson plan gave rise to',
      ids:
        'The ids seen in the list: not “all the detached ones”, which may change in the ' +
        'meantime',
    },
    riconsegna: {
      titolo: 'The marked test handed back to the whole class, in one go',
      il: 'null removes the date for everyone and puts the test back among those to hand back',
    },
    salva: {
      titolo: 'Saves a whole assessment, or creates a new one',
    },
    voti: {
      titolo: 'The grades of an assessment, row by row',
      valutazioneId: 'The assessment, as “valutazioni.elenco” lists it',
      sufficienza: 'The pass mark of that day: the scale is a copy, and no longer changes',
      media:
        'The average of the grades that count, null if there are none: those who were ' +
        'absent are left out',
      voto: 'Null until the grade is there: “not entered yet” is not zero',
      sufficiente: 'Null where there is no grade',
      riconsegnata: 'The day they got the marked paper back',
      daRifare: 'Whether they are in the resit table and have not been excused',
      recuperoIl: 'When they resit the test, if it has been scheduled',
      presentazione: {
        titolo: 'The grades of the test',
        prova: 'Test',
        corso: 'Course',
        peso: 'Weight',
        media: 'Average',
        insufficienti: 'Below pass',
        soglia: 'Pass mark',
        voto: 'Grade',
        assente: 'Absent',
        daRifare: 'To resit',
        riconsegnata: 'Handed back',
        nota: 'Note',
      },
    },
    allegato: {
      aggiungi: {
        titolo:
          'Attaches a PDF to a test: the paper, the solution, or someone’s marked work',
        ruolo: 'Which paper it is: test paper, solution, marked test, resit',
        allievoId:
          'Whose work it is. Without it, the paper belongs to the assessment and not to a ' +
          'person',
      },
      apri: {
        titolo: 'Opens the PDF attached to a test with the system viewer',
      },
      elimina: {
        titolo:
          'Removes a PDF from a test and from the year document (it does not go to the ' +
          'system recycle bin)',
      },
    },
    recupero: {
      imposta: {
        titolo:
          'What to do about the gap left by an absence: when it is resat, or that it is not',
        previstoIl: 'When it is resat. null puts it back among those still to be scheduled',
        dispensato: 'The test is not made up: no date, no paper to hand back',
        riconsegnataIl:
          'The day the resat test was handed back. Left out, it stays as it was; null ' +
          'removes it',
      },
    },
    voto: {
      imposta: {
        titolo: 'A person’s grade in a test',
        valore:
          'null means “not entered yet”, which is not zero. It is rounded to the step of the ' +
          'scale',
        assente:
          'Did not sit the test: the grade does not count towards the average and a resit ' +
          'is created',
        fuoriScala: (minimo, massimo, titolo) =>
          `Grade outside the ${numero(minimo)}–${numero(massimo)} scale of “${titolo}”.`,
      },
      riconsegna: {
        titolo: 'The day a person got their marked test back',
        il: 'null puts it back among those to hand back',
        senzaCasella: (titolo) =>
          `In “${titolo}” that person has no entry: there is nothing to hand back.`,
      },
    },
  },
})
