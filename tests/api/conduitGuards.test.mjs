// Il condotto non decide sé stesso: chi scrive non può cambiare quel che il
// condotto concede (`registroDocenti.api.accesso`) né i percorsi dei programmi
// che il registro fa partire. Quelle chiavi si rifiutano con `non-permesso`
// prima del gestore; il resto delle impostazioni passa.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { presaRiconosciuta } from '../helpers/accesso.mjs'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-guardie-')

let api
let archivio
let condotto
let indirizzo

/** Tutto concesso: anche così il condotto non tocca le sue concessioni. */
const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.accesso': 'letturaScrittura',
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
async function chiedi (method, params) {
  const presa = await presaRiconosciuta(indirizzo)
  return new Promise((risolvi, rifiuta) => {
    let resto = ''
    const sveglia = setTimeout(() => {
      presa.destroy()
      rifiuta(new Error('il condotto non ha risposto'))
    }, 10000)
    presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })}\n`)
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
const accesso = () => api.impostazioni.leggi('registroDocenti.api').get('accesso')

describe('le chiavi che il condotto non tocca', () => {
  it('quel che il condotto concede non si cambia dal condotto', async () => {
    const busta = await chiedi('programma.salva', { chiave: 'registroDocenti.api.accesso', valore: 'lettura' })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
    assert.match(busta.error.message, /permessi del condotto non si cambiano dal condotto/)
    assert.equal(accesso(), 'letturaScrittura', 'l’impostazione è rimasta com’era')
  })

  it('nemmeno azzerandola, che la riporterebbe al predefinito', async () => {
    const busta = await chiedi('programma.azzera', { chiave: 'registroDocenti.api.accesso' })
    assert.equal(busta.error?.data?.codice, 'non-permesso', JSON.stringify(busta))
    assert.equal(accesso(), 'letturaScrittura')
  })

  it('le maiuscole non aprono un varco, e le chiavi di prima nemmeno', async () => {
    for (const chiave of ['registroDocenti.API.accesso', 'registroDocenti.api.condotto', 'registroDocenti.api.scrittura']) {
      const busta = await chiedi('programma.salva', { chiave, valore: true })
      assert.equal(busta.error?.data?.codice, 'non-permesso', `${chiave}: ${JSON.stringify(busta)}`)
    }
  })

  it('i percorsi dei programmi che il registro fa partire non si cambiano', async () => {
    for (const chiave of [
      'registroDocenti.ocr.lettore',
      'registroDocenti.ocr.programma',
      'registroDocenti.ocr.cartella',
      'registroDocenti.dettatura.programma',
      'registroDocenti.dettatura.cartella',
      'registroDocenti.recapiti.outlook',
      'registroDocenti.modelli.cartella',
      'registroDocenti.ocr.modello',
      'registroDocenti.ocr.proiettore',
      'registroDocenti.assistente.modello',
    ]) {
      const busta = await chiedi('programma.salva', { chiave, valore: 'C:\\altrove\\x.exe' })
      assert.equal(busta.error?.data?.codice, 'non-permesso', `${chiave}: ${JSON.stringify(busta)}`)
      assert.match(busta.error.message, /programmi che il registro fa partire/)
    }
  })

  it('la porta a cui va la voce della dettatura non si cambia', async () => {
    // Anche un servizio su questo computer: chi scrive dal condotto potrebbe
    // mettere la porta di un servizio suo e ricevere la voce dettata. L'indirizzo
    // di prima resta sbarrato, se tornasse.
    for (const [chiave, valore] of [
      ['registroDocenti.dettatura.porta', 9999],
      ['registroDocenti.dettatura.indirizzo', 'http://127.0.0.1:9999'],
    ]) {
      const busta = await chiedi('programma.salva', { chiave, valore })
      assert.equal(busta.error?.data?.codice, 'non-permesso', `${chiave}: ${JSON.stringify(busta)}`)
      assert.match(busta.error.message, /voce della dettatura/)
    }
  })

  it('le altre impostazioni del programma passano come prima', async () => {
    const busta = await chiedi('programma.salva', {
      chiave: 'registroDocenti.promemoria.avviso',
      valore: '10',
    })
    assert.equal(busta.error, undefined, JSON.stringify(busta))
    assert.equal(busta.result.ok, true)
  })
})

describe('«Lettura spenta» in Da smistare', () => {
  it('porta il pannello su Assistente e modelli, dove il modello si sceglie', async () => {
    // Prima apriva la finestra nativa, dove il modello si legge soltanto.
    const chieste = []
    api.registraNavigatore((navigazione) => chieste.push(navigazione))
    try {
      const busta = await chiedi('smistamento.lettura.impostazioni', {})
      assert.equal(busta.error, undefined, JSON.stringify(busta))
      assert.deepEqual(chieste, [{ tipo: 'naviga', vista: 'modelliLinguistici' }])
    } finally {
      api.registraNavigatore(null)
    }
  })
})
