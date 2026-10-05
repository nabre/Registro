// I progetti, provati su Chromium: la biblioteca dell'anno (pagina Progetti),
// l'integrazione nel corso (pagina Integrazione progetti), la scheda dell'ora
// e la scelta di progetto e fase nell'attività del piano (ADR-54 e la sua
// estensione del 2026-10-03).
//
// Il ponte di prova risponde «fatto» a ogni azione e non riscrive il registro:
// qui si guarda che cosa parte a ogni gesto.
//
// - la barra: Integrazione progetti sta nella progettazione, Progetti con
//   l'anno, e ci si arriva da lì;
// - nell'integrazione: testata con lo stato nel corso, compiti in vista, sotto
//   le linguette Fasi nei piani, Matrice ed Esiti, ricordate per progetto; le
//   fasi si aprono e si chiudono, di serie è aperta quella di oggi, e dicono
//   dove sta ogni attività della scaletta; i compiti stanno a linguette, il
//   clic sull'inizio comincia oggi (senza data, solo per chi non aveva
//   cominciato), il clic sulla casella della matrice sale al primo livello,
//   sempre col corso; lo stato si cambia, e togliere dal corso chiede prima;
//   il compito nuovo del comando della barra apre la sua linguetta quando
//   l'host lo rimanda;
// - nella biblioteca: niente corso; scaletta, criteri (aggiunti tenendo l'id;
//   togliere un criterio con delle caselle chiede prima e conferma con
//   `scartaCelle`), livelli, «Integrato in» col rimando e l'integrazione in un
//   altro corso; il progetto nuovo nasce senza corso;
// - nell'ora: la scheda Progetto lega inizio e casella alla lezione, e un'ora
//   conclusa spegne i controlli; la scheda c'è solo se il piano dell'ora nomina
//   un progetto, e con due progetti ha una linguetta per progetto;
// - nel piano: il pulsante «Progetto» apre l'elenco dei progetti con le fasi, e
//   la scelta parte con `piano.salva`.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, OGGI, ULTIMA, attendi, attendiRisposte, pannello, valuta } from './banco'

type Azione = Record<string, unknown>

// Un progetto integrato nel primo corso: due fasi, la prima con un'attività
// di scaletta già in un piano, un criterio con una casella già data, due
// compiti (il secondo già scaduto); un piano con un'attività del progetto, su
// un'ora di oggi.
const PREPARA = `(oggi) => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const classe = r.classi.find((c) => c.id === corso.classeId)
  const allievo = classe.allievi.find((a) => a.attivo)
  const ist = '2026-09-01T08:00:00.000Z'
  const progetto = { id: 'prg-prova', titolo: 'Giornale di classe',
    obiettivi: ['Scrivere un articolo'],
    fasi: [{ id: 'f1', titolo: 'Preparazione' }, { id: 'f2', titolo: 'Ricerca' }],
    attivita: [
      { id: 'sc1', faseId: 'f1', titolo: 'Intervista', tipo: 'spiegazione', durataUd: 1 },
      { id: 'sc2', faseId: 'f1', titolo: 'Titoli', tipo: 'spiegazione', durataUd: 1 }],
    criteri: [{ id: 'cr1', titolo: 'Contenuto' }],
    livelli: [{ valore: 'basso', testo: 'Basso', colore: '#ef4444' },
      { valore: 'alto', testo: 'Alto', colore: '#10b981' }],
    integrazioni: [{ corsoId: corso.id, stato: 'in-corso',
      compiti: [{ id: 'cmp1', titolo: 'Scaletta', fine: null, fineLezioneId: null,
        inizi: [], proroghe: [], fatti: [] },
        { id: 'cmp2', titolo: 'Intervista', fine: '2026-01-15', fineLezioneId: null,
          inizi: [], proroghe: [], fatti: [] }],
      giudizi: [],
      matrice: [{ allievoId: allievo.id, criterioId: 'cr1', data: '2026-09-10', lezioneId: null, livello: 'alto' }] }],
    risorse: [], creatoIl: ist, aggiornatoIl: ist }
  const tappa = { id: 't1', titolo: 'Intervista', tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [], progettoId: progetto.id, faseProgettoId: 'f1',
    attivitaProgettoId: 'sc1' }
  const altra = { id: 't2', titolo: 'Lettura', tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [] }
  const piano = { id: 'piano-prg', corsoId: corso.id, obiettivi: [], prerequisiti: '',
    attivita: [tappa, altra], risorse: [], tag: [], creatoIl: ist, aggiornatoIl: ist }
  const base = r.lezioni.find((l) => l.corsoId === corso.id)
  const lezione = { ...base, id: 'lez-prg', data: oggi, stato: 'pianificata', pianoId: piano.id }
  prova.vai({ pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'progetto', id: progetto.id } }, {
    altro: { registro: { ...r, progetti: [progetto], piani: [piano], lezioni: [...r.lezioni, lezione] } },
  })
  return { allievo: allievo.id, corso: corso.id }
}`

