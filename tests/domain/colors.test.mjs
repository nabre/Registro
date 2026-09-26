// Un colore è `#rrggbb` (`coloreValido`). Ognuno tiene il suo ripiego: le voci
// di lista tolgono gli spazi e portano in minuscolo, il resto prende il colore
// com'è scritto o non lo prende.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  coloreDelCorso,
  coloreValido,
  normalizzaRegistro,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

describe('un colore', () => {
  it('è un cancelletto e sei cifre esadecimali', () => {
    assert.equal(coloreValido('#a1B2c3'), true)
    assert.equal(coloreValido('#abc'), false)
    assert.equal(coloreValido('a1b2c3'), false)
    assert.equal(coloreValido('#a1b2c3 '), false, 'gli spazi li toglie chi vuole toglierli')
    assert.equal(coloreValido(''), false)
    assert.equal(coloreValido(undefined), false)
    assert.equal(coloreValido(0xa1b2c3), false)
  })

  it('una classe e un corso letti da disco lo tengono com’è scritto', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30' }],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'I MEC A', colore: '#AABBCC' },
        { id: 'c2', annoId: 'a1', nome: 'II MEC A', colore: ' #aabbcc' },
      ],
      corsi: [
        { id: 'cor1', classeId: 'c1', materiaId: 'm1', colore: '#112233' },
        { id: 'cor2', classeId: 'c2', materiaId: 'm1', colore: 'rosso' },
      ],
    })
    assert.equal(registro.classi[0].colore, '#AABBCC')
    assert.notEqual(registro.classi[1].colore, ' #aabbcc', 'uno sbagliato prende la tavolozza')
    assert.equal(coloreValido(registro.classi[1].colore), true)
    assert.equal(registro.corsi.find((c) => c.id === 'cor1').colore, '#112233')
    assert.equal(registro.corsi.find((c) => c.id === 'cor2').colore, undefined)
  })

  it('un corso senza colori buoni da nessuna parte è grigio', () => {
    const { classe, materia, corso } = scuolaMinima()
    classe.colore = 'blu'
    materia.colore = ''
    corso.colore = undefined
    assert.equal(coloreDelCorso(corso, classe, materia), '#888888')
    classe.colore = '#102030'
    assert.equal(coloreDelCorso(corso, classe, materia), '#102030')
  })
})
