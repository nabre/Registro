// Prove per i comandi `aspetta`, `guarda`, l'opzione `--aspetta` e i timeout differenziati.

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'
import { CLI, lanciatore, nomeDelCondotto } from '../helpers/cli.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-cli-aspetta-guarda-'))

after(() => rmSync(radice, { recursive: true, force: true }))

const lancia = lanciatore(radice)

describe('il comando aspetta e l’opzione --aspetta', () => {
  it('il comando aspetta ritenta finché il condotto non si accende e torna 0', async () => {
    const dove = nomeDelCondotto(radice, 'ag-aspetta')

    let server = null
    const timer = setTimeout(() => {
      server = createServer((presa) => {
        presa.on('data', (pezzo) => {
          const riga = pezzo.toString('utf8')
          if (riga.includes('$versione')) {
            presa.write(`${JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: { api: 1, applicazione: '1.0.0', permessi: { lettura: true, scrittura: true } },
            })}\n`)
          }
        })
      })
      server.listen(dove)
    }, 200)

    try {
      const { codice, uscita, errore } = await lancia(['aspetta'], { REGISTRO_CONDOTTO: dove })
      assert.equal(codice, 0, errore)
      assert.match(uscita, /pronto|risponde/i)
    } finally {
      clearTimeout(timer)
      if (server) server.close()
    }
  })

  it('l’opzione --aspetta su un altro comando attende prima di eseguire', async () => {
    const dove = nomeDelCondotto(radice, 'ag-opzione-aspetta')

    let server = null
    const timer = setTimeout(() => {
      server = createServer((presa) => {
        presa.on('data', (pezzo) => {
          const riga = pezzo.toString('utf8')
          if (riga.includes('$versione')) {
            presa.write(`${JSON.stringify({
              jsonrpc: '2.0',
              id: JSON.parse(riga.trim()).id,
              result: { api: 1, applicazione: '1.0.0', permessi: { lettura: true, scrittura: true } },
            })}\n`)
          }
        })
      })
      server.listen(dove)
    }, 150)

    try {
      const { codice, errore } = await lancia(['stato', '--aspetta'], { REGISTRO_CONDOTTO: dove })
      assert.equal(codice, 0, errore)
    } finally {
      clearTimeout(timer)
      if (server) server.close()
    }
  })
})

describe('il comando guarda', () => {
  it('riceve lo streaming del giornale dal condotto', async () => {
    const dove = nomeDelCondotto(radice, 'ag-guarda')

    const server = createServer((presa) => {
      presa.on('data', (pezzo) => {
        const req = JSON.parse(pezzo.toString('utf8').trim())
        if (req.method === '$guarda') {
          presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { ok: true } })}\n`)
          setTimeout(() => {
            presa.write(`${JSON.stringify({
              jsonrpc: '2.0',
              method: '$giornale',
              params: { procedura: 'corso.presenze', ok: true, durataMs: 14, modifiche: 1, origine: 'ipc' },
            })}\n`)
          }, 100)
        }
      })
    })

    await new Promise((r) => server.listen(dove, r))

    try {
      const figlio = spawn(process.execPath, [CLI, 'guarda'], {
        env: { ...process.env, REGISTRO_CONDOTTO: dove },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let uscita = ''
      figlio.stdout.on('data', (pezzo) => {
        uscita += pezzo.toString('utf8')
        if (uscita.includes('corso.presenze')) {
          figlio.kill()
        }
      })

      await new Promise((r) => figlio.on('close', r))
      assert.match(uscita, /corso\.presenze/)
      assert.match(uscita, /14ms/)
    } finally {
      server.close()
    }
  })
})
