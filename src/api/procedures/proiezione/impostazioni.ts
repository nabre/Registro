import { proiezione } from '../../../actions/projection.js'
import { BLOCCHI, VISTE_CALENDARIO } from '../../../domain/projection.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, elenco, nullabile, oggetto, scelta } from '../../schemas.js'
import { testi } from './proiezione.testi.js'

const t = () => testi().impostazioni

export const procedura = scrittura({
  nome: 'proiezione.impostazioni',
  titolo: () => t().titolo,
  azione: 'proiezione.impostazioni',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    impostazioni: oggetto({
      blocchi: elenco(scelta(BLOCCHI), { aiuto: () => t().blocchi }),
      aperto: nullabile(scelta(BLOCCHI, { aiuto: () => t().aperto })),
      nomi: booleano({ aiuto: () => t().nomi }),
      sospesa: booleano({ aiuto: () => t().sospesa }),
      compatta: booleano({ aiuto: () => t().compatta }),
      calendario: scelta(VISTE_CALENDARIO),
    }),
  }),
  esegui: inoltra(proiezione, 'proiezione.impostazioni'),
})
