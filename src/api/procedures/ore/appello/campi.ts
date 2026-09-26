import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, numero, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiIscritto, esigiLezione } from '../common.js'
import { testi } from '../ore.testi.js'

const t = () => testi().appello.campi

/** Il numero massimo di minuti di ritardo che si accettano: mezza giornata. */
const MINUTI_MASSIMI = 600

export const procedura = scrittura({
  nome: 'ore.appello.campi',
  titolo: () => t().titolo,
  azione: 'presenze.campi',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    minuti: opzionale(numero({
      intero: true, minimo: 0, massimo: MINUTI_MASSIMI,
      aiuto: () => t().minuti,
    })),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return inoltra(ore, 'presenze.campi')(ambito, ingresso)
  },
})
