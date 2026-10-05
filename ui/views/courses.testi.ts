// I testi della pagina Corsi: la matrice classi × materie, la scheda del corso
// scelto con i suoi numeri e la tabella delle persone.
import { catalogo } from '#core/i18n/index.js'
import { PIF } from '#core/dominio/lexicon.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  // I numeri del corso.
  oreSvolte: 'lezioni svolte',
  udPreviste: 'UD previste',
  udACalendario: 'UD a calendario',
  annullate: 'annullate',
  presenzaConAppello: 'presenza (lezioni con appello)',
  udDiAssenzaSu: (previste: number) => `UD di assenza su ${previste}`,
  valutazioni: 'valutazioni',
  mediaDiClasse: 'media di classe',
  mediaDiAlcuni: (conVoto: number, tutti: number) =>
    `media di ${conVoto} su ${tutti}`,
  piani: 'piani',

  // La scheda del corso.
  classeSparita: 'classe sparita',
  materiaSparita: 'materia sparita',
  orarioNomeNote: 'Orario, nome e note del corso',
  nuovaLezione: 'Nuova lezione per questo corso',
  ilCheck: 'Il check di questo corso',
  leOre: 'Le lezioni di questo corso e le loro scalette',
  eliminaCorso: 'Elimina il corso',
  corsoEliminato: 'Corso eliminato.',
  lezioneRicorrente: 'Lezione ricorrente:',
  udASettimana: (ud: number) => `${ud} UD a settimana · `,
  nessunaRicorrente: 'Lezione ricorrente: nessuna.',
  prossimaOra: 'Prossima lezione: ',
  progettiNelCorso: 'Progetti: ',
  progettiIntegrati: (n: number) => n === 0 ? 'nessuno integrato' : n === 1 ? 'uno integrato' : `${n} integrati`,
  apriIntegrazione: 'Apri la pagina Integrazione progetti del corso',
  panoramica: 'Panoramica',

  // La tabella delle persone.
  nessunoFrequenta: `La classe non ha ${PIF.plurale} che frequentano: l’elenco si riempie dalla vista Classi.`,
  tuttoFatto: 'Tutto fatto',
  mancano: (colonne: readonly string[]) => `Mancano: ${colonne.join(', ')}`,
  sottotitoloTabella: (
    ore: number,
    ud: number,
    prove: number,
    periodo: string,
  ) =>
    `${plurale(ore, 'lezione', 'lezioni')} · ` +
    `${ud} UD · ${plurale(prove, 'prova', 'prove')} · ` +
    periodo,
  sulleUdPreviste: (previste: number) =>
    `Sulle ${previste} UD che l’orario prevede nel periodo`,
  assenza: 'Assenza',
  presenza: 'Presenza',
  udDiAssenza: 'UD di assenza',
  udSeguite: 'UD seguite',
  udDelCorsoAiuto: 'Le UD che l’orario del corso prevede nel periodo',
  udDelCorso: 'UD del corso',
  ritardi: 'Ritardi',
  segnatoAiuto:
    'Le caselle segnate sulla matrice del comportamento, in queste lezioni',
  segnato: 'Segnato',
  checkAiuto: 'Le colonne del check fatte, su quante sono',

  // La griglia del check.
  aiutoGriglia: 'clic: fatto oggi · tasto destro: un altro giorno, o toglierla',

  // Le materie, in riga.
  coloreMateria: 'Il colore della materia',
  sigla: 'Sigla',
  siglaEsempio: 'SIG',
  siglaMateria: 'La sigla della materia',
  siglaVuota:
    'Vuota: vale quella ricavata dal nome, che si legge qui in trasparenza',
  nomeMateria: 'Nome della materia',
  unisci: 'Unisci a un’altra materia…',
  eliminaMateria: 'Elimina la materia',
  nuovaMateria: 'Una materia nuova: scrivi il nome e premi Invio.',

  // Le caselle della matrice.
  apriIlCorso: (dove: string) => `Apri il corso: ${dove}`,
  apriIlCorsoVoce: (dove: string) => `Apri il corso ${dove}`,
  apriQuiSotto: 'Apri qui sotto',
  titoloEOrario: 'Titolo e orario…',
  togliCorso: 'Togli il corso…',
  haLezioni: (lezioni: number) =>
    `Ha ${plurale(lezioni, 'lezione', 'lezioni')}: si toglie solo un corso senza lezioni.`,
  premiPerAprire: (titolo: string) => `${titolo}: premi per aprirlo qui sotto`,
  togliIlCorso: (dove: string) => `Togli il corso ${dove}`,
  nessunaClasse: 'Nessuna classe nell’anno',
  primaLaClasse:
    'Un corso è una materia a una classe: la matrice ha le classi in colonna e le materie ' +
    'in riga. Prima la classe.',

  // La pagina.
  corsoInUnAnno: 'Un corso è una materia data a una classe, dentro un anno.',
  contiDel: (periodo: string) => `I conti valgono per: ${periodo}`,
  aiuto: 'una materia a una classe: un incrocio della matrice',
}

