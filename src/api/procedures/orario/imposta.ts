import { registro } from '../../../actions/register.js'
import { validaRicorrenza } from '../../../domain/validation.js'
import { errore } from '../../contract.js'
import { inoltra, scrittura } from '../../core.js'
import { elenco, identificatore, iso, numero, oggetto, opzionale, ora, testo } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
import { testi } from './orario.testi.js'

const t = () => testi().imposta

/**
 * Una fascia fissa dell'orario. `giorno` fra 1 e 7 e `durataMin` intera, come
 * nell'editor (elenco chiuso, `minutiDaUd(...)`). Sovrapposizioni e periodi
 * rovesciati li controlla `validaRicorrenza`, chiamata qui sotto su ogni fascia.
 */
const ricorrenza = oggetto({
  id: identificatore(),
  giorno: numero({ intero: true, minimo: 1, massimo: 7, aiuto: () => t().giorno }),
  inizio: ora(),
  durataMin: numero({ intero: true, minimo: 1, aiuto: () => t().durataMin }),
  aula: opzionale(testo()),
  dal: opzionale(iso({ aiuto: () => t().dal })),
  al: opzionale(iso({ aiuto: () => t().al })),
})

export const procedura = scrittura({
  nome: 'orario.imposta',
  titolo: () => t().titolo,
  azione: 'orario.imposta',
  idempotente: true,
  collezioni: ['corsi'],
  ingresso: oggetto({
    corsoId: identificatore(),
    orario: elenco(ricorrenza, {
      aiuto: () => t().orario,
    }),
  }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    // Ogni fascia contro le altre dell'elenco in arrivo, che sostituirà il vecchio:
    // due fasce gemelle genererebbero due volte la stessa lezione.
    for (const fascia of ingresso.orario) {
      const { minutiUd } = ambito.contesto.registro.impostazioni
      const esito = validaRicorrenza(fascia, minutiUd, ingresso.orario)
      if (!esito.valido) throw errore.rifiuta(esito.errori.join(' '))
    }
    return inoltra(registro, 'orario.imposta')(ambito, ingresso)
  },
})
