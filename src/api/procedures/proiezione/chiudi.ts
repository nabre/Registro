import { proiezione } from '../../../actions/projection.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'proiezione.chiudi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Chiude lo schermo per la classe',
  azione: 'proiezione.chiudi',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(proiezione['proiezione.chiudi'], (i: typeof ingresso) => ({
      tipo: 'proiezione.chiudi' as const, ...i,
    }))(ambito, ingresso),
})
