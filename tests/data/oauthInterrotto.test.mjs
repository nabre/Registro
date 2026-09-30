// L'attesa del ritorno dal browser si interrompe: chi chiude la scheda e
// riprova non resta dietro un accesso che non finirà mai.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

/** Un'attesa aperta, con l'indirizzo della sua porta. */
async function apri (aspettaIlRitorno, stato) {
  let consegna
  const pronto = new Promise((risolvi) => {
    consegna = risolvi
  })
  const ritorno = aspettaIlRitorno(stato, async (dove) => consegna(dove))
  return { ritorno, dove: await pronto }
}

describe('l’attesa dell’accesso Microsoft', () => {
  it('`interrompiAccesso` la chiude con `interrotto` e chiude la porta', async () => {
    const { aspettaIlRitorno, interrompiAccesso } = await importaSorgente('core/dati/oauth.ts')
    const { ritorno, dove } = await apri(aspettaIlRitorno, 'primo')

    interrompiAccesso()
    const esito = await ritorno
    assert.equal(esito.error, 'interrotto')
    await assert.rejects(fetch(`${dove}/?code=tardi&state=primo`), 'la porta resta aperta')
    // Senza attese in corso non fa niente.
    interrompiAccesso()
  })

  it('una seconda attesa interrompe la prima, e resta lei ad ascoltare', async () => {
    const { aspettaIlRitorno } = await importaSorgente('core/dati/oauth.ts')
    const primo = await apri(aspettaIlRitorno, 'primo')
    const secondo = await apri(aspettaIlRitorno, 'secondo')

    assert.equal((await primo.ritorno).error, 'interrotto')
    const risposta = await fetch(`${secondo.dove}/?code=abc&state=secondo`)
    assert.equal(risposta.status, 200)
    await risposta.text()
    const esito = await secondo.ritorno
    assert.equal(esito.code, 'abc')
    assert.equal(esito.error, undefined)
  })
})
