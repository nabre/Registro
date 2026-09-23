import { provaModello } from '../../../actions/templates.js'
import { sorgenteModello } from '../../../data/templates.js'
import { definisci, errore } from '../../contract.js'
import { oggetto, opzionale, testo } from '../../schemas.js'

/**
 * Compone il modello su dati veri e rimanda il PDF senza scriverlo.
 *
 * **L'altra lettura travestita da scrittura**, per lo stesso motivo di
 * `modelli.leggi`: `modello.prova` risponde in `Risposta.pdf`, che
 * `EsitoScrittura` non ha. Chiede un foglio e non cambia niente — il gestore
 * stesso torna `invariato` — quindi qui è una lettura dichiarata: niente
 * `azione:`, niente `daGestore`, la stessa funzione del gestore chiamata
 * diritta.
 *
 * Anche qui l'azione è stata ritirata, e `Risposta.pdf` con lei: la pagina
 * Modelli chiede l'anteprima con `chiedi('modelli.prova', …)`.
 *
 * `bozza` è il testo che si sta scrivendo e non è ancora salvato. Senza, si
 * guarda quel che c'è su disco — e lo si legge qui, perché il gestore vuole un
 * testo e basta: passargli la stringa vuota comporrebbe un foglio vuoto invece
 * del modello salvato.
 */
export const procedura = definisci({
  nome: 'modelli.prova',
  versione: 1,
  genere: 'lettura',
  titolo: 'L’anteprima di un modello su dati veri, in PDF, senza scrivere niente',
  idempotente: true,
  // Torna un PDF in `base64`. Al modello sarebbero migliaia di caratteri
  // illeggibili al posto dei dati, e la sua finestra è andata: di tutte le
  // letture è quella che gli farebbe più male.
  perAssistente: false,
  ingresso: oggetto({
    nome: testo({ minimo: 1 }),
    bozza: opzionale(testo({ aiuto: 'Il testo non ancora salvato. Senza, quello su disco' })),
  }),
  // Il nome accanto al foglio, come in `modelli.leggi`: un PDF in base64 non
  // dice di chi è, e chi ne chiede due di seguito — l'anteprima di prima e
  // quella di adesso — non ha modo di distinguerli guardando la busta.
  uscita: oggetto({
    nome: testo(),
    pdf: testo({ aiuto: 'Il PDF appena composto, in base64' }),
  }),
  esegui: async (ambito, ingresso) => {
    const sorgente = ingresso.bozza ?? (await sorgenteModello(ingresso.nome))
    if (sorgente === null) throw errore.rifiuta(`Il modello «${ingresso.nome}» non c’è.`)
    const esito = await provaModello(ambito.contesto.registro, ingresso.nome, sorgente)
    if (!esito.ok) throw errore.rifiuta(esito.errore)
    return { nome: ingresso.nome, pdf: esito.dati.pdf }
  },
})
