// I file che un deposito pubblica davvero.
//
// Un deposito di GGUF non contiene un modello: ne contiene otto o dieci, lo
// stesso modello tagliato a precisioni diverse — `Q4_K_M`, `Q8_0`, `F16` — che
// pesano da uno a venti gigabyte e rispondono quasi uguale. Scegliere è la sola
// cosa che chi scarica deve fare, e per scegliere bisogna vedere i nomi veri.
//
// Si chiedono al sito invece di scriverli nel catalogo perché i nomi cambiano a
// ogni ripubblicazione: un elenco scritto a mano comincerebbe a mentire da
// solo, e il messaggio parlerebbe di un file che non è mai esistito.

import { definisci } from '../../contract.js'
import { fileConsigliato, fileDelDeposito, proiettoreDi } from '../../../data/huggingFace.js'
import { booleano, elenco, numero, oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.file',
  versione: 1,
  genere: 'lettura',
  titolo: 'I file .gguf pubblicati da un deposito di Hugging Face',
  idempotente: true,
  // Come `llm.catalogo`: `deposito` diventa un pezzo di un indirizzo di
  // Hugging Face. Non si mette in mano al modello.
  perAssistente: false,
  ingresso: oggetto({
    deposito: testo({
      aiuto: 'Il deposito: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
      esempio: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    }),
    taglio: testo({
      aiuto: 'La quantizzazione da consigliare fra quelle pubblicate: «Q4_K_M»',
      esempio: 'Q4_K_M',
    }),
  }),
  uscita: oggetto({
    // Il deposito e il taglio chiesti tornano indietro: una busta di dieci file
    // che non dice di chi sono è illeggibile appena se ne guardano due, e chi
    // risponde a voce — il modello dell'assistente — deve poter dire «di
    // bartowski/…, taglio Q4_K_M» senza rileggere la propria domanda.
    deposito: testo({ aiuto: 'Il deposito di cui sono i file' }),
    taglio: testo({ aiuto: 'La quantizzazione su cui è stato scelto il consigliato' }),
    file: elenco(oggetto({
      percorso: testo({ aiuto: 'Il nome del file dentro il deposito' }),
      byte: numero(),
      taglio: testo({ aiuto: 'La quantizzazione letta dal nome, o vuoto' }),
      proiettore: booleano({ aiuto: 'È l’«mmproj» di un modello che guarda' }),
    })),
    consigliato: testo({ aiuto: 'Quale premere, se non si sa scegliere. Vuoto se non c’è' }),
    proiettore: testo({ aiuto: 'Il file «mmproj» da prendere insieme, se il deposito ne ha uno' }),
    motivo: testo({ aiuto: 'Perché l’elenco è vuoto: il sito non risponde, il deposito non c’è' }),
  }),
  presentazione: {
    titolo: 'I file di un deposito',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'deposito', etichetta: 'Deposito' },
          { campo: 'taglio', etichetta: 'Taglio chiesto' },
          { campo: 'consigliato', etichetta: 'Consigliato' },
          { campo: 'proiettore', etichetta: 'Proiettore da prendere insieme' },
          { campo: 'motivo', etichetta: 'Perché l’elenco è vuoto' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'file',
        colonne: [
          { campo: 'percorso', testo: 'File' },
          { campo: 'taglio', testo: 'Taglio' },
          { campo: 'byte', testo: 'Pesa', formato: 'byte' },
          { campo: 'proiettore', testo: 'Proiettore', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) => {
    // Il sito che non risponde non è un fallimento della procedura: è un
    // elenco vuoto con accanto la ragione. Chi guarda sta scegliendo un
    // modello, e «Hugging Face non risponde» sotto una casella è una cosa da
    // fare — riprovare fra un minuto — mentre una busta di errore rossa
    // sembrerebbe un guasto del registro. È la stessa scelta di `llm.catalogo`.
    const file = await fileDelDeposito(ingresso.deposito).catch((guasto: unknown) => {
      return { motivo: guasto instanceof Error ? guasto.message : 'Il deposito non risponde.' }
    })
    const chiesto = { deposito: ingresso.deposito, taglio: ingresso.taglio }
    if (!Array.isArray(file)) {
      return { ...chiesto, file: [], consigliato: '', proiettore: '', motivo: file.motivo }
    }
    return {
      ...chiesto,
      file,
      consigliato: fileConsigliato(file, ingresso.taglio)?.percorso ?? '',
      // Il proiettore non è una seconda scelta: è la metà mancante del modello
      // che guarda, e la pagina lo scarica insieme senza chiederlo due volte.
      proiettore: proiettoreDi(file)?.percorso ?? '',
      motivo: '',
    }
  },
})
