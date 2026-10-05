// I comandi della mappa.

import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { conferma } from '#ui/components/modal.js'
import { azione } from '#ui/bridge.js'
// La mappa tiene la sua inquadratura in una variabile di modulo (vedi `views/map.tsx`).
import { indirizziInAttesa, indirizziScritti, inquadraTutto } from '#ui/views/map.js'
import { testi } from './map.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

export const COMANDI_MAPPA: readonly ComandoUI[] = [
  // ---------------------------------------------------------------- Mappa
  {
    id: 'mappa.geocodifica',
    titolo: t.trovaIndirizzi,
    simbolo: 'segnaposto',
    dove: ['mappa'],
    gruppo: G.indirizzi,
    aiuto: t.trovaIndirizziAiuto,
    primario: () => indirizziInAttesa() > 0,
    // Senza indirizzi scritti «tutti trovati» sarebbe falso: dice dove si scrivono.
    impedimento: () =>
      indirizziInAttesa() > 0 ? null : indirizziScritti() === 0 ? t.nessunoScritto : t.tuttiTrovati,
    // Tutte le classi dell'anno: la mappa non ha un filtro per classe.
    al: () => azione({ tipo: 'mappa.geocodifica' }),
  },
  {
    id: 'mappa.rifai',
    titolo: t.rifaiIndirizzi,
    simbolo: 'ricarica',
    dove: ['mappa'],
    gruppo: G.indirizzi,
    aiuto: t.rifaiIndirizziAiuto,
    al: async () => {
      const sicuro = await conferma({
        titolo: t.rifareTitolo,
        testo: t.rifareTesto,
        testoConferma: t.rifai,
      })
      if (!sicuro) return
      await azione({ tipo: 'mappa.geocodifica', rifaiTutto: true })
    },
  },
  {
    id: 'mappa.inquadra',
    titolo: t.inquadra,
    simbolo: 'mappa',
    dove: ['mappa'],
    gruppo: G.comeSiGuarda,
    aiuto: t.inquadraAiuto,
    al: () => inquadraTutto(),
  },
]
