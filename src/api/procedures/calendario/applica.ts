import { calendario } from '../../../actions/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, elenco, identificatore, iso, oggetto, opzionale, testo } from '../../schemas.js'
import { FASCIA, REGOLA } from './common.js'
import { testi } from './calendario.testi.js'

const t = () => testi().applica

/**
 * Idempotente: una lezione da creare che trova già un'ora del suo corso lì
 * sopra non si crea di nuovo, allineare due volte scrive le stesse fasce, e
 * un'ora annullata resta annullata.
 */
export const procedura = scrittura({
  // Versione 2: senza `sorgente`. I calendari si aggiungono e tolgono con le loro
  // procedure, e qui si scrivono solo le regole.
  nome: 'calendario.applica',
  versione: 2,
  titolo: () => t().titolo,
  azione: 'calendario.applica',
  idempotente: true,
  collezioni: ['registro', 'lezioni'],
  ingresso: oggetto({
    regole: opzionale(elenco(REGOLA, { aiuto: () => t().regole })),
    automatico: opzionale(booleano({ aiuto: () => t().automatico })),
    crea: elenco(oggetto({
      corsoId: identificatore(),
      data: iso(),
      fasce: elenco(FASCIA, { minimo: 1 }),
      aula: opzionale(testo()),
    }), { aiuto: () => t().crea }),
    allinea: elenco(oggetto({
      lezioneId: identificatore(),
      fasce: opzionale(elenco(FASCIA, { minimo: 1, aiuto: () => t().fasce })),
      aula: opzionale(testo({ aiuto: () => t().aula })),
    }), { aiuto: () => t().allinea }),
    annulla: elenco(identificatore(), { aiuto: () => t().annulla }),
  }),
  esegui: inoltra(calendario, 'calendario.applica'),
})
