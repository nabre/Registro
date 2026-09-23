import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { chiSpunta, esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.raccogli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Spunta raccogliendo il foglio: il file si archivia dentro la spunta',
  azione: 'consegna.raccogli',
  // Apre un dialogo e copia un file. Due chiamate sono due scelte, e chi
  // ritenta dopo un errore di trasporto si ritrova a riscegliere il file.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiSpunta,
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.raccogli'], (i: typeof ingresso) => ({
      tipo: 'consegna.raccogli' as const, ...i,
    }))(ambito, ingresso)
  },
})
