// I comandi del piano aperto, e la lezione nuova del corso.

import { parole } from '#core/dominio/words.testi.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { chiediEliminazione, moduloLezione } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, senzaCorso } from '#ui/context.js'
import { stato, vai } from '#ui/state.js'
import { apriLezione } from '#ui/pages.js'
// Il piano su cui lavorare lo sa la pagina: `stato.pianoId` è nullo finché non
// se ne sceglie uno, ma un piano a schermo c'è lo stesso.
import { pianoMostrato, primaOraDelPiano, scordaEditorDelPiano } from '#ui/views/plans.js'
import { testi } from './plans.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi
const P = parole()

export const COMANDI_PIANO: readonly ComandoUI[] = [
  // ------------------------------------------------------- il piano aperto
  //
  // I gesti che si fanno a un piano. Lavorano su quello che la pagina mostra:
  // lo scelto, o il primo dell'elenco.
  {
    id: 'piano.vaiAlRegistro',
    titolo: t.vaiAlRegistro,
    simbolo: 'lezione',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.vaiAlRegistroAiuto,
    primario: true,
    impedimento: () => {
      const piano = pianoMostrato()
      if (!piano) return t.nessunPianoAperto
      return primaOraDelPiano(piano) ? null : t.pianoSenzaOra
    },
    al: () => {
      const piano = pianoMostrato()
      const lezione = piano ? primaOraDelPiano(piano) : null
      // L'ora porta con sé il suo giorno (`completa`).
      if (lezione) apriLezione(lezione.id)
    },
  },
  {
    id: 'piano.duplica',
    titolo: P.duplica,
    simbolo: 'duplica',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.duplicaAiuto,
    impedimento: () => (pianoMostrato() ? null : t.nessunPianoAperto),
    al: async () => {
      const piano = pianoMostrato()
      if (!piano) return
      const risposta = await azione({ tipo: 'piano.duplica', pianoId: piano.id })
      if (risposta.ok && risposta.creato) {
        vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: risposta.creato.id } })
      }
    },
  },
  {
    id: 'piano.elimina',
    titolo: P.elimina,
    simbolo: 'cestino',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.eliminaAiuto,
    impedimento: () => (pianoMostrato() ? null : t.nessunPianoAperto),
    al: async () => {
      const piano = pianoMostrato()
      if (!piano) return
      if (!(await chiediEliminazione({ genere: 'piano', id: piano.id }))) return
      const risposta = await azione({ tipo: 'piano.elimina', pianoId: piano.id })
      if (!risposta.ok) return
      // L'editor tenuto da parte modificava un piano che non c'è più.
      scordaEditorDelPiano()
      // Senza piano la pagina torna sul corso di lavoro.
      vai({ pagina: 'pagina.corso.piani' }, { contesto: { pianoId: null } })
    },
  },
  {
    id: 'corso.nuovaOra',
    titolo: t.oraInQuestoCorso,
    simbolo: 'piu',
    // Non nel registro della lezione, dove si scrive l'ora davanti: si crea dai
    // piani, dalle valutazioni e dal calendario.
    dove: ['piani', 'valutazioni'],
    gruppo: G.ora,
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (!corso) return
      moduloLezione({
        corsoId: corso.id,
        classeId: corso.classeId,
        data: stato.data,
        dopo: (lezioneId) => apriLezione(lezioneId),
      })
    },
  },
]
