// Il morph di `aggiornaElemento` (ADR-50) su Chromium.
//
// Qui si prova che, a ogni ridisegno:
//
// - un `<iframe>` con `data-tieni` è lo stesso nodo e non ricarica: una sola
//   richiesta del documento, per quanti disegni si facciano; prende gli
//   attributi nuovi, e una sorgente nuova è un nodo nuovo;
// - un nodo di telaio resta, e con lui un bottone senza chiave che il disegno
//   porta uguale: tutti e due rispondono con i gestori del disegno nuovo, non
//   con quelli del primo;
// - un pulsante col fuoco tiene i figli uguali e prende il testo nuovo: un
//   ridisegno fra `mousedown` e `mouseup` non perde il clic;
// - una scatola che scorre resta dov'era anche senza la catena di telaio e
//   senza `ripristinaScorrimenti`: il nodo è lo stesso;
// - il campo in cui si scrive tiene fuoco, selezione e quel che c'è scritto,
//   anche quando il disegno nuovo porta un valore vecchio;
// - `ridisegnaIsola` rifà solo l'isola, preservando i nodi esterni e i nodi pesanti.

import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'

import { RADICE } from './banco'

let codice = ''

test.beforeAll(async () => {
  const uscita = await build({
    stdin: {
      contents: [
        "import * as dom from './ui/dom.ts'",
        "import { isola, ridisegnaIsola } from './ui/islands.ts'",
        ';(window as any).dom = { ...dom, isola, ridisegnaIsola }',
      ].join('\n'),
      resolveDir: RADICE,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    logLevel: 'silent',
  })
  codice = uscita.outputFiles[0].text
})

/** Le funzioni di `dom.ts` e `islands.ts` che le prove chiamano nella pagina. */
interface Dom {
  h: (tag: string, attributi?: Record<string, unknown> | null, ...figli: unknown[]) => HTMLElement
  aggiornaElemento: (contenitore: HTMLElement, nuovo: unknown) => void
  isola: (chiave: string, disegna: () => unknown, attributi?: Record<string, unknown>) => HTMLElement
  ridisegnaIsola: (chiave: string) => void
}

/** Una pagina con solo `#radice` e `window.dom`; gli errori della pagina si raccolgono. */
async function pagina (page: Page): Promise<string[]> {
  const errori: string[] = []
  page.on('pageerror', (e) => errori.push(String(e)))
  await page.setContent('<html lang="it"><body><div id="radice"></div></body></html>')
  await page.addScriptTag({ content: codice })
  return errori
}

test('data_tieni_iframe_non_ricarica', async ({ page }) => {
  let richieste = 0
  await page.route('https://prova.invalid/**', async (rotta) => {
    richieste += 1
    await rotta.fulfill({ status: 200, contentType: 'text/html', body: '<p>documento</p>' })
  })
  const errori = await pagina(page)

  await page.evaluate(() => {
    const { h, aggiornaElemento } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    const disegno = (giro: number, sorgente: string) => h(
      'section',
      { class: `pagina giro-${giro}` },
      h('p', null, `giro ${giro}`),
      h('iframe', { dataset: { tieni: sorgente }, attr: { src: sorgente, title: `giro ${giro}` } }),
    )
    Object.assign(window, {
      disegna: (giro: number, sorgente = 'https://prova.invalid/uno.pdf') =>
        aggiornaElemento(radice, disegno(giro, sorgente)),
      cornice: () => radice.querySelector('iframe'),
    })
    ;(window as unknown as { disegna: (g: number) => void }).disegna(0)
    ;(window as unknown as { primo: unknown }).primo = radice.querySelector('iframe')
  })
  await expect.poll(() => richieste).toBe(1)

  for (let giro = 1; giro <= 5; giro++) {
    await page.evaluate(
      (g) => (window as unknown as { disegna: (g: number) => void }).disegna(g),
      giro,
    )
  }
  const dopo = await page.evaluate(() => {
    const w = window as unknown as { cornice: () => HTMLIFrameElement, primo: unknown }
    return {
      stesso: w.cornice() === w.primo,
      quante: document.querySelectorAll('iframe').length,
      titolo: w.cornice().title,
      testo: document.querySelector('#radice p')?.textContent,
    }
  })
  expect(dopo).toEqual({ stesso: true, quante: 1, titolo: 'giro 5', testo: 'giro 5' })
  // Qualche fotogramma in più: un ricaricamento arriverebbe qui.
  await page.waitForTimeout(200)
  expect(richieste, 'l’iframe tenuto ha ricaricato').toBe(1)

  // Un'altra sorgente è un altro nodo, e carica.
  await page.evaluate(() => (window as unknown as {
    disegna: (g: number, s: string) => void
  }).disegna(6, 'https://prova.invalid/due.pdf'))
  expect(await page.evaluate(() => {
    const w = window as unknown as { cornice: () => HTMLIFrameElement, primo: unknown }
    return w.cornice() !== w.primo && document.querySelectorAll('iframe').length === 1
  })).toBe(true)
  await expect.poll(() => richieste).toBe(2)
  expect(errori).toEqual([])
})

test('telaio_e_nodi_riusati_prendono_i_gestori_nuovi', async ({ page }) => {
  const errori = await pagina(page)
  const esito = await page.evaluate(() => {
    const { h, aggiornaElemento } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    const colpi: string[] = []
    const disegno = (giro: number) => h(
      'div',
      { dataset: { telaio: 'scatola' }, onclick: () => colpi.push(`telaio ${giro}`) },
      h('button', { type: 'button', onclick: () => colpi.push(`bottone ${giro}`) }, 'Fai'),
    )
    aggiornaElemento(radice, disegno(1))
    const telaio = radice.firstElementChild as HTMLElement
    const bottone = telaio.querySelector('button') as HTMLButtonElement
    aggiornaElemento(radice, disegno(2))
    const stessi = radice.firstElementChild === telaio && telaio.querySelector('button') === bottone
    bottone.click()
    return { stessi, colpi }
  })
  // Il clic sale dal bottone al telaio: i due gestori, entrambi del secondo disegno.
  expect(esito).toEqual({ stessi: true, colpi: ['bottone 2', 'telaio 2'] })
  expect(errori).toEqual([])
})

test('pulsante_col_fuoco_tiene_i_figli_e_il_clic', async ({ page }) => {
  const errori = await pagina(page)
  await page.evaluate(() => {
    const { h, aggiornaElemento } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    const colpi: string[] = []
    const disegno = (giro: number) => h(
      'button',
      { type: 'button', style: 'width:200px;height:40px', onclick: () => colpi.push(`giro ${giro}`) },
      h('span', { class: 'icona' }, '●'),
      h('span', { class: 'nome' }, `giro ${giro}`),
    )
    Object.assign(window, { colpi, disegna: (g: number) => aggiornaElemento(radice, disegno(g)) })
    ;(window as unknown as { disegna: (g: number) => void }).disegna(1)
  })
  const bottone = page.locator('#radice button')
  const r = await bottone.boundingBox()
  if (!r) throw new Error('il pulsante non si vede')
  // Il `mousedown` sull'icona dà il fuoco; un ridisegno prima del `mouseup`
  // (l'orologio, una spinta dell'host) non deve staccare il nodo sotto il puntatore.
  await page.mouse.move(r.x + 8, r.y + r.height / 2)
  await page.mouse.down()
  const prima = await page.evaluate(() => {
    const icona = document.querySelector('#radice .icona')
    ;(window as unknown as { disegna: (g: number) => void }).disegna(2)
    return {
      fuoco: document.activeElement?.tagName,
      stessa: document.querySelector('#radice .icona') === icona,
      nome: document.querySelector('#radice .nome')?.textContent,
    }
  })
  await page.mouse.up()
  expect(prima).toEqual({ fuoco: 'BUTTON', stessa: true, nome: 'giro 2' })
  expect(await page.evaluate(() => (window as unknown as { colpi: string[] }).colpi))
    .toEqual(['giro 2'])
  expect(errori).toEqual([])
})

test('scorrimento_conservato_senza_catena_di_telaio', async ({ page }) => {
  const errori = await pagina(page)
  const esito = await page.evaluate(() => {
    const { h, aggiornaElemento } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    // Il genitore non è di telaio: il percorso classico rifarebbe la scatola.
    const disegno = (giro: number) => h(
      'div',
      { class: 'vista' },
      h('h2', null, `giro ${giro}`),
      h(
        'div',
        { dataset: { scorrimento: 'elenco' }, style: { height: '100px', overflow: 'auto' } },
        ...Array.from({ length: 40 }, (_, i) => h('p', { style: { height: '30px', margin: '0' } }, `riga ${i} · ${giro}`)),
      ),
    )
    aggiornaElemento(radice, disegno(1))
    const scatola = radice.querySelector('[data-scorrimento]') as HTMLElement
    scatola.scrollTop = 300
    aggiornaElemento(radice, disegno(2))
    const viva = radice.querySelector('[data-scorrimento]') as HTMLElement
    return {
      stessa: viva === scatola,
      alto: viva.scrollTop,
      titolo: radice.querySelector('h2')?.textContent,
      riga: viva.querySelector('p')?.textContent,
    }
  })
  expect(esito).toEqual({ stessa: true, alto: 300, titolo: 'giro 2', riga: 'riga 0 · 2' })
  expect(errori).toEqual([])
})

test('fuoco_e_selezione_restano_nel_campo', async ({ page }) => {
  const errori = await pagina(page)
  await page.evaluate(() => {
    const { h, aggiornaElemento } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    // Il valore del disegno resta quello di partenza: lo stato non segue la
    // battitura, come un campo che si salva al `change`.
    const disegno = (giro: number) => h(
      'form',
      { class: 'modulo' },
      h('label', null, `Nome (giro ${giro})`),
      h('input', { type: 'text', name: 'nome', value: 'vecchio', dataset: { fuoco: 'nome' } }),
      h('input', { type: 'text', name: 'altro', value: `altro ${giro}` }),
    )
    Object.assign(window, { disegna: (giro: number) => aggiornaElemento(radice, disegno(giro)) })
    ;(window as unknown as { disegna: (g: number) => void }).disegna(1)
  })
  const campo = page.locator('input[name="nome"]')
  await campo.fill('ciao mondo')
  await campo.evaluate((c: HTMLInputElement) => {
    c.setSelectionRange(5, 10)
    ;(window as unknown as { campo: unknown }).campo = c
  })

  await page.evaluate(() => (window as unknown as { disegna: (g: number) => void }).disegna(2))

  const esito = await page.evaluate(() => {
    const c = document.querySelector<HTMLInputElement>('input[name="nome"]') as HTMLInputElement
    return {
      stesso: c === (window as unknown as { campo: unknown }).campo,
      fuoco: document.activeElement === c,
      valore: c.value,
      selezione: [c.selectionStart, c.selectionEnd],
      etichetta: document.querySelector('label')?.textContent,
      altro: document.querySelector<HTMLInputElement>('input[name="altro"]')?.value,
    }
  })
  expect(esito).toEqual({
    stesso: true,
    fuoco: true,
    valore: 'ciao mondo',
    selezione: [5, 10],
    etichetta: 'Nome (giro 2)',
    // Il campo senza fuoco segue il disegno.
    altro: 'altro 2',
  })
  // La selezione è viva: una lettera la sostituisce.
  await page.keyboard.type('Z')
  await expect(campo).toHaveValue('ciao Z')
  expect(errori).toEqual([])
})

test('ridisegna_isola_rifa_solo_isola', async ({ page }) => {
  const errori = await pagina(page)
  const esito = await page.evaluate(async () => {
    const { h, aggiornaElemento, isola, ridisegnaIsola } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    let conto = 1
    let disegni = 0
    const pagina = () => h(
      'main',
      null,
      h('p', { class: 'fuori' }, 'titolo'),
      isola('conto', () => {
        disegni += 1
        return h('span', null, String(conto))
      }),
    )
    aggiornaElemento(radice, pagina())
    const fuori = radice.querySelector('.fuori') as HTMLElement
    const contenitore = radice.querySelector('[data-isola="conto"]') as HTMLElement
    const vecchioFiglio = contenitore.firstElementChild

    conto = 2
    ridisegnaIsola('conto')
    ridisegnaIsola('conto')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    return {
      disegni,
      stessoFuori: radice.querySelector('.fuori') === fuori,
      stessoContenitore: radice.querySelector('[data-isola="conto"]') === contenitore,
      testo: contenitore.textContent,
      figlioMorfato: contenitore.firstElementChild === vecchioFiglio,
    }
  })
  expect(esito).toEqual({
    disegni: 2,
    stessoFuori: true,
    stessoContenitore: true,
    testo: '2',
    figlioMorfato: true,
  })
  expect(errori).toEqual([])
})

test('isola_data_tieni_sopravvive_al_ridisegno', async ({ page }) => {
  const errori = await pagina(page)
  const esito = await page.evaluate(async () => {
    const { h, aggiornaElemento, isola, ridisegnaIsola } = (window as unknown as { dom: Dom }).dom
    const radice = document.getElementById('radice') as HTMLElement
    let versione = 1
    const anteprima = () => [
      h('p', null, `versione ${versione}`),
      h('canvas', { dataset: { tieni: 'anteprima:1' } }),
    ]
    aggiornaElemento(radice, h('div', null, isola('anteprima', anteprima)))
    const tela = radice.querySelector('canvas') as HTMLCanvasElement
    versione = 2
    ridisegnaIsola('anteprima')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    return {
      stessaTela: radice.querySelector('canvas') === tela,
      testo: radice.textContent,
    }
  })
  expect(esito.stessaTela).toBe(true)
  expect(esito.testo).toContain('versione 2')
  expect(errori).toEqual([])
})

