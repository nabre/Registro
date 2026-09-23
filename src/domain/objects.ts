// Le due o tre cose che si fanno a un oggetto e che TypeScript non sa fare bene
// da sé.
//
// Per ora ce n'è una sola, e nasce da un difetto della libreria standard che
// costa caro proprio qui, nel dominio: è lo strato dove un `any` non deve
// esistere, perché è quello che regge i conti di presenze, valutazioni e
// recuperi, ed è l'unico che si prova per intero senza aprire niente.

/**
 * I valori di un oggetto, senza perderne il tipo.
 *
 * `Object.values` è dichiarato due volte nella libreria standard: una per gli
 * oggetti con un indice — `{ [k: string]: T }` — che torna `T[]`, e una per
 * tutto il resto, che torna `any[]`. Un'interfaccia scritta a campi, come sono
 * tutte quelle del registro, non ha un indice e ricade sulla seconda.
 *
 * Il guasto non è il tipo perso: è quel che succede dopo. Da un `any` in poi
 * TypeScript smette di guardare, e `mucchio.sort(ordina)` passerebbe il
 * controllo anche se `mucchio` non fosse un elenco e `ordina` non esistesse —
 * fino a scoprirlo aprendo la pagina.
 *
 * La conversione sta qui, scritta una volta e spiegata, invece che tre volte
 * sul posto e mai. `T[keyof T]` è l'unione dei tipi dei campi: su
 * `RecuperiDaFare`, che ha cinque campi tutti `Recupero[]`, è `Recupero[]`, e il
 * ciclo che ne esce è controllato come merita.
 *
 * Da usare per raccogliere *i gruppi* di un oggetto che ne è fatto — «tutti i
 * mucchi di questo prospetto, uno dopo l'altro» — e non per frugare in un
 * oggetto qualunque.
 */
export function valoriDi<T extends object> (oggetto: T): Array<T[keyof T]> {
  return Object.values(oggetto) as Array<T[keyof T]>
}
