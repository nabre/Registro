// Il tondo con le iniziali accanto al nome: in un elenco l'occhio cerca per
// forma prima che per lettere. È `aria-hidden` e le iniziali sono un attributo
// disegnato dal CSS, così il testo della cella (quello copiato e letto dalle
// prove) resta il nome. La tinta viene dal nome, non dall'ordine: la stessa
// persona ha lo stesso colore ovunque.

import { h, type Figlio } from '../dom.js'
import { uriDato } from '../state.js'

/** Quel che basta per disegnare un tondo: il nome, e se c'è la foto. */
export interface Persona {
  nome: string
  cognome?: string
  /** Il ritratto, relativo alla cartella dei dati — come `Allievo.foto`. */
  foto?: string
}

/**
 * Otto tinte, come angoli sul cerchio dei colori; il foglio di stile ne fa
 * fondo e lettera con la stessa luminosità. Di più, due vicine si confondono.
 */
const TINTE = [25, 60, 95, 150, 190, 235, 280, 330] as const

/**
 * La prima lettera vera di una parola: `Array.from` e non `[0]`, perché una
 * lettera fuori dal piano di base spezzata darebbe un quadratino.
 */
function prima (parola: string | undefined): string {
  const lettera = Array.from(parola?.trim() ?? '')[0]
  return lettera ? lettera.toLocaleUpperCase() : ''
}

/**
 * Le iniziali, nome poi cognome. Senza cognome, prima e ultima parola del nome
 * intero: «Maria De Santis» è «MS».
 */
export function iniziali (persona: Persona): string {
  if (persona.cognome !== undefined) return prima(persona.nome) + prima(persona.cognome)
  const parole = persona.nome.trim().split(/\s+/).filter(Boolean)
  if (parole.length <= 1) return prima(parole[0])
  return prima(parole[0]) + prima(parole[parole.length - 1])
}

/** Lo stesso nome dà sempre la stessa tinta: un conto sulle lettere, non a caso. */
function tintaDi (persona: Persona): number {
  const chiave = `${persona.nome} ${persona.cognome ?? ''}`.trim().toLocaleLowerCase()
  let somma = 0
  for (const lettera of chiave) somma = (somma * 31 + (lettera.codePointAt(0) ?? 0)) >>> 0
  return TINTE[somma % TINTE.length]
}

/**
 * Il tondo: con la foto, ritagliata al centro alto, e sotto le iniziali, che
 * restano se il file non si apre.
 */
export function avatar (persona: Persona): HTMLElement {
  const indirizzo = uriDato(persona.foto)
  const tondo = h('span', {
    class: 'avatar',
    style: { '--avatar-tinta': String(tintaDi(persona)) },
    dataset: { iniziali: iniziali(persona) },
    attr: { 'aria-hidden': 'true' },
  })
  if (indirizzo) {
    const foto = h('img', {
      class: 'avatar__foto',
      attr: { src: indirizzo, alt: '', loading: 'lazy', decoding: 'async' },
    })
    foto.addEventListener('error', () => foto.remove(), { once: true })
    tondo.append(foto)
  }
  return tondo
}

/**
 * Il nome in una tabella: il tondo e accanto quel che la vista ci mette (nome,
 * collegamento, pastiglia). Sta dentro la cella, che resta `th`/`td` come la
 * vuole la tabella.
 */
export function cellaNome (persona: Persona, nome: Figlio, ...accanto: Figlio[]): HTMLElement {
  return h(
    'span',
    { class: 'cella-nome' },
    avatar(persona),
    h('span', { class: 'cella-nome__testo' }, nome, ...accanto),
  )
}
