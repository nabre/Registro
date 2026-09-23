import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiMateria } from '../common/register.js'

export const procedura = definisci({
  nome: 'materie.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie una materia e i corsi che la insegnavano',
  azione: 'materia.elimina',
  idempotente: true,
  // Un'eliminazione è una catena: `eliminazione()` calcola quel che sparisce
  // dietro la materia — i suoi corsi, e dietro i corsi ore, voti e consegne —
  // e dichiararne meno vorrebbe dire promettere a chi chiama che certi file
  // non si muovono, mentre si muovono.
  collezioni: ['registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'smistamenti'],
  ingresso: oggetto({ materiaId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiMateria(ambito, ingresso.materiaId)
    return daGestore(registro['materia.elimina'], (i: typeof ingresso) => ({
      tipo: 'materia.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})
