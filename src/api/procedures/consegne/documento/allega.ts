import { consegne } from '../../../../actions/assignments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna, perChi } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.documento.allega',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mette da parte il documento da dare a qualcuno, prima di consegnarlo',
  azione: 'consegna.documento.allega',
  // Dialogo e copia di file, come `raccogli`.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.documento.allega'], (i: typeof ingresso) => ({
      tipo: 'consegna.documento.allega' as const, ...i,
    }))(ambito, ingresso)
  },
})
