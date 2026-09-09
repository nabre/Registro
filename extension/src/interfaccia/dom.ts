// Costruzione dell'interfaccia senza librerie.
//
// `h('div', {class: 'x'}, ...)` produce un vero elemento del DOM, subito. Non
// c'è un DOM virtuale e non serve: il registro ridisegna la vista solo quando
// lo stato cambia davvero — un salvataggio, un cambio di giorno — non a ogni
// tasto premuto dentro un campo. Quel che si scrive in un modulo vive nel DOM
// finché non si conferma, e questo toglie di mezzo tutto il problema.
//
// L'unica cosa che un ridisegno rovina è il fuoco: `data-fuoco` sugli elementi
// che lo meritano lascia a `ricordaFuoco`/`ripristinaFuoco` il modo di
// rimetterlo dov'era, cursore compreso.

export type Figlio = Node | string | number | null | undefined | false | Figlio[]

export interface Attributi {
  class?: string | Array<string | false | null | undefined>
  style?: Partial<CSSStyleDeclaration> | string
  dataset?: Record<string, string | number | boolean | undefined>
  /** Attributi da mettere così come sono: aria-*, role, colspan… */
  attr?: Record<string, string | number | boolean | null | undefined>
  [chiave: string]: unknown
}

function applicaClasse (elemento: HTMLElement, valore: Attributi['class']): void {
  const nomi = Array.isArray(valore) ? valore.filter(Boolean) : [valore]
  const pulite = nomi.filter((n): n is string => typeof n === 'string' && n.length > 0)
  if (pulite.length > 0) elemento.className = pulite.join(' ')
}

function aggiungi (genitore: Node, figlio: Figlio): void {
  if (figlio === null || figlio === undefined || figlio === false) return
  if (Array.isArray(figlio)) {
    for (const voce of figlio) aggiungi(genitore, voce)
    return
  }
  genitore.appendChild(
    figlio instanceof Node ? figlio : document.createTextNode(String(figlio)),
  )
}

export function h<K extends keyof HTMLElementTagNameMap> (
  tag: K,
  attributi?: Attributi | null,
  ...figli: Figlio[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag)

  for (const [chiave, valore] of Object.entries(attributi ?? {})) {
    if (valore === undefined || valore === null) continue

    if (chiave === 'class') {
      applicaClasse(elemento, valore as Attributi['class'])
    } else if (chiave === 'style') {
      if (typeof valore === 'string') elemento.setAttribute('style', valore)
      else Object.assign(elemento.style, valore)
    } else if (chiave === 'dataset') {
      for (const [nome, dato] of Object.entries(valore as Record<string, unknown>)) {
        if (dato !== undefined) elemento.dataset[nome] = String(dato)
      }
    } else if (chiave === 'attr') {
      for (const [nome, dato] of Object.entries(valore as Record<string, unknown>)) {
        if (dato !== null && dato !== undefined && dato !== false) {
          elemento.setAttribute(nome, String(dato))
        }
      }
    } else if (chiave.startsWith('on') && typeof valore === 'function') {
      elemento.addEventListener(chiave.slice(2).toLowerCase(), valore as EventListener)
    } else if (chiave in elemento) {
      // Proprietà invece di attributo: `value` e `checked` impostati come
      // attributo non cambiano quel che l'utente vede una volta che il campo
      // è stato toccato.
      ;(elemento as unknown as Record<string, unknown>)[chiave] = valore
    } else {
      elemento.setAttribute(chiave, String(valore))
    }
  }

  for (const figlio of figli) aggiungi(elemento, figlio)
  return elemento
}

/** Un contenitore trasparente, per restituire più nodi da una funzione sola. */
export function gruppo (...figli: Figlio[]): DocumentFragment {
  const frammento = document.createDocumentFragment()
  for (const figlio of figli) aggiungi(frammento, figlio)
  return frammento
}

export function svuota (elemento: Element): void {
  while (elemento.firstChild) elemento.removeChild(elemento.firstChild)
}

/** Sostituisce il contenuto di un elemento in un colpo solo, senza sfarfallio. */
export function rimpiazza (elemento: Element, ...figli: Figlio[]): void {
  const frammento = gruppo(...figli)
  svuota(elemento)
  elemento.appendChild(frammento)
}

