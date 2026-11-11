// Gate WCAG automatico dell'intera shell Regiklass con axe-core locale.
//
// Visita ogni pagina dichiarata dall'app in entrambi gli schemi colore.
// Fallisce solo per violazioni WCAG di impatto `critical` o `serious`; stampa
// regola, pagina e selettori, senza scaricare codice da CDN.

import { expect, test, type Browser, type Page } from '@playwright/test'

import { FRAME, PAGINA_CON_TITOLO, attendi, pannello, valuta } from './banco'

// Da `node_modules`, risolto come un modulo: se manca, la prova cade subito
// dicendo che cosa installare invece di misurare una pagina senza axe.
const AXE = require.resolve('axe-core/axe.min.js')

const CONFIGURAZIONE = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
  resultTypes: ['violations'],
}

interface Violazione {
  id: string
  impact: string | null
  help: string
  nodes: { target: string[] }[]
}

async function prepara (browser: Browser, schema: 'light' | 'dark') {
  // Niente campionamento durante la dissolvenza d'ingresso: axe altrimenti
  // misura il testo semitrasparente a metà animazione e produce falsi contrasti.
  const pronta = await pannello(browser, {
    html: PAGINA_CON_TITOLO, colorScheme: schema, reducedMotion: 'reduce',
  })
  await pronta.page.addScriptTag({ path: AXE })
  return pronta
}

function formato (trovate: Map<string, string[]>): string {
  const righe: string[] = []
  for (const [chiave, occorrenze] of [...trovate].sort(([a], [b]) => a.localeCompare(b))) {
    righe.push(chiave)
    for (const occorrenza of occorrenze.slice(0, 12)) righe.push(`  ${occorrenza}`)
    const rimanenti = occorrenze.length - 12
    if (rimanenti > 0) righe.push(`  … altre ${rimanenti} occorrenze`)
  }
  return righe.join('\n')
}

test('axe-core, tutte le pagine, temi chiaro e scuro', async ({ browser }) => {
  const trovate = new Map<string, string[]>()
  for (const schema of ['light', 'dark'] as const) {
    const { page, errori } = await prepara(browser, schema)
    const pagine = await valuta<string[]>(page, 'prova.PAGINE.map(({id}) => id)')
    for (const pagina of pagine) {
      await valuta(page, `id => {
        const corso = prova.stato.registro.corsi[0]
        if (!prova.stato.corsoId && corso) prova.scegliCorso(corso.id)
        prova.vaiA(prova.PAGINE.find(pagina => pagina.id === id))
      }`, pagina)
      await valuta(page, FRAME)
      await attendi(page, 'document.querySelector("main")?.textContent.length > 0')
      const risultato = await valuta<{ violations: Violazione[] }>(
        page, 'configurazione => axe.run(document, configurazione)', CONFIGURAZIONE)
      for (const violazione of risultato.violations) {
        if (violazione.impact !== 'critical' && violazione.impact !== 'serious') continue
        const chiave = `${violazione.impact}: ${violazione.id} — ${violazione.help}`
        const elenco = trovate.get(chiave) ?? []
        for (const nodo of violazione.nodes) elenco.push(`${schema}/${pagina}: ${nodo.target.join(' ')}`)
        trovate.set(chiave, elenco)
      }
    }
    expect(errori, `errori JavaScript (${schema})`).toEqual([])
    await page.close()
  }
  expect(trovate.size, 'Violazioni WCAG critical/serious:\n' + formato(trovate)).toBe(0)
})

// I controlli delle impostazioni (`core/controlli/`), nel pannello e nella
// finestra nativa: un disegno per tipo, con le voci di prova. Il pannello ne
// mostra solo quelle che arrivano con lo stato; qui arrivano tutti i disegni.

/** Una voce del programma come la manda `vociImpostazioni()`. */
function voce (chiave: string, altro: Record<string, unknown>) {
  return {
    chiave, tipo: 'string', etichetta: chiave, descrizione: 'Una descrizione.', formato: null,
    scelte: null, minimo: null, massimo: null, passo: null, unita: null, controllo: null,
    scelteDinamiche: null, sceltaLibera: false, predefinito: '', valore: '', scritta: false,
    bloccata: null, nonPronta: null, dipendeDa: null, sospesa: false, avanzata: false,
    delCollegamento: false, ...altro,
  }
}

