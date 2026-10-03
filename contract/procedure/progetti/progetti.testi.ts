// I testi delle procedure di `progetti`. Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  /** Quel che più procedure del progetto si dividono. */
  comune: {
    progettoId: 'Il progetto: i progetti li elenca «progetti.leggi»',
    compitoId: 'Il compito del progetto',
    corsoId: 'Il corso in cui il progetto è integrato: la classe è la sua',
    allievoId: 'Chi: una persona della classe del corso',
    rimedioProgetti: 'I progetti dell’anno li elenca «progetti.leggi».',
    rimedioCompiti: 'I compiti di un progetto in un corso li elenca «progetti.leggi» con il corso.',
    nonIntegrato:
      'Il progetto non è integrato in questo corso: lo si integra con «progetti.integra»; ' +
      '«progetti.leggi» dice in quali corsi lo è.',
    lezioneId: 'L’ora del corso: la data sarà la sua, e la seguirà',
    data: 'Il giorno, se non è dentro un’ora. Senza, oggi',
  },
  leggi: {
    titolo:
      'I progetti dell’anno, con i corsi in cui sono integrati. Con un corso, il lavoro con ' +
      'quella classe: lezioni e prove che ci lavorano, compiti con chi li ha cominciati e ' +
      'finiti, giudizi e matrice',
    corsoId:
      'Solo i progetti integrati in questo corso, visti da lì: periodo, tappe, compiti, ' +
      'giudizi, matrice. Senza, la testata e i corsi',
    progettoId: 'Solo questo progetto',
    oggi: 'Il giorno a cui si guarda il punto dei compiti. Senza, oggi',
    corso: 'La classe e la materia',
    corsi: 'I corsi in cui il progetto è integrato, per nome',
    integrazioni: 'I corsi in cui il progetto è integrato, ognuno con il suo stato',
    stato: 'A che punto è con la classe del corso: bozza, in-corso o concluso',
    lezioni: 'Le ore il cui piano ha tappe del progetto, in ordine, con i titoli delle tappe',
    momenti: 'Le valutazioni promosse dal progetto',
    compiti: 'I compiti, con il punto di ognuno',
    statoAllievo: 'non-iniziato, in-corso, fatto o scaduto (oggi, con la sua proroga)',
    fineCompito: 'La fine comune; quella di un’ora segue la lezione',
    inizioProgetto: 'Il giorno della prima ora con tappe del progetto; null se non ce ne sono',
    fineProgetto: 'Il giorno dell’ultima ora con tappe del progetto; null se non ce ne sono',
    quota: 'Quanto è fatto, da 0 a 1: tappe svolte intere, parziali a metà, saltate fuori dal conto',
    fasi:
      'Le fasi, nell’ordine: ognuna con il suo periodo, le sue tappe nelle ore con lo stato, ' +
      'e quanto è fatta',
    inizioFase: 'Il giorno della prima ora con tappe della fase; null se non ce ne sono',
    fineFase: 'Il giorno dell’ultima ora con tappe della fase; null se non ce ne sono',
    statoTappa: 'da-fare, svolta, parziale o saltata, dal consuntivo dell’ora',
    presenze:
      'Chi frequenta, nelle ore del progetto: UD su cui ci si è pronunciati, UD perse, ore ' +
      'con ritardo',
    fineAllievo: 'La fine che vale per questa persona: la sua proroga o quella comune',
    fineLezioneId: 'L’ora del corso in cui cade la fine comune, se ce n’è una',
    fatti: 'Quante persone l’hanno spuntato',
    giudizi: 'Le note datate; senza persona valgono per la classe',
    matrice: 'Le celle allievo × criterio, per giorno: più giorni raccontano la progressione',
    presentazione: {
      titolo: 'I progetti',
      progetto: 'Progetto',
      corsi: 'Corsi',
    },
  },
  salva: {
    titolo:
      'Crea un progetto dell’anno o ne cambia la testata: titolo, obiettivi, fasi, scaletta, ' +
      'criteri, livelli, risorse e note',
    progetto:
      'Il progetto intero, di nessun corso; un id che non c’è lo crea. Le integrazioni nei ' +
      'corsi (stato, compiti, giudizi, matrice) restano quelle del registro. Un criterio o una fase senza id con ' +
      'il titolo di uno che c’è ne tiene l’id. Le fasi, in ordine, sono almeno una; omesse ' +
      'restano quelle di prima. Le tappe dei piani di una fase tolta passano alla fase ' +
      'rimasta che la precedeva, o alla prima',
    scartaCelle:
      'true per salvare anche se un criterio tolto o un livello tolto o rinominato farebbe ' +
      'cadere celle della matrice; senza, il salvataggio si rifiuta e dice quante e perché',
  },
  elimina: {
    titolo:
      'Toglie un progetto da tutti i corsi, con compiti, giudizi e matrice; tappe dei piani ' +
      'e valutazioni restano, senza progetto',
  },
  integra: {
    titolo:
      'Integra un progetto in un corso, in bozza: lì avrà compiti, giudizi e matrice. Se lo ' +
      'è già non cambia niente',
  },
  integrazione: {
    stato: {
      titolo: 'Dice a che punto è il progetto con la classe di un corso',
      stato: 'bozza, in-corso o concluso',
    },
    togli: {
      titolo:
        'Toglie il progetto da un corso: compiti, giudizi e matrice di quella classe se ne ' +
        'vanno; il progetto resta, e tappe dei piani del corso e valutazioni restano, sganciate',
    },
  },
  cella: {
    titolo:
      'Scrive una cella della matrice del progetto: il livello di una persona su un criterio, ' +
      'in un giorno',
    criterioId: 'Il criterio del progetto',
    livello: 'Il valore di un livello della scala del progetto, o null per lasciare solo la nota',
    nota: 'Una nota sulla cella. Senza, resta quella che c’è; livello null e nota vuota tolgono la cella',
  },
  compito: {
    salva: {
      titolo: 'Crea un compito del progetto o ne cambia titolo, descrizione e fine comune',
      compito: 'Il compito: inizi, proroghe e spunte restano quelli del registro',
      id: 'L’id del compito da cambiare; senza, è un compito nuovo',
      titoloCompito: 'Che cosa si fa',
      descrizione: 'Come, con che cosa',
      fine: 'La fine comune, o null se non ce n’è una',
      fineLezioneId:
        'L’ora del corso entro cui finisce, anche conclusa: la fine ne segue il giorno. ' +
        'Omessa, resta quella di prima se la fine è ancora il suo giorno; null la stacca',
    },
    elimina: { titolo: 'Toglie un compito dal progetto, con inizi, proroghe e spunte' },
    inizia: {
      titolo:
        'Segna quando delle persone hanno cominciato un compito. Con data o ora lo sposta ' +
        'anche a chi l’aveva; senza, oggi e solo a chi non aveva cominciato',
      allieviIds: 'Chi comincia: persone della classe del corso',
    },
    togliInizio: {
      titolo: 'Toglie l’inizio di un compito a delle persone',
      allieviIds: 'A chi toglierlo',
    },
    proroga: {
      titolo: 'Dà a una persona una fine sua per il compito, o la toglie',
      fine: 'Il giorno nuovo, o null per tornare alla fine comune',
      nota: 'Perché',
    },
    fatto: {
      titolo: 'Spunta il compito fatto da una persona, o toglie la spunta',
      fatto: 'true spunta, false toglie la spunta',
      nota: 'Una nota sulla spunta',
    },
    fattoTutti: {
      titolo: 'Spunta il compito a tutti quelli che frequentano, o toglie tutte le spunte',
      fatto:
        'true spunta chi frequenta e non l’aveva; false toglie tutte le spunte, anche di chi ' +
        's’è ritirato, con le loro note',
    },
  },
  giudizio: {
    salva: {
      titolo: 'Scrive un giudizio datato sul progetto, su una persona o sulla classe',
      giudizio: 'Il giudizio. In un’ora conclusa non si scrive, non si cambia e non si toglie',
      id: 'L’id del giudizio da cambiare; senza, è nuovo',
      allievoId: 'Su chi, o null per la classe',
      testo: 'Che cosa si nota',
    },
    elimina: {
      titolo: 'Toglie un giudizio dal progetto',
      giudizioId: 'Il giudizio',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      progettoId: 'Das Projekt: Die Projekte listet «progetti.leggi» auf',
      compitoId: 'Die Aufgabe des Projekts',
      corsoId: 'Der Kurs, in den das Projekt eingebunden ist: Die Klasse ist seine',
      allievoId: 'Wer: eine Person aus der Klasse des Kurses',
      rimedioProgetti: 'Die Projekte des Schuljahrs listet «progetti.leggi» auf.',
      rimedioCompiti: 'Die Aufgaben eines Projekts in einem Kurs listet «progetti.leggi» mit dem Kurs auf.',
      nonIntegrato:
        'Das Projekt ist nicht in diesen Kurs eingebunden: Man bindet es mit «progetti.integra» ' +
        'ein; «progetti.leggi» sagt, in welchen Kursen es ist.',
      lezioneId: 'Die Stunde des Kurses: Das Datum ist ihres und folgt ihr',
      data: 'Der Tag, wenn es nicht in einer Stunde ist. Ohne: heute',
    },
    leggi: {
      titolo:
        'Die Projekte des Schuljahrs, mit den Kursen, in die sie eingebunden sind. Mit einem ' +
        'Kurs die Arbeit mit dieser Klasse: Stunden und Prüfungen dazu, Aufgaben mit wer sie ' +
        'begonnen und erledigt hat, Einschätzungen und Matrix',
      corsoId:
        'Nur die in diesen Kurs eingebundenen Projekte, von dort aus gesehen: Zeitraum, ' +
        'Etappen, Aufgaben, Einschätzungen, Matrix. Ohne: Kopf und Kurse',
      progettoId: 'Nur dieses Projekt',
      oggi: 'Der Tag, an dem der Stand der Aufgaben gemessen wird. Ohne: heute',
      corso: 'Klasse und Fach',
      corsi: 'Die Kurse, in die das Projekt eingebunden ist, mit Namen',
      integrazioni: 'Die Kurse, in die das Projekt eingebunden ist, jeder mit seinem Stand',
      stato: 'Wie weit es mit der Klasse des Kurses ist: bozza, in-corso oder concluso',
      lezioni: 'Die Stunden, deren Plan Etappen des Projekts hat, in Reihenfolge, mit den Titeln der Etappen',
      momenti: 'Die Leistungsbeurteilungen des Projekts',
      compiti: 'Die Aufgaben, mit dem Stand jeder Person',
      statoAllievo: 'non-iniziato, in-corso, fatto oder scaduto (heute, mit ihrer Verlängerung)',
      fineCompito: 'Das gemeinsame Ende; jenes einer Stunde folgt der Stunde',
      inizioProgetto: 'Der Tag der ersten Stunde mit Etappen des Projekts; null, wenn es keine gibt',
      fineProgetto: 'Der Tag der letzten Stunde mit Etappen des Projekts; null, wenn es keine gibt',
      quota:
        'Wie viel erledigt ist, von 0 bis 1: durchgeführte Etappen ganz, teilweise zur Hälfte, ' +
        'ausgelassene nicht gezählt',
      fasi:
        'Die Phasen, in Reihenfolge: jede mit ihrem Zeitraum, ihren Etappen in den Stunden mit ' +
        'Stand, und wie viel erledigt ist',
      inizioFase: 'Der Tag der ersten Stunde mit Etappen der Phase; null, wenn es keine gibt',
      fineFase: 'Der Tag der letzten Stunde mit Etappen der Phase; null, wenn es keine gibt',
      statoTappa: 'da-fare, svolta, parziale oder saltata, aus dem Rückblick der Stunde',
      presenze:
        'Wer die Klasse besucht, in den Stunden des Projekts: beurteilte Lektionen, verpasste ' +
        'Lektionen, Stunden mit Verspätung',
      fineAllievo: 'Das Ende, das für diese Person gilt: ihre Verlängerung oder das gemeinsame',
      fineLezioneId: 'Die Stunde des Kurses, in die das gemeinsame Ende fällt, falls es eine gibt',
      fatti: 'Wie viele Personen sie abgehakt haben',
      giudizi: 'Die datierten Notizen; ohne Person gelten sie für die Klasse',
      matrice: 'Die Zellen Lernende × Kriterium, pro Tag: mehrere Tage zeigen den Fortschritt',
      presentazione: {
        titolo: 'Die Projekte',
        progetto: 'Projekt',
        corsi: 'Kurse',
      },
    },
    salva: {
      titolo:
        'Erstellt ein Projekt des Schuljahrs oder ändert seinen Kopf: Titel, Ziele, Phasen, ' +
        'Ablauf, Kriterien, Stufen, Ressourcen und Notizen',
      progetto:
        'Das ganze Projekt, ohne Kurs; eine unbekannte ID erstellt es. Die Einbindungen in ' +
        'Kurse (Stand, Aufgaben, Einschätzungen, Matrix) bleiben die des Klassenbuchs. Ein Kriterium oder ' +
        'eine Phase ohne ID mit dem Titel eines bestehenden behält dessen ID. Die Phasen, in ' +
        'Reihenfolge, sind mindestens eine; weggelassen bleiben die bisherigen. Die Etappen der ' +
        'Pläne in einer entfernten Phase kommen in die verbliebene Phase davor oder in die erste',
      scartaCelle:
        'true, um auch zu speichern, wenn ein entferntes Kriterium oder eine entfernte oder ' +
        'umbenannte Stufe Zellen der Matrix verlieren würde; ohne wird abgelehnt, mit Anzahl und Grund',
    },
    elimina: {
      titolo:
        'Entfernt ein Projekt aus allen Kursen, mit Aufgaben, Einschätzungen und Matrix; ' +
        'Etappen und Leistungsbeurteilungen bleiben, ohne Projekt',
    },
    integra: {
      titolo:
        'Bindet ein Projekt in einen Kurs ein, als Entwurf: Dort hat es Aufgaben, ' +
        'Einschätzungen und Matrix. Ist es schon eingebunden, ändert sich nichts',
    },
    integrazione: {
      stato: {
        titolo: 'Sagt, wie weit das Projekt mit der Klasse eines Kurses ist',
        stato: 'bozza, in-corso oder concluso',
      },
      togli: {
        titolo:
          'Nimmt das Projekt aus einem Kurs: Aufgaben, Einschätzungen und Matrix dieser Klasse ' +
          'gehen; das Projekt bleibt, Etappen der Pläne des Kurses und Leistungsbeurteilungen ' +
          'bleiben, gelöst',
      },
    },
    cella: {
      titolo:
        'Schreibt eine Zelle der Projektmatrix: die Stufe einer Person bei einem Kriterium, ' +
        'an einem Tag',
      criterioId: 'Das Kriterium des Projekts',
      livello: 'Der Wert einer Stufe der Projektskala, oder null, um nur die Notiz zu lassen',
      nota: 'Eine Notiz zur Zelle. Ohne bleibt die bisherige; Stufe null und leere Notiz entfernen die Zelle',
    },
    compito: {
      salva: {
        titolo: 'Erstellt eine Projektaufgabe oder ändert Titel, Beschreibung und gemeinsames Ende',
        compito: 'Die Aufgabe: Beginne, Verlängerungen und Häkchen bleiben die des Klassenbuchs',
        id: 'Die ID der zu ändernden Aufgabe; ohne ist es eine neue',
        titoloCompito: 'Was zu tun ist',
        descrizione: 'Wie, womit',
        fine: 'Das gemeinsame Ende, oder null, wenn es keines gibt',
        fineLezioneId:
          'Die Stunde des Kurses, bis zu der sie dauert, auch abgeschlossen: Das Ende folgt ' +
          'ihrem Tag. Weggelassen bleibt die bisherige, wenn das Ende noch ihr Tag ist; null löst sie',
      },
      elimina: { titolo: 'Entfernt eine Aufgabe aus dem Projekt, mit Beginnen, Verlängerungen und Häkchen' },
      inizia: {
        titolo:
          'Hält fest, wann Personen eine Aufgabe begonnen haben. Mit Datum oder Stunde wird ' +
          'es auch bei Begonnenen verschoben; ohne: heute, und nur bei wer noch nicht begonnen hat',
        allieviIds: 'Wer beginnt: Personen aus der Klasse des Kurses',
      },
      togliInizio: {
        titolo: 'Entfernt den Beginn einer Aufgabe bei Personen',
        allieviIds: 'Bei wem',
      },
      proroga: {
        titolo: 'Gibt einer Person ein eigenes Ende für die Aufgabe, oder entfernt es',
        fine: 'Der neue Tag, oder null, um zum gemeinsamen Ende zurückzukehren',
        nota: 'Warum',
      },
      fatto: {
        titolo: 'Hakt die Aufgabe einer Person als erledigt ab, oder entfernt das Häkchen',
        fatto: 'true hakt ab, false entfernt das Häkchen',
        nota: 'Eine Notiz zum Häkchen',
      },
      fattoTutti: {
        titolo: 'Hakt die Aufgabe bei allen ab, die den Kurs besuchen, oder entfernt alle Häkchen',
        fatto:
          'true hakt ab, wer teilnimmt und noch fehlt; false entfernt alle Häkchen, auch von ' +
          'Ausgetretenen, mit ihren Notizen',
      },
    },
    giudizio: {
      salva: {
        titolo: 'Schreibt eine datierte Einschätzung zum Projekt, zu einer Person oder zur Klasse',
        giudizio:
          'Die Einschätzung. In einer abgeschlossenen Stunde wird sie weder geschrieben, ' +
          'geändert noch entfernt',
        id: 'Die ID der zu ändernden Einschätzung; ohne ist sie neu',
        allievoId: 'Zu wem, oder null für die Klasse',
        testo: 'Was festgestellt wird',
      },
      elimina: {
        titolo: 'Entfernt eine Einschätzung aus dem Projekt',
        giudizioId: 'Die Einschätzung',
      },
    },
  },
  fr: {
    comune: {
      progettoId: 'Le projet : les projets sont listés par « progetti.leggi »',
      compitoId: 'La tâche du projet',
      corsoId: 'Le cours dans lequel le projet est intégré : la classe est la sienne',
      allievoId: 'Qui : une personne de la classe du cours',
      rimedioProgetti: 'Les projets de l’année sont listés par « progetti.leggi ».',
      rimedioCompiti: 'Les tâches d’un projet dans un cours sont listées par « progetti.leggi » avec le cours.',
      nonIntegrato:
        'Le projet n’est pas intégré dans ce cours : on l’intègre avec « progetti.integra » ; ' +
        '« progetti.leggi » dit dans quels cours il l’est.',
      lezioneId: 'La leçon du cours : la date sera la sienne, et la suivra',
      data: 'Le jour, si ce n’est pas dans une leçon. Sans : aujourd’hui',
    },
    leggi: {
      titolo:
        'Les projets de l’année, avec les cours où ils sont intégrés. Avec un cours, le travail ' +
        'avec cette classe : leçons et épreuves qui y travaillent, tâches avec qui les a ' +
        'commencées et finies, appréciations et grille',
      corsoId:
        'Seulement les projets intégrés dans ce cours, vus de là : période, étapes, tâches, ' +
        'appréciations, grille. Sans : l’en-tête et les cours',
      progettoId: 'Seulement ce projet',
      oggi: 'Le jour auquel on regarde où en sont les tâches. Sans : aujourd’hui',
      corso: 'La classe et la branche',
      corsi: 'Les cours où le projet est intégré, par nom',
      integrazioni: 'Les cours où le projet est intégré, chacun avec son état',
      stato: 'Où en est le projet avec la classe du cours : bozza, in-corso ou concluso',
      lezioni: 'Les leçons dont le plan a des étapes du projet, dans l’ordre, avec les titres des étapes',
      momenti: 'Les évaluations du projet',
      compiti: 'Les tâches, avec où en est chacun',
      statoAllievo: 'non-iniziato, in-corso, fatto ou scaduto (aujourd’hui, avec sa prolongation)',
      fineCompito: 'La fin commune ; celle d’une leçon suit la leçon',
      inizioProgetto: 'Le jour de la première leçon avec des étapes du projet ; null s’il n’y en a pas',
      fineProgetto: 'Le jour de la dernière leçon avec des étapes du projet ; null s’il n’y en a pas',
      quota:
        'Ce qui est fait, de 0 à 1 : étapes réalisées entières, partielles à moitié, sautées ' +
        'hors du compte',
      fasi:
        'Les phases, dans l’ordre : chacune avec sa période, ses étapes dans les leçons avec ' +
        'leur état, et ce qui en est fait',
      inizioFase: 'Le jour de la première leçon avec des étapes de la phase ; null s’il n’y en a pas',
      fineFase: 'Le jour de la dernière leçon avec des étapes de la phase ; null s’il n’y en a pas',
      statoTappa: 'da-fare, svolta, parziale ou saltata, d’après le bilan de la leçon',
      presenze:
        'Les personnes qui fréquentent, dans les leçons du projet : périodes évaluées, périodes ' +
        'manquées, leçons avec retard',
      fineAllievo: 'La fin qui vaut pour cette personne : sa prolongation ou la commune',
      fineLezioneId: 'La leçon du cours où tombe la fin commune, s’il y en a une',
      fatti: 'Combien de personnes l’ont cochée',
      giudizi: 'Les notes datées ; sans personne, elles valent pour la classe',
      matrice: 'Les cases personne × critère, par jour : plusieurs jours montrent la progression',
      presentazione: {
        titolo: 'Les projets',
        progetto: 'Projet',
        corsi: 'Cours',
      },
    },
    salva: {
      titolo:
        'Crée un projet de l’année ou en change l’en-tête : titre, objectifs, phases, ' +
        'déroulement, critères, niveaux, ressources et notes',
      progetto:
        'Le projet entier, d’aucun cours ; un id inconnu le crée. Les intégrations dans les ' +
        'cours (état, tâches, appréciations, grille) restent celles du registre. Un critère ou une phase sans id ' +
        'portant le titre d’un existant en garde l’id. Les phases, dans l’ordre, sont au moins ' +
        'une ; omises, celles d’avant restent. Les étapes des plans d’une phase retirée passent ' +
        'à la phase restante qui la précédait, ou à la première',
      scartaCelle:
        'true pour enregistrer même si un critère retiré ou un niveau retiré ou renommé ferait ' +
        'perdre des cellules de la grille ; sans, l’enregistrement est refusé avec le nombre et la raison',
    },
    elimina: {
      titolo:
        'Supprime un projet de tous les cours, avec tâches, appréciations et grille ; les ' +
        'étapes des plans et les évaluations restent, sans projet',
    },
    integra: {
      titolo:
        'Intègre un projet dans un cours, en brouillon : il y aura tâches, appréciations et ' +
        'grille. S’il l’est déjà, rien ne change',
    },
    integrazione: {
      stato: {
        titolo: 'Dit où en est le projet avec la classe d’un cours',
        stato: 'bozza, in-corso ou concluso',
      },
      togli: {
        titolo:
          'Retire le projet d’un cours : tâches, appréciations et grille de cette classe ' +
          's’en vont ; le projet reste, et les étapes des plans du cours et les évaluations ' +
          'restent, détachées',
      },
    },
    cella: {
      titolo:
        'Écrit une case de la grille du projet : le niveau d’une personne sur un critère, ' +
        'un jour donné',
      criterioId: 'Le critère du projet',
      livello: 'La valeur d’un niveau de l’échelle du projet, ou null pour ne garder que la note',
      nota: 'Une note sur la case. Sans, celle qui existe reste ; niveau null et note vide suppriment la case',
    },
    compito: {
      salva: {
        titolo: 'Crée une tâche du projet ou en change le titre, la description et la fin commune',
        compito: 'La tâche : débuts, prolongations et coches restent ceux du registre',
        id: 'L’id de la tâche à changer ; sans, c’est une nouvelle tâche',
        titoloCompito: 'Ce qu’il faut faire',
        descrizione: 'Comment, avec quoi',
        fine: 'La fin commune, ou null s’il n’y en a pas',
        fineLezioneId:
          'La leçon du cours où elle se termine, même terminée : la fin en suit le jour. ' +
          'Omise, la précédente reste si la fin est encore son jour ; null la détache',
      },
      elimina: { titolo: 'Supprime une tâche du projet, avec débuts, prolongations et coches' },
      inizia: {
        titolo:
          'Note quand des personnes ont commencé une tâche. Avec une date ou une leçon, le ' +
          'déplace aussi pour qui avait commencé ; sans, aujourd’hui et seulement pour les autres',
        allieviIds: 'Qui commence : des personnes de la classe du cours',
      },
      togliInizio: {
        titolo: 'Retire le début d’une tâche à des personnes',
        allieviIds: 'À qui le retirer',
      },
      proroga: {
        titolo: 'Donne à une personne sa propre fin pour la tâche, ou la retire',
        fine: 'Le nouveau jour, ou null pour revenir à la fin commune',
        nota: 'Pourquoi',
      },
      fatto: {
        titolo: 'Coche la tâche faite par une personne, ou retire la coche',
        fatto: 'true coche, false retire la coche',
        nota: 'Une note sur la coche',
      },
      fattoTutti: {
        titolo: 'Coche la tâche pour tous ceux qui suivent le cours, ou retire toutes les coches',
        fatto:
          'true coche qui fréquente et ne l’avait pas ; false retire toutes les coches, aussi ' +
          'des personnes parties, avec leurs notes',
      },
    },
    giudizio: {
      salva: {
        titolo: 'Écrit une appréciation datée sur le projet, pour une personne ou pour la classe',
        giudizio:
          'L’appréciation. Dans une leçon terminée, elle ne s’écrit, ne se change ni ne se retire',
        id: 'L’id de l’appréciation à changer ; sans, elle est nouvelle',
        allievoId: 'Sur qui, ou null pour la classe',
        testo: 'Ce qu’on remarque',
      },
      elimina: {
        titolo: 'Supprime une appréciation du projet',
        giudizioId: 'L’appréciation',
      },
    },
  },
  en: {
    comune: {
      progettoId: 'The project: “progetti.leggi” lists the projects',
      compitoId: 'The project task',
      corsoId: 'The course the project is integrated into: the class is its class',
      allievoId: 'Who: a person in the course’s class',
      rimedioProgetti: '“progetti.leggi” lists the year’s projects.',
      rimedioCompiti: '“progetti.leggi” with the course lists a project’s tasks in that course.',
      nonIntegrato:
        'The project isn’t integrated into this course: “progetti.integra” integrates it; ' +
        '“progetti.leggi” says which courses it is in.',
      lezioneId: 'The course lesson: the date will be its date, and will follow it',
      data: 'The day, if it isn’t in a lesson. Without it, today',
    },
    leggi: {
      titolo:
        'The year’s projects, with the courses they are integrated into. With a course, the ' +
        'work with that class: the lessons and tests that work on them, tasks with who started ' +
        'and finished them, comments and grid',
      corsoId:
        'Only the projects integrated into this course, seen from there: period, steps, tasks, ' +
        'comments, grid. Without it, the header and the courses',
      progettoId: 'Only this project',
      oggi: 'The day on which task progress is judged. Without it, today',
      corso: 'The class and the subject',
      corsi: 'The courses the project is integrated into, by name',
      integrazioni: 'The courses the project is integrated into, each with its status',
      stato: 'Where it stands with the course’s class: bozza, in-corso or concluso',
      lezioni: 'The lessons whose plan has project steps, in order, with the step titles',
      momenti: 'The assessments the project set up',
      compiti: 'The tasks, with where each person stands',
      statoAllievo: 'non-iniziato, in-corso, fatto or scaduto (today, with their extension)',
      fineCompito: 'The common end; a lesson’s end follows the lesson',
      inizioProgetto: 'The day of the first lesson with steps of the project; null if there are none',
      fineProgetto: 'The day of the last lesson with steps of the project; null if there are none',
      quota: 'How much is done, from 0 to 1: steps done count whole, partial ones half, skipped ones not at all',
      fasi:
        'The phases, in order: each with its period, its steps in the lessons with their ' +
        'status, and how much is done',
      inizioFase: 'The day of the first lesson with steps of the phase; null if there are none',
      fineFase: 'The day of the last lesson with steps of the phase; null if there are none',
      statoTappa: 'da-fare, svolta, parziale or saltata, from the lesson’s record',
      presenze:
        'Those attending, in the project’s lessons: periods recorded, periods missed, lessons ' +
        'with late arrival',
      fineAllievo: 'The end that applies to this person: their extension or the common one',
      fineLezioneId: 'The course lesson the common end falls in, if any',
      fatti: 'How many people ticked it',
      giudizi: 'The dated notes; without a person they apply to the class',
      matrice: 'The person × criterion cells, by day: several days show the progression',
      presentazione: {
        titolo: 'The projects',
        progetto: 'Project',
        corsi: 'Courses',
      },
    },
    salva: {
      titolo:
        'Creates a project of the year or changes its header: title, aims, phases, outline, ' +
        'criteria, levels, resources and notes',
      progetto:
        'The whole project, of no course; an unknown id creates it. Its integrations into ' +
        'courses (status, tasks, comments, grid) stay as in the register. A criterion or phase without id titled like an ' +
        'existing one keeps its id. There is at least one phase, in order; left out, the ' +
        'previous ones stay. Plan steps in a removed phase move to the remaining phase before ' +
        'it, or to the first',
      scartaCelle:
        'true to save even if a removed criterion or a removed or renamed level would drop ' +
        'grid cells; without it, the save is refused, saying how many and why',
    },
    elimina: {
      titolo:
        'Removes a project from every course, with tasks, comments and grid; plan steps and ' +
        'assessments stay, with no project',
    },
    integra: {
      titolo:
        'Integrates a project into a course, as a draft: there it will have tasks, comments ' +
        'and grid. If it already is, nothing changes',
    },
    integrazione: {
      stato: {
        titolo: 'Says where the project stands with a course’s class',
        stato: 'bozza, in-corso or concluso',
      },
      togli: {
        titolo:
          'Removes the project from a course: that class’s tasks, comments and grid go; the ' +
          'project stays, and the course’s plan steps and assessments stay, detached',
      },
    },
    cella: {
      titolo:
        'Writes a cell of the project grid: a person’s level on a criterion, on a day',
      criterioId: 'The project criterion',
      livello: 'The value of a level on the project’s scale, or null to keep only the note',
      nota: 'A note on the cell. Without it, the existing one stays; level null and an empty note remove the cell',
    },
    compito: {
      salva: {
        titolo: 'Creates a project task or changes its title, description and common end',
        compito: 'The task: starts, extensions and ticks stay as in the register',
        id: 'The id of the task to change; without it, it’s a new task',
        titoloCompito: 'What is to be done',
        descrizione: 'How, with what',
        fine: 'The common end, or null if there isn’t one',
        fineLezioneId:
          'The course lesson it ends by, even a finished one: the end follows its day. ' +
          'Left out, the previous one stays if the end is still its day; null detaches it',
      },
      elimina: { titolo: 'Removes a task from the project, with starts, extensions and ticks' },
      inizia: {
        titolo:
          'Records when people started a task. With a date or lesson it also moves those who ' +
          'had started; without, today and only for those who hadn’t',
        allieviIds: 'Who starts: people in the course’s class',
      },
      togliInizio: {
        titolo: 'Removes the start of a task for some people',
        allieviIds: 'For whom',
      },
      proroga: {
        titolo: 'Gives a person their own end for the task, or removes it',
        fine: 'The new day, or null to go back to the common end',
        nota: 'Why',
      },
      fatto: {
        titolo: 'Ticks the task as done by a person, or removes the tick',
        fatto: 'true ticks, false removes the tick',
        nota: 'A note on the tick',
      },
      fattoTutti: {
        titolo: 'Ticks the task for everyone attending, or removes all ticks',
        fatto:
          'true ticks those attending who lack it; false removes every tick, including people ' +
          'who left, with their notes',
      },
    },
    giudizio: {
      salva: {
        titolo: 'Writes a dated comment on the project, about a person or the class',
        giudizio:
          'The comment. In a finished lesson it can’t be written, changed or removed',
        id: 'The id of the comment to change; without it, it’s new',
        allievoId: 'About whom, or null for the class',
        testo: 'What is noticed',
      },
      elimina: {
        titolo: 'Removes a comment from the project',
        giudizioId: 'The comment',
      },
    },
  },
})
