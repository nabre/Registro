import { registro } from '../../../actions/register.js'
import type { Materia } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { Uno } from '../../../domain/lexicon.js'
import { testi } from './materie.testi.js'

/**
 * La materia intera, senza validatore nello schema: `validaMateria(materia,
 * altre)` vuole anche le altre materie, e le ha solo il gestore.
 */
export const procedura = scrittura({
  nome: 'materie.salva',
  titolo: () => testi().salva.titolo,
  azione: 'materia.salva',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({ materia: entita<Materia>({ cosa: () => Uno(lessico().materia) }) }),
  esegui: inoltra(registro, 'materia.salva'),
})
