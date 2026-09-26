// Gli scarichi dei modelli con un `node-llama-cpp` finto: si prova quel che fa
// **il registro intorno alla libreria** (`gguf.test.mjs` scarica davvero):
//
//   1. «Riprendi» torna sul nome dello scarico caduto, invece di un `-2`;
//   2. il `.ipull` di quel che scende adesso non si butta;
//   3. «Ferma» ferma anche mentre ci si collega;
//   4. i pezzi di un modello spezzato non sono modelli, e se ne vanno col
//      primo;
//   5. la copia di un file portato dentro non passa dal nome definitivo;
//   6. `llm.scegli` non scrive a metà;
//   7. la coda di `actions/llm.ts`: si accoda, si toglie, si ferma, va avanti.
//
// Un bundle solo, compilato al volo: azioni e `gguf.ts` condividono lo stato.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync }
  from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-giro12-'))

/**
 * La libreria finta: `createModelDownloader` chiede a `globalThis.__finto`
 * che cosa fare, così ogni prova decide la sua.
 */
const FINTO = `
export function createModelDownloader (opzioni) {
  return globalThis.__finto.crea(opzioni)
}
`

const { llm, registraAvanzamentoScarico, gguf, ricaricaImpostazioni, apparato } =
  await importaSorgente(
    [
      "export { llm, registraAvanzamentoScarico } from './src/actions/llm.ts'",
      "export * as gguf from './src/data/gguf.ts'",
      "export { ricaricaImpostazioni } from './src/environment/settings.ts'",
      "export * as apparato from 'apparato'",
    ].join('\n'),
    { finti: { 'node-llama-cpp': FINTO } },
  )

const IMPOSTAZIONI = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')
const GGUF = Buffer.concat([Buffer.from('GGUF'), Buffer.alloc(64, 7)])

let MODELLI = ''
let quante = 0

beforeEach(() => {
  quante += 1
  MODELLI = percorso.join(process.env.REGISTRO_USERDATA, `modelli-${quante}`)
  mkdirSync(MODELLI, { recursive: true })
  writeFileSync(
    IMPOSTAZIONI,
    JSON.stringify({ 'registroDocenti.modelli.cartella': MODELLI }),
    'utf8',
  )
  ricaricaImpostazioni()
  globalThis.__finto = { crea: scaricatoreFinto, vivi: new Map(), chiamate: [] }
})

/** Aspetta che una cosa diventi vera, senza aspettare per sempre. */
async function finché (vero, ms = 3000) {
  const fine = Date.now() + ms
  while (!vero()) {
    if (Date.now() > fine) throw new Error('non è successo in tempo')
    await new Promise((poi) => setTimeout(poi, 10))
  }
}

/**
 * Uno scaricatore finto che si comporta come quello vero dove conta: scrive
 * nel `.ipull`, aspetta di essere lasciato andare (o fermato), e alla fine
 * rinomina. Fermato, butta il `.ipull` e torna — come la libreria, che non
 * rilancia.
 */
async function scaricatoreFinto (opzioni) {
  globalThis.__finto.chiamate.push(opzioni)
  const nome = opzioni.fileName
  const arrivo = percorso.join(opzioni.dirPath, nome)
  let libera
  const liberato = new Promise((risolvi) => { libera = risolvi })
  globalThis.__finto.vivi.set(nome, { libera })
  return {
    cancel: async () => {},
    download: async ({ signal } = {}) => {
      writeFileSync(arrivo + '.ipull', 'sceso a metà')
      opzioni.onProgress?.({ downloadedSize: 4, totalSize: GGUF.length })
      await new Promise((risolvi) => {
        void liberato.then(risolvi)
        signal?.addEventListener('abort', risolvi, { once: true })
      })
      globalThis.__finto.vivi.delete(nome)
      if (signal?.aborted) {
        rmSync(arrivo + '.ipull', { force: true })
        return arrivo
      }
      writeFileSync(arrivo, GGUF)
      rmSync(arrivo + '.ipull', { force: true })
      return arrivo
    },
  }
}

/** Lascia finire lo scarico di quel file, quando è partito. */
async function lasciaFinire (nome) {
  await finché(() => globalThis.__finto.vivi.has(nome))
  globalThis.__finto.vivi.get(nome).libera()
}

const SORGENTE = { deposito: 'tale/quale', file: 'pesi.gguf' }

