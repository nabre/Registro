// Il CSV scritto e riletto: `righe` e `leggiCsv` sono una grammatica sola vista
// dai due lati, e si prova il giro completo. Le celle difficili vengono da
// titoli e nomi veri: punto e virgola, virgolette, un meno in testa.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leggiCsv, righe, cella } from '../../dist-tests/domain.mjs'

describe('rileggere un CSV', () => {
  it('il giro completo rende le celle di partenza', () => {
    const dati = [
      ['DIC4a — Calcolo professionale — 1° semestre'],
      [],
      ['Persona in formazione', 'Verifica 1', 'Media'],
      ['Rossi Mario', 5, 5.25],
      ['Bianchi Anna', '', ''],
    ]
    assert.deepEqual(leggiCsv(righe(dati)), [
      ['DIC4a — Calcolo professionale — 1° semestre'],
      [''],
      ['Persona in formazione', 'Verifica 1', 'Media'],
      // I numeri tornano come li scrive il foglio di calcolo italiano, con la
      // virgola: sono testo.
      ['Rossi Mario', '5', '5,25'],
      ['Bianchi Anna', '', ''],
    ])
  })

  it('il punto e virgola dentro una cella non spezza la riga', () => {
    const dati = [['Verifica 1; recupero', 'nota']]
    assert.deepEqual(leggiCsv(righe(dati)), [['Verifica 1; recupero', 'nota']])
  })

  it('le virgolette raddoppiate tornano una sola', () => {
    const dati = [['Ha detto "va bene"', 'poi ha firmato']]
    assert.deepEqual(leggiCsv(righe(dati)), [['Ha detto "va bene"', 'poi ha firmato']])
  })

  it('l’apostrofo che disinnesca una formula non resta nella cella', () => {
    // `cella` protegge «-Rossi» dal foglio di calcolo; rileggendo torna il nome.
    assert.deepEqual(leggiCsv(righe([['-Rossi Mario', '=A1']])), [['-Rossi Mario', '=A1']])
  })

  it('un apostrofo che è davvero del testo resta dov’è', () => {
    assert.deepEqual(leggiCsv(righe([["'26", "l'anno"]])), [["'26", "l'anno"]])
  })

  it('il BOM non diventa una cella, e la riga vuota in fondo non c’è', () => {
    const letto = leggiCsv(righe([['a', 'b'], ['c', 'd']]))
    assert.equal(letto.length, 2)
    assert.equal(letto[0][0], 'a')
  })

  it('un file vuoto non è una riga vuota', () => {
    assert.deepEqual(leggiCsv(''), [])
    assert.deepEqual(leggiCsv('﻿'), [])
  })

  it('legge anche un CSV con le sole interruzioni di Unix', () => {
    assert.deepEqual(leggiCsv('a;b\nc;d\n'), [['a', 'b'], ['c', 'd']])
  })
})

describe('le celle difficili', () => {
  it('un conto andato a vuoto è una cella vuota', () => {
    assert.equal(cella(NaN), '')
    assert.equal(cella(Infinity), '')
    assert.equal(cella(-Infinity), '')
    assert.equal(cella(1.5), '1,5')
  })

  it('tabulazione e ritorno a capo in testa si disinnescano, e si rileggono', () => {
    assert.equal(cella('\t=1+1'), "'\t=1+1")
    assert.equal(cella('\r=1+1'), '"\'\r=1+1"')
    assert.deepEqual(leggiCsv(righe([['\t=1+1', '\r=A1']])), [['\t=1+1', '\r=A1']])
  })
})
