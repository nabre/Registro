// Il livello LLM: due usi che non si toccano, e un modello che è un file.
//
// Questo file non prova che un modello risponda bene — per quello serve un
// modello, e un modello in una prova è una prova che cambia idea. Prova le tre
// cose che `llm.ts` e `gguf.ts` esistono per garantire:
//
//   1. **Gli usi sono indipendenti.** `ocr` e `assistente` hanno ciascuno il
//      proprio interruttore, modello e attesa. Spegnerne uno non spegne
//      l'altro; cambiare il modello dell'uno non cambia quello dell'altro. È
//      l'invariante che si romperebbe il giorno in cui qualcuno «semplificasse»
//      le chiavi in una sola, e il guasto si vedrebbe come un OCR che smette di
//      funzionare perché si è spento l'assistente.
//
//   2. **Il modello passa da una guardia sola.** Nelle impostazioni ci va un
//      nome di file, e quel file deve stare nella cartella dei modelli. Il
//      valore arriva da un JSON in `userData`, che qualsiasi programma sulla
//      macchina può riscrivere: un percorso assoluto messo a mano lì dentro, o
//      una risalita con `..`, **non deve diventare un file che il registro
//      apre**. Prima di qui la stessa guardia difendeva un indirizzo HTTP;
//      adesso difende un percorso, che è un bersaglio diverso e più vicino.
//
//   3. **Quel che manca si dice in italiano**, con dentro dove si rimedia:
//      `prontezza()` distingue l'uso spento dal modello mai scelto e dal file
//      sparito dalla cartella, perché sono tre cose da fare diverse.
//
// Niente rete e niente libreria: il motore non si carica mai, perché nessuno
// chiede niente a un modello. È quel che permette a `npm test` di girare su una
// macchina che non ha un `.gguf` in tutto il disco.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-llm-'))

const {
  argomenti,
  cartellaCorredo,
  collegamento,
  elimina,
  importa,
  modelliLocali,
  modelloNellaCartella,
  perGriglia,
  perchéNonEntra,
  programmaDa,
  prontezza,
  ricaricaImpostazioni,
  ripulisci,
  segnaSorgente,
  siScarica,
  sorgenteDi,
} = await import('../../dist-tests/llm.mjs')

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')
const MODELLI = percorso.join(process.env.REGISTRO_USERDATA, 'modelli')
mkdirSync(MODELLI, { recursive: true })

/**
 * Dove il registro terrebbe il programma che si scarica da sé.
 *
 * Dichiarata in **ogni** prova, come la cartella dei modelli: senza, `mtmd.ts`
 * andrebbe a cercare il ripiego nei dati veri della macchina su cui gira
 * `npm test`, e su un computer dove le scansioni sono già state lette una volta
 * queste prove passerebbero per il motivo sbagliato. Una cartella nuova a ogni
 * prova, perché un file lasciato lì da quella prima renderebbe pronto quel che
 * doveva risultare mancante.
 */
let CORREDO = ''
let quante = 0

/** Scrive le impostazioni come le troverebbe il programma all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify({
    'registroDocenti.modelli.cartella': MODELLI,
    'registroDocenti.ocr.cartella': CORREDO,
    ...valori,
  }), 'utf8')
  ricaricaImpostazioni()
}

/**
 * Un `.gguf` finto ma riconoscibile.
 *
 * I primi quattro byte dicono `GGUF` perché è quello che la guardia guarda: un
 * file con l'estensione giusta e il contenuto sbagliato deve essere respinto, e
 * per provarlo servono tutti e due i casi.
 */
function modello (nome, magia = 'GGUF') {
  const dove = percorso.join(MODELLI, nome)
  writeFileSync(dove, `${magia}${'\0'.repeat(28)}`)
  return dove
}

beforeEach(() => {
  quante += 1
  CORREDO = percorso.join(process.env.REGISTRO_USERDATA, `corredo-${quante}`)
  scritte({})
})

