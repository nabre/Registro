// Lo scarico di un corredo: la scadenza, la ripresa, l'estrazione, la
// selezione dentro l'archivio e l'appiattimento dei nomi.
//
//   1. **La scadenza è di silenzio, non di durata**: `AbortSignal.timeout`
//      passato a `fetch` vale anche per il corpo, e un corredo di centinaia di
//      MB non scende in trenta secondi.
//   2. **Un file già completo non si riscarica** (interruzione fra l'ultimo
//      byte e il rinomino).
//   3. **Un'estrazione rotta a metà non lascia niente**: l'impronta verificata
//      è quella dell'archivio, e un `.exe` troncato sembrerebbe buono per
//      sempre.
//
// `scarica` prende l'attesa come ultimo parametro (trenta secondi di serie):
// qui è corta, perché la regola (l'orologio riparte a ogni pezzo) è la stessa
// e la prova non deve durare mezzo minuto. Niente rete vera: un server locale.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-corredo-'))

const { scarica, scompatta, scriviZip } = await import('../../dist-tests/kit.mjs')

/** L'attesa che si passa a `scarica`: il numero vero è trenta volte questo. */
const ATTESA_MS = 1_200

let quante = 0

/** Una cartella nuova per ogni prova: gli scarichi in corso stanno per cartella. */
function cartellaNuova () {
  quante += 1
  const dove = percorso.join(process.env.REGISTRO_USERDATA, `corredo-${quante}`)
  mkdirSync(dove, { recursive: true })
  return dove
}

/**
 * Un server che risponde come dice la prova e si chiude da sé. Conta le
 * richieste, per provare che una ripresa **non** riscarica.
 */
async function servitore (rispondi) {
  const conto = { chieste: 0 }
  const server = createServer((richiesta, risposta) => {
    conto.chieste += 1
    rispondi(richiesta, risposta)
  })
  await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
  conto.uri = `http://127.0.0.1:${server.address().port}/pacco.bin`
  conto.chiudi = () => { server.close() }
  return conto
}

/** Un pacco come lo dichiara `visionKit.ts`. */
function pacco (uri, dati, extra = {}) {
  return {
    che: 'modello',
    titolo: 'il modello finto',
    uri,
    archivio: 'pacco.bin',
    byte: dati.length,
    impronta: createHash('sha256').update(dati).digest('hex'),
    arrivo: 'pacco.bin',
    ...extra,
  }
}

describe('la scadenza dello scarico', () => {
  it('conta il silenzio e non la durata: una linea lenta arriva in fondo, un sito muto no', async () => {
    // Uno scarico più lungo dell'attesa, a pezzi regolari: non deve scadere.
    const PEZZI = 7
    const PAUSA_MS = 300
    const PEZZO = Buffer.alloc(16, 0x41)
    const intero = Buffer.concat(Array.from({ length: PEZZI }, () => PEZZO))

    const lento = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(intero.length) })
      let mandati = 0
      const battito = setInterval(() => {
        if (mandati >= PEZZI) {
          clearInterval(battito)
          risposta.end()
          return
        }
        risposta.write(PEZZO)
        mandati += 1
      }, PAUSA_MS)
    })

    // E uno che apre la risposta e poi tace: l'attesa scatta lo stesso.
    const muto = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': '1024' })
      risposta.write(Buffer.alloc(8))
    })

    try {
      const dove = cartellaNuova()
      const acceso = Date.now()
      const [scesoLento, scesoMuto] = await Promise.all([
        scarica(dove, [pacco(lento.uri, intero)], undefined, ATTESA_MS)
          .then(() => 'finito', (guasto) => guasto),
        scarica(cartellaNuova(), [pacco(muto.uri, Buffer.alloc(1024))], undefined, ATTESA_MS)
          .then(() => 'finito', (guasto) => guasto),
      ])
      const durata = Date.now() - acceso

      assert.equal(scesoLento, 'finito', 'la linea lenta doveva arrivare in fondo')
      assert.equal(existsSync(percorso.join(dove, 'pacco.bin')), true)
      // Più dell'attesa: la scadenza non è sulla durata.
      assert.ok(durata > ATTESA_MS, `doveva durare più di ${ATTESA_MS} ms, è durata ${durata}`)

      assert.ok(scesoMuto instanceof Error, 'il sito muto doveva essere mollato')
      // In italiano, non la frase di Node.
      assert.match(scesoMuto.message, /non arriva più niente/)
      assert.doesNotMatch(scesoMuto.message, /abort/i)
    } finally {
      lento.chiudi()
      muto.chiudi()
    }
  })
})

