// I testi delle pause della giornata (`settings/dayBreaks.ts`). Gli ordinali
// («la seconda pausa») cambiano per lingua, quindi le frasi sono intere qui.

import { catalogo } from '../../../i18n/index.js'
import { ordinalePausa } from '../../../domain/breaks.js'
import { Maiuscola } from '../../../domain/lexicon.js'

/** «première», «2e», «3e»… */
function ordinaleFr (indice: number): string {
  return indice === 0 ? 'première' : `${indice + 1}e`
}

const ORDINALI_EN = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']

/** «first», «second»… e poi le cifre. */
function ordinaleEn (indice: number): string {
  return ORDINALI_EN[indice] ?? `${indice + 1}th`
}

const it = {
  /** Il nome di una pausa con la maiuscola: «Seconda pausa». */
  nomePausa: (indice: number) => `${Maiuscola(ordinalePausa(indice))} pausa`,
  durataMinuti: 'Durata (minuti)',
  durataDella: (indice: number) => `Durata della ${ordinalePausa(indice)} pausa`,
  inizio: 'Inizio',
  inizioPrima: 'Inizio della prima pausa',
  // L'unità nell'etichetta: «2» da solo non dice se sono ore, UD o minuti.
  dopoUd: (minuti: number) => `Dopo (UD da ${minuti} min)`,
  distanzaDella: (indice: number) => `Distanza della ${ordinalePausa(indice)} pausa`,
  togliPrima: 'Togli la prima pausa: la seconda resta dov’è e prende il suo orario',
  togliQuesta: 'Togli questa pausa: la successiva si conta dalla precedente',
  aggiungiPrima: 'Aggiungi la prima pausa',
  aggiungiUna: 'Aggiungi una pausa',
  alMassimo: (quante: number) => `Al massimo ${quante} pause in una giornata`,
  titolo: 'Pause della giornata',
  aiuto:
    'le lezioni nuove finiscono le unità didattiche prima di una pausa e le riprendono dopo; ' +
    'la prima pausa si dichiara con l’orario, le altre con quante UD stanno dopo la precedente',
  nessuna: 'Nessuna pausa dichiarata',
  nessunaTesto:
    'Una lezione nuova è un blocco solo, dall’inizio alla fine. Con le pause della ' +
    'scuola, le sue unità didattiche si fermano alla ricreazione e riprendono dopo.',
  pausaNuovaMinuti: 'Pausa nuova (minuti)',
  pausaNuovaAiuto: 'quanto dura una pausa appena aggiunta, qui o dentro un’ora: poi si corregge',
  pausaNuova: 'Pausa nuova',
}

export const testi = catalogo(it, {
  de: {
    nomePausa: (indice) => `${indice + 1}. Pause`,
    durataMinuti: 'Dauer (Minuten)',
    durataDella: (indice) => `Dauer der ${indice + 1}. Pause`,
    inizio: 'Beginn',
    inizioPrima: 'Beginn der 1. Pause',
    dopoUd: (minuti) => `Nach (Lektionen zu ${minuti} Min.)`,
    distanzaDella: (indice) => `Abstand der ${indice + 1}. Pause`,
    togliPrima: 'Erste Pause entfernen: Die zweite bleibt, wo sie ist, und übernimmt ihre Uhrzeit',
    togliQuesta: 'Diese Pause entfernen: Die nächste wird ab der vorherigen gezählt',
    aggiungiPrima: 'Erste Pause hinzufügen',
    aggiungiUna: 'Pause hinzufügen',
    alMassimo: (quante) => `Höchstens ${quante} Pausen an einem Tag`,
    titolo: 'Pausen des Tages',
    aiuto:
      'neue Stunden beenden ihre Lektionen vor einer Pause und setzen sie danach fort; ' +
      'die erste Pause gibt man mit der Uhrzeit an, die anderen mit der Anzahl Lektionen nach ' +
      'der vorherigen',
    nessuna: 'Keine Pause angegeben',
    nessunaTesto:
      'Eine neue Stunde ist ein einziges Stück, vom Anfang bis zum Ende. Mit den ' +
      'Pausen der Schule halten ihre Lektionen zur Pause an und gehen danach weiter.',
    pausaNuovaMinuti: 'Neue Pause (Minuten)',
    pausaNuovaAiuto:
      'wie lange eine eben hinzugefügte Pause dauert, hier oder in einer Stunde: danach ' +
      'korrigiert man',
    pausaNuova: 'Neue Pause',
  },
  fr: {
    nomePausa: (indice) => `${Maiuscola(ordinaleFr(indice))} pause`,
    durataMinuti: 'Durée (minutes)',
    durataDella: (indice) => `Durée de la ${ordinaleFr(indice)} pause`,
    inizio: 'Début',
    inizioPrima: 'Début de la première pause',
    dopoUd: (minuti) => `Après (périodes de ${minuti} min)`,
    distanzaDella: (indice) => `Écart de la ${ordinaleFr(indice)} pause`,
    togliPrima:
      'Retirer la première pause : la deuxième reste où elle est et prend son horaire',
    togliQuesta: 'Retirer cette pause : la suivante se compte depuis la précédente',
    aggiungiPrima: 'Ajouter la première pause',
    aggiungiUna: 'Ajouter une pause',
    alMassimo: (quante) => `Au maximum ${quante} pauses dans une journée`,
    titolo: 'Pauses de la journée',
    aiuto:
      'les nouvelles leçons terminent leurs périodes avant une pause et les reprennent après ; ' +
      'la première pause se déclare avec l’horaire, les autres avec le nombre de périodes après ' +
      'la précédente',
    nessuna: 'Aucune pause déclarée',
    nessunaTesto:
      'Une nouvelle leçon est un seul bloc, du début à la fin. Avec les pauses de l’école, ses ' +
      'périodes s’arrêtent à la récréation et reprennent après.',
    pausaNuovaMinuti: 'Nouvelle pause (minutes)',
    pausaNuovaAiuto:
      'la durée d’une pause qu’on vient d’ajouter, ici ou dans une leçon : on la corrige ensuite',
    pausaNuova: 'Nouvelle pause',
  },
  en: {
    nomePausa: (indice) => `${Maiuscola(ordinaleEn(indice))} break`,
    durataMinuti: 'Length (minutes)',
    durataDella: (indice) => `Length of the ${ordinaleEn(indice)} break`,
    inizio: 'Start',
    inizioPrima: 'Start of the first break',
    dopoUd: (minuti) => `After (periods of ${minuti} min)`,
    distanzaDella: (indice) => `Gap before the ${ordinaleEn(indice)} break`,
    togliPrima: 'Remove the first break: the second stays where it is and takes its time',
    togliQuesta: 'Remove this break: the next one is counted from the previous one',
    aggiungiPrima: 'Add the first break',
    aggiungiUna: 'Add a break',
    alMassimo: (quante) => `At most ${quante} breaks in a day`,
    titolo: 'Breaks in the day',
    aiuto:
      'new lessons end their periods before a break and pick them up after it; the first break ' +
      'is given by its time, the others by how many periods come after the previous one',
    nessuna: 'No breaks set',
    nessunaTesto:
      'A new lesson is a single block, from start to finish. With the school’s breaks, its ' +
      'periods stop at break time and carry on afterwards.',
    pausaNuovaMinuti: 'New break (minutes)',
    pausaNuovaAiuto:
      'how long a newly added break lasts, here or inside a lesson: you adjust it afterwards',
    pausaNuova: 'New break',
  },
})
