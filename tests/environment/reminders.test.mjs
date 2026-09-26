// Il battito d'orologio dei promemoria: un'eccezione dentro un giro non deve
// scappare fuori, dove nessuno la cattura.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ELECTRON_CON_NOTIFICHE, importaSorgente } from '../helpers/sorgente.mjs'

describe('il battito che non esplode', () => {
  it('un’eccezione nel battito va nella console, non fuori', async () => {
    const { battitoSicuro } = await importaSorgente('src/reminders.ts', {
      finti: { electron: ELECTRON_CON_NOTIFICHE },
    })
    const scritti = []
    const originale = console.error
    console.error = (...parti) => scritti.push(parti)
    try {
      const battito = battitoSicuro('prova', () => {
        throw new Error('orario storto')
      })
      assert.doesNotThrow(battito)
    } finally {
      console.error = originale
    }
    assert.equal(scritti.length, 1)
    assert.match(String(scritti[0][0]), /prova/)
  })
})
