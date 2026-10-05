// Le caselle dell'appello, su Chromium e dall'esterno.
//
// - i clic a raffica, prima che l'host risponda, girano gli stati dal primo
//   mandato e non dal disegno: presente, assente, ritardo;
// - dove non si arriva in ritardo (una UD dopo la prima, senza pausa in mezzo)
//   il giro salta la R;
// - se l'host dice di no, il clic dopo riparte dallo stato disegnato;
// - il tasto destro e la pressione lunga aprono il menu degli stati e non
//   girano la casella; il clic dopo sì.
//
// Il ponte trattiene le risposte (`trattieni`) e le manda con `rilascia()`;
// `window.rifiuta` fa rispondere di no a `presenze.ud`.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, attendi, attendiRisposte, pannello, ponte, valuta } from './banco'

const RIFIUTA = "m.azione?.tipo === 'presenze.ud' && window.rifiuta" +
  " ? { tipo: 'risposta', id: m.id, ok: false, errori: ['Rifiutata dalla prova.'] }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

// Un'ora del primo corso lunga due UD, senza pause, con tre persone; la
// seconda ha già due assenze. Aperta sulla scheda dell'appello.
const ORA = `() => {
  const r = prova.stato.registro
  const classe = r.classi[0]
  const allievi = [0, 1, 2].map((i) => ({ ...classe.allievi[0], id: \`al-\${i}\`, cognome: \`Prova\${i}\` }))
  const classi = r.classi.map((c) => c.id === classe.id ? { ...c, allievi } : c)
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const minuti = 8 * 60 + 20 + 2 * r.impostazioni.minutiUd
  const fine = \`\${String(Math.floor(minuti / 60)).padStart(2, '0')}:\${String(minuti % 60).padStart(2, '0')}\`
  const slot = [{ ...base.slot[0], inizio: '08:20', fine, tipo: 'lezione' }]
  const lezione = { ...base, id: 'lez-raffica', stato: 'pianificata', slot, matrice: [],
    presenze: [{ allievoId: 'al-1', stati: ['assente', 'assente'] }] }
  prova.aggiorna({ registro: { ...r, classi, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-raffica')
  prova.aggiorna({ schedaLezione: 'amministrazione' })
}`

const MANDATI = "() => richieste.filter(m=>m.azione?.tipo==='presenze.ud').map(m=>m.azione.stato)"

/** La casella di una persona in un'UD, per il suo nome: «Prova0 …, UD 1 (…)». */
function casella (page: Page, persona: string, ud: number) {
  return page.getByRole('button', { name: new RegExp(`${persona}.*, UD ${ud} \\(`) })
}

async function apri (page: Page): Promise<void> {
  await valuta(page, ORA)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')
}

test('i clic a raffica girano gli stati da quel che è partito', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apri(page)
  const cella = casella(page, 'Prova0', 1)
  await expect(cella).toHaveCount(1)

  await valuta(page, 'trattieni = true')
  await cella.click()
  await cella.click()
  await cella.click()
  await attendi(page, `(${MANDATI})().length === 3`)
  expect(await valuta(page, MANDATI)).toEqual(['presente', 'assente', 'ritardo'])
  await valuta(page, 'trattieni = false; rilascia(); rilascia(); rilascia()')
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})

test('dove non si arriva in ritardo il giro salta la R', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apri(page)
  // La seconda UD segue la prima senza pausa: da assente si passa a esonerato.
  await casella(page, 'Prova1', 2).click()
  await attendi(page, `(${MANDATI})().length === 1`)
  expect(await valuta(page, MANDATI)).toEqual(['esonerato'])
  // Nella prima UD la R c'è.
  await casella(page, 'Prova1', 1).click()
  await attendi(page, `(${MANDATI})().length === 2`)
  expect(await valuta(page, MANDATI)).toEqual(['esonerato', 'ritardo'])
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})

test('dopo un no dell’host il clic riparte dallo stato disegnato', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apri(page)
  const cella = casella(page, 'Prova2', 1)

  await valuta(page, 'rifiuta = true; trattieni = true')
  await cella.click()
  await attendi(page, `(${MANDATI})().length === 1`)
  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)
  await expect(page.locator('.notifica--errore')).not.toHaveCount(0)

  await valuta(page, 'rifiuta = false')
  await cella.click()
  await attendi(page, `(${MANDATI})().length === 2`)
  expect(await valuta(page, MANDATI)).toEqual(['presente', 'presente'])
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})

test('tasto destro e pressione lunga aprono il menu senza girare la casella', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apri(page)
  const cella = casella(page, 'Prova0', 1)
  // Il menu degli stati: quello che ha la voce «Esonerato».
  const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: /Esonerat/ }) })

  // Il tasto destro: il menu degli stati, nessuna casella girata.
  await cella.click({ button: 'right' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Presente/ })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  expect(await valuta(page, MANDATI)).toEqual([])
  // Il clic dopo gira, come sempre.
  await cella.click()
  await attendi(page, `(${MANDATI})().length === 1`)
  expect(await valuta(page, MANDATI)).toEqual(['presente'])
  await attendiRisposte(page)

  // La pressione lunga: il menu si apre tenendo premuto, e il rilascio non è un clic.
  await valuta(page, 'richieste.length = 0')
  const riquadro = await cella.boundingBox()
  if (!riquadro) throw new Error('la casella non ha un riquadro')
  await page.mouse.move(riquadro.x + riquadro.width / 2, riquadro.y + riquadro.height / 2)
  await page.mouse.down()
  await expect(menu).toBeVisible()
  await page.mouse.up()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, MANDATI)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)

  // Scegliere dal menu manda lo stato scelto per nome.
  await cella.click({ button: 'right' })
  await menu.getByRole('menuitem', { name: /Esonerat/ }).click()
  await attendi(page, `(${MANDATI})().length === 1`)
  expect(await valuta(page, MANDATI)).toEqual(['esonerato'])
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})
