import { composizioni } from '../../../actions/compositions.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiComposizione } from './common.js'
import { testi } from './composizioni.testi.js'

export const procedura = scrittura({
  nome: 'composizioni.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'composizione.elimina',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ id: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiComposizione(ingresso.id)
    return inoltra(composizioni, 'composizione.elimina')(ambito, ingresso)
  },
})
