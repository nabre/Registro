import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { testi } from './sistema.testi.js'

export const procedura = scrittura({
  nome: 'sistema.chiama',
  titolo: () => testi().chiama.titolo,
  azione: 'sistema.chiama',
  // Ricomporre lo stesso numero riapre la stessa telefonata; nel registro non
  // resta niente.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    // Largo: il numero lo scrive una persona (spazi, punti, parentesi). Lo riduce
    // a cifre e `+` `numeroComponibile`, nel dominio dei telefoni.
    numero: testo({ minimo: 1, massimo: 40, aiuto: () => testi().chiama.numero }),
  }),
  esegui: inoltra(sistema, 'sistema.chiama'),
})
