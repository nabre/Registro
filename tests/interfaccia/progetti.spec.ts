// I progetti del corso, provati su Chromium: la pagina, la scheda dell'ora e la
// scelta di progetto e fase nell'attività del piano (ADR-54).
//
// Il ponte di prova risponde «fatto» a ogni azione e non riscrive il registro:
// qui si guarda che cosa parte a ogni gesto.
//
// - nella pagina: i compiti stanno a linguette, la scelta si ricorda per
//   progetto e le frecce la cambiano; il clic sull'inizio comincia oggi (senza data, solo per chi
//   non aveva cominciato), il clic sulla casella della matrice sale al primo
//   livello, i criteri si aggiungono tenendo l'id, e togliere un criterio con
//   delle caselle chiede prima e conferma con `scartaCelle`; compito e
//   progetto nuovi partono dalle loro finestre;
// - nell'ora: la scheda Progetto lega inizio e casella alla lezione, e un'ora
//   conclusa spegne i controlli; la scheda c'è solo se il piano dell'ora nomina
//   un progetto, e con due progetti ha una linguetta per progetto;
// - nel piano: il pulsante «Progetto» apre l'elenco dei progetti con le fasi, e
//   la scelta parte con `piano.salva`.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, OGGI, ULTIMA, attendi, attendiRisposte, pannello, valuta } from './banco'

type Azione = Record<string, unknown>

// Un progetto del primo corso: due fasi, un criterio con una casella già data,
// due compiti (il secondo già scaduto); un piano con un'attività del progetto, su un'ora di oggi.
const PREPARA = `(oggi) => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const classe = r.classi.find((c) => c.id === corso.classeId)
  const allievo = classe.allievi.find((a) => a.attivo)
  const ist = '2026-09-01T08:00:00.000Z'
  const progetto = { id: 'prg-prova', corsoId: corso.id, titolo: 'Giornale di classe',
    obiettivi: ['Scrivere un articolo'], stato: 'in-corso',
    fasi: [{ id: 'f1', titolo: 'Preparazione' }, { id: 'f2', titolo: 'Ricerca' }],
    criteri: [{ id: 'cr1', titolo: 'Contenuto' }],
    livelli: [{ valore: 'basso', testo: 'Basso', colore: '#ef4444' },
      { valore: 'alto', testo: 'Alto', colore: '#10b981' }],
    compiti: [{ id: 'cmp1', titolo: 'Scaletta', fine: null, fineLezioneId: null,
      inizi: [], proroghe: [], fatti: [] },
      { id: 'cmp2', titolo: 'Intervista', fine: '2026-01-15', fineLezioneId: null,
        inizi: [], proroghe: [], fatti: [] }],
    giudizi: [],
    matrice: [{ allievoId: allievo.id, criterioId: 'cr1', data: '2026-09-10', lezioneId: null, livello: 'alto' }],
    risorse: [], creatoIl: ist, aggiornatoIl: ist }
  const tappa = { id: 't1', titolo: 'Intervista', tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [], progettoId: progetto.id, faseProgettoId: 'f1' }
  const altra = { id: 't2', titolo: 'Lettura', tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [] }
  const piano = { id: 'piano-prg', corsoId: corso.id, obiettivi: [], prerequisiti: '',
    attivita: [tappa, altra], risorse: [], tag: [], creatoIl: ist, aggiornatoIl: ist }
  const base = r.lezioni.find((l) => l.corsoId === corso.id)
  const lezione = { ...base, id: 'lez-prg', data: oggi, stato: 'pianificata', pianoId: piano.id }
  prova.vai({ pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: progetto.id } }, {
    altro: { registro: { ...r, progetti: [progetto], piani: [piano], lezioni: [...r.lezioni, lezione] } },
  })
  return allievo.id
}`

