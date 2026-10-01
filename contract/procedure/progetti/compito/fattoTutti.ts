import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto } from '../../../schemas.js'
import { esigiCompito } from '../common.js'
import { testi } from '../progetti.testi.js'

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
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    fatto: booleano({ aiuto: () => t().fatto }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.fattoTutti')(ambito, ingresso)
  },
})
