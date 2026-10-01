// I testi di `views/projects/judgements.ts`: i giudizi di un progetto.

import { catalogo } from '#core/i18n/index.js'

const it = {
  segnaposto: 'Un giudizio al volo: Invio lo aggiunge',
  nuovo: 'Nuovo giudizio',
  tuttaLaClasse: 'Tutta la classe',
  nonInElenco: 'Persona non più in elenco',
  nessuno: 'Nessun giudizio, per ora.',
  nessunoInLezione: 'Nessun giudizio in questa lezione.',
  altrove: (n: number) => n === 1
    ? 'Un altro giudizio sta in altri giorni: lo trovi nella pagina Progetti.'
    : `Altri ${n} giudizi stanno in altri giorni: li trovi nella pagina Progetti.`,
}

export const testi = catalogo(it, {
  de: {
    segnaposto: 'Eine schnelle Einschätzung: Enter fügt sie hinzu',
    nuovo: 'Neue Einschätzung',
    tuttaLaClasse: 'Ganze Klasse',
    nonInElenco: 'Person nicht mehr in der Liste',
    nessuno: 'Noch keine Einschätzung.',
    nessunoInLezione: 'Keine Einschätzung in dieser Stunde.',
    altrove: (n) => n === 1
      ? 'Eine weitere Einschätzung liegt an anderen Tagen: Du findest sie auf der Seite Projekte.'
      : `Weitere ${n} Einschätzungen liegen an anderen Tagen: Du findest sie auf der Seite Projekte.`,
  },
  fr: {
    segnaposto: 'Une appréciation rapide : Entrée l’ajoute',
    nuovo: 'Nouvelle appréciation',
    tuttaLaClasse: 'Toute la classe',
    nonInElenco: 'Personne plus dans la liste',
    nessuno: 'Aucune appréciation pour l’instant.',
    nessunoInLezione: 'Aucune appréciation dans cette période.',
    altrove: (n) => n === 1
      ? 'Une autre appréciation se trouve à d’autres jours : tu la trouves dans la page Projets.'
      : `${n} autres appréciations se trouvent à d’autres jours : tu les trouves dans la page Projets.`,
  },
  en: {
    segnaposto: 'A quick comment: Enter adds it',
    nuovo: 'New comment',
    tuttaLaClasse: 'Whole class',
    nonInElenco: 'Person no longer on the list',
    nessuno: 'No comments yet.',
    nessunoInLezione: 'No comments in this lesson.',
    altrove: (n) => n === 1
      ? 'One more comment is on other days: you find it on the Projects page.'
      : `${n} more comments are on other days: you find them on the Projects page.`,
  },
})
