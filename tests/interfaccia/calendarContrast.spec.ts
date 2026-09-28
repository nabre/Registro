// Contrasto dei numeri delle settimane vuote, nei temi chiaro e scuro.
//
// Prerequisiti: Chromium di Playwright installato; npm install.
// Esecuzione dalla cartella app: `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts calendarContrast`.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta, valutaSu } from './banco'

const SELETTORE = '.striscia-settimane__voce--vuota .striscia-settimane__numero'

type Colore = [number, number, number]

function rgb (valore: string): Colore {
  const canali = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(valore)
  expect(canali, `colore non riconosciuto: ${valore}`).toBeTruthy()
  return [Number(canali![1]), Number(canali![2]), Number(canali![3])]
}

function luminanza (colore: Colore): number {
  const lineare = (canale: number): number => {
    const valore = canale / 255
    return valore <= 0.04045 ? valore / 12.92 : ((valore + 0.055) / 1.055) ** 2.4
  }

  const [rosso, verde, blu] = colore.map(lineare)
  return 0.2126 * rosso + 0.7152 * verde + 0.0722 * blu
}

function rapporto (primo: Colore, secondo: Colore): number {
  const [chiaro, scuro] = [luminanza(primo), luminanza(secondo)].sort((a, b) => b - a)
  return (chiaro + 0.05) / (scuro + 0.05)
}

interface Stile { color: string, background: string, opacity: number }

test('calendarContrast', async ({ browser }) => {
  const risultati: Record<string, number> = {}
  for (const schema of ['light', 'dark'] as const) {
    const { page, errori } = await pannello(browser, {
      colorScheme: schema, reducedMotion: 'reduce',
    })
    await valuta(page, "prova.vaiA(prova.PAGINE.find(pagina=>pagina.id==='pagina.calendario'))")
    await valuta(page, FRAME)

    const numeri = page.locator(SELETTORE)
    const quanti = await numeri.count()
    expect(quanti > 0, `nessuna settimana vuota nel tema ${schema}`).toBeTruthy()
    for (let indice = 0; indice < quanti; indice++) {
      const stile = await valutaSu<Stile>(numeri.nth(indice), `elemento => {
              const voce = elemento.closest('.striscia-settimane__voce')
              const testo = getComputedStyle(elemento)
              const contenitore = getComputedStyle(voce)
              return {
                color: testo.color,
                background: contenitore.backgroundColor,
                opacity: Number(contenitore.opacity),
              }
            }`)
      expect(stile.opacity, `${schema}: testo attenuato con opacity ${stile.opacity}`).toBe(1)
      const contrasto = rapporto(rgb(stile.color), rgb(stile.background))
      expect(contrasto >= 4.5,
        `${schema}: contrasto ${contrasto.toFixed(2)}:1, ` +
        `${stile.color} su ${stile.background}`).toBeTruthy()
      risultati[schema] = contrasto
    }

    expect(errori, `errori JavaScript (${schema})`).toEqual([])
    await page.close()
  }

  console.log('calendarContrast: ok; ' + Object.entries(risultati)
    .map(([schema, valore]) => `${schema} ${valore.toFixed(2)}:1`).join(', '))
})
