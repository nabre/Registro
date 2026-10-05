// I controlli delle impostazioni (`core/controlli/`, ADR-52), su Chromium: quel
// che provava `tests/ui/controlli.test.mjs` su un DOM finto, dall'esterno.
//
// Nella finestra nativa (`dist-tests/native-settings.js`, montata come in
// `settingsKeyboard.spec.ts`), con voci inventate che finiscono in Programma ›
// Aspetto, la sezione che raccoglie:
//
// - ogni voce prende il disegno che le spetta, letto per ruolo: segmenti,
//   tendina, interruttore, numero, cursore; e ognuna ha la riga dell'esito;
// - il segmentato è un gruppo radio (APG): una fermata del Tab, frecce, Home,
//   Fine, la stessa scelta non si rimanda, la frase di ogni scelta la descrive,
//   sospeso non sceglie;
// - l'interruttore bloccato non si preme, un rifiuto lo rimette com'era;
// - il numero porta l'unità e gli estremi, il vuoto non si manda;
// - il cursore si dice con l'unità mentre si trascina e si salva lasciandolo;
// - la tendina ha i nomi corti e sotto la frase della scelta, che segue.
//
// Nel pannello, i campi del documento (`campo()`) che il manifesto non ha:
// la tendina con «Altro…» e il segmentato multiplo dei giorni.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, FRAME, attendi, pannello, valuta } from './banco'

/**
 * Una voce del programma come la manda `vociImpostazioni()`. Con un prefisso
 * che nessuna sezione nomina finisce in Programma › Aspetto, che raccoglie.
 */
function voce (chiave: string, altro: Record<string, unknown>) {
  return {
    chiave, tipo: 'string', etichetta: chiave, descrizione: '', formato: null, scelte: null,
    minimo: null, massimo: null, passo: null, unita: null, controllo: null,
    scelteDinamiche: null, sceltaLibera: false, predefinito: '', valore: '', scritta: false,
    bloccata: null, nonPronta: null, dipendeDa: null, sospesa: false, avanzata: false,
    delCollegamento: false, ...altro,
  }
}

const breve = (nome: string, frase: string) => ({ valore: nome, aiuto: `${nome}: ${frase}` })

const MODELLO = voce('registroDocenti.prova.modello', {
  etichetta: 'Modello di prova', controllo: 'segmenti', predefinito: 'turbo', valore: 'turbo',
  scelte: [
    breve('turbo', 'il più veloce.'), breve('large', 'poco più preciso di turbo.'),
    breve('medium', 'la via di mezzo.'), breve('small', 'leggero.'), breve('base', 'il più leggero.'),
  ],
})
const SOSPESA = voce('registroDocenti.prova.sospesa', {
  etichetta: 'Scelta sospesa', controllo: 'segmenti', predefinito: 'a', valore: 'a', sospesa: true,
  scelte: [breve('a', 'la prima.'), breve('b', 'la seconda.')],
})
const QUATTRO = voce('registroDocenti.prova.quattro', {
  etichetta: 'Quattro scelte', predefinito: 'A', valore: 'A',
  scelte: ['A', 'B', 'C', 'D'].map((n) => breve(n, `la scelta ${n}.`)),
})
const CINQUE = voce('registroDocenti.prova.cinque', {
  etichetta: 'Cinque scelte', predefinito: 'A', valore: 'A',
  scelte: ['A', 'B', 'C', 'D', 'E'].map((n) => breve(n, `la scelta ${n}.`)),
})
const LUNGHE = voce('registroDocenti.prova.lunghe', {
  etichetta: 'Frasi lunghe', controllo: 'segmenti', predefinito: 'a', valore: 'a',
  scelte: [{ valore: 'a', aiuto: 'Una frase lunga senza nome davanti.' }, breve('b', 'corta.')],
})
const AVVISO = voce('registroDocenti.prova.avviso', {
  etichetta: 'Avviso di prova', controllo: 'tendina', predefinito: '5', valore: '5',
  scelte: [
    { valore: 'nessuno', aiuto: 'Nessun avviso: non manda notifiche.' },
    { valore: '5', aiuto: '5 min prima: il tempo di una rampa di scale.' },
    { valore: '10', aiuto: '10 min prima: con calma.' },
  ],
})
const ACCESO = voce('registroDocenti.prova.acceso', {
  etichetta: 'Acceso di prova', tipo: 'boolean', predefinito: true, valore: true,
})
const BLOCCATO = voce('registroDocenti.prova.bloccato', {
  etichetta: 'Bloccato di prova', tipo: 'boolean', predefinito: false, valore: false,
  bloccata: 'Manca il modello.',
})
const MINUTI = voce('registroDocenti.prova.minuti', {
  etichetta: 'Minuti', tipo: 'number', predefinito: 5, valore: 5, passo: 1, minimo: 0, massimo: 60,
  unita: 'min',
})
const SENZA_ESTREMI = voce('registroDocenti.prova.senzaEstremi', {
  etichetta: 'Cursore senza estremi', tipo: 'number', predefinito: 5, valore: 5, passo: 1, minimo: 0,
  controllo: 'cursore',
})
const ALTEZZA = voce('registroDocenti.prova.altezza', {
  etichetta: 'Altezza', tipo: 'number', predefinito: 20, valore: 20, passo: 1, minimo: 6, massimo: 40,
  unita: 'mm', controllo: 'cursore',
})
const VOCI = [MODELLO, SOSPESA, QUATTRO, CINQUE, LUNGHE, AVVISO, ACCESO, BLOCCATO, MINUTI, SENZA_ESTREMI, ALTEZZA]

