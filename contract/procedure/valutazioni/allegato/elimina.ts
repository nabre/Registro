import { valutazioni } from '#core/azioni/assessments.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiAllegato } from '#contract/procedure/valutazioni/common.js'
import { testi } from '#contract/procedure/valutazioni/valutazioni.testi.js'

export const procedura = scrittura({
  nome: 'valutazioni.allegato.elimina',
  titolo: () => testi().allegato.elimina.titolo,
  azione: 'allegato.elimina',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allegatoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiAllegato(ambito, ingresso.valutazioneId, ingresso.allegatoId)
    return inoltra(valutazioni, 'allegato.elimina')(ambito, ingresso)
  },
})
