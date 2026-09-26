import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { chiSpunta, esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.raccogli',
  titolo: () => testi().raccogli.titolo,
  azione: 'consegna.raccogli',
  // Apre un dialogo e copia un file: ritentare vuol dire scegliere di nuovo.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiSpunta,
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.raccogli')(ambito, ingresso)
  },
})