describe('i due usi sono indipendenti', () => {
  it('nascono spenti tutti e due', () => {
    assert.equal(collegamento('ocr').attivo, false)
    assert.equal(collegamento('assistente').attivo, false)
  })

  it('accendere l’uno non accende l’altro', () => {
    scritte({ 'registroDocenti.assistente.attivo': true })

    assert.equal(collegamento('assistente').attivo, true)
    assert.equal(collegamento('ocr').attivo, false)
  })

  it('ognuno tiene il proprio modello', () => {
    // Il caso vero: un modello che vede per le scansioni, uno che chiama gli
    // attrezzi per l'assistente. Se le chiavi si fondessero, questo smetterebbe
    // di essere possibile senza che nessuna prova protesti.
    modello('vede.gguf')
    modello('ragiona.gguf')
    scritte({
      'registroDocenti.ocr.modello': 'vede.gguf',
      'registroDocenti.assistente.modello': 'ragiona.gguf',
    })

    assert.equal(percorso.basename(collegamento('ocr').modello), 'vede.gguf')
    assert.equal(percorso.basename(collegamento('assistente').modello), 'ragiona.gguf')
  })

  it('senza niente scritto non c’è nessun modello, e non se ne inventa uno', () => {
    // Prima esisteva un modello predefinito, perché il nome era una chiave di
    // ricerca dentro un servizio. Adesso è un file: un predefinito che non
    // esiste sarebbe una promessa, e chi la legge andrebbe a cercare il guasto
    // da tutt'altra parte.
    assert.equal(collegamento('ocr').modello, '')
    assert.equal(collegamento('assistente').modello, '')
  })

  it('ognuno tiene la propria attesa, e il pavimento vale per tutti', () => {
    assert.equal(collegamento('ocr').attesaMs, 180_000)
    assert.equal(collegamento('assistente').attesaMs, 120_000)

    // Due secondi su un modello locale non sono una configurazione: sono un
    // timeout mascherato da impostazione, e il pavimento è lì per questo.
    scritte({ 'registroDocenti.assistente.attesaMassimaSecondi': 2 })
    assert.equal(collegamento('assistente').attesaMs, 10_000)
  })

  it('i motori sono due, e li decide che cosa l’uso manda', () => {
    // Non è un'impostazione e non deve esserlo: chi manda immagini ha bisogno
    // di un motore che le accetti, e la libreria in processo non le accetta.
    // Una tendina qui offrirebbe il modo di accoppiare l'OCR a un motore cieco
    // e poi chiedersi perché ogni pagina torna vuota.
    assert.equal(collegamento('assistente').motore.nome, 'llama.cpp')
    assert.equal(collegamento('assistente').motore.vede, false)
    assert.equal(collegamento('ocr').motore.nome, 'llama-mtmd-cli')
    assert.equal(collegamento('ocr').motore.vede, true)
  })
})

describe('la guardia del modello', () => {
  it('un file che sta nella cartella si risolve intero', () => {
    modello('buono.gguf')
    assert.equal(modelloNellaCartella('buono.gguf'), percorso.join(MODELLI, 'buono.gguf'))
  })

  it('un percorso non è un nome di file, e non passa', () => {
    // Chi ha riscritto il JSON delle impostazioni sceglierebbe che cosa il
    // registro carica in memoria. Un nome di file, e soltanto quello.
    modello('buono.gguf')
    for (const storto of [
      percorso.join(MODELLI, 'buono.gguf'),
      '../buono.gguf',
      'sotto/buono.gguf',
      'C:\\Windows\\System32\\config\\SAM',
      '/etc/passwd',
    ]) {
      assert.equal(modelloNellaCartella(storto), '', storto)
    }
  })

  it('solo `.gguf`, e solo se c’è davvero', () => {
    assert.equal(modelloNellaCartella('mai-scaricato.gguf'), '')
    writeFileSync(percorso.join(MODELLI, 'appunti.txt'), 'niente')
    assert.equal(modelloNellaCartella('appunti.txt'), '')
  })

  it('vale per tutti e due gli usi, e non solo per quello provato', () => {
    // La guardia è una, e la prova gira sull'elenco degli usi: così un terzo
    // uso non può nascere senza di lei.
    for (const uso of ['ocr', 'assistente']) {
      scritte({ [`registroDocenti.${uso}.modello`]: percorso.join(MODELLI, 'buono.gguf') })
      assert.equal(collegamento(uso).modello, '', uso)
      // Quel che era scritto resta leggibile: serve a dire *che cosa* non si è
      // trovato, e senza si mostrerebbe «manca un modello» a chi ne aveva
      // scelto uno.
      assert.notEqual(collegamento(uso).modelloChiesto, '')
    }
  })
})

