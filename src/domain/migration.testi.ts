// I testi di `migration.ts`: il nome della materia che raccoglie le lezioni
// rimaste senza materia.

import { catalogo } from '../i18n/index.js'

const it = {
  materiaDaAssegnare: 'Da assegnare',
}

export const testi = catalogo(it, {
  de: { materiaDaAssegnare: 'Noch zuzuordnen' },
  fr: { materiaDaAssegnare: 'À attribuer' },
  en: { materiaDaAssegnare: 'To be assigned' },
})
