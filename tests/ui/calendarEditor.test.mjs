// La tastiera dell'editor del calendario, senza DOM: il documento è un finto
// che consegna l'ascoltatore, i moduli attorno contano le chiamate, il dominio
// è quello vero. Si prova quel che dipende dai tempi:
//
//   1. Ctrl+Z con uno spostamento delle frecce in attesa: la scrittura parte
//      subito, e il timer non la riscrive dopo;
//   2. due frecce di giorno in fretta: due giorni, non uno;
//   3. Ctrl+D tenuto premuto o battuto due volte: una copia sola; e niente
//      copia per un'ora ancorata all'ICS;
//   4. Canc due volte in fretta: una cancellazione sola;
//   5. l'ora scelta che non è più sullo schermo non si tocca;
//   6. Invio su un pulsante del calendario che non è un'ora resta al pulsante.

import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

import { creaLezione, inizioLezione, registroVuoto, slotSpostati } from '../../dist-tests/domain.mjs'

// ------------------------------------------------------------------ i finti

/** I moduli dell'interfaccia che l'editor importa, e che cosa ne usa. */
const FINTI = {
  'bridge.js': 'export const azione = (...a) => globalThis.finti.azione(...a)',
  'notifications.js': 'export const notifica = (...a) => globalThis.finti.notifica(...a)',
  'dom.js': 'export const dentroUnCampo = () => false\nexport const h = () => ({})',
  'externalCalendar.js': 'export const ancorataAIcs = (id) => globalThis.finti.ancorate.has(id)',
  'forms.js': 'export const chiediEliminazione = async () => true\nexport const moduloLezione = () => {}',
  'forms/common.js': 'export const opzioniCorsi = () => []',
  'state.js': [
    'export const stato = globalThis.finti.stato',
    'export const aggiorna = (p) => Object.assign(globalThis.finti.stato, p)',
    'export const annoCorrente = () => null',
    "export const nomeClasseDiLezione = () => '3B'",
  ].join('\n'),
  'calendar/common.js': 'export const apriLezione = (l) => globalThis.finti.aperte.push(l.id)',
  'calendar/drag.js': [
    'export const AGGANCIO_MINUTI = 5',
    'export const posa = (...a) => globalThis.finti.posa(...a)',
  ].join('\n'),
}

/** Da quale import si arriva a quale finto: `./common.js` è quello del calendario. */
function fintoPer (percorso) {
  if (percorso === './common.js') return 'calendar/common.js'
  if (percorso === './drag.js') return 'calendar/drag.js'
  return Object.keys(FINTI).find((chiave) => percorso.endsWith(`/${chiave}`)) ?? null
}

const pluginFinti = {
  name: 'finti',
  setup (b) {
    b.onResolve({ filter: /\.js$/ }, (args) => {
      if (!args.importer.replaceAll('\\', '/').endsWith('src/ui/views/calendar/editor.ts')) return undefined
      const chiave = fintoPer(args.path)
      return chiave ? { path: chiave, namespace: 'finto' } : undefined
    })
    b.onLoad({ filter: /.*/, namespace: 'finto' }, (args) => ({ contents: FINTI[args.path], loader: 'js' }))
  },
}

/** Un elemento della pagina quanto basta: classi, stile, `closest`. */
class Elemento {
  constructor ({ classi = [], antenati = [], lezione = null } = {}) {
    this.classi = new Set(classi)
    this.antenati = antenati
    this.lezione = lezione
    this.style = { top: '10%' }
    this.dataset = {}
    this.classList = {
      contains: (c) => this.classi.has(c),
      add: (...c) => c.forEach((x) => this.classi.add(x)),
      remove: (...c) => c.forEach((x) => this.classi.delete(x)),
    }
  }

  focus () {}
  hasAttribute (nome) { return nome === 'data-lezione' && this.lezione !== null }
  /** Solo i selettori che l'editor chiede: il calendario e i pulsanti. */
  closest (selettore) {
    for (const el of [this, ...this.antenati]) {
      if (selettore.split(',').some((s) => el.classi.has(s.trim().replace(/^\./, '')))) return el
    }
    return null
  }
}

// I timer delle frecce: si guardano e si fanno scattare a mano.
const timer = new Map()
let prossimoTimer = 1
const clearTimeoutVero = globalThis.clearTimeout
const presenti = new Set()
let ascoltatore = null

globalThis.finti = {
  stato: {},
  azioni: [],
  notifiche: [],
  aperte: [],
  pose: [],
  ancorate: new Set(),
  /** Come risponde l'host: di solito subito, e prima aggiorna lo stato. */
  rispondi: null,
  azione (comando) {
    this.azioni.push(comando)
    return this.rispondi ? this.rispondi(comando) : Promise.resolve(applica(comando))
  },
  notifica (testo, livello) { this.notifiche.push({ testo, livello }) },
  posa (lezione, data, inizio, copia) {
    this.pose.push({ id: lezione.id, data, copia })
    return this.posaInVolo ?? Promise.resolve()
  },
}
const finti = globalThis.finti

