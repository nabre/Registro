// La tastiera dell'editor del calendario, su Chromium, sull'app vera e
// dall'esterno. Quel che dipende dai tempi:
//
//   1. Ctrl+Z con uno spostamento delle frecce in attesa: lo spostamento parte
//      subito, prima dell'annulla, e il timer delle frecce non lo riscrive;
//   2. le frecce ferme scrivono la somma, in un'azione sola;
//   3. tre frecce di giorno in fretta: tre giorni, non uno;
//   4. Ctrl+D tenuto premuto o battuto due volte: una copia sola; e niente
//      copia per un'ora ancorata all'ICS;
//   5. Canc due volte in fretta: una cancellazione sola;
//   6. l'ora scelta che non è più sullo schermo non si tocca;
//   7. Invio su un pulsante del calendario che non è un'ora resta al pulsante;
//   8. allungare un'ora sulle pause della giornata scavalca la ricreazione.
//
// Il ponte trattiene le risposte quando serve (`trattieni`, `rilascia()`), e
// non riscrive il registro: dove la prova ha bisogno che l'host abbia spinto
// lo stato prima della risposta, lo spinge lei.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, FRAME, attendi, attendiRisposte, pannello, ponte, valuta } from './banco'

type Azione = Record<string, unknown>

// Il calendario della settimana del 14 settembre, in modifica, col filtro sul
// corso di DIC4a: le due classi hanno l'ora alla stessa ora, e la settimana non
// le affianca, quindi senza filtro una copre l'altra (come in settimana.spec.ts).
const IN_MODIFICA = `() => {
  prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.calendario'))
  prova.aggiorna({ modoCalendario: 'settimana', data: '2026-09-14', editorCalendario: true,
    filtroCorsoAgendaId: prova.stato.registro.lezioni[0].corsoId })
}`

/** Le azioni di quel tipo partite dall'ultimo svuotamento. */
const MANDATE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione)'

async function mandate (page: Page, tipo: string): Promise<Azione[]> {
  return await valuta<Azione[]>(page, MANDATE, tipo)
}

/** Apre il calendario in modifica e sceglie l'ora di DIC4a con un clic. */
async function scegliOra (page: Page): Promise<{ id: string }> {
  await valuta(page, IN_MODIFICA)
  await valuta(page, FRAME)
  const id = await valuta<string>(page, 'prova.stato.registro.lezioni[0].id')
  const blocco = page.locator('.blocco', { hasText: 'DIC4a' }).first()
  await blocco.click()
  await expect(blocco).toBeFocused()
  await valuta(page, 'richieste.length = 0')
  return { id }
}

/** Aspetta che sia passato più del respiro delle frecce (450 ms) da `inizio`. */
async function oltreLeFrecce (page: Page, inizio: number): Promise<void> {
  await valuta(page, FOTOGRAMMA)
  await page.waitForFunction((t0) => performance.now() - t0 > 700, inizio)
}

test('Ctrl+Z con le frecce in attesa scrive lo spostamento subito, una volta sola', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, 'prova.aggiorna({ storia: { annulla: 1, ripristina: 0 } })')
  const { id } = await scegliOra(page)

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  expect(await mandate(page, 'lezione.sposta'), 'le frecce aspettano di fermarsi').toEqual([])

  await page.keyboard.press('Control+z')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='storia.annulla')")
  const tipi = await valuta<string[]>(page,
    "richieste.map(m=>m.azione?.tipo).filter(t=>t==='lezione.sposta'||t==='storia.annulla')")
  expect(tipi, 'lo spostamento parte prima dell’annulla').toEqual(['lezione.sposta', 'storia.annulla'])
  expect(await mandate(page, 'lezione.sposta')).toEqual([
    { tipo: 'lezione.sposta', lezioneId: id, data: '2026-09-14', inizio: '08:30' },
  ])

  // Il timer delle frecce se n'è andato: passato il suo tempo non riscrive.
  await oltreLeFrecce(page, await valuta<number>(page, 'performance.now()'))
  expect(await mandate(page, 'lezione.sposta')).toHaveLength(1)

  expect(errori).toEqual([])
  await page.close()
})

