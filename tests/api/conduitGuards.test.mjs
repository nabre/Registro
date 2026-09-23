// Il condotto non allarga sé stesso.
//
// I permessi del condotto si rileggono a ogni chiamata, ed è giusto: uno
// spegnimento deve valere subito. Ma vuol dire anche che chi ha la scrittura
// poteva **scriversi la lettura**: con il condotto in «scrittura sì, lettura
// no», uno script chiamava `programma.salva` su `registroDocenti.api.lettura` e
// dalla chiamata dopo leggeva tutto. Lo stesso per i percorsi dei programmi che
// il registro fa partire — cambiarli dal condotto è far eseguire al registro
// un programma qualunque.
//
// Qui si prova che quelle chiavi si rifiutano con `non-permesso`, prima di
// arrivare al gestore, e che il resto delle impostazioni passa come prima.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-guardie-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let condotto
let indirizzo

/** «Scrittura sì, lettura no»: la configurazione in cui il buco si vedeva. */
const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.condotto': true,
  'registroDocenti.api.lettura': false,
  'registroDocenti.api.scrittura': true,
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify(PARTENZA),
  )

  api = await import('../../dist-tests/api.mjs')
  const { Archivio, Uri, avviaCondotto, creaAnno, indirizzoCondotto } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )

  condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
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

  it('le altre impostazioni del programma passano come prima', async () => {
    const busta = await chiedi('programma.salva', {
      chiave: 'registroDocenti.promemoria.anticipoMinuti',
      valore: 10,
    })
    assert.equal(busta.error, undefined, JSON.stringify(busta))
    assert.equal(busta.result.ok, true)
  })
})
