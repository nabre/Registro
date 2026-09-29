// Il finto `electron` di `tiles.test.mjs`: solo `app.getPath` e `net.fetch`.
// `net.fetch` passa da `globalThis.__reteTasselli`, che la prova sostituisce
// (un PNG, un proxy che risponde HTML, nessuna rete).

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Senza `REGISTRO_USERDATA` una cartella tutta di questo processo, tolta
// all'uscita: un nome fisso sarebbe condiviso fra prove parallele.
let propria = null

export const app = {
  getPath () {
    if (process.env.REGISTRO_USERDATA) {
      mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
      return process.env.REGISTRO_USERDATA
    }
    if (!propria) {
      propria = mkdtempSync(join(tmpdir(), 'registro-prove-tasselli-'))
      process.once('exit', () => rmSync(propria, { recursive: true, force: true }))
    }
    return propria
  },
}

export const net = {
  fetch (...argomenti) {
    return globalThis.__reteTasselli(...argomenti)
  },
}
