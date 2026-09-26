// Gli indirizzi dell'anagrafica, nei loro pezzi. La prova che conta è in fondo:
// una riga letta e riscritta torna identica, perché è la chiave delle
// coordinate della mappa. Le righe sono le forme che arrivano dai registri
// veri: NAP in fondo, nome di uno studio davanti, casella postale in mezzo,
// paese fra parentesi.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  leggiIndirizzo,
  normalizzaRegistro,
  scriviIndirizzo,
} from '../../dist-tests/domain.mjs'

describe('leggere una riga d’indirizzo', () => {
  it('la forma normale: via davanti, NAP e località in fondo', () => {
    assert.deepEqual(leggiIndirizzo('Via Campagna 2, 6512 Giubiasco'), {
      presso: undefined,
      via: 'Via Campagna 2',
      casella: undefined,
      cap: '6512',
      localita: 'Giubiasco',
    })
  })

  it('la località può essere di due parole, o portarsi dietro il cantone', () => {
    assert.equal(leggiIndirizzo('Via Motta 1, 6528 Camorino').localita, 'Camorino')
    assert.equal(leggiIndirizzo('Via Motta 1, 6535 Roveredo (GR)').localita, 'Roveredo (GR)')
  })

  it('la casella postale non è la via: si riconosce e sta per conto suo', () => {
    const letto = leggiIndirizzo('Via Campagna 2.1, CP 570, 6512 Giubiasco')

    assert.equal(letto.via, 'Via Campagna 2.1')
    assert.equal(letto.casella, 'CP 570')
  })

  it('quel che sta davanti alla via è un’intestazione, non un pezzo di via', () => {
    const letto = leggiIndirizzo('Studio d’ingegneria, Via Campagna 2.1, CP 570, 6512 Giubiasco')

    assert.equal(letto.presso, 'Studio d’ingegneria')
    assert.equal(letto.via, 'Via Campagna 2.1')
    assert.equal(letto.casella, 'CP 570')
    assert.equal(letto.cap, '6512')
  })

  it('un NAP estero si legge lo stesso, sigla del paese compresa', () => {
    // La sigla resta attaccata al NAP, come su una busta per l'estero.
    assert.equal(leggiIndirizzo('Via Milano 3, I-22100 Como').cap, 'I-22100')
    assert.equal(leggiIndirizzo('Via Milano 3, I-22100 Como').localita, 'Como')
  })

  it('senza NAP non si indovina niente: la riga resta intera nella via', () => {
    // Meglio una casella con tutto che quattro riempite a caso: chi apre la
    // scheda la sistema.
    const letto = leggiIndirizzo('Da qualche parte in campagna')

    assert.equal(letto.via, 'Da qualche parte in campagna')
    assert.equal(letto.cap, '')
    assert.equal(letto.localita, '')
  })

  it('una riga vuota non fa un indirizzo finto', () => {
    assert.deepEqual(leggiIndirizzo(''), { via: '', cap: '', localita: '' })
    assert.deepEqual(leggiIndirizzo(undefined), { via: '', cap: '', localita: '' })
  })
})

describe('riscrivere un indirizzo in una riga', () => {
  it('l’ordine è quello di una busta', () => {
    assert.equal(
      scriviIndirizzo({
        presso: 'c/o Rossi',
        via: 'Via Campagna 2',
        casella: 'CP 570',
        cap: '6512',
        localita: 'Giubiasco',
        paese: 'Svizzera',
      }),
      'c/o Rossi, Via Campagna 2, CP 570, 6512 Giubiasco, Svizzera',
    )
  })

  it('le caselle vuote non lasciano virgole appese', () => {
    assert.equal(
      scriviIndirizzo({ via: 'Via Campagna 2', cap: '6512', localita: 'Giubiasco' }),
      'Via Campagna 2, 6512 Giubiasco',
    )
    assert.equal(scriviIndirizzo({ via: '', cap: '', localita: '' }), '')
    assert.equal(scriviIndirizzo(undefined), '')
  })
})

describe('il giro completo', () => {
  // La chiave delle coordinate è questa riga: se il giro non torna, il punto si
  // perde.
  const righe = [
    'Via Campagna 2, 6512 Giubiasco',
    'Via alla Chiesa 12, 6900 Lugano',
    'Viale Stazione 3B, 6500 Bellinzona',
    'Via Campagna 2.1, CP 570, 6512 Giubiasco',
    'Studio d’ingegneria, Via Campagna 2.1, CP 570, 6512 Giubiasco',
    'Via Motta 1, 6535 Roveredo (GR)',
    'Via Milano 3, I-22100 Como',
    'Da qualche parte in campagna',
  ]

  for (const riga of righe) {
    it(`torna identica: «${riga}»`, () => {
      assert.equal(scriviIndirizzo(leggiIndirizzo(riga)), riga)
    })
  }
})

describe('i file di prima', () => {
  it('la riga scritta com’era si spezza da sé alla lettura', () => {
    const registro = normalizzaRegistro({
      classi: [
        {
          id: 'c1',
          annoId: 'a1',
          nome: 'I MEC A',
          allievi: [
            {
              id: 'a1',
              cognome: 'Rossi',
              nome: 'Maria',
              indirizzo: 'Via Campagna 2, 6512 Giubiasco',
              indirizzoDatore: 'Via Motta 1, 6528 Camorino',
            },
          ],
        },
      ],
    })

    const allievo = registro.classi[0].allievi[0]
    assert.equal(allievo.indirizzo.via, 'Via Campagna 2')
    assert.equal(allievo.indirizzo.cap, '6512')
    assert.equal(allievo.indirizzoDatore.localita, 'Camorino')
    // E rimessa insieme è la riga di prima: la mappa non si accorge di niente.
    assert.equal(scriviIndirizzo(allievo.indirizzo), 'Via Campagna 2, 6512 Giubiasco')
  })

  it('un indirizzo già nelle sue caselle si rilegge tale e quale', () => {
    const registro = normalizzaRegistro({
      classi: [
        {
          id: 'c1',
          annoId: 'a1',
          nome: 'I MEC A',
          allievi: [
            {
              id: 'a1',
              cognome: 'Rossi',
              nome: 'Maria',
              indirizzo: { via: 'Via Campagna 2', cap: '6512', localita: 'Giubiasco' },
            },
          ],
        },
      ],
    })

    assert.deepEqual(registro.classi[0].allievi[0].indirizzo, {
      presso: undefined,
      via: 'Via Campagna 2',
      casella: undefined,
      cap: '6512',
      localita: 'Giubiasco',
      paese: undefined,
    })
  })
})
