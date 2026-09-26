// Il condotto non allarga sé stesso: chi ha la scrittura non può scriversi la
// lettura (`registroDocenti.api.lettura`) né cambiare i percorsi dei programmi
// che il registro fa partire. Quelle chiavi si rifiutano con `non-permesso`
// prima del gestore; il resto delle impostazioni passa.

import assert from 'node:assert/strict'
import { createConnection } from 'node:net'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-guardie-')

let api
let archivio
let condotto
let indirizzo

/** «Scrittura sì, lettura no»: la configurazione da difendere. */
const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.condotto': true,
  'registroDocenti.api.lettura': false,
  'registroDocenti.api.scrittura': true,
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    impostazioni: PARTENZA,
    registra: false,
  }))
  const { avviaCondotto, indirizzoCondotto } = api

  condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  smonta(radice, archivio)
})

/** Una richiesta, una busta. */
function chiedi (method, params) {
  return new Promise((risolvi, rifiuta) => {
    let resto = ''
    const presa = createConnection(indirizzo)
    const sveglia = setTimeout(() => {
      presa.destroy()
      rifiuta(new Error('il condotto non ha risposto'))
    }, 10000)
    presa.on('connect', () => presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })}\n`))
    presa.on('data', (pezzo) => {
      resto += pezzo.toString('utf8')
      const taglio = resto.indexOf('\n')
      if (taglio < 0) return
      clearTimeout(sveglia)
      presa.destroy()
      risolvi(JSON.parse(resto.slice(0, taglio)))
    })
    presa.on('error', (male) => {
      clearTimeout(sveglia)
      rifiuta(male)
    })
  })
}

/** Il valore scritto nelle impostazioni, come lo leggerebbe il condotto. */
const lettura = () => api.impostazioni.leggi('registroDocenti.api').get('lettura', true)

describe('le chiavi che il condotto non tocca', () => {
  it('con la sola scrittura, la lettura non si concede da sé', async () => {
    const busta = await chiedi('programma.salva', { chiave: 'registroDocenti.api.lettura', valore: true })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
    assert.match(busta.error.message, /permessi del condotto non si cambiano dal condotto/)
    assert.equal(lettura(), false, 'l’impostazione è rimasta com’era')

    // E dalla chiamata dopo si continua a non leggere.
    const elenco = await chiedi('$elenco', {})
    assert.equal(elenco.error?.data?.codice, 'non-permesso')
  })

  it('nemmeno azzerandola, che la riporterebbe al predefinito acceso', async () => {
    const busta = await chiedi('programma.azzera', { chiave: 'registroDocenti.api.lettura' })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
    assert.equal(lettura(), false)
  })

  it('le maiuscole non aprono un varco', async () => {
    const busta = await chiedi('programma.salva', { chiave: 'registroDocenti.API.condotto', valore: true })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
  })

  it('i percorsi dei programmi che il registro fa partire non si cambiano', async () => {
    for (const chiave of [
      'registroDocenti.ocr.programma',
      'registroDocenti.ocr.cartella',
      'registroDocenti.dettatura.programma',
      'registroDocenti.dettatura.cartella',
      'registroDocenti.recapiti.outlook',
    ]) {
      const busta = await chiedi('programma.salva', { chiave, valore: 'C:\\altrove\\x.exe' })
      assert.equal(busta.error?.data?.codice, 'non-permesso', `${chiave}: ${JSON.stringify(busta)}`)
      assert.match(busta.error.message, /programmi che il registro fa partire/)
    }
  })

  it('l’indirizzo a cui va la voce della dettatura non si cambia', async () => {
    // Anche un servizio su questo computer: chi scrive dal condotto potrebbe
    // mettere la porta di un servizio suo e ricevere la voce dettata.
    const busta = await chiedi('programma.salva', {
      chiave: 'registroDocenti.dettatura.indirizzo',
      valore: 'http://127.0.0.1:9999',
    })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
    assert.match(busta.error.message, /voce della dettatura/)
  })

  it('le altre impostazioni del programma passano come prima', async () => {
    const busta = await chiedi('programma.salva', {
      chiave: 'registroDocenti.promemoria.anticipoMinuti',
      valore: 10,
    })
    assert.equal(busta.error, undefined, JSON.stringify(busta))
    assert.equal(busta.result.ok, true)
  })
})
