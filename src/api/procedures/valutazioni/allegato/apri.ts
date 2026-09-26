import { valutazioni } from '../../../../actions/assessments.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiAllegato } from '../common.js'
import { testi } from '../valutazioni.testi.js'

export const procedura = scrittura({
  nome: 'valutazioni.allegato.apri',
  titolo: () => testi().allegato.apri.titolo,
  azione: 'allegato.apri',
  // Non tocca il registro (`collezioni` vuoto), ma è `scrittura`: ha un effetto
  // fuori di qui, e «lettura» vuol dire una domanda che non fa succedere niente.
  idempotente: true,
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allegatoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiAllegato(ambito, ingresso.valutazioneId, ingresso.allegatoId)
    return inoltra(valutazioni, 'allegato.apri')(ambito, ingresso)
  },
})
