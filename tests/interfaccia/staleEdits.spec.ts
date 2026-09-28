// Quel che si sta scrivendo non si perde, e non riporta indietro il resto.
//
// Due difetti della stessa famiglia, provati qui insieme.
//
// L'editor del piano, nella pagina Piani, resta in memoria fra un ridisegno e
// l'altro — è quel che permette di scriverci mentre l'host spinge dati nuovi. Ma
// teneva anche la scaletta **vecchia**: cambiato il piano altrove (la matita del
// registro dell'ora, l'API, un altro computer), la pagina continuava a mostrare
// le tappe di prima, e al primo campo lasciato `piano.salva` le rimandava
// indietro intere. La tappa aggiunta altrove spariva senza un avviso. Prima della
// correzione il conto delle tappe qui sotto restava 2.
//
// Ctrl+S non consegnava il campo in cui si stava scrivendo: i campi salvano su
// `change`, cioè uscendo, e `stato.salva` partiva senza quel testo dicendo
// «Tutto salvato.». Prima della correzione nessun `piano.salva` con la nota
// precedeva lo `stato.salva`.
//
// Cambiando documento, la mira dello schermo per la classe partiva a ogni passo
// dell'arrivo dei dati: la prima portava il registro nuovo con il corso e l'ora
// dell'anno di prima, e l'host la riceveva come vera. Adesso l'arrivo dei dati è
// un blocco solo (`ricevoStato` in `main.ts`): la prima mira dopo il cambio
// porta solo id del documento nuovo.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, attendi, pannello, valuta, valutaSu } from './banco'

// Un piano con due tappe, sull'ora del primo corso. Serve solo a queste prove.
const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const tappa = (id, titolo) => ({ id, titolo, tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [] })
  const piano = { id: 'piano-prova', corsoId: corso.id, obiettivi: ['Le frazioni'], prerequisiti: '',
    attivita: [tappa('t1', 'Apertura'), tappa('t2', 'Esercizi')], risorse: [], note: '', tag: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  const lezioni = r.lezioni.map((l) => l.corsoId === corso.id ? { ...l, pianoId: piano.id } : l)
  prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
    { contesto: { corsoId: corso.id }, altro: { registro: { ...r, piani: [piano], lezioni } } })
}`

// Lo stesso piano cambiato altrove, con una tappa in più: un registro nuovo,
// come quello che l'host spinge dopo ogni scrittura.
const CAMBIA_ALTROVE = `() => {
  const r = prova.stato.registro
  const piani = r.piani.map((p) => p.id !== 'piano-prova' ? p : { ...p,
    attivita: [...p.attivita, { ...p.attivita[0], id: 't3', titolo: 'Verifica lampo' }],
    aggiornatoIl: '2026-09-02T08:00:00.000Z' })
  prova.aggiorna({ registro: { ...r, piani } })
}`

interface Anno {
  lezioni: { id: string }[]
  corsi: { id: string }[]
  classi: { id: string }[]
}

test('modifiche vecchie', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  const tappe = page.locator('.piano-editor input.attivita-riga__titolo')
  expect(await tappe.count(), 'l’editor non mostra le due tappe del piano').toBe(2)

  // Il piano cambia altrove mentre la pagina è aperta, e il fuoco non è
  // nell'editor: la pagina deve mostrare la scaletta nuova.
  await valuta(page, '() => document.activeElement?.blur()')
  await valuta(page, CAMBIA_ALTROVE)
  await valuta(page, FOTOGRAMMA)
  expect(await tappe.count(), 'l’editor mostra ancora la scaletta vecchia').toBe(3)

  // E quel che salva adesso parte dalla scaletta nuova, con la tappa di
  // altrove dentro.
  const note = page.locator('.piano-editor textarea[name="note"]')
  await valuta(page, 'richieste.length = 0')
  await note.fill('portare i fogli quadrettati')
  await valutaSu(note, '(el) => el.blur()')
  const salvato = await valuta<{ attivita: { id: string }[] } | null>(
    page,
    "richieste.filter(m=>m.azione?.tipo==='piano.salva').map(m=>m.azione.piano).at(-1) ?? null",
  )
  expect(salvato, 'uscire dalla nota non ha salvato il piano').toBeTruthy()
  expect(salvato?.attivita.map((a) => a.id), 'il salvataggio ha riportato indietro la scaletta')
    .toEqual(['t1', 't2', 't3'])

  // Ctrl+S con il cursore ancora nella nota: prima parte il campo, poi il
  // salvataggio del registro.
  await valuta(page, 'richieste.length = 0')
  await note.focus()
  await page.keyboard.type(' e il righello')
  await page.keyboard.press('Control+s')
  const tipi = await valuta<(string | null)[]>(page, 'richieste.map(m=>m.azione?.tipo ?? null)')
  expect(tipi, 'Ctrl+S non ha chiesto di salvare').toContain('stato.salva')
  const prima = tipi.slice(0, tipi.indexOf('stato.salva'))
  expect(prima, `Ctrl+S è partito senza consegnare il campo: ${JSON.stringify(tipi)}`)
    .toContain('piano.salva')
  const nota = await valuta<string>(
    page,
    "richieste.filter(m=>m.azione?.tipo==='piano.salva').at(-1).azione.piano.note",
  )
  expect(nota, 'nota consegnata storta').toBe('portare i fogli quadrettati e il righello')
  // E il cursore è ancora lì: si continua a scrivere.
  expect(await valuta(page, "document.activeElement?.getAttribute('name')"), 'Ctrl+S ha tolto il fuoco')
    .toBe('note')

  // Cambio di documento: la prima mira dopo porta solo id di B.
  const ARRIVA = `([percorso, registro]) => window.dispatchEvent(new MessageEvent('message', { data: {
      tipo: 'stato', registro, avvisi: [], radiceDati: null, radiceApp: null,
      documenti: { corrente: percorso, elenco: [] }, storia: { annulla: 0, ripristina: 0 },
      esportati: [], archiviati: [], composizioni: [], ocrAttivo: false, programma: [],
      posta: prova.stato.posta } }))`
  const annoA = await valuta<Anno>(page, 'prova.annoDiProva()')
  const annoB = await valuta<Anno>(page, 'prova.annoDiProva()')
  await valuta(page, ARRIVA, ['C:/esempio/A.regi', annoA])
  await valuta(page, 'id => prova.apriLezione(id)', annoA.lezioni[1].id)
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.corsoId')).toBe(annoA.corsi[1].id)
  await valuta(page, 'richieste.length = 0')
  await valuta(page, ARRIVA, ['C:/esempio/B.regi', annoB])
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'proiezione.mira')")
  const mire = await valuta<Record<string, string | null>[]>(
    page,
    "richieste.filter(m => m.azione?.tipo === 'proiezione.mira').map(m => m.azione.mira)",
  )
  expect(mire.length, 'cambiando documento non è partita nessuna mira').toBeGreaterThan(0)
  const diB = new Set(
    (['corsi', 'classi', 'lezioni'] as const).flatMap((chiave) => annoB[chiave].map((x) => x.id)),
  )
  for (const campo of ['lezioneId', 'corsoId', 'classeId']) {
    const valore = mire[0][campo]
    expect(
      valore === null || valore === undefined || diB.has(valore),
      `la prima mira dopo il cambio porta ${campo} dell’anno A: ${valore}`,
    ).toBeTruthy()
  }

  expect(errori, 'errori JS').toEqual([])
})
