import { consegne } from '../../../../core/azioni/assignments.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiConsegna, perChi } from '../common.js'
import { testi } from '../consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.documento.allega',
  titolo: () => testi().documento.allega.titolo,
  azione: 'consegna.documento.allega',
  // Dialogo e copia di file, come `raccogli`.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
    file: opzionale(testo({ aiuto: () => testi().documento.allega.file })),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.documento.allega')(ambito, ingresso)
  },
})
