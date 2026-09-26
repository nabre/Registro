// Porta il registro su una pagina.
//
// `scrittura` anche se non scrive, come la proiezione e `assistente.stacca`: il
// genere dice se serve il permesso di scrivere, e cambiare pagina sullo schermo
// di chi fa lezione non va concesso alla sola lettura.
//
// Al modello dell'assistente sì, con `assistente: true` (unica procedura): non
// tocca l'archivio, come dice `collezioni` vuoto.

import { vista } from '../../../actions/view.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, scelta } from '../../schemas.js'
import { VISTE } from '../common/views.js'
import { testi } from './vista.testi.js'

const t = () => testi().apri

export const procedura = scrittura({
  nome: 'vista.apri',
  titolo: () => t().titolo,
  azione: 'vista.apri',
  idempotente: true,
  collezioni: [],
  assistente: true,
  ingresso: oggetto({
    vista: scelta(VISTE, {
      aiuto: () => t().vista,
    }),
    // Un id solo, non uno per genere: quale sia lo dice la pagina che si apre, come
    // per la palette (`contestoDellElemento` in `ui/main.ts`).
    elementoId: opzionale(identificatore({
      aiuto: () => t().elementoId,
    })),
    data: opzionale(iso({
      aiuto: () => t().data,
    })),
  }),
  esegui: inoltra(vista, 'vista.apri'),
})
