// Una dettatura, e la frase che ne viene fuori.
//
// Sta a parte dai due pannelli per la stessa ragione di `conversation.ts`: li
// riguarda tutti e due allo stesso modo — il riquadro dentro il registro e la
// finestra staccata mandano la stessa busta e aspettano lo stesso messaggio — e
// scritto in uno e copiato nell'altro sarebbero due traduzioni della stessa
// cosa, con la seconda indietro di un cambiamento.
//
// **Non riceve l'archivio, e non gli serve.** Una trascrizione non legge il
// registro e non lo scrive: prende della voce e torna del testo, che chi ha
// parlato deve ancora rileggere prima di mandarlo. È la ragione per cui questo
// file è corto e per cui può stare fuori da ogni coda.

import { trascrivi } from '../data/dictation.js'
import type { Dettatura, MessaggioCorredo, MessaggioDettatura } from '../protocol.js'

/**
 * Trascrive quel che è arrivato dal microfono e rimanda indietro una frase.
 *
 * Non solleva mai: ogni modo di andare storto — il programma che manca, il
 * silenzio, l'attesa scaduta — torna come `ok: false` con dentro il motivo già
 * in italiano, perché dall'altra parte c'è una riga sotto una casella e non un
 * registro di errori.
 *
 * I campioni arrivano dalla pagina e non si controllano qui: sono numeri, e
 * l'unica cosa che se ne fa è scriverli in un file temporaneo. Quanto ne entra
 * lo decide `data/dictation.ts`, che taglia alla durata massima — senza,
 * bastarebbe una busta gonfiata a mano per far scrivere un file da un gigabyte.
 *
 * Quando il corredo manca e il registro se lo va a prendere, prima della frase
 * partono gli avanzamenti. Passano di qui e non da un canale loro perché è la
 * stessa attesa: la pagina ha premuto un microfono e aspetta una risposta, e
 * quel che sta succedendo in mezzo porta il numero di quella dettatura.
 */
export async function rispondiDettatura (
  dettatura: Dettatura,
  invia: (messaggio: MessaggioDettatura | MessaggioCorredo) => void,
): Promise<void> {
  const esito = await trascrivi(
    {
      // Ricostruito e non usato com'è: quel che esce dal canale è una vista su
      // un buffer di cui non si sa niente, e `Int16Array.from` garantisce che
      // sia un vettore di numeri a 16 bit anche quando dall'altra parte c'era
      // altro.
      campioni: Int16Array.from(dettatura.campioni ?? []),
      frequenza: Number(dettatura.frequenza) || 16000,
    },
    (avanzamento) => {
      invia({
        tipo: 'dettatura.corredo',
        id: dettatura.id,
        titolo: avanzamento.titolo,
        byte: avanzamento.byte,
        totale: avanzamento.totale,
        ...(avanzamento.finito ? { finito: true } : {}),
      })
    },
  )
  invia({
    tipo: 'dettatura',
    id: dettatura.id,
    ok: esito.ok,
    ...(esito.ok ? { testo: esito.testo } : { motivo: esito.motivo }),
  })
}
