// I difetti del disegno dei rapporti trovati nella revisione, guardati sul PDF
// vero: lettere fuori dal Latin-1, a capo dentro una cella, titoli più larghi
// del foglio, valori di `campi:` con «;», foto da telefono salvate di traverso,
// la lingua del documento. Ogni prova era rossa prima della correzione.

import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, it } from 'node:test'

import { PDFArray, PDFDocument, PDFName, decodePDFRawStream } from '@cantoo/pdf-lib'

import { leggiModello } from '../../dist-tests/domain.mjs'
import { impostaCaratteri, impostaWorker, testoConPosizioni } from '../../dist-tests/pdf.mjs'
import { componiPdf } from '../../dist-tests/reportsPdf.mjs'

impostaWorker(pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href)
impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

/** Il PDF composto da un corpo di modello e dai suoi dati. */
function componi (corpo, dati = {}, carica = undefined) {
  const modello = leggiModello('prova', `titolo: Prova\n\n[corpo]\n${corpo}`)
  return componiPdf(modello, { valori: {}, elenchi: {}, tabelle: {}, grafici: {}, ...dati }, carica)
}

/** I pezzi di testo della prima pagina, con la posizione (da 0 a 1 sul foglio). */
async function pezzi (corpo, dati = {}) {
  return (await testoConPosizioni(await componi(corpo, dati)))[0].pezzi
}

/**
 * Un JPEG che pdf-lib sa incorporare (basta il SOF con le misure), largo 40 e
 * alto 20, con un EXIF che dice come girarlo.
 */
function jpeg (orientamento) {
  const tiff = [
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    // Un IFD con una voce: Orientation, SHORT, 1 valore.
    0x01, 0x00,
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientamento, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]
  const app1 = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]
  const sof = [0x08, 0x00, 20, 0x00, 40, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00]
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, 0x00, app1.length + 2, ...app1,
    0xff, 0xc0, 0x00, sof.length + 2, ...sof,
    0xff, 0xd9,
  ])
}

/** Le matrici `cm` del contenuto della prima pagina, come numeri. */
async function matrici (byte) {
  const documento = await PDFDocument.load(byte)
  const pagina = documento.getPage(0)
  const contenuti = pagina.node.Contents()
  const flussi = contenuti instanceof PDFArray
    ? contenuti.asArray().map((rif) => documento.context.lookup(rif))
    : [contenuti]
  const testo = flussi.map((flusso) => Buffer.from(decodePDFRawStream(flusso).decode()).toString('latin1')).join('\n')
  return [...testo.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)]
    .map((trovato) => trovato.slice(1, 7).map(Number))
}

describe('i difetti del PDF dei rapporti', () => {
  it('le lettere fuori dal Latin-1 perdono il segno, non diventano «?»; € Š Œ restano', async () => {
    const testi = (await pezzi('testo: {{nome}}', {
      valori: { nome: 'Kovačević Šime → 5 € Œuvre' },
    })).map((pezzo) => pezzo.testo)
    assert.ok(testi.includes('Kovacevic Šime -> 5 € Œuvre'), testi.join(' | '))
  })

  it('un testo a capo dentro una cella di tabella resta su una riga', async () => {
    const trovati = await pezzi('tabella: lezioni', {
      tabelle: { lezioni: { intestazione: ['Argomento'], righe: [['Frazioni\nesercizi a pagina 12']] } },
    })
    const testi = trovati.map((pezzo) => pezzo.testo)
    assert.ok(testi.includes('Frazioni · esercizi a pagina 12'), testi.join(' | '))
    assert.ok(!testi.includes('esercizi a pagina 12'))
  })

  it('un titolo lungo va a capo dentro il foglio, una sezione lunga si accorcia', async () => {
    const lungo = 'Rapporto sulle attività del secondo semestre per la classe terza del liceo cantonale'
    const trovati = await pezzi(`titolo: ${lungo}\nsezione: ${lungo} ${lungo}\ntesto: Sotto`)
    for (const pezzo of trovati) {
      assert.ok(pezzo.x + pezzo.larghezza <= 1, `${pezzo.testo} esce dal foglio`)
    }
    // Il titolo su due righe: l'ultima parola c'è ancora.
    assert.ok(trovati.some((pezzo) => pezzo.testo.endsWith('cantonale')))
  })

  it('un valore riempito con «;» o «=» resta un valore solo in `campi:` e `riquadro:`', async () => {
    const testi = (await pezzi('campi: Ditta={{ditta}}; Luogo=Bellinzona | colonne 1\nriquadro: Nota={{nota}}', {
      valori: { ditta: 'Rossi SA; filiale=Lugano', nota: '5; bene' },
    })).map((pezzo) => pezzo.testo)
    assert.ok(testi.includes('Rossi SA; filiale=Lugano'), testi.join(' | '))
    assert.ok(testi.includes('5; bene'), testi.join(' | '))
    assert.ok(!testi.includes('filiale:'))
  })

  it('una foto con l’EXIF di traverso si disegna girata, alta e stretta', async () => {
    const carica = async () => jpeg(6)
    const byte = await componi('immagine: foto.jpg | 30', {}, carica)
    // Un quarto di giro: la matrice scambia gli assi, e il lato lungo è in verticale.
    const girata = (await matrici(byte))
      .find(([a, b, c, d]) => a === 0 && d === 0 && b < 0 && c > 0)
    assert.ok(girata, 'nessuna matrice girata')
    const [, b, c] = girata
    assert.ok(Math.abs(Math.abs(b) / c - 2) < 0.01, `proporzioni ${Math.abs(b)}x${c}`)
  })

  it('la foto diritta si disegna come prima, senza matrice girata', async () => {
    const byte = await componi('immagine: foto.jpg | 30', {}, async () => jpeg(1))
    assert.ok(!(await matrici(byte)).some(([a, , , d]) => a === 0 && d === 0))
  })

  it('il documento dice la sua lingua, e due composizioni danno gli stessi byte', async () => {
    const corpo = 'testo: {{nome}}\nimmagine: foto.jpg | 30'
    const dati = { valori: { nome: 'Kovačević' } }
    const primo = await componi(corpo, dati, async () => jpeg(6))
    const secondo = await componi(corpo, dati, async () => jpeg(6))
    assert.deepEqual(primo, secondo)
    const documento = await PDFDocument.load(primo)
    assert.match(String(documento.catalog.get(PDFName.of('Lang'))), /it/)
  })
})
