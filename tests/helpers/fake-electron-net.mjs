// Il finto `electron` di `tiles.test.mjs`: solo `app.getPath` e `net.fetch`.
// `net.fetch` passa da `globalThis.__reteTasselli`, che la prova sostituisce
// (un PNG, un proxy che risponde HTML, nessuna rete).

import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const app = {
  getPath () {
    const cartella = process.env.REGISTRO_USERDATA || join(tmpdir(), 'registro-prove-tasselli')
    mkdirSync(cartella, { recursive: true })
    return cartella
  },
}

export const net = {
  fetch (...argomenti) {
    return globalThis.__reteTasselli(...argomenti)
  },
}
