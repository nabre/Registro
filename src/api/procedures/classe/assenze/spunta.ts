import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto } from '../../../schemas.js'
import { esigiAllievo, esigiBlocco } from '../common.js'
import { testi } from '../classe.testi.js'

const t = () => testi().assenze.spunta

export const procedura = scrittura({
  nome: 'classe.assenze.spunta',
  titolo: () => t().titolo,
  azione: 'assenze.spunta',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore(),
    spedita: booleano({ aiuto: () => t().spedita }),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    esigiAllievo(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(docenteClasse, 'assenze.spunta')(ambito, ingresso)
  },
})
