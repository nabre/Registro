import { consegne } from '../../../../actions/assignments.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna, perChi } from '../common.js'
import { testi } from '../consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.documento.togli',
  titolo: () => testi().documento.togli.titolo,
  azione: 'consegna.documento.togli',
  // Già tolto è lo stato che si chiedeva: il gestore risponde `invariato`.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.documento.togli')(ambito, ingresso)
  },
})
