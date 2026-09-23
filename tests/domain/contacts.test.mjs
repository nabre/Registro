// Con che cosa si apre un recapito premuto nell'anagrafica.
//
// Quel che si prova qui è la stringa che l'host consegna al sistema: l'unica
// parte decidibile di un gesto che per il resto o parte o non parte. Sono le
// forme documentate dai programmi — Skype vuole `?call`, Teams vuole sapere
// che il numero è un numero, Outlook vuole i suoi interruttori — e sbagliarne
// una vuol dire un pulsante che apre il programma giusto sulla cosa sbagliata.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  argomentiOutlook,
  composizioneOutlookWeb,
  indirizzoChiamata,
  indirizzoMailto,
  indirizzoScrivibile,
  modoChiamata,
  modoPosta,
} from '../../dist-tests/domain.mjs'

describe('con che cosa si chiama', () => {
  it('tel e callto lasciano scegliere al sistema', () => {
    assert.equal(indirizzoChiamata('tel', '+41910000000'), 'tel:+41910000000')
    assert.equal(indirizzoChiamata('callto', '+41910000000'), 'callto:+41910000000')
  })

  it('Skype e Teams vogliono sapere che è una chiamata', () => {
    assert.equal(indirizzoChiamata('skype', '+41910000000'), 'skype:+41910000000?call')
    // `4:` è quel che dice a Teams che quello è un numero di telefono e non un
    // collega: senza, cerca una persona con quel nome e non trova nessuno.
    assert.equal(
      indirizzoChiamata('msteams', '+41910000000'),
      'msteams:/l/call/0/0?users=4:+41910000000',
    )
  })

  it('spente, non c’è niente da aprire', () => {
    assert.equal(indirizzoChiamata('nessuno', '+41910000000'), null)
  })
})

describe('con che cosa si scrive', () => {
  it('il programma del sistema è un mailto senza altro dentro', () => {
    assert.equal(indirizzoMailto('mario.rossi@edu.ti.ch'), 'mailto:mario.rossi@edu.ti.ch')
  })

  it('Outlook sul web porta l’indirizzo nel campo «A»', () => {
    assert.equal(
      composizioneOutlookWeb('mario.rossi@edu.ti.ch'),
      'https://outlook.office.com/mail/deeplink/compose?to=mario.rossi%40edu.ti.ch',
    )
  })

  it('Outlook installato si apre con i suoi interruttori, e l’indirizzo è un argomento a sé', () => {
    // Argomenti separati e non una riga di comando: un indirizzo con dentro
    // una virgoletta non può diventare un'altra istruzione.
    assert.deepEqual(argomentiOutlook('mario.rossi@edu.ti.ch'), [
      '/c',
      'ipm.note',
      '/m',
      'mario.rossi@edu.ti.ch',
    ])
  })
})

describe('quel che arriva dalle impostazioni', () => {
  it('un modo riconosciuto vale quel che dice', () => {
    assert.equal(modoChiamata('msteams'), 'msteams')
    assert.equal(modoPosta('outlook'), 'outlook')
  })

  it('un file scritto a mano male non spegne la funzione', () => {
    // Le impostazioni sono un JSON che si può aprire con un editore: quel che
    // non si riconosce torna al comportamento di sempre invece di far finta
    // che il pulsante non ci sia.
    assert.equal(modoChiamata('pizza'), 'tel')
    assert.equal(modoChiamata(undefined), 'tel')
    assert.equal(modoPosta('pizza'), 'sistema')
    assert.equal(modoPosta(undefined), 'sistema')
  })
})

describe('l’indirizzo a cui si scrive', () => {
  it('un indirizzo normale passa, con gli spazi attorno tolti', () => {
    assert.equal(indirizzoScrivibile(' mario.rossi@edu.ti.ch '), 'mario.rossi@edu.ti.ch')
  })

  it('quel che porterebbe un secondo destinatario non passa', () => {
    // Una virgola dentro un «mailto:» apre una mail a due persone, e la
    // seconda non l'ha scelta nessuno.
    assert.equal(indirizzoScrivibile('uno@ti.ch, due@ti.ch'), null)
    assert.equal(indirizzoScrivibile('Mario Rossi <mario@ti.ch>'), null)
    assert.equal(indirizzoScrivibile('mario.rossi'), null)
    assert.equal(indirizzoScrivibile('mario@edu'), null)
  })
})
