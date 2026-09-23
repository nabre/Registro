// Il tetto di Exchange Online: una trentina di messaggi al minuto per casella.
//
// Un giro di comunicazioni manda un messaggio per allievo sullo stesso filo, e
// dal trentunesimo il server risponde 421 o chiude: tutti quelli dopo finivano
// fra i falliti con una riga che non diceva che cosa fare. Qui si provano le due
// metà della correzione che si provano senza un server: la pausa che scatta
// sopra i venticinque messaggi, e la frase che dice di riprovare fra un minuto.
// Il giro vero — il filo, `dopoOgni` — vuole un server SMTP con STARTTLS e un
// gettone di Microsoft, e qui non c'è.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from './bundleDiProva.mjs'

const { pausaFraMessaggi, rimedio } = await importaSorgente('src/data/exchange.ts')

describe('il tetto di Exchange', () => {
  it('sotto i venticinque messaggi non si aspetta; sopra, poco più di due secondi', () => {
    assert.equal(pausaFraMessaggi(1), 0)
    assert.equal(pausaFraMessaggi(25), 0)
    assert.equal(pausaFraMessaggi(26), 2_100)
    // Ventotto al minuto: sotto il tetto, con un po' di margine.
    assert.ok(60_000 / pausaFraMessaggi(40) < 30)
  })

  it('un rifiuto per troppi messaggi dice di riprovare fra un minuto', () => {
    const casi = [
      '421 4.4.2 Message submission rate for this client has exceeded the configured limit',
      '432 4.3.2 STOREDRV.ClientSubmit; sender thread limit exceeded',
      'Il server ha chiuso il collegamento.',
    ]
    for (const detto of casi) {
      const frase = rimedio(detto)
      assert.match(frase, /riprova fra un minuto/, detto)
      assert.ok(frase.includes(detto), 'il messaggio del server deve restare leggibile')
    }
  })

  it('gli altri guasti restano quelli di prima', () => {
    assert.match(rimedio('535 5.7.139 Authentication unsuccessful'), /consegna SMTP autenticata/)
    assert.match(rimedio('getaddrinfo ENOTFOUND smtp.office365.com'), /non si trova/)
    assert.equal(rimedio('550 5.1.1 utente sconosciuto'), '550 5.1.1 utente sconosciuto')
    // «rate» come parola, non come pezzo di un'altra.
    assert.equal(rimedio('separate error'), 'separate error')
  })
})
