// I testi dell'anno scolastico (`years.ts`): il nome predefinito di un semestre,
// che finisce nel documento quando l'anno nasce e da lì non cambia, e i motivi
// per cui un tipo di settimana non si scrive.

import { catalogo } from '../i18n/index.js'

const it = {
  /** «1° semestre», «2° semestre». */
  semestre: (numero: number) => `${numero}° semestre`,
  letteraNonValida:
    'Il tipo di settimana è il valore di una voce della lista: da 1 a 40 caratteri, non solo spazi.',
  giornoFuoriAnno: (giorno: string) => `Il ${giorno} non è dentro l’anno scolastico.`,
}

export const testi = catalogo(it, {
  de: {
    semestre: (numero) => `${numero}. Semester`,
    letteraNonValida:
      'Der Wochentyp ist der Wert eines Listeneintrags: 1 bis 40 Zeichen, nicht nur Leerzeichen.',
    giornoFuoriAnno: (giorno) => `Der ${giorno} liegt nicht im Schuljahr.`,
  },
  fr: {
    semestre: (numero) => `${numero}${numero === 1 ? 'er' : 'e'} semestre`,
    letteraNonValida:
      'Le type de semaine est la valeur d’une entrée de la liste : de 1 à 40 caractères, ' +
      'pas seulement des espaces.',
    giornoFuoriAnno: (giorno) => `Le ${giorno} n’est pas dans l’année scolaire.`,
  },
  en: {
    semestre: (numero) => `Semester ${numero}`,
    letteraNonValida:
      'The week type is the value of a list entry: 1 to 40 characters, not only spaces.',
    giornoFuoriAnno: (giorno) => `${giorno} is not within the school year.`,
  },
})
