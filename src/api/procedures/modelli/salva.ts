import { modelli } from '../../../actions/templates.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, opzionale, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'modelli.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive il modello com’è adesso nella pagina',
  azione: 'modello.salva',
  idempotente: true,
  // Scrive un file in `templates/`, che nel registro non c'è.
  collezioni: [],
  ingresso: oggetto({
    nome: testo({ minimo: 1 }),
    testo: testo({ aiuto: 'Il sorgente intero del modello' }),
    attesoSuDisco: opzionale(testo({
      aiuto: 'L’impronta del testo che la pagina credeva ci fosse: senza, non si controlla',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(modelli['modello.salva'], (i: typeof ingresso) => ({
      tipo: 'modello.salva' as const, ...i,
    }))(ambito, ingresso),
})
