// I fogli stampati in un'altra lingua, quando se ne va quel che raccontano:
// l'eliminazione cerca anche «Protokolle …» accanto a «Verbali …». I nomi delle
// altre lingue stanno a parte, in `stampatiAltrove`, e non si contano: sono lo
// stesso foglio.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { eliminazione } from '../../dist-tests/domain.mjs'
import { ore, scuolaMinima } from '../helpers/register.mjs'

function registroConUnOra () {
  const { registro, corso } = scuolaMinima()
  const [lezione] = ore(registro, corso, ['2026-09-14'])
  return { registro, lezione }
}

describe('i fogli stampati in un’altra lingua', () => {
  it('l’ora porta via anche il suo verbale in tedesco, francese e inglese', () => {
    const { registro, lezione } = registroConUnOra()
    const esito = eliminazione(registro, { genere: 'lezione', id: lezione.id })

    assert.equal(esito.file.stampati.length, 1)
    assert.match(esito.file.stampati[0], /Verbali/)
    for (const nome of [/Protokolle/, /Procès-verbaux/, /Lesson records/]) {
      assert.ok(esito.file.stampatiAltrove.some((p) => nome.test(p)), `manca ${nome}`)
    }
  })

  it('i nomi delle altre lingue non si contano fra le perdite', () => {
    const { registro, lezione } = registroConUnOra()
    const esito = eliminazione(registro, { genere: 'lezione', id: lezione.id })

    // Lo stesso foglio in quattro nomi è un foglio solo: la domanda ne dice uno.
    assert.ok(esito.perdite.some((riga) => riga.includes('1 foglio già stampato')))
    assert.ok(!esito.file.stampatiAltrove.some((p) => esito.file.stampati.includes(p)))
  })
})