Object.assign(globalThis, {
  Element: Elemento,
  CSS: { escape: (s) => s },
  requestAnimationFrame: () => 0,
  window: {
    setTimeout: (fn) => {
      const id = prossimoTimer++
      timer.set(id, fn)
      return id
    },
  },
  document: {
    body: new Elemento(),
    addEventListener: (tipo, fn) => { if (tipo === 'keydown') ascoltatore = fn },
    querySelector: () => null,
    querySelectorAll: (selettore) => {
      const id = /data-lezione="([^"]+)"/.exec(selettore)?.[1]
      return id && presenti.has(id) ? [new Elemento({ classi: ['blocco'], lezione: id })] : []
    },
  },
})
globalThis.clearTimeout = (id) => (timer.has(id) ? timer.delete(id) : clearTimeoutVero(id))
after(() => { globalThis.clearTimeout = clearTimeoutVero })

/** Lo stato che l'ospite spinge prima della risposta: la lezione spostata. */
function applica (comando) {
  const lezioni = finti.stato.registro.lezioni
  const lezione = lezioni.find((l) => l.id === comando.lezioneId)
  if (!lezione) return { ok: false, errori: ['La lezione non c’è più.'] }
  if (comando.tipo === 'lezione.sposta') {
    lezione.data = comando.data
    if (comando.inizio) lezione.slot = slotSpostati(lezione.slot, comando.inizio)
  }
  if (comando.tipo === 'lezione.elimina') lezioni.splice(lezioni.indexOf(lezione), 1)
  return { ok: true }
}

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../../src/ui/views/calendar/editor.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
  plugins: [pluginFinti],
})
const editor = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

// ------------------------------------------------------------------ i gesti

function premi (key, altro = {}) {
  let fermato = false
  ascoltatore({
    key,
    target: globalThis.document.body,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    defaultPrevented: false,
    preventDefault () { fermato = true },
    ...altro,
  })
  return fermato
}

/** Lascia correre le promesse già risolte. */
const giro = () => new Promise((r) => setImmediate(r))

/** Un'ora nuova, sullo schermo e scelta. */
function oraScelta (inizio = '08:20') {
  const lezione = creaLezione('corso-1', '2026-09-14', inizio, 45)
  finti.stato.registro.lezioni.push(lezione)
  presenti.add(lezione.id)
  editor.scegli(lezione.id)
  return lezione
}

beforeEach(async () => {
  await editor.scriviInAttesa()
  Object.assign(finti, {
    azioni: [], notifiche: [], aperte: [], pose: [], rispondi: null, posaInVolo: null,
  })
  finti.ancorate.clear()
  presenti.clear()
  timer.clear()
  finti.stato = Object.assign(finti.stato, {
    editorCalendario: true,
    vista: 'calendario',
    modoCalendario: 'settimana',
    filtroCorsoAgendaId: null,
    registro: registroVuoto(),
  })
  editor.scegli(null)
})

