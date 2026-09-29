// La riga di comando, lanciata come la lancia chi la usa. `cli/registro.mjs`
// non importa niente di `src/`, quindi due cose le sa da sé e possono divergere
// dal registro:
//
//   1. **l'indirizzo del condotto**, copia delle regole di `conduit.ts` (fuori
//      da Windows il socket sta in `XDG_RUNTIME_DIR`): si confrontano i due
//      calcoli, poi la riga di comando parla con un condotto vero;
//   2. **la conversione dei `--campo`** secondo lo schema (`--valore a@b.it` su
//      un campo qualunque è testo, `--voto ""` non è zero): un condotto finto
//      risponde lo schema e rimanda quel che ha ricevuto.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { condottoFinto, lanciatore } from '../helpers/cli.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-cli-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
/**
 * La cartella dei dati come la ricava la riga di comando da `APPDATA` (Windows)
 * o da `XDG_CONFIG_HOME` (altrove): passando `radice` a tutte e due, cade qui.
 */
const cartellaUtente = percorso.join(radice, 'Regiklass')
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
  // Importata e non lanciata: da modulo espone `indirizzo`.
  cli = await import('../../cli/registro.mjs')
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

const lancia = lanciatore(radice)

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
    // Le due funzioni vere, stessa macchina e stessa regola: si confrontano i
    // calcoli.
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
    // Il messaggio dice che cosa manca e dove, non solo «condotto spento».
    assert.match(errore, /non si è mai acceso/)
    assert.match(errore, /condotto\.segreto/)
    assert.match(errore, /REGISTRO_CONDOTTO/)
  })

  it('la riga di comando vera trova il condotto vero', async () => {
    const { Archivio, Uri, avviaCondotto, creaAnno } = api
    archivio = new Archivio(Uri.file(cartellaUtente))
    await archivio.apri(null)
    await archivio.creaAnno(
      creaAnno('2026-09-01', '2027-06-30'),
      Uri.file(percorso.join(dati, '2026-2027.regi')),
    )
    condotto = await avviaCondotto(archivio, { cartellaUtente })

    if (process.platform === 'win32') {
      // Il nome porta il segreto: l'impronta da sola si indovina.
      assert.match(api.indirizzoCondotto(), /regiklass-[0-9a-f]{12}-[0-9a-f]{32}$/)
    }

    const { codice, uscita, errore } = await lancia(['stato', '--json'])
    assert.equal(codice, 0, errore)
    const busta = JSON.parse(uscita)
    assert.deepEqual(busta.result.permessi, { lettura: true, scrittura: false })
  })

  it('dopo un arresto brutale con PID morto i residui vengono ripuliti', async () => {
    const sporca = mkdtempSync(percorso.join(radice, 'brutale-'))
    const cartellaDati = percorso.join(sporca, 'Regiklass')
    mkdirSync(cartellaDati, { recursive: true })
    const segreto = '0123456789abcdef0123456789abcdef'
    const chiave = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    // PID sicuramente non esistente
    writeFileSync(percorso.join(cartellaDati, 'condotto.pid'), '99999999', 'utf8')
    writeFileSync(percorso.join(cartellaDati, 'condotto.segreto'), segreto, 'utf8')
    writeFileSync(percorso.join(cartellaDati, 'condotto.chiave'), chiave, 'utf8')

    const { codice, errore } = await lancia(['stato'], { APPDATA: sporca })
    assert.equal(codice, 2, errore)
    assert.match(errore, /non risponde/)
    assert.equal(existsSync(percorso.join(cartellaDati, 'condotto.segreto')), false)
    assert.equal(existsSync(percorso.join(cartellaDati, 'condotto.pid')), false)
    assert.equal(existsSync(percorso.join(cartellaDati, 'condotto.chiave')), false)
  })
})

// ------------------------------------------------------------ il condotto finto

/**
 * Lo schema di `prova.eco` che il condotto finto dà: col suo eco mostra che
 * cosa la riga di comando ha fatto di ogni `--campo`.
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

  before(async () => { finto = await condottoFinto({ radice, schema: SCHEMA_ECO }) })
  after(() => finto.chiudi())

  const eco = (...argomenti) => finto.eco(...argomenti)

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
