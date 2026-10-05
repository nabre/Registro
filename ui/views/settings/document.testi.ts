// I testi delle impostazioni del documento d'anno (`settings/document.tsx`).

import { catalogo } from '#core/i18n/index.js'

const it = {
  // Quel che l'host ha corretto in silenzio, detto dopo il salvataggio.
  scostamenti: {
    minutiUd: 'durata dell’unità didattica',
    oraInizioGiornata: 'prima ora della giornata',
    oraFineGiornata: 'ultima ora della giornata',
    durataPausaPredefinita: 'durata della pausa',
    durataSlotPredefinita: 'durata della fascia',
    passoFineSemestre: 'passo della nota di fine semestre',
    sogliaAssenza: 'soglia di assenza',
    scalaMin: 'voto minimo',
    scalaMax: 'voto massimo',
    sufficienza: 'sufficienza',
    passoVoti: 'passo dei voti',
    altezzaLogo: 'altezza del logo',
  },
  portataA: (etichetta: string, valore: string) => `${etichetta} portata a ${valore}`,
  serveUnOrario: (etichetta: string) => `«${etichetta}» non è cambiata: serve un orario.`,
  salvate: 'Impostazioni salvate.',
  salvateCorrette: (scarti: string) => `Impostazioni salvate, corrette: ${scarti}.`,
  // Accanto al campo, per quelli disegnati con i controlli condivisi.
  nonSalvata: 'Non salvata: il registro non ha risposto.',
  corretta: (scarti: string) => `Salvata, corretta: ${scarti}.`,

  // La valutazione.
  scala: 'Scala dei voti',
  scalaAiuto:
    'valori proposti per un nuovo momento di valutazione; ogni momento può poi avere la sua',
  votoMinimo: 'Voto minimo',
  votoMassimo: 'Voto massimo',
  sufficienza: 'Sufficienza',
  sufficienzaAiuto: 'Da qui in su un voto è sufficiente. Sta sulla scala, a passi dei voti.',
  passoVoti: 'Passo dei voti',
  passoVotiAiuto: 'La grana con cui si danno i voti: un voto battuto si arrotonda a questa.',
  grane: {
    0.1: 'decimi',
    0.25: 'mezzi e quarti',
    0.5: 'mezzi punti',
    1: 'solo interi',
  },
  fineSemestre: 'Fine semestre e assenze',
  passoFineSemestre: 'Passo della nota di fine semestre',
  passoFineSemestreAiuto:
    'L’arrotondamento della media nella nota di pagella, di solito più largo di quello dei voti.',
  graneFine: {
    0: 'la media com’è, senza arrotondare',
    0.25: 'a quarti',
    0.5: 'a mezzi punti',
    1: 'a punti interi',
  },
  sogliaAssenza: 'Segnala l’assenza oltre il',
  sogliaAssenzaAiuto:
    'La parte di lezioni perse, corso per corso, oltre cui una persona finisce fra le pendenze. ' +
    '0 vuol dire mai.',
  scalaDetta: (min: string, max: string, sufficienza: string, passo: string) =>
    `Voti da ${min} a ${max}, sufficiente da ${sufficienza}, a passi di ${passo}.`,
}

