// Il motore llama.cpp con una libreria finta
// (`tests/helpers/fake-node-llama.mjs`: una sequenza per contesto, sequenze
// smaltite inutilizzabili, sessioni non smaltite che lasciano un ascoltatore,
// `systemPrompt` buttato dalle griglie senza battuta di sistema). Si prova che
// **la memoria si usa come deciso**: contesto aperto una volta e riusato,
// spento dopo il riposo o al primo guasto, mai due domande sulla stessa
// sequenza, mai pesi smaltiti sotto chi parla.
//
// Lo stato del motore è di modulo: il bundle si compila una volta, e dopo ogni
// prova si scaricano i pesi e si azzera il banco.

import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test'

import { bancoLlama as banco } from '../helpers/fake-node-llama.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

let LLAMA_CPP
let scaricaPesi
let pesiInUso

before(async () => {
  ;({ LLAMA_CPP, scaricaPesi, pesiInUso } = await importaSorgente('src/data/llamaCpp.ts', {
    nodeLlama: 'tests/helpers/fake-node-llama.mjs',
  }))
})

const FILE = '/finto/qwen.gguf'
const ISTRUZIONI = 'Sei l’assistente del registro. Rispondi in italiano.'
const RIPOSO_MS = 5 * 60_000

/** Un collegamento come lo costruirebbe `llm.ts`, con quel che serve qui. */
function collegamento (altro = {}) {
  return {
    uso: 'assistente',
    motore: LLAMA_CPP,
    attivo: true,
    modello: FILE,
    modelloChiesto: 'qwen.gguf',
    proiettore: '',
    proiettoreChiesto: '',
    programma: '',
    attesaMs: 60_000,
    ...altro,
  }
}

/** Un giro: le istruzioni, la conversazione di prima, e la domanda. */
function giro (domanda, prima = []) {
  return {
    battute: [
      { ruolo: 'sistema', testo: ISTRUZIONI },
      ...prima,
      { ruolo: 'utente', testo: domanda },
    ],
  }
}

/** Lascia girare le promesse finché `condizione` è vera, o si arrende. */
async function finché (condizione) {
  for (let i = 0; i < 200; i += 1) {
    if (condizione()) return
    await new Promise((fatto) => setImmediate(fatto))
  }
  assert.fail('la condizione non si è mai avverata')
}

/** Qualche giro di promesse, per dare a chi deve muoversi il tempo di farlo. */
async function lascia () {
  for (let i = 0; i < 20; i += 1) await new Promise((fatto) => setImmediate(fatto))
}

let log
beforeEach(() => {
  banco.azzera()
  // Le righe del motore in console si raccolgono: una prova le legge.
  log = mock.method(console, 'log', () => {})
})

afterEach(async () => {
  banco.trattieni = false
  for (const voce of banco.inAttesa.splice(0)) voce.rispondi('fine')
  for (const via of banco.caricamentiInAttesa.splice(0)) via()
  await scaricaPesi()
  log.mock.restore()
})

after(() => {
  mock.restoreAll()
})

