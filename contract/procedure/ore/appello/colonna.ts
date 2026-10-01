import { ore } from '#core/azioni/hours.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, numero, oggetto, scelta } from '#contract/schemas.js'
import { esigiLezione, esigiUd } from '#contract/procedure/ore/common.js'
import { STATI_APPELLO } from '#contract/procedure/common/rollCall.js'
import { testi } from '#contract/procedure/ore/ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.colonna',
  titolo: () => testi().appello.colonna.titolo,
  azione: 'presenze.colonna',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    ud: numero({ intero: true, minimo: 0, massimo: 32 }),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    esigiUd(ambito, esigiLezione(ambito, ingresso.lezioneId), ingresso.ud)
    return inoltra(ore, 'presenze.colonna')(ambito, ingresso)
  },
})
