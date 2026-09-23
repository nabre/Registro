import { docenteClasse } from '../../../../actions/classTeacher.js'
import type { Recapito } from '../../../../domain/models.js'
import { validaRecapito } from '../../../../domain/validation.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../common.js'

export const procedura = definisci({
  nome: 'classe.recapiti.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Salva un recapito fisso nel fascicolo della classe',
  azione: 'recapito.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore({ aiuto: 'La classe di cui si tiene il fascicolo' }),
    // Il recapito intero, convalidato dal dominio: etichetta e indirizzo
    // valido. È la stessa funzione che chiama il gestore, quindi la procedura
    // non può rifiutare niente che il gestore accetterebbe.
    recapito: entita<Recapito>({ cosa: 'Recapito', valida: validaRecapito }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(docenteClasse['recapito.salva'], (i: typeof ingresso) => ({
      tipo: 'recapito.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
