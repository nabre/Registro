import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'manutenzione.ripara',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Applica tutte le correzioni che il registro sa fare da solo',
  azione: 'manutenzione.ripara',
  // Le correzioni si applicano finché ce n'è: alla seconda chiamata non ce n'è
  // più, e la risposta è «non c'è niente da riparare».
  idempotente: true,
  // Quali toccherà lo dicono le correzioni trovate, una per una: qui stanno
  // tutte quelle che `domain/repairs.ts` sa produrre, che è il massimo
  // onesto — dichiararne meno vorrebbe dire dichiarare il caso fortunato.
  collezioni: ['registro', 'classi', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne'],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['manutenzione.ripara'], (i: typeof ingresso) => ({
      tipo: 'manutenzione.ripara' as const, ...i,
    }))(ambito, ingresso),
})
