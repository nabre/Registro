// Un file sorgente compilato al volo, per le prove che non hanno un bundle loro
// in `dist-tests/`.
//
// È lo stesso giro di `tests/domain/jsonStore.test.mjs`: esbuild in memoria, e
// il risultato importato da un `data:`. In più, i due alias dei bundle veri —
// `apparato` verso `src/environment/platform.ts`, `electron` verso il finto —
// così che un file di `data/` si compili com'è, senza toccare `esbuild.mjs`.
// Chi ha bisogno di un Electron diverso dal finto comune (con `net`, per
// esempio) passa `electron` con il percorso del suo.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const RADICE = fileURLToPath(new URL('../..', import.meta.url))

/**
 * Il modulo compilato da `sorgente`: un percorso dalla radice del progetto, o —
 * se comincia con `export` — il testo di un modulo d'ingresso, per mettere in un
 * bundle solo due file che devono condividere lo stato (due bundle separati ne
 * avrebbero una copia ciascuno).
 */
export async function importaSorgente (sorgente, { electron } = {}) {
  const ingresso = sorgente.startsWith('export')
    ? { stdin: { contents: sorgente, resolveDir: RADICE, loader: 'ts', sourcefile: 'prova.ts' } }
    : { entryPoints: [`${RADICE}/${sorgente}`] }
  const uscita = await build({
    ...ingresso,
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    logLevel: 'silent',
    alias: {
      apparato: `${RADICE}/src/environment/platform.ts`,
      electron: electron ?? `${RADICE}/tests/helpers/fake-electron.mjs`,
    },
  })
  const testo = uscita.outputFiles[0].text
  return await import(`data:text/javascript;base64,${Buffer.from(testo).toString('base64')}`)
}
