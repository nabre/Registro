// L'avviso di errore a pannello chiuso: una finestra, non una pila. Un
// salvataggio che non riesce riprova da sé (da un secondo a un minuto) e
// ridice il suo errore a ogni tentativo: la finestra dei messaggi
// (`chiediMessaggio` in `environment/dialogs.ts`) resta una.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-avviso-errore-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let PannelloRegistro
let BrowserWindow

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  ;({ PannelloRegistro, BrowserWindow } = await importaSorgente(
    [
      "export { PannelloRegistro } from './src/panels/panel.ts'",
      "export { BrowserWindow } from 'electron'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  ))
})

/** Lascia passare i giri di microtask con cui il messaggio arriva alla sua finestra. */
const unGiro = () => new Promise((fatto) => setImmediate(fatto))

/** Le finestre dei messaggi aperte adesso: chi guarda non chiude finché la prova non lo fa. */
function aperte () {
  return BrowserWindow.getAllWindows().filter((finestra) =>
    finestra.caricati.some((indirizzo) => indirizzo.includes('/dialog.html')),
  )
}

/** Il testo che la pagina del messaggio mostra. */
function messaggioDi (finestra) {
  const indirizzo = new URL(finestra.caricati.at(-1))
  return JSON.parse(decodeURIComponent(indirizzo.searchParams.get('p'))).messaggio
}

describe('PannelloRegistro.avvisa a pannello chiuso', () => {
  it('lo stesso errore non apre una seconda finestra finché la prima è aperta', async () => {
    try {
      PannelloRegistro.avvisa('Salvataggio dell’anno non riuscito: EPERM')
      await unGiro()
      PannelloRegistro.avvisa('Salvataggio dell’anno non riuscito: EPERM')
      await unGiro()
      assert.equal(aperte().length, 1, 'il secondo tentativo non impila un’altra finestra')

      // Un errore diverso si dice lo stesso.
      PannelloRegistro.avvisa('Documento illeggibile')
      await unGiro()
      assert.equal(aperte().length, 2)

      // Chiusa la prima, lo stesso errore torna a potersi dire.
      aperte()[0].chiudiDaFuori()
      await unGiro()
      PannelloRegistro.avvisa('Salvataggio dell’anno non riuscito: EPERM')
      await unGiro()
      assert.equal(aperte().length, 2)
      assert.match(messaggioDi(aperte().at(-1)), /EPERM/)
    } finally {
      for (const finestra of aperte()) finestra.chiudiDaFuori()
    }
  })
})
