import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPersona } from './common.js'
import { testi } from './persone.testi.js'

export const procedura = scrittura({
  nome: 'persone.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'allievo.elimina',
  idempotente: true,
  collezioni: ['classi', 'lezioni', 'valutazioni', 'consegne', 'check', 'fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(registro, 'allievo.elimina')(ambito, ingresso)
  },
})
