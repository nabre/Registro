// Il trasloco da un registro piatto a una cartella per anno scrive i JSON in
// `.tmp` e poi li rinomina, come il documento in `package.ts`: una corrente
// che va via a metà non lascia un `registro.json` troncato.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-trasloco-anni-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  m = await importaSorgente([
    "export { migraAnni } from './src/data/years.ts'",
    "export { file } from './src/environment/platform.ts'",
    "export { Uri } from './src/environment/uri.ts'",
  ].join('\n'))
})

describe('migraAnni', () => {
  it('ogni JSON passa da un temporaneo sincronizzato, e al suo posto ci arriva con una rinomina', async () => {
    const { migraAnni, file, Uri } = m
    const mucchio = percorso.join(radice, 'mucchio')
    mkdirSync(mucchio, { recursive: true })
    writeFileSync(
      percorso.join(mucchio, 'registro.json'),
      JSON.stringify({ versione: 2, anni: [{ id: 'a1', etichetta: '2025/2026' }], materie: [] }),
    )
    writeFileSync(percorso.join(mucchio, 'classi.json'), '[{"id":"c1","annoId":"a1","nome":"I A"}]')

    const scritture = []
    const scriviVero = file.writeFile
    file.writeFile = function (uri, contenuto, opzioni) {
      scritture.push({ percorso: uri.fsPath, sincronizza: opzioni?.sincronizza === true })
      return scriviVero.call(this, uri, contenuto, opzioni)
    }
    let esito
    try {
      esito = await migraAnni(Uri.file(mucchio))
    } finally {
      file.writeFile = scriviVero
    }

    assert.ok(esito, 'il registro piatto si trasloca')
    const json = scritture.filter((s) => /\.json(\.tmp)?$/.test(s.percorso))
    assert.ok(json.length >= 2, 'registro.json e classi.json dell’anno')
    for (const scrittura of json) {
      assert.match(scrittura.percorso, /\.json\.tmp$/, `scritto diretto: ${scrittura.percorso}`)
      assert.equal(scrittura.sincronizza, true, `senza fsync: ${scrittura.percorso}`)
    }

    // Al posto giusto, interi, e nessun temporaneo rimasto indietro.
    const cartellaDati = percorso.dirname(json.find((s) => /registro\.json\.tmp$/.test(s.percorso)).percorso)
    assert.equal(JSON.parse(readFileSync(percorso.join(cartellaDati, 'registro.json'), 'utf8')).anno.id, 'a1')
    assert.equal(existsSync(percorso.join(cartellaDati, 'classi.json')), true)
    assert.deepEqual(readdirSync(cartellaDati).filter((n) => n.endsWith('.tmp')), [])
  })
})
