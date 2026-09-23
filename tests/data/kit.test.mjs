// Lo scarico di un corredo: la scadenza, la ripresa, e l'estrazione.
//
// `tests/data/dictation.test.mjs` guarda **che cosa** si scarica — i due pezzi,
// la selezione dentro l'archivio, l'appiattimento dei nomi. Qui si guarda il
// **come**, e sono tre cose che si rompono in silenzio:
//
//   1. **La scadenza è di silenzio, non di durata.** `AbortSignal.timeout`
//      passato a `fetch` vale anche per il corpo che scende: il modello della
//      dettatura pesa 574 MB e in trenta secondi non arriva su nessuna linea di
//      scuola, quindi la dettatura non si sarebbe accesa mai — e il guasto non
//      si vede in nessuna prova che scarichi quattro byte.
//   2. **Un file già completo non si riscarica.** Un'interruzione fra l'ultimo
//      byte e il rinomino lasciava mezzo gigabyte che si buttava e si riprendeva
//      da capo.
//   3. **Un'estrazione che si rompe a metà non lascia niente in cartella.**
//      L'impronta verificata è quella dell'archivio, non di quel che ne esce: un
//      `.exe` troncato scritto lì dentro sarebbe buono per sempre, perché da
//      quel momento il corredo «c'è».
//
// ------------------------------------------- perché l'attesa qui è più corta
//
// Quel che deve riuscire è uno scarico **più lungo dell'attesa**, e l'attesa
// vera è di trenta secondi: con quella, questa prova da sola durava
// trentaquattro secondi — più di dieci volte tutto il resto della suite messo
// insieme. Una prova che costa così tanto si smette di lanciare, ed è il modo
// peggiore di perderla.
//
// Perciò `scarica` prende l'attesa come ultimo parametro, con il numero vero
// come predefinito, e qui gliene si passa uno piccolo. Non si prova «un'altra
// costante»: la regola è che l'orologio riparte a ogni pezzo che arriva, e
// quella si vede identica a 1,2 secondi e a trenta — basta che lo scarico duri
// più dell'attesa, qualunque sia. I due casi — la linea lenta e il sito che
// tace — girano insieme, come prima.
//
// Niente rete vera: un server sul giro locale, che risponde come vuole la prova.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-corredo-'))

const { scarica, scriviZip } = await import('../../dist-tests/dictation.mjs')

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
 * Un server che risponde come dice la prova, e che si chiude da sé.
 *
 * Torna anche quante volte gli è stato chiesto qualcosa: è l'unico modo di
 * provare che una ripresa **non** ha riscaricato niente.
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

/** Un pacco come lo dichiarano `voiceKit.ts` e `visionKit.ts`. */
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
    // Uno scarico che dura più dell'attesa, a pezzi regolari: prima della
    // correzione moriva alla scadenza, perché il segnale della `fetch` copriva
    // anche il corpo che scendeva.
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

    // E uno che apre la risposta e poi non dice più niente: l'attesa deve
    // scattare lo stesso, o la correzione avrebbe solo tolto la scadenza.
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
      // Più dell'attesa: è il numero che dice che la correzione c'è. Senza, qui
      // ci sarebbe un guasto a trenta secondi tondi.
      assert.ok(durata > ATTESA_MS, `doveva durare più di ${ATTESA_MS} ms, è durata ${durata}`)

      assert.ok(scesoMuto instanceof Error, 'il sito muto doveva essere mollato')
      // In italiano, come ogni altro errore di quel file: prima usciva di qui
      // «The operation was aborted due to timeout», che è la frase di Node.
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
      // Com'è il disco quando la connessione cade fra l'ultimo byte e il
      // rinomino: tutto sceso, e con il nome che dice «questo non è niente».
      writeFileSync(percorso.join(dove, 'pacco.bin.parziale'), dati)

      await scarica(dove, [pacco(server.uri, dati)])

      assert.equal(existsSync(percorso.join(dove, 'pacco.bin')), true)
      assert.equal(existsSync(percorso.join(dove, 'pacco.bin.parziale')), false)
      // Il numero che conta: al server non è stato chiesto niente. Prima quel
      // file si buttava e si riscaricava da capo.
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
  /** La regola di whisper, ripetuta qui perché quella vera è privata. */
  const tiene = (nome) =>
    nome.toLowerCase() === 'whisper-cli.exe' || nome.toLowerCase().endsWith('.dll')

  /**
   * Rompe il controllo di una voce dell'indice, senza toccare le altre.
   *
   * Il nome compare due volte nell'archivio — nella testa locale e
   * nell'indice — e l'indice viene dopo: l'ultima occorrenza è quella giusta.
   * Da lì si torna indietro alla testa centrale, dove il CRC sta trenta byte
   * prima del nome. Cambiarlo fa fallire **quella** voce e nessun'altra, che è
   * esattamente il guasto vero: un archivio arrivato bene e un file che non si
   * decomprime.
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
      { nome: 'Release/whisper-cli.exe', dati: Buffer.from('MZ finto') },
    ]), 'Release/whisper-cli.exe')

    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(archivio.length) })
      risposta.end(archivio)
    })
    try {
      const dove = cartellaNuova()
      await assert.rejects(
        scarica(dove, [pacco(server.uri, archivio, { arrivo: 'whisper-cli.exe', tiene })]),
        /non riesco a tirare fuori/i,
      )
      // Niente, e soprattutto non la libreria uscita prima del guasto: quel che
      // resta in cartella dopo un'estrazione a metà è un corredo che il registro
      // considera a posto per sempre, perché `porta()` guarda solo se il file
      // d'arrivo c'è.
      assert.deepEqual(readdirSync(dove), [])
    } finally {
      server.chiudi()
    }
  })

  it('un’estrazione riuscita non lascia cartelle di servizio dietro di sé', async () => {
    const archivio = scriviZip([
      { nome: 'Release/ggml-cpu-haswell.dll', dati: Buffer.from('libreria buona') },
      { nome: 'Release/whisper-cli.exe', dati: Buffer.from('MZ finto') },
      { nome: 'Release/README.md', dati: Buffer.from('# whisper') },
    ])
    const server = await servitore((_richiesta, risposta) => {
      risposta.writeHead(200, { 'content-length': String(archivio.length) })
      risposta.end(archivio)
    })
    try {
      const dove = cartellaNuova()
      await scarica(dove, [pacco(server.uri, archivio, { arrivo: 'whisper-cli.exe', tiene })])
      assert.deepEqual(readdirSync(dove).sort(), ['ggml-cpu-haswell.dll', 'whisper-cli.exe'])
    } finally {
      server.chiudi()
    }
  })
})
