import { valutazioni } from '../../../../actions/assessments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiAllegato } from '../common.js'

export const procedura = definisci({
  nome: 'valutazioni.allegato.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un PDF da una prova e lo mette nel cestino del sistema',
  azione: 'allegato.elimina',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allegatoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiAllegato(ambito, ingresso.valutazioneId, ingresso.allegatoId)
    return daGestore(valutazioni['allegato.elimina'], (i: typeof ingresso) => ({
      tipo: 'allegato.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})
