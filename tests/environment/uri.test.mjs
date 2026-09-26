// L'`Uri` dello shim e la sua canonicità: lo stesso file raggiunto per vie
// diverse (percorso nativo, stringa riletta, `joinPath`) dà la stessa
// `toString()`. Ci si reggono la difesa contro l'eco in `archive.ts` e la mappa
// delle risorse del webview.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ModelloRelativo, Uri } from '../../dist-tests/environment.mjs'

describe('il percorso è sempre POSIX, il percorso nativo no', () => {
  it('mette la lettera di unità dopo la radice', () => {
    assert.equal(Uri.file('C:\\x').path, '/C:/x')
  })

  it('tiene le barre dritte dentro path, comunque sia stato scritto', () => {
    assert.equal(Uri.file('C:\\dati\\registro\\lezioni.json').path, '/C:/dati/registro/lezioni.json')
  })

  it('rende a node:fs la forma della macchina', () => {
    assert.equal(Uri.file('C:\\dati\\lezioni.json').fsPath, 'C:\\dati\\lezioni.json')
    assert.equal(Uri.file('/home/docente/registro').fsPath, '/home/docente/registro')
  })

  it('sa il percorso di rete', () => {
    const quota = Uri.file('\\\\server\\quota\\registro')
    assert.equal(quota.authority, 'server')
    assert.equal(quota.path, '/quota/registro')
    assert.equal(quota.fsPath, '\\\\server\\quota\\registro')
  })

  it('dà il nome del file come lo prende paths.ts', () => {
    const uri = Uri.file('C:\\dati\\2026-2027\\dati\\lezioni.json')
    assert.equal(uri.path.split('/').pop(), 'lezioni.json')
  })
})

describe('joinPath scende e risale', () => {
  const radice = Uri.file('C:\\dati\\registro')

  it('senza parti restituisce l’uri stesso', () => {
    assert.equal(Uri.joinPath(radice), radice)
  })

  it('scende di più segmenti in una volta', () => {
    assert.equal(Uri.joinPath(radice, '2026-2027', 'dati', 'lezioni.json').path,
      '/C:/dati/registro/2026-2027/dati/lezioni.json')
  })

  it('con .. dà la cartella che contiene il file', () => {
    const file = Uri.joinPath(radice, '2026-2027', 'dati', 'lezioni.json')
    assert.equal(Uri.joinPath(file, '..').path, '/C:/dati/registro/2026-2027/dati')
    assert.equal(Uri.joinPath(file, '..', '..').path, '/C:/dati/registro/2026-2027')
  })

  it('non lascia risalire oltre la radice', () => {
    assert.equal(Uri.joinPath(Uri.file('/dati'), '..', '..', '..').path, '/')
  })

  it('scarta i segmenti vuoti e i punti', () => {
    assert.equal(Uri.joinPath(radice, './2026-2027', '', 'dati').path, '/C:/dati/registro/2026-2027/dati')
  })
})

describe('toString è canonica: lo stesso file dà la stessa stringa', () => {
  it('non importa da dove nasce l’uri', () => {
    const diretto = Uri.file('C:\\dati\\registro\\2026-2027\\dati\\lezioni.json')
    const composto = Uri.joinPath(Uri.file('C:\\dati\\registro'), '2026-2027', 'dati', 'lezioni.json')
    const riletto = Uri.parse(diretto.toString())
    const risalito = Uri.joinPath(
      Uri.file('C:\\dati\\registro\\2026-2027\\dati\\altro\\ancora.json'),
      '..',
      '..',
      'lezioni.json',
    )

    assert.equal(composto.toString(), diretto.toString())
    assert.equal(riletto.toString(), diretto.toString())
    assert.equal(risalito.toString(), diretto.toString())
  })

  it('non importa come è scritta la lettera di unità', () => {
    assert.equal(Uri.file('c:\\dati\\registro').toString(), Uri.file('C:/dati/registro').toString())
  })

  it('non importa che il nome abbia spazi e accenti', () => {
    // Sono nomi di classi e di allievi: è il caso normale, non quello strano.
    const diretto = Uri.file('C:\\dati\\4a Meccanici\\Nicolò Bertò — pagella.pdf')
    const composto = Uri.joinPath(Uri.file('c:/dati'), '4a Meccanici', 'Nicolò Bertò — pagella.pdf')

    assert.equal(composto.toString(), diretto.toString())
    assert.equal(Uri.parse(diretto.toString()).toString(), diretto.toString())
    assert.equal(Uri.parse(diretto.toString()).path, diretto.path)
    // La stringa è codificata; il percorso resta leggibile.
    assert.ok(diretto.toString().includes('%20'))
    assert.equal(diretto.path, '/C:/dati/4a Meccanici/Nicolò Bertò — pagella.pdf')
  })

  it('regge il giro completo anche per un percorso di rete', () => {
    const diretto = Uri.file('\\\\server\\quota\\4a Meccanici\\lezioni.json')
    assert.equal(Uri.parse(diretto.toString()).toString(), diretto.toString())
    assert.equal(Uri.parse(diretto.toString()).fsPath, diretto.fsPath)
  })
})

describe('with cambia una parte e ricanonicalizza', () => {
  it('è il modo in cui archive.ts si fa il nome del temporaneo', () => {
    const destinazione = Uri.file('C:\\dati\\registro\\lezioni.json')
    const temporaneo = destinazione.with({ path: `${destinazione.path}.tmp` })

    assert.equal(temporaneo.path, '/C:/dati/registro/lezioni.json.tmp')
    assert.equal(temporaneo.fsPath, 'C:\\dati\\registro\\lezioni.json.tmp')
  })
})

describe('parse tiene gli uri che non sono file', () => {
  it('conserva schema, autorità e percorso', () => {
    const uri = Uri.parse('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode')
    assert.equal(uri.scheme, 'https')
    assert.equal(uri.authority, 'login.microsoftonline.com')
    assert.equal(uri.path, '/common/oauth2/v2.0/devicecode')
    assert.equal(uri.toString(), 'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode')
  })
})

describe('ModelloRelativo tiene insieme una base e un glob', () => {
  it('accetta un uri o un percorso, e dà sempre i due campi', () => {
    const daUri = new ModelloRelativo(Uri.file('C:\\dati\\registro'), '{registro.json,*/dati/*.json}')
    const daStringa = new ModelloRelativo('C:\\dati\\registro', '{registro.json,*/dati/*.json}')

    assert.equal(daUri.base, 'C:\\dati\\registro')
    assert.equal(daUri.baseUri.toString(), daStringa.baseUri.toString())
    assert.equal(daUri.pattern, '{registro.json,*/dati/*.json}')
  })
})
