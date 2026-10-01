import { docenteClasse } from '#core/azioni/classTeacher.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, oggetto, scelta } from '#contract/schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '#contract/procedure/classe/common.js'
import { testi } from '#contract/procedure/classe/classe.testi.js'

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
