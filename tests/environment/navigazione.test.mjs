// Una finestra del registro mostra solo la sua pagina: un PDF trascinato o un
// collegamento non devono portarla altrove (il preload e i permessi restano
// quelli della pagina), e `window.open` non deve far nascere finestre figlie.
// I collegamenti vanno al browser, ma solo con gli schemi che non eseguono
// niente: gli indirizzi arrivano anche da piani lezione altrui, e su Windows
// `ms-msdt:` o `search-ms:` lanciano programmi.

import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { BrowserWindow, bancoElectron } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { chiudiLeVieDiFuga, openExternal, Uri } = await importaSorgente(`export { chiudiLeVieDiFuga } from './desktop/apparato/navigation.ts'
export { openExternal } from './desktop/apparato/commands.ts'
export { Uri } from './core/apparato/uri.ts'
`)

const PAGINA = 'registro://app/dist/welcome.html'

beforeEach(() => {
  bancoElectron.fuori.length = 0
})

/** Una finestra con la guardia, già sulla sua pagina. */
function finestraChiusa () {
  const finestra = new BrowserWindow()
  finestra.webContents.indirizzo = PAGINA
  chiudiLeVieDiFuga(finestra)
  return finestra
}

/** Emette `will-navigate` e dice se la navigazione è stata impedita. */
function navigaVerso (finestra, indirizzo) {
  let impedita = false
  finestra.webContents.emetti('will-navigate', { preventDefault: () => { impedita = true } }, indirizzo)
  return impedita
}

/** Gli indirizzi consegnati al sistema. */
function esterni () {
  return bancoElectron.fuori.filter((voce) => voce.cosa === 'esterno').map((voce) => voce.dove)
}

describe('la navigazione della finestra', () => {
  it('verso un altro indirizzo è impedita, qualunque sia lo schema', () => {
    const finestra = finestraChiusa()
    for (const indirizzo of [
      'https://esempio.org',
      'file:///C:/Users/docente/verifica.pdf',
      'registro://app/dist/pannello.html',
      'registro://dati/C:/segreto.txt',
      'javascript:alert(1)',
    ]) {
      assert.equal(navigaVerso(finestra, indirizzo), true, indirizzo)
    }
  })

  it('la stessa pagina (un ricaricamento) passa', () => {
    assert.equal(navigaVerso(finestraChiusa(), PAGINA), false)
  })

  it('una navigazione impedita non apre niente fuori', () => {
    navigaVerso(finestraChiusa(), 'https://esempio.org')
    assert.deepEqual(esterni(), [])
  })
})

describe('le finestre figlie', () => {
  it('sono sempre negate, e un indirizzo web va al browser', () => {
    const finestra = finestraChiusa()
    const esito = finestra.webContents.gestoreApertura({ url: 'https://esempio.org/piano' })
    assert.deepEqual(esito, { action: 'deny' })
    assert.deepEqual(esterni(), ['https://esempio.org/piano'])
  })

  it('negate anche quando lo schema non si apre: file:, javascript:, ms-msdt:', () => {
    const finestra = finestraChiusa()
    for (const indirizzo of ['file:///C:/Windows/System32/calc.exe', 'javascript:alert(1)', 'ms-msdt:/id PCWDiagnostic']) {
      assert.deepEqual(finestra.webContents.gestoreApertura({ url: indirizzo }), { action: 'deny' }, indirizzo)
    }
    assert.deepEqual(esterni(), [])
  })
})

describe('openExternal e gli schemi ammessi', () => {
  it('apre http, https, posta, telefono e i programmi di chiamata', async () => {
    for (const indirizzo of [
      'http://esempio.org',
      'https://esempio.org/a?b=c',
      'mailto:docente@scuola.ch',
      'tel:+41911234567',
      'callto:+41911234567',
      'skype:docente?call',
      'msteams:/l/chat/0/0?users=docente@scuola.ch',
    ]) {
      assert.equal(await openExternal(Uri.parse(indirizzo)), true, indirizzo)
    }
    assert.equal(esterni().length, 7)
  })

  it('rifiuta gli schemi che aprono file o eseguono comandi', async () => {
    for (const indirizzo of [
      'file:///C:/Windows/System32/calc.exe',
      'javascript:alert(1)',
      'ms-msdt:/id PCWDiagnostic /skip force',
      'search-ms:query=verifica&crumb=location:\\\\server\\quota',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'ms-officecmd:{}',
      'registro://dati/C:/segreto.txt',
    ]) {
      assert.equal(await openExternal(Uri.parse(indirizzo)), false, indirizzo)
    }
    assert.deepEqual(esterni(), [])
  })

  it('le maiuscole e gli spazi davanti non travestono uno schema', async () => {
    for (const indirizzo of ['JAVASCRIPT:alert(1)', ' javascript:alert(1)', 'File:///C:/x.exe', 'MS-MSDT:/id x']) {
      assert.equal(await openExternal(Uri.parse(indirizzo)), false, JSON.stringify(indirizzo))
    }
    assert.deepEqual(esterni(), [])
  })

  it('un indirizzo che non si legge non va da nessuna parte', async () => {
    for (const indirizzo of ['http://[::1', 'https://', 'senza-schema']) {
      assert.equal(await openExternal(Uri.parse(indirizzo)), false, indirizzo)
    }
    assert.deepEqual(esterni(), [])
  })

  it('HTTPS in maiuscolo resta un indirizzo web', async () => {
    assert.equal(await openExternal(Uri.parse('HTTPS://esempio.org')), true)
  })
})
