import { ore } from '../../../core/azioni/hours.js'
import { Uno } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import type { Lezione } from '../../../core/dominio/models.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
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
  // Nessuna guardia sull'id: uno che non c'è vuol dire «creala». Il corso sì:
  // un'ora di un corso inventato non la mostrerebbe nessuno.
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.lezione.corsoId)
    return inoltra(ore, 'lezione.salva')(ambito, ingresso)
  },
})
