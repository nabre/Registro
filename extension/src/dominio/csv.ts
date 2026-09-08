// Il CSV come lo apre un foglio di calcolo italiano.
//
// Sta nel dominio e non accanto alle esportazioni per un motivo solo: qui non
// si tocca il disco, e le due regole che contano davvero — la virgola dei
// decimali e le celle che sembrano formule — si possono provare senza aprire
// l'editor. Il resto (che cosa esportare, dove scriverlo) resta in `dati/`.
//
// Separatore punto e virgola e BOM in testa: è il modo in cui Excel in ambito
// italiano apre un CSV senza chiedere niente e senza mangiarsi gli accenti.

const SEPARATORE = ';'

/**
 * Una cella. I numeri escono con la virgola, come li legge Excel in italiano;
 * il testo si mette fra virgolette se contiene qualcosa che le richiede.
 *
 * Un testo che comincia come una formula — «=», «+», «-», «@» — si protegge
 * con un apostrofo: il nome di un allievo o il titolo di una verifica non
 * devono diventare un comando per il foglio di calcolo che li apre.
 */
export function cella (valore: string | number | null | undefined): string {
  if (valore === null || valore === undefined) return ''
  if (typeof valore === 'number') return String(valore).replace('.', ',')
  const testo = /^[=+\-@]/.test(valore) ? `'${valore}` : valore
  return /[";\r\n]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo
}

/** Le righe di un CSV, già col BOM davanti e le interruzioni che Excel si aspetta. */
export function righe (dati: Array<Array<string | number | null>>): string {
  return `﻿${dati.map((r) => r.map(cella).join(SEPARATORE)).join('\r\n')}\r\n`
}
