// I testi di `birthdays.ts`: il compleanno di una persona, in una riga.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Quando la data di nascita non dice l'anno, o il conto non torna. */
  compieGliAnni: (nome: string) => `${nome} compie gli anni`,
  compie: (nome: string, eta: number) => `${nome} compie ${eta} anni`,
}

export const testi = catalogo(it, {
  de: {
    compieGliAnni: (nome) => `${nome} hat Geburtstag`,
    compie: (nome, eta) => `${nome} wird ${eta}`,
  },
  fr: {
    compieGliAnni: (nome) => `${nome} fête son anniversaire`,
    compie: (nome, eta) => `${nome} fête ses ${eta} ans`,
  },
  en: {
    compieGliAnni: (nome) => `${nome} has a birthday`,
    compie: (nome, eta) => `${nome} turns ${eta}`,
  },
})