describe("l'editor del calendario da tastiera", () => {
  it('Ctrl+Z prima che le frecce si fermino scrive lo spostamento subito, una volta sola', async () => {
    const lezione = oraScelta()
    premi('ArrowDown')
    premi('ArrowDown')
    assert.equal(finti.azioni.length, 0, 'le frecce aspettano di fermarsi')
    assert.equal(editor.spostamentoInAttesa(), true)

    // È quel che fa `eseguiComando` prima di annullare o ripristinare.
    await editor.scriviInAttesa()
    assert.deepEqual(finti.azioni, [
      { tipo: 'lezione.sposta', lezioneId: lezione.id, data: '2026-09-14', inizio: '08:30' },
    ])
    assert.equal(editor.spostamentoInAttesa(), false)
    // Il timer delle frecce se n'è andato: non riscrive dopo l'annulla.
    assert.equal(timer.size, 0)
  })

  it('le frecce ferme scrivono la somma', async () => {
    const lezione = oraScelta()
    premi('ArrowUp', { shiftKey: true })
    premi('ArrowDown')
    for (const fn of [...timer.values()]) fn()
    await editor.scriviInAttesa()
    assert.equal(finti.azioni.length, 1)
    assert.equal(inizioLezione(lezione), '07:40')
  })

  it('due frecce di giorno in fretta spostano di due giorni', async () => {
    const lezione = oraScelta()
    let rilascia
    finti.rispondi = (comando) => new Promise((r) => { rilascia = () => r(applica(comando)) })
    premi('ArrowRight')
    await giro()
    assert.equal(finti.azioni.length, 1, 'il primo giorno parte subito')
    // Il secondo e il terzo arrivano prima della risposta al primo.
    premi('ArrowRight')
    premi('ArrowRight')
    await giro()
    assert.equal(finti.azioni.length, 1, 'gli altri aspettano in coda')
    finti.rispondi = null
    rilascia()
    await editor.scriviInAttesa()
    assert.equal(finti.azioni.length, 2, 'le battute in coda partono insieme')
    assert.equal(lezione.data, '2026-09-17')
  })

  it('Ctrl+D tenuto premuto o battuto in fretta fa una copia sola', async () => {
    const lezione = oraScelta()
    let rilascia
    finti.posaInVolo = new Promise((r) => { rilascia = r })
    premi('d', { ctrlKey: true })
    await giro()
    premi('d', { ctrlKey: true, repeat: true })
    premi('d', { ctrlKey: true })
    await giro()
    assert.deepEqual(finti.pose, [{ id: lezione.id, data: '2026-09-21', copia: true }])
    rilascia()
    await giro()
    premi('d', { ctrlKey: true })
    await giro()
    assert.equal(finti.pose.length, 2, 'finita la prima, la seconda si fa')
  })

  it("Ctrl+D non copia un'ora ancorata all'ICS", async () => {
    const lezione = oraScelta()
    finti.ancorate.add(lezione.id)
    assert.equal(premi('d', { ctrlKey: true }), true)
    await giro()
    assert.equal(finti.pose.length, 0)
    assert.equal(finti.notifiche.at(-1)?.livello, 'avviso')
  })

  it('Canc due volte in fretta cancella una volta', async () => {
    const lezione = oraScelta()
    let rilascia
    finti.rispondi = (comando) => new Promise((r) => { rilascia = () => r(applica(comando)) })
    premi('Delete')
    await giro()
    premi('Delete', { repeat: true })
    premi('Delete')
    await giro()
    assert.deepEqual(finti.azioni, [{ tipo: 'lezione.elimina', lezioneId: lezione.id }])
    rilascia()
    await giro()
    assert.equal(finti.notifiche.filter((n) => n.livello === 'errore').length, 0)
  })

  it("l'ora scelta che non si vede più non si tocca", async () => {
    const lezione = oraScelta()
    presenti.delete(lezione.id)
    premi('Delete')
    premi('ArrowDown')
    await giro()
    assert.equal(finti.azioni.length, 0)
    assert.equal(editor.sceltaLezione(lezione.id), false, 'la scelta se ne va')
  })

  it("Invio su un pulsante del calendario che non è un'ora resta al pulsante", () => {
    const lezione = oraScelta()
    const vista = new Elemento({ classi: ['vista--calendario'] })
    const pulsante = new Elemento({ classi: ['button'], antenati: [vista] })
    assert.equal(premi('Enter', { target: pulsante }), false)
    assert.deepEqual(finti.aperte, [])
    // Sul blocco dell'ora, invece, Invio la apre.
    const blocco = new Elemento({ classi: ['button', 'blocco'], antenati: [vista], lezione: lezione.id })
    assert.equal(premi('Enter', { target: blocco }), true)
    assert.deepEqual(finti.aperte, [lezione.id])
  })
})

describe('allungare un’ora sulle pause della giornata', () => {
  /** Ricreazione 9:30–9:45. */
  const PAUSE = { prima: { inizio: '09:30', durataMin: 15 }, seguenti: [] }
  const forma = (slot) =>
    [...slot].sort((a, b) => a.inizio.localeCompare(b.inizio)).map((s) => `${s.tipo} ${s.inizio}–${s.fine}`)

  it('l’UD in più scavalca la ricreazione, e la pausa entra nell’ora salvata', async () => {
    finti.stato.registro.impostazioni.pause = PAUSE
    const lezione = creaLezione('corso-1', '2026-09-14', '08:00', 90)
    finti.stato.registro.lezioni.push(lezione)
    finti.rispondi = () => Promise.resolve({ ok: true })
    await editor.stiraDiUd(lezione, 'fine', 1)
    const salvata = finti.azioni.find((a) => a.tipo === 'lezione.salva')
    assert.ok(salvata, 'allungare non ha salvato niente')
    assert.deepEqual(forma(salvata.lezione.slot), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–10:30',
    ])
  })

  it('un’ora ancorata al calendario ICS: l’evento resta, la fascia libera scavalca la pausa', async () => {
    finti.stato.registro.impostazioni.pause = PAUSE
    const lezione = creaLezione('corso-1', '2026-09-14', '08:00', 90)
    lezione.slot = lezione.slot.map((s) => ({ ...s, ics: true }))
    finti.stato.registro.lezioni.push(lezione)
    finti.ancorate.add(lezione.id)
    finti.rispondi = () => Promise.resolve({ ok: true })
    await editor.stiraDiUd(lezione, 'fine', 1)
    const salvata = finti.azioni.find((a) => a.tipo === 'lezione.salva')
    assert.ok(salvata, 'allungare non ha salvato niente')
    assert.deepEqual(forma(salvata.lezione.slot), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–10:30',
    ])
  })
})

