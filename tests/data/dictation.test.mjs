// La dettatura: che cosa viene eseguito, che cosa viene mandato, che cosa torna.
//
// Questa prova non fa parlare nessuno e non ha whisper installato — per quello
// servirebbero un microfono e mezzo gigabyte di modello, e una prova che
// dipende da tutti e due è una prova che non gira. Prova le tre cose che
// `dictation.ts` e `whisper.ts` esistono per garantire, e che si romperebbero
// tutte in silenzio:
//
//   1. **La guardia sul programma.** Il percorso dell'eseguibile arriva da un
//      JSON in `userData`, cioè da un file che qualunque programma sulla
//      macchina può riscrivere. Qui non si tratta di un indirizzo di rete: si
//      tratta di che cosa il registro fa partire. Un percorso relativo, uno
//      script `.bat`, un file che non c'è non devono passare — e non passare
//      vuol dire «la dettatura non è pronta, ecco perché», non un errore.
//
//   2. **Il formato.** whisper.cpp legge WAV a 16 kHz, un canale, sedici bit, e
//      a un'intestazione sbagliata di due byte non risponde con un errore:
//      risponde con delle parole, che non sono quelle dette. È esattamente il
//      genere di guasto che si scopre sei mesi dopo.
//
//   3. **La lingua.** `-l it` c'è sempre e `-tr` non c'è mai. Il secondo è
//      l'argomento che traduce in inglese: una dettatura tradotta è una frase
//      che nessuno ha detto, scritta nel registro di una classe.
//
//   4. **Il corredo scaricato non allarga la guardia.** Da quando il registro
//      si prende da sé whisper e il suo modello (`data/voiceKit.ts`), i
//      percorsi che esegue possono venire da due posti invece che da uno. Qui
//      si guarda che il secondo passi dallo stesso controllo del primo, che
//      quel che è scritto a mano vinca comunque, e che da un archivio esca
//      soltanto quel che serve — con i nomi appiattiti, perché una voce di ZIP
//      chiamata con delle risalite è un file scritto dove non si voleva.
//      Niente rete: qui non si scarica mai niente davvero.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-dettatura-'))

const {
  argomenti,
  cartellaCorredo,
  collegamentoDettatura,
  dettaturaAccesa,
  mancanti,
  prontezzaDettatura,
  ricaricaImpostazioni,
  ripulisci,
  scompatta,
  scriviZip,
  siScarica,
  soloInglese,
  trascrivi,
  wav,
} = await import('../../dist-tests/dictation.mjs')

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')

/**
 * Dove il registro terrebbe quel che si scarica da sé.
 *
 * Dichiarata in **ogni** prova, e non solo in quelle che la guardano: senza,
 * `collegamentoDettatura` andrebbe a cercare il ripiego nei dati veri della
 * macchina su cui gira `npm test`, e su un computer dove la dettatura è già
 * stata usata una volta metà di queste prove passerebbero per il motivo
 * sbagliato.
 *
 * È **una cartella nuova a ogni prova**: un file lasciato lì da quella prima
 * renderebbe pronta una dettatura che doveva risultare da scaricare, e la
 * prova passerebbe o fallirebbe a seconda dell'ordine in cui è stata scritta.
 */
let CORREDO = ''
let quante = 0

/** Scrive le impostazioni come le troverebbe il programma all'avvio. */
function scritte (valori) {
  writeFileSync(
    FILE,
    JSON.stringify({ 'registroDocenti.dettatura.cartella': CORREDO, ...valori }),
    'utf8',
  )
  ricaricaImpostazioni()
}

/**
 * Un eseguibile vero, per provare la guardia senza installare whisper.
 *
 * È `node.exe` — cioè quello con cui questa prova sta girando: assoluto,
 * esistente e con l'estensione giusta. Non viene mai fatto partire: le prove
 * che arrivano a eseguire qualcosa si fermano prima, sul silenzio.
 */
const ESEGUIBILE = process.execPath

/** Un file che c'è di sicuro, al posto del modello `ggml`. */
const UN_FILE = percorso.join(process.env.REGISTRO_USERDATA, 'finto-modello.bin')
writeFileSync(UN_FILE, 'non è un modello, ma è un file')

