// I testi di `check.ts`: quel che si dice quando una casella del check non si
// può spuntare.

import { catalogo } from '../i18n/index.js'

const it = {
  senzaLista: 'Il corso non ha una lista di controllo.',
  colonnaNonTrovata: 'Colonna del check non trovata.',
  lezioneDiAltroCorso: 'Quella lezione non è del corso del check.',
}

export const testi = catalogo(it, {
  de: {
    senzaLista: 'Der Kurs hat keine Checkliste.',
    colonnaNonTrovata: 'Check-Spalte nicht gefunden.',
    lezioneDiAltroCorso: 'Diese Stunde gehört nicht zum Kurs des Checks.',
  },
  fr: {
    senzaLista: 'Le cours n’a pas de liste de contrôle.',
    colonnaNonTrovata: 'Colonne du check introuvable.',
    lezioneDiAltroCorso: 'Cette leçon n’appartient pas au cours du check.',
  },
  en: {
    senzaLista: 'The course has no checklist.',
    colonnaNonTrovata: 'Check column not found.',
    lezioneDiAltroCorso: 'That lesson doesn’t belong to the check’s course.',
  },
})
