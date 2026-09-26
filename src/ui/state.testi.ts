// I testi dello stato dell'interfaccia (`state.ts`): i nomi di ripiego quando
// un corso o una classe mancano. Il nome di un'ora per numero — «3ª lezione» —
// è quello del dominio (`ennesimaLezione` in `domain/calculations.testi.ts`).

import { catalogo } from '../i18n/index.js'

const it = {
  senzaCorso: 'senza corso',
  senzaClasse: 'senza classe',
}

export const testi = catalogo(it, {
  de: {
    senzaCorso: 'ohne Kurs',
    senzaClasse: 'ohne Klasse',
  },
  fr: {
    senzaCorso: 'sans cours',
    senzaClasse: 'sans classe',
  },
  en: {
    senzaCorso: 'no course',
    senzaClasse: 'no class',
  },
})
