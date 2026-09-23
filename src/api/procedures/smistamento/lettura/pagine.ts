import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/** Le pagine scelte, rimesse in coda alla lettura. */
export const procedura = definisci({
  nome: 'smistamento.lettura.pagine',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Accoda la rilettura OCR delle pagine scelte. Torna subito',
  azione: 'smistamento.leggiPagine',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.leggiPagine'], (i: typeof ingresso) => ({
      tipo: 'smistamento.leggiPagine' as const, ...i,
    }))(ambito, ingresso)
  },
})
