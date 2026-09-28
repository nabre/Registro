// Il suggerimento dietro la «i», provato su Chromium.
//
// Le cose che `node --test` non vede, perché vivono nel puntatore e nei tasti:
//
// - la spiegazione non si vede finché non la si chiede, ma il lettore di schermo
//   la trova lo stesso (`aria-describedby` su un testo nascosto);
// - il puntatore fermo sopra la «i» la apre dopo un attimo, e andandosene la
//   chiude; il clic la ferma aperta, un clic altrove la chiude;
// - dentro una finestra modale Esc chiude la spiegazione e **non** la finestra
//   (era il rischio: un solo Esc si portava via quel che c'era scritto);
// - il campo con l'aiuto porta la descrizione anche lui, e il suo nome resta la
//   sua etichetta — senza il nome del segno che ci sta dentro;
// - un ridisegno che toglie la «i» dalla pagina chiude il fumetto invece di
//   lasciarlo appeso all'aria.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta, valutaSu } from './banco'

// Il check del primo corso, con una colonna: serve per la finestra «Scegli la
// data…», che ha un campo con la sua «i».
const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const check = { id: 'chk-prova', corsoId: corso.id,
    colonne: [{ id: 'c1', titolo: 'Regolamento' }], spunte: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-10T08:00:00.000Z' }
  prova.vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } },
    { altro: { registro: { ...r, check: [check] } } })
}`

test('suggerimento', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  // La pagina delle classi: la testata porta la sua «i».
  await valuta(page, "() => prova.vai({ pagina: 'pagina.classi' })")
  await valuta(page, FOTOGRAMMA)

  const fumetto = page.locator('.suggerimento__fumetto')
  const titolo = page.locator('.vista--classi .testata__titolo')
  const segno = titolo.locator('.suggerimento__segno')
  await expect(segno).toHaveCount(1)

  // Chiusa: il testo c'è, per chi ascolta, ma non si vede.
  const testo = titolo.locator('.suggerimento__testo')
  await expect(testo).toBeHidden()
  await expect(testo).toContainText('recapiti')
  expect(await segno.getAttribute('aria-describedby')).toBe(await testo.getAttribute('id'))
  expect(await segno.getAttribute('aria-expanded')).toBe('false')
  expect(await segno.getAttribute('title'), 'un title farebbe comparire la frase due volte')
    .toBeNull()
  await expect(fumetto).toHaveCount(0)

  // Il puntatore fermo la apre, andandosene la chiude.
  await segno.hover()
  await expect(fumetto).toHaveCount(1)
  await expect(fumetto).toContainText('recapiti')
  expect(await segno.getAttribute('aria-expanded')).toBe('true')
  await page.mouse.move(5, 995)
  await expect(fumetto).toHaveCount(0)

  // Il clic la ferma: il puntatore che se ne va non la chiude più.
  await segno.click()
  await expect(fumetto).toHaveCount(1)
  await page.mouse.move(5, 995)
  // Attesa fissa voluta: prova che il fumetto fermato NON si chiude dopo il
  // ritardo con cui si chiuderebbe al puntatore che se ne va.
  await page.waitForTimeout(400)
  await expect(fumetto).toHaveCount(1)
  // Sta nella finestra, sotto o sopra il segno.
  const riquadro = await fumetto.boundingBox()
  expect(riquadro !== null && riquadro.x >= 0 && riquadro.x + riquadro.width <= 1440,
    JSON.stringify(riquadro)).toBeTruthy()
  // Un clic altrove la chiude.
  await page.mouse.click(700, 990)
  await expect(fumetto).toHaveCount(0)

  // Un ridisegno toglie la «i» di sotto: il fumetto non resta orfano.
  await segno.click()
  await expect(fumetto).toHaveCount(1)
  await valuta(page, "() => prova.vai({ pagina: 'pagina.calendario' })")
  await expect(fumetto).toHaveCount(0)
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)

  // Dentro una modale: «Scegli la data…» ha il campo con la sua «i».
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')
  await page.locator(`[data-fuoco="check-${allievo}-c1"]`).click({ button: 'right' })
  await page.locator('.menu').getByRole('menuitem', { name: 'Scegli la data…' }).click()
  const finestra = page.locator('form.modale')
  await expect(finestra).toHaveCount(1)
  const segnoCampo = finestra.locator('.campo .suggerimento__segno')
  await expect(segnoCampo).toHaveCount(1)
  await expect(finestra.locator('small.campo__aiuto')).toHaveCount(0)
  // Il campo porta la stessa descrizione del segno.
  const descritto = finestra.locator('input.campo__controllo--data')
  expect(await descritto.getAttribute('aria-describedby'))
    .toBe(await segnoCampo.getAttribute('aria-describedby'))
  // Il segno sta nella sua `<label>` ma non entra nel nome del campo: «Fatto
  // il», non «Fatto il Spiegazione: Fatto il».
  const nome = await valuta(page, `() => {
      const c = document.querySelector('form.modale input.campo__controllo--data')
      return c.getAttribute('aria-label')
    }`)
  const etichetta = await valutaSu(finestra.locator('label.campo__etichetta').first(),
    'l => l.firstChild.textContent')
  expect(nome, JSON.stringify([nome, etichetta])).toBe(etichetta)

  // Col tabulatore si apre da sé; Esc chiude lei e non la finestra.
  await segnoCampo.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(fumetto).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(fumetto).toHaveCount(0)
  await expect(finestra).toHaveCount(1)
  // A fumetto chiuso Esc è di nuovo della finestra.
  await page.keyboard.press('Escape')
  await expect(finestra).toHaveCount(0)

  expect(errori).toEqual([])
})
