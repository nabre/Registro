// L'aggiornamento su macOS, dal lato del registro. Lo scambio dei pacchetti
// (`os/macos/aggiornamento.sh`) si prova a mano su un Mac; qui la scelta
// dell'archivio fra quelli di `latest-mac.yml`, che se sbaglia installa
// l'architettura sbagliata, e la forma dello script.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const { archivioPerMac } = await import('../../dist-tests/updateMac.mjs')

const RADICE = fileURLToPath(new URL('../..', import.meta.url))
const SCRIPT = percorso.join(RADICE, 'os', 'macos', 'aggiornamento.sh')

const voce = (url) => ({ url, sha512: 'x' })
const ENTRAMBI = [
  voce('regiklass-1.3.0-arm64.dmg'),
  voce('regiklass-1.3.0-arm64-mac.zip'),
  voce('regiklass-1.3.0-x64.dmg'),
  voce('regiklass-1.3.0-x64-mac.zip'),
]

describe('archivio per macOS', () => {
  it('Apple Silicon prende lo zip arm64', () => {
    assert.equal(archivioPerMac(ENTRAMBI, true)?.url, 'regiklass-1.3.0-arm64-mac.zip')
  })

  it('Intel prende lo zip x64, mai arm64', () => {
    assert.equal(archivioPerMac(ENTRAMBI, false)?.url, 'regiklass-1.3.0-x64-mac.zip')
    assert.equal(archivioPerMac([voce('regiklass-1.3.0-arm64-mac.zip')], false), undefined)
  })

  it('Apple Silicon senza arm64 ripiega sull\'Intel, che gira con Rosetta', () => {
    assert.equal(archivioPerMac([voce('regiklass-1.3.0-x64-mac.zip')], true)?.url, 'regiklass-1.3.0-x64-mac.zip')
  })

  it('il .dmg non è mai l\'archivio', () => {
    assert.equal(archivioPerMac([voce('regiklass-1.3.0-arm64.dmg')], true), undefined)
  })
})

describe('os/macos/aggiornamento.sh', () => {
  const testo = readFileSync(SCRIPT, 'utf8')

  // Con `\r\n` bash legge `pid\r` e il resto va storto su un Mac.
  it('ha righe Unix', () => {
    assert.ok(!testo.includes('\r'), 'lo script ha \\r: .gitattributes o editor')
  })

  it('parte con bash', () => {
    assert.ok(testo.startsWith('#!/bin/bash\n'))
  })
})
