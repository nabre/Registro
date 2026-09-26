// La dettatura: dove va la voce, che cosa viene mandato, che cosa torna. Al
// posto di voicebox c'è un server finto sul giro locale (`node:http`): 200 col
// testo, 202 mentre scarica un modello, 400 a una taglia sbagliata, niente
// quando è spento. Si prova che `dictation.ts` e `voicebox.ts` garantiscono:
//
//   1. **la guardia sull'indirizzo**: dal JSON in `userData` passa solo un
//      indirizzo di questo computer, altrimenti «non pronta, ecco perché»;
//   2. **il formato**: WAV a 16 kHz, un canale, sedici bit (con
//      un'intestazione sbagliata Whisper inventa parole);
//   3. **la richiesta**: italiano, la taglia scelta, il WAV come file;
//   4. **le risposte**: ognuna è una riga da leggere, non un errore;
//   5. **niente scarichi né file**: la voce non tocca il disco.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-dettatura-'))

const {
  collegamentoDettatura,
  dettaturaAccesa,
  indirizzoLocale,
  perchéNonLocale,
  prontezzaDettatura,
  ricaricaImpostazioni,
  ripulisci,
  ritiraCorredoWhisper,
  trascrivi,
  wav,
} = await import('../../dist-tests/dictation.mjs')

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')

let quante = 0

/** Scrive le impostazioni come le troverebbe il programma all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify({ ...valori }), 'utf8')
  ricaricaImpostazioni()
}

beforeEach(() => {
  quante += 1
  // I dati dell'applicazione in una cartella nuova a ogni prova, vuota: si
  // prova che non si scarica niente.
  process.env.REGISTRO_DATI = percorso.join(process.env.REGISTRO_USERDATA, `dati-${quante}`)
  scritte({})
})

/** Un secondo di voce vera per la soglia: un'onda quadra a tutto volume. */
function voce (secondi = 1) {
  const campioni = new Int16Array(16000 * secondi)
  for (let i = 0; i < campioni.length; i += 1) campioni[i] = i % 2 === 0 ? 9000 : -9000
  return { campioni, frequenza: 16000 }
}

/**
 * Un voicebox finto, sul giro locale. `risposta` dice che cosa fa
 * `/transcribe` alla prossima richiesta; il server ricorda che cosa gli è
 * arrivato.
 */
async function voiceboxFinto () {
  const finto = {
    risposta: { stato: 200, corpo: { text: ' Metti assente Rossi\n per la prima ora. ', duration: 1 } },
    salute: 200,
    arrivate: [],
  }
  const server = createServer((richiesta, risposta) => {
    const pezzi = []
    richiesta.on('data', (pezzo) => pezzi.push(pezzo))
    richiesta.on('end', () => {
      const corpo = Buffer.concat(pezzi)
      finto.arrivate.push({
        metodo: richiesta.method, via: richiesta.url, corpo, testa: richiesta.headers,
      })
      if (richiesta.url === '/health') {
        risposta.writeHead(finto.salute, { 'content-type': 'application/json' })
        risposta.end(JSON.stringify({ status: 'healthy' }))
        return
      }
      const { stato, corpo: detto, dove } = finto.risposta
      risposta.writeHead(stato, {
        'content-type': 'application/json',
        ...(dove ? { location: dove } : {}),
      })
      risposta.end(JSON.stringify(detto ?? {}))
    })
  })
  await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
  finto.indirizzo = `http://127.0.0.1:${server.address().port}`
  finto.chiudi = () => new Promise((fatto) => server.close(fatto))
  /** Le richieste di trascrizione, senza i «ci sei?». */
  finto.trascrizioni = () => finto.arrivate.filter((arrivata) => arrivata.via === '/transcribe')
  return finto
}

/** Un indirizzo di questo computer su cui non ascolta nessuno. */
async function indirizzoMuto () {
  const server = createServer()
  await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
  const indirizzo = `http://127.0.0.1:${server.address().port}`
  await new Promise((fatto) => server.close(fatto))
  return indirizzo
}

describe('l’interruttore', () => {
  it('spenta finché non la si accende', async () => {
    assert.equal(dettaturaAccesa(), false)
    const stato = await prontezzaDettatura(collegamentoDettatura())
    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /spenta/)
  })

  it('è un interruttore suo, e non quello dell’assistente', () => {
    // Dettatura e assistente sono indipendenti: accendere l'assistente non fa
    // comparire un microfono.
    scritte({ 'registroDocenti.assistente.attivo': true })
    assert.equal(dettaturaAccesa(), false)
  })

  it('di serie cerca voicebox dove lo mette l’app, con turbo e in italiano', () => {
    scritte({ 'registroDocenti.dettatura.attivo': true })
    const collegamento = collegamentoDettatura()
    assert.equal(collegamento.indirizzo, 'http://127.0.0.1:17493')
    assert.equal(collegamento.taglia, 'turbo')
    assert.equal(collegamento.lingua, 'it')
  })

  it('una taglia scritta a mano che voicebox non conosce torna turbo', () => {
    // La dogana impedisce di scriverla, ma il file si cambia a mano: voicebox
    // risponderebbe 400 a ogni pezzo.
    scritte({ 'registroDocenti.dettatura.attivo': true, 'registroDocenti.dettatura.taglia': 'enorme' })
    assert.equal(collegamentoDettatura().taglia, 'turbo')
  })
})

