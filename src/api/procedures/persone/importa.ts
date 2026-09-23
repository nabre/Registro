import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto, testo } from '../../schemas.js'
import { esigiClasse } from '../common/register.js'

/**
 * Idempotente: chi c'è già non si aggiunge una seconda volta.
 *
 * Il gestore confronta cognome e nome senza guardare le maiuscole, e salta chi
 * trova. Incollare due volte lo stesso elenco lascia la classe com'era.
 */
export const procedura = definisci({
  nome: 'persone.importa',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Aggiunge alla classe le persone riconosciute in un elenco incollato',
  azione: 'allievi.importa',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    testo: testo({ aiuto: 'L’elenco incollato, una persona per riga' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Che nel testo non si riconosca nessun nome resta un rifiuto del gestore:
    // è la forma del testo a non andare, non un identificativo che non esiste.
    return daGestore(registro['allievi.importa'], (i: typeof ingresso) => ({
      tipo: 'allievi.importa' as const, ...i,
    }))(ambito, ingresso)
  },
})
