import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, qualunque, type Schema } from '../../schemas.js'
import { chiaveProgramma } from './common.js'

/**
 * Il valore: testo, numero o vero/falso, e nient'altro deciso qui.
 *
 * Largo apposta. Quale dei tre tipi vada, quali scelte siano ammesse e che
 * cosa succeda al valore sbagliato lo sa `valoreAccettabile(chiave, valore)`,
 * che è la dogana vera e sta dove sa le cose: accanto al manifesto. Uno schema
 * che provasse a rifarne il lavoro dovrebbe conoscere il tipo di ogni chiave
 * — e lo conoscerebbe al momento in cui è stato scritto, non a quello in cui
 * gira.
 */
const VALORE_PROGRAMMA = qualunque({
  aiuto: 'Testo, numero o vero/falso: quale dei tre lo dice la voce del manifesto',
}) as Schema<string | number | boolean>

export const procedura = definisci({
  nome: 'programma.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Un’impostazione del programma, quelle che restano su questa macchina',
  azione: 'programma.salva',
  // Riscrivere lo stesso valore non cambia niente: `update` si accorge da sé
  // che il valore è già quello e non riscrive il file.
  idempotente: true,
  // Non è il documento d'anno: `impostazioni.json` sta in `userData` e non è
  // una collezione del registro.
  collezioni: [],
  ingresso: oggetto({
    chiave: chiaveProgramma(),
    valore: VALORE_PROGRAMMA,
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['programma.salva'], (i: typeof ingresso) => ({
      tipo: 'programma.salva' as const, ...i,
    }))(ambito, ingresso),
})
