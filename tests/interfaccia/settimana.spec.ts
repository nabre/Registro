// Allineamenti della vista Settimana, misurati col righello del browser.
//
// La settimana è una griglia divisa in due — la testata dei giorni ferma, il
// corpo che scorre — e le due metà devono combaciare al pixel: se il bordo di
// «VEN» non cade sul bordo della colonna del venerdì, la testata dice il giorno
// sbagliato. Qui si misura con `getBoundingClientRect`, a tre larghezze e con la
// barra laterale aperta e compatta, perché i guasti di questo genere compaiono
// solo a certe misure.

import { expect, test, type Browser } from '@playwright/test'

import { FRAME as dueFrame, attendi, pannello, schermata, valuta, valutaSu } from './banco'

const TOLLERANZA = 1

interface Ora {
  testo: string
  prima: boolean
  ultima: boolean
  alto: number
  basso: number
  riga: number
}

interface Misura {
  colonne: [number, number][]
  ore: Ora[]
  corpo: { alto: number, basso: number }
  blocco: { alto: number, inizio: string } | null
  striscia: { sinistra: number, fila: [number, number], accesa: [number, number] | null }
}

// Tutto in una chiamata dentro la pagina: niente ridisegni fra una misura e
// l'altra.
const MISURA = `() => {
  const r = (e) => e.getBoundingClientRect()
  const q = (s) => [...document.querySelectorAll(s)]
  const testa = q('.settimana__intestazione > *')
  const corpo = q('.settimana__corpo > *')
  const corpoR = r(document.querySelector('.settimana__corpo'))
  const ore = q('.settimana__ora')
  const righe = [...q('.settimana__colonna')[0].querySelectorAll('.settimana__riga-ora')]
  const settimana = r(document.querySelector('.settimana'))
  const striscia = document.querySelector('.striscia-settimane')
  const fila = document.querySelector('.striscia-settimane__voci')
  const accesa = document.querySelector('.striscia-settimane__voce--corrente')
  const blocco = document.querySelector('.settimana__colonna .blocco')
  return {
    colonne: testa.map((t, i) => [r(t).left - r(corpo[i]).left, r(t).right - r(corpo[i]).right]),
    ore: ore.map((o, i) => ({
      testo: o.textContent,
      prima: o.classList.contains('settimana__ora--prima'),
      ultima: o.classList.contains('settimana__ora--ultima'),
      alto: r(o).top, basso: r(o).bottom, riga: r(righe[i]).top,
    })),
    corpo: { alto: corpoR.top, basso: corpoR.bottom },
    blocco: blocco && { alto: r(blocco).top, inizio: blocco.querySelector('.blocco__ora').textContent },
    striscia: {
      sinistra: r(striscia.querySelector('.striscia-settimane__testata')).left - settimana.left,
      fila: [r(fila).left, r(fila).right],
      accesa: accesa && [r(accesa).left, r(accesa).right],
    },
  }
}`

