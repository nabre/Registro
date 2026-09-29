// Gate WCAG automatico dell'intera shell Regiklass con axe-core locale.
//
// Visita ogni pagina dichiarata dall'app in entrambi gli schemi colore.
// Fallisce solo per violazioni WCAG di impatto `critical` o `serious`; stampa
// regola, pagina e selettori, senza scaricare codice da CDN.

import { expect, test, type Browser } from '@playwright/test'

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
