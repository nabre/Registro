// Le letture asincrone che una vista mostra (un file, una risposta dell'host):
// una per chiave, partita una volta sola e mai dentro il disegno. Il disegno
// legge quel che c'è — vuoto, in volo, pronto, errore — e se non c'è niente
// la lettura parte subito dopo, in un microtask: il disegno non fa mai
// partire niente, e cento ridisegni della stessa pagina chiedono una volta
// sola. A lettura finita si ridisegna (`ridisegna` di `state.ts`), o solo le isole
// che la mostrano (`islands.ts`), se chi legge le ha dichiarate.
//
// Per chi deve far partire una lettura all'ingresso in una pagina, prima del
// disegno, c'è `avvia`, da un iscritto allo stato (`iscriviti`).

import { isolaPresente, ridisegnaIsola } from './islands.js'
import { ridisegna } from './state.js'

type Voce<T> =
  | { stato: 'vuoto' }
  | { stato: 'inVolo' }
  | { stato: 'pronto', valore: T }
  | { stato: 'errore', errore: string }

interface OpzioniLettura {
  /**
   * L'isola che mostra la lettura: a lettura finita si rifà lei sola invece
   * della pagina. Se un lettore non la dichiara, o nessuna delle isole è più nel
   * documento, si ridisegna tutto come prima.
   */
  isola?: string
}

export interface Risorse<T> {
  /**
   * Quel che c'è per la chiave. Se non c'è niente torna `vuoto` e la lettura
   * parte fuori dal disegno; la vista mostra il suo «sto leggendo».
   */
  leggi: (chiave: string, carica: () => Promise<T>, opzioni?: OpzioniLettura) => Voce<T>
  /** Fa partire la lettura, se per la chiave non è già partita. */
  avvia: (chiave: string, carica: () => Promise<T>, opzioni?: OpzioniLettura) => void
  /** Dimentica una chiave (o tutte): la prossima lettura riparte. */
  dimentica: (chiave?: string) => void
}

/**
 * Un deposito di letture per chiave. `quante` sono le chiavi tenute: oltre, la
 * più vecchia si dimentica (un CSV di ieri non serve più).
 */
export function risorse<T> (quante = 8): Risorse<T> {
  const voci = new Map<string, Voce<T>>()
  /** Chi aspetta ogni lettura in volo: il nome dell'isola, o `null` per la pagina intera. */
  const lettori = new Map<string, Set<string | null>>()

  function annota (chiave: string, opzioni?: OpzioniLettura): void {
    const chi = lettori.get(chiave) ?? new Set<string | null>()
    chi.add(opzioni?.isola ?? null)
    lettori.set(chiave, chi)
  }

  /**
   * A lettura finita: solo le isole che la mostrano e sono ancora nel documento;
   * la pagina intera se un lettore non ha dichiarato isole o non ne resta nessuna.
   */
  function mostra (chiave: string): void {
    const chi = lettori.get(chiave) ?? new Set<string | null>([null])
    lettori.delete(chiave)
    const isole = Array.from(chi)
      .filter((nome): nome is string => nome !== null && isolaPresente(nome))
    if (chi.has(null) || isole.length === 0) {
      ridisegna()
      return
    }
    for (const nome of isole) ridisegnaIsola(nome)
  }

  function avvia (chiave: string, carica: () => Promise<T>, opzioni?: OpzioniLettura): void {
    if (voci.get(chiave)?.stato === 'inVolo') annota(chiave, opzioni)
    if (voci.has(chiave)) return
    annota(chiave, opzioni)
    const inVolo: Voce<T> = { stato: 'inVolo' }
    voci.set(chiave, inVolo)
    while (voci.size > quante) {
      const vecchia = voci.keys().next().value
      if (vecchia === undefined) break
      voci.delete(vecchia)
      lettori.delete(vecchia)
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
      mostra(chiave)
    })()
  }

  return {
    leggi (chiave, carica, opzioni) {
      const voce = voci.get(chiave)
      if (voce?.stato === 'inVolo') annota(chiave, opzioni)
      if (voce) return voce
      queueMicrotask(() => avvia(chiave, carica, opzioni))
      return { stato: 'vuoto' }
    },
    avvia,
    dimentica (chiave) {
      if (chiave === undefined) {
        voci.clear()
        lettori.clear()
      } else {
        voci.delete(chiave)
        lettori.delete(chiave)
      }
    },
  }
}
