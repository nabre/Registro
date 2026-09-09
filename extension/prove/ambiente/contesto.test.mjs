// Dove l'app va a prendere i propri file.
//
// Una cosa sola, ma è quella che rompe lo smistamento dei PDF nella versione
// impacchettata e in nessun'altra: il worker di pdfjs. Dentro il pacchetto i
// bundle stanno in un archivio asar, e da lì un `import()` di un URL `file:`
// può non saper leggere — il worker si tiene quindi spacchettato, in
// `app.asar.unpacked`. La sostituzione è nello shim, ed è qui perché si possa
// verificare senza costruire un installer e senza avere pdfjs di mezzo.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-contesto-'))

/**
 * La radice si legge una volta sola e resta: la prova la fissa prima di
 * importare lo shim, come farebbe l'applicazione vera all'avvio.
 *
 * È il percorso che `app.getAppPath()` restituisce dentro un pacchetto: la
 * cartella di avvio è l'archivio stesso, e i bundle stanno dentro.
 */
process.env.REGISTRO_APPPATH = percorso.join('C:', 'Programmi', 'Registro', 'resources', 'app.asar')

const { percorsoWorkerPdf } = await import('../../dist-prove/ambiente.mjs')

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
    assert.ok(!/[\/]app\.asar[\/]/.test(trovato), trovato)
  })
})
