// «Crea un nuovo anno…» dal benvenuto o dal vassoio: il benvenuto si chiude e
// subito dopo si apre l'elenco degli anni. In Electron `close()` non distrugge
// subito la finestra, che resta ancora un po' con il fuoco: un dialogo modale
// appoggiato su di lei moriva con lei, l'elenco si annullava da solo e tornava
// il benvenuto.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import { BrowserWindow, finestreCostruite } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-benvenuto-dialoghi-'))
process.env.REGISTRO_USERDATA = DATI
process.env.REGISTRO_APPPATH = percorso.join(DATI, 'app', 'dist')
after(() => rmSync(DATI, { recursive: true, force: true }))

// Un bundle solo: benvenuto e dialoghi condividono lo stato, come nel main process.
const { mostraBenvenuto, chiudiBenvenuto, dialoghi } =
  await importaSorgente(`export { mostraBenvenuto, chiudiBenvenuto } from './desktop/shell/windows/welcome.ts'
export { dialoghi } from 'apparato'
`)

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

/** Il benvenuto aperto, col fuoco, che si chiude come in Electron: un giro dopo. */
function benvenutoCheSiChiudeTardi () {
  const primo = finestreCostruite.length
  const attesa = mostraBenvenuto({ scegliDocumento: async () => null })
  const finestra = finestreCostruite[primo]
  finestra.focus()
  finestra.close = () => setImmediate(() => BrowserWindow.prototype.close.call(finestra))
  return { attesa, finestra }
}

describe('il benvenuto che si chiude', () => {
  it('non fa da padre all’elenco che si apre subito dopo', async () => {
    const { attesa, finestra: benvenuto } = benvenutoCheSiChiudeTardi()
    chiudiBenvenuto()
    assert.deepEqual(await attesa, { tipo: 'altrove' })
    assert.equal(benvenuto.isDestroyed(), false, 'la prova vuole il benvenuto ancora vivo')

    const primo = finestreCostruite.length
    const scelta = dialoghi.chiediScelta([{ label: '2026/27', valore: 1 }], { title: 'Nuovo anno' })
    await Promise.resolve()
    const elenco = finestreCostruite[primo]
    assert.ok(elenco, 'l’elenco è nato')
    assert.notEqual(elenco.opzioni.parent, benvenuto, 'appeso al benvenuto, morirebbe con lui')

    elenco.close()
    assert.equal(await scelta, undefined)
  })
})
