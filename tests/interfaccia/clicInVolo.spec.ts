// Le caselle delle matrici dell'ora e della classe, su Chromium.
//
// Il secondo clic rapido su una casella dell'ora parte da quel che ha mandato
// il primo, anche se fra i due la pagina si ridisegna senza la risposta.
//
// Appello e matrice del comportamento tenevano il valore in volo nella
// chiusura del pulsante: un ridisegno passa al nodo i gestori nuovi, con una
// chiusura nuova, e il secondo clic ripartiva dal disegno di prima mandando lo
// stesso valore del primo. Il check lo teneva già fuori (`components/inFlight.ts`).
//
// Il ponte di prova trattiene le risposte (`trattieni`): il ridisegno di mezzo
// lo fa la prova, con un `aggiorna` del registro com'è.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, attendiRisposte, pannello, valuta, valutaSu, valutaTutti } from './banco'

// Un'ora del primo corso con tre persone, aperta sulla scheda `scheda`.
const ORA = `(scheda) => {
  const r = prova.stato.registro
  const classe = r.classi[0]
  const allievi = [0, 1, 2].map((i) => ({ ...classe.allievi[0], id: \`al-\${i}\`, cognome: \`Prova\${i}\` }))
  const classi = r.classi.map((c) => c.id === classe.id ? { ...c, allievi } : c)
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const lezione = { ...base, id: 'lez-volo', stato: 'pianificata', presenze: [], matrice: [] }
  prova.aggiorna({ registro: { ...r, classi, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-volo')
  prova.aggiorna({ schedaLezione: scheda })
}`

// Un ridisegno che non porta la risposta: lo stesso registro, rimesso.
const RIDISEGNO = '() => prova.aggiorna({ registro: { ...prova.stato.registro } })'

const MANDATE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione)'

test('appello: il secondo clic dopo un ridisegno parte dal primo', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA, 'amministrazione')
  await valuta(page, FOTOGRAMMA)

  const cella = page.locator('[data-fuoco="ud-al-0-0"]')
  await expect(cella).toHaveCount(1)
  await valuta(page, 'trattieni = true; richieste.length = 0')
  await cella.click()
  await valuta(page, RIDISEGNO)
  await valuta(page, FOTOGRAMMA)
  await cella.click()
  const stati = (await valuta<Array<{ stato: string }>>(page, MANDATE, 'presenze.ud')).map((a) => a.stato)
  expect(stati, `due clic hanno mandato ${JSON.stringify(stati)}`).toEqual(['presente', 'assente'])

  await valuta(page, 'trattieni = false; rilascia(); rilascia()')
  await attendiRisposte(page)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

test('matrice: il secondo clic dopo un ridisegno parte dal primo', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA, 'annotazioni')
  await valuta(page, FOTOGRAMMA)

  const cella = page.locator('.matrice .cella-segno').first()
  await expect(cella).toHaveCount(1)
  await valuta(page, 'trattieni = true; richieste.length = 0')
  await cella.click()
  await valuta(page, RIDISEGNO)
  await valuta(page, FOTOGRAMMA)
  await cella.click()
  const segni = (await valuta<Array<{ segno: string | null }>>(page, MANDATE, 'osservazione.cella'))
    .map((a) => a.segno)
  expect(segni, `due clic hanno mandato ${JSON.stringify(segni)}`).toEqual(['positivo', 'negativo'])

  await valuta(page, 'trattieni = false; rilascia(); rilascia()')
  await attendiRisposte(page)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// Le frecce fra le caselle: nella matrice e nell'appello come nel check. Nei
