// I testi delle procedure di `check`. Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  /** Quel che più procedure del check si dividono: i campi della casella e le guardie. */
  comune: {
    corsoId: 'Il corso della lista',
    allievoId: 'Chi: una persona della classe del corso',
    colonnaId: 'Quale colonna',
    rimedioCheck: 'La lista nasce con la prima colonna, data con «check.colonne».',
    rimedioColonne: 'Le colonne del corso le elenca «check.leggi».',
    rimedioPersone: 'Le persone del corso le elenca «check.leggi».',
    personaDiAltraClasse: (corso: string) =>
      `Quella persona non è della classe del corso «${corso}».`,
    lezioneDiAltroCorso: (corso: string) =>
      `Quella lezione non è del corso «${corso}»: la spunta ne seguirebbe la data.`,
  },
  colonne: {
    titolo: 'Le colonne della lista di controllo di un corso, tutte e nell’ordine giusto',
    id: 'L’id di una colonna che c’è già; vuoto per una nuova',
    titoloColonna: 'Che cosa si spunta: «ha firmato il regolamento». Vuoto la toglie',
    colonne:
      'Tutte le colonne, nell’ordine in cui si vedono. Quella che manca si ' +
      'porta via le sue spunte; nessuna colonna toglie la lista',
  },
  data: {
    titolo: 'Il giorno di una spunta scelto a mano: la spunta smette di seguire la sua ora',
    data: 'Il giorno. La casella resta spuntata, o lo diventa',
  },
  leggi: {
    titolo:
      'La lista di controllo di un corso: che cosa si spunta, chi l’ha fatto e quando, ' +
      'chi manca',
    corsoId: 'Il corso: i corsi dell’anno li elenca «corsi.elenco»',
    corso: 'La classe e la materia',
    allievi: 'Quanti frequentano: il totale di ogni colonna',
    titoloColonna: 'Che cosa si spunta',
    fatte: 'Quanti, fra chi frequenta, l’hanno spuntata',
    totale: 'Quanti frequentano',
    mancano: 'Chi frequenta e non l’ha ancora spuntata, per cognome e nome',
    colonne: 'Nell’ordine in cui si vedono. Vuoto se il corso non ha una lista',
    nome: 'Cognome e nome',
    attivo: 'Falso per chi si è ritirato: resta se ha qualcosa di spuntato',
    data:
      'Il giorno in cui è stata spuntata, o null se non lo è. ' +
      'Se è stata spuntata dentro un’ora, è il giorno di quell’ora',
    lezioneId: 'L’ora in cui è stata spuntata, o null se il giorno è stato scelto a mano',
    caselle: 'Una per colonna, nello stesso ordine di «colonne»',
    presentazione: {
      titolo: 'La lista di controllo',
      corso: 'Corso',
      frequentano: 'Frequentano',
      fatte: 'Fatte',
      su: 'Su',
      mancano: 'Mancano',
    },
  },
  lezione: {
    titolo: 'Una spunta passa a un’ora del corso: il suo giorno torna quello della lezione',
    lezioneId: 'L’ora del corso: la casella resta spuntata, o lo diventa, e ne segue la data',
  },
  spunta: {
    titolo: 'Spunta una casella della lista di controllo, o la toglie',
    fatta: 'true spunta, false toglie la spunta',
    lezioneId: 'L’ora del corso in cui si spunta: la data sarà la sua, e la seguirà',
    data: 'Il giorno, se non si spunta dentro un’ora. Senza, oggi',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      corsoId: 'Der Kurs der Liste',
      allievoId: 'Wer: eine Person aus der Klasse des Kurses',
      colonnaId: 'Welche Spalte',
      rimedioCheck: 'Die Liste entsteht mit der ersten Spalte, die man mit «check.colonne» angibt.',
      rimedioColonne: 'Die Spalten des Kurses listet «check.leggi» auf.',
      rimedioPersone: 'Die Personen des Kurses listet «check.leggi» auf.',
      personaDiAltraClasse: (corso) =>
        `Diese Person gehört nicht zur Klasse des Kurses «${corso}».`,
      lezioneDiAltroCorso: (corso) =>
        `Diese Stunde gehört nicht zum Kurs «${corso}»: Das Häkchen würde ihrem ` +
        'Datum folgen.',
    },
    colonne: {
      titolo: 'Die Spalten des Checks eines Kurses, alle und in der richtigen Reihenfolge',
      id: 'Die ID einer bestehenden Spalte; leer für eine neue',
      titoloColonna: 'Was abgehakt wird: «hat das Reglement unterschrieben». Leer entfernt sie',
      colonne:
        'Alle Spalten, in der Reihenfolge, in der man sie sieht. Die fehlende nimmt ihre Häkchen ' +
        'mit; keine Spalte entfernt die Liste',
    },
    data: {
      titolo:
        'Der Tag eines Häkchens, von Hand gewählt: Das Häkchen folgt nicht mehr seiner ' +
        'Stunde',
      data: 'Der Tag. Das Feld bleibt abgehakt oder wird es',
    },
    leggi: {
      titolo:
        'Der Check eines Kurses: was abgehakt wird, wer es getan hat und wann, wer noch fehlt',
      corsoId: 'Der Kurs: Die Kurse des Jahres listet «corsi.elenco» auf',
      corso: 'Die Klasse und das Fach',
      allievi: 'Wie viele teilnehmen: das Total jeder Spalte',
      titoloColonna: 'Was abgehakt wird',
      fatte: 'Wie viele der Teilnehmenden es abgehakt haben',
      totale: 'Wie viele teilnehmen',
      mancano: 'Wer teilnimmt und es noch nicht abgehakt hat, nach Nachname und Vorname',
      colonne: 'In der Reihenfolge, in der man sie sieht. Leer, wenn der Kurs keine Liste hat',
      nome: 'Nachname und Vorname',
      attivo: 'Falsch für ausgetretene Personen: bleibt, wenn etwas abgehakt ist',
      data:
        'Der Tag, an dem abgehakt wurde, oder null, wenn nicht. ' +
        'Wurde in einer Stunde abgehakt, ist es deren Tag',
      lezioneId:
        'Die Stunde, in der abgehakt wurde, oder null, wenn der Tag von Hand gewählt ' +
        'wurde',
      caselle: 'Eines pro Spalte, in derselben Reihenfolge wie «colonne»',
      presentazione: {
        titolo: 'Der Check',
        corso: 'Kurs',
        frequentano: 'Teilnehmende',
        fatte: 'Erledigt',
        su: 'Von',
        mancano: 'Fehlen',
      },
    },
    lezione: {
      titolo:
        'Ein Häkchen wechselt zu einer Stunde des Kurses: Sein Tag ist wieder der ' +
        'der Stunde',
      lezioneId:
        'Die Stunde des Kurses: Das Feld bleibt abgehakt oder wird es und folgt ihrem ' +
        'Datum',
    },
    spunta: {
      titolo: 'Hakt ein Feld des Checks ab oder entfernt das Häkchen',
      fatta: 'true hakt ab, false entfernt das Häkchen',
      lezioneId:
        'Die Stunde des Kurses, in der abgehakt wird: Das Datum ist ihres und folgt ihr',
      data: 'Der Tag, wenn nicht in einer Stunde abgehakt wird. Ohne: heute',
    },
  },
  fr: {
    comune: {
      corsoId: 'Le cours de la liste',
      allievoId: 'Qui : une personne de la classe du cours',
      colonnaId: 'Quelle colonne',
      rimedioCheck: 'La liste naît avec la première colonne, donnée avec « check.colonne ».',
      rimedioColonne: 'Les colonnes du cours, « check.leggi » les liste.',
      rimedioPersone: 'Les personnes du cours, « check.leggi » les liste.',
      personaDiAltraClasse: (corso) =>
        `Cette personne n’est pas de la classe du cours « ${corso} ».`,
      lezioneDiAltroCorso: (corso) =>
        `Cette leçon n’est pas du cours « ${corso} » : la coche en suivrait la date.`,
    },
    colonne: {
      titolo: 'Les colonnes du check d’un cours, toutes et dans le bon ordre',
      id: 'L’id d’une colonne qui existe déjà ; vide pour une nouvelle',
      titoloColonna: 'Ce qu’on coche : « a signé le règlement ». Vide, la retire',
      colonne:
        'Toutes les colonnes, dans l’ordre où on les voit. Celle qui manque emporte ses coches ; ' +
        'aucune colonne ne retire la liste',
    },
    data: {
      titolo: 'Le jour d’une coche choisi à la main : la coche cesse de suivre sa leçon',
      data: 'Le jour. La case reste cochée, ou le devient',
    },
    leggi: {
      titolo:
        'Le check d’un cours : ce qu’on coche, qui l’a fait et quand, qui manque',
      corsoId: 'Le cours : les cours de l’année, « corsi.elenco » les liste',
      corso: 'La classe et la branche',
      allievi: 'Combien suivent le cours : le total de chaque colonne',
      titoloColonna: 'Ce qu’on coche',
      fatte: 'Combien, parmi ceux qui suivent le cours, l’ont cochée',
      totale: 'Combien suivent le cours',
      mancano: 'Qui suit le cours et ne l’a pas encore cochée, par nom et prénom',
      colonne: 'Dans l’ordre où on les voit. Vide si le cours n’a pas de liste',
      nome: 'Nom et prénom',
      attivo: 'Faux pour qui a abandonné : reste s’il y a quelque chose de coché',
      data:
        'Le jour où elle a été cochée, ou null si elle ne l’est pas. ' +
        'Si elle a été cochée pendant une leçon, c’est le jour de cette leçon',
      lezioneId:
        'La leçon où elle a été cochée, ou null si le jour a été choisi à la main',
      caselle: 'Une par colonne, dans le même ordre que « colonne »',
      presentazione: {
        titolo: 'Le check',
        corso: 'Cours',
        frequentano: 'Suivent le cours',
        fatte: 'Faites',
        su: 'Sur',
        mancano: 'Manquent',
      },
    },
    lezione: {
      titolo:
        'Une coche passe à une leçon du cours : son jour redevient celui de la leçon',
      lezioneId:
        'La leçon du cours : la case reste cochée, ou le devient, et en suit la date',
    },
    spunta: {
      titolo: 'Coche une case du check, ou retire la coche',
      fatta: 'true coche, false retire la coche',
      lezioneId: 'La leçon où l’on coche : la date sera la sienne, et la suivra',
      data: 'Le jour, si l’on ne coche pas pendant une leçon. Sans : aujourd’hui',
    },
  },
  en: {
    comune: {
      corsoId: 'The course of the list',
      allievoId: 'Who: a person in the course’s class',
      colonnaId: 'Which column',
      rimedioCheck: 'The list is created with its first column, given with “check.colonne”.',
      rimedioColonne: '“check.leggi” lists the course’s columns.',
      rimedioPersone: '“check.leggi” lists the course’s people.',
      personaDiAltraClasse: (corso) =>
        `That person is not in the class of the course “${corso}”.`,
      lezioneDiAltroCorso: (corso) =>
        `That lesson does not belong to the course “${corso}”: the tick would follow its date.`,
    },
    colonne: {
      titolo: 'The columns of a course’s check, all of them and in the right order',
      id: 'The id of a column that already exists; empty for a new one',
      titoloColonna: 'What is ticked: “has signed the rules”. Empty removes it',
      colonne:
        'All the columns, in the order they are shown. One that is missing takes its ticks ' +
        'with it; no column removes the list',
    },
    data: {
      titolo: 'The day of a tick chosen by hand: the tick stops following its lesson',
      data: 'The day. The box stays ticked, or becomes ticked',
    },
    leggi: {
      titolo: 'A course’s check: what is ticked, who did it and when, who is missing',
      corsoId: 'The course: “corsi.elenco” lists the courses of the year',
      corso: 'The class and the subject',
      allievi: 'How many attend: the total for each column',
      titoloColonna: 'What is ticked',
      fatte: 'How many of those attending have ticked it',
      totale: 'How many attend',
      mancano: 'Who attends and has not ticked it yet, by surname and first name',
      colonne: 'In the order they are shown. Empty if the course has no list',
      nome: 'Surname and first name',
      attivo: 'False for those who have withdrawn: stays if something is ticked',
      data:
        'The day it was ticked, or null if it is not. ' +
        'If it was ticked during a lesson, it is the day of that lesson',
      lezioneId: 'The lesson it was ticked in, or null if the day was chosen by hand',
      caselle: 'One per column, in the same order as “colonne”',
      presentazione: {
        titolo: 'The check',
        corso: 'Course',
        frequentano: 'Attending',
        fatte: 'Done',
        su: 'Of',
        mancano: 'Missing',
      },
    },
    lezione: {
      titolo: 'A tick moves to a lesson of the course: its day is the lesson’s again',
      lezioneId:
        'The lesson of the course: the box stays ticked, or becomes ticked, and follows ' +
        'its date',
    },
    spunta: {
      titolo: 'Ticks a box of the check, or removes the tick',
      fatta: 'true ticks, false removes the tick',
      lezioneId: 'The lesson the tick is given in: the date will be its date, and follow it',
      data: 'The day, if the tick is not given during a lesson. Without it, today',
    },
  },
})
