// `file` dello shim: le tre cose che, sbagliate, rompono il registro
// in silenzio.
//
// Il codice dell'errore, perché `archive.ts` distingue «file mai scritto» da
// «file rotto» solo guardando `FileNotFound`; il rifiuto di `rename` quando la
// destinazione esiste, perché è la sola cosa che impedisce a una migrazione di
// passare sopra dei dati; e il tipo delle voci di una cartella, perché
// `paths.ts` ci separa gli anni dai file.

import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { ErroreFile, GenereFile, Uri, file } from '../../dist-tests/environment.mjs'

const fs = file

let cartella

/** L'uri di un file dentro la cartella di prova. */
function dentro (...parti) {
  return Uri.joinPath(Uri.file(cartella), ...parti)
}

before(async () => {
  cartella = await mkdtemp(percorso.join(tmpdir(), 'registro-fs-'))
})

after(async () => {
  await fs.delete(Uri.file(cartella), { recursive: true }).catch(() => {})
})

describe('gli errori arrivano con il codice che il registro guarda', () => {
  it('un file mai scritto è FileNotFound, non un ENOENT grezzo', async () => {
    const errore = await fs.readFile(dentro('mai-scritto.json')).then(
      () => null,
      (e) => e,
    )

    assert.ok(errore instanceof ErroreFile)
    assert.equal(errore.code, 'FileNotFound')
  })

  it('vale anche per stat, che è come si prova se un file c’è', async () => {
    const errore = await fs.stat(dentro('nemmeno-questo')).then(
      () => null,
      (e) => e,
    )

    assert.equal(errore.code, 'FileNotFound')
  })
})

describe('rename non sovrascrive quando non glielo si dice', () => {
  it('fallisce con FileExists se la destinazione c’è già', async () => {
    await fs.writeFile(dentro('partenza.json'), Buffer.from('{"a":1}'))
    await fs.writeFile(dentro('arrivo.json'), Buffer.from('{"b":2}'))

    const errore = await fs.rename(dentro('partenza.json'), dentro('arrivo.json'), { overwrite: false }).then(
      () => null,
      (e) => e,
    )

    assert.ok(errore instanceof ErroreFile)
    assert.equal(errore.code, 'FileExists')
    // E soprattutto: quel che c'era è ancora lì. È il punto di tutta la prova.
    assert.equal(await readFile(dentro('arrivo.json').fsPath, 'utf8'), '{"b":2}')
  })

  it('con overwrite sovrascrive davvero, che è quel che fa il salvataggio', async () => {
    await fs.writeFile(dentro('nuovo.json'), Buffer.from('{"c":3}'))
    await fs.rename(dentro('nuovo.json'), dentro('arrivo.json'), { overwrite: true })

    assert.equal(await readFile(dentro('arrivo.json').fsPath, 'utf8'), '{"c":3}')
  })
})

describe('readDirectory dice di che genere è ogni voce', () => {
  it('separa i file dalle cartelle', async () => {
    await fs.createDirectory(dentro('anno', '2026-2027', 'dati'))
    await writeFile(dentro('anno', 'registro.json').fsPath, '{}')

    const voci = await fs.readDirectory(dentro('anno'))
    const mappa = new Map(voci)

    assert.equal(mappa.get('registro.json'), GenereFile.File)
    assert.equal(mappa.get('2026-2027'), GenereFile.Directory)
  })

  it('su una cartella che non c’è dà FileNotFound, non un elenco vuoto', async () => {
    const errore = await fs.readDirectory(dentro('cartella-inesistente')).then(
      () => null,
      (e) => e,
    )

    assert.equal(errore.code, 'FileNotFound')
  })
})

describe('le altre operazioni fanno quel che dicono', () => {
  it('writeFile crea le cartelle che mancano, come in VS Code', async () => {
    await fs.writeFile(dentro('mai', 'vista', 'prima', 'nota.txt'), Buffer.from('ciao'))

    assert.equal(await readFile(dentro('mai', 'vista', 'prima', 'nota.txt').fsPath, 'utf8'), 'ciao')
  })

  it('copy con overwrite falso non passa sopra a niente', async () => {
    await fs.writeFile(dentro('origine.txt'), Buffer.from('origine'))
    await fs.writeFile(dentro('esistente.txt'), Buffer.from('esistente'))

    const errore = await fs.copy(dentro('origine.txt'), dentro('esistente.txt')).then(
      () => null,
      (e) => e,
    )

    assert.equal(errore.code, 'FileExists')
    assert.equal(await readFile(dentro('esistente.txt').fsPath, 'utf8'), 'esistente')
  })

  it('delete con useTrash toglie il file lo stesso', async () => {
    await fs.writeFile(dentro('da-buttare.txt'), Buffer.from('via'))
    await fs.delete(dentro('da-buttare.txt'), { useTrash: true })

    const errore = await fs.stat(dentro('da-buttare.txt')).then(
      () => null,
      (e) => e,
    )
    assert.equal(errore.code, 'FileNotFound')
  })

  it('stat dice il tipo e la dimensione', async () => {
    await fs.writeFile(dentro('misurato.txt'), Buffer.from('dodici byte'))
    const dati = await fs.stat(dentro('misurato.txt'))

    assert.equal(dati.type, GenereFile.File)
    assert.equal(dati.size, 11)
    assert.ok(dati.mtime > 0)
  })
})
