// I comandi dei progetti: nella pagina Progetti (la biblioteca dell'anno) e
// nella pagina Integrazione progetti del corso, che condividono la vista.

import { parole } from '#core/dominio/words.testi.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { chiediEliminazione } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, senzaCorso } from '#ui/context.js'
import { stato, vai } from '#ui/state.js'
import { progettoMostrato } from '#ui/views/projects.js'
import { progettoIntegratoMostrato } from '#ui/views/projectIntegration.js'
import { apriIntegrazione, apriProgetto } from '#ui/views/projects/links.js'
import { nuovoCompito } from '#ui/views/projects/tasks.js'
import { moduloCriteri, moduloFasi, moduloLivelli, moduloProgetto } from '#ui/forms/project.js'
import { testi } from './projects.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi
const P = parole()

/** Se si è nella biblioteca: i comandi della testata vivono lì. */
const nellaBiblioteca = (): boolean => stato.posto.pagina === 'pagina.progetti'
/** Se si è nell'integrazione del corso: i comandi del lavoro con la classe vivono lì. */
const nellIntegrazione = (): boolean => stato.posto.pagina === 'pagina.corso.integrazione'

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
    aiuto: () => (nellIntegrazione() ? t.nuovoNelCorsoAiuto : t.nuovoProgettoAiuto),
    primario: nellaBiblioteca,
    // Nella biblioteca nasce di nessun corso; nell'integrazione si integra subito nel corso.
    impedimento: () => (nellIntegrazione() ? senzaCorso() : null),
    al: () => {
      const corso = nellIntegrazione() ? corsoDelContesto() : null
      if (corso) moduloProgetto({ corsoId: corso.id, dopo: (id) => apriIntegrazione(id, corso.id) })
      else moduloProgetto({ dopo: apriProgetto })
    },
  },
  {
    id: 'progetto.modifica',
    titolo: P.modifica,
    simbolo: 'matita',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.progettoModificaAiuto,
    soloSe: nellaBiblioteca,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoMostrato()
      if (progetto) moduloProgetto({ progetto })
    },
  },
  {
    id: 'progetto.nuovoCompito',
    titolo: t.nuovoCompito,
    simbolo: 'piu',
    dove: ['progetti'],
    gruppo: G.progetto,
    aiuto: t.nuovoCompitoAiuto,
    primario: true,
    soloSe: nellIntegrazione,
    impedimento: () => (progettoIntegratoMostrato() ? null : t.nessunProgettoAperto),
    al: () => {
      const progetto = progettoIntegratoMostrato()
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
    soloSe: nellaBiblioteca,
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
    soloSe: nellaBiblioteca,
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
    soloSe: nellaBiblioteca,
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
    soloSe: nellaBiblioteca,
    impedimento: () => (progettoMostrato() ? null : t.nessunProgettoAperto),
    al: async () => {
      const progetto = progettoMostrato()
      if (!progetto) return
      if (!(await chiediEliminazione({ genere: 'progetto', id: progetto.id }))) return
      const risposta = await azione({ tipo: 'progetto.elimina', progettoId: progetto.id })
      if (!risposta.ok) return
      vai({ pagina: 'pagina.progetti' }, { contesto: { progettoId: null } })
    },
  },
  // Verbale ed esportazioni del corso stanno nella pagina Documenti.
]
