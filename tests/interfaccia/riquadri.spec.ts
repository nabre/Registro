// I riquadri che non si rifanno: la mappa, la mappa piccola, la striscia del mese.
//
// Il registro ridisegna tutto a ogni cambio di stato. Un riquadro ricreato a
// ogni disegno perde quel che chi guarda ha fatto con le mani: la mappa tornava
// all'inquadratura automatica e ricaricava i tasselli, la mappa piccola della
// scheda perdeva spostamento e ingrandimento, la striscia del mese perdeva lo
// scorrimento in corsa. Qui si guarda che dopo un ridisegno il nodo sia lo stesso
// e che la mano non sia stata disfatta. Prima della correzione erano rosse.

import { expect, test, type Page } from '@playwright/test'

import { FRAME, pannello, riquadro, valuta, valutaSu } from './banco'

// Un indirizzo di casa collocato per la prima allieva: la mappa ha un punto
// oltre alla sede, e la scheda la sua mappa piccola.
const CON_UN_INDIRIZZO = `() => {
  const registro = structuredClone(prova.stato.registro)
  const allieva = registro.classi[0].allievi[0]
  allieva.indirizzo = { via: 'Via Cantonale 1', cap: '6900', localita: 'Lugano' }
  registro.coordinate.push({
    chiave: 'via cantonale 1, 6900 lugano',
    indirizzo: 'Via Cantonale 1, 6900 Lugano',
    lat: 46.0037, lon: 8.9511, trovatoIl: '2026-09-01T08:00:00.000Z',
  })
  prova.aggiorna({ registro })
  return { classeId: registro.classi[0].id, allievoId: allieva.id }
}`

// Quel che la mano cambia nella mappa: dove sono i tasselli e che scala segna.
const VEDUTA = `(tela) => ({
  tasselli: [...tela.querySelectorAll('.mappa__tassello')].map((t) => t.dataset.tassello).sort(),
  scala: tela.querySelector('.mappa__scala').textContent,
})`

// Il giorno scelto si vede tutto dentro la striscia.
const SCELTO_IN_VISTA = `() => {
      const s = document.querySelector('.mese__scorrevole').getBoundingClientRect()
      const c = document.querySelector('.mese__cella--scelta').getBoundingClientRect()
      return c.top >= s.top && c.bottom <= s.bottom
    }`

async function ridisegna (page: Page): Promise<void> {
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FRAME)
}

// Ingrandisce con la rotella sopra il riquadro: l'inquadratura non è più quella automatica.
async function rotellaSulla (page: Page, selettore: string): Promise<void> {
  const misura = await riquadro(page.locator(selettore))
  await page.mouse.move(misura.x + misura.width / 3, misura.y + misura.height / 3)
  await page.mouse.wheel(0, -120)
  await valuta(page, FRAME)
}

test('la_mappa_resta', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 800 })
  await valuta(page, CON_UN_INDIRIZZO)
  await valuta(page, "prova.vai({ pagina: 'pagina.mappa' })")
  await valuta(page, FRAME)
  const tela = page.locator('.mappa__corpo .mappa__tela')
  await tela.waitFor()
  await valuta(page, "window.__tela = document.querySelector('.mappa__corpo .mappa__tela')")
  const prima = await valutaSu(tela, VEDUTA)
  await rotellaSulla(page, '.mappa__corpo .mappa__tela')
  const mossa = await valutaSu(tela, VEDUTA)
  expect(mossa, 'la rotella non ha cambiato la mappa: la prova non direbbe niente').not.toEqual(prima)
  await valuta(page, "window.__tassello = document.querySelector('.mappa__tassello')")

  await ridisegna(page)
  expect(
    await valuta(page, "document.querySelector('.mappa__corpo .mappa__tela') === window.__tela"),
    'il ridisegno ha rifatto il riquadro della mappa',
  ).toBeTruthy()
  expect(await valuta(page, 'window.__tassello.isConnected'), 'il ridisegno ha rifatto i tasselli')
    .toBeTruthy()
  expect(await valutaSu(tela, VEDUTA), 'il ridisegno ha rimesso l\'inquadratura automatica')
    .toEqual(mossa)
  // Un'altra pagina e ritorno: il riquadro è ancora lui, e guarda dove guardava.
  await valuta(page, "prova.vai({ pagina: 'pagina.oggi' })")
  await valuta(page, FRAME)
  await valuta(page, "prova.vai({ pagina: 'pagina.mappa' })")
  await valuta(page, FRAME)
  await tela.waitFor()
  expect(await valutaSu(tela, VEDUTA), 'tornando sulla mappa l\'inquadratura è ripartita')
    .toEqual(mossa)
  expect(errori).toEqual([])
})

