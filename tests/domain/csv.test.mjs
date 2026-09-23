// Il CSV scritto e riletto: le stesse celle, tornate indietro.
//
// La prova che conta è il giro completo — `righe` e poi `leggiCsv` — perché le
// due funzioni sono una grammatica sola guardata dai due lati, e l'unico modo
// per accorgersi che hanno smesso di combaciare è farle combaciare qui. Le
// celle difficili non sono inventate: un titolo con il punto e virgola dentro,
// una nota con le virgolette, un nome che comincia con un meno — arrivano dai
// titoli delle prove e dai nomi che il registro non sceglie.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leggiCsv, righe } from '../../dist-tests/domain.mjs'

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
      // I numeri tornano come li legge il foglio di calcolo italiano: con la
      // virgola. È testo, e il CSV non sa che una volta erano numeri.
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
    // `cella` lo mette perché un foglio di calcolo prenderebbe «-Rossi» per un
    // conto: chi rilegge vuole il nome, non la protezione.
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
