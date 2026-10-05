// Fuoco e scorrimento attraverso i ridisegni. Il pannello si ridisegna tutto a
// ogni cambio di stato (`ui/main.tsx`): prima di disegnare si fotografa chi ha
// il fuoco (`data-fuoco`) e dove sono arrivate le scatole che scorrono
// (`data-scorrimento`), dopo si rimette tutto com'era. Le isole fanno lo stesso
// solo dentro di sé.

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
  // Senza scorrere: lo scorrimento lo rimette `ripristinaScorrimenti`, e un campo
  // in cima alla pagina riporterebbe su chi intanto è sceso.
  elemento.focus({ preventScroll: true })
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
 * Dov'era arrivato lo scorrimento, gemello di `ricordaFuoco`: un nodo rifatto
 * ripartirebbe da capo. Si conserva solo quel che
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

/** Le scatole con `data-scorrimento` sotto `dentro`, lui compreso. */
function scatole (dentro: ParentNode): HTMLElement[] {
  const tutte = Array.from(dentro.querySelectorAll<HTMLElement>('[data-scorrimento]'))
  const proprio = dentro instanceof HTMLElement && dentro.dataset.scorrimento !== undefined
  if (proprio) tutte.unshift(dentro)
  return tutte
}

/** `dentro` restringe la foto a un pezzo della pagina: un'isola che si ridisegna da sola. */
export function ricordaScorrimenti (
  dentro: ParentNode = document,
): Map<string, ScorrimentoRicordato> {
  const ricordo = new Map<string, ScorrimentoRicordato>()
  for (const elemento of scatole(dentro)) {
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
export function ripristinaScorrimenti (
  ricordo: Map<string, ScorrimentoRicordato>,
  dentro: ParentNode = document,
): void {
  if (ricordo.size === 0) return
  for (const elemento of scatole(dentro)) {
    const chiave = elemento.dataset.scorrimento
    const dove = chiave ? ricordo.get(chiave) : undefined
    if (!dove) continue
    if (dove.inFondo && elemento.dataset.segueFondo !== undefined) {
      elemento.scrollTop = elemento.scrollHeight
      elemento.scrollLeft = dove.sinistra
      continue
    }
    // Una scatola tenuta dal disegno è già lì: riscriverle lo stesso valore fermerebbe lo scorrimento dolce in corso.
    if (elemento.scrollTop !== dove.alto) elemento.scrollTop = dove.alto
    if (elemento.scrollLeft !== dove.sinistra) elemento.scrollLeft = dove.sinistra
  }
}
