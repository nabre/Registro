// Aprire una pagina del registro da fuori (anche dall'assistente); torna
// `invariato`. Chi sa aprirla (`src/startup.ts`, strato `desktop`) si iscrive
// all'accensione, perché `core` non importa `desktop` (`tools/layers.mjs`).

import type { MessaggioNavigazione } from '../protocol.js'
import { invariato, type Parte } from './context.js'
import { testi } from './view.testi.js'

/** Chi sa portare il registro su una pagina; `null` finché l'app non è accesa, e allora si rifiuta. */
let vaiA: ((navigazione: MessaggioNavigazione) => void) | null = null

export function registraNavigatore (
  apri: ((navigazione: MessaggioNavigazione) => void) | null,
): void {
  vaiA = apri
}

export const vista = {
  'vista.apri': (_contesto, azione) => {
    if (!vaiA) {
      return {
        ok: false,
        codice: 'non-disponibile',
        errori: [testi().nonAperto],
      }
    }
    vaiA({
      tipo: 'naviga',
      vista: azione.vista,
      ...(azione.elementoId ? { elementoId: azione.elementoId } : {}),
      ...(azione.data ? { data: azione.data } : {}),
    })
    return invariato
  },
} satisfies Parte
