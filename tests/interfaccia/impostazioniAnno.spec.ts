// Le impostazioni dell'anno disegnate con i controlli condivisi (`core/controlli/`,
// `components/voceAnno.ts`), su Chromium. Qui si prova che:
//
// - il passo dei voti è un segmentato, e scegliendo si salva con «Salvato»
//   accanto al campo, senza notifica;
// - «Quando si rifanno da sé» sta in Utente › Carta e stampa, e manda
//   `pdfAutomatici`;
// - togliere una pausa della giornata non chiede niente: la notifica ha
//   «Annulla», che rimette le pause di prima;
// - una chiusura si toglie senza domanda, con «Annulla» nella notifica;
// - una voce di lista si sposta con ↓ sulla presa, in un salvataggio solo, e il
//   fuoco resta sulla presa;
// - «Alterna» chiede prima, e annullando non parte niente;
// - «Rendi predefinita» porta la carta in cima.
//
// Il ponte rispinge il registro prima di rispondere, come il pannello vero.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, ULTIMA, attendi, attendiRisposte, pannello, ponte, valuta } from './banco'

const RISPINGE = `{
  const r = prova.stato.registro
  if (m.azione?.tipo === 'impostazioni.salva') {
    prova.aggiorna({ registro: { ...r, impostazioni: m.azione.impostazioni } })
  }
  if (m.azione?.tipo === 'anno.salva') {
    const anni = r.anni.map((a) => a.id === m.azione.anno.id ? m.azione.anno : a)
    prova.aggiorna({ registro: { ...r, anni } })
  }
}`

const QUANTE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).length'

async function apri (page: Page, scheda: string, prepara = ''): Promise<void> {
  await valuta(page, `() => {
    const r = prova.stato.registro
    ${prepara}
    prova.vai({ pagina: 'pagina.impostazioni', scheda: '${scheda}' }, { altro: { registro: r } })
  }`)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')
}

