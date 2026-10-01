// Il link: l'interfaccia astratta di trasporto per chiamare le procedure.
//
// Tre implementazioni previste dall'impianto:
// - `diretto`: menu nativo, vassoio, promemoria (attorno a `chiama()`)
// - `ipc`: pannello e proiezione
// - `socket`: riga di comando e script (`conduit.ts`)

import type { Archivio } from '#core/dati/archive.js'
import type { Origine, Risultato } from './contract.js'
import { VERSIONE_API } from './contract.js'
import { chiama, descrivi, procedura, procedure } from './core.js'

export interface Link {
  nome: 'diretto' | 'ipc' | 'socket'
  versione: number
  chiama <U = unknown>(
    nome: string,
    ingresso: unknown,
    opzioni?: { origine?: Origine; tracciato?: string }
  ): Promise<Risultato<U>>
  elenco (): Array<Record<string, unknown>>
  schema (nome: string): Record<string, unknown> | undefined
  chiudi? (): Promise<void>
}

interface OpzioniLinkDiretto {
  originePredefinita?: Origine
}

/**
 * Crea il link `diretto` attorno a una risposta in memoria / `chiama()`.
 *
 * Utilizzato da menu nativo, vassoio e promemoria/agenda.
 */
export function linkDiretto (archivio: Archivio, opzioni?: OpzioniLinkDiretto): Link {
  const originePredefinita = opzioni?.originePredefinita ?? 'programma'

  return {
    nome: 'diretto',
    versione: VERSIONE_API,

    async chiama <U = unknown>(
      nome: string,
      ingresso: unknown,
      opz?: { origine?: Origine; tracciato?: string },
    ): Promise<Risultato<U>> {
      return chiama<U>(archivio, nome, ingresso, {
        origine: opz?.origine ?? originePredefinita,
        tracciato: opz?.tracciato,
      })
    },

    elenco (): Array<Record<string, unknown>> {
      return procedure().map(descrivi)
    },

    schema (nome: string): Record<string, unknown> | undefined {
      const p = procedura(nome)
      return p ? descrivi(p) : undefined
    },
  }
}
