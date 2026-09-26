import { check } from '../../../actions/check.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, oggetto } from '../../schemas.js'
import { esigiCasella } from './common.js'
import { testi } from './check.testi.js'

const c = () => testi().comune

export const procedura = scrittura({
  nome: 'check.data',
  titolo: () => testi().data.titolo,
  azione: 'check.data',
  // Lo stesso giorno due volte è lo stesso giorno: la seconda non scrive.
  idempotente: true,
  collezioni: ['check'],
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => c().corsoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    colonnaId: identificatore({ aiuto: () => c().colonnaId }),
    data: iso({ aiuto: () => testi().data.data }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCasella(ambito, ingresso)
    return inoltra(check, 'check.data')(ambito, ingresso)
  },
})
