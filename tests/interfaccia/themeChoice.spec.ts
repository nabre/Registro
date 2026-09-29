// Il tema si sceglie guardandolo: tre schede con la miniatura del registro.
//
// Impostazioni › Programma › Aspetto. Il tema era una tendina con tre frasi;
// adesso sono tre schede, ognuna con il registro disegnato nel suo tema, e si
// sceglie con un clic o con le frecce come un gruppo di pulsanti radio. Qui si
// prova che:
//
// - le schede sono tre, in un `radiogroup` che si chiama come l'impostazione, e
//   una sola porta `aria-checked="true"`;
// - il clic e le frecce mandano la stessa richiesta della tendina
//   (`programma.salva` nel pannello, `scrivi` nella finestra nativa);
// - la miniatura «chiaro» resta chiara quando l'applicazione è scura, e la
//   «scuro» resta scura quando è chiara: la miniatura mostra il tema che
//   sceglie, non quello che c'è;
// - «Sistema» dice che cosa sta seguendo adesso, quando è la scelta attiva;
// - la fascia delle sezioni sta a 16px dal contenuto, non a 28.
//
// Le fotografie vanno in `dist-tests/schermate/`, o nella cartella di `SCATTI`.

import { spawnSync } from 'node:child_process'

import { expect, test, type Browser } from '@playwright/test'

import { FRAME, RADICE, pannello, schermata, valuta, valutaSu } from './banco'

const etichetta = process.env.ETICHETTA ?? 'dopo'
// Solo le fotografie, senza asserzioni: per fermare il «prima» di un cambio.
const soloScatti = process.env.SOLO_SCATTI === '1'

const CHIAVE = 'registroDocenti.aspetto.tema'

// La voce come la manda `vociImpostazioni()`: le scelte sono quelle del
// manifesto, lette dal bundle delle prove invece che ricopiate.
let scelte: unknown

test.beforeAll(() => {
  const esito = spawnSync('node', ['--input-type=module', '-e',
    "const { IMPOSTAZIONI } = await import('./dist-tests/manifest.mjs');" +
    `process.stdout.write(JSON.stringify(IMPOSTAZIONI['${CHIAVE}'].scelte))`,
  ], { cwd: RADICE, encoding: 'utf-8' })
  if (esito.status !== 0) throw new Error(`il manifesto non si legge: ${esito.stderr}`)
  scelte = JSON.parse(esito.stdout)
})

function voce (valore = 'sistema') {
  return {
    chiave: CHIAVE, tipo: 'string', etichetta: 'Tema', descrizione: 'Chiaro o scuro.',
    formato: null, scelte, minimo: null, massimo: null,
    predefinito: 'sistema', valore, scritta: valore !== 'sistema',
    bloccata: null, dipendeDa: null, sospesa: false, avanzata: false,
  }
}

const FONDO = "(el)=>getComputedStyle(el.querySelector('.figura-tema')).backgroundColor"

type Schema = 'light' | 'dark'

async function aspetto (browser: Browser, schema: Schema) {
  const pronta = await pannello(browser, { larghezza: 1280, altezza: 900, colorScheme: schema })
  await valuta(pronta.page,
    "(v)=>prova.vai({pagina:'pagina.impostazioni',scheda:'programma.aspetto'}," +
    '{altro:{programma:[v]}})', voce())
  await valuta(pronta.page, FRAME)
  return pronta
}

