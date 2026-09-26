import { registro } from '../../../actions/register.js'
import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { Corso } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { esigiClasse, esigiMateria } from '../common/register.js'
import { testi } from './corsi.testi.js'

/** `validaCorso(corso, altri)` ha bisogno degli altri corsi, come per la materia. */
export const procedura = scrittura({
  nome: 'corsi.salva',
  titolo: () => testi().salva.titolo,
  azione: 'corso.salva',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({ corso: entita<Corso>({ cosa: () => Uno(lessico().corso) }) }),
  esegui: (ambito, ingresso) => {
    // `validaCorso` controlla che `classeId` e `materiaId` non siano vuoti, non che
    // esistano: lo fanno queste guardie, come in `corsi.crea`.
    esigiClasse(ambito, ingresso.corso.classeId)
    esigiMateria(ambito, ingresso.corso.materiaId)
    return inoltra(registro, 'corso.salva')(ambito, ingresso)
  },
})
