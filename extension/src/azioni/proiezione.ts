// Lo schermo per la classe, comandato dal pannello del docente.
//
// Nessuna di queste azioni tocca il registro: aprono una finestra, dicono dove
// guardare, accendono e spengono blocchi. Tornano `invariato` proprio per
// questo — la mira arriva a ogni cambio di vista, e rispedire tutto il registro
// al pannello a ogni clic sul calendario sarebbe lavoro fatto per niente.

import {
  impostaProiezione,
  PannelloProiezione,
  puntaProiezione,
} from '../pannelloProiezione.js'
import { invariato, type Parte } from './contesto.js'

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
