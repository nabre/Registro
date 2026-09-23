import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto, opzionale } from '../../../schemas.js'
import { comeDivisione, divisione, esigiSmistamento } from '../common.js'

/**
 * Il modo di taglio cambiato su un PDF già in attesa.
 *
 * **Marcata legacy nel codice**: nessuna vista la manda più — il flusso a
 * blocchi è stato sostituito da quello per pagine — e resta perché
 * `tests/data/sorting.test.mjs` la esercita e perché descrive un caso che
 * il flusso per pagine non copre. Sotto contratto ci va lo stesso, proprio per
 * quelle prove: se un giorno si toglie, si toglie insieme a loro.
 *
 * Idempotente sì: scrivere due volte lo stesso modo e rifare la bozza due
 * volte lascia i blocchi identici.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.dividi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Cambia dove cadono le forbici e rifà la bozza (legacy: la usano le prove)',
  azione: 'smistamento.dividi',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    divisione: opzionale(divisione()),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.dividi'], (i: typeof ingresso) => ({
      tipo: 'smistamento.dividi' as const, ...i, divisione: comeDivisione(i.divisione),
    }))(ambito, ingresso)
  },
})
