// La dimensione del testo che il sistema chiede. Windows ha «Scala» (la segue
// Chromium) e «Dimensione testo», che il registro legge dal registro di
// sistema e consegna a Chromium come `defaultFontSize`; poi `--corpo`, in
// `rem`, la porta a ogni misura. Si prova la lettura in pixel e che una chiave
// assente (il caso più comune) non rompa l'avvio.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-testo-'))

const { dimensioneTesto, preferenzeComuni } = await import('../../dist-tests/environment.mjs')

/** Il fattore che il sistema dichiara adesso, letto per conto nostro. */
function fattoreDichiarato () {
  if (process.platform !== 'win32') return 100
  try {
    const uscita = execFileSync(
      'reg',
      ['query', ['HKCU', 'Software', 'Microsoft', 'Accessibility'].join('\\'), '/v', 'TextScaleFactor'],
      { encoding: 'utf8', windowsHide: true, timeout: 2000 },
    )
    const trovato = /TextScaleFactor\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(uscita)
    return trovato ? Number.parseInt(trovato[1], 16) : 100
  } catch {
    return 100
  }
}

describe('la dimensione del testo segue il sistema', () => {
  it('è la base per il fattore che il sistema dichiara', () => {
    const atteso = Math.round((16 * fattoreDichiarato()) / 100)

    assert.equal(dimensioneTesto(), atteso)
  })

  it('è un numero sensato comunque sia messo il sistema', () => {
    const misura = dimensioneTesto()

    assert.ok(Number.isInteger(misura), `${misura} non è un intero`)
    // 16 al 100%, 48 al 300%: fuori c'è un valore letto male.
    assert.ok(misura >= 16 && misura <= 48, `${misura} è fuori scala`)
  })

  it('non chiede niente al sistema più di una volta', () => {
    assert.equal(dimensioneTesto(), dimensioneTesto())
  })

  it('le finestre la ricevono tutte dallo stesso posto', () => {
    // Un posto solo da cui le tre finestre prendono la misura.
    assert.deepEqual(preferenzeComuni(), { defaultFontSize: dimensioneTesto() })
  })
})
