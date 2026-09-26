// Lo stato dell'interfaccia (`src/ui/state.ts`) compilato al volo come `iife`
// per il browser e fatto girare in un contesto a parte; il ponte col processo
// principale è un `acquireVsCodeApi` finto.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const pacchetto = await build({
  entryPoints: [fileURLToPath(new URL('../../src/ui/state.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'interfaccia',
})

/**
 * Una finestra nuova con il suo stato: `ponte` è quel che `acquireVsCodeApi`
 * restituisce, con `getState` e `setState`.
 */
export function apriInterfaccia (ponte) {
  const ambiente = {
    navigator: { onLine: true },
    window: { addEventListener () {} },
    acquireVsCodeApi: () => ponte,
  }
  runInNewContext(pacchetto.outputFiles[0].text, ambiente)
  return ambiente.interfaccia
}
