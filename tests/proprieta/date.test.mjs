// L'aritmetica delle date su giorni generati: le date del registro sono
// stringhe `AAAA-MM-GG` senza fuso, e ogni conversione deve tornare al giorno
// da cui è partita. Gli esempi scelti a mano (cambi d'ora, fine mese) stanno in
// `tests/domain/dates.test.mjs`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  aIso,
  dataDalNome,
  dataNelNome,
  daIso,
  differenzaGiorni,
  giornoSettimana,
  inizioSettimana,
  isoValida,
  minutiDaOra,
  oraDaMinuti,
  oraValida,
  primoDelMese,
  settimanaDi,
  sommaGiorni,
  sommaMesi,
  spostaData,
  ultimoDelMese,
} from '../../dist-tests/domain.mjs'
import { fc, giorno, verifica } from '../helpers/proprieta.mjs'

/** Uno spostamento di giorni largo quanto qualche anno scolastico, avanti e indietro. */
const giorni = fc.integer({ min: -3650, max: 3650 })

describe('date: da stringa a giorno e ritorno', () => {
  it('aIso(daIso(g)) è g, e g è valida', () => {
    verifica(fc.property(giorno, (g) => {
      assert.ok(isoValida(g))
      assert.equal(aIso(daIso(g)), g)
    }))
  })

  it('isoValida non lancia mai, e dice vero solo della forma AAAA-MM-GG', () => {
    verifica(fc.property(fc.anything(), (valore) => {
      if (isoValida(valore)) assert.match(valore, /^\d{4}-\d{2}-\d{2}$/)
    }))
  })

  it('una data nel nome di un file si rilegge uguale (secolo Duemila)', () => {
    const delDuemila = giorno.filter((g) => g.startsWith('20'))
    verifica(fc.property(delDuemila, fc.stringMatching(/^[A-Za-z0-9]{1,8}$/), (g, prefisso) => {
      assert.equal(dataDalNome(`${prefisso}_${dataNelNome(g)}.pdf`), g)
    }))
  })
})

describe('date: sommare giorni', () => {
  it('sommare n giorni e contare la distanza ridà n', () => {
    verifica(fc.property(giorno, giorni, (g, n) => {
      const dopo = sommaGiorni(g, n)
      assert.ok(isoValida(dopo))
      assert.equal(differenzaGiorni(g, dopo), n)
    }))
  })

  it('due somme di fila valgono una somma sola, e zero non sposta', () => {
    verifica(fc.property(giorno, giorni, giorni, (g, a, b) => {
      assert.equal(sommaGiorni(sommaGiorni(g, a), b), sommaGiorni(g, a + b))
      assert.equal(sommaGiorni(g, 0), g)
    }))
  })

  it('l’ordine delle stringhe è l’ordine dei giorni', () => {
    verifica(fc.property(giorno, giorni, (g, n) => {
      const dopo = sommaGiorni(g, n)
      assert.equal(Number(dopo > g) - Number(dopo < g), Math.sign(n))
    }))
  })

  it('spostaData senza mesi è sommaGiorni', () => {
    verifica(fc.property(giorno, giorni, (g, n) => {
      assert.equal(spostaData(g, n), sommaGiorni(g, n))
    }))
  })
})

describe('date: settimane e mesi', () => {
  it('sette giorni dopo è lo stesso giorno della settimana', () => {
    verifica(fc.property(giorno, fc.integer({ min: -500, max: 500 }), (g, settimane) => {
      assert.equal(giornoSettimana(sommaGiorni(g, 7 * settimane)), giornoSettimana(g))
    }))
  })

  it('la settimana comincia di lunedì, contiene il giorno e ne ha sette di fila', () => {
    verifica(fc.property(giorno, (g) => {
      const lunedi = inizioSettimana(g)
      assert.equal(giornoSettimana(lunedi), 1)
      const distanza = differenzaGiorni(lunedi, g)
      assert.ok(distanza >= 0 && distanza <= 6)
      const sette = settimanaDi(g)
      assert.equal(sette.length, 7)
      assert.ok(sette.includes(g))
      sette.forEach((giornoDellaSettimana, i) => assert.equal(giornoSettimana(giornoDellaSettimana), i + 1))
    }))
  })

  it('il mese va dal primo all’ultimo, e il giorno dopo l’ultimo è un primo', () => {
    verifica(fc.property(giorno, (g) => {
      const primo = primoDelMese(g)
      const ultimo = ultimoDelMese(g)
      assert.ok(primo <= g && g <= ultimo)
      assert.equal(ultimo.slice(0, 7), g.slice(0, 7))
      assert.equal(sommaGiorni(ultimo, 1).slice(8), '01')
    }))
  })

  it('sommare mesi sposta il mese giusto e non va oltre la fine del mese', () => {
    verifica(fc.property(giorno, fc.integer({ min: -240, max: 240 }), (g, m) => {
      const dopo = sommaMesi(g, m)
      assert.ok(isoValida(dopo))
      const mesiDi = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1
      assert.equal(mesiDi(dopo) - mesiDi(g), m)
      // Il giorno resta, o scende all'ultimo del mese se non c'è.
      const atteso = Math.min(Number(g.slice(8)), Number(ultimoDelMese(dopo).slice(8)))
      assert.equal(Number(dopo.slice(8)), atteso)
    }))
  })
})

describe('date: ore del giorno', () => {
  const ora = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)

  it('oraDaMinuti(minutiDaOra(o)) è o', () => {
    verifica(fc.property(ora, (o) => {
      assert.ok(oraValida(o))
      assert.equal(oraDaMinuti(minutiDaOra(o)), o)
    }))
  })

  it('i minuti fuori dal giorno tornano dentro, anche negativi', () => {
    verifica(fc.property(fc.integer({ min: -100_000, max: 100_000 }), (minuti) => {
      const o = oraDaMinuti(minuti)
      assert.ok(oraValida(o))
      assert.equal(((minutiDaOra(o) - minuti) % 1440 + 1440) % 1440, 0)
    }))
  })
})
