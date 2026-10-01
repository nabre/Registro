// I passi del formato: l'elenco che porta un documento vecchio alla forma di
// oggi, e il modo di percorrerlo. La prima prova è la guardia: se
// `VERSIONE_DATI` sale, qui nasce il passo verso quel numero. Il giro completo
// lo racconta la skill `formato`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ErroreVersionePiuRecente,
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
        'core/dominio/upgrades.ts il passo che porta al numero nuovo (skill «formato»)',
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

describe('il passo 4: le note dei piani nei prerequisiti', () => {
  // Solo il passo vero, da un documento del formato 3: gli altri non toccano i piani.
  const porta = (piani) => aggiornaFormato({ registro: {}, piani }, 3).dati.piani

  it('accoda le note ai prerequisiti, dopo una riga vuota e con l’etichetta', () => {
    const [piano] = porta([{ id: 'p1', prerequisiti: 'Le frazioni', note: 'Portare la calcolatrice' }])
    assert.deepEqual(piano, { id: 'p1', prerequisiti: 'Le frazioni\n\nNote: Portare la calcolatrice' })
  })

  it('senza prerequisiti, le note li fanno da sole', () => {
    const [piano] = porta([{ id: 'p1', note: '  Fogli quadrettati\ne righello  ' }])
    assert.deepEqual(piano, { id: 'p1', prerequisiti: 'Note: Fogli quadrettati\ne righello' })
  })

  it('note vuote o assenti: i prerequisiti restano com’erano, e la chiave se ne va', () => {
    const piani = porta([
      { id: 'p1', prerequisiti: 'Le frazioni', note: '' },
      { id: 'p2', prerequisiti: 'Le frazioni', note: '   ' },
      { id: 'p3', prerequisiti: 'Le frazioni' },
    ])
    assert.deepEqual(piani, [
      { id: 'p1', prerequisiti: 'Le frazioni' },
      { id: 'p2', prerequisiti: 'Le frazioni' },
      { id: 'p3', prerequisiti: 'Le frazioni' },
    ])
  })

  it('un documento senza piani, o con voci strane, passa senza danno', () => {
    assert.equal(aggiornaFormato({ registro: {} }, 3).dati.piani, undefined)
    assert.deepEqual(porta([null, 'x']), [null, 'x'])
  })

  it('un documento già del formato 4 non ripassa da qui', () => {
    const letti = { registro: {}, piani: [{ id: 'p1', note: 'resta' }] }
    assert.equal(aggiornaFormato(letti, 4).dati.piani[0].note, 'resta')
  })
})

describe('un anno da un registro più recente', () => {
  it('la frase che lo rifiuta si riconosce da chi la mostra', () => {
    for (const cosa of ['dati', 'formato']) {
      const versione = { file: '2027-2028.regi', cosa, delFile: 9, quiFinoA: VERSIONE_DATI }
      assert.deepEqual(versionePiuRecente(fraseVersionePiuRecente(versione)), versione)
    }
    // Con il prefisso che le mette chi la mostra, e dentro un testo più lungo.
    const detta = `Regiklass: ${fraseVersionePiuRecente({ file: 'a.regi', cosa: 'dati', delFile: 7, quiFinoA: 6 })}`
    assert.equal(versionePiuRecente(detta)?.file, 'a.regi')
    assert.equal(versionePiuRecente('Non riesco ad aprire a.regi'), null)
  })

  it('ErroreVersionePiuRecente incapsula il dettaglio e compone la frase corretta', () => {
    const dettaglio = { file: '2028-2029.regi', cosa: 'dati', delFile: 10, quiFinoA: VERSIONE_DATI }
    const errore = new ErroreVersionePiuRecente(dettaglio)

    assert.equal(errore.name, 'ErroreVersionePiuRecente')
    assert.deepEqual(errore.dettaglio, dettaglio)
    assert.equal(errore.message, fraseVersionePiuRecente(dettaglio))
    assert.deepEqual(versionePiuRecente(errore), dettaglio)
  })

  it('versionePiuRecente riconosce oggetti con dettaglio o istanze di ErroreVersionePiuRecente', () => {
    const dettaglioFormato = { file: 'futuro.regi', cosa: 'formato', delFile: 5, quiFinoA: 1 }
    const errore = new ErroreVersionePiuRecente(dettaglioFormato)
    assert.deepEqual(versionePiuRecente(errore), dettaglioFormato)

    const oggettoConDettaglio = { dettaglio: dettaglioFormato }
    assert.deepEqual(versionePiuRecente(oggettoConDettaglio), dettaglioFormato)
  })

  it('versionePiuRecente riconosce un Error generico con la frase nel messaggio', () => {
    const dettaglio = { file: '2027-2028.regi', cosa: 'formato', delFile: 3, quiFinoA: 1 }
    const generico = new Error(`Regiklass: ${fraseVersionePiuRecente(dettaglio)}`)
    assert.deepEqual(versionePiuRecente(generico), dettaglio)
  })

  it('versionePiuRecente restituisce null per valori non pertinenti', () => {
    assert.equal(versionePiuRecente(null), null)
    assert.equal(versionePiuRecente(undefined), null)
    assert.equal(versionePiuRecente(123), null)
    assert.equal(versionePiuRecente({}), null)
    assert.equal(versionePiuRecente({ dettaglio: 'invalido' }), null)
    assert.equal(versionePiuRecente(new Error('Errore generico non di versione')), null)
  })
})