/** SVG inline: `h` non va bene, gli elementi SVG vogliono il loro namespace. */
export function svg (
  vista: string,
  contenuto: string,
  classe?: string,
): SVGSVGElement {
  const elemento = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  elemento.setAttribute('viewBox', vista)
  elemento.setAttribute('aria-hidden', 'true')
  elemento.setAttribute('focusable', 'false')
  if (classe) elemento.setAttribute('class', classe)
  elemento.innerHTML = contenuto
  return elemento
}

// ------------------------------------------------------------------ fuoco

interface FuocoRicordato {
  chiave: string
  inizio: number | null
  fine: number | null
  /**
   * Quel che c'era scritto. Senza, un ridisegno che arriva mentre si scrive —
   * l'orologio dello stato batte ogni minuto — rimetteva il cursore al posto
   * giusto ma dentro il valore vecchio: la lettera appena premuta spariva.
   */
  valore: string | null
}

/** Un campo il cui contenuto vale la pena riscrivere dopo un ridisegno: testo libero, non una scelta. */
function contenutoTestuale (elemento: HTMLElement): elemento is HTMLInputElement | HTMLTextAreaElement {
  if (elemento instanceof HTMLTextAreaElement) return true
  if (!(elemento instanceof HTMLInputElement)) return false
  return ['text', 'number', 'email', 'tel', 'search', 'url', 'password'].includes(elemento.type)
}

/** Prende nota di dove sta il cursore prima di rifare la vista. */
export function ricordaFuoco (): FuocoRicordato | null {
  const attivo = document.activeElement as HTMLElement | null
  const chiave = attivo?.dataset?.fuoco
  if (!attivo || !chiave) return null
  const campo = attivo as HTMLInputElement
  const testuale = typeof campo.selectionStart === 'number'
  return {
    chiave,
    inizio: testuale ? campo.selectionStart : null,
    fine: testuale ? campo.selectionEnd : null,
    valore: contenutoTestuale(attivo) ? attivo.value : null,
  }
}

/**
 * Dove cercare il campo da ririfocalizzare: dentro l'ultima modale aperta, se
 * ce n'è una, altrimenti nel documento intero.
 *
 * Senza questo confine, due modali impilate che condividessero per caso la
 * stessa chiave di fuoco — o una modale aperta sopra un campo dello stesso
 * nome nella vista sotto — si rubavano il fuoco a vicenda a ogni ridisegno.
 */
function radiceFuoco (): ParentNode {
  const modali = document.querySelectorAll<HTMLElement>('.strato-modale')
  return modali.length > 0 ? modali[modali.length - 1] : document
}

export function ripristinaFuoco (ricordo: FuocoRicordato | null): void {
  if (!ricordo) return
  const elemento = radiceFuoco().querySelector<HTMLElement>(
    `[data-fuoco="${CSS.escape(ricordo.chiave)}"]`,
  )
  if (!elemento) return
  elemento.focus()
  const campo = elemento as HTMLInputElement | HTMLTextAreaElement
  if (ricordo.valore !== null && contenutoTestuale(elemento) && campo.value !== ricordo.valore) {
    campo.value = ricordo.valore
  }
  if (ricordo.inizio !== null && typeof (campo as HTMLInputElement).setSelectionRange === 'function') {
    try {
      ;(campo as HTMLInputElement).setSelectionRange(ricordo.inizio, ricordo.fine ?? ricordo.inizio)
    } catch {
      // I campi date e number non accettano una selezione: non è un problema.
    }
  }
}

// ------------------------------------------------------------------ scorciatoie

/**
 * Mette il fuoco sul primo campo utile: chi apre un modulo vuole scrivere.
 * Torna vero se ha trovato un campo, così chi chiama sa se deve rimediare
 * altrimenti — un corpo senza campi non lascia il fuoco a vagare nella pagina.
 */
export function fuocoIniziale (contenitore: HTMLElement): boolean {
  const primo = contenitore.querySelector<HTMLElement>(
    'input:not([type=hidden]):not([disabled]), textarea, select',
  )
  if (!primo) return false
  primo.focus()
  if (primo instanceof HTMLInputElement && primo.type === 'text') primo.select()
  return true
}
