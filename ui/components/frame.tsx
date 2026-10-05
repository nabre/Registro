// La cornice che mostra un documento, in React, e che un ridisegno non spegne:
// un `<iframe>` tolto dal documento ricarica, e perderebbe pagina e zoom a ogni
// battito dell'orologio. React tiene lo stesso nodo finché la chiave resta; la
// struttura intorno è fissa, perché un iframe spostato sotto un altro genitore
// ricarica lo stesso.

import type { ReactElement } from 'react'

import { testi } from '#ui/components/frame.testi.js'

/**
 * La cornice, da mettere nella vista dove il documento deve comparire.
 * Cambiando `chiave` il telaio ricarica; uguale, resta com'è. Si confronta la
 * chiave e non l'indirizzo: un documento rifatto ha lo stesso percorso, e solo
 * una chiave nuova lo fa ricaricare.
 */
export function CorniceDocumento ({ indirizzo, chiave, titolo }: {
  indirizzo: string
  chiave: string
  titolo: string
}): ReactElement {
  return (
    <div className="cornice-posto">
      <iframe
        key={chiave}
        className="cornice-posto__telaio"
        src={indirizzo}
        title={testi().anteprima(titolo)}
      />
    </div>
  )
}
