// La cartella dei modelli dal lato dello scarico. `llm.test.mjs` guarda la
// guardia sul **nome**; qui si scarica davvero, da un server locale, perché
// quel che si prova sta dentro `scarica()`:
//
//   1. **i quattro byte `GGUF` si guardano anche qui**: una pagina di blocco
//      di un proxy o un HTML d'errore con esito 200 non diventano un modello;
//   2. **un annullo non lascia biglietti orfani**, in tutti e due i modi in
//      cui la libreria annulla (torna o rilancia): un `.sorgente.json` senza
//      pesi sarebbe invisibile e fuori portata di «Elimina»;
//   3. **un nome è preso anche quando è preso a metà**: due scarichi con lo
//      stesso nome non si scrivono l'uno sul `.ipull` dell'altro.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-gguf-'))

const {
  cartellaModelli,
  importaInDisparte,
  ricaricaImpostazioni,
  scarica,
  segnaSorgente,
  sorgenteDi,
} = await import('../../dist-tests/llm.mjs')

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')

/** Una cartella dei modelli nuova per ogni prova: i file di una restano sua. */
let MODELLI = ''
let quante = 0

beforeEach(() => {
  quante += 1
  MODELLI = percorso.join(process.env.REGISTRO_USERDATA, `modelli-${quante}`)
  mkdirSync(MODELLI, { recursive: true })
  writeFileSync(FILE, JSON.stringify({ 'registroDocenti.modelli.cartella': MODELLI }), 'utf8')
  ricaricaImpostazioni()
})

/** Un server che serve quei byte una volta sola, e si chiude da sé. */
async function servitore (corpo, { lento = false } = {}) {
  const server = createServer((_richiesta, risposta) => {
    risposta.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': String(corpo.length),
    })
    if (!lento) {
      risposta.end(corpo)
      return
    }
    // Un byte ogni tanto: tiene aperto lo scarico il tempo di annullarlo.
    let mandati = 0
    const battito = setInterval(() => {
      if (mandati >= corpo.length) {
        clearInterval(battito)
        risposta.end()
        return
      }
      risposta.write(corpo.subarray(mandati, mandati + 1))
      mandati += 1
    }, 50)
  })
  await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
  return {
    uri: `http://127.0.0.1:${server.address().port}/pesi.gguf`,
    chiudi: () => { server.close() },
  }
}

/** Quel che un `.gguf` ha in testa, e che nient'altro ha. */
const MAGIA = Buffer.from('GGUF')

describe('i quattro byte, anche su quel che si scarica', () => {
  it('quel che arriva e non è un GGUF non resta in cartella', async () => {
    const server = await servitore(Buffer.from('<html>il proxy della scuola dice di no</html>'))
    try {
      await assert.rejects(
        scarica({
          uri: server.uri,
          nome: 'pesi.gguf',
          sorgente: { deposito: 'tale/quale', file: 'pesi.gguf' },
        }),
        /non è un modello/,
      )
      assert.equal(existsSync(percorso.join(MODELLI, 'pesi.gguf')), false)
      // E nemmeno il biglietto: non c'è più niente da riprendere.
      assert.equal(sorgenteDi('pesi.gguf'), null)
    } finally {
      server.chiudi()
    }
  })

  it('quel che è un GGUF davvero arriva e resta', async () => {
    const server = await servitore(Buffer.concat([MAGIA, Buffer.alloc(128, 7)]))
    try {
      const sceso = await scarica({ uri: server.uri, nome: 'pesi.gguf' })
      assert.equal(sceso.nome, 'pesi.gguf')
      assert.equal(sceso.byte, 132)
      assert.equal(existsSync(percorso.join(MODELLI, 'pesi.gguf')), true)
    } finally {
      server.chiudi()
    }
  })
})

describe('lo scarico fermato a mano', () => {
  it('non lascia dietro di sé il biglietto di quel che non c’è più', async () => {
    const server = await servitore(Buffer.concat([MAGIA, Buffer.alloc(200, 7)]), { lento: true })
    const fermo = new AbortController()
    try {
      const corsa = scarica({
        uri: server.uri,
        nome: 'pesi.gguf',
        sorgente: { deposito: 'tale/quale', file: 'pesi.gguf' },
        segnale: fermo.signal,
      })
      // Il tempo che lo scarico cominci davvero: prima non c'è niente da ripulire.
      await new Promise((poi) => setTimeout(poi, 300))
      fermo.abort()

      await assert.rejects(corsa, /fermato/i)
      // Il biglietto se n'è andato, qualunque delle due strade prenda l'annullo.
      assert.equal(sorgenteDi('pesi.gguf'), null)
      assert.equal(existsSync(percorso.join(cartellaModelli(), 'pesi.gguf.sorgente.json')), false)
    } finally {
      server.chiudi()
    }
  })
})

describe('un nome è preso anche quando è preso a metà', () => {
  /**
   * Un `.gguf` da portare dentro, fuori dalla cartella dei modelli: in una
   * cartella sua, perché si prova come viene sistemato il **suo** nome.
   */
  function daFuori (nome) {
    const dove = percorso.join(process.env.REGISTRO_USERDATA, `scaricati-${quante}`)
    mkdirSync(dove, { recursive: true })
    const file = percorso.join(dove, nome)
    writeFileSync(file, Buffer.concat([MAGIA, Buffer.from('pesi')]))
    return file
  }

  it('non si scrive sopra a uno scarico ancora in corso', async () => {
    // Finché porta quel nome non è un modello, ma il nome **è** occupato.
    writeFileSync(percorso.join(MODELLI, 'pesi.gguf.ipull'), 'sceso a metà')

    const arrivato = await importaInDisparte(daFuori('pesi.gguf'))

    assert.equal(arrivato.nome, 'pesi-2.gguf')
    // E quel che stava scendendo è ancora dov'era, intero.
    assert.equal(existsSync(percorso.join(MODELLI, 'pesi.gguf.ipull')), true)
  })

  it('non si scrive sopra al biglietto di uno scarico che deve ancora partire', async () => {
    // Il biglietto si scrive **prima** dello scarico: c'è un momento in cui il
    // nome è preso e sul disco non c'è niente.
    segnaSorgente('pesi.gguf', { deposito: 'tale/quale', file: 'pesi.gguf' })

    const arrivato = await importaInDisparte(daFuori('pesi.gguf'))

    assert.equal(arrivato.nome, 'pesi-2.gguf')
    assert.deepEqual(sorgenteDi('pesi.gguf'), { deposito: 'tale/quale', file: 'pesi.gguf' })
  })
})
