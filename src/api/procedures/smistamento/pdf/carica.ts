import { smistamento } from '../../../../actions/sorting.js'
import { daGestore, scrittura } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale } from '../../../schemas.js'
import { comeDivisione, divisione } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pdf.carica

/**
 * I PDF scelti dal disco. Non idempotente: apre un dialogo, e aspetta una
 * persona. Da riga di comando o condotto si usa `smistamento.pdf.deposita`.
 *
 * `classeId` non si controlla: con una classe sparita il file entra lo stesso,
 * senza classe, visibile in «Da smistare».
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.carica',
  titolo: () => t().titolo,
  azione: 'smistamento.carica',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    consegnaId: nullabile(identificatore({ aiuto: () => t().consegnaId })),
    classeId: opzionale(nullabile(identificatore({ aiuto: () => t().classeId }))),
    divisione: opzionale(divisione()),
  }),
  esegui: (ambito, ingresso) => daGestore(smistamento['smistamento.carica'], (i: typeof ingresso) => ({
    tipo: 'smistamento.carica' as const, ...i, divisione: comeDivisione(i.divisione),
  }))(ambito, ingresso),
})
