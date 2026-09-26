// L'icona accanto all'orologio, dal lato di Electron: la traduzione del menu
// (il contenuto è in `tests/domain/tray.test.mjs`). Una voce spenta arriva
// spenta, un sottomenu resta un sottomenu, i separatori inutili spariscono.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

// La radice dell'app, per ora senza icona: la prima prova verifica che senza
// non si costruisce niente, poi la mette. `contesto.ts` ricorda la radice alla
// prima domanda: per questo la prova del vassoio spento sta in cima.
const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-vassoio-'))
process.env.REGISTRO_APPPATH = percorso.join(radice, 'dist')

const { creaVassoio, senzaSeparatoriInutili, vassoioAcceso, SEPARATORE } = await import(
  '../../dist-tests/tray.mjs',
)
const { vassoiCostruiti } = await import('../helpers/fake-electron.mjs')

/** L'ultimo vassoio costruito: ne esiste uno per volta. */
function ultimo () {
  return vassoiCostruiti[vassoiCostruiti.length - 1]
}

function acceso (voci, suggerimento = 'Registro') {
  return creaVassoio({
    menu: () => voci,
    suggerimento: () => suggerimento,
    alClic: () => {},
  })
}

describe('senza un’icona da mettere', () => {
  it('non si costruisce un vassoio invisibile', () => {
    const quanti = vassoiCostruiti.length

    assert.equal(acceso([{ etichetta: 'una voce' }]), null)
    assert.equal(vassoiCostruiti.length, quanti, 'niente Tray costruito per niente')
    assert.equal(
      vassoioAcceso(),
      false,
      'e il guscio deve saperlo: senza icona la X torna a chiudere l’applicazione',
    )

    // Da qui l'icona c'è: il percorso si ricompone a ogni chiamata, solo la radice
    // è ricordata.
    mkdirSync(percorso.join(radice, 'icons'), { recursive: true })
    writeFileSync(percorso.join(radice, 'icons', 'icon.png'), 'finta')
  })
})

describe('i separatori che non separano niente', () => {
  it('spariscono in testa, in coda e a coppie', () => {
    const netto = senzaSeparatoriInutili([
      SEPARATORE,
      { etichetta: 'uno' },
      SEPARATORE,
      SEPARATORE,
      { etichetta: 'due' },
      SEPARATORE,
    ])

    assert.deepEqual(
      netto.map((voce) => voce.etichetta),
      ['uno', '-', 'due'],
    )
  })

  it('un menu di soli separatori resta vuoto', () => {
    assert.deepEqual(senzaSeparatoriInutili([SEPARATORE, SEPARATORE]), [])
  })
})

describe('la traduzione in menu di Electron', () => {
  it('porta etichette, spegnimenti e sottomenu dove Electron li cerca', () => {
    const vassoio = acceso([
      { etichetta: 'Regiclass — 2 ore da chiudere', spenta: true },
      SEPARATORE,
      {
        etichetta: '⚠ I MEC A — Matematica',
        sotto: [
          { etichetta: 'Da chiudere (1)', spenta: true },
          { etichetta: '⚠ lun 12 · 08:20–09:05 · senza appello', al: () => {} },
        ],
      },
      SEPARATORE,
      { etichetta: 'Esci dal registro', al: () => {} },
    ])
    assert.ok(vassoio, 'con l’icona al suo posto il vassoio si costruisce')

    const modello = ultimo().menu
    assert.deepEqual(
      modello.map((voce) => voce.type ?? voce.label),
      [
        'Regiclass — 2 ore da chiudere',
        'separator',
        '⚠ I MEC A — Matematica',
        'separator',
        'Esci dal registro',
      ],
    )
    assert.equal(modello[0].enabled, false, 'un titolo di gruppo si legge e non si preme')
    assert.equal(modello[4].enabled, true)
    assert.equal(typeof modello[4].click, 'function')

    const dentro = modello[2].submenu
    assert.equal(dentro.length, 2)
    assert.equal(dentro[0].enabled, false)
    assert.match(dentro[1].label, /senza appello/)

    vassoio.smaltisci()
  })

  it('il suggerimento e il menu si rifanno a ogni aggiornamento', () => {
    let giro = 0
    const vassoio = creaVassoio({
      menu: () => [{ etichetta: `giro ${giro}` }],
      suggerimento: () => `giro ${giro}`,
      alClic: () => {},
    })

    assert.equal(ultimo().suggerimento, 'giro 0')
    giro = 1
    vassoio.aggiorna()
    assert.equal(ultimo().suggerimento, 'giro 1')
    assert.equal(ultimo().menu[0].label, 'giro 1')

    vassoio.smaltisci()
  })

  it('l’icona si dice accesa finché non la si smaltisce, e una volta sola', () => {
    assert.equal(vassoioAcceso(), false)

    const vassoio = acceso([{ etichetta: 'una voce' }])
    assert.equal(vassoioAcceso(), true)

    vassoio.smaltisci()
    assert.equal(ultimo().distrutto, true)
    assert.equal(vassoioAcceso(), false)

    // Smaltito due volte il conto andrebbe sotto zero e `vassoioAcceso()`
    // direbbe «no» anche con l'icona accesa.
    vassoio.smaltisci()
    assert.equal(vassoioAcceso(), false)
  })
})