describe('che cosa entra fra i modelli', () => {
  it('un file che non è GGUF non entra, e si dice perché', () => {
    const finto = percorso.join(process.env.REGISTRO_USERDATA, 'certificato.gguf')
    writeFileSync(finto, '%PDF-1.7 e poi il resto')

    const perché = perchéNonEntra(finto)
    assert.match(perché, /non lo è/)
    assert.throws(() => importa(finto), /non lo è/)
  })

  it('un file con un’altra estensione nemmeno, e lo dice prima di leggerlo', () => {
    const pdf = percorso.join(process.env.REGISTRO_USERDATA, 'modulo.pdf')
    writeFileSync(pdf, 'GGUF ma si chiama pdf')
    assert.match(perchéNonEntra(pdf), /\.gguf/)
  })

  it('un GGUF vero entra, e non sovrascrive quello che c’era', () => {
    const fuori = percorso.join(process.env.REGISTRO_USERDATA, 'portato.gguf')
    writeFileSync(fuori, `GGUF${'\0'.repeat(28)}`)

    const primo = importa(fuori)
    const secondo = importa(fuori)

    assert.equal(primo.nome, 'portato.gguf')
    // Il secondo non è il primo: quello di prima potrebbe essere il modello che
    // l'assistente sta usando in questo momento.
    assert.notEqual(secondo.nome, primo.nome)
    assert.match(secondo.nome, /portato-2\.gguf$/)
  })

  it('l’elenco mostra i .gguf e riconosce i proiettori', () => {
    modello('mmproj-visione.gguf')
    const elenco = modelliLocali()
    const proiettore = elenco.find((m) => m.nome === 'mmproj-visione.gguf')

    assert.ok(proiettore, 'il proiettore deve comparire')
    // Si riconosce dal nome: è la convenzione di tutto l'ecosistema, ed è
    // quella che impedisce alla pagina di proporlo come modello da scegliere.
    assert.equal(proiettore.proiettore, true)
    assert.ok(elenco.every((m) => m.nome.endsWith('.gguf')))
  })

  it('si cancella solo dentro la cartella, e solo un .gguf', () => {
    modello('da-buttare.gguf')
    elimina('da-buttare.gguf')
    assert.equal(modelloNellaCartella('da-buttare.gguf'), '')

    assert.throws(() => elimina('../../impostazioni.json'), /non è fra i modelli/)
    assert.throws(() => elimina('mai-esistito.gguf'), /non è fra i modelli/)
  })
})

