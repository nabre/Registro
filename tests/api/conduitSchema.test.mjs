// Il condotto:
//
//   1. la coda piena risponde con l'`id` della richiesta;
//   2. lo stesso per il tetto dei 16 MiB accodati;
//   3. un codice d'errore ignoto al contratto esce comunque con un `code`.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { presaRiconosciuta } from '../helpers/accesso.mjs'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-condotto-')

let api
let archivio
let condotto
let indirizzo

/** La scrittura che si ferma finché la prova non la sblocca. */
let sblocca = () => undefined

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    impostazioni: {
      cartellaLavoro: lavoro,
    },
    registra: false,
  }))
  const { avviaCondotto, definisci, indirizzoCondotto, registra } = api
  const { SCRITTURA, schemi } = api

  registra(
    definisci({
      nome: 'prova.erma',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Aspetta che la prova la sblocchi, per tenere piena la coda',
      idempotente: true,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: async (ambito) => {
        await new Promise((risolvi) => { sblocca = risolvi })
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'prova.odiceIgnoto',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Lancia un errore con un codice che il contratto non conosce',
      idempotente: true,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: () => {
        const male = new Error('codice ignoto')
        male.codice = 'boh'
        male.messaggi = ['Un codice che il contratto non conosce.']
        throw male
      },
    }),
  )

  condotto = await avviaCondotto(archivio, {
    cartellaUtente: process.env.REGISTRO_USERDATA,
    permessi: { lettura: true, scrittura: true },
  })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  sblocca()
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

/**
 * Una connessione che raccoglie le buste man mano che arrivano, e sa aspettare
 * quella che soddisfa una condizione.
 */
async function apri () {
  const presa = await presaRiconosciuta(indirizzo)
  const buste = []
  let resto = ''
  const attese = []
  presa.on('data', (pezzo) => {
    resto += pezzo.toString('utf8')
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      buste.push(JSON.parse(resto.slice(0, taglio)))
      resto = resto.slice(taglio + 1)
      taglio = resto.indexOf('\n')
    }
    for (const attesa of [...attese]) attesa()
  })
  presa.on('error', () => undefined)
  const aspetta = (condizione) => new Promise((risolvi, rifiuta) => {
    const sveglia = setTimeout(() => rifiuta(new Error(
      `il condotto non ha risposto quel che serviva: ${JSON.stringify(buste.slice(-3))}`)), 15000)
    const guarda = () => {
      if (!condizione(buste)) return
      clearTimeout(sveglia)
      attese.splice(attese.indexOf(guarda), 1)
      risolvi(buste)
    }
    attese.push(guarda)
    guarda()
  })
  return { presa, buste, aspetta }
}

const riga = (id, method, params) => `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`

describe('il codice che il contratto non conosce', () => {
  it('esce comunque con un «code» numerico', async () => {
    const busta = await chiedi('prova.odiceIgnoto', {})
    assert.ok(busta.error, JSON.stringify(busta))
    assert.equal(typeof busta.error.code, 'number', `busta senza code: ${JSON.stringify(busta)}`)
    assert.equal(busta.error.code, -32603)
  })
})

describe('i rifiuti della coda portano l’id della riga', () => {
  it('la coda piena risponde a ogni id, non a null', async () => {
    const { presa, aspetta } = await apri()
    try {
      presa.write(riga('ferma', 'prova.erma', {}))
      // Mentre `ferma` aspetta, le 130 righe dopo si accodano: le prime 127
      // entrano, le ultime tre trovano la coda piena.
      let tutte = ''
      for (let i = 0; i < 130; i++) tutte += riga(i, '$versione', {})
      presa.write(tutte)
      const rifiuti = (buste) => buste.filter((b) => b.error?.data?.codice === 'non-disponibile')
      const prime = await aspetta((buste) => rifiuti(buste).length >= 3)
      assert.deepEqual(rifiuti(prime).map((b) => b.id), [127, 128, 129])

      sblocca()
      const tutteLeBuste = await aspetta((buste) => buste.length >= 131)
      assert.equal(tutteLeBuste.filter((b) => b.id === null).length, 0, 'una busta a id null')
    } finally {
      presa.destroy()
    }
  })

  it('il tetto dei 16 MiB risponde all’id della riga che lo supera', async () => {
    const { presa, aspetta } = await apri()
    try {
      presa.write(riga('ferma', 'prova.erma', {}))
      // Diciassette righe da un milione di caratteri: ognuna sotto il tetto di
      // 1 MiB per riga, tutte insieme sopra i 16 MiB accodati.
      const zavorra = 'a'.repeat(1_000_000)
      for (let i = 0; i < 17; i++) presa.write(riga(`g-${i}`, '$versione', { zavorra }))
      const [rifiuto] = await aspetta((buste) => buste.some((b) => b.error))
      assert.equal(rifiuto.error.data.codice, 'non-disponibile', JSON.stringify(rifiuto))
      assert.match(rifiuto.error.message, /16 MiB/)
      assert.equal(rifiuto.id, 'g-16')
    } finally {
      sblocca()
      presa.destroy()
    }
  })
})
