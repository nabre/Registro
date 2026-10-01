// Le opzioni di sviluppo esistono solo con `npm run dev` (`REGISTRO_SVILUPPO=1`):
// nel programma installato niente menu «Sviluppo», niente finestra, niente
// ascolto sul canale, niente pagina nei bundle. In sviluppo le scelte vanno in
// `sviluppo.json` e la pagina può chiedere solo le richieste note.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, afterEach, beforeEach, describe, it } from 'node:test'

import { finestreCostruite, ipcMain } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-sviluppo-'))
process.env.REGISTRO_USERDATA = DATI
process.env.REGISTRO_APPPATH = percorso.join(DATI, 'app', 'dist')
const FILE = percorso.join(DATI, 'sviluppo.json')
const PRIMA = process.env.REGISTRO_SVILUPPO
after(() => {
  rmSync(DATI, { recursive: true, force: true })
  if (PRIMA === undefined) delete process.env.REGISTRO_SVILUPPO
  else process.env.REGISTRO_SVILUPPO = PRIMA
})

// Un bundle solo: menu, finestra e scelte condividono lo stato dei moduli.
const sviluppo = await importaSorgente(`export { modelloDelMenu } from './desktop/shell/windows/menu.ts'
export { apriSviluppo, installaSviluppo, richiestaSviluppo, statoSviluppo } from './desktop/shell/windows/devTools.ts'
export {
  cambiaImpostazioniSviluppo,
  chiediRiavvio,
  codiceDUscita,
  impostazioniSviluppo,
} from './desktop/apparato/dev.ts'
`)
const { applicazioneIn } = await import('../../esbuild.mjs')

/** Il menu senza documento aperto. */
const menu = () => sviluppo.modelloDelMenu({ apriDocumento: async () => {} })

/** I nomi delle pagine native di un `applicazioneIn`, dalle entrate HTML. */
function pagineIn (cartella) {
  const html = applicazioneIn(cartella).find((c) => c.loader?.['.html'] === 'copy')
  return Object.keys(html.entryPoints)
}

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

describe('nel programma installato le opzioni di sviluppo non ci sono', () => {
  beforeEach(() => {
    delete process.env.REGISTRO_SVILUPPO
  })

  it('niente menu «Sviluppo»', () => {
    assert.equal(menu().find((voce) => voce.id === 'sviluppo'), undefined)
  })

  it('niente finestra, niente ascolto, niente installazione', () => {
    assert.equal(sviluppo.apriSviluppo(), null)
    assert.equal(finestreCostruite.length, 0)
    // `installaSviluppo` non tocca `app` (il finto non ha `on`: lo farebbe saltare).
    sviluppo.installaSviluppo().dispose()
    // Un messaggio sul canale non trova chi risponda: le scelte non si scrivono.
    ipcMain.simulaDallaPagina(1, { sviluppo: 'ricaricaAutomatica', valore: false })
    assert.equal(sviluppo.cambiaImpostazioniSviluppo((attuali) => ({ ...attuali, posizione: 'bottom' })), false)
    assert.equal(existsSync(FILE), false)
  })

  it('il riavvio non si chiede e si esce con 0', () => {
    sviluppo.chiediRiavvio()
    assert.equal(sviluppo.codiceDUscita(), 0)
  })

  it('la pagina si costruisce solo in dist-dev/', () => {
    assert.ok(!pagineIn('dist').includes('dev'))
    assert.ok(pagineIn('dist-dev').includes('dev'))
  })
})

