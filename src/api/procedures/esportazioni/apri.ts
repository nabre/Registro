import { esportazioni } from '../../../actions/exports.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { esigiDocumento } from './common.js'
import { testi } from './esportazioni.testi.js'

export const procedura = scrittura({
  nome: 'esportazioni.apri',
  titolo: () => testi().apri.titolo,
  azione: 'esportazione.apri',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    percorso: testo({ minimo: 1, aiuto: () => testi().apri.percorso }),
  }),
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return inoltra(esportazioni, 'esportazione.apri')(ambito, ingresso)
  },
})
