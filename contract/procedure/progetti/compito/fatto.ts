import { progetti } from '../../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiCompito } from '../common.js'
import { testi } from '../progetti.testi.js'

const c = () => testi().comune
const t = () => testi().compito.fatto

export const procedura = scrittura({
  nome: 'progetti.compito.fatto',
  titolo: () => t().titolo,
  azione: 'progetto.compito.fatto',
  // Rispuntare non cambia il quando.
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    compitoId: identificatore({ aiuto: () => c().compitoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    fatto: booleano({ aiuto: () => t().fatto }),
    nota: opzionale(testo({ massimo: 2000, aiuto: () => t().nota })),
  }),
  esegui: (ambito, ingresso) => {
    esigiCompito(ambito, ingresso)
    return inoltra(progetti, 'progetto.compito.fatto')(ambito, ingresso)
  },
})
