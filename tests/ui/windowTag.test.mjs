// L'etichetta delle finestre nella barra del titolo (`ui/windows.ts`): la
// principale si nomina solo con figlie aperte, una figlia sempre; e il tetto
// delle figlie dice perché non se ne apre un'altra.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { etichettaDellaFinestra, perchéNonUnAltra, ricevoFinestre } = await importaSorgente('ui/windows.ts')

const aperte = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1, titolo: '' }))

describe('l’etichetta della finestra', () => {
  it('la principale tace da sola, e con figlie dice quante finestre ci sono', () => {
    assert.equal(etichettaDellaFinestra(1, aperte(1), 'Oggi'), null)
    assert.equal(etichettaDellaFinestra(1, [], 'Oggi'), null)
    assert.equal(etichettaDellaFinestra(1, aperte(3), 'Oggi'), 'Principale · 3')
  })

  it('una figlia si nomina sempre, con la pagina se la sa', () => {
    assert.equal(etichettaDellaFinestra(2, aperte(2), 'Calendario'), 'Finestra 2 · Calendario')
    assert.equal(etichettaDellaFinestra(4, aperte(4), ''), 'Finestra 4')
  })
})

describe('il tetto delle figlie', () => {
  const massimo = (valore) => [{ chiave: 'registroDocenti.finestre.massimo', valore }]

  it('vale l’impostazione, e senza le quattro di serie', () => {
    ricevoFinestre({ tipo: 'finestre', ruolo: 'principale', numero: 1, elenco: aperte(3) })
    assert.equal(perchéNonUnAltra(massimo(3)), null)
    assert.match(perchéNonUnAltra(massimo(2)), /Ci sono già 2 finestre in più/)
    assert.equal(perchéNonUnAltra([]), null)
    ricevoFinestre({ tipo: 'finestre', ruolo: 'principale', numero: 1, elenco: aperte(5) })
    assert.match(perchéNonUnAltra([]), /Ci sono già 4 finestre in più/)
    assert.match(perchéNonUnAltra(massimo(1)), /C’è già una finestra in più/)
  })
})
