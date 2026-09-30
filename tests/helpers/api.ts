// Il livello API con sotto l'archivio vero, in un grafo solo: anno in uso
// (`data/paths.ts`) e deposito aperto (`data/store.ts`) sono variabili di
// modulo (vedi `tests/helpers/data.ts`), come in `principale.cjs`.
//
// Si esporta anche `schemi`: le prove della convalida non vogliono archivio.

export { Archivio } from '../../core/dati/archive.js'
// Il deposito per chi scrive nel documento (la copia di un calendario ICS):
// all'avvio lo registra `startup.ts`.
export { registraDeposito } from '../../core/dati/store.js'
export { Uri } from '../../core/apparato/uri.js'

export {
  chiama,
  descrivi,
  osserva,
  procedura,
  procedure,
  registra,
  SCRITTURA,
} from '../../contract/core.js'
export {
  alberoProcedure,
  chiamante,
  foglie,
  linkDiretto,
  registraTutte,
  TUTTE,
} from '../../contract/registro.js'
// Il catalogo per il modello, che una prova confronta col file su disco.
export { catalogo, catalogoJson, daNomeFunzione, nomeFunzione } from '../../contract/tools.js'
// Il cancello del condotto e il condotto acceso davvero, per
// `tests/api/conduit.test.mjs`: dallo stesso grafo, o la prova parlerebbe con
// un nucleo senza procedure. `indirizzoCondotto` dice dove bussare.
export {
  avviaCondotto,
  condottoDaAprire,
  indirizzoCondotto,
  permessoMancante,
} from '../../desktop/transports/conduit.js'
// Le impostazioni, per revocare i permessi fra una chiamata e l'altra come fa
// la pagina.
export { comandi, impostazioni } from '../../desktop/apparato/platform.js'
// Gli aggiornamenti detti a parole, fase per fase, senza aggiornatore vero.
export { racconta, statoAggiornamenti } from '../../desktop/apparato/updates.js'
// Il cancello dell'assistente: che cosa il modello vede e che cosa gli si
// lascia eseguire.
export {
  attrezzi, componiBattute, descriviContesto, idVisti, istruzioni, ricordaIdVisti,
  senzaNulliDiTroppo, ultimiVisti, usaAttrezzo,
} from '../../desktop/transports/assistant.js'
// Il giro che cambia finestra (in `pannelli/`): l'host tiene da parte la
// domanda senza risposta e la finestra che prende la conversazione la
// riprende.
export {
  riprendiGiro, rispondiConversazione, sospendiGiroInCorso,
} from '../../desktop/pannelli/conversation.js'
// Come una busta di lettura diventa una tabella.
export { impagina, scrivi } from '../../contract/presentation.js'
// Chi porta il registro su una pagina: senza guscio non c'è nessuno iscritto,
// e si provano le due risposte.
export { registraNavigatore } from '../../core/azioni/view.js'
export { registraProiettore } from '../../core/azioni/projection.js'
// Gli account Microsoft con un portachiavi finto: le letture di OneDrive
// rispondono da un Graph finto (`tests/api/reads.test.mjs`).
export { registraPortachiaviMicrosoft } from '../../core/dati/microsoft.js'
// Gli account sincronizzati fissati a mano: il registro di Windows di chi prova non conta.
export { fissaOneDriveLocali } from '../../core/dati/oneDriveLocale.js'
export { azioniSottoContratto } from '../../contract/bridge.js'
export { VERSIONE_API, ErroreApi, errore, definisci } from '../../contract/contract.js'
export { STATI_LEZIONE } from '../../contract/procedure/ore/common.js'
// Gli stati dell'appello stanno in common/rollCall.ts.
export { STATI_APPELLO } from '../../contract/procedure/common/rollCall.js'
export * as schemi from '../../contract/schemas.js'

// Il centralino vero, per le prove del ponte.
export { esegui, azioneValida } from '../../contract/centralino.js'
export { fermaRapporti, rigenerazioniInAttesa } from '../../core/azioni/reports.js'

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
} from '../../core/dominio/index.js'
export { STATI_PRESENZA } from '../../core/dominio/lexicon.js'
