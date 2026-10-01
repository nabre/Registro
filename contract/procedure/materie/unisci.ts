import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiMateria } from '#contract/procedure/common/register.js'
import { testi } from './materie.testi.js'

const t = () => testi().unisci

export const procedura = scrittura({
  nome: 'materie.unisci',
  titolo: () => t().titolo,
  azione: 'materia.unisci',
  idempotente: true,
  collezioni: ['registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check', 'progetti'],
  ingresso: oggetto({
    daId: identificatore({ aiuto: () => t().daId }),
    aId: identificatore({ aiuto: () => t().aId }),
  }),
  esegui: (ambito, ingresso) => {
    // Una materia già fusa altrove è «non trovato» (si rilegge), non un rifiuto.
    esigiMateria(ambito, ingresso.daId)
    esigiMateria(ambito, ingresso.aId)
    return inoltra(registro, 'materia.unisci')(ambito, ingresso)
  },
})
