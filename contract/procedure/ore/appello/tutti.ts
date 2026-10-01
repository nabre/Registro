import { ore } from '#core/azioni/hours.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto, scelta } from '#contract/schemas.js'
import { esigiLezione } from '#contract/procedure/ore/common.js'
import { STATI_APPELLO } from '#contract/procedure/common/rollCall.js'
import { testi } from '#contract/procedure/ore/ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.tutti',
  titolo: () => testi().appello.tutti.titolo,
  azione: 'presenze.tutti',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'presenze.tutti')(ambito, ingresso)
  },
})
