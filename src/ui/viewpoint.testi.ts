// I testi della veduta per l'assistente (`viewpoint.ts`): nomi di tendine e
// filtri, elenchi a schermo. I nomi dei campi li legge il modello e il menu li
// usa come chiave per spegnerli: `campi` è la sola tabella (vedi
// `ID_DELLA_TENDINA` in `assistant/parts.ts`).

import { catalogo } from '../i18n/index.js'
import { PIF } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'

const it = {
  /** I nomi delle tendine e dei filtri, come li scrive la barra. */
  campi: {
    annoScolastico: 'Anno scolastico',
    classe: 'Classe',
    corso: 'Corso',
    lezioneDelCorso: 'Lezione del corso',
    schedaAperta: 'Scheda aperta nella pagina',
    depositoAperto: 'Deposito aperto',
    fileConsigliato: 'File consigliato del deposito',
    corsoInAgenda: 'Corso in agenda',
    modoCalendario: 'Modo del calendario',
    periodoAssenze: 'Periodo delle assenze',
    pagineArchiviate: 'Pagine già archiviate nello sfoglio',
    documentiSpuntati: 'Documenti spuntati per il fascicolo',
  },
  annoIntero: 'Anno intero',
  tuttiICorsi: 'Tutti i corsi',
  mostrate: 'mostrate',

  // Gli elenchi a schermo.
  oreInCalendario: 'ore in calendario',
  corsi: 'corsi',
  classi: 'classi',
  personeInElenco: `${PIF.plurale} in elenco`,
  personeDella: (classe: string) => `${PIF.plurale} della ${classe}`,
}

export const testi = catalogo(it, {
  de: {
    campi: {
      annoScolastico: 'Schuljahr',
      classe: 'Klasse',
      corso: 'Kurs',
      lezioneDelCorso: 'Stunde des Kurses',
      schedaAperta: 'Offener Reiter der Seite',
      depositoAperto: 'Offenes Repository',
      fileConsigliato: 'Empfohlene Datei des Repositorys',
      corsoInAgenda: 'Kurs in der Agenda',
      modoCalendario: 'Kalenderansicht',
      periodoAssenze: 'Absenzzeitraum',
      pagineArchiviate: 'Schon archivierte Seiten im Durchblättern',
      documentiSpuntati: 'Für das Dossier abgehakte Dokumente',
    },
    annoIntero: 'Ganzes Jahr',
    tuttiICorsi: 'Alle Kurse',
    mostrate: 'angezeigt',
    oreInCalendario: 'Stunden im Kalender',
    corsi: 'Kurse',
    classi: 'Klassen',
    personeInElenco: `${lessico.in('de').pif.plurale} in der Liste`,
    personeDella: (classe) => `${lessico.in('de').pif.plurale} der ${classe}`,
  },
  fr: {
    campi: {
      annoScolastico: 'Année scolaire',
      classe: 'Classe',
      corso: 'Cours',
      lezioneDelCorso: 'Leçon du cours',
      schedaAperta: 'Onglet ouvert dans la page',
      depositoAperto: 'Dépôt ouvert',
      fileConsigliato: 'Fichier conseillé du dépôt',
      corsoInAgenda: 'Cours dans l’agenda',
      modoCalendario: 'Mode du calendrier',
      periodoAssenze: 'Période des absences',
      pagineArchiviate: 'Pages déjà archivées dans le feuilletage',
      documentiSpuntati: 'Documents cochés pour le dossier',
    },
    annoIntero: 'Année entière',
    tuttiICorsi: 'Tous les cours',
    mostrate: 'affichées',
    oreInCalendario: 'leçons au calendrier',
    corsi: 'cours',
    classi: 'classes',
    personeInElenco: `${lessico.in('fr').pif.plurale} dans la liste`,
    personeDella: (classe) => `${lessico.in('fr').pif.plurale} de la ${classe}`,
  },
  en: {
    campi: {
      annoScolastico: 'School year',
      classe: 'Class',
      corso: 'Course',
      lezioneDelCorso: 'Course lesson',
      schedaAperta: 'Tab open in the page',
      depositoAperto: 'Open repository',
      fileConsigliato: 'Recommended file in the repository',
      corsoInAgenda: 'Course in the planner',
      modoCalendario: 'Calendar view',
      periodoAssenze: 'Absence period',
      pagineArchiviate: 'Pages already filed in the page viewer',
      documentiSpuntati: 'Documents ticked for the class file',
    },
    annoIntero: 'Whole year',
    tuttiICorsi: 'All courses',
    mostrate: 'shown',
    oreInCalendario: 'lessons in the calendar',
    corsi: 'courses',
    classi: 'classes',
    personeInElenco: `${lessico.in('en').pif.plurale} in the list`,
    personeDella: (classe) => `${lessico.in('en').pif.plurale} of ${classe}`,
  },
})
