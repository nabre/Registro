// I testi di `reminders.ts`: la notifica dell'ora che sta per cominciare.

import { catalogo } from '../i18n/index.js'
import { CARTE, quanti } from './lexicon.js'
import { lessico } from './lexicon.testi.js'

const it = {
  adesso: 'adesso',
  fraUnMinuto: 'fra 1 minuto',
  fraMinuti: (minuti: number) => `fra ${minuti} minuti`,
  inRitardo: (n: number) => `${n} in ritardo`,
  inScadenza: (n: number) => `${n} in scadenza`,
  daFare: (n: number) => `${n} da fare`,
  /** «3 pendenze (1 in ritardo, 2 da fare)». */
  pendenze: (n: number, pezzi: readonly string[]) =>
    `${quanti(n, CARTE.pendenza)} (${pezzi.join(', ')})`,
  nienteInSospeso: 'Niente in sospeso per questo corso.',
}

export const testi = catalogo(it, {
  de: {
    adesso: 'jetzt',
    fraUnMinuto: 'in 1 Minute',
    fraMinuti: (minuti) => `in ${minuti} Minuten`,
    inRitardo: (n) => `${n} überfällig`,
    inScadenza: (n) => `${n} fällig`,
    daFare: (n) => `${n} offen`,
    pendenze: (n, pezzi) => `${quanti(n, lessico.in('de').pendenza)} (${pezzi.join(', ')})`,
    nienteInSospeso: 'Keine Pendenzen für diesen Kurs.',
  },
  fr: {
    adesso: 'maintenant',
    fraUnMinuto: 'dans 1 minute',
    fraMinuti: (minuti) => `dans ${minuti} minutes`,
    inRitardo: (n) => `${n} en retard`,
    inScadenza: (n) => `${n} à rendre`,
    daFare: (n) => `${n} à faire`,
    pendenze: (n, pezzi) => `${quanti(n, lessico.in('fr').pendenza)} (${pezzi.join(', ')})`,
    nienteInSospeso: 'Rien en suspens pour ce cours.',
  },
  en: {
    adesso: 'now',
    fraUnMinuto: 'in 1 minute',
    fraMinuti: (minuti) => `in ${minuti} minutes`,
    inRitardo: (n) => `${n} overdue`,
    inScadenza: (n) => `${n} due`,
    daFare: (n) => `${n} to do`,
    pendenze: (n, pezzi) => `${quanti(n, lessico.in('en').pendenza)} (${pezzi.join(', ')})`,
    nienteInSospeso: 'Nothing pending for this course.',
  },
})