describe('la guardia sull’indirizzo', () => {
  it('passano soltanto gli indirizzi di questo computer', () => {
    for (const buono of ['http://127.0.0.1:17493', 'http://localhost:8000', 'http://[::1]:17493']) {
      assert.equal(perchéNonLocale(buono), null, buono)
    }
    for (const storto of [
      'http://192.168.1.10:17493',
      'http://voicebox.example.ch:17493',
      // Il trucco del nome che *comincia* come uno locale.
      'http://127.0.0.1.example.ch:17493',
      'http://localhost.example.ch',
      'https://127.0.0.1:17493',
      'ftp://127.0.0.1',
      'http://nome:parola@127.0.0.1:17493',
      'http://127.0.0.1:17493/altro',
      '127.0.0.1:17493',
      '',
    ]) {
      assert.ok(perchéNonLocale(storto), storto)
      assert.equal(indirizzoLocale(storto), '', storto)
    }
  })

  it('resta l’origine, senza la barra in fondo', () => {
    assert.equal(indirizzoLocale(' http://LOCALHOST:17493/ '), 'http://localhost:17493')
  })

  it('un indirizzo di fuori scritto a mano nel file non fa partire niente', async () => {
    // La dogana lo rifiuta, ma il file si riscrive anche senza passare di lì: la
    // guardia sta anche dove si legge.
    const finto = await voiceboxFinto()
    try {
      scritte({
        'registroDocenti.dettatura.attivo': true,
        'registroDocenti.dettatura.indirizzo': 'http://192.168.1.10:17493',
      })
      assert.equal(collegamentoDettatura().indirizzo, '')
      const esito = await trascrivi(voce())
      assert.equal(esito.ok, false)
      assert.match(esito.motivo, /questo computer/)
      assert.equal(finto.arrivate.length, 0)
    } finally {
      await finto.chiudi()
    }
  })
})

describe('se voicebox c’è', () => {
  it('risponde: pronta', async () => {
    const finto = await voiceboxFinto()
    try {
      scritte({ 'registroDocenti.dettatura.attivo': true, 'registroDocenti.dettatura.indirizzo': finto.indirizzo })
      assert.deepEqual(await prontezzaDettatura(collegamentoDettatura()), { pronto: true, motivo: '' })
      assert.equal(finto.arrivate[0].via, '/health')
    } finally {
      await finto.chiudi()
    }
  })

  it('non risponde: lo dice con l’indirizzo, e chiede se è avviato', async () => {
    const muto = await indirizzoMuto()
    scritte({ 'registroDocenti.dettatura.attivo': true, 'registroDocenti.dettatura.indirizzo': muto })
    const stato = await prontezzaDettatura(collegamentoDettatura())
    assert.equal(stato.pronto, false)
    assert.ok(stato.motivo.includes(muto), stato.motivo)
    assert.match(stato.motivo, /è avviato\?/)
  })

  it('spento, la voce non parte e la riga lo dice', async () => {
    const muto = await indirizzoMuto()
    scritte({ 'registroDocenti.dettatura.attivo': true, 'registroDocenti.dettatura.indirizzo': muto })
    const esito = await trascrivi(voce())
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non risponde/)
  })
})

