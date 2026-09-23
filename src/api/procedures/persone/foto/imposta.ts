import { registro } from '../../../../actions/register.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiPersona } from '../common.js'

/**
 * Non idempotente: apre il dialogo di sistema con cui si sceglie il file.
 *
 * Due chiamate uguali non fanno la stessa cosa, perché la seconda volta chi
 * guarda può scegliere un'altra foto — o chiudere il dialogo, e allora il
 * registro resta com'era, che è un terzo esito ancora.
 */
export const procedura = definisci({
  nome: 'persone.foto.imposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Il ritratto di una persona: si sceglie dal disco e se ne tiene una copia',
  azione: 'allievo.foto.imposta',
  idempotente: false,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return daGestore(registro['allievo.foto.imposta'], (i: typeof ingresso) => ({
      tipo: 'allievo.foto.imposta' as const, ...i,
    }))(ambito, ingresso)
  },
})
