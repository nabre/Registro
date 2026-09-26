import { modelli } from '../../../actions/templates.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { testi } from './intestazione.testi.js'

/**
 * Idempotente: senza logo il gestore risponde `invariato`. Il file sta nel
 * documento e non passa dal cestino (vedi `cestina` in `actions/context.ts`).
 */
export const procedura = scrittura({
  nome: 'intestazione.togliLogo',
  titolo: () => testi().togliLogo.titolo,
  azione: 'intestazione.togliLogo',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({ cartaId: identificatore({ aiuto: () => testi().cartaId }) }),
  esegui: inoltra(modelli, 'intestazione.togliLogo'),
})
