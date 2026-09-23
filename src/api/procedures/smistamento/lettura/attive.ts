import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { elenco, identificatore, oggetto } from '../../../schemas.js'

/**
 * Tutte le pagine ancora attive dei PDF indicati, rilette da capo.
 *
 * L'unica che porta più di un file, e l'unica senza guardia sull'esistenza: il
 * gestore filtra l'elenco contro gli smistamenti che ci sono e ignora gli id
 * che non trova. È il comportamento giusto per un comando generale — chi
 * preme «rileggi tutto» ha davanti un elenco che può essere invecchiato di un
 * istante — e un «non trovato» su uno solo dei cinque PDF farebbe fallire
 * anche gli altri quattro.
 */
export const procedura = definisci({
  nome: 'smistamento.lettura.attive',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Accoda la rilettura OCR di tutte le pagine ancora in attesa. Torna subito',
  azione: 'smistamento.rileggiAttive',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentiId: elenco(identificatore(), {
      aiuto: 'I PDF da rileggere. Gli id che non esistono più si ignorano',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => daGestore(
    smistamento['smistamento.rileggiAttive'],
    (i: typeof ingresso) => ({ tipo: 'smistamento.rileggiAttive' as const, ...i }),
  )(ambito, ingresso),
})
