// Prova di regressione per la matrice dell'appello:
// la variabile inVolo nella chiusura di pulsanteStato impedisce che clic consecutivi
// a raffica sovrascrivano lo stato ricalcolando sempre dallo stato del ridisegno,
// garantendo la corretta transizione anche prima della risposta dell'host,
// e ripristina lo stato in caso di rifiuto. Inoltre la pressione lunga consuma il clic.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

function preparaDomSintetico () {
  class FakeNode {}
  globalThis.Node = FakeNode
  globalThis.HTMLElement = class extends FakeNode {}
  globalThis.HTMLButtonElement = class extends globalThis.HTMLElement {}

  globalThis.acquireVsCodeApi = () => ({
    postMessage () {},
    getState () { return {} },
    setState () {},
  })
  const creaElemento = (tag) => {
    const classi = new Set()
    const dataset = {}
    const attr = new Map()
    const figli = []
    const ascoltatori = new Map()
    const el = Object.assign(new globalThis.HTMLButtonElement(), {
      tagName: tag.toUpperCase(),
      dataset,
      disabled: false,
      style: {},
      offsetWidth: 100,
      offsetHeight: 30,
      scrollTop: 0,
      scrollLeft: 0,
      getBoundingClientRect: () => ({
        top: 0, left: 0, bottom: 30, right: 100, width: 100, height: 30,
      }),
      focus () {},
      contains: () => false,
      remove () {},
      classList: {
        add: (...c) => c.forEach((x) => classi.add(x)),
        remove: (...c) => c.forEach((x) => classi.delete(x)),
        contains: (c) => classi.has(c),
      },
      setAttribute: (k, v) => attr.set(k, String(v)),
      getAttribute: (k) => attr.get(k) ?? null,
      removeAttribute: (k) => attr.delete(k),
      appendChild: (f) => { figli.push(f); return f },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener (tipo, fn) {
        const elenco = ascoltatori.get(tipo) ?? []
        elenco.push(fn)
        ascoltatori.set(tipo, elenco)
        if (tipo === 'click') el.onclick = fn
        if (tipo === 'pointerdown') el.onpointerdown = fn
        if (tipo === 'contextmenu') el.oncontextmenu = fn
      },
      removeEventListener (tipo, fn) {
        const elenco = ascoltatori.get(tipo) ?? []
        ascoltatori.set(tipo, elenco.filter((x) => x !== fn))
      },
      dispatchEvent (evento) {
        for (const fn of ascoltatori.get(evento.type) ?? []) fn(evento)
      },
    })
    return el
  }

  const corpo = creaElemento('body')
  globalThis.document = {
    body: corpo,
    activeElement: null,
    addEventListener () {},
    removeEventListener () {},
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: creaElemento,
    createElementNS: (_ns, tag) => creaElemento(tag),
    createTextNode: (t) => Object.assign(new FakeNode(), { textContent: t }),
  }
  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener () {},
    removeEventListener () {},
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  }
}

preparaDomSintetico()

const { importaSorgente } = await import('../helpers/sorgente.mjs')
const { pulsanteStato } = await importaSorgente('ui/pannello/views/lesson/attendance.ts')

describe('la chiusura di pulsanteStato dell’appello', () => {
  it('i clic a raffica calcolano la sequenza degli stati a partire da inVolo prima della risposta', async () => {
    const chiamate = []
    let risolviAzione
    const promessaInSospeso = new Promise((r) => { risolviAzione = r })

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: (prossimo) => {
        chiamate.push(prossimo)
        return promessaInSospeso
      },
    })

    // Primo clic rapido: da 'presente' passa a 'assente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])

    // Secondo clic rapido (la promessa non è ancora risolta):
    // deve leggere inVolo ('assente') e passare al prossimo stato ('ritardo'), non ripartire da 'presente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'ritardo'])

    // Terzo clic rapido: deve passare da 'ritardo' a 'esonerato'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'ritardo', 'esonerato'])

    // Risolviamo l'azione con successo
    risolviAzione({ ok: true })
    await new Promise((r) => setTimeout(r, 0))
  })

  it('se l’azione fallisce, inVolo torna null e il clic successivo riparte dallo stato originale', async () => {
    const chiamate = []
    let risolviConErrore
    const promessaRifiutata = new Promise((r) => { risolviConErrore = r })

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: (prossimo) => {
        chiamate.push(prossimo)
        return promessaRifiutata
      },
    })

    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])

    // L'azione fallisce
    risolviConErrore({ ok: false })
    await new Promise((r) => setTimeout(r, 0))

    // Ora inVolo deve essere tornato null: il clic successivo riparte da stato ('presente') -> 'assente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'assente'])
  })

  it('il menu contestuale spende il clic successivo', () => {
    const chiamate = []

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: async (prossimo) => {
        chiamate.push(prossimo)
        return { ok: true }
      },
    })

    // Simuliamo apertura menu contestuale (tasto destro)
    const eventoMock = {
      preventDefault () {},
      stopPropagation () {},
      clientX: 10,
      clientY: 20,
    }
    bottone.oncontextmenu(eventoMock)

    // Il clic conseguente al rilascio deve essere scartato (clicSpeso)
    bottone.onclick()
    assert.equal(chiamate.length, 0, 'Il clic speso non deve far avanzare lo stato')

    // Il clic successivo (normale) invece funziona
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])
  })
})
