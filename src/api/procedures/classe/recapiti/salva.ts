import { docenteClasse } from '../../../../actions/classTeacher.js'
import type { Recapito } from '../../../../domain/models.js'
import { validaRecapito } from '../../../../domain/validation.js'
import { inoltra, scrittura } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { testi } from '../classe.testi.js'

const t = () => testi().recapiti.salva

export const procedura = scrittura({
  nome: 'classe.recapiti.salva',
  titolo: () => t().titolo,
  azione: 'recapito.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore({ aiuto: () => t().classeId }),
    // Convalidato da `validaRecapito`, la stessa funzione del gestore.
    recapito: entita<Recapito>({ cosa: () => t().recapito, valida: validaRecapito }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId, null)
    return inoltra(docenteClasse, 'recapito.salva')(ambito, ingresso)
  },
})
