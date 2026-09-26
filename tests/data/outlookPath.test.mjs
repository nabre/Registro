// Il percorso di Outlook dal registro di Windows arriva da fuori ed è quel che
// si fa partire: stessa guardia di `dictation.ts` e `mtmd.ts`, assoluto e su
// Windows `.exe` (un relativo si risolverebbe nella cartella del documento, un
// `.bat` è una riga di comando).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { outlookAccettabile } = await importaSorgente('src/data/outlook.ts')

describe('outlookAccettabile', () => {
  it('rifiuta un percorso relativo', () => {
    assert.equal(outlookAccettabile('OUTLOOK.EXE'), false)
    assert.equal(outlookAccettabile('.\\OUTLOOK.EXE'), false)
    assert.equal(outlookAccettabile('sotto/outlook'), false)
  })

  it('su Windows vuole un .exe', { skip: process.platform !== 'win32' }, () => {
    const cartella = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\'
    assert.equal(outlookAccettabile(`${cartella}OUTLOOK.EXE`), true)
    assert.equal(outlookAccettabile(`${cartella}outlook.exe`), true)
    assert.equal(outlookAccettabile(`${cartella}outlook.bat`), false)
    assert.equal(outlookAccettabile(`${cartella}outlook.cmd`), false)
    assert.equal(outlookAccettabile(`${cartella}outlook.ps1`), false)
    assert.equal(outlookAccettabile(`${cartella}Outlook.lnk`), false)
  })

  it('su macOS un .app assoluto va bene', { skip: process.platform !== 'darwin' }, () => {
    assert.equal(outlookAccettabile('/Applications/Microsoft Outlook.app'), true)
  })
})
