// La Dashboard: la giornata in una schermata, a tessere che portano altrove.
//
// Qui si prova che:
//
// - al primo avvio, senza uno stato ricordato, il registro si apre sulla Dashboard,
//   prima voce dell'agenda nella barra laterale;
// - la pagina non ha comandi nella riga delle azioni (ADR-07: si guarda e si va);
// - le quattro tessere dicono gli stessi numeri delle pagine a cui portano, e
//   ognuna porta alla sua: ore → Calendario (su oggi), da compilare → l'ora che
//   aspetta, pendenze → Pendenze, da smistare → Da smistare;
// - la scheda statistiche mostra gli indicatori di avanzamento, piani, presenze e valutazioni;
// - i due box «Oggi» e «La prossima giornata» mostrano le rispettive lezioni in ordine;
// - le ore di oggi stanno in ordine, con la loro fase, e quella in corso è accesa;
//   un clic apre l'ora;
// - un'ora aperta da qui porta al Registro con l'ora per soggetto, e il
//   contesto la segue: il suo corso e il filtro sulla sua classe;
// - le quattro statistiche portano alle loro pagine (piani, assenze, valutazioni);
// - il minuto che passa rifà solo le ore di oggi e le tessere: la fase «in
//   corso» si spegne senza ridisegnare la pagina;
// - le prossime valutazioni partono da oggi e un clic apre la prova;
// - i compleanni di oggi compaiono solo se ce n'è;
// - la voce «Pendenze» della barra laterale porta il suo conto.
//
// L'orologio della pagina è fermo su martedì 15 settembre 2026 alle 9:30
// (`page.clock`): le fasi delle ore dipendono dall'ora, e una prova che passa al
// mattino e cade la sera non prova niente.
//
// Le fotografie vanno in `dist-tests/schermate/`, o nella cartella di `SCATTI`.

import { expect, test, type Page } from '@playwright/test'

import { FRAME, pannello, schermata, valuta, valutaTutti } from './banco'

// Quattro ore martedì 15: alle 8:20 finita senza appello, alle 9:30 in corso,
// alle 10:15 da fare, e una annullata. Più due prove (oggi e giovedì) e un
// compleanno. Le ore copiano quella che il ponte di prova mette il 14, con
// tutti i campi.
const GIORNATA = `()=>{
  const r = structuredClone(prova.stato.registro)
  const [c0, c1] = r.corsi
  const modello = r.lezioni[0]
  const ora = (id, corsoId, inizio, fine, stato = 'pianificata') => ({
    ...structuredClone(modello), id, corsoId, data: '2026-09-15', stato,
    slot: [{ id: id + '-s', inizio, fine, tipo: 'lezione' }],
  })
  r.lezioni.push(
    ora('oggi-3', c0.id, '10:15', '11:00'),
    ora('oggi-1', c0.id, '08:20', '09:05'),
    ora('oggi-2', c1.id, '09:10', '09:55'),
    ora('oggi-4', c1.id, '13:30', '14:15', 'annullata'),
  )
  const prova_ = (id, titolo, data, corsoId) => ({
    id, corsoId, lezioneId: null, pianoId: null, titolo, tipo: 'scritto', data, peso: 1,
    scala: { min: 1, max: 6, sufficienza: 4, passo: 0.25 }, descrizione: '', voti: [], allegati: [],
  })
  r.valutazioni.push(
    prova_('v-passata', 'Prova vecchia', '2026-09-10', c0.id),
    prova_('v-giovedi', 'Frazioni', '2026-09-17', c1.id),
    prova_('v-oggi', 'Equazioni', '2026-09-15', c0.id),
  )
  r.classi[0].allievi[0].dataNascita = '2010-09-15'
  prova.aggiorna({ registro: r })
}`

async function apriOggi (page: Page): Promise<void> {
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.oggi'))")
  await valuta(page, FRAME)
  await expect(page.locator('.vista--oggi')).toHaveCount(1)
}

