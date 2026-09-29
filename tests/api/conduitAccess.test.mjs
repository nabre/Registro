// La presentazione al condotto: prima di `$accedi` con la prova giusta non si
// risponde niente, nemmeno `$versione`; una prova sbagliata o riusata chiude la
// connessione; il condotto dimostra a sua volta di avere la chiave, che nasce
// con l'accensione e se ne va con lo spegnimento.

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { prova } from '../../cli/accesso.mjs'
import { chiaveDiProva, presaRiconosciuta, rigaDiAccesso } from '../helpers/accesso.mjs'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-accesso-')

let api
let archivio
let condotto
let indirizzo

const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.condotto': true,
  'registroDocenti.api.lettura': true,
  'registroDocenti.api.scrittura': false,
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, impostazioni: PARTENZA, registra: false }))
  condotto = await api.avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = api.indirizzoCondotto()
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  smonta(radice, archivio)
})

/** Scrive del testo su una presa nuda e raccoglie buste e chiusura. */
function bussaNudo (testo, attesaMs = 10000) {
  return new Promise((risolvi, rifiuta) => {
    const presa = createConnection(indirizzo)
    const buste = []
    let resto = ''
    const sveglia = setTimeout(() => {
      presa.destroy()
      rifiuta(new Error(`il condotto non ha chiuso entro ${attesaMs} ms: ${JSON.stringify(buste)}`))
    }, attesaMs)
    presa.on('connect', () => presa.write(testo))
    presa.on('data', (pezzo) => {
      resto += pezzo.toString('utf8')
      let taglio = resto.indexOf('\n')
      while (taglio >= 0) {
        buste.push(JSON.parse(resto.slice(0, taglio)))
        resto = resto.slice(taglio + 1)
        taglio = resto.indexOf('\n')
      }
    })
    presa.on('close', () => {
      clearTimeout(sveglia)
      risolvi(buste)
    })
    presa.on('error', () => undefined)
  })
}

const riga = (oggetto) => `${JSON.stringify({ jsonrpc: '2.0', ...oggetto })}\n`
const sfidaNuova = () => randomBytes(32).toString('hex')

describe('prima di presentarsi', () => {
  it('nemmeno $versione risponde: rifiuto e connessione chiusa', async () => {
    const buste = await bussaNudo(riga({ id: 1, method: '$versione' }))
    assert.equal(buste.length, 1, JSON.stringify(buste))
    assert.equal(buste[0].error?.data?.codice, 'non-permesso')
    assert.match(buste[0].error.message, /\$accedi/)
  })

  it('le righe già in coda dietro al rifiuto non si eseguono, nemmeno un $accedi giusto', async () => {
    const buste = await bussaNudo(
      riga({ id: 1, method: '$elenco' }) + rigaDiAccesso(sfidaNuova(), { id: 2 }) +
      riga({ id: 3, method: '$versione' }))
    assert.deepEqual(buste.map((b) => b.id), [1])
  })
})

describe('$accedi', () => {
  it('con la prova giusta il condotto risponde con la sua, e da lì si chiama', async () => {
    const sfida = sfidaNuova()
    const buste = []
    const presa = createConnection(indirizzo)
    let resto = ''
    await new Promise((risolvi) => {
      presa.on('connect', () => presa.write(rigaDiAccesso(sfida) + riga({ id: 2, method: '$versione' })))
      presa.on('data', (pezzo) => {
        resto += pezzo.toString('utf8')
        let taglio = resto.indexOf('\n')
        while (taglio >= 0) {
          buste.push(JSON.parse(resto.slice(0, taglio)))
          resto = resto.slice(taglio + 1)
          taglio = resto.indexOf('\n')
        }
        if (buste.length >= 2) risolvi()
      })
    })
    presa.destroy()
    assert.equal(buste[0].result.prova, prova(chiaveDiProva(), 'condotto', sfida))
    assert.deepEqual(buste[1].result.permessi, { lettura: true, scrittura: false })
  })

  it('una prova sbagliata chiude la connessione', async () => {
    const altra = randomBytes(32)
    const buste = await bussaNudo(
      rigaDiAccesso(sfidaNuova(), { chiave: altra }) + riga({ id: 2, method: '$versione' }))
    assert.deepEqual(buste.map((b) => b.error?.data?.codice), ['non-permesso'])
  })

  it('una sfida già usata non vale una seconda volta', async () => {
    const sfida = sfidaNuova()
    const prima = await bussaNudo(rigaDiAccesso(sfida) + riga({ id: 'fine', method: '$accedi' }))
    assert.ok(prima[0].result?.prova, JSON.stringify(prima))
    const seconda = await bussaNudo(rigaDiAccesso(sfida))
    assert.equal(seconda[0].error?.data?.codice, 'non-permesso')
  })

  it('senza sfida o prova in esadecimale si rifiuta', async () => {
    const buste = await bussaNudo(riga({ id: 1, method: '$accedi', params: { sfida: 'x', prova: 'y' } }))
    assert.equal(buste[0].error?.data?.codice, 'non-permesso')
  })

  it('una presa riconosciuta resta aperta e risponde', async () => {
    const presa = await presaRiconosciuta(indirizzo)
    assert.ok(!presa.destroyed)
    presa.destroy()
  })
})

describe('la chiave', () => {
  const file = () => percorso.join(process.env.REGISTRO_USERDATA, 'condotto.chiave')

  it('nasce a ogni accensione e se ne va con lo spegnimento', async () => {
    const prima = readFileSync(file(), 'utf8').trim()
    assert.match(prima, /^[0-9a-f]{64}$/)

    condotto.dispose()
    await condotto.svuotato()
    assert.ok(!existsSync(file()), 'la chiave è rimasta dopo lo spegnimento')

    condotto = await api.avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
    indirizzo = api.indirizzoCondotto()
    const seconda = readFileSync(file(), 'utf8').trim()
    assert.notEqual(seconda, prima)

    // Una prova fatta con la chiave vecchia non apre più.
    const buste = await bussaNudo(rigaDiAccesso(sfidaNuova(), { chiave: Buffer.from(prima, 'hex') }))
    assert.equal(buste[0].error?.data?.codice, 'non-permesso')
  })
})
