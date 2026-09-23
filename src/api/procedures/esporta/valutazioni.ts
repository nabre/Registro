import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCorso, semestreDiEsportazione } from './common.js'

export const procedura = definisci({
  nome: 'esporta.valutazioni',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Le valutazioni di un corso in CSV, accanto al PDF',
  azione: 'esporta.valutazioni',
  // Riscrive lo stesso file con lo stesso nome e lo stesso contenuto.
  idempotente: true,
  // Scrive sul disco, non nel documento: nessuna collezione cambia.
  collezioni: [],
  ingresso: oggetto({
    corsoId: identificatore(),
    semestreId: semestreDiEsportazione(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    // «Nessun momento di valutazione da esportare» resta al gestore con la sua
    // frase: non è un id che non esiste più — è un periodo in cui non è stato
    // fatto niente — e due frasi per lo stesso no sono peggio di una.
    return daGestore(sistema['esporta.valutazioni'], (i: typeof ingresso) => ({
      tipo: 'esporta.valutazioni' as const, ...i,
    }))(ambito, ingresso)
  },
})
