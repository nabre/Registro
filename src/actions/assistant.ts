// Stacca l'assistente: dal riquadro a destra a una finestra sua.
//
// Non tocca il registro: apre una finestra e le passa la conversazione. Torna
// `invariato` proprio per questo — rispedire tutto il registro al pannello
// perché si è staccato un riquadro sarebbe lavoro fatto per niente.
//
// ------------------------------------------------- perché la finestra si iscrive
//
// Il gemello di questo file, `actions/projection.ts`, importa `pannelli/` e basta,
// con una deroga dichiarata in `tools/layers.mjs`. Qui non si può: il
// centralino delle azioni è raggiunto **dall'elenco delle procedure**, e la
// finestra dell'assistente ha bisogno del livello API per rispondere alle
// domande. I due percorsi si chiudevano in un anello —
//
//   api/indice → procedure/assistente/stacca → azioni/assistente →
//   pannelli/assistente → pannelli/conversazione → api/trasporti/assistente →
//   api/indice
//
// — che `npm run layers` ha trovato, e che dice come va detto: un ciclo non è
// un guasto finché nessuno dei due file legge a livello di modulo un valore
// dell'altro, ma è il posto da cui quel guasto nasce.
//
// Quindi si inverte: qui non si sa che esista una finestra, si sa che qualcuno
// può aprirne una. Chi la sa aprire si iscrive all'accensione
// (`avviaAssistente` in `panels/assistant.ts`), che è la stessa inversione
// con cui quel file si fa consegnare l'archivio e il contesto. Come effetto
// secondario sparisce anche la deroga fra strati: da qui non si esce più verso
// `pannelli/`.

import type { ContestoAssistente, GiroAssistente, TurnoAssistente } from '../protocol.js'
import { invariato, rifiuta, type Parte } from './context.js'

/**
 * Chi sa aprire la finestra dell'assistente, quando c'è.
 *
 * `null` finché l'applicazione non è accesa: in una prova che esercita il
 * centralino senza un guscio intorno non c'è nessuna finestra da aprire.
 *
 * **Torna se ci è riuscito**, e non è un dettaglio: finché tornava `void`,
 * staccare rispondeva `ok` qualunque cosa fosse successo di là. Il riquadro si
 * era già svuotato e chiuso, la finestra non si apriva — assistente spento nel
 * frattempo, applicazione non ancora accesa — e la conversazione restava
 * **nel main process**, con dentro i nomi di una classe, senza nessuno che la
 * mostrasse e senza nessuno a cui tornare. Vedi `panels/assistant.ts`.
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
 * Dove sta guardando il registro, l'ultima volta che l'ha detto.
 *
 * **Uno solo e non uno per finestra.** Il registro è un pannello, e le sue
 * pagine sono quelle: la finestra staccata dell'assistente non ne ha una sua e
 * non saprebbe comporre un contesto — non ha il registro in mano. Tenerne uno
 * per conversazione vorrebbe dire una finestra staccata che chiede al buio.
 *
 * Non si persiste e non esce di qui: è il contorno di quel che si sta
 * guardando — nomi di classi, un id di persona — e riaprire il registro domani
 * con dentro la pagina di ieri direbbe al modello una cosa che non è più vera.
 */
let veduta: ContestoAssistente | null = null

/** Di che cosa si sta parlando, per chi deve comporre le istruzioni. */
export function contestoDelRegistro (): ContestoAssistente | null {
  return veduta
}

export const assistente = {
  // Il rientro non sta qui, e non è una dimenticanza: a riattaccare è la
  // finestra — `manda({ riattacca })` in `ui/assistantWindow.ts` —
  // perché è lei ad avere la conversazione in mano. Un'azione «riattacca»
  // partita dal pannello dovrebbe prima farsela dare, cioè un giro in più e un
  // modo in più di perderla.
  'assistente.stacca': (_contesto, azione) => {
    // Rifiuta invece di mentire.
    //
    // Chi stacca ha già svuotato il riquadro prima di chiamare — deve, o
    // resterebbero due cronologie che si contraddicono — e leggeva `ok: true`
    // anche quando di là non si apriva niente. Il risultato era una
    // conversazione con i nomi di una classe ferma nel main process, un
    // riquadro vuoto, e nessun messaggio: il rifiuto è quel che permette a chi
    // ha chiamato di rimettersela dentro.
    if (!apriFinestra) {
      return rifiuta('L’assistente non può staccarsi: non c’è nessuna finestra da aprire.')
    }
    if (!apriFinestra(azione.storia, azione.bozza ?? '', azione.giro)) {
      return rifiuta(
        'Non è stato possibile aprire la finestra dell’assistente: ' +
        'controlla che l’assistente sia acceso nelle impostazioni.',
      )
    }
    return invariato
  },

  // Arriva a ogni cambio di vista e non tocca il registro: `invariato` come la
  // mira della proiezione, e per la stessa ragione — rispedire tutto il
  // registro al pannello perché si è cambiata una tendina sarebbe lavoro fatto
  // per niente, venti volte al minuto.
  'assistente.contesto': (_contesto, azione) => {
    veduta = azione.contesto
    return invariato
  },
} satisfies Parte
