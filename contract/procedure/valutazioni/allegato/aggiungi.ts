import { valutazioni } from '../../../../core/azioni/assessments.js'
import type { RuoloAllegato } from '../../../../core/dominio/models.js'
import { inoltra, scrittura } from '../../../core.js'
import { esaustivo, identificatore, nullabile, oggetto, opzionale, scelta, testo } from '../../../schemas.js'
import { esigiMomento } from '../common.js'
import { testi } from '../valutazioni.testi.js'

const t = () => testi().allegato.aggiungi

/**
 * I cinque ruoli di un foglio appeso a una prova. Scritti qui perché lo schema
 * li vuole in compilazione; `esaustivo()` ne garantisce la completezza.
 */
const RUOLI = esaustivo<RuoloAllegato>()([
  'verifica', 'soluzione', 'prova', 'recupero', 'recupero-soluzione',
] as const)

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
    file: opzionale(testo({ aiuto: () => t().file })),
  }),
  esegui: (ambito, ingresso) => {
    // Il resto (ruolo «prova» con un allievo, classe, anno aperto) lo controlla il
    // gestore prima di aprire il dialogo.
    esigiMomento(ambito, ingresso.valutazioneId)
    return inoltra(valutazioni, 'allegato.aggiungi')(ambito, ingresso)
  },
})