describe('mentre un modello sta scendendo', () => {
  // Chi scarica scrive in `<nome>.gguf.ipull` e rinomina soltanto alla fine.
  // Fino ad allora quel file **non è un modello**, e tutte e tre le strade che
  // portano a caricarlo devono rifiutarlo: la tendina, la guardia che risolve
  // il nome, e le impostazioni riscritte a mano.
  //
  // Provato sul campo con uno scarico vero prima di scriverlo: a 80 MB di 491
  // la cartella conteneva solo il `.ipull`, e l'assistente rispondeva
  // normalmente nel frattempo.
  function aMetà (nome) {
    const dove = percorso.join(MODELLI, `${nome}.ipull`)
    writeFileSync(dove, 'GGUF ma solo l’inizio')
    return dove
  }

  it('lo scarico a metà si vede, e si vede che è a metà', () => {
    aMetà('qwen-grosso.gguf')
    const trovato = modelliLocali().find((m) => m.nome === 'qwen-grosso.gguf.ipull')

    // Prima non si mostrava affatto, ed era peggio: due gigabyte lasciati da
    // un'applicazione chiusa a metà scarico restavano lì senza che nessuno
    // potesse vederli né toglierli dalla pagina.
    assert.ok(trovato, 'uno scarico a metà deve comparire nell’elenco')
    assert.equal(trovato.incompiuto, true)
  })

  it('non si può scegliere come modello, per nessuna delle due vie', () => {
    aMetà('qwen-grosso.gguf')

    // Dalla pagina: la tendina mostra solo i modelli finiti.
    assert.equal(modelloNellaCartella('qwen-grosso.gguf.ipull'), '')
    // Dalle impostazioni riscritte a mano, con o senza il suffisso: il file
    // vero non esiste ancora, e quello a metà non è un `.gguf`.
    assert.equal(modelloNellaCartella('qwen-grosso.gguf'), '')

    scritte({
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'qwen-grosso.gguf',
    })
    const stato = prontezza(collegamento('assistente'))
    assert.equal(stato.pronto, false)
    // Caricare dei pesi troncati darebbe un errore che parla di tensori a chi
    // voleva sapere quante assenze ha una classe.
    assert.match(stato.motivo, /non è più nella cartella/)
  })

  it('si può buttare, e buttarlo non tocca i modelli finiti', () => {
    aMetà('qwen-grosso.gguf')
    modello('finito.gguf')

    elimina('qwen-grosso.gguf.ipull')

    const rimasti = modelliLocali().map((m) => m.nome)
    assert.ok(!rimasti.includes('qwen-grosso.gguf.ipull'))
    assert.ok(rimasti.includes('finito.gguf'))
  })

  // Riprendere uno scarico vuol dire rifare **lo stesso** scarico, e il file a
  // metà non dice da dove veniva: il `.ipull` della libreria porta a che punto
  // era arrivata — quali pezzi ha già presi — e non l'indirizzo. Senza il
  // biglietto accanto, «Riprendi» non ha niente da rifare, e l'unica strada
  // era ritrovare il deposito a mano nel catalogo.
  it('il biglietto dice da dove veniva quel che è sceso a metà', () => {
    aMetà('qwen-grosso.gguf')
    segnaSorgente('qwen-grosso.gguf', {
      deposito: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
      file: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
      per: 'assistente',
    })

    const trovato = modelliLocali().find((m) => m.nome === 'qwen-grosso.gguf.ipull')
    assert.deepEqual(trovato.sorgente, {
      deposito: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
      file: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
      per: 'assistente',
    })
    // Anche con il suffisso: chi chiede parte dal nome che vede nell'elenco.
    assert.equal(sorgenteDi('qwen-grosso.gguf.ipull').deposito, 'bartowski/Qwen2.5-7B-Instruct-GGUF')
  })

  it('senza biglietto non si inventa un deposito', () => {
    aMetà('venuto-da-chissa-dove.gguf')
    const trovato = modelliLocali().find((m) => m.nome === 'venuto-da-chissa-dove.gguf.ipull')
    assert.equal(trovato.incompiuto, true)
    // Nessuna sorgente: la pagina mostra il solo «Butta» invece di un
    // «Riprendi» che non potrebbe riprendere niente.
    assert.equal(trovato.sorgente, undefined)
    assert.equal(sorgenteDi('venuto-da-chissa-dove.gguf'), null)
  })

  it('buttando i pesi se ne va anche il biglietto', () => {
    aMetà('qwen-grosso.gguf')
    segnaSorgente('qwen-grosso.gguf', { deposito: 'un/deposito', file: 'un-file.gguf' })

    elimina('qwen-grosso.gguf.ipull')

    // Un indirizzo appeso a un file che non c'è più è un «Riprendi» che
    // ricomincerebbe da capo facendo credere di riprendere.
    assert.equal(sorgenteDi('qwen-grosso.gguf'), null)
  })

  it('un biglietto scritto storto si legge come «non si sa»', () => {
    aMetà('qwen-grosso.gguf')
    writeFileSync(percorso.join(MODELLI, 'qwen-grosso.gguf.sorgente.json'), 'non JSON')
    assert.equal(sorgenteDi('qwen-grosso.gguf'), null)
    // E il file a metà si vede lo stesso: un biglietto illeggibile non deve
    // nascondere due gigabyte.
    assert.ok(modelliLocali().some((m) => m.nome === 'qwen-grosso.gguf.ipull'))
  })

  it('la cancellazione resta chiusa dentro la cartella', () => {
    // La stessa guardia dei modelli finiti: il nome arriva da una procedura,
    // cioè da fuori, e una cancellazione è la cosa che non si disfa.
    assert.throws(() => elimina('../impostazioni.json.ipull'), /non è fra i modelli/)
    assert.throws(() => elimina('mai-esistito.gguf.ipull'), /non è fra i modelli/)
  })
})

