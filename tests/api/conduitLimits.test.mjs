// I limiti del condotto:
//
//   1. dopo un JSON rotto la presa si chiude e le righe già in coda dallo
//      stesso pacchetto non si eseguono;
//   2. una connessione oltre il tetto riceve la busta con un ascoltatore di
//      `'error'`, così l'`EPIPE` di un cliente già andato non diventa
//      un'eccezione non catturata;
//   3. la coda piena non risponde alle notifiche (JSON-RPC 2.0 §4.1);
//   4. la coda di una presa chiusa resta fra quelle che lo spegnimento aspetta;
//   5. il segreto del nome della pipe cambia a ogni accensione.
//
// L'ordine conta: la quarta spegne il condotto, la quinta lo riaccende due
// volte, e `after` spegne l'ultimo.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro13-condotto-')

let api
let archivio
let condotto
let indirizzo

/** Quante volte `giro13.segna` è stata eseguita. */
let segnate = 0
/** Quante `giro13.ferma` sono arrivate in fondo. */
let finite = 0
/** Chi aspetta che una `giro13.ferma` cominci, e chi la sblocca. */
let partita = () => undefined
const sblocchi = []
const sblocca = () => { for (const via of sblocchi.splice(0)) via() }

const pausa = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    impostazioni: {
      cartellaLavoro: lavoro,
      'registroDocenti.api.condotto': true,
      'registroDocenti.api.lettura': true,
      'registroDocenti.api.scrittura': true,
    },
    registra: false,
  }))
  const { avviaCondotto, definisci, indirizzoCondotto, registra } = api
  const { SCRITTURA, schemi } = api

  registra(
    definisci({
      nome: 'giro13.segna',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Conta le volte in cui è stata eseguita',
      idempotente: false,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: (ambito) => {
        segnate += 1
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'giro13.ferma',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Aspetta che la prova la sblocchi',
      idempotente: true,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: async (ambito) => {
        partita()
        await new Promise((risolvi) => { sblocchi.push(risolvi) })
        finite += 1
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
  )

  condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  sblocca()
  condotto?.dispose()
  await condotto?.svuotato()
  smonta(radice, archivio)
})

/** Una connessione che raccoglie le buste e sa dire se il condotto l'ha chiusa. */
async function apri () {
  const presa = createConnection(indirizzo)
  await new Promise((risolvi, rifiuta) => {
    presa.once('connect', risolvi)
    presa.once('error', rifiuta)
  })
  const stato = { buste: [], chiusa: false }
  let resto = ''
  presa.on('data', (pezzo) => {
    resto += pezzo.toString('utf8')
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      stato.buste.push(JSON.parse(resto.slice(0, taglio)))
      resto = resto.slice(taglio + 1)
      taglio = resto.indexOf('\n')
    }
  })
  presa.on('end', () => { stato.chiusa = true })
  presa.on('close', () => { stato.chiusa = true })
  presa.on('error', () => undefined)
  return { presa, stato }
}

/** Aspetta che una condizione diventi vera, o fallisce dicendo che cosa c'era. */
async function finché (condizione, racconto, ms = 10000) {
  const fine = Date.now() + ms
  while (!condizione()) {
    if (Date.now() > fine) throw new Error(`scaduto: ${racconto()}`)
    await pausa(10)
  }
}

const riga = (oggetto) => `${JSON.stringify({ jsonrpc: '2.0', ...oggetto })}\n`

describe('dopo un JSON rotto', () => {
  it('le righe già arrivate dietro non si eseguono', async () => {
    const revisione = archivio.revisione
    const { presa, stato } = await apri()
    try {
      // Un `write` solo: le due righe finiscono in coda insieme, prima che la prima
      // sia letta.
      presa.write(`{rotto\n${riga({ id: 2, method: 'giro13.segna', params: {} })}`)
      await finché(() => stato.chiusa, () => JSON.stringify(stato))
      // Il tempo di un giro della coda, se la seconda riga ci fosse ancora.
      await pausa(200)
      assert.equal(segnate, 0, 'la scrittura dietro al JSON rotto è stata eseguita')
      assert.equal(archivio.revisione, revisione)
      assert.deepEqual(stato.buste.map((b) => b.error?.code), [-32700])
    } finally {
      presa.destroy()
    }
  })
})

describe('la trentatreesima connessione', () => {
  it('un cliente che se ne va subito non fa cadere il processo', async () => {
    // `node:test` non conta le eccezioni non catturate come fallimenti della
    // prova: si raccolgono qui.
    const cadute = []
    const raccogli = (male) => cadute.push(male)
    process.on('uncaughtException', raccogli)
    const tenute = []
    try {
      for (let i = 0; i < 32; i++) tenute.push((await apri()).presa)
      // Quella che resta e legge riceve la diagnosi.
      const { presa, stato } = await apri()
      await finché(() => stato.buste.length > 0, () => JSON.stringify(stato))
      assert.equal(stato.buste[0].error.data.codice, 'non-disponibile')
      presa.destroy()
      // Connessioni che se ne vanno appena aperte: la busta trova la presa chiusa.
      for (let i = 0; i < 30; i++) {
        const fuga = createConnection(indirizzo)
        fuga.on('error', () => undefined)
        fuga.on('connect', () => fuga.destroy())
      }
      await pausa(300)
      assert.deepEqual(cadute.map((male) => male.message), [], 'eccezioni non catturate')
    } finally {
      process.off('uncaughtException', raccogli)
      for (const presa of tenute) presa.destroy()
      // Il condotto deve vedere le chiusure prima della prova dopo.
      await pausa(200)
    }
  })
})

describe('la coda piena', () => {
  it('alle notifiche non risponde, alle richieste sì', async () => {
    const { presa, stato } = await apri()
    try {
      // `ferma` tiene la coda, le 127 notifiche dopo la riempiono fino a 128.
      let testo = riga({ id: 'ferma', method: 'giro13.ferma', params: {} })
      for (let i = 0; i < 127; i++) testo += riga({ method: '$versione' })
      // Tre notifiche di troppo e una richiesta di troppo.
      for (let i = 0; i < 3; i++) testo += riga({ method: '$versione' })
      testo += riga({ id: 'oltre', method: '$versione' })
      presa.write(testo)
      await finché(() => stato.buste.some((b) => b.id === 'oltre'), () => JSON.stringify(stato))
      await pausa(100)
      assert.deepEqual(stato.buste.map((b) => b.id), ['oltre'],
        'una busta per ogni notifica rifiutata')
      assert.equal(stato.buste[0].error.data.codice, 'non-disponibile')
      sblocca()
      await finché(() => stato.buste.some((b) => b.id === 'ferma'), () => JSON.stringify(stato))
    } finally {
      sblocca()
      presa.destroy()
    }
  })
})

describe('lo spegnimento', () => {
  it('aspetta la notifica di un cliente che se n’è già andato', async () => {
    const prima = finite
    const cominciata = new Promise((risolvi) => { partita = risolvi })
    const { presa } = await apri()
    // Manda e chiude: il modo normale di mandare una notifica.
    presa.write(riga({ method: 'giro13.ferma', params: {} }))
    await cominciata
    presa.destroy()
    // Il tempo perché il condotto veda la chiusura della presa.
    await pausa(200)

    condotto.dispose()
    const svuotato = condotto.svuotato()
    const vinto = await Promise.race([
      svuotato.then(() => 'svuotato'),
      pausa(400).then(() => 'in attesa'),
    ])
    assert.equal(vinto, 'in attesa', 'lo spegnimento non ha aspettato la chiamata in volo')
    sblocca()
    await svuotato
    assert.equal(finite, prima + 1)
    condotto = null
  })
})

describe('il segreto del nome della pipe', () => {
  const leggi = () => readFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'condotto.segreto'), 'utf8').trim()

  it('si rifà a ogni accensione', {
    skip: process.platform !== 'win32' && 'la pipe col segreto è di Windows',
  }, async () => {
    const { avviaCondotto, indirizzoCondotto } = api
    const primo = leggi()
    assert.match(primo, /^[0-9a-f]{32}$/)

    condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
    const secondo = leggi()
    assert.match(secondo, /^[0-9a-f]{32}$/)
    assert.notEqual(secondo, primo, 'il segreto è rimasto lo stesso fra due accensioni')
    assert.ok(indirizzoCondotto().endsWith(`-${secondo}`))

    // E il nome nuovo risponde davvero.
    indirizzo = indirizzoCondotto()
    const { presa, stato } = await apri()
    presa.write(riga({ id: 1, method: '$versione' }))
    await finché(() => stato.buste.length > 0, () => JSON.stringify(stato))
    assert.ok(stato.buste[0].result)
    presa.destroy()

    condotto.dispose()
    await condotto.svuotato()
    condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
    assert.notEqual(leggi(), secondo)
  })
})
