// Impostazioni: le quattro aree in testata (relazioni ARIA, roving tabindex,
// tastiera APG), l'indice delle sezioni che segue e salta senza ridisegnare,
// gli indirizzi per voce — anche quelli di prima delle aree — e la stessa
// ricerca nel filtro e in Ctrl+K.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, FRAME, pannello, valuta } from './banco'

/** Una voce del programma come la manda `vociImpostazioni()`: il tema. */
const TEMA = {
  chiave: 'registroDocenti.aspetto.tema', tipo: 'string', etichetta: 'Tema', descrizione: 'Chiaro o scuro.',
  formato: null, scelte: null, minimo: null, massimo: null,
  predefinito: 'sistema', valore: 'sistema', scritta: false,
  bloccata: null, dipendeDa: null, sospesa: false, avanzata: false,
}

async function vaiA (page: Page, scheda: string): Promise<void> {
  await valuta(page, '(s)=>prova.vai({pagina:"pagina.impostazioni",scheda:s})', scheda)
  await valuta(page, FRAME)
}

test('impostazioni tastiera', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await vaiA(page, 'calendario')

  const aree = page.locator('.impostazioni__aree[role="tablist"]')
  await expect(aree).toHaveCount(1)
  const schede = aree.getByRole('tab')
  await expect(schede).toHaveCount(4)
  await expect(aree.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)
  await expect(aree.locator('[role="tab"][tabindex="0"]')).toHaveCount(1)
  await expect(aree.locator('[role="tab"][tabindex="-1"]')).toHaveCount(3)

  const riquadro = page.getByRole('tabpanel')
  const attiva = aree.locator('[role="tab"][aria-selected="true"]')
  expect(await attiva.getAttribute('aria-controls')).toBe(await riquadro.getAttribute('id'))
  expect(await riquadro.getAttribute('aria-labelledby')).toBe(await attiva.getAttribute('id'))

  // Attivazione automatica. Il ridisegno conserva il fuoco sulla nuova scheda.
  await attiva.focus()
  await page.keyboard.press('ArrowRight')
  await valuta(page, FOTOGRAMMA)
  const nuova = page.locator('.impostazioni__aree [role="tab"][aria-selected="true"]')
  await expect(nuova).toBeFocused()
  await expect(nuova).toHaveAttribute('tabindex', '0')
  await expect(nuova).toHaveAttribute('id', 'impostazioni-area-didattica')

  await page.keyboard.press('End')
  await valuta(page, FOTOGRAMMA)
  await expect(schede.last()).toBeFocused()
  await page.keyboard.press('Home')
  await valuta(page, FOTOGRAMMA)
  await expect(schede.first()).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await valuta(page, FOTOGRAMMA)
  await expect(schede.last()).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await valuta(page, FOTOGRAMMA)
  await expect(schede.nth(-2)).toBeFocused()

  expect(errori).toEqual([])
})

test('impostazioni indice e indirizzi', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await vaiA(page, 'utente')

  // L'indice: una voce per sezione, una sola accesa.
  const indice = page.getByRole('navigation', { name: 'Sezioni dell’area' })
  const voci = indice.locator('.impostazioni__indice-voce')
  await expect(voci).toHaveText(['Chi sei', 'Carta e stampa', 'Account', 'Posta'])
  await expect(indice.locator('[aria-current="location"]')).toHaveCount(1)

  // Un clic salta senza ridisegnare: la sezione di prima è ancora lo stesso nodo.
  await valuta(page, '()=>{window.sezioneDiPrima=document.getElementById("impostazioni-sezione-chiSei")}')
  await voci.filter({ hasText: 'Posta' }).click()
  await valuta(page, FRAME)
  await expect(indice.locator('[aria-current="location"]')).toHaveText('Posta')
  expect(await valuta(page,
    '()=>window.sezioneDiPrima===document.getElementById("impostazioni-sezione-chiSei")')).toBe(true)
  await expect(page.locator('#impostazioni-sezione-posta')).toBeInViewport()

  // Un indirizzo di prima delle aree arriva nell'area e sulla sezione di adesso.
  await vaiA(page, 'programma.modelli')
  await expect(page.locator('.impostazioni__aree [aria-selected="true"]'))
    .toHaveAttribute('id', 'impostazioni-area-programma')
  await expect(page.locator('#impostazioni-sezione-modelli')).toBeInViewport()
  await vaiA(page, 'documento.calendario')
  await expect(page.locator('.impostazioni__aree [aria-selected="true"]'))
    .toHaveAttribute('id', 'impostazioni-area-calendario')
  await expect(page.locator('#impostazioni-sezione-giornata')).toBeInViewport()

  // Ogni sezione porta la sua pastiglia d'ambito, o una per blocco se ne mescola due.
  await expect(page.locator('#impostazioni-sezione-giornata .ambito--anno').first()).toBeVisible()

  expect(errori).toEqual([])
})

