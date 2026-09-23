import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiMateria } from '../common/register.js'

export const procedura = definisci({
  nome: 'materie.unisci',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Fonde due materie nate dalla stessa cosa, e con loro i corsi gemelli',
  azione: 'materia.unisci',
  idempotente: true,
  collezioni: ['registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne'],
  ingresso: oggetto({
    daId: identificatore({ aiuto: 'La materia che sparisce' }),
    aId: identificatore({ aiuto: 'Quella che resta' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Una delle due già fusa da un'altra finestra è un «non c'è più», non un
    // «non si può»: il gestore diceva `Materia non trovata.` con lo stesso
    // esito di «Sono la stessa materia», che invece non si ritenta mai.
    esigiMateria(ambito, ingresso.daId)
    esigiMateria(ambito, ingresso.aId)
    return daGestore(registro['materia.unisci'], (i: typeof ingresso) => ({
      tipo: 'materia.unisci' as const, ...i,
    }))(ambito, ingresso)
  },
})
