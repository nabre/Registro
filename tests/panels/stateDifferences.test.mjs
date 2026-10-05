// La spinta dello stato a differenze (`desktop/pannelli/panel.ts`): il
// registro intero alla nascita del pannello, a pagina ricaricata, quando la
// pagina lo chiede, dopo un registro riletto e con l'interruttore
// `REGISTRO_STATO_INTERO=1`; in mezzo solo le patch. E per proprietà: dopo una
// fila di gesti, scritture e annulla, il registro della pagina
// (`ui/statePatches.ts`) è quello dell'archivio.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'
import { fc, verifica } from '../helpers/proprieta.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-differenze-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  m = await importaSorgente(
    [
      "export { PannelloRegistro } from './desktop/pannelli/panel.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export { SeguitoDelRegistro } from './ui/statePatches.ts'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  )
})

/**
 * Un pannello finto e la sua pagina: i messaggi passano copiati, come fra due
 * processi, e la pagina tiene il registro come `ui/main.tsx`.
 */
function banco (archivio) {
  const mandati = []
  let ricevi = () => {}
  let chiuso = () => {}
  const niente = { dispose () {} }
  const pagina = { registro: null, chieste: 0 }
  const seguito = new m.SeguitoDelRegistro(() => {
    pagina.chieste += 1
    ricevi({ tipo: 'stato.intero' })
  })
  const consegna = (messaggio) => {
    if (messaggio.tipo === 'stato') pagina.registro = seguito.intero(messaggio.registro, messaggio.revisione)
    if (messaggio.tipo === 'differenze') {
      const nuovo = seguito.differenze(pagina.registro, messaggio)
      if (nuovo) pagina.registro = nuovo
    }
  }
  const finto = {
    webview: {
      html: '',
      options: {},
      cspSource: 'vscode-resource:',
      asWebviewUri: (uri) => uri,
      postMessage: async (messaggio) => {
        const copia = structuredClone(messaggio)
        mandati.push(copia)
        consegna(copia)
        return true
      },
      onDidReceiveMessage: (al) => { ricevi = al; return niente },
    },
    onDidDispose: (al) => { chiuso = al; return niente },
    reveal () {},
  }
  const contesto = { extensionUri: m.Uri.file(radice), subscriptions: [] }
  const pannello = new m.PannelloRegistro(finto, contesto, archivio)
  return {
    mandati,
    pagina,
    pannello,
    scrivi: (messaggio) => ricevi(messaggio),
    chiudi: () => chiuso(),
    /** I tipi delle spinte dello stato, svuotando. */
    spinte () {
      const tipi = mandati.filter((x) => x.tipo === 'stato' || x.tipo === 'differenze').map((x) => x.tipo)
      mandati.length = 0
      return tipi
    },
  }
}

/** Le microtask in coda: la spinta parte da una di loro. */
const assesta = () => new Promise((fatto) => setTimeout(fatto, 0))

async function archivioVuoto () {
  const archivio = new m.Archivio(m.Uri.file(percorso.join(radice, 'utente')))
  await archivio.apri(null)
  return archivio
}

/** Il registro come JSON, senza `versione`, che la scrittura rimette fuori dalle patch. */
function dati (registro) {
  const { versione: _versione, ...resto } = registro
  return JSON.parse(JSON.stringify(resto))
}

