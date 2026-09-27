// I fallimenti all'ascolto del condotto:
//   1. EACCES (su Windows nome già di qualcuno o permessi negati);
//   2. EADDRINUSE (su unix socket già presente);
//   3. un guasto imprevisto: chiude il server e propaga l'errore.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-condotto-errori-'))

const FINTO_NET = `
import { EventEmitter } from 'node:events'
export function createServer () {
  const s = new EventEmitter()
  s.close = (cb) => {
    globalThis.__serverChiuso = true
    cb?.()
    return s
  }
  s.listen = (indirizzo, cb) => {
    if (globalThis.__codiceErrore) {
      const male = new Error('listen ' + globalThis.__codiceErrore)
      male.code = globalThis.__codiceErrore
      queueMicrotask(() => s.emit('error', male))
      return s
    }
    queueMicrotask(() => cb?.())
    return s
  }
  return s
}
export class Socket extends EventEmitter {}
export function connect () {}

`

let avviaCondotto
let indirizzoCondotto

before(async () => {
  const m = await importaSorgente(
    [
      "export { avviaCondotto, indirizzoCondotto } from './desktop/transports/conduit.ts'",
    ].join('\n'),
    {
      finti: { 'node:net': FINTO_NET },
      nodeLlama: 'tests/helpers/fake-node-llama.mjs',
    },
  )
  avviaCondotto = m.avviaCondotto
  indirizzoCondotto = m.indirizzoCondotto
})

after(() => {
  rmSync(radice, { recursive: true, force: true })
})

describe('il condotto e i guasti di ascolto (EACCES / EADDRINUSE)', () => {
  it('su EACCES chiude il server e rifiuta con nomePreso', async () => {
    globalThis.__codiceErrore = 'EACCES'
    globalThis.__serverChiuso = false

    const archivioFinto = {
      impostazioni: {
        leggi: () => ({ get: () => true }),
      },
    }

    await assert.rejects(
      avviaCondotto(archivioFinto, {
        cartellaUtente: radice,
        permessi: { lettura: true, scrittura: false },
      }),
      (male) => {
        assert.equal(globalThis.__serverChiuso, true, 'il server deve essere stato chiuso')
        assert.match(male.message, /è già preso/)
        assert.ok(male.message.includes(indirizzoCondotto()))
        return true
      },
    )
  })

  it('su EADDRINUSE chiude il server e rifiuta con nomePreso', async () => {
    globalThis.__codiceErrore = 'EADDRINUSE'
    globalThis.__serverChiuso = false

    const archivioFinto = {
      impostazioni: {
        leggi: () => ({ get: () => true }),
      },
    }

    await assert.rejects(
      avviaCondotto(archivioFinto, {
        cartellaUtente: radice,
        permessi: { lettura: true, scrittura: false },
      }),
      (male) => {
        assert.equal(globalThis.__serverChiuso, true)
        assert.match(male.message, /è già preso/)
        return true
      },
    )
  })

  it('su un altro errore chiude il server e propaga il guasto originale', async () => {
    globalThis.__codiceErrore = 'EMFILE'
    globalThis.__serverChiuso = false

    const archivioFinto = {
      impostazioni: {
        leggi: () => ({ get: () => true }),
      },
    }

    await assert.rejects(
      avviaCondotto(archivioFinto, {
        cartellaUtente: radice,
        permessi: { lettura: true, scrittura: false },
      }),
      (male) => {
        assert.equal(globalThis.__serverChiuso, true)
        assert.equal(male.code, 'EMFILE')
        return true
      },
    )
  })
})
