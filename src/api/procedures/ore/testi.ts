import { ore } from '../../../actions/hours.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiLezione } from './common.js'
import { testi } from './ore.testi.js'

const t = () => testi().testi

export const procedura = scrittura({
  nome: 'ore.testi',
  titolo: () => t().titolo,
  azione: 'lezione.testi',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    argomenti: opzionale(testo({ massimo: 4000 })),
    materiali: opzionale(testo({ massimo: 4000 })),
    consuntivo: opzionale(testo({ massimo: 4000 })),
  }, { aiuto: () => t().ingresso }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'lezione.testi')(ambito, ingresso)
  },
})
