// Misure leggibili e bersagli coerenti, provati sui fogli reali in Chromium.
//
// Esecuzione isolata: `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts readability`.

import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { RADICE, riquadro, valuta, valutaSu } from './banco'

function numero (valore: string): number {
  return parseFloat(valore.replace(/px$/, ''))
}

const STILI = join(RADICE, 'ui', 'pannello', 'styles')
const DIMENSIONE = '(e) => getComputedStyle(e).fontSize'

test('readability', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } })
  await page.setContent(`<html lang="it"><body>
      <main class="prova">
        <button class="pulsante">Salva</button>
        <button class="pulsante pulsante--minuto" aria-label="Elimina">
          <svg class="icona"></svg>
        </button>
        <span class="nota">Nota operativa</span>
        <span class="selettore"><button class="selettore__voce">Mese</button></span>
        <label class="campo"><span class="campo__etichetta">Titolo</span>
          <input class="campo__controllo">
          <span class="campo__aiuto">Indicazione del campo</span>
        </label>
        <nav class="barra-comandi"><div class="barra-comandi__corpo">
          <div class="barra-comandi__comandi">
            <button class="comando" aria-pressed="true">Settimana</button>
            <button class="comando" aria-pressed="false">Mese</button>
          </div>
        </div></nav>
      </main>
    </body></html>`)
  for (const foglio of ['theme.css', 'metrics.css', 'controls.css', 'command-bar.css']) {
    await page.addStyleTag({ path: join(STILI, foglio) })
  }
  await page.addStyleTag({ content: `
      body { margin: 0; font: var(--corpo)/var(--interlinea) var(--carattere); }
      .prova { display: flex; flex-wrap: wrap; gap: 8px; }
      .nota { font-size: var(--corpo-minuto); }
      .campo { flex-basis: 220px; }
      .barra-comandi { flex-basis: 100%; padding: 0; }
    ` })

  expect(numero(await valutaSu<string>(page.locator('body'), DIMENSIONE))).toBe(14)
  expect(numero(await valutaSu<string>(page.locator('.nota'), DIMENSIONE)))
    .toBeGreaterThanOrEqual(12)
  expect(numero(await valutaSu<string>(page.locator('.campo__aiuto'), DIMENSIONE)))
    .toBeGreaterThanOrEqual(12)

  for (const selettore of ['.pulsante', '.pulsante--minuto', '.selettore__voce',
    '.campo__controllo', '.comando']) {
    const scatola = await riquadro(page.locator(selettore).first())
    expect(scatola.height >= 32, `${selettore} ${JSON.stringify(scatola)}`).toBeTruthy()
  }
  const minuto = await riquadro(page.locator('.pulsante--minuto'))
  expect(minuto.width >= 32, JSON.stringify(minuto)).toBeTruthy()

  expect(await valuta(page, 'document.documentElement.scrollWidth <= innerWidth')).toBeTruthy()

  // La scala di Windows cambia la radice. Testo e gradini devono seguirla.
  await valutaSu(page.locator('html'), "e => e.style.fontSize = '20px'")
  expect(numero(await valutaSu<string>(page.locator('body'), DIMENSIONE))).toBe(17.5)
  expect(numero(await valutaSu<string>(page.locator('.nota'), DIMENSIONE)))
    .toBeGreaterThanOrEqual(15)

  const nativa = await browser.newPage({ viewport: { width: 720, height: 480 } })
  await nativa.setContent(`<input type="text"><button>Salva</button>
      <button class="minuto">X</button>`)
  await nativa.addStyleTag({ path: join(STILI, 'theme.css') })
  await nativa.addStyleTag({ path: join(STILI, 'metrics.css') })
  await nativa.addStyleTag({
    path: join(RADICE, 'desktop', 'shell', 'pages', 'shared', 'base.css'),
  })
  for (const selettore of ['input', 'button', 'button.minuto']) {
    const scatola = await riquadro(nativa.locator(selettore).first())
    expect(scatola.height >= 32, `${selettore} ${JSON.stringify(scatola)}`).toBeTruthy()
  }
  await page.close()
  await nativa.close()

  const context = await browser.newContext({
    viewport: { width: 720, height: 480 }, hasTouch: true,
  })
  const tocco = await context.newPage()
  await tocco.setContent(`<button class="pulsante pulsante--minuto">A</button>
      <div class="barra-comandi__comandi">
        <button class="comando" aria-pressed="true">Mese</button>
        <button class="comando" aria-pressed="false">Anno</button>
      </div>`)
  for (const foglio of ['theme.css', 'metrics.css', 'controls.css', 'command-bar.css']) {
    await tocco.addStyleTag({ path: join(STILI, foglio) })
  }
  for (const selettore of ['.pulsante--minuto', '.comando']) {
    const scatola = await riquadro(tocco.locator(selettore).first())
    expect(scatola.height >= 44, `${selettore} ${JSON.stringify(scatola)}`).toBeTruthy()
  }
  const minutoTocco = await riquadro(tocco.locator('.pulsante--minuto'))
  expect(minutoTocco.width >= 44, JSON.stringify(minutoTocco)).toBeTruthy()
  await context.close()
})
