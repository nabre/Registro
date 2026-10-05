// I lettori del registro: da quel che c'è su disco a oggetti validi.
//
// `normalizza…` produce sempre un oggetto valido, riempiendo i buchi con i
// predefiniti: i file stanno in una cartella sincronizzata e si aprono a mano,
// quindi un campo mancante o un JSON di una versione precedente deve
// degradare, non far cadere il programma. Qui anche le conversioni delle forme
// vecchie (compiti e documenti che diventano consegne), che solo un lettore
// può fare. Le regole condivise con le convalide si importano da
// `validation.ts`, mai il contrario.
//
// Questo file dice solo che cosa esce dalla cartella: i lettori elementari
// che i file si passano fra loro restano dentro.

export { normalizzaPiano, normalizzaValutazione } from './readers.js'
export {
  conCarteComplete,
  logoAmmesso,
  nomeDaOrigine,
  normalizzaCalendario,
  normalizzaImpostazioni,
  normalizzaIntestazione,
  normalizzaPause,
} from './settings.js'
export { normalizzaRegistro } from './register.js'
export { normalizzaConsegna } from './deliveries.js'
export { fondiCheck, normalizzaCheck } from './check.js'
export { fondiIntegrazione, normalizzaProgetto } from './projects.js'

/** Riesportata da `text.ts` per chi la importa da qui. */
export { emailValida } from '#core/dominio/text.js'
/** Riesportata da `models.ts` per chi la importa da qui. */
export { TIPI_RAPPORTO } from '#core/dominio/models.js'
