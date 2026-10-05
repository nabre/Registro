// I testi della giornata di scuola (`settings/schoolDay.tsx`). Le pause hanno il
// loro catalogo, `dayBreaks.testi.ts`.

import { catalogo } from '#core/i18n/index.js'
import { LEZIONE, Maiuscola, Uno } from '#core/dominio/lexicon.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  nuovaUdTitolo: (minuti: number) => `Unità didattica da ${minuti} minuti?`,
  /**
   * Che cosa cambia con l'UD: quante fasce dell'orario e quante ore sul
   * calendario, e quanto dura un'ora da due UD con la misura nuova.
   */
  nuovaUdTesto: (fasce: number, ore: number, dueUd: string) => {
    const cosa = [
      fasce > 0 ? plurale(fasce, 'fascia dell’orario', 'fasce dell’orario') : null,
      ore > 0 ? plurale(ore, 'lezione sul calendario', 'lezioni sul calendario') : null,
    ].filter(Boolean).join(' e ')
    return `${Maiuscola(cosa)} tengono le loro UD: un’ora da due UD ` +
      `diventa di ${dueUd}. Le pause dopo la prima si spostano con loro.`
  },
  cambia: 'Cambia',
  udTitolo: 'Unità didattica',
  udAiuto:
    'il passo di tutta la giornata: le fasce dell’orario ne sono multipli, le pause dopo la ' +
    'prima si contano in UD, l’appello ha una colonna per UD',
  durataUd: 'Durata di un’UD',
  fasciaNuova: `${Uno(LEZIONE.fascia)} di una lezione nuova`,
  // Le unità accanto ai numeri: senza, «2» non dice se sono ore, unità o minuti.
  min: 'min',
  unitaUd: 'UD',
  minuti: (quanti: number) => `${quanti} min`,
  altro: 'Altro…',
  unaUd: (durata: string) => `1 UD = ${durata}`,
  lezioneNuova: (ud: number, durata: string) => `lezione nuova: ${ud} UD · ${durata}`,
  fissata: (conAppello: number, minuti: number) =>
    `Fissata: ${plurale(conAppello, 'lezione ha', 'lezioni hanno')} già l’appello, contato in UD ` +
    `da ${minuti} minuti. Cambiarla sposterebbe le assenze sotto UD che non sono ` +
    'quelle in cui sono successe.',
  portaAlle: (ora: string) => `Porta alle ${ora}`,
  allineaInizio: 'L’ora più vicina da cui le UD cadono intere fra le pause',
  allineaFine: 'L’ora più vicina in cui un’UD finisce intera',
  lineaEtichetta: 'La giornata, UD per UD',
  trattoUd: (numero: number) => `${numero}ª UD`,
  pausa: 'Pausa',
  avanzo: 'Avanzo',
  udIntere: (quante: number, durata: string) =>
    `${plurale(quante, 'UD intera', 'UD intere')} · ${durata}`,
  avanzi: (quanti: number) => plurale(quanti, 'avanzo', 'avanzi'),
  avanziNota:
    ' minuti che non fanno un’UD: l’inizio o la fine non stanno sulla griglia delle pause.',
  orariTitolo: 'Inizio e fine della giornata',
  orariAiuto:
    'la prima e l’ultima ora che il calendario mostra. Con le pause dichiarate conviene ' +
    'sceglierle sulla griglia, perché le UD cadano intere: sotto si vede com’è la giornata',
  primaOra: 'Prima ora mostrata',
  ultimaOra: 'Ultima ora mostrata',
  udPrimaPausa: 'UD prima della prima pausa',
  udDopoPausa: 'UD dopo l’ultima pausa',
  udPrimaRiferimento: 'UD prima dell’ora di riferimento',
  udDopoRiferimento: 'UD dopo l’ora di riferimento',
  unaUdInMeno: (contatore: string) => `${contatore}: una in meno`,
  unaUdInPiu: (contatore: string) => `${contatore}: una in più`,
  oraRiferimento: 'Ora di riferimento',
  oraRiferimentoAiuto:
    'Senza pause, l’ora da cui si contano le UD prima e dopo: come una pausa di zero ' +
    'minuti. Spostarla sposta la giornata con le stesse UD.',
  fuoriDalGiorno: 'Con quest’ora di riferimento la giornata uscirebbe dal giorno.',
  giorniTitolo: 'Giorni mostrati',
  giorniAiuto: 'i giorni che il calendario e la proiezione mostrano: almeno uno',
  giorniSettimana: 'Giorni della settimana',
  giorniSettimanaAiuto: 'Vale per il calendario e per la proiezione.',
  almenoUno: 'Almeno un giorno deve restare visibile.',
}

