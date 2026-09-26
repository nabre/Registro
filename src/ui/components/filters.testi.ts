// I testi dei pezzi ripetuti in più viste (`filters.ts`): lo stato vuoto di un
// registro senza anno, e come si parte.

import { catalogo } from '../../i18n/index.js'

const it = {
  comeSiParte:
    'Prima l’anno: lo si sceglie dal calendario ufficiale, con vacanze e festivi già dentro. ' +
    'Poi classi e corsi, portati da un altro registro o creati uno per uno.',
  nessunAnno: 'Nessun anno scolastico',
  creaAnno: 'Crea l’anno scolastico',
}

export const testi = catalogo(it, {
  de: {
    comeSiParte:
      'Zuerst das Schuljahr: Man wählt es aus dem offiziellen Kalender, mit Ferien und ' +
      'Feiertagen schon darin. Dann Klassen und Kurse, aus einem anderen Klassenbuch geholt ' +
      'oder einzeln erstellt.',
    nessunAnno: 'Kein Schuljahr',
    creaAnno: 'Schuljahr erstellen',
  },
  fr: {
    comeSiParte:
      'D’abord l’année : on la choisit dans le calendrier officiel, avec vacances et jours ' +
      'fériés déjà dedans. Puis classes et cours, repris d’un autre registre ou créés un par un.',
    nessunAnno: 'Aucune année scolaire',
    creaAnno: 'Créer l’année scolaire',
  },
  en: {
    comeSiParte:
      'First the year: you choose it from the official calendar, with holidays and public ' +
      'holidays already in it. Then classes and courses, brought over from another register ' +
      'or created one by one.',
    nessunAnno: 'No school year',
    creaAnno: 'Create the school year',
  },
})
