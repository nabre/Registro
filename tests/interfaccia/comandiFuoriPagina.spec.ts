// I comandi che partono da fuori dalla loro pagina.
//
// Tre strade arrivano a un comando senza passare dalla barra, e tutte e
// tre lo facevano partire in un posto dove la barra non l'avrebbe mai mostrato:
//
// - la palette elencava tutti i comandi, anche quelli di un'altra pagina: aperta
//   un'ora, tornati al calendario, Ctrl+K «svolta» Invio segnava svolta un'ora
//   che non si vedeva più;
// - Ctrl+Alt+N dal menu nativo apriva un modulo «Nuova lezione» senza il corso
//   scelto e sul giorno di oggi invece che su quello guardato — non quello del
//   pulsante «Nuova ora», che dice di essere la stessa cosa;
// - Ctrl+Alt+T portava il calendario a oggi ma lasciava la striscia dei mesi
//   dov'era stata scorsa, e oggi non si vedeva;
// - un acceleratore del menu con una finestra aperta cambiava pagina sotto la
//   finestra, o ne apriva una seconda sopra.

import { expect, test } from '@playwright/test'

import { FRAME, OGGI, attendi, pannello, valuta, valutaSu } from './banco'

// Come fa l'host: un messaggio `naviga` che arriva dalla finestra.
const NAVIGA = "(m) => window.dispatchEvent(new MessageEvent('message', { data: { tipo: 'naviga', ...m } }))"

// Ctrl+K «svolta» dal calendario non segna l'ora aperta prima.
test('palette_fuori_posto', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const lezione = await valuta<string>(page, 'prova.stato.registro.lezioni[0].id')
  await valuta(page, `prova.apriLezione('${lezione}')`)
  await valuta(page, FRAME)
  await valuta(page, "prova.vai({ pagina: 'pagina.calendario' })")
  await valuta(page, FRAME)
  // L'ora è ancora quella «del contesto», ma la pagina non la mostra più.
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe(lezione)
  await valuta(page, 'richieste.length = 0')
  await page.locator('body').press('Control+k')
  const campo = page.locator('.palette__campo')
  await expect(campo).toBeFocused()
  await campo.fill('conclusa')
  const riga = page.locator('.palette__voce').filter({ hasText: 'Conclusa' }).first()
  // La riga c'è ancora («dov'era quella cosa?»), ma spenta e con il perché.
  await expect(riga).toHaveClass(/palette__voce--impedita/)
  await campo.press('Enter')
  await valuta(page, FRAME)
  const partite = await valuta<number>(
    page, "richieste.filter(m => m.azione?.tipo === 'lezione.stato').length",
  )
  expect(partite, 'Conclusa partita da una pagina che non mostra l’ora').toBe(0)
  await expect(page.locator('.notifica--avviso')).toHaveCount(1)
  // Nella sua pagina invece risponde, come prima.
  // Su un'ora finita: «Conclusa» si accende solo passato il suo orario.
  const finita = await valuta<string>(page, 'prova.stato.registro.lezioni.find(l => ' +
    "l.data < prova.stato.adessoData && l.stato === 'pianificata').id")
  await valuta(page, `prova.apriLezione('${finita}')`)
  await valuta(page, FRAME)
  await page.locator('body').press('Control+k')
  await page.locator('.palette__campo').fill('conclusa')
  await page.locator('.palette__campo').press('Enter')
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'lezione.stato')")
  expect(errori).toEqual([])
  await page.close()
})

// Ctrl+Alt+N dal menu apre lo stesso modulo del pulsante «Nuova ora».
test('nuova_ora_dal_menu', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const corso = await valuta<string>(page, 'prova.stato.registro.corsi[1].id')
  await valuta(page, `prova.vai({ pagina: 'pagina.calendario' }, { contesto: { corsoId: '${corso}', ` +
    "filtroClasseId: null }, altro: { data: '2026-09-16' } })")
  await valuta(page, FRAME)
  // L'host manda sempre «oggi»: è il pannello che sa quale giorno si guarda.
  await valuta(page, NAVIGA, { vista: 'calendario', data: '2026-10-20', nuovo: true })
  const modale = page.locator('.modale')
  await expect(modale).toHaveCount(1)
  await expect(modale.locator('select[name="corsoId"]')).toHaveValue(corso)
  await expect(modale.locator('input[name="data"]')).toHaveValue('2026-09-16')
  expect(errori).toEqual([])
  await page.close()
})

// Ctrl+Alt+T riporta la striscia dei mesi su oggi, come il pulsante «Oggi».
test('oggi_dal_menu', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const oggi = await valuta<string>(page, OGGI)
  await valuta(page, `prova.vai({ pagina: 'pagina.calendario' }, { altro: { modoCalendario: 'mese', data: '${oggi}' } })`)
  await valuta(page, FRAME)
  const striscia = page.locator('.mese__scorrevole')
  await expect(striscia).toHaveCount(1)
  const centrata = await valutaSu<number>(striscia, '(el) => el.scrollTop')
  await valutaSu(striscia, '(el) => { el.scrollTop = el.scrollTop + 900; el.dispatchEvent(new Event("scroll")) }')
  await valuta(page, FRAME)
  expect(Math.abs(await valutaSu<number>(striscia, '(el) => el.scrollTop') - centrata))
    .toBeGreaterThan(100)
  await valuta(page, NAVIGA, { vista: 'calendario', data: oggi })
  await valuta(page, FRAME)
  await valuta(page, FRAME)
  const dopo = await valutaSu<number>(page.locator('.mese__scorrevole'), '(el) => el.scrollTop')
  expect(Math.abs(dopo - centrata), 'La striscia è rimasta dove era stata scorsa').toBeLessThan(50)
  expect(errori).toEqual([])
  await page.close()
})

// Un acceleratore del menu non cambia pagina sotto una finestra aperta.
test('menu_con_modale_aperta', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vai({ pagina: 'pagina.calendario' })")
  await valuta(page, FRAME)
  await valuta(page, NAVIGA, { vista: 'calendario', nuovo: true })
  await expect(page.locator('.modale')).toHaveCount(1)
  await valuta(page, NAVIGA, { vista: 'classi', nuovo: true })
  await valuta(page, FRAME)
  await expect(page.locator('.modale')).toHaveCount(1)
  expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')
  await expect(page.locator('.notifica--avviso')).toHaveCount(1)
  await valuta(page, NAVIGA, { vista: 'impostazioni' })
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')
  expect(errori).toEqual([])
  await page.close()
})
