// I controlli delle impostazioni (`core/controlli/`, ADR-52), gli stessi nel
// pannello e nella finestra nativa: quale disegno prende ogni voce del
// manifesto, la tastiera del segmentato (APG), l'interruttore che si chiama
// come la voce, il numero con l'unità, il cursore che si dice con
// `aria-valuetext`, l'esito sotto il campo. Girano su un DOM finto, qui sotto:
// i controlli ricevono il `documento` come argomento, e basta quel che usano.
//
// E la divisione in aree e sezioni della finestra nativa (`aree.ts`), che deve
// restare quella del pannello (`sections.ts`) finché il pannello non la prende da lì.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { controllo, diciEsito, nomeEAiuto } = await importaSorgente('core/controlli/controllo.ts')
const { AREE, sezioniDellArea } = await importaSorgente('core/controlli/aree.ts')
const { campo } = await importaSorgente('core/controlli/campo.ts')
const { IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')
const { SEZIONI_PROGRAMMA } = await import('../../dist-tests/settingsSections.mjs')

// ------------------------------------------------------------ il DOM finto

/** Da `fuocoDentro` a `data-fuoco`: i nomi di `dataset` come attributi. */
const trattini = (nome) => `data-${nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`

/** Un selettore semplice: tag, `.classe`, `[attr]`, `[attr="v"]`, `:not([attr])`. */
function combacia (nodo, semplice) {
  let resto = semplice.trim()
  const negati = []
  resto = resto.replace(/:not\((\[[^\]]+\])\)/g, (_, dentro) => { negati.push(dentro); return '' })
  const tag = /^[a-z]+/i.exec(resto)?.[0]
  if (tag && nodo.tagName !== tag.toUpperCase()) return false
  for (const [, classe] of resto.matchAll(/\.([\w-]+)/g)) {
    if (!nodo.classList.contains(classe)) return false
  }
  const attributi = (testo) => [...testo.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)]
  for (const [, nome, valore] of attributi(resto)) {
    if (!nodo.hasAttribute(nome)) return false
    if (valore !== undefined && nodo.getAttribute(nome) !== valore) return false
  }
  for (const negato of negati) {
    for (const [, nome] of attributi(negato)) if (nodo.hasAttribute(nome)) return false
  }
  return true
}

function discendenti (nodo) {
  return nodo.figli.flatMap((figlio) => figlio.tagName ? [figlio, ...discendenti(figlio)] : [])
}

function cercaTutti (radice, selettore) {
  const trovati = new Set()
  for (const pezzo of selettore.split(',')) {
    const figlio = /^\s*:scope\s*>\s*(.+)$/.exec(pezzo)
    const candidati = figlio ? radice.figli.filter((f) => f.tagName) : discendenti(radice)
    for (const nodo of candidati) if (combacia(nodo, figlio ? figlio[1] : pezzo)) trovati.add(nodo)
  }
  // Nell'ordine del documento.
  return discendenti(radice).filter((nodo) => trovati.has(nodo))
}

class Nodo {
  constructor (documento) {
    this.ownerDocument = documento
    this.figli = []
    this.genitore = null
  }

  get parentElement () { return this.genitore }
  get isConnected () {
    let su = this
    while (su.genitore) su = su.genitore
    return su === this.ownerDocument.body
  }

  get textContent () {
    return this.testo ?? this.figli.map((figlio) => figlio.textContent).join('')
  }

  set textContent (testo) {
    for (const figlio of this.figli) figlio.genitore = null
    this.figli = []
    if (testo !== '') this.append(this.ownerDocument.createTextNode(String(testo)))
  }

  append (...nodi) {
    for (const nodo of nodi) {
      const vero = typeof nodo === 'string' ? this.ownerDocument.createTextNode(nodo) : nodo
      vero.remove?.()
      vero.genitore = this
      this.figli.push(vero)
    }
  }

  remove () {
    if (!this.genitore) return
    this.genitore.figli = this.genitore.figli.filter((f) => f !== this)
    this.genitore = null
  }

  replaceWith (nuovo) {
    const genitore = this.genitore
    if (!genitore) return
    nuovo.remove()
    const dove = genitore.figli.indexOf(this)
    genitore.figli.splice(dove, 1, nuovo)
    nuovo.genitore = genitore
    this.genitore = null
  }
}

