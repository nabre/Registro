import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, oggetto } from '#contract/schemas.js'
import { esigiCompito } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune
const t = () => testi().compito.fattoTutti

export const procedura = scrittura({
  nome: 'progetti.compito.fattoTutti',
  titolo: () => t().titolo,
  azione: 'progetto.compito.fattoTutti',
  // Chi ha già la spunta la tiene: la seconda volta non c'è niente da fare.
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => testi().comune.corsoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    fatto: booleano({ aiuto: () => t().fatto }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.fattoTutti')(ambito, ingresso)
  },
})
