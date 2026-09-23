import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'

export const procedura = definisci({
  nome: 'corsi.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un corso con le sue ore, i suoi voti e le sue consegne',
  azione: 'corso.elimina',
  idempotente: true,
  collezioni: ['corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'smistamenti'],
  ingresso: oggetto({ corsoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    return daGestore(registro['corso.elimina'], (i: typeof ingresso) => ({
      tipo: 'corso.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})
