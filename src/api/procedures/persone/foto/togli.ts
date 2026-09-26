import { registro } from '../../../../actions/register.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiPersona } from '../common.js'
import { testi } from '../persone.testi.js'

export const procedura = scrittura({
  nome: 'persone.foto.togli',
  titolo: () => testi().foto.togli.titolo,
  azione: 'allievo.foto.togli',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(registro, 'allievo.foto.togli')(ambito, ingresso)
  },
})
