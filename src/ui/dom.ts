// Costruzione dell'interfaccia senza librerie: `h('div', {class: 'x'}, ...)`
// crea subito un elemento vero, senza DOM virtuale. La vista si ridisegna solo
// quando lo stato cambia; fuoco e scorrimento si rimettono con `data-fuoco` e
// `data-scorrimento`.

export type Figlio = Node | string | number | null | undefined | false | Figlio[]

export interface Attributi {
  class?: string | Array<string | false | null | undefined>
  /** Le variabili CSS (`--nome`) passano da `setProperty`: `Object.assign` le perderebbe. */
  style?: (Partial<CSSStyleDeclaration> & { [variabile: `--${string}`]: string }) | string
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

  /**
   * Il `value` di un `<select>`, assegnato dopo i figli: un `<select>` vuoto non
   * accetta un valore che nessuna `<option>` porta. Così un valore assente lascia
   * la tendina in bianco (la verità) e la prima scelta fa partire `change`,
   * invece di mostrare la prima voce mentre il filtro ne tiene un'altra.
   */
  let valoreDellaTendina: unknown

  for (const [chiave, valore] of Object.entries(attributi ?? {})) {
    if (valore === undefined || valore === null) continue

    if (chiave === 'value' && elemento instanceof HTMLSelectElement) {
      valoreDellaTendina = valore
    } else if (chiave === 'class') {
      applicaClasse(elemento, valore as Attributi['class'])
    } else if (chiave === 'style') {
      if (typeof valore === 'string') elemento.setAttribute('style', valore)
      else {
        for (const [proprieta, dato] of Object.entries(valore as Record<string, unknown>)) {
          if (proprieta.startsWith('--')) elemento.style.setProperty(proprieta, String(dato))
          else Object.assign(elemento.style, { [proprieta]: dato })
        }
      }
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
      // Proprietà invece di attributo: `value` e `checked` come attributi non
      // cambiano un campo già toccato.
      ;(elemento as unknown as Record<string, unknown>)[chiave] = valore
    } else {
      elemento.setAttribute(chiave, String(valore))
    }
  }

  for (const figlio of figli) aggiungi(elemento, figlio)
  if (valoreDellaTendina !== undefined) {
    (elemento as unknown as Record<string, unknown>).value = valoreDellaTendina
  }
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
   * Quel che c'era scritto: un ridisegno durante la battitura rimetterebbe il
   * cursore nel valore vecchio, perdendo la lettera appena premuta.
   */
  valore: string | null
}

/** Se il tasto è stato premuto dentro qualcosa in cui si sta scrivendo. */
export function dentroUnCampo (bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false
  return bersaglio.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(bersaglio.tagName)
}

/** Un campo il cui contenuto vale la pena riscrivere dopo un ridisegno: testo libero, non una scelta. */
function contenutoTestuale (
  elemento: HTMLElement,
): elemento is HTMLInputElement | HTMLTextAreaElement {
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
 * Dove cercare il campo da rifocalizzare: nell'ultima modale aperta, se c'è,
 * perché due strati con la stessa chiave non si rubino il fuoco.
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
      // I campi date e number non accettano una selezione.
    }
  }
}

/**
 * Ridà il fuoco a chi lo aveva prima di una modale, un menu o la palette. Se un
 * ridisegno ha staccato l'elemento, si cerca il sostituto con la stessa chiave
 * di fuoco; senza chiave non si tira a indovinare.
 */
export function rifocalizza (elemento: HTMLElement | null | undefined): void {
  if (!elemento) return
  if (elemento.isConnected) {
    elemento.focus?.()
    return
  }
  const chiave = elemento.dataset?.fuoco
  if (!chiave) return
  radiceFuoco().querySelector<HTMLElement>(`[data-fuoco="${CSS.escape(chiave)}"]`)?.focus()
}

// ------------------------------------------------------------------ scorciatoie

/**
 * Mette il fuoco sul primo campo utile. Torna vero se l'ha trovato, così chi
 * chiama sa se deve rimediare altrimenti.
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

// ---------------------------------------------------------------- scorrimento

/**
 * Dov'era arrivato lo scorrimento, gemello di `ricordaFuoco`: `rimpiazza`
 * ricostruisce e ogni scatola ripartirebbe da capo. Si conserva solo quel che
 * porta `data-scorrimento`; la chiave dice che cosa si guarda
 * (`sfoglio:<id del PDF>`), così cambiando oggetto si riparte dall'alto. Anche
 * in orizzontale, per le matrici larghe.
 */
interface ScorrimentoRicordato {
  alto: number
  sinistra: number
  inFondo: boolean
}

/** Quanti pixel dal fondo contano ancora come «in fondo»: un confronto esatto sbaglia per un bordo. */
const SOGLIA_FONDO = 24

/** Se la scatola è arrivata in fondo, o abbastanza vicino da valere lo stesso. */
function inFondo (elemento: HTMLElement): boolean {
  return elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight <= SOGLIA_FONDO
}

/**
 * Come scorre il programma: di colpo o accompagnando. Uno `smooth` passato da
 * JavaScript sfugge alla guardia `prefers-reduced-motion` dei fogli di stile,
 * quindi la si rispetta qui.
 */
export function andaturaScorrimento (): ScrollBehavior {
  // testo-fisso: una media query CSS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function ricordaScorrimenti (): Map<string, ScorrimentoRicordato> {
  const ricordo = new Map<string, ScorrimentoRicordato>()
  for (const elemento of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    const chiave = elemento.dataset.scorrimento
    if (!chiave) continue
    // Chi segue il fondo si ricorda anche in cima: la conversazione appena aperta
    // sta per crescere.
    const segue = elemento.dataset.segueFondo !== undefined
    if (!segue && elemento.scrollTop === 0 && elemento.scrollLeft === 0) continue
    ricordo.set(chiave, {
      alto: elemento.scrollTop,
      sinistra: elemento.scrollLeft,
      inFondo: inFondo(elemento),
    })
  }
  return ricordo
}

/**
 * Rimette ogni scatola dov'era; quelle che non ci sono più si ignorano.
 * `data-segue-fondo` vuole lo stesso posto, non lo stesso pixel: chi era in
 * fondo alla conversazione resta in fondo mentre cresce, chi era risalito resta lì.
 */
export function ripristinaScorrimenti (ricordo: Map<string, ScorrimentoRicordato>): void {
  if (ricordo.size === 0) return
  for (const elemento of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    const chiave = elemento.dataset.scorrimento
    const dove = chiave ? ricordo.get(chiave) : undefined
    if (!dove) continue
    if (dove.inFondo && elemento.dataset.segueFondo !== undefined) {
      elemento.scrollTop = elemento.scrollHeight
      elemento.scrollLeft = dove.sinistra
      continue
    }
    elemento.scrollTop = dove.alto
    elemento.scrollLeft = dove.sinistra
  }
}
