// Un'altra finestra del registro, per lavorare su due parti dell'anno insieme.
//
// `scrittura` come `finestra.zoom`: aprire finestre sullo schermo di chi fa
// lezione non va concesso alla sola lettura né al modello dell'assistente (non
// dichiara `assistente`).

import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, nullabile, oggetto, opzionale, testo } from '#contract/schemas.js'
import { testi } from './finestra.testi.js'

const t = () => testi().nuova

/** Un id del contesto, o `null` se di quel genere non se n'è scelto nessuno. */
const scelto = () => opzionale(nullabile(identificatore({ aiuto: () => t().scelto })))

export const procedura = scrittura({
  nome: 'finestra.nuova',
  titolo: () => t().titolo,
  azione: 'finestra.nuova',
  // Ogni chiamata apre una finestra in più.
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    posto: opzionale(oggetto({
      pagina: testo({ minimo: 1, massimo: 64, aiuto: () => t().pagina, esempio: 'pagina.calendario' }),
      soggetto: opzionale(oggetto({
        tipo: testo({ minimo: 1, massimo: 32, aiuto: () => t().soggettoTipo, esempio: 'corso' }),
        id: identificatore({ aiuto: () => t().soggettoId }),
      })),
      scheda: opzionale(testo({ massimo: 100, aiuto: () => t().scheda })),
    })),
    contesto: opzionale(oggetto({
      corsoId: scelto(),
      classeId: scelto(),
      filtroClasseId: scelto(),
      lezioneId: scelto(),
      pianoId: scelto(),
      valutazioneId: scelto(),
      allievoId: scelto(),
      progettoId: scelto(),
    })),
  }),
  esegui: inoltra(sistema, 'finestra.nuova'),
})
