import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from './classi.testi.js'

export const procedura = scrittura({
  nome: 'classi.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'classe.elimina',
  idempotente: true,
  collezioni: [
    'classi', 'fascicoli', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check',
    'progetti', 'smistamenti',
  ],
  ingresso: oggetto({ classeId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(registro, 'classe.elimina')(ambito, ingresso)
  },
})
