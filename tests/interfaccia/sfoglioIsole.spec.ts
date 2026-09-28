// Lo sfoglio si aggiorna nel suo riquadro, provato su Chromium.
//
// Con un PDF di venti pagine aperto nella cornice dell'archivio:
//
// - scegliere una pagina rifà solo lo sfoglio (isola `sfoglio:<id>`): le
//   fotografie sono gli stessi `<img>`, i riquadri gli stessi `<li>`, e fuori
//   dall'isola (la matrice, la testata della cornice) non si tocca niente;
// - una pagina letta dalla coda (messaggio `lavoro`) rifà l'isola
//   `coda-lettura`: riquadri e fotografie restano gli stessi oggetti — un
//   riquadro tolto dal documento annullerebbe il trascinamento in corso — e la
//   matrice resta dov'è. Il primo messaggio, che porta il PDF nella lettura,
//   ridisegna tutto (`main.ts`): anche lì fotografie e riquadri restano.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { BUNDLE, FRAME, RADICE, attendi, pannello, valuta } from './banco'

const PAGINE = 20

interface Confronto { riquadri: boolean, foto: boolean, matrice: boolean, testa: boolean }

const pdf = join(BUNDLE, 'sfoglio-isole.pdf')
let byte: Buffer

test.beforeAll(() => {
  const esito = spawnSync('node', ['-e', `
const { PDFDocument, StandardFonts } = require('@cantoo/pdf-lib')
const fs = require('node:fs')
;(async () => {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (let n = 1; n <= ${PAGINE}; n += 1) {
    const pagina = documento.addPage([595, 842])
    pagina.drawText('Pagina ' + n, { x: 60, y: 780, size: 16, font })
  }
  fs.writeFileSync(${JSON.stringify(pdf)}, await documento.save())
})()
`], { cwd: RADICE, encoding: 'utf-8' })
  if (esito.status !== 0) throw new Error(`il PDF di prova non è nato: ${esito.stderr}`)
  byte = readFileSync(pdf)
})

async function prepara (page: Page): Promise<void> {
  await page.route('https://dati.prova/**', (rotta) => rotta.fulfill({
    status: 200, contentType: 'application/pdf', body: byte,
  }))
}

/** Un messaggio `lavoro` dell'host: la pagina in lettura e quelle in coda. */
async function lavoro (page: Page, pagina: number, coda: number[]): Promise<void> {
  const etichetta = (n: number) => `scansione.pdf · pagina ${n}`
  await valuta(page, '(m) => window.dispatchEvent(new MessageEvent("message", { data: m }))', {
    tipo: 'lavoro',
    corrente: { smistamentoId: 'sm-isole', pagina, etichetta: etichetta(pagina) },
    fatte: pagina - 1,
    totale: PAGINE,
    coda: coda.map((n) => ({ smistamentoId: 'sm-isole', pagina: n, etichetta: etichetta(n) })),
  })
  await valuta(page, FRAME)
}

// Quel che si segna prima del gesto: le fotografie e i riquadri, e due nodi
// fuori dallo sfoglio. Dopo il gesto devono essere ancora gli stessi oggetti.
const SEGNA = `() => {
  const riquadri = [...document.querySelectorAll('.pagina-sfoglio')]
  window.segnati = {
    riquadri,
    foto: riquadri.map((r) => r.querySelector('img')).filter(Boolean),
    matrice: document.querySelector('.tabella--documenti'),
    testa: document.querySelector('.archivio__testa'),
  }
  return window.segnati.foto.length
}`

const CONFRONTA = `() => {
  const s = window.segnati
  const riquadri = [...document.querySelectorAll('.pagina-sfoglio')]
  return {
    riquadri: riquadri.length === s.riquadri.length && riquadri.every((r, i) => r === s.riquadri[i]),
    foto: s.foto.every((img) => img.isConnected &&
      riquadri.some((r) => r.querySelector('img') === img)),
    matrice: s.matrice.isConnected,
    testa: s.testa.isConnected,
  }
}`

