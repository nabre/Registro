import { check } from '../../../actions/check.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, identificatore, iso, nullabile, oggetto, opzionale } from '../../schemas.js'
import { esigiCasella, esigiLezioneDelCorso } from './common.js'
import { testi } from './check.testi.js'

const t = () => testi().spunta
const c = () => testi().comune

export const procedura = scrittura({
  nome: 'check.spunta',
  titolo: () => t().titolo,
  azione: 'check.spunta',
  // Rispuntare non cambia la data della prima spunta; togliere una spunta che non
  // c'è non fa niente.
  idempotente: true,
  collezioni: ['check'],
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => c().corsoId }),
    allievoId: identificatore({ aiuto: () => c().allievoId }),
    colonnaId: identificatore({ aiuto: () => c().colonnaId }),
    fatta: booleano({ aiuto: () => t().fatta }),
    lezioneId: opzionale(nullabile(identificatore({ aiuto: () => t().lezioneId }))),
    data: opzionale(nullabile(iso({ aiuto: () => t().data }))),
  }),
  esegui: (ambito, ingresso) => {
    const { corso } = esigiCasella(ambito, ingresso)
    if (ingresso.lezioneId) esigiLezioneDelCorso(ambito, corso, ingresso.lezioneId)
    return inoltra(check, 'check.spunta')(ambito, ingresso)
  },
})
