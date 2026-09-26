// Il livello API con sotto l'archivio vero, in un grafo solo: anno in uso
// (`data/paths.ts`) e deposito aperto (`data/store.ts`) sono variabili di
// modulo (vedi `tests/helpers/data.ts`), come in `principale.cjs`.
//
// Si esporta anche `schemi`: le prove della convalida non vogliono archivio.

export { Archivio } from '../../src/data/archive.js'
// Il deposito per chi scrive nel documento (la copia di un calendario ICS):
// all'avvio lo registra `startup.ts`.
export { registraDeposito } from '../../src/data/store.js'
export { Uri } from '../../src/environment/uri.js'

export {
  chiama,
  descrivi,
  osserva,
  procedura,
  procedure,
  registra,
  SCRITTURA,
} from '../../src/api/core.js'
export { registraTutte, TUTTE } from '../../src/api/index.js'
// Il catalogo per il modello, che una prova confronta col file su disco.
export { catalogo, catalogoJson, daNomeFunzione, nomeFunzione } from '../../src/api/tools.js'
// Il cancello del condotto e il condotto acceso davvero, per
// `tests/api/conduit.test.mjs`: dallo stesso grafo, o la prova parlerebbe con
// un nucleo senza procedure. `indirizzoCondotto` dice dove bussare.
export {
  avviaCondotto,
  condottoDaAprire,
  indirizzoCondotto,
  permessoMancante,
} from '../../src/api/transports/conduit.js'
// Le impostazioni, per revocare i permessi fra una chiamata e l'altra come fa
// la pagina.
export { comandi, impostazioni } from '../../src/environment/platform.js'
// Gli aggiornamenti detti a parole, fase per fase, senza aggiornatore vero.
export { racconta, statoAggiornamenti } from '../../src/environment/updates.js'
// Il cancello dell'assistente: che cosa il modello vede e che cosa gli si
// lascia eseguire.
export {
  attrezzi, componiBattute, descriviContesto, idVisti, istruzioni, ricordaIdVisti,
  senzaNulliDiTroppo, ultimiVisti, usaAttrezzo,
} from '../../src/api/transports/assistant.js'
// Il giro che cambia finestra (in `pannelli/`): l'host tiene da parte la
// domanda senza risposta e la finestra che prende la conversazione la
// riprende.
export {
  riprendiGiro, rispondiConversazione, sospendiGiroInCorso,
} from '../../src/panels/conversation.js'
// Come una busta di lettura diventa una tabella.
export { impagina, scrivi } from '../../src/api/presentation.js'
// Chi porta il registro su una pagina: senza guscio non c'è nessuno iscritto,
// e si provano le due risposte.
export { registraNavigatore } from '../../src/actions/view.js'
export { azioniSottoContratto } from '../../src/api/bridge.js'
export { VERSIONE_API, ErroreApi, errore, definisci } from '../../src/api/contract.js'
export { STATI_LEZIONE } from '../../src/api/procedures/ore/common.js'
// Gli stati dell'appello stanno in common/rollCall.ts.
export { STATI_APPELLO } from '../../src/api/procedures/common/rollCall.js'
export * as schemi from '../../src/api/schemas.js'

// Il centralino vero, per le prove del ponte.
export { esegui, azioneValida } from '../../src/actions.js'
export { fermaRapporti, rigenerazioniInAttesa } from '../../src/actions/reports.js'

// Le fabbriche del dominio dallo stesso grafo: il registro scritto è fatto
// degli oggetti che l'archivio rilegge.
export {
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  creaRecapito,
  creaRisorsa,
  creaSlot,
  creaSmistamento,
  creaValutazione,
  registroVuoto,
} from '../../src/domain/index.js'
export { STATI_PRESENZA } from '../../src/domain/lexicon.js'
