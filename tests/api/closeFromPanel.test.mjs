// «Chiudi l'anno» ed «Esci» chiesti dal pannello: il guscio aspetta che le
// richieste del pannello finiscano, compresa quella che l'ha chiamato. Quindi
// l'azione risponde senza aspettare il comando, qui un comando che non finisce
// mai.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-chiudi-')
const { api, archivio } = await archivioDiProva({ lavoro, dati })
after(() => smonta(radice, archivio))

/** Un comando che parte e non finisce: il guscio che aspetta il pannello. */
function comandoAppeso (id) {
  let chiamato = 0
  api.comandi.registra(id, () => {
    chiamato += 1
    return new Promise(() => {})
  })
  return () => chiamato
}

/** L'esito dell'azione, o `'appesa'` se non arriva entro mezzo secondo. */
function entroPoco (promessa) {
  return Promise.race([promessa, new Promise((risolvi) => setTimeout(() => risolvi('appesa'), 500))])
}

describe('le azioni che chiudono il pannello', () => {
  it('«Chiudi l’anno» risponde senza aspettare il guscio', async () => {
    const chiamato = comandoAppeso('registroDocenti.chiudiDocumento')
    const esito = await entroPoco(api.esegui(archivio, { tipo: 'documento.chiudi' }))
    assert.notEqual(esito, 'appesa')
    assert.equal(esito.ok, true)
    assert.equal(chiamato(), 1)
  })

  it('«Esci» risponde senza aspettare lo spegnimento', async () => {
    const chiamato = comandoAppeso('registroDocenti.esci')
    const esito = await entroPoco(api.esegui(archivio, { tipo: 'programma.esci' }))
    assert.notEqual(esito, 'appesa')
    assert.equal(esito.ok, true)
    assert.equal(chiamato(), 1)
  })
})
