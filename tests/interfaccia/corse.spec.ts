// Le corse fra quel che la pagina ha in mano e quel che il registro è diventato.
//
// Ogni prova qui apre una finestra, o manda un clic, e *nel frattempo*
// cambia il registro come farebbe un'altra finestra o l'assistente; poi guarda
// che cosa parte:
//
// - togliere una colonna del check rilegge le colonne dopo la domanda, e se nel
//   frattempo le spunte che cadono sono cresciute lo richiede;
// - l'elenco delle colonne, al Salva, tiene quelle nate altrove, non fa tornare
//   quelle tolte altrove, non riscrive il nome di una rinominata altrove;
// - tre clic su una casella nello stesso giro: il ritorno del primo non cancella
//   la memoria del terzo, ancora in viaggio;
// - «Spunta oggi» dentro un'ora di un altro giorno lega alla lezione di oggi;
// - le liste delle impostazioni tengono il fuoco dopo il salvataggio;
// - i giorni visibili leggono le impostazioni al clic, non al disegno;
// - «Pulisci» le settimane manda l'anno com'è dopo la domanda.
//
// Il ponte di prova qui sa trattenere le risposte, e per `impostazioni.salva`
// rispinge il registro prima di rispondere, come fa il pannello vero.

import { expect, test } from '@playwright/test'

import {
  FOTOGRAMMA, OGGI, ULTIMA, attendi, attendiRisposte, pannello, ponte, valuta,
} from './banco'

interface Colonna { id: string, titolo: string }

// Come il pannello: il registro nuovo arriva prima della risposta.
const RISPINGE = `if (m.azione?.tipo === 'impostazioni.salva') {
  const r = prova.stato.registro
  prova.aggiorna({ registro: { ...r, impostazioni: m.azione.impostazioni } })
}`

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

// Cambia il check come farebbe un'altra finestra: colonne e spunte nuove.
const ALTROVE = `([colonne, spunte]) => {
  const r = prova.stato.registro
  const allievo = r.classi[0].allievi[0].id
  const check = { ...r.check[0], colonne,
    spunte: spunte.map((colonnaId) => ({ allievoId: allievo, colonnaId, lezioneId: null,
      data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' })) }
  prova.aggiorna({ registro: { ...r, check: [check] } })
}`

const QUANTE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).length'

const C1 = { id: 'c1', titolo: 'Regolamento' }
const C2 = { id: 'c2', titolo: 'Quaderno' }
const C3 = { id: 'c3', titolo: 'Relazione' }

