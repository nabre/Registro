import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiMateria } from '../common/register.js'
import { testi } from './materie.testi.js'

export const procedura = scrittura({
  nome: 'materie.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'materia.elimina',
  idempotente: true,
  // Un'eliminazione a catena: `eliminazione()` toglie i corsi della materia e con
  // loro ore, voti, consegne e check.
  collezioni: [
    'registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check', 'smistamenti',
  ],
  ingresso: oggetto({ materiaId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiMateria(ambito, ingresso.materiaId)
    return inoltra(registro, 'materia.elimina')(ambito, ingresso)
  },
})
