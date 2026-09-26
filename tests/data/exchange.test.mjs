// La posta di Exchange Online (`src/data/exchange.ts`) senza server. Il tetto
// è una trentina di messaggi al minuto per casella: sopra i venticinque scatta
// la pausa, e un 421 dice di riprovare fra un minuto. Il giro vero vuole SMTP
// con STARTTLS e un gettone Microsoft.

// Un messaggio partito verso qualcuno non è fallito: con un destinatario
// rifiutato su `RCPT TO` e `DATA` accettato (250) è partito verso l'altro, e
// non si rimanda. Qui il giro gira su un filo finto che risponde come SMTP.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { giroSulFilo, pausaFraMessaggi, rimedio } = await importaSorgente('src/data/exchange.ts')

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

/**
 * Un server finto: accetta tutto, tranne gli indirizzi in `rifiutati`, e
 * annota i comandi. `DATA` risponde 354 e il messaggio 250.
 */
function filoFinto (rifiutati = []) {
  const comandi = []
  const risposta = (codice, testo = 'ok') => ({ codice, testo })
  return {
    comandi,
    async chiedi (riga) {
      comandi.push(riga)
      const destinatario = /^RCPT TO:<(.*)>$/.exec(riga)
      if (destinatario && rifiutati.includes(destinatario[1])) {
        return risposta(550, '5.1.1 utente sconosciuto')
      }
      if (riga === 'DATA') return risposta(354)
      return risposta(250)
    },
    async pretendi (riga, atteso) {
      const esito = await this.chiedi(riga)
      if (esito.codice !== atteso) throw new Error(`${esito.codice} ${esito.testo}`)
      return esito
    },
    butta () {
      comandi.push('<messaggio>')
    },
    async leggi () {
      return risposta(250, '2.0.0 queued')
    },
  }
}

const messaggio = (...a) => ({ oggetto: 'Uscita', corpo: 'Domani si esce alle 12.', a, ccn: [] })

describe('un rifiuto su RCPT dopo un DATA riuscito', () => {
  it('il messaggio conta come spedito, e il rifiuto va a parte', async () => {
    const filo = filoFinto(['sbagliato@esempio.it'])
    const chiamate = []
    const esito = await giroSulFilo(
      filo,
      [messaggio('mamma@esempio.it', 'sbagliato@esempio.it')],
      'docente@scuola.it',
      (indice, ok) => chiamate.push([indice, ok]),
    )
    assert.equal(esito.ok, true)
    assert.equal(esito.quante, 1)
    assert.deepEqual(esito.falliti, [])
    assert.equal(esito.parziali.length, 1)
    assert.equal(esito.parziali[0].indice, 0)
    assert.match(esito.parziali[0].errore, /sbagliato@esempio\.it/)
    // Chi segna gli inviati uno per volta lo segna: è partito.
    assert.deepEqual(chiamate, [[0, true]])
    // E nessun RSET: il messaggio è chiuso, non c'è una busta a metà.
    assert.ok(!filo.comandi.includes('RSET'))
  })

  it('nessun destinatario accettato resta un fallimento', async () => {
    const filo = filoFinto(['a@esempio.it', 'b@esempio.it'])
    const chiamate = []
    const esito = await giroSulFilo(
      filo,
      [messaggio('a@esempio.it', 'b@esempio.it')],
      'docente@scuola.it',
      (indice, ok) => chiamate.push([indice, ok]),
    )
    assert.equal(esito.ok, false)
    assert.equal(esito.quante, 0)
    assert.equal(esito.falliti.length, 1)
    assert.deepEqual(esito.parziali, [])
    assert.deepEqual(chiamate, [[0, false]])
    assert.ok(filo.comandi.includes('RSET'))
  })

  it('un giro misto: i pieni, i parziali e i falliti restano tre cose', async () => {
    const filo = filoFinto(['x@esempio.it', 'y@esempio.it'])
    const esito = await giroSulFilo(
      filo,
      [
        messaggio('uno@esempio.it'),
        messaggio('due@esempio.it', 'x@esempio.it'),
        messaggio('y@esempio.it'),
      ],
      'docente@scuola.it',
    )
    assert.equal(esito.quante, 2)
    assert.deepEqual(esito.parziali.map((p) => p.indice), [1])
    assert.deepEqual(esito.falliti.map((f) => f.indice), [2])
  })
})
