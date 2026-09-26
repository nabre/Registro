// I modelli consigliati e quelli trovati cercando su Hugging Face, nella
// stessa forma di riga. Senza `cerca` torna solo il catalogo, come la pagina
// appena aperta.

import { definisci } from '../../contract.js'
import { CATALOGO, cerca } from '../../../data/huggingFace.js'
import { booleano, elenco, numero, oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().catalogo
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'llm.catalogo',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Fuori dalla mano del modello: `cerca` finisce in una richiesta a Hugging
  // Face, e `data/llm.ts` promette che non c'è un filo verso fuori.
  perAssistente: false,
  ingresso: oggetto({
    cerca: opzionale(testo({
      aiuto: () => t().cercaIngresso,
    })),
  }),
  uscita: oggetto({
    // Che cosa si è cercato: distingue «non ho cercato» da «nessun risultato».
    cerca: testo({ aiuto: () => t().cercaUscita }),
    consigliati: elenco(oggetto({
      deposito: testo({ aiuto: () => t().deposito }),
      titolo: testo(),
      perChe: scelta(['assistente', 'ocr'], { aiuto: () => t().perChe }),
      taglio: testo({ aiuto: () => t().taglio }),
      nota: testo({ aiuto: () => t().nota }),
    })),
    trovati: elenco(oggetto({
      id: testo(),
      scarichi: numero({ aiuto: () => t().scarichi }),
      ristretto: booleano({ aiuto: () => t().ristretto }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'consigliati',
        titolo: () => p().consigliati,
        colonne: [
          { campo: 'titolo', testo: () => p().modello },
          { campo: 'perChe', testo: () => p().per },
          { campo: 'taglio', testo: () => p().taglio },
          { campo: 'deposito', testo: () => p().deposito },
          { campo: 'nota', testo: () => p().nota },
        ],
      },
      {
        tipo: 'tabella',
        da: 'trovati',
        titolo: () => p().trovati,
        colonne: [
          { campo: 'id', testo: () => p().deposito },
          { campo: 'scarichi', testo: () => p().scarichi, formato: 'numero' },
          { campo: 'ristretto', testo: () => p().ristretto, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) => ({
    cerca: ingresso.cerca ?? '',
    consigliati: CATALOGO.map((voce) => ({ ...voce })),
    // Una ricerca fallita (niente rete, sito giù) non fa fallire la lettura: il
    // catalogo si mostra lo stesso.
    trovati: ingresso.cerca ? await cerca(ingresso.cerca).catch(() => []) : [],
  }),
})
