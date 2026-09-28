// La porta locale dell'accesso Microsoft si chiude solo su un `?error=` della
// sua risposta.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

describe('la porta dell’accesso Microsoft', () => {
  it('una risposta con lo stato sbagliato riceve 400, e l’attesa continua', async () => {
    const { aspettaIlRitorno } = await importaSorgente('core/dati/oauth.ts')
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

describe('il rinnovo OAuth non valido (invalid_grant)', () => {
  it('dimentica il gettone di rinnovo e azzera lo stato collegato', async () => {
    const CHIAVE_RINNOVO = 'registroDocenti.posta.rinnovo'
    const deposito = new Map([[CHIAVE_RINNOVO, 'TOKEN_NON_VALIDO']])
    const portachiavi = {
      async get (chiave) { return deposito.get(chiave) ?? null },
      async store (chiave, valore) { deposito.set(chiave, valore) },
      async delete (chiave) { deposito.delete(chiave) },
    }

    const fetchOriginale = globalThis.fetch
    try {
      globalThis.fetch = async (url) => {
        const u = String(url)
        if (u.includes('.well-known/openid-configuration')) {
          return {
            ok: true,
            async json () {
              return { issuer: 'https://login.microsoftonline.com/tenant-123/v2.0' }
            },
          }
        }
        if (u.includes('/oauth2/v2.0/token')) {
          return {
            ok: false,
            async json () {
              return {
                error: 'invalid_grant',
                error_description: 'AADSTS700082: The refresh token has expired.',
              }
            },
          }
        }
        return await fetchOriginale(url)
      }

      const { gettoneDaSpedire, oauthNoto, registraPortachiaviOauth } =
        await importaSorgente('core/dati/oauth.ts')

      registraPortachiaviOauth(portachiavi)
      // Attesa breve per il callback di caricamento iniziale dal portachiavi.
      await new Promise((risolvi) => setTimeout(risolvi, 10))
      assert.equal(oauthNoto(), true)
      assert.equal(deposito.has(CHIAVE_RINNOVO), true)

      await assert.rejects(
        () => gettoneDaSpedire('docente@scuola.ch'),
        (errore) => {
          assert.ok(errore instanceof Error)
          return true
        },
      )

      assert.equal(deposito.has(CHIAVE_RINNOVO), false)
      assert.equal(oauthNoto(), false)
      const riprova = await gettoneDaSpedire('docente@scuola.ch')
      assert.equal(riprova, null)
    } finally {
      globalThis.fetch = fetchOriginale
    }
  })
})

