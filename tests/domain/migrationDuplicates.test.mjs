// I corsi doppioni scartati dalla migrazione, e chi li nominava. Due corsi per
// la stessa classe+materia: `Migrazione.accogli` tiene il primo, e lezioni,
// valutazioni e piani del secondo passano al corso tenuto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { Migrazione } = await importaSorgente('src/domain/migration.ts')
const { normalizzaRegistro } = await import('../../dist-tests/domain.mjs')

/** Le due fabbriche, ridotte a quel che basta: qui non nasce niente di nuovo. */
const fabbriche = {
  materia: (grezzo) => ({ id: `m-${grezzo.nome}`, nome: grezzo.nome }),
  corso: (grezzo) => ({ id: `nuovo-${grezzo.classeId}`, titolo: '', ...grezzo }),
}

describe('i corsi doppioni', () => {
  it('lo scartato rimanda al vincitore', () => {
    const migrazione = new Migrazione([{ id: 'm1', nome: 'Matematica' }], [], fabbriche)
    migrazione.accogli({ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'uno' })
    migrazione.accogli({ id: 'cor2', classeId: 'c1', materiaId: 'm1', titolo: 'doppione' })

    assert.deepEqual(migrazione.corsi.map((c) => c.id), ['cor1'])
    assert.equal(migrazione.corsoVero('cor2'), 'cor1')
    assert.equal(migrazione.corsoVero('cor1'), 'cor1')
    assert.equal(migrazione.corsoVero('altro'), 'altro')
  })

  it('un oggetto letto da disco passa sul vincitore, e gli altri restano com’erano', () => {
    const migrazione = new Migrazione([{ id: 'm1', nome: 'Matematica' }], [], fabbriche)
    migrazione.accogli({ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'uno' })
    migrazione.accogli({ id: 'cor2', classeId: 'c1', materiaId: 'm1', titolo: 'doppione' })

    assert.deepEqual(migrazione.conCorsoVero({ id: 'l1', corsoId: 'cor2' }), { id: 'l1', corsoId: 'cor1' })
    const buona = { id: 'l2', corsoId: 'cor1' }
    assert.equal(migrazione.conCorsoVero(buona), buona)
    assert.equal(migrazione.conCorsoVero(null), null)
  })

  it('le lezioni del doppione seguono il corso che resta', () => {
    const registro = normalizzaRegistro({
      anni: [],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materiaId: 'm1' }],
      corsi: [
        { id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'uno' },
        { id: 'cor2', classeId: 'c1', materiaId: 'm1', titolo: 'doppione' },
      ],
      lezioni: [{ id: 'l1', corsoId: 'cor2', data: '2025-09-15', slot: [] }],
      valutazioni: [{ id: 'v1', corsoId: 'cor2', data: '2025-09-20' }],
      piani: [{ id: 'p1', corsoId: 'cor2', note: 'x' }],
    })
    assert.equal(registro.lezioni[0].corsoId, 'cor1')
    assert.equal(registro.valutazioni[0].corsoId, 'cor1')
    assert.equal(registro.piani[0].corsoId, 'cor1')
  })
})
