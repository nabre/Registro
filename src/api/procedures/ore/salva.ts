import { ore } from '../../../actions/hours.js'
import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { Lezione } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { testi } from './ore.testi.js'

const t = () => testi().salva

export const procedura = scrittura({
  nome: 'ore.salva',
  titolo: () => t().titolo,
  azione: 'lezione.salva',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    // L'entità la giudica `validaLezione` nel gestore: la durata di un'UD la sa il
    // documento, e lo schema non la vede (vedi `entita`).
    lezione: entita<Lezione>({
      cosa: () => Uno(lessico().lezione),
      aiuto: () => t().lezione,
    }),
  }),
  // Nessuna guardia: un id che non c'è vuol dire «creala».
  esegui: inoltra(ore, 'lezione.salva'),
})
