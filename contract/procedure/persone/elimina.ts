import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiPersonaDellaClasse } from '#contract/procedure/common/register.js'
import { testi } from './persone.testi.js'

export const procedura = scrittura({
  nome: 'persone.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'allievo.elimina',
  idempotente: true,
  collezioni: [
    'classi', 'lezioni', 'valutazioni', 'consegne', 'check', 'progetti', 'fascicoli', 'smistamenti',
  ],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiPersonaDellaClasse(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(registro, 'allievo.elimina')(ambito, ingresso)
  },
})
