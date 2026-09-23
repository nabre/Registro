import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/**
 * Le pagine archiviate per sbaglio, riprese.
 *
 * Idempotente allo stesso modo di `scarta`: il secondo giro non trova più
 * niente di archiviato fra quelle pagine e risponde di no senza toccare
 * niente. Il registro resta come dopo il primo.
 *
 * Vale la pena sapere che **torna indietro tutto il documento**, non la sola
 * pagina chiesta: chi chiama da fuori con `pagine: [4]` si ritrova in
 * quarantena anche la 3 e la 5, se stavano nello stesso fascicolo. È voluto —
 * mezzo documento nel fascicolo di qualcuno è un documento monco — e si dice
 * qui perché dall'ingresso non si indovina.
 */
export const procedura = definisci({
  nome: 'smistamento.pagine.riprendi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Riporta in quarantena i documenti di cui quelle pagine facevano parte',
  azione: 'smistamento.riprendiPagine',
  idempotente: true,
  collezioni: ['consegne', 'fascicoli', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine('Basta una pagina per riprendere il documento intero'),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.riprendiPagine'], (i: typeof ingresso) => ({
      tipo: 'smistamento.riprendiPagine' as const, ...i,
    }))(ambito, ingresso)
  },
})
