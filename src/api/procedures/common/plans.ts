// Le guardie dei piani che più aree condividono (vedi `common/register.ts`).

import type { Lezione, PianoLezione } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'

/** Il piano, o il motivo per cui non c'è. */
export function esigiPiano (ambito: Ambito, pianoId: string): PianoLezione {
  const piano = ambito.contesto.registro.piani.find((p) => p.id === pianoId)
  if (!piano) throw errore.nonTrovato('pianoLezione')
  return piano
}

/**
 * L'ora a cui il piano si aggancia, o il motivo per cui non c'è.
 * `suggerimento` è la seconda frase del «non trovato» (`ore/common.ts` ci
 * mette dove si trovano le ore).
 */
export function esigiLezione (ambito: Ambito, lezioneId: string, suggerimento?: string): Lezione {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) throw errore.nonTrovato('lezione', suggerimento)
  return lezione
}