describe('«Riprendi» riprende', () => {
  it('uno scarico caduto della stessa sorgente torna sul suo nome', async () => {
    // Quel che resta di uno scarico caduto: il file a metà e il biglietto.
    writeFileSync(percorso.join(MODELLI, 'pesi.gguf.ipull'), 'sceso a metà ieri')
    gguf.segnaSorgente('pesi.gguf', SORGENTE)

    const corsa = gguf.scarica({ uri: 'hf:tale/quale/pesi.gguf', nome: 'pesi.gguf', sorgente: SORGENTE })
    await lasciaFinire('pesi.gguf')
    const sceso = await corsa

    // Stesso nome, non `pesi-2.gguf` da zero.
    assert.equal(globalThis.__finto.chiamate[0].fileName, 'pesi.gguf')
    assert.equal(sceso.nome, 'pesi.gguf')
  })

  it('una sorgente diversa sullo stesso nome non se lo prende', async () => {
    writeFileSync(percorso.join(MODELLI, 'pesi.gguf.ipull'), 'sceso a metà ieri')
    gguf.segnaSorgente('pesi.gguf', SORGENTE)

    const altra = { deposito: 'altro/deposito', file: 'pesi.gguf' }
    const corsa = gguf.scarica({ uri: 'hf:altro/deposito/pesi.gguf', nome: 'pesi.gguf', sorgente: altra })
    await lasciaFinire('pesi-2.gguf')
    const sceso = await corsa

    assert.equal(sceso.nome, 'pesi-2.gguf')
    assert.equal(readFileSync(percorso.join(MODELLI, 'pesi.gguf.ipull'), 'utf8'), 'sceso a metà ieri')
    assert.deepEqual(gguf.sorgenteDi('pesi.gguf'), SORGENTE)
  })
})

describe('il .ipull di quel che scende adesso', () => {
  it('non si butta, né da gguf.ts né da llm.elimina', async () => {
    const fermo = new AbortController()
    const corsa = gguf.scarica({
      uri: 'hf:tale/quale/pesi.gguf', nome: 'pesi.gguf', sorgente: SORGENTE, segnale: fermo.signal,
    })
    await finché(() => existsSync(percorso.join(MODELLI, 'pesi.gguf.ipull')))

    assert.throws(() => gguf.elimina('pesi.gguf.ipull'), /sta ancora arrivando/)
    const esito = await llm['llm.elimina']({}, { tipo: 'llm.elimina', nome: 'pesi.gguf.ipull' })
    assert.equal(esito.ok, false)
    assert.equal(existsSync(percorso.join(MODELLI, 'pesi.gguf.ipull')), true)

    fermo.abort()
    await assert.rejects(corsa, /fermato/i)
  })

  it('quello di uno scarico caduto invece si butta', () => {
    writeFileSync(percorso.join(MODELLI, 'vecchio.gguf.ipull'), 'sceso a metà ieri')
    gguf.elimina('vecchio.gguf.ipull')
    assert.equal(existsSync(percorso.join(MODELLI, 'vecchio.gguf.ipull')), false)
  })
})

describe('«Ferma» mentre ci si collega', () => {
  it('ferma subito, e chiude lo scaricatore che arriva tardi', async () => {
    let arriva
    let chiuso = false
    globalThis.__finto.crea = () => new Promise((risolvi) => {
      arriva = () => risolvi({
        cancel: async () => { chiuso = true },
        download: async () => { throw new Error('non doveva partire') },
      })
    })
    const fermo = new AbortController()
    const corsa = gguf.scarica({
      uri: 'hf:tale/quale/pesi.gguf', nome: 'pesi.gguf', sorgente: SORGENTE, segnale: fermo.signal,
    })
    await finché(() => arriva !== undefined)
    fermo.abort()

    // «Ferma» non aspetta la risposta del deposito.
    const troppo = new Promise((_risolvi, rifiuta) => {
      setTimeout(() => rifiuta(new Error('ancora appeso')), 1000).unref()
    })
    await assert.rejects(Promise.race([corsa, troppo]), /fermato/i)
    assert.equal(gguf.sorgenteDi('pesi.gguf'), null)

    arriva()
    await finché(() => chiuso)
  })
})

