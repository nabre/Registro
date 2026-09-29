// Il percorso con `idiomorph` di `aggiornaElemento` (ADR-50, passo 3), su
// Chromium: il DOM finto di `tests/ui/isole.test.mjs` e
// `riquadriLocali.test.mjs` prova solo il percorso classico.
//
// Qui si prova che, a ogni ridisegno:
//
// - un `<iframe>` con `data-tieni` è lo stesso nodo e non ricarica: una sola
//   richiesta del documento, per quanti disegni si facciano; prende gli
//   attributi nuovi, e una sorgente nuova è un nodo nuovo;
// - un nodo di telaio resta, e con lui un bottone senza chiave che il disegno
//   porta uguale: tutti e due rispondono con i gestori del disegno nuovo, non
//   con quelli del primo;
// - una scatola che scorre resta dov'era anche senza la catena di telaio e
//   senza `ripristinaScorrimenti`: il nodo è lo stesso;
// - il campo in cui si scrive tiene fuoco, selezione e quel che c'è scritto,
//   anche quando il disegno nuovo porta un valore vecchio.
//
// `dom.ts` si impacchetta qui con `MORFOSI` acceso comunque: la prova dice il
// percorso che prova, qualunque sia l'interruttore.

import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'
import { build, type Plugin } from 'esbuild'

import { RADICE } from './banco'

/** Accende `MORFOSI` nel sorgente di `dom.ts`; un interruttore sparito ferma la prova. */
const morfosiAccesa: Plugin = {
  name: 'morfosi-accesa',
  setup (b) {
    b.onLoad({ filter: /[\\/]ui[\\/]pannello[\\/]dom\.ts$/ }, async (a) => {
      const sorgente = await readFile(a.path, 'utf8')
      const interruttore = /^const MORFOSI = (true|false)$/m
      if (!interruttore.test(sorgente)) throw new Error('dom.ts: manca «const MORFOSI = …»')
      return { contents: sorgente.replace(interruttore, 'const MORFOSI = true'), loader: 'ts' }
    })
  },
}

let codice = ''

test.beforeAll(async () => {
  const uscita = await build({
    stdin: {
      contents: "import * as dom from './ui/pannello/dom.ts'\n;(window as any).dom = dom",
      resolveDir: RADICE,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    logLevel: 'silent',
    plugins: [morfosiAccesa],
  })
  codice = uscita.outputFiles[0].text
})

/** Le funzioni di `dom.ts` che le prove chiamano nella pagina. */
interface Dom {
  h: (tag: string, attributi?: Record<string, unknown> | null, ...figli: unknown[]) => HTMLElement
  aggiornaElemento: (contenitore: HTMLElement, nuovo: unknown) => void
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
