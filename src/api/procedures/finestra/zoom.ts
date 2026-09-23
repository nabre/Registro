// Quanto è grande quel che si vede, di un passo per volta.
//
// Dichiarata `scrittura` benché nell'archivio non scriva niente, per la stessa
// ragione di `vista.apri`: il genere non dice se il file cambia, dice se chi
// chiama da fuori può farlo senza il permesso di scrivere. Una riga di comando
// che ingrandisse lo schermo di chi sta facendo lezione è esattamente quel che
// la sola lettura non deve concedere.
//
// Al modello dell'assistente non si concede: non dichiara `assistente`, e il
// valore assente vale `false`.

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, scelta } from '../../schemas.js'

export const procedura = definisci({
  nome: 'finestra.zoom',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Ingrandisce o riduce quel che si vede nella finestra del registro',
  azione: 'finestra.zoom',
  // Non lo è: due «avanti» ingrandiscono due volte. Lo dice, invece di
  // lasciarlo credere a chi ritenta una chiamata che non ha avuto risposta.
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    verso: scelta(['avanti', 'indietro', 'azzera'] as const, {
      aiuto:
        'Di un passo: «avanti» ingrandisce, «indietro» riduce, ' +
        '«azzera» rimette la finestra alla sua misura',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['finestra.zoom'], (i: typeof ingresso) => ({
      tipo: 'finestra.zoom' as const, ...i,
    }))(ambito, ingresso),
})
