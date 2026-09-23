import { valutazioni } from '../../../../actions/assessments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../../schemas.js'
import { esigiMomento } from '../common.js'

export const procedura = definisci({
  nome: 'valutazioni.voto.riconsegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Il giorno in cui una persona ha riavuto la sua prova corretta',
  azione: 'voto.riconsegna',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    il: nullabile(iso({ aiuto: 'null la rimette fra quelle da ridare' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return daGestore(valutazioni['voto.riconsegna'], (i: typeof ingresso) => ({
      tipo: 'voto.riconsegna' as const, ...i,
    }))(ambito, ingresso)
  },
})
