// Lo schermo per la classe, comandato dal pannello del docente.
// Non toccano il registro: tornano `invariato`, per non rispedirlo a ogni cambio di vista.

import {
  impostaProiezione,
  PannelloProiezione,
  puntaProiezione,
} from '../panels/projection.js'
import { invariato, type Parte } from './context.js'

export const proiezione = {
  'proiezione.apri': async (_contesto, _azione) => {
    await PannelloProiezione.apri()
    return invariato
  },

  'proiezione.chiudi': (_contesto, _azione) => {
    PannelloProiezione.chiudi()
    return invariato
  },

  'proiezione.mira': (_contesto, azione) => {
    puntaProiezione(azione.mira)
    return invariato
  },

  'proiezione.impostazioni': (_contesto, azione) => {
    impostaProiezione(azione.impostazioni)
    return invariato
  },
} satisfies Parte