describe('con npm run dev', () => {
  beforeEach(() => {
    process.env.REGISTRO_SVILUPPO = '1'
  })
  afterEach(() => {
    rmSync(FILE, { force: true })
  })

  // Per primo: il deposito tiene in memoria quel che ha letto la prima volta.
  it('un file guasto vale i predefiniti, campo per campo', () => {
    writeFileSync(FILE, JSON.stringify({ posizione: 'sul soffitto', allAvvio: { lettore: true, pannello: 'sì' } }))
    const lette = sviluppo.impostazioniSviluppo()
    assert.equal(lette.posizione, 'right')
    assert.equal(lette.ricaricaAutomatica, true)
    assert.equal(lette.allAvvio.lettore, true)
    assert.equal(lette.allAvvio.pannello, true)
  })

  it('il menu «Sviluppo» apre la finestra', () => {
    const voce = menu().find((v) => v.id === 'sviluppo')
    assert.ok(voce)
    const opzioni = voce.submenu.find((v) => v.id === 'sviluppo.opzioni')
    assert.equal(opzioni.accelerator, 'CommandOrControl+Shift+F12')
    opzioni.click()
    assert.equal(finestreCostruite.length, 1)
    assert.match(finestreCostruite[0].caricati[0], /^registro:\/\/app\/dist\/dev\.html\?/)
  })

  it('le scelte si leggono senza scrivere e si scrivono in sviluppo.json', () => {
    assert.equal(sviluppo.impostazioniSviluppo().allAvvio.pannello, true)
    assert.equal(sviluppo.impostazioniSviluppo().allAvvio.benvenuto, false)
    assert.equal(existsSync(FILE), false, 'una lettura non crea il file')

    const finestra = sviluppo.apriSviluppo()
    const pagina = finestra.webContents.id
    ipcMain.simulaDallaPagina(pagina, { sviluppo: 'allAvvio', tipo: 'benvenuto', valore: true })
    ipcMain.simulaDallaPagina(pagina, { sviluppo: 'posizione', posizione: 'detach' })
    ipcMain.simulaDallaPagina(pagina, { sviluppo: 'ricaricaAutomatica', valore: false })

    const scritte = JSON.parse(readFileSync(FILE, 'utf8'))
    assert.equal(scritte.allAvvio.benvenuto, true)
    assert.equal(scritte.posizione, 'detach')
    assert.equal(scritte.ricaricaAutomatica, false)
    assert.deepEqual(sviluppo.impostazioniSviluppo(), scritte)
    // Nessuna di queste chiavi è un'impostazione del registro.
    assert.equal(existsSync(percorso.join(DATI, 'impostazioni.json')), false)
  })

  it('la pagina chiede solo le richieste note, e solo la sua', () => {
    for (const ignota of [
      null,
      'riavvia',
      { sviluppo: 'esegui', codice: 'process.exit()' },
      { sviluppo: 'apri', cosa: 'C:\\Windows' },
      { sviluppo: 'console', id: '1', aperta: true, posizione: 'right' },
      { sviluppo: 'console', id: 1, aperta: true, posizione: 'left' },
      { sviluppo: 'allAvvio', tipo: 'tutte', valore: true },
    ]) {
      assert.equal(sviluppo.richiestaSviluppo(ignota), null, JSON.stringify(ignota))
    }
    assert.deepEqual(sviluppo.richiestaSviluppo({ sviluppo: 'apri', cosa: 'giornale', altro: 1 }), {
      sviluppo: 'apri',
      cosa: 'giornale',
    })

    sviluppo.apriSviluppo()
    // Un'altra finestra sullo stesso canale non tocca le scelte.
    ipcMain.simulaDallaPagina(9999, { sviluppo: 'posizione', posizione: 'bottom' })
    assert.equal(existsSync(FILE), false)
  })

  it('la console di una finestra si apre e si chiude dalla pagina', () => {
    const pagina = sviluppo.apriSviluppo().webContents
    ipcMain.simulaDallaPagina(pagina.id, { sviluppo: 'console', id: pagina.id, aperta: true, posizione: 'bottom' })
    assert.deepEqual(pagina.console, { mode: 'bottom' })
    const riga = sviluppo.statoSviluppo().finestre.find((f) => f.id === pagina.id)
    assert.equal(riga.console, true)
    assert.equal(riga.posizione, 'bottom')
    ipcMain.simulaDallaPagina(pagina.id, { sviluppo: 'console', id: pagina.id, aperta: false, posizione: 'bottom' })
    assert.equal(pagina.isDevToolsOpened(), false)
  })
})
