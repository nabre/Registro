// Dove sta guardando il registro, detto all'assistente: arriva a ogni cambio di
// vista, l'host tiene l'ultimo e basta, quindi `invariato` (come
// `proiezione.mira`).
//
// È `scrittura` perché entra nel programma: un contesto inventato farebbe
// rispondere il modello sulla classe sbagliata, e la sola lettura non deve
// concederlo.
//
// Lo schema è completo campo per campo: `oggetto()` scarta le chiavi non
// dichiarate, e un campo mancante sparirebbe in silenzio.

import { assistente } from '../../../actions/assistant.js'
import { inoltra, scrittura } from '../../core.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import { VISTE } from '../common/views.js'
import { testi } from './assistente.testi.js'

const t = () => testi().contesto

/** Una scelta di tendina: come si legge, l'id da passare, e le alternative. */
const VOCE = oggetto({
  campo: testo({ aiuto: () => t().campo }),
  valore: testo({ aiuto: () => t().valore }),
  id: nullabile(identificatore({ aiuto: () => t().id })),
  // Le altre voci della tendina: dove si può andare, non solo dove si è («e la
  // terza?»).
  opzioni: opzionale(elenco(oggetto({
    valore: testo({ aiuto: () => t().valoreOpzione }),
    id: nullabile(identificatore({ aiuto: () => t().idOpzione })),
  }), { aiuto: () => t().opzioni })),
})

export const procedura = scrittura({
  nome: 'assistente.contesto',
  titolo: () => t().titolo,
  azione: 'assistente.contesto',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    // `null` = chi chiede ha spento il contesto: l'host butta l'ultima veduta
    // invece di tenere quella di prima.
    contesto: nullabile(oggetto({
      // `null` tutte e due quando chi chiede ha spento «la pagina che guardo»; il
      // resto del contesto resta.
      vista: nullabile(scelta(VISTE, { aiuto: () => t().vista })),
      pagina: nullabile(testo({ aiuto: () => t().pagina })),
      scheda: nullabile(testo({ aiuto: () => t().scheda })),
      sezione: nullabile(testo({ aiuto: () => t().sezione })),
      scelte: elenco(VOCE, { aiuto: () => t().scelte }),
      filtri: elenco(VOCE, { aiuto: () => t().filtri }),
      // Tutti nullabili e tutti richiesti: `null` vuol dire «qui non c'è», e un campo
      // mancante farebbe sembrare il contesto arrivato a metà.
      riferimenti: oggetto({
        annoId: nullabile(identificatore()),
        semestreId: nullabile(identificatore()),
        corsoId: nullabile(identificatore()),
        classeId: nullabile(identificatore()),
        lezioneId: nullabile(identificatore()),
        allievoId: nullabile(identificatore()),
        pianoId: nullabile(identificatore()),
        valutazioneId: nullabile(identificatore()),
      }),
      // Il periodo in date, accanto al `semestreId` più sopra: le date valgono per
      // ogni lettura nel tempo, il `semestreId` restringe a un semestre le quattro
      // che contano per periodo (`persone.assenze`, `persone.medie`,
      // `corso.presenze`, `persone.scheda`). `null` quando chi chiede ha spento quella
      // parte: «rispondi senza restringere».
      periodo: nullabile(oggetto({
        etichetta: testo({ aiuto: () => t().etichettaPeriodo }),
        dal: nullabile(iso({ aiuto: () => t().dal })),
        al: nullabile(iso({ aiuto: () => t().al })),
      })),
      data: iso({ aiuto: () => t().data }),
      oggi: iso({ aiuto: () => t().oggi }),
      ricerca: nullabile(testo({ aiuto: () => t().ricerca })),
      visibili: nullabile(oggetto({
        cosa: testo({ aiuto: () => t().cosa }),
        quanti: numero({ intero: true, minimo: 0, aiuto: () => t().quanti }),
        ids: elenco(identificatore(), { aiuto: () => t().ids }),
        troncato: booleano({ aiuto: () => t().troncato }),
      })),
    })),
  }),
  esegui: inoltra(assistente, 'assistente.contesto'),
})
