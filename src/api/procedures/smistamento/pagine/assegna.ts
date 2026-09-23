import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/**
 * Le pagine trascinate sulla casella di una persona.
 *
 * Non idempotente, ed è la più importante da dichiarare così: ritaglia un PDF
 * nuovo dentro il fascicolo, mette la spunta sulla richiesta e toglie le
 * pagine dalle letture. Ritentarla dopo un errore di trasporto vuol dire
 * sentirsi rispondere «ha già un documento» — che è il no giusto, ma è pur
 * sempre un no.
 *
 * La richiesta non si controlla qui: il gestore la guarda già e rifiuta con la
 * sua frase se non era stata fatta a quella persona, e un secondo «non
 * trovato» qui darebbe due frasi diverse per la stessa porta chiusa.
 */
export const procedura = definisci({
  nome: 'smistamento.pagine.assegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Archivia le pagine scelte come documento di una persona',
  azione: 'smistamento.assegnaPagine',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore(),
    allievoId: identificatore(),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.assegnaPagine'], (i: typeof ingresso) => ({
      tipo: 'smistamento.assegnaPagine' as const, ...i,
    }))(ambito, ingresso)
  },
})
