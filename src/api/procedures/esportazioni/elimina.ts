import { esportazioni } from '../../../actions/exports.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { esigiDocumento } from './common.js'
import { testi } from './esportazioni.testi.js'

export const procedura = scrittura({
  nome: 'esportazioni.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'esportazione.elimina',
  // Il secondo colpo trova il vuoto e lo dice, senza togliere altro.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ percorso: testo({ minimo: 1 }) }),
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return inoltra(esportazioni, 'esportazione.elimina')(ambito, ingresso)
  },
})
