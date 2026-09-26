// I testi del calendario ICS nel pannello (`externalCalendar.ts`): il guasto
// di lettura e l'avviso dopo l'allineamento delle lezioni.

import { catalogo } from '../i18n/index.js'

const it = {
  guasto: (nome: string, motivo: string) => `«${nome}»: ${motivo}`,
  nonSiLegge: 'Il calendario non si legge.',
  allineate: (quante: number) =>
    quante === 1
      ? 'Una lezione allineata al calendario ICS: orario e aula.'
      : `${quante} lezioni allineate al calendario ICS: orario e aula.`,
}

export const testi = catalogo(it, {
  de: {
    guasto: (nome, motivo) => `«${nome}»: ${motivo}`,
    nonSiLegge: 'Der Kalender lässt sich nicht lesen.',
    allineate: (quante) =>
      quante === 1
        ? 'Eine Stunde an den ICS-Kalender angeglichen: Zeit und Zimmer.'
        : `${quante} Stunden an den ICS-Kalender angeglichen: Zeit und Zimmer.`,
  },
  fr: {
    guasto: (nome, motivo) => `« ${nome} » : ${motivo}`,
    nonSiLegge: 'Le calendrier ne se lit pas.',
    allineate: (quante) =>
      quante === 1
        ? 'Une leçon alignée sur le calendrier ICS : horaire et salle.'
        : `${quante} leçons alignées sur le calendrier ICS : horaire et salle.`,
  },
  en: {
    guasto: (nome, motivo) => `“${nome}”: ${motivo}`,
    nonSiLegge: 'The calendar cannot be read.',
    allineate: (quante) =>
      quante === 1
        ? 'One lesson aligned with the ICS calendar: time and room.'
        : `${quante} lessons aligned with the ICS calendar: time and room.`,
  },
})
