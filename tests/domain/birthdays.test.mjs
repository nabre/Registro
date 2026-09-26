// I compleanni delle persone in formazione: il giorno della festa (col 29
// febbraio che tre anni su quattro non c'è) e quanti anni si compiono, perché
// i diciotto contano.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  anniCompiuti,
  compleanniDelGiorno,
  compleanniPerGiorno,
  creaAllievo,
  creaClasse,
  fraseCompleanno,
  ricorrenza,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** La scuola minima, con le tre date di nascita che servono alle prove. */
function scuola () {
  const base = scuolaMinima()
  base.rossi.dataNascita = '2008-10-19'
  base.bianchi.dataNascita = '2009-10-19'
  base.verdi.dataNascita = '2008-02-29'
  return base
}

describe('il giorno in cui si festeggia', () => {
  it('è lo stesso giorno e lo stesso mese, nell’anno chiesto', () => {
    assert.equal(ricorrenza('2008-10-19', 2026), '2026-10-19')
  })

  it('il 29 febbraio si festeggia il 28, quando febbraio non arriva al 29', () => {
    assert.equal(ricorrenza('2008-02-29', 2027), '2027-02-28')
  })

  it('e resta il 29 negli anni che ce l’hanno', () => {
    assert.equal(ricorrenza('2008-02-29', 2028), '2028-02-29')
  })

  it('una data storta non produce un giorno', () => {
    assert.equal(ricorrenza('non è una data', 2027), null)
  })
})

describe('chi compie gli anni in un giorno', () => {
  it('sono quelli nati quel giorno e quel mese, e nessun altro', () => {
    const { registro, anno, rossi, bianchi } = scuola()

    const trovati = compleanniDelGiorno(registro, anno.id, '2026-10-19')

    assert.deepEqual(
      trovati.map((c) => c.allievoId).sort(),
      [rossi.id, bianchi.id].sort(),
    )
  })

  it('gli anni sono quelli che si compiono, non quelli passati dalla nascita', () => {
    const { registro, anno, rossi } = scuola()

    const suo = compleanniDelGiorno(registro, anno.id, '2026-10-19').find(
      (c) => c.allievoId === rossi.id,
    )

    assert.equal(suo.eta, 18)
    assert.equal(fraseCompleanno(suo), 'Rossi Maria compie 18 anni')
  })

  it('un giorno qualsiasi non ha compleanni', () => {
    const { registro, anno } = scuola()

    assert.deepEqual(compleanniDelGiorno(registro, anno.id, '2026-10-20'), [])
  })

  it('chi si è ritirato non compare più: il calendario parla di chi è in aula', () => {
    const { registro, anno, rossi, bianchi } = scuola()
    rossi.attivo = false

    const trovati = compleanniDelGiorno(registro, anno.id, '2026-10-19')

    assert.deepEqual(trovati.map((c) => c.allievoId), [bianchi.id])
  })

  it('chi non ha una data di nascita non porta una festa senza giorno', () => {
    const { registro, anno, rossi, bianchi } = scuola()
    delete bianchi.dataNascita

    const trovati = compleanniDelGiorno(registro, anno.id, '2026-10-19')

    assert.deepEqual(trovati.map((c) => c.allievoId), [rossi.id])
  })

  it('le classi archiviate restano fuori, come le loro ore', () => {
    const { registro, anno, classe } = scuola()
    classe.archiviata = true

    assert.deepEqual(compleanniDelGiorno(registro, anno.id, '2026-10-19'), [])
  })

  it('un’età che non torna si tace, invece di scrivere un numero storto', () => {
    const { registro, anno, rossi } = scuola()
    rossi.dataNascita = '2030-10-19'

    const suo = compleanniDelGiorno(registro, anno.id, '2026-10-19').find(
      (c) => c.allievoId === rossi.id,
    )

    assert.equal(suo.eta, null)
    assert.equal(fraseCompleanno(suo), 'Rossi Maria compie gli anni')
  })

  it('con il filtro per classe si vedono solo i compleanni di quella classe', () => {
    const { registro, anno, classe } = scuola()
    const altra = creaClasse(anno.id, 'II MEC B')
    const neri = creaAllievo('Neri', 'Sara')
    neri.dataNascita = '2007-10-19'
    altra.allievi.push(neri)
    registro.classi.push(altra)

    const tutte = compleanniDelGiorno(registro, anno.id, '2026-10-19')
    const sola = compleanniDelGiorno(registro, anno.id, '2026-10-19', classe.id)

    assert.equal(tutte.length, 3)
    assert.deepEqual([...new Set(sola.map((c) => c.classeId))], [classe.id])
  })
})

describe('i compleanni di un periodo', () => {
  it('stanno nella mappa sotto il giorno in cui cadono', () => {
    const { registro, anno } = scuola()

    const per = compleanniPerGiorno(registro, anno.id, '2026-10-01', '2026-10-31')

    assert.deepEqual([...per.keys()], ['2026-10-19'])
    assert.equal(per.get('2026-10-19').length, 2)
  })

  it('i giorni senza compleanni non compaiono', () => {
    const { registro, anno } = scuola()

    const per = compleanniPerGiorno(registro, anno.id, '2026-11-01', '2026-11-30')

    assert.equal(per.size, 0)
  })

  it('un periodo a cavallo di capodanno prende la ricorrenza dell’anno giusto', () => {
    const { registro, anno, verdi } = scuola()
    verdi.dataNascita = '2009-01-07'

    const per = compleanniPerGiorno(registro, anno.id, '2026-12-20', '2027-01-10')

    assert.deepEqual([...per.keys()], ['2027-01-07'])
  })

  it('dice quel che dice il giorno per giorno, il 29 febbraio compreso', () => {
    const { registro, anno, verdi } = scuola()

    const per = compleanniPerGiorno(registro, anno.id, '2027-02-01', '2027-02-28')

    assert.deepEqual(
      per.get('2027-02-28').map((c) => c.allievoId),
      compleanniDelGiorno(registro, anno.id, '2027-02-28').map((c) => c.allievoId),
    )
    assert.equal(per.get('2027-02-28')[0].allievoId, verdi.id)
  })

  it('un periodo al rovescio non inventa niente', () => {
    const { registro, anno } = scuola()

    assert.equal(compleanniPerGiorno(registro, anno.id, '2026-10-31', '2026-10-01').size, 0)
  })
})


describe('gli anni compiuti', () => {
  it('non conta l’anno che deve ancora arrivare', () => {
    // Nata a ottobre: a settembre ne ha ancora diciassette.
    assert.equal(anniCompiuti('2008-10-19', '2026-09-18'), 17)
    assert.equal(anniCompiuti('2008-10-19', '2026-10-18'), 17)
  })

  it('il giorno del compleanno l’anno è compiuto', () => {
    assert.equal(anniCompiuti('2008-10-19', '2026-10-19'), 18)
    assert.equal(anniCompiuti('2008-10-19', '2026-10-20'), 18)
  })

  it('il 29 febbraio non sballa il conto', () => {
    // Si festeggia il 28, ma al primo marzo di un anno non bisestile gli anni sono
    // compiuti.
    assert.equal(anniCompiuti('2008-02-29', '2027-02-28'), 18)
    assert.equal(anniCompiuti('2008-02-29', '2027-03-01'), 19)
  })

  it('una data che non torna non dice niente', () => {
    assert.equal(anniCompiuti('2030-01-01', '2026-09-18'), null)
    assert.equal(anniCompiuti('', '2026-09-18'), null)
    assert.equal(anniCompiuti('2008-10-19', 'non una data'), null)
  })
})
