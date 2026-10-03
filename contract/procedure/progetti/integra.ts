import { progetti } from '#core/azioni/projects.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { esigiProgetto } from './common.js'
import { testi } from './progetti.testi.js'

const c = () => testi().comune

export const procedura = scrittura({
  nome: 'progetti.integra',
  titolo: () => testi().integra.titolo,
  azione: 'progetto.integra',
  // Già integrato, non cambia niente: né lo stato né il lavoro con la classe.
  idempotente: true,
  collezioni: ['progetti'],
  ingresso: oggetto({
    progettoId: identificatore({ aiuto: () => c().progettoId }),
    corsoId: identificatore({ aiuto: () => c().corsoId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiProgetto(ambito, ingresso.progettoId)
    esigiCorso(ambito, ingresso.corsoId)
    return inoltra(progetti, 'progetto.integra')(ambito, ingresso)
  },
})
