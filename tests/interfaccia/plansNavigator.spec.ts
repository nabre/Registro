// Il navigatore della pagina dei piani: l'unica strada fra le ore del corso.
//
// La pagina aveva un elenco a sinistra con le ore per semestre; adesso il piano
// prende tutta la larghezza e si va da un'ora all'altra con le frecce, con Alt+↑
// e Alt+↓ fuori dai campi, o con l'elenco che si apre dall'ora di adesso: tutte
// le ore con il loro stato, e in fondo i piani che nessuna ora usa. Un'ora
// senza piano offre di crearlo o di assegnarne uno, senza inventarne il
// contenuto.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta } from './banco'

// Tre ore del primo corso, una settimana dopo l'altra: la prima col suo piano,
// le altre senza; e una bozza dello stesso corso che nessuna ora usa.
const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const base = r.lezioni.find((l) => l.corsoId === corso.id)
  const giorno = (n) => {
    const d = new Date(base.data + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 7 * n)
    return d.toISOString().slice(0, 10)
  }
  const ora = (n, pianoId) => ({ ...base, id: 'ora-' + n, data: giorno(n), stato: 'pianificata',
    pianoId, avanzamento: [] })
  const piano = (id, obiettivo) => ({ id, corsoId: corso.id, obiettivi: [obiettivo], prerequisiti: '',
    attivita: [], risorse: [], tag: [], creatoIl: '2026-09-01T08:00:00.000Z',
    aggiornatoIl: '2026-09-01T08:00:00.000Z' })
  const lezioni = [...r.lezioni.filter((l) => l.corsoId !== corso.id), ora(0, 'piano-a'), ora(1, null),
    ora(2, null)]
  prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: 'piano-a' } },
    { contesto: { corsoId: corso.id, lezioneId: 'ora-0' },
      altro: { registro: { ...r, lezioni, piani: [piano('piano-a', 'Le frazioni'), piano('bozza-b', 'Ripasso')] } } })
}`

test('navigatore dei piani', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)

  const vista = page.locator('.vista--piani')
  // Niente più elenco a sinistra: il piano sta da solo sotto la testata.
  await expect(vista.locator('.elenco-laterale')).toHaveCount(0)
  await expect(vista.locator('.piano-editor')).toHaveCount(1)

  const navigatore = vista.locator('.navigatore-piani')
  const precedente = navigatore.getByRole('button', { name: /Lezione precedente/ })
  const successiva = navigatore.getByRole('button', { name: /Lezione successiva/ })
  await expect(precedente).toBeDisabled()
  await expect(navigatore.locator('.navigatore-piani__sintesi')).toContainText('su 3 preparate')

  // Avanti: l'ora senza piano, che offre di crearlo o di assegnarne uno.
  await successiva.click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe('ora-1')
  await expect(vista.getByRole('button', { name: 'Crea il piano' })).toBeVisible()
  await expect(vista.getByRole('button', { name: 'Assegna un piano che c’è' })).toBeVisible()

  // Alt+↑ fuori dai campi torna indietro; Alt+← resta del cammino fra le pagine.
  await valuta(page, '() => document.activeElement?.blur()')
  await page.keyboard.press('Alt+ArrowUp')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe('ora-0')
  expect(await valuta(page, 'prova.stato.pianoId')).toBe('piano-a')

  // L'elenco: tre ore e la bozza in fondo, l'ora di adesso accesa.
  const centro = navigatore.locator('.navigatore-piani__ora')
  await centro.click()
  const elenco = page.getByRole('listbox', { name: 'Lezioni del corso' })
  await expect(elenco).toBeVisible()
  await expect(centro).toHaveAttribute('aria-expanded', 'true')
  const voci = elenco.getByRole('option')
  await expect(voci).toHaveCount(4)
  await expect(voci.first()).toHaveAttribute('aria-selected', 'true')
  await expect(elenco).toContainText('Piani non assegnati')
  await expect(voci.nth(1)).toContainText('senza piano')

  // Da tastiera: giù fino alla bozza, Invio la apre.
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await valuta(page, FOTOGRAMMA)
  await expect(elenco).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.pianoId')).toBe('bozza-b')

  // Esc chiude senza scegliere.
  await centro.click()
  await expect(page.getByRole('listbox', { name: 'Lezioni del corso' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox', { name: 'Lezioni del corso' })).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.pianoId')).toBe('bozza-b')

  expect(errori).toEqual([])
})
