// Router del contratto: mappa l'elenco piatto delle procedure in una struttura ad albero.
//
// Verifica all'avvio che il nome della procedura coincida con la posizione
// nell'albero (es. `ore.appello.casella` sta in `albero.ore.appello.casella`).
// `foglie()` ripercorre l'albero per restituire l'elenco delle procedure.

import type { ProceduraQualunque } from './contract.js'
import { procedure as tutteLeProcedure } from './core.js'

export type AlberoProcedure = {
  [chiave: string]: AlberoProcedure | ProceduraQualunque
}

/**
 * Costruisce l'albero delle procedure a partire da un elenco piatto.
 *
 * Verifica che ogni procedura rispetti la coincidenza tra il suo `nome`
 * e la posizione gerarchica nell'albero (es. `area.sub.nome`).
 */
export function alberoProcedure (
  procedure: ReadonlyArray<ProceduraQualunque> = tutteLeProcedure(),
): AlberoProcedure {
  const radice: AlberoProcedure = {}

  for (const p of procedure) {
    const parti = p.nome.split('.')
    if (parti.length === 0 || parti.some((parte) => !parte)) {
      // testo-fisso: errore interno di sviluppo
      throw new Error(`Nome procedura non valido: «${p.nome}».`)
    }

    let corrente = radice
    for (let i = 0; i < parti.length - 1; i++) {
      const parte = parti[i]
      const esistente = corrente[parte]
      if (esistente === undefined) {
        const nuovo: AlberoProcedure = {}
        corrente[parte] = nuovo
        corrente = nuovo
      } else if (isProcedura(esistente)) {
        throw new Error(
          // testo-fisso: errore interno di sviluppo
          `Conflitto nel router: «${parti.slice(0, i + 1).join('.')}» è sia un nodo sia una procedura.`,
        )
      } else {
        corrente = esistente
      }
    }

    const foglia = parti[parti.length - 1]
    if (corrente[foglia] !== undefined) {
      // testo-fisso: errore interno di sviluppo
      throw new Error(`Procedura duplicata nel router: «${p.nome}».`)
    }
    corrente[foglia] = p
  }

  // Verifica ricorsiva che percorso e `nome` coincidano per ogni foglia
  verificaPercorsi(radice, [])

  return radice
}

/** Type guard per distinguere una foglia `ProceduraQualunque` da un sottoalbero. */
function isProcedura (nodo: unknown): nodo is ProceduraQualunque {
  return (
    typeof nodo === 'object' &&
    nodo !== null &&
    'nome' in nodo &&
    typeof nodo.nome === 'string' &&
    'esegui' in nodo
  )
}

function verificaPercorsi (nodo: AlberoProcedure, percorsoCorrente: string[]): void {
  for (const [chiave, valore] of Object.entries(nodo)) {
    const nuovoPercorso = [...percorsoCorrente, chiave]
    if (isProcedura(valore)) {
      const percorsoCalcolato = nuovoPercorso.join('.')
      if (valore.nome !== percorsoCalcolato) {
        throw new Error(
          // testo-fisso: errore interno di sviluppo
          `Il percorso del router «${percorsoCalcolato}» non coincide con il nome «${valore.nome}».`,
        )
      }
    } else {
      verificaPercorsi(valore, nuovoPercorso)
    }
  }
}

/**
 * Ripercorre l'albero delle procedure restituendo le coppie [nome, procedura].
 */
export function foglie (
  albero: AlberoProcedure,
  percorsoPadre: string[] = [],
): Array<[string, ProceduraQualunque]> {
  const risultato: Array<[string, ProceduraQualunque]> = []

  for (const [chiave, valore] of Object.entries(albero)) {
    const percorso = [...percorsoPadre, chiave]
    if (isProcedura(valore)) {
      const nomeDallAlbero = percorso.join('.')
      if (valore.nome !== nomeDallAlbero) {
        throw new Error(
          // testo-fisso: errore interno di sviluppo
          `Il percorso del router «${nomeDallAlbero}» non coincide con il nome «${valore.nome}».`,
        )
      }
      risultato.push([nomeDallAlbero, valore])
    } else {
      risultato.push(...foglie(valore, percorso))
    }
  }

  return risultato
}
