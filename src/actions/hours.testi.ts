// I testi di `hours.ts`: le ore del calendario, spostate, tolte, duplicate, e
// le osservazioni scritte dentro.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  altraClasse:
    'L’ora ha già appello, osservazioni o comportamento di un’altra classe: ' +
    'non si può spostare su un corso di un’altra classe. ' +
    'Si crea una lezione nuova nel corso giusto.',
  ridisposta: 'L’ora cadeva su una pausa della giornata: spezzata e spostata, con le stesse UD.',
  nessunaInChiusura: 'Nessuna ora cade in un giorno di chiusura.',
  tolteInChiusura: (n: number) => `${plurale(n, 'ora tolta', 'ore tolte')} dai giorni di chiusura.`,
  fuoriClasse: 'Quella persona non è in questa classe.',
  osservazioneVuota: 'L’osservazione è vuota.',
}

export const testi = catalogo(it, {
  de: {
    altraClasse:
      'Die Stunde hat schon eine Präsenzkontrolle, Beobachtungen oder Verhalten einer ' +
      'anderen Klasse: Sie lässt sich nicht in einen Kurs einer anderen Klasse verschieben. ' +
      'Erstelle eine neue Stunde im richtigen Kurs.',
    ridisposta:
      'Die Stunde fiel auf eine Pause im Tagesablauf: aufgeteilt und verschoben, ' +
      'mit denselben Lektionen.',
    nessunaInChiusura: 'Keine Stunde fällt auf einen schulfreien Tag.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'Stunde', 'Stunden')} von den schulfreien Tagen entfernt.`,
    fuoriClasse: 'Diese Person ist nicht in dieser Klasse.',
    osservazioneVuota: 'Die Beobachtung ist leer.',
  },
  fr: {
    altraClasse:
      'La leçon a déjà un appel, des observations ou un comportement d’une autre classe : ' +
      'on ne peut pas la déplacer vers un cours d’une autre classe. ' +
      'Crée une nouvelle leçon dans le bon cours.',
    ridisposta:
      'La leçon tombait sur une pause de la journée : scindée et déplacée, ' +
      'avec les mêmes périodes.',
    nessunaInChiusura: 'Aucune leçon ne tombe sur un jour de fermeture.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'leçon retirée', 'leçons retirées')} des jours de fermeture.`,
    fuoriClasse: 'Cette personne n’est pas dans cette classe.',
    osservazioneVuota: 'L’observation est vide.',
  },
  en: {
    altraClasse:
      'The lesson already has attendance, observations or behaviour from another class: ' +
      'it can’t be moved to a course of another class. ' +
      'Create a new lesson in the right course.',
    ridisposta:
      'The lesson fell on a break in the day: split and moved, with the same periods.',
    nessunaInChiusura: 'No lesson falls on a closure day.',
    tolteInChiusura: (n) => `${plurale(n, 'lesson', 'lessons')} removed from closure days.`,
    fuoriClasse: 'That person isn’t in this class.',
    osservazioneVuota: 'The observation is empty.',
  },
})
