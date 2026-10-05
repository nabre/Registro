// Il check del corso, provato su Chromium: la pagina, il tasto destro, l'ora.
//
// Tre cose che `node --test` non vede, perché vivono nei clic:
//
// - il clic su una casella vuota manda `check.spunta` con il quando giusto — la
//   lezione di oggi se il corso ce l'ha ancora aperta, altrimenti la data di
//   oggi; su una spuntata oggi la toglie, su una spuntata in un altro giorno non
//   manda niente e apre il menu della casella;
// - il tasto destro apre il menu della casella, e «Scegli la data…» porta a una
//   finestra che manda `check.data` con il giorno scritto;
// - dentro un'ora la stessa griglia spunta in quell'ora, e un corso senza
//   colonne mostra una riga sola invece di una scheda vuota;
// - la scheda del corso riassume il check colonna per colonna, lo conta persona
//   per persona e porta la griglia, che si spunta come la pagina; la scheda della
//   persona ha un riquadro «Check» con le stesse caselle.
//
// Il ponte di prova risponde «fatto» a ogni azione e non riscrive il registro:
// quel che si guarda qui è che cosa parte, non che cosa torna.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, OGGI, ULTIMA, attendi, attendiRisposte, pannello, valuta } from './banco'

type Azione = Record<string, unknown>

