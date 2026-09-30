// Lo schermo per la classe, comandato dal pannello del docente.
// Non toccano il registro: tornano `invariato`, per non rispedirlo a ogni cambio di vista.
// Chi sa comandare lo schermo (`desktop/pannelli/projection.ts`) si iscrive
// all'accensione, perché `core` non importa `desktop` (`tools/layers.mjs`).

import type { ImpostazioniProiezione, MiraProiezione } from '../../contract/protocollo.js'
import { invariato, type EsitoAzione, type Parte } from './context.js'
import { testi } from './projection.testi.js'

/** Quel che l'ospite sa fare dello schermo per la classe. */
export interface Proiettore {
  apri: () => Promise<void>
  chiudi: () => void
  mira: (mira: MiraProiezione) => void
  imposta: (impostazioni: ImpostazioniProiezione) => void
}

/** `null` finché l'app non è accesa, e allora si rifiuta. */
let proiettore: Proiettore | null = null

export function registraProiettore (chi: Proiettore | null): void {
  proiettore = chi
}

function spento (): EsitoAzione {
  return { ok: false, codice: 'non-disponibile', errori: [testi().spento] }
}

export const proiezione = {
  'proiezione.apri': async (_contesto, _azione) => {
    if (!proiettore) return spento()
    await proiettore.apri()
    return invariato
  },

  'proiezione.chiudi': (_contesto, _azione) => {
    if (!proiettore) return spento()
    proiettore.chiudi()
    return invariato
  },

  'proiezione.mira': (_contesto, azione) => {
    if (!proiettore) return spento()
    proiettore.mira(azione.mira)
    return invariato
  },

  'proiezione.impostazioni': (_contesto, azione) => {
    if (!proiettore) return spento()
    proiettore.imposta(azione.impostazioni)
    return invariato
  },
} satisfies Parte
