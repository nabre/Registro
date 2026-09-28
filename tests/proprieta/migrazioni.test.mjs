// I passi del formato e la normalizzazione, su registri generati guastando i
// campioni di ogni versione (`tests/samples/formato/`). Un documento portato
// alla versione corrente e normalizzato è un punto fermo: normalizzato ancora
// (cioè salvato e riaperto) non cambia. Uno già corrente non si porta.
//
// La versione si legge a runtime (`VERSIONE_DATI`): le prove seguono i passi
// che ci sono, e un campione nuovo entra da sé.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { VERSIONE_DATI, aggiornaFormato, normalizzaRegistro } from '../../dist-tests/domain.mjs'
import { campioni, fc, guastato, suDisco, verifica } from '../helpers/proprieta.mjs'

const CAMPIONI = campioni()

const oggetto = (valore) => (valore && typeof valore === 'object' && !Array.isArray(valore) ? valore : {})

/**
 * Il registro da intestazione e collezioni, come lo compone l'archivio
 * (`registroDa` in `core/dati/archive.ts`): l'intestazione porta anno,
 * materie e impostazioni, ogni altra voce è una collezione.
 */
function registroDaVoci (voci) {
  const testa = oggetto(voci.registro)
  const anno = oggetto(testa.anno)
  const { registro: _testa, ...collezioni } = voci
  return {
    ...collezioni,
    versione: VERSIONE_DATI,
    anni: testa.anno ? [anno] : [],
    annoCorrenteId: typeof anno.id === 'string' ? anno.id : null,
    materie: testa.materie ?? [],
    impostazioni: testa.impostazioni,
  }
}

/** Un campione qualsiasi, con la sua versione, guastato in qualche punto. */
const campioneGuastato = fc.constantFrom(...CAMPIONI).chain(({ versione, voci }) =>
  guastato(voci, { massimo: 8 }).map((guasto) => ({ versione, voci: guasto })),
)

describe('migrazioni: i campioni', () => {
  it('c’è un campione per la versione corrente', () => {
    assert.equal(CAMPIONI.at(-1).versione, VERSIONE_DATI)
  })

  for (const { versione, voci } of CAMPIONI) {
    it(`v${versione} si porta a VERSIONE_DATI senza toccare i dati letti`, () => {
      const prima = structuredClone(voci)
      const esito = aggiornaFormato(voci, versione)
      assert.deepEqual(voci, prima)
      assert.equal(esito.a, VERSIONE_DATI)
      assert.deepEqual(esito.passi.map((passo) => passo.a), Array.from(
        { length: VERSIONE_DATI - versione },
        (_, i) => versione + i + 1,
      ))
    })
  }
})

describe('migrazioni: proprietà', () => {
  it('un documento guastato si porta senza lanciare e senza toccare i dati letti', () => {
    verifica(fc.property(campioneGuastato, ({ versione, voci }) => {
      const prima = structuredClone(voci)
      const esito = aggiornaFormato(voci, versione)
      assert.deepEqual(voci, prima)
      assert.equal(esito.a, VERSIONE_DATI)
    }))
  })

  it('portato e normalizzato, una seconda normalizzazione non cambia niente', () => {
    verifica(fc.property(campioneGuastato, ({ versione, voci }) => {
      const portati = aggiornaFormato(voci, versione).dati
      const una = suDisco(normalizzaRegistro(registroDaVoci(portati)))
      assert.equal(una.versione, VERSIONE_DATI)
      assert.deepEqual(suDisco(normalizzaRegistro(una)), una)
    }))
  })

  it('un documento già corrente, o senza numero, non si porta: stessi dati, nessun passo', () => {
    verifica(fc.property(campioneGuastato, fc.constantFrom(VERSIONE_DATI, null), ({ voci }, versione) => {
      const esito = aggiornaFormato(voci, versione)
      assert.equal(esito.dati, voci)
      assert.deepEqual(esito.passi, [])
      assert.equal(esito.a, VERSIONE_DATI)
    }))
  })

  it('portare due volte è portare una volta', () => {
    verifica(fc.property(campioneGuastato, ({ versione, voci }) => {
      const una = aggiornaFormato(voci, versione).dati
      assert.deepEqual(aggiornaFormato(una, VERSIONE_DATI).dati, una)
    }))
  })

  it('qualunque JSON nelle collezioni si porta senza lanciare', () => {
    const grezzo = fc.dictionary(fc.string(), fc.jsonValue({ maxDepth: 3 }), { maxKeys: 6 })
    verifica(fc.property(grezzo, fc.integer({ min: 1, max: VERSIONE_DATI }), (voci, versione) => {
      aggiornaFormato(voci, versione)
    }))
  })
})
