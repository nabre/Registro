// L'isola in React (ADR-48, ADR-56): un pezzo della pagina che una lettura
// arrivata rifà da solo, senza ridisegnare tutto. Il disegno completo la rifà
// come il resto, con la funzione nuova; `ridisegnaIsola(chiave)` (`islands.ts`)
// rifà solo lei, con la funzione dell'ultimo disegno.

import {
  useLayoutEffect,
  useReducer,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'

import { iscriviIsola } from './islands.js'

export function Isola ({ chiave, disegna, ...attributi }: HTMLAttributes<HTMLDivElement> & {
  /** Unica nella pagina, e dice che cosa si guarda (`anteprima:<id del modello>`), non dove. */
  chiave: string
  disegna: () => ReactNode
}): ReactElement {
  const [, rifai] = useReducer((volte: number) => volte + 1, 0)
  // Subito: chi chiede di rifarla adesso (`rifaiIsolaAdesso`) ci trova il nodo nuovo.
  useLayoutEffect(() => iscriviIsola(chiave, () => flushSync(rifai)), [chiave])
  return <div {...attributi} data-isola={chiave}>{disegna()}</div>
}