/** Le proprietà che sono attributi, nel DOM vero. */
const RIFLESSE = ['id', 'title', 'type', 'name', 'min', 'max', 'step', 'label', 'autocomplete']
const BOOLEANE = ['hidden', 'disabled']

class Elemento extends Nodo {
  constructor (documento, tag) {
    super(documento)
    this.tagName = tag.toUpperCase()
    this.attributi = new Map()
    this.ascoltatori = new Map()
    this.dataset = new Proxy({}, {
      get: (_, nome) => this.getAttribute(trattini(String(nome))) ?? undefined,
      set: (_, nome, valore) => { this.setAttribute(trattini(String(nome)), valore); return true },
    })
    this.classList = {
      add: (...nomi) => this.#classi((c) => { for (const n of nomi) c.add(n) }),
      remove: (...nomi) => this.#classi((c) => { for (const n of nomi) c.delete(n) }),
      contains: (nome) => this.className.split(/\s+/).includes(nome),
      toggle: (nome, acceso) => this.#classi((c) => {
        if (acceso ?? !c.has(nome)) c.add(nome)
        else c.delete(nome)
      }),
    }
    for (const nome of RIFLESSE) {
      Object.defineProperty(this, nome, {
        get: () => this.getAttribute(nome) ?? '',
        set: (valore) => { this.setAttribute(nome, valore) },
      })
    }
    for (const nome of BOOLEANE) {
      Object.defineProperty(this, nome, {
        get: () => this.hasAttribute(nome),
        set: (valore) => { if (valore) this.setAttribute(nome, ''); else this.removeAttribute(nome) },
      })
    }
  }

  #classi (cambia) {
    const insieme = new Set(this.className.split(/\s+/).filter(Boolean))
    cambia(insieme)
    this.className = [...insieme].join(' ')
  }

  get className () { return this.getAttribute('class') ?? '' }
  set className (valore) { this.setAttribute('class', valore) }
  get tabIndex () { return Number(this.getAttribute('tabindex') ?? -1) }
  set tabIndex (valore) { this.setAttribute('tabindex', valore) }

  get value () {
    if (this.tagName === 'SELECT') return this.options[this.selectedIndex]?.value ?? ''
    return this.valore ?? this.getAttribute('value') ?? ''
  }

  set value (valore) { this.valore = String(valore) }

  get options () { return this.figli.filter((f) => f.tagName === 'OPTION') }
  get selectedIndex () { return this.scelta ?? this.options.findIndex((o) => o.hasAttribute('selected')) }
  set selectedIndex (indice) { this.scelta = indice }

  setAttribute (nome, valore) { this.attributi.set(nome, String(valore)) }
  getAttribute (nome) { return this.attributi.has(nome) ? this.attributi.get(nome) : null }
  hasAttribute (nome) { return this.attributi.has(nome) }
  removeAttribute (nome) { this.attributi.delete(nome) }
  checkValidity () { return this.type !== 'email' || this.value === '' || /^[^@\s]+@[^@\s]+$/.test(this.value) }

  querySelectorAll (selettore) { return cercaTutti(this, selettore) }
  querySelector (selettore) { return cercaTutti(this, selettore)[0] ?? null }
  closest (selettore) {
    for (let nodo = this; nodo?.tagName; nodo = nodo.genitore) {
      if (combacia(nodo, selettore)) return nodo
    }
    return null
  }

  contains (altro) {
    for (let nodo = altro; nodo; nodo = nodo.genitore) if (nodo === this) return true
    return false
  }

  focus () { this.ownerDocument.activeElement = this }

  addEventListener (tipo, gestore) {
    this.ascoltatori.set(tipo, [...(this.ascoltatori.get(tipo) ?? []), gestore])
  }

  /** L'evento sale fino alla radice, come nel DOM vero, con `currentTarget` di ogni tappa. */
  dispatchEvent (evento) {
    for (let nodo = this; nodo; nodo = nodo.genitore) {
      for (const gestore of nodo.ascoltatori?.get(evento.type) ?? []) {
        evento.currentTarget = nodo
        gestore(evento)
      }
    }
  }
}

function nuovoDocumento () {
  const documento = {
    activeElement: null,
    createElement: (tag) => new Elemento(documento, tag),
    createElementNS: (_spazio, tag) => new Elemento(documento, tag),
    createTextNode: (testo) => Object.assign(new Nodo(documento), { testo: String(testo) }),
    querySelectorAll: (selettore) => documento.body.querySelectorAll(selettore),
    defaultView: {
      setTimeout: () => 0,
      clearTimeout: () => {},
      matchMedia: () => ({ matches: false, addEventListener () {} }),
    },
  }
  documento.body = new Elemento(documento, 'body')
  return documento
}

