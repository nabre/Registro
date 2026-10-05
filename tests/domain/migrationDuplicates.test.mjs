// I corsi doppioni scartati dalla migrazione, e chi li nominava. Due corsi per
// la stessa classe+materia: `Migrazione.accogli` tiene il primo, e lezioni,
// valutazioni e piani del secondo passano al corso tenuto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { Migrazione } = await importaSorgente('core/dominio/migration.ts')
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
      piani: [{ id: 'p1', corsoId: 'cor2', prerequisiti: 'x' }],
    })
    assert.equal(registro.lezioni[0].corsoId, 'cor1')
    assert.equal(registro.valutazioni[0].corsoId, 'cor1')
    assert.equal(registro.piani[0].corsoId, 'cor1')
  })
})

describe('i progetti integrati nel doppione', () => {
  /** Due integrazioni dello stesso progetto, una per corso: il doppione e il vincitore. */
  function conDueIntegrazioni (prima, seconda, lezioni = []) {
    return normalizzaRegistro({
      lezioni,
      anni: [],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materiaId: 'm1' }],
      corsi: [
        { id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'uno' },
        { id: 'cor2', classeId: 'c1', materiaId: 'm1', titolo: 'doppione' },
      ],
      progetti: [{
        id: 'prg1',
        titolo: 'Ponte',
        criteri: [{ id: 'crp-1', titolo: 'Misure' }],
        livelli: [{ valore: 'A' }, { valore: 'B' }, { valore: 'C' }],
        integrazioni: [prima, seconda],
      }],
    })
  }

  const delVincitore = {
    corsoId: 'cor1',
    stato: 'in-corso',
    compiti: [{ id: 'cpp-1', titolo: 'Schizzo' }],
    giudizi: [{ id: 'gpp-1', allievoId: 'a1', testo: 'Bene', data: '2025-10-01' }],
    matrice: [
      { allievoId: 'a1', criterioId: 'crp-1', data: '2025-10-01', livello: 'A' },
    ],
  }
  const delDoppione = {
    corsoId: 'cor2',
    stato: 'bozza',
    compiti: [{ id: 'cpp-2', titolo: 'Modello' }],
    giudizi: [{ id: 'gpp-2', allievoId: 'a2', testo: 'Preciso', data: '2025-10-02' }],
    matrice: [
      // La stessa casella del vincitore: vale la sua, come per le spunte del check.
      { allievoId: 'a1', criterioId: 'crp-1', data: '2025-10-01', livello: 'C' },
      { allievoId: 'a2', criterioId: 'crp-1', data: '2025-10-02', livello: 'B' },
    ],
  }

  for (const [come, prima, seconda] of [
    ['il vincitore prima', delVincitore, delDoppione],
    ['il doppione prima', delDoppione, delVincitore],
  ]) {
    it(`le due integrazioni si fondono sul corso che resta (${come})`, () => {
      const registro = conDueIntegrazioni(prima, seconda)
      const [progetto] = registro.progetti
      assert.equal(progetto.integrazioni.length, 1)
      const [integrazione] = progetto.integrazioni
      assert.equal(integrazione.corsoId, 'cor1')
      assert.deepEqual(integrazione.compiti.map((c) => c.id).sort(), ['cpp-1', 'cpp-2'])
      assert.deepEqual(integrazione.giudizi.map((g) => g.id).sort(), ['gpp-1', 'gpp-2'])
      // Fa da superstite l'integrazione che era già sul corso tenuto, in
      // qualunque ordine siano scritte: suoi lo stato e la casella doppia.
      assert.equal(integrazione.stato, 'in-corso')
      const caselle = integrazione.matrice.map((c) => `${c.allievoId} ${c.livello}`).sort()
      assert.deepEqual(caselle, ['a1 A', 'a2 B'])
    })
  }

  it('la casella è il giorno: una cella in un’ora e una senza ora dello stesso giorno ne fanno una', () => {
    const ora = { id: 'lez-1', corsoId: 'cor2', data: '2025-10-01', slot: [] }
    const nellOra = {
      ...delDoppione,
      matrice: [{ allievoId: 'a1', criterioId: 'crp-1', data: '2025-10-01', lezioneId: 'lez-1', livello: 'C' }],
    }
    const [integrazione] = conDueIntegrazioni(delVincitore, nellOra, [ora]).progetti[0].integrazioni
    assert.deepEqual(integrazione.matrice.map((c) => [c.lezioneId ?? null, c.livello]), [[null, 'A']])
  })

  it('due integrazioni scritte a mano sullo stesso corso: vale ancora la prima', () => {
    const registro = conDueIntegrazioni(delVincitore, { ...delDoppione, corsoId: 'cor1' })
    const [integrazione] = registro.progetti[0].integrazioni
    assert.deepEqual(integrazione.compiti.map((c) => c.id), ['cpp-1'])
  })
})
