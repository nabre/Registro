// I gesti della finestra che nessun'altra prova faceva, su Chromium.
//
// - Ctrl+Z, Ctrl+Y e Ctrl+Maiusc+Z fuori da un campo mandano `storia.annulla`
//   e `storia.ripristina`; dentro un campo di testo il tasto resta del campo, e
//   senza niente da annullare non parte niente;
// - il tasto destro su un'ora del calendario apre il suo menu: voci con ruolo
//   `menuitem`, Esc lo chiude, una voce fa quel che dice;
// - cambiando posto partono `proiezione.mira` e `assistente.contesto`, una
//   volta sola: un ridisegno che non cambia posto non li rimanda;
// - senza rete la barra di stato lo dice, e tornata la rete smette.
//
// Guardano solo quel che si vede da fuori: ruoli, nomi, i messaggi al ponte.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, FRAME, attendi, pannello, valuta } from './banco'

/** Quante azioni di quel tipo sono partite dall'ultimo svuotamento. */
const QUANTE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).length'

test('annulla e ripristina da tastiera, fuori da un campo', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, 'prova.aggiorna({ storia: { annulla: 2, ripristina: 1 } })')
  await valuta(page, FOTOGRAMMA)
  await valuta(page, '() => document.activeElement?.blur()')
  await valuta(page, 'richieste.length = 0')

  await page.keyboard.press('Control+z')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='storia.annulla')")
  await page.keyboard.press('Control+y')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='storia.ripristina')")
  await page.keyboard.press('Control+Shift+z')
  await attendi(page, `(${QUANTE})('storia.ripristina') === 2`)
  expect(await valuta(page, QUANTE, 'storia.annulla')).toBe(1)

  // Dentro un campo di testo Ctrl+Z è del campo: il registro non ne sa niente.
  await valuta(page, `() => {
    const campo = document.createElement('input')
    campo.setAttribute('aria-label', 'Campo di prova')
    document.body.append(campo)
  }`)
  const campo = page.getByRole('textbox', { name: 'Campo di prova' })
  await campo.fill('abc')
  await campo.press('Control+z')
  await campo.press('Control+y')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, QUANTE, 'storia.annulla')).toBe(1)
  expect(await valuta(page, QUANTE, 'storia.ripristina')).toBe(2)

  // Niente da annullare: non parte niente, e lo si dice.
  await valuta(page, 'prova.aggiorna({ storia: { annulla: 0, ripristina: 0 } })')
  await valuta(page, FOTOGRAMMA)
  await valuta(page, '() => document.activeElement?.blur()')
  await page.keyboard.press('Control+z')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, QUANTE, 'storia.annulla')).toBe(1)
  await expect(page.locator('.notifica--avviso')).not.toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

test('il menu del tasto destro su un’ora del calendario', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const lezioneId = await valuta<string>(page, 'prova.stato.registro.lezioni[0].id')
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  // Col filtro sul corso di DIC4a: le due classi hanno l'ora alla stessa ora, e
  // la settimana non le affianca, quindi senza filtro una copre l'altra.
  await valuta(page, "prova.aggiorna({ modoCalendario: 'settimana', data: '2026-09-14', editorCalendario: false, " +
    'filtroCorsoAgendaId: prova.stato.registro.lezioni[0].corsoId })')
  await valuta(page, FRAME)

  const blocco = page.locator('.blocco', { hasText: 'DIC4a' }).first()
  await expect(blocco).toBeVisible()
  const voce = (nome: string | RegExp) => page.getByRole('menuitem', { name: nome })
  const menu = page.getByRole('menu').filter({ has: voce('Apri la lezione') })

  // Si apre, con le voci per ruolo; fuori dalla modifica niente voci d'orario.
  await blocco.click({ button: 'right' })
  await expect(menu).toBeVisible()
  await expect(voce(/^Prepara la supplenza/)).toBeVisible()
  await expect(voce('Allunga di un’unità didattica')).toHaveCount(0)
  // Esc lo chiude, senza aprire niente.
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')

  // Una voce fa quel che dice: la supplenza apre la sua finestra.
  await blocco.click({ button: 'right' })
  await voce(/^Prepara la supplenza/).click()
  const dialogo = page.getByRole('dialog', { name: 'Prepara la supplenza' })
  await expect(dialogo).toBeVisible()
  await expect(menu).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)

  // «Apri la lezione» porta all'ora.
  await blocco.click({ button: 'right' })
  await voce('Apri la lezione').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe(lezioneId)
  expect(await valuta(page, 'prova.stato.vista')).not.toBe('calendario')

  expect(errori).toEqual([])
  await page.close()
})

test('cambiando posto partono la mira dello schermo e il contesto dell’assistente', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const [primo, secondo] = await valuta<[string, string]>(page,
    '[prova.stato.registro.corsi[0].id, prova.stato.registro.corsi[1].id]')
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')

  const VAI = "(id) => prova.vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id } }, { contesto: { corsoId: id } })"
  const MIRA = "(id) => richieste.some(m => m.azione?.tipo === 'proiezione.mira' && m.azione.mira?.corsoId === id)"
  await valuta(page, VAI, secondo)
  await attendi(page, MIRA, secondo)
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'assistente.contesto' && m.azione.contesto !== null)")

  // Un ridisegno che non cambia posto non rimanda niente.
  const prima = [
    await valuta<number>(page, QUANTE, 'proiezione.mira'),
    await valuta<number>(page, QUANTE, 'assistente.contesto'),
  ]
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FRAME)
  expect([
    await valuta<number>(page, QUANTE, 'proiezione.mira'),
    await valuta<number>(page, QUANTE, 'assistente.contesto'),
  ]).toEqual(prima)

  // Un altro corso: una mira nuova, e un contesto diverso dal precedente.
  const contestoDiPrima = await valuta<string>(page,
    "JSON.stringify(richieste.filter(m => m.azione?.tipo === 'assistente.contesto').at(-1).azione.contesto)")
  await valuta(page, VAI, primo)
  await attendi(page, MIRA, primo)
  await attendi(page, `(${QUANTE})('assistente.contesto') > ${prima[1]}`)
  const contestoDopo = await valuta<string>(page,
    "JSON.stringify(richieste.filter(m => m.azione?.tipo === 'assistente.contesto').at(-1).azione.contesto)")
  expect(contestoDopo).not.toBe(contestoDiPrima)

  expect(errori).toEqual([])
  await page.close()
})

test('senza rete la barra di stato lo dice', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const barra = page.locator('.barra-stato')
  await expect(barra).toBeVisible()
  await expect(barra).not.toContainText('senza rete')

  await page.context().setOffline(true)
  await expect(barra).toContainText('senza rete')
  await page.context().setOffline(false)
  await expect(barra).not.toContainText('senza rete')

  expect(errori).toEqual([])
  await page.close()
})
