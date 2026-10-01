import { docenteClasse } from '#core/azioni/classTeacher.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, oggetto } from '#contract/schemas.js'
import { esigiPersonaDellaClasse } from '#contract/procedure/common/register.js'
import { esigiBlocco } from '#contract/procedure/classe/common.js'
import { testi } from '#contract/procedure/classe/classe.testi.js'

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
    esigiPersonaDellaClasse(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(docenteClasse, 'assenze.spunta')(ambito, ingresso)
  },
})
