// Quel che un ridisegno non deve disfare, sul pannello vero (ADR-56).
//
// Il registro ridisegna tutto a ogni cambio di stato. Qui si fissa che:
//
// - l'anteprima di un documento (l'`<iframe>` di `CorniceDocumento`) non si
//   ricarica a un ridisegno né a un cambio di stato che non la riguarda: si
//   contano i suoi `load`;
// - il campo in cui si scrive tiene fuoco, cursore, selezione e quel che c'è
//   scritto quando un ridisegno arriva a metà, anche se il registro rispinto
//   porta un valore diverso;
// - una scatola che scorre (`data-scorrimento`) resta dov'era;
// - `ridisegnaIsola` rifà l'isola sola: un nodo fuori resta lo stesso, e quel
//   che fuori legge lo stato non si aggiorna finché non ridisegna tutto.

import { expect, test, type Page } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

const RADICE_DATI = 'https://esempio.invalido/dati'

async function ridisegna (page: Page): Promise<void> {
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FRAME)
}

// I documenti di un corso con il PDF in anteprima, come `documentiRiquadri.spec.ts`.
const ANTEPRIMA = `() => {
  const r = prova.stato.registro
  const c = r.corsi[0]
  const percorso = (genere, estensione) => {
    const d = prova.collocazioneDi(r, genere, c.id, { semestreId: null })
    return prova.percorsoDi(d, estensione)
  }
  const pdf = percorso('corso', 'pdf')
  prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.corso.documenti'))
  prova.aggiorna({ schedaDocumenti: 'corso', semestreId: null,
    esportati: [{ percorso: pdf, misura: 1000, revisione: 0 }],
    anteprima: pdf, radiceDati: '${RADICE_DATI}' })
}`

test('anteprima_non_ricarica', async ({ browser }) => {
  const { page, errori } = await pannello(browser, {
    // Il documento risponde davvero: un `load` per ogni volta che si carica.
    prima: async (p) => {
      await p.route(`${RADICE_DATI}/**`, async (rotta) => {
        await rotta.fulfill({ status: 200, contentType: 'text/html', body: '<p>documento</p>' })
      })
    },
  })
  await valuta(page, ANTEPRIMA)
  const telaio = page.locator('iframe')
  await telaio.waitFor({ state: 'attached' })
  // Il primo caricamento è finito quando il documento dentro c'è.
  await expect(page.frameLocator('iframe').locator('p')).toHaveText('documento')
  await valuta(page, `() => {
    const telaio = document.querySelector('iframe')
    window.__telaio = telaio
    window.__carichi = 0
    telaio.addEventListener('load', () => { window.__carichi += 1 })
  }`)

  for (let i = 0; i < 3; i++) await ridisegna(page)
  // Un cambio di stato che non è suo: un'altra data, e il registro rispinto
  // uguale dall'host, oggetti nuovi con gli stessi valori.
  await valuta(page, "prova.aggiorna({ data: '2026-09-15' })")
  await valuta(page, FRAME)
  await valuta(page, 'prova.aggiorna({ registro: structuredClone(prova.stato.registro) })')
  await valuta(page, FRAME)
  await valuta(page, FRAME)

  expect(await valuta(page, "document.querySelector('iframe') === window.__telaio"),
    'il ridisegno ha rifatto il lettore').toBeTruthy()
  expect(await valuta(page, 'window.__carichi'), 'il lettore ha ricaricato il documento').toBe(0)
  expect(errori).toEqual([])
})

