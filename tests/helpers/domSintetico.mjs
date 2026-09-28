// Il DOM finto su cui girano le prove dei pulsanti del pannello senza browser:
// elementi che tengono classi, attributi, figli e ascoltatori, e un `document`
// e una `window` quanto bastano ai moduli di `ui/pannello/`. Va preparato prima
// di importare il modulo sotto prova, che legge i globali al caricamento.

/** Installa in `globalThis` il DOM finto. */
export function preparaDomSintetico () {
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
