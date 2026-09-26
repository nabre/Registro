// I calendari ICS del documento, come si leggono dal file: un documento col
// calendario unico (`{ sorgente, regole }`) si riapre senza perderlo, e il
// nome di un calendario da indirizzo non si porta dietro il gettone d'accesso.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { nomeDaOrigine, normalizzaCalendario } from '../../dist-tests/domain.mjs'

describe('normalizzaCalendario', () => {
  it('il formato di prima diventa il primo calendario, senza copia', () => {
    const letto = normalizzaCalendario({
      sorgente: 'C:\\Scuola\\orario sede.ics',
      regole: [{ id: 'rgc-prova-0001', testo: 'DIC4a CP', corsoId: null }],
    })
    assert.equal(letto.calendari.length, 1)
    assert.equal(letto.calendari[0].origine, 'C:\\Scuola\\orario sede.ics')
    assert.equal(letto.calendari[0].nome, 'orario sede')
    assert.equal(letto.calendari[0].copiatoIl, undefined)
    assert.match(letto.calendari[0].id, /^ics-/)
    assert.equal(letto.regole.length, 1)
  })

  it('più calendari restano, e un id doppio se ne fa uno nuovo', () => {
    const letto = normalizzaCalendario({
      calendari: [
        { id: 'ics-a', nome: 'Sede', origine: 'https://esempio.invalid/a.ics', copiatoIl: '2026-09-01T08:00:00Z' },
        { id: 'ics-a', nome: 'Laboratori', origine: 'C:\\lab.ics' },
      ],
      regole: [],
    })
    assert.equal(letto.calendari.length, 2)
    assert.equal(letto.calendari[0].copiatoIl, '2026-09-01T08:00:00Z')
    assert.notEqual(letto.calendari[1].id, 'ics-a')
  })

  it('un calendario senza origine si butta, e senza niente non resta il campo', () => {
    assert.equal(normalizzaCalendario({ calendari: [{ id: 'ics-a', nome: 'Vuoto', origine: '' }], regole: [] }), undefined)
    assert.equal(normalizzaCalendario({ sorgente: '', regole: [] }), undefined)
  })

  it('senza nome prende quello del file, o del sito', () => {
    const letto = normalizzaCalendario({
      calendari: [{ id: 'ics-a', nome: ' ', origine: 'webcal://calendario.scuola.invalid/segreto123/orario.ics' }],
      regole: [],
    })
    assert.equal(letto.calendari[0].nome, 'calendario.scuola.invalid')
  })
})

describe('nomeDaOrigine', () => {
  it('di un indirizzo dice solo il sito: il resto del percorso porta il gettone', () => {
    const nome = nomeDaOrigine('https://calendar.invalid/ical/abc%40x/private-deadbeef/basic.ics')
    assert.equal(nome, 'calendar.invalid')
    assert.ok(!nome.includes('deadbeef'))
  })

  it('di un file dice il nome senza estensione', () => {
    assert.equal(nomeDaOrigine('D:/orari/laboratori.ics'), 'laboratori')
    assert.equal(nomeDaOrigine('D:\\orari\\supplenze.ICS'), 'supplenze')
  })
})
