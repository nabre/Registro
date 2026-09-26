import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
import { testi } from './corsi.testi.js'

export const procedura = scrittura({
  nome: 'corsi.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'corso.elimina',
  idempotente: true,
  collezioni: ['corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check', 'smistamenti'],
  ingresso: oggetto({ corsoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    return inoltra(registro, 'corso.elimina')(ambito, ingresso)
  },
})
