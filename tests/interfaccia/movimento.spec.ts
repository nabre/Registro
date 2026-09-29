// Il movimento fra le pagine: indietro e avanti, Ctrl+1…9, l'entrata.
//
// Che cosa difende, e da che cosa.
//
// - **Indietro e avanti** (`ui/history.ts`): Alt+← torna alla pagina di prima
//   *con lo scorrimento di prima*, Alt+→ rifà il passo; i due tasti laterali del
//   mouse fanno lo stesso. Il ripristino vale solo per questi due gesti: aprire
//   una pagina in ogni altro modo la mostra dall'alto (`scroll.spec.ts`), e questa
//   prova lo ricontrolla dopo un giro nella fila. Un passo nella fila non mette
//   in fila niente: tornare indietro due volte deve arrivare due pagine indietro,
//   non rimbalzare fra le ultime due.
// - **Ctrl+cifra** (`ui/shortcuts.ts`): la seconda voce della barra laterale si
//   apre con Ctrl+2, anche dal tasto fisico del tastierino; la quinta con Ctrl+5.
// - **L'entrata** (`ui/main.ts`, `styles/motion.css`): `data-entrata` c'è nel
//   disegno in cui la pagina cambia e non in quello di un `aggiorna` qualunque
//   dopo — che è il giro dell'orologio. Se restasse, la pagina lampeggerebbe a
//   ogni minuto.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, attendi, pannello, valuta, valutaSu } from './banco'

