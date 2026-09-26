// Operazioni sugli oggetti che la libreria standard di TypeScript tipa male.

/**
 * I valori di un oggetto, senza perderne il tipo.
 *
 * `Object.values` su un'interfaccia a campi (senza indice) torna `any[]`, e da
 * lì TypeScript smette di controllare. `T[keyof T]` è l'unione dei tipi dei
 * campi. Serve a raccogliere i gruppi di un oggetto fatto di gruppi (es.
 * `RecuperiDaFare`), non a frugare in un oggetto qualunque.
 */
export function valoriDi<T extends object> (oggetto: T): Array<T[keyof T]> {
  return Object.values(oggetto) as Array<T[keyof T]>
}
