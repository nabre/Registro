// Le finestre dello shim, provate nella forma in cui `panels/panel.ts` le usa.
//
// La prova non guarda un'API in astratto: rifà, riga per riga, quel che il
// pannello del registro fa davvero — costruire con `localResourceRoots`,
// assegnare `webview.html`, comporre gli indirizzi con `asWebviewUri`,
// ascoltare i messaggi, rispingere lo stato, aggiornare le radici quando
// cambia l'anno, chiudersi. È quel che permette di dire che `panels/panel.ts` e
// `panels/projection.ts` girano senza una modifica: se qui passa, lì passa.

import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import { finestreCostruite, ipcMain } from '../helpers/fake-electron.mjs'

/** La radice dell'app, scelta prima che lo shim la chieda: la calcola da qui. */
const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

const { htmlDellaPagina, radiciConcesse, Uri, ViewColumn, finestre } = await import('../../dist-tests/environment.mjs')

/** La cartella dell'anno, come la darebbe `cartellaAnno()`. */
const ANNO = Uri.file(percorso.join(tmpdir(), 'registro-dati', '2026-2027'))

/** Un pannello con le opzioni con cui lo apre `panels/panel.ts`. */
function apriPannello () {
  const primo = finestreCostruite.length
  const pannello = finestre.crea('registroDocenti.pannello', 'Registro', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      Uri.joinPath(Uri.file(RADICE), 'dist'),
      Uri.joinPath(Uri.file(RADICE), 'media'),
      ANNO,
    ],
  })
  return { pannello, finestra: finestreCostruite[primo] }
}

/** Le finestre restano nell'elenco anche chiuse: fra un caso e l'altro si azzera. */
beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

describe('la pagina viene dal protocollo, non da un data: URL', () => {
  it('carica registro://pagina/<id> e tiene da parte l’HTML', () => {
    const { pannello, finestra } = apriPannello()
    pannello.webview.html = '<!DOCTYPE html><html lang="it"></html>'

    const caricato = finestra.caricati.at(-1)
    assert.match(caricato, /^registro:\/\/pagina\/\d+$/)
    const id = caricato.split('/').pop()
    assert.equal(htmlDellaPagina(id), '<!DOCTYPE html><html lang="it"></html>')
  })

  it('chiusa la finestra, la pagina non si serve più', () => {
    const { pannello, finestra } = apriPannello()
    pannello.webview.html = '<html lang="it"></html>'
    const id = finestra.caricati.at(-1).split('/').pop()
    pannello.dispose()
    assert.equal(htmlDellaPagina(id), undefined)
  })

  it('dà alla policy un’origine che combacia', () => {
    const { pannello } = apriPannello()
    // `panels/panel.ts` scrive `img-src ${cspSource} data:`: se questa stringa non
    // copre gli indirizzi che compone, la finestra resta bianca.
    assert.equal(pannello.webview.cspSource, 'registro:')
    assert.ok(pannello.webview.asWebviewUri(ANNO).toString().startsWith('registro:'))
  })
})

describe('gli indirizzi delle risorse', () => {
  it('manda il codice dell’app su registro://app, relativo alla radice', () => {
    const { pannello } = apriPannello()
    const script = Uri.joinPath(Uri.file(RADICE), 'dist', 'webview.js')
    assert.equal(pannello.webview.asWebviewUri(script).toString(), 'registro://app/dist/webview.js')
  })

  it('manda i dati del docente su registro://dati, col percorso intero', () => {
    const { pannello } = apriPannello()
    const indirizzo = pannello.webview.asWebviewUri(ANNO).toString()
    assert.ok(indirizzo.startsWith('registro://dati/'), indirizzo)
    assert.ok(indirizzo.endsWith('/registro-dati/2026-2027'), indirizzo)
  })

  it('codifica segmento per segmento, e le barre restano barre', () => {
    const { pannello } = apriPannello()
    const figura = Uri.joinPath(ANNO, 'risorse', 'schema di flusso.png')
    const indirizzo = pannello.webview.asWebviewUri(figura).toString()
    assert.ok(indirizzo.endsWith('/risorse/schema%20di%20flusso.png'), indirizzo)
  })

  it('le radici concesse seguono l’anno quando cambia', () => {
    const { pannello } = apriPannello()
    const altro = Uri.file(percorso.join(tmpdir(), 'registro-dati', '2027-2028'))
    // È quel che fa `PannelloRegistro.aggiornaRisorse()`, alla lettera.
    pannello.webview.options = { ...pannello.webview.options, localResourceRoots: [altro] }
    const concesse = radiciConcesse().map((radice) => radice.toString())
    assert.ok(concesse.includes(altro.toString()))
    assert.ok(!concesse.includes(ANNO.toString()))
  })

  it('la cartella dei bundle è concessa comunque', () => {
    apriPannello()
    const concesse = radiciConcesse().map((radice) => radice.fsPath)
    assert.ok(concesse.includes(percorso.join(RADICE, 'dist')), concesse.join(' · '))
  })
})

