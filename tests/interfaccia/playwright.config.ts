// Le prove dell'interfaccia su Chromium: `npm run ui-tests` (`tools/uiTests.mjs`),
// che costruisce prima i bundle. Qui e non alla radice perché `tsconfig.json`
// ed ESLint guardano già `tests/`.

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  // Un file è una prova Python di prima, con molti passi in fila: il tetto di
  // trenta secondi di Playwright è pensato per prove più corte.
  timeout: 180_000,
  // Come prima con Python: un'asserzione aspetta cinque secondi.
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  outputDir: '../../dist-tests/interfaccia',
  use: {
    browserName: 'chromium',
    headless: true,
  },
})