test('progetti', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const oggi = await valuta<string>(page, OGGI)
  const { allievo, corso } = await valuta<{ allievo: string, corso: string }>(page, PREPARA, oggi)
  await valuta(page, FOTOGRAMMA)

  // La barra: l'integrazione nella progettazione, la biblioteca con l'anno.
  await expect(page.locator('.sidebar__gruppo--progettazione [data-fuoco="pagina.corso.integrazione"]'))
    .toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.sidebar__gruppo--anno [data-fuoco="pagina.progetti"]')).toHaveCount(1)

  // L'integrazione: il progetto nell'elenco, le fasi nei piani, i compiti a
  // linguette con la griglia del solo compito aperto, una riga per persona.
  const vista = page.locator('.vista--integrazione')
  await expect(vista.locator('.testata')).toContainText('Integrazione progetti')
  await expect(vista.locator('.elenco-laterale')).toContainText('Giornale di classe')
  // Sotto le schede in vista, le linguette del progetto: si parte dalle fasi nei piani.
  const parti = vista.getByRole('tablist', { name: 'Parti del progetto' })
  await expect(parti.getByRole('tab')).toHaveCount(3)
  await expect(parti.getByRole('tab', { name: 'Fasi nei piani' })).toHaveAttribute('aria-selected', 'true')
  await expect(vista.locator('.fase-progetto')).toHaveCount(2)
  // Le fasi ripiegate: aperta quella di oggi, con le sue attività; l'altra dice solo testata.
  const fase1 = vista.locator('[data-fuoco="fase:prg-prova:f1"]')
  const fase2 = vista.locator('[data-fuoco="fase:prg-prova:f2"]')
  await expect(fase1).toHaveAttribute('aria-expanded', 'true')
  await expect(fase2).toHaveAttribute('aria-expanded', 'false')
  await expect(vista.locator('.fase-progetto__corpo')).toHaveCount(1)
  await expect(vista.locator('.fase-progetto__corpo')).toContainText('Intervista')
  // La scaletta: l'attività già nel piano di oggi lo dice, l'altra resta da pianificare.
  await expect(vista.locator('[data-attivita-progetto-id="sc1"]')).toContainText('Pianificata')
  await expect(vista.locator('[data-attivita-progetto-id="sc2"]')).toContainText('Da pianificare')
  await expect(vista.getByRole('button', { name: 'Programma in un piano…' })).toHaveCount(1)
  await fase2.click()
  await expect(fase2).toHaveAttribute('aria-expanded', 'true')
  await expect(fase1).toHaveAttribute('aria-expanded', 'true')
  await fase1.click()
  await expect(fase1).toHaveAttribute('aria-expanded', 'false')
  await expect(vista.locator('.fase-progetto__corpo')).toHaveCount(1)
  await expect(fase1).toBeFocused()
  // Matrice ed Esiti: le frecce scelgono, il fuoco segue, la scelta si ricorda per progetto.
  await parti.getByRole('tab', { name: 'Matrice' }).click()
  await expect(vista.locator('.fase-progetto')).toHaveCount(0)
  expect(await valuta(page, "prova.stato.linguetteProgetti['prg-prova']")).toBe('matrice')
  await page.keyboard.press('ArrowRight')
  await expect(parti.getByRole('tab', { name: 'Esiti' })).toHaveAttribute('aria-selected', 'true')
  await expect(parti.getByRole('tab', { name: 'Esiti' })).toBeFocused()
  await expect(vista.getByRole('tabpanel').filter({ hasText: 'Valutazioni del progetto' })).toHaveCount(1)
  await page.keyboard.press('ArrowLeft')
  await expect(parti.getByRole('tab', { name: 'Matrice' })).toHaveAttribute('aria-selected', 'true')
  // Criteri e livelli si scrivono nella biblioteca: qui non ci sono.
  await expect(vista.getByRole('button', { name: 'Criteri', exact: true })).toHaveCount(0)
  const linguette = vista.getByRole('tablist', { name: 'Compiti' })
  await expect(linguette.getByRole('tab')).toHaveCount(2)
  await expect(linguette.getByRole('tab', { name: /Scaletta/ })).toHaveAttribute('aria-selected', 'true')
  // Il secondo è oltre la fine per chi non l'ha finito: il pallino lo dice da spento.
  await expect(linguette.getByRole('tab', { name: /Intervista/ }).locator('.linguetta-compito__allarme')).toHaveCount(1)
  await expect(vista.locator('.compito-progetto')).toHaveCount(1)
  await expect(vista.locator('.compiti-progetto').getByRole('tabpanel')).toHaveCount(1)

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
  const inizio = vista.locator(`[data-fuoco="inizio-cmp1-${allievo}"]`)
  await expect(inizio).toHaveCount(1)

  // L'inizio dalla pagina: oggi, senza data, solo per lui, nel corso.
  await valuta(page, 'richieste.length = 0')
  await inizio.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.inizia')")
  const iniziato = await valuta<Azione>(page, ULTIMA, 'progetto.compito.inizia')
  expect(iniziato).toEqual({
    tipo: 'progetto.compito.inizia', progettoId: 'prg-prova', corsoId: corso, compitoId: 'cmp1', allieviIds: [allievo],
  })
  await attendiRisposte(page)

  // La matrice di oggi, con l'ora di oggi: il clic sale al primo livello, nell'ora.
  const casella = vista.locator(`[data-fuoco="livello-${allievo}-cr1"]`)
  await valuta(page, 'richieste.length = 0')
  await casella.click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.cella')")
  const cella = await valuta<Azione>(page, ULTIMA, 'progetto.cella')
  expect(cella.livello === 'basso' && cella.criterioId === 'cr1' && cella.allievoId === allievo &&
    cella.lezioneId === 'lez-prg' && cella.corsoId === corso, JSON.stringify(cella)).toBeTruthy()
  await attendiRisposte(page)

  // Lo stato nel corso: un'azione dell'integrazione.
  await valuta(page, 'richieste.length = 0')
  await vista.getByRole('radiogroup', { name: 'Stato nel corso' }).getByRole('radio', { name: 'Concluso' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.integrazione.stato')")
  expect(await valuta<Azione>(page, ULTIMA, 'progetto.integrazione.stato')).toEqual({
    tipo: 'progetto.integrazione.stato', progettoId: 'prg-prova', corsoId: corso, stato: 'concluso',
  })
  await attendiRisposte(page)

  // Un compito nuovo, dal comando della barra.
  await page.locator('[data-fuoco="comando-progetto.nuovoCompito"]').click()
  let finestra = page.locator('form.modale')
  await finestra.locator('input[name="titolo"]').fill('Prima stesura')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.salva')")
  const compito = await valuta<{ corsoId: string, compito: { titolo: string, id?: string } }>(
    page, ULTIMA, 'progetto.compito.salva')
  expect(compito.compito.titolo).toBe('Prima stesura')
  expect(compito.compito.id).toBeUndefined()
  expect(compito.corsoId).toBe(corso)
  await expect(finestra).toHaveCount(0)
  // L'host lo rimanda: la sua linguetta si apre.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const nuovo = { id: 'cmp3', titolo: 'Prima stesura', fine: null, fineLezioneId: null,
      inizi: [], proroghe: [], fatti: [] }
    prova.aggiorna({ registro: { ...r, progetti: r.progetti.map((p) => p.id !== 'prg-prova' ? p : {
      ...p, integrazioni: p.integrazioni.map((i) => ({ ...i, compiti: [...i.compiti, nuovo] })) }) } })
  }`)
  await valuta(page, FOTOGRAMMA)
  await expect(linguette.getByRole('tab', { name: /Prima stesura/ })).toHaveAttribute('aria-selected', 'true')
  expect(await valuta(page, "prova.stato.compitiScelti['prg-prova']")).toBe('cmp3')
  await attendiRisposte(page)

  // La biblioteca, dalla testata: niente corso, scaletta, criteri e «Integrato in».
  await vista.getByRole('button', { name: 'Apri nella pagina Progetti' }).click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.progetti')
  const biblioteca = page.locator('.vista--progetti:not(.vista--integrazione)')
  await expect(biblioteca.locator('.testata')).toContainText('Biblioteca dell’anno')
  await expect(biblioteca.getByRole('tablist', { name: 'Compiti' })).toHaveCount(0)
  await expect(biblioteca.locator('[data-attivita-progetto-id]')).toHaveCount(2)
  const integrato = biblioteca.locator(`.integrazioni-progetto [data-corso-id="${corso}"]`)
  await expect(integrato).toHaveCount(1)
  await expect(integrato).toContainText('In corso')

  // Un criterio nuovo: quello che c'era tiene il suo id.
  await biblioteca.getByRole('button', { name: 'Criteri', exact: true }).click()
  finestra = page.locator('form.modale')
  await expect(finestra).toHaveCount(1)
  await finestra.getByRole('button', { name: 'Aggiungi un criterio' }).click()
  await finestra.locator('.colonne-check__riga input').nth(1).fill('Forma')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  type Criterio = { id: string, titolo: string }
  type Salvato = { progetto: { criteri: Criterio[], integrazioni?: unknown }, scartaCelle?: boolean }
  let salvato = await valuta<Salvato>(page, ULTIMA, 'progetto.salva')
  expect(salvato.progetto.criteri.map((c) => c.titolo)).toEqual(['Contenuto', 'Forma'])
  expect(salvato.progetto.criteri[0].id).toBe('cr1')
  expect(salvato.scartaCelle).toBeUndefined()
  // La testata non porta le integrazioni: hanno azioni loro.
  expect(salvato.progetto.integrazioni).toBeUndefined()
  await expect(finestra).toHaveCount(0)

  // Togliere il criterio che ha una casella in un corso: prima la domanda, poi `scartaCelle`.
  await biblioteca.getByRole('button', { name: 'Criteri', exact: true }).click()
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
  await biblioteca.getByRole('button', { name: 'Livelli', exact: true }).click()
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

  // Integrare in un altro corso dell'anno: l'azione col corso scelto.
  await valuta(page, 'richieste.length = 0')
  await biblioteca.getByRole('button', { name: 'Integra in un corso…' }).click()
  await page.getByRole('menuitem').first().click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.integra')")
  const integra = await valuta<Azione>(page, ULTIMA, 'progetto.integra')
  expect(integra.progettoId).toBe('prg-prova')
  expect(integra.corsoId).not.toBe(corso)
  await attendiRisposte(page)

  // Un progetto nuovo, dall'elenco della biblioteca: di nessun corso, niente integrazione.
  await valuta(page, '() => prova.vai({ pagina: \'pagina.progetti\' })')
  await valuta(page, FOTOGRAMMA)
  await biblioteca.locator('.elenco-laterale').getByRole('button', { name: 'Nuovo progetto' }).click()
  finestra = page.locator('form.modale')
  await expect(finestra.locator('[name="stato"]')).toHaveCount(0)
  await finestra.locator('input[name="titolo"]').fill('Orto')
  await valuta(page, 'richieste.length = 0')
  await finestra.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.salva')")
  const nuovo = await valuta<{ progetto: Record<string, unknown> }>(page, ULTIMA, 'progetto.salva')
  expect(nuovo.progetto.titolo).toBe('Orto')
  expect(nuovo.progetto.corsoId).toBeUndefined()
  await attendiRisposte(page)
  expect(await valuta(page, "richieste.some(m=>m.azione?.tipo==='progetto.integra')")).toBe(false)

  // Dalla biblioteca all'integrazione nel corso, col rimando di «Integrato in»:
  // dopo tanti ridisegni la linguetta scelta è ancora la matrice.
  await valuta(page, '() => prova.vai({ pagina: \'pagina.progetti\', soggetto: { tipo: \'progetto\', id: \'prg-prova\' } })')
  await valuta(page, FOTOGRAMMA)
  await integrato.getByRole('button').first().click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.corso.integrazione')
  expect(await valuta(page, 'prova.stato.corsoId')).toBe(corso)
  await expect(parti.getByRole('tab', { name: 'Matrice' })).toHaveAttribute('aria-selected', 'true')

  // Togliere dal corso: la domanda dice che cosa se ne va, poi l'azione.
  await valuta(page, 'richieste.length = 0')
  await vista.locator('.scheda').first().getByRole('button', { name: 'Togli dal corso' }).click()
  const domanda = page.getByRole('dialog')
  await expect(domanda).toContainText('3 compiti')
  await expect(domanda).toContainText('resta nella biblioteca')
  await domanda.getByRole('button', { name: 'Togli dal corso' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.integrazione.togli')")
  expect(await valuta<Azione>(page, ULTIMA, 'progetto.integrazione.togli')).toEqual({
    tipo: 'progetto.integrazione.togli', progettoId: 'prg-prova', corsoId: corso,
  })
  await attendiRisposte(page)

  // Nell'ora: la scheda Progetto lega l'inizio e la casella alla lezione.
  await valuta(page, `() => {
    prova.aggiorna({ schedaLezione: 'progetto', compitiScelti: {} })
    prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-prg' } })
  }`)
  await valuta(page, FOTOGRAMMA)
  const ora = page.locator('.vista--lezione')
  await expect(ora.locator('.compito-progetto')).toHaveCount(1)
  // Un progetto solo nel piano: niente linguette dei progetti, quelle dei compiti sì.
  await expect(ora.getByRole('radiogroup', { name: 'Progetti' })).toHaveCount(0)
  await expect(ora.getByRole('tablist', { name: 'Compiti' }).getByRole('tab')).toHaveCount(3)
  await valuta(page, 'richieste.length = 0')
  await ora.locator(`[data-fuoco="inizio-cmp1-${allievo}"]`).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='progetto.compito.inizia')")
  const nellOra = await valuta<Azione>(page, ULTIMA, 'progetto.compito.inizia')
  expect(nellOra.lezioneId, JSON.stringify(nellOra)).toBe('lez-prg')
  expect(nellOra.corsoId, JSON.stringify(nellOra)).toBe(corso)
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
      attivita: [], integrazioni: primo.integrazioni.map((i) => ({ ...i, compiti: [], giudizi: [], matrice: [] })),
      creatoIl: ist, aggiornatoIl: ist }
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
  await expect(schede.getByRole('radio', { name: 'Inizio ora' })).toHaveAttribute('aria-checked', 'true')
  expect(await valuta(page, 'prova.stato.schedaLezione')).toBe('progetto')

  expect(errori, `errori JS: ${errori.join('\n')}`).toEqual([])
})

// Come Progetto, la linguetta Valutazioni c'è solo con qualcosa dentro: un
// momento dell'ora o una tappa del piano che sarà una prova.
test('la linguetta Valutazioni dell’ora solo con qualcosa da valutare', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const apri = (conProva: boolean) => valuta(page, `() => {
    const r = prova.stato.registro
    const corso = r.corsi[0]
    const base = r.lezioni.find((l) => l.corsoId === corso.id)
    const t = '2026-09-01T08:00:00.000Z'
    const tappa = { id: 'tv', titolo: 'Verifica', tipo: 'verifica', durataUd: 1, risorse: [],
      valutazione: ${conProva} ? { titolo: 'Verifica', tipo: 'scritto', peso: 1 } : null }
    const piano = { id: 'piano-val', corsoId: corso.id, obiettivi: [], prerequisiti: '',
      attivita: [tappa], risorse: [], tag: [], creatoIl: t, aggiornatoIl: t }
    const lezione = { ...base, id: 'lez-val', data: '2027-05-20', stato: 'pianificata', pianoId: 'piano-val' }
    prova.vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-val' } }, {
      altro: { schedaLezione: 'valutazioni', registro: { ...r,
        valutazioni: r.valutazioni.filter((v) => v.lezioneId !== 'lez-val'),
        lezioni: [...r.lezioni.filter((l) => l.id !== 'lez-val'), lezione],
        piani: [...r.piani.filter((p) => p.id !== 'piano-val'), piano] } },
    })
  }`)
  const schede = page.getByRole('radiogroup', { name: 'Scheda' })

  // Senza prove nel piano né momenti: niente linguetta, e la scelta ricordata ripiega sulla prima.
  await apri(false)
  await valuta(page, FOTOGRAMMA)
  await expect(schede.getByRole('radio', { name: 'Valutazioni' })).toHaveCount(0)
  await expect(schede.getByRole('radio', { name: 'Inizio ora' })).toHaveAttribute('aria-checked', 'true')

  // Una tappa che sarà una prova: la linguetta c'è, a tutta larghezza.
  await apri(true)
  await valuta(page, FOTOGRAMMA)
  await expect(schede.getByRole('radio', { name: 'Valutazioni' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-telaio="lezione:valutazioni"] [data-telaio="valutazioni-ora"]')).toHaveCount(1)

  expect(errori, `errori JS: ${errori.join('\n')}`).toEqual([])
})

test('la barra porta all’integrazione del corso e alla biblioteca', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const laterale = page.locator('#navigazione-laterale')
  await laterale.locator('[data-fuoco="pagina.corso.integrazione"]').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.corso.integrazione')
  await expect(page.locator('.vista--integrazione')).toHaveCount(1)
  // Senza progetti integrati: l'invito a integrarne uno dalla biblioteca.
  await expect(page.locator('.vista--integrazione').getByRole('button', { name: 'Integra un progetto…' }).first())
    .toBeVisible()
  await laterale.locator('[data-fuoco="pagina.progetti"]').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.progetti')
  await expect(page.locator('.vista--integrazione')).toHaveCount(0)
  await expect(page.locator('.vista--progetti')).toHaveCount(1)
  expect(errori, `errori JS: ${errori.join('\n')}`).toEqual([])
})
