import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, oggetto } from '#contract/schemas.js'
import { esigiAnno } from '#contract/procedure/common/register.js'
import { testi } from './anni.testi.js'

const t = () => testi().calendario

/**
 * Il solo modo di mettere o togliere il marcatore del calendario ufficiale:
 * `anni.salva` rifiuta chi lo tocca, perché collegare vuol dire anche portare
 * date e chiusure ufficiali. Idempotente: collegare due volte riallinea, e
 * staccare un anno staccato non fa niente.
 */
export const procedura = scrittura({
  nome: 'anni.calendario',
  titolo: () => t().titolo,
  azione: 'anno.calendario',
  idempotente: true,
  // Come `anni.salva`: nelle chiusure nuove le lezioni intatte se ne vanno.
  collezioni: ['registro', 'lezioni'],
  ingresso: oggetto({
    annoId: identificatore(),
    collega: booleano({ aiuto: () => t().collega }),
  }),
  esegui: (ambito, ingresso) => {
    esigiAnno(ambito, ingresso.annoId)
    return inoltra(registro, 'anno.calendario')(ambito, ingresso)
  },
})
