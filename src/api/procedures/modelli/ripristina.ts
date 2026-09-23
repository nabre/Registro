import { modelli } from '../../../actions/templates.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'modelli.ripristina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Rimette il modello di serie, buttando via quel che c’era',
  azione: 'modello.ripristina',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ nome: testo({ minimo: 1 }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(modelli['modello.ripristina'], (i: typeof ingresso) => ({
      tipo: 'modello.ripristina' as const, ...i,
    }))(ambito, ingresso),
})
