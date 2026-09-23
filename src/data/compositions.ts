// Le ricette dei fascicoli, lette dall'anno.
//
// Stanno in `composizioni/` dentro il documento, una per file, e si leggono
// tutte insieme: sono poche righe di JSON ciascuna, e il pannello le rispinge
// al webview con il resto dello stato — la pagina Documenti non può guardare
// dentro il documento da sé.
//
// Un file che non si legge, o che non è una ricetta, salta senza dire niente:
// può averlo scritto una versione di prima, o averlo toccato qualcuno a mano, e
// una ricetta rotta non è un motivo per non mostrare le altre.

import { COMPOSIZIONI, leggiComposizione, type Composizione } from '../domain/compositions.js'
import { deposito } from './store.js'

/** Una ricetta e il file da cui è venuta. */
export interface Ricetta {
  /** Dov'è davvero, dentro l'anno: è il file che si toglie per buttarla via. */
  percorso: string
  composizione: Composizione
}

/**
 * Le ricette con il loro file, dalla più recente.
 *
 * Il percorso torna insieme alla ricetta perché è quello che conta quando si
 * butta via un fascicolo: ricomporlo dall'id vorrebbe dire dare per scontato
 * che il file si chiami come `ricettaDi` lo chiamerebbe adesso — e un file
 * scritto da una versione di prima, o rinominato a mano, resterebbe lì a far
 * ricomparire in elenco un fascicolo che si è appena buttato via.
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
      // Un JSON tagliato a metà: non è una ricetta, e le altre non ne hanno
      // colpa.
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
