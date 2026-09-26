// Guardie, elenchi di valori e pezzi di schema delle procedure di `ore`.

import { contaUd } from '../../../domain/calculations.js'
import { classeDellaLezione } from '../../../domain/courses.js'
import type { Lezione, SegnoOsservato, StatoLezione } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { esaustivo } from '../../schemas.js'
import { esigiLezione as lezioneDaEsigere } from '../common/plans.js'
import { testi } from './ore.testi.js'

// Gli stati dell'appello stanno in `common/rollCall.ts`, perché li usa anche
// `persone.assenze`.

export const STATI_LEZIONE = esaustivo<StatoLezione>()([
  'pianificata', 'svolta', 'annullata',
] as const)

export const SEGNI = esaustivo<SegnoOsservato>()(['positivo', 'negativo'] as const)

/** La lezione, o il motivo per cui non c'è. */
export function esigiLezione (ambito: Ambito, lezioneId: string): Lezione {
  return lezioneDaEsigere(
    ambito,
    lezioneId,
    testi().comune.rimedioLezione,
  )
}

/**
 * Quell'unità didattica esiste in quell'ora. Lo schema si ferma a
 * `massimo: 32`; le righe dell'appello sono lunghe `contaUd(lezione)`, e un
 * indice oltre la fine passerebbe con `ok: true` senza cambiare niente.
 */
export function esigiUd (ambito: Ambito, lezione: Lezione, ud: number): void {
  const quante = contaUd(lezione, ambito.contesto.registro.impostazioni.minutiUd)
  if (ud >= quante) {
    throw errore.rifiuta(testi().comune.udInesistente(quante))
  }
}

/**
 * Quella persona è iscritta alla classe di quell'ora: un allievoId sbagliato
 * creerebbe una riga d'appello che nessuno toglierebbe più.
 */
export function esigiIscritto (ambito: Ambito, lezione: Lezione, allievoId: string): void {
  const classe = classeDellaLezione(ambito.contesto.registro, lezione)
  if (!classe) return
  if (!classe.allievi.some((a) => a.id === allievoId)) {
    throw errore.rifiuta(testi().comune.nonInClasse)
  }
}
