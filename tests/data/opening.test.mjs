// Un file dentro il documento può venire da chiunque abbia scritto il `.regi`
// (una cartella condivisa, una mail): «apri» non deve diventare «esegui».
// `Scheda.pdf.exe` risolto dal programma associato è un eseguibile lanciato
// senza Mark-of-the-Web, quindi senza l'avviso di SmartScreen. Si apre solo
// quel che è in lista; il resto si mostra nella cartella, segnato come venuto
// da fuori perché un doppio clic passi comunque da SmartScreen.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { èApribile, segnaComeVenutoDaFuori } = await importaSorgente('core/dati/opening.ts')

describe('èApribile', () => {
  it('non apre gli eseguibili, anche travestiti o fuori da ogni elenco nero', () => {
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
      // Quelli che la vecchia lista nera lasciava passare.
      'guida.chm',
      'script.ws',
      'avvio.jnlp',
      'pagina.mht',
      'pagina.mhtml',
      'compito.xlsm',
      'lettera.docm',
      'senza-estensione',
    ]) {
      assert.equal(èApribile(nome), false, nome)
    }
  })

  it('apre i documenti di scuola', () => {
    for (const nome of [
      'risorse/p1/Scheda.pdf',
      'C:\\docs\\verifica 1.docx',
      'foto.JPG',
      'tabella.xlsx',
      'appunti.txt',
      'presenze.csv',
      'lezione.md',
      'bozza.eml',
      'presentazione.odp',
      'cartella.exe/file.pdf',
    ]) {
      assert.equal(èApribile(nome), true, nome)
    }
  })
})

describe('segnaComeVenutoDaFuori', { skip: process.platform !== 'win32' && 'solo Windows' }, () => {
  const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-motw-'))
  after(() => rmSync(cartella, { recursive: true, force: true }))

  it('scrive la zona Internet nel flusso Zone.Identifier', async () => {
    const file = percorso.join(cartella, 'Scheda.pdf.exe')
    writeFileSync(file, 'MZ')
    await segnaComeVenutoDaFuori(file)
    assert.match(readFileSync(`${file}:Zone.Identifier`, 'latin1'), /ZoneId=3/)
    assert.equal(readFileSync(file, 'latin1'), 'MZ', 'il contenuto resta quello')
  })

  it('non fallisce se il file non c’è', async () => {
    await assert.doesNotReject(segnaComeVenutoDaFuori(percorso.join(cartella, 'manca.exe')))
  })
})
