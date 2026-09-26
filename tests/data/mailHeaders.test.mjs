// Un a capo in un oggetto, un indirizzo o un nome di file non diventa
// un'intestazione in più («Ciao\r\nBcc: qualcuno@fuori.ch»). Vale per gli
// allegati (su macOS e Linux un nome di file può contenere un a capo) e per gli
// indirizzi, che finiscono anche in `RCPT TO`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { componiEml, componiPerInvio, destinatariBusta } from '../../dist-tests/domain.mjs'

/** Le righe di intestazione di un messaggio: quelle prima della prima riga vuota. */
function intestazioni (messaggio) {
  return messaggio.split('\r\n\r\n')[0].split('\r\n')
}

const SPIA = 'Bcc: spia@fuori.ch'

describe('intestazioni su una riga sola', () => {
  it('un oggetto con un a capo non aggiunge intestazioni', () => {
    for (const oggetto of [`Assenze\r\n${SPIA}`, `Assenze 1° semestre\n${SPIA}`]) {
      const messaggio = { oggetto, corpo: 'testo', a: ['famiglia@casa.ch'], ccn: [] }
      for (const scritto of [componiPerInvio(messaggio), componiEml(messaggio)]) {
        assert.ok(!intestazioni(scritto).includes(SPIA), oggetto)
        assert.equal(intestazioni(scritto).filter((r) => r.startsWith('Bcc:')).length, 0)
      }
    }
  })

  it('l\'oggetto senza a capo resta com\'era', () => {
    const scritto = componiPerInvio({ oggetto: 'Uscita', corpo: 'x', ccn: [] })
    assert.ok(intestazioni(scritto).includes('Subject: Uscita'))
  })

  it('il nome di un allegato con un a capo non esce dal suo parametro', () => {
    // Senza punti dopo l'a capo: tutto finisce nell'estensione, la coda dopo
    // l'ultimo punto, anche lei ripulita.
    const intrusa = 'X-Intrusa: si'
    const messaggio = {
      oggetto: 'Documento',
      corpo: 'testo',
      ccn: [],
      a: ['famiglia@casa.ch'],
      allegati: [{ nome: `pagella.pdf\r\n${intrusa}`, tipo: 'application/pdf', contenuto: 'AAAA' }],
    }
    const righe = componiPerInvio(messaggio).split('\r\n')
    assert.ok(!righe.includes(intrusa))
    assert.ok(!righe.some((riga) => riga.startsWith('X-Intrusa')))
  })

  it('mittente e destinatari con un a capo restano su una riga', () => {
    const messaggio = {
      oggetto: 'X',
      corpo: 'x',
      da: `docente@scuola.ch\r\n${SPIA}`,
      a: [`famiglia@casa.ch\r\n${SPIA}`],
      ccn: [`altra@casa.ch\n${SPIA}`],
    }
    for (const scritto of [componiPerInvio(messaggio), componiEml(messaggio)]) {
      assert.ok(!intestazioni(scritto).includes(SPIA))
    }
    for (const indirizzo of destinatariBusta(messaggio)) {
      assert.doesNotMatch(indirizzo, /[\r\n]/)
    }
  })
})
