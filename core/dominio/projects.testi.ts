// I testi di `projects.ts`: i livelli e la fase con cui nasce un progetto. Si
// leggono quando il progetto nasce e da lì restano scritti nel documento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  /** La scala di serie, dal basso: il testo del livello, per valore. */
  livelli: {
    'non-raggiunto': 'Non raggiunto',
    parziale: 'Parzialmente raggiunto',
    raggiunto: 'Raggiunto',
    pienamente: 'Pienamente raggiunto',
  },
  /** Il titolo di serie di una fase, dalla sua posizione. */
  fase: (numero: number) => `Fase ${numero}`,
}

export const testi = catalogo(it, {
  de: {
    livelli: {
      'non-raggiunto': 'Nicht erreicht',
      parziale: 'Teilweise erreicht',
      raggiunto: 'Erreicht',
      pienamente: 'Vollständig erreicht',
    },
    fase: (numero) => `Phase ${numero}`,
  },
  fr: {
    livelli: {
      'non-raggiunto': 'Non atteint',
      parziale: 'Partiellement atteint',
      raggiunto: 'Atteint',
      pienamente: 'Pleinement atteint',
    },
    fase: (numero) => `Phase ${numero}`,
  },
  en: {
    livelli: {
      'non-raggiunto': 'Not achieved',
      parziale: 'Partly achieved',
      raggiunto: 'Achieved',
      pienamente: 'Fully achieved',
    },
    fase: (numero) => `Phase ${numero}`,
  },
})