describe('llama.cpp: il contesto caldo', () => {
  it('due domande di fila aprono il contesto una volta sola', async () => {
    // Ogni contesto nuovo rilegge istruzioni e catalogo: se ne apre uno solo.
    const prima = await LLAMA_CPP.chatta(collegamento(), giro('quanti assenti oggi?'))
    await LLAMA_CPP.chatta(collegamento(), giro('e ieri?', [
      { ruolo: 'utente', testo: 'quanti assenti oggi?' },
      { ruolo: 'assistente', testo: prima },
    ]))
    assert.equal(banco.contesti.length, 1)
    assert.equal(banco.contesti[0].disposed, false)
  })

  it('la seconda domanda rielabora meno token e ne riusa, e lo scrive in console', async () => {
    // La seconda domanda ritrova già letta la prima.
    const prima = await LLAMA_CPP.chatta(collegamento(), giro('quanti assenti oggi?'))
    await LLAMA_CPP.chatta(collegamento(), giro('e ieri?', [
      { ruolo: 'utente', testo: 'quanti assenti oggi?' },
      { ruolo: 'assistente', testo: prima },
    ]))
    const misure = log.mock.calls
      .map((chiamata) => String(chiamata.arguments[0]))
      .filter((riga) => riga.startsWith('[llama.cpp] domanda:'))
      .map((riga) => riga.match(/(\d+) token rielaborati, (\d+) riusati, (\d+) generati/))
    assert.equal(misure.length, 2)
    const [, rielaboratiPrima, riusatiPrima] = misure[0].map(Number)
    const [, rielaboratiDopo, riusatiDopo] = misure[1].map(Number)
    assert.equal(riusatiPrima, 0)
    assert.ok(riusatiDopo > 0, `riusati alla seconda: ${riusatiDopo}`)
    assert.ok(rielaboratiDopo < rielaboratiPrima,
      `rielaborati ${rielaboratiDopo} alla seconda, ${rielaboratiPrima} alla prima`)
  })

  it('dopo tre domande non resta nessuna sessione viva sulla sequenza', async () => {
    // Una sessione non smaltita sarebbe un ascoltatore in più a ogni domanda.
    for (const domanda of ['uno?', 'due?', 'tre?']) {
      await LLAMA_CPP.chatta(collegamento(), giro(domanda))
    }
    assert.equal(banco.sessioni.length, 3)
    assert.ok(banco.sessioni.every((sessione) => sessione.disposed))
    assert.equal(banco.contesti[0].sequenza.ascoltatori, 0)
  })

  it('una domanda che si rompe butta il contesto, e la dopo ne apre uno nuovo', async () => {
    // Dopo un guasto vero quel che la sequenza tiene non è affidabile: il
    // contesto si chiude.
    banco.guasto = new Error('finto: guasto a metà')
    await assert.rejects(LLAMA_CPP.chatta(collegamento(), giro('uno?')), /guasto a metà/)
    assert.equal(await LLAMA_CPP.chatta(collegamento(), giro('due?')), 'risposta a due?')
    assert.equal(banco.contesti.length, 2)
    assert.equal(banco.contesti[0].disposed, true)
    assert.equal(banco.contesti[1].disposed, false)
  })

  it('una domanda annullata torna vuota, e la dopo riusa lo stesso contesto', async () => {
    // Un annullo non è un guasto: il contesto resta, e la domanda dopo non
    // rilegge il catalogo.
    banco.trattieni = true
    const ferma = new AbortController()
    const detto = LLAMA_CPP.chatta(collegamento({ segnale: ferma.signal }), giro('uno?'))
    await finché(() => banco.inAttesa.length === 1)
    ferma.abort()
    assert.equal(await detto, '')
    banco.trattieni = false
    await LLAMA_CPP.chatta(collegamento(), giro('due?'))
    assert.equal(banco.contesti.length, 1)
  })

  it('la prima domanda arriva con le istruzioni anche se la griglia non ammette il sistema', async () => {
    // Gemma 1-3: la libreria butta il `systemPrompt` del costruttore, quindi le
    // istruzioni vanno nella storia fin dalla prima domanda.
    banco.sistemaAmmesso = false
    await LLAMA_CPP.chatta(collegamento(), giro('quanti assenti oggi?'))
    const vista = banco.sessioni[0].domande[0]
    assert.deepEqual(vista[0], { type: 'system', text: ISTRUZIONI })
    assert.deepEqual(vista.at(-1), { type: 'user', text: 'quanti assenti oggi?' })
  })
})

describe('llama.cpp: il riposo', () => {
  it('a cinque minuti dall’ultima domanda il contesto se ne va, ma non durante una', async () => {
    // Dopo il riposo il contesto si restituisce, ma non sotto una domanda in
    // corso.
    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      await LLAMA_CPP.chatta(collegamento(), giro('uno?'))
      const [primo] = banco.contesti
      mock.timers.tick(RIPOSO_MS - 1)
      assert.equal(primo.disposed, false)
      mock.timers.tick(1)
      await lascia()
      assert.equal(primo.disposed, true)

      banco.trattieni = true
      const detto = LLAMA_CPP.chatta(collegamento(), giro('due?'))
      await finché(() => banco.inAttesa.length === 1)
      const secondo = banco.contesti[1]
      mock.timers.tick(2 * RIPOSO_MS)
      await lascia()
      assert.equal(secondo.disposed, false)
      banco.inAttesa.shift().rispondi('ecco')
      assert.equal(await detto, 'ecco')
      mock.timers.tick(RIPOSO_MS)
      await lascia()
      assert.equal(secondo.disposed, true)
    } finally {
      mock.timers.reset()
    }
  })
})

