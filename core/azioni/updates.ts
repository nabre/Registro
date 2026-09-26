// Gli aggiornamenti del programma: controllare, scaricare, installare.
// Il lavoro sta nell'apparato (`environment/updates.ts`); qui si decide se il
// gesto ha senso adesso e si dice perché no. Tornano `invariato`: l'esito
// arriva al pannello con `MessaggioAggiornamenti`.

import * as apparato from 'apparato'

import type { StatoAggiornamenti } from '../../contract/protocollo.js'
import { invariato, rifiuta, type Parte } from './context.js'
import { testi } from './updates.testi.js'

/** Perché da sé non si può, detto una volta per i tre gesti. */
function nonSupportato (): string {
  return apparato.aggiornamenti.stato().motivo ?? testi().nonSupportato
}

export const aggiornamenti = {
  'aggiornamenti.controlla': () => {
    if (!apparato.aggiornamenti.stato().supportato) return rifiuta(nonSupportato())
    void apparato.aggiornamenti.controlla()
    return invariato
  },

  'aggiornamenti.scarica': () => {
    const stato = apparato.aggiornamenti.stato()
    if (!stato.supportato) return rifiuta(nonSupportato())
    if (stato.fase === 'scarico' || stato.fase === 'pronto' || stato.fase === 'installazione') {
      return invariato
    }
    if (stato.fase !== 'disponibile') return rifiuta(testi().nienteDaScaricare)
    // Non atteso: lo scarico dura minuti e la coda delle scritture non si ferma.
    void apparato.aggiornamenti.scarica()
    return invariato
  },

  'aggiornamenti.installa': () => {
    const stato = apparato.aggiornamenti.stato()
    if (!stato.supportato) return rifiuta(nonSupportato())
    // Il secondo clic mentre la finestra si sta aprendo: è già in corso.
    if (stato.fase === 'installazione') return invariato
    if (!apparato.aggiornamenti.installa()) return rifiuta(testi().nienteDaInstallare)
    return invariato
  },

  'aggiornamenti.nascondiNotizia': (_contesto, azione: { notizia: string }) => {
    apparato.aggiornamenti.nascondiNotizia(azione.notizia)
    return invariato
  },
} satisfies Parte

/** Lo stato di adesso, per la lettura `aggiornamenti.stato` (le procedure non nominano l'apparato). */
export function statoDegliAggiornamenti (): StatoAggiornamenti {
  return apparato.aggiornamenti.stato()
}
