// Il logo dell'applicazione a colori, nella barra del titolo. Sorgente unica:
// `resources/registro-app-piccola.svg`, la variante per 16–48 px da cui
// `npm run icons` fa anche le misure piccole del `.ico`. Si carica dalla radice
// dell'applicazione (`radiceApp`, permessa dalla CSP; prima che lo stato
// arrivi, `registro://app`).

import { h } from '../dom.js'
import { stato } from '../state.js'

/** Il file del logo, relativo alla radice dell'applicazione. */
const LOGO = 'resources/registro-app-piccola.svg'

/** Il logo a colori, alla misura che gli dà la classe. Decorativo: il nome lo dice chi gli sta accanto. */
export function logo (classe: string): HTMLElement {
  const radice = (stato.radiceApp ?? 'registro://app').replace(/\/$/, '')
  const src = `${radice}/${LOGO}`
  const immagine = h('img', {
    class: ['logo', classe],
    // `data-tieni`: fra un ridisegno e l'altro resta lo stesso nodo, che non
    // ricarica il file e non lampeggia. Le misure scritte tengono il posto
    // prima che il file arrivi.
    dataset: { tieni: src },
    attr: { src, alt: '', width: 20, height: 20, draggable: 'false', 'aria-hidden': 'true' },
  })
  // Un file che non arriva non lascia il riquadro dell'immagine rotta: il posto resta, vuoto.
  immagine.addEventListener('error', () => { immagine.style.visibility = 'hidden' }, { once: true })
  return immagine
}
