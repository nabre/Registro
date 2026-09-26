// I testi di `todo.ts`: come si chiamano le tipologie delle pendenze, e la riga
// che dice che cosa ci sta dentro.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Chi fa che cosa: il titolo di una tipologia. */
  nomi: {
    assenze: 'Assenze da far firmare',
    segnalazioni: 'Assenze oltre la soglia',
    valutazioni: 'Momenti di valutazione',
    consegnaClasse: 'Consegna la classe',
    svolgeClasse: 'Svolge la classe',
    consegnaDocente: 'Consegna il docente',
    svolgeDocente: 'Svolge il docente',
  },
  /** Una riga di spiegazione, per quando la tipologia è vuota o va presentata. */
  descrizioni: {
    assenze: 'i rapporti caricati che devono partire, e le firme che devono tornare',
    segnalazioni:
      'chi ha perso più ore di quelle che la soglia ammette: da guardare, e da segnalare',
    valutazioni: 'le prove da correggere e da ridare, e i recuperi da fissare',
    consegnaClasse: 'i fogli che gli allievi devono portare: certificati, moduli, autorizzazioni',
    svolgeClasse: 'quel che è stato assegnato: esercizi, studio, materiale da portare',
    consegnaDocente:
      'i fogli che tocca dare: pagelle, convocazioni, moduli da far firmare a casa',
    svolgeDocente:
      'quel che tocca fare a chi insegna: fotocopie, preparazioni, amministrazione',
  },
}

export const testi = catalogo(it, {
  de: {
    nomi: {
      assenze: 'Absenzen zum Unterschreiben',
      segnalazioni: 'Absenzen über der Schwelle',
      valutazioni: 'Leistungsbeurteilungen',
      consegnaClasse: 'Die Klasse gibt ab',
      svolgeClasse: 'Die Klasse erledigt',
      consegnaDocente: 'Die Lehrperson gibt aus',
      svolgeDocente: 'Die Lehrperson erledigt',
    },
    descrizioni: {
      assenze:
        'die hochgeladenen Berichte, die verschickt werden müssen, und die Unterschriften, ' +
        'die zurückkommen sollen',
      segnalazioni:
        'wer mehr Stunden verpasst hat, als die Schwelle zulässt: ' +
        'anschauen und melden',
      valutazioni:
        'die Prüfungen zum Korrigieren und Zurückgeben, und die Nachprüfungen zum Ansetzen',
      consegnaClasse:
        'die Unterlagen, die die Lernenden bringen müssen: Bescheinigungen, Formulare, ' +
        'Bewilligungen',
      svolgeClasse: 'was aufgegeben wurde: Übungen, Lernstoff, mitzubringendes Material',
      consegnaDocente:
        'die Unterlagen, die auszuteilen sind: Zeugnisse, Aufgebote, ' +
        'Formulare zum Unterschreiben zu Hause',
      svolgeDocente:
        'was die Lehrperson zu erledigen hat: Kopien, Vorbereitungen, Administratives',
    },
  },
  fr: {
    nomi: {
      assenze: 'Absences à faire signer',
      segnalazioni: 'Absences au-delà du seuil',
      valutazioni: 'Évaluations',
      consegnaClasse: 'La classe rend',
      svolgeClasse: 'La classe fait',
      consegnaDocente: 'L’enseignant distribue',
      svolgeDocente: 'L’enseignant fait',
    },
    descrizioni: {
      assenze: 'les rapports chargés qui doivent partir, et les signatures qui doivent revenir',
      segnalazioni:
        'qui a manqué plus de leçons que le seuil ne le permet : ' +
        'à examiner, et à signaler',
      valutazioni: 'les épreuves à corriger et à rendre, et les rattrapages à fixer',
      consegnaClasse:
        'les documents que les personnes en formation doivent apporter : certificats, ' +
        'formulaires, autorisations',
      svolgeClasse: 'ce qui a été donné : exercices, étude, matériel à apporter',
      consegnaDocente:
        'les documents à distribuer : bulletins, convocations, ' +
        'formulaires à faire signer à la maison',
      svolgeDocente:
        'ce qui revient à l’enseignant : photocopies, préparations, administration',
    },
  },
  en: {
    nomi: {
      assenze: 'Absences to get signed',
      segnalazioni: 'Absences over the threshold',
      valutazioni: 'Assessments',
      consegnaClasse: 'The class hands in',
      svolgeClasse: 'The class does',
      consegnaDocente: 'The teacher hands out',
      svolgeDocente: 'The teacher does',
    },
    descrizioni: {
      assenze: 'uploaded reports waiting to go out, and signatures waiting to come back',
      segnalazioni:
        'who has missed more lessons than the threshold allows: to look at, and to report',
      valutazioni: 'tests to mark and hand back, and resits to schedule',
      consegnaClasse: 'papers learners have to bring in: certificates, forms, authorisations',
      svolgeClasse: 'what has been set: exercises, study, materials to bring',
      consegnaDocente:
        'papers to hand out: school reports, meeting letters, forms to be signed at home',
      svolgeDocente: 'what falls to the teacher: photocopies, preparation, admin',
    },
  },
})
