// I campi, i pulsanti e le pendenze, su Chromium: tre difetti piccoli.
//
// Un campo col fuoco non si vede riscrivere il testo sotto il cursore. Prima
// `Input` e `TextArea` passavano il valore dello stato come `defaultValue` a
// ogni disegno: React lo riscrive nel nodo, e in un campo mai toccato il valore
// segue `defaultValue` anche col fuoco, scavalcando la regola dei campi.
//
// Due clic nello stesso giro su un pulsante che aspetta l'host partono una
// volta sola. Prima il pulsante si spegneva col disegno dopo, in un microtask,
// e il secondo clic lo trovava ancora acceso.
//
// Le pendenze non contano i corsi delle classi archiviate, come già il docente
// di classe. Prima la scheda «Corsi» li elencava.
//
// Il filtro delle impostazioni svuotato da un gesto altrove (un'area, «Vai alla
// sezione») si svuota anche nella casella. Prima la casella, che mentre si
// scrive non si ridisegna, non aveva mai visto il testo: il valore vuoto le
// sembrava quello di sempre, e «abc» restava sopra l'area intera.
//
// La bozza dell'assistente cambiata da qui (la dettatura, un pezzo per volta)
// entra nella casella anche col fuoco, che è dove la dettatura lo mette. Prima
// dal secondo pezzo la casella restava ferma, e mandando i pezzi si perdevano.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta, valutaSu } from './banco'

// Un'ora del primo corso con gli argomenti vuoti, aperta.
const ORA = `() => {
  const r = prova.stato.registro
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const lezione = { ...base, id: 'lez-fuoco', stato: 'pianificata', argomenti: '' }
  prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-fuoco')
  prova.aggiorna({ schedaLezione: 'annotazioni' })
}`

// Gli argomenti cambiati altrove: il registro nuovo che l'host spinge.
const ARGOMENTI_ALTROVE = `(testo) => {
  const r = prova.stato.registro
  const lezioni = r.lezioni.map((l) => l.id !== 'lez-fuoco' ? l : { ...l, argomenti: testo })
  prova.aggiorna({ registro: { ...r, lezioni } })
}`

test('il valore nuovo non entra nel campo col fuoco mai toccato', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA)
  await valuta(page, FOTOGRAMMA)

  const campo = page.locator('textarea[data-fuoco="lezione-argomenti-lez-fuoco"]')
  await expect(campo).toHaveValue('')
  // Senza chiave di fuoco: con la chiave il fotografo del ridisegno (`ui/focus.ts`)
  // rimette quel che c'era scritto, e coprirebbe il campo. Qui si prova il campo.
  await valutaSu(campo, "(el) => { window.campoProva = el; el.removeAttribute('data-fuoco'); el.focus() }")
  await valuta(page, ARGOMENTI_ALTROVE, 'Le frazioni')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta<boolean>(page, 'campoProva === document.activeElement'), 'il campo ha perso il fuoco').toBe(true)
  expect(await valuta<string>(page, 'campoProva.value'), 'il testo è entrato sotto il cursore').toBe('')

  // Senza fuoco, il disegno dopo lo porta dentro.
  await valuta(page, 'campoProva.blur()')
  await valuta(page, ARGOMENTI_ALTROVE, 'Le frazioni')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta<string>(page, 'campoProva.value')).toBe('Le frazioni')
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

test('due clic nello stesso giro partono una volta', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, `() => {
    const r = prova.stato.registro
    const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
    const lezione = { ...base, id: 'lez-svolta', stato: 'svolta' }
    prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
    prova.apriLezione('lez-svolta')
  }`)
  await valuta(page, FOTOGRAMMA)

  const riapri = page.locator('.lezione-chiusa__avviso button')
  await expect(riapri).toHaveCount(1)
  await valuta(page, 'trattieni = true; richieste.length = 0')
  // I due clic in un compito solo: il disegno del primo non è ancora passato.
  await valutaSu(riapri, '(el) => { el.click(); el.click() }')
  const mandate = await valuta<number>(page, "richieste.filter(m=>m.azione?.tipo==='lezione.stato').length")
  expect(mandate, 'il secondo clic è partito').toBe(1)

  await valuta(page, 'trattieni = false; while (trattenute.length) rilascia()')
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

test('le pendenze lasciano fuori i corsi delle classi archiviate', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const [archiviato, restano] = await valuta<[string, string[]]>(page, `() => {
    const r = prova.stato.registro
    const corso = r.corsi[0]
    const classi = r.classi.map((c) => c.id === corso.classeId ? { ...c, archiviata: true } : c)
    prova.aggiorna({ registro: { ...r, classi } })
    return [corso.id, r.corsi.filter((c) => c.classeId !== corso.classeId).map((c) => c.id)]
  }`)
  expect(restano.length, 'serve un corso di un’altra classe').toBeGreaterThan(0)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.pendenze'))")
  await valuta(page, "prova.aggiorna({ schedaTodo: 'corsi' })")
  await valuta(page, FOTOGRAMMA)

  await expect(page.locator(`[data-fuoco="todo-tab-corso:${restano[0]}"]`)).toHaveCount(1)
  await expect(page.locator(`[data-fuoco="todo-tab-corso:${archiviato}"]`), 'il corso della classe archiviata è elencato')
    .toHaveCount(0)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

test('il filtro delle impostazioni svuotato altrove si svuota nella casella', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.impostazioni'))")
  await valuta(page, FOTOGRAMMA)
  // Il posto col nome dell'area: da qui un'altra scelta della stessa area non
  // cambia pagina, e la casella resta la stessa (un posto nuovo la rifarebbe).
  await page.locator('.area-voce--attiva').click()
  await valuta(page, FOTOGRAMMA)

  const filtro = page.locator('[data-fuoco="impostazioni-cerca"]')
  await filtro.fill('abc')
  await valuta(page, FOTOGRAMMA)
  await page.locator('.area-voce--attiva').click()
  await valuta(page, FOTOGRAMMA)
  await expect(filtro, 'il filtro è vuoto, la casella no').toHaveValue('')
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// La bozza che arriva da qui come farebbe la dettatura: l'host la rimanda col
// riquadro (`assistente.stato` con `rientro`), due volte, la seconda col fuoco.
const BOZZA = `(bozza) => window.dispatchEvent(new MessageEvent('message', { data: {
  tipo: 'assistente.stato', staccato: false, rientro: true, storia: [], bozza } }))`

test('la bozza dell’assistente entra nella casella anche col fuoco', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  // L'assistente acceso nelle impostazioni del programma: il banco non ne porta.
  await valuta(page, `() => prova.aggiorna({ programma: [...prova.stato.programma,
    { chiave: 'registroDocenti.assistente.attivo', valore: true }] })`)
  await valuta(page, BOZZA, 'uno')
  await valuta(page, FOTOGRAMMA)

  const casella = page.locator('[data-fuoco="assistente-domanda"]')
  await expect(casella).toHaveValue('uno')
  await casella.focus()
  await valuta(page, BOZZA, 'uno due')
  await valuta(page, FOTOGRAMMA)
  await expect(casella).toBeFocused()
  await expect(casella, 'il secondo pezzo non è entrato').toHaveValue('uno due')
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})
