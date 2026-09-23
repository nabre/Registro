// Rigenera `src/data/defaultTemplates.ts` dal contenuto di `templates/`.
//
// I modelli di serie sono una copia: servono al primo avvio, quando la cartella
// `templates/` non c'è ancora. Finora quella copia si aggiornava a mano —
// «si modifica la cartella e si ricopia qui il testo del file cambiato» — e una
// copia che si aggiorna a mano è una copia che prima o poi non corrisponde più.
// Chi installa il registro nuovo si sarebbe trovato i modelli di due versioni
// fa, senza che niente lo dicesse.
//
//   npm run templates
//
// Da lanciare dopo ogni modifica a `templates/`. Il controllo che i due siano
// in accordo lo fa `npm test`, così non ci si dimentica.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const QUI = fileURLToPath(new URL('.', import.meta.url))
// La copia maestra sta qui, accanto ai sorgenti: è quella che finisce in
// `defaultTemplates.ts` e viaggia nel pacchetto. La `templates/` che il
// docente modifica sta invece accanto al suo documento d'anno, e con questa
// non ha niente a che fare.
export const CARTELLA_MODELLI = join(QUI, '..', 'templates')
export const FILE_GENERATO = join(QUI, '..', 'src', 'data', 'defaultTemplates.ts')

const TESTATA = `// I modelli di serie, quelli che il registro scrive in \`templates/\` quando la
// cartella non c'è ancora.
//
// La copia che conta è quella su disco: appena esiste, è lei a essere letta, e
// questa non la tocca più. Servono a un caso solo — il primo avvio, o una
// cartella cancellata — perché un registro che non sa stampare finché qualcuno
// non gli copia dei file dentro sarebbe rotto appena installato.
//
// Generato da \`templates/\` con \`npm run templates\`: non si scrive a mano. Che i
// due siano in accordo lo controlla \`npm test\`.

export const MODELLI_PREDEFINITI: Record<string, string> = {
`

/**
 * I modelli letti da `templates/`, per nome, in ordine.
 *
 * Un `.tpl` si nomina senza estensione — è il nome con cui i modelli si
 * richiamano fra loro, `estende: _base` — mentre gli altri file della cartella
 * se la tengono: `_firma.html` è un file HTML, e chiamarlo `_firma` vorrebbe
 * dire un modello di rapporto che non esiste.
 */
export function leggiModelli () {
  const nomi = readdirSync(CARTELLA_MODELLI)
    .filter((nome) => nome.endsWith('.tpl') || nome.endsWith('.html'))
    .sort()
  return nomi.map((nome) => ({
    nome: nome.endsWith('.tpl') ? nome.slice(0, -'.tpl'.length) : nome,
    testo: readFileSync(join(CARTELLA_MODELLI, nome), 'utf8').replace(/\r\n/g, '\n'),
  }))
}

/** Il file TypeScript che ne deriva, testo compreso. */
export function componiFile () {
  const voci = leggiModelli()
    .map(({ nome, testo }) => `  ${JSON.stringify(nome)}: ${JSON.stringify(testo)},`)
    .join('\n')
  return `${TESTATA}${voci}\n}\n`
}

// Solo quando lo si lancia: il test importa questo file per confrontare, e non
// deve riscrivere niente.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  writeFileSync(FILE_GENERATO, componiFile(), 'utf8')
  console.log(`Modelli di serie rigenerati da templates/ (${leggiModelli().length} file).`)
}