/** Un evento con quel che i controlli leggono. */
function evento (type, altro = {}) {
  return { type, preventDefault () { this.fermato = true }, ...altro }
}

const premi = (nodo, key) => nodo.dispatchEvent(evento('keydown', { key }))
const clic = (nodo) => nodo.dispatchEvent(evento('click'))
const cambia = (nodo) => nodo.dispatchEvent(evento('change'))

// ------------------------------------------------------------ le voci

/** Una voce come la manda `vociImpostazioni()`, dalla dichiarazione del manifesto. */
function voceDi (chiave, altro = {}) {
  const dichiarata = IMPOSTAZIONI[chiave]
  return {
    chiave,
    tipo: dichiarata.tipo,
    etichetta: dichiarata.etichetta ?? chiave,
    descrizione: dichiarata.descrizione,
    formato: dichiarata.formato ?? null,
    scelte: dichiarata.scelte ? dichiarata.scelte.map((s) => ({ ...s })) : null,
    minimo: dichiarata.minimo ?? null,
    massimo: dichiarata.massimo ?? null,
    passo: dichiarata.tipo === 'number' ? dichiarata.passo ?? 1 : null,
    unita: dichiarata.unita ?? null,
    controllo: dichiarata.controllo ?? null,
    scelteDinamiche: dichiarata.scelteDinamiche ?? null,
    sceltaLibera: dichiarata.sceltaLibera ?? false,
    predefinito: dichiarata.predefinito,
    valore: dichiarata.predefinito,
    scritta: false,
    bloccata: null,
    nonPronta: null,
    dipendeDa: dichiarata.dipendeDa ?? null,
    sospesa: false,
    avanzata: dichiarata.avanzata ?? false,
    delCollegamento: chiave.startsWith('registroDocenti.posta.') && chiave !== 'registroDocenti.posta.invioDiretto',
    ...altro,
  }
}

/** Una voce inventata, per i disegni che il manifesto di oggi non usa. */
function voceFinta (altro) {
  return voceDi('registroDocenti.vassoio.attivo', { chiave: 'registroDocenti.prova.voce', etichetta: 'Prova', ...altro })
}

/** Il controllo di una voce, montato nel documento, con le scritture annotate. */
function monta (voce, { esito } = {}) {
  const documento = nuovoDocumento()
  const scritti = []
  const nato = controllo(voce, (valore) => {
    scritti.push(valore)
    return esito
  }, documento)
  documento.body.append(nato)
  return { documento, nato, scritti }
}

// ------------------------------------------------------------------ le prove

describe('il nome e la frase di una scelta', () => {
  it('si dividono ai due punti o al trattino lungo, e senza separatore l’aiuto è il nome', () => {
    assert.deepEqual(nomeEAiuto('Chiaro: sempre, anche di sera.'), { nome: 'Chiaro', aiuto: 'Sempre, anche di sera.' })
    assert.deepEqual(nomeEAiuto('turbo — il più accurato.'), { nome: 'turbo', aiuto: 'Il più accurato.' })
    assert.deepEqual(nomeEAiuto('Système : suit Windows.'), { nome: 'Système', aiuto: 'Suit Windows.' })
    assert.deepEqual(nomeEAiuto('Solo lettura: si guarda — ma non si cambia.').nome, 'Solo lettura')
    assert.deepEqual(nomeEAiuto('Outlook sul web, nel browser.'), { nome: 'Outlook sul web, nel browser.', aiuto: '' })
  })
})

