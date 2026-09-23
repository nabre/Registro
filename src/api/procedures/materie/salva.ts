import { registro } from '../../../actions/register.js'
import type { Materia } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'

/**
 * La materia arriva intera e senza validatore nello schema.
 *
 * `validaMateria(materia, altre)` vuole sapere anche le altre materie — due
 * nomi uguali non possono convivere — e quel secondo argomento ce l'ha solo
 * chi ha in mano il registro. Resta dove sa le cose: nel gestore.
 */
export const procedura = definisci({
  nome: 'materie.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive una materia, nuova o già esistente',
  azione: 'materia.salva',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({ materia: entita<Materia>({ cosa: 'Materia' }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(registro['materia.salva'], (i: typeof ingresso) => ({
      tipo: 'materia.salva' as const, ...i,
    }))(ambito, ingresso),
})
