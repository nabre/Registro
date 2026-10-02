// «Azzera» della posta è una chiamata sola: il gettone, gli indirizzi e i
// tenant ricordati, e ogni voce `registroDocenti.posta.*`, anche quelle che il
// manifesto non dichiara più e che `programma.azzera` rifiuterebbe.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-posta-azzera-')

let api
let archivio

const SCRITTE = {
  'registroDocenti.posta.utente': 'docente@scuola.ch',
  'registroDocenti.posta.mittente': 'segreteria@scuola.ch',
  'registroDocenti.posta.invioDiretto': true,
  // Non più nel manifesto: resta nei file vecchi.
  'registroDocenti.posta.tenant': 'scuola.ch',
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    impostazioni: { cartellaLavoro: lavoro, ...SCRITTE },
  }))
})

after(() => smonta(radice, archivio))

describe('posta.azzera', () => {
  it('toglie in una chiamata tutte le voci della casella, anche quelle dismesse', async () => {
    const scritta = (chiave) => api.impostazioni.leggi().inspect(chiave)?.globalValue
    for (const [chiave, valore] of Object.entries(SCRITTE)) assert.equal(scritta(chiave), valore)

    const esito = await api.chiama(archivio, 'posta.azzera', {})
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))

    for (const chiave of Object.keys(SCRITTE)) assert.equal(scritta(chiave), undefined, chiave)
    assert.equal(scritta('cartellaLavoro'), lavoro, 'il resto delle impostazioni non si tocca')
  })

  it('di nuovo, su una casella già azzerata, risponde lo stesso', async () => {
    const esito = await api.chiama(archivio, 'posta.azzera', {})
    assert.equal(esito.ok, true)
  })
})
