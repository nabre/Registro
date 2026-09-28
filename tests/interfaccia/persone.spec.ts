// Persone in formazione: l'elenco laterale che scorre resta la stessa scatola.
//
// Qui si prova che:
//
// - scegliere un nome (un ridisegno completo: cambia la persona del contesto)
//   tiene lo stesso nodo dell'elenco laterale, con la sua posizione: la catena
//   di telaio arriva fin lì (`data-telaio` su vista, colonne ed elenco), e la
//   rotella in corsa non si perde;
// - la scelta resta sulla pagina Persone e porta classe e persona nel contesto;
// - «A tutta pagina» apre la scheda della persona (`pagina.allievo`).

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta, valutaSu } from './banco'

test('elenco_tenuto', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 1400, altezza: 500 })
  // Trenta persone in più: l'elenco è lungo abbastanza da scorrere.
  await valuta(page, `() => {
      const r = structuredClone(prova.stato.registro)
      for (let n = 0; n < 30; n += 1) {
        r.classi[0].allievi.push({ ...r.classi[0].allievi[0], id: \`alv-\${n}\`, cognome: \`Cognome\${n}\` })
      }
      prova.aggiorna({ registro: r })
    }`)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.persone'))")
  await valuta(page, FRAME)
  const elenco = page.locator('.vista--persone .elenco-laterale')
  await expect(elenco).toHaveCount(1)
  const chiusi = page.locator('.elenco-laterale__gruppo:not([aria-expanded="true"])')
  while (await chiusi.count() > 0) {
    await chiusi.first().click()
  }
  const voci = elenco.locator('.voce-laterale')
  const quante = await voci.count()
  expect(quante, String(quante)).toBeGreaterThan(1)
  await valuta(page, "()=>{const e=document.querySelector('.elenco-laterale');e.scrollTop=40;" +
    'window.__elenco=e}')
  const alto = await valuta<number>(page, "document.querySelector('.elenco-laterale').scrollTop")
  expect(alto, 'l’elenco non scorre').toBeGreaterThan(0)
  // Il clic da script: quello di Playwright porterebbe la voce in vista, scorrendo.
  await valutaSu(voci.nth(3), 'b => b.click()')
  await valuta(page, FRAME)
  const allievo = await valuta<string>(page, 'prova.stato.allievoId')
  expect(allievo, String(allievo)).toBeTruthy()
  expect(await valuta(page, 'prova.postoCorrente()')).toEqual({ pagina: 'pagina.persone' })
  const classe = await valuta(page,
    'id=>prova.stato.registro.classi.find(c=>c.allievi.some(a=>a.id===id)).id', allievo)
  expect(await valuta(page, 'prova.stato.classeId'), String(classe)).toBe(classe)
  await expect(page.locator('.voce-laterale--attiva')).toHaveCount(1)
  expect(await valuta(page, "document.querySelector('.elenco-laterale')===window.__elenco"),
    'l’elenco laterale si è rifatto').toBeTruthy()
  const dopo = await valuta<number>(page, "document.querySelector('.elenco-laterale').scrollTop")
  expect(dopo, `${alto} ${dopo}`).toBe(alto)

  // A tutta pagina: la scheda della persona scelta.
  await page.locator('.vista--persone .testata__azioni button').first().click()
  expect(await valuta(page, 'prova.postoCorrente()')).toEqual({
    pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: allievo },
  })
  await expect(page.locator('.vista--allievo')).toHaveCount(1)
  expect(errori).toEqual([])
  await page.close()
})
