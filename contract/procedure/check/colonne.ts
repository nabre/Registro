import { check } from '#core/azioni/check.js'
import { inoltra, scrittura } from '#contract/core.js'
import { elenco, identificatore, oggetto, testo } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { testi } from './check.testi.js'

const t = () => testi().colonne

export const procedura = scrittura({
  nome: 'check.colonne',
  titolo: () => t().titolo,
  azione: 'check.colonne',
  // Si mandano tutte, per intero: la seconda volta non c'è niente da scrivere.
  idempotente: true,
  collezioni: ['check'],
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => testi().comune.corsoId }),
    colonne: elenco(oggetto({
      // `testo` e non `identificatore`: una colonna nuova arriva senza id, e glielo
      // dà il dominio.
      id: testo({ massimo: 64, aiuto: () => t().id }),
      titolo: testo({ massimo: 200, aiuto: () => t().titoloColonna }),
    }), { aiuto: () => t().colonne }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    return inoltra(check, 'check.colonne')(ambito, ingresso)
  },
})
