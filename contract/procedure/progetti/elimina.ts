import { progetti } from '../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiProgetto } from './common.js'
import { testi } from './progetti.testi.js'

export const procedura = scrittura({
  nome: 'progetti.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'progetto.elimina',
  // Al secondo giro il progetto non c’è più, e lo si dice.
  idempotente: true,
  collezioni: ['progetti', 'piani', 'valutazioni'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => testi().comune.progettoId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    return inoltra(progetti, 'progetto.elimina')(ambito, ingresso)
  },
})
