// Il check arriva sul disco e ne torna. In `data/archive.ts` la lettura mette
// insieme a mano le collezioni e `contenutoDi` torna `undefined` per un nome
// dimenticato: il compilatore non lo vede. Si apre un documento vero, si
// spunta, si chiude e si riapre.
//
// Il campione del repo, senza `check.json`, si apre con la lista vuota e senza
// sentirsi da salvare.

import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { creaCheck } from '../../dist-tests/domain.mjs'
import { Uri } from '../../dist-tests/environment.mjs'
import { Pacchetto } from '../../dist-tests/package.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-check-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

const CAMPIONE = percorso.join(
  percorso.dirname(fileURLToPath(import.meta.url)),
  '..',
  'samples',
  '2026-2027.regi',
)

let api

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  api = await import('../../dist-tests/api.mjs')
})

after(() => {
  rmSync(radice, { recursive: true, force: true })
})

describe('il check nel documento', () => {
  it('un documento di prima, senza check.json, si apre con la lista vuota', async () => {
    const copia = percorso.join(dati, 'campione.regi')
    copyFileSync(CAMPIONE, copia)
    const archivio = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))

    const registro = await archivio.apri(api.Uri.file(copia))

    assert.ok(registro.classi.length > 0, 'il campione doveva aprirsi con le sue classi')
    assert.deepEqual(registro.check, [])
    await archivio.chiudi()
    // Una lista vuota non è una migrazione: il file non va creato.
    const pacchetto = await Pacchetto.apri(Uri.file(copia))
    assert.equal(pacchetto.testo('check.json'), null)
  })

  it('le spunte scritte si ritrovano riaprendo', async () => {
    const copia = percorso.join(dati, 'spuntato.regi')
    copyFileSync(CAMPIONE, copia)
    const primo = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))
    const letto = await primo.apri(api.Uri.file(copia))
    const corso = letto.corsi[0]
    const allievo = letto.classi.find((c) => c.id === corso.classeId).allievi[0]
    const lezione = letto.lezioni.find((l) => l.corsoId === corso.id)

    const lista = creaCheck(corso.id, [{ id: 'clc-quaderno', titolo: 'Quaderno' }])
    lista.spunte.push({
      allievoId: allievo.id,
      colonnaId: 'clc-quaderno',
      lezioneId: lezione.id,
      data: lezione.data,
      fattaIl: '2026-09-10T10:00:00.000Z',
    })
    primo.modifica((r) => {
      r.check.push(lista)
    }, ['check'])
    await primo.chiudi()

    const secondo = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))
    const riletto = await secondo.apri(api.Uri.file(copia))

    assert.equal(riletto.check.length, 1)
    assert.equal(riletto.check[0].id, lista.id)
    assert.deepEqual(riletto.check[0].spunte, lista.spunte)
    await secondo.chiudi()

    // E sta nel suo file, non dentro i corsi.
    const pacchetto = await Pacchetto.apri(Uri.file(copia))
    assert.equal(JSON.parse(pacchetto.testo('check.json'))[0].id, lista.id)
  })
})
