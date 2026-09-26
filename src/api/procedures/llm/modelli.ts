// I modelli sul disco e quale lavora per che cosa: la sezione «Modelli
// linguistici» delle impostazioni. Torna anche la cartella, per poterla aprire.

import { definisci } from '../../contract.js'
import { cartellaModelli, modelliLocali } from '../../../data/gguf.js'
import { collegamento, prontezza } from '../../../data/llm.js'
import { booleano, elenco, numero, oggetto, opzionale, scelta, testo, vuoto } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().modelli
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'llm.modelli',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Manutenzione dei modelli: non è una domanda da registro di classe.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    cartella: testo({ aiuto: () => t().cartella }),
    modelli: elenco(oggetto({
      nome: testo({ aiuto: () => t().nome }),
      byte: numero({ aiuto: () => t().byte }),
      proiettore: booleano({ aiuto: () => t().proiettore }),
      incompiuto: opzionale(booleano({ aiuto: () => t().incompiuto })),
      // Da dove veniva: il nome del file non dice il deposito.
      sorgente: opzionale(oggetto({
        deposito: testo({ aiuto: () => t().deposito }),
        file: testo({ aiuto: () => t().file }),
        per: opzionale(scelta(['assistente', 'ocr'], {
          aiuto: () => t().per,
        })),
      }, { aiuto: () => t().sorgente })),
    })),
    assistente: oggetto({
      attivo: booleano(),
      modello: testo({ aiuto: () => t().modello }),
      pronto: booleano({ aiuto: () => t().pronto }),
      motivo: testo({ aiuto: () => t().motivo }),
    }),
    ocr: oggetto({
      attivo: booleano(),
      modello: testo(),
      proiettore: testo({ aiuto: () => t().proiettoreOcr }),
      pronto: booleano(),
      motivo: testo(),
    }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'cartella', etichetta: () => p().cartella }] },
      {
        tipo: 'tabella',
        da: 'modelli',
        colonne: [
          { campo: 'nome', testo: () => p().file },
          { campo: 'byte', testo: () => p().pesa, formato: 'byte' },
          { campo: 'proiettore', testo: () => p().proiettore, formato: 'siNo' },
          { campo: 'incompiuto', testo: () => p().aMeta, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: () => {
    // `prontezza` la compone `data/llm.ts`, una volta per tutti gli usi.
    const assistente = collegamento('assistente')
    const ocr = collegamento('ocr')
    const stato = (c: typeof assistente) => {
      const { pronto, motivo } = prontezza(c)
      return { pronto, motivo }
    }
    return {
      cartella: cartellaModelli(),
      modelli: modelliLocali(),
      assistente: {
        attivo: assistente.attivo,
        modello: assistente.modelloChiesto,
        ...stato(assistente),
      },
      ocr: {
        attivo: ocr.attivo,
        modello: ocr.modelloChiesto,
        proiettore: ocr.proiettoreChiesto,
        ...stato(ocr),
      },
    }
  },
})
