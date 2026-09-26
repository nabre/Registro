// L'assistente dopo «Ferma», e quel che gli si dice quando il modello si è
// dovuto fermare. Serve il giro intero: il motore vero (`data/llamaCpp.ts`)
// con la libreria finta di `tests/helpers/fake-node-llama.mjs`, dove una
// domanda trattenuta espone i suoi attrezzi e chiamarne l'`handler` è fare
// quel che fa il modello. Il bundle si compila qui con `importaSorgente`
// perché la libreria finta stia **dentro** il grafo del motore.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'

import { bancoLlama as banco } from '../helpers/fake-node-llama.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-giro13-assistente-'))
const MODELLI = percorso.join(radice, 'modelli')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let giro
let api

/**
 * Un archivio vuoto basta: si guarda che cosa arriva alla pagina. `registro` e
 * `revisione` servono perché `vista.apri` possa **riuscire**, o la prova
 * passerebbe senza il freno.
 */
const archivio = { revisione: 0, registro: {} }

/** Una domanda con il numero di busta che la pagina le ha dato. */
const domanda = (id) => ({ id, storia: [{ ruolo: 'utente', testo: 'che corsi ho?' }] })

/**
 * Aspetta finché `condizione` è vera, o si arrende. A orologio: fra domanda e
 * trattenuta passano il caricamento dei pesi e l'apertura del contesto.
 */
async function finché (condizione) {
  for (let i = 0; i < 500; i += 1) {
    if (condizione()) return
    await new Promise((fatto) => setTimeout(fatto, 10))
  }
  assert.fail('la condizione non si è mai avverata')
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(MODELLI, { recursive: true })
  writeFileSync(percorso.join(MODELLI, 'finto.gguf'), 'GGUF')
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({
      'registroDocenti.modelli.cartella': MODELLI,
      'registroDocenti.assistente.attivo': true,
      'registroDocenti.assistente.modello': 'finto.gguf',
    }),
  )
  giro = await importaSorgente(
    [
      "export { rispondiConversazione, fermaGiriDi } from './src/panels/conversation.js'",
      "export { registraTutte } from './src/api/index.js'",
      "export { registraNavigatore } from './src/actions/view.js'",
      "export { scaricaPesi } from './src/data/llamaCpp.js'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  )
  giro.registraTutte()
  // Una domanda a vuoto prima di tutto: la libreria finta si inizializza alla
  // prima richiesta e rimette il banco com'era, portandosi via il `trattieni`.
  await giro.rispondiConversazione(archivio, domanda(1), () => undefined, 'riquadro')
  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()
})

let navigazioni
beforeEach(() => {
  banco.azzera()
  banco.trattieni = true
  navigazioni = []
  giro.registraNavigatore((n) => navigazioni.push(n))
})

afterEach(async () => {
  giro.registraNavigatore(null)
  // Quel che è rimasto trattenuto si chiude, o il giro resta appeso.
  for (const voce of banco.inAttesa.splice(0)) voce.rispondi('fine')
  await giro.scaricaPesi()
})

after(() => {
  rmSync(radice, { recursive: true, force: true })
})

