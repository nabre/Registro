// I nomi che la migrazione dalla versione 1 dà a quel che fa nascere, con le
// regole del resto del registro:
//
//   — il titolo di un corso è «Classe — Materia», come ogni corso creato dopo;
//
//   — «Ed. fisica» e «ed.  fisica» sono la stessa materia (`nomeNormalizzato`).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizzaRegistro } from '../../dist-tests/domain.mjs'

const ANNO = { id: 'a1', inizio: '2025-09-01', fine: '2026-06-30' }

describe('la migrazione dei nomi', () => {
  it('un corso nato dalla migrazione si chiama «Classe — Materia»', () => {
    const registro = normalizzaRegistro({
      anni: [ANNO],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materia: 'Matematica' }],
    })
    assert.deepEqual(registro.corsi.map((c) => c.titolo), ['I MEC A — Matematica'])
  })

  it('la stessa materia scritta in due modi resta una materia sola', () => {
    const registro = normalizzaRegistro({
      anni: [ANNO],
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'I MEC A', materia: 'Ed. fisica' },
        { id: 'c2', annoId: 'a1', nome: 'II MEC A', materia: 'ed.  fisica' },
      ],
    })
    assert.deepEqual(registro.materie.map((m) => m.nome), ['Ed. fisica'])
    assert.equal(registro.corsi.length, 2)
    assert.equal(new Set(registro.corsi.map((c) => c.materiaId)).size, 1)
  })

  it('una materia già nel file è riconosciuta anche con gli accenti diversi', () => {
    const registro = normalizzaRegistro({
      anni: [ANNO],
      materie: [{ id: 'm1', nome: 'Attività pratica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materia: 'attivita  pratica' }],
    })
    assert.deepEqual(registro.materie.map((m) => m.id), ['m1'])
    assert.equal(registro.corsi[0].materiaId, 'm1')
  })
})