test('sfoglio a isole', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1600, prima: prepara })

  await valuta(page, `() => {
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      const consegna = s.registro.consegne.find((c) => c.corsoId === s.registro.corsi.find((x) => x.classeId === classe.id).id)
      consegna.documento = 'pagella'
      consegna.a = 'classe'
      const pagine = Array.from({ length: ${PAGINE} }, (_, i) => i + 1)
      s.registro.smistamenti.push({
        id: 'sm-isole',
        consegnaId: consegna.id,
        classeId: classe.id,
        file: 'quarantena/isole.pdf',
        nome: 'isole.pdf',
        pagine: ${PAGINE},
        letture: pagine.map((numero) => ({ numero, testo: '', lettura: 'niente' })),
        assegnate: [],
        blocchi: [{ id: 'b1', da: 1, a: ${PAGINE}, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' }],
        divisione: { modo: 'mano' },
        arrivatoIl: '2026-09-14T08:00:00.000Z',
      })
      prova.aggiorna({
        registro: s.registro,
        radiceDati: 'https://dati.prova',
        archiviati: [{ percorso: 'quarantena/isole.pdf', misura: 54321, revisione: 0 }],
        ocrAttivo: true,
      })
      prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.classe.documenti'))
    }`)

  await page.locator('.da-dividere__pdf').first().click()
  const riquadri = page.locator('.pagina-sfoglio')
  await expect(riquadri).toHaveCount(PAGINE)
  // Le fotografie delle pagine in vista (e dell'anticipo): pdfjs le disegna una
  // alla volta.
  await attendi(page, `() => {
      const foto = [...document.querySelectorAll('.pagina-sfoglio img')]
      return foto.length >= 4 && foto.every((img) => img.complete && img.naturalWidth > 0)
    }`, undefined, { timeout: 60000 })
  await valuta(page, FRAME)

  // --- scegliere una pagina
  expect(await valuta<number>(page, SEGNA)).toBeGreaterThanOrEqual(4)
  await riquadri.nth(1).click()
  await expect(page.locator('.pagina-sfoglio--scelta')).toHaveCount(1)
  await expect(page.locator('.sfoglio__scelte')).toContainText('2')
  let esito = await valuta<Confronto>(page, CONFRONTA)
  expect(esito, `la scelta di una pagina ha rifatto troppo: ${JSON.stringify(esito)}`)
    .toEqual({ riquadri: true, foto: true, matrice: true, testa: true })
  expect(await valuta(page, 'prova.stato.pagineScelte'))
    .toEqual({ smistamentoId: 'sm-isole', pagine: [2] })
  // Ctrl aggiunge: di nuovo solo classi, sugli stessi riquadri.
  await riquadri.nth(4).click({ modifiers: ['Control'] })
  await expect(page.locator('.pagina-sfoglio--scelta')).toHaveCount(2)
  expect((await valuta<Confronto>(page, CONFRONTA)).riquadri, 'i riquadri si sono rifatti')
    .toBeTruthy()

  // --- il primo messaggio della coda: il PDF entra nella lettura, si ridisegna
  // tutto; riquadri e fotografie restano gli stessi.
  await valuta(page, SEGNA)
  await lavoro(page, 3, [4, 5])
  await expect(riquadri.nth(2)).toHaveClass('pagina-sfoglio pagina-sfoglio--in-lettura')
  esito = await valuta<Confronto>(page, CONFRONTA)
  expect(esito.riquadri && esito.foto,
    `un ridisegno completo ha rifatto lo sfoglio: ${JSON.stringify(esito)}`).toBeTruthy()
  await expect(page.locator('.lavoro-ocr')).toHaveCount(1)
  await expect(page.locator('.barra-stato')).toContainText(`legge 3 di ${PAGINE}`)

  // --- una pagina letta dopo: solo l'isola della lettura.
  await valuta(page, SEGNA)
  await lavoro(page, 4, [5])
  await expect(page.locator('.pagina-sfoglio--in-lettura')).toHaveCount(1)
  await expect(riquadri.nth(3)).toHaveClass('pagina-sfoglio pagina-sfoglio--in-lettura')
  await expect(page.locator('.barra-stato')).toContainText(`legge 4 di ${PAGINE}`)
  esito = await valuta<Confronto>(page, CONFRONTA)
  expect(esito.riquadri && esito.foto,
    `una pagina letta ha rifatto lo sfoglio: ${JSON.stringify(esito)}`).toBeTruthy()
  expect(esito.matrice, 'una pagina letta ha ridisegnato la matrice, fuori dall\'isola')
    .toBeTruthy()
  // La scelta resta: sta nello stato, non nei riquadri.
  await expect(page.locator('.pagina-sfoglio--scelta')).toHaveCount(2)

  expect(errori).toEqual([])
})
