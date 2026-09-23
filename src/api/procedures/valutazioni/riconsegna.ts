import { valutazioni } from '../../../actions/assessments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../schemas.js'
import { esigiMomento } from './common.js'

export const procedura = definisci({
  nome: 'valutazioni.riconsegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'La prova corretta tornata in mano a tutta la classe, in un colpo',
  azione: 'valutazione.riconsegna',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    // `il: string | null` nel protocollo: la chiave c'è sempre, e `null` è la
    // scelta di togliere la data a tutti. Quindi `nullabile` da solo.
    il: nullabile(iso({ aiuto: 'null toglie la data a tutti e rimette la prova fra quelle da ridare' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return daGestore(valutazioni['valutazione.riconsegna'], (i: typeof ingresso) => ({
      tipo: 'valutazione.riconsegna' as const, ...i,
    }))(ambito, ingresso)
  },
})
