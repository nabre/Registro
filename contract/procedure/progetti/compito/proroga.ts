import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, iso, nullabile, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiCompito } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune
const t = () => testi().compito.proroga

export const procedura = scrittura({
  nome: 'progetti.compito.proroga',
  titolo: () => t().titolo,
  azione: 'progetto.compito.proroga',
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => testi().comune.corsoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    fine: nullabile(iso({ aiuto: () => t().fine })),
    nota: opzionale(testo({ massimo: 2000, aiuto: () => t().nota })),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.proroga')(ambito, ingresso)
  },
})
