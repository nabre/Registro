// I testi di `forms/timetable.ts`: l'editor delle fasce fisse di un corso.

import { catalogo } from '../../i18n/index.js'

const it = {
  udASettimana: (ud: number, sigla: string, durata: string) =>
    `${ud} ${sigla} a settimana · ${durata}`,
  senzaFasce: 'Senza fasce non si genera niente.',
  inizioAttaccato: 'Inizio, dato dalla fascia precedente',
  inizioGiornata: 'Inizio della giornata',
  aiutoAttaccato:
    'Comincia dove finisce la fascia sopra: per spostarla, cambia l’ordine o l’ora della ' +
    'prima fascia del giorno.',
  aiutoGiornata: 'L’ora in cui comincia la giornata: le fasce sotto la seguono.',
  segnapostoAula: 'aula',
  ripeti: 'Ripeti questa fascia in un altro giorno',
  togli: 'Togli questa fascia',
  aggiungi: 'Aggiungi una fascia',
}

export const testi = catalogo(it, {
  de: {
    udASettimana: (ud, sigla, durata) => `${ud} ${sigla} pro Woche · ${durata}`,
    senzaFasce: 'Ohne Zeitfenster wird nichts erzeugt.',
    inizioAttaccato: 'Beginn, vom vorherigen Zeitfenster vorgegeben',
    inizioGiornata: 'Beginn des Tages',
    aiutoAttaccato:
      'Beginnt, wo das Zeitfenster darüber endet: Um es zu verschieben, ändere die Reihenfolge ' +
      'oder die Uhrzeit des ersten Zeitfensters des Tages.',
    aiutoGiornata: 'Die Uhrzeit, zu der der Tag beginnt: Die Zeitfenster darunter folgen ihr.',
    segnapostoAula: 'Zimmer',
    ripeti: 'Dieses Zeitfenster an einem anderen Tag wiederholen',
    togli: 'Dieses Zeitfenster entfernen',
    aggiungi: 'Zeitfenster hinzufügen',
  },
  fr: {
    udASettimana: (ud, sigla, durata) => `${ud} ${sigla} par semaine · ${durata}`,
    senzaFasce: 'Sans plages horaires, rien n’est généré.',
    inizioAttaccato: 'Début, donné par la plage précédente',
    inizioGiornata: 'Début de la journée',
    aiutoAttaccato:
      'Commence là où finit la plage du dessus : pour la déplacer, change l’ordre ou l’heure ' +
      'de la première plage du jour.',
    aiutoGiornata: 'L’heure à laquelle commence la journée : les plages du dessous la suivent.',
    segnapostoAula: 'salle',
    ripeti: 'Répéter cette plage un autre jour',
    togli: 'Retirer cette plage',
    aggiungi: 'Ajouter une plage',
  },
  en: {
    udASettimana: (ud, sigla, durata) => `${ud} ${sigla} a week · ${durata}`,
    senzaFasce: 'Without time slots nothing is generated.',
    inizioAttaccato: 'Start, set by the previous slot',
    inizioGiornata: 'Start of the day',
    aiutoAttaccato:
      'Starts where the slot above ends: to move it, change the order or the time of the ' +
      'first slot of the day.',
    aiutoGiornata: 'The time the day starts: the slots below follow it.',
    segnapostoAula: 'room',
    ripeti: 'Repeat this slot on another day',
    togli: 'Remove this slot',
    aggiungi: 'Add a slot',
  },
})
