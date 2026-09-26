import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiBlocco } from '../common.js'
import { testi } from '../classe.testi.js'

const t = () => testi().assenze.elimina

export const procedura = scrittura({
  nome: 'classe.assenze.elimina',
  titolo: () => t().titolo,
  azione: 'assenze.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore({ aiuto: () => t().bloccoId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return inoltra(docenteClasse, 'assenze.elimina')(ambito, ingresso)
  },
})
