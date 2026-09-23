import { proiezione } from '../../../actions/projection.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'proiezione.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre lo schermo per la classe',
  azione: 'proiezione.apri',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(proiezione['proiezione.apri'], (i: typeof ingresso) => ({
      tipo: 'proiezione.apri' as const, ...i,
    }))(ambito, ingresso),
})