test('impostazioni ricerca e arrivo su una voce', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, '(v)=>prova.vai({pagina:"pagina.oggi"},{altro:{programma:[v]}})', TEMA)
  await valuta(page, FRAME)

  // Ctrl+K trova «tema», che prima non trovava, e porta alla riga accesa.
  await page.locator('body').press('Control+k')
  await page.locator('.palette__campo').fill('tema')
  const riga = page.locator('.palette__voce').filter({ hasText: 'Tema' }).first()
  await expect(riga).toBeVisible()
  await page.keyboard.press('Enter')
  await valuta(page, FRAME)
  await valuta(page, FRAME)
  const voce = page.locator('[data-voce="registroDocenti.aspetto.tema"]')
  await expect(voce).toBeInViewport()
  await expect(voce).toHaveClass(/impostazioni--lampo/)
  expect(await valuta(page,
    '()=>document.querySelector(\'[data-voce="registroDocenti.aspetto.tema"]\').contains(document.activeElement)'))
    .toBe(true)

  // Una vista sola: niente modo da scegliere, niente chiave scritta sulla riga.
  await expect(page.getByRole('radiogroup', { name: 'Quanto mostrare' })).toHaveCount(0)
  await expect(voce).not.toContainText('registroDocenti.aspetto.tema')
  // Niente deciso a mano: «Ripristina» dell'area non c'è.
  await expect(page.locator('.impostazioni__strumenti button')).toHaveCount(0)

  // Il filtro della pagina cerca nelle due aree: la voce del computer e la sezione dell'anno.
  const campo = page.getByRole('searchbox', { name: 'Cerca fra le impostazioni' })
  await campo.fill('pause')
  await valuta(page, FRAME)
  await expect(page.locator('.risultato-impostazioni').filter({ hasText: 'Giornata' })).toHaveCount(1)
  await campo.fill('tema')
  await valuta(page, FRAME)
  await expect(page.locator('.risultato-impostazioni__voce [data-voce="registroDocenti.aspetto.tema"]'))
    .toHaveCount(1)

  expect(errori).toEqual([])
})

test('impostazioni: «Ripristina» per area, solo per le voci degli elenchi', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  // Il tema deciso a mano conta; il modello dell'assistente, scelto nella sua
  // riga d'uso, e il mittente, del collegamento, no.
  const scritte = [
    { ...TEMA, valore: 'scuro', scritta: true },
    { ...TEMA, chiave: 'registroDocenti.assistente.modello', etichetta: 'Modello', valore: 'q.gguf', scritta: true },
    { ...TEMA, chiave: 'registroDocenti.posta.mittente', etichetta: 'Mittente', valore: 'a@b.ch', scritta: true, delCollegamento: true },
  ]
  await valuta(page,
    '(v)=>prova.vai({pagina:"pagina.impostazioni",scheda:"programma"},{altro:{programma:v}})', scritte)
  await valuta(page, FRAME)
  // Il nome accessibile è il suo perché (`titolo`); il testo dice quante.
  const ripristina = page.locator('.impostazioni__strumenti button')
  await expect(ripristina).toHaveText('Ripristina (1)')
  await page.getByRole('tab', { name: /Utente/ }).click()
  await valuta(page, FRAME)
  await expect(ripristina).toHaveCount(0)

  expect(errori).toEqual([])
})


// ------------------------------------------------------------ i controlli

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

const DIMENSIONE = voce('registroDocenti.prova.dimensione', {
  etichetta: 'Dimensione', controllo: 'segmenti', predefinito: 'piccola', valore: 'piccola',
  scelte: [
    { valore: 'piccola', aiuto: 'Piccola: sta dappertutto.' },
    { valore: 'media', aiuto: 'Media: la via di mezzo.' },
    { valore: 'grande', aiuto: 'Grande: si legge da lontano.' },
  ],
})
const ACCESO = voce('registroDocenti.prova.acceso', {
  etichetta: 'Acceso di prova', tipo: 'boolean', predefinito: true, valore: true,
})
const FIGLIA = voce('registroDocenti.prova.figlia', {
  etichetta: 'Figlia di prova', tipo: 'boolean', predefinito: true, valore: true,
  dipendeDa: 'registroDocenti.prova.acceso', sospesa: true,
})
const MINUTI = voce('registroDocenti.prova.minuti', {
  etichetta: 'Minuti', tipo: 'number', predefinito: 5, valore: 5, passo: 1, minimo: 0, massimo: 60,
  unita: 'min',
})
const ALTEZZA = voce('registroDocenti.prova.altezza', {
  etichetta: 'Altezza', tipo: 'number', predefinito: 20, valore: 20, passo: 1, minimo: 6, massimo: 40,
  unita: 'mm', controllo: 'cursore',
})
const CONTROLLI = [DIMENSIONE, ACCESO, FIGLIA, MINUTI, ALTEZZA]

