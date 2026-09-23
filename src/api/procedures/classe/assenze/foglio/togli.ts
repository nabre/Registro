import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { definisci } from '../../../../contract.js'
import { daGestore, SCRITTURA } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.foglio.togli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Manda nel cestino un foglio: quella casella torna vuota',
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
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return daGestore(docenteClasse['assenze.foglio.togli'], (i: typeof ingresso) => ({
      tipo: 'assenze.foglio.togli' as const, ...i,
    }))(ambito, ingresso)
  },
})
