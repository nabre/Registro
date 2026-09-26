import { leggiModello } from '../../../actions/templates.js'
import { definisci, errore } from '../../contract.js'
import { elenco, oggetto, testo } from '../../schemas.js'
import { testi } from './modelli.testi.js'

const t = () => testi().leggi

/**
 * I nomi che un rapporto sa riempire, nella forma di `NomiModello` del
 * protocollo: se il tipo cambia, il compilatore lo segnala dove
 * `modelli.leggi` lo restituisce.
 */
const NOMI_MODELLO = oggetto({
  valori: elenco(testo(), { aiuto: () => t().valori }),
  elenchi: elenco(testo()),
  tabelle: elenco(testo()),
  grafici: elenco(testo()),
  gallerie: elenco(testo()),
  gruppi: elenco(testo(), { aiuto: () => t().gruppi }),
  blocchi: elenco(testo(), { aiuto: () => t().blocchi }),
  frasi: elenco(testo(), { aiuto: () => t().frasi }),
  immagini: elenco(testo(), { aiuto: () => t().immagini }),
  modelli: elenco(testo(), { aiuto: () => t().modelli }),
})

/**
 * Il testo di un modello e i nomi che quel rapporto produce, quelli che il
 * registro usa per tutti i documenti.
 *
 * Lettura senza `azione:` né `daGestore` (che torna un `EsitoScrittura`, senza
 * testo e nomi): chiama direttamente `leggiModello` di `actions/templates.ts`.
 */
export const procedura = definisci({
  nome: 'modelli.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Manutenzione dei modelli: un `.tpl` si scrive in `templates/`, non si chiede
  // all'assistente.
  perAssistente: false,
  ingresso: oggetto({ nome: testo({ minimo: 1, aiuto: '`_base`, `verbale-lezione`, `_firma.html`' }) }),
  // Il nome torna con il testo: chi legge ne apre più d'uno.
  uscita: oggetto({ nome: testo(), testo: testo(), nomi: NOMI_MODELLO }),
  esegui: (ambito, ingresso) => {
    const esito = leggiModello(ambito.contesto.registro, ingresso.nome)
    // Il lessico non ha un termine per «modello»: si tiene la frase di
    // `actions/templates.ts`.
    if (!esito.ok) throw errore.rifiuta(esito.errore)
    return { nome: ingresso.nome, ...esito.dati }
  },
})
