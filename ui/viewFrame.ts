// La chiave di telaio della radice di una vista (ADR-48): `vista:<nome>`.
// Una vista convertita a React la mette sulla sua radice; le prove la leggono.

import { stato } from './state.js'

export function telaioVista (): string {
  // testo-fisso: una chiave, non un testo
  return `vista:${stato.vista}`
}
