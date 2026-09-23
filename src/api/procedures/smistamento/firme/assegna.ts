import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/**
 * Le pagine archiviate come foglio firme di una richiesta.
 *
 * Non idempotente per lo stesso motivo delle altre: la seconda volta la
 * richiesta «ha già il foglio».
 */
export const procedura = definisci({
  nome: 'smistamento.firme.assegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Archivia le pagine scelte come foglio firme di una richiesta',
  azione: 'smistamento.assegnaFirme',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore({ aiuto: 'La richiesta di cui questo è il foglio firme' }),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.assegnaFirme'], (i: typeof ingresso) => ({
      tipo: 'smistamento.assegnaFirme' as const, ...i,
    }))(ambito, ingresso)
  },
})