describe('ogni voce del manifesto prende il suo disegno', () => {
  const disegno = (voce) => monta(voce).nato.dataset.controllo

  it('ogni chiave ha un controllo, con la riga dell’esito', () => {
    for (const chiave of Object.keys(IMPOSTAZIONI)) {
      const { nato } = monta(voceDi(chiave))
      assert.ok(nato.dataset.controllo, chiave)
      assert.equal(nato.querySelectorAll('.controllo__esito').length, 1, chiave)
    }
  })

  it('figura, segmenti, tendina, interruttore, percorso, modello, collegamento, testo', () => {
    const attesi = {
      'registroDocenti.aspetto.lingua': 'figura',
      'registroDocenti.aspetto.tema': 'figura',
      'registroDocenti.vassoio.attivo': 'interruttore',
      'registroDocenti.promemoria.avviso': 'tendina',
      'registroDocenti.dettatura.taglia': 'segmenti',
      'registroDocenti.api.accesso': 'tendina',
      'registroDocenti.modelli.cartella': 'percorso',
      'registroDocenti.ocr.lettore': 'percorso',
      'registroDocenti.ocr.modello': 'modello',
      'registroDocenti.posta.mittente': 'collegamento',
      'registroDocenti.dettatura.porta': 'numero',
    }
    for (const [chiave, atteso] of Object.entries(attesi)) {
      assert.equal(disegno(voceDi(chiave)), atteso, chiave)
    }
    for (const [chiave, dichiarata] of Object.entries(IMPOSTAZIONI)) {
      if (dichiarata.tipo === 'boolean') assert.equal(disegno(voceDi(chiave)), 'interruttore', chiave)
    }
  })

  it('un segmento con una frase intera dentro diventa tendina; senza disegno, fino a quattro brevi', () => {
    const lunghe = [{ valore: 'a', aiuto: 'Una frase lunga senza nome davanti.' }, { valore: 'b', aiuto: 'B: corta.' }]
    assert.equal(disegno(voceFinta({ tipo: 'string', controllo: 'segmenti', scelte: lunghe, valore: 'a' })), 'tendina')
    const brevi = ['A', 'B', 'C', 'D', 'E'].map((n) => ({ valore: n, aiuto: `${n}: la scelta ${n}.` }))
    assert.equal(disegno(voceFinta({ tipo: 'string', scelte: brevi.slice(0, 4), valore: 'A' })), 'segmenti')
    assert.equal(disegno(voceFinta({ tipo: 'string', scelte: brevi, valore: 'A' })), 'tendina')
  })

  it('un numero è intero se non si dice altro; il cursore vuole i due estremi', () => {
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, passo: 1 })), 'numero')
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, controllo: 'cursore', minimo: 0 })), 'numero')
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, controllo: 'cursore', minimo: 0, massimo: 10 })), 'cursore')
  })
})

describe('il segmentato è un gruppo radio (APG)', () => {
  const voce = (altro) => voceDi('registroDocenti.dettatura.taglia', altro)

  it('una sola fermata del Tab; le frecce, Home e Fine scelgono e mandano il valore', () => {
    const { nato, documento, scritti } = monta(voce())
    const gruppo = nato.querySelector('[role="radiogroup"]')
    assert.equal(gruppo.getAttribute('aria-label'), 'Modello della voce')
    const radio = () => nato.querySelectorAll('[role="radio"]')
    assert.equal(radio().length, 5)
    assert.deepEqual(radio().map((r) => r.figli[0].textContent), ['turbo', 'large', 'medium', 'small', 'base'])
    assert.equal(radio().filter((r) => r.getAttribute('tabindex') === '0').length, 1)

    premi(radio()[0], 'ArrowRight')
    assert.deepEqual(scritti, ['large'])
    assert.equal(radio()[1].getAttribute('aria-checked'), 'true')
    assert.equal(radio()[1].getAttribute('tabindex'), '0')
    assert.equal(radio()[0].getAttribute('tabindex'), '-1')
    assert.equal(documento.activeElement, radio()[1])
    // La frase della scelta sotto il gruppo segue la scelta.
    assert.match(nato.querySelector('.controllo__descrizione').textContent, /poco più preciso/)

    premi(radio()[1], 'End')
    premi(radio()[4], 'Home')
    premi(radio()[0], 'ArrowLeft')
    assert.deepEqual(scritti, ['large', 'base', 'turbo', 'base'])
    // La stessa scelta non si rimanda.
    clic(radio()[4])
    assert.deepEqual(scritti, ['large', 'base', 'turbo', 'base'])
  })

  it('la frase di ogni scelta è la sua descrizione, nascosta ma nominata', () => {
    const { nato } = monta(voce())
    const primo = nato.querySelector('[role="radio"]')
    const aiuto = primo.querySelector('[hidden]')
    assert.ok(aiuto)
    assert.ok(primo.getAttribute('aria-describedby').split(' ').includes(aiuto.id))
  })

  it('sospeso non sceglie niente', () => {
    const { nato, scritti } = monta(voce({ sospesa: true }))
    premi(nato.querySelector('[role="radio"]'), 'ArrowRight')
    assert.deepEqual(scritti, [])
    assert.equal(nato.querySelector('[role="radiogroup"]').getAttribute('aria-disabled'), 'true')
  })
})

