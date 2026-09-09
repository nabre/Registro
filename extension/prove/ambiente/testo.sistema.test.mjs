// La dimensione del testo che il sistema chiede.
//
// Windows ha due cursori, e fanno cose diverse: «Scala» ingrandisce tutto — e
// se ne occupa Chromium da sé — mentre «Dimensione testo» ingrandisce solo il
// testo, e quella nessuno la guarda se non la si va a leggere. Il registro la
// legge dal registro di sistema e la consegna a Chromium come
// `defaultFontSize`; da lì in poi è `--corpo`, che è in `rem`, a farla arrivare
// a ogni misura del foglio di stile.
//
// Quel che si prova qui è il primo anello — leggere e tradurre in pixel — e
// soprattutto che *non ci si rompa*: la chiave non c'è quasi mai, perché
// esiste solo se qualcuno ha mosso il cursore, e un'applicazione che all'avvio
// cade su una chiave assente non parte per nessuno.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-testo-'))

const { dimensioneTesto, preferenzeComuni } = await import('../../dist-prove/ambiente.mjs')

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
    // 16 al 100%, 48 al 300%: fuori da qui c'è un valore letto male, non una
    // preferenza di qualcuno.
    assert.ok(misura >= 16 && misura <= 48, `${misura} è fuori scala`)
  })

  it('non chiede niente al sistema più di una volta', () => {
    assert.equal(dimensioneTesto(), dimensioneTesto())
  })

  it('le finestre la ricevono tutte dallo stesso posto', () => {
    // Il punto della prova non è il valore: è che esista un posto solo da cui
    // le tre finestre lo prendono. Una che se lo scrivesse per conto suo
    // avrebbe il testo di un'altra misura, e sarebbe quella del dialogo — cioè
    // quella che si apre sopra le altre.
    assert.deepEqual(preferenzeComuni(), { defaultFontSize: dimensioneTesto() })
  })
})
