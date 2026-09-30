// Lo schermo per la classe: le azioni stanno in `core`, e lo schermo lo comanda
// chi si iscrive all'accensione (`registraProiettore`, da `desktop/boot.ts`).
// Prima dell'iscrizione si rifiuta invece di far finta di sì; dopo, ogni
// procedura arriva a chi è iscritto e non tocca il registro.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-proiezione-')

let api
let archivio

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati }))
})

after(() => smonta(radice, archivio))

describe('proiezione', () => {
  it('senza nessuno iscritto dice che lo schermo non c’è', async () => {
    api.registraProiettore(null)
    const esito = await api.chiama(archivio, 'proiezione.apri', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-disponibile')
  })

  it('con un iscritto gli porta ogni comando, e il registro resta com’è', async () => {
    const fatti = []
    api.registraProiettore({
      apri: async () => { fatti.push('apri') },
      chiudi: () => { fatti.push('chiudi') },
      mira: () => { fatti.push('mira') },
      imposta: () => { fatti.push('imposta') },
    })
    try {
      const prima = archivio.revisione
      for (const nome of ['proiezione.apri', 'proiezione.chiudi']) {
        const esito = await api.chiama(archivio, nome, {})
        assert.equal(esito.ok, true, JSON.stringify(esito))
      }
      assert.deepEqual(fatti, ['apri', 'chiudi'])
      assert.equal(archivio.revisione, prima)
    } finally {
      api.registraProiettore(null)
    }
  })
})
