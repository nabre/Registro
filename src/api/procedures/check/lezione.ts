import { check } from '../../../actions/check.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCasella, esigiLezioneDelCorso } from './common.js'
import { testi } from './check.testi.js'

const c = () => testi().comune

export const procedura = scrittura({
  nome: 'check.lezione',
  titolo: () => testi().lezione.titolo,
  azione: 'check.lezione',
  // La stessa ora due volte è la stessa ora: la seconda non scrive.
  idempotente: true,
  collezioni: ['check'],
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => c().corsoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    colonnaId: identificatore({ aiuto: () => c().colonnaId }),
    lezioneId: identificatore({ aiuto: () => testi().lezione.lezioneId }),
  }),
  esegui: (ambito, ingresso) => {
    const { corso } = esigiCasella(ambito, ingresso)
    esigiLezioneDelCorso(ambito, corso, ingresso.lezioneId)
    return inoltra(check, 'check.lezione')(ambito, ingresso)
  },
})
