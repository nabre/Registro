// Una richiesta al secondo a Nominatim anche con domande insieme:
// `rispettaIlPasso` prenota il turno prima di aspettare. Due turni chiesti
// nello stesso istante: il secondo aspetta il primo.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { rispettaIlPasso } = await importaSorgente('src/data/geocoding.ts')

describe('rispettaIlPasso', () => {
  it('due domande insieme partono a un passo di distanza', async () => {
    const adesso = Date.now()
    const attese = await Promise.all([rispettaIlPasso(adesso), rispettaIlPasso(adesso)])
    assert.equal(attese[0], 0)
    assert.ok(attese[1] >= 1000, `il secondo è partito dopo ${attese[1]} ms`)
  })
})
