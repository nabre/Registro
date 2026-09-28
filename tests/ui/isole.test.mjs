// Ogni aggiornamento resta nel suo riquadro. Si fissa che:
//
//   1. `ridisegnaIsola` rifà solo il contenuto dell'isola: i nodi fuori, e il
//      contenitore stesso, restano gli stessi oggetti;
//   2. una lettura di `risorse.ts` dichiarata per un'isola, a lettura finita,
//      rifà quell'isola e non la pagina; senza isola, o con l'isola sparita,
//      ridisegna tutto come prima;
//   3. un nodo `data-tieni` sopravvive a un ridisegno completo (stesso oggetto,
//      mai staccato: un `<iframe>` staccato ricarica), anche dentro un'isola, e
//      si rifà quando la sorgente cambia.
//
// Il DOM è finto ma è un albero vero: genitori, fratelli, `moveBefore` che
// sposta senza staccare e `insertBefore` che conta i distacchi.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// ------------------------------------------------------------ il DOM finto

class FNode {
  constructor () {
    this.parentNode = null
    this.childNodes = []
    /** Quante volte il nodo è stato tolto dal documento: un `<iframe>` ricaricherebbe. */
    this.staccato = 0
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

  togli (nodo) {
    if (nodo.isConnected) nodo.staccato += 1
    nodo.parentNode.childNodes.splice(nodo.parentNode.childNodes.indexOf(nodo), 1)
    nodo.parentNode = null
  }

  insertBefore (nodo, prima) {
    const nodi = nodo instanceof FFragment ? [...nodo.childNodes] : [nodo]
    for (const n of nodi) {
      if (n.parentNode) this.togli(n)
      const i = prima ? this.childNodes.indexOf(prima) : this.childNodes.length
      this.childNodes.splice(i, 0, n)
      n.parentNode = this
    }
    return nodo
  }

  /** Come Chromium: sposta senza staccare, solo fra due posti nel documento. */
  moveBefore (nodo, prima) {
    if (!nodo.isConnected || !this.isConnected) throw new Error('HierarchyRequestError')
    nodo.parentNode.childNodes.splice(nodo.parentNode.childNodes.indexOf(nodo), 1)
    const i = prima ? this.childNodes.indexOf(prima) : this.childNodes.length
    this.childNodes.splice(i, 0, nodo)
    nodo.parentNode = this
  }

  appendChild (nodo) { return this.insertBefore(nodo, null) }
  removeChild (nodo) { this.togli(nodo); return nodo }
  remove () { if (this.parentNode) this.parentNode.removeChild(this) }

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

/** `[data-x]`, `[data-x="v"]`, `.classe`, `tag`: quel che chiedono `dom.ts`, `isole.ts` e le prove. */
function confronto (selettore) {
  const attributo = /^\[([\w-]+)(?:="(.*)")?\]$/.exec(selettore)
  if (attributo) {
    const [, nome, valore] = attributo
    return (el) => el.hasAttribute(nome) &&
      (valore === undefined || el.getAttribute(nome) === valore)
  }
  if (selettore.startsWith('.')) return (el) => el.className.split(' ').includes(selettore.slice(1))
  if (/^\w+$/.test(selettore)) return (el) => el.tagName === selettore.toUpperCase()
  throw new Error(`selettore non previsto: ${selettore}`)
}

class FText extends FNode {
  constructor (testo) { super(); this.textContent = testo }
}

class FFragment extends FNode {}

class FElement extends FNode {
  constructor (tag) {
    super()
    this.tagName = tag.toUpperCase()
    this.attributi = new Map()
    this.ascoltatori = []
    this.style = { setProperty () {} }
    const el = this
    const nome = (k) => `data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
    this.dataset = new Proxy({}, {
      get: (_, k) => el.attributi.get(nome(k)),
      set: (_, k, v) => { el.attributi.set(nome(k), String(v)); return true },
      deleteProperty: (_, k) => el.attributi.delete(nome(k)),
    })
  }

  get textContent () { return this.childNodes.map((n) => n.textContent).join('') }
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
  focus () { globalThis.document.activeElement = this }
}

class FDocument extends FNode {
  constructor () {
    super()
    this.activeElement = null
    this.body = new FElement('body')
    this.appendChild(this.body)
  }

  createElement (tag) { return new FElement(tag) }
  createTextNode (testo) { return new FText(testo) }
  createDocumentFragment () { return new FFragment() }
}

globalThis.Node = FNode
globalThis.Element = FElement
globalThis.HTMLElement = FElement
globalThis.DocumentFragment = FFragment
globalThis.HTMLSelectElement = class {}
globalThis.HTMLInputElement = class {}
globalThis.HTMLTextAreaElement = class {}
globalThis.CSS = { escape: (s) => s }
globalThis.document = new FDocument()

/** I fotogrammi si fanno scattare a mano. */
let fotogrammi = []
globalThis.requestAnimationFrame = (fn) => { fotogrammi.push(fn) }
function fotogramma () {
  const adesso = fotogrammi
  fotogrammi = []
  for (const fn of adesso) fn()
}

// ------------------------------------------------------------ i moduli

globalThis.ridisegni = 0
const RADICE = fileURLToPath(new URL('../..', import.meta.url))
const uscita = await build({
  stdin: {
    contents: [
      "export * from './ui/pannello/dom.ts'",
      "export * from './ui/pannello/isole.ts'",
      "export { risorse } from './ui/pannello/risorse.ts'",
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
    name: 'stato-finto',
    setup (b) {
      b.onResolve({ filter: /\/state\.js$/ }, () => ({ path: 'state', namespace: 'finto' }))
      b.onLoad({ filter: /.*/, namespace: 'finto' }, () => ({
        contents: 'export const ridisegna = () => { globalThis.ridisegni += 1 }',
        loader: 'js',
      }))
    },
  }],
})
const { h, aggiornaElemento, isola, ridisegnaIsola, risorse } = await import(
  `data:text/javascript;base64,${Buffer.from(uscita.outputFiles[0].text).toString('base64')}`,
)

/** Una radice nuova nel documento, come `#radice` del pannello. */
function radice () {
  const r = h('div', { id: 'radice' })
  globalThis.document.body.appendChild(r)
  return r
}

/** Aspetta che le promesse già risolte abbiano girato. */
const giro = () => new Promise((fatto) => setTimeout(fatto, 0))

// ------------------------------------------------------------ le prove

describe('isole', () => {
  it('ridisegnaIsola rifà solo il contenuto dell\'isola', () => {
    const r = radice()
    let conto = 1
    let disegni = 0
    const pagina = () => h('main', null,
      h('p', { class: 'fuori' }, 'titolo'),
      isola('conto', () => { disegni += 1; return h('span', null, String(conto)) }),
    )
    aggiornaElemento(r, pagina())
    const fuori = r.querySelector('.fuori')
    const contenitore = r.querySelector('[data-isola="conto"]')
    const vecchio = contenitore.firstElementChild
    assert.equal(disegni, 1)

    conto = 2
    ridisegnaIsola('conto')
    ridisegnaIsola('conto')
    assert.equal(disegni, 1, 'mai dentro la chiamata: al fotogramma')
    fotogramma()
    assert.equal(disegni, 2, 'due richieste nello stesso fotogramma, un disegno')
    assert.equal(r.querySelector('.fuori'), fuori)
    assert.equal(r.querySelector('[data-isola="conto"]'), contenitore)
    assert.notEqual(contenitore.firstElementChild, vecchio)
    assert.equal(contenitore.textContent, '2')
    r.remove()
  })

  it('un\'isola che non è più nel documento non si rifà', () => {
    const r = radice()
    let disegni = 0
    aggiornaElemento(r, h('div', null, isola('via', () => { disegni += 1; return 'x' })))
    aggiornaElemento(r, h('div', null, 'altra pagina'))
    ridisegnaIsola('via')
    fotogramma()
    assert.equal(disegni, 1)
    r.remove()
  })
})

describe('risorse per isola', () => {
  it('a lettura finita rifà l\'isola, non la pagina', async () => {
    const r = radice()
    const letture = risorse()
    const carica = async () => 'anteprima pronta'
    const mostra = () => {
      const voce = letture.leggi('modello:1', carica, { isola: 'anteprima' })
      return voce.stato === 'pronto' ? voce.valore : 'sto leggendo'
    }
    aggiornaElemento(r, h('div', null, h('p', { class: 'fuori' }, 'x'), isola('anteprima', mostra)))
    const fuori = r.querySelector('.fuori')
    const prima = globalThis.ridisegni
    await giro()
    fotogramma()
    assert.equal(globalThis.ridisegni, prima, 'nessun ridisegno completo')
    assert.equal(r.querySelector('[data-isola="anteprima"]').textContent, 'anteprima pronta')
    assert.equal(r.querySelector('.fuori'), fuori)
    r.remove()
  })

  it('senza isola, o con l\'isola sparita, ridisegna tutto', async () => {
    const letture = risorse()
    let prima = globalThis.ridisegni
    letture.leggi('a', async () => 1)
    await giro()
    assert.equal(globalThis.ridisegni, prima + 1)

    prima = globalThis.ridisegni
    letture.leggi('b', async () => 2, { isola: 'mai-disegnata' })
    await giro()
    assert.equal(globalThis.ridisegni, prima + 1)
  })

  it('basta un lettore senza isola perché si ridisegni tutto', async () => {
    const r = radice()
    const letture = risorse()
    const carica = async () => 'ok'
    aggiornaElemento(r, h('div', null, isola('pezzo', () => letture.leggi('c', carica, { isola: 'pezzo' }).stato)))
    letture.leggi('c', carica)
    const prima = globalThis.ridisegni
    await giro()
    assert.equal(globalThis.ridisegni, prima + 1)
    r.remove()
  })
})

describe('nodi pesanti (data-tieni)', () => {
  const pagina = (sorgente, classe) => h('main', null,
    h('h1', null, 'Documenti'),
    h('section', null, h('iframe', { class: classe, dataset: { tieni: sorgente }, attr: { src: sorgente } })),
  )

  it('sopravvive a un ridisegno completo, mai staccato', () => {
    const r = radice()
    aggiornaElemento(r, pagina('pdf:1', 'a'))
    const cornice = r.querySelector('iframe')
    const titolo = r.querySelector('h1')
    aggiornaElemento(r, pagina('pdf:1', 'b'))
    assert.notEqual(r.querySelector('h1'), titolo, 'il resto si rifà')
    assert.equal(r.querySelector('iframe'), cornice, 'stesso oggetto')
    assert.equal(cornice.staccato, 0, 'mai tolto dal documento')
    assert.equal(cornice.className, 'b', 'gli attributi sono quelli del disegno nuovo')
    assert.equal(r.querySelectorAll('iframe').length, 1)
    assert.equal(globalThis.document.body.children.length, 1, 'il parcheggio non resta')
    r.remove()
  })

  it('una sorgente nuova è un nodo nuovo', () => {
    const r = radice()
    aggiornaElemento(r, pagina('pdf:1', 'a'))
    const cornice = r.querySelector('iframe')
    aggiornaElemento(r, pagina('pdf:2', 'a'))
    assert.notEqual(r.querySelector('iframe'), cornice)
    r.remove()
  })

  it('dentro un\'isola, sopravvive anche al suo ridisegno', () => {
    const r = radice()
    let versione = 1
    const anteprima = () => [
      h('p', null, `versione ${versione}`),
      h('canvas', { dataset: { tieni: 'anteprima:1' } }),
    ]
    aggiornaElemento(r, h('div', null, isola('anteprima', anteprima)))
    const tela = r.querySelector('canvas')
    versione = 2
    ridisegnaIsola('anteprima')
    fotogramma()
    assert.equal(r.querySelector('canvas'), tela)
    assert.equal(tela.staccato, 0)
    assert.match(r.textContent, /versione 2/)
    r.remove()
  })
})
