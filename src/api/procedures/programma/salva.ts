import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, qualunque, type Schema } from '../../schemas.js'
import { chiaveProgramma } from './common.js'
import { testi } from './programma.testi.js'

/**
 * Il valore: testo, numero o vero/falso. Largo apposta: tipo e scelte ammesse
 * per ogni chiave li sa `valoreConMotivo(chiave, valore)`, accanto al
 * manifesto.
 */
const VALORE_PROGRAMMA = qualunque({
  aiuto: () => testi().salva.valore,
}) as Schema<string | number | boolean>

export const procedura = scrittura({
  nome: 'programma.salva',
  titolo: () => testi().salva.titolo,
  azione: 'programma.salva',
  // `update` non riscrive il file se il valore è già quello.
  idempotente: true,
  // `impostazioni.json` sta in `userData`, non è una collezione del registro.
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    chiave: chiaveProgramma(),
    valore: VALORE_PROGRAMMA,
  }),
  esegui: inoltra(sistema, 'programma.salva'),
})
