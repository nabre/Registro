import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, testo } from '../../schemas.js'
import { esigiClasse } from '../common/register.js'
import { testi } from './persone.testi.js'

/**
 * Idempotente: il gestore salta chi c'è già (cognome e nome, senza maiuscole).
 */
export const procedura = scrittura({
  nome: 'persone.importa',
  titolo: () => testi().importa.titolo,
  azione: 'allievi.importa',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    testo: testo({ aiuto: () => testi().importa.testo }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Un testo senza nomi riconoscibili resta un rifiuto del gestore.
    return inoltra(registro, 'allievi.importa')(ambito, ingresso)
  },
})
