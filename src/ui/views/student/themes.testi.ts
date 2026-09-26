// I testi della scheda personale, parte materie (`student/themes.ts`).

import { catalogo, minuscolo } from '../../../i18n/index.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TipoOsservazione } from '../../../domain/models.js'
import { plurale } from '../../../domain/text.js'

const it = {
  valutazioni: 'Valutazioni',
  nessunVoto: 'nessun voto',
  notaEMedia: (nota: string, media: string) => `nota ${nota} (media ${media})`,
  votiSu: (voti: number, momenti: number) =>
    `${plurale(voti, 'voto', 'voti')} su ${momenti}`,
  nessunMomento: 'Nessun momento di valutazione nel periodo.',
  peso: (peso: number) => `peso ${peso}`,
  comEAndata: 'Com’è andata',
  nienteSegnato: 'Niente segnato sulla matrice, in queste lezioni.',
  aspettiOraPerOra: 'Aspetti osservati, ora per ora',
  giorno: 'giorno',
  inTutto: 'in tutto',
  nienteAnnotato: 'Niente di annotato in questa materia.',
  /** Il tipo di un'osservazione in una pastiglia: il valore salvato, che è già una parola. */
  tipoOsservazione: (tipo: TipoOsservazione): string => tipo,
  fatte: 'fatte',
  daFare: 'da fare',
  diAssenza: (quota: string) => `${quota} di assenza`,
  nessunaOra: 'nessuna lezione nel periodo',
  nota: (nota: string) => `nota ${nota}`,
  ore: (ore: number) => plurale(ore, 'lezione', 'lezioni'),
  oreSenzaCorso: 'Ore senza corso',
  corsoEliminato:
    'il corso è stato eliminato, quel che era stato annotato resta',
}

export const testi = catalogo(it, {
  de: {
    valutazioni: 'Beurteilungen',
    nessunVoto: 'keine Note',
    notaEMedia: (nota, media) => `Note ${nota} (Durchschnitt ${media})`,
    votiSu: (voti, momenti) =>
      `${plurale(voti, 'Note', 'Noten')} von ${momenti}`,
    nessunMomento: 'Keine Leistungsbeurteilung im Zeitraum.',
    peso: (peso) => `Gewichtung ${peso}`,
    comEAndata: 'Wie es lief',
    nienteSegnato: 'In diesen Stunden wurde im Raster nichts markiert.',
    aspettiOraPerOra: 'Beobachtete Aspekte, Stunde für Stunde',
    giorno: 'Tag',
    inTutto: 'insgesamt',
    nienteAnnotato: 'In diesem Fach ist nichts notiert.',
    tipoOsservazione: (tipo) => lessico().tipiOsservazione[tipo] ?? tipo,
    fatte: 'erledigt',
    daFare: 'offen',
    diAssenza: (quota) => `${quota} Absenz`,
    nessunaOra: 'keine Stunde im Zeitraum',
    nota: (nota) => `Note ${nota}`,
    ore: (ore) => plurale(ore, 'Stunde', 'Stunden'),
    oreSenzaCorso: 'Stunden ohne Kurs',
    corsoEliminato: 'der Kurs wurde gelöscht, was notiert war, bleibt',
  },
  fr: {
    valutazioni: 'Évaluations',
    nessunVoto: 'pas de note',
    notaEMedia: (nota, media) => `note ${nota} (moyenne ${media})`,
    votiSu: (voti, momenti) =>
      `${plurale(voti, 'note', 'notes')} sur ${momenti}`,
    nessunMomento: 'Aucune évaluation dans la période.',
    peso: (peso) => `pondération ${peso}`,
    comEAndata: 'Comment ça s’est passé',
    nienteSegnato: 'Rien de marqué dans la grille pendant ces leçons.',
    aspettiOraPerOra: 'Aspects observés, leçon par leçon',
    giorno: 'jour',
    inTutto: 'en tout',
    nienteAnnotato: 'Rien de noté dans cette branche.',
    tipoOsservazione: (tipo) =>
      minuscolo(lessico().tipiOsservazione[tipo] ?? tipo),
    fatte: 'faites',
    daFare: 'à faire',
    diAssenza: (quota) => `${quota} d’absence`,
    nessunaOra: 'aucune leçon dans la période',
    nota: (nota) => `note ${nota}`,
    ore: (ore) => plurale(ore, 'leçon', 'leçons'),
    oreSenzaCorso: 'Leçons sans cours',
    corsoEliminato: 'le cours a été supprimé, ce qui avait été noté reste',
  },
  en: {
    valutazioni: 'Assessments',
    nessunVoto: 'no grade',
    notaEMedia: (nota, media) => `grade ${nota} (average ${media})`,
    votiSu: (voti, momenti) =>
      `${plurale(voti, 'grade', 'grades')} out of ${momenti}`,
    nessunMomento: 'No assessments in the period.',
    peso: (peso) => `weight ${peso}`,
    comEAndata: 'How it went',
    nienteSegnato: 'Nothing marked on the grid in these lessons.',
    aspettiOraPerOra: 'Observed aspects, lesson by lesson',
    giorno: 'day',
    inTutto: 'in total',
    nienteAnnotato: 'Nothing noted in this subject.',
    tipoOsservazione: (tipo) =>
      minuscolo(lessico().tipiOsservazione[tipo] ?? tipo),
    fatte: 'done',
    daFare: 'to do',
    diAssenza: (quota) => `${quota} absence`,
    nessunaOra: 'no lessons in the period',
    nota: (nota) => `grade ${nota}`,
    ore: (ore) => plurale(ore, 'lesson', 'lessons'),
    oreSenzaCorso: 'Lessons without a course',
    corsoEliminato: 'the course was deleted; what was noted stays',
  },
})
