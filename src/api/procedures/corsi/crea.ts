import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiClasse, esigiMateria } from '../common/register.js'
import { testi } from './corsi.testi.js'

const t = () => testi().crea

/**
 * Idempotente: con la stessa coppia classe+materia il gestore torna il corso
 * che c'è già.
 */
export const procedura = scrittura({
  nome: 'corsi.crea',
  titolo: () => t().titolo,
  azione: 'corso.crea',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({
    classeId: identificatore(),
    materiaId: identificatore(),
    titolo: opzionale(testo({ aiuto: () => t().titoloCorso })),
  }),
  esegui: (ambito, ingresso) => {
    // Due guardie distinte: il gestore direbbe una frase sola per classe e materia.
    esigiClasse(ambito, ingresso.classeId)
    esigiMateria(ambito, ingresso.materiaId)
    return inoltra(registro, 'corso.crea')(ambito, ingresso)
  },
})