describe('i modelli spezzati', () => {
  it('si mostra il primo pezzo, e togliendolo se ne vanno anche gli altri', () => {
    for (const nome of [
      'grande-00001-of-00003.gguf',
      'grande-00002-of-00003.gguf',
      'grande-00003-of-00003.gguf',
      'altro-00002-of-00002.gguf',
      'piccolo.gguf',
    ]) writeFileSync(percorso.join(MODELLI, nome), GGUF)

    const nomi = gguf.modelliLocali().map((m) => m.nome)
    assert.deepEqual(nomi, ['grande-00001-of-00003.gguf', 'piccolo.gguf'])

    gguf.elimina('grande-00001-of-00003.gguf')
    assert.deepEqual(readdirSync(MODELLI).sort(), ['altro-00002-of-00002.gguf', 'piccolo.gguf'])
  })

  it('anche dal decimo pezzo in su', () => {
    writeFileSync(percorso.join(MODELLI, 'enorme-00001-of-00012.gguf'), GGUF)
    writeFileSync(percorso.join(MODELLI, 'enorme-00010-of-00012.gguf'), GGUF)
    assert.deepEqual(gguf.modelliLocali().map((m) => m.nome), ['enorme-00001-of-00012.gguf'])
  })
})

describe('un file che si porta dentro', () => {
  it('arriva intero sul suo nome, senza lasciare il file di passaggio', async () => {
    const fuori = percorso.join(process.env.REGISTRO_USERDATA, `fuori-${quante}`)
    mkdirSync(fuori, { recursive: true })
    const file = percorso.join(fuori, 'portato.gguf')
    writeFileSync(file, GGUF)

    const arrivato = await gguf.importaInDisparte(file)

    assert.equal(arrivato.nome, 'portato.gguf')
    assert.deepEqual(readdirSync(MODELLI), ['portato.gguf'])
    assert.deepEqual(readFileSync(percorso.join(MODELLI, 'portato.gguf')), GGUF)
  })
})

describe('llm.scegli', () => {
  it('non scrive il modello quando rifiuta il proiettore', async () => {
    writeFileSync(percorso.join(MODELLI, 'occhi.gguf'), GGUF)
    const esito = await llm['llm.scegli']({}, {
      tipo: 'llm.scegli', uso: 'ocr', modello: 'occhi.gguf', proiettore: 'non-ce.gguf',
    })
    assert.equal(esito.ok, false)
    ricaricaImpostazioni()
    assert.equal(apparato.impostazioni.leggi('registroDocenti').get('ocr.modello', ''), '')
  })
})

describe('la coda degli scarichi', () => {
  it('si accoda, si toglie dalla coda, si ferma, e va avanti da sé', async () => {
    const racconti = []
    const iscrizione = registraAvanzamentoScarico((avanzamento) => racconti.push(avanzamento))
    try {
      const chiedi = (file) => llm['llm.scarica']({}, { tipo: 'llm.scarica', deposito: 'd/d', file })
      assert.equal(chiedi('a.gguf').ok, true)
      await finché(() => globalThis.__finto.vivi.has('a.gguf'))

      // Due in coda, e un doppione rifiutato.
      assert.match(chiedi('b.gguf').messaggio.testo, /in coda/)
      assert.match(chiedi('c.gguf').messaggio.testo, /in coda/)
      assert.equal(chiedi('b.gguf').ok, false)

      // Tolto dalla coda: A continua a scendere.
      llm['llm.annulla']({}, { tipo: 'llm.annulla', file: 'b.gguf' })
      assert.deepEqual(racconti.at(-1).coda, ['c.gguf'])
      assert.equal(globalThis.__finto.vivi.has('a.gguf'), true)

      // «Ferma» con il nome di un altro non ferma A.
      llm['llm.annulla']({}, { tipo: 'llm.annulla', file: 'z.gguf' })
      assert.equal(globalThis.__finto.vivi.has('a.gguf'), true)

      // Fermato A: parte C da sé.
      llm['llm.annulla']({}, { tipo: 'llm.annulla', file: 'a.gguf' })
      await finché(() => racconti.some((r) => r.file === 'a.gguf' && r.finito))
      assert.match(racconti.find((r) => r.file === 'a.gguf' && r.finito).motivo, /fermato/)
      await lasciaFinire('c.gguf')
      await finché(() => racconti.some((r) => r.file === 'c.gguf' && r.finito))
      const finito = racconti.find((r) => r.file === 'c.gguf' && r.finito)
      assert.equal(finito.nome, 'c.gguf')
      assert.equal(finito.motivo, undefined)
      assert.equal(existsSync(percorso.join(MODELLI, 'c.gguf')), true)
      // E B non è mai partito.
      assert.equal(globalThis.__finto.chiamate.some((o) => o.fileName === 'b.gguf'), false)
    } finally {
      iscrizione.dispose()
    }
  })
})
