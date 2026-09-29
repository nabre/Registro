import { microsoft } from '../../../core/azioni/microsoft.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { testi } from './microsoft.testi.js'

export const procedura = scrittura({
  nome: 'microsoft.togli',
  titolo: () => testi().togli.titolo,
  azione: 'microsoft.togli',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    indirizzo: testo({
      aiuto: () => testi().togli.indirizzo,
      esempio: 'nome.cognome@scuola.ch',
    }),
  }),
  esegui: inoltra(microsoft, 'microsoft.togli'),
})
