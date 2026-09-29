// La radice della vista resta fra due disegni, e una pagina letta non rifà la pagina.
//
// La catena di `data-telaio` (`ui/pannello/dom.ts`) tiene un nodo fra due
// disegni solo se tutti i suoi antenati sono tenuti: guscio, `main.contenuto`,
// e la radice della vista, che `shell.ts` segna da sé per ogni vista. Senza
// l'ultimo anello ogni scatola che scorre dentro una vista era nuova a ogni
// gesto. Qui si fissa che la radice è lo stesso nodo dopo un ridisegno in ogni
// pagina, che cambiando pagina è nuova, e che il messaggio `lavoro` (la lettura
// delle scansioni, a ogni pagina) cambia lo stato senza rifare la vista quando
// le isole che lo mostrano ci sono.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta } from './banco'

const RADICE = "() => document.querySelector('main.contenuto')?.lastElementChild ?? null"

// Un ridisegno completo che non cambia pagina: un cambio vero dello stato.
const RIDISEGNO = '() => prova.aggiorna({ azioniNascoste: !prova.stato.azioniNascoste })'

test('radice_resta_in_ogni_pagina', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const ids = await valuta<string[]>(
    page, '() => prova.gruppiDiPagine().flatMap((g) => g.pagine.map((p) => p.id))',
  )
  expect(ids.length, `poche pagine: la prova non direbbe niente (${ids.join(', ')})`).toBeGreaterThan(5)
  for (const pagina of ids) {
    await valuta(page, '(id) => prova.vaiA(prova.PAGINE.find((p) => p.id === id))', pagina)
    await valuta(page, FOTOGRAMMA)
    const chiave = await valuta(page, `() => (${RADICE})()?.dataset.telaio ?? null`)
    expect(chiave, `${pagina}: la radice della vista non è nel telaio`).toBeTruthy()
    await valuta(page, `() => { window.__radice = (${RADICE})() }`)
    await valuta(page, RIDISEGNO)
    await valuta(page, FOTOGRAMMA)
    expect(
      await valuta(page, `() => (${RADICE})() === window.__radice`),
      `${pagina}: la radice della vista è un nodo nuovo dopo il ridisegno`,
    ).toBeTruthy()
  }
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

test('cambiando_pagina_la_radice_e_nuova', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "() => prova.vai({ pagina: 'pagina.classi' })")
  await valuta(page, FOTOGRAMMA)
  await valuta(page, `() => { window.__radice = (${RADICE})() }`)
  await valuta(page, "() => prova.vai({ pagina: 'pagina.persone' })")
  await valuta(page, FOTOGRAMMA)
  expect(
    await valuta(page, `() => (${RADICE})() !== window.__radice`),
    'cambiando pagina la radice di prima è rimasta',
  ).toBeTruthy()
  // La chiave è `vista:<vista>`, o quella che la vista si è data.
  expect(await valuta(page, `() => (${RADICE})().dataset.telaio`), 'la radice nuova non è nel telaio')
    .toBeTruthy()
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// Il messaggio dell'host a ogni pagina letta, con lo stesso PDF in coda.
function lavoro (fatte: number, coda: number[]): string {
  const voci = coda
    .map((n) => `{ smistamentoId: 'pdf-1', pagina: ${n}, etichetta: 'prova.pdf' }`)
    .join(', ')
  return `() => window.dispatchEvent(new MessageEvent('message', { data: {
  tipo: 'lavoro',
  corrente: { smistamentoId: 'pdf-1', pagina: ${fatte + 1}, etichetta: 'prova.pdf' },
  fatte: ${fatte}, totale: 4, coda: [${voci}],
} }))`
}

test('una_pagina_letta_non_rifa_la_vista', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "() => prova.vai({ pagina: 'pagina.classi' })")
  await valuta(page, FOTOGRAMMA)
  // Il PDF entra nella lettura: i suoi comandi cambiano, si rifà tutto.
  await valuta(page, lavoro(0, [2, 3]))
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, '() => prova.stato.lavoro.fatte')).toBe(0)
  // Un nodo della vista fuori dal telaio: un ridisegno completo lo rifarebbe.
  await valuta(page, `() => { window.__testata = (${RADICE})().firstElementChild }`)
  await valuta(page, lavoro(1, [3]))
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, '() => prova.stato.lavoro.fatte'), 'lo stato non segue la lettura').toBe(1)
  const isole = await valuta<string[]>(
    page,
    "() => ['coda-lettura', 'barra-stato']" +
    '.filter((k) => document.querySelector(`[data-isola="${k}"]`))',
  )
  const stessa = await valuta(page, `() => (${RADICE})().firstElementChild === window.__testata`)
  if (isole.length) {
    expect(stessa, `una pagina letta ha rifatto la vista, con le isole ${isole.join(', ')} in pagina`)
      .toBeTruthy()
  } else {
    // Nessuna isola che la mostri: il ridisegno completo è il ripiego.
    expect(stessa, 'senza isole la lettura non si vede da nessuna parte').toBeFalsy()
  }
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})
