import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, scelta, testo } from '../../../schemas.js'
import { esigiLezione, SEGNI } from '../common.js'
import { testi } from '../ore.testi.js'

const t = () => testi().comportamento.cella

export const procedura = scrittura({
  nome: 'ore.comportamento.cella',
  titolo: () => t().titolo,
  azione: 'osservazione.cella',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    aspetto: testo({ minimo: 1, massimo: 80, aiuto: () => t().aspetto }),
    segno: opzionale(nullabile(scelta(SEGNI, {
      aiuto: () => t().segno,
    }))),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // L'iscrizione alla classe la controlla il gestore, con il suo messaggio.
    return inoltra(ore, 'osservazione.cella')(ambito, ingresso)
  },
})
