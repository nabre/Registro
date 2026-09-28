// Ogni aggiornamento resta nel suo riquadro (ADR-48), in due posti dove
// arrivano messaggi a raffica:
//
//   1. lo scarico di un modello: l'avanzamento, quattro volte al secondo, rifà
//      solo l'isola «scarichi»; il resto della sezione (e del registro) resta
//      fatto degli stessi nodi. Un file nuovo o la fila cambiata cambiano anche
//      i pulsanti delle righe, e rifanno l'isola dei modelli, mai la pagina;
//   2. la risposta dell'assistente: attrezzi, tabelle e fine rifanno il
//      riquadro, non la vista principale; la conversazione che scorre è sempre
//      lo stesso nodo (telaio), anche a un ridisegno completo.
//
// Il DOM è finto ma è un albero vero, come in `isole.test.mjs`; stato, ponte
// con l'host e modali sono finti, il resto è il codice vero.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// ------------------------------------------------------------ il DOM finto

class FNode {
  constructor () {
    this.parentNode = null
    this.childNodes = []
  }

  get isConnected () {
    let n = this
    while (n.parentNode) n = n.parentNode
    return n === globalThis.document
  }

  get parentElement () { return this.parentNode instanceof FElement ? this.parentNode : null }
  get firstChild () { return this.childNodes[0] ?? null }
  get nextSibling () {
    const fratelli = this.parentNode?.childNodes ?? []
    return fratelli[fratelli.indexOf(this) + 1] ?? null
  }

  get children () { return this.childNodes.filter((n) => n instanceof FElement) }
  get firstElementChild () { return this.children[0] ?? null }

  contains (altro) {
    for (let n = altro; n; n = n.parentNode) if (n === this) return true
    return false
  }

  insertBefore (nodo, prima) {
    const nodi = nodo instanceof FFragment ? [...nodo.childNodes] : [nodo]
    for (const n of nodi) {
      if (n.parentNode) n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n), 1)
      const i = prima ? this.childNodes.indexOf(prima) : this.childNodes.length
      this.childNodes.splice(i, 0, n)
      n.parentNode = this
    }
    return nodo
  }

  appendChild (nodo) { return this.insertBefore(nodo, null) }
  removeChild (nodo) {
    this.childNodes.splice(this.childNodes.indexOf(nodo), 1)
    nodo.parentNode = null
    return nodo
  }

  remove () { if (this.parentNode) this.parentNode.removeChild(this) }
  replaceWith (nuovo) {
    const genitore = this.parentNode
    if (!genitore) return
    genitore.insertBefore(nuovo, this)
    genitore.removeChild(this)
  }

  *discendenti () {
    for (const figlio of this.children) {
      yield figlio
      yield * figlio.discendenti()
    }
  }

  querySelectorAll (selettore) {
    const prova = confronto(selettore)
    return [...this.discendenti()].filter(prova)
  }

  querySelector (selettore) { return this.querySelectorAll(selettore)[0] ?? null }
}

/** `[data-x]`, `[data-x="v"]`, `.classe`, `tag`: quel che chiedono il codice e le prove. */
function confronto (selettore) {
  const attributo = /^(\w*)\[([\w-]+)(?:="(.*)")?\]$/.exec(selettore)
  if (attributo) {
    const [, tag, nome, valore] = attributo
    return (el) => (!tag || el.tagName === tag.toUpperCase()) && el.hasAttribute(nome) &&
      (valore === undefined || el.getAttribute(nome) === valore)
  }
  if (selettore.startsWith('.')) return (el) => el.className.split(' ').includes(selettore.slice(1))
  if (/^\w+$/.test(selettore)) return (el) => el.tagName === selettore.toUpperCase()
  // Quel che le prove non chiedono non si trova.
  return () => false
}

class FText extends FNode {
  constructor (testo) { super(); this.testo = String(testo) }
  get textContent () { return this.testo }
  set textContent (v) { this.testo = String(v) }
}

class FFragment extends FNode {}

