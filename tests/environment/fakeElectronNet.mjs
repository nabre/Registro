// Il finto `electron` di `tiles.test.mjs`: `app.getPath` e `net.fetch`, e
// nient'altro, perché i tasselli della mappa non toccano altro.
//
// `net.fetch` passa da `globalThis.__reteTasselli`, che la prova sostituisce
// caso per caso: un server che risponde un PNG, un proxy che risponde HTML,
// una rete che non c'è.

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
