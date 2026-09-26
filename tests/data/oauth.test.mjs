// La porta locale dell'accesso Microsoft si chiude solo su un `?error=` della
// sua risposta.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

describe('la porta dell’accesso Microsoft', () => {
  it('una risposta con lo stato sbagliato riceve 400, e l’attesa continua', async () => {
    const { aspettaIlRitorno } = await importaSorgente('src/data/oauth.ts')
    let indirizzo = ''
    const pronto = new Promise((risolvi) => {
      indirizzo = risolvi
    })
    const ritorno = aspettaIlRitorno('giusto', async (dove) => indirizzo(dove))
    const dove = await pronto

    const intrusa = await fetch(`${dove}/?error=access_denied&state=altro`)
    assert.equal(intrusa.status, 400)
    await intrusa.text()
    const senzaStato = await fetch(`${dove}/?error=access_denied`)
    assert.equal(senzaStato.status, 400)
    await senzaStato.text()

    const buona = await fetch(`${dove}/?code=abc&state=giusto`)
    assert.equal(buona.status, 200)
    await buona.text()
    const esito = await ritorno
    assert.equal(esito.code, 'abc')
    assert.equal(esito.state, 'giusto')
    assert.equal(esito.error, undefined)
  })
})