describe('l’interruttore', () => {
  it('è un switch che si chiama come la voce, e manda il contrario', () => {
    const { nato, scritti } = monta(voceDi('registroDocenti.vassoio.attivo'))
    const bottone = nato.querySelector('[role="switch"]')
    assert.equal(bottone.getAttribute('aria-label'), 'Icona accanto all’orologio')
    assert.doesNotMatch(bottone.textContent, /Acceso|Spento/)
    assert.equal(bottone.getAttribute('aria-checked'), 'true')
    clic(bottone)
    assert.deepEqual(scritti, [false])
    assert.equal(bottone.getAttribute('aria-checked'), 'false')
  })

  it('una figlia sospesa si mostra spenta e non si preme; una bloccata non si accende', () => {
    const sospesa = monta(voceDi('registroDocenti.vassoio.chiusuraNelVassoio', { valore: true, sospesa: true }))
    const bottone = sospesa.nato.querySelector('[role="switch"]')
    assert.equal(bottone.getAttribute('aria-checked'), 'false')
    assert.equal(bottone.disabled, true)
    clic(bottone)
    assert.deepEqual(sospesa.scritti, [])
    const bloccata = monta(voceDi('registroDocenti.ocr.attivo', { bloccata: 'Manca il modello.' }))
    assert.equal(bloccata.nato.querySelector('[role="switch"]').disabled, true)
  })
})

describe('numero e cursore', () => {
  it('il numero porta l’unità accanto, gli estremi e il passo; il vuoto non si manda', () => {
    const { nato, scritti } = monta(voceFinta({ tipo: 'number', valore: 5, passo: 1, minimo: 0, massimo: 60, unita: 'min' }))
    const campo = nato.querySelector('input')
    assert.equal(campo.type, 'number')
    assert.deepEqual([campo.min, campo.max, campo.step], ['0', '60', '1'])
    const unita = nato.querySelector('.controllo-numero__unita')
    assert.equal(unita.textContent, 'min')
    assert.ok(campo.getAttribute('aria-describedby').includes(unita.id))
    campo.value = ''
    cambia(campo)
    campo.value = '12'
    cambia(campo)
    assert.deepEqual(scritti, [12])
  })

  it('il cursore si dice con l’unità, trascinando; si salva quando lo si lascia', () => {
    const { nato, scritti } = monta(voceFinta({
      tipo: 'number', valore: 20, passo: 1, minimo: 6, massimo: 40, unita: 'mm', controllo: 'cursore',
    }))
    const campo = nato.querySelector('input')
    assert.equal(campo.type, 'range')
    assert.equal(campo.getAttribute('aria-valuetext'), '20 mm')
    campo.value = '30'
    campo.dispatchEvent(evento('input'))
    assert.equal(campo.getAttribute('aria-valuetext'), '30 mm')
    assert.equal(nato.querySelector('.controllo-cursore__valore').textContent, '30 mm')
    assert.deepEqual(scritti, [])
    cambia(campo)
    assert.deepEqual(scritti, [30])
  })
})

describe('la tendina', () => {
  it('le opzioni hanno il nome corto, la frase della scelta sta sotto e segue il cambio', () => {
    const { nato, scritti } = monta(voceDi('registroDocenti.promemoria.avviso'))
    const tendina = nato.querySelector('select')
    assert.equal(tendina.getAttribute('aria-label'), 'Avviso prima della lezione')
    assert.deepEqual(tendina.options.map((o) => o.textContent), [
      'Nessun avviso', 'All’ora', '2 min prima', '5 min prima', '10 min prima', '15 min prima',
    ])
    const frase = nato.querySelector('.controllo__descrizione')
    assert.match(frase.textContent, /rampa di scale/)
    assert.ok(tendina.getAttribute('aria-describedby').includes(frase.id))
    tendina.selectedIndex = 0
    cambia(tendina)
    assert.deepEqual(scritti, ['nessuno'])
    assert.match(frase.textContent, /non manda notifiche/)
  })
})

