// I testi di `forms/registerImport.ts`: la finestra «Importa da un altro
// registro», con le caselle dei blocchi e quel che ognuna porterebbe.

import { catalogo, perNumero } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Importa da un altro registro',
  aiuto:
    'Da un altro documento .regi, quel che vale anche in questo: le impostazioni, le ' +
    'materie, le classi con le persone e i corsi, i piani e i calendari. Mai lezioni, ' +
    'presenze, voti, osservazioni o consegne: restano nell’anno in cui sono successe.',

  // L'origine
  daQualeRegistro: 'Da quale registro',
  nessunRecente: 'Nessun altro registro fra i recenti',
  sceglineUno: (sfoglia: string) => `Scegli un registro fra i recenti, o cercalo con «${sfoglia}».`,
  lettura: 'Lettura…',
  nonSiLegge: 'Quel registro non si legge.',
  annoLetto: (anno: string) =>
    `Anno ${anno || 'senza nome'}. L’altro registro si legge soltanto: non si apre e non cambia.`,
  primaScegli: 'Prima si sceglie un registro, e lo si lascia leggere.',
  nienteSpuntato: 'Non c’è niente di spuntato da portare.',

  // Le impostazioni del documento
  impostazioni: 'Impostazioni del documento',
  aiutoImpostazioni:
    'Scala dei voti e arrotondamenti, soglia d’assenza, giorni e ore del calendario, ' +
    'voci delle tendine, carta intestata con logo e firma. Non le date dell’anno: ' +
    'semestri, vacanze e settimane restano quelle di qui',
  scala: (scala: string) => `Scala ${scala}`,
  carte: (n: number) => plurale(n, 'carta intestata', 'carte intestate'),
  loghi: (n: number) => plurale(n, 'logo', 'loghi'),
  firma: (docente: string) => `firma ${docente}`,
  liste: (n: number) => plurale(n, 'lista cambiata', 'liste cambiate'),

  // Le materie
  tutteLeMaterie: 'Tutte le materie',
  aiutoMaterie:
    'Una materia che qui ha lo stesso nome si usa quella; le altre si aggiungono. ' +
    'Quelle dei corsi portati arrivano comunque',
  nessunaMateria: 'Nessuna materia',
  materieLette: (n: number, nuove: number) =>
    `${plurale(n, 'materia', 'materie')}, ${nuove} che qui mancano`,

  // Le classi
  classiPersoneCorsi: 'Classi, persone e corsi',
  classiSpuntate: 'Le classi spuntate qui sotto',
  aiutoClassi:
    'Una classe che qui c’è già con lo stesso nome si salta: le persone non si fondono. ' +
    'Lezioni, presenze, voti e osservazioni restano nell’altro registro',
  anagrafica: 'Anagrafica e foto',
  aiutoAnagrafica: `Le ${PIF.plurale} con i loro dati e le foto. Senza, le classi arrivano vuote`,
  corsiConOrario: 'Corsi con orario',
  aiutoCorsi: 'I corsi delle classi, con le lezioni della settimana: servono anche ai piani',
  nessunaClasse: 'Nessuna classe in quel registro',
  corsi: (n: number) => plurale(n, 'corso', 'corsi'),
  ceGia: 'c’è già: si salterà',

  // Piani e calendari
  pianiECalendari: 'Piani lezione e calendari ICS',
  aiutoPiani:
    'Le scalette dei corsi portati, con i loro allegati: senza lezioni e senza ' +
    'avanzamento, si riagganciano alle lezioni di qui quando le si prepara',
  pianiLetti: (n: number) => `${plurale(n, 'piano', 'piani')} sui corsi di quel registro`,
  calendari: 'Calendari ICS e regole',
  aiutoCalendari:
    'I calendari si aggiungono a quelli di qui. Le regole dei corsi che non si portano ' +
    'si lasciano là',
  nessunCalendario: 'Nessun calendario',
  regole: (n: number) => plurale(n, 'regola', 'regole'),
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Aus einem anderen Klassenbuch importieren',
    aiuto:
      'Aus einem anderen .regi-Dokument das, was auch in diesem gilt: die Einstellungen, ' +
      'die Fächer, die Klassen mit ihren Personen und Kursen, die Pläne und die Kalender. ' +
      'Nie Stunden, Präsenzen, Noten, Beobachtungen oder Aufträge: Sie bleiben im ' +
      'Jahr, in dem sie stattgefunden haben.',

    daQualeRegistro: 'Aus welchem Klassenbuch',
    nessunRecente: 'Kein anderes Klassenbuch unter den zuletzt geöffneten',
    sceglineUno: (sfoglia) =>
      `Wähle ein Klassenbuch aus den zuletzt geöffneten, oder suche es mit «${sfoglia}».`,
    lettura: 'Wird gelesen…',
    nonSiLegge: 'Dieses Klassenbuch lässt sich nicht lesen.',
    annoLetto: (anno) =>
      `Jahr ${anno || 'ohne Namen'}. Das andere Klassenbuch wird nur gelesen: ` +
      'Es wird weder geöffnet noch verändert.',
    primaScegli: 'Zuerst ein Klassenbuch wählen und es einlesen lassen.',
    nienteSpuntato: 'Es ist nichts zum Übernehmen angehakt.',

    impostazioni: 'Dokumenteinstellungen',
    aiutoImpostazioni:
      'Notenskala und Rundungen, Absenzengrenze, Tage und Uhrzeiten des Kalenders, ' +
      'Einträge der Auswahllisten, Briefkopf mit Logo und Unterschrift. Nicht die Daten ' +
      'des Schuljahrs: Semester, Ferien und Wochen bleiben die von hier',
    scala: (scala) => `Skala ${scala}`,
    carte: (n) => plurale(n, 'Briefpapier', 'Briefpapiere'),
    loghi: (n) => plurale(n, 'Logo', 'Logos'),
    firma: (docente) => `Unterschrift ${docente}`,
    liste: (n) => plurale(n, 'geänderte Liste', 'geänderte Listen'),

    tutteLeMaterie: 'Alle Fächer',
    aiutoMaterie:
      'Gibt es hier ein Fach mit demselben Namen, wird dieses verwendet; die anderen kommen ' +
      'dazu. Die Fächer der übernommenen Kurse kommen so oder so mit',
    nessunaMateria: 'Keine Fächer',
    materieLette: (n, nuove) =>
      `${plurale(n, 'Fach', 'Fächer')}, davon ${perNumero(nuove, 'fehlt', 'fehlen')} ` +
      `${nuove} hier`,

    classiPersoneCorsi: 'Klassen, Personen und Kurse',
    classiSpuntate: 'Die unten angehakten Klassen',
    aiutoClassi:
      'Eine Klasse, die es hier mit demselben Namen schon gibt, wird übersprungen: Die ' +
      'Personen werden nicht zusammengeführt. Stunden, Präsenzen, Noten und ' +
      'Beobachtungen bleiben im anderen Klassenbuch',
    anagrafica: 'Personalien und Fotos',
    aiutoAnagrafica: 'Die Lernenden mit ihren Daten und Fotos. Ohne kommen die Klassen leer an',
    corsiConOrario: 'Kurse mit Stundenplan',
    aiutoCorsi: 'Die Kurse der Klassen mit ihren Wochenstunden: Auch die Pläne brauchen sie',
    nessunaClasse: 'Keine Klassen in diesem Klassenbuch',
    corsi: (n) => plurale(n, 'Kurs', 'Kurse'),
    ceGia: 'gibt es schon: wird übersprungen',

    pianiECalendari: 'Unterrichtspläne und ICS-Kalender',
    aiutoPiani:
      'Die Abläufe der übernommenen Kurse mit ihren Anhängen, ohne Stunden und ' +
      'ohne Fortschritt: Sie werden mit den Stunden hier verknüpft, wenn du sie vorbereitest',
    pianiLetti: (n) => `${plurale(n, 'Plan', 'Pläne')} zu den Kursen dieses Klassenbuchs`,
    calendari: 'ICS-Kalender und Regeln',
    aiutoCalendari:
      'Die Kalender kommen zu denen von hier dazu. Die Regeln der Kurse, die nicht ' +
      'übernommen werden, bleiben dort',
    nessunCalendario: 'Keine Kalender',
    regole: (n) => plurale(n, 'Regel', 'Regeln'),
  },
  fr: {
    titolo: 'Importer depuis un autre registre',
    aiuto:
      'D’un autre document .regi, ce qui vaut aussi dans celui-ci : les paramètres, les ' +
      'branches, les classes avec leurs personnes et leurs cours, les plans et les ' +
      'calendriers. Jamais les leçons, présences, notes, observations ou devoirs : ils ' +
      'restent dans l’année où ils ont eu lieu.',

    daQualeRegistro: 'Depuis quel registre',
    nessunRecente: 'Aucun autre registre parmi les récents',
    sceglineUno: (sfoglia) =>
      `Choisis un registre parmi les récents, ou cherche-le avec « ${sfoglia} ».`,
    lettura: 'Lecture…',
    nonSiLegge: 'Ce registre ne peut pas être lu.',
    annoLetto: (anno) =>
      `Année ${anno || 'sans nom'}. L’autre registre est seulement lu : ` +
      'il n’est ni ouvert ni modifié.',
    primaScegli: 'Choisis d’abord un registre, et laisse-le se lire.',
    nienteSpuntato: 'Rien n’est coché à importer.',

    impostazioni: 'Paramètres du document',
    aiutoImpostazioni:
      'Barème et arrondis, seuil d’absences, jours et heures du calendrier, entrées des ' +
      'listes déroulantes, papier à en-tête avec logo et signature. Pas les dates de ' +
      'l’année : semestres, vacances et semaines restent celles d’ici',
    scala: (scala) => `Barème ${scala}`,
    carte: (n) => plurale(n, 'papier à en-tête', 'papiers à en-tête'),
    loghi: (n) => plurale(n, 'logo', 'logos'),
    firma: (docente) => `signature ${docente}`,
    liste: (n) => plurale(n, 'liste modifiée', 'listes modifiées'),

    tutteLeMaterie: 'Toutes les branches',
    aiutoMaterie:
      'Si une branche du même nom existe ici, c’est elle qui sert ; les autres s’ajoutent. ' +
      'Celles des cours importés arrivent de toute façon',
    nessunaMateria: 'Aucune branche',
    materieLette: (n, nuove) =>
      `${plurale(n, 'branche', 'branches')}, dont ${nuove} ` +
      `${perNumero(nuove, 'manque', 'manquent')} ici`,

    classiPersoneCorsi: 'Classes, personnes et cours',
    classiSpuntate: 'Les classes cochées ci-dessous',
    aiutoClassi:
      'Une classe qui existe déjà ici sous le même nom est sautée : les personnes ne sont pas ' +
      'fusionnées. Leçons, présences, notes et observations restent dans l’autre registre',
    anagrafica: 'Données personnelles et photos',
    aiutoAnagrafica:
      'Les personnes en formation avec leurs données et leurs photos. Sans, les classes ' +
      'arrivent vides',
    corsiConOrario: 'Cours avec horaire',
    aiutoCorsi:
      'Les cours des classes, avec leurs leçons de la semaine : les plans en ont aussi besoin',
    nessunaClasse: 'Aucune classe dans ce registre',
    corsi: (n) => plurale(n, 'cours', 'cours'),
    ceGia: 'existe déjà : sera sautée',

    pianiECalendari: 'Plans de leçon et calendriers ICS',
    aiutoPiani:
      'Les déroulements des cours importés, avec leurs pièces jointes : sans leçons ni ' +
      'avancement, ils se rattachent aux leçons d’ici quand tu les prépares',
    pianiLetti: (n) => `${plurale(n, 'plan', 'plans')} sur les cours de ce registre`,
    calendari: 'Calendriers ICS et règles',
    aiutoCalendari:
      'Les calendriers s’ajoutent à ceux d’ici. Les règles des cours qui ne sont pas ' +
      'importés restent là-bas',
    nessunCalendario: 'Aucun calendrier',
    regole: (n) => plurale(n, 'règle', 'règles'),
  },
  en: {
    titolo: 'Import from another register',
    aiuto:
      'From another .regi document, whatever also applies to this one: the settings, the ' +
      'subjects, the classes with their people and courses, the plans and the calendars. ' +
      'Never lessons, attendance, grades, observations or assignments: they stay in the year ' +
      'they happened in.',

    daQualeRegistro: 'From which register',
    nessunRecente: 'No other register among the recent ones',
    sceglineUno: (sfoglia) =>
      `Choose a register from the recent ones, or find it with “${sfoglia}”.`,
    lettura: 'Reading…',
    nonSiLegge: 'That register can’t be read.',
    annoLetto: (anno) =>
      `Year ${anno || 'unnamed'}. The other register is only read: it isn’t opened or changed.`,
    primaScegli: 'Choose a register first, and let it be read.',
    nienteSpuntato: 'Nothing is ticked to bring over.',

    impostazioni: 'Document settings',
    aiutoImpostazioni:
      'Grading scale and rounding, absence threshold, calendar days and hours, drop-down ' +
      'list entries, letterhead with logo and signature. Not the dates of the year: ' +
      'semesters, holidays and weeks stay as they are here',
    scala: (scala) => `Scale ${scala}`,
    carte: (n) => plurale(n, 'letterhead', 'letterheads'),
    loghi: (n) => plurale(n, 'logo', 'logos'),
    firma: (docente) => `signature ${docente}`,
    liste: (n) => plurale(n, 'changed list', 'changed lists'),

    tutteLeMaterie: 'All subjects',
    aiutoMaterie:
      'If a subject with the same name exists here, that one is used; the others are added. ' +
      'Those of the courses brought over come along anyway',
    nessunaMateria: 'No subjects',
    materieLette: (n, nuove) => `${plurale(n, 'subject', 'subjects')}, ${nuove} missing here`,

    classiPersoneCorsi: 'Classes, people and courses',
    classiSpuntate: 'The classes ticked below',
    aiutoClassi:
      'A class that already exists here with the same name is skipped: people aren’t merged. ' +
      'Lessons, attendance, grades and observations stay in the other register',
    anagrafica: 'Personal details and photos',
    aiutoAnagrafica:
      'The learners with their details and photos. Without, the classes arrive empty',
    corsiConOrario: 'Courses with timetable',
    aiutoCorsi: 'The classes’ courses, with their weekly lessons: the plans need them too',
    nessunaClasse: 'No classes in that register',
    corsi: (n) => plurale(n, 'course', 'courses'),
    ceGia: 'already here: will be skipped',

    pianiECalendari: 'Lesson plans and ICS calendars',
    aiutoPiani:
      'The outlines of the courses brought over, with their attachments: no lessons and no ' +
      'progress, they hook onto the lessons here when you prepare them',
    pianiLetti: (n) => `${plurale(n, 'plan', 'plans')} on the courses of that register`,
    calendari: 'ICS calendars and rules',
    aiutoCalendari:
      'The calendars are added to the ones here. Rules for courses that aren’t brought over ' +
      'stay behind',
    nessunCalendario: 'No calendars',
    regole: (n) => plurale(n, 'rule', 'rules'),
  },
})
