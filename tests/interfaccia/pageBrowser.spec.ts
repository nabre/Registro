// Lo sfoglio delle pagine di un PDF da dividere, provato su Chromium.
//
// Prova le due cose che non si possono provare con `node --test`, perche' vivono
// nel browser: che pdfjs disegni davvero le pagine dentro il pannello — sul filo
// principale, senza worker, vedi `components/thumbnails.tsx` — e che una pagina
// trascinata su una casella della matrice faccia partire l'azione giusta, con le
// pagine giuste.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import {
  BUNDLE, FOTOGRAMMA, RADICE, attendi, pannello, riquadro, schermata, valuta, valutaSu,
} from './banco'

interface Assegnazione { pagine: number[], smistamentoId: string }

// Un PDF di tre pagine, un nome per pagina: la prima e la terza sono della
// stessa persona, quindi le pagine si scelgono a mano.
const pdf = join(BUNDLE, 'sfoglio-prova.pdf')
let byte: Buffer

test.beforeAll(() => {
  const esito = spawnSync('node', ['-e', `
const { PDFDocument, StandardFonts } = require('@cantoo/pdf-lib')
const fs = require('node:fs')
;(async () => {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (const nome of ['Esempio Anna', 'Altro Nome', 'Esempio Anna']) {
    const pagina = documento.addPage([595, 842])
    pagina.drawText('Pagella', { x: 60, y: 780, size: 16, font })
    pagina.drawText('Allievo: ' + nome, { x: 60, y: 740, size: 12, font })
  }
  fs.writeFileSync(${JSON.stringify(pdf)}, await documento.save())
})()
`], { cwd: RADICE, encoding: 'utf-8' })
  if (esito.status !== 0) throw new Error(`il PDF di prova non è nato: ${esito.stderr}`)
  byte = readFileSync(pdf)
})

