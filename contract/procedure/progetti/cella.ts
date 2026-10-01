import { progetti } from '../../../core/azioni/projects.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, nullabile, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiProgetto } from './common.js'
import { testi } from './progetti.testi.js'

const t = () => testi().cella
const c = () => testi().comune

export const procedura = scrittura({
  nome: 'progetti.cella',
  titolo: () => t().titolo,
  azione: 'progetto.cella',
  // Lo stesso livello due volte non scrive niente la seconda.
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    criterioId: identificatore({ aiuto: () => t().criterioId }),
    data: opzionale(nullabile(iso({ aiuto: () => c().data }))),
    lezioneId: opzionale(nullabile(identificatore({ aiuto: () => c().lezioneId }))),
    livello: nullabile(testo({ massimo: 64, aiuto: () => t().livello })),
    nota: opzionale(testo({ massimo: 2000, aiuto: () => t().nota })),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    return inoltra(progetti, 'progetto.cella')(ambito, ingresso)
  },
})
