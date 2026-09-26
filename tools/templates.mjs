// Rigenera `src/data/defaultTemplates.ts` dal contenuto di `templates/`: i
// modelli di serie, scritti al primo avvio quando la cartella non c'è ancora.
//
//   npm run templates
//
// Da lanciare dopo ogni modifica a `templates/`; `npm test` controlla che i
// due siano d'accordo.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { RADICE } from './common.mjs'

// La copia maestra, che finisce nel pacchetto. Non è la `templates/` del
// docente, che sta accanto al suo documento d'anno.
export const CARTELLA_MODELLI = join(RADICE, 'templates')
export const FILE_GENERATO = join(RADICE, 'src', 'data', 'defaultTemplates.ts')

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
 * I modelli letti da `templates/`, per nome, in ordine. Un `.tpl` si nomina
 * senza estensione (così si richiamano, `estende: _base`); gli altri file la tengono.
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

// Scrive solo quando lo si lancia: il test lo importa per confrontare.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  writeFileSync(FILE_GENERATO, componiFile(), 'utf8')
  console.log(`Modelli di serie rigenerati da templates/ (${leggiModelli().length} file).`)
}
