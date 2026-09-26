// Le ricette dei fascicoli, lette da `composizioni/` dell'anno (una per file).
// Il pannello le passa al webview con lo stato: la pagina Documenti non legge il
// documento da sé. Un file illeggibile o che non è una ricetta salta in silenzio.

import { COMPOSIZIONI, leggiComposizione, type Composizione } from '../domain/compositions.js'
import { deposito } from './store.js'

/** Una ricetta e il file da cui è venuta. */
export interface Ricetta {
  /** Il file dentro l'anno: è quello che si toglie per buttarla via. */
  percorso: string
  composizione: Composizione
}

/**
 * Le ricette con il loro file, dalla più recente. Il percorso è quello vero, non
 * ricomposto dall'id: un file rinominato a mano va tolto lo stesso.
 */
export function ricettePresenti (): Ricetta[] {
  const dove = deposito()
  if (!dove) return []

  const trovate: Ricetta[] = []
  for (const percorso of dove.elenca(COMPOSIZIONI)) {
    if (!percorso.endsWith('.json')) continue
    const testo = dove.leggiTesto(percorso)
    if (!testo) continue
    try {
      const ricetta = leggiComposizione(JSON.parse(testo))
      if (ricetta) trovate.push({ percorso, composizione: ricetta })
    } catch {
      // JSON rotto: si salta, le altre restano.
    }
  }
  return trovate.sort((a, b) =>
    b.composizione.aggiornataIl.localeCompare(a.composizione.aggiornataIl),
  )
}

/** Tutti i fascicoli dell'anno aperto, dal più recente. */
export function composizioniPresenti (): Composizione[] {
  return ricettePresenti().map((r) => r.composizione)
}
