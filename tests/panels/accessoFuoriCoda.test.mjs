// L'accesso Microsoft aspetta il browser anche minuti: non deve fermare le
// altre richieste del pannello, e chi lo richiede interrompe quello in attesa.
// Una domanda che si rompe torna comunque con un riscontro.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-accesso-fuori-coda-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  // Un bundle solo: il pannello e la prova devono vedere la stessa `oauth.ts`.
  m = await importaSorgente(
    [
      "export { PannelloRegistro } from './desktop/pannelli/panel.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export { aspettaIlRitorno } from './core/dati/oauth.ts'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  )
})

/** Un pannello finto: tiene quel che gli si manda, e consegna quel che gli si scrive. */
function pannelloFinto () {
  const mandati = []
  let ricevi = () => {}
  let chiuso = () => {}
  const niente = { dispose () {} }
  return {
    mandati,
    scrivi: (messaggio) => ricevi(messaggio),
    chiudi: () => chiuso(),
    pannello: {
      webview: {
        html: '',
        options: {},
        cspSource: 'vscode-resource:',
        asWebviewUri: (uri) => uri,
        postMessage: async (messaggio) => { mandati.push(messaggio); return true },
        onDidReceiveMessage: (al) => { ricevi = al; return niente },
      },
      onDidDispose: (al) => { chiuso = al; return niente },
      reveal () {},
    },
  }
}

/** Aspetta che `vero()` lo diventi, o dice che non è successo entro il tetto. */
async function entro (vero, cosa, ms = 3000) {
  const fine = Date.now() + ms
  while (!vero()) {
    if (Date.now() > fine) assert.fail(`non è successo entro ${ms} ms: ${cosa}`)
    await new Promise((risolvi) => setTimeout(risolvi, 10))
  }
}

async function conPannello (prova) {
  const { Archivio, PannelloRegistro, Uri } = m
  const archivio = new Archivio(Uri.file(percorso.join(radice, 'utente')))
  await archivio.apri(null)
  const finto = pannelloFinto()
  const contesto = { extensionUri: Uri.file(radice), subscriptions: [] }
  const pannello = new PannelloRegistro(finto.pannello, contesto, archivio)
  try {
    await prova({ archivio, finto, pannello })
  } finally {
    finto.chiudi()
    archivio.dispose()
  }
}

const risposta = (finto, id) => finto.mandati.find((x) => x.tipo === 'risposta' && x.id === id)

describe('l’accesso Microsoft dal pannello', () => {
  it('mentre aspetta il browser, le altre richieste passano', async () => {
    await conPannello(async ({ archivio, finto }) => {
      const vero = archivio.inUnPasso.bind(archivio)
      // L'accesso non torna mai, come chi ha chiuso la scheda del browser.
      archivio.inUnPasso = (lavoro, chiave) =>
        chiave?.startsWith('microsoft.aggiungi') ? new Promise(() => {}) : vero(lavoro, chiave)

      finto.scrivi({ id: 1, azione: { tipo: 'microsoft.aggiungi' } })
      finto.scrivi({ id: 2, azione: { tipo: 'materia.elimina', id: 'mat-nessuna' } })
      await entro(() => risposta(finto, 2), 'la risposta alla seconda richiesta')
      assert.equal(risposta(finto, 1), undefined)
      // Anche «Esci» e «Chiudi anno» non aspettano l'accesso.
      await Promise.race([
        m.PannelloRegistro.attendiScritture(),
        new Promise((_, no) => setTimeout(() => no(new Error('attendiScritture aspetta l’accesso')), 3000)),
      ])
    })
  })

  it('una nuova richiesta interrompe l’accesso che aspetta ancora il browser', async () => {
    await conPannello(async ({ finto }) => {
      let consegna
      const pronto = new Promise((risolvi) => { consegna = risolvi })
      const inAttesa = m.aspettaIlRitorno('vecchio', async () => consegna())
      await pronto

      finto.scrivi({ id: 3, azione: { tipo: 'posta.collega' } })
      const esito = await Promise.race([
        inAttesa,
        new Promise((risolvi) => setTimeout(() => risolvi({ error: 'ancora in attesa' }), 3000)),
      ])
      assert.equal(esito.error, 'interrotto')
    })
  })
})

describe('una domanda che si rompe', () => {
  it('torna con un riscontro `interno`, invece di lasciare la pagina ad aspettare', async () => {
    await conPannello(async ({ finto }) => {
      // Una busta che si rompe appena la si legge: dal vero non arriva (è
      // clonata), ma sta per qualunque guasto intorno a `chiama`.
      finto.scrivi({
        id: 4,
        procedura: 'registro.riassunto',
        get ingresso () { throw new Error('busta rotta') },
      })
      await entro(
        () => finto.mandati.some((x) => x.tipo === 'riscontro' && x.id === 4),
        'il riscontro della domanda',
      )
      const riscontro = finto.mandati.find((x) => x.tipo === 'riscontro' && x.id === 4)
      assert.equal(riscontro.ok, false)
      assert.equal(riscontro.codice, 'interno')
    })
  })
})
