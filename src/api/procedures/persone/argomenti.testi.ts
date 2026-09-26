// I testi di `persone.argomenti`. I valori di `presenza` («perse», «tutte»…)
// sono del contratto e restano uguali in ogni lingua. Si leggono al momento
// dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  titolo: 'Gli argomenti delle ore di una persona, con e senza assenza',
  allievoId: 'La persona di cui si guardano le ore',
  corsoId: 'Solo le ore di questo corso',
  presenza: 'Quali ore: «perse» (senza, è questo), «parziali», «seguite», «ignote», «tutte»',
  dove: 'argomento, materia o aula',
  allievo: 'Come si scrive parlandone: «Rossi Maria»',
  presenzaUscita: 'Il filtro con cui si è risposto',
  orePerse: 'Ore mancate per intero nel periodo, filtro a parte',
  udPerse: 'Unità didattiche perse nel periodo, filtro a parte',
  senzaArgomento:
    'Quante delle ore in elenco non dicono che cosa si è fatto: non si recuperano al buio',
  lezioneId: 'Da passare a «ore.leggi» per materiali e consuntivo',
  corso: 'Come si legge: «I MEC A — Matematica»',
  argomenti: 'Che cosa si è fatto, come l’ha scritto chi insegna',
  ud: 'Quante unità didattiche durava l’ora',
  udAssenza: 'Quante ne ha perse di quelle',
  udPresenza: 'Quante ne ha seguite',
  nota: 'La nota dell’appello su quell’ora, se c’è',
  conAppello: 'Se su quell’ora qualcuno ha segnato qualcosa',
  corsoDiAltraClasse: (corso: string, classe: string) =>
    `«${corso}» non è un corso della ${classe}: i corsi di una classe li elenca «corsi.elenco».`,
  presentazione: {
    titolo: 'Le ore di una persona',
    persona: 'Persona',
    classe: 'Classe',
    filtro: 'Filtro',
    quante: 'Ore che corrispondono',
    orePerse: 'Ore perse nel periodo',
    udPerse: 'UD perse nel periodo',
    senzaArgomento: 'Senza argomento scritto',
    dalle: 'Dalle',
    corso: 'Corso',
    comeAndata: 'Com’è andata',
    udPerseColonna: 'UD perse',
    argomenti: 'Argomenti',
  },
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Die Themen der Stunden einer Person, mit und ohne Abwesenheit',
    allievoId: 'Die Person, deren Stunden angeschaut werden',
    corsoId: 'Nur die Stunden dieses Kurses',
    presenza:
      'Welche Stunden: «perse» (Standard), «parziali», «seguite», ' +
      '«ignote», «tutte»',
    dove: 'Thema, Fach oder Zimmer',
    allievo: 'Wie man sie im Gespräch schreibt: «Rossi Maria»',
    presenzaUscita: 'Der Filter, mit dem geantwortet wurde',
    orePerse: 'Ganz verpasste Stunden im Zeitraum, unabhängig vom Filter',
    udPerse: 'Verpasste Lektionen im Zeitraum, unabhängig vom Filter',
    senzaArgomento:
      'Wie viele der aufgelisteten Stunden nicht sagen, was gemacht wurde: ' +
      'Man holt sie nicht blind nach',
    lezioneId: 'An «ore.leggi» übergeben, für Materialien und Rückblick',
    corso: 'Wie man ihn liest: «I MEC A — Matematica»',
    argomenti: 'Was gemacht wurde, so wie es die Lehrperson geschrieben hat',
    ud: 'Wie viele Lektionen die Stunde dauerte',
    udAssenza: 'Wie viele davon verpasst wurden',
    udPresenza: 'Wie viele besucht wurden',
    nota: 'Die Notiz der Präsenzkontrolle zu dieser Stunde, falls es eine gibt',
    conAppello: 'Ob in dieser Stunde jemand etwas eingetragen hat',
    corsoDiAltraClasse: (corso, classe) =>
      `«${corso}» ist kein Kurs der ${classe}: Die Kurse einer Klasse listet «corsi.elenco» auf.`,
    presentazione: {
      titolo: 'Die Stunden einer Person',
      persona: 'Person',
      classe: 'Klasse',
      filtro: 'Filter',
      quante: 'Passende Stunden',
      orePerse: 'Verpasste Stunden im Zeitraum',
      udPerse: 'Verpasste Lekt. im Zeitraum',
      senzaArgomento: 'Ohne eingetragenes Thema',
      dalle: 'Von',
      corso: 'Kurs',
      comeAndata: 'Wie es war',
      udPerseColonna: 'Verpasste Lekt.',
      argomenti: 'Themen',
    },
  },
  fr: {
    titolo: 'Les sujets des leçons d’une personne, avec et sans absence',
    allievoId: 'La personne dont on regarde les leçons',
    corsoId: 'Seulement les leçons de ce cours',
    presenza:
      'Quelles leçons : « perse » (par défaut), « parziali », « seguite », ' +
      '« ignote », « tutte »',
    dove: 'sujet, branche ou salle',
    allievo: 'Comment on l’écrit en en parlant : « Rossi Maria »',
    presenzaUscita: 'Le filtre avec lequel on a répondu',
    orePerse: 'Leçons manquées en entier sur la période, filtre mis à part',
    udPerse: 'Périodes manquées sur l’intervalle, filtre mis à part',
    senzaArgomento:
      'Combien des leçons listées ne disent pas ce qui a été fait : on ne les rattrape pas ' +
      'à l’aveugle',
    lezioneId: 'À passer à « ore.leggi » pour les supports et le bilan',
    corso: 'Comment il se lit : « I MEC A — Matematica »',
    argomenti: 'Ce qui a été fait, tel que l’a écrit la personne qui enseigne',
    ud: 'Combien de périodes durait la leçon',
    udAssenza: 'Combien de celles-ci ont été manquées',
    udPresenza: 'Combien ont été suivies',
    nota: 'La note de l’appel pour cette leçon, s’il y en a une',
    conAppello: 'Si quelqu’un a noté quelque chose pour cette leçon',
    corsoDiAltraClasse: (corso, classe) =>
      `« ${corso} » n’est pas un cours de la ${classe} : c’est ` +
      '« corsi.elenco » qui liste les cours d’une classe.',
    presentazione: {
      titolo: 'Les leçons d’une personne',
      persona: 'Personne',
      classe: 'Classe',
      filtro: 'Filtre',
      quante: 'Leçons qui correspondent',
      orePerse: 'Leçons manquées sur la période',
      udPerse: 'Pér. manquées sur la période',
      senzaArgomento: 'Sans sujet noté',
      dalle: 'De',
      corso: 'Cours',
      comeAndata: 'Comment ça s’est passé',
      udPerseColonna: 'Pér. manquées',
      argomenti: 'Sujets',
    },
  },
  en: {
    titolo: 'The topics of a person’s lessons, with and without absence',
    allievoId: 'The person whose lessons are looked at',
    corsoId: 'Only the lessons of this course',
    presenza:
      'Which lessons: “perse” (the default), “parziali”, “seguite”, “ignote”, “tutte”',
    dove: 'topic, subject or room',
    allievo: 'How it is written when talking about them: “Rossi Maria”',
    presenzaUscita: 'The filter used for the answer',
    orePerse: 'Lessons missed in full in the period, regardless of the filter',
    udPerse: 'Periods missed in the date range, regardless of the filter',
    senzaArgomento:
      'How many of the listed lessons do not say what was done: they cannot be caught up blindly',
    lezioneId: 'To pass to “ore.leggi” for materials and review',
    corso: 'How it reads: “I MEC A — Matematica”',
    argomenti: 'What was done, as the teacher wrote it',
    ud: 'How many periods the lesson lasted',
    udAssenza: 'How many of those were missed',
    udPresenza: 'How many were attended',
    nota: 'The attendance note for that lesson, if there is one',
    conAppello: 'Whether anyone recorded anything for that lesson',
    corsoDiAltraClasse: (corso, classe) =>
      `“${corso}” is not a course of ${classe}: “corsi.elenco” lists the courses of a class.`,
    presentazione: {
      titolo: 'A person’s lessons',
      persona: 'Person',
      classe: 'Class',
      filtro: 'Filter',
      quante: 'Matching lessons',
      orePerse: 'Lessons missed in period',
      udPerse: 'Per. missed in period',
      senzaArgomento: 'No topic written',
      dalle: 'From',
      corso: 'Course',
      comeAndata: 'How it went',
      udPerseColonna: 'Per. missed',
      argomenti: 'Topics',
    },
  },
})