describe('llama.cpp: una domanda per volta', () => {
  it('due domande insieme non parlano mai sulla stessa sequenza, e il contesto è uno', async () => {
    // Due sessioni sulla stessa sequenza si corrompono; due contesti freddi
    // insieme possono ridurre per sempre gli strati sulla scheda video.
    banco.trattieni = true
    const prima = LLAMA_CPP.chatta(collegamento(), giro('uno?'))
    const seconda = LLAMA_CPP.chatta(collegamento(), giro('due?'))
    await finché(() => banco.inAttesa.length === 1)
    await lascia()
    assert.equal(banco.inAttesa.length, 1, 'la seconda deve aspettare in coda')
    banco.inAttesa.shift().rispondi('primo')
    await finché(() => banco.inAttesa.length === 1)
    banco.inAttesa.shift().rispondi('secondo')
    assert.deepEqual(await Promise.all([prima, seconda]), ['primo', 'secondo'])
    assert.equal(banco.insiemeAlMassimo, 1)
    assert.equal(banco.contesti.length, 1)
  })

  it('una domanda che scade in coda dice che era in coda, e la coda non si ferma', async () => {
    // Non «non è riuscito a caricarsi»: manderebbe a cambiare modello chi deve
    // solo aspettare.
    banco.trattieni = true
    const prima = LLAMA_CPP.chatta(collegamento(), giro('uno?'))
    await finché(() => banco.inAttesa.length === 1)
    // Il timer di `AbortSignal.timeout()` non tiene vivo il processo (nel registro
    // lo fa Electron): senza questo battito Node chiuderebbe la prova con la
    // promessa in attesa.
    const vivo = setInterval(() => {}, 50)
    try {
      await assert.rejects(
        LLAMA_CPP.chatta(collegamento({ attesaMs: 600 }), giro('due?')),
        /rimasta in coda per 1 secondi dietro un’altra/,
      )
    } finally {
      clearInterval(vivo)
    }
    banco.inAttesa.shift().rispondi('primo')
    assert.equal(await prima, 'primo')
    // Chi ha rinunciato in coda passa il turno: la terza arriva.
    banco.trattieni = false
    assert.equal(await LLAMA_CPP.chatta(collegamento(), giro('tre?')), 'risposta a tre?')
  })
})

describe('llama.cpp: chi smaltisce i pesi', () => {
  it('scaricaPesi a riposo chiude prima il contesto e poi il modello', async () => {
    // L'ordine va garantito, non lasciato alla libreria; e finisce subito.
    await LLAMA_CPP.chatta(collegamento(), giro('uno?'))
    await scaricaPesi()
    assert.deepEqual(
      banco.eventi.filter((evento) => evento.includes('dispose')),
      ['contesto.dispose', 'modello.dispose'],
    )
  })

  it('scaricaPesi a metà domanda smaltisce il modello solo dopo la risposta', async () => {
    // Guardia: smaltire i pesi sotto chi parla fa cadere il processo.
    banco.trattieni = true
    const detto = LLAMA_CPP.chatta(collegamento(), giro('uno?'))
    await finché(() => banco.inAttesa.length === 1)
    const scarico = scaricaPesi()
    await lascia()
    assert.ok(!banco.eventi.includes('modello.dispose'))
    banco.inAttesa.shift().rispondi('ecco')
    assert.equal(await detto, 'ecco')
    await scarico
    assert.deepEqual(banco.eventi, ['risposta: ecco', 'contesto.dispose', 'modello.dispose'])
  })

  it('un file che si sta ancora caricando risulta in uso', async () => {
    // «Elimina» chiede se il file è in uso anche durante un caricamento in volo:
    // Windows non cancella un file aperto.
    banco.trattieniCaricamenti = true
    const detto = LLAMA_CPP.chatta(collegamento(), giro('uno?'))
    await finché(() => banco.caricamentiInAttesa.length === 1)
    assert.equal(pesiInUso(FILE), true)
    assert.equal(pesiInUso('/finto/altro.gguf'), false)
    banco.caricamentiInAttesa.shift()()
    await detto
    assert.equal(pesiInUso(FILE), true)
    await scaricaPesi()
    assert.equal(pesiInUso(FILE), false)
  })
})
