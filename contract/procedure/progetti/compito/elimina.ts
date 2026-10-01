import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiCompito } from '../common.js'
import { testi } from '../progetti.testi.js'

const c = () => testi().comune

export const procedura = scrittura({
  nome: 'progetti.compito.elimina',
  titolo: () => testi().compito.elimina.titolo,
  azione: 'progetto.compito.elimina',
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.elimina')(ambito, ingresso)
  },
})
