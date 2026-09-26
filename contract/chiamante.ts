// Il chiamante tipizzato: avvolge l'albero delle procedure e un link.
//
// Permette di chiamare le procedure con sintassi ad albero:
// `reg.ore.appello.casella({ ... })` invece di passare per stringa.
// Le chiamate vengono inoltrate a `link.chiama(nome, ingresso, opzioni)`.

import type { Origine, Risultato } from './contract.js'
import type { Link } from './link.js'
import type { AlberoProcedure } from './router.ts'

export type OpzioniChiamata = {
  origine?: Origine
  tracciato?: string
}

export type FunzioneChiamabile<I = unknown, U = unknown> = (
  ingresso?: I,
  opzioni?: OpzioniChiamata,
) => Promise<Risultato<U>>

export type ChiamanteNodo = FunzioneChiamabile & {
  [chiave: string]: ChiamanteNodo
}


/**
 * Crea un Proxy chiamante per l'albero delle procedure e un Link.
 */
export function chiamante<T = ChiamanteNodo> (
  _albero: AlberoProcedure,
  link: Link,
): T {
  function creaProxy (percorso: string[]): unknown {
    const fn: FunzioneChiamabile = (ingresso?: unknown, opzioni?: OpzioniChiamata) => {
      const nome = percorso.join('.')
      return link.chiama(nome, ingresso, opzioni)
    }

    return new Proxy(fn, {
      get (_target, prop: string | symbol) {
        if (typeof prop === 'symbol') return undefined
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined
        if (prop === '_link') return link
        return creaProxy([...percorso, prop])
      },
    })
  }

  return creaProxy([]) as T
}
