// Il logo dell'applicazione a colori, nella barra del titolo. Sorgente unica:
// `resources/registro-app-piccola.svg`, la variante per 16–48 px da cui
// `npm run icons` fa anche le misure piccole del `.ico`. Si carica dalla radice
// dell'applicazione (`radiceApp`, permessa dalla CSP); finché lo stato non
// arriva, al suo posto c'è il segno a tratto di `icons.ts`.

import { h } from '../dom.js'
import { stato } from '../state.js'
import { icona } from './icons.js'

/** Il file del logo, relativo alla radice dell'applicazione. */
const LOGO = 'resources/registro-app-piccola.svg'

/** Il logo a colori, alla misura che gli dà la classe. Decorativo: il nome lo dice chi gli sta accanto. */
export function logo (classe: string): HTMLElement | SVGSVGElement {
  if (!stato.radiceApp) return icona('registro', classe)
  const radice = stato.radiceApp.replace(/\/$/, '')
  return h('img', {
    class: ['logo', classe],
    attr: { src: `${radice}/${LOGO}`, alt: '', draggable: 'false', 'aria-hidden': 'true' },
  })
}
