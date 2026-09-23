// Quel che le pagine native hanno in comune: il canale con il main process e il
// modo di fare un elemento.
//
// Prima ognuna delle quattro pagine se lo riscriveva dentro il proprio
// `<script>`, e le copie avevano già preso strade diverse: una scartava il
// testo vuoto, un'altra lo scriveva, una terza convertiva i numeri. Qui c'è una
// versione sola.
//
// Questo modulo, come le pagine che lo importano, gira dentro una finestra:
// ha il DOM e non ha Node. Del resto del progetto le pagine prendono soltanto
// **tipi** — `import type` — che esbuild cancella: nel bundle non entra una riga
// del main process.

/** Il ponte che il preload espone (`shell/preload.ts`). */
declare function acquireVsCodeApi (): { postMessage (messaggio: unknown): void }

const ponte = acquireVsCodeApi()

/**
 * Manda un messaggio al main process, sul canale del registro.
 *
 * Un canale solo per tutta l'applicazione: chi riceve riconosce il messaggio
 * dalla sua chiave — `dialogo`, `benvenuto`, `impostazioni`, `agenda` — e
 * `environment/windows.ts` scarta i mittenti che non conosce.
 */
export function manda (messaggio: unknown): void {
  ponte.postMessage(messaggio)
}

/**
 * Ascolta quel che arriva dal main process.
 *
 * Il preload lo ributta nella pagina come evento `message`; qui si scartano
 * subito le cose che non sono oggetti, così chi ascolta ha davanti almeno un
 * record da interrogare.
 */
export function ascolta (gestore: (messaggio: Record<string, unknown>) => void): void {
  window.addEventListener('message', (evento: MessageEvent<unknown>) => {
    const messaggio = evento.data
    if (typeof messaggio !== 'object' || messaggio === null) return
    gestore(messaggio as Record<string, unknown>)
  })
}

/**
 * Un elemento con dentro del testo.
 *
 * Mai `innerHTML`: quel che queste pagine mostrano sono nomi di classi, di
 * persone, di file scritti dal docente, e finiscono in `textContent`, che è
 * testo e resta testo. `null` e `undefined` lasciano l'elemento vuoto; un
 * numero si scrive com'è, zero compreso.
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

/**
 * Un elemento del markup, cercato per id.
 *
 * Se manca è un errore di chi ha scritto la pagina, non una condizione da
 * gestire: si dice subito e per nome, invece di un `null` che scoppia tre
 * righe più in là.
 */
export function perId<T extends HTMLElement = HTMLElement> (id: string): T {
  const trovato = document.getElementById(id)
  if (!trovato) throw new Error(`la pagina non ha l'elemento #${id}`)
  return trovato as T
}

/** Esc chiude: la via d'uscita che si prova per prima, e deve valere ovunque. */
export function allEsc (gesto: () => void): void {
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') gesto()
  })
}