function controlla (m: Misura, dove: unknown): void {
  const d = JSON.stringify(dove)
  m.colonne.forEach(([sx, dx], i) => {
    expect(Math.abs(sx) <= TOLLERANZA && Math.abs(dx) <= TOLLERANZA,
      `${d} colonna ${i} ${sx} ${dx}`).toBeTruthy()
  })
  const righe = Object.fromEntries(m.ore.map((o) => [o.testo, o.riga]))
  for (const o of m.ore) {
    // Ogni etichetta sta tutta dentro il corpo: fuori la taglia il bordo.
    expect(o.alto >= m.corpo.alto - TOLLERANZA,
      `${d} ora tagliata sopra ${JSON.stringify(o)}`).toBeTruthy()
    expect(o.basso <= m.corpo.basso + TOLLERANZA,
      `${d} ora tagliata sotto ${JSON.stringify(o)}`).toBeTruthy()
    // E dice la riga su cui sta: a cavallo in mezzo, appoggiata sui bordi.
    if (o.prima) {
      expect(Math.abs(o.alto - o.riga) <= TOLLERANZA, `${d} ${JSON.stringify(o)}`).toBeTruthy()
    } else if (o.ultima) {
      expect(Math.abs(o.basso - o.riga) <= TOLLERANZA, `${d} ${JSON.stringify(o)}`).toBeTruthy()
    } else {
      expect(Math.abs((o.alto + o.basso) / 2 - o.riga) <= TOLLERANZA,
        `${d} ${JSON.stringify(o)}`).toBeTruthy()
    }
  }
  // La lezione delle 08:20 comincia a un terzo fra la riga delle 8 e quella delle 9.
  expect(m.blocco && m.blocco.inizio === '08:20', `${d} ${JSON.stringify(m.blocco)}`).toBeTruthy()
  const atteso = righe['08:00'] + (righe['09:00'] - righe['08:00']) / 3
  expect(Math.abs(m.blocco!.alto - atteso) <= TOLLERANZA,
    `${d} blocco ${m.blocco!.alto} ${atteso}`).toBeTruthy()
  // La striscia ha il suo margine dentro il riquadro, e la settimana aperta si vede.
  expect(m.striscia.sinistra >= 4,
    `${d} striscia a filo del bordo ${JSON.stringify(m.striscia)}`).toBeTruthy()
  const [sx, dx] = m.striscia.fila
  const [aSx, aDx] = m.striscia.accesa!
  expect(aSx >= sx - TOLLERANZA && aDx <= dx + TOLLERANZA,
    `${d} settimana accesa fuori vista ${JSON.stringify(m.striscia)}`).toBeTruthy()
}

// ------------------------------------------------------------ riconfigurazioni
//
// La fascia oraria ferma, la striscia che si ripiega, sabato e domenica dalla
// barra, «Oggi» che porta anche all'ora di adesso.

const ORE = `() => {
  const corpo = document.querySelector('.settimana__corpo').getBoundingClientRect()
  return [...document.querySelectorAll('.settimana__ora')]
    .map((o) => [o.textContent, Math.round(o.getBoundingClientRect().top - corpo.top)])
}`

const MISURA_COLONNE = `() => {
  const r = (e) => e.getBoundingClientRect()
  const testa = [...document.querySelectorAll('.settimana__intestazione > *')]
  const corpo = [...document.querySelectorAll('.settimana__corpo > *')]
  return testa.map((t, i) => [r(t).left - r(corpo[i]).left, r(t).right - r(corpo[i]).right])
}`

function controllaColonne (colonne: [number, number][], dove: string): void {
  colonne.forEach(([sx, dx], i) => {
    expect(Math.abs(sx) <= TOLLERANZA && Math.abs(dx) <= TOLLERANZA,
      `${dove} colonna ${i} ${sx} ${dx}`).toBeTruthy()
  })
}

async function apri (browser: Browser, altezza = 1000) {
  // Il ponte tiene da parte `setState` in `ricordato`: che cosa il pannello
  // ricorderebbe.
  const { page, errori } = await pannello(browser, { larghezza: 1440, altezza })
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  await valuta(page, "prova.aggiorna({modoCalendario:'settimana', data:'2026-09-14'})")
  await valuta(page, dueFrame)
  return { page, errori }
}

