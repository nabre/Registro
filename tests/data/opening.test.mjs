// Un file dentro il documento può venire da chiunque abbia scritto il `.regi`
// (una cartella condivisa, una mail): «apri» non deve diventare «esegui».
// `Scheda.pdf.exe` risolto dal programma associato è un eseguibile lanciato
// senza Mark-of-the-Web, quindi senza l'avviso di SmartScreen.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { èEseguibile } = await importaSorgente('core/dati/opening.ts')

describe('èEseguibile', () => {
  it('riconosce gli eseguibili, anche travestiti', () => {
    for (const nome of [
      'risorse/p1/Scheda.pdf.exe',
      'C:\\docs\\lettera.LNK',
      'x.hta',
      'script.bat',
      'installa.msi',
      'collegamento.url',
      'avvio.cmd',
      'codice.js',
      'Scheda.exe.',
      'Scheda.exe .',
      '/Users/a/App.app',
      'lancia.desktop',
    ]) {
      assert.equal(èEseguibile(nome), true, nome)
    }
  })

  it('lascia aprire i documenti', () => {
    for (const nome of [
      'risorse/p1/Scheda.pdf',
      'C:\\docs\\verifica 1.docx',
      'foto.JPG',
      'tabella.xlsx',
      'appunti.txt',
      'senza-estensione',
      'cartella.exe/file.pdf',
    ]) {
      assert.equal(èEseguibile(nome), false, nome)
    }
  })
})
