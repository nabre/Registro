// I testi dell'anno scolastico (`years.ts`): il nome predefinito di un semestre.
// Finisce nel documento quando l'anno nasce e da lì non cambia.

import { catalogo } from '../i18n/index.js'

const it = {
  /** «1° semestre», «2° semestre». */
  semestre: (numero: number) => `${numero}° semestre`,
}

export const testi = catalogo(it, {
  de: {
    semestre: (numero) => `${numero}. Semester`,
  },
  fr: {
    semestre: (numero) => `${numero}${numero === 1 ? 'er' : 'e'} semestre`,
  },
  en: {
    semestre: (numero) => `Semester ${numero}`,
  },
})