test('settimana', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  // Settembre, e maggio con la settimana accesa in fondo alla striscia: resta
  // visibile anche su finestra stretta.
  for (const data of ['2026-09-14', '2027-05-10']) {
    await valuta(page, `prova.aggiorna({modoCalendario:'settimana', data:'${data}'})`)
    if (data !== '2026-09-14') {
      // Anche maggio ha la sua lezione delle 08:20, così le misure sono le stesse.
      await valuta(page, `()=>{const r=structuredClone(prova.stato.registro);
              const l=structuredClone(r.lezioni[0]); l.id='prova-maggio'; l.data='${data}';
              r.lezioni.push(l); prova.aggiorna({registro:r})}`)
    }
    for (const larghezza of [1440, 1100, 900]) {
      for (const barra of ['aperta', 'compatta']) {
        await page.setViewportSize({ width: larghezza, height: 1000 })
        await valuta(page, dueFrame)
        const larga = await valuta<number>(page,
          "document.querySelector('#navigazione-laterale').getBoundingClientRect().width")
        if ((barra === 'compatta') !== (larga < 120)) {
          await page.locator('[data-fuoco="apri-navigazione"]').first().click()
        }
        await valuta(page, dueFrame)
        controlla(await valuta<Misura>(page, MISURA), [data, larghezza, barra])
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await valuta(page, "prova.aggiorna({data:'2026-09-14'})")
  await valuta(page, dueFrame)
  await schermata(page, 'settimana.png')
  expect(errori).toEqual([])
})

// Le ore della giornata vengono dalle Impostazioni: stesse ore, stessa altezza, ogni settimana.
test('fascia_fissa', async ({ browser }) => {
  const { page, errori } = await apri(browser)
  const piena = await valuta<[string, number][]>(page, ORE)
  await valuta(page, "prova.aggiorna({data:'2026-09-21'})")
  await valuta(page, dueFrame)
  const vuota = await valuta<[string, number][]>(page, ORE)
  expect(vuota, 'la fascia cambia con le lezioni').toEqual(piena)
  // 07:30–18:00 di serie: la griglia va dalle 7 alle 18, a ore piene.
  expect(piena[0][0] === '07:00' && piena.at(-1)![0] === '18:00',
    JSON.stringify(piena)).toBeTruthy()
  // Una lezione fuori fascia allarga la sua settimana, e basta.
  await valuta(page, `()=>{const r=structuredClone(prova.stato.registro);
      const l=structuredClone(r.lezioni[0]); l.id='prova-sera'; l.data='2026-09-29'; l.slot=l.slot.map(x=>({...x, inizio:'19:00', fine:'19:45'}));
      r.lezioni.push(l); prova.aggiorna({registro:r, data:'2026-09-28'})}`)
  await valuta(page, dueFrame)
  const sera = await valuta<[string, number][]>(page, ORE)
  expect(sera.at(-1)![0] >= '20:00',
    `la lezione delle 19 fuori dalla griglia ${JSON.stringify(sera)}`).toBeTruthy()
  const dentro = await valuta<boolean>(page, `()=>{const b=document.querySelector('.settimana__colonna .blocco');
      const c=document.querySelector('.settimana__corpo').getBoundingClientRect(); const r=b.getBoundingClientRect();
      return r.top>=c.top-1 && r.bottom<=c.bottom+1}`)
  expect(dentro, 'il blocco delle 19 sta fuori dal corpo').toBeTruthy()
  await valuta(page, "prova.aggiorna({data:'2026-10-05'})")
  await valuta(page, dueFrame)
  expect(await valuta(page, ORE), 'la settimana dopo resta allargata').toEqual(piena)
  expect(errori).toEqual([])
  await page.close()
})

// La striscia delle settimane si chiude in una riga, e se lo ricorda.
test('striscia_ripiegabile', async ({ browser }) => {
  const { page, errori } = await apri(browser)
  let pulsante = page.locator('.striscia-settimane__ripiega')
  await expect(pulsante).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.striscia-settimane__voci')).toBeVisible()
  const aperta = await valuta<number>(page,
    "document.querySelector('.striscia-settimane').getBoundingClientRect().height")
  await schermata(page, 'striscia-aperta.png')
  await pulsante.click()
  await valuta(page, dueFrame)
  pulsante = page.locator('.striscia-settimane__ripiega')
  await expect(pulsante).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.striscia-settimane__voci')).toHaveCount(0)
  // Il titolo resta: chiusa è una riga, non un vuoto.
  await expect(page.locator('.striscia-settimane__testata')).toContainText('Settimane dell')
  const chiusa = await valuta<number>(page,
    "document.querySelector('.striscia-settimane').getBoundingClientRect().height")
  expect(chiusa < aperta * 0.6 && chiusa < 34, `${aperta} ${chiusa}`).toBeTruthy()
  expect(await valuta(page, 'window.ricordato && window.ricordato.globali.strisciaSettimaneChiusa'))
    .toBe(true)
  await schermata(page, 'striscia-chiusa.png')
  // Chiusa, la testata dei giorni combacia ancora col corpo.
  controllaColonne(await valuta<[number, number][]>(page, MISURA_COLONNE), 'striscia chiusa')
  await pulsante.click()
  await valuta(page, dueFrame)
  await expect(page.locator('.striscia-settimane__ripiega')).toHaveAttribute('aria-expanded', 'true')
  expect(await valuta(page, 'window.ricordato.globali.strisciaSettimaneChiusa')).toBe(false)
  expect(errori).toEqual([])
  await page.close()
})

// «Modifica» arma la griglia: il clic sceglie, sul vuoto si disegna, Esc esce.
//
// «Sab/Dom» non sta più nella barra: sabato e domenica si accendono dai
// «Giorni mostrati» delle Impostazioni. «Nuova ora» compare solo in modifica,
// accanto a lei, come i comandi del calendario ICS.
test('modifica', async ({ browser }) => {
  const { page, errori } = await apri(browser)
  const nuova = '[data-fuoco="comando-registro.nuovaLezione"]'
  expect(await page.locator('[data-fuoco="comando-calendario.finesettimana"]').count()).toBe(0)
  expect(await page.locator(nuova).count()).toBe(0)
  const interruttore = page.locator('[data-fuoco="comando-calendario.editor"]')
  await expect(interruttore).toHaveAttribute('aria-pressed', 'false')
  await interruttore.click()
  await valuta(page, dueFrame)
  expect(await valuta(page, 'prova.stato.editorCalendario')).toBe(true)
  await expect(page.locator('.vista--calendario-editor')).toHaveCount(1)
  await expect(page.locator(nuova)).toBeVisible()
  await expect(page.locator('[data-fuoco="comando-calendario.editor"]'))
    .toHaveAttribute('aria-pressed', 'true')

  // Due ore alla stessa ora, una per classe: la settimana non le affianca (un
  // docente non sta in due aule) e le sovrapposizioni si segnalano. Il filtro
  // del corso ne lascia una, e serve anche più sotto.
  const corso = await valuta<string>(page, 'prova.stato.registro.lezioni[0].corsoId')
  await valuta(page, `prova.aggiorna({filtroCorsoAgendaId:'${corso}'})`)
  await valuta(page, dueFrame)
  await expect(page.locator('.settimana__colonna .blocco')).toHaveCount(1)

  // Il clic su un'ora la sceglie e non la apre; le maniglie ci sono.
  const blocco = page.locator('.settimana__colonna .blocco').first()
  await blocco.click()
  expect(await valuta(page, 'prova.stato.vista')).toBe('calendario')
  await expect(blocco).toHaveClass(/blocco--scelto/)
  expect(await blocco.locator('.blocco__maniglia').count()).toBe(2)
  await schermata(page, 'editor-scelta.png')

  // Sul vuoto dell'ultima colonna, dalle 15 per un'ora e mezza: due UD con
  // un'azione sola. Col filtro del corso nasce subito; senza, si apre il modulo
  // compilato.
  const fascia = await valuta<{ x: number, alto: number, h: number }>(page, `()=>{const c=[...document.querySelectorAll('.settimana__colonna')].at(-1);
      const r=c.getBoundingClientRect(); return {x:r.left+r.width/2, alto:r.top, h:r.height}}`)
  const perMinuto = fascia.h / (11 * 60) // 07:00–18:00
  const y = fascia.alto + (15 * 60 - 7 * 60) * perMinuto
  await valuta(page, 'richieste.length = 0')
  await page.mouse.move(fascia.x, y)
  await page.mouse.down()
  await page.mouse.move(fascia.x, y + 40 * perMinuto, { steps: 4 })
  await page.mouse.move(fascia.x, y + 90 * perMinuto, { steps: 4 })
  await valuta(page, dueFrame)
  await expect(page.locator('.settimana__bozza')).toBeVisible()
  await page.mouse.up()
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'lezione.salva')")
  const salvate = await valuta<{ inizio: string, fine: string }[][]>(page,
    "richieste.filter(m => m.azione?.tipo === 'lezione.salva').map(m => m.azione.lezione.slot)")
  expect(salvate.length, JSON.stringify(salvate)).toBe(1)
  expect(salvate[0].length, JSON.stringify(salvate[0])).toBe(1)
  const [slot] = salvate[0]
  expect(slot.inizio === '15:00' && slot.fine === '16:30', JSON.stringify(slot)).toBeTruthy()
  expect(await page.locator('.settimana__bozza').count()).toBe(0)

  // Esc lascia la scelta, il secondo esce dalla modifica.
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await valuta(page, dueFrame)
  expect(await valuta(page, 'prova.stato.editorCalendario')).toBe(false)
  expect(await page.locator('.vista--calendario-editor').count()).toBe(0)
  expect(await page.locator(nuova).count()).toBe(0)
  expect(errori).toEqual([])
  await page.close()
})

// «Oggi» porta alla settimana di oggi e all'ora di adesso; il resto ricorda lo scorrimento.
test('oggi_all_ora', async ({ browser }) => {
  const { page, errori } = await apri(browser, 560)
  await valuta(page, `()=>{const r=structuredClone(prova.stato.registro);
      r.impostazioni.giorniVisibili=[1,2,3,4,5,6,7]; prova.aggiorna({registro:r, adessoOra:'16:30'})}`)
  await valuta(page, dueFrame)
  const scorre = page.locator('.settimana__scorrevole')
  expect(await valutaSu(scorre, '(e) => e.scrollHeight > e.clientHeight + 100'),
    'il corpo non scorre: la prova non prova niente').toBeTruthy()
  await valutaSu(scorre, '(e) => { e.scrollTop = 0 }')
  await page.locator('[data-fuoco="comando-registro.oggi"]').click()
  await valuta(page, dueFrame)
  await valuta(page, dueFrame)
  expect(await valuta(page, 'prova.stato.data')).toBe(await valuta(page, 'prova.stato.adessoData'))
  const dove = await valuta<{ riga: number, alto: number, basso: number }>(page, `()=>{const a=document.querySelector('.settimana__adesso').getBoundingClientRect();
      const s=document.querySelector('.settimana__scorrevole').getBoundingClientRect();
      return {riga:a.top, alto:s.top, basso:s.bottom}}`)
  expect(dove.alto + 24 <= dove.riga && dove.riga <= dove.basso - 8,
    `la riga di adesso fuori vista ${JSON.stringify(dove)}`).toBeTruthy()
  // Avanti: lo scorrimento resta quello di prima, non torna su adesso.
  await valutaSu(page.locator('.settimana__scorrevole'), '(e) => { e.scrollTop = 40 }')
  await page.locator('[data-fuoco="comando-calendario.avanti"]').click()
  await valuta(page, dueFrame)
  await valuta(page, dueFrame)
  expect(await valutaSu(page.locator('.settimana__scorrevole'), '(e) => e.scrollTop')).toBe(40)
  // Un ridisegno qualunque, idem.
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, dueFrame)
  await valuta(page, dueFrame)
  expect(await valutaSu(page.locator('.settimana__scorrevole'), '(e) => e.scrollTop')).toBe(40)
  expect(errori).toEqual([])
  await page.close()
})