const NATIVA = '<html lang="it"><body><header><h1 id="titolo">Impostazioni</h1>' +
  '<input id="cerca" type="text"></header>' +
  '<div id="rimando"><button id="apri-pannello" type="button">Apri</button></div>' +
  '<main id="radice"></main></body></html>'

/** Un messaggio del main process alla finestra nativa. */
async function annuncia (page: Page, messaggio: unknown): Promise<void> {
  await valuta(page, "(m)=>window.dispatchEvent(new MessageEvent('message',{data:m}))", messaggio)
}

/** I valori scritti per una chiave, in ordine. */
async function scritti (page: Page, chiave: string): Promise<unknown[]> {
  return await valuta<unknown[]>(page,
    "(c) => richieste.filter(m => m.impostazioni === 'scrivi' && m.chiave === c).map(m => m.valore)", chiave)
}

async function finestraNativa (page: Page): Promise<void> {
  await annuncia(page, { impostazioni: 'schema', titolo: 'Impostazioni', voci: VOCI })
  await valuta(page, FRAME)
}

async function nativa (browser: Parameters<typeof pannello>[0]) {
  const aperta = await pannello(browser, { larghezza: 900, altezza: 1400, bundle: 'native-settings', html: NATIVA })
  await finestraNativa(aperta.page)
  return aperta
}

test('controlli: ogni voce prende il suo disegno, con la riga dell’esito', async ({ browser }) => {
  const { page, errori } = await nativa(browser)

  await expect(page.getByRole('radiogroup', { name: 'Modello di prova' })).toHaveCount(1)
  await expect(page.getByRole('radiogroup', { name: 'Quattro scelte' })).toHaveCount(1)
  // Cinque scelte senza disegno dichiarato, o una frase intera in un segmento: tendina.
  await expect(page.getByRole('combobox', { name: 'Cinque scelte' })).toHaveCount(1)
  await expect(page.getByRole('combobox', { name: 'Frasi lunghe' })).toHaveCount(1)
  await expect(page.getByRole('combobox', { name: 'Avviso di prova' })).toHaveCount(1)
  await expect(page.getByRole('switch', { name: 'Acceso di prova' })).toHaveCount(1)
  await expect(page.getByRole('spinbutton', { name: 'Minuti' })).toHaveCount(1)
  // Il cursore vuole i due estremi: senza, è un numero.
  await expect(page.getByRole('spinbutton', { name: 'Cursore senza estremi' })).toHaveCount(1)
  await expect(page.getByRole('slider', { name: 'Altezza' })).toHaveCount(1)
  for (const { chiave } of VOCI) {
    await expect(page.locator(`[data-chiave="${chiave}"] .controllo__esito`), chiave).toHaveCount(1)
  }

  expect(errori).toEqual([])
  await page.close()
})

