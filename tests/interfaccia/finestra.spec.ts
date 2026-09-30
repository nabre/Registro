// Le tabelle lunghe a finestra (`components/virtualList.ts`, ADR-50 passo 5): si
// disegna quel che si vede, e il resto deve restare raggiungibile.
//
// Qui si prova, con i dati grandi di `prova.datiGrandi`, che:
//
// - la griglia dei voti (200 prove) arriva in fondo scorrendo, dice quante
//   colonne ha a chi legge con la voce, e porta la tastiera (frecce, Invio,
//   Tab) su colonne non ancora disegnate;
// - un voto scritto in fondo, dopo lo scorrimento, va alla prova e alla
//   persona giuste; la casella col fuoco resta anche quando scorre via;
// - il ritorno dell'host (un ridisegno intero) lascia lo scorrimento e la
//   scatola dove erano;
// - la matrice dell'archivio (125 richieste) arriva all'ultima colonna, e la
//   casella di quella colonna spunta la richiesta giusta;
// - l'elenco delle persone (mille) arriva all'ultima, la sceglie, tiene lo
//   scorrimento, e la ricerca trova anche chi non è disegnato.

import { expect, test, type Page } from '@playwright/test'

import { FRAME, ULTIMA, attendiRisposte, pannello, valuta, valutaSu } from './banco'

/** Aspetta che la finestra abbia seguito lo scorrimento: l'isola si rifà al fotogramma dopo. */
async function assesta (page: Page): Promise<void> {
  await valuta(page, FRAME)
  await valuta(page, FRAME)
}

async function griglia (page: Page) {
  await valuta(page, 'prova.datiGrandi.voti(200)')
  await valuta(page, "() => prova.vai({ pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'corso', " +
    'id: prova.stato.registro.corsi[0].id } })')
  await assesta(page)
  return page.locator('.vista--valutazioni .tabella-contenitore').first()
}

test('voti_fino_in_fondo', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1200, altezza: 800 })
  const scatola = await griglia(page)
  const tabella = scatola.locator('table')
  await expect(tabella).toHaveAttribute('aria-colcount', '203')
  const disegnate = await tabella.locator('thead th.tabella__momento').count()
  expect(disegnate, 'la finestra disegna tutte le colonne').toBeLessThan(40)
  expect(disegnate).toBeGreaterThan(2)

  // In fondo: l'ultima prova c'è, al suo posto di colonna.
  await valutaSu(scatola, '(el) => { el.scrollLeft = el.scrollWidth }')
  await assesta(page)
  const ultima = tabella.locator('thead th.tabella__momento').last()
  await expect(ultima).toContainText('Prova 200')
  await expect(ultima).toHaveAttribute('aria-colindex', '201')
  await expect(ultima).toBeInViewport()

  // Una colonna in mezzo: la 120 si raggiunge scorrendo fin lì.
  const x = await valutaSu<number>(tabella.locator('thead th.tabella__momento').first(),
    '(th) => th.getBoundingClientRect().width')
  await valutaSu(scatola, '(el, x) => { el.scrollLeft = x * 119 }', x)
  await assesta(page)
  await expect(tabella.locator('thead th.tabella__momento', { hasText: 'Prova 120' })).toHaveCount(1)
  await expect(tabella.locator('input[data-riga="39"][data-colonna="119"]')).toHaveCount(1)
  expect(errori).toEqual([])
  await page.close()
})