/** L'ultima `programma.salva` mandata per una chiave, col valore. */
const SALVATA = (chiave: string, valore: unknown): string =>
  `richieste.some(m=>m.azione?.tipo==='programma.salva' && m.azione.chiave===${JSON.stringify(chiave)}` +
  ` && m.azione.valore===${JSON.stringify(valore)})`

test('impostazioni: segmentato, interruttore, numero e cursore nel pannello', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page,
    '(v)=>prova.vai({pagina:"pagina.impostazioni",scheda:"programma#aspetto"},{altro:{programma:v}})',
    CONTROLLI)
  await valuta(page, FRAME)

  // Il segmentato: un gruppo radio col nome della voce, una sola fermata del Tab.
  const gruppo = page.getByRole('radiogroup', { name: 'Dimensione' })
  await expect(gruppo.getByRole('radio')).toHaveCount(3)
  await expect(gruppo.locator('[role="radio"][tabindex="0"]')).toHaveCount(1)
  await gruppo.getByRole('radio', { name: 'Piccola' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(gruppo.getByRole('radio', { name: 'Media' })).toBeFocused()
  await expect(gruppo.getByRole('radio', { name: 'Media' })).toHaveAttribute('aria-checked', 'true')
  expect(await valuta(page, SALVATA('registroDocenti.prova.dimensione', 'media'))).toBeTruthy()
  // La frase della scelta sotto il gruppo.
  await expect(page.locator('[data-chiave="registroDocenti.prova.dimensione"] .controllo__descrizione'))
    .toHaveText('La via di mezzo.')
  await page.keyboard.press('End')
  await expect(gruppo.getByRole('radio', { name: 'Grande' })).toBeFocused()
  // Lo stato nuovo ridisegna la pagina e il fuoco resta dov'era.
  await valuta(page, '(v)=>prova.aggiorna({programma:v})',
    [{ ...DIMENSIONE, valore: 'grande', scritta: true }, ACCESO, FIGLIA, MINUTI, ALTEZZA])
  await valuta(page, FRAME)
  await expect(gruppo.getByRole('radio', { name: 'Grande' })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(gruppo.getByRole('radio', { name: 'Piccola' })).toHaveAttribute('aria-checked', 'true')

  // L'interruttore si chiama come la voce, mai «Acceso»; dopo il salvataggio lo dice.
  const interruttore = page.getByRole('switch', { name: 'Acceso di prova' })
  await expect(interruttore).toHaveAttribute('aria-checked', 'true')
  await interruttore.click()
  expect(await valuta(page, SALVATA('registroDocenti.prova.acceso', false))).toBeTruthy()
  await expect(page.locator('[data-chiave="registroDocenti.prova.acceso"] .controllo__esito'))
    .toHaveText('Salvato')
  // La figlia sospesa: rientrata, spenta, non si preme.
  const figlia = page.getByRole('switch', { name: 'Figlia di prova' })
  await expect(figlia).toBeDisabled()
  await expect(figlia).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('[data-voce="registroDocenti.prova.figlia"]')).toHaveClass(/voce-opzione--figlia/)

  // Il numero con l'unità scritta accanto, intero.
  const minuti = page.getByRole('spinbutton', { name: 'Minuti' })
  await expect(minuti).toHaveAttribute('step', '1')
  await expect(page.locator('[data-chiave="registroDocenti.prova.minuti"] .controllo-numero__unita'))
    .toHaveText('min')
  await minuti.fill('12')
  await minuti.press('Tab')
  expect(await valuta(page, SALVATA('registroDocenti.prova.minuti', 12))).toBeTruthy()

  // Il cursore si dice con l'unità.
  const altezza = page.getByRole('slider', { name: 'Altezza' })
  await expect(altezza).toHaveAttribute('aria-valuetext', '20 mm')
  await altezza.focus()
  await page.keyboard.press('ArrowRight')
  await expect(altezza).toHaveAttribute('aria-valuetext', '21 mm')

  expect(errori).toEqual([])
})

