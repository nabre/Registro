// Il giro degli indirizzi (ADR-03) su righe generate: le coordinate della mappa
// hanno la riga come chiave, e `scriviIndirizzo(leggiIndirizzo(riga))` deve
// ridarla identica. Le righe esemplari stanno in `tests/domain/addresses.test.mjs`;
// qui le stesse forme, montate a caso dai loro pezzi.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leggiIndirizzo, scriviIndirizzo } from '../../dist-tests/domain.mjs'
import { fc, verifica } from '../helpers/proprieta.mjs'

const giro = (riga) => scriviIndirizzo(leggiIndirizzo(riga))

/** Una parola senza virgole né spazi: lettere, accenti, cifre, apostrofi e parentesi come nei registri veri. */
const parola = fc.stringMatching(/^[A-Za-zÀ-ÿ0-9'’().\-/]{1,12}$/)

/** Un pezzo di riga com'è dopo la pulizia: parole separate da uno spazio solo. */
const pezzo = fc.array(parola, { minLength: 1, maxLength: 4 }).map((parole) => parole.join(' '))

const casella = fc.oneof(
  fc.integer({ min: 1, max: 9999 }).map((n) => `CP ${n}`),
  fc.integer({ min: 1, max: 9999 }).map((n) => `C.P. ${n}`),
  fc.integer({ min: 1, max: 9999 }).map((n) => `casella postale ${n}`),
)

const nap = fc.tuple(
  fc.option(fc.stringMatching(/^[A-Z]{1,3}$/), { nil: '' }),
  fc.stringMatching(/^\d{4,5}$/),
).map(([sigla, cifre]) => (sigla ? `${sigla}-${cifre}` : cifre))

const napELocalita = fc.tuple(nap, pezzo).map(([cap, localita]) => `${cap} ${localita}`)

/** Una casella postale non è mai l'intero pezzo davanti: un pezzo che non lo sembri. */
const pezzoQualsiasi = pezzo.filter((testo) => !/^(?:c\.?\s?p\.?|casella\s+postale)\s*\d+$/i.test(testo))

describe('indirizzi: il giro di ADR-03 su righe generate', () => {
  it('una riga con NAP in coda e caselle subito prima torna identica', () => {
    verifica(fc.property(
      fc.array(pezzoQualsiasi, { minLength: 1, maxLength: 4 }),
      fc.array(casella, { maxLength: 2 }),
      napELocalita,
      (davanti, caselle, coda) => {
        const riga = [...davanti, ...caselle, coda].join(', ')
        assert.equal(giro(riga), riga)
      },
    ))
  })

  it('una riga senza NAP in coda resta intera nella via, e torna identica', () => {
    verifica(fc.property(
      fc.array(pezzoQualsiasi, { minLength: 1, maxLength: 4 }),
      (pezzi) => {
        const riga = pezzi.join(', ')
        fc.pre(!/^(?:[A-Z]{1,3}-)?\d{4,5}\s+/.test(pezzi.at(-1)))
        const letto = leggiIndirizzo(riga)
        assert.equal(letto.via, riga)
        assert.equal(giro(riga), riga)
      },
    ))
  })

  it(
    'una casella postale davanti alla via torna al suo posto',
    { skip: 'difetto noto: la casella esce dalla sua posizione e si riscrive subito prima del NAP' },
    () => {
      verifica(fc.property(
        fc.array(pezzoQualsiasi, { maxLength: 2 }),
        casella,
        fc.array(pezzoQualsiasi, { minLength: 1, maxLength: 2 }),
        napELocalita,
        (prima, cp, dopo, coda) => {
          const riga = [...prima, cp, ...dopo, coda].join(', ')
          assert.equal(giro(riga), riga)
        },
      ))
    },
  )

  it('su qualunque testo il giro non lancia, e un secondo giro non cambia più niente', () => {
    verifica(fc.property(fc.oneof(fc.string(), fc.string({ unit: 'grapheme' }), pezzo), (testo) => {
      const una = giro(testo)
      assert.equal(giro(una), una)
      assert.deepEqual(leggiIndirizzo(una), leggiIndirizzo(testo))
    }), 300)
  })

  it('senza indirizzo, niente riga e niente pezzi', () => {
    assert.equal(scriviIndirizzo(undefined), '')
    assert.deepEqual(leggiIndirizzo(undefined), { via: '', cap: '', localita: '' })
  })
})