test('controlli: il segmentato è un gruppo radio', async ({ browser }) => {
  const { page, errori } = await nativa(browser)
  const gruppo = page.getByRole('radiogroup', { name: 'Modello di prova' })
  const radio = gruppo.getByRole('radio')
  await expect(radio).toHaveCount(5)
  // Il testo visibile: la frase di ogni scelta sta nascosta dentro il pulsante.
  await expect(radio).toHaveText(['turbo', 'large', 'medium', 'small', 'base'], { useInnerText: true })
  // Una sola fermata del Tab, sulla scelta di adesso.
  await expect(gruppo.locator('[role="radio"][tabindex="0"]')).toHaveCount(1)
  await expect(radio.first()).toHaveAttribute('tabindex', '0')

  // Le frecce scelgono, spostano il fuoco e la fermata, mandano il valore.
  await radio.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(radio.nth(1)).toBeFocused()
  await expect(radio.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(radio.nth(1)).toHaveAttribute('tabindex', '0')
  await expect(radio.first()).toHaveAttribute('tabindex', '-1')
  expect(await scritti(page, MODELLO.chiave)).toEqual(['large'])
  // La frase della scelta sotto il gruppo segue la scelta.
  await expect(page.locator(`[data-chiave="${MODELLO.chiave}"] .controllo__descrizione`))
    .toHaveText('Poco più preciso di turbo.')

  await page.keyboard.press('End')
  await expect(radio.nth(4)).toBeFocused()
  await page.keyboard.press('Home')
  await expect(radio.first()).toBeFocused()
  // Dalla prima, ← gira all'ultima.
  await page.keyboard.press('ArrowLeft')
  await expect(radio.nth(4)).toBeFocused()
  expect(await scritti(page, MODELLO.chiave)).toEqual(['large', 'base', 'turbo', 'base'])
  // La stessa scelta non si rimanda.
  await radio.nth(4).click()
  await valuta(page, FOTOGRAMMA)
  expect(await scritti(page, MODELLO.chiave)).toEqual(['large', 'base', 'turbo', 'base'])

  // La frase di ogni scelta la descrive, nascosta ma nominata.
  await expect(radio.first()).toHaveAccessibleDescription('Il più veloce.')

  // Sospeso: il gruppo è spento e le frecce non scelgono niente.
  const sospeso = page.getByRole('radiogroup', { name: 'Scelta sospesa' })
  await expect(sospeso).toHaveAttribute('aria-disabled', 'true')
  await sospeso.getByRole('radio').first().focus()
  await page.keyboard.press('ArrowRight')
  // `force`: per Playwright una voce `aria-disabled` non è cliccabile, e qui si
  // prova proprio che il clic non fa niente.
  await sospeso.getByRole('radio').last().click({ force: true })
  await valuta(page, FOTOGRAMMA)
  expect(await scritti(page, SOSPESA.chiave)).toEqual([])

  expect(errori).toEqual([])
  await page.close()
})

test('controlli: interruttore bloccato, e il rifiuto che lo rimette com’era', async ({ browser }) => {
  const { page, errori } = await nativa(browser)

  const bloccato = page.getByRole('switch', { name: 'Bloccato di prova' })
  await expect(bloccato).toBeDisabled()
  await bloccato.click({ force: true })
  await valuta(page, FOTOGRAMMA)
  expect(await scritti(page, BLOCCATO.chiave)).toEqual([])

  // Si chiama come la voce, mai «Acceso»; manda il contrario.
  const acceso = page.getByRole('switch', { name: 'Acceso di prova' })
  await expect(acceso).not.toContainText(/Acceso|Spento/)
  await expect(acceso).toHaveAttribute('aria-checked', 'true')
  await acceso.click()
  expect(await scritti(page, ACCESO.chiave)).toEqual([false])
  // L'host dice di no: il motivo sotto il campo, e il controllo torna acceso.
  await annuncia(page, { impostazioni: 'rifiuto', chiave: ACCESO.chiave, motivo: 'Non si può.' })
  const esito = page.locator(`[data-chiave="${ACCESO.chiave}"] .controllo__esito`)
  await expect(esito).toHaveText('Non si può.')
  await expect(esito).toHaveClass(/controllo__esito--rifiuto/)
  await expect(acceso).toHaveAttribute('aria-checked', 'true')

  expect(errori).toEqual([])
  await page.close()
})

test('controlli: numero, cursore e tendina', async ({ browser }) => {
  const { page, errori } = await nativa(browser)

  // Il numero: unità accanto, estremi e passo; il vuoto non si manda.
  const minuti = page.getByRole('spinbutton', { name: 'Minuti' })
  await expect(minuti).toHaveAttribute('min', '0')
  await expect(minuti).toHaveAttribute('max', '60')
  await expect(minuti).toHaveAttribute('step', '1')
  const unita = page.locator(`[data-chiave="${MINUTI.chiave}"] .controllo-numero__unita`)
  await expect(unita).toHaveText('min')
  const idUnita = await unita.getAttribute('id')
  expect(idUnita).toBeTruthy()
  expect((await minuti.getAttribute('aria-describedby'))?.split(' ')).toContain(idUnita)
  await minuti.fill('')
  await minuti.press('Tab')
  await minuti.fill('12')
  await minuti.press('Tab')
  await attendi(page, `richieste.some(m => m.impostazioni === 'scrivi' && m.chiave === '${MINUTI.chiave}')`)
  expect(await scritti(page, MINUTI.chiave)).toEqual([12])

  // Il cursore: mentre si trascina si dice il numero, con l'unità; lasciandolo si salva.
  const altezza = page.getByRole('slider', { name: 'Altezza' })
  await expect(altezza).toHaveAttribute('aria-valuetext', '20 mm')
  await altezza.evaluate((campo: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(campo, '30')
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(altezza).toHaveAttribute('aria-valuetext', '30 mm')
  await expect(page.locator(`[data-chiave="${ALTEZZA.chiave}"] .controllo-cursore__valore`)).toHaveText('30 mm')
  expect(await scritti(page, ALTEZZA.chiave)).toEqual([])
  await altezza.evaluate((campo: HTMLInputElement) => {
    campo.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await attendi(page, `richieste.some(m => m.impostazioni === 'scrivi' && m.chiave === '${ALTEZZA.chiave}')`)
  expect(await scritti(page, ALTEZZA.chiave)).toEqual([30])

  // La tendina: nomi corti nelle opzioni, la frase della scelta sotto, descritta.
  const tendina = page.getByRole('combobox', { name: 'Avviso di prova' })
  await expect(tendina.locator('option')).toHaveText(['Nessun avviso', '5 min prima', '10 min prima'])
  const frase = page.locator(`[data-chiave="${AVVISO.chiave}"] .controllo__descrizione`)
  await expect(frase).toHaveText('Il tempo di una rampa di scale.')
  const idFrase = await frase.getAttribute('id')
  expect((await tendina.getAttribute('aria-describedby'))?.split(' ')).toContain(idFrase)
  await tendina.selectOption({ label: 'Nessun avviso' })
  await attendi(page, `richieste.some(m => m.impostazioni === 'scrivi' && m.chiave === '${AVVISO.chiave}')`)
  expect(await scritti(page, AVVISO.chiave)).toEqual(['nessuno'])
  await expect(frase).toHaveText('Non manda notifiche.')

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------ nel pannello

/** Le impostazioni dell'anno salvate dall'ultimo svuotamento. */
const SALVATE = "() => richieste.filter(m => m.azione?.tipo === 'impostazioni.salva').map(m => m.azione.impostazioni)"

test('campi del documento: la tendina con «Altro…» e i giorni', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  // Senza ore né fasce: cambiare l'UD non chiede conferma. I giorni da lunedì a venerdì.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const impostazioni = { ...r.impostazioni, minutiUd: 45, giorniVisibili: [1, 2, 3, 4, 5] }
    prova.vai({ pagina: 'pagina.impostazioni', scheda: 'documento.calendario' },
      { altro: { registro: { ...r, impostazioni, lezioni: [], corsi: r.corsi.map((c) => ({ ...c, orario: [] })) } } })
  }`)
  await valuta(page, FRAME)
  await valuta(page, 'richieste.length = 0')

  // La tendina dell'UD: le durate usate, e «Altro…» che apre il numero libero.
  const durata = page.getByRole('combobox', { name: 'Durata di un’UD' })
  await expect(durata.locator('option')).toHaveText(['45 min', '50 min', '60 min', '90 min', 'Altro…'])
  await durata.selectOption({ label: '90 min' })
  await attendi(page, `(${SALVATE})().length === 1`)
  expect((await valuta<Array<{ minutiUd: number }>>(page, SALVATE))[0].minutiUd).toBe(90)
  await durata.selectOption({ label: 'Altro…' })
  const libero = page.locator('[data-chiave="minutiUd"]').getByRole('spinbutton')
  await expect(libero).toBeVisible()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, `(${SALVATE})().length`), '«Altro…» da solo non manda niente').toBe(1)
  await libero.fill('55')
  await libero.press('Tab')
  await attendi(page, `(${SALVATE})().length === 2`)
  expect((await valuta<Array<{ minutiUd: number }>>(page, SALVATE))[1].minutiUd).toBe(55)

  // I giorni: pulsanti a due stati; due clic di fila partono dai pulsanti vivi.
  await valuta(page, 'richieste.length = 0')
  const giorni = page.getByRole('group', { name: 'Giorni della settimana' }).getByRole('button')
  await expect(giorni).toHaveCount(7)
  await expect(giorni.nth(0)).toHaveAttribute('aria-pressed', 'true')
  await expect(giorni.nth(5)).toHaveAttribute('aria-pressed', 'false')
  await giorni.nth(5).click()
  await giorni.nth(6).click()
  await attendi(page, `(${SALVATE})().length === 2`)
  const dati = await valuta<Array<{ giorniVisibili: number[] }>>(page, SALVATE)
  expect(dati.map((i) => i.giorniVisibili)).toEqual([[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7]])

  // Le frecce spostano il fuoco senza mandare niente.
  await giorni.nth(0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(giorni.nth(1)).toBeFocused()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, `(${SALVATE})().length`)).toBe(2)

  // L'ultimo acceso non si spegne: lo si dice sotto, e non parte niente.
  await valuta(page, `() => {
    const r = prova.stato.registro
    prova.aggiorna({ registro: { ...r, impostazioni: { ...r.impostazioni, giorniVisibili: [1] } } })
  }`)
  await valuta(page, FRAME)
  await valuta(page, 'richieste.length = 0')
  await expect(giorni.nth(0)).toHaveAttribute('aria-pressed', 'true')
  await giorni.nth(0).click()
  await expect(page.locator('[data-chiave="giorniVisibili"] .controllo__esito'))
    .toHaveText('Almeno un giorno deve restare visibile.')
  await expect(giorni.nth(0)).toHaveAttribute('aria-pressed', 'true')
  expect(await valuta(page, `(${SALVATE})().length`)).toBe(0)

  expect(errori).toEqual([])
  await page.close()
})
