// Il periodo su cui si conta: il semestre scelto o l'anno intero. Regole in un
// posto solo: dentro il semestre o tutto l'anno, l'etichetta del semestre o
// «anno intero», da agosto l'anno che comincia.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  etichettaAnno,
  etichettaSemestre,
  matriceDelCorsoNelPeriodo,
  nelSemestre,
  normalizzaRegistro,
  primoAnnoScolastico,
  udPrevisteDelCorso,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const SEMESTRE = { id: 's1', numero: 1, etichetta: '1° semestre', inizio: '2026-09-01', fine: '2027-01-31' }

describe('il semestre', () => {
  it('contiene i suoi estremi, e senza semestre c’è tutto', () => {
    assert.equal(nelSemestre(SEMESTRE, '2026-09-01'), true)
    assert.equal(nelSemestre(SEMESTRE, '2027-01-31'), true)
    assert.equal(nelSemestre(SEMESTRE, '2027-02-01'), false)
    assert.equal(nelSemestre(null, '1999-01-01'), true)
  })

  it('si chiama con la sua etichetta, o «anno intero»', () => {
    assert.equal(etichettaSemestre(SEMESTRE), '1° semestre')
    assert.equal(etichettaSemestre(null), 'anno intero')
    assert.equal(etichettaSemestre(undefined), 'anno intero')
  })
})

describe('l’anno scolastico di un giorno', () => {
  it('da agosto è quello che comincia, prima quello che finisce', () => {
    assert.equal(primoAnnoScolastico('2026-08-01'), 2026)
    assert.equal(primoAnnoScolastico('2026-07-31'), 2025)
    assert.equal(primoAnnoScolastico('2027-01-15'), 2026)
    assert.equal(etichettaAnno('2026-09-01'), '2026/2027')
    assert.equal(etichettaAnno('2027-03-01'), '2026/2027')
  })

  it('un anno letto da disco senza etichetta prende quella di sempre', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30' }],
    })
    assert.equal(registro.anni[0].etichetta, '2025/2026')
  })
})

describe('il monte ore di un corso senza anno', () => {
  it('è zero, e la matrice ripiega sulle ore a calendario', () => {
    // Una classe il cui anno non c'è più: esportazione CSV, rapporti e
    // segnalazioni non si fermano a zero.
    const { registro, corso } = scuolaMinima()
    corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
    registro.anni = []
    assert.equal(udPrevisteDelCorso(registro, corso, null), 0)
    assert.equal(matriceDelCorsoNelPeriodo(registro, corso, null).udPreviste, 0)
  })
})
