import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, iso, nullabile, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiProgetto } from '../common.js'
import { testi } from '../progetti.testi.js'

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
    compito: oggetto({
      id: opzionale(identificatore({ aiuto: () => t().id })),
      titolo: testo({ minimo: 1, massimo: 200, aiuto: () => t().titoloCompito }),
      descrizione: opzionale(testo({ massimo: 4000, aiuto: () => t().descrizione })),
      fine: nullabile(iso({ aiuto: () => t().fine })),
      fineLezioneId: opzionale(nullabile(identificatore({ aiuto: () => t().fineLezioneId }))),
    }, { aiuto: () => t().compito }),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    return inoltra(progetti, 'progetto.compito.salva')(ambito, ingresso)
  },
})
