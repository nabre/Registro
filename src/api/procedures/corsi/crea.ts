import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiClasse, esigiMateria } from '../common/register.js'

/**
 * Aprire un corso è idempotente davvero, e non per modo di dire: il gestore
 * torna quello che c'è già quando la coppia classe+materia è la stessa. Chi
 * ritenta dopo un errore di trasporto non si ritrova due corsi.
 */
export const procedura = definisci({
  nome: 'corsi.crea',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre un corso: questa materia, a questa classe',
  azione: 'corso.crea',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({
    classeId: identificatore(),
    materiaId: identificatore(),
    titolo: opzionale(testo({ aiuto: 'Senza, lo compone il dominio da classe e materia' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Il gestore rispondeva `Classe o materia non trovata.`: una frase sola
    // per due cose diverse, e chi la legge deve indovinare quale dei due
    // identificativi andare a riguardare.
    esigiClasse(ambito, ingresso.classeId)
    esigiMateria(ambito, ingresso.materiaId)
    return daGestore(registro['corso.crea'], (i: typeof ingresso) => ({
      tipo: 'corso.crea' as const, ...i,
    }))(ambito, ingresso)
  },
})
