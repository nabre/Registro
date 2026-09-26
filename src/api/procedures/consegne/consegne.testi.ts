// I testi delle procedure di `consegne`. «docente» negli aiuti di `chi` è il
// valore del contratto (`CHI_INSEGNA`) e resta uguale in ogni lingua, come gli
// stati delle pendenze («aperta», «scade», «arretrata», «completa»). Si leggono
// al momento dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  /** Quel che più procedure delle consegne si dividono (`common.ts`). */
  comune: {
    chiSpunta: (docente: string) =>
      `L’id della persona, o «${docente}» per quel che tocca a chi insegna`,
    perChi: 'Di chi è il documento. null vuol dire «lo stesso per tutti»',
  },
  consegnato: {
    titolo: 'Consegnato a mano: la spunta che resta di un foglio dato in aula',
    allievoId: 'Chi ha ricevuto il foglio',
    fatta: 'false rimette il documento fra quelli da consegnare',
  },
  distribuisci: {
    titolo: 'Distribuisce i documenti per e-mail: un messaggio a testa, col suo allegato',
    allieviIds:
      'Solo questi. Lasciato fuori, tutti quelli che aspettano e hanno un documento pronto',
  },
  elimina: { titolo: 'Butta via una consegna, con i documenti che aveva raccolto' },
  raccogli: { titolo: 'Spunta raccogliendo il foglio: il file si archivia dentro la spunta' },
  salva: {
    titolo:
      'Salva una consegna, o ne crea una nuova. Di una che c’è già, spunte e ' +
      'documenti restano quelli del registro',
    consegna: 'Consegna',
  },
  spunta: {
    titolo: 'La spunta di una persona sola: fatta, o tornata da fare',
    fatta: 'false toglie la spunta — ma non se si porta dietro un documento',
  },
  spuntaTutti: {
    titolo: 'Spunta tutti quelli che mancano, o toglie le spunte nude',
    fatta: 'false toglie solo le spunte senza documento raccolto',
  },
  documento: {
    allega: { titolo: 'Mette da parte il documento da dare a qualcuno, prima di consegnarlo' },
    apri: { titolo: 'Apre il documento pronto con il programma del sistema' },
    togli: {
      titolo:
        'Toglie il documento pronto dalla consegna e dal documento dell’anno ' +
        '(non va nel cestino di sistema)',
    },
  },
  file: {
    apri: {
      titolo: 'Apre il documento che tocca a una persona in una consegna',
      chi: 'Chi riguarda il documento: una persona, o «docente» per la copia a sé',
    },
    togli: {
      titolo: 'Toglie il documento di una persona e la sua spunta: torna atteso',
      chi: 'Chi riguarda il documento da togliere',
      giaAtteso: 'Non c’è niente da togliere: è già atteso.',
    },
  },
  firme: {
    aggiungi: {
      titolo: 'Allega il foglio firmato da chi ha ritirato il documento',
      consegnaId: 'La consegna a cui si appende il foglio',
    },
    apri: { titolo: 'Apre il foglio firme di una consegna' },
    togli: {
      titolo:
        'Toglie il foglio firme dalla consegna e dal documento dell’anno ' +
        '(non va nel cestino di sistema)',
      giaTolto: 'Non c’è nessun foglio firme: è già stato tolto.',
    },
  },
  elenco: {
    titolo: 'Le pendenze aperte: consegne, documenti da raccogliere, firme',
    corsoId: 'Solo le pendenze di questo corso',
    classeId: 'Solo le pendenze di questa classe',
    stato: 'Solo quelle in questo stato',
    complete: 'Vero per avere anche quelle finite: di norma restano fuori',
    giorno: 'Rispetto a quale giorno si dice «scade» o «arretrata». Senza, oggi',
    arretrateDaAlmeno:
      'Giorni: solo quelle scadute da almeno tanti. Quelle senza termine restano fuori',
    scadeEntro: 'Giorni: solo quelle che scadono entro tanti, le già scadute escluse',
    dove: 'testo, corso o nota',
    giornoUscita: 'Il giorno rispetto a cui sono stati calcolati gli stati',
    arretrateDaAlmenoUscita: 'La soglia sull’arretrato applicata. Nulla se non se n’è chiesta',
    scadeEntroUscita: 'La soglia sulla scadenza applicata. Nulla se non se n’è chiesta',
    testo: 'Che cosa c’è da fare, come l’ha scritto chi insegna',
    a: 'A chi tocca: la classe, chi insegna, o alcune persone',
    data: 'Quando è stata data',
    scadenza: 'Per quando, o vuoto se non ha termine',
    giorni: 'Giorni dal «giorno» alla scadenza: negativo se è scaduta. Nulla senza termine',
    fatte: 'Quanti l’hanno già fatta',
    quota: 'A che punto è, da 0 a 1',
    mancano: 'Chi non l’ha ancora fatta, per cognome e nome',
    documento: 'Se spuntarla vuol dire raccogliere un foglio',
    /** Chi manca quando è chi insegna, nell'elenco dei nomi. */
    chiInsegna: 'chi insegna',
    /** L'ultima voce di un elenco di nomi tagliato. */
    eAltri: (quanti: number) => `… e altri ${quanti}`,
    presentazione: {
      titolo: 'Le pendenze',
      rispettoAl: 'Rispetto al',
      pendenze: 'Pendenze',
      corso: 'Corso',
      perIl: 'Per il',
      giorni: 'Giorni',
      fatte: 'Fatte',
      su: 'Su',
      mancano: 'Mancano',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      chiSpunta: (docente) =>
        `Die ID der Person oder «${docente}» für das, was die Lehrperson betrifft`,
      perChi: 'Wem das Dokument gehört. null heisst «dasselbe für alle»',
    },
    consegnato: {
      titolo:
        'Von Hand übergeben: das Häkchen, das von einem im Unterricht verteilten Blatt bleibt',
      allievoId: 'Wer das Blatt erhalten hat',
      fatta: 'false setzt das Dokument wieder unter die, die noch zu übergeben sind',
    },
    distribuisci: {
      titolo: 'Verteilt die Dokumente per E-Mail: eine Nachricht pro Person, mit ihrem Anhang',
      allieviIds:
        'Nur diese. Weggelassen: alle, die warten und ein fertiges Dokument haben',
    },
    elimina: { titolo: 'Löscht einen Auftrag samt den Dokumenten, die er gesammelt hatte' },
    raccogli: {
      titolo: 'Hakt ab und sammelt dabei das Blatt ein: Die Datei wird im Häkchen abgelegt',
    },
    salva: {
      titolo:
        'Speichert einen Auftrag oder erstellt einen neuen. Bei einem bestehenden bleiben ' +
        'Häkchen und Dokumente die des Klassenbuchs',
      consegna: 'Auftrag',
    },
    spunta: {
      titolo: 'Das Häkchen einer einzelnen Person: erledigt oder wieder offen',
      fatta: 'false entfernt das Häkchen – aber nicht, wenn ein Dokument daran hängt',
    },
    spuntaTutti: {
      titolo: 'Hakt alle ab, die noch fehlen, oder entfernt die Häkchen ohne Dokument',
      fatta: 'false entfernt nur die Häkchen ohne eingesammeltes Dokument',
    },
    documento: {
      allega: {
        titolo: 'Legt das Dokument bereit, das jemandem gegeben wird, bevor es übergeben wird',
      },
      apri: { titolo: 'Öffnet das bereite Dokument mit dem Programm des Systems' },
      togli: {
        titolo:
          'Entfernt das bereite Dokument aus dem Auftrag und aus dem Jahresdokument ' +
          '(es kommt nicht in den Papierkorb des Systems)',
      },
    },
    file: {
      apri: {
        titolo: 'Öffnet das Dokument, das einer Person in einem Auftrag zusteht',
        chi: 'Wen das Dokument betrifft: eine Person oder «docente» für die eigene Kopie',
      },
      togli: {
        titolo: 'Entfernt das Dokument einer Person und ihr Häkchen: Es ist wieder ausstehend',
        chi: 'Wen das Dokument betrifft, das entfernt wird',
        giaAtteso: 'Es gibt nichts zu entfernen: Es ist schon ausstehend.',
      },
    },
    firme: {
      aggiungi: {
        titolo:
          'Hängt das Blatt an, das von denen unterschrieben wurde, die das Dokument abgeholt haben',
        consegnaId: 'Der Auftrag, an den das Blatt gehängt wird',
      },
      apri: { titolo: 'Öffnet das Unterschriftenblatt eines Auftrags' },
      togli: {
        titolo:
          'Entfernt das Unterschriftenblatt aus dem Auftrag und aus dem Jahresdokument ' +
          '(es kommt nicht in den Papierkorb des Systems)',
        giaTolto: 'Es gibt kein Unterschriftenblatt: Es wurde schon entfernt.',
      },
    },
    elenco: {
      titolo: 'Die offenen Pendenzen: Aufträge, einzusammelnde Dokumente, Unterschriften',
      corsoId: 'Nur die Pendenzen dieses Kurses',
      classeId: 'Nur die Pendenzen dieser Klasse',
      stato: 'Nur die in diesem Status',
      complete: 'Wahr, um auch die erledigten zu erhalten: Normalerweise bleiben sie draussen',
      giorno: 'Bezogen auf welchen Tag «scade» oder «arretrata» gilt. Ohne: heute',
      arretrateDaAlmeno:
        'Tage: nur die, die seit mindestens so vielen Tagen überfällig sind. Die ohne Frist ' +
        'bleiben draussen',
      scadeEntro:
        'Tage: nur die, die innerhalb so vieler Tage fällig werden, die bereits überfälligen ' +
        'ausgenommen',
      dove: 'Text, Kurs oder Notiz',
      giornoUscita: 'Der Tag, auf den die Status berechnet wurden',
      arretrateDaAlmenoUscita:
        'Die angewendete Schwelle für Überfälliges. Null, wenn keine verlangt wurde',
      scadeEntroUscita: 'Die angewendete Schwelle für die Frist. Null, wenn keine verlangt wurde',
      testo: 'Was zu tun ist, so wie es die Lehrperson geschrieben hat',
      a: 'Wen es betrifft: die Klasse, die Lehrperson oder einige Personen',
      data: 'Wann er erteilt wurde',
      scadenza: 'Bis wann, oder leer, wenn es keine Frist gibt',
      giorni:
        'Tage vom «giorno» bis zur Frist: negativ, wenn sie abgelaufen ist. Null ohne Frist',
      fatte: 'Wie viele ihn schon erledigt haben',
      quota: 'Wie weit er ist, von 0 bis 1',
      mancano: 'Wer ihn noch nicht erledigt hat, nach Nachname und Vorname',
      documento: 'Ob Abhaken heisst, ein Blatt einzusammeln',
      chiInsegna: 'die Lehrperson',
      eAltri: (quanti) => `… und ${quanti} weitere`,
      presentazione: {
        titolo: 'Die Pendenzen',
        rispettoAl: 'Bezogen auf',
        pendenze: 'Pendenzen',
        corso: 'Kurs',
        perIl: 'Bis',
        giorni: 'Tage',
        fatte: 'Erledigt',
        su: 'Von',
        mancano: 'Fehlen',
      },
    },
  },
  fr: {
    comune: {
      chiSpunta: (docente) =>
        `L’id de la personne, ou « ${docente} » pour ce qui revient à la personne qui enseigne`,
      perChi: 'À qui est le document. null veut dire « le même pour tous »',
    },
    consegnato: {
      titolo: 'Remis en main propre : la coche qui reste d’une feuille distribuée en classe',
      allievoId: 'Qui a reçu la feuille',
      fatta: 'false remet le document parmi ceux à remettre',
    },
    distribuisci: {
      titolo: 'Distribue les documents par e-mail : un message par personne, avec sa pièce jointe',
      allieviIds:
        'Seulement ceux-ci. Si on l’omet, tous ceux qui attendent et ont un document prêt',
    },
    elimina: { titolo: 'Supprime un devoir, avec les documents qu’il avait recueillis' },
    raccogli: {
      titolo: 'Coche en recueillant la feuille : le fichier est archivé dans la coche',
    },
    salva: {
      titolo:
        'Enregistre un devoir, ou en crée un nouveau. Pour un devoir existant, les coches et ' +
        'les documents restent ceux du registre',
      consegna: 'Devoir',
    },
    spunta: {
      titolo: 'La coche d’une seule personne : faite, ou redevenue à faire',
      fatta: 'false retire la coche – mais pas si elle porte un document',
    },
    spuntaTutti: {
      titolo: 'Coche tous ceux qui manquent, ou retire les coches sans document',
      fatta: 'false retire seulement les coches sans document recueilli',
    },
    documento: {
      allega: {
        titolo: 'Met de côté le document à donner à quelqu’un, avant de le remettre',
      },
      apri: { titolo: 'Ouvre le document prêt avec le programme du système' },
      togli: {
        titolo:
          'Retire le document prêt du devoir et du document de l’année ' +
          '(il ne va pas dans la corbeille du système)',
      },
    },
    file: {
      apri: {
        titolo: 'Ouvre le document qui revient à une personne dans un devoir',
        chi: 'Qui concerne le document : une personne, ou « docente » pour sa propre copie',
      },
      togli: {
        titolo: 'Retire le document d’une personne et sa coche : il redevient attendu',
        chi: 'Qui concerne le document à retirer',
        giaAtteso: 'Il n’y a rien à retirer : il est déjà attendu.',
      },
    },
    firme: {
      aggiungi: {
        titolo: 'Joint la feuille signée par les personnes qui ont retiré le document',
        consegnaId: 'Le devoir auquel on joint la feuille',
      },
      apri: { titolo: 'Ouvre la feuille de signatures d’un devoir' },
      togli: {
        titolo:
          'Retire la feuille de signatures du devoir et du document de l’année ' +
          '(elle ne va pas dans la corbeille du système)',
        giaTolto: 'Il n’y a pas de feuille de signatures : elle a déjà été retirée.',
      },
    },
    elenco: {
      titolo: 'Les tâches en suspens ouvertes : devoirs, documents à recueillir, signatures',
      corsoId: 'Seulement les tâches en suspens de ce cours',
      classeId: 'Seulement les tâches en suspens de cette classe',
      stato: 'Seulement celles dans cet état',
      complete:
        'Vrai pour avoir aussi celles qui sont terminées : en principe elles restent de côté',
      giorno: 'Par rapport à quel jour on dit « scade » ou « arretrata ». Sans : aujourd’hui',
      arretrateDaAlmeno:
        'Jours : seulement celles en retard depuis au moins autant de jours. Celles sans échéance ' +
        'restent de côté',
      scadeEntro:
        'Jours : seulement celles qui arrivent à échéance dans ce délai, celles déjà en retard ' +
        'exclues',
      dove: 'texte, cours ou note',
      giornoUscita: 'Le jour par rapport auquel les états ont été calculés',
      arretrateDaAlmenoUscita: 'Le seuil de retard appliqué. Null s’il n’a pas été demandé',
      scadeEntroUscita: 'Le seuil d’échéance appliqué. Null s’il n’a pas été demandé',
      testo: 'Ce qu’il y a à faire, tel que l’a écrit la personne qui enseigne',
      a: 'À qui ça revient : la classe, la personne qui enseigne, ou quelques personnes',
      data: 'Quand il a été donné',
      scadenza: 'Pour quand, ou vide s’il n’y a pas d’échéance',
      giorni:
        'Jours du « giorno » à l’échéance : négatif s’il est échu. Null sans échéance',
      fatte: 'Combien l’ont déjà fait',
      quota: 'Où il en est, de 0 à 1',
      mancano: 'Qui ne l’a pas encore fait, par nom et prénom',
      documento: 'Si cocher veut dire recueillir une feuille',
      chiInsegna: 'la personne qui enseigne',
      eAltri: (quanti) => `… et ${quanti} autres`,
      presentazione: {
        titolo: 'Les tâches en suspens',
        rispettoAl: 'Par rapport au',
        pendenze: 'Tâches en suspens',
        corso: 'Cours',
        perIl: 'Pour le',
        giorni: 'Jours',
        fatte: 'Faites',
        su: 'Sur',
        mancano: 'Manquent',
      },
    },
  },
  en: {
    comune: {
      chiSpunta: (docente) =>
        `The person’s id, or “${docente}” for what falls to the teacher`,
      perChi: 'Whose document it is. null means “the same for everyone”',
    },
    consegnato: {
      titolo: 'Handed over in person: the tick that remains of a sheet given out in class',
      allievoId: 'Who received the sheet',
      fatta: 'false puts the document back among those to be handed over',
    },
    distribuisci: {
      titolo: 'Sends the documents by email: one message each, with its attachment',
      allieviIds: 'Only these. Left out, all those waiting who have a document ready',
    },
    elimina: { titolo: 'Deletes an assignment, with the documents it had collected' },
    raccogli: { titolo: 'Ticks while collecting the sheet: the file is filed inside the tick' },
    salva: {
      titolo:
        'Saves an assignment, or creates a new one. For an existing one, ticks and documents ' +
        'stay those of the register',
      consegna: 'Assignment',
    },
    spunta: {
      titolo: 'The tick of a single person: done, or back to be done',
      fatta: 'false removes the tick – but not if it carries a document',
    },
    spuntaTutti: {
      titolo: 'Ticks everyone still missing, or removes the ticks with nothing attached',
      fatta: 'false removes only the ticks without a collected document',
    },
    documento: {
      allega: { titolo: 'Sets aside the document to give to someone, before handing it over' },
      apri: { titolo: 'Opens the ready document with the system’s program' },
      togli: {
        titolo:
          'Removes the ready document from the assignment and from the year document ' +
          '(it does not go to the system recycle bin)',
      },
    },
    file: {
      apri: {
        titolo: 'Opens the document that belongs to a person in an assignment',
        chi: 'Who the document concerns: a person, or “docente” for one’s own copy',
      },
      togli: {
        titolo: 'Removes a person’s document and their tick: it is awaited again',
        chi: 'Who the document to remove concerns',
        giaAtteso: 'There is nothing to remove: it is already awaited.',
      },
    },
    firme: {
      aggiungi: {
        titolo: 'Attaches the sheet signed by those who collected the document',
        consegnaId: 'The assignment the sheet is attached to',
      },
      apri: { titolo: 'Opens the signature sheet of an assignment' },
      togli: {
        titolo:
          'Removes the signature sheet from the assignment and from the year document ' +
          '(it does not go to the system recycle bin)',
        giaTolto: 'There is no signature sheet: it has already been removed.',
      },
    },
    elenco: {
      titolo: 'The open pending items: assignments, documents to collect, signatures',
      corsoId: 'Only the pending items of this course',
      classeId: 'Only the pending items of this class',
      stato: 'Only those in this state',
      complete: 'True to include the finished ones too: normally they are left out',
      giorno: 'Relative to which day “scade” or “arretrata” is said. Without it, today',
      arretrateDaAlmeno:
        'Days: only those overdue by at least that many. Those without a deadline are left out',
      scadeEntro: 'Days: only those due within that many, the overdue ones excluded',
      dove: 'text, course or note',
      giornoUscita: 'The day the states were worked out against',
      arretrateDaAlmenoUscita: 'The overdue threshold applied. Null if none was asked for',
      scadeEntroUscita: 'The deadline threshold applied. Null if none was asked for',
      testo: 'What there is to do, as the teacher wrote it',
      a: 'Who it falls to: the class, the teacher, or some people',
      data: 'When it was set',
      scadenza: 'When it is due, or empty if there is no deadline',
      giorni: 'Days from “giorno” to the deadline: negative if overdue. Null without a deadline',
      fatte: 'How many have already done it',
      quota: 'How far along it is, from 0 to 1',
      mancano: 'Who has not done it yet, by surname and first name',
      documento: 'Whether ticking it means collecting a sheet',
      chiInsegna: 'the teacher',
      eAltri: (quanti) => `… and ${quanti} more`,
      presentazione: {
        titolo: 'Pending items',
        rispettoAl: 'As of',
        pendenze: 'Pending items',
        corso: 'Course',
        perIl: 'Due',
        giorni: 'Days',
        fatte: 'Done',
        su: 'Of',
        mancano: 'Missing',
      },
    },
  },
})
