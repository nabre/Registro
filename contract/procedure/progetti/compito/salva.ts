import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, iso, nullabile, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiIntegrazione } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const t = () => testi().compito.salva

export const procedura = scrittura({
  nome: 'progetti.compito.salva',
  titolo: () => t().titolo,
  azione: 'progetto.compito.salva',
  // Senza `id` ne nasce uno a ogni chiamata.
  idempotente: false,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => testi().comune.progettoId }),
    corsoId: identificatore({ aiuto: () => testi().comune.corsoId }),
    compito: oggetto({
      id: opzionale(identificatore({ aiuto: () => t().id })),
      titolo: testo({ minimo: 1, massimo: 200, aiuto: () => t().titoloCompito }),
      descrizione: opzionale(testo({ massimo: 4000, aiuto: () => t().descrizione })),
      fine: nullabile(iso({ aiuto: () => t().fine })),
      fineLezioneId: opzionale(nullabile(identificatore({ aiuto: () => t().fineLezioneId }))),
    }, { aiuto: () => t().compito }),
  }),
  esegui: (ambito, ingresso) => {
    esigiIntegrazione(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.salva')(ambito, ingresso)
  },
})
