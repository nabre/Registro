// Il lettore di PDF, provato su PDF veri.
//
// Sono le prove che coprono i due modi in cui lo smistamento può rompersi in
// silenzio: un testo letto male — e allora nessuno viene riconosciuto — e un
// ritaglio sbagliato, che è peggio, perché archivia nel fascicolo di qualcuno
// le pagine di qualcun altro. Qui i PDF si costruiscono al volo, così la prova
// non dipende da un file che qualcuno deve ricordarsi di tenere nel repository.

import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'
import { describe, it } from 'node:test'

import { PDFDocument, StandardFonts } from 'pdf-lib'

import { contaPagine, estraiPagine, immaginePagina, impostaWorker, testoPagine } from '../dist/pdf.mjs'

impostaWorker(pathToFileURL(fileURLToPath(new URL('../dist/pdf.worker.mjs', import.meta.url))).href)

/** Un PDF con una pagina per nome, come quello che manda la segreteria. */
async function pagelle (nomi) {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (const nome of nomi) {
    const pagina = documento.addPage([595, 842])
    pagina.drawText('Pagella — DIC4a', { x: 60, y: 780, size: 16, font })
    pagina.drawText(`Allievo: ${nome}`, { x: 60, y: 740, size: 12, font })
  }
  return documento.save()
}

/** Un PNG in scala di grigi, scritto a mano: serve da finta scansione. */
function pngGrigio (larghezza, altezza) {
  const riga = larghezza
  const grezzo = Buffer.alloc((riga + 1) * altezza)
  for (let y = 0; y < altezza; y += 1) {
    grezzo[y * (riga + 1)] = 0
    for (let x = 0; x < riga; x += 1) grezzo[y * (riga + 1) + 1 + x] = (x * 7 + y * 3) % 256
  }

  const tabella = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabella[n] = c >>> 0
  }
  const crc = (dati) => {
    let c = 0xffffffff
    for (const byte of dati) c = tabella[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const pezzo = (nome, dati) => {
    const testa = Buffer.alloc(8)
    testa.writeUInt32BE(dati.length, 0)
    testa.write(nome, 4, 'ascii')
    const coda = Buffer.alloc(4)
    coda.writeUInt32BE(crc(Buffer.concat([testa.subarray(4), dati])), 0)
    return Buffer.concat([testa, dati, coda])
  }

  const intestazione = Buffer.alloc(13)
  intestazione.writeUInt32BE(larghezza, 0)
  intestazione.writeUInt32BE(altezza, 4)
  intestazione[8] = 8
  intestazione[9] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pezzo('IHDR', intestazione),
    pezzo('IDAT', deflateSync(grezzo)),
    pezzo('IEND', Buffer.alloc(0)),
  ])
}

/** Un PDF fatto di una sola fotografia: la scansione tipica. */
async function scansione () {
  const documento = await PDFDocument.create()
  const immagine = await documento.embedPng(pngGrigio(300, 400))
  const pagina = documento.addPage([595, 842])
  pagina.drawImage(immagine, { x: 0, y: 0, width: 595, height: 842 })
  return documento.save()
}

describe('leggere un PDF', () => {
  it('conta le pagine e ne legge il testo, una per una', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])

    assert.equal(await contaPagine(byte), 2)
    const testo = await testoPagine(byte)
    assert.equal(testo.length, 2)
    assert.ok(testo[0].includes('Rossi Mario'))
    assert.ok(testo[1].includes('Bianchi Luca'))
  })

  it('gli stessi byte si rileggono più volte', async () => {
    // pdfjs si prende il buffer che riceve e lo svuota: senza la copia interna,
    // questa seconda lettura direbbe che non è un PDF.
    const byte = await pagelle(['Rossi Mario'])
    await testoPagine(byte)
    assert.equal((await testoPagine(byte))[0].includes('Rossi Mario'), true)
  })

  it('una pagina scansionata non ha testo: è il segnale che serve l’OCR', async () => {
    const testo = await testoPagine(await scansione())
    assert.deepEqual(testo, [''])
  })
})

describe('ritagliare un PDF', () => {
  it('la fetta contiene le pagine chieste e nient’altro', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca', 'Verdi Anna'])
    const fetta = await estraiPagine(byte, 2, 3)

    assert.equal(await contaPagine(fetta), 2)
    const testo = await testoPagine(fetta)
    assert.ok(testo[0].includes('Bianchi Luca'))
    assert.ok(testo[1].includes('Verdi Anna'))
  })

  it('un intervallo oltre la fine si ferma all’ultima pagina', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    assert.equal(await contaPagine(await estraiPagine(byte, 2, 99)), 1)
  })

  it('l’originale resta intero dopo il ritaglio', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    await estraiPagine(byte, 1, 1)
    assert.equal(await contaPagine(byte), 2)
  })
})

describe('la fotografia dentro una scansione', () => {
  it('torna un PNG, che è quel che l’OCR sa guardare', async () => {
    const immagine = await immaginePagina(await scansione(), 1)

    assert.ok(immagine, 'nessuna immagine estratta dalla pagina')
    assert.deepEqual([...immagine.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47])
  })

  it('la testata è più corta della pagina intera: costa meno leggerla', async () => {
    const byte = await scansione()
    const intera = await immaginePagina(byte, 1, 'intera')
    const testata = await immaginePagina(byte, 1, 'testata')

    assert.ok(testata.length < intera.length)
  })

  it('una pagina di solo testo non ha niente da fotografare', async () => {
    assert.equal(await immaginePagina(await pagelle(['Rossi Mario']), 1), null)
  })
})
