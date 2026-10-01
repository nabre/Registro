// La cornice che mostra un documento, e che un ridisegno non spegne: un
// `<iframe>` tolto dal documento ricarica, e perderebbe pagina e zoom a ogni
// battito dell'orologio. Il telaio sta nella vista come ogni altro nodo, ma è
// un nodo pesante (`data-tieni`): `dom.ts` lo sposta senza staccarlo finché la
// chiave è la stessa, e lo rifà solo quando la chiave cambia.

import { h } from '#ui/pannello/dom.js'
import { testi } from './frame.testi.js'

/**
 * La cornice, da mettere nella vista dove il documento deve comparire.
 * Cambiando `chiave` il telaio ricarica; uguale, resta com'è. Si confronta la
 * chiave e non l'indirizzo: un documento rifatto ha lo stesso percorso, e solo
 * una chiave nuova lo fa ricaricare.
 */
export function corniceDocumento (opzioni: {
  indirizzo: string
  chiave: string
  titolo: string
}): HTMLElement {
  return h(
    'div',
    { class: 'cornice-posto' },
    h('iframe', {
      class: 'cornice-posto__telaio',
      dataset: { tieni: opzioni.chiave },
      attr: { src: opzioni.indirizzo, title: testi().anteprima(opzioni.titolo) },
    }),
  )
}
