import { composizioni } from '../../../actions/compositions.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiComposizione } from './common.js'
import { testi } from './composizioni.testi.js'

const t = () => testi().aggiorna

export const procedura = scrittura({
  nome: 'composizioni.aggiorna',
  titolo: () => t().titolo,
  azione: 'composizione.aggiorna',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ id: identificatore({ aiuto: () => t().id }) }),
  esegui: (ambito, ingresso) => {
    esigiComposizione(ingresso.id)
    return inoltra(composizioni, 'composizione.aggiorna')(ambito, ingresso)
  },
})
