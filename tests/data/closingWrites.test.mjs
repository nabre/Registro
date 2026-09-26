// Una scrittura del condotto durante la chiusura dell'anno. `contestoDi(...)
// .modifica` rifiuta già sullo stato vivo, non solo in `Archivio.modifica`:
// altrimenti, se «Chiudi l'anno» fallisce (file tenuto da OneDrive), l'anno
// resterebbe aperto con una classe che nessuno ha scritto.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-chiusura-condotto-'))
const lavoro = percorso.join(radice, 'lavoro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(lavoro, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  m = await importaSorgente([
    "export { contestoDi } from './src/actions/context.ts'",
    "export { Archivio } from './src/data/archive.ts'",
    "export { Pacchetto } from './src/data/package.ts'",
    "export { Uri } from './src/environment/uri.ts'",
    "export { creaAnnoCorrente, creaClasse } from './src/domain/index.ts'",
  ].join('\n'))
})

after(() => rmSync(radice, { recursive: true, force: true }))

describe('una scrittura mentre l’anno si chiude', () => {
  it('è rifiutata senza toccare lo stato, e la chiusura fallita non la trova', async () => {
    const { Archivio, Pacchetto, Uri, contestoDi, creaAnnoCorrente, creaClasse } = m
    const archivio = new Archivio(Uri.file(percorso.join(radice, 'utente')))
    await archivio.apri(null)
    const file = Uri.file(percorso.join(lavoro, 'anno.regi'))
    const anno = await archivio.creaAnno(creaAnnoCorrente(), file)
    archivio.modifica((r) => { r.classi.push(creaClasse(anno.id, 'I MEC A')) }, ['classi'])
    await archivio.salva()

    // Da qui il file risponde EPERM: la chiusura non potrà lasciarlo.
    const salvaVero = Pacchetto.prototype.salva
    Pacchetto.prototype.salva = function (...argomenti) {
      if (this.file.fsPath === file.fsPath) {
        return Promise.reject(Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' }))
      }
      return salvaVero.apply(this, argomenti)
    }
    try {
      archivio.modifica((r) => { r.classi.push(creaClasse(anno.id, 'II MEC B')) }, ['classi'])
      const chiusura = archivio.chiudi()

      // Il contesto nasce a chiusura partita, come una richiesta del condotto
      // arrivata in quel momento.
      const contesto = contestoDi(archivio)
      assert.throws(
        () => contesto.modifica((r) => { r.classi.push(creaClasse(anno.id, 'FANTASMA')) }, ['classi']),
        /si sta chiudendo/,
      )
      assert.equal(await chiusura, false, 'il file bloccato non lascia chiudere')
      assert.deepEqual(
        archivio.registro.classi.map((c) => c.nome),
        ['I MEC A', 'II MEC B'],
        'la scrittura rifiutata non deve restare nello stato',
      )
    } finally {
      Pacchetto.prototype.salva = salvaVero
    }
    assert.equal(await archivio.chiudi(), true)
    archivio.dispose()
  })
})