/** Le impostazioni di una dettatura che funzionerebbe. */
const PRONTA = {
  'registroDocenti.dettatura.attivo': true,
  'registroDocenti.dettatura.programma': ESEGUIBILE,
  'registroDocenti.dettatura.modello': UN_FILE,
}

beforeEach(() => {
  quante += 1
  CORREDO = percorso.join(process.env.REGISTRO_USERDATA, `corredo-${quante}`)
  scritte({})
})

describe('l’interruttore', () => {
  it('spenta finché non la si accende', () => {
    assert.equal(dettaturaAccesa(), false)
    assert.equal(prontezzaDettatura(collegamentoDettatura()).pronto, false)
  })

  it('è un interruttore suo, e non quello dell’assistente', () => {
    // I due vogliono cose diverse — Ollama l'uno, whisper.cpp e un modello sul
    // disco l'altra — e accendere l'assistente non deve far comparire un
    // microfono che non può funzionare.
    scritte({ 'registroDocenti.assistente.attivo': true })
    assert.equal(dettaturaAccesa(), false)
  })

  it('accesa senza programma e senza scarico automatico, dice dove si prende', () => {
    scritte({
      'registroDocenti.dettatura.attivo': true,
      'registroDocenti.dettatura.scaricoAutomatico': false,
    })
    const stato = prontezzaDettatura(collegamentoDettatura())
    assert.equal(stato.scaricabile, false)
    assert.match(stato.motivo, /whisper-cli/)
    assert.match(stato.motivo, /impostazioni/)
  })

  it('accesa senza niente, con lo scarico automatico se ne occupa il registro', () => {
    scritte({ 'registroDocenti.dettatura.attivo': true })
    const stato = prontezzaDettatura(collegamentoDettatura())
    // Su un sistema per cui whisper.cpp non pubblica un binario il programma
    // resta da prendere a mano, e la frase deve continuare a dirlo: promettere
    // uno scarico che non partirà è peggio del non prometterlo.
    assert.equal(stato.scaricabile, siScarica('programma'))
    assert.match(stato.motivo, siScarica('programma') ? /lo scarico io/ : /whisper-cli/)
  })
})

describe('la guardia sul programma', () => {
  it('un percorso relativo non passa', () => {
    // Relativo vuol dire «rispetto a dove gira il registro», che non è un posto
    // che chi scrive l'impostazione conosce — ed è anche il modo in cui un
    // nome qualunque diventa un eseguibile qualunque.
    scritte({ ...PRONTA, 'registroDocenti.dettatura.programma': 'whisper-cli.exe' })
    assert.equal(collegamentoDettatura().programma, '')
    assert.match(prontezzaDettatura(collegamentoDettatura()).motivo, /percorso intero/)
  })

  it('un file che non c’è non passa', () => {
    scritte({
      ...PRONTA,
      'registroDocenti.dettatura.programma': percorso.join(tmpdir(), 'non-esiste-whisper.exe'),
    })
    assert.equal(collegamentoDettatura().programma, '')
  })

  it('una cartella non è un programma', () => {
    scritte({ ...PRONTA, 'registroDocenti.dettatura.programma': tmpdir() })
    assert.equal(collegamentoDettatura().programma, '')
  })

  it('su Windows solo .exe: non .bat, non .cmd, non .ps1', { skip: process.platform !== 'win32' }, () => {
    // Non sono programmi: sono righe date a un interprete. Un percorso che il
    // registro non ha scritto non deve poter diventare una riga di comando, ed
    // è la differenza fra «far partire un eseguibile» e «eseguire uno script».
    for (const estensione of ['.bat', '.cmd', '.ps1']) {
      const finto = percorso.join(process.env.REGISTRO_USERDATA, `whisper${estensione}`)
      writeFileSync(finto, 'echo ciao')
      scritte({ ...PRONTA, 'registroDocenti.dettatura.programma': finto })
      assert.equal(collegamentoDettatura().programma, '', estensione)
      assert.match(prontezzaDettatura(collegamentoDettatura()).motivo, /\.exe/, estensione)
    }
  })

  it('le virgolette intorno al percorso si tolgono', () => {
    // È come Windows lo consegna a chi fa «copia come percorso»: rifiutarlo
    // manderebbe a cercare un errore che non c'è.
    scritte({ ...PRONTA, 'registroDocenti.dettatura.programma': `"${ESEGUIBILE}"` })
    assert.equal(collegamentoDettatura().programma, ESEGUIBILE)
  })

  it('con programma e modello a posto, è pronta', () => {
    scritte(PRONTA)
    assert.deepEqual(prontezzaDettatura(collegamentoDettatura()), {
      pronto: true,
      scaricabile: false,
      motivo: '',
    })
  })

  it('il modello che non si trova si dice per nome', () => {
    const mancante = percorso.join(tmpdir(), 'ggml-che-non-c-e.bin')
    scritte({ ...PRONTA, 'registroDocenti.dettatura.modello': mancante })
    const motivo = prontezzaDettatura(collegamentoDettatura()).motivo
    assert.match(motivo, /ggml-che-non-c-e\.bin/)
    assert.match(motivo, /whisper\.cpp/)
  })
})