describe('i messaggi', () => {
  it('aspetta che la pagina sia arrivata prima di consegnare', async () => {
    const { pannello, finestra } = apriPannello()
    pannello.webview.html = '<html lang="it"></html>'

    await pannello.webview.postMessage({ tipo: 'proiezione' })
    // È il caso di `panels/projection.ts`, che spinge il primo contenuto nel
    // proprio costruttore: buttarlo via lascerebbe lo schermo della classe
    // vuoto fino alla prima modifica del registro.
    assert.equal(finestra.webContents.inviati.length, 0)

    finestra.finisciCaricamento()
    assert.deepEqual(finestra.webContents.inviati, [
      { canale: 'registro:messaggio', messaggio: { tipo: 'proiezione' } },
    ])
  })

  it('consegna a chi ha chiesto, e non all’altra finestra', () => {
    const primo = apriPannello()
    const secondo = apriPannello()
    const arrivati = { primo: [], secondo: [] }
    primo.pannello.webview.onDidReceiveMessage((m) => arrivati.primo.push(m))
    secondo.pannello.webview.onDidReceiveMessage((m) => arrivati.secondo.push(m))

    ipcMain.simulaDallaPagina(primo.finestra.webContents.id, { id: 1, azione: { tipo: 'stato.leggi' } })

    assert.deepEqual(arrivati.primo, [{ id: 1, azione: { tipo: 'stato.leggi' } }])
    assert.deepEqual(arrivati.secondo, [])
  })

  it('a finestra chiusa dice di no invece di scoppiare', async () => {
    const { pannello } = apriPannello()
    pannello.dispose()
    assert.equal(await pannello.webview.postMessage({ tipo: 'stato' }), false)
  })
})

describe('la vita della finestra', () => {
  it('reveal porta davanti, e senza fuoco non lo ruba', () => {
    const { pannello, finestra } = apriPannello()
    pannello.reveal(ViewColumn.One)
    assert.equal(finestra.mostrata, true)
    assert.equal(finestra.conFuoco, true)

    const altra = apriPannello()
    // `PannelloProiezione.apri()` chiama `reveal(undefined, true)`: lo schermo
    // della classe non deve togliere il fuoco a chi sta scrivendo.
    altra.pannello.reveal(undefined, true)
    assert.equal(altra.finestra.mostrata, true)
    assert.equal(altra.finestra.conFuoco, false)
  })

  it('onDidDispose scatta una volta sola, dalla X come da dispose()', () => {
    const { pannello, finestra } = apriPannello()
    let volte = 0
    pannello.onDidDispose(() => {
      volte += 1
    })
    finestra.chiudiDaFuori()
    pannello.dispose()
    assert.equal(volte, 1)
  })

  it('accetta gli argomenti che il pannello gli passa', () => {
    const { pannello, finestra } = apriPannello()
    // `panels/panel.ts` assegna l'icona subito dopo l'apertura, e `panels/projection.ts`
    // rilegge `viewColumn` per rivelarsi dov'è.
    pannello.iconPath = Uri.joinPath(Uri.file(RADICE), 'resources', 'registro.svg')
    assert.equal(pannello.viewColumn, ViewColumn.One)
    pannello.title = 'Registro · proiezione'
    assert.equal(finestra.getTitle(), 'Registro · proiezione')
  })

  it('la pagina non ha Node fra le mani', () => {
    const { finestra } = apriPannello()
    const preferenze = finestra.opzioni.webPreferences
    assert.equal(preferenze.nodeIntegration, false)
    assert.equal(preferenze.contextIsolation, true)
    assert.ok(preferenze.preload.endsWith(percorso.join('dist', 'preload.cjs')))
  })
})
