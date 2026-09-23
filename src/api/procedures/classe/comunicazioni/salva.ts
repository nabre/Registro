import { docenteClasse } from '../../../../actions/classTeacher.js'
import type { Comunicazione } from '../../../../domain/models.js'
import { validaComunicazione } from '../../../../domain/validation.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../common.js'

export const procedura = definisci({
  nome: 'classe.comunicazioni.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Salva la bozza di una comunicazione alla classe',
  azione: 'comunicazione.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazione: entita<Comunicazione>({
      cosa: 'Comunicazione',
      valida: validaComunicazione,
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(docenteClasse['comunicazione.salva'], (i: typeof ingresso) => ({
      tipo: 'comunicazione.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
