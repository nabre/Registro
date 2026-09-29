// Apertura dei documenti da tastiera, nelle righe.
//
// Esecuzione: `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts documentsKeyboard`.

import { expect, test } from '@playwright/test'

import { FRAME, attendi, pannello, valuta } from './banco'

test('documentsKeyboard', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  // Riga: il nome visibile e' un vero pulsante. Invio e Spazio aprono il PDF.
  const percorsoRiga = await valuta<string>(page, `() => {
      const r = prova.stato.registro
      const c = r.corsi[0]
      const d = prova.collocazioneDi(r, 'corso', c.id, {semestreId: null})
      const percorso = prova.percorsoDi(d)
      prova.vai({pagina: 'pagina.corso.documenti', soggetto: {tipo: 'corso', id: c.id}}, {
        contesto: {filtroClasseId: c.classeId},
        altro: {schedaDocumenti: 'corso', semestreId: null,
          esportati: [{percorso, misura: 10, revisione: 0}], anteprima: null}})
      return percorso
    }`)
  await valuta(page, FRAME)
  let apriNome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first()
  await expect(apriNome).toBeEnabled()
  await expect(apriNome).toHaveAccessibleName('Scheda del corso')
  await apriNome.press('Enter')
  await attendi(page, '(percorso) => prova.stato.anteprima === percorso', percorsoRiga)
  expect(await valuta(page, 'prova.stato.anteprima')).toBe(percorsoRiga)
  await valuta(page, 'prova.aggiorna({anteprima: null})')
  await attendi(page, '() => prova.stato.anteprima === null')
  await valuta(page, FRAME)
  apriNome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first()
  await apriNome.press('Space')
  await attendi(page, '(percorso) => prova.stato.anteprima === percorso', percorsoRiga)
  expect(await valuta(page, 'prova.stato.anteprima')).toBe(percorsoRiga)

  // Lente: il pulsante dedicato riceve entrambi i tasti.
  await valuta(page, 'prova.aggiorna({anteprima: null})')
  await attendi(page, '() => prova.stato.anteprima === null')
  await valuta(page, FRAME)
  let apriLente = page.locator('.documenti__riga--apribile .documenti__apri').first()
  await expect(apriLente).toBeEnabled()
  await expect(apriLente).not.toHaveAttribute('aria-label', '')
  await apriLente.press('Enter')
  await attendi(page, '(percorso) => prova.stato.anteprima === percorso', percorsoRiga)
  expect(await valuta(page, 'prova.stato.anteprima')).toBe(percorsoRiga)
  await valuta(page, 'prova.aggiorna({anteprima: null})')
  await attendi(page, '() => prova.stato.anteprima === null')
  await valuta(page, FRAME)
  apriLente = page.locator('.documenti__riga--apribile .documenti__apri').first()
  await apriLente.press('Space')
  await attendi(page, '(percorso) => prova.stato.anteprima === percorso', percorsoRiga)
  expect(await valuta(page, 'prova.stato.anteprima')).toBe(percorsoRiga)

  expect(errori).toEqual([])
})
