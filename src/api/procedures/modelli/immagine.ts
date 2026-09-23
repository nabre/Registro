import { modelli } from '../../../actions/templates.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'modelli.immagine',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Porta un’immagine dentro templates/: il logo della sede',
  azione: 'modello.immagine',
  // L'ingresso è vuoto e il file lo sceglie una finestra del sistema: due
  // chiamate uguali possono portare dentro due immagini diverse.
  idempotente: false,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(modelli['modello.immagine'], (i: typeof ingresso) => ({
      tipo: 'modello.immagine' as const, ...i,
    }))(ambito, ingresso),
})