describe('il corredo che il registro si scarica', () => {
  /** Mette nella cartella del corredo un file con quel nome. */
  function nelCorredo (nome, contenuto = 'ciao') {
    mkdirSync(CORREDO, { recursive: true })
    const file = percorso.join(CORREDO, nome)
    writeFileSync(file, contenuto)
    return file
  }

  it('la cartella la decide l’impostazione', () => {
    // È la riga da cui dipendono tutte le prove qui sotto: se l'impostazione
    // non contasse, il ripiego verrebbe cercato nei dati veri della macchina
    // su cui gira `npm test`.
    scritte({ 'registroDocenti.dettatura.attivo': true })
    assert.equal(cartellaCorredo(), CORREDO)
  })

  it('quel che è sceso nella cartella fa da ripiego, senza scrivere niente', () => {
    const programma = nelCorredo('whisper-cli.exe')
    const modello = nelCorredo('ggml-large-v3-turbo-q5_0.bin')
    scritte({ 'registroDocenti.dettatura.attivo': true })

    const collegamento = collegamentoDettatura()
    assert.equal(collegamento.programma, programma)
    assert.equal(collegamento.modello, modello)
    assert.equal(prontezzaDettatura(collegamento).pronto, true)
  })

  it('quel che è scritto a mano vince sul ripiego', () => {
    // È la regola dichiarata in testa a `voiceKit.ts`: lo scarico è il
    // ripiego, non il padrone. Chi ha una copia sua — compilata, aggiornata,
    // con l'accelerazione della sua scheda — continua ad avere ragione lui.
    nelCorredo('whisper-cli.exe')
    scritte(PRONTA)
    assert.equal(collegamentoDettatura().programma, ESEGUIBILE)
  })

  it('il ripiego passa dalla stessa guardia del percorso scritto a mano', {
    skip: process.platform !== 'win32',
  }, () => {
    // Un file nella cartella del corredo non è più fidato di uno scelto a
    // mano: se non è un `.exe` non si esegue, e la dettatura resta non pronta.
    // Senza questa riga la cartella del corredo sarebbe una seconda porta con
    // una guardia più larga, che è il modo in cui queste difese si perdono.
    nelCorredo('whisper-cli.bat', 'echo ciao')
    scritte({ 'registroDocenti.dettatura.attivo': true })
    assert.equal(collegamentoDettatura().programma, '')
  })

  it('un percorso scritto storto non fa partire uno scarico', () => {
    // Scaricare mezzo gigabyte per aggirare un percorso sbagliato vorrebbe
    // dire nascondere a chi l'ha scritto che l'ha scritto male.
    scritte({
      ...PRONTA,
      'registroDocenti.dettatura.programma': percorso.join(tmpdir(), 'non-esiste-whisper.exe'),
    })
    assert.equal(prontezzaDettatura(collegamentoDettatura()).scaricabile, false)
  })

  it('lo scarico automatico spento riporta la frase di prima', () => {
    scritte({
      'registroDocenti.dettatura.attivo': true,
      'registroDocenti.dettatura.scaricoAutomatico': false,
    })
    const stato = prontezzaDettatura(collegamentoDettatura())
    assert.equal(stato.scaricabile, false)
    assert.match(stato.motivo, /impostazioni/)
  })

  /**
   * Che cosa si tiene di un archivio.
   *
   * È la regola che `voiceKit.ts` dichiara per whisper, ripetuta qui perché
   * la funzione che la porta è privata. Quel che si prova non è la regola — un
   * nome sbagliato lì dentro fa uscire zero file, e `kit.ts` lo dice
   * forte — ma la **selezione e l'appiattimento**, che invece falliscono in
   * silenzio scrivendo dove non si voleva.
   */
  const tiene = (nome) =>
    nome.toLowerCase() === 'whisper-cli.exe' || nome.toLowerCase().endsWith('.dll')

  it('dall’archivio escono l’eseguibile e le librerie, e nient’altro', () => {
    const dentro = percorso.join(process.env.REGISTRO_USERDATA, 'scompattato')
    mkdirSync(dentro, { recursive: true })
    const archivio = scriviZip([
      { nome: 'Release/whisper-cli.exe', dati: Buffer.from('MZ finto') },
      { nome: 'Release/whisper.dll', dati: Buffer.from('libreria') },
      { nome: 'Release/ggml-cpu-haswell.dll', dati: Buffer.from('libreria') },
      // Gli altri trenta programmi dell'archivio: non servono, e sono trenta
      // eseguibili in più sul disco di una scuola.
      { nome: 'Release/whisper-server.exe', dati: Buffer.from('MZ finto') },
      { nome: 'Release/README.md', dati: Buffer.from('# whisper') },
    ])

    assert.equal(scompatta(archivio, dentro, tiene), 3)
    assert.deepEqual(readdirSync(dentro).sort(), [
      'ggml-cpu-haswell.dll',
      'whisper-cli.exe',
      'whisper.dll',
    ])
  })

  it('una voce che risale non scrive fuori dalla cartella', () => {
    // La guardia 4 di `voiceKit.ts`. Il nome passa da `basename`, quindi
    // quel che uscirebbe si chiamerebbe `whisper-cli.exe` e starebbe dentro —
    // ma questa prova guarda la cosa che conta davvero, cioè che **fuori** non
    // venga scritto niente.
    const dentro = percorso.join(process.env.REGISTRO_USERDATA, 'chiuso')
    mkdirSync(dentro, { recursive: true })
    const fuori = percorso.join(process.env.REGISTRO_USERDATA, 'scappato.exe')
    const archivio = scriviZip([
      { nome: '../../scappato.exe', dati: Buffer.from('MZ finto') },
      { nome: 'Release/whisper-cli.exe', dati: Buffer.from('MZ finto') },
    ])

    scompatta(archivio, dentro, tiene)
    assert.equal(existsSync(fuori), false)
  })
})

