import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { chiSpunta, esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.spunta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'La spunta di una persona sola: fatta, o tornata da fare',
  azione: 'consegna.spunta',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiSpunta,
    fatta: booleano({ aiuto: 'false toglie la spunta — ma non se si porta dietro un documento' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Che una spunta con un documento raccolto non si tolga lo dice il
    // gestore, con la frase che spiega anche come si fa: è un rifiuto, non un
    // «non c'è».
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.spunta'], (i: typeof ingresso) => ({
      tipo: 'consegna.spunta' as const, ...i,
    }))(ambito, ingresso)
  },
})
