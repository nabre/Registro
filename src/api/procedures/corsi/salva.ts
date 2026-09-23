import { registro } from '../../../actions/register.js'
import type { Corso } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { esigiClasse, esigiMateria } from '../common/register.js'

/** Come per la materia: `validaCorso(corso, altri)` ha bisogno degli altri corsi. */
export const procedura = definisci({
  nome: 'corsi.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive un corso intero, nuovo o già esistente',
  azione: 'corso.salva',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({ corso: entita<Corso>({ cosa: 'Corso' }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // `validaCorso` guarda che `classeId` e `materiaId` non siano vuoti, non
    // che esistano: un corso con riferimenti inventati entrava e restava, e la
    // rottura si vedeva a gennaio — «una classe che non c'è mai stata, e il
    // registro gliene mostra zero senza dire perché», come dice l'intestazione
    // di questo file. `corsi.crea`, che è il gemello, le due guardie le aveva.
    esigiClasse(ambito, ingresso.corso.classeId)
    esigiMateria(ambito, ingresso.corso.materiaId)
    return daGestore(registro['corso.salva'], (i: typeof ingresso) => ({
      tipo: 'corso.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
