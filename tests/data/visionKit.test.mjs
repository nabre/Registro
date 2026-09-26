// Lo scarico condiviso del corredo avvisa tutti quelli che lo aspettano:
// `data/kit.ts` scarica una volta sola per due pagine, e anche la seconda
// riceve avanzamento e «finito».
//
// Il server è locale: `npm test` non chiama nessuno.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-giro12-corredo-'))

const { scarica } = await import('../../dist-tests/kit.mjs')

describe('lo scarico condiviso del corredo', () => {
  it('racconta anche a chi è arrivato secondo', async () => {
    const dati = Buffer.alloc(2048, 0x41)
    const server = createServer((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(dati.length) })
      risposta.end(dati)
    })
    await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
    const pacco = {
      che: 'modello',
      titolo: 'il modello finto',
      uri: `http://127.0.0.1:${server.address().port}/pacco.bin`,
      archivio: 'pacco.bin',
      byte: dati.length,
      impronta: createHash('sha256').update(dati).digest('hex'),
      arrivo: 'pacco.bin',
    }
    const dove = percorso.join(process.env.REGISTRO_USERDATA, 'corredo')
    mkdirSync(dove, { recursive: true })

    const primo = []
    const secondo = []
    try {
      await Promise.all([
        scarica(dove, [pacco], (avanzamento) => primo.push(avanzamento)),
        scarica(dove, [pacco], (avanzamento) => secondo.push(avanzamento)),
      ])
    } finally {
      server.close()
    }

    assert.equal(primo.some((a) => a.finito), true)
    // La seconda pagina riceve il «finito».
    assert.equal(secondo.some((a) => a.finito), true)
  })
})