// Il check del primo corso: due colonne, la seconda spuntata a mano il 10
// settembre. Serve solo a queste prove.
const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const check = { id: 'chk-prova', corsoId: corso.id,
    colonne: [{ id: 'c1', titolo: 'Regolamento' }, { id: 'c2', titolo: 'Quaderno' }],
    spunte: [{ allievoId: r.classi[0].allievi[0].id, colonnaId: 'c2', lezioneId: null,
      data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' }],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-10T08:00:00.000Z' }
  prova.vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } },
    { altro: { registro: { ...r, check: [check] } } })
}`

// Un'ora del primo corso oggi: la pagina deve spuntare dentro quella.
const ORA_DI_OGGI = `(oggi) => {
  const r = prova.stato.registro
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const lezione = { ...base, id: 'lez-oggi', data: oggi, stato: 'pianificata' }
  prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
}`

test('check', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  const oggi = await valuta<string>(page, OGGI)
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')
  const lezioneVecchia = await valuta<string>(page,
    'prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[0].id).id')

  // La pagina: due colonne, con il conto sotto il nome; la casella spuntata
  // dice il giorno, corto.
  const griglia = page.locator('.vista--check table.check')
  await expect(griglia).toHaveCount(1)
  await expect(griglia.locator('.check__testata')).toHaveCount(2)
  await expect(griglia.locator('.check__testata').nth(1)).toContainText('1/1')
  const c1 = page.locator(`[data-fuoco="check-${allievo}-c1"]`)
  const c2 = page.locator(`[data-fuoco="check-${allievo}-c2"]`)
  await expect(c1).toHaveAttribute('aria-pressed', 'false')
  await expect(c2).toHaveAttribute('aria-pressed', 'true')
  await expect(c2).toHaveText('10.09')
  expect(await c2.getAttribute('title')).toContain('data scelta a mano')

  // Le frecce passano da una casella all'altra, senza spuntare.
  await c1.focus()
  await page.keyboard.press('ArrowRight')
  await expect(c2).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(c1).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(c1, 'la freccia fuori dalla griglia ha perso il fuoco').toBeFocused()

  // Come docente di classe, il check mostra un riquadro per corso. Due colonne
  // omonime restano in due griglie e ogni clic conserva il corso di origine.
  await valuta(page, `() => {
      const r = prova.stato.registro
      const classe = { ...r.classi[0], docenteDiClasse: true }
      const corsi = r.corsi.map((c, i) => i === 1 ? { ...c, classeId: classe.id } : c)
      const primo = corsi[0]
      const secondo = corsi[1]
      const base = (id, corsoId, colonnaId) => ({ id, corsoId,
        colonne: [{ id: colonnaId, titolo: 'Consegna' }], spunte: [],
        creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' })
      prova.vai({ pagina: 'pagina.classe.check', soggetto: { tipo: 'classe', id: classe.id } }, {
        altro: { registro: { ...r, classi: [classe, ...r.classi.slice(1)], corsi,
          check: [base('chk-classe-1', primo.id, 'consegna-1'),
            base('chk-classe-2', secondo.id, 'consegna-2')] } },
      })
    }`)
  await valuta(page, FOTOGRAMMA)
  await expect(page.getByRole('heading', { name: 'Check della classe' })).toHaveCount(1)
  await expect(page.locator('.scheda--check-classe')).toHaveCount(2)
  const griglieClasse = page.locator('.scheda--check-classe table.check')
  await expect(griglieClasse).toHaveCount(2)
  await expect(griglieClasse.nth(0).locator('.check__titolo')).toHaveText('Consegna')
  await expect(griglieClasse.nth(1).locator('.check__titolo')).toHaveText('Consegna')
  const secondoCorso = await valuta<string>(page, 'prova.stato.registro.corsi[1].id')
  await valuta(page, 'richieste.length = 0')
  await griglieClasse.nth(1).locator('.casella-check').first().click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  const spuntaClasse = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spuntaClasse.corsoId, JSON.stringify(spuntaClasse)).toBe(secondoCorso)
  await attendiRisposte(page)

  // Senza colonne, l'azione della singola scheda crea la colonna nel suo corso.
  await valuta(page, `() => {
      const r = prova.stato.registro
      prova.aggiorna({ registro: { ...r, check: r.check.filter(c => c.corsoId !== r.corsi[1].id) } })
    }`)
  await valuta(page, FOTOGRAMMA)
  const secondaScheda = page.locator('.scheda--check-classe').nth(1)
  await secondaScheda.getByRole('button', { name: 'Aggiungi la prima colonna' }).click()
  const finestraClasse = page.locator('form.modale')
  await finestraClasse.locator('input[name="titolo"]').fill('Prima della seconda')
  await valuta(page, 'richieste.length = 0')
  await finestraClasse.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  const colonneClasse = await valuta<Azione>(page, ULTIMA, 'check.colonne')
  expect(colonneClasse.corsoId, JSON.stringify(colonneClasse)).toBe(secondoCorso)
  await expect(finestraClasse).toHaveCount(0)

  // Tornando all'ambito corso, pagina e comportamento restano quelli esistenti.
  await valuta(page, PREPARA)
  await valuta(page, "prova.vai({ pagina: 'pagina.corso.check' })")
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.vista--check-classe')).toHaveCount(0)
  await expect(page.locator('.vista--check table.check')).toHaveCount(1)

  // Senza un'ora oggi, il clic spunta con la data di oggi.
  await valuta(page, 'richieste.length = 0')
  await c1.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  let spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.fatta === true && spunta.colonnaId === 'c1' && spunta.allievoId === allievo,
    JSON.stringify(spunta)).toBeTruthy()
  expect(spunta.data === oggi && !spunta.lezioneId, JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)

  // Con un'ora oggi, il clic spunta dentro quell'ora.
  await valuta(page, ORA_DI_OGGI, oggi)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')
  await c1.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.lezioneId, JSON.stringify(spunta)).toBe('lez-oggi')
  await attendiRisposte(page)

  // Conclusa l'ora di oggi, il clic spunta oggi e basta: legata all'ora
  // conclusa l'host la rifiuterebbe. Prima della correzione partiva con
  // `lezioneId: 'lez-oggi'`.
  const STATO_ORA = `(s) => {
    const r = prova.stato.registro
    prova.aggiorna({ registro: { ...r,
      lezioni: r.lezioni.map((l) => l.id === 'lez-oggi' ? { ...l, stato: s } : l) } })
  }`
  await valuta(page, STATO_ORA, 'svolta')
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')
  await c1.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.data === oggi && !spunta.lezioneId, JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)
  await valuta(page, STATO_ORA, 'pianificata')
  await valuta(page, FOTOGRAMMA)

  // Il tasto destro sulla casella vuota: la data si sceglie a mano.
  await c1.click({ button: 'right' })
  const menu = page.locator('.menu')
  await expect(menu.getByRole('menuitem', { name: 'Scegli la data…' })).toHaveCount(1)
  await expect(menu.getByRole('menuitem', { name: 'Togli la spunta' })).toHaveCount(0)
  await menu.getByRole('menuitem', { name: 'Scegli la data…' }).click()
  let finestra = page.locator('form.modale')
  await expect(finestra).toHaveCount(1)
  const campo = finestra.locator('input.campo__controllo--data')
  await campo.fill('12.9.26')
  await campo.press('Tab')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Spunta', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.data')")
  const data = await valuta<Azione>(page, ULTIMA, 'check.data')
  expect(data).toEqual({
    tipo: 'check.data',
    corsoId: await valuta(page, 'prova.stato.corsoId'),
    allievoId: allievo,
    colonnaId: 'c1',
    data: '2026-09-12',
  })
  await expect(finestra).toHaveCount(0)

  // Sulla casella spuntata un altro giorno il clic sinistro non la cambia, così
  // un clic sbagliato non la toglie: apre il menu, per non sembrare morta.
  await valuta(page, 'richieste.length = 0')
  await c2.click()
  await expect(menu.getByRole('menuitem', { name: 'Togli la spunta' })).toHaveCount(1)
  await page.keyboard.press('Escape')
  const mandate = await valuta<number>(page,
    "richieste.filter(m=>m.azione?.tipo?.startsWith('check.')).length")
  expect(mandate, 'il clic sinistro su una casella spuntata ha mandato qualcosa').toBe(0)
  expect(await c2.getAttribute('aria-label')).toContain('tasto destro per cambiarla')

  // Il doppio clic su una vuota è un clic e la sua correzione: il secondo parte
  // da quel che ha mandato il primo.
  await valuta(page, 'richieste.length = 0')
  await valuta(page, `() => { const c = document.querySelector('[data-fuoco="check-${allievo}-c1"]'); c.click(); c.click() }`)
  await attendi(page, "richieste.filter(m=>m.azione?.tipo==='check.spunta').length >= 2")
  await attendiRisposte(page)
  const fatte = await valuta<boolean[]>(page,
    "richieste.filter(m=>m.azione?.tipo==='check.spunta').map(m=>m.azione.fatta)")
  expect(fatte, `il doppio clic ha mandato ${JSON.stringify(fatte)}`).toEqual([true, false])

  // Una casella spuntata oggi, invece, il clic la toglie: è la correzione.
  await valuta(page, `([oggi, allievo]) => {
      const r = prova.stato.registro
      const check = { ...r.check[0], spunte: [...r.check[0].spunte, { allievoId: allievo,
        colonnaId: 'c1', lezioneId: null, data: oggi, fattaIl: '2026-09-24T08:00:00.000Z' }] }
      prova.aggiorna({ registro: { ...r, check: [check] } })
    }`, [oggi, allievo])
  await valuta(page, FOTOGRAMMA)
  expect(await c1.getAttribute('aria-label')).toContain('clic per togliere')
  await valuta(page, 'richieste.length = 0')
  await c1.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.fatta === false && spunta.colonnaId === 'c1', JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)
  // E si torna com'era, per le prove che seguono: c1 vuota.
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)

  // Sulla casella spuntata il menu cambia: cambiare la data, togliere.
  await c2.click({ button: 'right' })
  await expect(menu.getByRole('menuitem', { name: 'Cambia la data…' })).toHaveCount(1)
  const togli = menu.getByRole('menuitem', { name: 'Togli la spunta' })
  await expect(togli).toHaveCount(1)
  await valuta(page, 'richieste.length = 0')
  await togli.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.fatta === false && spunta.colonnaId === 'c2', JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)

  // Togliere una colonna con una spunta dentro lo dice prima, poi manda le
  // colonne che restano.
  await page.locator('.check__testata').nth(1).click()
  await menu.getByRole('menuitem', { name: 'Togli la colonna…' }).click()
  const domanda = page.locator('form.modale')
  await expect(domanda).toContainText('una casella già spuntata')
  await valuta(page, 'richieste.length = 0')
  await domanda.getByRole('button', { name: 'Togli la colonna' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  let colonne = await valuta<Azione>(page, ULTIMA, 'check.colonne')
  expect(colonne.colonne, JSON.stringify(colonne)).toEqual([{ id: 'c1', titolo: 'Regolamento' }])

  // I comandi della pagina stanno nella barra.
  for (const id of ['check.nuovaColonna', 'check.colonne']) {
    await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  }

  // Dentro un'ora: la stessa griglia nella scheda Inizio ora, e il clic
  // spunta in quell'ora.
  await valuta(page,
    "id => prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id } }," +
    " { altro: { schedaLezione: 'amministrazione' } })",
    lezioneVecchia)
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.vista--lezione .scheda--check')).toHaveCount(1)
  await expect(c2).toHaveClass(
    'casella-check casella-check--fatta casella-check--altrove casella-check--ferma')
  await valuta(page, 'richieste.length = 0')
  await c1.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.lezioneId === lezioneVecchia && spunta.fatta === true,
    JSON.stringify(spunta)).toBeTruthy()
  await c1.click({ button: 'right' })
  await expect(menu.getByRole('menuitem', { name: 'Spunta in questa lezione' })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // La casella spuntata un altro giorno: il tasto destro la riporta a quest'ora.
  await valuta(page, 'richieste.length = 0')
  await c2.click({ button: 'right' })
  await menu.locator('.menu__voce', { hasText: 'Assegna alla lezione corrente' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.lezione')")
  const riportata = await valuta<Azione>(page, ULTIMA, 'check.lezione')
  expect(riportata.lezioneId === lezioneVecchia && riportata.colonnaId === 'c2',
    JSON.stringify(riportata)).toBeTruthy()

  // Un corso senza colonne: una riga che porta alla pagina, niente griglia.
  const altra = await valuta<string>(page,
    'prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[1].id).id')
  await valuta(page, 'id => prova.apriLezione(id)', altra)
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.vista--lezione .scheda--check')).toHaveCount(0)
  await expect(page.locator('.vista--lezione .check-assente')).toHaveCount(1)
  await page.locator('.check-assente .collegamento').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.vista')).toBe('check')
  expect(await valuta(page, 'prova.stato.corsoId'))
    .toBe(await valuta(page, 'prova.stato.registro.corsi[1].id'))
  await expect(page.getByRole('button', { name: 'Aggiungi la prima colonna' })).toHaveCount(1)

  // Il menu della colonna ha «Aggiungi una colonna…»: la nuova nasce accanto.
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await page.locator('.check__testata').first().click()
  await menu.getByRole('menuitem', { name: 'Aggiungi una colonna…' }).click()
  finestra = page.locator('form.modale')
  await finestra.locator('input[name="titolo"]').fill('Relazione')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  colonne = await valuta<Azione>(page, ULTIMA, 'check.colonne')
  expect((colonne.colonne as { titolo: string }[]).map((c) => c.titolo), JSON.stringify(colonne))
    .toEqual(['Regolamento', 'Relazione', 'Quaderno'])
  await expect(finestra).toHaveCount(0)

  // La scheda del corso: riepilogo per colonna, colonna «Check» nella matrice, e
  // la griglia intera che si spunta come la pagina.
  const attivi = await valuta<number>(page,
    'prova.stato.registro.classi[0].allievi.filter(a=>a.attivo).length')
  await valuta(page, "prova.vai({ pagina: 'pagina.corsi' })")
  await valuta(page, FOTOGRAMMA)
  const numeri = page.locator('.corso-scheda .sintesi')
  let quaderno = numeri.locator('.dato', { hasText: 'Quaderno' })
  await expect(quaderno.locator('.dato__valore')).toHaveText(`1/${attivi}`)
  await expect(numeri.locator('.dato', { hasText: 'Regolamento' }).locator('.dato__valore'))
    .toHaveText(`0/${attivi}`)
  const matrice = page.locator('.corso-dettaglio table').first()
  await expect(matrice.locator('thead th', { hasText: 'Check' })).toHaveCount(1)
  const cella = matrice.locator('tbody tr', {
    hasText: await valuta<string>(page,
      '(()=>{const a=prova.stato.registro.classi[0].allievi[0]; return a.cognome})()'),
  }).locator('td').last()
  await expect(cella).toHaveText('1/2')
  expect(await cella.locator('span').first().getAttribute('title')).toContain('Regolamento')
  const grigliaCorso = page.locator('.vista--corsi .scheda--check table.check')
  await expect(grigliaCorso).toHaveCount(1)
  await valuta(page, 'richieste.length = 0')
  await grigliaCorso.locator(`[data-fuoco="check-${allievo}-c1"]`).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  // C'è l'ora di oggi: la spunta dalla scheda del corso la segue, come dalla pagina.
  expect(spunta.fatta === true && spunta.colonnaId === 'c1' && spunta.lezioneId === 'lez-oggi',
    JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)
  // Il pulsante in cima porta alla pagina del check di questo corso.
  await page.locator('.corso-scheda').getByTitle('Il check di questo corso').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.vista')).toBe('check')

  // Con tutti gli attivi spuntati la colonna è piena, e la pastiglia lo dice.
  await valuta(page, `() => {
      const r = prova.stato.registro
      const attivi = r.classi[0].allievi.filter((a) => a.attivo)
      const spunte = attivi.map((a) => ({ allievoId: a.id, colonnaId: 'c2', lezioneId: null,
        data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' }))
      prova.vai({ pagina: 'pagina.corsi' }, { altro: { registro: { ...r, check: [{ ...r.check[0], spunte }] } } })
    }`)
  await valuta(page, FOTOGRAMMA)
  quaderno = page.locator('.corso-scheda .sintesi .dato', { hasText: 'Quaderno' })
  await expect(quaderno.locator('.dato__valore')).toHaveText(`${attivi}/${attivi}`)
  await expect(quaderno).toHaveClass('dato dato--positivo')
  await expect(page.locator('.corso-scheda .sintesi .dato', { hasText: 'Regolamento' }))
    .toHaveClass('dato')

  // La scheda della persona, linguetta Materie: un riquadro «Check» con una
  // casella per colonna.
  await valuta(page, PREPARA)
  await valuta(page, `(id) => prova.vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id } },
      { contesto: { classeId: prova.stato.registro.classi[0].id }, altro: { schedaPersona: 'materie' } })`,
  allievo)
  await valuta(page, FOTOGRAMMA)
  const tema = page.locator('.riquadro-tema', {
    has: page.locator('.gruppo-titolo__nome', { hasText: 'Check' }),
  })
  await expect(tema).toHaveCount(1)
  const voci = tema.locator('.check-allievo__voce')
  await expect(voci).toHaveCount(2)
  await expect(voci.nth(0)).toContainText('da fare')
  await expect(voci.nth(1)).toContainText('a mano')
  await valuta(page, 'richieste.length = 0')
  await tema.locator(`[data-fuoco="check-${allievo}-c1"]`).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  spunta = await valuta<Azione>(page, ULTIMA, 'check.spunta')
  expect(spunta.fatta === true && spunta.colonnaId === 'c1' && spunta.allievoId === allievo,
    JSON.stringify(spunta)).toBeTruthy()
  await attendiRisposte(page)
  // La spuntata a mano un altro giorno: il clic non manda niente e apre il menu,
  // come il tasto destro, che offre di toglierla.
  await valuta(page, 'richieste.length = 0')
  await tema.locator(`[data-fuoco="check-${allievo}-c2"]`).click()
  await expect(menu.getByRole('menuitem', { name: 'Togli la spunta' })).toHaveCount(1)
  await page.keyboard.press('Escape')
  expect(await valuta(page,
    "richieste.filter(m=>m.azione?.tipo?.startsWith('check.')).length")).toBe(0)
  await tema.locator(`[data-fuoco="check-${allievo}-c2"]`).click({ button: 'right' })
  await expect(menu.getByRole('menuitem', { name: 'Togli la spunta' })).toHaveCount(1)
  await page.keyboard.press('Escape')
  // Un corso senza colonne non ha il riquadro: il riquadro compare una volta.
  await expect(page.locator('.riquadro-tema .gruppo-titolo__nome', { hasText: 'Check' }))
    .toHaveCount(1)

  expect(errori, `errori JS: ${errori.join('\n')}`).toEqual([])
})
