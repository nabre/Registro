// Regressioni UI su Chromium senza avviare Electron o toccare dati reali.
// Prerequisiti: Chromium di Playwright installato; npm install.
// Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
// `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts navigation`.

import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  FOTOGRAMMA, attendi, pannello, riquadro, schermata, valuta, valutaSu,
} from './banco'

interface Anno { corsi: { id: string }[] }

/**
 * Una scelta della barra dei comandi è un pulsante con la tendina del
 * programma: la si apre e si preme la riga del valore (`data-voce`; «tutti»
 * per la voce vuota).
 */
async function scegli (page: Page, scelta: Locator, valore: string): Promise<void> {
  await scelta.click()
  await page.locator(`.menu__voce[data-voce="${valore || 'tutti'}"]`).click()
}

test('navigation', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible()
  const navigazione = page.locator('[data-fuoco="apri-navigazione"]')
  const laterale = page.locator('#navigazione-laterale')
  await expect(laterale.locator('.sidebar__pagina'))
    .toHaveCount(await valuta<number>(page, 'prova.PAGINE.length'))
  await expect(laterale.locator('[aria-current="page"]')).toHaveCount(1)
  // Cinque gruppi, ognuno una domanda sola: la giornata, il corso, la classe,
  // l'anagrafe dell'anno, il programma.
  expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='agenda').map(p=>p.id)"))
    .toEqual(['pagina.oggi', 'pagina.calendario', 'pagina.pendenze', 'pagina.daSmistare'])
  expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='registro').map(p=>p.id)"))
    .toEqual(['pagina.corso.registro', 'pagina.corso.valutazioni', 'pagina.corso.check',
      'pagina.corso.piani', 'pagina.corso.documenti'])
  expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='anno').map(p=>p.id)"))
    .toEqual(['pagina.classi', 'pagina.persone', 'pagina.mappa', 'pagina.corsi'])
  expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='sistema').map(p=>p.id)"))
    .toEqual(['pagina.impostazioni', 'pagina.guida'])
  const gruppi = await valuta<string[]>(page, 'prova.gruppiDiPagine().map(g=>g.gruppo)')
  expect(gruppi.filter((g) => g !== 'classe'), JSON.stringify(gruppi))
    .toEqual(['agenda', 'registro', 'anno', 'sistema'])
  // L'interruttore sta nell'intestazione della navigazione, e l'intestazione
  // resta ferma in cima mentre le pagine scorrono.
  await expect(laterale.locator('.sidebar__marchio [data-fuoco="apri-navigazione"]'))
    .toHaveCount(1)
  await expect(page.locator('.barra-titolo [data-fuoco="apri-navigazione"]')).toHaveCount(0)
  expect(await valutaSu(laterale.locator('.sidebar__marchio'),
    '(el) => getComputedStyle(el).position')).toBe('sticky')
  // Un aggiornamento dei dati non deve riportare in cima la sidebar scorsa.
  await page.setViewportSize({ width: 1440, height: 500 })
  await navigazione.focus()
  await valutaSu(laterale, '(el) => el.scrollTop = el.scrollHeight')
  const scorrimento = await valutaSu<number>(laterale, '(el) => el.scrollTop')
  expect(scorrimento).toBeGreaterThan(0)
  const alto = (await riquadro(laterale)).y
  expect(Math.abs((await riquadro(laterale.locator('.sidebar__marchio'))).y - alto))
    .toBeLessThan(1)
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  expect(await valutaSu(laterale, '(el) => el.scrollTop')).toBe(scorrimento)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const larghezzaPrima = (await riquadro(page.locator('main'))).width
  await navigazione.click()
  await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  expect((await riquadro(page.locator('main'))).width).toBeGreaterThan(larghezzaPrima)
  await expect(laterale.getByRole('button', { name: 'Corsi', exact: true })).toBeVisible()
  await laterale.getByRole('button', { name: 'Corsi', exact: true }).click()
  await expect(laterale.getByRole('button', { name: 'Corsi', exact: true }))
    .toHaveAttribute('aria-current', 'page')
  await laterale.getByRole('button', { name: 'Calendario', exact: true }).click()
  await schermata(page, 'sidebar-compatta.png')
  await navigazione.click()
  await expect(laterale).toBeVisible()
  // Il ridisegno della sidebar arriva un frame dopo: aperto prima, il menu si
  // richiuderebbe.
  await valuta(page, FOTOGRAMMA)
  // Menu: frecce, Home/End, Escape e restituzione del focus.
  const file = page.getByRole('button', { name: 'File', exact: true })
  await file.focus()
  await page.keyboard.press('ArrowDown')
  await expect(file).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('End')
  await expect(page.locator('.menu__voce').last()).toBeFocused()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(file).toBeFocused()
  await expect(file).toHaveAttribute('aria-expanded', 'false')
  // Il file recente invia il percorso e lascia la pagina corrente. I preferiti
  // sono un gruppo loro, con la stella come icona: il nome comincia con l'anno.
  await file.click()
  await page.getByRole('menuitem', { name: '2025-2026' }).click()
  expect(await valuta(page, "richieste.some(m=>m.azione?.tipo==='documento.apri' && " +
    "m.azione.percorso==='C:/esempio/2025-2026.regi')")).toBeTruthy()
  // Il tasto destro su un recente apre accanto il suo riquadro col nome del file;
  // freccia a sinistra lo chiude, a destra lo riapre; il tasto destro su una riga
  // senza riquadro lo chiude.
  const padre = page.locator('.menu:not(.menu--figlio)')
  const figlio = page.locator('.menu--figlio')
  const riga = padre.locator('.menu__voce[data-voce="C:/esempio/2025-2026.regi"]')
  await file.click()
  await riga.click({ button: 'right' })
  await expect(figlio).toHaveAttribute('aria-label', '2025-2026')
  await page.keyboard.press('ArrowLeft')
  await expect(figlio).toHaveCount(0)
  await expect(riga).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(figlio).toHaveCount(1)
  await padre.getByRole('menuitem', { name: 'Apri un anno…' }).click({ button: 'right' })
  await expect(figlio).toHaveCount(0)
  await expect(padre).toHaveCount(1)
  await page.keyboard.press('Escape')
  // La stella dal riquadro lascia il menu aperto col fuoco sulla riga del file:
  // né lo scorrimento né un secondo ridisegno lo chiudono. Il secondo clic su
  // «File» lo richiude.
  await page.setViewportSize({ width: 1440, height: 500 })
  await valutaSu(laterale, '(el) => el.scrollTop = el.scrollHeight')
  for (let volta = 0; volta < 2; volta++) {
    await file.click()
    await riga.click({ button: 'right' })
    await figlio.locator('.menu__voce').first().click()
    for (let i = 0; i < 3; i++) await valuta(page, FOTOGRAMMA)
    await expect(padre).toHaveCount(1)
    await expect(riga).toBeFocused()
    await valuta(page, 'prova.ridisegna()')
    for (let i = 0; i < 3; i++) await valuta(page, FOTOGRAMMA)
    await expect(padre).toHaveCount(1)
    await expect(file).toHaveAttribute('aria-expanded', 'true')
    await file.click()
    await expect(padre).toHaveCount(0)
    await expect(file).toHaveAttribute('aria-expanded', 'false')
  }
  expect(await valuta(page, 'prova.stato.documenti.elenco[0].preferito')).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  // La scelta del corso nel registro cambia davvero la lezione aperta.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))")
  const sceltaCorso = page.locator('[data-fuoco="barra-comandi-corso"]')
  await scegli(page, sceltaCorso, await valuta<string>(page, 'prova.stato.registro.corsi[1].id'))
  await attendi(page, 'prova.stato.registro.lezioni.find(l=>l.id===prova.stato.lezioneId)' +
    '.corsoId===prova.stato.corsoId')
  await expect(sceltaCorso).toHaveAttribute('data-valore', await valuta<string>(page, 'prova.stato.corsoId'))
  // La tendina del corso sta nella barra, non nel registro della lezione; i
  // gesti dell'ora sono comandi della pagina, non pulsanti in testata.
  expect(await valuta(page, "document.querySelectorAll('.navigatore-registro select').length"))
    .toBe(1)
  expect(await valuta(page,
    "document.querySelectorAll('.vista--lezione .testata button').length")).toBe(0)
  for (const id of ['lezione.stato.pianificata', 'lezione.stato.svolta',
    'lezione.stato.annullata']) {
    await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  }
  // Giorno, orario e aula si cambiano dal calendario, non dalla pagina dell'ora.
  await expect(page.locator('[data-fuoco="comando-lezione.modifica"]')).toHaveCount(0)
  // Le esportazioni stanno tutte in Documenti: nessun comando le porta altrove.
  expect(await valuta(page,
    String.raw`prova.COMANDI_UI.filter(c=>/^(corso\.esporta|corso\.verbale|lezione\.calendario|corso\.nuovaOra)/.test(c.id))` +
    ".every(c=>!c.dove.includes('lezione'))",
  )).toBeTruthy()
  await schermata(page, 'lezione-compatta.png')
  // Visita tutte le destinazioni con un contesto valido.
  const ids = await valuta<string[]>(page, 'prova.PAGINE.map(p=>p.id)')
  for (const id of ids) {
    await valuta(page, 'prova.scegliCorso(prova.stato.registro.corsi[0].id)')
    await valuta(page, FOTOGRAMMA)
    const titolo = await valuta<string>(page, 'id=>prova.PAGINE.find(p=>p.id===id).titolo', id)
    await laterale.getByRole('button', { name: titolo, exact: true }).click()
    await expect(laterale.locator('[aria-current="page"]')).toHaveCount(1)
    await attendi(page, 'document.querySelector("main")?.textContent.length > 0')
    await valuta(page, FOTOGRAMMA)
    expect(await valuta(page, 'prova.gruppiDiPagine().filter(g=>g.attivo).length'), id).toBe(1)
    expect(await valuta(page, 'id=>prova.gruppiDiPagine().find(g=>g.attivo).gruppo===' +
      'prova.PAGINE.find(p=>p.id===id).gruppo', id), id).toBeTruthy()
  }
  // Le tendine del contesto compaiono solo dove filtrano qualcosa.
  const corsoSelect = page.locator('[data-fuoco="barra-comandi-corso"]')
  const classeSelect = page.locator('[data-fuoco="barra-comandi-classe"]')
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.valutazioni'))")
  await expect(corsoSelect).toBeVisible()
  await expect(classeSelect).toHaveCount(0)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.pendenze'))")
  await expect(corsoSelect).toHaveCount(0)
  expect(await valuta(page, "prova.stato.vista === 'todo'")).toBeTruthy()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.check'))")
  await expect(corsoSelect).toBeVisible()
  expect(await valuta(page, "prova.stato.ambitoCheck === 'corso'")).toBeTruthy()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
  await expect(classeSelect).toBeVisible()
  await expect(corsoSelect).toHaveCount(0)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.check'))")
  await expect(classeSelect).toBeVisible()
  await expect(corsoSelect).toHaveCount(0)
  expect(await valuta(page,
    "prova.stato.vista === 'check' && prova.stato.ambitoCheck === 'classe'")).toBeTruthy()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  await expect(corsoSelect).toHaveCount(0)
  await expect(classeSelect).toHaveCount(0)
  // I comandi del calendario stanno nella barra, non nella testata della vista.
  const comandiCalendario = ['registro.oggi', 'calendario.indietro', 'calendario.avanti',
    'calendario.settimana', 'calendario.mese', 'calendario.anno', 'calendario.agenda']
  for (const id of comandiCalendario) {
    await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  }
  // «Oggi» del calendario sta nella riga delle azioni, una volta; la voce «Oggi»
  // della barra laterale è la pagina omonima.
  await expect(page.locator('#azioni-pagina').getByRole('button', { name: 'Oggi', exact: true }))
    .toHaveCount(1)
  await expect(page.locator('main').getByRole('button', { name: 'Oggi', exact: true }))
    .toHaveCount(0)
  // La modalità si legge sul pulsante acceso, e le frecce spostano il periodo.
  await page.locator('[data-fuoco="comando-calendario.mese"]').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.modoCalendario')).toBe('mese')
  await expect(page.locator('[data-fuoco="comando-calendario.mese"]'))
    .toHaveAttribute('aria-pressed', 'true')
  const dataPrima = await valuta<string>(page, 'prova.stato.data')
  await page.locator('[data-fuoco="comando-calendario.avanti"]').click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.data')).not.toBe(dataPrima)
  await page.locator('[data-fuoco="comando-registro.oggi"]').click()
  await valuta(page, FOTOGRAMMA)
  // La data locale, come `oggi()` in `dominio/date.ts`: `toISOString()` darebbe
  // quella UTC, diversa fra mezzanotte e le due in estate.
  const oggi = await valuta<string>(page,
    "(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');" +
    'return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()')
  expect(await valuta(page, 'prova.stato.data')).toBe(oggi)
  await page.locator('[data-fuoco="comando-calendario.settimana"]').click()
  await valuta(page, FOTOGRAMMA)
  // La striscia delle settimane segna un confine solo: la fine del semestre che
  // ne ha un altro dopo (la fine dell'ultimo è il bordo della striscia).
  await expect(page.locator('.striscia-settimane')).toHaveCount(1)
  await expect(page.locator('.striscia-settimane__voce--apre-semestre')).toHaveCount(0)
  const confini = page.locator('.striscia-settimane__voce--chiude-semestre')
  const semestri = await valuta<number>(page, '()=>prova.stato.registro.anni[0].semestri.length')
  await expect(confini).toHaveCount(semestri - 1)
  // E cade sulla settimana in cui il semestre finisce. Il titolo conta i soli
  // giorni mostrati, il confine si cerca su tutti e sette (`weekStrip.ts`): un
  // semestre che finisce di domenica, con Sab/Dom nascosti, sta nella settimana
  // che il titolo chiude al venerdì. Si confronta col lunedì e la domenica.
  const fine = await valuta<string>(page, '()=>prova.stato.registro.anni[0].semestri[0].fine')
  const titoloConfine = (await confini.first().getAttribute('title')) ?? ''
  expect(titoloConfine.includes('finisce il'), titoloConfine).toBeTruthy()
  const estremi = titoloConfine.match(/\d{2}\.\d{2}\.\d{4}/g) ?? []

  const iso = (scritta: string): string => {
    const [g, m, a] = scritta.split('.')
    return `${a}-${m}-${g}`
  }

  // Come `date.weekday()` di Python: il lunedì è zero. In UTC, per non
  // scivolare di un giorno col fuso.
  const giorno = 24 * 60 * 60 * 1000
  const primo = new Date(`${iso(estremi[0] ?? '')}T00:00:00Z`)
  const lunedi = new Date(primo.getTime() - ((primo.getUTCDay() + 6) % 7) * giorno)
  const domenica = new Date(lunedi.getTime() + 6 * giorno)
  const isoData = (d: Date): string => d.toISOString().slice(0, 10)
  expect(isoData(lunedi) <= fine && fine <= isoData(domenica), `${titoloConfine} ${fine}`)
    .toBeTruthy()
  // Il filtro per corso del calendario sta nella barra ed è indipendente da
  // quello del registro: due campi diversi.
  const filtroAgenda = page.locator('[data-fuoco="barra-comandi-corso-agenda"]')
  await expect(filtroAgenda).toBeVisible()
  await expect(corsoSelect).toHaveCount(0)
  expect(await valuta(page, "document.querySelectorAll('.vista--calendario select').length"))
    .toBe(0)
  const corsoRegistro = await valuta<string>(page, 'prova.stato.corsoId')
  const altro = await valuta<string>(page, 'prova.stato.registro.corsi[1].id')
  await scegli(page, filtroAgenda, altro)
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.filtroCorsoAgendaId')).toBe(altro)
  expect(await valuta(page, 'prova.stato.corsoId')).toBe(corsoRegistro)
  expect(await valuta(page, 'prova.lezioniInAgenda().every(l=>l.corsoId===' +
    'prova.stato.filtroCorsoAgendaId)')).toBeTruthy()
  // E il corso del registro non tocca quello del calendario.
  await valuta(page, 'prova.scegliCorso(prova.stato.registro.corsi[0].id)')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.filtroCorsoAgendaId')).toBe(altro)
  await scegli(page, filtroAgenda, '')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.filtroCorsoAgendaId')).toBeNull()
  // Un filtro puntato su un corso che nel documento aperto non c'è non
  // accende un corso a caso. Fra un anno e l'altro il
  // filtro non passa più (è ricordato per documento: A tiene il suo, B parte
  // da nessuno, tornando in A si ritrova; vedi il cambio di documento in
  // fondo): qui lo si mette a mano.
  await expect(page.locator('[data-fuoco="barra-stato-corso"]')).toHaveCount(0)
  const tendina = page.locator('[data-fuoco="barra-comandi-corso-agenda"]')
  await expect(tendina).toHaveCount(1)
  await expect(tendina.locator('.barra-comandi__scelta-valore')).toHaveText('Tutti i corsi')
  await valuta(page, "prova.aggiorna({filtroCorsoAgendaId:'corso-di-un-altro-anno'})")
  await valuta(page, FOTOGRAMMA)
  // Un corso che non c'è non si scrive come se ci fosse: o il filtro si spegne
  // («Tutti i corsi»), o la scelta resta in bianco.
  await expect(tendina.locator('.barra-comandi__scelta-valore')).toHaveText(
    await valuta<string | null>(page, 'prova.stato.filtroCorsoAgendaId') === null ? 'Tutti i corsi' : '—')
  await valuta(page, 'prova.aggiorna({filtroCorsoAgendaId:prova.stato.registro.corsi[1].id})')
  await valuta(page, FOTOGRAMMA)
  await expect(tendina).toHaveAttribute('data-valore', await valuta<string>(page, 'prova.stato.filtroCorsoAgendaId'))
  await valuta(page, 'prova.aggiorna({filtroCorsoAgendaId:null})')
  await valuta(page, FOTOGRAMMA)
  await expect(tendina.locator('.barra-comandi__scelta-valore')).toHaveText('Tutti i corsi')
  await schermata(page, 'calendario-compatto.png')
  // Pendenze: i tre filtri sono comandi della pagina, e l'acceso si legge sul
  // pulsante.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.pendenze'))")
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.vista')).toBe('todo')
  expect(await valuta(page, "prova.PAGINE.find(p=>p.id==='pagina.pendenze').gruppo"))
    .toBe('agenda')
  await expect(page.locator('[data-fuoco="barra-comandi-corso"]')).toHaveCount(0)
  for (const id of ['todo.tutte', 'todo.mie', 'todo.classi']) {
    await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(0)
  }
  expect(await valuta(page,
    "document.querySelectorAll('.vista--todo .testata .selettore').length")).toBe(0)
  // Il riepilogo è compatto: una riga per famiglia, la spiegazione nel titolo.
  // Una scheda per tipologia, quante ne dichiara il dominio.
  await expect(page.locator('.todo-sintesi__scheda')).toHaveCount(7)
  expect(await valuta(page, "document.querySelector('.todo-sintesi__scheda')" +
    '.getBoundingClientRect().height < 64')).toBeTruthy()
  expect(await valuta(page, "!!document.querySelector('.todo-sintesi__scheda').title"))
    .toBeTruthy()
  await expect(page.locator('.todo-schede')).toHaveCount(1)
  await expect(page.locator('.todo-classi')).toHaveCount(1)
  // Cliccando su una linguetta specifica di un corso
  const tabCorso = page.locator('[data-fuoco^="todo-tab-corso:"]').first()
  if (await tabCorso.count() > 0) {
    await tabCorso.click()
    await valuta(page, FOTOGRAMMA)
    await expect(page.locator('.todo-classe__corpo')).toHaveCount(1)
    await expect(page.locator('.todo-classi')).toHaveCount(0)
  }
  await schermata(page, 'pendenze-compatto.png')
  // Nel lavoro del corso una consegna nuova eredita il corso: non può migrare
  // per errore verso un'altra classe.
  await page.locator('[data-fuoco="comando-registro.nuovaConsegna"]').click()
  await expect(page.locator('.modale')).toBeVisible()
  await expect(page.locator('.modale [name="corsoId"]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  // Accendendo lo schermo compare la scheda Proiezione, già scelta, e la riga
  // delle azioni passa ai comandi dello schermo.
  const proiezione = async (aperta: boolean): Promise<void> => {
    await valuta(page, 'a=>{const i=prova.stato.proiezione.impostazioni; ' +
      "window.dispatchEvent(new MessageEvent('message',{data:{tipo:'proiezione.stato'," +
      'aperta:a,impostazioni:i}}))}', aperta)
    await valuta(page, FOTOGRAMMA)
  }

  await proiezione(true)
  await expect(page.locator('[data-fuoco="scheda-proiezione"]')).toBeVisible()
  expect(await valuta(page, 'prova.stato.schedaComandi')).toBe('schermo')
  for (const id of ['proiezione.nomi', 'proiezione.misure', 'proiezione.pausa',
    'proiezione.indietro', 'proiezione.avanti', 'proiezione.blocco.consegne',
    'proiezione.calendario.mese']) {
    await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  }
  // La fascia non ripete i comandi: restano le sole linguette a tre stati.
  expect(await valuta(page, "document.querySelectorAll('.barra-proiezione button').length"))
    .toBe(await valuta(page,
      "document.querySelectorAll('.barra-proiezione .blocco-proiettato').length"))
  // Cambiando pagina la riga torna ai comandi della pagina, e la scheda resta.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.stato.schedaComandi')).toBe('pagina')
  await expect(page.locator('[data-fuoco="comando-proiezione.nomi"]')).toHaveCount(0)
  await expect(page.locator('[data-fuoco="comando-calendario.avanti"]')).toHaveCount(1)
  await expect(page.locator('[data-fuoco="scheda-proiezione"]')).toBeVisible()
  await page.locator('[data-fuoco="scheda-proiezione"]').click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('[data-fuoco="comando-proiezione.nomi"]')).toHaveCount(1)
  // La scheda in più non manda la barra fuori dalla finestra stretta.
  await page.setViewportSize({ width: 560, height: 850 })
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'document.documentElement.scrollWidth <= innerWidth')).toBeTruthy()
  await schermata(page, 'barra-proiezione-560.png')
  await page.setViewportSize({ width: 1440, height: 1000 })
  // Spegnendo, la scheda se ne va con lo schermo e la riga torna alla pagina.
  await proiezione(false)
  await expect(page.locator('[data-fuoco="scheda-proiezione"]')).toHaveCount(0)
  await expect(page.locator('.barra-proiezione')).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.schedaComandi')).toBe('pagina')
  await expect(page.locator('[data-fuoco="comando-calendario.avanti"]')).toHaveCount(1)
  // Le pagine del docente di classe non si spengono mai, e da un corso di una
  // classe senza fascicolo aprono quella che ce l'ha.
  expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='classe')" +
    '.every(p=>!p.impedimento)')).toBeTruthy()
  await valuta(page, '()=>{prova.scegliCorso(prova.stato.registro.corsi[1].id); ' +
    "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))}")
  expect(await valuta(page, 'prova.stato.vista')).toBe('docenteClasse')
  expect(await valuta(page, 'prova.stato.registro.classi.find(c=>c.id===prova.stato.classeId)' +
    '.docenteDiClasse')).toBeTruthy()
  // Senza nessuna docenza di classe la sezione sparisce, e torna con la spunta.
  await valuta(page, '()=>{const r=structuredClone(prova.stato.registro); ' +
    'r.classi.forEach(c=>{c.docenteDiClasse=false}); ' +
    "prova.vai({pagina:'pagina.calendario'},{altro:{registro:r}})}")
  expect(await valuta(page, "prova.gruppiDiPagine().every(g=>g.gruppo!=='classe')"))
    .toBeTruthy()
  await expect(page.getByRole('button', { name: 'Docente di classe' })).toHaveCount(0)
  const paginaPrima = await valuta<string>(page, 'prova.postoCorrente().pagina')
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.check'))")
  expect(await valuta(page, 'prova.postoCorrente().pagina')).toBe(paginaPrima)
  await valuta(page, '()=>{const r=structuredClone(prova.stato.registro); ' +
    'r.classi[0].docenteDiClasse=true; prova.vai({pagina:prova.postoCorrente().pagina},' +
    '{contesto:{classeId:r.classi[0].id},altro:{registro:r}})}')
  expect(await valuta(page, "prova.gruppiDiPagine().some(g=>g.gruppo==='classe')"))
    .toBeTruthy()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.check'))")
  await valuta(page, '()=>{const r=structuredClone(prova.stato.registro); ' +
    'r.classi.forEach(c=>{c.docenteDiClasse=false}); prova.aggiorna({registro:r}); ' +
    'prova.riconvalidaRicordati()}')
  // Senza docenze la sezione non c'è più: `completa` ripiega sulle Classi.
  expect(await valuta(page, "prova.stato.vista === 'classi' && " +
    "prova.postoCorrente().pagina === 'pagina.classi'")).toBeTruthy()
  await valuta(page, '()=>{const r=structuredClone(prova.stato.registro); ' +
    'r.classi[0].docenteDiClasse=true; prova.vai({pagina:prova.postoCorrente().pagina},' +
    '{contesto:{classeId:r.classi[0].id},altro:{registro:r}})}')
  // La Dashboard non ha riga delle azioni (le sue tessere portano altrove):
  // l'interruttore delle azioni si prova sul calendario.
  await valuta(page, 'prova.vaiA(prova.PAGINE[0])')
  expect(await valuta(page, 'prova.stato.vista')).toBe('oggi')
  await expect(page.locator('#azioni-pagina')).toHaveCount(0)
  await expect(page.locator('[data-fuoco="mostra-azioni"]')).toHaveCount(0)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  await expect(page.locator('#azioni-pagina')).toBeVisible()
  await page.keyboard.press('Control+Shift+b')
  await expect(page.locator('#azioni-pagina')).toBeVisible()
  await page.keyboard.press('Control+b')
  await expect(page.locator('#azioni-pagina')).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible()
  await page.keyboard.press('Control+b')
  // Finestra stretta e menu lungo: scroll interno non chiude il menu.
  for (const width of [1440, 900, 560]) {
    await page.setViewportSize({ width, height: 850 })
    await schermata(page, `barra-${width}.png`)
    expect(await valuta(page, 'document.documentElement.scrollWidth <= innerWidth'), `${width}`)
      .toBeTruthy()
  }
  await file.click()
  await valutaSu(page.locator('.menu'), '(m)=>m.scrollTop=m.scrollHeight')
  await expect(page.locator('.menu')).toBeVisible()
  await page.keyboard.press('Escape')
  // Nella colonna compatta la navigazione da tastiera conserva il focus sulla voce.
  const voceCorsi = laterale.getByRole('button', { name: 'Corsi', exact: true })
  await voceCorsi.focus()
  await page.keyboard.press('Enter')
  await valuta(page, FOTOGRAMMA)
  await expect(voceCorsi).toBeFocused()
  // Su finestra stretta il pannello si apre a richiesta e si chiude scegliendo.
  await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  await navigazione.click()
  await expect(laterale).toBeVisible()
  await schermata(page, 'sidebar-560.png')
  await laterale.getByRole('button', { name: 'Corsi', exact: true }).click()
  await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  await expect(navigazione).toBeFocused()
  await navigazione.click()
  await laterale.getByRole('button', { name: 'Calendario', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  await expect(navigazione).toBeFocused()
  // Assistente aperto su finestra stretta: la colonna della navigazione la
  // decide il telaio, resta minimizzata, e l'interruttore per espanderla sparisce.
  await navigazione.click()
  await expect(laterale).toHaveClass('sidebar')
  await valuta(page, "()=>prova.aggiorna({programma:[{chiave:'registroDocenti.assistente.attivo'," +
    "valore:true,tipo:'boolean'}],assistenteAperto:true})")
  await expect(page.locator('.riquadro-assistente')).toBeVisible()
  await expect(navigazione).toHaveCount(0)
  await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  expect((await riquadro(laterale)).width).toBeLessThan(80)
  await schermata(page, 'sidebar-assistente-560.png')
  // Chiuso il riquadro la colonna torna com'era: la scelta era solo sospesa.
  await valuta(page, '()=>prova.aggiorna({assistenteAperto:false})')
  await expect(navigazione).toHaveCount(1)
  await expect(laterale).toHaveClass('sidebar')
  await navigazione.click()
  await valuta(page, '()=>prova.aggiorna({programma:[]})')
  await valuta(page, 'prova.vaiA(prova.PAGINE[0])')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await schermata(page, 'navigazione-scura.png')
  // Docente di classe: una sola navigazione e un solo comando per operazione.
  await page.emulateMedia({ colorScheme: 'light' })
  const schede: Record<string, string> = {
    documenti: 'documenti', assenze: 'assenze', messaggistica: 'messaggistica',
  }
  for (const [destinazione, comando] of [['documenti', 'Chiedi un documento'],
    ['assenze', 'Nuovo periodo'], ['messaggistica', 'Nuova comunicazione']]) {
    await valuta(page,
      "id => prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.classe.' + id))", destinazione)
    await valuta(page, FOTOGRAMMA)
    await expect(page.locator('#azioni-pagina').getByRole('button', { name: comando, exact: true }))
      .toHaveCount(1)
    await expect(page.locator('main').getByRole('button', { name: comando, exact: true }))
      .toHaveCount(0)
    // Quanti comandi ha la scheda lo dice l'elenco dei comandi, non un numero
    // scritto qui.
    const attesi = await valuta<number>(page,
      "scheda => prova.COMANDI_UI.filter(c => c.id.startsWith('docente.')" +
      " && c.dove.includes('docenteClasse')" +
      ' && (!c.schedaDocente || c.schedaDocente === scheda)).length',
      schede[destinazione])
    await expect(page.locator('[data-fuoco^="comando-docente."]')).toHaveCount(attesi)
    await expect(page.locator('[data-fuoco="comando-classe.nuovoAllievo"]')).toHaveCount(0)
    await expect(page.locator('[data-fuoco="comando-classe.incollaElenco"]')).toHaveCount(0)
    await expect(page.locator('.docente-classe > .selettore')).toHaveCount(0)
    await schermata(page, `docente-${destinazione}.png`)
  }
  // Archivio documentale: una scansione si guarda nella cornice della pagina,
  // non nel lettore del sistema. La cornice vive fuori dalla vista: si prova qui
  // che un ridisegno non la porti via.
  const registroPrima = await valuta(page, 'structuredClone(prova.stato.registro)')
  await valuta(page, `() => {
      const r = structuredClone(prova.stato.registro)
      const classe = r.classi.find(c => c.id === prova.stato.classeId)
      classe.allievi = [{ id: 'alv-p', cognome: 'Rossi', nome: 'Maria', attivo: true }]
      const corso = r.corsi.find(c => c.classeId === classe.id)
      r.consegne = [...r.consegne, {
        id: 'con-arch', corsoId: corso.id, testo: 'Pagella', tipo: 'consegna',
        documento: 'modulo', a: 'classe', allieviIds: [], data: '2026-09-02',
        dataLezioneId: null, scadenza: null, scadenzaLezioneId: null, note: '',
        fatte: [{ chi: 'alv-p', fattaIl: '2026-09-20T08:00:00.000Z', modo: 'mano' }],
        documenti: [{ allievoId: 'alv-p', file: 'archivio/pagella.pdf', nome: 'pagella.pdf',
                      aggiuntoIl: '2026-09-20T08:00:00.000Z' }],
        mailAllievo: true, mailTutore: true,
        creataIl: '2026-09-01T08:00:00.000Z', aggiornataIl: '2026-09-01T08:00:00.000Z',
      }]
      prova.vai({ pagina: 'pagina.classe.documenti' }, { altro: { registro: r, semestreId: null,
        archiviati: [{ percorso: 'archivio/pagella.pdf', misura: 12345, revisione: 0 }],
        radiceDati: 'https://esempio.invalido/dati' } })
    }`)
  await valuta(page, FOTOGRAMMA)
  // A cornice chiusa la matrice prende tutta la larghezza: una colonna sola.
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(0)
  // La casella piena è l'unico elenco dei fogli raccolti, e premendola si apre
  // il documento: nessun secondo riquadro che li ripeta.
  await expect(page.locator('.cella-documento--file')).toHaveCount(1)
  await page.locator('.cella-documento--file').first().click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(1)
  await expect(page.locator('.archivio__titolo')).toHaveText('Rossi Maria')
  // La casella della matrice si accende: si vede da dove si era partiti.
  await expect(page.locator('.cella-documento--aperta')).toHaveCount(1)
  // Il telaio del lettore è tenuto (`data-tieni`): un ridisegno non lo ricrea.
  await valuta(page, "document.querySelector('.cornice-posto__telaio').__segnato = true")
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.cornice-posto')).toHaveCount(1)
  expect(await valuta(page, "document.querySelectorAll('.cornice-posto__telaio').length"))
    .toBe(1)
  expect(await valuta(page, "document.querySelector('.cornice-posto__telaio').__segnato === true"))
    .toBeTruthy()
  await schermata(page, 'archivio-documentale.png')
  await page.locator('.archivio__testa').getByTitle('Torna alla matrice a schermo intero').click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.anteprimaArchivio')).toBeNull()
  // Caricare un PDF non chiede niente: il documento lo dice la casella su cui si
  // lasciano cadere le pagine. Quel che parte porta la classe, o una scansione
  // muta finirebbe in quarantena senza classe.
  await valuta(page, 'richieste.length = 0')
  await page.locator('[data-fuoco="comando-docente.caricaPdf"]').first().click()
  await expect(page.locator('.modale')).toHaveCount(0)
  const caricamento = await valuta<{ consegnaId: unknown, classeId: unknown }[]>(page,
    "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.carica')")
  expect(caricamento.length > 0,
    JSON.stringify(await valuta(page, 'richieste.map(r => r.azione && r.azione.tipo)')))
    .toBeTruthy()
  expect(caricamento[0].consegnaId, JSON.stringify(caricamento[0])).toBeNull()
  expect(caricamento[0].classeId, JSON.stringify(caricamento[0]))
    .toBe(await valuta(page, 'prova.stato.classeId'))
  await valuta(page, 'registro=>prova.aggiorna({registro})', registroPrima)

  // Nuovo periodo: due date e basta. Il nome lo ricava chi salva dal semestre,
  // e le date partono dal semestre di oggi.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
  await valuta(page, FOTOGRAMMA)
  await page.locator('[data-fuoco="comando-docente.assenze"]').first().click()
  await expect(page.locator('.modale')).toHaveCount(1)
  const modale = page.locator('.modale')
  await expect(modale.locator('[name="etichetta"]')).toHaveCount(0)
  // Due campi data veri, col calendario del sistema: la data si guarda, non si
  // sa a memoria.
  const date = modale.locator('input[type="date"]')
  await expect(date).toHaveCount(2)
  const dal = date.nth(0)
  const al = date.nth(1)
  // Partono dal semestre di oggi, e non sono mai lo stesso giorno.
  expect(await dal.inputValue(), 'la data di inizio parte vuota').not.toBe('')
  expect(await dal.inputValue(), `${await dal.inputValue()} ${await al.inputValue()}`)
    .not.toBe(await al.inputValue())
  // Il calendario è chiuso dentro l'anno scolastico: fuori non si sceglie.
  const anno = await valuta<[string, string]>(page,
    '()=>{const a=prova.stato.registro.anni[0]; return [a.inizio, a.fine]}')
  for (const campoData of [dal, al]) {
    expect(await campoData.getAttribute('min')).toBe(anno[0])
    expect(await campoData.getAttribute('max')).toBe(anno[1])
    const valore = await campoData.inputValue()
    expect(valore >= anno[0] && valore <= anno[1]).toBeTruthy()
  }
  await schermata(page, 'assenze-nuovo-periodo.png')
  await modale.getByRole('button', { name: 'Annulla', exact: true }).click()
  await expect(page.locator('.modale')).toHaveCount(0)

  // Assenze: un rapporto caricato si guarda nella cornice della pagina, con lo
  // stesso telaio dell'archivio documentale, senza aprire il lettore di sistema
  // per ogni foglio.
  await valuta(page, `() => {
      const r = structuredClone(prova.stato.registro)
      const classe = r.classi.find(c => c.id === prova.stato.classeId)
      classe.allievi = [{ id: 'alv-p', cognome: 'Rossi', nome: 'Maria', attivo: true }]
      r.fascicoli = [{
        id: 'fas-ass', classeId: classe.id, recapiti: [], documenti: [], comunicazioni: [],
        assenze: [{
          id: 'blo-ass', etichetta: '1° semestre', dal: '2026-09-01', al: '2027-01-31',
          oggetto: 'Assenze', corpo: 'Testo', aAllievo: false, aTutore: false,
          recapitiIds: [], note: '',
          righe: [{ allievoId: 'alv-p', invio: null, fogli: [{
            tipo: 'assenze', firmato: false, file: 'archivio/assenze.pdf',
            nome: 'assenze.pdf', aggiuntoIl: '2026-09-20T08:00:00.000Z' }] }],
          creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z',
        }],
        creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z',
      }]
      prova.vai({ pagina: 'pagina.classe.assenze' }, { altro: { registro: r, semestreId: null,
        bloccoAssenzeId: 'blo-ass',
        archiviati: [{ percorso: 'archivio/assenze.pdf', misura: 4321, revisione: 0 }],
        radiceDati: 'https://esempio.invalido/dati' } })
    }`)
  await valuta(page, FOTOGRAMMA)
  // A cornice chiusa la matrice prende tutta la larghezza.
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(0)
  const casellaAssenze = page.locator('.tabella--assenze .cella-documento--consegnato')
  await expect(casellaAssenze).toHaveCount(1)
  await casellaAssenze.first().click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(1)
  await expect(page.locator('.archivio__titolo')).toHaveText('Rossi Maria')
  // Di chi è e che foglio è: due rapporti della stessa persona si somigliano.
  await expect(page.locator('.archivio__testa .pastiglia')).toHaveText('assenze')
  await expect(page.locator('.archivio__conto')).toHaveText('1 di 1')
  // La casella della matrice si accende: si vede da dove si era partiti.
  await expect(page.locator('.cella-documento--aperta')).toHaveCount(1)
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.cornice-posto')).toHaveCount(1)
  await schermata(page, 'docente-assenze-cornice.png')
  // Cambiando periodo la cornice si chiude: il foglio era di quel periodo.
  await valuta(page, "prova.aggiorna({ bloccoAssenzeId: 'altro' })")
  expect(await valuta(page, 'prova.stato.anteprimaAssenze')).toBeNull()
  await valuta(page, "prova.aggiorna({ bloccoAssenzeId: 'blo-ass' })")
  await valuta(page, FOTOGRAMMA)
  await page.locator('.tabella--assenze .cella-documento--consegnato').first().click()
  await valuta(page, FOTOGRAMMA)
  await page.locator('.archivio__testa').getByTitle('Torna alla matrice a schermo intero').click()
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.archivio--con-foglio')).toHaveCount(0)
  expect(await valuta(page, 'prova.stato.anteprimaAssenze')).toBeNull()
  await valuta(page, 'registro=>prova.vai({pagina: "pagina.classe.pendenze"}, {altro: {registro}})',
    registroPrima)

  // La pendenza non deve ricadere sul corso di un'altra classe.
  await valuta(page, '()=>{const r=structuredClone(prova.stato.registro); ' +
    'r.corsi=r.corsi.filter(c=>c.classeId!==prova.stato.classeId); ' +
    "prova.vai({pagina:'pagina.classe.pendenze'},{altro:{registro:r}})}")
  await expect(page.locator('[data-fuoco="comando-docente.pendenza"]')).toBeDisabled()
  await valuta(page, 'registro=>prova.aggiorna({registro})', registroPrima)
  // La pagina Documenti del primo corso.
  await valuta(page, `()=>{const c=prova.stato.registro.corsi[0];
      prova.vai({pagina:'pagina.corso.documenti',soggetto:{tipo:'corso',id:c.id}},
        {contesto:{filtroClasseId:c.classeId},
         altro:{schedaDocumenti:'corso',esportati:[],anteprima:null}})}`)
  // Un CSV si guarda nella cornice come tabella: la prima riga del file (il
  // titolo dell'esportazione) va sopra, i numeri a destra.
  const corpo = ['\ufeffDIC4a — Presenze', '', 'Persona;UD;Assenze %',
    'Rossi Mario;24;12%', '"Bianchi; Anna";24;0%', ''].join('\r\n')
  await page.route('**/*.csv*', (rotta) => rotta.fulfill({
    status: 200, contentType: 'text/csv; charset=utf-8', body: corpo,
  }))
  const csv = await valuta<string>(page, `()=>{const r=prova.stato.registro, c=r.corsi[0];
      const d=prova.collocazioneDi(r,'presenze',c.id,{semestreId:prova.stato.semestreId});
      return prova.percorsoDi(d,'csv')}`)
  await valuta(page, "p=>prova.aggiorna({radiceDati:'https://esempio.invalid/dati'," +
    ' esportati:[{percorso:p,misura:120,revisione:0}],anteprima:p})', csv)
  const tabella = page.locator('.documenti__csv .tabella--csv')
  await expect(tabella).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.documenti__csv-titolo')).toHaveText('DIC4a — Presenze')
  await expect(tabella.locator('thead th')).toHaveText(['Persona', 'UD', 'Assenze %'])
  // Il punto e virgola fra virgolette non spezza la cella.
  await expect(tabella.locator('tbody tr').nth(1).locator('td'))
    .toHaveText(['Bianchi; Anna', '24', '0%'])
  await expect(tabella.locator('tbody tr').first().locator('td').nth(1))
    .toHaveClass('tabella__numero')
  await valuta(page, 'prova.aggiorna({anteprima:null,esportati:[],radiceDati:null})')
  // La casella «Cerca su Hugging Face» si scrive mentre la pagina si ridisegna
  // (quattro volte al secondo durante uno scarico): `data-fuoco` tiene il fuoco
  // e le lettere. Il vecchio indirizzo porta alle impostazioni del programma.
  await valuta(page, "prova.vai({pagina:'pagina.impostazioni', scheda:'programma.modelli'})")
  await valuta(page, FOTOGRAMMA)
  // Senza risposta dall'host la pagina resta in attesa, senza casella: si
  // risponde come il guscio.
  await valuta(page, `() => {
      const spento = { attivo: false, modello: '', pronto: false, motivo: '' }
      for (const m of tutte.filter(r => r.procedura === 'llm.modelli')) {
        window.dispatchEvent(new MessageEvent('message', { data: {
          tipo: 'riscontro', id: m.id, ok: true,
          dati: { cartella: 'C:/esempio/modelli', modelli: [], assistente: spento, ocr: spento },
        } }))
      }
    }`)
  await valuta(page, FOTOGRAMMA)
  const casella = 'input[type="search"][aria-label="Cerca un modello su Hugging Face"]'
  await expect(page.locator(casella)).toHaveCount(1)
  await page.locator(casella).click()
  await page.keyboard.type('qwen')
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator(casella)).toBeFocused()
  await expect(page.locator(casella)).toHaveValue('qwen')
  // Si continua a battere senza riprendere il campo, mentre i ridisegni arrivano.
  await page.keyboard.type('-vl')
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator(casella)).toHaveValue('qwen-vl')
  await schermata(page, 'modelli-linguistici.png')

  // Cambio di documento: ogni `.regi` riapre dove lo si era lasciato. A su una
  // pagina con un soggetto; B, mai aperto, parte dalla Dashboard senza niente
  // scelto e con la fila di Alt+← vuota; tornando in A si ritrova pagina,
  // soggetto e filtro dell'agenda.
  const ARRIVA = `([percorso, registro]) => window.dispatchEvent(new MessageEvent('message', { data: {
      tipo: 'stato', registro, avvisi: [], radiceDati: null, radiceApp: null,
      documenti: { corrente: percorso, elenco: [] }, storia: { annulla: 0, ripristina: 0 },
      esportati: [], archiviati: [], ocrAttivo: false, programma: [],
      posta: prova.stato.posta } }))`
  const annoA = await valuta<Anno>(page, 'prova.annoDiProva()')
  const annoB = await valuta<Anno>(page, 'prova.annoDiProva()')
  await valuta(page, ARRIVA, ['C:/esempio/A.regi', annoA])
  await valuta(page, FOTOGRAMMA)
  const soggettoA = annoA.corsi[1].id
  await valuta(page, "id=>prova.vai({pagina:'pagina.corso.piani',soggetto:{tipo:'corso',id}})",
    soggettoA)
  await valuta(page, 'id=>prova.aggiorna({filtroCorsoAgendaId:id})', annoA.corsi[0].id)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, ARRIVA, ['C:/esempio/B.regi', annoB])
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.postoCorrente()')).toEqual({ pagina: 'pagina.oggi' })
  expect(await valuta(page, 'prova.stato.vista')).toBe('oggi')
  expect(await valuta(page, 'prova.stato.corsoId')).toBeNull()
  expect(await valuta(page, 'prova.stato.filtroCorsoAgendaId')).toBeNull()
  // La fila è vuota: Alt+← non riporta nelle pagine dell'anno A.
  await valuta(page, 'document.activeElement && document.activeElement.blur()')
  await page.keyboard.press('Alt+ArrowLeft')
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.postoCorrente()')).toEqual({ pagina: 'pagina.oggi' })
  await valuta(page, ARRIVA, ['C:/esempio/A.regi', annoA])
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, 'prova.postoCorrente()')).toEqual({
    pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: soggettoA },
  })
  expect(await valuta(page, 'prova.stato.vista')).toBe('piani')
  expect(await valuta(page, 'prova.stato.corsoId')).toBe(soggettoA)
  expect(await valuta(page, 'prova.stato.filtroCorsoAgendaId')).toBe(annoA.corsi[0].id)

  // Nessun corso e corso senza lezioni non lasciano una vista incoerente.
  await valuta(page, "()=>{prova.vai({pagina:'pagina.corso.registro'}); " +
    'prova.stato.registro.lezioni=[]; prova.scegliCorso(prova.stato.registro.corsi[0].id)}')
  expect(await valuta(page, 'prova.stato.vista')).toBe('piani')
  await valuta(page,
    "prova.vai({pagina:'pagina.calendario'},{altro:{registro:prova.registroVuoto()}})")
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible()
  expect(errori).toEqual([])
  console.log('OK: pagine, contesto, memoria per documento, comandi e filtri di calendario e ' +
    'pendenze, scheda della proiezione, tendine corso/classe (anche quando il filtro punta a ' +
    'un corso sparito), sezione docente, file recenti, tastiera, azioni nascoste, responsive, ' +
    'casella di ricerca dei modelli che regge i ridisegni, registro vuoto; nessun errore JS')
})
