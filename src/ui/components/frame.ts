// La cornice che mostra un documento, e che un ridisegno non spegne: un
// `<iframe>` tolto dal documento ricarica, e perderebbe pagina e zoom a ogni
// battito dell'orologio. Il telaio sta quindi in fondo alla pagina, appeso una
// volta, e insegue con posizione fissa il segnaposto che la vista mette al
// posto suo.

import { h } from '../dom.js'
import { testi } from './frame.testi.js'

let ospite: HTMLDivElement | null = null
let telaio: HTMLIFrameElement | null = null

/** Il segnaposto che l'ultima vista disegnata ha dichiarato, se ce n'è uno. */
let posto: HTMLElement | null = null

/**
 * Che cosa mostra il telaio adesso. Si confronta questa chiave e non
 * l'indirizzo: un documento rifatto ha lo stesso percorso, e solo una chiave
 * nuova lo fa ricaricare.
 */
let chiave: string | null = null

/** L'ultimo rettangolo applicato: si riscrive lo stile solo quando cambia. */
let misura = ''

let giroAcceso = false

function costruisci (): void {
  if (ospite) return
  telaio = h('iframe', { class: 'cornice-fissa__telaio' })
  ospite = h('div', { class: 'cornice-fissa' }, telaio)
  ospite.hidden = true
  document.body.appendChild(ospite)
}

/**
 * Mette il telaio dove sta il segnaposto, e lo nasconde quando il segnaposto
 * non c'è più. Un giro a ogni fotogramma, finché un documento è aperto: il
 * segnaposto si sposta per troppe ragioni per ascoltarle tutte.
 */
function segui (): void {
  if (!ospite) {
    giroAcceso = false
    return
  }
  // Niente segnaposto: il telaio si nasconde senza perdere quel che ha caricato,
  // e tornando il documento è già lì.
  if (!posto || !posto.isConnected) {
    ospite.hidden = true
    misura = ''
    giroAcceso = false
    return
  }

  const rettangolo = posto.getBoundingClientRect()
  if (rettangolo.width < 1 || rettangolo.height < 1) {
    ospite.hidden = true
  } else {
    const adesso = `${rettangolo.top}:${rettangolo.left}:${rettangolo.width}:${rettangolo.height}`
    if (adesso !== misura) {
      misura = adesso
      ospite.style.top = `${rettangolo.top}px` // testo-fisso: misura CSS
      ospite.style.left = `${rettangolo.left}px` // testo-fisso: misura CSS
      ospite.style.width = `${rettangolo.width}px` // testo-fisso: misura CSS
      ospite.style.height = `${rettangolo.height}px` // testo-fisso: misura CSS
    }
    ospite.hidden = false
  }
  requestAnimationFrame(segui)
}

/**
 * Il segnaposto della cornice, da mettere nella vista dove il documento deve
 * comparire. Cambiando `chiave` il telaio ricarica; uguale, resta com'è.
 */
export function corniceDocumento (opzioni: {
  indirizzo: string
  chiave: string
  titolo: string
}): HTMLElement {
  costruisci()
  if (telaio) {
    telaio.setAttribute('title', testi().anteprima(opzioni.titolo))
    if (chiave !== opzioni.chiave) {
      chiave = opzioni.chiave
      telaio.setAttribute('src', opzioni.indirizzo)
    }
  }

  posto = h('div', { class: 'cornice-posto' })
  if (!giroAcceso) {
    giroAcceso = true
    requestAnimationFrame(segui)
  }
  return posto
}
