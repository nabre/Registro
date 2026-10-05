// Lo scorrimento: chi ricorda dov'era, chi riparte dall'alto, chi segue il fondo.
//
// Sta in un file suo e non dentro `navigation` perché è una cosa sola e la si
// legge tutta insieme: `navigation` sono novecento righe di navigazione,
// comandi e filtri, e una regressione dello scorrimento vi si perderebbe in mezzo.
//
// Che cosa difende, e da che cosa. Il registro **rifà l'albero intero a ogni
// cambio di stato** — una spunta, l'orologio che batte il minuto, una lettera
// scritta in un filtro — e una scatola rifatta riparte da capo, salvo quelle marcate `data-scorrimento`.
// `main.contenuto`, che è la superficie su cui scorre quasi ogni pagina del
// registro, non era marcata: chi si era scorso in fondo alle pendenze tornava in
// cima a ogni gesto. Queste prove sarebbero state rosse prima di quel marchio.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta, valutaSu } from './banco'

test('scorrimento', async ({ browser }) => {
  // Bassa apposta: su una finestra alta la Guida non scorre.
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 600 })

  const contenuto = page.locator('main.contenuto')
  const scorrimento = async () => await valutaSu<number>(contenuto, '(el) => el.scrollTop')

  // La pagina dichiara che cosa si sta guardando: è la chiave con cui
  // `ricordaScorrimenti` la ritrova dopo il ridisegno.
  const chiave = await contenuto.getAttribute('data-scorrimento')
  expect(chiave?.startsWith('pagina:'), `chiave assente o storta: ${chiave}`).toBeTruthy()

  // Una pagina lunga, scorsa a metà, sopravvive a un ridisegno che non cambia
  // niente (si spunta una riga e la pagina si rifà).
  await valuta(page, "prova.vai({pagina:'pagina.guida'})")
  await valuta(page, FOTOGRAMMA)
  await valutaSu(contenuto, '(el) => el.scrollTop = 400')
  const dove = await scorrimento()
  expect(dove > 0, 'la Guida non scorre: la prova non direbbe niente').toBeTruthy()
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  expect(await scorrimento(), 'la pagina è tornata in cima').toBe(dove)

  // Cambiando vista si riparte dall'alto: è un'altra cosa che si guarda.
  await valuta(page, "prova.vai({pagina:'pagina.impostazioni'})")
  await valuta(page, FOTOGRAMMA)
  expect(await scorrimento(), 'la vista nuova eredita lo scorrimento della precedente').toBe(0)

  // La regola unica di `styles/foundations.css` arriva sulla scatola: il gesto
  // si ferma in fondo, lo spazio della barra è riservato, la barra è sottile.
  const stile = await valutaSu<string>(
    contenuto,
    '(el) => { const s = getComputedStyle(el);' +
    " return [s.overscrollBehaviorY, s.scrollbarGutter, s.scrollbarWidth].join('|') }",
  )
  expect(stile, 'manca `overscroll-behavior: contain`').toContain('contain')
  expect(stile, 'manca `scrollbar-gutter: stable`').toContain('stable')
  expect(stile, 'manca `scrollbar-width: thin`').toContain('thin')

  // La rotella mentre il registro si ridisegna di continuo (l'orologio, una
  // risposta dell'host, il filo di lavoro): la scatola che scorre è la stessa
  // di prima, e gli scatti in corsa arrivano tutti. Ricreata a ogni disegno,
  // Chromium li perdeva per strada e la pagina «tornava su».
  await valuta(page, "prova.vai({pagina:'pagina.guida'})")
  await valuta(page, FOTOGRAMMA)

  const rotella = async (conRidisegni: boolean): Promise<number> => {
    await valutaSu(contenuto, '(el) => el.scrollTop = 0')
    await page.waitForTimeout(100)
    if (conRidisegni) {
      await valuta(page, 'window.__ridisegni = setInterval(() => prova.ridisegna(), 50)')
    }
    await page.mouse.move(700, 400)
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 150)
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(500)
    if (conRidisegni) await valuta(page, 'clearInterval(window.__ridisegni)')
    return await scorrimento()
  }

  const senza = await rotella(false)
  const con = await rotella(true)
  expect(senza, 'la Guida scorre troppo poco perché la prova dica qualcosa').toBeGreaterThan(600)
  expect(Math.abs(con - senza), `scatti persi durante i ridisegni: ${con} invece di ${senza}`)
    .toBeLessThanOrEqual(150)

  // Un ridisegno lento, e intanto la pagina scorre (il compositore non aspetta
  // JavaScript): alla fine si resta dove si è arrivati, non dove si era
  // all'inizio del disegno. Lo scorrimento a metà costruzione lo simula la
  // prima lettura di `stato.avvisi`, che avviene solo dentro il telaio.
  await valutaSu(contenuto, '(el) => el.scrollTop = 400')
  await valuta(page, `() => {
      const s = prova.stato
      let valore = s.avvisi
      let armato = true
      Object.defineProperty(s, 'avvisi', {
        configurable: true, enumerable: true,
        get () {
          if (armato) {
            armato = false
            document.querySelector('main.contenuto').scrollTop += 300
          }
          return valore
        },
        set (nuovo) { valore = nuovo },
      })
      window.__rimetti = () => Object.defineProperty(s, 'avvisi', {
        configurable: true, enumerable: true, writable: true, value: valore,
      })
    }`)
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'window.__rimetti()')
  const dopo = await scorrimento()
  expect(dopo, 'il ridisegno lento ha riportato indietro lo scorrimento').toBe(700)

  expect(errori, 'errori JS').toEqual([])
})
