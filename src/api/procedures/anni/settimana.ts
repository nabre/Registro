import { registro } from '../../../actions/register.js'
import type { LetteraSettimana } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, nullabile, oggetto, scelta } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'

/**
 * Le due lettere della quindicina.
 *
 * Scritte qui e non dedotte da `modelli.ts` perché uno schema ha bisogno dei
 * valori quando compila; il `satisfies` fa sì che una terza lettera aggiunta
 * al modello e dimenticata qui non compili.
 */
const LETTERE = ['A', 'B'] as const satisfies readonly LetteraSettimana[]

export const procedura = definisci({
  nome: 'anni.settimana',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Dice se la settimana di un giorno è una A, una B, o nessuna delle due',
  azione: 'anno.settimana',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    annoId: identificatore(),
    giorno: iso({ aiuto: 'Un giorno qualunque: conta il lunedì che apre la sua settimana' }),
    lettera: nullabile(scelta(LETTERE, {
      aiuto: 'null toglie la lettera e lascia la settimana senza',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiAnno(ambito, ingresso.annoId)
    return daGestore(registro['anno.settimana'], (i: typeof ingresso) => ({
      tipo: 'anno.settimana' as const, ...i,
    }))(ambito, ingresso)
  },
})
