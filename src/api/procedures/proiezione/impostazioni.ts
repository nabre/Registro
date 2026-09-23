import { proiezione } from '../../../actions/projection.js'
import { BLOCCHI, VISTE_CALENDARIO } from '../../../domain/projection.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, elenco, nullabile, oggetto, scelta } from '../../schemas.js'

export const procedura = definisci({
  nome: 'proiezione.impostazioni',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Che cosa si vede sullo schermo grande: i blocchi, i nomi, la pausa',
  azione: 'proiezione.impostazioni',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    impostazioni: oggetto({
      blocchi: elenco(scelta(BLOCCHI), { aiuto: 'Le schede che esistono, non quella aperta' }),
      aperto: nullabile(scelta(BLOCCHI, { aiuto: 'La scheda che la classe sta guardando' })),
      nomi: booleano({ aiuto: 'Se accanto ai voti ci vanno i nomi' }),
      sospesa: booleano({ aiuto: 'Lo schermo in pausa' }),
      compatta: booleano({ aiuto: 'Misure strette: carattere più piccolo, meno aria' }),
      calendario: scelta(VISTE_CALENDARIO),
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(proiezione['proiezione.impostazioni'], (i: typeof ingresso) => ({
      tipo: 'proiezione.impostazioni' as const, ...i,
    }))(ambito, ingresso),
})
