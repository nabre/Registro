import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiClasse } from '../common/register.js'

export const procedura = definisci({
  nome: 'classi.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie una classe con i suoi corsi, le sue ore e il suo fascicolo',
  azione: 'classe.elimina',
  idempotente: true,
  collezioni: [
    'classi', 'fascicoli', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'smistamenti',
  ],
  ingresso: oggetto({ classeId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(registro['classe.elimina'], (i: typeof ingresso) => ({
      tipo: 'classe.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})
