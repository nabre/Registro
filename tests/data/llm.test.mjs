// Il livello LLM: due usi che non si toccano, e un modello che è un file. Non
// si prova che un modello risponda bene, ma che `llm.ts` e `gguf.ts`
// garantiscono:
//
//   1. **usi indipendenti**: `ocr` e `assistente` hanno ciascuno interruttore,
//      modello e attesa;
//   2. **una guardia sola sul modello**: nelle impostazioni (un JSON in
//      `userData` che chiunque può riscrivere) c'è un nome di file della
//      cartella dei modelli, mai un percorso assoluto o una risalita con `..`;
//   3. **quel che manca si dice in italiano**, col rimedio: `prontezza()`
//      distingue uso spento, modello mai scelto e file sparito.
//
// Niente rete né libreria: il motore non si carica mai, e `npm test` gira
// senza un `.gguf` sul disco.

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
  importaInDisparte,
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
 * Dove il registro terrebbe il programma che si scarica da sé. Dichiarata in
 * **ogni** prova, nuova ogni volta: altrimenti `mtmd.ts` cercherebbe il
 * ripiego nei dati veri della macchina, o un file della prova prima
 * renderebbe pronto quel che deve mancare.
 */
let CORREDO = ''
let quante = 0

/** Scrive le impostazioni come le troverebbe il programma all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify({
    'registroDocenti.modelli.cartella': MODELLI,
    ...valori,
  }), 'utf8')
  ricaricaImpostazioni()
}

/**
 * Un `.gguf` finto ma riconoscibile: i primi quattro byte dicono `GGUF`, perché
 * è quello che la guardia guarda.
 */
function modello (nome, magia = 'GGUF') {
  const dove = percorso.join(MODELLI, nome)
  writeFileSync(dove, `${magia}${'\0'.repeat(28)}`)
  return dove
}

beforeEach(() => {
  quante += 1
  // Il corredo sta nei dati dell'applicazione: la cartella la sposta
  // `REGISTRO_DATI`, come nella versione portabile.
  process.env.REGISTRO_DATI = percorso.join(process.env.REGISTRO_USERDATA, `dati-${quante}`)
  CORREDO = percorso.join(process.env.REGISTRO_DATI, 'lettura')
  scritte({})
})

describe('i due usi sono indipendenti', () => {
  it('nascono spenti tutti e due', () => {
    assert.equal(collegamento('ocr').attivo, false)
    assert.equal(collegamento('assistente').attivo, false)
  })

  it('accendere l’uno non accende l’altro', () => {
    scritte({
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'ragiona.gguf',
    })

    assert.equal(collegamento('assistente').attivo, true)
    assert.equal(collegamento('ocr').attivo, false)
  })

  it('ognuno tiene il proprio modello', () => {
    // Un modello che vede per le scansioni e uno che chiama gli attrezzi per
    // l'assistente, insieme.
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
    // Nessun modello predefinito: è un file, e un predefinito che non esiste
    // manderebbe a cercare il guasto altrove.
    assert.equal(collegamento('ocr').modello, '')
    assert.equal(collegamento('assistente').modello, '')
  })

  it('ognuno tiene la propria attesa, e non è un’impostazione', () => {
    // L'attesa è una costante del programma: un valore rimasto nel file non conta.
    scritte({ 'registroDocenti.assistente.attesaMassimaSecondi': 2 })
    assert.equal(collegamento('ocr').attesaMs, 180_000)
    assert.equal(collegamento('assistente').attesaMs, 120_000)
  })

  it('i motori sono due, e li decide che cosa l’uso manda', () => {
    // Il motore non è un'impostazione: l'OCR manda immagini e la libreria in
    // processo non le accetta.
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
    // Dal JSON delle impostazioni passa un nome di file, e soltanto quello.
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
    // La prova gira sull'elenco degli usi: un terzo uso non nasce senza guardia.
    for (const uso of ['ocr', 'assistente']) {
      scritte({ [`registroDocenti.${uso}.modello`]: percorso.join(MODELLI, 'buono.gguf') })
      assert.equal(collegamento(uso).modello, '', uso)
      // Quel che era scritto resta leggibile, per dire *che cosa* non si è trovato.
      assert.notEqual(collegamento(uso).modelloChiesto, '')
    }
  })
})