test('voti_tastiera', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1200, altezza: 800 })
  const scatola = await griglia(page)
  const tabella = scatola.locator('table')

  // Freccia a destra oltre la finestra: la colonna nasce e prende il fuoco.
  // Dentro una casella scritta la freccia muove prima il cursore: Fine lo
  // porta in fondo, e la freccia dopo passa alla casella accanto.
  await tabella.locator('input[data-riga="0"][data-colonna="0"]').focus()
  for (let n = 0; n < 30; n += 1) {
    await page.keyboard.press('End')
    await page.keyboard.press('ArrowRight')
  }
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '30')
  await expect(page.locator(':focus')).toBeInViewport()

  // Tab e Maiusc+Tab: una casella avanti e una indietro, anche fra le colonne nuove.
  for (let n = 0; n < 12; n += 1) await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '42')
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '41')

  // Invio in fondo alla colonna passa in cima a quella dopo.
  await tabella.locator('input[data-riga="39"][data-colonna="41"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '42')
  await expect(page.locator(':focus')).toHaveAttribute('data-riga', '0')

  // Tab dall'ultima casella di una riga va alla prima della riga dopo.
  await valutaSu(scatola, '(el) => { el.scrollLeft = el.scrollWidth }')
  await assesta(page)
  await tabella.locator('input[data-riga="2"][data-colonna="199"]').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '0')
  await expect(page.locator(':focus')).toHaveAttribute('data-riga', '3')
  expect(errori).toEqual([])
  await page.close()
})

test('voti_scritto_dopo_lo_scorrimento', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1200, altezza: 800 })
  const scatola = await griglia(page)
  const tabella = scatola.locator('table')
  await valutaSu(scatola, '(el) => { el.scrollLeft = el.scrollWidth }')
  await assesta(page)

  const casella = tabella.locator('input[data-riga="3"][data-colonna="198"]')
  await casella.fill('5')
  await casella.press('Enter')
  await attendiRisposte(page)
  expect(await valuta(page, ULTIMA, 'voto.imposta')).toEqual({
    tipo: 'voto.imposta', valutazioneId: 'val-198', allievoId: 'al-3', valore: 5, assente: false,
  })

  // La casella col fuoco resta disegnata anche se si scorre all'inizio: quel
  // che vi si sta scrivendo non va perso.
  await casella.focus()
  await page.keyboard.type('4')
  await valutaSu(scatola, '(el) => { el.scrollLeft = 0 }')
  await assesta(page)
  await expect(page.locator(':focus')).toHaveAttribute('data-colonna', '198')
  await expect(tabella.locator('thead th.tabella__momento', { hasText: 'Prova 1' }).first()).toBeVisible()
  expect(errori).toEqual([])
  await page.close()
})

test('voti_ridisegno_tiene_il_posto', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1200, altezza: 800 })
  const scatola = await griglia(page)
  await valutaSu(scatola, '(el) => { el.scrollLeft = el.scrollWidth / 2; window.__scatola = el }')
  await assesta(page)
  const prima = await valutaSu<number>(scatola, '(el) => el.scrollLeft')
  const colonne = await valuta<string>(page,
    "() => [...document.querySelectorAll('.tabella--voti thead th.tabella__momento')].map(t => t.textContent).join('|')")

  await valuta(page, '() => prova.datiGrandi.votoCambiato()')
  await assesta(page)
  expect(await valutaSu(scatola, '(el) => el === window.__scatola'), 'la scatola è un nodo nuovo').toBeTruthy()
  expect(await valutaSu<number>(scatola, '(el) => el.scrollLeft')).toBe(prima)
  expect(await valuta<string>(page,
    "() => [...document.querySelectorAll('.tabella--voti thead th.tabella__momento')].map(t => t.textContent).join('|')"))
    .toBe(colonne)
  expect(errori).toEqual([])
  await page.close()
})