describe('l’esito sotto il campo', () => {
  it('«Salvato» quando la scrittura passa', async () => {
    const { nato } = monta(voceDi('registroDocenti.vassoio.attivo'), { esito: Promise.resolve(null) })
    clic(nato.querySelector('[role="switch"]'))
    await new Promise((fatto) => setImmediate(fatto))
    const riga = nato.querySelector('.controllo__esito')
    assert.equal(riga.textContent, 'Salvato')
    assert.equal(riga.getAttribute('role'), 'status')
  })

  it('il motivo della dogana accanto al campo, e il controllo torna com’era', async () => {
    const { documento, nato } = monta(voceDi('registroDocenti.vassoio.attivo'), {
      esito: Promise.resolve('Non si può.'),
    })
    clic(nato.querySelector('[role="switch"]'))
    await new Promise((fatto) => setImmediate(fatto))
    const rifatto = documento.body.querySelector('.controllo')
    assert.notEqual(rifatto, nato)
    const riga = rifatto.querySelector('.controllo__esito')
    assert.equal(riga.textContent, 'Non si può.')
    assert.ok(riga.classList.contains('controllo__esito--rifiuto'))
    assert.equal(rifatto.querySelector('[role="switch"]').getAttribute('aria-checked'), 'true')
  })

  it('diciEsito scrive nella riga di un controllo già disegnato', () => {
    const { nato } = monta(voceDi('registroDocenti.modelli.cartella'))
    diciEsito(nato, 'Cartella che non c’è.', nato.ownerDocument)
    assert.equal(nato.querySelector('.controllo__esito').textContent, 'Cartella che non c’è.')
  })
})

/** Il controllo di un campo del documento (`campo()`), montato, con le scritture annotate. */
function montaCampo (spec, { esito } = {}) {
  const documento = nuovoDocumento()
  const scritti = []
  const nato = campo(spec, (valore) => {
    scritti.push(valore)
    return typeof esito === 'function' ? esito(valore) : esito
  }, documento)
  documento.body.append(nato)
  return { documento, nato, scritti }
}

const DURATE = [45, 50, 60, 90].map((minuti) => ({ valore: minuti, nome: `${minuti} min` }))

