// I testi della barra laterale (`sidebar.ts`): il marchio in cima e
// l'interruttore che la riduce alle icone, e la scorciatoia di ogni voce.

import { catalogo } from '#core/i18n/index.js'

const it = {
  navigazione: 'Navigazione',
  riduci: 'Riduci la navigazione alle icone',
  espandi: 'Espandi la navigazione: le pagine con il loro nome',
  registro: 'Registro',
  spazioDocente: 'Spazio docente',
  principale: 'Navigazione principale',
  cambiaCorso: 'Cambia corso',
  cambiaClasse: 'Cambia classe',
  // «Ctrl» come nella barra dei comandi («Ctrl+E» in ogni lingua): un nome solo
  // per lo stesso tasto.
  scorciatoia: (numero: number) => `Ctrl+${numero}`,
}

export const testi = catalogo(it, {
  de: {
    navigazione: 'Navigation',
    riduci: 'Navigation auf die Symbole verkleinern',
    espandi: 'Navigation erweitern: die Seiten mit ihrem Namen',
    registro: 'Klassenbuch',
    spazioDocente: 'Bereich der Lehrperson',
    principale: 'Hauptnavigation',
    cambiaCorso: 'Kurs wechseln',
    cambiaClasse: 'Klasse wechseln',
    scorciatoia: (numero) => `Ctrl+${numero}`,
  },
  fr: {
    navigazione: 'Navigation',
    riduci: 'Réduire la navigation aux icônes',
    espandi: 'Déplier la navigation : les pages avec leur nom',
    registro: 'Registre',
    spazioDocente: 'Espace enseignant',
    principale: 'Navigation principale',
    cambiaCorso: 'Changer de cours',
    cambiaClasse: 'Changer de classe',
    scorciatoia: (numero) => `Ctrl+${numero}`,
  },
  en: {
    navigazione: 'Navigation',
    riduci: 'Shrink the navigation to icons',
    espandi: 'Expand the navigation: the pages with their names',
    registro: 'Register',
    spazioDocente: 'Teacher’s space',
    principale: 'Main navigation',
    cambiaCorso: 'Change course',
    cambiaClasse: 'Change class',
    scorciatoia: (numero) => `Ctrl+${numero}`,
  },
})
