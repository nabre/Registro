// Tutte le pendenze aperte di una classe.
// Espone il giudizio di `todoDellaClasse` (assenze da firmare, prove da correggere o riconsegnare, recuperi, consegne).

import { oggi } from '../../../core/dominio/dates.js'
import { FAMIGLIE_TODO, todoDellaClasse } from '../../../core/dominio/todo.js'
import { definisci } from '../../contract.js'
import {
  elenco,
  identificatore,
  iso,
  numero,
  oggetto,
  opzionale,
  testo,
} from '../../schemas.js'
import { esigiClasse } from '../common/register.js'
import { testi } from './classe.testi.js'

const t = () => testi().pendenze
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'classe.pendenze',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: identificatore({ aiuto: () => t().classeId }),
    oggi: opzionale(iso({ aiuto: () => t().oggi })),
  }),
  uscita: oggetto({
    classeId: testo(),
    classe: testo(),
    aperti: numero({ intero: true, aiuto: () => p().totale }),
    urgenti: numero({ intero: true, aiuto: () => p().urgenti }),
    famiglie: elenco(oggetto({
      famiglia: testo({ aiuto: () => p().famiglia }),
      aperti: numero({ intero: true }),
      urgenti: numero({ intero: true }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'aperti', etichetta: () => p().totale, formato: 'numero' },
          { campo: 'urgenti', etichetta: () => p().urgenti, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'famiglie',
        colonne: [
          { campo: 'famiglia', testo: () => p().famiglia },
          { campo: 'aperti', testo: () => p().totale, formato: 'numero' },
          { campo: 'urgenti', testo: () => p().urgenti, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const cl = esigiClasse(ambito, ingresso.classeId)
    const giorno = ingresso.oggi ?? oggi()

    const todo = todoDellaClasse(r, cl, r.corsi, giorno)

    const famiglie = FAMIGLIE_TODO.map((f) => ({
      famiglia: f,
      aperti: todo.conti[f].aperti,
      urgenti: todo.conti[f].urgenti,
    }))

    return {
      classeId: cl.id,
      classe: cl.nome,
      aperti: todo.aperti,
      urgenti: todo.urgenti,
      famiglie,
    }
  },
})
