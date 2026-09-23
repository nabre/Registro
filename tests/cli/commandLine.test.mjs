// La riga di comando, provata da fuori: come la lancia chi la usa.
//
// `src/cli/registro.mjs` non si compila e non importa niente di `src/` — è la
// scelta scritta in testa al file — e per questo le due cose che deve sapere da
// sé sono le due che possono divergere dal registro senza che niente protesti:
//
//   1. **l'indirizzo del condotto**, che calcola con una copia delle regole di
//      `conduit.ts`. La copia era rimasta indietro: il socket in `tmpdir()`
//      mentre il registro lo apre in `XDG_RUNTIME_DIR`, cioè «condotto spento»
//      su ogni desktop Linux. Qui si confrontano i due calcoli con la regola
//      accesa, e poi la riga di comando vera parla con un condotto vero;
//   2. **la conversione dei `--campo`**, che guarda lo schema. Un campo che
//      ammette qualunque cosa provava il numero per primo, e `--valore a@b.it`
//      tornava «vuole un numero»; `--voto ""` partiva come zero. Qui la riga di
//      comando parla con un condotto finto che risponde lo schema e rimanda
//      indietro quel che ha ricevuto.

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const CLI = fileURLToPath(new URL('../../src/cli/registro.mjs', import.meta.url))

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-cli-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
/**
 * La cartella dei dati come la ricava la riga di comando da `APPDATA` (Windows)
 * o da `XDG_CONFIG_HOME` (altrove): passando `radice` a tutte e due, cade qui.
 */
const cartellaUtente = percorso.join(radice, 'Registro docenti')
process.env.REGISTRO_USERDATA = cartellaUtente

/** Dove nasce il socket fuori da Windows: la regola che la riga di comando ignorava. */
const corsa = percorso.join(radice, 'corsa')
mkdirSync(corsa, { recursive: true })
if (process.platform !== 'win32') process.env.XDG_RUNTIME_DIR = corsa
delete process.env.REGISTRO_CONDOTTO

let api
let cli
let archivio
let condotto

