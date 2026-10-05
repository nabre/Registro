// Un file sorgente compilato al volo, per le prove senza un bundle in
// `dist-tests/`: esbuild in memoria, importato da un `data:`, con gli alias dei
// bundle veri (`apparato` → `desktop/apparato/platform.ts`, `electron` → il
// finto).
//
// Opzioni: `electron` per un finto diverso (con `net`, per esempio);
// `nodeLlama` per il `node-llama-cpp` finto; `finti` per moduli scritti lì per
// lì, da nome a testo; `plugins` per sostituire un modulo per un importatore
// solo; `external` per lasciare fuori un pacchetto.
//
// Con `REGISTRO_COPERTURA=1` (lo mette `tools/coverage.mjs`) il modulo va su
// disco con la mappa inline: la copertura di Node ignora i `data:` e senza
// mappa non saprebbe da quale `.ts` viene il codice.

import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RADICE = fileURLToPath(new URL('../..', import.meta.url))

/** Il finto `electron` comune, con le barre giuste per un `import` in un testo. */
const FINTO_ELECTRON = `${RADICE}/tests/helpers/fake-electron.mjs`.replace(/\\/g, '/')

/** Dove vanno i moduli compilati quando si misura la copertura; se no, da nessuna parte. */
const CARTELLA_COPERTURA = process.env.REGISTRO_COPERTURA === '1'
  ? `${RADICE}/copertura/moduli`
  : null
let compilati = 0

/** Il finto comune, più una `Notification` che si comanda da `globalThis.__notifiche`. */
export const ELECTRON_CON_NOTIFICHE = `
export * from '${FINTO_ELECTRON}'
export class Notification {
  static isSupported () { return true }
  constructor (opzioni) {
    this.opzioni = opzioni
    this.ascoltatori = {}
    ;(globalThis.__notifiche ??= []).push(this)
  }
  on (evento, fn) { (this.ascoltatori[evento] ??= []).push(fn); return this }
  emetti (evento) { for (const fn of this.ascoltatori[evento] ?? []) fn() }
  show () {}
  close () { this.emetti('close') }
}
`

/** Il plugin che mette al posto dei moduli nominati in `finti` il loro testo. */
function moduliFinti (finti) {
  return {
    name: 'finti',
    setup (costruzione) {
      const nomi = Object.keys(finti)
      if (nomi.length === 0) return
      const filtro = new RegExp(`^(${nomi.map((n) => n.replace(/[:/]/g, '\\$&')).join('|')})$`)
      costruzione.onResolve({ filter: filtro }, (a) => ({ path: a.path, namespace: 'finto' }))
      costruzione.onLoad({ filter: /.*/, namespace: 'finto' }, (a) => ({
        contents: finti[a.path],
        loader: 'js',
        resolveDir: RADICE,
      }))
    },
  }
}

/**
 * Il modulo compilato da `sorgente`: un percorso dalla radice del progetto, o
 * (se comincia con `export`) il testo di un modulo d'ingresso, per mettere in
 * un bundle solo due file che condividono lo stato.
 */
export async function importaSorgente (
  sorgente,
  { electron, nodeLlama, finti = {}, plugins = [], external = [] } = {},
) {
  const ingresso = sorgente.startsWith('export')
    ? { stdin: { contents: sorgente, resolveDir: RADICE, loader: 'ts', sourcefile: 'prova.ts' } }
    : { entryPoints: [`${RADICE}/${sorgente}`] }
  const file = CARTELLA_COPERTURA && `${CARTELLA_COPERTURA}/${process.pid}-${compilati++}.mjs`
  const uscita = await build({
    ...ingresso,
    ...(file ? { outfile: file, sourcemap: 'inline' } : {}),
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    logLevel: 'silent',
    // I `.tsx` dell'interfaccia (ADR-56), compilati come l'applicazione.
    jsx: 'automatic',
    external,
    // `Temporal`, che Node non ha: come i bundle di `esbuild.mjs --test`.
    inject: [`${RADICE}/tests/helpers/temporal.mjs`],
    plugins: [moduliFinti(finti), ...plugins],
    alias: {
      apparato: `${RADICE}/desktop/apparato/platform.ts`,
      // Un `electron` finto scritto in `finti` vince sull'alias.
      ...('electron' in finti ? {} : { electron: electron ?? FINTO_ELECTRON }),
      ...(nodeLlama ? { 'node-llama-cpp': `${RADICE}/${nodeLlama}` } : {}),
    },
  })
  const testo = uscita.outputFiles[0].text
  if (file) {
    mkdirSync(CARTELLA_COPERTURA, { recursive: true })
    writeFileSync(file, testo)
    return await import(pathToFileURL(file).href)
  }
  return await import(`data:text/javascript;base64,${Buffer.from(testo).toString('base64')}`)
}
