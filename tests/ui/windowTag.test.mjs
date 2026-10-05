// L'etichetta delle finestre nella barra del titolo (`ui/windows.ts`): la
// principale si nomina solo con figlie aperte, una figlia sempre; e il tetto
// delle figlie dice perché non se ne apre un'altra. Corso e classe condivisi:
// che cosa una pagina dice all'host, e che cosa tace.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const {
  condivisiDaDire,
  etichettaDellaFinestra,
  perchéNonUnAltra,
  prendiCondivisi,
  ricevoFinestre,
  scordaCondivisi,
} = await importaSorgente('ui/windows.ts')

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

describe('corso e classe condivisi fra le finestre', () => {
  const condivisi = (corsoId, classeId = null, semestreId = null) => ({ corsoId, classeId, semestreId })

  /** Fa finta di essere la finestra con quel numero, come la scrive l'host nell'`<html>`. */
  function comeFinestra (numero, prova) {
    const prima = globalThis.document
    globalThis.document = { documentElement: { dataset: { finestra: String(numero) } } }
    try {
      scordaCondivisi()
      prova()
    } finally {
      globalThis.document = prima
    }
  }

  it('alla partenza parla la principale, una figlia tace', () => {
    comeFinestra(1, () => {
      assert.deepEqual(
        condivisiDaDire(condivisi('c1', 'k1', 's1')),
        { corsoId: 'c1', classeId: 'k1', semestreId: 's1' },
      )
    })
    comeFinestra(2, () => {
      assert.equal(condivisiDaDire(condivisi('ricordato', 'k9')), null)
    })
  })

  it('dopo, solo i campi cambiati; «niente scelto» no, l’anno intero sì', () => {
    comeFinestra(2, () => {
      condivisiDaDire(condivisi('c1', 'k1'))
      assert.equal(condivisiDaDire(condivisi('c1', 'k1')), null)
      assert.deepEqual(condivisiDaDire(condivisi('c2', 'k1')), { corsoId: 'c2' })
      assert.equal(condivisiDaDire(condivisi('c2', null)), null)
      assert.deepEqual(condivisiDaDire(condivisi('c2', 'k3')), { classeId: 'k3' })
      assert.deepEqual(condivisiDaDire(condivisi('c2', 'k3', 's2')), { semestreId: 's2' })
      assert.deepEqual(condivisiDaDire(condivisi('c2', 'k3', null)), { semestreId: null })
    })
  })

  it('quel che arriva dall’host si prende senza ridirlo', () => {
    comeFinestra(1, () => {
      condivisiDaDire(condivisi('c1', 'k1'))
      prendiCondivisi(condivisi('dalla-figlia', 'k1'))
      assert.equal(condivisiDaDire(condivisi('dalla-figlia', 'k1')), null)
    })
  })
})
