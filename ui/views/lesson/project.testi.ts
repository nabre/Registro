// I testi di `views/lesson/project.tsx`: la scheda Progetto dell'ora.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunProgetto: 'Nessun progetto in quest’ora',
  nessunProgettoTesto:
    'Qui compaiono i progetti a cui sono assegnate attività del piano di quest’ora.',
  faseDellOra: (fasi: string) => `Fase di quest’ora: ${fasi}`,
  compitiAiuto:
    'Clic sull’inizio: la persona comincia in quest’ora. Clic sulla fine: proroga. ' +
    'L’ultima colonna spunta il compito finito.',
  apriPagina: 'Apri in Integrazione progetti',
  matriceDellOra: 'Matrice di quest’ora',
  matriceAiuto:
    'Le caselle date qui sono di quest’ora: un’altra lezione ne avrà di sue, e la ' +
    'progressione le mette in fila.',
}

export const testi = catalogo(it, {
  de: {
    nessunProgetto: 'Kein Projekt in dieser Stunde',
    nessunProgettoTesto:
      'Hier erscheinen die Projekte, denen Aktivitäten des Plans dieser Stunde zugewiesen sind.',
    faseDellOra: (fasi) => `Phase dieser Stunde: ${fasi}`,
    compitiAiuto:
      'Klick auf den Beginn: Die Person beginnt in dieser Stunde. Klick auf das Ende: ' +
      'Verlängerung. Die letzte Spalte hakt die erledigte Aufgabe ab.',
    apriPagina: 'In «Projekte einbinden» öffnen',
    matriceDellOra: 'Raster dieser Stunde',
    matriceAiuto:
      'Die hier vergebenen Felder gehören zu dieser Stunde: Eine andere Stunde hat ihre ' +
      'eigenen, und der Verlauf reiht sie auf.',
  },
  fr: {
    nessunProgetto: 'Aucun projet dans cette période',
    nessunProgettoTesto:
      'Ici apparaissent les projets auxquels sont attribuées des activités du plan de cette période.',
    faseDellOra: (fasi) => `Phase de cette période : ${fasi}`,
    compitiAiuto:
      'Clic sur le début : la personne commence dans cette période. Clic sur la fin : ' +
      'prolongation. La dernière colonne coche la tâche finie.',
    apriPagina: 'Ouvrir dans « Intégration des projets »',
    matriceDellOra: 'Grille de cette période',
    matriceAiuto:
      'Les cases données ici sont de cette période : une autre période aura les siennes, ' +
      'et la progression les met en file.',
  },
  en: {
    nessunProgetto: 'No project in this lesson',
    nessunProgettoTesto:
      'Here you see the projects that activities of this lesson’s plan are assigned to.',
    faseDellOra: (fasi) => `Phase of this lesson: ${fasi}`,
    compitiAiuto:
      'Click the start: the learner starts in this lesson. Click the end: extension. ' +
      'The last column ticks the finished task.',
    apriPagina: 'Open in Project integration',
    matriceDellOra: 'Grid of this lesson',
    matriceAiuto:
      'The cells given here belong to this lesson: another lesson will have its own, and ' +
      'the progress lines them up.',
  },
})
