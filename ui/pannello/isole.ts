// Le isole: pezzi della pagina che si ridisegnano da soli. Il ridisegno
// completo resta la regola per ogni cambio di stato (ADR-06); ma una lettura
// che arriva (un'anteprima, un PDF rifatto, un CSV) cambia solo il riquadro che
// la mostra, e rifare tutta la pagina per lei la faceva lampeggiare.
//
// Un'isola è una funzione del disegno come le altre: la vista la chiama con una
// chiave e una funzione che ne disegna il contenuto. Il disegno completo la
// esegue subito e se la ricorda; `ridisegnaIsola(chiave)` la riesegue più tardi
// e rifà solo quel sottoalbero. Il contenuto resta funzione dello stato e delle
// letture: il DOM dell'isola non tiene niente che un ridisegno completo perda.

import {
  aggiornaElemento,
  h,
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
  type Attributi,
  type Figlio,
} from './dom.js'

/**
 * L'ultima funzione disegnata per ogni chiave. Si sovrascrive a ogni disegno
 * completo, quindi vede sempre lo stato dell'ultimo; una chiave la cui isola
 * non è più nel documento si dimentica al primo tentativo di rifarla.
 */
const disegni = new Map<string, () => Figlio>()

/** Le chiavi da rifare al prossimo fotogramma: tre letture di fila, un giro solo. */
const inAttesa = new Set<string>()
let programmato = false

/**
 * Il contenitore di un'isola, da mettere nel disegno dove il contenuto deve
 * comparire. La chiave è unica nella pagina e dice che cosa si guarda
 * (`anteprima:<id del modello>`), non dove. `attributi` vanno sul contenitore,
 * che il ridisegno dell'isola non rifà: niente ascoltatori che dipendano dallo
 * stato, lì.
 */
export function isola (
  chiave: string,
  disegna: () => Figlio,
  attributi: Attributi = {},
): HTMLElement {
  disegni.set(chiave, disegna)
  return h('div', { ...attributi, dataset: { ...attributi.dataset, isola: chiave } }, disegna())
}

/** I contenitori nel documento con quella chiave. */
function contenitori (chiave: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-isola="${CSS.escape(chiave)}"]`))
}

/** Se l'isola è nel documento adesso: chi l'aspetta può ridisegnare lei sola. */
export function isolaPresente (chiave: string): boolean {
  return disegni.has(chiave) && contenitori(chiave).length > 0
}

/**
 * Rifà adesso il contenuto dell'isola, con fuoco e scorrimento rimessi come in
 * `main.ts` ma solo lì dentro. Torna falso se l'isola non c'è: chi chiama
 * decide se ridisegnare tutto.
 */
function rifaiIsola (chiave: string): boolean {
  const disegna = disegni.get(chiave)
  const trovati = disegna ? contenitori(chiave) : []
  if (!disegna || trovati.length === 0) {
    disegni.delete(chiave)
    return false
  }
  for (const contenitore of trovati) {
    const nuovo = disegna()
    const attivo = document.activeElement
    const fuoco = attivo && contenitore.contains(attivo) ? ricordaFuoco() : null
    const scorrimenti = ricordaScorrimenti(contenitore)
    aggiornaElemento(contenitore, nuovo)
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti, contenitore)
  }
  return true
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
