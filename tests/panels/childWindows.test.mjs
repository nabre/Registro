// Più finestre del registro su un archivio solo (`desktop/pannelli/panel.ts`):
// le scritture di tutte passano da una coda sola, nell'ordine in cui arrivano,
// e `attendiScritture` le aspetta tutte; lo schermo per la classe segue la
// finestra col fuoco, non l'ultima che ha parlato.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-finestre-figlie-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  // Un bundle solo: il pannello e la prova devono vedere lo stesso proiettore.
  m = await importaSorgente(
    [
      "export { PannelloRegistro, titoloFinestra } from './desktop/pannelli/panel.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export { registraProiettore } from './core/azioni/projection.ts'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  )
})

/** Un pannello finto con il fuoco: tiene quel che gli si manda, consegna quel che gli si scrive. */
function pannelloFinto () {
  const mandati = []
  let ricevi = () => {}
  let chiuso = () => {}
  let fuoco = () => {}
  const niente = { dispose () {} }
  return {
    mandati,
    scrivi: (messaggio) => ricevi(messaggio),
    chiudi: () => chiuso(),
    prendeIlFuoco: () => fuoco(),
    risposta: (id) => mandati.find((x) => x.tipo === 'risposta' && x.id === id),
    pannello: {
      title: '',
      webview: {
        html: '',
        options: {},
        cspSource: 'vscode-resource:',
        asWebviewUri: (uri) => uri,
        postMessage: async (messaggio) => { mandati.push(messaggio); return true },
        onDidReceiveMessage: (al) => { ricevi = al; return niente },
      },
      onDidDispose: (al) => { chiuso = al; return niente },
      alFuoco: (al) => { fuoco = al; return niente },
      reveal () {},
      dispose () { chiuso() },
    },
  }
}

/** La principale e una figlia sullo stesso archivio; si chiudono alla fine. */
async function conDueFinestre (prova) {
  const { Archivio, PannelloRegistro, Uri } = m
  const archivio = new Archivio(Uri.file(percorso.join(radice, 'utente')))
  await archivio.apri(null)
  const contesto = { extensionUri: Uri.file(radice), subscriptions: [] }
  const principale = pannelloFinto()
  const figlia = pannelloFinto()
  new PannelloRegistro(principale.pannello, contesto, archivio, 1)
  new PannelloRegistro(figlia.pannello, contesto, archivio, 2)
  try {
    await prova({ archivio, principale, figlia })
  } finally {
    principale.chiudi()
    archivio.dispose()
  }
}

describe('le scritture di più finestre', () => {
  it('passano da una coda sola, nell’ordine in cui arrivano', async () => {
    await conDueFinestre(async ({ archivio, principale, figlia }) => {
      const fatti = []
      // La prima scrittura è lenta: con una coda per finestra, la seconda la passerebbe.
      archivio.inUnPasso = async (_esegui, chiave) => {
        const lenta = chiave?.includes('dalla-figlia')
        await new Promise((risolvi) => setTimeout(risolvi, lenta ? 60 : 0))
        fatti.push(lenta ? 'figlia' : 'principale')
        return { ok: true, invariato: true }
      }
      figlia.scrivi({ id: 1, azione: { tipo: 'materia.elimina', id: 'dalla-figlia' } })
      principale.scrivi({ id: 1, azione: { tipo: 'materia.elimina', id: 'dalla-principale' } })
      await m.PannelloRegistro.attendiScritture()

      assert.deepEqual(fatti, ['figlia', 'principale'])
      assert.equal(figlia.risposta(1)?.ok, true, 'la figlia ha la sua risposta')
      assert.equal(principale.risposta(1)?.ok, true, 'la principale ha la sua risposta')
    })
  })
})

describe('lo schermo per la classe segue la finestra col fuoco', () => {
  it('la mira di una finestra senza fuoco aspetta che lo prenda', async () => {
    const mire = []
    m.registraProiettore({
      apri: async () => {},
      chiudi: () => {},
      mira: (mira) => mire.push(mira.lezioneId),
      imposta: () => {},
    })
    try {
      await conDueFinestre(async ({ principale, figlia }) => {
        const mira = (lezioneId) => ({ lezioneId, corsoId: null, classeId: null, semestreId: null, data: '2026-09-21' })
        principale.scrivi({ id: 1, azione: { tipo: 'proiezione.mira', mira: mira('della-principale') } })
        figlia.scrivi({ id: 1, azione: { tipo: 'proiezione.mira', mira: mira('della-figlia') } })
        await m.PannelloRegistro.attendiScritture()
        assert.deepEqual(mire, ['della-principale'], 'la figlia senza fuoco non sposta lo schermo')
        assert.equal(figlia.risposta(1)?.ok, true, 'alla figlia si risponde lo stesso')

        figlia.prendeIlFuoco()
        await m.PannelloRegistro.attendiScritture()
        assert.deepEqual(mire, ['della-principale', 'della-figlia'])

        // Un'altra mira della principale, che ora non ha il fuoco: resta da parte.
        principale.scrivi({ id: 2, azione: { tipo: 'proiezione.mira', mira: mira('ancora-principale') } })
        await m.PannelloRegistro.attendiScritture()
        assert.deepEqual(mire, ['della-principale', 'della-figlia'])

        // La figlia se ne va col fuoco: torna alla principale, con la sua ultima mira.
        figlia.chiudi()
        await m.PannelloRegistro.attendiScritture()
        assert.deepEqual(mire, ['della-principale', 'della-figlia', 'ancora-principale'])
      })
    } finally {
      m.registraProiettore(null)
    }
  })
})

describe('il titolo delle finestre', () => {
  it('la principale si nomina solo con figlie, una figlia dice pagina e numero', () => {
    const percorsoAnno = percorso.join(radice, '2026-2027.regi')
    assert.equal(m.titoloFinestra(percorsoAnno), '2026-2027 — Regiklass')
    assert.equal(
      m.titoloFinestra(percorsoAnno, { numero: 1, pagina: 'Oggi', conFiglie: true }),
      '2026-2027 — Regiklass (principale)',
    )
    assert.equal(
      m.titoloFinestra(percorsoAnno, { numero: 2, pagina: 'Calendario', conFiglie: true }),
      'Calendario · 2026-2027 — Regiklass [2]',
    )
  })
})
