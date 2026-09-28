// Le letture asincrone che una vista mostra (un file, una risposta dell'host):
// una per chiave, partita una volta sola e mai dentro il disegno. Il disegno
// legge quel che c'è — vuoto, in volo, pronto, errore — e se non c'è niente
// la lettura parte subito dopo, in un microtask: `h()` non fa mai partire
// niente, e cento ridisegni della stessa pagina chiedono una volta sola. A
// lettura finita si ridisegna (`ridisegna` di `state.ts`).
//
// Per chi deve far partire una lettura all'ingresso in una pagina, prima del
// disegno, c'è `avvia`, da un iscritto allo stato (`iscriviti`).

import { ridisegna } from './state.js'

export type Voce<T> =
  | { stato: 'vuoto' }
  | { stato: 'inVolo' }
  | { stato: 'pronto', valore: T }
  | { stato: 'errore', errore: string }

export interface Risorse<T> {
  /**
   * Quel che c'è per la chiave. Se non c'è niente torna `vuoto` e la lettura
   * parte fuori dal disegno; la vista mostra il suo «sto leggendo».
   */
  leggi: (chiave: string, carica: () => Promise<T>) => Voce<T>
  /** Fa partire la lettura, se per la chiave non è già partita. */
  avvia: (chiave: string, carica: () => Promise<T>) => void
  /** Dimentica una chiave (o tutte): la prossima lettura riparte. */
  dimentica: (chiave?: string) => void
}

/**
 * Un deposito di letture per chiave. `quante` sono le chiavi tenute: oltre, la
 * più vecchia si dimentica (un CSV di ieri non serve più).
 */
export function risorse<T> (quante = 8): Risorse<T> {
  const voci = new Map<string, Voce<T>>()

  function avvia (chiave: string, carica: () => Promise<T>): void {
    if (voci.has(chiave)) return
    const inVolo: Voce<T> = { stato: 'inVolo' }
    voci.set(chiave, inVolo)
    while (voci.size > quante) {
      const vecchia = voci.keys().next().value
      if (vecchia === undefined) break
      voci.delete(vecchia)
    }
    void (async () => {
      let esito: Voce<T>
      try {
        esito = { stato: 'pronto', valore: await carica() }
      } catch (errore) {
        esito = { stato: 'errore', errore: errore instanceof Error ? errore.message : String(errore) }
      }
      // Dimenticata mentre era in volo: la risposta è di una lettura che nessuno aspetta più.
      if (voci.get(chiave) !== inVolo) return
      voci.set(chiave, esito)
      ridisegna()
    })()
  }

  return {
    leggi (chiave, carica) {
      const voce = voci.get(chiave)
      if (voce) return voce
      queueMicrotask(() => avvia(chiave, carica))
      return { stato: 'vuoto' }
    },
    avvia,
    dimentica (chiave) {
      if (chiave === undefined) voci.clear()
      else voci.delete(chiave)
    },
  }
}