test('progetti', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const oggi = await valuta<string>(page, OGGI)
  const allievo = await valuta<string>(page, PREPARA, oggi)
  await valuta(page, FOTOGRAMMA)

  // La pagina: il progetto nell'elenco, le fasi, i compiti a linguette con la
  // griglia del solo compito aperto, una riga per persona.
  const vista = page.locator('.vista--progetti')
  await expect(vista.locator('.elenco-laterale')).toContainText('Giornale di classe')
  await expect(vista.locator('.fase-progetto')).toHaveCount(2)
  const linguette = vista.getByRole('tablist', { name: 'Compiti' })
  await expect(linguette.getByRole('tab')).toHaveCount(2)
  await expect(linguette.getByRole('tab', { name: /Scaletta/ })).toHaveAttribute('aria-selected', 'true')
  // Il secondo è oltre la fine per chi non l'ha finito: il pallino lo dice da spento.
  await expect(linguette.getByRole('tab', { name: /Intervista/ }).locator('.linguetta-compito__allarme')).toHaveCount(1)
  await expect(vista.locator('.compito-progetto')).toHaveCount(1)
  await expect(vista.getByRole('tabpanel')).toHaveCount(1)

  // Scegliere una linguetta non scrive niente: cambia la griglia e si ricorda per progetto.
  await valuta(page, 'richieste.length = 0')
  await linguette.getByRole('tab', { name: /Intervista/ }).click()
  await expect(vista.locator(`[data-fuoco="inizio-cmp2-${allievo}"]`)).toHaveCount(1)
  await expect(vista.locator(`[data-fuoco="inizio-cmp1-${allievo}"]`)).toHaveCount(0)
  expect(await valuta(page, "prova.stato.compitiScelti['prg-prova']")).toBe('cmp2')
  // Le frecce tornano indietro e il fuoco resta sulla linguetta accesa.
  await page.keyboard.press('ArrowLeft')
  await expect(linguette.getByRole('tab', { name: /Scaletta/ })).toHaveAttribute('aria-selected', 'true')
  await expect(linguette.getByRole('tab', { name: /Scaletta/ })).toBeFocused()
  expect(await valuta(page, 'richieste.filter((m) => m.azione).length')).toBe(0)
  const inizio = page.locator(`.vista--progetti [data-fuoco="inizio-cmp1-${allievo}"]`)
  await expect(inizio).toHaveCount(1)

  // L'inizio dalla pagina: oggi, senza data, solo per lui.
  await valuta(page, 'richieste.length = 0')
  await inizio.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.inizia')")
  const iniziato = await valuta<Azione>(page, ULTIMA, 'progetto.compito.inizia')
  expect(iniziato).toEqual({
    tipo: 'progetto.compito.inizia', progettoId: 'prg-prova', compitoId: 'cmp1', allieviIds: [allievo],
  })
  await attendiRisposte(page)

  // La matrice di oggi, con l'ora di oggi: il clic sale al primo livello, nell'ora.
  const casella = vista.locator(`[data-fuoco="livello-${allievo}-cr1"]`)
  await valuta(page, 'richieste.length = 0')
  await casella.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.cella')")
  const cella = await valuta<Azione>(page, ULTIMA, 'progetto.cella')
  expect(cella.livello === 'basso' && cella.criterioId === 'cr1' && cella.allievoId === allievo &&
    cella.lezioneId === 'lez-prg', JSON.stringify(cella)).toBeTruthy()
  await attendiRisposte(page)

  // Un criterio nuovo: quello che c'era tiene il suo id.
  await vista.getByRole('button', { name: 'Criteri', exact: true }).click()
  let finestra = page.locator('form.modale')
  await expect(finestra).toHaveCount(1)
  await finestra.getByRole('button', { name: 'Aggiungi un criterio' }).click()
  await finestra.locator('.colonne-check__riga input').nth(1).fill('Forma')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  type Criterio = { id: string, titolo: string }
  type Salvato = { progetto: { criteri: Criterio[] }, scartaCelle?: boolean }
  let salvato = await valuta<Salvato>(page, ULTIMA, 'progetto.salva')
  expect(salvato.progetto.criteri.map((c) => c.titolo)).toEqual(['Contenuto', 'Forma'])
  expect(salvato.progetto.criteri[0].id).toBe('cr1')
  expect(salvato.scartaCelle).toBeUndefined()
  await expect(finestra).toHaveCount(0)

  // Togliere il criterio che ha una casella: prima la domanda, poi `scartaCelle`.
  await vista.getByRole('button', { name: 'Criteri', exact: true }).click()
  finestra = page.locator('form.modale')
  await finestra.locator('.colonne-check__riga').first().getByRole('button').last().click()
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await page.getByRole('button', { name: 'Togli e salva' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  salvato = await valuta(page, ULTIMA, 'progetto.salva')
  expect(salvato.progetto.criteri).toEqual([])
  expect(salvato.scartaCelle).toBe(true)
  await attendiRisposte(page)

  // I livelli: nome e descrizione in vista, il colore da un pallino con la sua tavolozza.
  await vista.getByRole('button', { name: 'Livelli', exact: true }).click()
  finestra = page.locator('form.modale')
  await expect(finestra.locator('.livello-riga__descrizione')).toHaveCount(2)
  await finestra.locator('.livello-riga__descrizione').first().fill('Manca il necessario')
  await finestra.locator('.livello-riga__pallino').first().click()
  await finestra.getByRole('button', { name: 'Viola', exact: true }).click()
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  const scala = await valuta<{ progetto: { livelli: Array<Record<string, string>> } }>(
    page, ULTIMA, 'progetto.salva')
  expect(scala.progetto.livelli[0]).toMatchObject({
    valore: 'basso', testo: 'Basso', descrizione: 'Manca il necessario', colore: '#8b5cf6',
  })
  await attendiRisposte(page)

  // Un compito nuovo.
  await vista.getByRole('button', { name: 'Nuovo compito' }).first().click()
  finestra = page.locator('form.modale')
  await finestra.locator('input[name="titolo"]').fill('Prima stesura')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.salva')")
  const compito = await valuta<{ compito: { titolo: string, id?: string } }>(page, ULTIMA, 'progetto.compito.salva')
  expect(compito.compito.titolo).toBe('Prima stesura')
  expect(compito.compito.id).toBeUndefined()
  await expect(finestra).toHaveCount(0)

  // Un progetto nuovo, dall'elenco.
  await vista.locator('.elenco-laterale').getByRole('button', { name: 'Nuovo progetto' }).click()
  finestra = page.locator('form.modale')
  await finestra.locator('input[name="titolo"]').fill('Orto')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  const nuovo = await valuta<{ progetto: { titolo: string, corsoId: string } }>(page, ULTIMA, 'progetto.salva')
  expect(nuovo.progetto.titolo).toBe('Orto')
  expect(nuovo.progetto.corsoId).toBe(await valuta(page, 'prova.stato.registro.corsi[0].id'))
  await attendiRisposte(page)

  // Nell'ora: la scheda Progetto lega l'inizio e la casella alla lezione.
  await valuta(page, `() => {
    prova.aggiorna({ schedaLezione: 'progetto' })
    prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-prg' } })
  }`)
  await valuta(page, FOTOGRAMMA)
  const ora = page.locator('.vista--lezione')
  await expect(ora.locator('.compito-progetto')).toHaveCount(1)
  // Un progetto solo nel piano: niente linguette dei progetti, quelle dei compiti sì.
  await expect(ora.getByRole('radiogroup', { name: 'Progetti' })).toHaveCount(0)
  await expect(ora.getByRole('tablist', { name: 'Compiti' }).getByRole('tab')).toHaveCount(2)
  await valuta(page, 'richieste.length = 0')
  await ora.locator(`[data-fuoco="inizio-cmp1-${allievo}"]`).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.inizia')")
  const nellOra = await valuta<Azione>(page, ULTIMA, 'progetto.compito.inizia')
  expect(nellOra.lezioneId, JSON.stringify(nellOra)).toBe('lez-prg')
  await attendiRisposte(page)
  await valuta(page, 'richieste.length = 0')
  await ora.locator(`[data-fuoco="livello-${allievo}-cr1"]`).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.cella')")
  const cellaOra = await valuta<Azione>(page, ULTIMA, 'progetto.cella')
  expect(cellaOra.lezioneId, JSON.stringify(cellaOra)).toBe('lez-prg')
  await attendiRisposte(page)

  // Un'ora conclusa: la scheda si guarda, i controlli sono spenti.
  await valuta(page, `() => {
    const r = prova.stato.registro
    prova.aggiorna({ registro: { ...r,
      lezioni: r.lezioni.map((l) => l.id === 'lez-prg' ? { ...l, stato: 'svolta' } : l) } })
  }`)
  await valuta(page, FOTOGRAMMA)
  await expect(ora.locator('fieldset.lezione-chiusa').first()).toHaveAttribute('disabled')
  await expect(ora.locator(`[data-fuoco="inizio-cmp1-${allievo}"]`)).toBeDisabled()

  // Nel piano: il pulsante dice progetto e fase, e l'elenco sceglie un'altra fase.
  await valuta(page, `() => prova.vai(
    { pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: 'piano-prg' } })`)
  await valuta(page, FOTOGRAMMA)
  await page.locator('.piano-editor .attivita-riga__apri').first().click()
  const scelta = page.locator('.piano-editor .scelta-progetto')
  await expect(scelta).toHaveCount(1)
  await expect(scelta).toContainText('Giornale di classe › Preparazione')
  await scelta.click()
  const elenco = page.getByRole('listbox')
  // Nessun progetto, le due fasi, «Nuova fase in …» e «Nuovo progetto…».
  await expect(elenco.getByRole('option')).toHaveCount(5)
  await expect(elenco.getByRole('option', { name: /Preparazione/ })).toHaveAttribute('aria-selected', 'true')
  await valuta(page, 'richieste.length = 0')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='piano.salva')")
  type Tappa = { progettoId?: string, faseProgettoId?: string }
  const piano = await valuta<{ piano: { attivita: Tappa[] } }>(page, ULTIMA, 'piano.salva')
  expect(piano.piano.attivita[0].progettoId).toBe('prg-prova')
  expect(piano.piano.attivita[0].faseProgettoId).toBe('f2')
  await expect(elenco).toHaveCount(0)

  // Due progetti nel piano dell'ora: una linguetta per progetto, con la fase.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const primo = r.progetti[0]
    const ist = '2026-09-01T08:00:00.000Z'
    const secondo = { ...primo, id: 'prg-due', titolo: 'Orto', fasi: [{ id: 'g1', titolo: 'Semina' }],
      compiti: [], giudizi: [], matrice: [], creatoIl: ist, aggiornatoIl: ist }
    const tappa = { id: 't3', titolo: 'Vasi', tipo: 'spiegazione', durataUd: 1, descrizione: '',
      materiali: '', raggruppamento: 'plenaria', risorse: [], progettoId: 'prg-due', faseProgettoId: 'g1' }
    prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-prg' } }, {
      altro: { registro: { ...r, progetti: [...r.progetti, secondo],
        piani: r.piani.map((p) => p.id === 'piano-prg' ? { ...p, attivita: [...p.attivita, tappa] } : p) } },
    })
  }`)
  await valuta(page, FOTOGRAMMA)
  const progettiOra = ora.getByRole('radiogroup', { name: 'Progetti' })
  await expect(progettiOra.getByRole('radio')).toHaveCount(2)
  await expect(progettiOra.getByRole('radio', { name: 'Giornale di classe › Preparazione' }))
    .toHaveAttribute('aria-checked', 'true')
  await progettiOra.getByRole('radio', { name: 'Orto › Semina' }).click()
  await expect(progettiOra.getByRole('radio', { name: 'Orto › Semina' })).toHaveAttribute('aria-checked', 'true')
  await expect(ora.locator('.scheda__titolo').filter({ hasText: 'Orto' })).toHaveCount(1)
  // Il secondo progetto non ha compiti: niente griglia, l'invito a crearne uno.
  await expect(ora.locator('.compito-progetto')).toHaveCount(0)

  // Un'ora senza piano: la linguetta Progetto non c'è, e quella ricordata ripiega sulla prima.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const base = r.lezioni.find((l) => l.id === 'lez-prg')
    prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-vuota' } }, {
      altro: { registro: { ...r, lezioni: [...r.lezioni, { ...base, id: 'lez-vuota', pianoId: null,
        stato: 'pianificata' }] } },
    })
  }`)
  await valuta(page, FOTOGRAMMA)
  const schede = ora.getByRole('radiogroup', { name: 'Scheda' })
  await expect(schede.getByRole('radio')).toHaveCount(3)
  await expect(schede.getByRole('radio', { name: 'Progetto' })).toHaveCount(0)
  await expect(schede.getByRole('radio', { name: 'Amministrazione' })).toHaveAttribute('aria-checked', 'true')
  expect(await valuta(page, 'prova.stato.schedaLezione')).toBe('progetto')

  expect(errori, `errori JS: ${errori.join('\n')}`).toEqual([])
})
