// Dove cade un salto pagina in un rapporto, guardato sul PDF vero: un blocco
// che in una pagina ci sta non si spezza fra due, uno più lungo di una pagina
// si spezza ripetendo l'intestazione, e un titolo non chiude mai un foglio da
// solo. Le altezze si misurano con le stesse funzioni che disegnano.

import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, it } from 'node:test'

import { leggiModello } from '../../dist-tests/domain.mjs'
import { impostaCaratteri, impostaWorker, testoConPosizioni } from '../../dist-tests/pdf.mjs'
import { componiPdf } from '../../dist-tests/reportsPdf.mjs'

impostaWorker(pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href)
impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

/** Una tabella di `quante` righe, «Riga 1», «Riga 2»…, sotto l'intestazione «Nome». */
const tabella = (quante) => ({
  intestazione: ['Nome', 'Voto'],
  righe: Array.from({ length: quante }, (_, i) => [`Riga ${i + 1}`, String(i % 6 + 1)]),
})

/** I pezzi di testo di ogni pagina, dal PDF composto col modello. */
async function pagine (corpo, dati = {}) {
  const modello = leggiModello('prova', `titolo: Prova\n\n[corpo]\n${corpo}`)
  const byte = await componiPdf(modello, {
    valori: {},
    elenchi: {},
    tabelle: {},
    grafici: {},
    ...dati,
  })
  return (await testoConPosizioni(byte)).map((pagina) => pagina.pezzi.map((pezzo) => pezzo.testo))
}

/** Su che pagine compare un testo, contando da zero. */
const dove = (fogli, testo) =>
  fogli.flatMap((pezzi, i) => (pezzi.includes(testo) ? [i] : []))

describe('il salto pagina dei rapporti', () => {
  it('una tabella corta che non ci sta nel resto della pagina va intera alla pagina dopo', async () => {
    const fogli = await pagine('spazio: 600\ntesto: Sopra\ntabella: corta', {
      tabelle: { corta: tabella(8) },
    })
    assert.equal(fogli.length, 2)
    assert.deepEqual(dove(fogli, 'Sopra'), [0])
    assert.deepEqual(dove(fogli, 'Nome'), [1])
    for (let i = 1; i <= 8; i += 1) assert.deepEqual(dove(fogli, `Riga ${i}`), [1])
  })

  it('una tabella più lunga di una pagina comincia dov’è e ripete l’intestazione', async () => {
    const fogli = await pagine('spazio: 300\ntesto: Sopra\ntabella: lunga', {
      tabelle: { lunga: tabella(80) },
    })
    assert.ok(fogli.length >= 3, `pagine: ${fogli.length}`)
    assert.deepEqual(dove(fogli, 'Riga 1'), [0])
    assert.deepEqual(dove(fogli, 'Nome'), fogli.map((_, i) => i))
    // Ogni riga una volta sola, nessuna persa nel salto.
    for (let i = 1; i <= 80; i += 1) assert.equal(dove(fogli, `Riga ${i}`).length, 1)
  })

  it('una tabella lunga non comincia con la sola intestazione in fondo alla pagina', async () => {
    const fogli = await pagine('spazio: 690\ntesto: Sopra\ntabella: lunga', {
      tabelle: { lunga: tabella(80) },
    })
    assert.deepEqual(dove(fogli, 'Sopra'), [0])
    assert.equal(dove(fogli, 'Nome')[0], 1)
  })

  it('un titolo di sezione va con l’inizio di quel che gli sta sotto', async () => {
    const fogli = await pagine('spazio: 640\ntesto: Sopra\nsezione: Capitolo\ntabella: corta', {
      tabelle: { corta: tabella(8) },
    })
    assert.deepEqual(dove(fogli, 'Capitolo'), [1])
    assert.deepEqual(dove(fogli, 'Riga 1'), [1])
  })

  it('un riquadro non si spezza, e in cima a una pagina vuota non si volta', async () => {
    const fogli = await pagine('spazio: 690\ntesto: Sopra\nriquadro: Nota=5.5', {})
    assert.equal(fogli.length, 2)
    assert.deepEqual(dove(fogli, 'Nota'), [1])
    assert.deepEqual(dove(fogli, '5.5'), [1])
  })
})
