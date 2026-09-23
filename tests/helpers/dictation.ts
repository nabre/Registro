// La dettatura con sotto lo shim delle impostazioni, in un grafo solo.
//
// Stessa ragione di `tests/helpers/llm.ts`: le impostazioni lette dallo shim
// stanno in una variabile di modulo, e con due bundle una prova che *scrive* il
// file da uno e legge un collegamento dall'altro guarda due tabelle che non si
// conoscono — i predefiniti tornano giusti e i valori scritti spariscono, che è
// il modo più ingannevole in cui una prova possa passare a metà.

export {
  collegamentoDettatura,
  dettaturaAccesa,
  // Quanto si scarica e non soltanto se: il corredo ha due pezzi, e chi ne ha
  // già uno suo non deve vedersi arrivare anche quello.
  mancanti,
  prontezzaDettatura,
  soloInglese,
  trascrivi,
} from '../../src/data/dictation.js'
export { argomenti, ripulisci, wav } from '../../src/data/whisper.js'
// Il corredo entra nello stesso grafo perché `dictation.ts` lo interroga a ogni
// collegamento: provarlo da un bundle suo vorrebbe dire due cartelle e due
// tabelle di impostazioni che non si conoscono — lo stesso guasto che questo
// file evita per le impostazioni.
export { cartellaCorredo, siScarica } from '../../src/data/voiceKit.js'
// Il meccanismo dello scarico sta sotto i due corredi — quello della dettatura
// e quello delle scansioni — ed è lì che vivono le guardie che non devono poter
// divergere fra l'uno e l'altro.
// `scarica` insieme a `scompatta`: la scadenza e la ripresa si guardano solo
// dall'ingresso vero — un pacco, una cartella, un sito che risponde piano — e
// dall'interno non si vedrebbero.
export { scarica, scompatta } from '../../src/data/kit.js'
// Serve a comporre un archivio vero da dare a `scompatta`: la prova che conta
// è che il nostro lettore di ZIP e la nostra estrazione si capiscano, e con un
// archivio finto a mano si proverebbe la finzione.
export { scriviZip } from '../../src/data/zip.js'
export { ricaricaImpostazioni } from '../../src/environment/settings.js'
