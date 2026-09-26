import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { testi } from './piani.testi.js'

export const procedura = scrittura({
  nome: 'piani.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'piano.elimina',
  idempotente: true,
  // Le ore che lo usavano restano, senza scaletta e senza spunte, e i momenti di
  // valutazione nati da una tappa si staccano: anche quei file vanno riscritti.
  collezioni: ['piani', 'lezioni', 'valutazioni'],
  ingresso: oggetto({ pianoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiPiano(ambito, ingresso.pianoId)
    return inoltra(piani, 'piano.elimina')(ambito, ingresso)
  },
})
