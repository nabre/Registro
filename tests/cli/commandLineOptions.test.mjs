// La riga di comando:
//
//   1. con «scrittura sì, lettura no» le scritture si raggiungono (`chiama`
//      chiede `$schema` prima di tutto); una lettura si rifiuta senza mandare
//      a `regi elenco`, che vuole la lettura;
//   2. un campo di testo senza valore è un errore d'uso, non la parola «vero»;
//   3. `--json` e `--campo` sullo stesso campo: vince `--json`, e lo si dice.

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

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-giro12-cli-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
const cartellaUtente = percorso.join(radice, 'Regiclass')
process.env.REGISTRO_USERDATA = cartellaUtente
delete process.env.REGISTRO_CONDOTTO

let api
let archivio
let condotto

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

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

describe('con la sola scrittura', () => {
  before(async () => {
    mkdirSync(cartellaUtente, { recursive: true })
    mkdirSync(dati, { recursive: true })
    writeFileSync(
      percorso.join(cartellaUtente, 'impostazioni.json'),
      JSON.stringify({
        cartellaLavoro: lavoro,
        'registroDocenti.api.condotto': true,
        'registroDocenti.api.lettura': false,
        'registroDocenti.api.scrittura': true,
      }),
    )
    api = await import('../../dist-tests/api.mjs')
    const { Archivio, Uri, avviaCondotto, creaAnno, definisci, registra, SCRITTURA, schemi } = api
    archivio = new Archivio(Uri.file(cartellaUtente))
    await archivio.apri(null)
    await archivio.creaAnno(
      creaAnno('2026-09-01', '2027-06-30'),
      Uri.file(percorso.join(dati, '2026-2027.regi')),
    )
    registra(definisci({
      nome: 'giro12.nota',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Una scrittura vera, con un campo numerico da convertire',
      idempotente: true,
      collezioni: ['registro'],
      ingresso: schemi.oggetto({
        minuti: schemi.numero({ intero: true, minimo: 0, massimo: 600 }),
      }),
      uscita: SCRITTURA,
      esegui: (ambito, ingresso) => {
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = ingresso.minuti
        }, ['registro'])
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }))
    condotto = await avviaCondotto(archivio, { cartellaUtente })
  })

  const suCondotto = () => ({ REGISTRO_CONDOTTO: api.indirizzoCondotto() })

  it('una scrittura si chiama, con i --campo convertiti dallo schema', async () => {
    const { codice, uscita, errore } = await lancia(
      ['chiama', 'giro12.nota', '--minuti', '17'], suCondotto())
    assert.equal(codice, 0, errore)
    assert.equal(typeof JSON.parse(uscita).revisione, 'number')
    assert.equal(archivio.registro.impostazioni.durataPausaPredefinita, 17)
  })

  it('una lettura si rifiuta, e non si manda a «regi elenco»', async () => {
    const { codice, errore } = await lancia(['chiama', 'corsi.elenco'], suCondotto())
    assert.notEqual(codice, 0)
    assert.match(errore, /lettura/)
    assert.doesNotMatch(errore, /regi elenco/)
  })

  it('lo stesso per «regi schema» di una lettura', async () => {
    const { codice, errore } = await lancia(['schema', 'corsi.elenco'], suCondotto())
    assert.notEqual(codice, 0)
    assert.doesNotMatch(errore, /regi elenco/)
  })
})

// ------------------------------------------------------------ il condotto finto

const SCHEMA_ECO = {
  type: 'object',
  properties: {
    cerca: { type: 'string' },
    quante: { type: ['number', 'null'] },
    assente: { type: 'boolean' },
    forse: { type: ['boolean', 'null'] },
  },
}

describe('le opzioni della riga di comando', () => {
  let finto
  let dove

  before(async () => {
    const nome = `registro-giro12-finto-${randomBytes(6).toString('hex')}`
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

  it('un campo di testo senza valore è un errore d’uso, non la parola «vero»', async () => {
    const { codice, errore } = await eco('--cerca')
    assert.equal(codice, 1)
    assert.match(errore, /Manca il valore di --cerca/)
  })

  it('lo stesso quando dopo viene un’altra opzione', async () => {
    const { codice, errore } = await eco('--quante', '--assente')
    assert.equal(codice, 1)
    assert.match(errore, /Manca il valore di --quante/)
  })

  it('un campo booleano senza valore è vero, come prima', async () => {
    assert.deepEqual((await eco('--assente')).dati, { assente: true })
    assert.deepEqual((await eco('--forse', '--assente')).dati, { forse: true, assente: true })
  })

  it('--json e --campo sullo stesso campo: vince --json, e lo si dice', async () => {
    const { codice, dati: ricevuto, errore } = await eco(
      '--cerca', 'rossi', '--json', '{"cerca":"bianchi"}')
    assert.equal(codice, 0, errore)
    assert.deepEqual(ricevuto, { cerca: 'bianchi' })
    assert.match(errore, /--cerca e --json dicono tutti e due «cerca»: vale quello di --json/)
  })

  it('--json e --campo su campi diversi non dicono niente', async () => {
    const { codice, dati: ricevuto, errore } = await eco(
      '--cerca', 'rossi', '--json', '{"quante":3}')
    assert.equal(codice, 0, errore)
    assert.deepEqual(ricevuto, { cerca: 'rossi', quante: 3 })
    assert.equal(errore, '')
  })
})
