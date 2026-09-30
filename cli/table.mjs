// Formattazione di tabelle per l'uscita a testo della riga di comando.
// Solo moduli `node:`.

/**
 * Formatta un'intestazione e una serie di righe in una tabella a colonna
 * allineata con trattini di separazione.
 */
export function tabella (intestazioni, righe) {
  const larghezze = intestazioni.map((testa, colonna) =>
    Math.max(testa.length, ...righe.map((riga) => String(riga[colonna] ?? '').length)),
  )
  const riga = (celle) =>
    celle
      .map((cella, colonna) =>
        colonna === celle.length - 1
          ? String(cella ?? '')
          : String(cella ?? '').padEnd(larghezze[colonna]),
      )
      .join('  ')
      .trimEnd()
  return [riga(intestazioni), riga(larghezze.map((l) => '─'.repeat(l))), ...righe.map(riga)]
    .join('\n')
}