describe('i tetti', () => {
  it('l’attesa ha un pavimento', () => {
    assert.equal(collegamentoDettatura().attesaMs, 120_000)
    // Due secondi non sono una configurazione: sono un timeout mascherato da
    // impostazione, come per i modelli in `llm.ts`.
    scritte({ 'registroDocenti.dettatura.attesaMassimaSecondi': 2 })
    assert.equal(collegamentoDettatura().attesaMs, 10_000)
  })

  it('la durata sta fra cinque secondi e cinque minuti', () => {
    assert.equal(collegamentoDettatura().durataMassimaMs, 60_000)

    scritte({ 'registroDocenti.dettatura.durataMassimaSecondi': 1 })
    assert.equal(collegamentoDettatura().durataMassimaMs, 5_000)

    // Un tetto di un'ora vorrebbe dire un WAV da cento megabyte scritto sul
    // disco e un programma che macina per mezz'ora su un microfono dimenticato.
    scritte({ 'registroDocenti.dettatura.durataMassimaSecondi': 3600 })
    assert.equal(collegamentoDettatura().durataMassimaMs, 300_000)
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
    // della lunghezza stessa: sbagliarla fa leggere metà registrazione.
    assert.equal(vista(file).getUint32(4, true), file.length - 8)
    assert.equal(vista(file).getUint32(40, true), 8)
  })

  it('dichiara esattamente quel che whisper.cpp vuole sentirsi dire', () => {
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

describe('la riga di comando', () => {
  it('dichiara l’italiano, il modello e il file', () => {
    scritte(PRONTA)
    const riga = argomenti(collegamentoDettatura(), 'C:/temp/voce.wav')

    assert.deepEqual(riga.slice(0, 6), ['-m', UN_FILE, '-f', 'C:/temp/voce.wav', '-l', 'it'])
    assert.ok(riga.includes('-nt'), 'niente marche temporali')
    assert.ok(riga.includes('-np'), 'niente stampe di servizio')
  })

  it('porta il vocabolario di scuola', () => {
    scritte(PRONTA)
    const riga = argomenti(collegamentoDettatura(), 'voce.wav')
    const suggerimento = riga[riga.indexOf('--prompt') + 1]
    assert.match(suggerimento, /giustificazione/)
  })

  it('non traduce mai', () => {
    // `-tr` traduce in inglese. Una dettatura tradotta è una frase che nessuno
    // ha detto: questa riga è qui perché nessuno la aggiunga «per provare».
    scritte(PRONTA)
    const riga = argomenti(collegamentoDettatura(), 'voce.wav')
    assert.ok(!riga.includes('-tr'))
    assert.ok(!riga.includes('--translate'))
  })
})

describe('quel che torna dal programma', () => {
  it('le annotazioni non sono parole dette', () => {
    assert.equal(ripulisci('[BLANK_AUDIO]'), '')
    assert.equal(ripulisci('(musica)\nQuante ore ha perso la 4a?'), 'Quante ore ha perso la 4a?')
  })

  it('le frasi che il modello inventa sul silenzio si buttano', () => {
    // Non è rumore raro: un modello multilingue davanti al silenzio scrive la
    // frase più frequente nei sottotitoli italiani su cui è stato addestrato,
    // e la scrive con la sicurezza di una trascrizione vera.
    assert.equal(ripulisci('Sottotitoli e revisione a cura di QTSS'), '')
    assert.equal(ripulisci('Grazie per aver guardato il video!'), '')
  })

  it('gli a capo di whisper diventano una frase sola', () => {
    assert.equal(
      ripulisci('  Metti assente Rossi\n  per la prima ora.  \n'),
      'Metti assente Rossi per la prima ora.',
    )
  })
})

describe('il silenzio', () => {
  it('non si manda a trascrivere: si risponde che non si è sentito niente', async () => {
    // Conta due volte. La prima: un modello messo davanti al silenzio inventa,
    // e la frase inventata finirebbe nella casella come se qualcuno l'avesse
    // detta. La seconda: il programma non parte, e non partendo non ci sono
    // venti secondi di macchina spesi per niente. Il fatto che questa prova
    // passi con `node.exe` al posto di whisper è la dimostrazione del secondo.
    scritte(PRONTA)
    const esito = await trascrivi({ campioni: new Int16Array(16000), frequenza: 16000 })

    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non ho sentito/i)
  })

  it('mezzo decimo di secondo di voce è un clic, non una domanda', async () => {
    scritte(PRONTA)
    const campioni = new Int16Array(800)
    for (let i = 0; i < campioni.length; i += 1) campioni[i] = i % 2 === 0 ? 9000 : -9000

    const esito = await trascrivi({ campioni, frequenza: 16000 })
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /non ho sentito/i)
  })

  it('spenta, non si trascrive niente anche se la voce c’è', async () => {
    const campioni = new Int16Array(16000)
    for (let i = 0; i < campioni.length; i += 1) campioni[i] = i % 2 === 0 ? 9000 : -9000

    const esito = await trascrivi({ campioni, frequenza: 16000 })
    assert.equal(esito.ok, false)
    assert.match(esito.motivo, /spenta/i)
  })
})

// Quanto si scarica, non soltanto se si scarica.
//
// Il corredo ha due pezzi e si prendevano sempre tutti e due: chi si era messo
// da parte un modello suo — un `ggml-tiny.bin`, un `base`, quello che gli
// stava sul portatile — e lo aveva scritto nelle impostazioni, mancando il
// solo programma si vedeva partire anche mezzo gigabyte di `large-v3-turbo`
// che quella macchina non avrebbe mai aperto. Chi porta i pacchi salta quel che
// è già nella cartella del corredo, e un modello scelto a mano in quella
// cartella non c'è: da lì non si vedeva.
describe('quanto si scarica', () => {
  /** Un file che passa la guardia del modello: assoluto, e un file davvero. */
  function modelloFinto (nome) {
    const file = percorso.join(process.env.REGISTRO_USERDATA, nome)
    writeFileSync(file, 'pesi finti')
    return file
  }

  it('con un modello proprio scritto a mano, scende il solo programma', () => {
    scritte({
      'registroDocenti.dettatura.attivo': true,
      'registroDocenti.dettatura.modello': modelloFinto('ggml-tiny.bin'),
    })
    const collegamento = collegamentoDettatura()
    assert.equal(collegamento.modello.endsWith('ggml-tiny.bin'), true)
    assert.deepEqual(mancanti(collegamento), ['programma'])
  })

  it('senza niente scendono tutti e due', () => {
    scritte({ 'registroDocenti.dettatura.attivo': true })
    assert.deepEqual(mancanti(collegamentoDettatura()), ['programma', 'modello'])
  })

  it('con tutto a posto non scende niente', () => {
    scritte(PRONTA)
    const collegamento = collegamentoDettatura()
    // Su Linux la guardia del programma è un'altra: quel che conta qui è che
    // un pezzo che c'è non compaia fra quelli da prendere.
    assert.equal(mancanti(collegamento).includes('modello'), false)
  })
})

// Un modello che l'italiano non lo sa.
//
// `-l it` c'è sempre, e per un pezzo è sembrato che bastasse. Non basta con un
// modello `.en`: whisper.cpp lo ignora, perché quel modello l'italiano non l'ha
// mai visto, e quel che torna è inglese. Il guasto è muto nel modo peggiore —
// la dettatura funziona, il registro scrive, e in una casella dell'appello
// compare una frase in un'altra lingua.
describe('i modelli che capiscono solo l’inglese', () => {
  beforeEach(() => {
    scritte({ 'registroDocenti.dettatura.attivo': true })
  })

  it('si riconoscono dal nome, che è l’unica cosa leggibile senza aprirli', () => {
    for (const nome of ['ggml-base.en.bin', 'ggml-small.en.bin', 'GGML-TINY.EN.BIN']) {
      assert.equal(soloInglese(`/modelli/${nome}`), true, nome)
    }
    // E i multilingui non si rifiutano per sbaglio: «en» dentro un'altra parola
    // non è il suffisso, e il suffisso sta solo prima di «.bin».
    for (const nome of [
      'ggml-large-v3-turbo-q5_0.bin', 'ggml-base.bin', 'ggml-medium.bin', 'enorme.bin',
    ]) {
      assert.equal(soloInglese(`/modelli/${nome}`), false, nome)
    }
  })

  it('la prontezza lo dice invece di lasciar scrivere in inglese', () => {
    // Il collegamento si compone a mano: qui non interessa da dove vengano il
    // programma e il modello, interessa che con un `.en` la prontezza si fermi
    // **anche quando tutto il resto c'è**. È l'unico caso in cui la dettatura
    // potrebbe partire e scrivere la cosa sbagliata.
    const stato = prontezzaDettatura({
      ...collegamentoDettatura(),
      programma: '/programmi/whisper-cli.exe',
      modello: '/modelli/ggml-base.en.bin',
    })
    assert.equal(stato.pronto, false)
    assert.equal(stato.scaricabile, false)
    assert.match(stato.motivo, /capisce solo l’inglese/)
    // E dice che cosa fare, non solo che c'è un problema.
    assert.match(stato.motivo, /multilingue/)
  })
})
