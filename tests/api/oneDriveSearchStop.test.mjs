// La ricerca dei `.regi` nelle cartelle sincronizzate si ferma per due motivi
// diversi: ha trovato troppi documenti, o è passato il tempo massimo. La
// finestra di OneDrive dice l'uno o l'altro, quindi `onedrive.cerca` li deve
// distinguere in `motivo`.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it, mock } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-onedrive-fermata-')

const ACCOUNT = 'sincronizzato@scuola.ch'
/** Il tetto dei risultati in `core/dati/onedrive.ts`. */
const MASSIMO_TROVATI = 500

let api
let archivio

/** Una cartella sincronizzata con `quanti` documenti e una sottocartella ancora da guardare. */
function cartellaCon (nome, quanti) {
  const dove = percorso.join(radice, nome)
  mkdirSync(percorso.join(dove, 'sotto'), { recursive: true })
  for (let i = 0; i < quanti; i += 1) writeFileSync(percorso.join(dove, `anno-${i}.regi`), 'x')
  return dove
}

function cerca (cartelle) {
  api.fissaOneDriveLocali([{ indirizzo: ACCOUNT, nome: 'Docente', cartelle }])
  return api.chiama(archivio, 'onedrive.cerca', { account: ACCOUNT })
}

before(async () => {
  ({ api, archivio } = await archivioDiProva({ lavoro, dati }))
})

after(() => {
  api?.fissaOneDriveLocali([])
  smonta(radice, archivio)
})

describe('onedrive.cerca dice perché si è fermata', () => {
  it('guardato tutto: non troncata, nessun motivo', async () => {
    const esito = await cerca([cartellaCon('poche', 2)])
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.voci.length, 2)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.motivo, null)
  })

  it('troppi documenti: motivo «troppi»', async () => {
    const esito = await cerca([cartellaCon('tante', MASSIMO_TROVATI)])
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.voci.length, MASSIMO_TROVATI)
    assert.equal(esito.dati.troncato, true)
    assert.equal(esito.dati.motivo, 'troppi')
  })

  it('tempo finito: motivo «tempo», con quel che ha trovato fin lì', async () => {
    const dove = cartellaCon('lenta', 1)
    // Un orologio che salta un minuto a ogni lettura: la scadenza passa
    // prima della prima cartella, senza aspettare davvero.
    let adesso = Date.now()
    const orologio = mock.method(Date, 'now', () => (adesso += 60_000))
    let esito
    try {
      esito = await cerca([dove])
    } finally {
      orologio.mock.restore()
    }
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.troncato, true)
    assert.equal(esito.dati.motivo, 'tempo')
  })
})
