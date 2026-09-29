// Lo schema `registro://` serve file del disco a pagine che mostrano dati
// arrivati da altri (piani lezione, PDF smistati): un nome con `..`, codificato
// o no, o un percorso assoluto qualunque non devono uscire dalle cartelle
// concesse. E il permesso CORS va alle sole nostre origini, mai a `*`.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { pathToFileURL } from 'node:url'
import { after, before, beforeEach, describe, it } from 'node:test'

import { bancoElectron } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const RADICE = mkdtempSync(percorso.join(tmpdir(), 'registro-protocollo-'))
after(() => rmSync(RADICE, { recursive: true, force: true }))
// `radiceApp()` risale da `dist/` e lo ricorda: va scelto prima di tutto.
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'app', 'dist')

const DIST = percorso.join(RADICE, 'app', 'dist')
const SEGRETO = percorso.join(RADICE, 'segreto.txt')
mkdirSync(DIST, { recursive: true })
mkdirSync(percorso.join(RADICE, 'app', 'resources'), { recursive: true })
writeFileSync(percorso.join(DIST, 'pannello.js'), 'console.log(1)')
writeFileSync(SEGRETO, 'non si legge')
// Accanto a `dist/`, con lo stesso inizio: il confine è il segmento, non il prefisso.
mkdirSync(percorso.join(RADICE, 'app', 'dist2'), { recursive: true })
writeFileSync(percorso.join(RADICE, 'app', 'dist2', 'x.js'), 'fuori')

const { registraProtocollo } = await importaSorgente('desktop/shell/protocol/fileProtocol.ts')

let gestore
before(() => {
  registraProtocollo()
  gestore = bancoElectron.protocolli.registro
})

beforeEach(() => {
  bancoElectron.scaricati.length = 0
})

/** Una richiesta come la consegna Electron: basta l'indirizzo e le intestazioni. */
function chiedi (indirizzo, origine) {
  const headers = new Headers(origine ? { origin: origine } : {})
  return gestore({ url: indirizzo, headers })
}

/** Il percorso di un file come lo scrive `registro://dati/…`, con le barre in avanti. */
function comeDati (file) {
  return file.replace(/\\/g, '/').replace(/^\/+/, '')
}

describe('registro:// dentro le radici concesse', () => {
  it('un file di dist/ arriva con 200 e dal suo percorso vero', async () => {
    const risposta = await chiedi('registro://app/dist/pannello.js')
    assert.equal(risposta.status, 200)
    assert.equal(await risposta.text(), 'console.log(1)')
    assert.deepEqual(bancoElectron.scaricati, [pathToFileURL(percorso.join(DIST, 'pannello.js')).toString()])
  })

  it('lo stesso file per la via di dati/ col percorso intero', async () => {
    const risposta = await chiedi(`registro://dati/${comeDati(percorso.join(DIST, 'pannello.js'))}`)
    assert.equal(risposta.status, 200)
  })

  it('su Windows la lettera d’unità minuscola è la stessa cartella', { skip: process.platform !== 'win32' }, async () => {
    const minuscolo = comeDati(percorso.join(DIST, 'pannello.js')).replace(/^([A-Z]):/, (_, u) => `${u.toLowerCase()}:`)
    const risposta = await chiedi(`registro://dati/${minuscolo}`)
    assert.equal(risposta.status, 200)
  })
})

describe('registro:// fuori dalle radici', () => {
  it('una risalita codificata %2e%2e dentro un segmento si rifiuta', async () => {
    // `new URL` risolve `%2e%2e/` da sé; `..%2f` invece arriva come segmento intero.
    for (const indirizzo of [
      'registro://app/dist/..%2f..%2fsegreto.txt',
      'registro://app/dist/%2e%2e%2f%2e%2e%2fsegreto.txt',
      'registro://app/dist/..%5c..%5csegreto.txt',
    ]) {
      const risposta = await chiedi(indirizzo)
      assert.equal(risposta.status, 403, indirizzo)
    }
    assert.deepEqual(bancoElectron.scaricati, [], 'nessun file è stato letto')
  })

  it('una risalita che il parser risolve da sé resta comunque dentro la radice', async () => {
    // `new URL` toglie `%2e%2e/` prima del gestore: si arriva a `app/segreto.txt`,
    // che non esiste in nessuna radice concessa.
    const risposta = await chiedi('registro://app/dist/%2e%2e/%2e%2e/segreto.txt')
    assert.equal(risposta.status, 403)
    assert.deepEqual(bancoElectron.scaricati, [])
  })

  it('un percorso assoluto qualunque via dati/ è 403, anche se il file c’è', async () => {
    const risposta = await chiedi(`registro://dati/${comeDati(SEGRETO)}`)
    assert.equal(risposta.status, 403)
    assert.deepEqual(bancoElectron.scaricati, [])
  })

  it('una cartella che comincia come una radice non è la radice', async () => {
    const risposta = await chiedi(`registro://dati/${comeDati(percorso.join(RADICE, 'app', 'dist2', 'x.js'))}`)
    assert.equal(risposta.status, 403)
  })

  it('un percorso di rete (UNC) via dati/ è 403', async () => {
    const risposta = await chiedi('registro://dati/%5c%5cserver%5cquota%5csegreto.txt')
    assert.equal(risposta.status, 403)
    assert.deepEqual(bancoElectron.scaricati, [])
  })

  it('un’autorità che non esiste è 404, e una pagina mai aperta pure', async () => {
    assert.equal((await chiedi('registro://altro/dist/pannello.js')).status, 404)
    assert.equal((await chiedi('registro://pagina/nessuna')).status, 404)
    assert.deepEqual(bancoElectron.scaricati, [])
  })
})

describe('registro:// e CORS', () => {
  it('rimanda l’origine solo se è registro://, mai *', async () => {
    const nostra = await chiedi('registro://app/dist/pannello.js', 'registro://pagina')
    assert.equal(nostra.headers.get('access-control-allow-origin'), 'registro://pagina')

    const estranea = await chiedi('registro://app/dist/pannello.js', 'https://esempio.org')
    assert.equal(estranea.headers.get('access-control-allow-origin'), null)

    const senza = await chiedi('registro://app/dist/pannello.js')
    assert.equal(senza.headers.get('access-control-allow-origin'), null)
  })

  it('anche un rifiuto porta l’origine nostra, così la pagina vede il 403 e non un errore di rete', async () => {
    const risposta = await chiedi(`registro://dati/${comeDati(SEGRETO)}`, 'registro://pagina')
    assert.equal(risposta.status, 403)
    assert.equal(risposta.headers.get('access-control-allow-origin'), 'registro://pagina')
  })
})
