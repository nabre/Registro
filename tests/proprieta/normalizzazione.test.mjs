// La normalizzazione su dati generati: le `normalizza…` pubbliche dichiarano
// di raddrizzare quel che arriva dal disco (campi mancanti, tipi sbagliati,
// file aperti a mano), quindi non lanciano mai, e un dato già raddrizzato non
// si raddrizza una seconda volta: salvato e riletto resta quello.
//
// L'idempotenza si guarda sul valore com'è su disco (`suDisco`): un campo
// `undefined` in memoria e uno assente sul file sono la stessa cosa.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizzaCalendario,
  normalizzaCheck,
  normalizzaConsegna,
  normalizzaImpostazioni,
  normalizzaIntestazione,
  normalizzaListe,
  normalizzaPause,
  normalizzaPerRicerca,
  normalizzaPiano,
  normalizzaProgetto,
  normalizzaRegistro,
  normalizzaTesto,
  normalizzaValutazione,
} from '../../dist-tests/domain.mjs'
import { campioni, fc, guastato, suDisco, verifica } from '../helpers/proprieta.mjs'

const ultimo = campioni().at(-1).voci

/**
 * Qualunque cosa: anche quel che da un JSON non arriva (prototipo nullo,
 * `Date`, `undefined`), perché nessuna di queste deve cadere. Gli array con i
 * buchi hanno la loro prova, in fondo.
 */
const qualsiasi = fc.anything({ withNullPrototype: true, withBoxedValues: true, withDate: true })

/**
 * Le normalizzazioni di una parte, ciascuna con un punto di partenza valido
 * preso dal campione più recente, da guastare.
 */
const PARTI = [
  ['normalizzaImpostazioni', normalizzaImpostazioni, ultimo.registro.impostazioni],
  ['normalizzaIntestazione', normalizzaIntestazione, ultimo.registro.impostazioni.intestazione ?? {}],
  ['normalizzaListe', normalizzaListe, ultimo.registro.impostazioni.liste ?? {}],
  ['normalizzaCalendario', normalizzaCalendario, ultimo.registro.impostazioni.calendario ?? { url: 'https://esempio.ch/a.ics' }],
  ['normalizzaPause', (grezzo) => normalizzaPause(grezzo, 45), ultimo.registro.impostazioni.pause ?? {}],
  ['normalizzaValutazione', normalizzaValutazione, ultimo.valutazioni[0]],
  ['normalizzaPiano', normalizzaPiano, ultimo.piani?.[0] ?? { id: 'p1', titolo: 'Piano' }],
  ['normalizzaConsegna', normalizzaConsegna, ultimo.consegne?.[0] ?? { id: 'k1', titolo: 'Consegna' }],
  ['normalizzaCheck', normalizzaCheck, ultimo.check?.[0] ?? { id: 'h1', corsoId: 'c1', voci: [] }],
  ['normalizzaProgetto', normalizzaProgetto, ultimo.progetti?.[0] ?? { id: 'g1', corsoId: 'c1' }],
]

describe('normalizzazione: non lancia mai', () => {
  for (const [nome, normalizza] of PARTI) {
    it(`${nome} su qualunque valore`, () => {
      verifica(fc.property(qualsiasi, (grezzo) => {
        normalizza(grezzo)
      }), 200)
    })
  }

  it('normalizzaRegistro su qualunque valore', () => {
    verifica(fc.property(qualsiasi, (grezzo) => {
      normalizzaRegistro(grezzo)
    }), 200)
  })

  it('normalizzaRegistro su un oggetto con le chiavi giuste e dentro qualunque cosa', () => {
    const chiavi = ['versione', 'anni', 'annoCorrenteId', 'materie', 'classi', 'corsi', 'lezioni', 'piani',
      'valutazioni', 'fascicoli', 'consegne', 'check', 'progetti', 'smistamenti', 'coordinate',
      'impostazioni']
    const registro = fc.record(
      Object.fromEntries(chiavi.map((chiave) => [chiave, fc.oneof(qualsiasi, fc.array(qualsiasi, { maxLength: 3 }))])),
      { requiredKeys: [] },
    )
    verifica(fc.property(registro, (grezzo) => {
      normalizzaRegistro(grezzo)
    }), 200)
  })

  it('i testi per la ricerca e per il confronto su qualunque stringa', () => {
    verifica(fc.property(fc.string({ unit: 'grapheme' }), (testo) => {
      assert.equal(typeof normalizzaTesto(testo), 'string')
      assert.equal(typeof normalizzaPerRicerca(testo), 'string')
    }))
  })
})

describe('normalizzazione: una seconda volta non cambia niente', () => {
  for (const [nome, normalizza, valido] of PARTI) {
    it(`${nome}, da un valore valido guastato`, () => {
      verifica(fc.property(fc.oneof(guastato(valido), fc.jsonValue({ maxDepth: 3 })), (grezzo) => {
        const una = suDisco(normalizza(grezzo))
        assert.deepEqual(suDisco(normalizza(una)), una)
      }), 200)
    })
  }

  it('normalizzaTesto e normalizzaPerRicerca', () => {
    verifica(fc.property(fc.string({ unit: 'grapheme' }), (testo) => {
      const una = normalizzaTesto(testo)
      assert.equal(normalizzaTesto(una), una)
      const cercata = normalizzaPerRicerca(testo)
      assert.equal(normalizzaPerRicerca(cercata), cercata)
    }))
  })
})

describe('normalizzazione: array con i buchi', () => {
  // Da un JSON non arrivano (`[,]` non si scrive), ma `normalizzaRegistro` dice
  // di non lanciare mai; un buco vale un elemento mancante.
  it(
    'normalizzaRegistro con un buco in una collezione',
    { skip: 'difetto noto: {"classi":[,]}, {"lezioni":[,]}, {"fascicoli":[,]} lanciano TypeError' },
    () => {
      for (const collezione of ['classi', 'lezioni', 'fascicoli']) {
        // eslint-disable-next-line no-sparse-arrays
        normalizzaRegistro({ [collezione]: [,] })
      }
    },
  )
})
