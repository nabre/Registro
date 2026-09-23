// Quel che le procedure di `valutazioni` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { CARTE, VALUTAZIONE } from '../../../domain/lexicon.js'
import { errore, type Ambito } from '../../contract.js'

export function esigiMomento (ambito: Ambito, valutazioneId: string) {
  const momento = ambito.contesto.registro.valutazioni.find((v) => v.id === valutazioneId)
  if (!momento) {
    throw errore.nonTrovato(
      VALUTAZIONE.momento,
      'I momenti di valutazione di un corso li elenca «valutazioni.elenco».',
    )
  }
  return momento
}

/**
 * Il foglio, o il motivo per cui non c'è.
 *
 * Due «non trovato» diversi — il momento e l'allegato — e non uno solo: chi
 * chiama da fuori deve poter distinguere «il momento è stato eliminato da
 * un'altra finestra» da «quel PDF l'ha già tolto qualcuno», perché il primo
 * caso si ritenta dopo aver riletto e il secondo è già la cosa voluta.
 */
export function esigiAllegato (ambito: Ambito, valutazioneId: string, allegatoId: string) {
  const momento = esigiMomento(ambito, valutazioneId)
  const allegato = momento.allegati.find((a) => a.id === allegatoId)
  if (!allegato) throw errore.nonTrovato(CARTE.allegato)
  return allegato
}
