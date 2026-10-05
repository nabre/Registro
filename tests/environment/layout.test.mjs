// La disposizione delle finestre per documento (`desktop/apparato/layout.ts`)
// e la memoria di una figlia (`desktop/apparato/uiState.ts`): un file storto o
// scritto a mano non riapre finestre che non esistono, e una figlia legge le
// preferenze di forma della principale senza scriverle.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-disposizione-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')
mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
after(() => rmSync(radice, { recursive: true, force: true }))

const disposizione = await importaSorgente('desktop/apparato/layout.ts')
const { conLePreferenzeDi, gestisciStatoInterfaccia } = await importaSorgente('desktop/apparato/uiState.ts')

describe('la disposizione letta dal file', () => {
  const { disposizioniValide, MASSIMO_DOCUMENTI } = disposizione

  it('tiene solo numeri di figlia buoni, una volta, in ordine', () => {
    const lette = disposizioniValide({
      'c:/anni/2026.regi': { figlie: [3, 2, 2, 1, 0, 8, 2.5, '4', 7], usato: '2026-10-01T08:00:00Z' },
    })
    assert.deepEqual(lette['c:/anni/2026.regi'].figlie, [2, 3, 7])
  })

  it('scarta quel che non riconosce, senza lanciare', () => {
    for (const storto of [null, 'testo', 12, [], { a: 'b' }, { a: { figlie: 'no' } }]) {
      assert.deepEqual(disposizioniValide(storto), {})
    }
    const conProto = JSON.parse('{"__proto__": {"figlie": [2]}, "x": {"figlie": [2]}}')
    const lette = disposizioniValide(conProto)
    assert.deepEqual(Object.keys(lette), ['x'])
    assert.equal(Object.getPrototypeOf(lette), Object.prototype)
  })

  it('ricorda al più i documenti più recenti', () => {
    const tanti = {}
    for (let i = 0; i < MASSIMO_DOCUMENTI + 5; i += 1) {
      tanti[`d${i}`] = { figlie: [2], usato: new Date(2026, 0, 1 + i).toISOString() }
    }
    const lette = disposizioniValide(tanti)
    assert.equal(Object.keys(lette).length, MASSIMO_DOCUMENTI)
    assert.ok(!('d0' in lette) && 'd24' in lette, 'cedono i meno recenti')
  })

  it('un anno provvisorio non ha disposizione; le barre e le maiuscole non contano', () => {
    const { chiaveDellaDisposizione } = disposizione
    assert.equal(chiaveDellaDisposizione('C:\\Anni\\2026.regi', true), null)
    assert.equal(chiaveDellaDisposizione(null, false), null)
    assert.equal(chiaveDellaDisposizione('C:\\Anni\\2026.regi', false), 'c:/anni/2026.regi')
  })

  it('si scrive e si rilegge per documento', () => {
    const { figlieRicordate, ricaricaDisposizioni, ricordaFiglie } = disposizione
    ricordaFiglie('c:/anni/a.regi', [3, 2])
    ricordaFiglie('c:/anni/b.regi', [])
    ricaricaDisposizioni()
    assert.deepEqual(figlieRicordate('c:/anni/a.regi'), [2, 3])
    assert.deepEqual(figlieRicordate('c:/anni/b.regi'), [])
    assert.deepEqual(figlieRicordate(null), [])
    const scritto = JSON.parse(readFileSync(percorso.join(process.env.REGISTRO_USERDATA, 'disposizione.json'), 'utf8'))
    assert.deepEqual(scritto['c:/anni/a.regi'].figlie, [2, 3])
  })
})

describe('la memoria di una figlia', () => {
  const globali = { sidebarDesktop: true, modoCalendario: 'mese' }

  it('ha le preferenze di forma della principale e il suo posto', () => {
    const propria = { v: 2, globali: { modoCalendario: 'anno' }, documenti: { d: { posto: { pagina: 'pagina.calendario' } } } }
    const unita = conLePreferenzeDi(propria, { v: 2, globali, documenti: {} })
    assert.deepEqual(unita.globali, globali)
    assert.deepEqual(unita.documenti, propria.documenti)
    // Una figlia nuova, senza file, nasce con le preferenze della principale.
    const nuova = conLePreferenzeDi(null, { v: 2, globali, documenti: {} })
    assert.deepEqual(nuova, { v: 2, documenti: {}, globali })
    // Una principale d'altra forma la lascia com'è.
    assert.equal(conLePreferenzeDi(propria, { schedaLezione: 'x' }), propria)
  })

  it('legge dal suo file più quello della principale, e scrive solo il suo', () => {
    const cartella = percorso.join(radice, 'interfacce')
    mkdirSync(percorso.join(cartella, 'interfaccia'), { recursive: true })
    const file = (tipo) => percorso.join(cartella, 'interfaccia', `${encodeURIComponent(tipo)}.json`)
    writeFileSync(file('registroDocenti.pannello'), JSON.stringify({ v: 2, globali, documenti: {} }))
    const letta = gestisciStatoInterfaccia(cartella, 'registroDocenti.pannello.2', 'leggi', undefined, 'registroDocenti.pannello')
    assert.deepEqual(letta.globali, globali)

    gestisciStatoInterfaccia(cartella, 'registroDocenti.pannello.2', 'scrivi', { v: 2, globali: { modoCalendario: 'anno' }, documenti: {} })
    assert.deepEqual(JSON.parse(readFileSync(file('registroDocenti.pannello'), 'utf8')).globali, globali)
    assert.deepEqual(JSON.parse(readFileSync(file('registroDocenti.pannello.2'), 'utf8')).globali, { modoCalendario: 'anno' })
  })
})