const SCELTE = [
  { valore: 'a', aiuto: 'Prima: la scelta di sempre.' },
  { valore: 'b', aiuto: 'Seconda: quella di riserva.' },
]
const TUTTI_I_CONTROLLI = [
  voce('registroDocenti.aspetto.tema', {
    etichetta: 'Tema', predefinito: 'sistema', valore: 'sistema',
    scelte: [
      { valore: 'sistema', aiuto: 'Sistema: come Windows.' },
      { valore: 'chiaro', aiuto: 'Chiaro: sempre.' },
      { valore: 'scuro', aiuto: 'Scuro: sempre.' },
    ],
  }),
  voce('registroDocenti.prova.segmenti', { etichetta: 'Segmenti', controllo: 'segmenti', scelte: SCELTE, valore: 'a' }),
  voce('registroDocenti.prova.tendina', { etichetta: 'Tendina', controllo: 'tendina', scelte: SCELTE, valore: 'b' }),
  voce('registroDocenti.prova.acceso', {
    etichetta: 'Acceso di prova', tipo: 'boolean', valore: true, alProssimoAvvio: true,
  }),
  voce('registroDocenti.prova.figlia', {
    etichetta: 'Figlia di prova', tipo: 'boolean', valore: true, dipendeDa: 'registroDocenti.prova.acceso',
    sospesa: true,
  }),
  voce('registroDocenti.prova.minuti', {
    etichetta: 'Minuti', tipo: 'number', valore: 5, passo: 1, minimo: 0, massimo: 60, unita: 'min',
  }),
  voce('registroDocenti.prova.altezza', {
    etichetta: 'Altezza', tipo: 'number', valore: 20, passo: 1, minimo: 6, massimo: 40, unita: 'mm',
    controllo: 'cursore',
  }),
  voce('registroDocenti.prova.cartella', { etichetta: 'Cartella', formato: 'cartella', valore: 'C:\\Dati' }),
  voce('registroDocenti.prova.indirizzo', { etichetta: 'Indirizzo', valore: 'http://127.0.0.1:1' }),
]

const NATIVA = '<html lang="it"><head><title>Impostazioni</title></head><body><header>' +
  '<h1 id="titolo">Impostazioni</h1><input id="cerca" type="text" aria-label="Filtra"></header>' +
  '<div id="rimando"><button id="apri-pannello" type="button">Apri</button></div>' +
  '<main id="radice"></main></body></html>'

/**
 * Le violazioni gravi di axe sulla pagina di adesso, come righe da leggere.
 */
async function gravi (page: Page, dove: string): Promise<string[]> {
  const risultato = await valuta<{ violations: Violazione[] }>(page,
    'configurazione => axe.run(document, configurazione)',
    CONFIGURAZIONE)
  return risultato.violations
    .filter((violazione) => violazione.impact === 'critical' || violazione.impact === 'serious')
    .flatMap((violazione) => violazione.nodes.map((nodo) =>
      `${dove}: ${violazione.id} — ${violazione.help} — ${nodo.target.join(' ')}`))
}

test('axe-core, i controlli delle impostazioni nel pannello e nella finestra nativa', async ({ browser }) => {
  const trovate: string[] = []
  for (const schema of ['light', 'dark'] as const) {
    const { page, errori } = await prepara(browser, schema)
    await valuta(page,
      '(v)=>prova.vai({pagina:"pagina.impostazioni",scheda:"programma#aspetto"},{altro:{programma:v}})',
      TUTTI_I_CONTROLLI)
    await valuta(page, FRAME)
    trovate.push(...await gravi(page, `${schema}/pannello`))
    // L'area Utente: gli account con le loro capacità, la posta che rimanda.
    await valuta(page, '()=>prova.vai({pagina:"pagina.impostazioni",scheda:"utente#account"})')
    await valuta(page, FRAME)
    trovate.push(...await gravi(page, `${schema}/pannello/utente`))
    expect(errori, `errori JavaScript (${schema}, pannello)`).toEqual([])
    await page.close()

    const nativa = await pannello(browser, {
      html: NATIVA, bundle: 'native-settings', colorScheme: schema, reducedMotion: 'reduce',
    })
    await nativa.page.addScriptTag({ path: AXE })
    await valuta(nativa.page,
      "(v)=>window.dispatchEvent(new MessageEvent('message',{data:{impostazioni:'schema'," +
      "titolo:'Impostazioni',voci:v}}))", TUTTI_I_CONTROLLI)
    await valuta(nativa.page, FRAME)
    trovate.push(...await gravi(nativa.page, `${schema}/nativa`))
    expect(nativa.errori, `errori JavaScript (${schema}, nativa)`).toEqual([])
    await nativa.page.close()
  }
  expect(trovate, `Violazioni WCAG critical/serious:\n${trovate.join('\n')}`).toEqual([])
})
