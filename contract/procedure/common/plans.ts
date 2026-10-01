// Le guardie dei piani che più aree condividono (vedi `common/register.ts`).

import type { Lezione, PianoLezione } from '../../../core/dominio/models.js'
import { errore, type Ambito } from '../../contract.js'
import { testi } from './common.testi.js'

/** Il piano, o il motivo per cui non c'è. Il rimedio dice dove si trovano i piani. */
export function esigiPiano (ambito: Ambito, pianoId: string): PianoLezione {
  const piano = ambito.contesto.registro.piani.find((p) => p.id === pianoId)
  if (!piano) throw errore.nonTrovato('pianoLezione', testi().rimedioPiani)
  return piano
}

/**
 * L'ora a cui il piano si aggancia, o il motivo per cui non c'è. Il rimedio
 * dice dove si trovano le ore: senza, un modello riprova con altri id inventati.
 */
export function esigiLezione (ambito: Ambito, lezioneId: string): Lezione {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) throw errore.nonTrovato('lezione', testi().rimedioLezione)
  return lezione
}
