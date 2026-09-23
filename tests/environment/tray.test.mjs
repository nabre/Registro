// L'icona accanto all'orologio, dal lato di Electron.
//
// Qui non si prova che cosa c'è scritto nel menu — quello è dominio, e sta in
// `tests/domain/tray.test.mjs` — ma la traduzione: che una voce spenta
// arrivi spenta, che un sottomenu resti un sottomenu, e che i separatori che
// non separano niente spariscano. Sono le tre cose che, sbagliate, si vedono
// solo aprendo il menu su una macchina vera.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

// La radice dell'app, per ora spoglia: l'icona ce la mette la prima prova,
// dopo aver verificato che senza non si costruisce niente. L'ordine conta —
// `contesto.ts` la radice se la ricorda alla prima domanda — e per questo la
// prova del vassoio spento sta in cima e non in fondo.
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

    // Da qui in poi l'icona c'è. Il percorso si ricompone a ogni chiamata: è
    // solo la radice a essere ricordata, e quella non cambia.
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
      { etichetta: 'Registro docenti — 2 ore da chiudere', spenta: true },
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
        'Registro docenti — 2 ore da chiudere',
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

  it('un interruttore arriva con la spunta, e una voce normale senza', () => {
    const vassoio = acceso([
      { etichetta: 'Agenda sul desktop', segnata: true, al: () => {} },
      { etichetta: 'Agenda sul desktop', segnata: false, al: () => {} },
      { etichetta: 'Apri il registro', al: () => {} },
    ])

    const modello = ultimo().menu
    assert.equal(modello[0].type, 'checkbox')
    assert.equal(modello[0].checked, true)
    // `false` è una spunta che c'è e non è messa: senza questa distinzione la
    // voce spenta sembrerebbe una voce qualsiasi, e non si saprebbe che è un
    // interruttore prima di premerla.
    assert.equal(modello[1].type, 'checkbox')
    assert.equal(modello[1].checked, false)
    assert.equal(modello[2].type, undefined, 'una voce normale non diventa una casella')

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

    // Smaltito due volte il conto scenderebbe sotto zero, e da lì in poi
    // `vassoioAcceso()` direbbe «no» anche con un'icona accesa: il guscio
    // chiuderebbe l'applicazione a ogni finestra chiusa.
    vassoio.smaltisci()
    assert.equal(vassoioAcceso(), false)
  })
})
