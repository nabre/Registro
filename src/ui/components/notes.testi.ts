// I testi del grafico delle note (`notes.ts`): la riga dei conti sopra l'asse
// e il suggerimento di ogni punto.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  media: ' media',
  sufficienti: (quanti: number, su: number) =>
    ` sufficient${quanti === 1 ? 'e' : 'i'} su ${su}`,
  voti: (valore: number, quanti: number) => `${valore}: ${plurale(quanti, 'voto', 'voti')}`,
}

export const testi = catalogo(it, {
  de: {
    media: ' Durchschnitt',
    sufficienti: (_quanti, su) => ` genügend von ${su}`,
    voti: (valore, quanti) => `${valore}: ${plurale(quanti, 'Note', 'Noten')}`,
  },
  fr: {
    media: ' moyenne',
    sufficienti: (quanti, su) => ` suffisant${quanti > 1 ? 's' : ''} sur ${su}`,
    voti: (valore, quanti) => `${valore} : ${plurale(quanti, 'note', 'notes')}`,
  },
  en: {
    media: ' average',
    sufficienti: (_quanti, su) => ` of ${su} pass`,
    voti: (valore, quanti) => `${valore}: ${plurale(quanti, 'grade', 'grades')}`,
  },
})
