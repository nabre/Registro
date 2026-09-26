// Le bandiere delle lingue, per le schede con cui la lingua si sceglie.
//
// SVG costruito a elementi: le pagine che le mostrano hanno una CSP che non
// carica immagini, e Windows non disegna le emoji delle bandiere.

import type { Lingua } from './languages.js'

// testo-fisso: lo spazio dei nomi dell'SVG
const SVG = 'http://www.w3.org/2000/svg'

/** Un pezzo di disegno: il nome dell'elemento SVG e i suoi attributi. */
type Forma = readonly [tag: 'rect' | 'path' | 'polygon', attributi: Readonly<Record<string, string>>]

interface Disegno {
  viewBox: string
  forme: readonly Forma[]
}

/** Tre fasce verticali, come le bandiere italiana e francese. */
function verticali (a: string, b: string, c: string): Disegno {
  return {
    viewBox: '0 0 3 2',
    forme: [
      ['rect', { width: '1', height: '2', fill: a }],
      ['rect', { x: '1', width: '1', height: '2', fill: b }],
      ['rect', { x: '2', width: '1', height: '2', fill: c }],
    ],
  }
}

/** Tre fasce orizzontali, come la bandiera tedesca. */
function orizzontali (a: string, b: string, c: string): Disegno {
  return {
    viewBox: '0 0 5 3',
    forme: [
      ['rect', { width: '5', height: '1', fill: a }],
      ['rect', { y: '1', width: '5', height: '1', fill: b }],
      ['rect', { y: '2', width: '5', height: '1', fill: c }],
    ],
  }
}

/**
 * La Union Jack con le diagonali rosse come quattro poligoni già tagliati:
 * un `clipPath` vorrebbe un id, conteso fra due bandiere nella stessa pagina.
 */
const REGNO_UNITO: Disegno = {
  viewBox: '0 0 60 30',
  forme: [
    ['rect', { width: '60', height: '30', fill: '#012169' }],
    ['path', { d: 'M0,0 L60,30 M60,0 L0,30', stroke: '#fff', 'stroke-width': '6' }],
    ['polygon', { points: '0,0 30,15 29.1,16.8 -0.9,1.8', fill: '#c8102e' }],
    ['polygon', { points: '30,15 60,30 60.9,28.2 30.9,13.2', fill: '#c8102e' }],
    ['polygon', { points: '30,15 0,30 0.9,31.8 30.9,16.8', fill: '#c8102e' }],
    ['polygon', { points: '60,0 30,15 29.1,13.2 59.1,-1.8', fill: '#c8102e' }],
    ['path', { d: 'M30,0 v30 M0,15 h60', stroke: '#fff', 'stroke-width': '10' }],
    ['path', { d: 'M30,0 v30 M0,15 h60', stroke: '#c8102e', 'stroke-width': '6' }],
  ],
}

const BANDIERE: Readonly<Record<Lingua, Disegno>> = {
  it: verticali('#009246', '#fff', '#ce2b37'),
  de: orizzontali('#000', '#dd0000', '#ffce00'),
  fr: verticali('#0055a4', '#fff', '#ef4135'),
  en: REGNO_UNITO,
}

/**
 * La bandiera di una lingua. Riempie il riquadro tagliando i bordi (`slice`),
 * così proporzioni diverse danno riquadri uguali.
 */
export function bandiera (lingua: Lingua, documento: Document = document): SVGSVGElement {
  const { viewBox, forme } = BANDIERE[lingua]
  const svg = documento.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('class', 'bandiera')
  for (const [tag, attributi] of forme) {
    const forma = documento.createElementNS(SVG, tag)
    for (const [nome, valore] of Object.entries(attributi)) forma.setAttribute(nome, valore)
    svg.append(forma)
  }
  return svg
}

/** Il segno di «come il sistema»: uno schermo, dentro un tondo. */
function schermo (documento: Document): SVGSVGElement {
  const svg = documento.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const tratti: ReadonlyArray<Readonly<Record<string, string>>> = [
    { d: 'M4 5h16v11H4z' },
    { d: 'M9 20h6M12 16v4' },
  ]
  for (const attributi of tratti) {
    const tratto = documento.createElementNS(SVG, 'path')
    tratto.setAttribute('d', attributi.d)
    tratto.setAttribute('fill', 'none')
    tratto.setAttribute('stroke', 'currentColor')
    tratto.setAttribute('stroke-width', '2')
    tratto.setAttribute('stroke-linejoin', 'round')
    tratto.setAttribute('stroke-linecap', 'round')
    svg.append(tratto)
  }
  return svg
}

function span (
  documento: Document,
  classe: string,
  ...dentro: Array<Node | string>
): HTMLSpanElement {
  const nato = documento.createElement('span')
  nato.className = classe
  nato.append(...dentro)
  return nato
}

/**
 * La figura di una scheda della lingua: la bandiera con la sigla, o per
 * «Sistema» le quattro in mosaico con uno schermo. Sta qui perché la usano sia
 * il pannello sia la finestra nativa, che dal pannello non importa.
 */
export function figuraLingua (
  valore: string,
  lingue: readonly Lingua[],
  documento: Document = document,
): HTMLSpanElement {
  const sua = lingue.find((candidata) => candidata === valore)
  if (sua) {
    const sigla = span(documento, 'figura-lingua__sigla', sua.toUpperCase())
    return span(documento, 'figura-lingua', bandiera(sua, documento), sigla)
  }
  return span(
    documento,
    'figura-lingua figura-lingua--sistema',
    span(documento, 'figura-lingua__mosaico', ...lingue.map((lingua) => bandiera(lingua, documento))),
    span(documento, 'figura-lingua__schermo', schermo(documento)),
  )
}
