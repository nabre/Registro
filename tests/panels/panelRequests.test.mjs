// Un'azione del pannello che solleva: l'errore si dice una volta sola.
// Arriva nella risposta e lo mostra chi ha chiesto (in cima al modulo, o con la
// notifica di `azione` in `ui/bridge.ts`): il ponte non aggiunge un `avvisa`.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-richieste-pannello-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  m = await importaSorgente(
    [
      "export { PannelloRegistro } from './src/panels/panel.ts'",
      "export { Archivio } from './src/data/archive.ts'",
      "export { Uri } from './src/environment/uri.ts'",
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

describe('una richiesta del pannello che solleva', () => {
  it('torna come risposta con l’errore, senza una notifica in più', async () => {
    const { Archivio, PannelloRegistro, Uri } = m
    const archivio = new Archivio(Uri.file(percorso.join(radice, 'utente')))
    await archivio.apri(null)
    archivio.inUnPasso = async () => { throw new Error('guasto finto') }

    const finto = pannelloFinto()
    const contesto = { extensionUri: Uri.file(radice), subscriptions: [] }
    const pannello = new PannelloRegistro(finto.pannello, contesto, archivio)
    // Il pannello aperto è questo: `avvisa` scriverebbe qui, nel webview.
    PannelloRegistro.istanza = pannello
    try {
      finto.scrivi({ id: 7, azione: { tipo: 'materia.elimina', id: 'mat-nessuna' } })
      await pannello.coda

      const risposte = finto.mandati.filter((x) => x.tipo === 'risposta' && x.id === 7)
      assert.equal(risposte.length, 1)
      assert.equal(risposte[0].ok, false)
      assert.deepEqual(risposte[0].errori, ['guasto finto'])
      const notifiche = finto.mandati.filter((x) => x.tipo === 'notifica' && x.testo === 'guasto finto')
      assert.equal(notifiche.length, 0, 'l’errore l’ha già la risposta: una notifica lo ridiceva')
    } finally {
      finto.chiudi()
      PannelloRegistro.istanza = null
      archivio.dispose()
    }
  })
})