describe('«Ferma» arriva fino al modello', () => {
  // Dopo «Ferma» il modello non cambia la pagina (`vista_apri`) e la domanda dopo
  // non aspetta dietro una risposta che nessuno leggerà.
  it('dopo «Ferma» il modello non apre più pagine', async () => {
    const allaPagina = []
    const inVolo = giro.rispondiConversazione(
      archivio, domanda(7), (m) => allaPagina.push(m), 'riquadro',
    )
    await finché(() => banco.inAttesa.length === 1)
    const [voce] = banco.inAttesa

    await giro.rispondiConversazione(
      archivio, { id: 7, storia: [], ferma: true }, () => undefined, 'riquadro',
    )
    const risposta = await voce.funzioni.vista_apri.handler({ vista: 'corsi' })
    assert.deepEqual(navigazioni, [], 'la pagina è cambiata dopo «Ferma»')
    assert.match(String(risposta), /fermata/)
    // E il giro finisce: la domanda trattenuta si è sentita annullare.
    await inVolo

    // A chi ha premuto «Ferma» non arriva nemmeno la fine del giro.
    assert.deepEqual(allaPagina.filter((m) => m.evento === 'fine'), [])
  })

  it('la domanda dopo non resta in coda dietro quella fermata', async () => {
    const prima = giro.rispondiConversazione(archivio, domanda(8), () => undefined, 'riquadro')
    await finché(() => banco.inAttesa.length === 1)
    await giro.rispondiConversazione(
      archivio, { id: 8, storia: [], ferma: true }, () => undefined, 'riquadro',
    )
    await prima

    // La seconda arriva alla libreria: la prima non tiene più il turno del motore.
    const dopo = []
    const seconda = giro.rispondiConversazione(archivio, domanda(9), (m) => dopo.push(m), 'riquadro')
    await finché(() => banco.inAttesa.length === 2)
    banco.inAttesa.at(-1).rispondi('ecco i corsi')
    await seconda
    assert.deepEqual(dopo.map((m) => [m.evento, m.testo]), [['fine', 'ecco i corsi']])
  })

  it('«Ferma» di una pagina non ferma la domanda dell’altra', async () => {
    // Le due pagine numerano le buste ciascuna per sé: lo stesso numero può essere
    // in volo nel riquadro e nella finestra staccata.
    const alRiquadro = []
    const inVolo = giro.rispondiConversazione(
      archivio, domanda(5), (m) => alRiquadro.push(m), 'riquadro',
    )
    await finché(() => banco.inAttesa.length === 1)
    await giro.rispondiConversazione(
      archivio, { id: 5, storia: [], ferma: true }, () => undefined, 'finestra',
    )
    banco.inAttesa.shift().rispondi('eccomi')
    await inVolo
    assert.deepEqual(alRiquadro.map((m) => [m.evento, m.testo]), [['fine', 'eccomi']])
  })

  it('chiudere la finestra staccata ferma le sue domande in volo', async () => {
    const allaFinestra = []
    const inVolo = giro.rispondiConversazione(
      archivio, domanda(3), (m) => allaFinestra.push(m), 'finestra',
    )
    await finché(() => banco.inAttesa.length === 1)
    const [voce] = banco.inAttesa
    giro.fermaGiriDi('finestra')
    await voce.funzioni.vista_apri.handler({ vista: 'corsi' })
    assert.deepEqual(navigazioni, [])
    await inVolo
    assert.deepEqual(allaFinestra, [])
  })
})

describe('il tetto degli attrezzi arriva alla pagina', () => {
  // Finite le letture concesse, `limite` parte una volta sola e la fine porta
  // `esaurito`: la pagina dice che la risposta è stata scritta senza tutte le
  // letture.
  it('`limite` una volta sola, ed `esaurito` nella fine', async () => {
    const allaPagina = []
    const inVolo = giro.rispondiConversazione(
      archivio, domanda(21), (m) => allaPagina.push(m), 'riquadro',
    )
    await finché(() => banco.inAttesa.length === 1)
    const [voce] = banco.inAttesa
    const lettura = Object.keys(voce.funzioni).find((nome) => nome !== 'vista_apri')
    assert.ok(lettura, 'nessuna lettura fra gli attrezzi')
    // Dieci chiamate vanno, le tre dopo sono rifiutate: alla terza il motore tira
    // il freno e chiede la risposta senza attrezzi.
    for (let i = 0; i < 13; i += 1) await voce.funzioni[lettura].handler({})
    await finché(() => banco.inAttesa.length === 2)
    banco.inAttesa[1].rispondi('ho letto quel che ho potuto')
    await inVolo

    const limiti = allaPagina.filter((m) => m.evento === 'limite')
    assert.equal(limiti.length, 1, 'il tetto va detto una volta, non a ogni rifiuto')
    const fine = allaPagina.find((m) => m.evento === 'fine')
    assert.ok(fine, 'nessuna fine')
    assert.equal(fine.esaurito, true)
    assert.equal(fine.testo, 'ho letto quel che ho potuto')
  })

  it('una risposta dentro il tetto non porta `esaurito`', async () => {
    const allaPagina = []
    const inVolo = giro.rispondiConversazione(
      archivio, domanda(22), (m) => allaPagina.push(m), 'riquadro',
    )
    await finché(() => banco.inAttesa.length === 1)
    banco.inAttesa.shift().rispondi('ecco')
    await inVolo
    assert.equal(allaPagina.some((m) => m.evento === 'limite'), false)
    assert.equal('esaurito' in allaPagina.at(-1), false)
  })
})

describe('le letture tenute fuori dall’assistente', () => {
  // Una lettura con `perAssistente: false` chiamata per nome: il motivo dice che
  // non è fra i suoi attrezzi, non che scrive.
  it('il motivo dice che non è fra i suoi attrezzi, non che scrive', async () => {
    const esclusa = api.procedure().find((p) => p.genere === 'lettura' && p.perAssistente === false)
    assert.ok(esclusa, 'nessuna lettura esclusa da provare')
    const { testo, usato } = await api.usaAttrezzo(
      {}, { nome: esclusa.nome.replace(/\./g, '_'), argomenti: {} },
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'non-permesso')
    assert.doesNotMatch(testo, /cambia il registro|può solo leggere/)
    assert.match(testo, /non è fra gli attrezzi/)
  })
})
