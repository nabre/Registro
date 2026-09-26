// I testi dei calcoli (`calculations.ts`): le didascalie del grafico dei voti
// di una prova e il nome che un piano lezione si guadagna da sé.

import { catalogo } from '../i18n/index.js'
import { PIF } from './lexicon.js'
import { plurale } from './text.js'

/** «1st», «2nd», «3rd», «11th»: l'ordinale inglese di un numero. */
function ordinaleInglese (numero: number): string {
  const decine = numero % 100
  if (decine >= 11 && decine <= 13) return `${numero}th`
  const suffisso = { 1: 'st', 2: 'nd', 3: 'rd' }[numero % 10] ?? 'th'
  return `${numero}${suffisso}`
}

const it = {
  /** Sotto l'asse del grafico: quanti voti, e che cosa è un punto. */
  unitaGrafico: (voti: number) =>
    `${plurale(voti, 'voto', 'voti')} · un punto per ${PIF.singolare}`,
  /** Il segno della media sull'asse. */
  mediaGrafico: (voto: string) => `media ${voto}`,
  /** Un piano che non è di nessuna lezione, e non si sa quando è nato. */
  bozza: 'bozza',
  bozzaDel: (data: string) => `bozza del ${data}`,
  /** «3ª lezione»: il numero dell'ora nel corso. */
  ennesimaLezione: (numero: number) => `${numero}ª lezione`,
}

export const testi = catalogo(it, {
  de: {
    unitaGrafico: (voti) => `${plurale(voti, 'Note', 'Noten')} · ein Punkt pro lernende Person`,
    mediaGrafico: (voto) => `Durchschnitt ${voto}`,
    bozza: 'Entwurf',
    bozzaDel: (data) => `Entwurf vom ${data}`,
    ennesimaLezione: (numero) => `${numero}. Stunde`,
  },
  fr: {
    unitaGrafico: (voti) =>
      `${plurale(voti, 'note', 'notes')} · un point par personne en formation`,
    mediaGrafico: (voto) => `moyenne ${voto}`,
    bozza: 'brouillon',
    bozzaDel: (data) => `brouillon du ${data}`,
    ennesimaLezione: (numero) => `${numero}${numero === 1 ? 're' : 'e'} leçon`,
  },
  en: {
    unitaGrafico: (voti) => `${plurale(voti, 'grade', 'grades')} · one dot per learner`,
    mediaGrafico: (voto) => `average ${voto}`,
    bozza: 'draft',
    bozzaDel: (data) => `draft from ${data}`,
    ennesimaLezione: (numero) => `${ordinaleInglese(numero)} lesson`,
  },
})