test('il_campo_tiene_cursore_e_testo', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const lezione = await valuta<string>(page, `() => {
    // Un'ora aperta: una svolta tiene i campi spenti.
    const id = prova.stato.registro.lezioni.find((l) => l.stato !== 'svolta').id
    prova.apriLezione(id)
    prova.aggiorna({ schedaLezione: 'annotazioni' })
    return id
  }`)
  await valuta(page, FRAME)
  const campo = page.locator('textarea[name="argomenti"]')
  await campo.waitFor()
  await campo.click()
  await campo.fill('')
  // Scritto e non ancora lasciato: il `change` non è partito, lo stato non lo sa.
  await page.keyboard.type('frazioni e decimali')
  await valuta(page, `() => {
    const campo = document.querySelector('textarea[name="argomenti"]')
    campo.setSelectionRange(3, 8)
    window.__campo = campo
  }`)

  const leggi = `() => {
    const campo = document.querySelector('textarea[name="argomenti"]')
    return { stesso: campo === window.__campo, fuoco: document.activeElement === campo,
             valore: campo.value, inizio: campo.selectionStart, fine: campo.selectionEnd }
  }`
  const atteso = { stesso: true, fuoco: true, valore: 'frazioni e decimali', inizio: 3, fine: 8 }

  await ridisegna(page)
  expect(await valuta(page, leggi), 'un ridisegno ha mosso il campo').toEqual(atteso)

  // L'host rispinge il registro con un altro testo nella stessa ora: il campo
  // con il fuoco tiene quel che si sta scrivendo.
  await valuta(page, `(id) => {
    const registro = structuredClone(prova.stato.registro)
    registro.lezioni.find((l) => l.id === id).argomenti = 'scritto altrove'
    prova.aggiorna({ registro })
  }`, lezione)
  await valuta(page, FRAME)
  expect(await valuta(page, leggi), 'il registro rispinto ha riscritto il campo').toEqual(atteso)

  // La battitura riprende dal cursore.
  await page.keyboard.type('X')
  expect(await valuta(page, "document.querySelector('textarea[name=\"argomenti\"]').value"))
    .toBe('fraX e decimali')
  expect(errori).toEqual([])
})

test('lo_scorrimento_resta', async ({ browser }) => {
  // Bassa, perché la pagina scorra.
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 420 })
  await valuta(page, "() => prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.impostazioni'))")
  await valuta(page, FRAME)
  const scatola = page.locator('main.contenuto[data-scorrimento]')
  await scatola.waitFor()
  const dove = await valuta<{ alto: number, massimo: number }>(page, `() => {
    const s = document.querySelector('main.contenuto')
    s.scrollTop = 200
    window.__scatola = s
    return { alto: s.scrollTop, massimo: s.scrollHeight - s.clientHeight }
  }`)
  expect(dove.massimo, 'la pagina non scorre: la prova non direbbe niente').toBeGreaterThan(200)
  expect(dove.alto).toBe(200)

  const leggi = "() => { const s = document.querySelector('main.contenuto'); return { stessa: s === window.__scatola, alto: s.scrollTop } }"
  await ridisegna(page)
  expect(await valuta(page, leggi), 'un ridisegno ha mosso la scatola').toEqual({ stessa: true, alto: 200 })
  await valuta(page, 'prova.aggiorna({ registro: structuredClone(prova.stato.registro) })')
  await valuta(page, FRAME)
  expect(await valuta(page, leggi), 'il registro rispinto ha mosso la scatola').toEqual({ stessa: true, alto: 200 })
  expect(errori).toEqual([])
})

test('ridisegna_isola_rifa_solo_lei', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const isola = page.locator('[data-isola="barra-stato"]')
  await isola.waitFor({ state: 'attached' })
  await expect(isola).toBeEmpty()

  const fuori = "() => [...document.querySelectorAll('.barra-stato .barra-stato__testo')].filter((n) => !n.closest('[data-isola]')).map((n) => n.textContent).join('|')"
  const primaFuori = await valuta<string>(page, fuori)
  await valuta(page, `() => {
    window.__barra = document.querySelector('.barra-stato')
    window.__contenuto = document.querySelector('main.contenuto')
    // Lo stato cambiato senza \`aggiorna\`: lo vede solo chi si ridisegna. La
    // lettura delle scansioni sta nell'isola, la rete fuori.
    prova.stato.lavoro = { corrente: null, fatte: 0, totale: 3, coda: [] }
    prova.stato.rete = false
    prova.ridisegnaIsola('barra-stato')
  }`)
  await valuta(page, FRAME)

  await expect(isola, 'l\'isola non si è rifatta').not.toBeEmpty()
  expect(await valuta(page, "document.querySelector('.barra-stato') === window.__barra"),
    'la barra intorno all\'isola è stata rifatta').toBeTruthy()
  expect(await valuta(page, "document.querySelector('main.contenuto') === window.__contenuto"),
    'la pagina è stata rifatta').toBeTruthy()
  expect(await valuta(page, fuori), 'fuori dall\'isola si è ridisegnato').toBe(primaFuori)

  // Il ridisegno completo vede anche la rete: quel che fuori restava indietro era vero.
  await ridisegna(page)
  expect(await valuta(page, fuori), 'la rete spenta non cambia la barra: la prova non direbbe niente')
    .not.toBe(primaFuori)
  expect(errori).toEqual([])
})
