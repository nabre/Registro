// Dove l'app va a prendere i propri file: il worker di pdfjs, nel pacchetto,
// sta in `app.asar.unpacked`, perché da dentro l'asar un `import()` di un URL
// `file:` può non funzionare. La sostituzione è nello shim, e si prova qui
// senza installer.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-contesto-'))

/**
 * La radice si legge una volta sola: la prova la fissa prima di importare lo
 * shim. È il percorso che `app.getAppPath()` dà dentro un pacchetto: la
 * cartella di avvio è l'archivio stesso.
 */
process.env.REGISTRO_APPPATH = percorso.join('C:', 'Programmi', 'Registro', 'resources', 'app.asar')

const { percorsoWorkerPdf } = await import('../../dist-tests/environment.mjs')

describe('il worker di pdfjs', () => {
  it('sta fra i bundle dell’applicazione', () => {
    const trovato = percorsoWorkerPdf()
    assert.ok(trovato.endsWith(percorso.join('dist', 'pdf.worker.mjs')), trovato)
  })

  it('sta fuori dall’archivio asar', () => {
    const trovato = percorsoWorkerPdf()
    assert.ok(trovato.includes('app.asar.unpacked'), trovato)
    // `app.asar.unpacked` contiene `app.asar` come sottostringa: quel che si
    // pretende è che non resti un segmento di percorso di nome `app.asar`.
    assert.ok(!/[/]app\.asar[/]/.test(trovato), trovato)
  })
})