describe('che cosa si dice a chi non può chiedere niente', () => {
  it('spento: si dice dove si accende', () => {
    const stato = prontezza(collegamento('assistente'))
    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /impostazioni/)
  })

  it('acceso e senza modello: si manda alla pagina che lo scarica', () => {
    scritte({ 'registroDocenti.assistente.attivo': true })
    const stato = prontezza(collegamento('assistente'))

    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /Modelli linguistici/)
  })

  it('il file sparito dalla cartella non si confonde con il modello mai scelto', () => {
    // Sono due cose da fare diverse: la prima è riscaricare, la seconda è
    // scegliere. Un messaggio solo per tutti e due manderebbe metà delle
    // persone dalla parte sbagliata.
    scritte({
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'sparito.gguf',
    })
    const stato = prontezza(collegamento('assistente'))

    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /non è più nella cartella/)
  })

  it('l’assistente con il suo modello è pronto, senza chiedere niente a nessuno', () => {
    modello('ragiona.gguf')
    scritte({
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'ragiona.gguf',
    })

    assert.equal(prontezza(collegamento('assistente')).pronto, true)
  })

  it('le scansioni vogliono anche il programma, e senza scarico lo dicono', () => {
    modello('vede.gguf')
    scritte({
      'registroDocenti.ocr.attivo': true,
      'registroDocenti.ocr.modello': 'vede.gguf',
      'registroDocenti.ocr.scaricoAutomatico': false,
    })

    // Senza il programma non si legge niente: la libreria in processo non
    // accetta immagini. Spento lo scarico, torna la frase che dice dove si
    // prende — che è l'unica cosa da fare, a quel punto.
    const senzaProgramma = prontezza(collegamento('ocr'))
    assert.equal(senzaProgramma.pronto, false)
    assert.match(senzaProgramma.motivo, /llama-mtmd-cli/)
  })
})

