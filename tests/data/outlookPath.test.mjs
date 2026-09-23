// Il percorso di Outlook scritto a mano nelle impostazioni.
//
// È quel che il registro fa partire, e arriva da un file JSON che qualunque
// programma sulla macchina può riscrivere. `dictation.ts` e `mtmd.ts` gli
// mettono davanti la stessa guardia — assoluto, e su Windows `.exe` — e qui
// mancava: un percorso relativo si risolveva nella cartella di lavoro, che è
// quella del documento aperto, e un `.bat` è una riga di comando.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from './bundleDiProva.mjs'

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
