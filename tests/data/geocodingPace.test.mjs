// Una richiesta al secondo a Nominatim, anche quando le domande arrivano insieme.
//
// `rispettaIlPasso` leggeva l'ultima chiamata, aspettava, e solo dopo scriveva
// la sua: due giri partiti nello stesso istante calcolavano la stessa attesa e
// partivano insieme — contro la sola regola che il servizio chiede. Adesso il
// turno si prenota prima di aspettare. Qui si chiedono due turni nello stesso
// istante e si guarda che il secondo aspetti il primo.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from './bundleDiProva.mjs'

const { rispettaIlPasso } = await importaSorgente('src/data/geocoding.ts')

describe('rispettaIlPasso', () => {
  it('due domande insieme partono a un passo di distanza', async () => {
    const adesso = Date.now()
    const attese = await Promise.all([rispettaIlPasso(adesso), rispettaIlPasso(adesso)])
    assert.equal(attese[0], 0)
    assert.ok(attese[1] >= 1000, `il secondo è partito dopo ${attese[1]} ms`)
  })
})