// campi dell'appello (minuti, nota) restano del campo.
test('frecce nella matrice e nell’appello', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA, 'annotazioni')
  await valuta(page, FOTOGRAMMA)

  const segni = page.locator('.matrice tbody tr').nth(0).locator('.cella-segno')
  const sotto = page.locator('.matrice tbody tr').nth(1).locator('.cella-segno').first()
  await segni.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(segni.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowDown')
  await expect(sotto).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(sotto, 'la freccia fuori dalla matrice ha perso il fuoco').toBeFocused()
  const mandate = await valuta<number>(page, "richieste.filter(m=>m.azione?.tipo==='osservazione.cella').length")
  expect(mandate, 'le frecce hanno segnato una casella').toBe(0)

  await valuta(page, "prova.aggiorna({ schedaLezione: 'amministrazione' })")
  await valuta(page, FOTOGRAMMA)
  const ud = page.locator('[data-fuoco="ud-al-0-0"]')
  await ud.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-fuoco="ud-al-1-0"]')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('[data-fuoco="riga-al-1"]')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('[data-fuoco="riga-al-0"]')).toBeFocused()

  // La nota vuota è un «+»: al clic diventa il campo, dove la freccia sposta
  // il cursore e non il fuoco.
  await page.locator('button[data-fuoco="nota-al-0"]').click()
  const nota = page.locator('input[data-fuoco="nota-al-0"]')
  await expect(nota).toBeFocused()
  await nota.fill('ab')
  await page.keyboard.press('ArrowLeft')
  await expect(nota).toBeFocused()
  expect(await valutaSu<number>(nota, '(el) => el.selectionStart'), 'la freccia non è andata al campo')
    .toBe(1)
  await page.keyboard.press('ArrowDown')
  await expect(nota).toBeFocused()
  // Lasciata vuota, uscendone torna «+».
  await nota.fill('')
  await nota.blur()
  await expect(page.locator('button[data-fuoco="nota-al-0"]')).toHaveCount(1)
  await expect(nota).toHaveCount(0)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// I minuti di ritardo in apice sulla casella R, uno per UD: «+» finché non sono
// detti, al clic il campo, e quel che si scrive va a quell'UD.
test('appello: i minuti di ritardo in apice sulla casella', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA, 'amministrazione')
  await valuta(page, `() => {
    const r = prova.stato.registro
    const lezioni = r.lezioni.map((l) => l.id !== 'lez-volo' ? l : {
      ...l, presenze: [{ allievoId: 'al-0', stati: l.presenze[0]?.stati ?? ['ritardo'] }] })
    prova.aggiorna({ registro: { ...r, lezioni } })
  }`)
  await valuta(page, FOTOGRAMMA)

  const apici = page.locator('.appello__apice')
  await expect(apici, 'un apice solo, sulla R').toHaveCount(1)
  await apici.first().click()
  const campo = page.locator('input[data-fuoco="minuti-al-0-0"]')
  await expect(campo).toBeFocused()
  await campo.fill('7')
  await page.keyboard.press('Enter')
  await attendiRisposte(page)
  expect(await valuta(page, MANDATE, 'presenze.campi')).toEqual([
    { tipo: 'presenze.campi', lezioneId: 'lez-volo', allievoId: 'al-0', ud: 0, minuti: 7 },
  ])
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// La casella del documento nella matrice del docente di classe: un nome e lo
// stato, come le caselle del check e delle consegne.
test('casella del documento: nome e stato', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, 'prova.datiGrandi.archivio(3)')
  await valuta(page, "() => prova.vai({ pagina: 'pagina.classe.documenti' })")
  await valuta(page, FOTOGRAMMA)
  await valuta(page, FOTOGRAMMA)
  const caselle = page.locator('.tabella--documenti tbody .cella-documento:not(.cella-documento--file)')
  expect(await caselle.count()).toBeGreaterThan(0)
  const descritte = await valutaTutti<Array<[string | null, string | null, boolean]>>(caselle,
    "(els) => els.filter(e => !e.classList.contains('cella-documento--fuori')).map(e => [e.getAttribute('aria-label'), e.getAttribute('aria-pressed'), e.classList.contains('cella-documento--consegnato')])")
  expect(descritte.length).toBeGreaterThan(0)
  for (const [nome, premuta, consegnato] of descritte) {
    expect(nome, 'casella senza nome').toMatch(/^«.+» (portato da|consegnato a) .+/)
    expect(premuta).toBe(String(consegnato))
  }
  expect(descritte.some(([, premuta]) => premuta === 'true'), 'nessuna casella spuntata da provare').toBeTruthy()
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})
