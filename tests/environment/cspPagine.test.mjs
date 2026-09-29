// Le pagine del registro mostrano dati personali degli allievi: la CSP è
// l'ultima serratura se un nome o una nota finisce nel DOM come HTML. Chiusa
// per difetto (`default-src 'none'`), niente rete, niente `eval`, nessuno
// script in linea senza il nonce, e un nonce che non si ripete fra pagine.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const RADICE_PROGETTO = fileURLToPath(new URL('../..', import.meta.url))
const PAGINE_NATIVE = percorso.join(RADICE_PROGETTO, 'desktop', 'shell', 'pages')

const { paginaHtml, Uri } = await importaSorgente(`export { paginaHtml } from './desktop/pannelli/page.ts'
export { Uri } from './core/apparato/uri.ts'
`)

/** La webview come la dà `windows.ts`: `registro:` copre ogni nostro indirizzo. */
const webview = {
  cspSource: 'registro:',
  asWebviewUri: (risorsa) => Uri.parse(`registro://app${risorsa.path.replace(/^\/[A-Za-z]:/, '')}`),
}

function pagina () {
  return paginaHtml({
    webview,
    radiceApp: Uri.file(percorso.join(RADICE_PROGETTO)),
    bundle: 'pannello',
    titolo: 'Registro',
    classe: 'registro',
  })
}

/** Le direttive della CSP di un HTML, da nome a elenco di sorgenti. */
function direttive (html) {
  const trovata = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)
  assert.ok(trovata, 'la pagina ha una CSP')
  const mappa = new Map()
  for (const pezzo of trovata[1].split(';')) {
    const [nome, ...sorgenti] = pezzo.trim().split(/\s+/)
    if (nome) mappa.set(nome, sorgenti)
  }
  return mappa
}

describe('la CSP della pagina dei pannelli', () => {
  it('è chiusa per difetto e senza rete', () => {
    const csp = direttive(pagina())
    assert.deepEqual(csp.get('default-src'), ["'none'"])
    assert.deepEqual(csp.get('connect-src'), ['registro:'])
    assert.deepEqual(csp.get('frame-src'), ['registro:'])
    assert.deepEqual(csp.get('font-src'), ['registro:'])
  })

  it('gli script: solo il nonce, niente in linea né eval', () => {
    const html = pagina()
    const csp = direttive(html)
    const script = csp.get('script-src')
    assert.equal(script.length, 1)
    assert.match(script[0], /^'nonce-[A-Za-z0-9_-]{32}'$/)
    for (const sorgenti of csp.values()) {
      assert.ok(!sorgenti.includes("'unsafe-eval'"), 'nessun eval')
    }
    assert.ok(!script.includes("'unsafe-inline'"))
    // L'unico script porta proprio quel nonce.
    const nonce = script[0].slice("'nonce-".length, -1)
    const tag = html.match(/<script\b[^>]*>/g)
    assert.deepEqual(tag.length, 1)
    assert.ok(tag[0].includes(`nonce="${nonce}"`))
  })

  it('le immagini solo da registro: e data:, niente https', () => {
    assert.deepEqual(direttive(pagina()).get('img-src'), ['registro:', 'data:'])
  })

  it('il nonce è diverso a ogni pagina costruita', () => {
    const visti = new Set()
    for (let i = 0; i < 20; i++) visti.add(direttive(pagina()).get('script-src')[0])
    assert.equal(visti.size, 20)
  })
})

describe('la CSP delle pagine native', () => {
  const pagine = readdirSync(PAGINE_NATIVE, { withFileTypes: true })
    .filter((voce) => voce.isDirectory())
    .flatMap((voce) =>
      readdirSync(percorso.join(PAGINE_NATIVE, voce.name))
        .filter((nome) => nome.endsWith('.html'))
        .map((nome) => percorso.join(PAGINE_NATIVE, voce.name, nome)),
    )

  it('ci sono le cinque pagine del guscio', () => {
    assert.deepEqual(pagine.map((file) => percorso.basename(file)).sort(), [
      'dialog.html', 'reader.html', 'settings.html', 'splash.html', 'welcome.html',
    ])
  })

  for (const file of pagine) {
    const nome = percorso.basename(file)
    it(`${nome}: chiusa per difetto, script e stili solo da registro:`, () => {
      const html = readFileSync(file, 'utf8')
      const csp = direttive(html)
      assert.deepEqual(csp.get('default-src'), ["'none'"])
      assert.deepEqual(csp.get('script-src'), ['registro:'])
      assert.deepEqual(csp.get('style-src'), ['registro:'])
      for (const sorgente of csp.get('img-src')) assert.ok(['registro:', 'data:'].includes(sorgente), sorgente)
      for (const sorgenti of csp.values()) {
        for (const vietata of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:']) {
          assert.ok(!sorgenti.includes(vietata), `${nome}: ${vietata}`)
        }
      }
    })

    it(`${nome}: nessuno script in linea né gestori on…=`, () => {
      const html = readFileSync(file, 'utf8')
      // Con `script-src registro:` non girerebbero: chi li aggiunge crede di aver
      // scritto codice e invece ha una pagina muta.
      for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
        assert.match(tag, /\bsrc="registro:\/\/app\/dist\//, tag)
      }
      assert.doesNotMatch(html, /\son[a-z]+\s*=/i)
    })
  }
})
