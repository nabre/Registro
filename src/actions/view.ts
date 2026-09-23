// Aprire una pagina del registro, da fuori della pagina.
//
// Il menu nativo, il widget dell'agenda, l'icona accanto all'orologio e la
// palette lo fanno già, ognuno chiamando `apriRegistro` con un
// `MessaggioNavigazione` in mano. Questo è lo stesso gesto messo dietro il
// contratto, perché di qui passa anche l'assistente: chiedergli «fammi vedere
// le valutazioni della 4a» e ricevere in risposta la spiegazione di dove
// cliccare è il momento in cui si smette di usarlo.
//
// Non tocca il registro — apre una pagina — e torna `invariato` come le azioni
// della proiezione, per la stessa ragione: rispedire tutto il registro al
// pannello perché si è cambiata pagina sarebbe lavoro fatto per niente.
//
// ------------------------------------------------- perché il pannello si iscrive
//
// Chi sa aprire il pannello è `src/startup.ts`, che sta in `desktop`; questo file
// sta in `core`, e da core verso desktop non si esce — vedi `tools/layers.mjs`.
// Quindi si inverte, come in `actions/assistant.ts`: qui non si sa che esista un
// pannello, si sa che qualcuno può aprirne le pagine, e chi lo sa fare si
// iscrive all'accensione.

import type { MessaggioNavigazione } from '../protocol.js'
import { invariato, type Parte } from './context.js'

/**
 * Chi sa portare il registro su una pagina, quando c'è.
 *
 * `null` finché l'applicazione non è accesa. In una prova che esercita il
 * centralino senza un guscio intorno non c'è nessuna pagina da aprire, e si
 * risponde che non si può invece di far finta di sì: chi ha chiesto — il
 * modello dell'assistente — deve poterlo dire a chi l'ha domandato, altrimenti
 * annuncia di aver cambiato pagina a chi la vede ferma dov'era.
 */
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
        errori: ['Il registro non è aperto: non c’è nessuna pagina da mostrare.'],
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