describe('la spinta dello stato a differenze', () => {
  it('intero alla nascita e a pagina ricaricata, poi solo le patch', async () => {
    const archivio = await archivioVuoto()
    const b = banco(archivio)
    try {
      b.scrivi({ id: 1, azione: { tipo: 'stato.leggi' } })
      await b.pannello.coda
      await assesta()
      // Poi la risposta all'azione rispinge lo stato: è già della pagina.
      assert.deepEqual(b.spinte(), ['stato', 'differenze'])

      await archivio.inUnPasso(async () => {
        archivio.modifica((r) => { r.classi.push({ id: 'c1', nome: 'I A', allievi: [] }) }, ['classi'])
        archivio.modifica((r) => { r.classi[0].nome = 'I B' }, ['classi'])
      })
      await assesta()
      const [differenze, ...altre] = b.mandati.filter((x) => x.tipo === 'differenze')
      assert.equal(altre.length, 0, 'due scritture di fila, una spinta')
      assert.deepEqual(differenze.collezioni, ['classi'])
      assert.equal(differenze.revisione - differenze.da, 2)
      assert.equal(differenze.registro, undefined, 'il registro non viaggia')
      assert.deepEqual(b.spinte(), ['differenze'])
      assert.deepEqual(dati(b.pagina.registro), dati(archivio.registro))

      // Anche un annulla viaggia a differenze.
      assert.equal(archivio.annulla().ok, true)
      await assesta()
      assert.deepEqual(b.spinte(), ['differenze'])
      assert.deepEqual(b.pagina.registro.classi, [])

      // Una spinta senza dati nuovi (storia, lingua, impostazioni) porta il contorno e nessuna patch.
      const prima = b.pagina.registro
      b.pannello.spingiStato()
      await assesta()
      const [vuota] = b.mandati.filter((x) => x.tipo === 'differenze')
      assert.deepEqual(vuota.patch, [])
      assert.equal(vuota.da, vuota.revisione)
      assert.equal(b.pagina.registro, prima, 'il registro della pagina resta lo stesso oggetto')
      b.spinte()

      b.scrivi({ id: 2, azione: { tipo: 'stato.leggi' } })
      await b.pannello.coda
      await assesta()
      assert.deepEqual(b.spinte(), ['stato', 'differenze'], 'una pagina ricaricata non ha più il registro')
      assert.equal(b.pagina.chieste, 0)
    } finally {
      b.chiudi()
      archivio.dispose()
    }
  })

  it('intero quando la pagina lo chiede, dopo un registro riletto e con l’interruttore', async () => {
    const archivio = await archivioVuoto()
    const b = banco(archivio)
    try {
      b.scrivi({ id: 1, azione: { tipo: 'stato.leggi' } })
      await b.pannello.coda
      await assesta()
      b.spinte()

      b.scrivi({ tipo: 'stato.intero' })
      await assesta()
      assert.deepEqual(b.spinte(), ['stato'])

      // Rileggere lo stato è un cambiamento senza differenze.
      await archivio.apri(null)
      await assesta()
      assert.deepEqual(b.spinte(), ['stato'])

      process.env.REGISTRO_STATO_INTERO = '1'
      try {
        archivio.modifica((r) => { r.materie.push({ id: 'm1', nome: 'Storia' }) }, ['registro'])
        await assesta()
        assert.deepEqual(b.spinte(), ['stato'])
      } finally {
        delete process.env.REGISTRO_STATO_INTERO
      }
      archivio.modifica((r) => { r.materie[0].nome = 'Geografia' }, ['registro'])
      await assesta()
      assert.deepEqual(b.spinte(), ['differenze'], 'spento l’interruttore, si torna alle patch')
      assert.deepEqual(dati(b.pagina.registro), dati(archivio.registro))
      assert.equal(b.pagina.chieste, 0)
    } finally {
      b.chiudi()
      archivio.dispose()
    }
  })

  it('una pagina che ha perso il filo lo chiede, e lo stato intero la rimette in pari', async () => {
    const archivio = await archivioVuoto()
    const b = banco(archivio)
    try {
      b.scrivi({ id: 1, azione: { tipo: 'stato.leggi' } })
      await b.pannello.coda
      await assesta()
      // Una spinta persa per strada: la pagina resta indietro di una revisione.
      const posta = b.pannello.pannello.webview.postMessage
      b.pannello.pannello.webview.postMessage = async () => true
      archivio.modifica((r) => { r.lezioni.push({ id: 'l1', argomento: 'a' }) }, ['lezioni'])
      await assesta()
      b.pannello.pannello.webview.postMessage = posta
      b.spinte()

      archivio.modifica((r) => { r.lezioni[0].argomento = 'b' }, ['lezioni'])
      await assesta()
      assert.equal(b.pagina.chieste, 1)
      assert.deepEqual(b.spinte(), ['differenze', 'stato'])
      assert.deepEqual(dati(b.pagina.registro), dati(archivio.registro))
    } finally {
      b.chiudi()
      archivio.dispose()
    }
  })
})

// ---------------------------------------------------------------- proprietà

