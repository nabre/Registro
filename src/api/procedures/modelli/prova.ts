import { provaModello } from '../../../actions/templates.js'
import { definisci, errore } from '../../contract.js'
import { oggetto, testo } from '../../schemas.js'
import { testi } from './modelli.testi.js'

const t = () => testi().prova

/**
 * Compone il modello su dati veri e rimanda il PDF senza scriverlo, con la
 * carta intestata del documento (sede, nome, logo). Lettura diretta, come
 * `modelli.leggi`: `EsitoScrittura` non porta un PDF. La usa chi chiama da
 * fuori (condotto, riga di comando).
 */
export const procedura = definisci({
  // Versione 2: l'ingresso non ha `bozza` (i modelli non si scrivono dalla
  // pagina); una `bozza` mandata lo stesso la scarta `oggetto()`.
  nome: 'modelli.prova',
  versione: 2,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Torna un PDF in base64: al modello sarebbero migliaia di caratteri inutili.
  perAssistente: false,
  ingresso: oggetto({
    nome: testo({ minimo: 1, aiuto: () => t().nome }),
  }),
  // Il nome accanto al foglio: un PDF in base64 non dice di chi è.
  uscita: oggetto({
    nome: testo(),
    pdf: testo({ aiuto: () => t().pdf }),
  }),
  esegui: async (ambito, ingresso) => {
    const esito = await provaModello(ambito.contesto.registro, ingresso.nome)
    if (!esito.ok) throw errore.rifiuta(esito.errore)
    return { nome: ingresso.nome, pdf: esito.dati.pdf }
  },
})
