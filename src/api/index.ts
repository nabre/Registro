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
import { procedureAnni } from './procedures/anni/index.js'
import { procedureAssistente } from './procedures/assistente/index.js'
import { procedureAvanzamento } from './procedures/avanzamento/index.js'
import { procedureCalendario } from './procedures/calendario/index.js'
import { procedureClasse } from './procedures/classe/index.js'
import { procedureClassi } from './procedures/classi/index.js'
import { procedureComposizioni } from './procedures/composizioni/index.js'
import { procedureConsegne } from './procedures/consegne/index.js'
import { procedureCorsi } from './procedures/corsi/index.js'
import { procedureCorso } from './procedures/corso/index.js'
import { procedureDocumenti } from './procedures/documenti/index.js'
import { procedureDocumento } from './procedures/documento/index.js'
import { procedureEsporta } from './procedures/esporta/index.js'
import { procedureEsportazioni } from './procedures/esportazioni/index.js'
import { procedureFinestra } from './procedures/finestra/index.js'
import { procedureImpostazioni } from './procedures/impostazioni/index.js'
import { procedureIntestazione } from './procedures/intestazione/index.js'
import { procedureLlm } from './procedures/llm/index.js'
import { procedureManutenzione } from './procedures/manutenzione/index.js'
import { procedureMappa } from './procedures/mappa/index.js'
import { procedureMaterie } from './procedures/materie/index.js'
import { procedureModelli } from './procedures/modelli/index.js'
import { procedureOrario } from './procedures/orario/index.js'
import { procedureOre } from './procedures/ore/index.js'
import { procedurePersone } from './procedures/persone/index.js'
import { procedurePiani } from './procedures/piani/index.js'
import { procedurePosta } from './procedures/posta/index.js'
import { procedureProgramma } from './procedures/programma/index.js'
import { procedureProiezione } from './procedures/proiezione/index.js'
import { procedureRapporti } from './procedures/rapporti/index.js'
import { procedureRegistro } from './procedures/registro/index.js'
import { procedureRisorse } from './procedures/risorse/index.js'
import { procedureSistema } from './procedures/sistema/index.js'
import { procedureSmistamento } from './procedures/smistamento/index.js'
import { procedureStato } from './procedures/stato/index.js'
import { procedureValutazioni } from './procedures/valutazioni/index.js'
import { procedureVista } from './procedures/vista/index.js'
import { procedureAggiornamenti } from './procedures/aggiornamenti/index.js'
import { procedureCheck } from './procedures/check/index.js'
import { procedureStoria } from './procedures/storia/index.js'

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
  ...procedureModelli,
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