test('la_mappa_piccola_resta', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 900 })
  const ids = await valuta(page, CON_UN_INDIRIZZO)
  await valuta(
    page,
    "(ids) => prova.vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: ids.allievoId } }," +
    ' { contesto: { classeId: ids.classeId } })',
    ids,
  )
  await valuta(page, FRAME)
  const selettore = '.dove-sta__tela .mappa__tela'
  const tela = page.locator(selettore)
  await tela.waitFor()
  await tela.scrollIntoViewIfNeeded()
  await valuta(page, `window.__piccola = document.querySelector('${selettore}')`)
  const prima = await valutaSu(tela, VEDUTA)
  await rotellaSulla(page, selettore)
  const mossa = await valutaSu(tela, VEDUTA)
  expect(mossa, 'la rotella non ha cambiato la mappa piccola: la prova non direbbe niente')
    .not.toEqual(prima)

  await ridisegna(page)
  expect(
    await valuta(page, `document.querySelector('${selettore}') === window.__piccola`),
    'il ridisegno ha rifatto la mappa piccola',
  ).toBeTruthy()
  expect(await valutaSu(tela, VEDUTA), 'il ridisegno ha perso spostamento e ingrandimento')
    .toEqual(mossa)
  expect(errori).toEqual([])
})

test('il_mese_non_torna_indietro', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 700 })
  await valuta(page, "prova.vai({ pagina: 'pagina.calendario' }, { preferenze: {} })")
  await valuta(page, "prova.aggiorna({ modoCalendario: 'mese' })")
  await valuta(page, FRAME)
  const striscia = page.locator('.mese__scorrevole')
  await striscia.waitFor()
  await valuta(page, FRAME)
  await valuta(page, "window.__striscia = document.querySelector('.mese__scorrevole')")

  // La striscia portata sul giorno scelto, a disegno fatto.
  expect(await valuta(page, SCELTO_IN_VISTA), 'il giorno scelto non si vede nella striscia')
    .toBeTruthy()

  // Uno scorrimento dolce in corso, e intanto il registro si ridisegna: la
  // striscia arriva dove andava. Ricreata, si fermava a metà strada.
  const partenza = await valutaSu<number>(striscia, '(el) => el.scrollTop')
  await valutaSu(striscia, "(el) => el.scrollBy({ top: 500, behavior: 'smooth' })")
  await valuta(page, 'window.__ridisegni = setInterval(() => prova.ridisegna(), 30)')
  await page.waitForTimeout(700)
  await valuta(page, 'clearInterval(window.__ridisegni)')
  await valuta(page, FRAME)
  const arrivo = await valutaSu<number>(striscia, '(el) => el.scrollTop')
  expect(
    Math.abs(arrivo - (partenza + 500)),
    `lo scorrimento si è perso nei ridisegni: da ${partenza} a ${arrivo}, voleva ${partenza + 500}`,
  ).toBeLessThanOrEqual(2)
  expect(
    await valuta(page, "document.querySelector('.mese__scorrevole') === window.__striscia"),
    'il ridisegno ha rifatto la striscia del mese',
  ).toBeTruthy()

  // Fermo, un ridisegno non riporta lo scorrimento da nessuna parte.
  await ridisegna(page)
  await valuta(page, FRAME)
  expect(await valutaSu(striscia, '(el) => el.scrollTop'), 'un ridisegno ha mosso la striscia')
    .toBe(arrivo)

  // Un altro giorno lontano: striscia nuova, portata su di lui.
  await valuta(page, "prova.aggiorna({ data: '2027-02-15' })")
  await valuta(page, FRAME)
  await valuta(page, FRAME)
  expect(
    await valuta(page, SCELTO_IN_VISTA),
    'cambiando giorno la striscia non si è portata sul giorno nuovo',
  ).toBeTruthy()
  expect(errori).toEqual([])
})