class FElement extends FNode {
  constructor (tag) {
    super()
    this.tagName = tag.toUpperCase()
    this.attributi = new Map()
    this.ascoltatori = []
    const el = this
    this.style = { setProperty () {} }
    const nome = (k) => `data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
    this.dataset = new Proxy({}, {
      get: (_, k) => el.attributi.get(nome(k)),
      set: (_, k, v) => { el.attributi.set(nome(k), String(v)); return true },
      has: (_, k) => el.attributi.has(nome(k)),
      deleteProperty: (_, k) => el.attributi.delete(nome(k)),
    })
    const classi = () => new Set(el.className.split(' ').filter(Boolean))
    const scrivi = (insieme) => { el.className = [...insieme].join(' ') }
    this.classList = {
      add: (...c) => { const s = classi(); c.forEach((x) => s.add(x)); scrivi(s) },
      remove: (...c) => { const s = classi(); c.forEach((x) => s.delete(x)); scrivi(s) },
      toggle: (c, si) => { const s = classi(); if (si ?? !s.has(c)) s.add(c); else s.delete(c); scrivi(s) },
      contains: (c) => classi().has(c),
    }
  }

  get textContent () { return this.childNodes.map((n) => n.textContent).join('') }
  set textContent (v) { this.childNodes = []; this.appendChild(new FText(v)) }
  set innerHTML (_) {}
  get className () { return this.attributi.get('class') ?? '' }
  set className (v) { this.attributi.set('class', v) }
  get hidden () { return this.attributi.has('hidden') }
  set hidden (v) { if (v) this.attributi.set('hidden', ''); else this.attributi.delete('hidden') }
  getAttributeNames () { return [...this.attributi.keys()] }
  getAttribute (k) { return this.attributi.get(k) ?? null }
  setAttribute (k, v) { this.attributi.set(k, String(v)) }
  hasAttribute (k) { return this.attributi.has(k) }
  removeAttribute (k) { this.attributi.delete(k) }
  addEventListener (tipo, fn) { this.ascoltatori.push([tipo, fn]) }
  removeEventListener () {}
  focus () { globalThis.document.activeElement = this }
  getBoundingClientRect () { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 } }
}

class FDocument extends FNode {
  constructor () {
    super()
    this.activeElement = null
    this.body = new FElement('body')
    this.appendChild(this.body)
  }

  createElement (tag) { return new FElement(tag) }
  createElementNS (_ns, tag) { return new FElement(tag) }
  createTextNode (testo) { return new FText(testo) }
  createDocumentFragment () { return new FFragment() }
  addEventListener () {}
  removeEventListener () {}
  dispatchEvent () {}
}

globalThis.Node = FNode
globalThis.Element = FElement
globalThis.HTMLElement = FElement
globalThis.DocumentFragment = FFragment
globalThis.HTMLSelectElement = class {}
globalThis.HTMLInputElement = class {}
globalThis.HTMLTextAreaElement = class {}
globalThis.HTMLButtonElement = class {}
globalThis.CSS = { escape: (s) => s }
globalThis.document = new FDocument()
globalThis.window = { addEventListener () {}, removeEventListener () {}, innerWidth: 1200, innerHeight: 800 }

/** I fotogrammi si fanno scattare a mano. */
let fotogrammi = []
globalThis.requestAnimationFrame = (fn) => { fotogrammi.push(fn) }
function fotogramma () {
  const adesso = fotogrammi
  fotogrammi = []
  for (const fn of adesso) fn()
}

// ------------------------------------------------------------ i finti

globalThis.ridisegni = 0
globalThis.iscritti = []
globalThis.ascoltatori = []
globalThis.filo = null
globalThis.statoFinto = {
  vista: 'impostazioni',
  ambitoImpostazioni: 'programma',
  schedaProgramma: 'modelli',
  assistenteAperto: true,
  // Contesto spento: la domanda parte senza veduta, che qui non c'è.
  contestoAssistente: {
    pagina: false, scelte: false, opzioni: false, filtri: false,
    periodo: false, riferimenti: false, ricerca: false, visibili: false, tendineSpente: [],
  },
  programma: [
    { chiave: 'registroDocenti.assistente.attivo', valore: true },
    { chiave: 'registroDocenti.assistente.modello', valore: 'piccolo.gguf' },
  ],
}

const FINTI = {
  state: `
    export const stato = globalThis.statoFinto
    export const iscriviti = (fn) => { globalThis.iscritti.push(fn); return () => {} }
    export const ridisegna = () => { globalThis.ridisegni += 1 }
    export const aggiorna = (m) => { Object.assign(stato, m); globalThis.ridisegni += 1 }
    export const vai = () => { globalThis.ridisegni += 1 }
  `,
  bridge: `
    export const ascolta = (fn) => { globalThis.ascoltatori.push(fn) }
    export const azione = async () => ({ ok: true })
    export const chiedi = async (procedura) => {
      if (procedura !== 'llm.modelli') return { ok: true, dati: { consigliati: [], trovati: [] } }
      const spento = { attivo: false, modello: '', pronto: false, motivo: 'spento' }
      return { ok: true, dati: { cartella: 'C:/modelli', modelli: [], assistente: spento, ocr: spento } }
    }
    const aperto = { id: 1, visti: () => 0, smetti () {}, ferma () {} }
    export const conversa = (_storia, filo) => { globalThis.filo = filo; return aperto }
    export const riprendiConversazione = (_g, _d, filo) => { globalThis.filo = filo; return aperto }
    export const detta = async () => ({ ok: false, testo: '', motivo: '' })
  `,
  viewpoint: 'export const veduta = () => ({})',
  modal: 'export const conferma = async () => true',
  notifications: 'export const notifica = () => {}',
  menu: 'export const menuSotto = () => {}',
}

const RADICE = fileURLToPath(new URL('../..', import.meta.url))
const uscita = await build({
  stdin: {
    contents: [
      "export { aggiornaElemento, h } from './ui/pannello/dom.ts'",
      "export { contenutoModelliLinguistici } from './ui/pannello/views/languageModels.ts'",
      "export { pannelloAssistente } from './ui/pannello/assistant.ts'",
    ].join('\n'),
    resolveDir: RADICE,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
  plugins: [{
    name: 'finti',
    setup (b) {
      const nomi = Object.keys(FINTI).join('|')
      // Solo i moduli del pannello: `core/i18n/state.ts` resta quello vero.
      b.onResolve({ filter: new RegExp(`/(${nomi})\\.js$`) }, (a) =>
        /[\\/]ui[\\/]pannello/.test(a.resolveDir)
          ? { path: /\/(\w+)\.js$/.exec(a.path)[1], namespace: 'finto' }
          : undefined)
      b.onLoad({ filter: /.*/, namespace: 'finto' }, (a) => ({ contents: FINTI[a.path], loader: 'js' }))
    },
  }],
})
const { aggiornaElemento, h, contenutoModelliLinguistici, pannelloAssistente } = await import(
  `data:text/javascript;base64,${Buffer.from(uscita.outputFiles[0].text).toString('base64')}`,
)

/** Aspetta che le promesse già risolte abbiano girato. */
const giro = () => new Promise((fatto) => setTimeout(fatto, 0))

/** Un messaggio dall'host a chi ascolta (`ascolta` del ponte). */
function dallHost (messaggio) {
  for (const fn of globalThis.ascoltatori) fn(messaggio)
}

/** Tutti i nodi sotto `radice`, in ordine: per dire «fuori non è cambiato niente». */
function nodi (radice, tranne) {
  return [...radice.discendenti()].filter((n) => !tranne.contains(n))
}

// ------------------------------------------------------------ le prove

describe('lo scarico di un modello', () => {
  it('l\'avanzamento rifà solo l\'isola «scarichi»', async () => {
    // L'ingresso nella sezione: l'iscritto chiede elenco e catalogo e si mette in ascolto.
    for (const fn of globalThis.iscritti) fn()
    await giro()

    const radice = h('div', { id: 'radice' })
    globalThis.document.body.appendChild(radice)
    const pagina = () => h('main', null, h('p', { class: 'fuori' }, 'impostazioni'), ...contenutoModelliLinguistici())
    aggiornaElemento(radice, pagina())
    assert.ok(radice.querySelector('.modelli-llm'), 'l\'elenco è arrivato')

    // Il primo avanzamento cambia i pulsanti («Metti in coda»): si rifanno i
    // modelli, non la pagina.
    const prima = globalThis.ridisegni
    dallHost({ tipo: 'scarico', file: 'qwen.gguf', byte: 0, totale: 1000, coda: [], finito: false })
    fotogramma()
    assert.equal(globalThis.ridisegni, prima, 'nessun ridisegno completo')
    assert.match(radice.querySelector('[data-isola="scarichi"]').textContent, /qwen\.gguf/)

    const isolaScarichi = radice.querySelector('[data-isola="scarichi"]')
    const fuori = nodi(radice, isolaScarichi)
    const titolo = radice.querySelector('.fuori')
    for (const byte of [100, 200, 300, 400]) {
      dallHost({ tipo: 'scarico', file: 'qwen.gguf', byte, totale: 1000, coda: [], finito: false })
      fotogramma()
    }
    assert.equal(globalThis.ridisegni, prima, 'quattro avanzamenti, nessun ridisegno completo')
    assert.equal(radice.querySelector('[data-isola="scarichi"]'), isolaScarichi)
    assert.deepEqual(nodi(radice, isolaScarichi), fuori, 'fuori dall\'isola, gli stessi nodi')
    assert.ok(isolaScarichi.firstElementChild, 'la barra c\'è')

    // Un secondo file in fila cambia i pulsanti: si rifà l'isola dei modelli.
    dallHost({ tipo: 'scarico', file: 'qwen.gguf', byte: 500, totale: 1000, coda: ['altro.gguf'], finito: false })
    fotogramma()
    assert.equal(globalThis.ridisegni, prima)
    assert.equal(radice.querySelector('.fuori'), titolo, 'la pagina fuori dai modelli resta')
    assert.match(radice.querySelector('[data-isola="scarichi"]').textContent, /altro\.gguf/)
    radice.remove()
  })
})

describe('la risposta dell\'assistente', () => {
  it('rifà il riquadro, non la vista principale', () => {
    const radice = h('div', { id: 'radice' })
    globalThis.document.body.appendChild(radice)
    const guscio = () => h(
      'div',
      { dataset: { telaio: 'guscio' } },
      h('main', { class: 'contenuto', dataset: { telaio: 'contenuto' } }, h('div', { class: 'vista' }, 'il registro')),
      pannelloAssistente(),
    )
    aggiornaElemento(radice, guscio())
    const vista = radice.querySelector('.vista')

    // Si chiede: il turno dell'assistente si apre vuoto e aspetta.
    const campo = radice.querySelector('.assistente__campo')
    campo.value = 'Chi manca oggi?'
    for (const [tipo, fn] of campo.ascoltatori) if (tipo === 'input') fn()
    for (const [tipo, fn] of campo.ascoltatori) {
      if (tipo === 'keydown') fn({ key: 'Enter', shiftKey: false, preventDefault () {}, stopPropagation () {} })
    }
    assert.ok(globalThis.filo, 'la domanda è partita')
    const prima = globalThis.ridisegni
    fotogramma()
    const filo = radice.querySelector('.assistente__filo')
    assert.ok(filo, 'il filo c\'è')

    globalThis.filo.alAttrezzo({ nome: 'classe.assenze', ok: true })
    fotogramma()
    globalThis.filo.alRisultato({ titolo: 'Assenti', colonne: [], righe: [] })
    fotogramma()
    globalThis.filo.allaFine('Oggi mancano due persone.', [], false)
    fotogramma()

    assert.equal(globalThis.ridisegni, prima, 'nessun ridisegno completo')
    assert.equal(radice.querySelector('.vista'), vista, 'la vista principale è la stessa')
    assert.equal(radice.querySelector('.assistente__filo'), filo, 'il filo è lo stesso nodo')
    assert.match(filo.textContent, /Oggi mancano due persone\./)
    assert.match(filo.textContent, /classe\.assenze/)

    // Un ridisegno completo (un gesto altrove) tiene il filo: è telaio dal guscio in giù.
    aggiornaElemento(radice, guscio())
    assert.equal(radice.querySelector('.assistente__filo'), filo)
    radice.remove()
  })
})
