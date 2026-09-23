// La cartella dei modelli dal lato dello scarico: la guardia, e quel che resta.
//
// `tests/data/llm.test.mjs` guarda la guardia sul **nome** — che nelle
// impostazioni ci vada un file di quella cartella e non un percorso qualunque —
// e lo fa senza toccare né rete né libreria. Qui invece si fa scaricare
// davvero, da un server sul giro locale, perché le tre cose che si provano
// vivono tutte dentro `scarica()` e da fuori non si vedono:
//
//   1. **I quattro byte si guardano anche su questa strada.** La nota in testa a
//      `gguf.ts` dice che su tutte e tre le strade passa la stessa guardia, e su
//      questa non passava: bastava un proxy che risponde con la sua pagina di
//      blocco, o un deposito che serve un HTML d'errore con esito 200, perché in
//      cartella restasse un «modello» che si carica solo per morire con un
//      messaggio che parla di tensori.
//   2. **Un annullo non lascia biglietti orfani.** L'annullo esce dalla
//      libreria in due modi — `download()` che torna come se niente fosse, o
//      che rilancia la ragione dell'annullo — e per un pezzo se ne guardava uno
//      solo. Un `.sorgente.json` rimasto senza pesi accanto è invisibile
//      nell'elenco, che mostra i file, e fuori portata di «Elimina», che
//      cancella quel che nell'elenco c'è.
//   3. **Un nome è preso anche quando è preso a metà.** Due scarichi diversi che
//      si normalizzano allo stesso nome si scrivevano l'uno sul `.ipull`
//      dell'altro.
//
// Il server è nostro e sta sul giro locale: `npm test` non chiama nessuno.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-gguf-'))

const {
  cartellaModelli,
  importa,
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
    // Un byte ogni tanto: serve solo a tenere aperto lo scarico il tempo di
    // annullarlo.
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
      // Il tempo che lo scarico cominci davvero: è il caso che conta, perché a
      // scarico mai partito non c'è niente da ripulire.
      await new Promise((poi) => setTimeout(poi, 300))
      fermo.abort()

      await assert.rejects(corsa, /fermato/i)
      // Il biglietto se n'è andato. Per come la libreria si comporta oggi —
      // chiude e torna — ci se ne andava anche prima: questa prova tiene ferma
      // la cosa che conta, cioè che l'annullo non lasci biglietti in giro
      // qualunque delle due strade prenda.
      assert.equal(sorgenteDi('pesi.gguf'), null)
      assert.equal(existsSync(percorso.join(cartellaModelli(), 'pesi.gguf.sorgente.json')), false)
    } finally {
      server.chiudi()
    }
  })
})

describe('un nome è preso anche quando è preso a metà', () => {
  /**
   * Un `.gguf` da portare dentro, fuori dalla cartella dei modelli.
   *
   * In una cartella sua e non con un nome suo: quel che si prova è come il
   * nome **di quel file** viene sistemato arrivando, e cambiarlo prima
   * proverebbe un'altra cosa.
   */
  function daFuori (nome) {
    const dove = percorso.join(process.env.REGISTRO_USERDATA, `scaricati-${quante}`)
    mkdirSync(dove, { recursive: true })
    const file = percorso.join(dove, nome)
    writeFileSync(file, Buffer.concat([MAGIA, Buffer.from('pesi')]))
    return file
  }

  it('non si scrive sopra a uno scarico ancora in corso', () => {
    // Quel che la libreria lascia in cartella mentre scende: finché porta quel
    // nome non è un modello, ma il suo nome **è** occupato.
    writeFileSync(percorso.join(MODELLI, 'pesi.gguf.ipull'), 'sceso a metà')

    const arrivato = importa(daFuori('pesi.gguf'))

    assert.equal(arrivato.nome, 'pesi-2.gguf')
    // E quel che stava scendendo è ancora dov'era, intero.
    assert.equal(existsSync(percorso.join(MODELLI, 'pesi.gguf.ipull')), true)
  })

  it('non si scrive sopra al biglietto di uno scarico che deve ancora partire', () => {
    // Il biglietto si scrive **prima** dello scarico, apposta: c'è un momento
    // in cui il nome è preso e sul disco non c'è ancora niente.
    segnaSorgente('pesi.gguf', { deposito: 'tale/quale', file: 'pesi.gguf' })

    const arrivato = importa(daFuori('pesi.gguf'))

    assert.equal(arrivato.nome, 'pesi-2.gguf')
    assert.deepEqual(sorgenteDi('pesi.gguf'), { deposito: 'tale/quale', file: 'pesi.gguf' })
  })
})