describe('campo(): i valori che non sono chiavi del manifesto', () => {
  it('il disegno lo dice chi chiama, con la riga dell’esito e la chiave del campo', () => {
    const { nato } = montaCampo({ tipo: 'numero', chiave: 'sogliaAssenza', nome: 'Soglia', valore: 20, unita: '%' })
    assert.equal(nato.dataset.controllo, 'numero')
    assert.equal(nato.dataset.chiave, 'sogliaAssenza')
    assert.equal(nato.querySelectorAll('.controllo__esito').length, 1)
    const campoNumero = nato.querySelector('input')
    assert.equal(campoNumero.name, 'sogliaAssenza')
    assert.equal(campoNumero.getAttribute('aria-label'), 'Soglia')
    assert.equal(nato.querySelector('.controllo-numero__unita').textContent, '%')
    // Il cursore senza i due estremi è un numero.
    assert.equal(montaCampo({ tipo: 'cursore', chiave: 'x', nome: 'X', valore: 3 }).nato.dataset.controllo, 'numero')
    assert.equal(montaCampo({
      tipo: 'cursore', chiave: 'x', nome: 'X', valore: 3, minimo: 1, massimo: 6, passo: 0.5,
    }).nato.dataset.controllo, 'cursore')
  })

  it('la tendina con «Altro…»: le scelte mandano il loro valore, «Altro…» apre il numero', () => {
    const { nato, scritti } = montaCampo({
      tipo: 'tendina', chiave: 'minutiUd', nome: 'Durata', valore: 50, scelte: DURATE, altro: 'Altro…',
      minimo: 20, massimo: 120, unita: 'min',
    })
    assert.equal(nato.dataset.controllo, 'altro')
    const tendina = nato.querySelector('select')
    assert.equal(tendina.name, 'minutiUd')
    assert.deepEqual(tendina.options.map((o) => o.textContent), ['45 min', '50 min', '60 min', '90 min', 'Altro…'])
    assert.equal(tendina.selectedIndex, 1)
    const accanto = nato.querySelector('.controllo-altro')
    assert.equal(accanto.hidden, true)
    tendina.selectedIndex = 3
    cambia(tendina)
    assert.deepEqual(scritti, [90])
    tendina.selectedIndex = 4
    cambia(tendina)
    assert.equal(accanto.hidden, false)
    assert.deepEqual(scritti, [90], '«Altro…» da solo non manda niente')
    const libero = accanto.querySelector('input')
    assert.equal(libero.name, 'minutiUd-altro')
    assert.deepEqual([libero.min, libero.max], ['20', '120'])
    libero.value = '55'
    cambia(libero)
    assert.deepEqual(scritti, [90, 55])
  })

  it('un valore fuori elenco arriva con «Altro…» scelto e il numero in vista', () => {
    const { nato } = montaCampo({
      tipo: 'tendina', chiave: 'minutiUd', nome: 'Durata', valore: 55, scelte: DURATE, altro: 'Altro…',
    })
    assert.equal(nato.querySelector('select').selectedIndex, 4)
    assert.equal(nato.querySelector('.controllo-altro').hidden, false)
    assert.equal(nato.querySelector('.controllo-altro').querySelector('input').value, '55')
  })

  it('un segmentato il cui valore nessuna scelta porta ne prende una in più, e la mostra scelta', () => {
    const passi = [0.1, 0.25, 0.5, 1].map((passo) => ({ valore: passo, nome: String(passo) }))
    const { nato, scritti } = montaCampo({ tipo: 'segmenti', chiave: 'scalaPasso', nome: 'Passo', valore: 0.2, scelte: passi })
    const radio = nato.querySelectorAll('[role="radio"]')
    assert.equal(radio.length, 5)
    assert.equal(radio[4].getAttribute('aria-checked'), 'true')
    clic(radio[1])
    assert.deepEqual(scritti, [0.25])
    // Uno che c'è non ne aggiunge.
    assert.equal(montaCampo({ tipo: 'segmenti', chiave: 'p', nome: 'P', valore: 1, scelte: passi })
      .nato.querySelectorAll('[role="radio"]').length, 4)
  })

  it('il segmentato multiplo: pulsanti a due stati, manda le accese nell’ordine delle scelte', () => {
    const giorni = ['lu', 'ma', 'me'].map((nome, i) => ({ valore: i + 1, nome }))
    const { nato, scritti, documento } = montaCampo({
      tipo: 'multipli', chiave: 'giorni', nome: 'Giorni', valore: [3, 1], scelte: giorni,
      almeno: { quante: 1, motivo: 'Almeno uno.' },
    })
    const gruppo = nato.querySelector('[role="group"]')
    assert.equal(gruppo.getAttribute('aria-label'), 'Giorni')
    const voci = nato.querySelectorAll('.controllo-segmenti__voce')
    assert.deepEqual(voci.map((v) => v.getAttribute('aria-pressed')), ['true', 'false', 'true'])
    assert.deepEqual(voci.map((v) => v.getAttribute('tabindex')), ['0', '-1', '-1'])
    clic(voci[1])
    assert.deepEqual(scritti, [[1, 2, 3]])
    // Due clic di fila: il secondo parte dai pulsanti vivi, non dal disegno.
    clic(voci[0])
    assert.deepEqual(scritti.at(-1), [2, 3])
    // Le frecce spostano il fuoco senza mandare niente.
    premi(voci[0], 'ArrowRight')
    assert.equal(documento.activeElement, voci[1])
    assert.equal(scritti.length, 2)
    // L'ultima accesa non si spegne: lo si dice sotto.
    clic(voci[1])
    assert.deepEqual(scritti.at(-1), [3])
    clic(voci[2])
    assert.equal(voci[2].getAttribute('aria-pressed'), 'true')
    assert.equal(scritti.length, 3)
    assert.equal(nato.querySelector('.controllo__esito').textContent, 'Almeno uno.')
  })

  it('il testo con delle scelte le propone, e se ne scrive un altro', () => {
    const { nato, scritti } = montaCampo({
      tipo: 'testo', chiave: 'intestazione.docenteAppellativo', nome: 'Appellativo', valore: '',
      scelte: [{ valore: 'Prof.', nome: 'Prof.' }, { valore: 'Dott.', nome: 'Dott.' }],
    })
    const scritto = nato.querySelector('input')
    const proposte = nato.querySelector('datalist')
    assert.equal(scritto.getAttribute('list'), proposte.id)
    assert.deepEqual(proposte.querySelectorAll('option').map((o) => o.value), ['Prof.', 'Dott.'])
    scritto.value = 'Ing.'
    cambia(scritto)
    assert.deepEqual(scritti, ['Ing.'])
  })

  it('spento non manda niente', () => {
    const { nato, scritti } = montaCampo({
      tipo: 'tendina', chiave: 'minutiUd', nome: 'Durata', valore: 45, scelte: DURATE, altro: 'Altro…', spento: true,
    })
    assert.equal(nato.querySelector('select').disabled, true)
    const multipli = montaCampo({
      tipo: 'multipli',
      chiave: 'g',
      nome: 'G',
      valore: [1],
      scelte: [{ valore: 1, nome: 'lu' }, { valore: 2, nome: 'ma' }],
      spento: true,
    })
    clic(multipli.nato.querySelectorAll('.controllo-segmenti__voce')[1])
    assert.deepEqual([...scritti, ...multipli.scritti], [])
  })

  it('dopo un rifiuto si rifà con quel che dice adesso la funzione, non con quel che si era scelto', async () => {
    let vivo = 45
    const { documento, nato } = montaCampo(() => ({
      tipo: 'tendina', chiave: 'minutiUd', nome: 'Durata', valore: vivo, scelte: DURATE, altro: 'Altro…',
    }), { esito: () => { vivo = 60; return Promise.resolve('Corretta a 60.') } })
    const tendina = nato.querySelector('select')
    tendina.selectedIndex = 1
    cambia(tendina)
    await new Promise((fatto) => setImmediate(fatto))
    const rifatto = documento.body.querySelector('.controllo')
    assert.notEqual(rifatto, nato)
    assert.equal(rifatto.querySelector('select').selectedIndex, 2)
    assert.equal(rifatto.querySelector('.controllo__esito').textContent, 'Corretta a 60.')
  })

  it('un esito vuoto rimette il campo com’era senza dire niente (una domanda a cui si è detto no)', async () => {
    const { documento, nato, scritti } = montaCampo(() => ({
      tipo: 'tendina', chiave: 'minutiUd', nome: 'Durata', valore: 45, scelte: DURATE, altro: 'Altro…',
    }), { esito: Promise.resolve('') })
    const tendina = nato.querySelector('select')
    tendina.selectedIndex = 1
    cambia(tendina)
    await new Promise((fatto) => setImmediate(fatto))
    assert.deepEqual(scritti, [50])
    const rifatto = documento.body.querySelector('.controllo')
    assert.equal(rifatto.querySelector('select').selectedIndex, 0)
    assert.equal(rifatto.querySelector('.controllo__esito').textContent, '')
  })
})

