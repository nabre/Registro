// Prove del router, di `foglie()`, del `linkDiretto` e del `chiamante()`.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-router-')

let api
let archivio

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, dal: '2026-09-01', registra: true }))
})

after(() => smonta(radice, archivio))

describe('alberoProcedure / router', () => {
  it('costruisce l’albero delle procedure per tutte le procedure registrate', () => {
    const albero = api.alberoProcedure(api.TUTTE)
    assert.ok(albero)
    assert.ok(albero.ore)
    assert.ok(albero.registro)
    assert.ok(albero.documenti)
  })

  it('verifica che percorso e nome coincidano', () => {
    const valida = {
      nome: 'test.area.azione',
      versione: 1,
      genere: 'lettura',
      titolo: () => 'Test',
      ingresso: { convalida: () => ({ value: {} }) },
      uscita: { convalida: () => ({ value: {} }) },
      idempotente: true,
      esegui: () => ({}),
    }

    const albero = api.alberoProcedure([valida])
    assert.equal(albero.test.area.azione, valida)

    const alberoErrato = {
      test: {
        area: {
          sbagliato: valida,
        },
      },
    }

    assert.throws(
      () => api.foglie(alberoErrato),
      /non coincide/,
    )
  })

  it('foglie() estrae tutte le coppie [nome, procedura]', () => {
    const albero = api.alberoProcedure(api.TUTTE)
    const estratti = api.foglie(albero)
    assert.ok(estratti.length >= api.TUTTE.length)
    for (const [nome, p] of estratti) {
      assert.equal(nome, p.nome)
    }
  })
})

describe('linkDiretto e chiamante', () => {
  it('linkDiretto esegue le chiamate passandole al nucleo', async () => {
    const link = api.linkDiretto(archivio)
    assert.equal(link.nome, 'diretto')
    assert.equal(typeof link.versione, 'number')

    const res = await link.chiama('registro.riassunto', {})
    assert.equal(res.ok, true)
    assert.ok(res.dati)
  })

  it('chiamante inoltra la chiamata ad albero via link.chiama', async () => {
    const albero = api.alberoProcedure(api.TUTTE)
    const link = api.linkDiretto(archivio)
    const reg = api.chiamante(albero, link)

    const res = await reg.registro.riassunto({})
    assert.equal(res.ok, true)
    assert.ok(res.dati.anno)
  })
})
