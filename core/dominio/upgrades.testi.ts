// I testi di `upgrades.ts`: che cosa cambia a ogni passo del formato e il
// rifiuto di un anno scritto da un registro più recente. `versionePiuRecente`
// riconosce quella frase in ogni lingua: nome del file, `cosa` e i due numeri
// devono comparire tutti, una volta sola.

import { catalogo } from '#core/i18n/index.js'

const it = {
  /** Che cosa cambia, per numero di versione a cui porta il passo. */
  passi: {
    2: 'data di iscrizione per ciascun allievo',
    3: 'distinzione tra pendenze di corso e di docente di classe; dati anagrafici strutturati del docente; l’anno ricorda se segue il calendario scolastico ufficiale; una lezione può essere segnata come supplenza',
    4: 'i progetti dei corsi, con compiti, giudizi e una matrice a livelli; le fasi dei piani e le valutazioni possono appartenere a un progetto; le note dei piani lezione passano in fondo ai prerequisiti',
    5: 'i minuti di ritardo si segnano per unità didattica, perché in un’ora si può arrivare in ritardo più volte; quelli già scritti vanno sulla prima unità in ritardo',
    6: 'la scaletta dei progetti con attività condivise nei piani lezione e durate personalizzabili',
  } as Record<number, string>,
  /** Le note di un piano, accodate ai prerequisiti con la loro etichetta davanti. */
  noteNeiPrerequisiti: (note: string) => `Note: ${note}`,
  /** Il passaggio fra due versioni, con i cambiamenti in ordine. */
  racconto: (da: number, a: number, cambi: readonly string[]) =>
    `dal formato ${da} al ${a}: ${cambi.join('; ')}`,
  /** Quale numero non torna: il contenitore o i dati dentro. */
  cosa: { formato: 'formato', dati: 'dati' },
  scrittoDaRecente: (file: string, cosa: string, delFile: number, quiFinoA: number) =>
    `${file} è stato scritto da una versione più recente del registro ` +
    `(${cosa} ${delFile}, qui si arriva a ${quiFinoA})`,
  aggiornaInvece:
    'Aggiorna il registro invece di aprirlo: scriverci sopra adesso perderebbe quel che non si ' +
    'sa leggere.',
}

export const testi = catalogo(it, {
  de: {
    passi: {
      2: 'Einschreibe-Datum für jede lernende Person',
      3: 'Unterscheidung zwischen Pendenzen für Kurse und Klassenlehrpersonen; strukturierte Personalien der Lehrperson; das Schuljahr merkt sich, ob es dem offiziellen Schulkalender folgt; eine Lektion kann als Stellvertretung markiert werden',
      4: 'Projekte der Kurse, mit Aufgaben, Einschätzungen und einer Matrix mit Stufen; Etappen der Unterrichtspläne und Leistungsbeurteilungen können zu einem Projekt gehören; die Notizen der Unterrichtspläne wandern ans Ende der Voraussetzungen',
      5: 'die Verspätungsminuten werden pro Lektion erfasst, weil man in einer Stunde mehrmals zu spät kommen kann; die bereits erfassten kommen auf die erste verspätete Lektion',
      6: 'die Projektplanung mit gemeinsamen Aktivitäten in Unterrichtsplänen und anpassbarer Dauer',
    },
    noteNeiPrerequisiti: (note) => `Notizen: ${note}`,
    racconto: (da, a, cambi) => `vom Format ${da} zu ${a}: ${cambi.join('; ')}`,
    cosa: { formato: 'Format', dati: 'Daten' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} wurde mit einer neueren Version des Klassenbuchs geschrieben ` +
      `(${cosa} ${delFile}, dieses hier kennt nur bis ${quiFinoA})`,
    aggiornaInvece:
      'Aktualisiere das Klassenbuch, statt die Datei zu öffnen: Wenn jetzt darin gespeichert ' +
      'würde, ginge verloren, was es nicht lesen kann.',
  },
  fr: {
    passi: {
      2: 'date d’inscription pour chaque élève',
      3: 'distinction entre tâches en suspens de cours et de maître de classe ; données d’état civil structurées de l’enseignant ; l’année retient si elle suit le calendrier scolaire officiel ; une leçon peut être marquée comme remplacement',
      4: 'les projets des cours, avec tâches, appréciations et une grille à niveaux ; les étapes des plans et les évaluations peuvent appartenir à un projet ; les notes des plans de leçon passent à la fin des prérequis',
      5: 'les minutes de retard se notent par période, car on peut arriver en retard plusieurs fois dans une leçon ; celles déjà notées vont sur la première période en retard',
      6: 'la planification des projets avec des activités partagées dans les plans de leçon et des durées personnalisables',
    },
    noteNeiPrerequisiti: (note) => `Notes : ${note}`,
    racconto: (da, a, cambi) => `du format ${da} au ${a} : ${cambi.join(' ; ')}`,
    cosa: { formato: 'format', dati: 'données' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} a été écrit par une version plus récente du registre ` +
      `(${cosa} ${delFile}, celui-ci va jusqu’à ${quiFinoA})`,
    aggiornaInvece:
      'Mets à jour le registre au lieu d’ouvrir le fichier : écrire dedans maintenant ferait ' +
      'perdre ce qu’il ne sait pas lire.',
  },
  en: {
    passi: {
      2: 'enrollment date for each student',
      3: 'distinction between course and class teacher pending tasks; structured personal details of the teacher; the school year remembers whether it follows the official school calendar; a lesson can be marked as a substitution',
      4: 'course projects, with tasks, comments and a grid of levels; lesson plan steps and assessments can belong to a project; lesson plan notes move to the end of the prerequisites',
      5: 'late minutes are recorded per period, since a student can be late more than once in a lesson; those already recorded go on the first late period',
      6: 'project planning with shared activities in lesson plans and customisable durations',
    },
    noteNeiPrerequisiti: (note) => `Notes: ${note}`,
    racconto: (da, a, cambi) => `from format ${da} to ${a}: ${cambi.join('; ')}`,
    cosa: { formato: 'format', dati: 'data' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} was written by a newer version of the register ` +
      `(${cosa} ${delFile}, this one goes up to ${quiFinoA})`,
    aggiornaInvece:
      'Update the register instead of opening the file: writing to it now would lose what ' +
      'this version can’t read.',
  },
})
