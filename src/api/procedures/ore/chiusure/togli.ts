import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { iso, oggetto } from '../../../schemas.js'
import { testi } from '../ore.testi.js'

const t = () => testi().chiusure.togli

/**
 * Le ore che cadono in una vacanza, via tutte insieme. Idempotente: rifatta,
 * non trova niente e lo dice con un rifiuto. Come `ore.elimina`, valutazioni,
 * consegne e spunte del check legate restano, senza il rimando.
 */
export const procedura = scrittura({
  nome: 'ore.chiusure.togli',
  titolo: () => t().titolo,
  azione: 'lezione.togliNelleChiusure',
  idempotente: true,
  collezioni: ['lezioni', 'valutazioni', 'consegne', 'check'],
  ingresso: oggetto({
    dal: iso({ aiuto: () => t().dal }),
    al: iso({ aiuto: () => t().al }),
  }),
  esegui: inoltra(ore, 'lezione.togliNelleChiusure'),
})
