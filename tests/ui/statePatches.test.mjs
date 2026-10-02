// Il registro della pagina seguito a differenze (`ui/statePatches.ts`): le
// patch si applicano solo sulla revisione da cui partono, fanno oggetti nuovi
// solo per le collezioni toccate, e fuori sequenza si chiede lo stato intero,
// una volta sola finché non arriva.

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

let SeguitoDelRegistro

before(async () => {
  ({ SeguitoDelRegistro } = await importaSorgente('ui/statePatches.ts'))
})

function registro () {
  return {
    versione: 1,
    anni: [],
    annoCorrenteId: null,
    materie: [],
    impostazioni: { sogliaAssenza: 10 },
    classi: [{ id: 'c1', nome: 'I A', allievi: [] }],
    corsi: [],
    lezioni: [{ id: 'l1', argomento: 'a' }],
    piani: [],
    valutazioni: [],
    fascicoli: [],
    consegne: [],
    check: [],
    progetti: [],
    smistamenti: [],
    coordinate: [],
  }
}

function seguito () {
  const chieste = []
  return { chieste, s: new SeguitoDelRegistro(() => chieste.push(true)) }
}

describe('il registro della pagina a differenze', () => {
  it('le patch in ordine si applicano, e le collezioni non toccate restano le stesse', () => {
    const { chieste, s } = seguito()
    const r0 = s.intero(registro(), 4)
    const r1 = s.differenze(r0, {
      da: 4, revisione: 5, patch: [{ op: 'replace', path: ['classi', 0, 'nome'], value: 'I B' }],
    })
    assert.equal(r1.classi[0].nome, 'I B')
    assert.equal(r0.classi[0].nome, 'I A', 'quello di prima non si tocca')
    assert.notEqual(r1.classi, r0.classi)
    assert.equal(r1.lezioni, r0.lezioni, 'una collezione non toccata è la stessa')
    assert.equal(r1.impostazioni, r0.impostazioni)
    const r2 = s.differenze(r1, {
      da: 5, revisione: 7, patch: [{ op: 'add', path: ['lezioni', 1], value: { id: 'l2', argomento: 'b' } }],
    })
    assert.deepEqual(r2.lezioni.map((l) => l.id), ['l1', 'l2'])
    assert.equal(r2.classi, r1.classi)
    // Senza patch il registro è lo stesso: niente da ricalcolare.
    assert.equal(s.differenze(r2, { da: 7, revisione: 7, patch: [] }), r2)
    assert.equal(chieste.length, 0)
  })

  it('fuori sequenza non si applica niente e si chiede lo stato intero, una volta', () => {
    const { chieste, s } = seguito()
    const r0 = s.intero(registro(), 4)
    const salto = { da: 5, revisione: 6, patch: [{ op: 'replace', path: ['classi', 0, 'nome'], value: 'X' }] }
    assert.equal(s.differenze(r0, salto), null)
    assert.equal(chieste.length, 1)
    // Anche quelle che seguono, finché l'intero non arriva: senza richiederlo.
    assert.equal(s.differenze(r0, { da: 6, revisione: 7, patch: [] }), null)
    assert.equal(s.differenze(r0, { da: 4, revisione: 5, patch: [] }), null)
    assert.equal(chieste.length, 1)
    // Arrivato l'intero, si riparte da lui.
    const r1 = s.intero(registro(), 9)
    const r2 = s.differenze(r1, { da: 9, revisione: 10, patch: [{ op: 'replace', path: ['annoCorrenteId'], value: 'a1' }] })
    assert.equal(r2.annoCorrenteId, 'a1')
    assert.equal(chieste.length, 1)
  })

  it('senza un registro intero, o con patch che non si applicano, si chiede lo stato intero', () => {
    const primo = seguito()
    assert.equal(primo.s.differenze(registro(), { da: 0, revisione: 1, patch: [] }), null)
    assert.equal(primo.chieste.length, 1)

    const secondo = seguito()
    // Un host di prima delle differenze non manda la revisione.
    const r0 = secondo.s.intero(registro(), undefined)
    assert.equal(secondo.s.differenze(r0, { da: 0, revisione: 1, patch: [] }), null)
    assert.equal(secondo.chieste.length, 1)

    const terzo = seguito()
    const r1 = terzo.s.intero(registro(), 2)
    const avvisa = console.warn
    console.warn = () => {}
    try {
      assert.equal(terzo.s.differenze(r1, {
        da: 2, revisione: 3, patch: [{ op: 'replace', path: ['classi', 7, 'allievi', 0, 'nome'], value: 'X' }],
      }), null)
    } finally {
      console.warn = avvisa
    }
    assert.equal(terzo.chieste.length, 1)
    assert.equal(r1.classi.length, 1, 'il registro di prima resta com’era')
  })
})
