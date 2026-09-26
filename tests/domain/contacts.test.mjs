// Con che cosa si apre un recapito premuto nell'anagrafica: la stringa che
// l'host consegna al sistema, nelle forme documentate dai programmi (Skype
// `?call`, Teams il numero, Outlook i suoi interruttori).

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
    // `4:` dice a Teams che è un numero di telefono, non un collega da cercare.
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
    // Argomenti separati: una virgoletta nell'indirizzo non diventa un'altra
    // istruzione.
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
    // Un valore non riconosciuto nel JSON delle impostazioni torna al
    // comportamento di serie.
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
    // Una virgola in un «mailto:» aprirebbe una mail a due persone.
    assert.equal(indirizzoScrivibile('uno@ti.ch, due@ti.ch'), null)
    assert.equal(indirizzoScrivibile('Mario Rossi <mario@ti.ch>'), null)
    assert.equal(indirizzoScrivibile('mario.rossi'), null)
    assert.equal(indirizzoScrivibile('mario@edu'), null)
  })
})
