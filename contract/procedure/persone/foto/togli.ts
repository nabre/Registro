import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiPersonaDellaClasse } from '#contract/procedure/common/register.js'
import { testi } from '#contract/procedure/persone/persone.testi.js'

export const procedura = scrittura({
  nome: 'persone.foto.togli',
  titolo: () => testi().foto.togli.titolo,
  azione: 'allievo.foto.togli',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiPersonaDellaClasse(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(registro, 'allievo.foto.togli')(ambito, ingresso)
  },
})
