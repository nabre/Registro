// Il centralino: ogni azione del webview passa di qui, viene convalidata e
// applicata all'archivio. Si valida prima di toccare lo stato: niente salvataggi a metà.
// I gestori stanno in `actions/`, uno per area; il tipo `Mappa` non compila se
// un'azione del protocollo resta senza gestore.

import type { Archivio } from '../core/dati/archive.js'
import type { Azione } from './protocollo.js'
import { assistente } from '../core/azioni/assistant.js'
import { calendario } from '../core/azioni/calendar.js'
import { consegne } from '../core/azioni/assignments.js'
import { check } from '../core/azioni/check.js'
import { contestoDi, type EsitoAzione, type Gestore, type Mappa } from '../core/azioni/context.js'
import { docenteClasse } from '../core/azioni/classTeacher.js'
import { aggiornamenti } from '../core/azioni/updates.js'
import { llm } from '../core/azioni/llm.js'
import { documenti } from '../core/azioni/documents.js'
import { esportazioni } from '../core/azioni/exports.js'
import { mappa } from '../core/azioni/map.js'
import { microsoft } from '../core/azioni/microsoft.js'
import { modelli } from '../core/azioni/templates.js'
import { ore } from '../core/azioni/hours.js'
import { piani } from '../core/azioni/plans.js'
import { proiezione } from '../core/azioni/projection.js'
import { primaDiScrivere, rapporti, rigeneraDopoScrittura } from '../core/azioni/reports.js'
import { registro } from '../core/azioni/register.js'
import { sistema } from '../core/azioni/system.js'
import { smistamento } from '../core/azioni/sorting.js'
import { storia } from '../core/azioni/history.js'
import { valutazioni } from '../core/azioni/assessments.js'
import { vista } from '../core/azioni/view.js'
import { azioniSottoContratto, gestoriDelleProcedure } from './bridge.js'
import type { Origine } from './contract.js'

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
  ...docenteClasse,
  ...smistamento,
  ...rapporti,
  ...sistema,
  ...microsoft,
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
  const impronta = passaDaChiama(azione.tipo) ? null : primaDiScrivere(archivio)
  const esito = await gestore(contestoDi(archivio, origine), azione)

  // Registro cambiato → documenti stampati da rigenerare; una regola sola, qui e
  // non nei gestori. Si guarda la revisione e non l'esito, perché molte azioni
  // riuscite (esportare, aprire, stampare) non scrivono. Quelle sotto contratto
  // l'hanno già fatto in `chiama()`.
  if (esito.ok && archivio.revisione !== prima && !passaDaChiama(azione.tipo)) {
    rigeneraDopoScrittura(archivio, azione, impronta)
  }
  return esito
}
