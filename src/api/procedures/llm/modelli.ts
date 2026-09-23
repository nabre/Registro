// I modelli che stanno sul disco, e chi lavora per chi.
//
// È la lettura che tiene in piedi la pagina «Modelli linguistici»: l'elenco dei
// file, quanto pesano, e quale di loro risponde per l'assistente e quale legge
// le scansioni. Torna anche la cartella, perché chi guarda deve poter aprirla —
// è la sua, ci sono i suoi gigabyte dentro.

import { definisci } from '../../contract.js'
import { cartellaModelli, modelliLocali } from '../../../data/gguf.js'
import { collegamento, prontezza } from '../../../data/llm.js'
import { booleano, elenco, numero, oggetto, opzionale, scelta, testo, vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.modelli',
  versione: 1,
  genere: 'lettura',
  titolo: 'I modelli del linguaggio scaricati, con quello in uso per ciascun mestiere',
  idempotente: true,
  // Manutenzione dei modelli del linguaggio: non è una domanda che si fa a un
  // registro di classe, ed è una voce in più fra cui sbagliare.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    cartella: testo({ aiuto: 'Dove stanno i file, per chi vuole aprirla' }),
    modelli: elenco(oggetto({
      nome: testo({ aiuto: 'Il nome del file: è anche quel che si sceglie' }),
      byte: numero({ aiuto: 'Quanto pesa' }),
      proiettore: booleano({ aiuto: 'È l’«mmproj» di un modello che guarda, non un modello' }),
      incompiuto: opzionale(booleano({
        aiuto: 'Uno scarico mai finito: non si può usare, si può solo buttare o rifare',
      })),
      // Da dove veniva: senza, «rifare» qui sopra è un consiglio che chi legge
      // non può seguire — il nome del file non dice in quale deposito stava.
      sorgente: opzionale(oggetto({
        deposito: testo({ aiuto: 'Il deposito di Hugging Face da cui stava scendendo' }),
        file: testo({ aiuto: 'Il file dentro quel deposito' }),
        per: opzionale(scelta(['assistente', 'ocr'], {
          aiuto: 'Per quale mestiere era stato chiesto',
        })),
      }, { aiuto: 'Da dove veniva uno scarico a metà: è quel che serve per riprenderlo' })),
    })),
    assistente: oggetto({
      attivo: booleano(),
      modello: testo({ aiuto: 'Il file scelto, o vuoto se nessuno' }),
      pronto: booleano({ aiuto: 'Se adesso si può chiedere qualcosa' }),
      motivo: testo({ aiuto: 'Perché non si può, in una frase che si legge' }),
    }),
    ocr: oggetto({
      attivo: booleano(),
      modello: testo(),
      proiettore: testo({ aiuto: 'Il secondo file del modello che guarda' }),
      pronto: booleano(),
      motivo: testo(),
    }),
  }),
  presentazione: {
    titolo: 'I modelli del linguaggio sul disco',
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'cartella', etichetta: 'Cartella' }] },
      {
        tipo: 'tabella',
        da: 'modelli',
        colonne: [
          { campo: 'nome', testo: 'File' },
          { campo: 'byte', testo: 'Pesa', formato: 'byte' },
          { campo: 'proiettore', testo: 'Proiettore', formato: 'siNo' },
          { campo: 'incompiuto', testo: 'A metà', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: () => {
    // `prontezza` la compone `data/llm.ts`, una volta per tutti gli usi:
    // rifarla qui vorrebbe dire una seconda verità su che cosa manchi, e
    // sarebbe quella mostrata proprio nella pagina che serve a rimediare.
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
