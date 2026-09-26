// Com'è messo il registro con le versioni: quale gira, se ce n'è una nuova, a
// che punto è lo scarico. Riempie la sezione «Aggiornamenti» all'apertura; poi
// gli aggiornamenti li spinge l'host. Non va all'assistente.

import { statoDegliAggiornamenti } from '../../../actions/updates.js'
import { definisci } from '../../contract.js'
import { booleano, numero, oggetto, opzionale, scelta, testo, vuoto } from '../../schemas.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './aggiornamenti.testi.js'

const t = () => testi().stato
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'aggiornamenti.stato',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    versione: testo({ aiuto: () => t().versione }),
    supportato: booleano({ aiuto: () => t().supportato }),
    motivo: opzionale(testo({ aiuto: () => t().motivo })),
    fase: scelta(
      ['fermo', 'controllo', 'aggiornato', 'disponibile', 'scarico', 'pronto', 'installazione', 'errore'],
      { aiuto: () => t().fase },
    ),
    nuova: opzionale(oggetto({
      versione: testo(),
      data: opzionale(testo({ aiuto: () => t().data })),
      note: opzionale(testo({ aiuto: () => t().note })),
    }, { aiuto: () => t().nuova })),
    byte: opzionale(numero({ aiuto: () => t().byte })),
    totale: opzionale(numero({ aiuto: () => t().totale })),
    ultimoControllo: opzionale(testo({ aiuto: () => t().ultimoControllo })),
    errore: opzionale(testo({ aiuto: () => t().errore })),
    pagina: testo({ aiuto: () => t().pagina }),
    racconto: oggetto({
      breve: testo({ aiuto: () => t().breve }),
      frase: testo({ aiuto: () => t().frase }),
      tono: scelta(['quiete', 'informativo', 'positivo', 'attenzione', 'negativo']),
      gesto: opzionale(oggetto({
        tipo: scelta(['aggiornamenti.controlla', 'aggiornamenti.scarica', 'aggiornamenti.installa', 'pagina']),
        testo: testo(),
        spento: opzionale(booleano()),
      }, { aiuto: () => t().gesto })),
      quota: opzionale(numero({ aiuto: () => t().quota })),
      notizia: opzionale(testo({ aiuto: () => t().notizia })),
    }, { aiuto: () => t().racconto }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'versione', etichetta: () => p().versione },
          { campo: 'fase', etichetta: () => p().stato },
          { campo: 'ultimoControllo', etichetta: () => p().ultimoControllo },
          { campo: 'motivo', etichetta: () => p().motivo },
          { campo: 'errore', etichetta: () => parole().errore },
        ],
      },
    ],
  },
  esegui: () => statoDegliAggiornamenti(),
})
