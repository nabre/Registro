// Una dettatura e la frase che ne viene fuori, comune ai due pannelli (il
// riquadro nel registro e la finestra staccata mandano la stessa busta).
// Non tocca l'archivio: prende voce e torna testo, quindi sta fuori da ogni coda.

import { trascrivi } from '../data/dictation.js'
import type { Dettatura, MessaggioDettatura } from '../protocol.js'

/**
 * Trascrive l'audio del microfono e rimanda la frase. Non solleva mai: ogni
 * errore torna come `ok: false` con il motivo leggibile. La durata massima la
 * taglia `data/dictation.ts`.
 */
export async function rispondiDettatura (
  dettatura: Dettatura,
  invia: (messaggio: MessaggioDettatura) => void,
): Promise<void> {
  const esito = await trascrivi({
    // Ricostruito: dal canale arriva una vista su un buffer ignoto, così è
    // sempre un vettore a 16 bit.
    campioni: Int16Array.from(dettatura.campioni ?? []),
    frequenza: Number(dettatura.frequenza) || 16000,
  })
  invia({
    tipo: 'dettatura',
    id: dettatura.id,
    ok: esito.ok,
    ...(esito.ok ? { testo: esito.testo } : { motivo: esito.motivo }),
  })
}