describe('che cosa entra fra i modelli', () => {
  it('un file che non è GGUF non entra, e si dice perché', async () => {
    const finto = percorso.join(process.env.REGISTRO_USERDATA, 'certificato.gguf')
    writeFileSync(finto, '%PDF-1.7 e poi il resto')

    const perché = perchéNonEntra(finto)
    assert.match(perché, /non lo è/)
    await assert.rejects(() => importaInDisparte(finto), /non lo è/)
  })

  it('un file con un’altra estensione nemmeno, e lo dice prima di leggerlo', () => {
    const pdf = percorso.join(process.env.REGISTRO_USERDATA, 'modulo.pdf')
    writeFileSync(pdf, 'GGUF ma si chiama pdf')
    assert.match(perchéNonEntra(pdf), /\.gguf/)
  })

  it('un GGUF vero entra, e non sovrascrive quello che c’era', async () => {
    const fuori = percorso.join(process.env.REGISTRO_USERDATA, 'portato.gguf')
    writeFileSync(fuori, `GGUF${'\0'.repeat(28)}`)

    const primo = await importaInDisparte(fuori)
    const secondo = await importaInDisparte(fuori)

    assert.equal(primo.nome, 'portato.gguf')
    // Il secondo non è il primo: il primo potrebbe essere in uso.
    assert.notEqual(secondo.nome, primo.nome)
    assert.match(secondo.nome, /portato-2\.gguf$/)
  })

  it('l’elenco mostra i .gguf e riconosce i proiettori', () => {
    modello('mmproj-visione.gguf')
    const elenco = modelliLocali()
    const proiettore = elenco.find((m) => m.nome === 'mmproj-visione.gguf')

    assert.ok(proiettore, 'il proiettore deve comparire')
    // Il proiettore si riconosce dal nome, come in tutto l'ecosistema, e non si
    // propone come modello.
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
  // Chi scarica scrive in `<nome>.gguf.ipull` e rinomina alla fine: fino ad
  // allora quel file **non è un modello**, e lo rifiutano la tendina, la guardia
  // che risolve il nome e le impostazioni riscritte a mano.
  function aMetà (nome) {
    const dove = percorso.join(MODELLI, `${nome}.ipull`)
    writeFileSync(dove, 'GGUF ma solo l’inizio')
    return dove
  }

  it('lo scarico a metà si vede, e si vede che è a metà', () => {
    aMetà('qwen-grosso.gguf')
    const trovato = modelliLocali().find((m) => m.nome === 'qwen-grosso.gguf.ipull')

    // Uno scarico a metà compare nell'elenco, così si vede e si può togliere.
    assert.ok(trovato, 'uno scarico a metà deve comparire nell’elenco')
    assert.equal(trovato.incompiuto, true)
  })

  it('non si può scegliere come modello, per nessuna delle due vie', () => {
    aMetà('qwen-grosso.gguf')

    // Dalla pagina: la tendina mostra solo i modelli finiti.
    assert.equal(modelloNellaCartella('qwen-grosso.gguf.ipull'), '')
    // Dalle impostazioni riscritte a mano, con o senza suffisso: il file vero non
    // c'è ancora.
    assert.equal(modelloNellaCartella('qwen-grosso.gguf'), '')

    scritte({
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'qwen-grosso.gguf',
    })
    const stato = prontezza(collegamento('assistente'))
    assert.equal(stato.pronto, false)
    // Caricare pesi troncati darebbe un errore sui tensori.
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

  // Riprendere è rifare **lo stesso** scarico, e il `.ipull` non dice da dove
  // veniva: lo dice il biglietto accanto.
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
    // Nessuna sorgente: la pagina mostra solo «Butta».
    assert.equal(trovato.sorgente, undefined)
    assert.equal(sorgenteDi('venuto-da-chissa-dove.gguf'), null)
  })

  it('buttando i pesi se ne va anche il biglietto', () => {
    aMetà('qwen-grosso.gguf')
    segnaSorgente('qwen-grosso.gguf', { deposito: 'un/deposito', file: 'un-file.gguf' })

    elimina('qwen-grosso.gguf.ipull')

    // Un biglietto senza file ricomincerebbe da capo facendo credere di riprendere.
    assert.equal(sorgenteDi('qwen-grosso.gguf'), null)
  })

  it('un biglietto scritto storto si legge come «non si sa»', () => {
    aMetà('qwen-grosso.gguf')
    writeFileSync(percorso.join(MODELLI, 'qwen-grosso.gguf.sorgente.json'), 'non JSON')
    assert.equal(sorgenteDi('qwen-grosso.gguf'), null)
    // Un biglietto illeggibile non nasconde il file a metà.
    assert.ok(modelliLocali().some((m) => m.nome === 'qwen-grosso.gguf.ipull'))
  })

  it('la cancellazione resta chiusa dentro la cartella', () => {
    // La stessa guardia dei modelli finiti: il nome arriva da fuori, e una
    // cancellazione non si disfa.
    assert.throws(() => elimina('../impostazioni.json.ipull'), /non è fra i modelli/)
    assert.throws(() => elimina('mai-esistito.gguf.ipull'), /non è fra i modelli/)
  })
})

describe('che cosa si dice a chi non può chiedere niente', () => {
  it('spento con il modello scelto: si dice dove si accende', () => {
    modello('ragiona.gguf')
    scritte({ 'registroDocenti.assistente.modello': 'ragiona.gguf' })
    const stato = prontezza(collegamento('assistente'))
    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /impostazioni/)
  })

  it('senza proiettore la lettura non si accende, e lo dice invece di «è spenta»', () => {
    modello('vede.gguf')
    scritte({
      'registroDocenti.ocr.attivo': true,
      'registroDocenti.ocr.modello': 'vede.gguf',
    })
    const stato = prontezza(collegamento('ocr'))

    assert.equal(collegamento('ocr').attivo, false)
    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /proiettore/)
  })

  it('spento e senza modello: si dice che manca il modello, non di accendere', () => {
    const stato = prontezza(collegamento('assistente'))

    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /non ha un modello/)
  })

  it('acceso e senza modello: si manda alla pagina che lo scarica', () => {
    scritte({ 'registroDocenti.assistente.attivo': true })
    const stato = prontezza(collegamento('assistente'))

    assert.equal(stato.pronto, false)
    assert.match(stato.motivo, /Modelli linguistici/)
  })

  it('il file sparito dalla cartella non si confonde con il modello mai scelto', () => {
    // Due rimedi diversi (riscaricare, scegliere), due messaggi.
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
    modello('mmproj-vede.gguf')
    scritte({
      'registroDocenti.ocr.attivo': true,
      'registroDocenti.ocr.modello': 'vede.gguf',
      'registroDocenti.ocr.proiettore': 'mmproj-vede.gguf',
      'registroDocenti.modelli.scaricoAutomatico': false,
    })

    // Senza il programma non si legge (la libreria non accetta immagini): spento
    // lo scarico, torna la frase che dice dove si prende.
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
    // La regola in testa a `visionKit.ts`: lo scarico è il ripiego. Chi ha una
    // copia sua (con l'accelerazione della sua scheda video) la tiene.
    nelCorredo('llama-mtmd-cli.exe')
    const mio = nelCorredo('mio-mtmd.exe')
    conModello({ 'registroDocenti.ocr.programma': mio })
    assert.equal(programmaDa(collegamento('ocr')), mio)
  })

  it('il ripiego passa dalla stessa guardia del percorso scritto a mano', {
    skip: process.platform !== 'win32',
  }, () => {
    // Anche nella cartella del corredo si esegue solo un `.exe`.
    nelCorredo('llama-mtmd-cli.bat', 'echo ciao')
    conModello()
    assert.equal(programmaDa(collegamento('ocr')), '')
  })

  it('quel che scende da sé non è un impedimento a leggere', () => {
    // `actions/sorting.ts` usa la prontezza per fermare una coda: il programma che
    // arriverà in venti secondi non è un impedimento, lo aspetta la prima pagina.
    conModello()
    const stato = prontezza(collegamento('ocr'))
    assert.equal(stato.pronto, siScarica())
    if (!siScarica()) assert.match(stato.motivo, /llama-mtmd-cli/)
  })

  it('la cartella sta nei dati dell’applicazione', () => {
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
    // Senza `--mmproj` il programma ignora la pagina e inventa: il guasto che non
    // sembra un guasto.
    const args = argomenti(collegamentoFinto, 'C:/temp/pagina.png', { richiesta: 'Trascrivi' })

    assert.ok(args.includes('--mmproj'))
    assert.equal(args[args.indexOf('--mmproj') + 1], collegamentoFinto.proiettore)
    assert.equal(args.filter((a) => a === '--image').length, 1)
  })

  it('niente conversazione, e niente traduzione', () => {
    const args = argomenti(collegamentoFinto, 'C:/temp/pagina.png', { richiesta: 'Trascrivi' })

    // Senza `-no-cnv` il programma aspetta una seconda battuta che non arriva.
    assert.ok(args.includes('-no-cnv'))
    // Temperatura a zero: si legge un cognome, e le lettere non devono variare.
    assert.equal(args[args.indexOf('--temp') + 1], '0')
    // `-tr` tradurrebbe in inglese un documento che nessuno ha scritto così.
    assert.ok(!args.includes('-tr'))
  })

  it('il tetto alle parole c’è solo quando lo chiede chi domanda', () => {
    const senza = argomenti(collegamentoFinto, 'p.png', { richiesta: 'Trascrivi' })
    const con = argomenti(collegamentoFinto, 'p.png', { richiesta: 'Trascrivi', tettoParole: 256 })

    assert.ok(!senza.includes('-n'))
    assert.equal(con[con.indexOf('-n') + 1], '256')
  })

  it('le righe di servizio del programma non finiscono nel testo letto', () => {
    // L'uscita mescola le marche del programma e le parole del modello: le prime
    // non finiscono nell'estratto.
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
    // `description` è l'`aiuto:` della procedura, l'unica guida del modello su
    // che cosa mettere nel campo.
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
    // La griglia esige tutte le proprietà: un campo facoltativo resta, con `null`
    // ammesso, o il modello non potrebbe più riempirlo (`dal`/`al`).
    const tradotto = perGriglia({
      type: 'object',
      properties: { dal: { type: 'string' } },
      required: [],
    })

    assert.deepEqual(tradotto.properties.dal, { oneOf: [{ type: 'null' }, { type: 'string' }] })
  })

  it('la frase di un campo facoltativo resta fuori dall’incarto, dove si legge', () => {
    // La spiegazione di un campo facoltativo sta **sulla proprietà**: il
    // generatore della libreria legge `description` lì e del ramo `oneOf` unisce
    // solo i tipi.
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
    // `type: ['number', 'null']` la griglia non lo legge: si traduce, o il campo
    // diventerebbe testo.
    const tradotto = perGriglia({ type: ['number', 'null'], description: 'Il voto' })

    assert.equal(tradotto.description, 'Il voto')
    assert.deepEqual(tradotto.oneOf.map((forma) => forma.type), ['number', 'null'])
  })

  it('quel che la griglia non sa leggere sparisce, invece di farla cadere', () => {
    // Un `pattern` che non sia una data la grammatica non lo esprime, e la griglia
    // non si costruirebbe: si toglie, come `minimum`/`maximum`.
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
    // I `pattern` del catalogo sono date: `format: 'date'` rende impossibile
    // generarne una malformata.
    assert.deepEqual(
      perGriglia({ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Il primo giorno' }),
      { description: 'Il primo giorno', type: 'string', format: 'date' },
    )
  })

  it('le misure che la griglia conosce si tengono', () => {
    // `minLength`/`maxLength` e `minItems`/`maxItems` la libreria li regge e li
    // documenta al modello.
    assert.deepEqual(
      perGriglia({ type: 'string', maxLength: 64 }),
      { type: 'string', maxLength: 64 },
    )
    assert.deepEqual(
      perGriglia({ type: 'array', items: { type: 'string' }, minItems: 1 }),
      { type: 'array', items: { type: 'string' }, minItems: 1 },
    )
    // Una misura storta si lascia fuori: uno schema rifiutato farebbe sparire
    // l'attrezzo.
    assert.deepEqual(perGriglia({ type: 'string', maxLength: 'sessanta' }), { type: 'string' })
  })

  it('gli esempi entrano nella frase, che è l’unica cosa che sopravvive', () => {
    // `examples` la griglia non ce l'ha: si ricopiano nella `description`, che
    // passa anche l'incarto `oneOf`.
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
