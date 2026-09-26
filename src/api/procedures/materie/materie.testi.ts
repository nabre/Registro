// I testi delle procedure di `materie`. Si leggono al momento dell'uso, mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  elimina: {
    titolo: 'Toglie una materia e i corsi che la insegnavano',
  },
  salva: {
    titolo: 'Scrive una materia, nuova o già esistente',
  },
  unisci: {
    titolo: 'Fonde due materie nate dalla stessa cosa, e con loro i corsi gemelli',
    daId: 'La materia che sparisce',
    aId: 'Quella che resta',
  },
}

export const testi = catalogo(it, {
  de: {
    elimina: {
      titolo: 'Entfernt ein Fach und die Kurse, in denen es unterrichtet wurde',
    },
    salva: {
      titolo: 'Schreibt ein Fach, neu oder bereits vorhanden',
    },
    unisci: {
      titolo:
        'Führt zwei Fächer zusammen, die dasselbe meinen, und mit ihnen die Zwillingskurse',
      daId: 'Das Fach, das verschwindet',
      aId: 'Das, das bleibt',
    },
  },
  fr: {
    elimina: {
      titolo: 'Retire une branche et les cours qui l’enseignaient',
    },
    salva: {
      titolo: 'Écrit une branche, nouvelle ou déjà existante',
    },
    unisci: {
      titolo: 'Fusionne deux branches nées de la même chose, et avec elles les cours jumeaux',
      daId: 'La branche qui disparaît',
      aId: 'Celle qui reste',
    },
  },
  en: {
    elimina: {
      titolo: 'Removes a subject and the courses that taught it',
    },
    salva: {
      titolo: 'Writes a subject, new or already existing',
    },
    unisci: {
      titolo:
        'Merges two subjects that stand for the same thing, and with them the twin courses',
      daId: 'The subject that disappears',
      aId: 'The one that stays',
    },
  },
})
