// Il livello API con sotto l'archivio vero, in un grafo solo.
//
// Stessa ragione di `tests/helpers/data.ts`, che va letta lì per esteso: l'anno
// in uso (`data/paths.ts`) e il deposito aperto (`data/store.ts`) sono
// variabili di modulo, e con due bundle una prova che apre il documento da uno
// e chiama una procedura dall'altro sta guardando due registri che non si
// conoscono. Qui esce un grafo solo, come in `principale.cjs`.
//
// Si esporta anche `schemi` per intero: una parte delle prove riguarda la
// convalida in sé — che «assente» non passi dove si aspetta uno stato
// dell'appello — e quella non ha bisogno di un archivio.

export { Archivio } from '../../src/data/archive.js'
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
// Il registro raccontato a un modello: il catalogo che la riga di comando si
// legge, e che una prova confronta con il file su disco.
export { catalogo, catalogoJson, daNomeFunzione, nomeFunzione } from '../../src/api/tools.js'
// Il cancello del condotto: chi entra, con quali permessi. È una riga sola, ed
// è quella che decide se uno script può scrivere nel registro di una classe.
//
// Accanto, il condotto acceso davvero: `tests/api/conduit.test.mjs` prova il
// trasporto — l'imbustamento, il parsing, lo smistamento, il cancello — e per
// provarlo deve farlo ascoltare. Passa di qui e non da un bundle suo perché due
// bundle sono due grafi, cioè due registri che non si conoscono: la prova
// parlerebbe con un nucleo diverso da quello che ha registrato le procedure.
// `indirizzoCondotto` perché la prova deve sapere dove bussare senza
// ricalcolare la regola del nome.
export {
  avviaCondotto,
  condottoDaAprire,
  indirizzoCondotto,
  permessoMancante,
} from '../../src/api/transports/conduit.js'
// Le impostazioni, per la prova che le cambia a metà: il condotto rilegge i
// permessi a ogni chiamata, e per provarlo bisogna poterli revocare fra una
// chiamata e l'altra dalla stessa via che passa dalla pagina.
export { impostazioni } from '../../src/environment/platform.js'
// Il cancello dell'assistente: che cosa il modello locale vede, e che cosa gli
// viene lasciato eseguire. È l'altra riga che decide se qualcuno che non è una
// persona può scrivere nel registro di una classe.
export {
  attrezzi, descriviContesto, idVisti, istruzioni, ricordaIdVisti,
  senzaNulliDiTroppo, ultimiPerProcedura, ultimiVisti, usaAttrezzo,
} from '../../src/api/transports/assistant.js'
// Il giro che cambia finestra: l'host tiene da parte la domanda a cui non è
// ancora arrivata risposta, e la finestra che prende la conversazione la
// riprende da dove era. Sta in `pannelli/` e si prova di qui perché è l'altra
// metà del trasporto qui sopra — quello parla al modello, questo decide a chi
// arriva quel che risponde — e non ha bisogno di un guscio intorno.
export {
  riprendiGiro, rispondiConversazione, sospendiGiroInCorso,
} from '../../src/panels/conversation.js'
// Come una busta di lettura diventa una tabella: è la parte che toglie i dati
// di mano al modello, e una colonna contata male non romperebbe niente di
// visibile — sparirebbe, e chi guarda darebbe la colpa al modello.
export { impagina, scrivi } from '../../src/api/presentation.js'
// Chi porta il registro su una pagina: senza un guscio intorno non c'è nessuno
// iscritto, ed è quel che permette di provare tutte e due le risposte — quella
// di quando il registro è aperto e quella di quando non c'è.
export { registraNavigatore } from '../../src/actions/view.js'
export { azioniSottoContratto, gestoriDelleProcedure } from '../../src/api/bridge.js'
export { VERSIONE_API, ErroreApi, errore, definisci } from '../../src/api/contract.js'
export { SEGNI, STATI_LEZIONE } from '../../src/api/procedures/ore/common.js'
// Gli stati dell'appello sono di piu' di un'area: stanno in common/rollCall.ts.
export { STATI_APPELLO, statiScelti } from '../../src/api/procedures/common/rollCall.js'
export * as schemi from '../../src/api/schemas.js'

// Il centralino vero: serve alle prove che verificano che il ponte non abbia
// cambiato il comportamento di un'azione già esistente.
export { esegui, azioneValida } from '../../src/actions.js'
export { fermaRapporti, rigenerazioniInAttesa } from '../../src/actions/reports.js'

// Le fabbriche del dominio, per costruire la scuola su cui si prova. Passano
// da qui e non da `dist-tests/domain.mjs` perché il registro che si scrive
// nell'archivio deve essere fatto degli stessi oggetti che l'archivio rilegge.
export {
  creaAllievo,
  creaAnno,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  creaRecapito,
  creaSlot,
  creaSmistamento,
  creaValutazione,
  registroVuoto,
} from '../../src/domain/index.js'
export { STATI_PRESENZA } from '../../src/domain/lexicon.js'
