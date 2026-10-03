import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { elenco, identificatore, iso, nullabile, oggetto, opzionale } from '#contract/schemas.js'
import { esigiCompito } from '#contract/procedure/progetti/common.js'
import { testi } from '#contract/procedure/progetti/progetti.testi.js'

const c = () => testi().comune
const t = () => testi().compito.inizia

export const procedura = scrittura({
  nome: 'progetti.compito.inizia',
  titolo: () => t().titolo,
  azione: 'progetto.compito.inizia',
  // Lo stesso inizio due volte non cambia niente; senza giorno non sposta chi
  // aveva già cominciato.
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => testi().comune.corsoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    allieviIds: elenco(identificatore(), { minimo: 1, aiuto: () => t().allieviIds }),
    data: opzionale(nullabile(iso({ aiuto: () => c().data }))),
    lezioneId: opzionale(nullabile(identificatore({ aiuto: () => c().lezioneId }))),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.inizia')(ambito, ingresso)
  },
})
