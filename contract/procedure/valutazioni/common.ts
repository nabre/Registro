// Guardie, elenchi di valori e pezzi di schema delle procedure di `valutazioni`.

import { errore, type Ambito } from '../../contract.js'
import { testi } from './valutazioni.testi.js'

export function esigiMomento (ambito: Ambito, valutazioneId: string) {
  const momento = ambito.contesto.registro.valutazioni.find((v) => v.id === valutazioneId)
  if (!momento) {
    throw errore.nonTrovato('momento', testi().comune.rimedioMomento)
  }
  return momento
}

/**
 * Il foglio, o il motivo per cui non c'è. Due «non trovato» distinti: momento
 * eliminato (si rilegge e si ritenta) o allegato già tolto (è già la cosa
 * voluta).
 */
export function esigiAllegato (ambito: Ambito, valutazioneId: string, allegatoId: string) {
  const momento = esigiMomento(ambito, valutazioneId)
  const allegato = momento.allegati.find((a) => a.id === allegatoId)
  if (!allegato) throw errore.nonTrovato('allegato')
  return allegato
}
