import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, iso, nullabile, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiProgetto } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune
const t = () => testi().giudizio.salva

export const procedura = scrittura({
  nome: 'progetti.giudizio.salva',
  titolo: () => t().titolo,
  azione: 'progetto.giudizio.salva',
  // Senza `id` ne nasce uno a ogni chiamata.
  idempotente: false,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    giudizio: oggetto({
      id: opzionale(identificatore({ aiuto: () => t().id })),
      allievoId: nullabile(identificatore({ aiuto: () => t().allievoId })),
      testo: testo({ minimo: 1, massimo: 4000, aiuto: () => t().testo }),
      data: opzionale(nullabile(iso({ aiuto: () => c().data }))),
      lezioneId: opzionale(nullabile(identificatore({ aiuto: () => c().lezioneId }))),
    }, { aiuto: () => t().giudizio }),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    return inoltra(progetti, 'progetto.giudizio.salva')(ambito, ingresso)
  },
})
