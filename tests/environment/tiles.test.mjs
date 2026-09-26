// La cache dei tasselli della mappa: ci va solo un'immagine (non la pagina
// HTML di un proxy di scuola), e un tassello più vecchio di una settimana si
// richiede, servendo il vecchio se la rete non c'è.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { importaSorgente } from '../helpers/sorgente.mjs'

const dati = mkdtempSync(join(tmpdir(), 'registro-prova-tasselli-'))
process.env.REGISTRO_USERDATA = dati

const { tassello } = await importaSorgente('shell/protocol/tiles.ts', {
  electron: fileURLToPath(new URL('../helpers/fake-electron-net.mjs', import.meta.url)),
})

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const GIORNO = 24 * 60 * 60 * 1000

/** Dove il tassello z/x/y sta in cache. */
function inCache (z, x, y) {
  return join(dati, 'tasselli', String(z), String(x), `${y}.png`)
}

/** Una rete finta che conta le chiamate e risponde quel che le si dice. */
function rete (risposta) {
  const conto = { chiamate: 0 }
  globalThis.__reteTasselli = async () => {
    conto.chiamate += 1
    return typeof risposta === 'function' ? risposta() : risposta.clone()
  }
  return conto
}

const immagine = () => new Response(PNG, { headers: { 'content-type': 'image/png' } })

beforeEach(() => {
  rmSync(join(dati, 'tasselli'), { recursive: true, force: true })
})

after(() => {
  rmSync(dati, { recursive: true, force: true })
})

describe('tasselli', () => {
  it('un 200 che non è un\'immagine non finisce in cache', async () => {
    rete(() => new Response('<html>accedi al proxy</html>', { headers: { 'content-type': 'text/html' } }))
    const risposta = await tassello(3, 1, 2)
    assert.notEqual(risposta.status, 200)
    assert.equal(existsSync(inCache(3, 1, 2)), false, 'la pagina del proxy è in cache')

    // Il proxy si è tolto di mezzo: il tassello arriva, e da lì si tiene.
    rete(immagine)
    const dopo = await tassello(3, 1, 2)
    assert.equal(dopo.status, 200)
    assert.deepEqual(new Uint8Array(readFileSync(inCache(3, 1, 2))), PNG)
  })

  it('un tassello di ieri si serve dalla cache, senza rete', async () => {
    const file = inCache(4, 3, 2)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, PNG)
    const ieri = new Date(Date.now() - GIORNO)
    utimesSync(file, ieri, ieri)

    const conto = rete(immagine)
    const risposta = await tassello(4, 3, 2)
    assert.equal(risposta.status, 200)
    assert.equal(conto.chiamate, 0)
  })

  it('un tassello di più di una settimana si richiede', async () => {
    const file = inCache(5, 6, 7)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, new Uint8Array([1, 1, 1]))
    const vecchio = new Date(Date.now() - 8 * GIORNO)
    utimesSync(file, vecchio, vecchio)

    const conto = rete(immagine)
    const risposta = await tassello(5, 6, 7)
    assert.equal(conto.chiamate, 1)
    assert.deepEqual(new Uint8Array(await risposta.arrayBuffer()), PNG)
    assert.deepEqual(new Uint8Array(readFileSync(file)), PNG)
  })

  it('scaduto e senza rete, si serve quello vecchio', async () => {
    const file = inCache(5, 6, 8)
    mkdirSync(join(file, '..'), { recursive: true })
    const vecchi = new Uint8Array([9, 9, 9])
    writeFileSync(file, vecchi)
    const vecchio = new Date(Date.now() - 30 * GIORNO)
    utimesSync(file, vecchio, vecchio)

    rete(() => {
      throw new TypeError('fetch failed')
    })
    const risposta = await tassello(5, 6, 8)
    assert.equal(risposta.status, 200)
    assert.deepEqual(new Uint8Array(await risposta.arrayBuffer()), vecchi)
  })
})
