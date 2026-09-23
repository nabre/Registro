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

  /**
   * Il `value` di un `<select>`, tenuto da parte per dopo i figli.
   *
   * L'ordine qui conta, ed è l'unico posto in cui conta. Un `<select>` accetta
   * soltanto un valore che una delle sue `<option>` porta già: assegnato qui,
   * con l'elemento ancora vuoto, non attecchisce — e la tendina resta com'è
   * nata, cioè sulla prima voce. Chi si appoggia a `selected` sulle option
   * cade nello stesso buco al contrario: se il valore chiesto non è fra le
   * opzioni nessuna porta `selected`, il browser accende la prima, e la
   * tendina dice «Tutti i corsi» mentre il filtro ne trattiene un altro. Da lì
   * non si esce più, perché riscegliere la prima voce non cambia il `value` e
   * nessun `change` parte.
   *
   * Rimandando l'assegnazione a dopo i figli, un valore che non c'è lascia la
   * tendina in bianco — che è la verità — e la prima scelta vera fa scattare
   * il `change`. È quel che i moduli facevano già a mano in
   * `components/base.ts`, e la ragione per cui le loro tendine si comportavano
   * bene e quelle delle barre no.
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

// ---------------------------------------------------------------- scorrimento

/**
 * Dov'era arrivato lo scorrimento, per gli elementi che lo devono conservare.
 *
 * È il gemello di `ricordaFuoco`, e nasce dallo stesso difetto: `rimpiazza`
 * svuota e ricostruisce: ogni scatola che scorre riparte da capo, e chi
 * guardava la pagina 14 di una scansione si ritrova alla prima.
 *
 * Non era un fastidio astratto. Trascinando le pagine di un PDF sulla casella
 * di qualcuno, l'archiviazione riuscita ridisegna la vista — e la colonna delle
 * pagine, e la matrice accanto, tornavano tutte e due in cima. Per prendere la
 * pagina dopo bisognava riscorrere fin lì, a ogni pagina archiviata. Lo stesso
 * succedeva scegliendo una pagina con un clic, che pure cambia quasi niente.
 *
 * Si conserva quel che è marcato con `data-scorrimento`, e basta: una pagina
 * che riparte da capo è a volte proprio quel che si vuole — si apre un altro
 * documento, e si vuole vederne l'inizio. La chiave dice *che cosa* si sta
 * guardando, non dove sta nel documento: `sfoglio:<id del PDF>` si ritrova solo
 * se si sta ancora guardando quel PDF, e cambiandolo si riparte dall'alto,
 * com'è giusto.
 *
 * Le due direzioni e non solo quella verticale: la matrice dei documenti cresce
 * in larghezza con le richieste, e chi lavora sulla colonna di destra la perde
 * di vista allo stesso modo.
 */
interface ScorrimentoRicordato {
  alto: number
  sinistra: number
  inFondo: boolean
}

/**
 * Quanti pixel dal fondo contano ancora come «in fondo».
 *
 * Non zero: una riga a metà, un bordo, un pixel di arrotondamento bastano a far
 * dire «no» a un confronto esatto, e chi guardava l'ultima riga si vedrebbe
 * trattato come chi è risalito a leggere.
 */
const SOGLIA_FONDO = 24

/** Se la scatola è arrivata in fondo, o abbastanza vicino da valere lo stesso. */
function inFondo (elemento: HTMLElement): boolean {
  return elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight <= SOGLIA_FONDO
}

/**
 * Come si scorre quando è il programma a scorrere: di colpo o accompagnando.
 *
 * I fogli di stile hanno la loro guardia `prefers-reduced-motion` — è una
 * regola di casa, scritta in `styles/metrics.css` — ma un `behavior: 'smooth'`
 * passato da JavaScript non passa dal CSS e quella guardia non lo vede. Chi ha
 * chiesto al sistema meno movimento lo chiede anche qui.
 */
export function andaturaScorrimento (): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function ricordaScorrimenti (): Map<string, ScorrimentoRicordato> {
  const ricordo = new Map<string, ScorrimentoRicordato>()
  for (const elemento of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    const chiave = elemento.dataset.scorrimento
    if (!chiave) continue
    // Chi segue il fondo si ricorda anche da fermo in cima: è il caso della
    // conversazione appena aperta, che sta per crescere sotto il bordo.
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
 * Rimette ogni scatola dov'era.
 *
 * Quel che non si ritrova si lascia perdere in silenzio: la scatola può non
 * esistere più — il PDF chiuso, la scheda cambiata — e non è un guasto, è il
 * caso normale in cui non c'è niente da conservare.
 *
 * `data-segue-fondo` dice che quella scatola non vuole *lo stesso pixel* ma
 * *lo stesso posto*: la conversazione dell'assistente cresce mentre la si
 * guarda, e rimetterla dov'era in pixel vuol dire lasciare la riga nuova sotto
 * il bordo. Chi era in fondo resta in fondo; chi era risalito a rileggere non
 * viene strappato in basso a ogni pezzo che arriva.
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