test('movimento', async ({ browser }) => {
  // Bassa apposta, come in `scroll.spec.ts`: la Guida deve scorrere.
  const { page, errori } = await pannello(browser, { larghezza: 1280, altezza: 600 })

  const contenuto = page.locator('main.contenuto')

  const fotogramma = async () => { await valuta(page, FOTOGRAMMA) }

  const vista = async () => await valuta<string>(page, 'prova.stato.vista')

  const scorrimento = async () => await valutaSu<number>(contenuto, '(el) => el.scrollTop')

  const fuoriDaiCampi = async () => {
    // Le frecce con Alt dentro un campo sono di chi scrive: il fuoco va
    // lasciato sul corpo della pagina, come dopo un clic su una riga.
    await valuta(page, 'document.activeElement && document.activeElement.blur()')
  }

  // Tre pagine di fila: il calendario, la Guida scorsa a metà, le Impostazioni.
  await valuta(page, "prova.vai({pagina:'pagina.calendario'})")
  await fotogramma()
  await valuta(page, "prova.vai({pagina:'pagina.guida'})")
  await fotogramma()
  await valutaSu(contenuto, '(el) => el.scrollTop = 400')
  const scorsa = await scorrimento()
  expect(scorsa > 0, 'la Guida non scorre: la prova non direbbe niente').toBeTruthy()
  await valuta(page, "prova.vai({pagina:'pagina.impostazioni'})")
  await fotogramma()
  expect(await scorrimento(), 'aprire una pagina deve mostrarla dall’alto').toBe(0)

  // Alt+←: la Guida, al punto a cui era arrivata.
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowLeft')
  await fotogramma()
  expect(await vista(), 'Alt+← doveva tornare alla Guida').toBe('guida')
  expect(await scorrimento(), 'tornando indietro la Guida è ripartita dall’alto').toBe(scorsa)

  // Ancora Alt+←: il calendario. Il passo di prima non si è messo in fila.
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowLeft')
  await fotogramma()
  expect(await vista(), 'due passi indietro dovevano arrivare al calendario').toBe('calendario')

  // Alt+→ due volte: la Guida, ancora scorsa, e poi le Impostazioni.
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowRight')
  await fotogramma()
  expect(await vista(), 'Alt+→ doveva tornare alla Guida').toBe('guida')
  expect(await scorrimento(), 'andando avanti la Guida è ripartita dall’alto').toBe(scorsa)
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowRight')
  await fotogramma()
  expect(await vista(), 'Alt+→ doveva arrivare alle Impostazioni').toBe('impostazioni')
  // In fondo alla fila Alt+→ non fa niente.
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowRight')
  await fotogramma()
  expect(await vista()).toBe('impostazioni')

  // I tasti laterali del mouse: il quarto indietro, il quinto avanti.
  await valuta(page, "document.body.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}))")
  await fotogramma()
  expect(await vista(), 'il tasto «indietro» del mouse doveva tornare alla Guida').toBe('guida')
  await valuta(page, "document.body.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}))")
  await fotogramma()
  expect(await vista(), 'il tasto «avanti» del mouse doveva tornare alle Impostazioni')
    .toBe('impostazioni')

  // Da un posto raggiunto con «indietro», una pagina nuova taglia via quel che
  // stava avanti: Alt+→ non riporta più alle Impostazioni.
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowLeft')
  await fotogramma()
  await valuta(page, "prova.vai({pagina:'pagina.corsi'})")
  await fotogramma()
  expect(await scorrimento(), 'una pagina aperta a mano ha ereditato uno scorrimento').toBe(0)
  await fuoriDaiCampi()
  await page.keyboard.press('Alt+ArrowRight')
  await fotogramma()
  expect(await vista(), 'dopo una pagina nuova non c’è più niente «avanti»').toBe('corsi')

  // La fila ricorda il posto intero: il piano aperto e l'ambito del check.
  // Due piani dello stesso corso sono due posti; il check della classe e
  // quello del corso anche.
  await valuta(page, `() => {
      const r = prova.stato.registro
      const corso = r.corsi[0]
      const piano = (id) => ({ id, corsoId: corso.id, obiettivi: [id], prerequisiti: '', attivita: [],
        risorse: [], note: '', tag: [], creatoIl: '2026-09-01T08:00:00.000Z',
        aggiornatoIl: '2026-09-01T08:00:00.000Z' })
      prova.aggiorna({ registro: { ...r, piani: [piano('piano-p'), piano('piano-q')] } })
    }`)
  await valuta(page, "prova.vai({pagina:'pagina.corso.piani', soggetto:{tipo:'piano', id:'piano-p'}})")
  await fotogramma()
  await valuta(page, "prova.vai({pagina:'pagina.corso.piani', soggetto:{tipo:'piano', id:'piano-q'}})")
  await fotogramma()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.check'))")
  await fotogramma()
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.check'))")
  await fotogramma()
  const passi: [string, string | null, string | null][] = [
    ['check', 'classe', null], ['piani', null, 'piano-q'], ['piani', null, 'piano-p'],
  ]
  for (const [vistaOra, ambito, piano] of passi) {
    await fuoriDaiCampi()
    await page.keyboard.press('Alt+ArrowLeft')
    await fotogramma()
    expect(await vista(), `Alt+← doveva tornare a ${vistaOra}`).toBe(vistaOra)
    if (ambito) {
      expect(await valuta(page, 'prova.stato.ambitoCheck'), 'Alt+← ha perso l’ambito del check')
        .toBe(ambito)
    } else {
      expect(await valuta(page, 'prova.stato.pianoId'), `Alt+← doveva riaprire ${piano}`).toBe(piano)
    }
  }
  await valuta(page, "prova.vai({pagina:'pagina.corsi'})")
  await fotogramma()

  // Dentro un campo di testo Alt+← è di chi scrive.
  const campo = page.locator('input[type="text"], input:not([type]), textarea').first()
  if (await campo.count()) {
    await campo.focus()
    await page.keyboard.press('Alt+ArrowLeft')
    await fotogramma()
    expect(await vista(), 'Alt+← dentro un campo ha portato via la pagina').toBe('corsi')
  }

  // Ctrl+cifra: le voci come si vedono nella barra laterale, gruppo dopo gruppo,
  // non l'ordine di `PAGINE`. Ctrl+5 le separa: la quinta visibile è la prima del
  // registro, la quinta di `PAGINE` è dell'anno.
  const VISIBILI = 'prova.gruppiDiPagine().flatMap(g=>g.pagine)'
  expect(
    await valuta(page, `${VISIBILI}[4].id`),
    'la prova non distingue più i due ordini: sceglierne un altro',
  ).not.toBe(await valuta(page, 'prova.PAGINE[4].id'))
  await fuoriDaiCampi()
  const tasti: [string, number][] = [
    ['Control+2', 1], ['Control+1', 0], ['Control+5', 4], ['Control+Numpad2', 1],
  ]
  for (const [tasto, posto] of tasti) {
    const attesa = await valuta(page, `${VISIBILI}[${posto}].id`)
    await page.keyboard.press(tasto)
    await fotogramma()
    expect(
      await valuta(page, `${VISIBILI}[${posto}].attiva()`),
      `${tasto} non ha aperto ${String(attesa)}`,
    ).toBeTruthy()
  }

  // L'entrata c'è nel disegno del cambio di pagina, non in un aggiornamento
  // arrivato dopo.
  await valuta(page, "prova.vai({pagina:'pagina.guida'})")
  await fotogramma()
  expect(await contenuto.getAttribute('data-entrata'), 'cambiando pagina manca data-entrata')
    .not.toBeNull()
  const vistaCorrente = page.locator('main.contenuto > .vista')
  let animazione = await valutaSu<string>(vistaCorrente, '(el) => getComputedStyle(el).animationName')
  expect(animazione, 'la vista non si anima entrando').toBe('entrata-pagina')
  // Finita l'entrata (160 ms), un ridisegno non la rifà.
  await attendi(page, "document.querySelector('main.contenuto > .vista').getAnimations().length === 0")
  await valuta(page, 'prova.ridisegna()')
  await fotogramma()
  expect(await contenuto.getAttribute('data-entrata'), 'data-entrata resta anche senza cambio di pagina')
    .toBeNull()
  // Ferma, la vista non ha trasformazioni: i menu `position: fixed` là dentro la
  // prenderebbero come riferimento.
  expect(await valutaSu(vistaCorrente, '(el) => getComputedStyle(el).transform')).toBe('none')

  // Chi ha chiesto meno movimento: l'attributo può esserci, l'animazione no.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await valuta(page, "prova.vai({pagina:'pagina.impostazioni'})")
  await fotogramma()
  animazione = await valutaSu<string>(vistaCorrente, '(el) => getComputedStyle(el).animationName')
  expect(animazione, 'con «riduci movimento» la pagina si anima lo stesso').toBe('none')

  expect(errori, 'errori JS').toEqual([])
})
