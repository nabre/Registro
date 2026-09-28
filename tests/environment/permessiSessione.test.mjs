// Electron concede ogni permesso a qualunque pagina se nessuno lo regola. Le
// pagine del registro mostrano dati di allievi e ne servono due: il microfono
// (solo audio) per la dettatura e la scrittura negli appunti. Tutto il resto, e
// qualunque richiesta che non venga da `registro://`, dev'essere un no.

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { bancoElectron } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { regolaPermessi } = await importaSorgente('desktop/shell/protocol/permissions.ts')

before(() => regolaPermessi())

const NOSTRA = 'registro://pagina/1'

/** La risposta del gestore delle richieste, che Electron dà con una callback. */
function richiedi (permesso, dettagli, contenuti = null) {
  let risposta
  bancoElectron.permessi.richiesta(contenuti, permesso, (esito) => { risposta = esito }, dettagli)
  return risposta
}

/** Il controllo sincrono, che Chromium fa prima di chiedere. */
function controlla (permesso, origine, dettagli = {}) {
  return bancoElectron.permessi.controllo(null, permesso, origine, dettagli)
}

describe('i permessi concessi alle nostre pagine', () => {
  it('il microfono, se chiede soltanto l’audio', () => {
    assert.equal(richiedi('media', { requestingUrl: NOSTRA, mediaTypes: ['audio'] }), true)
    assert.equal(controlla('media', NOSTRA, { mediaType: 'audio' }), true)
  })

  it('la scrittura negli appunti', () => {
    assert.equal(richiedi('clipboard-sanitized-write', { requestingUrl: NOSTRA }), true)
    assert.equal(controlla('clipboard-sanitized-write', NOSTRA), true)
  })

  it('senza `requestingUrl` vale l’indirizzo dei webContents', () => {
    const contenuti = { getURL: () => NOSTRA }
    assert.equal(richiedi('clipboard-sanitized-write', {}, contenuti), true)
  })
})

describe('i permessi rifiutati', () => {
  it('audio e video insieme si rifiutano interi: niente videocamera', () => {
    assert.equal(richiedi('media', { requestingUrl: NOSTRA, mediaTypes: ['audio', 'video'] }), false)
    assert.equal(richiedi('media', { requestingUrl: NOSTRA, mediaTypes: ['video'] }), false)
    assert.equal(controlla('media', NOSTRA, { mediaType: 'video' }), false)
  })

  it('notifiche, posizione, lettura degli appunti e il resto: no anche da registro://', () => {
    for (const permesso of [
      'notifications', 'geolocation', 'clipboard-read', 'midi', 'pointerLock',
      'openExternal', 'fullscreen', 'display-capture', 'hid', 'serial', 'usb',
    ]) {
      assert.equal(richiedi(permesso, { requestingUrl: NOSTRA }), false, permesso)
      assert.equal(controlla(permesso, NOSTRA), false, permesso)
    }
  })

  it('un’origine che non è registro:// non ha nemmeno il microfono', () => {
    for (const origine of ['https://esempio.org', 'file:///C:/x.html', 'http://localhost', '', 'registro:x']) {
      assert.equal(richiedi('media', { requestingUrl: origine, mediaTypes: ['audio'] }), false, origine)
      assert.equal(richiedi('clipboard-sanitized-write', { requestingUrl: origine }), false, origine)
      assert.equal(controlla('media', origine, { mediaType: 'audio' }), false, origine)
    }
  })

  it('senza origine né webContents si rifiuta', () => {
    assert.equal(richiedi('clipboard-sanitized-write', {}), false)
    assert.equal(controlla('clipboard-sanitized-write', undefined), false)
  })
})
