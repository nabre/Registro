import { piani } from '../../../actions/plans.js'
import type { PianoLezione } from '../../../domain/models.js'
import { validaPiano } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'piani.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive un piano per intero: lo crea se non c’era, lo riscrive se c’era',
  azione: 'piano.salva',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    // Con `validaPiano`, che è dove sta scritto che una tappa dura un numero
    // di quarti di unità didattica e non un tempo qualunque. Riscriverlo qui
    // in forma di schema vorrebbe dire due verità da tenere allineate a mano.
    piano: entita<PianoLezione>({
      cosa: 'Piano lezione',
      valida: validaPiano,
      aiuto: 'Il piano per intero: obiettivi, scaletta, risorse, etichette',
    }),
  }),
  uscita: SCRITTURA,
  // Nessuna guardia: è una scrittura per id, e un id che qui non c'è vuol dire
  // «crealo», non «non l'ho trovato».
  esegui: (ambito, ingresso) =>
    daGestore(piani['piano.salva'], (i: typeof ingresso) => ({
      tipo: 'piano.salva' as const, ...i,
    }))(ambito, ingresso),
})