before(async () => {
  mkdirSync(cartellaUtente, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(cartellaUtente, 'impostazioni.json'),
    JSON.stringify({
      cartellaLavoro: lavoro,
      'registroDocenti.api.condotto': true,
      'registroDocenti.api.lettura': true,
      'registroDocenti.api.scrittura': false,
    }),
  )

  api = await import('../../dist-tests/api.mjs')
  // Importata e non lanciata: la riga di comando parte solo quando è lei il
  // programma, e da modulo espone `indirizzo`.
  cli = await import('../../src/cli/registro.mjs')
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

/**
 * Lancia la riga di comando e raccoglie quel che dice.
 *
 * L'ambiente è quello della prova più `APPDATA` e `XDG_CONFIG_HOME` puntati
 * alla radice, così che la cartella dei dati sia quella del condotto acceso qui
 * e non quella vera di chi sta eseguendo `npm test`.
 */
function lancia (argomenti, ambiente = {}) {
  return new Promise((risolvi, rifiuta) => {
    const figlio = spawn(process.execPath, [CLI, ...argomenti], {
      env: {
        ...process.env,
        APPDATA: radice,
        XDG_CONFIG_HOME: radice,
        REGISTRO_COMANDO: 'registro',
        ...ambiente,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let uscita = ''
    let errore = ''
    figlio.stdout.on('data', (pezzo) => { uscita += pezzo })
    figlio.stderr.on('data', (pezzo) => { errore += pezzo })
    figlio.on('error', rifiuta)
    figlio.on('close', (codice) => risolvi({ codice, uscita, errore }))
  })
}

/** Cambia per un momento la piattaforma che vede tutto il processo. */
function comeSe (piattaforma, fare) {
  const vera = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...vera, value: piattaforma })
  try {
    return fare()
  } finally {
    Object.defineProperty(process, 'platform', vera)
  }
}

describe('l’indirizzo del condotto', () => {
  it('fuori da Windows, con XDG_RUNTIME_DIR, è lo stesso per il registro e per la riga di comando', () => {
    // Le due funzioni vere, sulla stessa macchina e con la stessa regola accesa:
    // non si ricalcola niente qui, si confrontano i due calcoli.
    const prima = process.env.XDG_RUNTIME_DIR
    process.env.XDG_RUNTIME_DIR = corsa
    try {
      comeSe('linux', () => {
        const delRegistro = api.indirizzoCondotto()
        const dellaRiga = cli.indirizzo()
        assert.ok(delRegistro.startsWith(corsa), `il registro ascolta in XDG_RUNTIME_DIR: ${delRegistro}`)
        assert.equal(dellaRiga, delRegistro)
      })
    } finally {
      if (prima === undefined) delete process.env.XDG_RUNTIME_DIR
      else process.env.XDG_RUNTIME_DIR = prima
    }
  })

  it('su Windows, senza il segreto scritto dal condotto, la riga di comando non bussa a nessuno', {
    skip: process.platform !== 'win32' && 'la pipe col segreto è di Windows',
  }, async () => {
    const vuota = mkdtempSync(percorso.join(radice, 'vuota-'))
    const { codice, errore } = await lancia(['stato'], { APPDATA: vuota })
    assert.equal(codice, 2, errore)
    assert.match(errore, /non risponde sul condotto/)
  })

  it('la riga di comando vera trova il condotto vero', async () => {
    const { Archivio, Uri, avviaCondotto, creaAnno } = api
    archivio = new Archivio(Uri.file(cartellaUtente))
    await archivio.apri(null)
    await archivio.creaAnno(
      creaAnno('2026-09-01', '2027-06-30'),
      Uri.file(percorso.join(dati, '2026-2027.registro')),
    )
    condotto = await avviaCondotto(archivio, { cartellaUtente })

    if (process.platform === 'win32') {
      // Il nome porta il segreto: l'impronta da sola si indovina.
      assert.match(api.indirizzoCondotto(), /registro-docenti-[0-9a-f]{12}-[0-9a-f]{32}$/)
    }

    const { codice, uscita, errore } = await lancia(['stato', '--json'])
    assert.equal(codice, 0, errore)
    const busta = JSON.parse(uscita)
    assert.deepEqual(busta.result.permessi, { lettura: true, scrittura: false })
  })
})

// ------------------------------------------------------------ il condotto finto

/**
 * Un condotto che sa due cose: lo schema di `prova.eco`, e rimandare indietro
 * l'ingresso che riceve. Basta a vedere che cosa la riga di comando ha fatto
 * di ogni `--campo`, senza che niente del registro ci metta le mani.
 */
const SCHEMA_ECO = {
  type: 'object',
  properties: {
    valore: { type: ['string', 'number', 'boolean', 'object', 'array', 'null'] },
    voto: { type: ['number', 'null'] },
    sigla: { type: 'string' },
  },
}

describe('la conversione dei --campo', () => {
  let finto
  let dove

  before(async () => {
    const nome = `registro-cli-finto-${randomBytes(6).toString('hex')}`
    dove = process.platform === 'win32'
      ? `\\\\.\\pipe\\${nome}`
      : percorso.join(radice, `${nome}.sock`)
    finto = createServer((presa) => {
      let resto = ''
      presa.on('data', (pezzo) => {
        resto += pezzo.toString('utf8')
        let taglio = resto.indexOf('\n')
        while (taglio >= 0) {
          const richiesta = JSON.parse(resto.slice(0, taglio))
          resto = resto.slice(taglio + 1)
          const result = richiesta.method === '$schema'
            ? { nome: 'prova.eco', ingresso: SCHEMA_ECO }
            : { ok: true, dati: richiesta.params }
          presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: richiesta.id, result })}\n`)
          taglio = resto.indexOf('\n')
        }
      })
      presa.on('error', () => undefined)
    })
    await new Promise((risolvi) => finto.listen(dove, risolvi))
  })

  after(() => new Promise((risolvi) => finto.close(() => risolvi())))

  const eco = async (...argomenti) => {
    const esito = await lancia(['chiama', 'prova.eco', ...argomenti], { REGISTRO_CONDOTTO: dove })
    return { ...esito, dati: esito.codice === 0 ? JSON.parse(esito.uscita) : null }
  }

  it('un campo largo prende il testo com’è, se non è altro', async () => {
    const { codice, dati, errore } = await eco('--valore', 'a@b.it')
    assert.equal(codice, 0, errore)
    assert.deepEqual(dati, { valore: 'a@b.it' })
  })

  it('un campo largo prende vero e falso, i numeri e il JSON', async () => {
    assert.deepEqual((await eco('--valore', 'vero')).dati, { valore: true })
    assert.deepEqual((await eco('--valore', 'falso')).dati, { valore: false })
    assert.deepEqual((await eco('--valore', '12')).dati, { valore: 12 })
    assert.deepEqual((await eco('--valore', '1')).dati, { valore: 1 }, '«1» su un campo largo è un numero')
    assert.deepEqual((await eco('--valore', '{"a":1}')).dati, { valore: { a: 1 } })
    assert.deepEqual((await eco('--valore', 'null')).dati, { valore: null })
  })

  it('un numero vuoto si rifiuta invece di diventare zero', async () => {
    const { codice, errore } = await eco('--voto', '')
    assert.equal(codice, 1)
    assert.match(errore, /«voto» vuole un numero/)
  })

  it('i campi stretti restano come prima', async () => {
    assert.deepEqual((await eco('--voto', '7.5')).dati, { voto: 7.5 })
    assert.deepEqual((await eco('--sigla', '0123')).dati, { sigla: '0123' })
  })
})

describe('i comandi', () => {
  it('«chiedi» dice che non c’è più, e dove si fa', async () => {
    const { codice, errore } = await lancia(['chiedi', 'quante ore ha perso Rossi?'])
    assert.equal(codice, 1)
    assert.match(errore, /riquadro «Assistente»/)
  })
})
