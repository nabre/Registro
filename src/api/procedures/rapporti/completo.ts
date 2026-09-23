import { rapporti } from '../../../actions/reports.js'
import { SCUOLA } from '../../../domain/lexicon.js'
import { definisci, errore } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'rapporti.completo',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Tutti i fogli di un corso, o di tutti i corsi dell’anno',
  azione: 'rapporto.completo',
  idempotente: true,
  collezioni: [],
  // I due campi sono richiesti e nullabili, come li dichiara il protocollo:
  // `null` vuol dire «tutti i corsi» e «l'anno intero», che non è la stessa
  // cosa di «non sto dicendo niente».
  ingresso: oggetto({
    corsoId: nullabile(identificatore({ aiuto: 'null: tutti i corsi dell’anno aperto' })),
    semestreId: nullabile(identificatore({ aiuto: 'null: l’anno intero' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    if (
      ingresso.corsoId !== null &&
      !ambito.contesto.registro.corsi.some((c) => c.id === ingresso.corsoId)
    ) {
      throw errore.nonTrovato(SCUOLA.corso)
    }
    return daGestore(rapporti['rapporto.completo'], (i: typeof ingresso) => ({
      tipo: 'rapporto.completo' as const, ...i,
    }))(ambito, ingresso)
  },
})
