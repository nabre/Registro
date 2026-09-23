import { ore } from '../../../actions/hours.js'
import type { Lezione } from '../../../domain/models.js'
import { validaLezione } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'ore.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive un’ora per intero: la crea se non c’era, la riscrive se c’era',
  azione: 'lezione.salva',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    // L'entità intera passa da `validaLezione`, che è l'unico posto dove sta
    // scritto che uno slot dura un multiplo esatto di unità didattica. Ridirlo
    // qui in forma di schema vorrebbe dire due verità da tenere allineate.
    lezione: entita<Lezione>({
      cosa: 'Lezione',
      valida: validaLezione,
      aiuto: 'L’ora per intero: corso, giorno, fasce, stato',
    }),
  }),
  uscita: SCRITTURA,
  // Nessuna guardia: è una scrittura per id, e un id che qui non c'è vuol dire
  // «creala», non «non l'ho trovata».
  esegui: (ambito, ingresso) =>
    daGestore(ore['lezione.salva'], (i: typeof ingresso) => ({
      tipo: 'lezione.salva' as const, ...i,
    }))(ambito, ingresso),
})
