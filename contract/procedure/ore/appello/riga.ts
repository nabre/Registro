import { ore } from '#core/azioni/hours.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto, scelta } from '#contract/schemas.js'
import { esigiIscritto, esigiLezione } from '#contract/procedure/ore/common.js'
import { STATI_APPELLO } from '#contract/procedure/common/rollCall.js'
import { testi } from '#contract/procedure/ore/ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.riga',
  titolo: () => testi().appello.riga.titolo,
  azione: 'presenze.riga',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return inoltra(ore, 'presenze.riga')(ambito, ingresso)
  },
})
