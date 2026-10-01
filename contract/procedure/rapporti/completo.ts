import { rapporti } from '#core/azioni/reports.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, nullabile, oggetto } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
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
    if (ingresso.corsoId !== null) esigiCorso(ambito, ingresso.corsoId)
    return inoltra(rapporti, 'rapporto.completo')(ambito, ingresso)
  },
})
