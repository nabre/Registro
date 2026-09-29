// I testi di `hours.ts`: le ore del calendario, spostate, tolte, duplicate, e
// le osservazioni scritte dentro.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../dominio/text.js'

const it = {
  altraClasse:
    'L’ora ha già appello, osservazioni o comportamento di un’altra classe: ' +
    'non si può spostare su un corso di un’altra classe. ' +
    'Si crea una lezione nuova nel corso giusto.',
  citataAltrove:
    'L’ora è legata a valutazioni, consegne o check del suo corso: ' +
    'non si può spostare su un altro corso. Si crea una lezione nuova nel corso giusto.',
  ridisposta: 'L’ora cadeva su una pausa della giornata: spezzata e spostata, con le stesse UD.',
  nessunaInChiusura: 'Nessuna ora cade in un giorno di chiusura.',
  tolteInChiusura: (n: number) => `${plurale(n, 'ora tolta', 'ore tolte')} dai giorni di chiusura.`,
  fuoriClasse: 'Quella persona non è in questa classe.',
  osservazioneVuota: 'L’osservazione è vuota.',
  pianoAltroCorso: 'Il piano assegnato appartiene a un altro corso.',
  nonFinita: 'La lezione non è ancora finita: si conclude quando il suo orario è passato.',
  annullataCompilata:
    'La lezione è già compilata (appello, testi, osservazioni, piano spuntato, valutazioni, ' +
    'consegne o check): non si può annullare.',
  ritardoFuoriPosto:
    'Il ritardo si segna solo nella prima UD della lezione o nella prima dopo una pausa: ' +
    'chi entra a lezione avviata ha le UD perse assenti e poi è presente.',
}

export const testi = catalogo(it, {
  de: {
    altraClasse:
      'Die Stunde hat schon eine Präsenzkontrolle, Beobachtungen oder Verhalten einer ' +
      'anderen Klasse: Sie lässt sich nicht in einen Kurs einer anderen Klasse verschieben. ' +
      'Erstelle eine neue Stunde im richtigen Kurs.',
    citataAltrove:
      'Die Stunde ist mit Bewertungen, Aufträgen oder Checks ihres Kurses verknüpft: ' +
      'Sie lässt sich nicht in einen anderen Kurs verschieben. Erstelle eine neue Stunde im richtigen Kurs.',
    ridisposta:
      'Die Stunde fiel auf eine Pause im Tagesablauf: aufgeteilt und verschoben, ' +
      'mit denselben Lektionen.',
    nessunaInChiusura: 'Keine Stunde fällt auf einen schulfreien Tag.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'Stunde', 'Stunden')} von den schulfreien Tagen entfernt.`,
    fuoriClasse: 'Diese Person ist nicht in dieser Klasse.',
    osservazioneVuota: 'Die Beobachtung ist leer.',
    pianoAltroCorso: 'Der zugewiesene Unterrichtsplan gehört zu einem anderen Kurs.',
    nonFinita: 'Die Stunde ist noch nicht vorbei: Man schliesst sie ab, wenn ihre Zeit vorüber ist.',
    annullataCompilata:
      'Die Stunde ist schon ausgefüllt (Präsenzkontrolle, Texte, Beobachtungen, abgehakter ' +
      'Plan, Bewertungen, Aufträge oder Checks): Sie kann nicht ausfallen.',
    ritardoFuoriPosto:
      'Eine Verspätung gibt es nur in der ersten Lektion der Stunde oder in der ersten nach einer Pause: ' +
      'Wer später dazukommt, ist in den verpassten Lektionen abwesend und danach anwesend.',
  },
  fr: {
    altraClasse:
      'La leçon a déjà un appel, des observations ou un comportement d’une autre classe : ' +
      'on ne peut pas la déplacer vers un cours d’une autre classe. ' +
      'Crée une nouvelle leçon dans le bon cours.',
    citataAltrove:
      'La leçon est liée à des évaluations, des devoirs ou des checks de son cours : ' +
      'on ne peut pas la déplacer vers un autre cours. Crée une nouvelle leçon dans le bon cours.',
    ridisposta:
      'La leçon tombait sur une pause de la journée : scindée et déplacée, ' +
      'avec les mêmes périodes.',
    nessunaInChiusura: 'Aucune leçon ne tombe sur un jour de fermeture.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'leçon retirée', 'leçons retirées')} des jours de fermeture.`,
    fuoriClasse: 'Cette personne n’est pas dans cette classe.',
    osservazioneVuota: 'L’observation est vide.',
    pianoAltroCorso: 'Le plan de leçon attribué appartient à un autre cours.',
    nonFinita: 'La leçon n’est pas encore finie : on la termine quand son horaire est passé.',
    annullataCompilata:
      'La leçon est déjà remplie (appel, textes, observations, plan coché, évaluations, ' +
      'devoirs ou checks) : elle ne peut pas être annulée.',
    ritardoFuoriPosto:
      'Le retard ne se note qu’à la première période de la leçon ou à la première après une pause : ' +
      'qui arrive en cours de leçon est absent aux périodes manquées, puis présent.',
  },
  en: {
    altraClasse:
      'The lesson already has attendance, observations or behaviour from another class: ' +
      'it can’t be moved to a course of another class. ' +
      'Create a new lesson in the right course.',
    citataAltrove:
      'The lesson is linked to assessments, assignments or checks of its course: ' +
      'it can’t be moved to another course. Create a new lesson in the right course.',
    ridisposta:
      'The lesson fell on a break in the day: split and moved, with the same periods.',
    nessunaInChiusura: 'No lesson falls on a closure day.',
    tolteInChiusura: (n) => `${plurale(n, 'lesson', 'lessons')} removed from closure days.`,
    fuoriClasse: 'That person isn’t in this class.',
    osservazioneVuota: 'The observation is empty.',
    pianoAltroCorso: 'The assigned lesson plan belongs to another course.',
    nonFinita: 'The lesson isn’t over yet: it can be completed once its time has passed.',
    annullataCompilata:
      'The lesson has already been filled in (attendance, texts, observations, ticked plan, ' +
      'assessments, assignments or checks): it can’t be cancelled.',
    ritardoFuoriPosto:
      'Lateness can only be marked in the first period of the lesson or the first after a break: ' +
      'someone arriving mid-lesson is absent for the missed periods, then present.',
  },
})
