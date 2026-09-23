import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'

/**
 * Idempotente benché faccia nascere delle ore.
 *
 * Non è una concessione: il gestore mette a calendario solo quel che manca, e
 * una seconda chiamata con lo stesso periodo trova tutto già lì e non tocca
 * niente — sta scritto accanto a lui, ed è il motivo per cui il comando si
 * chiama «genera» e non «aggiungi».
 */
export const procedura = definisci({
  nome: 'orario.genera',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mette a calendario le ore che l’orario prevede e non ci sono',
  azione: 'orario.genera',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    corsoId: identificatore(),
    dal: iso(),
    al: iso(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    // L'orario vuoto e il periodo rovesciato restano rifiuti del gestore: sono
    // «non si può», e li dice già con la frase che spiega come rimediare.
    return daGestore(registro['orario.genera'], (i: typeof ingresso) => ({
      tipo: 'orario.genera' as const, ...i,
    }))(ambito, ingresso)
  },
})
