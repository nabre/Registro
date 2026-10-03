// Le guardie delle procedure di `progetti`: il progetto, la sua integrazione
// nel corso e il compito si cercano qui, con il rimedio per ritrovarli. Il
// resto (persone della classe, ore del corso, livelli della scala) lo
// controlla il gestore, che risponde allo stesso modo al pannello.

import { nelCorso, progettoPerId } from '#core/dominio/projects.js'
import type { CompitoProgetto, Progetto, ProgettoNelCorso } from '#core/dominio/models.js'
import { errore, type Ambito } from '#contract/contract.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { testi } from './progetti.testi.js'

export function esigiProgetto (ambito: Ambito, progettoId: string): Progetto {
  const progetto = progettoPerId(ambito.contesto.registro, progettoId)
  if (!progetto) throw errore.nonTrovato('progetto', testi().comune.rimedioProgetti)
  return progetto
}

/**
 * Il progetto visto dal corso. Un progetto che c'è ma non è integrato lì è un
 * rifiuto, non un «non trovato»: rileggere non basta, serve `progetti.integra`.
 */
export function esigiIntegrazione (
  ambito: Ambito,
  ingresso: { progettoId: string, corsoId: string },
): ProgettoNelCorso {
  esigiCorso(ambito, ingresso.corsoId)
  const vista = nelCorso(esigiProgetto(ambito, ingresso.progettoId), ingresso.corsoId)
  if (!vista) throw errore.rifiuta(testi().comune.nonIntegrato)
  return vista
}

export function esigiCompito (
  ambito: Ambito,
  ingresso: { progettoId: string, corsoId: string, compitoId: string },
): CompitoProgetto {
  const vista = esigiIntegrazione(ambito, ingresso)
  const compito = vista.compiti.find((c) => c.id === ingresso.compitoId)
  if (!compito) throw errore.nonTrovato('compitoProgetto', testi().comune.rimedioCompiti)
  return compito
}
