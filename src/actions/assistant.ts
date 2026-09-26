// Stacca l'assistente dal riquadro a una finestra sua; non tocca il registro
// (torna `invariato`).
//
// La finestra si iscrive all'accensione (`avviaAssistente` in
// `panels/assistant.ts`) invece di essere importata da qui: importare `panels/`
// chiuderebbe un ciclo api → azioni → pannelli → api.

import type { ContestoAssistente, GiroAssistente, TurnoAssistente } from '../protocol.js'
import { invariato, rifiuta, type Parte } from './context.js'
import { testi } from './llm.testi.js'

/**
 * Chi sa aprire la finestra dell'assistente (`null` finché l'app non è accesa).
 * Torna se ci è riuscito, così `assistente.stacca` può rifiutare.
 */
type ApriFinestra = (
  storia: readonly TurnoAssistente[],
  bozza: string,
  /** La domanda ancora senza risposta, quando si stacca mentre si aspetta. */
  giro?: GiroAssistente,
) => boolean

let apriFinestra: ApriFinestra | null = null

export function registraFinestraAssistente (apri: ApriFinestra): void {
  apriFinestra = apri
}

/**
 * Dove sta guardando il registro, l'ultima volta che l'ha detto. Uno solo,
 * condiviso anche dalla finestra staccata; non si persiste.
 */
let veduta: ContestoAssistente | null = null

/** Di che cosa si sta parlando, per chi deve comporre le istruzioni. */
export function contestoDelRegistro (): ContestoAssistente | null {
  return veduta
}

export const assistente = {
  // Il rientro lo fa la finestra (`manda({ riattacca })` in
  // `ui/assistantWindow.ts`), che ha la conversazione in mano.
  'assistente.stacca': (_contesto, azione) => {
    // Rifiuta se la finestra non si apre: chi chiama ha già svuotato il
    // riquadro e deve potersi rimettere dentro la conversazione.
    if (!apriFinestra) {
      return rifiuta(testi().nonSiStacca)
    }
    if (!apriFinestra(azione.storia, azione.bozza ?? '', azione.giro)) {
      return rifiuta(testi().finestraNonAperta)
    }
    return invariato
  },

  // Arriva a ogni cambio di vista: `invariato`, per non rispedire il registro.
  'assistente.contesto': (_contesto, azione) => {
    veduta = azione.contesto
    return invariato
  },
} satisfies Parte
