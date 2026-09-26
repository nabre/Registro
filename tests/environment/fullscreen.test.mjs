// Lo schermo intero della proiezione quando il fuoco non ha ancora cambiato
// finestra: `panels/projection.ts` la rivela e subito chiede lo schermo intero.
// Il comando va sulla finestra nominata dall'id dei `webContents`, non su
// quella col fuoco (il registro, con voti e note).

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import { bancoElectron, finestreCostruite } from '../helpers/fake-electron.mjs'

const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

// Una `userData` tutta di questa prova: le finestre ci scrivono dove stavano.
const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-schermo-intero-'))
process.env.REGISTRO_USERDATA = DATI
after(() => rmSync(DATI, { recursive: true, force: true }))

const { comandi, finestre, ViewColumn } = await import('../../dist-tests/environment.mjs')

/** Un pannello e la sua finestra finta, insieme. */
function apriPannello (tipo, titolo) {
  const primo = finestreCostruite.length
  const pannello = finestre.crea(tipo, titolo, ViewColumn.One, {})
  return { pannello, finestra: finestreCostruite[primo] }
}

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

describe('apparato.schermoIntero con la finestra nominata', () => {
  it('ogni pannello dice l’id dei propri webContents', () => {
    const { pannello, finestra } = apriPannello('registroDocenti.proiezione', 'Proiezione')
    assert.equal(pannello.idContenuti, finestra.webContents.id)
  })

  it('va sulla proiezione anche se il fuoco è ancora sul registro', async () => {
    const registro = apriPannello('registroDocenti.pannello', 'Registro')
    const proiezione = apriPannello('registroDocenti.proiezione', 'Registro · proiezione')
    // Il fuoco è ancora sul registro.
    registro.finestra.focus()

    await comandi.esegui('apparato.schermoIntero', proiezione.pannello.idContenuti)

    assert.equal(proiezione.finestra.schermoIntero, true)
    assert.deepEqual(proiezione.finestra.riquadro, bancoElectron.schermi[1].workArea)
    assert.equal(registro.finestra.schermoIntero, false)
  })

  it('una finestra nominata e già chiusa non si sostituisce con quella che ha il fuoco', async () => {
    const registro = apriPannello('registroDocenti.pannello', 'Registro')
    const proiezione = apriPannello('registroDocenti.proiezione', 'Registro · proiezione')
    const id = proiezione.pannello.idContenuti
    proiezione.finestra.close()
    registro.finestra.focus()

    await comandi.esegui('apparato.schermoIntero', id)

    assert.equal(registro.finestra.schermoIntero, false)
  })
})
