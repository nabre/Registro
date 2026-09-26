// I passi del formato: l'elenco che porta un documento vecchio alla forma di
// oggi, e il modo di percorrerlo. La prima prova è la guardia: se
// `VERSIONE_DATI` sale, qui nasce il passo verso quel numero. Il giro completo
// lo racconta la skill `formato`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PASSI_DEL_FORMATO,
  VERSIONE_DATI,
  aggiornaFormato,
  fraseVersionePiuRecente,
  raccontaAggiornamento,
  versionePiuRecente,
} from '../../dist-tests/domain.mjs'

describe('l’elenco dei passi del formato', () => {
  it('va dalla 2 a VERSIONE_DATI, un numero alla volta, senza buchi', () => {
    const numeri = PASSI_DEL_FORMATO.map((passo) => passo.a)
    const attesi = Array.from({ length: VERSIONE_DATI - 1 }, (_, i) => i + 2)
    assert.deepEqual(
      numeri,
      attesi,
      `VERSIONE_DATI è ${VERSIONE_DATI}, ma i passi arrivano a ${numeri.at(-1)}: aggiungi in ` +
        'src/domain/upgrades.ts il passo che porta al numero nuovo (skill «formato»)',
    )
  })

  it('ogni passo dice che cosa cambia', () => {
    for (const passo of PASSI_DEL_FORMATO) {
      assert.ok(passo.cambia.trim().length > 10, `il passo che porta a ${passo.a} non dice che cosa cambia`)
    }
  })
})

describe('percorrere i passi', () => {
  /** Tre passi finti: rinomina un campo, poi niente da spostare, poi un'unità che cambia. */
  const FINTI = [
    { a: 2, cambia: 'rinomina durata in minuti', porta: (d) => ({ ...d, minuti: d.durata, durata: undefined }) },
    { a: 3, cambia: 'niente da spostare, un campo nuovo' },
    { a: 4, cambia: 'i minuti diventano secondi', porta: (d) => ({ ...d, secondi: d.minuti * 60, minuti: undefined }) },
  ]

  it('li fa in ordine, dalla versione del file in poi', () => {
    const esito = aggiornaFormato({ durata: 2 }, 1, FINTI)
    assert.equal(esito.dati.secondi, 120)
    assert.equal(esito.da, 1)
    assert.equal(esito.a, 4)
    assert.deepEqual(esito.passi.map((p) => p.a), [2, 3, 4])

    const daMetà = aggiornaFormato({ minuti: 3 }, 3, FINTI)
    assert.deepEqual(daMetà.passi.map((p) => p.a), [4])
    assert.equal(daMetà.dati.secondi, 180)
  })

  it('non tocca i dati letti', () => {
    const letti = { durata: 2, dentro: { x: 1 } }
    const copia = structuredClone(letti)
    aggiornaFormato(letti, 1, FINTI)
    assert.deepEqual(letti, copia)
  })

  it('un documento già di oggi, o senza numero, torna com’è', () => {
    const letti = { minuti: 1 }
    assert.equal(aggiornaFormato(letti, 4, FINTI).dati, letti)
    assert.equal(aggiornaFormato(letti, 4, FINTI).passi.length, 0)
    assert.equal(aggiornaFormato(letti, null, FINTI).passi.length, 0)
    assert.equal(aggiornaFormato(letti, VERSIONE_DATI).passi.length, 0)
  })

  it('racconta che cosa è cambiato, passo per passo', () => {
    const esito = aggiornaFormato({ durata: 2 }, 2, FINTI)
    assert.equal(
      raccontaAggiornamento(esito),
      'dal formato 2 al 4: niente da spostare, un campo nuovo; i minuti diventano secondi',
    )
  })
})

describe('un anno da un registro più recente', () => {
  it('la frase che lo rifiuta si riconosce da chi la mostra', () => {
    for (const cosa of ['dati', 'formato']) {
      const versione = { file: '2027-2028.regi', cosa, delFile: 9, quiFinoA: VERSIONE_DATI }
      assert.deepEqual(versionePiuRecente(fraseVersionePiuRecente(versione)), versione)
    }
    // Con il prefisso che le mette chi la mostra, e dentro un testo più lungo.
    const detta = `Regiclass: ${fraseVersionePiuRecente({ file: 'a.regi', cosa: 'dati', delFile: 7, quiFinoA: 6 })}`
    assert.equal(versionePiuRecente(detta)?.file, 'a.regi')
    assert.equal(versionePiuRecente('Non riesco ad aprire a.regi'), null)
  })
})
