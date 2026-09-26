// I documenti d'anno: aprire, chiudere, preferire, dimenticare, e Ctrl+S.
// Aprire e chiudere li fa il guscio (può riavviare l'app); l'elenco dei recenti
// è un file e si tocca da qui.

import * as apparato from 'apparato'

import { èProvvisorio } from '../data/paths.js'
import { dimenticaDocumento, impostaPreferito } from '../environment/documents.js'
import { conMessaggio, fatto, invariato, lanciaComando, rifiutaCon, type Parte } from './context.js'
import { testi } from './documents.testi.js'

export const documenti = {
  /** Il salvataggio chiesto a mano (Ctrl+S): scrive quel che è in attesa e lo dice. */
  'stato.salva': async (contesto, _azione) => {
    // Anno provvisorio: «salva con nome» (dialogo e avviso sono del comando).
    // Senza un percorso tornato non è salvato, e si rifiuta.
    if (èProvvisorio(contesto.archivio.documentoAperto)) {
      const dove = await apparato.comandi.esegui<string | null | undefined>('registroDocenti.salvaConNome')
      if (typeof dove !== 'string') {
        return rifiutaCon('non-disponibile', testi().provvisorio)
      }
      return invariato
    }
    await contesto.archivio.salva()
    return conMessaggio(testi().salvato, 'info', { invariato: true })
  },

  'documento.apri': async (_contesto, azione) => {
    // Senza percorso apre il dialogo; il guscio ricarica l'anno o riavvia l'app.
    await apparato.comandi.esegui('registroDocenti.apriDocumento', azione.percorso)
    return invariato
  },

  'documento.chiudi': async (_contesto, _azione) => {
    // Lanciato e non aspettato: il guscio aspetta che questa richiesta finisca.
    lanciaComando('registroDocenti.chiudiDocumento')
    return invariato
  },

  'documento.preferito': (_contesto, azione) => {
    impostaPreferito(azione.percorso, azione.preferito)
    // Non `invariato`: l'elenco dei documenti spinto al pannello è cambiato.
    return fatto
  },

  'documento.dimentica': (_contesto, azione) => {
    dimenticaDocumento(azione.percorso)
    return fatto
  },
} satisfies Parte
