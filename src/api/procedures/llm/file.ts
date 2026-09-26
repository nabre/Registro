// I file che un deposito pubblica davvero: lo stesso modello in più
// quantizzazioni (`Q4_K_M`, `Q8_0`, `F16`), da scegliere per nome. Si chiedono
// al sito perché i nomi cambiano a ogni ripubblicazione.

import { definisci } from '../../contract.js'
import { fileConsigliato, fileDelDeposito, proiettoreDi } from '../../../data/huggingFace.js'
import { booleano, elenco, numero, oggetto, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().file
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'llm.file',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Come `llm.catalogo`: `deposito` diventa parte di un indirizzo di Hugging
  // Face, non si mette in mano al modello.
  perAssistente: false,
  ingresso: oggetto({
    deposito: testo({
      aiuto: () => t().depositoIngresso,
      esempio: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    }),
    taglio: testo({
      aiuto: () => t().taglioIngresso,
      esempio: 'Q4_K_M',
    }),
  }),
  uscita: oggetto({
    // Deposito e taglio chiesti tornano nella busta, che dice di chi sono i file.
    deposito: testo({ aiuto: () => t().depositoUscita }),
    taglio: testo({ aiuto: () => t().taglioUscita }),
    file: elenco(oggetto({
      percorso: testo({ aiuto: () => t().percorso }),
      byte: numero(),
      taglio: testo({ aiuto: () => t().taglioFile }),
      proiettore: booleano({ aiuto: () => t().proiettoreFile }),
    })),
    consigliato: testo({ aiuto: () => t().consigliato }),
    proiettore: testo({ aiuto: () => t().proiettore }),
    motivo: testo({ aiuto: () => t().motivo }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'deposito', etichetta: () => p().deposito },
          { campo: 'taglio', etichetta: () => p().taglioChiesto },
          { campo: 'consigliato', etichetta: () => p().consigliato },
          { campo: 'proiettore', etichetta: () => p().proiettoreInsieme },
          { campo: 'motivo', etichetta: () => p().motivo },
        ],
      },
      {
        tipo: 'tabella',
        da: 'file',
        colonne: [
          { campo: 'percorso', testo: () => p().file },
          { campo: 'taglio', testo: () => p().taglio },
          { campo: 'byte', testo: () => p().pesa, formato: 'byte' },
          { campo: 'proiettore', testo: () => p().proiettore, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) => {
    // Il sito che non risponde non fa fallire la procedura: elenco vuoto con la
    // ragione accanto, come in `llm.catalogo`.
    const file = await fileDelDeposito(ingresso.deposito).catch((guasto: unknown) => {
      return { motivo: guasto instanceof Error ? guasto.message : t().nonRisponde }
    })
    const chiesto = { deposito: ingresso.deposito, taglio: ingresso.taglio }
    if (!Array.isArray(file)) {
      return { ...chiesto, file: [], consigliato: '', proiettore: '', motivo: file.motivo }
    }
    return {
      ...chiesto,
      file,
      consigliato: fileConsigliato(file, ingresso.taglio)?.percorso ?? '',
      // Il proiettore è la metà mancante del modello che guarda: si scarica insieme.
      proiettore: proiettoreDi(file)?.percorso ?? '',
      motivo: '',
    }
  },
})