test('oggi', async ({ browser }) => {
  for (const schema of ['light', 'dark'] as const) {
    const { page, errori } = await pannello(browser, {
      larghezza: 1400,
      colorScheme: schema,
      prima: async (page) => { await page.clock.setFixedTime('2026-09-15T09:30:00') },
    })

    // Senza uno stato ricordato si comincia dalla Dashboard, prima voce dell'agenda.
    expect(await valuta(page, 'prova.stato.vista')).toBe('oggi')
    expect(await valuta(page, "prova.PAGINE.filter(p=>p.gruppo==='agenda')[0].id"))
      .toBe('pagina.oggi')
    const laterale = page.locator('#navigazione-laterale')
    await expect(laterale.getByRole('button', { name: 'Dashboard', exact: true }))
      .toHaveAttribute('aria-current', 'page')

    await valuta(page, GIORNATA)
    await valuta(page, FRAME)
    const vista = page.locator('.vista--oggi')
    await expect(vista.locator('.testata__titolo')).toHaveText('Dashboard')
    await expect(vista.locator('.testata__sottotitolo')).toContainText('martedì 15 settembre 2026')
    // La Dashboard espone solo il Periodo: niente anno fermo, corso o classe.
    const periodo = page.locator('[data-fuoco="barra-comandi-periodo"]')
    await expect(periodo).toHaveCount(1)
    await expect(page.locator('.barra-comandi__scelta--ferma')).toHaveCount(0)
    // Niente riga delle azioni: la pagina porta altrove, non fa.
    await expect(page.locator('#azioni-pagina')).toHaveCount(0)
    await schermata(page, `oggi-${schema}.png`, { fullPage: true })

    // Le tessere: quattro, ognuna con la sua destinazione.
    const tessere = vista.locator('.oggi-tessera')
    await expect(tessere).toHaveCount(4)
    expect(await valutaTutti(tessere, 'ts => ts.map(t => t.dataset.pagina)')).toEqual([
      'pagina.calendario', 'pagina.corso.registro', 'pagina.pendenze', 'pagina.daSmistare',
    ])
    // Le ore vive sono tre: l'annullata si vede ma non si conta.
    await expect(tessere.nth(0).locator('.oggi-tessera__valore')).toHaveText('3')
    await expect(tessere.nth(0).locator('.oggi-tessera__nota')).toHaveText('In corso fino alle 09:55')
    // I numeri sono quelli delle pagine di destinazione: la tessera delle pendenze
    // e la pastiglia della barra laterale dicono lo stesso, non zero.
    const pendenze = await tessere.nth(2).locator('.oggi-tessera__valore').innerText()
    expect(Number.parseInt(pendenze, 10)).toBeGreaterThan(0)
    const vocePendenze = laterale.getByRole('button', { name: 'Pendenze', exact: true })
    await expect(vocePendenze).toContainText(pendenze)

    // Le statistiche didattiche del periodo sono presenti e interattive.
    const statTessere = vista.locator('.oggi-statistica-tessera')
    await expect(statTessere).toHaveCount(4)

    // Due box di giornate: oggi e la prossima giornata
    const schedaOggi = vista.locator('.oggi-scheda--oggi')
    const schedaProssima = vista.locator('.oggi-scheda--prossima')
    await expect(schedaOggi.locator('.scheda__titolo')).toHaveText('Le lezioni di oggi')
    await expect(schedaProssima.locator('.scheda__titolo'))
      .toHaveText('Le lezioni della prossima giornata')

    // Le ore, in ordine, con la loro fase; quella in corso è accesa.
    const ore = vista.locator('.oggi-ora')
    await expect(ore).toHaveCount(4)
    expect(await valutaTutti(ore, 'os => os.map(o => o.dataset.lezione)'))
      .toEqual(['oggi-1', 'oggi-2', 'oggi-3', 'oggi-4'])
    await expect(ore.nth(0).locator('.pastiglia')).toHaveText('Da chiudere')
    await expect(ore.nth(1).locator('.pastiglia')).toHaveText('In corso')
    await expect(ore.nth(3).locator('.pastiglia')).toHaveText('Annullata')
    await expect(vista.locator('.oggi-ora--evidenza')).toHaveCount(1)
    expect(await vista.locator('.oggi-ora--evidenza').getAttribute('data-lezione')).toBe('oggi-2')

    // Le prove da oggi in poi, dalla più vicina; quella della settimana scorsa no.
    await expect(vista.locator('.oggi-prova__titolo')).toHaveText(['Equazioni', 'Frazioni'])
    await expect(vista.locator('.oggi-compleanno')).toHaveCount(1)

    // Ogni tessera porta alla sua pagina.
    await tessere.nth(2).click()
    expect(await valuta(page, 'prova.stato.vista')).toBe('todo')
    await expect(vocePendenze).toHaveAttribute('aria-current', 'page')
    await apriOggi(page)
    await tessere.nth(3).click()
    expect(await valuta(page, 'prova.stato.vista')).toBe('daSmistare')
    await apriOggi(page)
    await valuta(page, "prova.aggiorna({ data: '2027-03-01' })")
    await tessere.nth(0).click()
    expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')
    await expect(periodo).toHaveCount(1)
    await expect(page.locator('.barra-comandi__scelta--ferma')).toHaveCount(1)
    expect(await valuta(page, 'prova.stato.data'), 'il calendario non si è portato su oggi')
      .toBe('2026-09-15')
    await apriOggi(page)
    // «Da compilare» apre l'ora che aspetta da più tempo (quella del 14), come il
    // comando «Ora da compilare».
    await tessere.nth(1).press('Enter')
    expect(await valuta(page, 'prova.stato.vista')).toBe('lezione')
    const attesa = await valuta<string[]>(page,
      "prova.stato.registro.lezioni.filter(l=>l.data==='2026-09-14').map(l=>l.id)")
    expect(attesa).toContain(await valuta(page, 'prova.stato.lezioneId'))

    // Un'ora si apre con un clic, una prova anche.
    await apriOggi(page)
    await ore.nth(2).click()
    expect(await valuta(page, '[prova.stato.vista, prova.stato.lezioneId]'))
      .toEqual(['lezione', 'oggi-3'])
    await apriOggi(page)
    await vista.locator('.oggi-prova').nth(1).click()
    expect(await valuta(page, '[prova.stato.vista, prova.stato.valutazioneId]'))
      .toEqual(['valutazioni', 'v-giovedi'])

    // L'ora di un altro corso: il Registro si apre su di lei, e il contesto
    // (corso di lavoro, filtro per classe) passa al suo corso.
    await valuta(page, 'prova.scegliCorso(prova.stato.registro.corsi[0].id)')
    await apriOggi(page)
    await ore.nth(1).click()
    const posto = await valuta(page, 'prova.postoCorrente()')
    expect(posto).toEqual({
      pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'oggi-2' },
    })
    const corso = await valuta<string>(page,
      "prova.stato.registro.lezioni.find(l=>l.id==='oggi-2').corsoId")
    expect(corso).toBe(await valuta(page, 'prova.stato.registro.corsi[1].id'))
    expect(await valuta(page, '[prova.stato.contesto.corsoId, prova.stato.corsoId]'))
      .toEqual([corso, corso])
    const classe = await valuta(page, 'c=>prova.stato.registro.corsi.find(x=>x.id===c).classeId',
      corso)
    expect(await valuta(page, 'prova.stato.filtroClasseId')).toBe(classe)
    expect(await valuta(page, '[prova.stato.lezioneId, prova.stato.data]'))
      .toEqual(['oggi-2', '2026-09-15'])

    // Le statistiche portano alle pagine che esistono, non a nomi sbagliati.
    for (const [chiave, pagina] of [['piani', 'pagina.corso.piani'],
      ['presenze', 'pagina.classe.assenze'],
      ['valutazioni', 'pagina.corso.valutazioni']]) {
      await apriOggi(page)
      await vista.locator(`[data-fuoco="oggi-stat-${chiave}"]`).click()
      expect(await valuta(page, 'prova.postoCorrente().pagina'), chiave).toBe(pagina)
    }

    // Il minuto che passa: alle 9:56 l'ora delle 9:10 non è più in corso e si
    // accende la prossima. Solo le isole dell'ora si rifanno: la pagina è la stessa.
    await apriOggi(page)
    await valuta(page, "()=>{window.__vistaOggi=document.querySelector('.vista--oggi');" +
      "window.__statistiche=document.querySelector('.oggi-scheda--statistiche')}")
    await page.clock.setFixedTime('2026-09-15T09:56:00')
    await valuta(page, "window.dispatchEvent(new Event('focus'))")
    await valuta(page, FRAME)
    await expect(ore.nth(1).locator('.pastiglia')).not.toHaveText('In corso')
    expect(await vista.locator('.oggi-ora--evidenza').getAttribute('data-lezione')).toBe('oggi-3')
    await expect(tessere.nth(0).locator('.oggi-tessera__nota')).toHaveText('La prossima alle 10:15')
    expect(await valuta(page, "document.querySelector('.vista--oggi')===window.__vistaOggi"),
      'la pagina si è rifatta').toBeTruthy()
    expect(await valuta(page,
      "document.querySelector('.oggi-scheda--statistiche')===window.__statistiche")).toBeTruthy()
    await page.clock.setFixedTime('2026-09-15T09:30:00')
    await valuta(page, "window.dispatchEvent(new Event('focus'))")

    // Senza ore oggi, la Dashboard anticipa la prossima giornata di lezione.
    await valuta(page, `()=>{
          const r = structuredClone(prova.stato.registro)
          r.classi[0].allievi[0].dataNascita = null
          r.lezioni = r.lezioni.filter(l => l.data < '2026-09-15')
          const modello = r.lezioni[0]
          r.lezioni.push({...modello, id: 'prossima-giornata', corsoId: r.corsi[0].id,
            data: '2026-09-17', stato: 'pianificata'})
          prova.aggiorna({ registro: r })
        }`)
    await apriOggi(page)
    await expect(vista.locator('.testata__sottotitolo')).toContainText(
      'Prossima giornata di lezione: giovedì 17 settembre 2026')
    await expect(vista.locator('.oggi-scheda--prossima .scheda__titolo')).toHaveText(
      'Le lezioni della prossima giornata')
    await expect(vista.locator('[data-lezione="prossima-giornata"]')).toHaveCount(1)

    // Stretta: una colonna, e nessuno scorrimento di lato.
    await page.setViewportSize({ width: 700, height: 1000 })
    await valuta(page, FRAME)
    expect(await valuta(page, 'document.documentElement.scrollWidth <= innerWidth')).toBeTruthy()

    expect(errori).toEqual([])
    await page.close()
  }
})