describe('il corredo delle scansioni', () => {
  /** Mette nella cartella del corredo un file con quel nome. */
  function nelCorredo (nome, contenuto = 'ciao') {
    mkdirSync(CORREDO, { recursive: true })
    const file = percorso.join(CORREDO, nome)
    writeFileSync(file, contenuto)
    return file
  }

  /** Le impostazioni di una lettura a cui manca solo il programma. */
  function conModello (altro = {}) {
    modello('vede.gguf')
    modello('mmproj-vede.gguf')
    scritte({
      'registroDocenti.ocr.attivo': true,
      'registroDocenti.ocr.modello': 'vede.gguf',
      'registroDocenti.ocr.proiettore': 'mmproj-vede.gguf',
      ...altro,
    })
  }

  it('quel che è sceso nella cartella fa da ripiego, senza scrivere niente', () => {
    const programma = nelCorredo('llama-mtmd-cli.exe')
    conModello()
    assert.equal(programmaDa(collegamento('ocr')), programma)
    assert.equal(prontezza(collegamento('ocr')).pronto, true)
  })

  it('quel che è scritto a mano vince sul ripiego', () => {
    // È la regola dichiarata in testa a `visionKit.ts`: lo scarico è il
    // ripiego, non il padrone. Chi ha una copia sua — con l'accelerazione
    // della propria scheda video — continua ad avere ragione lui.
    nelCorredo('llama-mtmd-cli.exe')
    const mio = nelCorredo('mio-mtmd.exe')
    conModello({ 'registroDocenti.ocr.programma': mio })
    assert.equal(programmaDa(collegamento('ocr')), mio)
  })

  it('il ripiego passa dalla stessa guardia del percorso scritto a mano', {
    skip: process.platform !== 'win32',
  }, () => {
    // Un file nella cartella del corredo non è più fidato di uno scelto a
    // mano: se non è un `.exe` non si esegue. Senza questa riga quella
    // cartella sarebbe una seconda porta con una guardia più larga.
    nelCorredo('llama-mtmd-cli.bat', 'echo ciao')
    conModello()
    assert.equal(programmaDa(collegamento('ocr')), '')
  })

  it('quel che scende da sé non è un impedimento a leggere', () => {
    // La riga che conta: `actions/sorting.ts` usa la prontezza per
    // **fermare** una coda, e un impedimento dichiarato qui rifiuterebbe la
    // lettura per un file che sarebbe arrivato in venti secondi. Quei venti
    // secondi li aspetta la prima pagina, dentro il motore.
    conModello()
    const stato = prontezza(collegamento('ocr'))
    assert.equal(stato.pronto, siScarica())
    if (!siScarica()) assert.match(stato.motivo, /llama-mtmd-cli/)
  })

  it('la cartella la decide l’impostazione', () => {
    conModello()
    assert.equal(cartellaCorredo(), CORREDO)
  })
})

describe('la riga di comando che legge le scansioni', () => {
  const collegamentoFinto = {
    modello: 'C:/modelli/vede.gguf',
    proiettore: 'C:/modelli/mmproj.gguf',
    programma: 'C:/llama/llama-mtmd-cli.exe',
    attesaMs: 180_000,
  }

  it('il proiettore c’è sempre, e l’immagine è una sola', () => {
    // Senza `--mmproj` il programma parte, ignora la pagina e risponde
    // immaginando: è il guasto peggiore, perché non sembra un guasto. Questa
    // riga è l'unica cosa che impedisce a qualcuno di toglierlo «perché tanto
    // funziona lo stesso».
    const args = argomenti(collegamentoFinto, 'C:/temp/pagina.png', { richiesta: 'Trascrivi' })

    assert.ok(args.includes('--mmproj'))
    assert.equal(args[args.indexOf('--mmproj') + 1], collegamentoFinto.proiettore)
    assert.equal(args.filter((a) => a === '--image').length, 1)
  })

  it('niente conversazione, e niente traduzione', () => {
    const args = argomenti(collegamentoFinto, 'C:/temp/pagina.png', { richiesta: 'Trascrivi' })

    // Senza `-no-cnv` il programma resta ad aspettare una seconda battuta che
    // non arriva, e l'attesa scade su una pagina che era già stata letta.
    assert.ok(args.includes('-no-cnv'))
    // La temperatura a zero perché qui si legge un cognome su un foglio
    // firmato: un modello che varia le parole varia anche le lettere di un nome.
    assert.equal(args[args.indexOf('--temp') + 1], '0')
    // `-tr` tradurrebbe in inglese. Una scansione tradotta è un documento che
    // nessuno ha scritto, messo nel fascicolo di una persona in formazione.
    assert.ok(!args.includes('-tr'))
  })

  it('il tetto alle parole c’è solo quando lo chiede chi domanda', () => {
    const senza = argomenti(collegamentoFinto, 'p.png', { richiesta: 'Trascrivi' })
    const con = argomenti(collegamentoFinto, 'p.png', { richiesta: 'Trascrivi', tettoParole: 256 })

    assert.ok(!senza.includes('-n'))
    assert.equal(con[con.indexOf('-n') + 1], '256')
  })

  it('le righe di servizio del programma non finiscono nel testo letto', () => {
    // Quel che il programma stampa è misto: le sue marche e le parole del
    // modello. Le prime, lasciate passare, finirebbero nell'estratto mostrato
    // in quarantena — e da lì nel fascicolo di qualcuno.
    const uscita = [
      'main: loading model',
      'clip_model_load: model size = 595.49 MiB',
      '[img_0]',
      'Rossi Mario 3a A',
      'llama_perf_context_print: load time = 412 ms',
      '',
    ].join('\n')

    assert.equal(ripulisci(uscita), 'Rossi Mario 3a A')
  })
})

