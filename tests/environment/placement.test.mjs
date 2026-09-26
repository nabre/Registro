import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

const cartella = mkdtempSync(join(tmpdir(), 'registro-posti-'))
process.env.REGISTRO_USERDATA = cartella
const { postoDi, ricaricaPosti, ricordaPosto } = await import('../../dist-tests/placement.mjs')
const { BrowserWindow, bancoElectron } = await import('../helpers/fake-electron.mjs')

const DUE_SCHERMI = [
  { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { id: 2, workArea: { x: 1920, y: 0, width: 1280, height: 720 } },
]

const MISURE = { width: 1280, height: 860, minWidth: 720 }

function scriviPosti (posti) {
  writeFileSync(join(cartella, 'finestre.json'), JSON.stringify(posti))
  ricaricaPosti()
}

beforeEach(() => {
  bancoElectron.schermi = DUE_SCHERMI.map((s) => ({ ...s, workArea: { ...s.workArea } }))
  scriviPosti({})
})

after(() => rmSync(cartella, { recursive: true, force: true }))

describe('il posto delle finestre', () => {
  it('una finestra mai vista nasce con le misure di sempre, senza coordinate', () => {
    const posto = postoDi('registroDocenti.pannello', MISURE)
    assert.deepEqual(posto, MISURE)
  })

  it('riapre dov’era, anche sul secondo schermo', () => {
    scriviPosti({
      'registroDocenti.pannello': { x: 2100, y: 60, larghezza: 1100, altezza: 700 },
    })
    const posto = postoDi('registroDocenti.pannello', MISURE)
    assert.equal(posto.x, 2100)
    assert.equal(posto.y, 60)
    assert.equal(posto.width, 1100)
    assert.equal(posto.height, 700)
  })

  it('non riapre su uno schermo che non c’è più', () => {
    scriviPosti({
      'registroDocenti.pannello': { x: 2100, y: 60, larghezza: 1100, altezza: 700 },
    })
    // Il portatile staccato dalla scrivania: resta solo lo schermo principale.
    bancoElectron.schermi = [DUE_SCHERMI[0]]
    ricaricaPosti()
    assert.deepEqual(postoDi('registroDocenti.pannello', MISURE), MISURE)
  })

  it('una misura più stretta del minimo non passa', () => {
    scriviPosti({
      'registroDocenti.pannello': { x: 10, y: 10, larghezza: 300, altezza: 200 },
    })
    const posto = postoDi('registroDocenti.pannello', MISURE)
    assert.equal(posto.width, 720)
  })

  it('ricorda il posto alla chiusura, e lo ridà alla finestra dopo', () => {
    const finestra = new BrowserWindow({ ...postoDi('lettore', MISURE) })
    ricordaPosto('lettore', finestra)
    finestra.spostaDaFuori({ x: 300, y: 120, width: 980, height: 720 })
    finestra.close()

    ricaricaPosti()
    const posto = postoDi('lettore', MISURE)
    assert.deepEqual(
      { x: posto.x, y: posto.y, width: posto.width, height: posto.height },
      { x: 300, y: 120, width: 980, height: 720 },
    )
  })

  it('ingrandita si riapre ingrandita, con le misure normali sotto', () => {
    const prima = new BrowserWindow({ ...postoDi('impostazioni', MISURE) })
    ricordaPosto('impostazioni', prima)
    prima.spostaDaFuori({ x: 40, y: 40, width: 900, height: 600 })
    prima.maximize()
    prima.close()

    ricaricaPosti()
    const dopo = new BrowserWindow({ ...postoDi('impostazioni', MISURE) })
    ricordaPosto('impostazioni', dopo)
    assert.equal(dopo.isMaximized(), true)
    // Le misure a cui torna ripristinandola sono quelle di prima di ingrandirla.
    assert.deepEqual(dopo.getNormalBounds(), { x: 40, y: 40, width: 900, height: 600 })
  })

  it('la proiezione non si riapre a schermo intero: là ce la manda il comando', () => {
    const prima = new BrowserWindow({ ...postoDi('registroDocenti.proiezione', MISURE) })
    ricordaPosto('registroDocenti.proiezione', prima, { schermoIntero: false })
    prima.setFullScreen(true)
    prima.close()

    ricaricaPosti()
    const dopo = new BrowserWindow({ ...postoDi('registroDocenti.proiezione', MISURE) })
    ricordaPosto('registroDocenti.proiezione', dopo, { schermoIntero: false })
    assert.equal(dopo.isFullScreen(), false)

    // La stessa memoria, per una finestra che invece lo schermo intero lo
    // riprende: è la finestra a decidere, non quel che c'è scritto nel file.
    const altra = new BrowserWindow({ ...postoDi('registroDocenti.proiezione', MISURE) })
    ricordaPosto('registroDocenti.proiezione', altra)
    assert.equal(altra.isFullScreen(), true)
  })
})