describe('la trascrizione', () => {
  let finto

  before(async () => {
    finto = await voiceboxFinto()
  })
  after(async () => {
    await finto.chiudi()
  })
  beforeEach(() => {
    finto.arrivate.length = 0
    finto.risposta = { stato: 200, corpo: { text: ' Metti assente Rossi\n per la prima ora. ', duration: 1 } }
    scritte({
      'registroDocenti.dettatura.attivo': true,
      'registroDocenti.dettatura.indirizzo': finto.indirizzo,
      'registroDocenti.dettatura.taglia': 'small',
    })
  })

  it('manda il WAV, l’italiano e la taglia, e torna il testo ripulito', async () => {
    const esito = await trascrivi(voce())
    assert.deepEqual(esito, { ok: true, testo: 'Metti assente Rossi per la prima ora.', motivo: '' })

    const [arrivata] = finto.trascrizioni()
    assert.equal(arrivata.metodo, 'POST')
    assert.match(arrivata.testa['content-type'], /^multipart\/form-data; boundary=/)
    const corpo = arrivata.corpo.toString('latin1')
    assert.match(corpo, /name="language"\r\n\r\nit\r\n/)
    assert.match(corpo, /name="model"\r\n\r\nsmall\r\n/)
    assert.match(corpo, /name="file"; filename="dettatura\.wav"/)
    assert.match(corpo, /Content-Type: audio\/wav/i)
    assert.ok(corpo.includes('RIFF'), 'il file è un WAV')
  })

  it('202: voicebox sta scaricando il modello, e si riprova fra poco', async () => {
    // La risposta vera di voicebox a una taglia che non ha
    // (`backend/routes/transcription.py`, `detail` a oggetto).
    finto.risposta = {
      stato: 202,
      corpo: { detail: { message: 'Whisper model small is being downloaded.', downloading: true } },
    }
    const esito = await trascrivi(voce())
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /voicebox sta scaricando il modello «small»: riprova fra poco/)
  })

  it('400: il motivo di voicebox arriva a chi legge', async () => {
    finto.risposta = { stato: 400, corpo: { detail: "Invalid model size 'small'. Must be one of: base" } }
    const esito = await trascrivi(voce())
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /Invalid model size/)
  })

  it('un rinvio non si segue: la voce non riparte verso un altro indirizzo', async () => {
    const altrove = await voiceboxFinto()
    try {
      finto.risposta = { stato: 307, corpo: {}, dove: `${altrove.indirizzo}/transcribe` }
      const esito = await trascrivi(voce())
      assert.equal(esito.ok, false)
      assert.match(esito.motivo, /altrove/)
      assert.equal(altrove.arrivate.length, 0, 'la voce è stata rimandata')
    } finally {
      await altrove.chiudi()
    }
  })

  it('una risposta vuota non è una frase', async () => {
    finto.risposta = { stato: 200, corpo: { text: '[BLANK_AUDIO]', duration: 1 } }
    const esito = await trascrivi(voce())
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non sono riuscito a capire/i)
  })

  it('la voce si azzera dopo, comunque sia andata', async () => {
    const andata = voce()
    await trascrivi(andata)
    assert.ok(andata.campioni.every((campione) => campione === 0))

    finto.risposta = { stato: 400, corpo: { detail: 'no' } }
    const storta = voce()
    await trascrivi(storta)
    assert.ok(storta.campioni.every((campione) => campione === 0))
  })

  it('quel che dura troppo si taglia a un minuto', async () => {
    await trascrivi(voce(90))
    const corpo = finto.trascrizioni()[0].corpo
    // Un minuto a 16 kHz, due byte a campione, più l'intestazione; il resto del
    // modulo è qualche centinaio di byte.
    const wav = 44 + 60 * 16000 * 2
    assert.ok(corpo.length >= wav && corpo.length < wav + 2000, String(corpo.length))
  })

  it('niente scarichi e niente file: né corredo nei dati, né voce nella cartella temporanea', async () => {
    const prima = new Set(readdirSync(tmpdir()).filter((nome) => nome.startsWith('registro-voce-')))
    await trascrivi(voce())
    const nuove = readdirSync(tmpdir()).filter((nome) => nome.startsWith('registro-voce-') && !prima.has(nome))
    assert.deepEqual(nuove, [])
    assert.equal(existsSync(percorso.join(process.env.REGISTRO_DATI, 'dettatura')), false)
    // Al servizio sono arrivate soltanto le due domande che servono.
    assert.ok(finto.arrivate.every((arrivata) => ['/health', '/transcribe'].includes(arrivata.via)))
  })
})

describe('il silenzio', () => {
  let finto

  before(async () => {
    finto = await voiceboxFinto()
  })
  after(async () => {
    await finto.chiudi()
  })
  beforeEach(() => {
    finto.arrivate.length = 0
    scritte({ 'registroDocenti.dettatura.attivo': true, 'registroDocenti.dettatura.indirizzo': finto.indirizzo })
  })

  it('non si manda a trascrivere: si risponde che non si è sentito niente', async () => {
    // Davanti al silenzio un modello inventa, e la frase finirebbe nella casella.
    const esito = await trascrivi({ campioni: new Int16Array(16000), frequenza: 16000 })
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non ho sentito/i)
    assert.equal(finto.trascrizioni().length, 0)
  })

  it('mezzo decimo di secondo di voce è un clic, non una domanda', async () => {
    const campioni = new Int16Array(800)
    for (let i = 0; i < campioni.length; i += 1) campioni[i] = i % 2 === 0 ? 9000 : -9000
    const esito = await trascrivi({ campioni, frequenza: 16000 })
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non ho sentito/i)
    assert.equal(finto.trascrizioni().length, 0)
  })

  it('spenta, non si trascrive niente anche se la voce c’è', async () => {
    scritte({ 'registroDocenti.dettatura.indirizzo': finto.indirizzo })
    const esito = await trascrivi(voce())
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /spenta/i)
    assert.equal(finto.arrivate.length, 0)
  })
})

