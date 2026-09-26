import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiClasse } from '../common/register.js'
import { testi } from './classi.testi.js'

export const procedura = scrittura({
  nome: 'classi.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'classe.elimina',
  idempotente: true,
  collezioni: [
    'classi', 'fascicoli', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check',
    'smistamenti',
  ],
  ingresso: oggetto({ classeId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(registro, 'classe.elimina')(ambito, ingresso)
  },
})
