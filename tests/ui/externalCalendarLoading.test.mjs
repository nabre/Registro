// Il calendario ICS del pannello si legge fuori dal disegno. Il modulo
// `externalCalendar.ts` gira con ponte e stato finti, il dominio è quello vero.
// Si fissa che:
//
//   1. le letture della vista (eventi, collegamenti, ancoraggio, anomalie)
//      leggono solo la cache: dentro il disegno niente ponte e niente
//      scrittura, e due disegni chiedono al più una volta, dopo;
//   2. la lettura parte anche dall'iscritto allo stato, una sola per chiave, e
//      si rifà solo se la chiave cambia (copia nuova di un calendario);
//   3. l'allineamento delle lezioni collegate parte dall'iscritto, in una
//      scrittura sola per tutte, e non riparte se non c'è più niente da fare;
//   4. fuori dal calendario non si allinea.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

import { creaLezione } from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const FINTI = {
  'bridge.js': [
    'export const chiedi = (...a) => globalThis.finti.chiedi(...a)',
    'export const azione = (...a) => globalThis.finti.scrivi(...a)',
    'export const invia = (...a) => globalThis.finti.scrivi(...a)',
  ].join('\n'),
  'notifications.js': 'export const notifica = () => {}',
  'state.js': [
    'export const stato = globalThis.finti.stato',
    'export const annoCorrente = () => globalThis.finti.anno',
    'export const iscriviti = (a) => { globalThis.finti.ascoltatori.push(a); return () => {} }',
    'export const ridisegna = () => { for (const a of globalThis.finti.ascoltatori) a() }',
    'export const aggiorna = (m) => {',
    '  Object.assign(globalThis.finti.stato, m)',
    '  for (const a of globalThis.finti.ascoltatori) a()',
    '}',
  ].join('\n'),
}

const pluginFinti = {
  name: 'finti',
  setup (b) {
    b.onResolve({ filter: /\.js$/ }, (args) => {
      const da = args.importer.replaceAll('\\', '/')
      if (!da.endsWith('ui/externalCalendar.ts') && !da.endsWith('ui/asyncResources.ts')) return undefined
      const chiave = Object.keys(FINTI).find((k) => args.path.endsWith(`/${k}`))
      return chiave ? { path: chiave, namespace: 'finto' } : undefined
    })
    b.onLoad({ filter: /.*/, namespace: 'finto' }, (args) => ({ contents: FINTI[args.path], loader: 'js' }))
  },
}

const evento = (data, inizio, fine) => ({
  chiave: `c1:${data}T${inizio}`, data, inizio, fine, titolo: 'MAT', luogo: 'A12', annullato: false,
})

/** Due ore di Matematica che il calendario sposta di un quarto d'ora. */
function registroConCalendario (copiatoIl) {
  const { registro, corso } = scuolaMinima()
  registro.lezioni.push(
    creaLezione(corso.id, '2027-03-15', '08:20', 45),
    creaLezione(corso.id, '2027-03-16', '08:20', 45),
  )
  registro.impostazioni.calendario = {
    calendari: [{ id: 'c1', nome: 'Scuola', copiatoIl }],
    regole: [{ id: 'r1', testo: 'MAT', corsoId: corso.id }],
  }
  return registro
}

const EVENTI = [evento('2027-03-15', '08:35', '09:20'), evento('2027-03-16', '08:35', '09:20')]

const finti = {
  stato: {
    registro: registroConCalendario('2026-09-01T08:00'),
    vista: 'calendario',
    mostraCalendarioEsterno: true,
    editorCalendario: true,
    modoCalendario: 'settimana',
  },
  anno: { inizio: '2026-09-01', fine: '2027-06-30' },
  ascoltatori: [],
  chiesti: [],
  scritte: [],
  /** Le letture in attesa: si sciolgono a mano, come arrivassero dall'host. */
  inAttesa: [],
  chiedi (procedura, ingresso) {
    finti.chiesti.push({ procedura, ingresso })
    return new Promise((resolve) => finti.inAttesa.push(resolve))
  },
  async scrivi (azione) {
    finti.scritte.push(azione)
    return { ok: true }
  },
}
globalThis.finti = finti

const { outputFiles } = await build({
  inject: [fileURLToPath(new URL('../helpers/temporal.mjs', import.meta.url))],
  entryPoints: [fileURLToPath(new URL('../../ui/externalCalendar.ts', import.meta.url))],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  plugins: [pluginFinti],
  logLevel: 'silent',
})
const modulo = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

/** Lascia correre microtask e timer già in coda. */
const sfoga = () => new Promise((resolve) => setImmediate(resolve))

/** Tutto quel che la vista del calendario legge disegnando, due volte. */
function disegnaDueVolte () {
  const lezione = finti.stato.registro.lezioni[0]
  for (let i = 0; i < 2; i += 1) {
    modulo.eventiEsterni('2027-03-15')
    modulo.eventiCaricati()
    modulo.eventiDellaLezione(lezione.id)
    modulo.ancorataAIcs(lezione.id)
    modulo.anomalieCalendario()
    modulo.guastoCalendarioEsterno()
  }
}

function aggiorna (modifiche = {}) {
  Object.assign(finti.stato, modifiche)
  for (const ascoltatore of finti.ascoltatori) ascoltatore()
}

describe('calendario ICS: lettura fuori dal disegno', () => {
  it('disegnare non chiede niente al ponte e non scrive; dopo, una lettura sola', async () => {
    disegnaDueVolte()
    assert.equal(finti.chiesti.length, 0)
    assert.equal(finti.scritte.length, 0)
    await sfoga()
    assert.equal(finti.chiesti.length, 1)
    assert.equal(finti.scritte.length, 0)
  })

  it("l'iscritto non rilegge una chiave già in volo o pronta", async () => {
    aggiorna()
    aggiorna()
    disegnaDueVolte()
    await sfoga()
    assert.equal(finti.chiesti.length, 1)
    assert.equal(finti.chiesti[0].procedura, 'calendario.eventi')
    finti.inAttesa.shift()({ ok: true, dati: { eventi: EVENTI, guasti: [] }, errori: [] })
    await sfoga()
    aggiorna()
    disegnaDueVolte()
    assert.equal(finti.chiesti.length, 1)
    assert.deepEqual(modulo.eventiEsterni('2027-03-15').map((e) => e.chiave), [EVENTI[0].chiave])
  })

  it("l'allineamento parte dall'iscritto, in una scrittura sola", async () => {
    await sfoga()
    assert.equal(finti.scritte.length, 1)
    assert.equal(finti.scritte[0].tipo, 'calendario.applica')
    assert.equal(finti.scritte[0].allinea.length, 2)
    // Stesso registro, stessi eventi: niente di nuovo da allineare.
    aggiorna()
    disegnaDueVolte()
    await sfoga()
    assert.equal(finti.scritte.length, 1)
  })

  it('una copia nuova del calendario si rilegge; fuori dal calendario non si allinea', async () => {
    aggiorna({ vista: 'oggi', registro: registroConCalendario('2026-09-02T08:00') })
    await sfoga()
    // Fuori dal calendario non si legge neanche.
    assert.equal(finti.chiesti.length, 1)
    aggiorna({ vista: 'calendario' })
    aggiorna()
    assert.equal(finti.chiesti.length, 2)
    finti.inAttesa.shift()({ ok: true, dati: { eventi: EVENTI, guasti: [] }, errori: [] })
    await sfoga()
    // Registro nuovo con le due ore ancora da spostare: una scrittura, di due voci.
    assert.equal(finti.scritte.length, 2)
    assert.equal(finti.scritte[1].allinea.length, 2)
  })
})
