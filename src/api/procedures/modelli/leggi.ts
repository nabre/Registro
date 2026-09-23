import { leggiModello } from '../../../actions/templates.js'
import { definisci, errore } from '../../contract.js'
import { elenco, oggetto, testo } from '../../schemas.js'

/**
 * I nomi che un rapporto sa riempire: la forma di `NomiModello`.
 *
 * Dieci elenchi di parole e nient'altro. Sta qui e non in `schemas.ts` perché è
 * la risposta di una procedura sola — e perché `NomiModello` è un tipo del
 * protocollo: se gli si aggiunge un campo, questo schema smette di
 * corrispondere e il compilatore lo dice dove `modelli.leggi` lo restituisce.
 */
const NOMI_MODELLO = oggetto({
  valori: elenco(testo(), { aiuto: 'I `{{segnaposto}}` che quel rapporto produce' }),
  elenchi: elenco(testo()),
  tabelle: elenco(testo()),
  grafici: elenco(testo()),
  gallerie: elenco(testo()),
  gruppi: elenco(testo(), { aiuto: 'I gruppi su cui `ripeti:` gira' }),
  blocchi: elenco(testo(), { aiuto: 'I pezzi di `_blocchi.tpl` che `usa:` richiama' }),
  frasi: elenco(testo(), { aiuto: 'Le frasi di `_testi.tpl`' }),
  immagini: elenco(testo(), { aiuto: 'Le immagini che stanno in `templates/`' }),
  modelli: elenco(testo(), { aiuto: 'I modelli che `estende:` può nominare' }),
})

/**
 * Il testo di un modello e i nomi che quel rapporto produce.
 *
 * **È una lettura, e questa è la metà nuova di una strada che ne ha due.**
 * `modello.leggi` nel protocollo è un'azione — una scrittura — che risponde in
 * due campi buoni per lei sola, `Risposta.testo` e `Risposta.nomi`: una lettura
 * travestita da scrittura. Travestita fin che si vuole, ma il travestimento ha
 * un costo vero: il ponte verso il centralino sa tradurre un esito di
 * scrittura, e `daGestore` torna un `EsitoScrittura`, che quei due campi non li
 * ha. Passando di là la risposta si perderebbe per strada.
 *
 * Quindi niente `azione:` e niente `daGestore`: chiama `leggiModello` di
 * `actions/templates.ts`, dove quel lavoro è stato **estratto** — non copiato —
 * quando l'azione è stata ritirata.
 *
 * **L'azione non c'è più.** `modello.leggi` è sparita dal protocollo, e con lei
 * `Risposta.testo` e `Risposta.nomi`: due campi che stavano nella busta di ogni
 * scrittura del registro per servire questa chiamata sola. La pagina Modelli
 * adesso passa di qua, con `chiedi('modelli.leggi', …)`.
 */
export const procedura = definisci({
  nome: 'modelli.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: 'Il testo di un modello di templates/, e i nomi che quel rapporto riempie',
  idempotente: true,
  // Manutenzione dei modelli dei rapporti: chi scrive un `.tpl` lo fa dalla
  // pagina, non chiedendolo all'assistente.
  perAssistente: false,
  ingresso: oggetto({ nome: testo({ minimo: 1, aiuto: '`_base`, `verbale-lezione`, `_firma.html`' }) }),
  // Il nome torna indietro con il testo: una busta che porta duemila caratteri
  // di modello senza dire di quale modello siano è una busta che si può
  // attribuire al file sbagliato — e chi legge di qui, il modello
  // dell'assistente, ne apre più d'uno per rispondere a una domanda sola.
  uscita: oggetto({ nome: testo(), testo: testo(), nomi: NOMI_MODELLO }),
  esegui: async (ambito, ingresso) => {
    const esito = await leggiModello(ambito.contesto.registro, ingresso.nome)
    // Il lessico non ha un termine per «modello» — non è un documento, non è
    // un rapporto, è un file di `templates/` — e inventarne uno qui vorrebbe
    // dire una parola che il registro non usa da nessun'altra parte. Si tiene
    // la frase di `actions/templates.ts`, che quella parola la scrive già.
    if (!esito.ok) throw errore.rifiuta(esito.errore)
    return { nome: ingresso.nome, ...esito.dati }
  },
})
