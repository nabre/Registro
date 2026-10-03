import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiIntegrazione } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune

export const procedura = scrittura({
  nome: 'progetti.integrazione.togli',
  titolo: () => testi().integrazione.togli.titolo,
  azione: 'progetto.integrazione.togli',
  // Al secondo giro il progetto non è più integrato lì, e lo si dice.
  idempotente: true,
  // Le tappe dei piani del corso e i momenti restano, sganciati.
  collezioni: ['progetti', 'piani', 'valutazioni'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => c().corsoId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiIntegrazione(ambito, ingresso)
    return inoltra(progetti, 'progetto.integrazione.togli')(ambito, ingresso)
  },
})
