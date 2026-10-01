// I comandi dei progetti.

import { parole } from '#core/dominio/words.testi.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { chiediEliminazione } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, senzaCorso } from '#ui/context.js'
import { vai } from '#ui/state.js'
import { apriProgetto, progettoMostrato } from '#ui/views/projects.js'
import { nuovoCompito } from '#ui/views/projects/tasks.js'
import { moduloCriteri, moduloFasi, moduloLivelli, moduloProgetto } from '#ui/forms/project.js'
import { testi } from './projects.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi
const P = parole()

export const COMANDI_PROGETTO: readonly ComandoUI[] = [
  // ------------------------------------------------------------- Progetti
  //
  // Lavorano sul progetto che la pagina mostra: lo scelto, o il primo dell'elenco.
  {
    id: 'progetto.nuovo',
    titolo: t.nuovoProgetto,
    simbolo: 'piu',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.nuovoProgettoAiuto,
    primario: true,
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloProgetto({ corsoId: corso.id, dopo: apriProgetto })
    },
  },
  {
    id: 'progetto.modifica',
    titolo: P.modifica,
    simbolo: 'matita',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.progettoModificaAiuto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) moduloProgetto({ corsoId: progetto.corsoId, progetto })
    },
  },
  {
    id: 'progetto.nuovoCompito',
    titolo: t.nuovoCompito,
    simbolo: 'piu',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.nuovoCompitoAiuto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) nuovoCompito(progetto)
    },
  },
  {
    id: 'progetto.fasi',
    titolo: t.fasiProgetto,
    simbolo: 'progetto',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.fasiProgettoAiuto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) moduloFasi(progetto.id)
    },
  },
  {
    id: 'progetto.criteri',
    titolo: t.criteriProgetto,
    simbolo: 'presa',
    dove: ['progetti'],
    gruppo: G.progetto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) moduloCriteri(progetto.id)
    },
  },
  {
    id: 'progetto.livelli',
    titolo: t.livelliProgetto,
    simbolo: 'presa',
    dove: ['progetti'],
    gruppo: G.progetto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) moduloLivelli(progetto.id)
    },
  },
  {
    id: 'progetto.elimina',
    titolo: P.elimina,
    simbolo: 'cestino',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.eliminaProgettoAiuto,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: async () => {
      const progetto = progettoMostrato()
      if (!progetto) return
      if (!(await chiediEliminazione({ genere: 'progetto', id: progetto.id }))) return
      const risposta = await azione({ tipo: 'progetto.elimina', progettoId: progetto.id })
      if (!risposta.ok) return
      vai({ pagina: 'pagina.corso.progetti' }, { contesto: { progettoId: null } })
    },
  },
  // Verbale ed esportazioni del corso stanno nella pagina Documenti.
]