test('sfoglio', async ({ browser }) => {
  const consolle: string[] = []

  async function prepara (page: Page): Promise<void> {
    // Anche la console: una chiusura di PDF che fallisce non fa cadere la pagina ma
    // lascia un errore qui, così si vede se `thumbnails.tsx` smette di chiudere.
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('ERR_UNKNOWN_URL_SCHEME')) {
        consolle.push(m.text())
      }
    })
    // La cartella dei dati servita da qui (nel pannello è `registro://`): basta un
    // indirizzo da cui `fetch` porti dei byte.
    await page.route('https://dati.prova/**', (rotta) => rotta.fulfill({
      status: 200, contentType: 'application/pdf', body: byte,
    }))
  }

  const { page, errori } = await pannello(browser, { larghezza: 1600, prima: prepara })

  // Un PDF in attesa sulla classe di cui si è docente, agganciato a una
  // richiesta.
  await valuta(page, `() => {
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      const consegna = s.registro.consegne.find((c) => c.corsoId === s.registro.corsi.find((x) => x.classeId === classe.id).id)
      consegna.documento = 'pagella'
      consegna.a = 'classe'
      const smistamento = {
        id: 'sm-prova',
        consegnaId: consegna.id,
        classeId: classe.id,
        file: 'quarantena/scansione.pdf',
        nome: 'scansione.pdf',
        pagine: 3,
        letture: [1, 2, 3].map((numero) => ({ numero, testo: '', lettura: 'niente',
          riquadroNome: numero === 1 ? { x: 0.2, y: 0.1, larghezza: 0.4, altezza: 0.05 } : undefined })),
        assegnate: [],
        blocchi: [{ id: 'b1', da: 1, a: 3, allievoId: classe.allievi[0].id, motivo: 'senza-testo', estratto: '', fiducia: 0.9, lettura: 'niente' }],
        divisione: { modo: 'mano' },
        arrivatoIl: '2026-09-14T08:00:00.000Z',
      }
      s.registro.smistamenti.push(smistamento)
      // L'inventario del documento dell'anno: senza, la cornice direbbe che il
      // file non c'e' piu' — e sarebbe vero, perche' qui dentro nessuno l'ha
      // mai scritto.
      prova.aggiorna({
        registro: s.registro,
        radiceDati: 'https://dati.prova',
        archiviati: [{ percorso: smistamento.file, misura: 12345, revisione: 0 }],
      })
      prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.classe.documenti'))
    }`)

  // Il nome del PDF, sopra la matrice, apre la cornice.
  await page.locator('.da-dividere__pdf').first().click()
  const pagine = page.locator('.pagina-sfoglio')
  await expect(pagine).toHaveCount(3)

  // pdfjs disegna: la prima pagina compare senza worker e senza uscire.
  await expect(pagine.first().locator('img')).toBeVisible({ timeout: 30000 })

  // Due scorrimenti, uno per riquadro, nessuno annidato: la rotella muove quel
  // che si sta guardando.
  const scorrimenti = await valuta<string[]>(page, `() => {
      const scorre = (el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)
      return [...document.querySelectorAll('.archivio, .archivio *')]
        .filter(scorre)
        .map((el) => el.className.split(' ')[0])
    }`)
  expect([...scorrimenti].sort(), JSON.stringify(scorrimenti))
    .toEqual(['archivio__barra', 'sfoglio__pagine'])
  expect(await valuta(page,
    "getComputedStyle(document.querySelector('.tabella-contenitore--griglia')).overflowY",
  ), 'la matrice scorre ancora dentro di sé').toBe('visible')
  // La pagina intera non scorre: il telaio è alto quanto lo spazio che c'è.
  expect(await valuta<number>(page,
    "(() => { const c = document.querySelector('.contenuto');" +
    ' return c.scrollHeight - c.clientHeight })()')).toBeLessThan(4)

  // Con una classe vera scorre il riquadro, e la testata dei documenti resta in
  // cima: si sa su quale colonna si lasciano le pagine.
  await valuta(page, `() => {
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      for (let n = 0; n < 30; n += 1) {
        classe.allievi.push({ id: \`alv-\${n}\`, cognome: \`Cognome\${n}\`, nome: 'Prova', attivo: true })
      }
      // Un registro nuovo, come ogni spinta dell'host: lo stesso oggetto non è un cambio.
      prova.aggiorna({ registro: { ...s.registro } })
    }`)
  await valuta(page, FOTOGRAMMA)
  const barra = page.locator('.archivio__barra')
  expect(await valutaSu(barra, 'el => el.scrollHeight > el.clientHeight + 2'),
    'il riquadro non scorre').toBeTruthy()
  await valutaSu(barra, 'el => { el.scrollTop = 300 }')
  await valuta(page, FOTOGRAMMA)
  const appiccicata = await valuta<number>(page, `() => {
      const barra = document.querySelector('.archivio__barra')
      const testa = document.querySelector('.tabella--documenti thead th')
      return testa.getBoundingClientRect().top - barra.getBoundingClientRect().top
    }`)
  expect(-1 <= appiccicata && appiccicata <= 2,
    `la testata della matrice non resta in cima: ${appiccicata}`).toBeTruthy()

  // Lo zoom ridisegna più fitto, non stira la stessa fotografia.
  const largaPrima = await valutaSu<number>(pagine.first().locator('img'), 'img => img.naturalWidth')
  const misuraPrima = (await riquadro(pagine.first())).width
  const cursore = page.locator('.sfoglio__zoom')
  await cursore.fill(String(await valuta<number>(page, 'prova.MISURE_SFOGLIO.length - 1')))
  await cursore.dispatchEvent('change')
  // pdfjs ridisegna ogni pagina alla misura nuova, più fitta.
  await attendi(page, `([larga, misura]) => {
      const prima = document.querySelector('.pagina-sfoglio')
      const img = prima?.querySelector('img')
      return prima.getBoundingClientRect().width > misura && img?.complete && img.naturalWidth > larga
    }`, [largaPrima, misuraPrima], { timeout: 30000 })
  expect((await riquadro(pagine.first())).width,
    'le pagine non si sono allargate').toBeGreaterThan(misuraPrima)
  const largaDopo = await valutaSu<number>(pagine.first().locator('img'), 'img => img.naturalWidth')
  expect(largaDopo > largaPrima,
    `disegnata alla stessa risoluzione: ${largaPrima} -> ${largaDopo}`).toBeTruthy()
  // La misura scelta si ricorda: è una preferenza.
  expect(await valuta(page, 'prova.stato.zoomSfoglio'))
    .toEqual(await valuta(page, 'prova.MISURE_SFOGLIO.at(-1)'))
  await cursore.fill('2')
  await cursore.dispatchEvent('change')
  await attendi(page, `(larga) => {
      const img = document.querySelector('.pagina-sfoglio img')
      return prova.stato.zoomSfoglio === prova.MISURE_SFOGLIO[2] && img?.complete && img.naturalWidth < larga
    }`, largaDopo, { timeout: 30000 })

  // Due pagine che non si toccano: la prima, e la terza con Ctrl.
  await pagine.nth(0).click()
  await pagine.nth(2).click({ modifiers: ['Control'] })
  await expect(page.locator('.pagina-sfoglio--scelta')).toHaveCount(2)
  await expect(page.locator('.sfoglio__scelte')).toContainText('pagine 1 e 3')

  // Trascinate sulla casella della persona, nella colonna del documento.
  const casella = page.locator('.tabella--documenti tbody .cella-documento__gruppo').first()
  await pagine.nth(0).dragTo(casella)

  let chiesto = await valuta<Assegnazione[]>(page,
    "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.assegnaPagine')")
  expect(chiesto.length > 0, 'nessuna azione di assegnazione: ' +
    JSON.stringify(await valuta(page, 'richieste.map(r => r.azione && r.azione.tipo)')))
    .toBeTruthy()
  expect(chiesto[0].pagine, JSON.stringify(chiesto[0])).toEqual([1, 3])
  expect(chiesto[0].smistamentoId, JSON.stringify(chiesto[0])).toBe('sm-prova')

  // Archiviate le pagine, la scelta si lascia andare.
  await expect(page.locator('.pagina-sfoglio--scelta')).toHaveCount(0)

  // Una pagina non scelta porta se stessa e parte lo stesso, anche dopo un
  // ridisegno.
  await valuta(page, 'richieste.length = 0')
  await pagine.nth(1).dragTo(casella)
  chiesto = await valuta<Assegnazione[]>(page,
    "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.assegnaPagine')")
  expect(chiesto.length > 0 && chiesto[0].pagine, JSON.stringify(chiesto)).toEqual([2])

  // Il riquadro sul punto in cui è stato letto il nome.
  await expect(page.locator('.pagina-sfoglio__nome')).toHaveCount(1)
  const misure = await valuta<{ segnoL: number, segnoY: number, fotoL: number, fotoY: number }>(
    page, `() => {
      const segno = document.querySelector('.pagina-sfoglio__nome').getBoundingClientRect()
      const foto = document.querySelector('.pagina-sfoglio__foto').getBoundingClientRect()
      return { segnoL: segno.width, segnoY: segno.top, fotoL: foto.width, fotoY: foto.top }
    }`)
  expect(misure.segnoL, 'il riquadro non si vede').toBeGreaterThan(0)
  expect(misure.segnoL, 'il riquadro copre tutta la pagina').toBeLessThan(misure.fotoL)
  expect(misure.segnoY, 'il riquadro non sta dentro la pagina').toBeGreaterThan(misure.fotoY)

  // Il tasto destro: rileggere una scansione, assegnare senza trascinare,
  // buttare quel che non è di nessuno.
  await pagine.nth(1).click({ button: 'right' })
  const menu = page.locator('.menu')
  await expect(menu).toHaveCount(1)
  await expect(menu).toContainText('Assegna a')
  await expect(menu).toContainText('Butta via')
  await page.keyboard.press('Escape')
  await expect(page.locator('.menu')).toHaveCount(0)

  // Una pagina archiviata sparisce dall'elenco; l'interruttore la rimette in
  // fila.
  await valuta(page, `() => {
      const sm = prova.stato.registro.smistamenti[0]
      const classe = prova.stato.registro.classi.find((c) => c.docenteDiClasse)
      sm.assegnate = [{ allievoId: classe.allievi[0].id, consegnaId: sm.consegnaId, da: 2, a: 2 }]
      sm.letture = sm.letture.filter((l) => l.numero !== 2)
      sm.blocchi = [{ id: 'b1', da: 1, a: 1, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' },
                    { id: 'b3', da: 3, a: 3, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' }]
      prova.aggiorna({ registro: { ...prova.stato.registro } })
    }`)
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.pagina-sfoglio')).toHaveCount(2)
  const interruttore = page.locator('.sfoglio__testa button', { hasText: 'Archiviate (1)' })
  await expect(interruttore).toBeVisible()
  await interruttore.click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.pagina-sfoglio')).toHaveCount(3)
  await expect(page.locator('.pagina-sfoglio--archiviata')).toHaveCount(1)

  // E sull'archiviata il menu è un altro: quello che la riprende.
  await valuta(page, 'richieste.length = 0')
  await page.locator('.pagina-sfoglio--archiviata').click({ button: 'right' })
  await expect(page.locator('.menu')).toContainText('Riprendila')
  await page.locator('.menu__voce', { hasText: 'Riprendila' }).first().click()
  const ripresa = await valuta<Assegnazione[]>(page,
    "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.riprendiPagine')")
  expect(ripresa.length > 0 && ripresa[0].pagine, JSON.stringify(ripresa)).toEqual([2])

  // Le due chiusure (cambiare versione del file, dimenticarlo). In pdfjs 5
  // `destroy` sta sul compito, non sul documento, e un errore finirebbe in un
  // `catch` vuoto: si prova per comportamento, chiudendo e riaprendo.
  const esito = await valuta<Record<string, unknown>>(page, `async () => {
      const url = 'https://dati.prova/scansione.pdf'
      const a1 = await prova.miniatura(url, 'rev-1', 1, 300)
      // Chiave diversa: si chiude il precedente e si apre questo.
      const b1 = await prova.miniatura(url, 'rev-2', 1, 300)
      // E il primo si riapre da capo. Se la chiusura avesse toccato l'oggetto
      // sbagliato — o non fosse avvenuta — di qui non si tornerebbe uguali.
      const a2 = await prova.miniatura(url, 'rev-1', 1, 300)
      prova.dimentica()
      const a3 = await prova.miniatura(url, 'rev-1', 1, 300)
      return { a1, b1, a2, a3 }
    }`)
  for (const nome of ['a1', 'b1', 'a2', 'a3']) {
    const foto = esito[nome]
    expect(typeof foto === 'string' && foto.startsWith('data:image/jpeg'),
      `${nome} non e una fotografia: ${String(foto).slice(0, 60)}`).toBeTruthy()
  }
  expect(esito.a2, 'riaperto dopo il cambio di versione, esce diverso').toBe(esito.a1)
  expect(esito.a3, 'riaperto dopo dimentica(), esce diverso').toBe(esito.a1)

  await schermata(page, 'sfoglio.png')
  expect(errori).toEqual([])
  expect(consolle).toEqual([])
})
