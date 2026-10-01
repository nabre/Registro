// I testi dei comandi del check (`check.ts`). La guida cita i nomi dei pulsanti
// fra virgolette: cambiandone uno va cambiato anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  aggiungiColonna: 'Aggiungi una colonna',
  aggiungiColonnaAiuto:
    'Una cosa da fare una volta, da spuntare persona per persona',
  colonne: 'Colonne',
  colonneAiuto:
    'Tutte le colonne insieme: rinominarle, metterle in fila, toglierle',
  senzaColonne: 'Il check di questo corso non ha ancora colonne.',
}

export const testi = catalogo(it, {
  de: {
    aggiungiColonna: 'Spalte hinzufügen',
    aggiungiColonnaAiuto:
      'Etwas, das einmal zu tun ist, Person für Person abzuhaken',
    colonne: 'Spalten',
    colonneAiuto: 'Alle Spalten zusammen: umbenennen, ordnen, entfernen',
    senzaColonne: 'Der Check dieses Kurses hat noch keine Spalten.',
  },
  fr: {
    aggiungiColonna: 'Ajouter une colonne',
    aggiungiColonnaAiuto:
      'Une chose à faire une fois, à cocher personne par personne',
    colonne: 'Colonnes',
    colonneAiuto:
      'Toutes les colonnes ensemble : les renommer, les ordonner, les retirer',
    senzaColonne: 'Le check de ce cours n’a pas encore de colonnes.',
  },
  en: {
    aggiungiColonna: 'Add a column',
    aggiungiColonnaAiuto: 'Something to do once, ticked off person by person',
    colonne: 'Columns',
    colonneAiuto:
      'All the columns together: rename them, reorder them, remove them',
    senzaColonne: 'This course’s check has no columns yet.',
  },
})
