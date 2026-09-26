import { registro } from '../../../../actions/register.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiPersona } from '../common.js'
import { testi } from '../persone.testi.js'

/**
 * Non idempotente: apre il dialogo di sistema, e ogni volta si può scegliere
 * un'altra foto o chiudere senza scegliere.
 */
export const procedura = scrittura({
  nome: 'persone.foto.imposta',
  titolo: () => testi().foto.imposta.titolo,
  azione: 'allievo.foto.imposta',
  idempotente: false,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(registro, 'allievo.foto.imposta')(ambito, ingresso)
  },
})
