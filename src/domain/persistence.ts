// Come una collezione diventa il testo dentro il documento.
//
// In memoria la normalizzazione riempie ogni campo col predefinito; su disco i
// vuoti ripetuti pesano (un quinto del file delle lezioni, per dieci copie in
// `.storico/`). Qui si tolgono.
//
// Invariante: si toglie solo quel che la normalizzazione rimette identico —
// stringa vuota (`testo()`) ed elenco vuoto (`elenco()`). `false`, `0` e `null`
// restano: `attivo` mancante nasce `true`, un voto `null` non è un voto
// assente, `minuti: 0` è un dato. Lo prova `tests/domain/persistence.test.mjs`
// sul registro intero.

/**
 * Il filtro di `JSON.stringify` che toglie i vuoti. Dentro un elenco non tocca
 * niente: un elemento scartato diventerebbe `null`, non sparirebbe.
 */
function senzaVuoti (this: unknown, _chiave: string, valore: unknown): unknown {
  if (Array.isArray(this)) return valore
  if (valore === '') return undefined
  if (Array.isArray(valore) && valore.length === 0) return undefined
  return valore
}

/**
 * Una collezione nel testo esatto del documento: indentato (si legge a mano)
 * e con l'a capo finale.
 */
export function testoCollezione (contenuto: unknown): string {
  // Una collezione vuota in sé (`[]`, frequente in un anno nuovo) dà `undefined`
  // col filtro: si ripiega sul JSON senza filtro.
  const scritto = JSON.stringify(contenuto, senzaVuoti, 2)
  return `${scritto ?? JSON.stringify(contenuto)}\n`
}
