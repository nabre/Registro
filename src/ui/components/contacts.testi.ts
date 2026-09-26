// I testi dei recapiti premibili (`contacts.ts`).

import { catalogo } from '../../i18n/index.js'

const it = {
  chiama: (numero: string) => `Chiama ${numero}`,
  scrivi: (indirizzo: string) => `Scrivi a ${indirizzo}`,
}

export const testi = catalogo(it, {
  de: {
    chiama: (numero) => `${numero} anrufen`,
    scrivi: (indirizzo) => `An ${indirizzo} schreiben`,
  },
  fr: {
    chiama: (numero) => `Appeler le ${numero}`,
    scrivi: (indirizzo) => `Écrire à ${indirizzo}`,
  },
  en: {
    chiama: (numero) => `Call ${numero}`,
    scrivi: (indirizzo) => `Write to ${indirizzo}`,
  },
})
