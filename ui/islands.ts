// Le isole: pezzi della pagina che si ridisegnano da soli. Il ridisegno
// completo resta la regola per ogni cambio di stato (ADR-06); ma una lettura
// che arriva (un'anteprima, un PDF rifatto, un CSV) cambia solo il riquadro che
// la mostra, e rifare tutta la pagina per lei la faceva lampeggiare.
//
// Un'isola è un componente di React (`<Isola>`, `island.tsx`, o chi usa
// `useFinestra`) iscritto qui sotto una chiave che dice che cosa si guarda
// (`anteprima:<id del modello>`), non dove. `ridisegnaIsola(chiave)` rifà più
// tardi solo lui. Il contenuto resta funzione dello stato e delle letture:
// l'isola non tiene niente che un ridisegno completo perda.

/** Per ogni chiave, chi ridisegna le isole che le rispondono. */
const reattive = new Map<string, Set<() => void>>()

/** Iscrive un'isola alla sua chiave; torna la disiscrizione. */
export function iscriviIsola (chiave: string, rifai: () => void): () => void {
  let suoi = reattive.get(chiave)
  if (!suoi) {
    suoi = new Set()
    reattive.set(chiave, suoi)
  }
  suoi.add(rifai)
  return () => {
    suoi.delete(rifai)
    if (suoi.size === 0) reattive.delete(chiave)
  }
}

/** Le chiavi da rifare al prossimo fotogramma: tre letture di fila, un giro solo. */
const inAttesa = new Set<string>()
let programmato = false

/** Se l'isola è nel documento adesso: chi l'aspetta può ridisegnare lei sola. */
export function isolaPresente (chiave: string): boolean {
  return (reattive.get(chiave)?.size ?? 0) > 0
}

/**
 * Rifà adesso le isole con quella chiave. Torna falso se non ce n'è nessuna:
 * chi chiama decide se ridisegnare tutto.
 */
function rifaiIsola (chiave: string): boolean {
  const suoi = reattive.get(chiave)
  if (!suoi || suoi.size === 0) return false
  for (const rifai of [...suoi]) rifai()
  return true
}

/**
 * Rifà l'isola adesso, non al prossimo fotogramma: per chi deve trovarci un
 * nodo subito dopo (la tastiera che porta il fuoco su una voce non ancora
 * disegnata). Mai dal disegno, come `ridisegnaIsola`.
 */
export function rifaiIsolaAdesso (chiave: string): boolean {
  inAttesa.delete(chiave)
  return rifaiIsola(chiave)
}

/**
 * Rifà l'isola al prossimo fotogramma. Mai dal disegno: un'isola che chiede di
 * ridisegnarsi mentre si disegna girerebbe a vuoto.
 */
export function ridisegnaIsola (chiave: string): void {
  inAttesa.add(chiave)
  if (programmato) return
  programmato = true
  requestAnimationFrame(() => {
    programmato = false
    const chiavi = Array.from(inAttesa)
    inAttesa.clear()
    for (const una of chiavi) rifaiIsola(una)
  })
}
