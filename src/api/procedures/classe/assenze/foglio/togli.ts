import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../../common.js'
import { testi } from '../../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.assenze.foglio.togli',
  titolo: () => testi().assenze.foglio.togli.titolo,
  azione: 'assenze.foglio.togli',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore(),
    genere: scelta(GENERI_RAPPORTO),
    firmato: booleano(),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return inoltra(docenteClasse, 'assenze.foglio.togli')(ambito, ingresso)
  },
})
