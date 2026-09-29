// L'elenco delle procedure esposte, una riga per area. Il nome è il percorso:
// `ore.appello.riga` sta in `procedure/ore/appello/riga.ts`.
//
// L'elenco deve coprire ogni azione del protocollo, campo per campo
// (`tests/api/coverage.test.mjs`): `oggetto()` scarta le chiavi non dichiarate,
// quindi un campo mancante nello schema smette di arrivare senza errori.
//
// Le aree si elencano a mano: una cartella nuova non nominata qui non si registra.

import type { ProceduraQualunque } from './contract.js'
import { registra } from './core.js'
import { procedureAnni } from './procedure/anni/index.js'
import { procedureAssistente } from './procedure/assistente/index.js'
import { procedureAvanzamento } from './procedure/avanzamento/index.js'
import { procedureCalendario } from './procedure/calendario/index.js'
import { procedureClasse } from './procedure/classe/index.js'
import { procedureClassi } from './procedure/classi/index.js'
import { procedureComposizioni } from './procedure/composizioni/index.js'
import { procedureConsegne } from './procedure/consegne/index.js'
import { procedureCorsi } from './procedure/corsi/index.js'
import { procedureCorso } from './procedure/corso/index.js'
import { procedureDocumenti } from './procedure/documenti/index.js'
import { procedureDocumento } from './procedure/documento/index.js'
import { procedureEsporta } from './procedure/esporta/index.js'
import { procedureEsportazioni } from './procedure/esportazioni/index.js'
import { procedureFinestra } from './procedure/finestra/index.js'
import { procedureImpostazioni } from './procedure/impostazioni/index.js'
import { procedureIntestazione } from './procedure/intestazione/index.js'
import { procedureLlm } from './procedure/llm/index.js'
import { procedureManutenzione } from './procedure/manutenzione/index.js'
import { procedureMappa } from './procedure/mappa/index.js'
import { procedureMaterie } from './procedure/materie/index.js'
import { procedureModelli } from './procedure/modelli/index.js'
import { procedureOrario } from './procedure/orario/index.js'
import { procedureOre } from './procedure/ore/index.js'
import { procedurePersone } from './procedure/persone/index.js'
import { procedurePiani } from './procedure/piani/index.js'
import { procedurePosta } from './procedure/posta/index.js'
import { procedureProgramma } from './procedure/programma/index.js'
import { procedureProiezione } from './procedure/proiezione/index.js'
import { procedureRapporti } from './procedure/rapporti/index.js'
import { procedureRegistro } from './procedure/registro/index.js'
import { procedureRisorse } from './procedure/risorse/index.js'
import { procedureSistema } from './procedure/sistema/index.js'
import { procedureSmistamento } from './procedure/smistamento/index.js'
import { procedureStato } from './procedure/stato/index.js'
import { procedureValutazioni } from './procedure/valutazioni/index.js'
import { procedureVista } from './procedure/vista/index.js'
import { procedureAggiornamenti } from './procedure/aggiornamenti/index.js'
import { procedureCheck } from './procedure/check/index.js'
import { procedureMicrosoft } from './procedure/microsoft/index.js'
import { procedureOnedrive } from './procedure/onedrive/index.js'
import { procedureStoria } from './procedure/storia/index.js'

export const TUTTE: ReadonlyArray<ProceduraQualunque> = [
  ...procedureAggiornamenti,
  ...procedureAnni,
  ...procedureAssistente,
  ...procedureAvanzamento,
  ...procedureCalendario,
  ...procedureCheck,
  ...procedureClasse,
  ...procedureClassi,
  ...procedureComposizioni,
  ...procedureConsegne,
  ...procedureCorsi,
  ...procedureCorso,
  ...procedureDocumenti,
  ...procedureDocumento,
  ...procedureEsporta,
  ...procedureEsportazioni,
  ...procedureFinestra,
  ...procedureImpostazioni,
  ...procedureIntestazione,
  ...procedureLlm,
  ...procedureManutenzione,
  ...procedureMappa,
  ...procedureMaterie,
  ...procedureMicrosoft,
  ...procedureModelli,
  ...procedureOnedrive,
  ...procedureOrario,
  ...procedureOre,
  ...procedurePersone,
  ...procedurePiani,
  ...procedurePosta,
  ...procedureProgramma,
  ...procedureProiezione,
  ...procedureRapporti,
  ...procedureRegistro,
  ...procedureRisorse,
  ...procedureSistema,
  ...procedureSmistamento,
  ...procedureStato,
  ...procedureStoria,
  ...procedureValutazioni,
  ...procedureVista,
]

/**
 * Le mette nell'elenco del nucleo.
 *
 * Idempotente con lo stesso oggetto (la chiamano condotto e ponte). Due oggetti
 * diversi con lo stesso nome (modulo caricato due volte) fanno lanciare
 * `registra`, in modo atomico: o entrano tutte o nessuna.
 */
export function registraTutte (): void {
  registra(...TUTTE)
}

export { alberoProcedure, foglie } from './router.js'
export { linkDiretto } from './link.js'
export { chiamante, type ChiamanteNodo } from './chiamante.js'

