// I modelli consigliati, e quelli che si trovano cercando.
//
// Una lettura sola per due cose che sembrano diverse e non lo sono: il catalogo
// è un elenco di depositi scelti a mano, la ricerca è un elenco di depositi
// trovati su Hugging Face, e chi guarda la pagina vuole scegliere fra righe
// della stessa forma. Tenerle separate vorrebbe dire due procedure, due
// riquadri e due modi di premere «scarica».
//
// Senza `cerca` torna il catalogo e basta, che è quel che la pagina mostra
// appena si apre: chi non sa cosa cercare non deve trovarsi davanti una casella
// vuota.

import { definisci } from '../../contract.js'
import { CATALOGO, cerca } from '../../../data/huggingFace.js'
import { booleano, elenco, numero, oggetto, opzionale, scelta, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.catalogo',
  versione: 1,
  genere: 'lettura',
  titolo: 'I modelli consigliati, e quelli che si trovano cercando su Hugging Face',
  idempotente: true,
  // Fuori dalla mano del modello: `cerca` finisce dentro una richiesta a
  // Hugging Face, e la stringa la comporrebbe un modello che ha appena
  // letto i nomi di una classe. Il commento di `data/llm.ts` promette che un
  // filo verso fuori non c'è: questa riga è quel che lo rende vero.
  perAssistente: false,
  ingresso: oggetto({
    cerca: opzionale(testo({
      aiuto: 'Che cosa cercare fra i depositi pubblici: «qwen», «vision», «7b»',
    })),
  }),
  uscita: oggetto({
    // Che cosa si è cercato: `trovati` è vuoto tanto quando non si è cercato
    // niente quanto quando la ricerca non ha dato niente, e le due cose non si
    // distinguono dalla busta. Con la parola accanto si distinguono.
    cerca: testo({ aiuto: 'La ricerca fatta fra i depositi. Vuota se non se n’è fatta nessuna' }),
    consigliati: elenco(oggetto({
      deposito: testo({ aiuto: 'Il deposito: «utente/nome»' }),
      titolo: testo(),
      perChe: scelta(['assistente', 'ocr'], { aiuto: 'Per quale mestiere è consigliato' }),
      taglio: testo({ aiuto: 'La quantizzazione da preferire: «Q4_K_M»' }),
      nota: testo({ aiuto: 'Che cosa sa fare, e che macchina vuole' }),
    })),
    trovati: elenco(oggetto({
      id: testo(),
      scarichi: numero({ aiuto: 'Quante volte è stato scaricato: è l’unico indizio di fiducia' }),
      ristretto: booleano({ aiuto: 'Chiede di accettare delle condizioni: da qui non si scarica' }),
    })),
  }),
  presentazione: {
    titolo: 'Modelli da scaricare',
    blocchi: [
      {
        tipo: 'tabella',
        da: 'consigliati',
        titolo: 'Consigliati',
        colonne: [
          { campo: 'titolo', testo: 'Modello' },
          { campo: 'perChe', testo: 'Per' },
          { campo: 'taglio', testo: 'Taglio' },
          { campo: 'deposito', testo: 'Deposito' },
          { campo: 'nota', testo: 'Che cosa sa fare' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'trovati',
        titolo: 'Trovati cercando',
        colonne: [
          { campo: 'id', testo: 'Deposito' },
          { campo: 'scarichi', testo: 'Scarichi', formato: 'numero' },
          { campo: 'ristretto', testo: 'Ristretto', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) => ({
    cerca: ingresso.cerca ?? '',
    consigliati: CATALOGO.map((voce) => ({ ...voce })),
    // Una ricerca che non riesce — la scuola senza rete, il sito giù — non fa
    // fallire la lettura: il catalogo si mostra lo stesso, e chi cercava lo
    // rilegge in una riga sotto la casella. Il guasto della rete non è un
    // guasto del registro.
    trovati: ingresso.cerca ? await cerca(ingresso.cerca).catch(() => []) : [],
  }),
})