export const testi = catalogo(it, {
  de: {
    nuovaUdTitolo: (minuti) => `Lektion zu ${minuti} Minuten?`,
    nuovaUdTesto: (fasce, ore, dueUd) => {
      const cosa = [
        fasce > 0
          ? plurale(fasce, 'Zeitfenster des Stundenplans', 'Zeitfenster des Stundenplans')
          : null,
        ore > 0 ? plurale(ore, 'Stunde im Kalender', 'Stunden im Kalender') : null,
      ].filter(Boolean).join(' und ')
      return `Betroffen: ${cosa}. Sie behalten ihre Lektionen: Eine Stunde mit zwei Lektionen ` +
        `dauert dann ${dueUd}. Die Pausen nach der ersten verschieben sich mit.`
    },
    cambia: 'Ändern',
    udTitolo: 'Lektion',
    udAiuto:
      'der Takt des ganzen Tages: Die Zeitfenster des Stundenplans sind Vielfache davon, die ' +
      'Pausen nach der ersten zählen in Lektionen, die Präsenzkontrolle hat eine Spalte pro ' +
      'Lektion',
    durataUd: 'Dauer einer Lektion',
    fasciaNuova: 'Zeitfenster einer neuen Stunde',
    min: 'Min.',
    unitaUd: 'Lekt.',
    minuti: (quanti) => `${quanti} Min.`,
    altro: 'Andere…',
    unaUd: (durata) => `1 Lekt. = ${durata}`,
    lezioneNuova: (ud, durata) => `neue Stunde: ${ud} Lekt. · ${durata}`,
    fissata: (conAppello, minuti) =>
      `Festgelegt: ${plurale(conAppello, 'Stunde hat', 'Stunden haben')} schon eine ` +
      `Präsenzkontrolle, gezählt in Lektionen zu ${minuti} Minuten. Eine Änderung würde die ` +
      'Absenzen unter Lektionen verschieben, in denen sie nicht passiert sind.',
    portaAlle: (ora) => `Auf ${ora} setzen`,
    allineaInizio: 'Die nächste Uhrzeit, ab der die Lektionen ganz zwischen die Pausen fallen',
    allineaFine: 'Die nächste Uhrzeit, zu der eine Lektion ganz endet',
    lineaEtichetta: 'Der Tag, Lektion für Lektion',
    trattoUd: (numero) => `${numero}. Lektion`,
    pausa: 'Pause',
    avanzo: 'Rest',
    udIntere: (quante, durata) =>
      `${plurale(quante, 'ganze Lektion', 'ganze Lektionen')} · ${durata}`,
    avanzi: (quanti) => plurale(quanti, 'Rest', 'Reste'),
    avanziNota:
      ' Minuten, die keine Lektion ergeben: Beginn oder Ende liegen nicht auf dem Raster der ' +
      'Pausen.',
    orariTitolo: 'Beginn und Ende des Tages',
    orariAiuto:
      'die erste und die letzte Uhrzeit, die der Kalender zeigt. Mit angegebenen Pausen wählt ' +
      'man sie am besten auf dem Raster, damit die Lektionen ganz bleiben: Darunter sieht man, ' +
      'wie der Tag aussieht',
    primaOra: 'Erste angezeigte Uhrzeit',
    ultimaOra: 'Letzte angezeigte Uhrzeit',
    udPrimaPausa: 'Lektionen vor der ersten Pause',
    udDopoPausa: 'Lektionen nach der letzten Pause',
    udPrimaRiferimento: 'Lektionen vor der Bezugszeit',
    udDopoRiferimento: 'Lektionen nach der Bezugszeit',
    unaUdInMeno: (contatore) => `${contatore}: eine weniger`,
    unaUdInPiu: (contatore) => `${contatore}: eine mehr`,
    oraRiferimento: 'Bezugszeit',
    oraRiferimentoAiuto:
      'Ohne Pausen die Uhrzeit, ab der die Lektionen davor und danach gezählt werden: wie eine ' +
      'Pause von null Minuten. Wer sie verschiebt, verschiebt den Tag mit denselben Lektionen.',
    fuoriDalGiorno: 'Mit dieser Bezugszeit würde der Tag über den Kalendertag hinausgehen.',
    giorniTitolo: 'Angezeigte Tage',
    giorniAiuto: 'die Tage, die Kalender und Projektion zeigen: mindestens einer',
    giorniSettimana: 'Wochentage',
    giorniSettimanaAiuto: 'Gilt für den Kalender und für die Projektion.',
    almenoUno: 'Mindestens ein Tag muss sichtbar bleiben.',
  },
  fr: {
    nuovaUdTitolo: (minuti) => `Période de ${minuti} minutes ?`,
    nuovaUdTesto: (fasce, ore, dueUd) => {
      const cosa = [
        fasce > 0 ? plurale(fasce, 'plage de l’horaire', 'plages de l’horaire') : null,
        ore > 0 ? plurale(ore, 'leçon au calendrier', 'leçons au calendrier') : null,
      ].filter(Boolean).join(' et ')
      return `Concernées : ${cosa}. Elles gardent leurs périodes : une leçon de deux périodes ` +
        `dure alors ${dueUd}. Les pauses après la première se déplacent avec elles.`
    },
    cambia: 'Changer',
    udTitolo: 'Période',
    udAiuto:
      'le pas de toute la journée : les plages de l’horaire en sont des multiples, les pauses ' +
      'après la première se comptent en périodes, l’appel a une colonne par période',
    durataUd: 'Durée d’une période',
    fasciaNuova: 'Plage horaire d’une nouvelle leçon',
    min: 'min',
    unitaUd: 'pér.',
    minuti: (quanti) => `${quanti} min`,
    altro: 'Autre…',
    unaUd: (durata) => `1 pér. = ${durata}`,
    lezioneNuova: (ud, durata) => `nouvelle leçon : ${ud} pér. · ${durata}`,
    fissata: (conAppello, minuti) =>
      `Fixée : ${plurale(conAppello, 'leçon a', 'leçons ont')} déjà l’appel, compté en ` +
      `périodes de ${minuti} minutes. La changer déplacerait les absences sous des périodes ` +
      'qui ne sont pas celles où elles ont eu lieu.',
    portaAlle: (ora) => `Mettre à ${ora}`,
    allineaInizio:
      'L’heure la plus proche à partir de laquelle les périodes tombent entières entre les pauses',
    allineaFine: 'L’heure la plus proche à laquelle une période se termine entière',
    lineaEtichetta: 'La journée, période par période',
    trattoUd: (numero) => `${numero === 1 ? '1re' : `${numero}e`} période`,
    pausa: 'Pause',
    avanzo: 'Reste',
    udIntere: (quante, durata) =>
      `${plurale(quante, 'période entière', 'périodes entières')} · ${durata}`,
    avanzi: (quanti) => plurale(quanti, 'reste', 'restes'),
    avanziNota:
      ' minutes qui ne font pas une période : le début ou la fin ne tombent pas sur la grille ' +
      'des pauses.',
    orariTitolo: 'Début et fin de la journée',
    orariAiuto:
      'la première et la dernière heure que montre le calendrier. Avec des pauses déclarées, ' +
      'mieux vaut les choisir sur la grille, pour que les périodes tombent entières : dessous, ' +
      'on voit à quoi ressemble la journée',
    primaOra: 'Première heure affichée',
    ultimaOra: 'Dernière heure affichée',
    udPrimaPausa: 'Périodes avant la première pause',
    udDopoPausa: 'Périodes après la dernière pause',
    udPrimaRiferimento: 'Périodes avant l’heure de référence',
    udDopoRiferimento: 'Périodes après l’heure de référence',
    unaUdInMeno: (contatore) => `${contatore} : une de moins`,
    unaUdInPiu: (contatore) => `${contatore} : une de plus`,
    oraRiferimento: 'Heure de référence',
    oraRiferimentoAiuto:
      'Sans pauses, l’heure à partir de laquelle on compte les périodes avant et après : comme ' +
      'une pause de zéro minute. La déplacer déplace la journée avec les mêmes périodes.',
    fuoriDalGiorno: 'Avec cette heure de référence, la journée sortirait du jour.',
    giorniTitolo: 'Jours affichés',
    giorniAiuto: 'les jours que montrent le calendrier et la projection : au moins un',
    giorniSettimana: 'Jours de la semaine',
    giorniSettimanaAiuto: 'Vaut pour le calendrier et pour la projection.',
    almenoUno: 'Au moins un jour doit rester visible.',
  },
  en: {
    nuovaUdTitolo: (minuti) => `Period of ${minuti} minutes?`,
    nuovaUdTesto: (fasce, ore, dueUd) => {
      const cosa = [
        fasce > 0 ? plurale(fasce, 'timetable slot', 'timetable slots') : null,
        ore > 0 ? plurale(ore, 'lesson on the calendar', 'lessons on the calendar') : null,
      ].filter(Boolean).join(' and ')
      return `Affected: ${cosa}. They keep their periods: a lesson of two periods then lasts ` +
        `${dueUd}. The breaks after the first one move with them.`
    },
    cambia: 'Change',
    udTitolo: 'Period',
    udAiuto:
      'the step of the whole day: timetable slots are multiples of it, the breaks after the ' +
      'first are counted in periods, attendance has one column per period',
    durataUd: 'Length of a period',
    fasciaNuova: 'Time slot of a new lesson',
    min: 'min',
    unitaUd: 'per.',
    minuti: (quanti) => `${quanti} min`,
    altro: 'Other…',
    unaUd: (durata) => `1 per. = ${durata}`,
    lezioneNuova: (ud, durata) => `new lesson: ${ud} per. · ${durata}`,
    fissata: (conAppello, minuti) =>
      `Fixed: ${plurale(conAppello, 'lesson already has', 'lessons already have')} attendance, ` +
      `counted in periods of ${minuti} minutes. Changing it would move absences under periods ` +
      'other than the ones in which they happened.',
    portaAlle: (ora) => `Move to ${ora}`,
    allineaInizio: 'The nearest time from which periods fit whole between the breaks',
    allineaFine: 'The nearest time at which a period ends whole',
    lineaEtichetta: 'The day, period by period',
    trattoUd: (numero) => `Period ${numero}`,
    pausa: 'Break',
    avanzo: 'Leftover',
    udIntere: (quante, durata) =>
      `${plurale(quante, 'whole period', 'whole periods')} · ${durata}`,
    avanzi: (quanti) => plurale(quanti, 'leftover', 'leftovers'),
    avanziNota:
      ' minutes that don’t make a period: the start or the end is not on the grid of the breaks.',
    orariTitolo: 'Start and end of the day',
    orariAiuto:
      'the first and last hour the calendar shows. With breaks set, it is best to pick them on ' +
      'the grid so that periods fit whole: below you can see what the day looks like',
    primaOra: 'First hour shown',
    ultimaOra: 'Last hour shown',
    udPrimaPausa: 'Periods before the first break',
    udDopoPausa: 'Periods after the last break',
    udPrimaRiferimento: 'Periods before the reference time',
    udDopoRiferimento: 'Periods after the reference time',
    unaUdInMeno: (contatore) => `${contatore}: one fewer`,
    unaUdInPiu: (contatore) => `${contatore}: one more`,
    oraRiferimento: 'Reference time',
    oraRiferimentoAiuto:
      'Without breaks, the time from which periods before and after are counted: like a break ' +
      'of zero minutes. Moving it moves the day with the same periods.',
    fuoriDalGiorno: 'With this reference time the day would run outside the day.',
    giorniTitolo: 'Days shown',
    giorniAiuto: 'the days the calendar and the projection show: at least one',
    giorniSettimana: 'Days of the week',
    giorniSettimanaAiuto: 'Applies to the calendar and to the projection.',
    almenoUno: 'At least one day must stay visible.',
  },
})