export const testi = catalogo(it, {
  de: {
    oreSvolte: 'gehaltene Stunden',
    udPreviste: 'vorgesehene Lektionen',
    udACalendario: 'Lektionen im Kalender',
    annullate: 'ausgefallen',
    presenzaConAppello: 'Anwesenheit (Stunden mit Präsenzkontrolle)',
    udDiAssenzaSu: (previste) => `Lektionen abwesend von ${previste}`,
    valutazioni: 'Beurteilungen',
    mediaDiClasse: 'Klassendurchschnitt',
    mediaDiAlcuni: (conVoto, tutti) =>
      `Durchschnitt von ${conVoto} der ${tutti}`,
    piani: 'Pläne',
    classeSparita: 'Klasse verschwunden',
    materiaSparita: 'Fach verschwunden',
    orarioNomeNote: 'Stundenplan, Name und Notizen des Kurses',
    nuovaLezione: 'Neue Stunde für diesen Kurs',
    ilCheck: 'Der Check dieses Kurses',
    leOre: 'Die Stunden dieses Kurses und ihre Abläufe',
    eliminaCorso: 'Kurs löschen',
    corsoEliminato: 'Kurs gelöscht.',
    lezioneRicorrente: 'Regelmässige Stunde:',
    udASettimana: (ud) => `${plurale(ud, 'Lektion', 'Lektionen')} pro Woche · `,
    nessunaRicorrente: 'Regelmässige Stunde: keine.',
    prossimaOra: 'Nächste Stunde: ',
    progettiNelCorso: 'Projekte: ',
    progettiIntegrati: (n) => n === 0 ? 'keines eingebunden' : n === 1 ? 'eines eingebunden' : `${n} eingebunden`,
    apriIntegrazione: 'Die Seite Projekte einbinden des Kurses öffnen',
    panoramica: 'Übersicht',
    nessunoFrequenta:
      'Die Klasse hat keine Lernenden, die sie besuchen: Die Liste füllst du in der ' +
      'Ansicht Klassen.',
    tuttoFatto: 'Alles erledigt',
    mancano: (colonne) => `Fehlt noch: ${colonne.join(', ')}`,
    sottotitoloTabella: (ore, ud, prove, periodo) =>
      `${plurale(ore, 'Stunde', 'Stunden')} · ` +
      `${plurale(ud, 'Lektion', 'Lektionen')} · ${plurale(prove, 'Prüfung', 'Prüfungen')} · ` +
      periodo,
    sulleUdPreviste: (previste) =>
      `Bezogen auf die ${previste} Lektionen, die der Stundenplan im Zeitraum vorsieht`,
    assenza: 'Absenz',
    presenza: 'Anwesenheit',
    udDiAssenza: 'Lekt. abwesend',
    udSeguite: 'Lekt. besucht',
    udDelCorsoAiuto:
      'Die Lektionen, die der Stundenplan des Kurses im Zeitraum vorsieht',
    udDelCorso: 'Lekt. des Kurses',
    ritardi: 'Verspätungen',
    segnatoAiuto:
      'Die markierten Felder in der Verhaltensmatrix, in diesen Stunden',
    segnato: 'Markiert',
    checkAiuto: 'Die erledigten Check-Spalten, von allen',
    aiutoGriglia:
      'Klick: heute erledigt · Rechtsklick: anderer Tag oder entfernen',
    coloreMateria: 'Die Farbe des Fachs',
    sigla: 'Kürzel',
    siglaEsempio: 'KRZ',
    siglaMateria: 'Das Kürzel des Fachs',
    siglaVuota:
      'Leer: Es gilt das aus dem Namen abgeleitete Kürzel, das hier blass zu sehen ist',
    nomeMateria: 'Name des Fachs',
    unisci: 'Mit einem anderen Fach zusammenführen…',
    eliminaMateria: 'Fach löschen',
    nuovaMateria: 'Ein neues Fach: Namen eingeben und Enter drücken.',
    apriIlCorso: (dove) => `Kurs eröffnen: ${dove}`,
    apriIlCorsoVoce: (dove) => `Kurs ${dove} eröffnen`,
    apriQuiSotto: 'Hier unten öffnen',
    titoloEOrario: 'Titel und Stundenplan…',
    togliCorso: 'Kurs entfernen…',
    haLezioni: (lezioni) =>
      `Hat ${plurale(lezioni, 'Stunde', 'Stunden')}: ` +
      'Entfernen lässt sich nur ein Kurs ohne Stunden.',
    premiPerAprire: (titolo) =>
      `${titolo}: klicken, um ihn hier unten zu öffnen`,
    togliIlCorso: (dove) => `Kurs ${dove} entfernen`,
    nessunaClasse: 'Keine Klassen im Jahr',
    primaLaClasse:
      'Ein Kurs ist ein Fach in einer Klasse: Die Matrix hat die Klassen in den Spalten und die ' +
      'Fächer in den Zeilen. Zuerst die Klasse.',
    corsoInUnAnno:
      'Ein Kurs ist ein Fach, das eine Klasse in einem Schuljahr hat.',
    contiDel: (periodo) => `Die Zahlen gelten für: ${periodo}`,
    aiuto: 'ein Fach in einer Klasse: ein Feld der Matrix',
  },
  fr: {
    oreSvolte: 'leçons données',
    udPreviste: 'périodes prévues',
    udACalendario: 'périodes au calendrier',
    annullate: 'annulées',
    presenzaConAppello: 'présence (leçons avec appel)',
    udDiAssenzaSu: (previste) => `périodes d’absence sur ${previste}`,
    valutazioni: 'évaluations',
    mediaDiClasse: 'moyenne de classe',
    mediaDiAlcuni: (conVoto, tutti) => `moyenne de ${conVoto} sur ${tutti}`,
    piani: 'plans',
    classeSparita: 'classe disparue',
    materiaSparita: 'branche disparue',
    orarioNomeNote: 'Horaire, nom et notes du cours',
    nuovaLezione: 'Nouvelle leçon pour ce cours',
    ilCheck: 'Le check de ce cours',
    leOre: 'Les leçons de ce cours et leurs déroulements',
    eliminaCorso: 'Supprimer le cours',
    corsoEliminato: 'Cours supprimé.',
    lezioneRicorrente: 'Leçon récurrente :',
    udASettimana: (ud) =>
      `${plurale(ud, 'période', 'périodes')} par semaine · `,
    nessunaRicorrente: 'Leçon récurrente : aucune.',
    prossimaOra: 'Prochaine leçon : ',
    progettiNelCorso: 'Projets : ',
    progettiIntegrati: (n) => n === 0 ? 'aucun intégré' : n === 1 ? 'un intégré' : `${n} intégrés`,
    apriIntegrazione: 'Ouvrir la page Intégration des projets du cours',
    panoramica: 'Vue d’ensemble',
    nessunoFrequenta:
      'La classe n’a aucune personne en formation qui la suit : la liste se remplit depuis la ' +
      'vue Classes.',
    tuttoFatto: 'Tout est fait',
    mancano: (colonne) => `Manque : ${colonne.join(', ')}`,
    sottotitoloTabella: (ore, ud, prove, periodo) =>
      `${plurale(ore, 'leçon', 'leçons')} · ` +
      `${plurale(ud, 'période', 'périodes')} · ${plurale(prove, 'épreuve', 'épreuves')} · ` +
      periodo,
    sulleUdPreviste: (previste) =>
      `Sur les ${previste} périodes que l’horaire prévoit dans l’intervalle choisi`,
    assenza: 'Absence',
    presenza: 'Présence',
    udDiAssenza: 'Pér. d’absence',
    udSeguite: 'Pér. suivies',
    udDelCorsoAiuto:
      'Les périodes que l’horaire du cours prévoit dans l’intervalle choisi',
    udDelCorso: 'Pér. du cours',
    ritardi: 'Retards',
    segnatoAiuto:
      'Les cases marquées dans la matrice du comportement, pendant ces leçons',
    segnato: 'Marqué',
    checkAiuto: 'Les colonnes du check faites, sur le total',
    aiutoGriglia:
      'clic : fait aujourd’hui · clic droit : un autre jour, ou la retirer',
    coloreMateria: 'La couleur de la branche',
    sigla: 'Sigle',
    siglaEsempio: 'SIG',
    siglaMateria: 'Le sigle de la branche',
    siglaVuota:
      'Vide : c’est le sigle tiré du nom qui s’applique, visible ici en transparence',
    nomeMateria: 'Nom de la branche',
    unisci: 'Fusionner avec une autre branche…',
    eliminaMateria: 'Supprimer la branche',
    nuovaMateria: 'Une nouvelle branche : écris le nom et appuie sur Entrée.',
    apriIlCorso: (dove) => `Ouvrir le cours : ${dove}`,
    apriIlCorsoVoce: (dove) => `Ouvrir le cours ${dove}`,
    apriQuiSotto: 'Ouvrir ci-dessous',
    titoloEOrario: 'Titre et horaire…',
    togliCorso: 'Retirer le cours…',
    haLezioni: (lezioni) =>
      `Il a ${plurale(lezioni, 'leçon', 'leçons')} : on ne retire qu’un cours sans leçons.`,
    premiPerAprire: (titolo) => `${titolo} : clique pour l’ouvrir ci-dessous`,
    togliIlCorso: (dove) => `Retirer le cours ${dove}`,
    nessunaClasse: 'Aucune classe dans l’année',
    primaLaClasse:
      'Un cours, c’est une branche donnée à une classe : la matrice a les classes en colonnes ' +
      'et les branches en lignes. D’abord la classe.',
    corsoInUnAnno:
      'Un cours est une branche donnée à une classe, au sein d’une année.',
    contiDel: (periodo) => `Les chiffres portent sur : ${periodo}`,
    aiuto: 'une branche donnée à une classe : un croisement de la matrice',
  },
  en: {
    oreSvolte: 'lessons held',
    udPreviste: 'scheduled periods',
    udACalendario: 'periods on the calendar',
    annullate: 'cancelled',
    presenzaConAppello: 'attendance (lessons with attendance taken)',
    udDiAssenzaSu: (previste) => `periods absent out of ${previste}`,
    valutazioni: 'assessments',
    mediaDiClasse: 'class average',
    mediaDiAlcuni: (conVoto, tutti) => `average of ${conVoto} out of ${tutti}`,
    piani: 'plans',
    classeSparita: 'class missing',
    materiaSparita: 'subject missing',
    orarioNomeNote: 'Course timetable, name and notes',
    nuovaLezione: 'New lesson for this course',
    ilCheck: 'This course’s check',
    leOre: 'This course’s lessons and their outlines',
    eliminaCorso: 'Delete the course',
    corsoEliminato: 'Course deleted.',
    lezioneRicorrente: 'Recurring lesson:',
    udASettimana: (ud) => `${plurale(ud, 'period', 'periods')} a week · `,
    nessunaRicorrente: 'Recurring lesson: none.',
    prossimaOra: 'Next lesson: ',
    progettiNelCorso: 'Projects: ',
    progettiIntegrati: (n) => n === 0 ? 'none integrated' : n === 1 ? 'one integrated' : `${n} integrated`,
    apriIntegrazione: 'Open the course’s Project integration page',
    panoramica: 'Overview',
    nessunoFrequenta:
      'The class has no learners attending: the list is filled in from the Classes view.',
    tuttoFatto: 'All done',
    mancano: (colonne) => `Missing: ${colonne.join(', ')}`,
    sottotitoloTabella: (ore, ud, prove, periodo) =>
      `${plurale(ore, 'lesson', 'lessons')} · ` +
      `${plurale(ud, 'period', 'periods')} · ${plurale(prove, 'test', 'tests')} · ` +
      periodo,
    sulleUdPreviste: (previste) =>
      `Out of the ${previste} periods the timetable schedules in this time frame`,
    assenza: 'Absence',
    presenza: 'Attendance',
    udDiAssenza: 'Periods absent',
    udSeguite: 'Periods attended',
    udDelCorsoAiuto:
      'The periods the course timetable schedules in this time frame',
    udDelCorso: 'Course periods',
    ritardi: 'Late arrivals',
    segnatoAiuto: 'The boxes marked on the behaviour matrix in these lessons',
    segnato: 'Marked',
    checkAiuto: 'Check columns done, out of all of them',
    aiutoGriglia: 'click: done today · right-click: another day, or remove it',
    coloreMateria: 'The subject’s colour',
    sigla: 'Abbreviation',
    siglaEsempio: 'ABB',
    siglaMateria: 'The subject’s abbreviation',
    siglaVuota:
      'Empty: the one derived from the name applies, shown here faintly',
    nomeMateria: 'Subject name',
    unisci: 'Merge with another subject…',
    eliminaMateria: 'Delete the subject',
    nuovaMateria: 'A new subject: type the name and press Enter.',
    apriIlCorso: (dove) => `Start the course: ${dove}`,
    apriIlCorsoVoce: (dove) => `Start the course ${dove}`,
    apriQuiSotto: 'Open below',
    titoloEOrario: 'Title and timetable…',
    togliCorso: 'Remove the course…',
    haLezioni: (lezioni) =>
      `It has ${plurale(lezioni, 'lesson', 'lessons')}: ` +
      'only a course with no lessons can be removed.',
    premiPerAprire: (titolo) => `${titolo}: click to open it below`,
    togliIlCorso: (dove) => `Remove the course ${dove}`,
    nessunaClasse: 'No classes in the year',
    primaLaClasse:
      'A course is a subject taught to a class: the matrix has classes as columns and subjects ' +
      'as rows. The class comes first.',
    corsoInUnAnno:
      'A course is a subject taught to a class, within a school year.',
    contiDel: (periodo) => `Figures for: ${periodo}`,
    aiuto: 'a subject taught to a class: one cell of the matrix',
  },
})