test('corse', async ({ browser }) => {
  const { page, errori } = await pannello(browser, {
    ponteJs: ponte(undefined, RISPINGE),
  })

  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')
  const menu = page.locator('.menu')
  const modali = page.locator('form.modale')

  // 1. Togliere «Quaderno»: mentre la domanda è aperta nasce «Relazione» con una
  // spunta. La lista mandata la tiene.
  await page.locator('.check__testata').nth(1).click()
  await menu.getByRole('menuitem', { name: 'Togli la colonna…' }).click()
  await expect(modali).toContainText('una casella già spuntata')
  await valuta(page, ALTROVE, [[C1, C2, C3], ['c2', 'c3']])
  await valuta(page, 'richieste.length = 0')
  await modali.getByRole('button', { name: 'Togli la colonna' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  const colonne = await valuta<{ colonne: Colonna[] }>(page, ULTIMA, 'check.colonne')
  expect(colonne.colonne, JSON.stringify(colonne)).toEqual([C1, C3])
  await expect(modali).toHaveCount(0)

  // 1b. Togliere «Regolamento», vuota: «non si perde niente». Intanto la si
  // spunta altrove: la risposta data non vale più, si richiede.
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await page.locator('.check__testata').nth(0).click()
  await menu.getByRole('menuitem', { name: 'Togli la colonna…' }).click()
  await expect(modali).toContainText('non si perde niente')
  await valuta(page, ALTROVE, [[C1, C2], ['c1', 'c2']])
  await valuta(page, 'richieste.length = 0')
  await modali.getByRole('button', { name: 'Togli la colonna' }).click()
  await expect(modali).toContainText('una casella già spuntata')
  expect(await valuta(page, QUANTE, 'check.colonne'), 'ha tolto senza richiedere').toBe(0)
  await modali.getByRole('button', { name: 'Togli la colonna' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  expect((await valuta<{ colonne: Colonna[] }>(page, ULTIMA, 'check.colonne')).colonne)
    .toEqual([C2])
  await expect(modali).toHaveCount(0)

  // 2. L'elenco delle colonne è aperto e altrove «Regolamento» diventa «Regole»,
  // «Quaderno» se ne va e nasce «Relazione»: il Salva lo dice e manda la fusione.
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await page.locator('[data-fuoco="comando-check.colonne"]').click()
  await expect(modali).toHaveCount(1)
  await valuta(page, ALTROVE, [[{ id: 'c1', titolo: 'Regole' }, C3], []])
  await valuta(page, 'richieste.length = 0')
  await modali.getByRole('button', { name: 'Salva', exact: true }).click()
  const domanda = modali.last()
  await expect(domanda).toContainText('Le colonne sono cambiate altrove')
  await expect(domanda).toContainText('«Relazione»')
  await expect(domanda).toContainText('«Quaderno»')
  await domanda.getByRole('button', { name: 'Salva lo stesso' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.colonne')")
  const fuse = (await valuta<{ colonne: Colonna[] }>(page, ULTIMA, 'check.colonne')).colonne
  expect(fuse, JSON.stringify(fuse)).toEqual([{ id: 'c1', titolo: 'Regole' }, C3])
  await expect(modali).toHaveCount(0)

  // 3. Tre clic nello stesso giro (spunta, togli, spunta) e torna solo il primo:
  // il quarto parte dal terzo, ancora in viaggio, e toglie.
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0; trattieni = true')
  const clic = `document.querySelector('[data-fuoco="check-${allievo}-c1"]').click()`
  await valuta(page, `() => { ${clic}; ${clic}; ${clic} }`)
  await valuta(page, 'async () => { rilascia(); await new Promise(r => setTimeout(r, 0)) }')
  await valuta(page, `() => { ${clic} }`)
  const fatte = await valuta<boolean[]>(page,
    "richieste.filter(m=>m.azione?.tipo==='check.spunta').map(m=>m.azione.fatta)")
  expect(fatte, `quattro clic hanno mandato ${JSON.stringify(fatte)}`)
    .toEqual([true, false, true, false])
  await valuta(page, 'async () => { trattieni = false; while (trattenute.length) rilascia();' +
    ' await new Promise(r => setTimeout(r, 0)) }')

  // 4. «Spunta oggi» dentro l'ora di un altro giorno, con un'ora oggi: lega
  // la spunta a quell'ora, come dalla pagina.
  const oggi = await valuta<string>(page, OGGI)
  await valuta(page, `(oggi) => {
      const r = prova.stato.registro
      const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
      const lezione = { ...base, id: 'lez-oggi', data: oggi, stato: 'pianificata' }
      prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
    }`, oggi)
  const vecchia = await valuta<string>(page,
    'prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[0].id).id')
  expect(vecchia).not.toBe('lez-oggi')
  await valuta(page, "id => prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id } }, " +
    "{ altro: { schedaLezione: 'amministrazione' } })", vecchia)
  await valuta(page, FOTOGRAMMA)
  await page.locator(`[data-fuoco="check-${allievo}-c1"]`).click({ button: 'right' })
  await valuta(page, 'richieste.length = 0')
  await menu.getByRole('menuitem', { name: 'Spunta oggi' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='check.spunta')")
  const spunta = await valuta<{ lezioneId?: string, data?: string }>(page, ULTIMA, 'check.spunta')
  expect(spunta.lezioneId === 'lez-oggi' && !spunta.data, JSON.stringify(spunta)).toBeTruthy()

  // 5. Le liste: una voce nuova, Invio, la pagina si rifà, e il fuoco resta nel
  // campo per scrivere la seconda di fila.
  await valuta(page, "prova.vai({ pagina: 'pagina.impostazioni', scheda: 'documento.liste' })")
  await valuta(page, FOTOGRAMMA)
  // Una lista alla volta, dietro la sua linguetta: la prima è chiusa e non ha
  // il campo per aggiungere, i supporti sì.
  await page.locator('.liste-schede .selettore__voce', { hasText: 'Supporti della spiegazione' })
    .click()
  await valuta(page, FOTOGRAMMA)
  const nuova = page.locator('input.voce-lista__nuova').first()
  const chiave = await nuova.getAttribute('data-fuoco')
  expect(chiave?.startsWith('lista-nuova-'), String(chiave)).toBeTruthy()
  await valuta(page, 'richieste.length = 0')
  await nuova.click()
  await page.keyboard.type('Alfa prova')
  await page.keyboard.press('Enter')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='impostazioni.salva')")
  await attendiRisposte(page)
  await valuta(page, FOTOGRAMMA)
  const attivo = await valuta(page, 'document.activeElement?.dataset?.fuoco ?? null')
  expect(attivo, `dopo il salvataggio il fuoco è su ${String(attivo)}`).toBe(chiave)
  await page.keyboard.type('Beta prova')
  await page.keyboard.press('Enter')
  await attendi(page, `(${QUANTE})('impostazioni.salva') === 2`)
  const liste = (await valuta<{ impostazioni: { liste: Record<string, { testo: string }[]> } }>(
    page, ULTIMA, 'impostazioni.salva')).impostazioni.liste
  const testi = Object.values(liste).flatMap((voci) => voci.map((v) => v.testo))
  expect(testi.includes('Alfa prova') && testi.includes('Beta prova'), JSON.stringify(testi))
    .toBeTruthy()
  await attendiRisposte(page)

  // 6. I giorni visibili: il registro nuovo arriva fra due clic, prima del
  // ridisegno, e il secondo clic parte da lì.
  await valuta(page, "prova.vai({ pagina: 'pagina.impostazioni', scheda: 'documento.calendario' })")
  await valuta(page, FOTOGRAMMA)
  const prima = await valuta<number[]>(page, '[...prova.stato.registro.impostazioni.giorniVisibili]')
  await valuta(page, 'richieste.length = 0; trattieni = true')
  await valuta(page, `() => {
      const voci = document.querySelectorAll('.scelta-giorni__voce')
      voci[5].click()
      const mandate = richieste.at(-1).azione.impostazioni
      const r = prova.stato.registro
      prova.aggiorna({ registro: { ...r, impostazioni: mandate } })
      voci[6].click()
    }`)
  const seconda = (await valuta<{ impostazioni: { giorniVisibili: number[] } }>(
    page, ULTIMA, 'impostazioni.salva')).impostazioni.giorniVisibili
  // La differenza simmetrica, ordinata: `sorted(set(prima) ^ {6, 7})`.
  const scambiati = new Set(prima)
  for (const giorno of [6, 7]) {
    if (scambiati.has(giorno)) scambiati.delete(giorno)
    else scambiati.add(giorno)
  }
  const atteso = [...scambiati].sort((a, b) => a - b)
  expect(seconda, `il secondo clic ha mandato ${JSON.stringify(seconda)}, atteso ${JSON.stringify(atteso)}`)
    .toEqual(atteso)
  await valuta(page, 'async () => { trattieni = false; while (trattenute.length) rilascia();' +
    ' await new Promise(r => setTimeout(r, 0)) }')

  // 7. «Pulisci» le settimane: mentre la domanda è aperta nasce una chiusura.
  // L'anno mandato la tiene.
  await valuta(page, `() => {
      const r = prova.stato.registro
      const anni = r.anni.map((a) => a.id === r.annoCorrenteId
        ? { ...a, settimane: { '2026-09-14': 'A' } } : a)
      prova.vai({ pagina: 'pagina.impostazioni', scheda: 'documento.anno' }, { altro: { registro: { ...r, anni } } })
    }`)
  await valuta(page, FOTOGRAMMA)
  await page.locator('button', { hasText: 'Pulisci' }).click()
  // Si parla di «tipi di settimana», e una sola settimana marcata si dice al
  // singolare.
  await expect(modali).toContainText('Togliere tutti i tipi?')
  await expect(modali).toContainText('1 settimana torna senza tipo.')
  await valuta(page, `() => {
      const r = prova.stato.registro
      const anni = r.anni.map((a) => a.id === r.annoCorrenteId
        ? { ...a, sospensioni: [...a.sospensioni,
            { id: 's-nuova', etichetta: 'Natale', dal: '2026-12-24', al: '2027-01-06' }] } : a)
      prova.aggiorna({ registro: { ...r, anni } })
    }`)
  await valuta(page, 'richieste.length = 0')
  await modali.getByRole('button', { name: 'Togli tutto' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='anno.salva')")
  const anno = (await valuta<{ anno: { settimane: object, sospensioni: { id: string }[] } }>(
    page, ULTIMA, 'anno.salva')).anno
  expect(anno.settimane, JSON.stringify(anno.settimane)).toEqual({})
  expect(anno.sospensioni.some((s) => s.id === 's-nuova'), JSON.stringify(anno.sospensioni))
    .toBeTruthy()

  expect(errori).toEqual([])
})
