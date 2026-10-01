import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiProgetto } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const t = () => testi().giudizio.elimina

export const procedura = scrittura({
  nome: 'progetti.giudizio.elimina',
  titolo: () => t().titolo,
  azione: 'progetto.giudizio.elimina',
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => testi().comune.progettoId }),
    giudizioId: identificatore({ aiuto: () => t().giudizioId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    return inoltra(progetti, 'progetto.giudizio.elimina')(ambito, ingresso)
  },
})
