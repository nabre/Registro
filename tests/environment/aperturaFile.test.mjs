// «Apri» su un file del documento non deve diventare «esegui»: il file può
// venire da chi ha scritto il `.regi` (cartella condivisa, mail) e la copia su
// disco non ha Mark-of-the-Web. Un eseguibile si mostra soltanto nella sua
// cartella, senza passare dal programma di sistema. E se il sistema non sa
// aprire un documento, lo si mostra lo stesso invece di non fare niente.
// Il riconoscimento delle estensioni è in `tests/data/opening.test.mjs`.

import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import { bancoElectron } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

// Al posto del processo figlio: si annota chi si lancerebbe, e l'esito lo
// sceglie la prova con `globalThis.__esitoApertura`. Il resto del modulo è quello vero.
const PROCESSI_FINTI = `
export * from 'child_process'
export function execFile (comando, argomenti, finito) {
  ;(globalThis.__lanciati ??= []).push({ comando, argomenti })
  setImmediate(() => finito(globalThis.__esitoApertura ?? null))
}
`

const { apriConIlSistema, Uri } = await importaSorgente(`export { apriConIlSistema } from './core/dati/opening.ts'
export { Uri } from 'apparato'
`, { finti: { 'node:child_process': PROCESSI_FINTI } })

const CARTELLA = percorso.join(tmpdir(), 'registro-apertura')

beforeEach(() => {
  globalThis.__lanciati = []
  globalThis.__esitoApertura = null
  bancoElectron.fuori.length = 0
})

/** Le cartelle mostrate con «Mostra nella cartella». */
function mostrati () {
  return bancoElectron.fuori.filter((voce) => voce.cosa === 'mostra').map((voce) => voce.dove)
}

describe('apriConIlSistema', () => {
  it('un documento si consegna al programma del sistema, col percorso come argomento a sé', async () => {
    const file = Uri.file(percorso.join(CARTELLA, 'verifica & correzione.pdf'))
    assert.equal(await apriConIlSistema(file), true)
    assert.equal(globalThis.__lanciati.length, 1)
    assert.equal(globalThis.__lanciati[0].argomenti.at(-1), file.fsPath)
    assert.deepEqual(mostrati(), [])
  })

  it('un eseguibile non si lancia: si mostra nella cartella e basta', async () => {
    for (const nome of ['Scheda.pdf.exe', 'avvio.bat', 'collegamento.lnk', 'Scheda.exe.']) {
      bancoElectron.fuori.length = 0
      const file = Uri.file(percorso.join(CARTELLA, nome))
      assert.equal(await apriConIlSistema(file), true, nome)
      assert.deepEqual(globalThis.__lanciati, [], `${nome}: nessun processo`)
      assert.deepEqual(mostrati(), [file.fsPath], nome)
    }
  })

  it('se il sistema non lo apre, il documento si mostra nella cartella', async () => {
    globalThis.__esitoApertura = new Error('nessun programma associato')
    const file = Uri.file(percorso.join(CARTELLA, 'lettera.pdf'))
    assert.equal(await apriConIlSistema(file), true)
    assert.equal(globalThis.__lanciati.length, 1)
    assert.deepEqual(mostrati(), [file.fsPath])
  })
})
