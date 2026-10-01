import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { testi } from './esporta.testi.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { semestreDiEsportazione } from './common.js'

export const procedura = scrittura({
  nome: 'esporta.presenze',
  titolo: () => testi().presenze.titolo,
  azione: 'esporta.presenze',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    corsoId: identificatore(),
    semestreId: semestreDiEsportazione(),
  }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId, null)
    return inoltra(sistema, 'esporta.presenze')(ambito, ingresso)
  },
})
