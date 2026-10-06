// Rigenera `core/dati/defaultTemplates.ts` dal contenuto di `templates/`: i
// modelli dei rapporti, compilati dentro il programma (ADR-34).
//
//   npm run templates
//
// Da lanciare dopo ogni modifica a `templates/`, prima della build; `npm test`
// controlla che i due siano d'accordo.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { RADICE } from './common.mjs'

// La sola copia dei modelli. Non è la `templates/` che le versioni vecchie
// scrivevano accanto al documento d'anno: quella si legge solo per importarne
// l'intestazione e segnalare i modelli toccati a mano.
export const CARTELLA_MODELLI = join(RADICE, 'templates')
export const FILE_GENERATO = join(RADICE, 'core', 'dati', 'defaultTemplates.ts')

const TESTATA = `// I modelli dei rapporti, i soli che il registro usa: non ne scrive una copia
// su disco e non ne legge una da lì (ADR-34). Un cambiamento in \`templates/\`
// arriva nel programma solo passando di qui e da una build nuova.
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
