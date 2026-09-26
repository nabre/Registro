// Come si legge quel che il modello ha risposto. Una tabella si conserva riga
// per riga e cella per cella (una colonna contata male disegna una cella in
// meno, e sembra colpa del modello); e quel che **non** è una tabella non
// diventa una griglia storta: un percorso con delle barre in una frase resta
// una frase.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { blocchi, pezzi } from '../../dist-tests/answerFormat.mjs'

/** Il testo di una riga, rimesso insieme: alle prove dei blocchi basta questo. */
const scritto = (riga) => riga.map((pezzo) => pezzo.testo).join('')

describe('i pezzi di una riga', () => {
  it('riconosce il grassetto e il codice, e lascia il resto testo', () => {
    const fuori = pezzi('La **4a** ha perso `corso.presenze` ore')
    assert.deepEqual(fuori.map((p) => p.testo), ['La ', '4a', ' ha perso ', 'corso.presenze', ' ore'])
    assert.equal(fuori[1].forte, true)
    assert.equal(fuori[3].codice, true)
  })

  // Un asterisco battuto per sbaglio non ingoia la frase che segue.
  it('un marcatore lasciato aperto resta scritto com’è', () => {
    const fuori = pezzi('di **quanto si parla')
    assert.equal(scritto(fuori), 'di **quanto si parla')
    assert.equal(fuori.some((p) => p.forte), false)
  })
})

describe('i blocchi di una risposta', () => {
  it('una risposta di due frasi resta un paragrafo solo', () => {
    const fuori = blocchi('Non ci sono assenze.\nL’ora è stata svolta.')
    assert.equal(fuori.length, 1)
    assert.equal(fuori[0].genere, 'paragrafo')
    // Gli a capo del modello restano: le due frasi sono due righe.
    assert.equal(fuori[0].righe.length, 2)
  })

  it('tiene una tabella riga per riga e cella per cella', () => {
    const fuori = blocchi([
      'Ecco la classe:',
      '',
      '| Persona | Assenze | Su |',
      '| --- | ---: | ---: |',
      '| Rossi Mario | 4 | 36 |',
      '| Bianchi Ada | 12 | 36 |',
      '',
      'Le altre non ne hanno.',
    ].join('\n'))

    assert.deepEqual(fuori.map((b) => b.genere), ['paragrafo', 'tabella', 'paragrafo'])
    const tabella = fuori[1]
    assert.deepEqual(tabella.intestazione.map(scritto), ['Persona', 'Assenze', 'Su'])
    assert.equal(tabella.righe.length, 2)
    assert.deepEqual(tabella.righe[1].map(scritto), ['Bianchi Ada', '12', '36'])
  })

  // I numeri allineati a destra si confrontano a occhio.
  it('incolonna a destra quel che il separatore dice, e i numeri da sé', () => {
    const fuori = blocchi([
      '| Corso | Ore | Nota |',
      '| --- | --- | --- |',
      '| I MEC A — Matematica | 36 | va bene |',
      '| II MEC B — Fisica | 8 | — |',
    ].join('\n'))
    assert.deepEqual(fuori[0].allineamenti, ['sinistra', 'destra', 'sinistra'])
  })

  it('pareggia sull’intestazione una riga più corta, invece di sfilacciarla', () => {
    const fuori = blocchi([
      '| Persona | Assenze | Su |',
      '| --- | --- | --- |',
      '| Rossi Mario | 4 |',
    ].join('\n'))
    assert.equal(fuori[0].righe[0].length, 3)
    assert.equal(scritto(fuori[0].righe[0][2]), '')
  })

  // Senza il separatore non è una tabella: è una frase che cita un percorso.
  it('una riga con delle barre non diventa una griglia', () => {
    const fuori = blocchi('Sta in esportazioni | archivio | e basta.')
    assert.equal(fuori.length, 1)
    assert.equal(fuori[0].genere, 'paragrafo')
  })

  it('raccoglie gli elenchi, puntati e numerati', () => {
    const puntato = blocchi('- primo\n- secondo')
    assert.equal(puntato[0].genere, 'elenco')
    assert.equal(puntato[0].ordinato, false)
    assert.deepEqual(puntato[0].voci.map(scritto), ['primo', 'secondo'])

    const numerato = blocchi('1. apri la pagina\n2. premi «Salva»')
    assert.equal(numerato[0].ordinato, true)
    assert.equal(numerato[0].voci.length, 2)
  })

  it('un titoletto è un blocco suo, e il testo dopo non ci finisce dentro', () => {
    const fuori = blocchi('## Assenze\nSono quattro.')
    assert.deepEqual(fuori.map((b) => b.genere), ['titolo', 'paragrafo'])
    assert.equal(scritto(fuori[0].pezzi), 'Assenze')
  })

  // Quel che arriva dal modello resta testo: chi lo disegna costruisce nodi, e un
  // tag resta le parole che sono.
  it('l’HTML scritto in una risposta resta testo', () => {
    const fuori = blocchi('<script>ruba()</script>')
    assert.equal(fuori[0].genere, 'paragrafo')
    assert.equal(scritto(fuori[0].righe[0]), '<script>ruba()</script>')
  })
})
