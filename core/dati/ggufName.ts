// Che cosa è il nome di un modello: la regola sola, senza disco né `apparato`,
// perché la usano insieme la guardia di `gguf.ts` e la dogana delle
// impostazioni (`desktop/apparato/settings.ts`), che non può tirarsi dietro
// la cartella dei modelli.

import * as percorso from 'node:path'

/** L'estensione, l'unica. */
export const ESTENSIONE = '.gguf'

/**
 * Se `nome` è il nome nudo di un modello: un file `.gguf`, senza separatori,
 * risalite o lettere di unità. Un `.ipull` sono pesi tronchi e non passa.
 */
export function nomeDiModello (nome: string): boolean {
  const pulito = nome.trim()
  if (pulito === '') return false
  // Tutti e due i separatori, qualunque sia il sistema: il valore viene da un JSON.
  if (/[\\/:]/.test(pulito) || pulito !== percorso.basename(pulito)) return false
  return percorso.extname(pulito).toLowerCase() === ESTENSIONE
}
