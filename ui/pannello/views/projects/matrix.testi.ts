// I testi di `views/projects/matrix.ts`: la matrice a livelli e la progressione.

import { catalogo } from '#core/i18n/index.js'

const it = {
  senzaLivello: 'Nessun livello',
  modificaNota: 'Modifica la nota…',
  annota: 'Annota…',
  svuota: 'Svuota la casella',
  premiPer: (livello: string) => `Clic: ${livello}`,
  nessunCriterio: 'Nessun criterio: aggiungili con «Criteri» per avere le colonne della matrice.',
  classeVuota: 'La classe del corso è vuota.',
  matriceDel: (data: string) => `Matrice del ${data}`,
  nienteAncora: (chi: string) => `Per ${chi} non c’è ancora nessuna casella.`,
  progressioneDi: (chi: string) => `Progressione di ${chi}`,
}

export const testi = catalogo(it, {
  de: {
    senzaLivello: 'Keine Stufe',
    modificaNota: 'Notiz bearbeiten…',
    annota: 'Notieren…',
    svuota: 'Feld leeren',
    premiPer: (livello) => `Klick: ${livello}`,
    nessunCriterio: 'Kein Kriterium: Füge sie mit «Kriterien» hinzu, um die Spalten des Rasters zu haben.',
    classeVuota: 'Die Klasse des Kurses ist leer.',
    matriceDel: (data) => `Raster vom ${data}`,
    nienteAncora: (chi) => `Für ${chi} gibt es noch kein Feld.`,
    progressioneDi: (chi) => `Verlauf von ${chi}`,
  },
  fr: {
    senzaLivello: 'Aucun niveau',
    modificaNota: 'Modifier la note…',
    annota: 'Annoter…',
    svuota: 'Vider la case',
    premiPer: (livello) => `Clic : ${livello}`,
    nessunCriterio: 'Aucun critère : ajoute-les avec « Critères » pour avoir les colonnes de la grille.',
    classeVuota: 'La classe du cours est vide.',
    matriceDel: (data) => `Grille du ${data}`,
    nienteAncora: (chi) => `Pour ${chi}, il n’y a encore aucune case.`,
    progressioneDi: (chi) => `Progression de ${chi}`,
  },
  en: {
    senzaLivello: 'No level',
    modificaNota: 'Edit the note…',
    annota: 'Add a note…',
    svuota: 'Clear the cell',
    premiPer: (livello) => `Click: ${livello}`,
    nessunCriterio: 'No criteria: add them with “Criteria” to get the columns of the grid.',
    classeVuota: 'The course’s class is empty.',
    matriceDel: (data) => `Grid of ${data}`,
    nienteAncora: (chi) => `There are no cells for ${chi} yet.`,
    progressioneDi: (chi) => `Progress of ${chi}`,
  },
})