async function provaPannello (browser: Browser, schema: Schema): Promise<void> {
  const { page, errori } = await aspetto(browser, schema)
  await schermata(page.locator('.voce-opzione').first(), `pannello-${schema}-${etichetta}.png`)
  await schermata(page, `pagina-${schema}-${etichetta}.png`)
  if (soloScatti) return

  // La fascia delle sezioni: il `gap` della vista e basta. Si confronta con quel
  // che la vista dichiara: si guarda che non si aggiunga niente sopra.
  const [distanza, passo] = await valuta<[number, number]>(page, `()=>{
      const f=document.querySelector('.impostazioni__fascia')
      return [f.nextElementSibling.getBoundingClientRect().top - f.getBoundingClientRect().bottom,
              parseFloat(getComputedStyle(f.parentElement).rowGap)]}`)
  expect(Math.abs(distanza - passo),
    `fascia a ${distanza}px dal contenuto, il passo è ${passo}px`).toBeLessThan(0.5)

  const gruppo = page.getByRole('radiogroup', { name: 'Tema' })
  await expect(gruppo).toHaveCount(1)
  const schede = gruppo.getByRole('radio')
  await expect(schede).toHaveCount(3)
  await expect(gruppo.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1)
  await expect(gruppo.getByRole('radio', { name: 'Sistema' }))
    .toHaveAttribute('aria-checked', 'true')
  // Le altre scelte restano tendine: la voce senza figura non cambia.
  await expect(page.locator('select[name="registroDocenti.aspetto.tema"]')).toHaveCount(0)

  // Ogni miniatura nel suo tema, qualunque sia quello dell'applicazione.
  const chiaro = gruppo.getByRole('radio', { name: 'Chiaro' })
  let scuro = gruppo.getByRole('radio', { name: 'Scuro' })
  expect(await valutaSu(chiaro, FONDO)).toBe('rgb(250, 250, 250)')
  expect(await valutaSu(scuro, FONDO)).toBe('rgb(20, 20, 22)')
  // L'aiuto del manifesto sta sotto la miniatura, senza il nome ripetuto.
  await expect(chiaro).toContainText('È quello che si legge meglio proiettato.')
  // «Sistema», scelto, dice che cosa sta seguendo.
  const atteso = schema === 'dark' ? 'adesso: scuro, come Windows' : 'adesso: chiaro, come Windows'
  await expect(gruppo.getByRole('radio', { name: 'Sistema' })).toContainText(atteso)

  // Il clic chiede lo stesso salvataggio della tendina.
  await scuro.click()
  await valuta(page, FRAME)
  expect(await valuta(page,
    `richieste.some(m=>m.azione?.tipo==='programma.salva' && m.azione.chiave==='${CHIAVE}'` +
    " && m.azione.valore==='scuro')")).toBeTruthy()
  await expect(scuro).toHaveAttribute('aria-checked', 'true')
  await expect(scuro).toBeFocused()

  // Il ridisegno che arriva con lo stato nuovo lascia il fuoco dov'era.
  await valuta(page, '(v)=>prova.aggiorna({programma:[v]})', voce('scuro'))
  await valuta(page, FRAME)
  scuro = page.getByRole('radiogroup', { name: 'Tema' }).getByRole('radio', { name: 'Scuro' })
  await expect(scuro).toBeFocused()
  await expect(scuro).toHaveAttribute('tabindex', '0')

  // Le frecce: a sinistra torna a «Chiaro», e da «Sistema» si gira in fondo.
  await page.keyboard.press('ArrowLeft')
  expect(await valuta(page,
    "richieste.some(m=>m.azione?.tipo==='programma.salva' && m.azione.valore==='chiaro')"))
    .toBeTruthy()
  await expect(page.getByRole('radio', { name: 'Chiaro' })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('radio', { name: 'Scuro' })).toHaveAttribute('aria-checked', 'true')
  expect(errori).toEqual([])
}

async function provaNativa (browser: Browser, schema: Schema): Promise<void> {
  const { page, errori } = await pannello(browser, {
    larghezza: 760,
    altezza: 700,
    colorScheme: schema,
    bundle: 'native-settings',
    html: '<html lang="it"><body><header><h1 id="titolo">Impostazioni</h1>' +
      '<input id="cerca" type="text"></header>' +
      '<div id="rimando"><button id="apri-pannello" type="button">Apri</button></div>' +
      '<main id="radice"></main></body></html>',
  })
  await valuta(page,
    "(v)=>window.dispatchEvent(new MessageEvent('message',{data:{impostazioni:'schema'," +
    "titolo:'Impostazioni',voci:[v]}}))", voce())
  await valuta(page, FRAME)
  await schermata(page.locator('.voce').first(), `nativa-${schema}-${etichetta}.png`)
  if (soloScatti) return

  const gruppo = page.getByRole('radiogroup', { name: 'Tema' })
  await expect(gruppo.getByRole('radio')).toHaveCount(3)
  await expect(gruppo.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1)
  const chiaro = gruppo.getByRole('radio', { name: 'Chiaro' })
  const scuro = gruppo.getByRole('radio', { name: 'Scuro' })
  expect(await valutaSu(chiaro, FONDO)).toBe('rgb(250, 250, 250)')
  expect(await valutaSu(scuro, FONDO)).toBe('rgb(20, 20, 22)')
  await scuro.click()
  expect(await valuta(page,
    `richieste.some(m=>m.impostazioni==='scrivi' && m.chiave==='${CHIAVE}' && m.valore==='scuro')`,
  )).toBeTruthy()
  await expect(scuro).toBeFocused()
  await page.keyboard.press('ArrowRight')
  expect(await valuta(page, "richieste.some(m=>m.impostazioni==='scrivi' && m.valore==='sistema')"))
    .toBeTruthy()
  // Il valore che torna dal main process rimette le schede d'accordo.
  await valuta(page,
    "(v)=>window.dispatchEvent(new MessageEvent('message',{data:{impostazioni:'valori',voci:[v]}}))",
    voce('chiaro'))
  await expect(chiaro).toHaveAttribute('aria-checked', 'true')
  await expect(gruppo.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1)
  expect(errori).toEqual([])
}

test('tema a schede con miniature, nel pannello e nella finestra nativa', async ({ browser }) => {
  for (const schema of ['light', 'dark'] as const) {
    await provaPannello(browser, schema)
    await provaNativa(browser, schema)
  }
})
