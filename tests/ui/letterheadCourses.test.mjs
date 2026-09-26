// I corsi delle carte intestate, nella sezione Intestazione: un intervallo
// preso al contrario, un trascinamento con una selezione dimenticata su
// un'altra carta, un corso di un altro anno nel conto. A schermo non si
// vedrebbero, e i fogli uscirebbero con la testata sbagliata.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  codificaCorsi,
  daTrascinare,
  decodificaCorsi,
  gruppiDellaCarta,
  ordineAVista,
  selezionaCon,
} from '../../dist-tests/letterheadCourses.mjs'

const classi = [
  { id: 'c2', nome: '2B' },
  { id: 'c1', nome: '1A' },
  { id: 'cv', nome: '4Z' },
]
const materie = [
  { id: 'm1', nome: 'Matematica' },
  { id: 'm2', nome: 'Fisica' },
  { id: 'm3', nome: 'Storia' },
]
const corsi = [
  { id: 'k1', classeId: 'c1', materiaId: 'm1', titolo: '1A — Matematica' },
  { id: 'k2', classeId: 'c1', materiaId: 'm2', titolo: '1A — Fisica' },
  { id: 'k3', classeId: 'c2', materiaId: 'm3', titolo: '2B — Storia' },
  { id: 'kv', classeId: 'cv', materiaId: 'm1', titolo: '4Z — Matematica' },
]
const anagrafe = { corsi, classi, materie }
const visibili = new Set(['k1', 'k2', 'k3'])

describe('gruppiDellaCarta', () => {
  it('raggruppa per classe, classi e materie in ordine di nome', () => {
    const { gruppi, altri } = gruppiDellaCarta(['k3', 'k1', 'k2'], anagrafe, visibili)
    assert.deepEqual(gruppi.map((g) => g.nome), ['1A', '2B'])
    assert.deepEqual(gruppi[0].corsi.map((c) => c.etichetta), ['Fisica', 'Matematica'])
    assert.equal(gruppi[0].corsi[0].nome, '1A · Fisica')
    assert.equal(altri, 0)
  })

  it('scrive la sigla della materia sulla pastiglia, e tiene il nome intero per il suggerimento', () => {
    const conSigla = { ...anagrafe, materie: materie.map((m) => m.id === 'm1' ? { ...m, sigla: ' MAT ' } : m) }
    const { gruppi } = gruppiDellaCarta(['k1', 'k2'], conSigla, visibili)
    const matematica = gruppi[0].corsi.find((c) => c.id === 'k1')
    assert.equal(matematica.etichetta, 'MAT')
    assert.equal(matematica.nome, '1A · Matematica')
    // Senza sigla resta il nome della materia.
    assert.equal(gruppi[0].corsi.find((c) => c.id === 'k2').etichetta, 'Fisica')
  })

  it('conta a parte i corsi di altri anni, e quelli che non esistono più', () => {
    const { gruppi, altri } = gruppiDellaCarta(['k1', 'kv', 'sparito'], anagrafe, visibili)
    assert.deepEqual(ordineAVista(gruppi), ['k1'])
    assert.equal(altri, 2)
  })

  it('una carta vuota non ha gruppi', () => {
    assert.deepEqual(gruppiDellaCarta([], anagrafe, visibili), { gruppi: [], altri: 0 })
  })
})

describe('selezionaCon', () => {
  const ordine = ['a', 'b', 'c', 'd', 'e']
  const vuota = { scelti: new Set(), ancora: null }

  it('il clic semplice sceglie quello solo', () => {
    const dopo = selezionaCon({ scelti: new Set(['a', 'b']), ancora: 'a' }, 'c', 'solo', ordine)
    assert.deepEqual([...dopo.scelti], ['c'])
    assert.equal(dopo.ancora, 'c')
  })

  it('Ctrl aggiunge e toglie', () => {
    const una = selezionaCon(vuota, 'b', 'aggiungi', ordine)
    const due = selezionaCon(una, 'd', 'aggiungi', ordine)
    assert.deepEqual([...due.scelti].sort(), ['b', 'd'])
    const tolta = selezionaCon(due, 'b', 'aggiungi', ordine)
    assert.deepEqual([...tolta.scelti], ['d'])
  })

  it('Maiuscolo prende l’intervallo, in tutte e due le direzioni, e tiene l’ancora', () => {
    const inizio = selezionaCon(vuota, 'd', 'solo', ordine)
    const indietro = selezionaCon(inizio, 'b', 'intervallo', ordine)
    assert.deepEqual([...indietro.scelti].sort(), ['b', 'c', 'd'])
    assert.equal(indietro.ancora, 'd')
    const avanti = selezionaCon(inizio, 'e', 'intervallo', ordine)
    assert.deepEqual([...avanti.scelti].sort(), ['d', 'e'])
  })

  it('Maiuscolo senza ancora, o con l’ancora su un’altra carta, sceglie quello solo', () => {
    assert.deepEqual([...selezionaCon(vuota, 'c', 'intervallo', ordine).scelti], ['c'])
    const altrove = { scelti: new Set(['x']), ancora: 'x' }
    assert.deepEqual([...selezionaCon(altrove, 'c', 'intervallo', ordine).scelti], ['c'])
  })
})

describe('daTrascinare', () => {
  it('trascinando un corso scelto partono tutti gli scelti', () => {
    const partono = daTrascinare(['b'], new Set(['a', 'b', 'c']))
    assert.equal(partono[0], 'b')
    assert.deepEqual([...partono].sort(), ['a', 'b', 'c'])
  })

  it('trascinando un corso non scelto parte lui solo', () => {
    assert.deepEqual(daTrascinare(['z'], new Set(['a', 'b'])), ['z'])
  })

  it('una classe parte intera, con la selezione solo se è tutta scelta', () => {
    assert.deepEqual(daTrascinare(['a', 'b'], new Set(['a'])), ['a', 'b'])
    assert.deepEqual([...daTrascinare(['a', 'b'], new Set(['a', 'b', 'q']))].sort(), ['a', 'b', 'q'])
  })
})

describe('codificaCorsi / decodificaCorsi', () => {
  it('fa andata e ritorno', () => {
    assert.deepEqual(decodificaCorsi(codificaCorsi(['k1', 'k2'])), ['k1', 'k2'])
  })

  it('quel che arriva da fuori non diventa un elenco di corsi', () => {
    assert.deepEqual(decodificaCorsi('ciao'), [])
    assert.deepEqual(decodificaCorsi('{"a":1}'), [])
    assert.deepEqual(decodificaCorsi('["k1", 3, null]'), ['k1'])
  })
})