const NATIVA = '<html lang="it"><body><header><h1 id="titolo">Impostazioni</h1>' +
  '<input id="cerca" type="text"></header>' +
  '<div id="rimando"><button id="apri-pannello" type="button">Apri</button></div>' +
  '<main id="radice"></main></body></html>'

const RECAPITI = voce('registroDocenti.recapiti.posta', {
  etichetta: 'Mail', controllo: 'segmenti', predefinito: 'sistema', valore: 'sistema',
  scelte: [
    { valore: 'sistema', aiuto: 'Sistema: il programma predefinito.' },
    { valore: 'outlook', aiuto: 'Outlook: anche se non è il predefinito.' },
    { valore: 'nessuno', aiuto: 'Nessuno: gli indirizzi si copiano.' },
  ],
})
const VASSOIO = voce('registroDocenti.vassoio.attivo', {
  etichetta: 'Icona accanto all’orologio', tipo: 'boolean', predefinito: true, valore: true,
  alProssimoAvvio: true,
})

/** Un messaggio del main process alla finestra nativa. */
async function annuncia (page: Page, messaggio: unknown): Promise<void> {
  await valuta(page, "(m)=>window.dispatchEvent(new MessageEvent('message',{data:m}))", messaggio)
}

test('impostazioni: la finestra nativa, scialuppa con gli stessi controlli', async ({ browser }) => {
  const { page, errori } = await pannello(browser, {
    larghezza: 760, altezza: 900, bundle: 'native-settings', html: NATIVA,
  })
  await annuncia(page, { impostazioni: 'schema', titolo: 'Impostazioni', voci: [VASSOIO, RECAPITI] })
  await valuta(page, FRAME)

  // Le aree con i nomi del pannello; quelle dell'anno dicono di aprirne uno.
  await expect(page.locator('h2')).toHaveText(['Calendario', 'Didattica', 'Utente', 'Programma'])
  await expect(page.locator('.area--dell-anno .area__senza-anno')).toHaveCount(2)
  await expect(page.locator('.area__senza-anno').first()).toContainText('apri un anno')
  await expect(page.locator('h3')).toHaveText(['Posta', 'Avvio e promemoria'])
  // Vale dal prossimo avvio: lo dice accanto al nome. Niente chiave, niente «Ritira».
  const vassoio = page.locator('.voce').filter({ has: page.getByRole('switch', { name: 'Icona accanto all’orologio' }) })
  await expect(vassoio).toContainText('al prossimo avvio')
  await expect(vassoio).not.toContainText('registroDocenti.vassoio.attivo')

  // Il segmentato con le frecce manda `scrivi`; un rifiuto si legge sotto, e il
  // controllo torna com'era.
  const gruppo = page.getByRole('radiogroup', { name: 'Mail' })
  await gruppo.getByRole('radio', { name: 'Sistema' }).focus()
  await page.keyboard.press('ArrowRight')
  expect(await valuta(page,
    "richieste.some(m=>m.impostazioni==='scrivi' && m.chiave==='registroDocenti.recapiti.posta'" +
    " && m.valore==='outlook')")).toBeTruthy()
  await annuncia(page, { impostazioni: 'rifiuto', chiave: 'registroDocenti.recapiti.posta', motivo: 'Non ammesso.' })
  await expect(page.locator('[data-chiave="registroDocenti.recapiti.posta"] .controllo__esito'))
    .toHaveText('Non ammesso.')
  await expect(gruppo.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true')

  // L'interruttore ha il nome della voce; i `valori` che seguono dicono
  // «Salvato» e lo rimettono d'accordo, col fuoco dov'era.
  const interruttore = page.getByRole('switch', { name: 'Icona accanto all’orologio' })
  await interruttore.click()
  expect(await valuta(page, "richieste.some(m=>m.impostazioni==='scrivi' && m.valore===false)")).toBeTruthy()
  await annuncia(page, { impostazioni: 'valori', voci: [{ ...VASSOIO, valore: false, scritta: true }, RECAPITI] })
  await expect(page.locator('[data-chiave="registroDocenti.vassoio.attivo"] .controllo__esito'))
    .toHaveText('Salvato')
  await expect(interruttore).toHaveAttribute('aria-checked', 'false')
  await expect(interruttore).toBeFocused()

  expect(errori).toEqual([])
})
