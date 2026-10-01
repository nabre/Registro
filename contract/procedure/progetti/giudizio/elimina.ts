import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiProgetto } from '../common.js'
import { testi } from '../progetti.testi.js'

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
