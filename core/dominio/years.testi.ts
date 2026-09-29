// I testi dell'anno scolastico (`years.ts`): i motivi per cui un tipo di
// settimana non si scrive.

import { catalogo } from '../i18n/index.js'

const it = {
  letteraNonValida:
    'Il tipo di settimana è il valore di una voce della lista: da 1 a 40 caratteri, non solo spazi.',
  giornoFuoriAnno: (giorno: string) => `Il ${giorno} non è dentro l’anno scolastico.`,
}

export const testi = catalogo(it, {
  de: {
    letteraNonValida:
      'Der Wochentyp ist der Wert eines Listeneintrags: 1 bis 40 Zeichen, nicht nur Leerzeichen.',
    giornoFuoriAnno: (giorno) => `Der ${giorno} liegt nicht im Schuljahr.`,
  },
  fr: {
    letteraNonValida:
      'Le type de semaine est la valeur d’une entrée de la liste : de 1 à 40 caractères, ' +
      'pas seulement des espaces.',
    giornoFuoriAnno: (giorno) => `Le ${giorno} n’est pas dans l’année scolaire.`,
  },
  en: {
    letteraNonValida:
      'The week type is the value of a list entry: 1 to 40 characters, not only spaces.',
    giornoFuoriAnno: (giorno) => `${giorno} is not within the school year.`,
  },
})
