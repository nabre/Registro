// I momenti di valutazione rimasti senza la tappa che li ha fatti nascere.
//
// La prova che conta è che il motivo sia quello giusto: «il piano non c'è più»
// e «la tappa non è più una prova» sono due storie diverse, e chi guarda
// l'elenco decide in base a quale delle due sia. Un motivo sbagliato è peggio
// di nessun motivo, perché fa buttare via dei voti per il verso storto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  agganciato,
  creaAttivita,
  creaPiano,
  creaValutazione,
  motivoOrfano,
  registroVuoto,
  valutazioniOrfane,
} from '../../dist-tests/domain.mjs'

/** Un registro con un piano, una tappa valutata e il momento che ne è uscito. */
function conUnaTappaValutata () {
  const registro = registroVuoto()

  const piano = creaPiano('cor-1')
  const tappa = { ...creaAttivita('Prova scritta', 0.5), tipo: 'verifica' }
  tappa.valutazione = { titolo: 'Prova scritta', tipo: 'scritto', peso: 1 }
  piano.attivita.push(tappa)
  registro.piani.push(piano)

  const momento = creaValutazione('cor-1', 'Prova scritta')
  momento.pianoId = piano.id
  momento.attivitaId = tappa.id
  registro.valutazioni.push(momento)

  return { registro, piano, tappa, momento }
}

describe('i momenti sganciati dalla scaletta', () => {
  it('un momento nato da una tappa valutata è agganciato', () => {
    const { registro, momento } = conUnaTappaValutata()

    assert.equal(motivoOrfano(registro, momento), null)
    assert.equal(agganciato(registro, momento), true)
    assert.deepEqual(valutazioniOrfane(registro), [])
  })

  it('dice quale legame si è rotto, e si ferma al primo', () => {
    const casi = [
      ['senza-piano', (r, m) => { m.pianoId = null }],
      ['piano-sparito', (r, m) => { m.pianoId = 'pia-che-non-ce' }],
      ['senza-tappa', (r, m) => { m.attivitaId = null }],
      ['tappa-sparita', (r, m) => { m.attivitaId = 'att-che-non-ce' }],
      ['tappa-non-valuta', (r) => { r.piani[0].attivita[0].valutazione = null }],
    ]

    for (const [atteso, rompi] of casi) {
      const { registro, momento } = conUnaTappaValutata()
      rompi(registro, momento)
      assert.equal(motivoOrfano(registro, momento), atteso)
    }
  })

  it('un piano sparito comanda sulla tappa sparita', () => {
    // Il piano non c'è più: dire «la tappa non c'è» sarebbe vero e inutile,
    // perché non spiega niente a chi deve decidere.
    const { registro, momento } = conUnaTappaValutata()
    momento.pianoId = 'pia-che-non-ce'
    momento.attivitaId = 'att-che-non-ce'

    assert.equal(motivoOrfano(registro, momento), 'piano-sparito')
  })

  it('conta i voti che si porterebbe via, e non quelli non ancora messi', () => {
    const { registro, momento } = conUnaTappaValutata()
    momento.pianoId = null
    momento.voti = [
      { allievoId: 'al-1', valore: 5, assente: false },
      { allievoId: 'al-2', valore: null, assente: false },
      { allievoId: 'al-3', valore: 4.5, assente: false },
    ]

    const orfane = valutazioniOrfane(registro)
    assert.equal(orfane.length, 1)
    assert.equal(orfane[0].voti, 2)
    assert.equal(orfane[0].motivo, 'senza-piano')
  })

  it('guarda solo i corsi che le si dicono', () => {
    const { registro, momento } = conUnaTappaValutata()
    momento.pianoId = null

    const altrove = creaValutazione('cor-2', 'Altra prova')
    registro.valutazioni.push(altrove)

    assert.equal(valutazioniOrfane(registro).length, 2, 'senza filtro ci sono tutti')
    assert.deepEqual(
      valutazioniOrfane(registro, ['cor-1']).map((o) => o.momento.id),
      [momento.id],
    )
  })

  it('i più recenti per primi: sono quelli che si sa ancora che cosa erano', () => {
    const registro = registroVuoto()
    for (const data of ['2026-10-01', '2027-02-14', '2026-12-20']) {
      const momento = creaValutazione('cor-1', `Prova ${data}`)
      momento.data = data
      registro.valutazioni.push(momento)
    }

    assert.deepEqual(
      valutazioniOrfane(registro).map((o) => o.momento.data),
      ['2027-02-14', '2026-12-20', '2026-10-01'],
    )
  })
})