describe('lo schema come lo vede il modello', () => {
  it('un oggetto tiene le sue proprietà e la frase di ogni campo', () => {
    // `description` è l'`aiuto:` scritto sulla procedura: è l'unica frase con
    // cui il modello capisce che cosa mettere in un campo, e perderla vuol dire
    // un attrezzo che viene chiamato con argomenti a caso.
    const tradotto = perGriglia({
      type: 'object',
      properties: {
        corsoId: { type: 'string', description: 'Il corso' },
      },
      required: ['corsoId'],
    })

    assert.equal(tradotto.type, 'object')
    assert.deepEqual(tradotto.properties.corsoId, { description: 'Il corso', type: 'string' })
  })

  it('quel che non è obbligatorio si offre come «oppure niente»', () => {
    // La griglia esige tutte le proprietà che dichiara: un campo facoltativo
    // *tolto* sarebbe un campo che il modello non può più riempire — e
    // `dal`/`al` di `corso.presenze` sono esattamente quelli che servono per
    // restringere un periodo.
    const tradotto = perGriglia({
      type: 'object',
      properties: { dal: { type: 'string' } },
      required: [],
    })

    assert.deepEqual(tradotto.properties.dal, { oneOf: [{ type: 'null' }, { type: 'string' }] })
  })

  it('la frase di un campo facoltativo resta fuori dall’incarto, dove si legge', () => {
    // È il guasto che questa prova esiste per non far tornare, ed era grosso:
    // centoquindici proprietà su centoventotto degli attrezzi offerti sono
    // facoltative, e di tutte e centoquindici il modello non vedeva più la
    // spiegazione — soltanto `dal: null | string`.
    //
    // Il motivo sta nella libreria e non qui: il generatore che scrive al
    // modello la forma degli argomenti legge `description` **sulla proprietà**,
    // e del ramo `oneOf` si limita a unire i tipi con una barra. Una frase
    // messa dentro il ramo non la legge nessuno. Sul ramo, sì: i tipi della
    // griglia la ammettono lì.
    const tradotto = perGriglia({
      type: 'object',
      properties: {
        dal: { type: 'string', description: 'Senza, dall’inizio dell’anno' },
      },
      required: [],
    })

    assert.equal(tradotto.properties.dal.description, 'Senza, dall’inizio dell’anno')
    assert.deepEqual(tradotto.properties.dal.oneOf[0], { type: 'null' })
  })

  it('un nullabile scritto con due tipi diventa una scelta fra due forme', () => {
    // `schemaJson` stampa i nullabili come `type: ['number', 'null']`, che la
    // griglia non legge. Tradotto male, il campo diventerebbe sempre testo.
    const tradotto = perGriglia({ type: ['number', 'null'], description: 'Il voto' })

    assert.equal(tradotto.description, 'Il voto')
    assert.deepEqual(tradotto.oneOf.map((forma) => forma.type), ['number', 'null'])
  })

  it('quel che la griglia non sa leggere sparisce, invece di farla cadere', () => {
    // Un `pattern` che non sia una data la grammatica non lo sa esprimere.
    // Passato com'era, la costruzione della griglia fallisce e l'attrezzo non
    // viene offerto affatto — cioè il modello perde una procedura senza che
    // nessuno lo dica. E `minimum`/`maximum` sui numeri, che la griglia non ha.
    const tradotto = perGriglia({
      type: 'string',
      pattern: '^[a-z]+$',
      description: 'Una sigla',
    })

    assert.deepEqual(tradotto, { description: 'Una sigla', type: 'string' })
    assert.deepEqual(
      perGriglia({ type: 'integer', minimum: 1, maximum: 500, description: 'Quante' }),
      { description: 'Quante', type: 'integer' },
    )
  })

  it('una data si chiede col suo nome, e allora non se ne può generare una storta', () => {
    // Tutti e quindici i `pattern` del catalogo offerto all'assistente sono
    // questo, e la griglia una data la sa scrivere: `format: 'date'`. Tradotto,
    // una data malformata diventa *impossibile da generare*, invece che
    // rifiutata dopo dalla procedura — che è un giro perso e un pezzo di
    // contesto buttato.
    assert.deepEqual(
      perGriglia({ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Il primo giorno' }),
      { description: 'Il primo giorno', type: 'string', format: 'date' },
    )
  })

  it('le misure che la griglia conosce si tengono', () => {
    // `minLength`/`maxLength` sulle stringhe e `minItems`/`maxItems` sugli
    // elenchi la libreria li regge e li documenta al modello. Sessantaquattro
    // caratteri su un identificatore è un identificatore che non si inventa
    // lungo, e un elenco di filtri con almeno una voce non arriva vuoto.
    assert.deepEqual(
      perGriglia({ type: 'string', maxLength: 64 }),
      { type: 'string', maxLength: 64 },
    )
    assert.deepEqual(
      perGriglia({ type: 'array', items: { type: 'string' }, minItems: 1 }),
      { type: 'array', items: { type: 'string' }, minItems: 1 },
    )
    // Una misura scritta storta si lascia fuori: uno schema rifiutato dalla
    // libreria non si vede, si vede un attrezzo che sparisce dall'elenco.
    assert.deepEqual(perGriglia({ type: 'string', maxLength: 'sessanta' }), { type: 'string' })
  })

  it('gli esempi entrano nella frase, che è l’unica cosa che sopravvive', () => {
    // `examples` la griglia non ce l'ha, e sono sessantasette esempi scritti a
    // mano sulle procedure. Ricopiati dentro la `description` arrivano al
    // modello comunque — anche sui campi facoltativi, dove l'incarto `oneOf`
    // lascia passare soltanto quella.
    assert.deepEqual(
      perGriglia({ type: 'string', description: 'Il cognome', examples: ['rossi'] }),
      { description: 'Il cognome (es. rossi)', type: 'string' },
    )
    // Senza frase, l'esempio la fa lui: meglio di niente scritto.
    assert.deepEqual(
      perGriglia({ type: 'string', examples: ['2026-09-21'] }),
      { description: '(es. 2026-09-21)', type: 'string' },
    )
  })

  it('le scelte restano scelte, e gli elenchi sanno che cosa contengono', () => {
    assert.deepEqual(perGriglia({ enum: ['presente', 'assente'] }), { enum: ['presente', 'assente'] })
    assert.deepEqual(
      perGriglia({ type: 'array', items: { type: 'string' } }),
      { type: 'array', items: { type: 'string' } },
    )
  })

  it('una forma senza tipo diventa testo, perché la griglia vuole qualcosa', () => {
    assert.deepEqual(perGriglia({ description: 'Qualunque cosa' }), {
      description: 'Qualunque cosa',
      type: 'string',
    })
    assert.deepEqual(perGriglia(null), { type: 'string' })
  })
})
