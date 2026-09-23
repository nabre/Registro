import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiBlocco } from '../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Elimina un periodo e manda nel cestino i fogli che ci stavano dentro',
  azione: 'assenze.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore({ aiuto: 'Il periodo da eliminare' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return daGestore(docenteClasse['assenze.elimina'], (i: typeof ingresso) => ({
      tipo: 'assenze.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})
