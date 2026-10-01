import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { elenco, identificatore, oggetto } from '../../../schemas.js'
import { esigiCompito } from '../common.js'
import { testi } from '../progetti.testi.js'

const c = () => testi().comune
const t = () => testi().compito.togliInizio

export const procedura = scrittura({
  nome: 'progetti.compito.togliInizio',
  titolo: () => t().titolo,
  azione: 'progetto.compito.togliInizio',
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    allieviIds: elenco(identificatore(), { minimo: 1, aiuto: () => t().allieviIds }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.togliInizio')(ambito, ingresso)
  },
})
