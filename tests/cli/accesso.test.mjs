// `regi` e la presentazione: senza chiave non bussa, e a chi non sa rispondere
// con la prova del condotto non manda altro. È la difesa contro una pipe che
// occupa il nome dopo un arresto brutale del registro.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { accessoFinto, lanciatore, nomeDelCondotto } from '../helpers/cli.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-cli-accesso-'))
after(() => rmSync(radice, { recursive: true, force: true }))

const lancia = lanciatore(radice)

/**
 * Una pipe che risponde a ogni riga con `rispondi(richiesta)` e tiene quel che
 * ha ricevuto.
 */
async function pipe (etichetta, rispondi) {
  const dove = nomeDelCondotto(radice, etichetta)
  const ricevute = []
  const server = createServer((presa) => {
    let resto = ''
    presa.on('data', (pezzo) => {
      resto += pezzo.toString('utf8')
      let taglio = resto.indexOf('\n')
      while (taglio >= 0) {
        const richiesta = JSON.parse(resto.slice(0, taglio))
        resto = resto.slice(taglio + 1)
        taglio = resto.indexOf('\n')
        ricevute.push(richiesta)
        const risposta = rispondi(richiesta)
        if (risposta) presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: richiesta.id, ...risposta })}\n`)
      }
    })
    presa.on('error', () => undefined)
  })
  await new Promise((risolvi) => server.listen(dove, risolvi))
  return { dove, ricevute, chiudi: () => new Promise((risolvi) => server.close(() => risolvi())) }
}

describe('regi e la chiave del condotto', () => {
  it('a una pipe che non sa la prova non manda altro, ed esce con 2', async () => {
    const { ambiente } = accessoFinto(radice)
    const impostora = await pipe('impostora', () => ({ result: { prova: '0'.repeat(64) } }))
    try {
      const { codice, errore } = await lancia(['elenco'], { REGISTRO_CONDOTTO: impostora.dove, ...ambiente })
      assert.equal(codice, 2, errore)
      assert.match(errore, /non ha dimostrato di avere la chiave/)
      assert.deepEqual(impostora.ricevute.map((r) => r.method), ['$accedi'])
      // La chiave non viaggia: solo sfida e prova.
      assert.deepEqual(Object.keys(impostora.ricevute[0].params).sort(), ['prova', 'sfida'])
    } finally {
      await impostora.chiudi()
    }
  })

  it('senza il file della chiave non si presenta nemmeno', async () => {
    const vuota = await pipe('senza-chiave', () => ({ result: {} }))
    try {
      const { codice, errore } = await lancia(['elenco'], {
        REGISTRO_CONDOTTO: vuota.dove,
        REGISTRO_CHIAVE: percorso.join(radice, 'non-c-e'),
      })
      assert.equal(codice, 2, errore)
      assert.match(errore, /manca la sua chiave/)
      assert.match(errore, /REGISTRO_CHIAVE/)
      assert.deepEqual(vuota.ricevute, [])
    } finally {
      await vuota.chiudi()
    }
  })

  it('una chiave rifiutata dal registro lo dice, ed esce con 2', async () => {
    const { ambiente } = accessoFinto(radice)
    const severa = await pipe('rifiuta', () => ({
      error: { code: -32000, message: 'no', data: { codice: 'non-permesso' } },
    }))
    try {
      const { codice, errore } = await lancia(['elenco'], { REGISTRO_CONDOTTO: severa.dove, ...ambiente })
      assert.equal(codice, 2, errore)
      assert.match(errore, /ha rifiutato la chiave/)
      assert.deepEqual(severa.ricevute.map((r) => r.method), ['$accedi'])
    } finally {
      await severa.chiudi()
    }
  })
})
