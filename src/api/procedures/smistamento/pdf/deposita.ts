import { smistamento } from '../../../../actions/sorting.js'
import { daGestore, scrittura } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, testo } from '../../../schemas.js'
import { comeDivisione, divisione } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pdf.deposita

/**
 * Il PDF trascinato nel pannello, con i byte in base64.
 *
 * `contenuto` non ha tetto: un limite scelto a occhio farebbe fallire il
 * trascinamento su certi PDF senza spiegazione; il limite vero è del
 * trasporto e del disco. Nemmeno un minimo: su `''` il gestore risponde «Il
 * file trascinato è vuoto».
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.deposita',
  titolo: () => t().titolo,
  azione: 'smistamento.deposita',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    consegnaId: nullabile(identificatore({ aiuto: () => t().consegnaId })),
    classeId: opzionale(nullabile(identificatore({ aiuto: () => t().classeId }))),
    nome: testo({ aiuto: () => t().nome }),
    contenuto: testo({ aiuto: () => t().contenuto }),
    divisione: opzionale(divisione()),
  }),
  esegui: (ambito, ingresso) => daGestore(smistamento['smistamento.deposita'], (i: typeof ingresso) => ({
    tipo: 'smistamento.deposita' as const, ...i, divisione: comeDivisione(i.divisione),
  }))(ambito, ingresso),
})
