// Le guardie che più aree condividono, dal vecchio `procedure/piani.ts`.
//
// Stanno qui e non in una delle aree perché le usano aree diverse: tenerle in
// una di quelle vorrebbe dire che l'area A importa da B senza averci a che fare.

import { LEZIONE } from '../../../domain/lexicon.js'
import type { PianoLezione } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'

/** Il piano, o il motivo per cui non c'è. */
export function esigiPiano (ambito: Ambito, pianoId: string): PianoLezione {
  const piano = ambito.contesto.registro.piani.find((p) => p.id === pianoId)
  if (!piano) throw errore.nonTrovato(LEZIONE.pianoLezione)
  return piano
}

/** L'ora a cui il piano si aggancia, o il motivo per cui non c'è. */
export function esigiLezione (ambito: Ambito, lezioneId: string) {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) throw errore.nonTrovato(LEZIONE.lezione)
  return lezione
}
