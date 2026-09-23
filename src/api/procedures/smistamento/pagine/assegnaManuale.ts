import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagina } from '../common.js'

/**
 * L'assegnazione a mano, per estremi.
 *
 * **Marcata legacy nel codice**, come `smistamento.pdf.dividi`: nessuna vista
 * la manda più, la esercitano le prove. Sotto contratto perché quelle prove
 * passano di qui, adesso.
 *
 * `da` e `a` non si controllano l'uno contro l'altro: un intervallo alla
 * rovescia lo rifiuta lo smistatore, che sa anche quante pagine ha il PDF —
 * qui si saprebbe solo metà della cosa, e mezza risposta è una risposta
 * sbagliata.
 *
 * Non idempotente: ritaglia, archivia e mette una spunta. Alla seconda
 * chiamata la casella è già piena e la risposta è «ha già un documento».
 */
export const procedura = definisci({
  nome: 'smistamento.pagine.assegnaManuale',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Archivia un intervallo di pagine a una persona (legacy: la usano le prove)',
  azione: 'smistamento.assegnaManuale',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore({ aiuto: 'Il documento sotto cui archiviare' }),
    allievoId: identificatore(),
    da: pagina(),
    a: pagina(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.assegnaManuale'], (i: typeof ingresso) => ({
      tipo: 'smistamento.assegnaManuale' as const, ...i,
    }))(ambito, ingresso)
  },
})