describe('le aree della finestra nativa', () => {
  const voci = Object.keys(IMPOSTAZIONI).map((chiave) => voceDi(chiave))

  it('ogni chiave del manifesto sta in una sezione sola, di Utente o di Programma', () => {
    const viste = new Map()
    for (const area of AREE) {
      for (const sezione of sezioniDellArea(area, voci)) {
        assert.ok(['utente', 'programma'].includes(area), `${sezione.id} in ${area}`)
        const sue = [...sezione.gruppi.flatMap((g) => g.voci), ...sezione.avanzate]
        for (const voce of sue) {
          assert.ok(!viste.has(voce.chiave), `${voce.chiave} in ${viste.get(voce.chiave)} e in ${sezione.id}`)
          viste.set(voce.chiave, sezione.id)
        }
      }
    }
    assert.deepEqual([...viste.keys()].sort(), Object.keys(IMPOSTAZIONI).sort())
  })

  it('le sezioni prendono gli stessi prefissi di quelle del pannello', () => {
    for (const area of ['utente', 'programma']) {
      for (const sezione of sezioniDellArea(area, voci)) {
        const delPannello = SEZIONI_PROGRAMMA.find((s) => s.id === sezione.id)
        assert.ok(delPannello, sezione.id)
        const sue = [...sezione.gruppi.flatMap((g) => g.voci), ...sezione.avanzate]
          .map((v) => v.chiave)
        const prefissi = delPannello.prefissi
        for (const chiave of sue) {
          assert.ok(
            delPannello.raccoglie || prefissi.some((p) => chiave === p || chiave.startsWith(`${p}.`)),
            `${chiave} fuori da ${sezione.id}`,
          )
        }
        assert.equal(sezione.titolo, delPannello.titolo)
      }
    }
  })
})
