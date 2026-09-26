// Il lettore di PDF, su PDF costruiti al volo. Copre i due modi in cui lo
// smistamento sbaglia in silenzio: un testo letto male (nessuno riconosciuto)
// e un ritaglio sbagliato (le pagine di uno nel fascicolo di un altro).

import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'
import { describe, it } from 'node:test'

import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

import {
  contaPagine,
  impostaCaratteri,
  estraiElenco,
  testoConPosizioni,
  immaginePagina,
  impostaWorker,
  unisciPdf,
} from '../../dist-tests/pdf.mjs'

impostaWorker(pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href)
// I caratteri standard accanto ai bundle: senza, pdfjs stima le larghezze del
// testo, che dicono dove sta un nome sulla pagina.
impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

/**
 * Il testo di ogni pagina, senza le posizioni: quasi ogni asserzione guarda
 * questo.
 */
const testoPagine = async (byte) =>
  (await testoConPosizioni(byte)).map((pagina) => pagina.testo)

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
    // pdfjs svuota il buffer che riceve: senza la copia interna la seconda
    // lettura fallirebbe.
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
    const fetta = await estraiElenco(byte, [2, 3])

    assert.equal(await contaPagine(fetta), 2)
    const testo = await testoPagine(fetta)
    assert.ok(testo[0].includes('Bianchi Luca'))
    assert.ok(testo[1].includes('Verdi Anna'))
  })

  it('una pagina oltre la fine si lascia cadere, e le altre si ritagliano', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    assert.equal(await contaPagine(await estraiElenco(byte, [2, 99])), 1)
  })

  it('l’originale resta intero dopo il ritaglio', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    await estraiElenco(byte, [1])
    assert.equal(await contaPagine(byte), 2)
  })
})

describe('ritagliare delle pagine sparse', () => {
  // Le due facciate di una persona lontane nella scansione: un ritaglio solo,
  // non due documenti.
  it('mette insieme pagine che non si toccano', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca', 'Verdi Anna', 'Rossi Mario'])
    const fetta = await estraiElenco(byte, [1, 4])

    assert.equal(await contaPagine(fetta), 2)
    const testo = await testoPagine(fetta)
    assert.ok(testo.every((pagina) => pagina.includes('Rossi Mario')))
  })

  it('le mette nell’ordine del PDF, non in quello in cui sono state dette', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca', 'Verdi Anna'])
    const testo = await testoPagine(await estraiElenco(byte, [3, 1]))

    assert.ok(testo[0].includes('Rossi Mario'))
    assert.ok(testo[1].includes('Verdi Anna'))
  })

  it('una pagina detta due volte non finisce due volte', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    assert.equal(await contaPagine(await estraiElenco(byte, [2, 2, 2])), 1)
  })

  it('senza nemmeno una pagina buona si rifiuta invece di dare un PDF vuoto', async () => {
    const byte = await pagelle(['Rossi Mario'])
    await assert.rejects(() => estraiElenco(byte, [7, 0, -1]))
  })
})

describe('unire dei PDF in un fascicolo', () => {
  it('mette le pagine in fila, nell’ordine in cui gli si danno', async () => {
    const primo = await pagelle(['Rossi Mario'])
    const secondo = await pagelle(['Bianchi Luca', 'Verdi Anna'])

    const { pdf, uniti } = await unisciPdf([primo, secondo])
    assert.equal(uniti, 2)
    assert.equal(await contaPagine(pdf), 3)
    const testo = await testoPagine(pdf)
    assert.ok(testo[0].includes('Rossi Mario'))
    assert.ok(testo[1].includes('Bianchi Luca'))
    assert.ok(testo[2].includes('Verdi Anna'))
  })

  it('un foglio illeggibile salta, lo dice nel conto, e gli altri si uniscono', async () => {
    const buono = await pagelle(['Rossi Mario'])
    const rotto = new Uint8Array([1, 2, 3, 4])

    const { pdf, uniti } = await unisciPdf([rotto, buono, rotto])
    // Due su tre rimasti fuori: l'azione lo dice a chi consegna.
    assert.equal(uniti, 1)
    assert.equal(await contaPagine(pdf), 1)
    assert.ok((await testoPagine(pdf))[0].includes('Rossi Mario'))
  })

  it('un PDF protetto da password resta fuori invece di entrare illeggibile', async () => {
    // Basta il marchio `/Encrypt` nel trailer: è su quello che `unisciPdf` decide.
    const buono = await pagelle(['Rossi Mario'])
    const cifrato = await pagelle(['Bianchi Luca'])
    const documento = await PDFDocument.load(cifrato)
    documento.context.trailerInfo.Encrypt = documento.context.obj({ Filter: 'Standard', V: 1, R: 2 })
    const protettoByte = await documento.save()

    const { pdf, uniti, protetti } = await unisciPdf([buono, protettoByte])
    assert.equal(protetti, 1, 'il PDF cifrato è entrato nel fascicolo')
    assert.equal(uniti, 1)
    assert.equal(await contaPagine(pdf), 1)
  })

  it('gli originali restano interi', async () => {
    const primo = await pagelle(['Rossi Mario'])
    const secondo = await pagelle(['Bianchi Luca'])
    await unisciPdf([primo, secondo])
    assert.equal(await contaPagine(primo), 1)
    assert.equal(await contaPagine(secondo), 1)
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

describe('dove sta il testo sulla pagina', () => {
  // Per segnare sulla miniatura dove è stato letto il nome: coordinate in
  // frazioni del foglio, origine in alto a sinistra come su un'immagine.
  it('torna i pezzi con il loro posto, in frazioni del foglio', async () => {
    const byte = await pagelle(['Rossi Mario'])
    const [pagina] = await testoConPosizioni(byte)

    assert.ok(pagina.testo.includes('Rossi Mario'))
    const nome = pagina.pezzi.find((pezzo) => pezzo.testo.includes('Rossi'))
    assert.ok(nome, `nessun pezzo con il nome: ${JSON.stringify(pagina.pezzi.slice(0, 5))}`)
    for (const misura of [nome.x, nome.y, nome.larghezza, nome.altezza]) {
      assert.ok(misura >= 0 && misura <= 1, `fuori dal foglio: ${misura}`)
    }
    // Il nome è in testa: l'origine è in alto, non in basso come nel PDF.
    assert.ok(nome.y < 0.25, `il nome è finito a ${nome.y} invece che in testa`)
  })
})