describe('i tetti', () => {
  it('l’attesa e la durata sono costanti del programma', () => {
    // Sono costanti del programma: un file che le dice ancora non conta.
    scritte({
      'registroDocenti.dettatura.attesaMassimaSecondi': 2,
      'registroDocenti.dettatura.durataMassimaSecondi': 3600,
    })
    assert.equal(collegamentoDettatura().attesaMs, 120_000)
    assert.equal(collegamentoDettatura().durataMassimaMs, 60_000)
  })
})

describe('il corredo di whisper.cpp', () => {
  it('quel che le versioni di prima avevano scaricato se ne va all’avvio', async () => {
    const vecchia = percorso.join(process.env.REGISTRO_DATI, 'dettatura')
    mkdirSync(vecchia, { recursive: true })
    writeFileSync(percorso.join(vecchia, 'ggml-large-v3-turbo-q5_0.bin'), 'pesi finti')
    await ritiraCorredoWhisper()
    assert.equal(existsSync(vecchia), false)
    // E la seconda volta, senza cartella, non succede niente.
    await ritiraCorredoWhisper()
  })
})

describe('il WAV', () => {
  /** Legge una stringa ASCII dall'intestazione. */
  function marca (file, da, quanti) {
    return Buffer.from(file.buffer, file.byteOffset + da, quanti).toString('ascii')
  }

  const vista = (file) => new DataView(file.buffer, file.byteOffset, file.byteLength)

  it('è un RIFF/WAVE con l’intestazione da quarantaquattro byte', () => {
    const file = wav({ campioni: new Int16Array([0, 1, -1, 32767]), frequenza: 16000 })

    assert.equal(file.length, 44 + 8)
    assert.equal(marca(file, 0, 4), 'RIFF')
    assert.equal(marca(file, 8, 4), 'WAVE')
    assert.equal(marca(file, 12, 4), 'fmt ')
    assert.equal(marca(file, 36, 4), 'data')
    // La lunghezza dichiarata è quella del file meno gli otto byte di `RIFF` e
    // della lunghezza stessa.
    assert.equal(vista(file).getUint32(4, true), file.length - 8)
    assert.equal(vista(file).getUint32(40, true), 8)
  })

  it('dichiara PCM a 16 kHz, un canale, sedici bit', () => {
    const file = wav({ campioni: new Int16Array(160), frequenza: 16000 })
    const v = vista(file)

    assert.equal(v.getUint32(16, true), 16, 'lunghezza del descrittore')
    assert.equal(v.getUint16(20, true), 1, 'PCM intero, non compresso')
    assert.equal(v.getUint16(22, true), 1, 'un canale')
    assert.equal(v.getUint32(24, true), 16000, 'sedicimila campioni al secondo')
    assert.equal(v.getUint32(28, true), 32000, 'byte al secondo')
    assert.equal(v.getUint16(32, true), 2, 'byte per campione')
    assert.equal(v.getUint16(34, true), 16, 'sedici bit')
  })

  it('i campioni ci sono tutti, e nell’ordine giusto', () => {
    const campioni = new Int16Array([1000, -1000, 32767, -32768])
    const file = wav({ campioni, frequenza: 16000 })
    const v = vista(file)
    for (let i = 0; i < campioni.length; i += 1) {
      assert.equal(v.getInt16(44 + i * 2, true), campioni[i], `campione ${i}`)
    }
  })
})

describe('quel che torna dal programma', () => {
  it('le annotazioni non sono parole dette', () => {
    assert.equal(ripulisci('[BLANK_AUDIO]'), '')
    assert.equal(ripulisci('(musica)\nQuante ore ha perso la 4a?'), 'Quante ore ha perso la 4a?')
  })

  it('le frasi che il modello inventa sul silenzio si buttano', () => {
    // Davanti al silenzio un modello multilingue scrive la frase più frequente dei
    // sottotitoli su cui è stato addestrato.
    assert.equal(ripulisci('Sottotitoli e revisione a cura di QTSS'), '')
    assert.equal(ripulisci('Grazie per aver guardato il video!'), '')
  })

  it('gli a capo diventano una frase sola', () => {
    assert.equal(
      ripulisci('  Metti assente Rossi\n  per la prima ora.  \n'),
      'Metti assente Rossi per la prima ora.',
    )
  })
})
