// Il preambolo delle prove per proprietà (`tests/proprieta/`, ADR-50): quante
// esecuzioni, e come si ripete un fallimento.
//
// Le esecuzioni sono poche perché `npm test` resti svelto; per un giro lungo
//   PROPRIETA_ESECUZIONI=5000 npm test
// Un fallimento stampa seme e percorso: si ripete con
//   PROPRIETA_SEME=<seme> PROPRIETA_PERCORSO=<percorso> npm test

import fc from 'fast-check'
import { readdirSync, readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'

import { leggiZip } from '../../dist-tests/zip.mjs'

const ESECUZIONI = Number(process.env.PROPRIETA_ESECUZIONI) || 0

/** Le opzioni di `fc.assert`: `numRuns` si alza dall'ambiente, seme e percorso si riprendono. */
export function opzioni (esecuzioni = 150) {
  const scelte = { numRuns: ESECUZIONI || esecuzioni }
  if (process.env.PROPRIETA_SEME) scelte.seed = Number(process.env.PROPRIETA_SEME)
  if (process.env.PROPRIETA_PERCORSO) scelte.path = process.env.PROPRIETA_PERCORSO
  return scelte
}

/** `fc.assert` con le opzioni di casa. Il messaggio di fast-check porta già seme e controesempio. */
export function verifica (proprieta, esecuzioni) {
  return fc.assert(proprieta, opzioni(esecuzioni))
}

/** Un giorno vero fra il 1900 e il 2199: le date del registro non escono di lì. */
export const giorno = fc
  .date({ min: new Date('1900-01-01T00:00:00Z'), max: new Date('2199-12-31T00:00:00Z'), noInvalidDate: true })
  .map((data) => data.toISOString().slice(0, 10))

/** Un valore com'è su disco: quel che sopravvive a `JSON.stringify` (niente `undefined`). */
export const suDisco = (valore) => (valore === undefined ? undefined : JSON.parse(JSON.stringify(valore)))

const CAMPIONI = percorso.join(percorso.dirname(fileURLToPath(import.meta.url)), '..', 'samples', 'formato')

/**
 * I campioni del formato (`tests/samples/formato/v<n>.regi`), letti: per ogni
 * versione le voci JSON, senza storico né manifesto. Sono i registri «validi»
 * da cui le prove partono per guastarli.
 */
export function campioni () {
  return readdirSync(CAMPIONI)
    .map((nome) => /^v(\d+)\.regi$/.exec(nome))
    .filter(Boolean)
    .map((trovato) => {
      const voci = {}
      for (const voce of leggiZip(readFileSync(percorso.join(CAMPIONI, trovato[0])))) {
        const collezione = /^([^/]+)\.json$/.exec(voce.nome)?.[1]
        if (collezione && collezione !== 'manifesto') voci[collezione] = JSON.parse(new TextDecoder().decode(voce.dati))
      }
      return { versione: Number(trovato[1]), voci }
    })
    .sort((a, b) => a.versione - b.versione)
}

/** Tutti i percorsi dentro un valore JSON, la radice compresa (`[]`). */
function percorsi (valore, dove = [], trovati = []) {
  trovati.push(dove)
  if (valore && typeof valore === 'object') {
    for (const chiave of Object.keys(valore)) percorsi(valore[chiave], [...dove, chiave], trovati)
  }
  return trovati
}

/**
 * Un guasto: un punto del documento, scelto per indice fra i percorsi che ci
 * sono, che sparisce o prende un valore qualsiasi (anche d'un altro tipo).
 */
const guasto = fc.record({
  dove: fc.nat(),
  valore: fc.option(fc.oneof(fc.jsonValue({ maxDepth: 2 }), giorno, fc.constantFrom('', 0, -1, 1e9, true, null, [], {})), { nil: undefined }),
})

/** Una copia di `valore` con qualche guasto: campi tolti, tipi sbagliati, date storte. */
export function guastato (valore, { massimo = 6 } = {}) {
  return fc.array(guasto, { maxLength: massimo }).map((guasti) => {
    const copia = structuredClone(valore)
    for (const { dove, valore: nuovo } of guasti) {
      const tutti = percorsi(copia).filter((p) => p.length > 0)
      if (tutti.length === 0) break
      const scelto = tutti[dove % tutti.length]
      const padre = scelto.slice(0, -1).reduce((o, chiave) => o[chiave], copia)
      const chiave = scelto.at(-1)
      if (nuovo === undefined) {
        if (Array.isArray(padre)) padre.splice(Number(chiave), 1)
        else delete padre[chiave]
      } else {
        // Come `JSON.parse`: anche `__proto__` è un campo suo, non il prototipo.
        Object.defineProperty(padre, chiave, { value: structuredClone(nuovo), enumerable: true, writable: true, configurable: true })
      }
    }
    return copia
  })
}

export { fc }
