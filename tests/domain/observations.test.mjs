// La matrice del comportamento riletta per persona.
//
// La prova che conta è che i conti siano gli stessi che si leggono nell'ora in
// cui sono stati segnati: la scheda della persona e il registro dell'ora
// guardano le stesse caselle, e due conti diversi della stessa cosa sono il
// modo di far smettere di credere a tutti e due.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  bilancioSegni,
  celleDiAllievo,
  contiPerAspetto,
  creaAllievo,
  creaLezione,
} from '../../dist-tests/domain.mjs'

function ora (data, celle) {
  const lezione = creaLezione('cor-1', data, '08:00', 90)
  lezione.matrice = celle
  return lezione
}

describe('la matrice del comportamento, riletta per persona', () => {
  it('tiene solo le caselle di chi si sta guardando, dalla più recente', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const bruno = creaAllievo('Bianchi', 'Bruno')
    const lezioni = [
      ora('2026-09-15', [
        { allievoId: anna.id, aspetto: 'partecipazione', segno: 'positivo' },
        { allievoId: bruno.id, aspetto: 'partecipazione', segno: 'negativo' },
      ]),
      ora('2026-10-01', [{ allievoId: anna.id, aspetto: 'materiale', segno: 'negativo' }]),
    ]

    const celle = celleDiAllievo(lezioni, anna.id)

    assert.equal(celle.length, 2)
    assert.equal(celle[0].lezione.data, '2026-10-01')
    assert.equal(celle[0].cella.aspetto, 'materiale')
    assert.equal(celle[1].cella.aspetto, 'partecipazione')
  })

  it('lascia fuori le ore annullate: non si è tenuta, non è andata in nessun modo', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const disdetta = ora('2026-09-15', [
      { allievoId: anna.id, aspetto: 'partecipazione', segno: 'positivo' },
    ])
    disdetta.stato = 'annullata'

    assert.deepEqual(celleDiAllievo([disdetta], anna.id), [])
  })

  it('regge le ore scritte prima che la matrice esistesse', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const vecchia = creaLezione('cor-1', '2026-09-15', '08:00', 90)
    delete vecchia.matrice

    assert.deepEqual(celleDiAllievo([vecchia], anna.id), [])
  })

  it('somma per aspetto, e mette davanti quello di cui c’è più da dire', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezioni = [
      ora('2026-09-15', [
        { allievoId: anna.id, aspetto: 'partecipazione', segno: 'positivo' },
        { allievoId: anna.id, aspetto: 'materiale', segno: 'negativo' },
      ]),
      ora('2026-09-22', [
        { allievoId: anna.id, aspetto: 'partecipazione', segno: 'positivo' },
        { allievoId: anna.id, aspetto: 'partecipazione', segno: 'negativo' },
      ]),
    ]

    const conti = contiPerAspetto(celleDiAllievo(lezioni, anna.id))

    assert.equal(conti.length, 2)
    assert.equal(conti[0].aspetto, 'partecipazione')
    assert.equal(conti[0].positivi, 2)
    assert.equal(conti[0].negativi, 1)
    assert.equal(conti[0].quante, 3)
    assert.equal(conti[1].aspetto, 'materiale')
    assert.equal(conti[1].negativi, 1)
  })

  it('conta a parte le caselle annotate senza segno: è successo qualcosa lo stesso', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezioni = [
      ora('2026-09-15', [
        { allievoId: anna.id, aspetto: 'autonomia', segno: null, nota: 'ha chiesto di spostarsi' },
      ]),
    ]

    const celle = celleDiAllievo(lezioni, anna.id)
    const conti = contiPerAspetto(celle)

    assert.equal(conti[0].neutre, 1)
    assert.equal(conti[0].positivi, 0)
    assert.equal(conti[0].negativi, 0)
    assert.deepEqual(bilancioSegni(celle), { positivi: 0, negativi: 0, neutre: 1 })
  })

  it('fa il bilancio di tutte le caselle insieme', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezioni = [
      ora('2026-09-15', [
        { allievoId: anna.id, aspetto: 'partecipazione', segno: 'positivo' },
        { allievoId: anna.id, aspetto: 'materiale', segno: 'negativo' },
      ]),
      ora('2026-09-22', [{ allievoId: anna.id, aspetto: 'materiale', segno: 'negativo' }]),
    ]

    assert.deepEqual(bilancioSegni(celleDiAllievo(lezioni, anna.id)), {
      positivi: 1,
      negativi: 2,
      neutre: 0,
    })
  })
})