test('archivio_ultima_colonna', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1400, altezza: 900 })
  await valuta(page, 'prova.datiGrandi.archivio(125)')
  await valuta(page, "() => prova.vai({ pagina: 'pagina.classe.documenti' })")
  await assesta(page)
  const tabella = page.locator('.tabella--documenti')
  await expect(tabella).toHaveAttribute('aria-colcount', '127')
  expect(await tabella.locator('thead th.tabella__richiesta').count()).toBeLessThan(40)

  // Senza foglio aperto scorre di lato la pagina: si porta in fondo.
  await valutaSu(page.locator('main.contenuto'), '(el) => { el.scrollLeft = el.scrollWidth }')
  await assesta(page)
  // Le richieste senza termine vanno per titolo: l'ultima è «Certificato 99».
  const ultima = tabella.locator('thead th.tabella__richiesta').last()
  await expect(ultima).toContainText('Certificato 99')
  await expect(ultima).toHaveAttribute('aria-colindex', '126')

  // La casella di quella colonna tocca la richiesta giusta: cons-98, dove al-1 non
  // ha la spunta ((1 + 98) % 3 = 0) e il clic la mette.
  const cella = tabella.locator('tbody tr', { hasText: 'Cognome01' })
    .locator('td.tabella__cella--pagine').last()
  await expect(cella).toHaveAttribute('data-consegna', 'cons-98')
  await valutaSu(cella.locator('.cella-documento').first(), '(b) => b.click()')
  await attendiRisposte(page)
  expect(await valuta(page, ULTIMA, 'consegna.spunta')).toEqual({
    tipo: 'consegna.spunta', consegnaId: 'cons-98', chi: 'al-1', fatta: true,
  })
  expect(errori).toEqual([])
  await page.close()
})

test('persone_mille', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1400, altezza: 800 })
  await valuta(page, 'prova.datiGrandi.persone(25)')
  await valuta(page, "() => prova.vai({ pagina: 'pagina.persone' })")
  await assesta(page)
  const elenco = page.locator('.vista--persone .elenco-laterale')
  const disegnate = await elenco.locator('.voce-laterale').count()
  expect(disegnate, 'la finestra disegna tutte le persone').toBeLessThan(200)
  expect(disegnate).toBeGreaterThan(5)
  await expect(elenco.locator('li[aria-setsize="40"]').first()).toHaveAttribute('aria-posinset', '1')

  // In fondo: l'ultima della venticinquesima classe, con la sua testata appiccicata.
  await valutaSu(elenco, '(el) => { el.scrollTop = el.scrollHeight; window.__elenco = el }')
  await assesta(page)
  const ultima = elenco.locator('li[aria-posinset="40"]').last()
  await expect(ultima).toContainText('Cognome39')
  await expect(ultima).toContainText('C24')
  await expect(elenco.locator('.elenco-laterale__gruppo', { hasText: 'C24' })).toBeVisible()

  // Sceglierla ridisegna la pagina: l'elenco resta la stessa scatola, allo stesso punto.
  const alto = await valutaSu<number>(elenco, '(el) => el.scrollTop')
  await valutaSu(ultima.locator('button'), '(b) => b.click()')
  await assesta(page)
  expect(await valuta(page, 'prova.stato.allievoId')).toBe('p-24-39')
  expect(await valutaSu(elenco, '(el) => el === window.__elenco'), 'l’elenco si è rifatto').toBeTruthy()
  expect(await valutaSu<number>(elenco, '(el) => el.scrollTop')).toBe(alto)
  await expect(elenco.locator('.voce-laterale--attiva')).toHaveCount(1)

  // La ricerca lavora sui dati: trova chi era in cima, fuori dal disegno.
  await elenco.locator('input[type="search"]').fill('C03 Cognome07')
  await expect(elenco.locator('.voce-laterale')).toHaveCount(1)
  await expect(elenco.locator('.elenco-laterale__conto')).toHaveText('1')

  // Tab scende di voce in voce oltre quelle disegnate all'inizio.
  await elenco.locator('input[type="search"]').fill('')
  await valutaSu(elenco, '(el) => { el.scrollTop = 0 }')
  await assesta(page)
  await elenco.locator('.voce-laterale').nth(1).focus()
  // Un fotogramma fra un tasto e l'altro, come chi preme: la finestra segue il fuoco.
  for (let n = 0; n < 45; n += 1) {
    await page.keyboard.press('Tab')
    await valuta(page, FRAME)
  }
  await expect(page.locator(':focus')).toHaveClass(/voce-laterale/)
  await expect(page.locator(':focus')).toBeInViewport()
  expect(errori).toEqual([])
  await page.close()
})
