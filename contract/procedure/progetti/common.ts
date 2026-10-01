// Le guardie delle procedure di `progetti`: il progetto e il compito si
// cercano qui, con il rimedio per ritrovarli. Il resto (persone della classe,
// ore del corso, livelli della scala) lo controlla il gestore, che risponde
// allo stesso modo al pannello.

import { progettoPerId } from '../../../core/dominio/projects.js'
import type { CompitoProgetto, Progetto } from '../../../core/dominio/models.js'
import { errore, type Ambito } from '../../contract.js'
import { testi } from './progetti.testi.js'

export function esigiProgetto (ambito: Ambito, progettoId: string): Progetto {
  const progetto = progettoPerId(ambito.contesto.registro, progettoId)
  if (!progetto) throw errore.nonTrovato('progetto', testi().comune.rimedioProgetti)
  return progetto
}

export function esigiCompito (
  ambito: Ambito,
  ingresso: { progettoId: string, compitoId: string },
): CompitoProgetto {
  const progetto = esigiProgetto(ambito, ingresso.progettoId)
  const compito = progetto.compiti.find((c) => c.id === ingresso.compitoId)
  if (!compito) throw errore.nonTrovato('compitoProgetto', testi().comune.rimedioCompiti)
  return compito
}