test('impostazioni_anno', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(undefined, RISPINGE) })
  const notifiche = page.locator('.pila-notifiche')

  // 1. Il passo dei voti: un segmentato, e l'esito accanto.
  await apri(page, 'didattica#valutazione')
  const passo = page.getByRole('radiogroup', { name: 'Passo dei voti' })
  await expect(passo.getByRole('radio')).toHaveCount(4)
  await passo.getByRole('radio', { name: '0.5' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='impostazioni.salva')")
  const scala = await valuta<{ impostazioni: { scala: { passo: number } } }>(page, ULTIMA, 'impostazioni.salva')
  expect(scala.impostazioni.scala.passo).toBe(0.5)
  await expect(page.locator('[data-chiave="scalaPasso"] .controllo__esito')).toHaveText('Salvato')
  await attendiRisposte(page)

  // 2. Quando si rifanno i PDF, in Carta e stampa.
  await apri(page, 'utente#stampa')
  await page.getByRole('radiogroup', { name: 'Quando si rifanno da sé' })
    .getByRole('radio', { name: 'Solo a mano' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='impostazioni.salva')")
  const pdf = await valuta<{ impostazioni: { pdfAutomatici: string } }>(page, ULTIMA, 'impostazioni.salva')
  expect(pdf.impostazioni.pdfAutomatici).toBe('mai')
  await attendiRisposte(page)

  // 3. Una pausa si toglie senza domanda; «Annulla» la rimette.
  await apri(page, 'calendario#giornata', `r.impostazioni = { ...r.impostazioni,
    pause: { prima: { inizio: '09:30', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] } }`)
  await page.getByRole('button', { name: 'Togli questa pausa: la successiva si conta dalla precedente' }).click()
  await attendi(page, `(${QUANTE})('impostazioni.salva') === 1`)
  const senza = await valuta<{ impostazioni: { pause: { seguenti: unknown[] } } }>(page, ULTIMA, 'impostazioni.salva')
  expect(senza.impostazioni.pause.seguenti).toHaveLength(0)
  await expect(page.locator('.modale')).toHaveCount(0)
  await notifiche.getByRole('button', { name: 'Annulla' }).click()
  await attendi(page, `(${QUANTE})('impostazioni.salva') === 2`)
  const rimesse = await valuta<{ impostazioni: { pause: { seguenti: unknown[] } } }>(page, ULTIMA, 'impostazioni.salva')
  expect(rimesse.impostazioni.pause.seguenti).toHaveLength(1)
  await attendiRisposte(page)

  // 4. Una chiusura: via senza domanda, «Annulla» la rimette.
  await apri(page, 'calendario#chiusure', `r.anni = r.anni.map((a) => a.id === r.annoCorrenteId
    ? { ...a, sospensioni: [{ id: 's-prova', etichetta: 'Ponte di prova', dal: '2026-11-02', al: '2026-11-02' }] }
    : a)`)
  await page.getByRole('button', { name: /^Togli «Ponte di prova»/ }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='anno.salva')")
  await expect(page.locator('.modale')).toHaveCount(0)
  const tolta = await valuta<{ anno: { sospensioni: { id: string }[] } }>(page, ULTIMA, 'anno.salva')
  expect(tolta.anno.sospensioni.some((s) => s.id === 's-prova')).toBe(false)
  await notifiche.getByRole('button', { name: 'Annulla' }).last().click()
  await attendi(page, `(${QUANTE})('anno.salva') === 2`)
  const rimessa = await valuta<{ anno: { sospensioni: { id: string }[] } }>(page, ULTIMA, 'anno.salva')
  expect(rimessa.anno.sospensioni.some((s) => s.id === 's-prova')).toBe(true)
  await attendiRisposte(page)

  // 5. Le liste: ↓ sulla presa sposta la voce, in un salvataggio, e il fuoco resta lì.
  await apri(page, 'didattica#liste')
  const prese = page.locator('.lista-sistema__voci .presa-riga')
  const primaVoce = await page.locator('.lista-sistema__voci .voce-lista__valore').first().innerText()
  const chiave = await prese.first().getAttribute('data-fuoco')
  await prese.first().focus()
  await page.keyboard.press('ArrowDown')
  await attendi(page, `(${QUANTE})('impostazioni.salva') === 1`)
  await attendiRisposte(page)
  await valuta(page, FOTOGRAMMA)
  const liste = await valuta<{ impostazioni: { liste: Record<string, { valore: string }[]> } }>(
    page, ULTIMA, 'impostazioni.salva')
  const spostata = Object.values(liste.impostazioni.liste).find((voci) => voci[1]?.valore === primaVoce)
  expect(spostata, JSON.stringify(liste.impostazioni.liste)).toBeTruthy()
  expect(await valuta(page, 'document.activeElement?.dataset?.fuoco ?? null')).toBe(chiave)

  // 6. «Alterna» chiede prima; annullando non parte niente.
  await apri(page, 'calendario#settimane')
  await page.locator('button', { hasText: 'Alterna' }).click()
  const modale = page.locator('.modale')
  await expect(modale).toContainText('Alternare i tipi?')
  await modale.getByRole('button', { name: 'Annulla' }).click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta<number>(page, `(${QUANTE})('anno.salva')`)).toBe(0)

  // 7. «Rendi predefinita» porta la seconda carta in cima.
  await apri(page, 'utente#stampa', `const prima = r.impostazioni.intestazione.carte[0]
    r.impostazioni = { ...r.impostazioni, intestazione: { ...r.impostazioni.intestazione,
      carte: [prima, { id: 'carta-due', sede: 'Seconda sede', altezzaLogo: 14, corsi: [] }] } }`)
  await page.getByRole('button', { name: /^Rendi predefinita/ }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='impostazioni.salva')")
  const carte = await valuta<{ impostazioni: { intestazione: { carte: { id: string }[] } } }>(
    page, ULTIMA, 'impostazioni.salva')
  expect(carte.impostazioni.intestazione.carte[0].id).toBe('carta-due')
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})
