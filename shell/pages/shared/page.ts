// Quel che le pagine native hanno in comune: il canale con il main process, gli
// elementi, i testi del catalogo.
//
// Gira in una finestra: DOM senza Node. Dal resto del progetto le pagine
// prendono solo tipi (`import type`) e i testi (`src/i18n/` e il loro catalogo).

/** Il ponte che il preload espone (`shell/preload.ts`). */
declare function acquireVsCodeApi (): { postMessage (messaggio: unknown): void }

const ponte = acquireVsCodeApi()

/**
 * Manda un messaggio al main process sul canale unico dell'applicazione: chi
 * riceve lo riconosce dalla chiave (`dialogo`, `benvenuto`, `impostazioni`).
 */
export function manda (messaggio: unknown): void {
  ponte.postMessage(messaggio)
}

/** Ascolta i messaggi del main process (evento `message` dal preload), solo oggetti. */
export function ascolta (gestore: (messaggio: Record<string, unknown>) => void): void {
  window.addEventListener('message', (evento: MessageEvent<unknown>) => {
    const messaggio = evento.data
    if (typeof messaggio !== 'object' || messaggio === null) return
    gestore(messaggio as Record<string, unknown>)
  })
}

/**
 * Un elemento con dentro del testo, sempre via `textContent` (mai `innerHTML`:
 * sono nomi scritti dal docente). `null` e `undefined` lo lasciano vuoto; lo zero si scrive.
 */
export function elemento<K extends keyof HTMLElementTagNameMap> (
  nome: K,
  classe?: string | null,
  testo?: string | number | null,
): HTMLElementTagNameMap[K] {
  const nato = document.createElement(nome)
  if (classe) nato.className = classe
  if (testo !== undefined && testo !== null) nato.textContent = String(testo)
  return nato
}

/** Un elemento del markup per id; se manca è un errore della pagina, e lo si dice per nome. */
export function perId<T extends HTMLElement = HTMLElement> (id: string): T {
  const trovato = document.getElementById(id)
  // testo-fisso: un errore di chi scrive la pagina, per la console
  if (!trovato) throw new Error(`la pagina non ha l'elemento #${id}`)
  return trovato as T
}

/** Gli attributi che si leggono e che il markup riceve dal catalogo: `data-testo-title` & co. */
const ATTRIBUTI_DA_LEGGERE = ['title', 'aria-label', 'placeholder'] as const

/**
 * Scrive nel markup i testi del catalogo: `data-testo` riempie il contenuto,
 * `data-testo-title`, `-aria-label` e `-placeholder` gli attributi omonimi. Un
 * nome che il catalogo non ha lascia l'elemento com'è.
 */
export function riempi (testi: Readonly<Record<string, unknown>>): void {
  const testo = (nome: string | undefined): string | null => {
    const trovato = nome === undefined ? undefined : testi[nome]
    return typeof trovato === 'string' ? trovato : null
  }
  for (const nodo of document.querySelectorAll<HTMLElement>('[data-testo]')) {
    const scritto = testo(nodo.dataset.testo)
    if (scritto !== null) nodo.textContent = scritto
  }
  for (const attributo of ATTRIBUTI_DA_LEGGERE) {
    for (const nodo of document.querySelectorAll<HTMLElement>(`[data-testo-${attributo}]`)) {
      const scritto = testo(nodo.getAttribute(`data-testo-${attributo}`) ?? undefined)
      if (scritto !== null) nodo.setAttribute(attributo, scritto)
    }
  }
}

/** Esc chiude, in ogni pagina. */
export function allEsc (gesto: () => void): void {
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') gesto()
  })
}
