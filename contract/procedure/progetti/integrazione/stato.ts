import { progetti } from '#core/azioni/projects.js'
import { STATI_PROGETTO } from '#core/dominio/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto, scelta } from '#contract/schemas.js'
import { esigiIntegrazione } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune
const t = () => testi().integrazione.stato

export const procedura = scrittura({
  nome: 'progetti.integrazione.stato',
  titolo: () => t().titolo,
  azione: 'progetto.integrazione.stato',
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => c().corsoId }),
    stato: scelta(STATI_PROGETTO, { aiuto: () => t().stato }),
  }),
  esegui: (ambito, ingresso) => {
    esigiIntegrazione(ambito, ingresso)
    return inoltra(progetti, 'progetto.integrazione.stato')(ambito, ingresso)
  },
})
