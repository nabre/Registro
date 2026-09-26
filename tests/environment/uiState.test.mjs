// Le preferenze dell'interfaccia sul disco, una per pannello, in
// `interfaccia/<pannello>.json` dentro `userData`.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { gestisciStatoInterfaccia: stato } = await importaSorgente('src/environment/uiState.ts')

describe('lo stato dell’interfaccia su disco', () => {
  it('le preferenze sopravvivono alla riapertura e restano separate per pannello', () => {
    const radice = mkdtempSync(join(tmpdir(), 'registro-interfaccia-'))
    try {
      assert.equal(stato(radice, 'registro', 'leggi'), null)
      const preferenze = {
        vista: 'docenteClasse',
        schedaDocente: 'assenze',
        filtroTodoClasse: 'mie',
        sidebarDesktop: false,
        data: '2026-09-14',
      }
      assert.equal(stato(radice, 'registro', 'scrivi', preferenze), true)
      assert.deepEqual(
        JSON.parse(readFileSync(join(radice, 'interfaccia/registro.json'), 'utf8')),
        preferenze,
      )
      assert.deepEqual(stato(radice, 'registro', 'leggi'), preferenze)
      assert.equal(stato(radice, 'proiezione', 'leggi'), null)
      assert.equal(stato(radice, 'registro', 'scrivi', { ...preferenze, vista: 'calendario' }), true)
      assert.equal(stato(radice, 'registro', 'leggi').vista, 'calendario')
      assert.equal(stato(radice, 'registro', 'scrivi', 'non valido'), null)
      assert.equal(stato(radice, 'registro', 'scrivi', { ricerca: 'a'.repeat(256001) }), null)
      assert.equal(stato(radice, 'registro', 'leggi').vista, 'calendario')
      writeFileSync(join(radice, 'interfaccia/registro.json'), '{rotto')
      assert.equal(stato(radice, 'registro', 'leggi'), null)
    } finally {
      rmSync(radice, { recursive: true, force: true })
    }
  })
})
