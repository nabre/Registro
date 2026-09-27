// La posta di Exchange Online (`core/dati/exchange.ts`) senza server. Il tetto
// è una trentina di messaggi al minuto per casella: sopra i venticinque scatta
// la pausa, e un 421 dice di riprovare fra un minuto. Il giro vero vuole SMTP
// con STARTTLS e un gettone Microsoft.

// Un messaggio partito verso qualcuno non è fallito: con un destinatario
// rifiutato su `RCPT TO` e `DATA` accettato (250) è partito verso l'altro, e
// non si rimanda. Qui il giro gira su un filo finto che risponde come SMTP.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { giroSulFilo, pausaFraMessaggi, rimedio } = await importaSorgente('core/dati/exchange.ts')

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

describe('il colloquio SMTP completo con Exchange', () => {
  it('provaExchange esegue il saluto, STARTTLS, autenticazione XOAUTH2 e QUIT', async () => {
    const dialogoSmtp = []

    const FINTO_NET = `
      import { EventEmitter } from 'node:events'
      export function connect () {
        const socket = new EventEmitter()
        socket.setTimeout = () => socket
        socket.destroy = () => { socket.emit('close') }
        socket.write = (chunk) => {
          globalThis.__smtpScrivi(chunk.toString('utf8'), socket, false)
        }
        socket.on('newListener', (evento) => {
          if (evento === 'data') {
            queueMicrotask(() => globalThis.__smtpBenvenuto(socket))
          }
        })
        queueMicrotask(() => {
          socket.emit('connect')
        })
        return socket
      }
    `

    const FINTO_TLS = `
      import { EventEmitter } from 'node:events'
      export function connect () {
        const tlsSocket = new EventEmitter()
        tlsSocket.setTimeout = () => tlsSocket
        tlsSocket.destroy = () => { tlsSocket.emit('close') }
        tlsSocket.write = (chunk) => {
          globalThis.__smtpScrivi(chunk.toString('utf8'), tlsSocket, true)
        }
        queueMicrotask(() => tlsSocket.emit('secureConnect'))
        return tlsSocket
      }
    `

    globalThis.__smtpBenvenuto = (socket) => {
      dialogoSmtp.push('S: 220 smtp.office365.com ready')
      socket.emit('data', Buffer.from('220 smtp.office365.com ready\r\n'))
    }

    globalThis.__smtpScrivi = (testo, socket, cifrato) => {
      dialogoSmtp.push(`C(${cifrato ? 'TLS' : 'TCP'}): ${testo.trim()}`)
      if (testo.startsWith('EHLO') && !cifrato) {
        socket.emit('data', Buffer.from('250-smtp.office365.com Hello\r\n250-STARTTLS\r\n250 OK\r\n'))
      } else if (testo.startsWith('STARTTLS')) {
        socket.emit('data', Buffer.from('220 2.0.0 SMTP server ready\r\n'))
      } else if (testo.startsWith('EHLO') && cifrato) {
        socket.emit('data', Buffer.from('250-smtp.office365.com Hello\r\n250-AUTH LOGIN XOAUTH2\r\n250 OK\r\n'))
      } else if (testo.startsWith('AUTH XOAUTH2')) {
        socket.emit('data', Buffer.from('235 2.7.0 Authentication successful\r\n'))
      } else if (testo.startsWith('QUIT')) {
        socket.emit('data', Buffer.from('221 2.0.0 Service closing\r\n'))
      }
    }

    const { provaExchange } = await importaSorgente('core/dati/exchange.ts', {
      finti: {
        'node:net': FINTO_NET,
        'node:tls': FINTO_TLS,
        './mailbox.js': `
          export function casella () {
            return { accesso: 'docente@scuola.ch', mittente: 'docente@scuola.ch' }
          }
          export function contoScritto () { return true }
        `,
        './oauth.js': `
          export async function gettoneDaSpedire () { return 'GETTONE_PROVA_123' }
          export function oauthNoto () { return true }
        `,
      },
    })

    const esito = await provaExchange()
    assert.equal(esito.ok, true)
    assert.equal(esito.dove, 'smtp.office365.com')
    assert.ok(dialogoSmtp.some((r) => r.includes('STARTTLS')))
    assert.ok(dialogoSmtp.some((r) => r.includes('AUTH XOAUTH2')))
    assert.ok(dialogoSmtp.some((r) => r.includes('QUIT')))
  })

  it('spedisciConExchange consegna un messaggio sul canale cifrato con MAIL FROM, RCPT TO e DATA', async () => {
    const dialogoSmtp = []

    const FINTO_NET = `
      import { EventEmitter } from 'node:events'
      export function connect () {
        const socket = new EventEmitter()
        socket.setTimeout = () => socket
        socket.destroy = () => { socket.emit('close') }
        socket.write = (chunk) => {
          globalThis.__smtpScriviSpedisci(chunk.toString('utf8'), socket, false)
        }
        socket.on('newListener', (evento) => {
          if (evento === 'data') {
            queueMicrotask(() => globalThis.__smtpBenvenutoSpedisci(socket))
          }
        })
        queueMicrotask(() => {
          socket.emit('connect')
        })
        return socket
      }
    `

    globalThis.__smtpBenvenutoSpedisci = (socket) => {
      dialogoSmtp.push('S: 220 smtp.office365.com ready')
      socket.emit('data', Buffer.from('220 smtp.office365.com ready\r\n'))
    }

    const FINTO_TLS = `
      import { EventEmitter } from 'node:events'
      export function connect () {
        const tlsSocket = new EventEmitter()
        tlsSocket.setTimeout = () => tlsSocket
        tlsSocket.destroy = () => { tlsSocket.emit('close') }
        tlsSocket.write = (chunk) => {
          globalThis.__smtpScriviSpedisci(chunk.toString('utf8'), tlsSocket, true)
        }
        queueMicrotask(() => tlsSocket.emit('secureConnect'))
        return tlsSocket
      }
    `

    globalThis.__smtpScriviSpedisci = (testo, socket, cifrato) => {
      dialogoSmtp.push(`C(${cifrato ? 'TLS' : 'TCP'}): ${testo.trim()}`)
      if (testo.startsWith('EHLO') && !cifrato) {
        socket.emit('data', Buffer.from('250-smtp.office365.com Hello\r\n250-STARTTLS\r\n250 OK\r\n'))
      } else if (testo.startsWith('STARTTLS')) {
        socket.emit('data', Buffer.from('220 2.0.0 SMTP server ready\r\n'))
      } else if (testo.startsWith('EHLO') && cifrato) {
        socket.emit('data', Buffer.from('250-smtp.office365.com Hello\r\n250-AUTH XOAUTH2\r\n250 OK\r\n'))
      } else if (testo.startsWith('AUTH XOAUTH2')) {
        socket.emit('data', Buffer.from('235 2.7.0 Authentication successful\r\n'))
      } else if (testo.startsWith('MAIL FROM:')) {
        socket.emit('data', Buffer.from('250 2.1.0 Sender OK\r\n'))
      } else if (testo.startsWith('RCPT TO:')) {
        socket.emit('data', Buffer.from('250 2.1.5 Recipient OK\r\n'))
      } else if (testo.startsWith('DATA')) {
        socket.emit('data', Buffer.from('354 Send data\r\n'))
      } else if (testo.endsWith('\r\n.\r\n') || testo === '.\r\n' || testo.endsWith('\n.\n')) {
        socket.emit('data', Buffer.from('250 2.6.0 Queued mail\r\n'))
      } else if (testo.startsWith('RSET')) {
        socket.emit('data', Buffer.from('250 2.0.0 Reset state\r\n'))
      } else if (testo.startsWith('QUIT')) {
        socket.emit('data', Buffer.from('221 2.0.0 Bye\r\n'))
      }
    }

    const { spedisciConExchange } = await importaSorgente('core/dati/exchange.ts', {
      finti: {
        'node:net': FINTO_NET,
        'node:tls': FINTO_TLS,
        './mailbox.js': `
          export function casella () {
            return { accesso: 'docente@scuola.ch', mittente: 'docente@scuola.ch' }
          }
          export function contoScritto () { return true }
        `,
        './oauth.js': `
          export async function gettoneDaSpedire () { return 'GETTONE_PROVA_123' }
          export function oauthNoto () { return true }
        `,
      },
    })

    const esito = await spedisciConExchange([
      {
        a: ['studente@scuola.ch'],
        ccn: [],
        oggetto: 'Compiti',
        corpo: 'Esercizio 4',
      },
    ])

    assert.equal(esito.ok, true)
    assert.equal(esito.quante, 1)
    assert.ok(dialogoSmtp.some((r) => r.includes('RCPT TO:<studente@scuola.ch>')))
    assert.ok(dialogoSmtp.some((r) => r.includes('DATA')))
  })
})

