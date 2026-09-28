// Prova di regressione per comandiInVolo nella barra dei comandi:
// un comando asincrono in volo mantiene la disabilitazione e lo stato in-corso
// anche se la barra dei comandi viene ridisegnata prima che l'host risponda,
// e ripristina lo stato originale sia a successo che a fallimento.

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
const {
  comandiInVolo,
  eseguiDalPulsante,
  pulsanteComando,
  rinasceInVolo,
} = await importaSorgente('ui/pannello/commandBar.ts')

describe('il ciclo di vita di comandiInVolo', () => {
  it('un comando asincrono registra il volo e blocca il nuovo pulsante rinato nel ridisegno', async () => {
    let risolvi
    const promessa = new Promise((r) => { risolvi = r })

    const comando = {
      id: 'test.asincrono.successo',
      titolo: 'Comando Asincrono',
      simbolo: 'ingranaggio',
      dove: ['app'],
      gruppo: 'test',
      al: () => promessa,
    }

    const bottoneOriginale = globalThis.document.createElement('button')
    eseguiDalPulsante(comando, bottoneOriginale)

    assert.equal(comandiInVolo.has(comando.id), true, 'Il comando deve essere in volo')
    assert.equal(bottoneOriginale.disabled, true, 'Il pulsante originale deve essere disabilitato')

    // Simuliamo il ridisegno della barra dei comandi
    const bottoneRinato = pulsanteComando(comando)
    assert.equal(bottoneRinato.disabled, true, 'Il pulsante rinato deve nascere disabilitato')
    assert.equal(bottoneRinato.classList.contains('in-corso'), true, 'Deve avere la classe in-corso')
    assert.equal(bottoneRinato.getAttribute('aria-busy'), 'true', 'Deve avere aria-busy true')

    // Quando la risposta arriva dall\'host
    risolvi({ ok: true })
    await new Promise((r) => setTimeout(r, 0))

    assert.equal(comandiInVolo.has(comando.id), false, 'Il comando non deve più essere in volo')
    assert.equal(bottoneRinato.disabled, false, 'Il pulsante rinato deve tornare abilitato')
    assert.equal(bottoneRinato.classList.contains('in-corso'), false, 'Classe in-corso rimossa')
    assert.equal(bottoneRinato.getAttribute('aria-busy'), null, 'aria-busy rimosso')
  })

  it('se la promessa rifiuta, il pulsante rinato viene comunque ripristinato', async () => {
    let rifiuta
    const promessa = new Promise((_r, rej) => { rifiuta = rej })

    const comando = {
      id: 'test.asincrono.errore',
      titolo: 'Comando Asincrono Errore',
      simbolo: 'ingranaggio',
      dove: ['app'],
      gruppo: 'test',
      al: () => promessa,
    }

    const bottoneOriginale = globalThis.document.createElement('button')
    eseguiDalPulsante(comando, bottoneOriginale)

    const bottoneRinato = globalThis.document.createElement('button')
    rinasceInVolo(comando.id, bottoneRinato)

    assert.equal(bottoneRinato.disabled, true)
    assert.equal(bottoneRinato.classList.contains('in-corso'), true)

    rifiuta(new Error('Errore simulato'))
    await new Promise((r) => setTimeout(r, 0))

    assert.equal(comandiInVolo.has(comando.id), false)
    assert.equal(bottoneRinato.disabled, false)
    assert.equal(bottoneRinato.classList.contains('in-corso'), false)
    assert.equal(bottoneRinato.getAttribute('aria-busy'), null)
  })

  it('un comando sincrono non viene inserito in comandiInVolo', () => {
    let eseguito = false
    const comando = {
      id: 'test.sincrono',
      titolo: 'Comando Sincrono',
      simbolo: 'ingranaggio',
      dove: ['app'],
      gruppo: 'test',
      al: () => { eseguito = true },
    }

    const bottone = globalThis.document.createElement('button')
    eseguiDalPulsante(comando, bottone)

    assert.equal(eseguito, true)
    assert.equal(comandiInVolo.has(comando.id), false)
  })
})
