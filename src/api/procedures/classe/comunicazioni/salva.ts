import { docenteClasse } from '../../../../actions/classTeacher.js'
import { Uno } from '../../../../domain/lexicon.js'
import { lessico } from '../../../../domain/lexicon.testi.js'
import type { Comunicazione } from '../../../../domain/models.js'
import { validaComunicazione } from '../../../../domain/validation.js'
import { inoltra, scrittura } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { testi } from '../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.comunicazioni.salva',
  titolo: () => testi().comunicazioni.salva.titolo,
  azione: 'comunicazione.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazione: entita<Comunicazione>({
      cosa: () => Uno(lessico().comunicazione),
      valida: validaComunicazione,
    }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId, null)
    return inoltra(docenteClasse, 'comunicazione.salva')(ambito, ingresso)
  },
})
