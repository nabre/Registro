import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { testi } from './corsi.testi.js'

export const procedura = scrittura({
  nome: 'corsi.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'corso.elimina',
  idempotente: true,
  collezioni: [
    'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check', 'progetti', 'smistamenti',
    'fascicoli',
  ],
  ingresso: oggetto({ corsoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    return inoltra(registro, 'corso.elimina')(ambito, ingresso)
  },
})
