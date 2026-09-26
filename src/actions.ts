// Il centralino: ogni azione del webview passa di qui, viene convalidata e
// applicata all'archivio. Si valida prima di toccare lo stato: niente salvataggi a metà.
// I gestori stanno in `actions/`, uno per area; il tipo `Mappa` non compila se
// un'azione del protocollo resta senza gestore.

import type { Archivio } from './data/archive.js'
import type { Azione } from './protocol.js'
import { assistente } from './actions/assistant.js'
import { calendario } from './actions/calendar.js'
import { composizioni } from './actions/compositions.js'
import { consegne } from './actions/assignments.js'
import { check } from './actions/check.js'
import { contestoDi, type EsitoAzione, type Gestore, type Mappa } from './actions/context.js'
import { docenteClasse } from './actions/classTeacher.js'
import { aggiornamenti } from './actions/updates.js'
import { llm } from './actions/llm.js'
import { documenti } from './actions/documents.js'
import { esportazioni } from './actions/exports.js'
import { mappa } from './actions/map.js'
import { modelli } from './actions/templates.js'
import { ore } from './actions/hours.js'
import { piani } from './actions/plans.js'
import { proiezione } from './actions/projection.js'
import { rapporti, rigeneraDopoScrittura } from './actions/reports.js'
import { registro } from './actions/register.js'
import { sistema } from './actions/system.js'
import { smistamento } from './actions/sorting.js'
import { storia } from './actions/history.js'
import { valutazioni } from './actions/assessments.js'
import { vista } from './actions/view.js'
import { azioniSottoContratto, gestoriDelleProcedure } from './api/bridge.js'
import type { Origine } from './api/contract.js'

// Definita in `actions/reports.ts` perché `api/core.ts` la chiama, e da qui
// l'import sarebbe circolare (attraverso il ponte).
export { rigeneraDopoScrittura }

const GESTORI: Mappa = {
  ...registro,
  ...calendario,
  ...ore,
  ...piani,
  ...proiezione,
  ...assistente,
  ...valutazioni,
  ...consegne,
  ...check,
  ...composizioni,
  ...docenteClasse,
  ...smistamento,
  ...rapporti,
  ...sistema,
  ...documenti,
  ...esportazioni,
  ...mappa,
  ...modelli,
  ...llm,
  ...aggiornamenti,
  ...vista,
  ...storia,
  // Ultimo apposta: le azioni prese in carico da una procedura (`api/bridge.ts`)
  // sovrascrivono il gestore diretto, aggiungendo convalida e giornale.
  ...gestoriDelleProcedure(),
}

/** Vero se `tipo` ha un gestore: un webview con un altro protocollo riceve un rifiuto leggibile. */
export function azioneValida (tipo: string): tipo is Azione['tipo'] {
  return tipo in GESTORI
}

/** Le azioni che passano da una procedura, e quindi da `chiama()`. */
let sottoContratto: Set<string> | null = null
function passaDaChiama (tipo: string): boolean {
  // Al primo uso e non al caricamento: `azioniSottoContratto` registra le
  // procedure, e a import ancora a metà l'ordine non è garantito.
  sottoContratto ??= new Set(azioniSottoContratto())
  return sottoContratto.has(tipo)
}

export async function esegui (
  archivio: Archivio,
  azione: Azione,
  origine?: Origine,
): Promise<EsitoAzione> {
  // Gestore e azione combaciano per costruzione della mappa, ma il compilatore
  // non correla chiave e valore da sé.
  const gestore = GESTORI[azione.tipo] as Gestore<Azione['tipo']>
  const prima = archivio.revisione
  const esito = await gestore(contestoDi(archivio, origine), azione)

  // Registro cambiato → documenti stampati da rigenerare; una regola sola, qui e
  // non nei gestori. Si guarda la revisione e non l'esito, perché molte azioni
  // riuscite (esportare, aprire, stampare) non scrivono. Quelle sotto contratto
  // l'hanno già fatto in `chiama()`.
  if (esito.ok && archivio.revisione !== prima && !passaDaChiama(azione.tipo)) {
    rigeneraDopoScrittura(archivio, azione)
  }
  return esito
}
