// Pezzi comuni delle procedure di `calendario`: la forma di una regola, le
// fasce di una lezione proposta, e quale calendario leggere.

import type { Registro, SorgenteCalendario } from '../../../domain/models.js'
import { errore } from '../../contract.js'
import { booleano, identificatore, nullabile, oggetto, opzionale, ora, scelta, testo } from '../../schemas.js'
import { testi } from './calendario.testi.js'

const t = () => testi().comune

export const REGOLA = oggetto({
  id: opzionale(testo({ aiuto: () => t().regolaId })),
  testo: testo({ aiuto: () => t().regolaTesto, esempio: 'DIC4a CP' }),
  corsoId: nullabile(identificatore({ aiuto: () => t().regolaCorsoId })),
})

export const FASCIA = oggetto({
  inizio: ora(),
  fine: ora(),
  tipo: scelta(['lezione', 'pausa'] as const, { aiuto: () => t().fasciaTipo }),
  ics: opzionale(booleano({ aiuto: () => t().fasciaIcs })),
})

/**
 * Il calendario da leggere: quello chiesto, o il primo del documento. Non
 * tutti: due calendari con la stessa ora la proporrebbero due volte.
 */
export function calendarioDaLeggere (
  registro: Registro,
  calendarioId?: string,
): SorgenteCalendario {
  const calendari = registro.impostazioni.calendario?.calendari ?? []
  if (calendarioId) {
    const trovato = calendari.find((c) => c.id === calendarioId)
    if (!trovato) throw errore.nonTrovato('calendario')
    return trovato
  }
  const primo = calendari[0]
  if (!primo) throw errore.rifiuta(t().nessunCalendario)
  return primo
}

export const CALENDARIO_ID = identificatore({ aiuto: () => t().calendarioId })