test('le frecce ferme scrivono la somma, una volta', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const minutiUd = await valuta<number>(page, 'prova.stato.registro.impostazioni.minutiUd')
  const { id } = await scegliOra(page)

  // Maiusc+↑ sale di un'UD, ↓ scende di cinque minuti.
  await page.keyboard.press('Shift+ArrowUp')
  await page.keyboard.press('ArrowDown')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='lezione.sposta')")
  const minuti = 8 * 60 + 20 - minutiUd + 5
  const inizio = `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
  expect(await mandate(page, 'lezione.sposta')).toEqual([
    { tipo: 'lezione.sposta', lezioneId: id, data: '2026-09-14', inizio },
  ])
  await oltreLeFrecce(page, await valuta<number>(page, 'performance.now()'))
  expect(await mandate(page, 'lezione.sposta')).toHaveLength(1)

  expect(errori).toEqual([])
  await page.close()
})

test('tre frecce di giorno in fretta spostano di tre giorni', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { id } = await scegliOra(page)

  await valuta(page, 'trattieni = true')
  await page.keyboard.press('ArrowRight')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='lezione.sposta')")
  expect((await mandate(page, 'lezione.sposta'))[0].data, 'il primo giorno parte subito').toBe('2026-09-15')
  // Il secondo e il terzo arrivano prima della risposta al primo: aspettano in coda.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.sposta')).toHaveLength(1)

  // L'host spinge lo stato con l'ora spostata, poi risponde.
  await valuta(page, `(id) => {
    const r = prova.stato.registro
    prova.aggiorna({ registro: { ...r,
      lezioni: r.lezioni.map((l) => l.id === id ? { ...l, data: '2026-09-15' } : l) } })
  }`, id)
  await valuta(page, 'rilascia()')
  await attendi(page, `(${MANDATE})('lezione.sposta').length === 2`)
  const seconda = (await mandate(page, 'lezione.sposta'))[1]
  expect(seconda, 'le battute in coda partono insieme').toMatchObject({ lezioneId: id, data: '2026-09-17' })
  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)

  expect(errori).toEqual([])
  await page.close()
})

test('Ctrl+D tenuto premuto o battuto in fretta fa una copia sola', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { id } = await scegliOra(page)

  await valuta(page, 'trattieni = true')
  await page.keyboard.down('Control')
  await page.keyboard.down('d')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='lezione.duplica')")
  // Tenuto premuto: la ripetizione non copia.
  await page.keyboard.down('d')
  await page.keyboard.up('d')
  // Battuto di nuovo mentre la prima copia è in volo: niente.
  await page.keyboard.down('d')
  await page.keyboard.up('d')
  await page.keyboard.up('Control')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.duplica')).toEqual([
    { tipo: 'lezione.duplica', lezioneId: id, data: '2026-09-21' },
  ])

  // Finita la prima, la seconda si fa.
  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)
  await page.locator('.blocco', { hasText: 'DIC4a' }).first().focus()
  await page.keyboard.press('Control+d')
  await attendi(page, `(${MANDATE})('lezione.duplica').length === 2`)

  expect(errori).toEqual([])
  await page.close()
})

// Il calendario ICS del documento lega l'ora di DIC4a a un evento per regola:
// combacia, quindi niente da allineare, ma l'ora è ancorata.
const ANCORATA = "m.procedura === 'calendario.eventi'" +
  " ? { tipo: 'riscontro', id: m.id, ok: true, dati: { eventi: window.eventiDiProva ?? [], guasti: [] } }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

// Da sistemare (CANTIERE § Prove): cade anche sul codice di prima della
// conversione, quindi è la prova, non l'editor; l'ora non risulta ancorata.
test.fixme('Ctrl+D non copia un’ora ancorata all’ICS', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(ANCORATA) })
  await valuta(page, `() => {
    const r = prova.stato.registro
    const lezione = r.lezioni[0]
    const slot = [...lezione.slot].sort((a, b) => a.inizio.localeCompare(b.inizio))
    window.eventiDiProva = [{ chiave: 'c1:' + lezione.data, data: lezione.data,
      inizio: slot[0].inizio, fine: slot[slot.length - 1].fine, titolo: 'MAT', luogo: '', annullato: false }]
    const impostazioni = { ...r.impostazioni, calendario: {
      calendari: [{ id: 'c1', nome: 'Scuola', origine: 'https://esempio.ch/scuola.ics', copiatoIl: '2026-09-01T08:00' }],
      regole: [{ id: 'r1', testo: 'MAT', corsoId: lezione.corsoId }] } }
    prova.aggiorna({ registro: { ...r, impostazioni } })
  }`)
  await scegliOra(page)
  await attendi(page, "tutte.some(m=>m.procedura==='calendario.eventi')")
  await attendiRisposte(page)
  await valuta(page, FRAME)
  await valuta(page, 'richieste.length = 0')

  await page.locator('.blocco', { hasText: 'DIC4a' }).first().focus()
  await page.keyboard.press('Control+d')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.duplica')).toEqual([])
  await expect(page.locator('.notifica--avviso')).not.toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// Da sistemare (CANTIERE § Prove): cade anche sul codice di prima; l'ora di
// prova chiede conferma prima di cancellare, e la prova non risponde.
test.fixme('Canc due volte in fretta cancella una volta', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { id } = await scegliOra(page)

  await valuta(page, 'trattieni = true')
  await page.keyboard.down('Delete')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='lezione.elimina')")
  await page.keyboard.down('Delete')
  await page.keyboard.up('Delete')
  await page.keyboard.press('Delete')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.elimina')).toEqual([{ tipo: 'lezione.elimina', lezioneId: id }])

  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)
  await expect(page.locator('.notifica--errore')).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

test('l’ora scelta che non si vede più non si tocca', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await scegliOra(page)

  // Un'altra settimana: l'ora scelta non è più sullo schermo.
  await valuta(page, "prova.aggiorna({ data: '2026-09-28' })")
  await valuta(page, FRAME)
  await expect(page.locator('.blocco', { hasText: 'DIC4a' })).toHaveCount(0)
  await page.keyboard.press('Delete')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowRight')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.elimina')).toEqual([])
  expect(await mandate(page, 'lezione.sposta')).toEqual([])

  // Tornando alla sua settimana la scelta se n'è andata: Canc non la cancella.
  await valuta(page, "prova.aggiorna({ data: '2026-09-14' })")
  await valuta(page, FRAME)
  await valuta(page, '() => document.activeElement?.blur()')
  await page.keyboard.press('Delete')
  await valuta(page, FOTOGRAMMA)
  expect(await mandate(page, 'lezione.elimina')).toEqual([])

  expect(errori).toEqual([])
  await page.close()
})

test('Invio su un pulsante del calendario che non è un’ora resta al pulsante', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { id } = await scegliOra(page)

  // Il pulsante della settimana di adesso, nella striscia delle settimane.
  const settimana = page.locator('.vista--calendario button[aria-current="true"]').first()
  await settimana.focus()
  await page.keyboard.press('Enter')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')

  // Sul blocco dell'ora, invece, Invio la apre.
  await page.locator('.blocco', { hasText: 'DIC4a' }).first().focus()
  await page.keyboard.press('Enter')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe(id)
  expect(await valuta(page, 'prova.stato.vista')).not.toBe('calendario')

  expect(errori).toEqual([])
  await page.close()
})

test('allungare un’ora scavalca la ricreazione, e la pausa entra nell’ora salvata', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  // Ricreazione 9:30–9:45, UD da 45; l'ora di DIC4a dalle 8:00 per due UD.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const base = r.lezioni[0]
    const lezione = { ...base, id: 'lez-lunga',
      slot: [{ ...base.slot[0], inizio: '08:00', fine: '09:30', tipo: 'lezione' }] }
    const impostazioni = { ...r.impostazioni, minutiUd: 45,
      pause: { prima: { inizio: '09:30', durataMin: 15 }, seguenti: [] } }
    prova.aggiorna({ registro: { ...r, impostazioni,
      lezioni: [lezione, ...r.lezioni.filter((l) => l.id !== base.id)] } })
  }`)
  await valuta(page, IN_MODIFICA)
  await valuta(page, FRAME)
  await valuta(page, 'richieste.length = 0')

  await page.locator('.blocco', { hasText: 'DIC4a' }).first().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Allunga di un’unità didattica' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='lezione.salva')")
  const salvata = (await mandate(page, 'lezione.salva'))[0]
  const slot = (salvata.lezione as { id: string, slot: Array<{ inizio: string, fine: string, tipo: string }> })
  expect(slot.id).toBe('lez-lunga')
  const forma = [...slot.slot]
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map((s) => `${s.tipo} ${s.inizio}–${s.fine}`)
  expect(forma).toEqual(['lezione 08:00–09:30', 'pausa 09:30–09:45', 'lezione 09:45–10:30'])

  expect(errori).toEqual([])
  await page.close()
})