const testo = fc.string({ maxLength: 6 })
const indice = fc.nat({ max: 20 })

/** Le scritture di un gesto, come in `tests/proprieta/storia.test.mjs`. */
const scrittura = fc.oneof(
  fc.record({ tipo: fc.constant('classe'), nome: testo }),
  fc.record({ tipo: fc.constant('rinomina'), i: indice, nome: testo }),
  fc.record({ tipo: fc.constant('allievo'), i: indice, nome: testo }),
  fc.record({ tipo: fc.constant('togliClasse'), i: indice }),
  fc.record({ tipo: fc.constant('filtraClassi'), nome: testo }),
  fc.record({ tipo: fc.constant('lezione'), argomento: testo }),
  fc.record({ tipo: fc.constant('ordinaLezioni') }),
  fc.record({ tipo: fc.constant('soglia'), valore: fc.integer({ min: 0, max: 100 }) }),
  fc.record({ tipo: fc.constant('materia'), nome: testo }),
)

let contatore = 0
const id = (prefisso) => `${prefisso}-${(contatore += 1)}`

function applica (r, s) {
  const classe = r.classi.length > 0 ? r.classi[s.i % r.classi.length] : undefined
  switch (s.tipo) {
    case 'classe': r.classi.push({ id: id('cls'), nome: s.nome, allievi: [] }); return false
    case 'rinomina': if (classe) classe.nome = s.nome; return false
    case 'allievo': classe?.allievi.push({ id: id('alv'), nome: s.nome }); return false
    case 'togliClasse': if (classe) r.classi.splice(s.i % r.classi.length, 1); return true
    case 'filtraClassi': r.classi = r.classi.filter((c) => c.nome !== s.nome); return false
    case 'lezione': r.lezioni.push({ id: id('lez'), argomento: s.argomento }); return false
    // Dopo un riordino la lista non si rilegge nella stessa operazione (`draft.ts`).
    case 'ordinaLezioni': r.lezioni.sort((a, b) => b.argomento.localeCompare(a.argomento)); return true
    case 'soglia': r.impostazioni.sogliaAssenza = s.valore; return false
    case 'materia': r.materie.push({ id: id('mat'), nome: s.nome }); return false
  }
  return false
}

const passo = fc.oneof(
  { weight: 4, arbitrary: fc.record({ tipo: fc.constant('gesto'), scritture: fc.array(scrittura, { minLength: 1, maxLength: 4 }) }) },
  { weight: 1, arbitrary: fc.constant({ tipo: 'annulla' }) },
  { weight: 1, arbitrary: fc.constant({ tipo: 'ripristina' }) },
  { weight: 1, arbitrary: fc.constant({ tipo: 'spinta' }) },
)

describe('la spinta dello stato a differenze: proprietà', () => {
  it('dopo una fila di gesti il registro della pagina è quello dell’archivio', async () => {
    const file = fc.array(passo, { minLength: 1, maxLength: 12 })
    await verifica(fc.asyncProperty(file, async (passi) => {
      const archivio = await archivioVuoto()
      const b = banco(archivio)
      try {
        b.scrivi({ id: 1, azione: { tipo: 'stato.leggi' } })
        await b.pannello.coda
        await assesta()
        for (const p of passi) {
          if (p.tipo === 'gesto') {
            await archivio.inUnPasso(async () => {
              archivio.modifica((r) => {
                for (const s of p.scritture) if (applica(r, s)) return
              })
            })
          } else if (p.tipo === 'annulla') {
            if (archivio.contiStoria.annulla > 0) archivio.annulla()
          } else if (p.tipo === 'ripristina') {
            if (archivio.contiStoria.ripristina > 0) archivio.ripristina()
          } else {
            // Più gesti nella stessa spinta, o una spinta per gesto.
            await assesta()
          }
        }
        await assesta()
        assert.deepEqual(dati(b.pagina.registro), dati(archivio.registro))
        assert.equal(b.pagina.chieste, 0, 'in sequenza la pagina non perde mai il filo')
        assert.equal(b.mandati.filter((x) => x.tipo === 'stato').length, 1, 'intero solo la prima volta')
      } finally {
        b.chiudi()
        archivio.dispose()
      }
    }), 60)
  })
})