export const testi = catalogo(it, {
  de: {
    scostamenti: {
      minutiUd: 'Dauer der Lektion',
      oraInizioGiornata: 'erste Uhrzeit des Tages',
      oraFineGiornata: 'letzte Uhrzeit des Tages',
      durataPausaPredefinita: 'Dauer der Pause',
      durataSlotPredefinita: 'Dauer des Zeitfensters',
      passoFineSemestre: 'Schritt der Semesternote',
      sogliaAssenza: 'Absenzengrenze',
      scalaMin: 'tiefste Note',
      scalaMax: 'höchste Note',
      sufficienza: 'genügende Note',
      passoVoti: 'Notenschritt',
      altezzaLogo: 'Höhe des Logos',
    },
    portataA: (etichetta, valore) => `${etichetta} auf ${valore} gesetzt`,
    serveUnOrario: (etichetta) => `«${etichetta}» wurde nicht geändert: Es braucht eine Uhrzeit.`,
    salvate: 'Einstellungen gespeichert.',
    salvateCorrette: (scarti) => `Einstellungen gespeichert, korrigiert: ${scarti}.`,
    nonSalvata: 'Nicht gespeichert: Das Klassenbuch hat nicht geantwortet.',
    corretta: (scarti) => `Gespeichert, korrigiert: ${scarti}.`,
    scala: 'Notenskala',
    scalaAiuto:
      'vorgeschlagene Werte für eine neue Leistungsbeurteilung; jede Beurteilung kann danach ' +
      'ihre eigenen haben',
    votoMinimo: 'Tiefste Note',
    votoMassimo: 'Höchste Note',
    sufficienza: 'Genügend ab',
    sufficienzaAiuto: 'Ab hier ist eine Note genügend. Sie liegt auf der Skala, im Notenschritt.',
    passoVoti: 'Notenschritt',
    passoVotiAiuto: 'Wie fein Noten gegeben werden: Eine getippte Note wird darauf gerundet.',
    grane: {
      0.1: 'Zehntel',
      0.25: 'Halbe und Viertel',
      0.5: 'halbe Noten',
      1: 'nur ganze',
    },
    fineSemestre: 'Semesterende und Absenzen',
    passoFineSemestre: 'Schritt der Semesternote',
    passoFineSemestreAiuto:
      'Die Rundung des Durchschnitts in der Zeugnisnote, meist gröber als die der Noten.',
    graneFine: {
      0: 'der Durchschnitt, wie er ist, ungerundet',
      0.25: 'auf Viertel',
      0.5: 'auf halbe Noten',
      1: 'auf ganze Noten',
    },
    sogliaAssenza: 'Absenz melden über',
    sogliaAssenzaAiuto:
      'Der Anteil verpasster Lektionen, Kurs für Kurs, ab dem eine Person unter den ' +
      'Pendenzen erscheint. 0 heisst nie.',
    scalaDetta: (min, max, sufficienza, passo) =>
      `Noten von ${min} bis ${max}, genügend ab ${sufficienza}, in Schritten von ${passo}.`,
  },
  fr: {
    scostamenti: {
      minutiUd: 'durée de la période',
      oraInizioGiornata: 'première heure de la journée',
      oraFineGiornata: 'dernière heure de la journée',
      durataPausaPredefinita: 'durée de la pause',
      durataSlotPredefinita: 'durée de la plage horaire',
      passoFineSemestre: 'pas de la note semestrielle',
      sogliaAssenza: 'seuil d’absence',
      scalaMin: 'note minimale',
      scalaMax: 'note maximale',
      sufficienza: 'seuil de suffisance',
      passoVoti: 'pas des notes',
      altezzaLogo: 'hauteur du logo',
    },
    portataA: (etichetta, valore) => `${etichetta} → ${valore}`,
    serveUnOrario: (etichetta) => `« ${etichetta} » n’a pas changé : il faut une heure.`,
    salvate: 'Paramètres enregistrés.',
    salvateCorrette: (scarti) => `Paramètres enregistrés, avec des corrections : ${scarti}.`,
    nonSalvata: 'Non enregistré : le registre n’a pas répondu.',
    corretta: (scarti) => `Enregistré, corrigé : ${scarti}.`,
    scala: 'Barème',
    scalaAiuto:
      'valeurs proposées pour une nouvelle évaluation ; chaque évaluation peut ensuite avoir ' +
      'les siennes',
    votoMinimo: 'Note minimale',
    votoMassimo: 'Note maximale',
    sufficienza: 'Seuil de suffisance',
    sufficienzaAiuto:
      'À partir d’ici une note est suffisante. Elle est sur le barème, au pas des notes.',
    passoVoti: 'Pas des notes',
    passoVotiAiuto: 'La finesse des notes : une note tapée est arrondie à ce pas.',
    grane: {
      0.1: 'dixièmes',
      0.25: 'demis et quarts',
      0.5: 'demi-points',
      1: 'entiers seulement',
    },
    fineSemestre: 'Fin de semestre et absences',
    passoFineSemestre: 'Pas de la note semestrielle',
    passoFineSemestreAiuto:
      'L’arrondi de la moyenne dans la note du bulletin, en général plus large que celui des notes.',
    graneFine: {
      0: 'la moyenne telle quelle, sans arrondi',
      0.25: 'aux quarts',
      0.5: 'aux demi-points',
      1: 'aux points entiers',
    },
    sogliaAssenza: 'Signaler l’absence au-delà de',
    sogliaAssenzaAiuto:
      'La part de périodes manquées, cours par cours, au-delà de laquelle une personne figure ' +
      'parmi les tâches en suspens. 0 veut dire jamais.',
    scalaDetta: (min, max, sufficienza, passo) =>
      `Notes de ${min} à ${max}, suffisant dès ${sufficienza}, par pas de ${passo}.`,
  },
  en: {
    scostamenti: {
      minutiUd: 'length of the period',
      oraInizioGiornata: 'first hour of the day',
      oraFineGiornata: 'last hour of the day',
      durataPausaPredefinita: 'length of the break',
      durataSlotPredefinita: 'length of the time slot',
      passoFineSemestre: 'step of the semester grade',
      sogliaAssenza: 'absence threshold',
      scalaMin: 'lowest grade',
      scalaMax: 'highest grade',
      sufficienza: 'pass mark',
      passoVoti: 'grade step',
      altezzaLogo: 'logo height',
    },
    portataA: (etichetta, valore) => `${etichetta} set to ${valore}`,
    serveUnOrario: (etichetta) => `“${etichetta}” was not changed: a time is needed.`,
    salvate: 'Settings saved.',
    salvateCorrette: (scarti) => `Settings saved, corrected: ${scarti}.`,
    nonSalvata: 'Not saved: the register did not answer.',
    corretta: (scarti) => `Saved, corrected: ${scarti}.`,
    scala: 'Grading scale',
    scalaAiuto: 'values proposed for a new assessment; each assessment can then have its own',
    votoMinimo: 'Lowest grade',
    votoMassimo: 'Highest grade',
    sufficienza: 'Pass mark',
    sufficienzaAiuto: 'From here up a grade is a pass. It sits on the scale, in grade steps.',
    passoVoti: 'Grade step',
    passoVotiAiuto: 'How fine grades are given: a typed grade is rounded to this.',
    grane: {
      0.1: 'tenths',
      0.25: 'halves and quarters',
      0.5: 'half points',
      1: 'whole only',
    },
    fineSemestre: 'Semester end and absences',
    passoFineSemestre: 'Step of the semester grade',
    passoFineSemestreAiuto:
      'The rounding of the average in the report grade, usually coarser than the grades’ own.',
    graneFine: {
      0: 'the average as it is, unrounded',
      0.25: 'to quarters',
      0.5: 'to half points',
      1: 'to whole points',
    },
    sogliaAssenza: 'Flag absence above',
    sogliaAssenzaAiuto:
      'The share of missed periods, course by course, above which a person shows up among the ' +
      'pending items. 0 means never.',
    scalaDetta: (min, max, sufficienza, passo) =>
      `Grades from ${min} to ${max}, a pass from ${sufficienza}, in steps of ${passo}.`,
  },
})
