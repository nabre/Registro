import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { elenco, identificatore, oggetto } from '../../../schemas.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().lettura.attive

/**
 * Tutte le pagine ancora attive dei PDF indicati, rilette da capo. Senza
 * guardia sull'esistenza: il gestore ignora gli id che non trova, perché un
 * PDF sparito non deve far fallire gli altri.
 */
export const procedura = scrittura({
  nome: 'smistamento.lettura.attive',
  titolo: () => t().titolo,
  azione: 'smistamento.rileggiAttive',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentiId: elenco(identificatore(), {
      aiuto: () => t().smistamentiId,
    }),
  }),
  esegui: inoltra(smistamento, 'smistamento.rileggiAttive'),
})
