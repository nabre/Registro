import { valutazioni } from '../../../../actions/assessments.js'
import type { RuoloAllegato } from '../../../../domain/models.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, scelta } from '../../../schemas.js'
import { esigiMomento } from '../common.js'
import { testi } from '../valutazioni.testi.js'

const t = () => testi().allegato.aggiungi

/**
 * I cinque ruoli di un foglio appeso a una prova. Scritti qui perché lo schema
 * li vuole in compilazione; il `satisfies` controlla che siano ruoli del
 * modello, non che ci siano tutti.
 */
const RUOLI = [
  'verifica', 'soluzione', 'prova', 'recupero', 'recupero-soluzione',
] as const satisfies readonly RuoloAllegato[]

export const procedura = scrittura({
  nome: 'valutazioni.allegato.aggiungi',
  titolo: () => t().titolo,
  azione: 'allegato.aggiungi',
  // Apre un dialogo e copia un file: ritentare vuol dire scegliere di nuovo.
  idempotente: false,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    ruolo: scelta(RUOLI, { aiuto: () => t().ruolo }),
    // Con `ruolo: 'recupero'` l'allievo è facoltativo (senza, è il testo comune
    // della prova di recupero). Il protocollo ammette sia chiave assente sia `null`.
    allievoId: opzionale(nullabile(identificatore({ aiuto: () => t().allievoId }))),
  }),
  esegui: (ambito, ingresso) => {
    // Il resto (ruolo «prova» con un allievo, classe, anno aperto) lo controlla il
    // gestore prima di aprire il dialogo.
    esigiMomento(ambito, ingresso.valutazioneId)
    return inoltra(valutazioni, 'allegato.aggiungi')(ambito, ingresso)
  },
})
