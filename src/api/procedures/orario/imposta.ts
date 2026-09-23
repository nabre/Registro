import { registro } from '../../../actions/register.js'
import { validaRicorrenza } from '../../../domain/validation.js'
import { definisci, errore } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, identificatore, iso, numero, oggetto, opzionale, ora, testo } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'

/**
 * Una fascia fissa dell'orario.
 *
 * `giorno` fra 1 e 7 e `durataMin` intera sono il significato del campo, non
 * una regola nuova: nell'editor dell'orario il giorno viene da un elenco
 * chiuso e i minuti da `minutiDaUd(...)`, che è un multiplo intero dell'unità
 * didattica. Del resto — le fasce che si sovrappongono, il periodo rovesciato
 * — non si dice niente qui: lo sa `validaRicorrenza`, che guarda anche le
 * altre fasce dello stesso corso e che `orario.imposta` chiama su ogni fascia
 * prima di passare la palla al gestore.
 */
const ricorrenza = oggetto({
  id: identificatore(),
  giorno: numero({ intero: true, minimo: 1, massimo: 7, aiuto: '1 = lunedì … 7 = domenica' }),
  inizio: ora(),
  durataMin: numero({ intero: true, minimo: 1, aiuto: 'Quanto dura la fascia, in minuti' }),
  aula: opzionale(testo()),
  dal: opzionale(iso({ aiuto: 'Da quando vale la fascia. Senza, da sempre' })),
  al: opzionale(iso({ aiuto: 'Fino a quando. Senza, fino alla fine dell’anno' })),
})

export const procedura = definisci({
  nome: 'orario.imposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Le ore fisse di un corso, senza rimandare indietro il corso intero',
  azione: 'orario.imposta',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({
    corsoId: identificatore(),
    orario: elenco(ricorrenza, {
      aiuto: 'Le fasce fisse: l’elenco sostituisce quello di prima, non ci si aggiunge',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    // Il commento in testa a `ricorrenza` dichiara da sempre che le fasce
    // sovrapposte e il periodo rovesciato «li sa `validaRicorrenza`»: qui è il
    // punto in cui li sa davvero. Prima nessuno la chiamava — fuori dalle
    // prove non c'era un solo chiamante — e due fasce gemelle si salvavano
    // senza una protesta, per poi generare due volte la stessa lezione e far
    // scartare la seconda in silenzio. Ogni fascia si guarda contro le altre
    // dell'elenco che sta arrivando, che è l'elenco che sostituirà il vecchio.
    for (const fascia of ingresso.orario) {
      const esito = validaRicorrenza(fascia, ingresso.orario)
      if (!esito.valido) throw errore.rifiuta(esito.errori.join(' '))
    }
    return daGestore(registro['orario.imposta'], (i: typeof ingresso) => ({
      tipo: 'orario.imposta' as const, ...i,
    }))(ambito, ingresso)
  },
})
