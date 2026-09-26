// Il giorno scelto del calendario sta dentro l'anno aperto: aprendo un altro
// anno, un giorno ricordato fuori dall'anno si riporta dentro. La regola pura,
// e il punto in cui lo stato la applica.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'

/** Lo stato dell'interfaccia, con nel ponte il giorno ricordato. */
function apri (ricordato = null) {
  return apriInterfaccia({ getState: () => ricordato, setState () {} })
}

const { giornoDentroLAnno } = apri()
const anno = { inizio: '2026-09-01', fine: '2027-06-30' }

describe('giornoDentroLAnno', () => {
  it('lascia stare un giorno che ci cade', () => {
    assert.equal(giornoDentroLAnno('2026-11-12', anno, '2027-02-01'), '2026-11-12')
  })
  it('porta su oggi se il giorno è fuori e oggi è dentro', () => {
    assert.equal(giornoDentroLAnno('2026-06-10', anno, '2026-10-05'), '2026-10-05')
  })
  it('porta sul capo più vicino se anche oggi è fuori', () => {
    assert.equal(giornoDentroLAnno('2026-06-10', anno, '2026-06-10'), '2026-09-01')
    assert.equal(giornoDentroLAnno('2027-08-20', anno, '2027-08-20'), '2027-06-30')
  })
  it('senza anno, o con estremi storti, non tocca niente', () => {
    assert.equal(giornoDentroLAnno('2026-06-10', null, '2026-06-10'), '2026-06-10')
    assert.equal(giornoDentroLAnno('2026-06-10', { inizio: 'boh', fine: '2027-06-30' }, '2026-06-10'), '2026-06-10')
  })
})

describe('riconvalidaRicordati e il giorno scelto', () => {
  // Anni passati: oggi, chiunque giri la prova, cade fuori da tutti e due.
  const annoVecchio = { id: 'a1', etichetta: '2020/2021', inizio: '2020-09-01', fine: '2021-06-30', semestri: [], sospensioni: [] }
  const annoNuovo = { id: 'a2', etichetta: '2021/2022', inizio: '2021-09-01', fine: '2022-06-30', semestri: [], sospensioni: [] }
  const registro = (annoCorrenteId) => ({
    anni: [annoVecchio, annoNuovo],
    annoCorrenteId,
    classi: [],
    corsi: [],
    fascicoli: [],
  })

  it('aprendo un altro anno il giorno ci rientra, e dentro lo stesso anno non salta', () => {
    const ui = apri({ data: '2021-06-10' })
    ui.aggiorna({ registro: registro('a1') })
    ui.riconvalidaRicordati()
    assert.equal(ui.stato.data, '2021-06-10')

    ui.aggiorna({ registro: registro('a2') })
    ui.riconvalidaRicordati()
    assert.equal(ui.stato.data, '2021-09-01')

    // Le frecce passano il capo apposta: un'altra spinta dell'host, stesso anno,
    // non riporta indietro.
    ui.aggiorna({ data: '2022-08-01' })
    ui.aggiorna({ registro: registro('a2') })
    ui.riconvalidaRicordati()
    assert.equal(ui.stato.data, '2022-08-01')
  })

  it('una data ricordata storta si scarta all\'avvio', () => {
    const ui = apri({ data: '2026-13-45' })
    assert.notEqual(ui.stato.data, '2026-13-45')
    assert.match(ui.stato.data, /^\d{4}-\d{2}-\d{2}$/)
  })
})
