import { ore } from '#core/azioni/hours.js'
import { inoltra, scrittura } from '#contract/core.js'
import { iso, oggetto } from '#contract/schemas.js'
import { testi } from '#contract/procedure/ore/ore.testi.js'

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
  collezioni: ['lezioni', 'valutazioni', 'consegne', 'check', 'progetti'],
  ingresso: oggetto({
    dal: iso({ aiuto: () => t().dal }),
    al: iso({ aiuto: () => t().al }),
  }),
  esegui: inoltra(ore, 'lezione.togliNelleChiusure'),
})
