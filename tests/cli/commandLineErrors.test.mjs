// La riga di comando:
//
//   1. `--json` seguito da un elenco, o una parola in più dopo il nome della
//      procedura, è un errore d'uso, non una chiamata con `{}`;
//   2. un campo elenco accetta JSON (`["a","b"]`) e `""` è l'elenco vuoto;
//   3. il registro che chiude dopo `$schema` non lascia la chiamata appesa: si
//      esce 2 («il registro non risponde»). La corsa la prende la prova con la
//      presa finta su `conversazione`, quella col processo guarda l'esito;
//   4. `schema` e `chiama` senza nome escono 1 (errore d'uso) anche a registro
//      chiuso;
//   5. `--campo=valore`, per i valori che cominciano con `--`.

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { condottoFinto, lanciatore, nomeDelCondotto } from '../helpers/cli.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-cli-'))

after(() => rmSync(radice, { recursive: true, force: true }))

const lancia = lanciatore(radice)

const SCHEMA_ECO = {
  type: 'object',
  properties: {
    cerca: { type: 'string' },
    ids: { type: 'array', items: { type: 'string' } },
    numeri: { type: 'array', items: { type: 'number' } },
  },
}

describe('le parole e i valori della riga di comando', () => {
  let finto

  before(async () => { finto = await condottoFinto({ radice, schema: SCHEMA_ECO }) })
  after(() => finto.chiudi())

  const eco = (...argomenti) => finto.eco(...argomenti)

  it('--json seguito da un elenco è un errore d’uso, non un ingresso vuoto', async () => {
    const prima = finto.chiamate.length
    const { codice, errore } = await eco('--json', '[{"a":1}]')
    assert.equal(codice, 1, errore)
    assert.match(errore, /l’ingresso è sempre un oggetto/)
    assert.equal(finto.chiamate.length, prima, 'la procedura non deve partire')
  })

  it('lo stesso con --json=[…]', async () => {
    const { codice, errore } = await eco('--json=[1,2]')
    assert.equal(codice, 1, errore)
    assert.match(errore, /l’ingresso è sempre un oggetto/)
  })

  it('una parola in più dopo il nome della procedura è un errore d’uso', async () => {
    const prima = finto.chiamate.length
    const { codice, errore } = await eco('rossi')
    assert.equal(codice, 1, errore)
    assert.match(errore, /Parole in più/)
    assert.match(errore, /rossi/)
    assert.equal(finto.chiamate.length, prima, 'la procedura non deve partire')
  })

  it('--json seguito da un valore che non è un oggetto non passa in silenzio', async () => {
    const { codice } = await eco('--json', '3')
    assert.equal(codice, 1)
  })

  it('un elenco scritto in JSON si legge in JSON', async () => {
    const { codice, dati, errore } = await eco('--ids', '["a,b","c"]', '--numeri', '[1, 2.5]')
    assert.equal(codice, 0, errore)
    assert.deepEqual(dati, { ids: ['a,b', 'c'], numeri: [1, 2.5] })
  })

  it('un elenco vuoto è l’elenco vuoto', async () => {
    const { codice, dati, errore } = await eco('--ids', '')
    assert.equal(codice, 0, errore)
    assert.deepEqual(dati, { ids: [] })
  })

  it('un elenco con le virgole resta com’era', async () => {
    const { dati } = await eco('--ids', 'a, b', '--numeri', '1,2')
    assert.deepEqual(dati, { ids: ['a', 'b'], numeri: [1, 2] })
  })

  it('un elenco che sembra JSON e non lo è si rifiuta', async () => {
    const { codice, errore } = await eco('--ids', '["a"')
    assert.equal(codice, 1)
    assert.match(errore, /sembra un elenco JSON/)
  })

  it('--campo=valore passa anche un valore che comincia con --', async () => {
    const { codice, dati, errore } = await eco('--cerca=--rossi', '--ids=a,b')
    assert.equal(codice, 0, errore)
    assert.deepEqual(dati, { cerca: '--rossi', ids: ['a', 'b'] })
  })

  it('--campo=valore tiene gli uguali del valore', async () => {
    const { dati } = await eco('--cerca=a=b')
    assert.deepEqual(dati, { cerca: 'a=b' })
  })

  it('un --campo ripetuto prende l’ultimo, e lo dice', async () => {
    const { codice, dati, errore } = await eco('--cerca', 'rossi', '--cerca', 'bianchi')
    assert.equal(codice, 0, errore)
    assert.deepEqual(dati, { cerca: 'bianchi' })
    assert.match(errore, /--cerca è scritto più volte: vale l’ultimo/)
  })
})

describe('il registro che chiude fra lo schema e la chiamata', () => {
  let finto

  it('una domanda su una presa già chiusa torna null subito, non resta appesa', async () => {
    const { conversazione } = await import('../../cli/registro.mjs')
    const presa = new EventEmitter()
    presa.setEncoding = () => undefined
    presa.write = () => true
    presa.end = () => undefined
    const condotto = conversazione(presa)
    presa.emit('close')
    let appesa
    const tetto = new Promise((risolvi) => {
      appesa = setTimeout(() => risolvi('appesa'), 500)
    })
    const esito = await Promise.race([condotto.chiedi('prova.eco', {}), tetto])
    clearTimeout(appesa)
    assert.equal(esito, null)
  })

  before(async () => {
    finto = await condottoFinto({ radice, schema: SCHEMA_ECO, chiudeDopoSchema: true })
  })
  after(() => finto.chiudi())

  it('esce 2, «il registro non risponde», e non 0 muto', async () => {
    const { codice, uscita, errore } = await lancia(
      ['chiama', 'prova.eco', '--cerca', 'rossi'], { REGISTRO_CONDOTTO: finto.dove })
    assert.equal(codice, 2, errore)
    assert.equal(uscita, '')
    assert.match(errore, /non risponde sul condotto/)
  })
})

describe('gli errori d’uso a registro chiuso', () => {
  const chiuso = { REGISTRO_CONDOTTO: nomeDelCondotto(radice, 'chiuso') }

  it('«schema» senza nome è un errore d’uso, non «condotto spento»', async () => {
    const { codice, errore } = await lancia(['schema'], chiuso)
    assert.equal(codice, 1, errore)
    assert.match(errore, /Serve il nome della procedura: registro schema <procedura>/)
    assert.doesNotMatch(errore, /non risponde/)
  })

  it('lo stesso per «chiama» senza nome', async () => {
    const { codice, errore } = await lancia(['chiama'], chiuso)
    assert.equal(codice, 1, errore)
    assert.match(errore, /Serve il nome della procedura: registro chiama <procedura>/)
  })

  it('e per le parole in più', async () => {
    const { codice } = await lancia(['elenco', 'tutto'], chiuso)
    assert.equal(codice, 1)
  })

  it('un nome dato, a registro chiuso, resta «condotto spento» con 2', async () => {
    const { codice, errore } = await lancia(['schema', 'corsi.elenco'], chiuso)
    assert.equal(codice, 2, errore)
    assert.match(errore, /non risponde sul condotto/)
  })
})
