import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiMateria } from '#contract/procedure/common/register.js'
import { testi } from './materie.testi.js'

export const procedura = scrittura({
  nome: 'materie.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'materia.elimina',
  idempotente: true,
  // Una materia usata da un corso si rifiuta (`occupazione`): se ne va da sola.
  collezioni: ['registro'],
  ingresso: oggetto({ materiaId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiMateria(ambito, ingresso.materiaId)
    return inoltra(registro, 'materia.elimina')(ambito, ingresso)
  },
})