describe('quel che era rimasto a metà', () => {
  it('un file già completo si controlla, non si riscarica', async () => {
    const dati = Buffer.from('mezzo gigabyte per finta')
    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(dati.length) })
      risposta.end(dati)
    })
    try {
      const dove = cartellaNuova()
      // Il disco quando la connessione cade fra l'ultimo byte e il rinomino: tutto
      // sceso, col nome da parziale.
      writeFileSync(percorso.join(dove, 'pacco.bin.parziale'), dati)

      await scarica(dove, [pacco(server.uri, dati)])

      assert.equal(existsSync(percorso.join(dove, 'pacco.bin')), true)
      assert.equal(existsSync(percorso.join(dove, 'pacco.bin.parziale')), false)
      // Al server non è stato chiesto niente.
      assert.equal(server.chieste, 0)
    } finally {
      server.chiudi()
    }
  })

  it('un parziale della misura giusta ma con dentro altro si butta e si riscarica', async () => {
    const dati = Buffer.from('questo e il pacco vero!!')
    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(dati.length) })
      risposta.end(dati)
    })
    try {
      const dove = cartellaNuova()
      writeFileSync(percorso.join(dove, 'pacco.bin.parziale'), Buffer.alloc(dati.length, 0x5a))

      await scarica(dove, [pacco(server.uri, dati)])

      assert.equal(server.chieste, 1)
      assert.deepEqual(readdirSync(dove), ['pacco.bin'])
    } finally {
      server.chiudi()
    }
  })
})

describe('l’estrazione dell’archivio', () => {
  /** La regola delle scansioni, ripetuta qui perché quella vera è privata. */
  const tiene = (nome) =>
    nome.toLowerCase() === 'llama-mtmd-cli.exe' || nome.toLowerCase().endsWith('.dll')

  /**
   * Rompe il CRC di una voce dell'indice, senza toccare le altre: l'ultima
   * occorrenza del nome è quella dell'indice, e il CRC sta trenta byte prima.
   * È il guasto vero: archivio arrivato bene, un file che non si decomprime.
   */
  function rovina (archivio, nome) {
    const byte = Buffer.from(archivio)
    const dove = byte.lastIndexOf(Buffer.from(nome, 'utf8'))
    assert.ok(dove > 0, 'il nome doveva stare nell’indice')
    byte[dove - 30] ^= 0xff
    return byte
  }

  it('una voce rovinata non lascia in cartella i file usciti prima di lei', async () => {
    const archivio = rovina(scriviZip([
      { nome: 'Release/ggml-cpu-haswell.dll', dati: Buffer.from('libreria buona') },
      { nome: 'Release/llama-mtmd-cli.exe', dati: Buffer.from('MZ finto') },
    ]), 'Release/llama-mtmd-cli.exe')

    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(archivio.length) })
      risposta.end(archivio)
    })
    try {
      const dove = cartellaNuova()
      await assert.rejects(
        scarica(dove, [pacco(server.uri, archivio, { arrivo: 'llama-mtmd-cli.exe', tiene })]),
        /non riesco a tirare fuori/i,
      )
      // Niente, nemmeno quel che è uscito prima del guasto: `porta()` guarda solo se
      // il file d'arrivo c'è.
      assert.deepEqual(readdirSync(dove), [])
    } finally {
      server.chiudi()
    }
  })

  it('un’estrazione riuscita non lascia cartelle di servizio dietro di sé', async () => {
    const archivio = scriviZip([
      { nome: 'Release/ggml-cpu-haswell.dll', dati: Buffer.from('libreria buona') },
      { nome: 'Release/llama-mtmd-cli.exe', dati: Buffer.from('MZ finto') },
      { nome: 'Release/README.md', dati: Buffer.from('# llama.cpp') },
    ])
    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(archivio.length) })
      risposta.end(archivio)
    })
    try {
      const dove = cartellaNuova()
      await scarica(dove, [pacco(server.uri, archivio, { arrivo: 'llama-mtmd-cli.exe', tiene })])
      assert.deepEqual(readdirSync(dove).sort(), ['ggml-cpu-haswell.dll', 'llama-mtmd-cli.exe'])
    } finally {
      server.chiudi()
    }
  })
})

describe('che cosa esce da un archivio', () => {
  /** La regola delle scansioni, come sopra. */
  const tiene = (nome) =>
    nome.toLowerCase() === 'llama-mtmd-cli.exe' || nome.toLowerCase().endsWith('.dll')

  it('escono l’eseguibile e le librerie, e nient’altro', () => {
    const dentro = cartellaNuova()
    const archivio = scriviZip([
      { nome: 'bin/llama-mtmd-cli.exe', dati: Buffer.from('MZ finto') },
      { nome: 'bin/llama.dll', dati: Buffer.from('libreria') },
      { nome: 'bin/ggml-cpu-haswell.dll', dati: Buffer.from('libreria') },
      // Gli altri programmi dell'archivio non servono: non si scrivono.
      { nome: 'bin/llama-server.exe', dati: Buffer.from('MZ finto') },
      { nome: 'bin/README.md', dati: Buffer.from('# llama.cpp') },
    ])

    assert.equal(scompatta(archivio, dentro, tiene), 3)
    assert.deepEqual(readdirSync(dentro).sort(), [
      'ggml-cpu-haswell.dll',
      'llama-mtmd-cli.exe',
      'llama.dll',
    ])
  })

  it('una voce che risale non scrive fuori dalla cartella', () => {
    // Il nome passa da `basename`: si guarda che **fuori** non venga scritto
    // niente.
    const dentro = cartellaNuova()
    const fuori = percorso.join(process.env.REGISTRO_USERDATA, 'scappato.exe')
    const archivio = scriviZip([
      { nome: '../../scappato.exe', dati: Buffer.from('MZ finto') },
      { nome: 'bin/llama-mtmd-cli.exe', dati: Buffer.from('MZ finto') },
    ])

    scompatta(archivio, dentro, tiene)
    assert.equal(existsSync(fuori), false)
  })
})
