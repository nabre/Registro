import { rapporti } from '../../../actions/reports.js'
import { errore } from '../../contract.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { testi } from './rapporti.testi.js'

const t = () => testi().completo

export const procedura = scrittura({
  nome: 'rapporti.completo',
  titolo: () => t().titolo,
  azione: 'rapporto.completo',
  idempotente: true,
  collezioni: [],
  // Richiesti e nullabili, come nel protocollo: `null` vuol dire «tutti i corsi»
  // e «l'anno intero».
  ingresso: oggetto({
    corsoId: nullabile(identificatore({ aiuto: () => t().corsoId })),
    semestreId: nullabile(identificatore({ aiuto: () => t().semestreId })),
  }),
  esegui: (ambito, ingresso) => {
    if (
      ingresso.corsoId !== null &&
      !ambito.contesto.registro.corsi.some((c) => c.id === ingresso.corsoId)
    ) {
      throw errore.nonTrovato('corso')
    }
    return inoltra(rapporti, 'rapporto.completo')(ambito, ingresso)
  },
})
