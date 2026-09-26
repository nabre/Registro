import { piani } from '../../../core/azioni/plans.js'
import type { PianoLezione } from '../../../core/dominio/models.js'
import { validaPiano } from '../../../core/dominio/validation.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { Uno } from '../../../core/dominio/lexicon.js'
import { testi } from './piani.testi.js'

const t = () => testi().salva

export const procedura = scrittura({
  nome: 'piani.salva',
  titolo: () => t().titolo,
  azione: 'piano.salva',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    // Con `validaPiano`, che sa che una tappa dura un numero di quarti di UD.
    piano: entita<PianoLezione>({
      cosa: () => Uno(lessico().pianoLezione),
      valida: validaPiano,
      aiuto: () => t().piano,
    }),
  }),
  // Nessuna guardia: un id che non c'è vuol dire «crealo».
  esegui: inoltra(piani, 'piano.salva'),
})
