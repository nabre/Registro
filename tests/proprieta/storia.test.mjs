// `Archivio.modifica` con la bozza di immer (ADR-50, passo 2), e la storia che
// ne tiene le patch, su gesti generati: le collezioni ricavate dalle patch sono
// quelle che cambiano davvero; annullare un gesto rimette lo stato di prima e
// ripristinarlo quello di dopo; gli oggetti del registro restano gli stessi.
// Gli esempi scelti a mano stanno in `tests/data/history.test.mjs`.
//
// L'archivio si apre senza documento: la storia non ha bisogno del disco.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { fc, verifica } from '../helpers/proprieta.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-storia-proprieta-'))
const lavoro = percorso.join(radice, 'lavoro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let api

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(lavoro, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  api = await import('../../dist-tests/api.mjs')
})

async function archivioVuoto () {
  const archivio = new api.Archivio()
  await archivio.apri(null)
  return archivio
}

/** Le collezioni come stanno su disco, dal registro in memoria (`versione` la rimette `modifica`). */
function collezioni (registro) {
  const { versione: _versione, anni, annoCorrenteId, materie, impostazioni, ...resto } = registro
  const tutte = { registro: { anni, annoCorrenteId, materie, impostazioni }, ...resto }
  return Object.fromEntries(Object.entries(tutte).map(([nome, valore]) => [nome, JSON.stringify(valore)]))
}

/** I nomi delle collezioni che fra due fotografie sono cambiate. */
function cambiate (prima, dopo) {
  return Object.keys(dopo).filter((nome) => prima[nome] !== dopo[nome]).sort()
}

const testo = fc.string({ maxLength: 6 })
const indice = fc.nat({ max: 20 })

/**
 * Le scritture, come dati: ognuna è una ricetta su una bozza. Toccano liste
 * (in coda, in mezzo, riordinate, rifatte con `filter`), oggetti annidati e
 * l'intestazione, che su disco è una collezione sola con più chiavi.
 */
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
  fc.record({ tipo: fc.constant('coordinata'), indirizzo: testo }),
  fc.record({ tipo: fc.constant('niente') }),
)

let contatore = 0
const id = (prefisso) => `${prefisso}-${(contatore += 1)}`

function applica (r, s) {
  const classe = r.classi.length > 0 ? r.classi[s.i % r.classi.length] : undefined
  switch (s.tipo) {
    case 'classe': r.classi.push({ id: id('cls'), nome: s.nome, allievi: [] }); break
    case 'rinomina': if (classe) classe.nome = s.nome; break
    case 'allievo': classe?.allievi.push({ id: id('alv'), nome: s.nome }); break
    case 'togliClasse': if (classe) r.classi.splice(s.i % r.classi.length, 1); break
    case 'filtraClassi': r.classi = r.classi.filter((c) => c.nome !== s.nome); break
    case 'lezione': r.lezioni.push({ id: id('lez'), argomento: s.argomento }); break
    case 'ordinaLezioni': r.lezioni.sort((a, b) => b.argomento.localeCompare(a.argomento)); break
    case 'soglia': r.impostazioni.sogliaAssenza = s.valore; break
    case 'materia': r.materie.push({ id: id('mat'), nome: s.nome }); break
    case 'coordinata': r.coordinate.push({ indirizzo: s.indirizzo }); break
    case 'niente': break
  }
}

const gesto = fc.array(fc.array(scrittura, { minLength: 1, maxLength: 4 }), { minLength: 1, maxLength: 4 })

describe('storia: proprietà', () => {
  it('le collezioni ricavate dalle patch contengono quelle cambiate, e le altre restano le stesse', async () => {
    // Contengono e non sono uguali: una lista rifatta con `filter` che non
    // toglie niente è un oggetto nuovo per immer, e si riscrive uguale (il
    // salvataggio salta un testo identico, `ultimiTesti`).
    const archivio = await archivioVuoto()
    const ricevute = []
    const via = archivio.alleDifferenze((d) => ricevute.push(d))
    try {
      verifica(fc.property(fc.array(scrittura, { minLength: 1, maxLength: 5 }), (scritture) => {
        const prima = collezioni(archivio.registro)
        const oggetti = { ...archivio.registro }
        ricevute.length = 0
        archivio.modifica((r) => { for (const s of scritture) applica(r, s) })
        const dopo = collezioni(archivio.registro)
        assert.equal(ricevute.length, 1)
        const [{ collezioni: toccate, patch }] = ricevute
        if (patch === null) {
          // Niente patch: niente è cambiato, e valgono le dichiarate (qui tutte).
          assert.deepEqual(cambiate(prima, dopo), [])
          return
        }
        for (const nome of cambiate(prima, dopo)) assert.ok(toccate.includes(nome), `${nome} cambiata e non ricavata`)
        for (const chiave of ['classi', 'lezioni', 'coordinate', 'materie', 'impostazioni']) {
          const nome = chiave === 'materie' || chiave === 'impostazioni' ? 'registro' : chiave
          if (!toccate.includes(nome)) assert.equal(archivio.registro[chiave], oggetti[chiave], `${chiave} non toccata`)
        }
      }))
    } finally {
      via.dispose()
      archivio.dispose()
    }
  })

  it('annullare un gesto rimette lo stato di prima, ripristinarlo quello di dopo', async () => {
    await verifica(fc.asyncProperty(gesto, gesto, async (preparazione, scritture) => {
      const archivio = await archivioVuoto()
      try {
        // Un gesto prima, perché l'annulla non parta sempre dal registro vuoto.
        await archivio.inUnPasso(async () => {
          for (const una of preparazione) archivio.modifica((r) => { for (const s of una) applica(r, s) })
        })
        const prima = collezioni(archivio.registro)
        const conti = archivio.contiStoria
        await archivio.inUnPasso(async () => {
          for (const una of scritture) {
            archivio.modifica((r) => { for (const s of una) applica(r, s) })
            // Un'attesa vera fra le scritture: il passo segue il gesto oltre gli `await`.
            await Promise.resolve()
          }
        })
        const dopo = collezioni(archivio.registro)
        if (archivio.contiStoria.annulla === conti.annulla) {
          // Un gesto che non ha scritto niente non entra nella storia.
          assert.deepEqual(cambiate(prima, dopo), [])
          return
        }

        assert.equal(archivio.annulla().ok, true)
        assert.deepEqual(collezioni(archivio.registro), prima)
        assert.equal(archivio.ripristina().ok, true)
        assert.deepEqual(collezioni(archivio.registro), dopo)
        // E ancora: le patch rifatte dall'annulla sono buone quanto quelle di partenza.
        assert.equal(archivio.annulla().ok, true)
        assert.deepEqual(collezioni(archivio.registro), prima)
      } finally {
        archivio.dispose()
      }
    }), 60)
  })

  it('un gesto con scritture che rinunciano si annulla tutto', async () => {
    // Il contesto delle azioni rinuncia a metà dell'operazione quando la voce
    // non c'è più (`modificaSe`); le altre scritture del gesto restano.
    await verifica(fc.asyncProperty(gesto, fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }), async (scritture, rinuncia) => {
      const archivio = await archivioVuoto()
      try {
        const prima = collezioni(archivio.registro)
        await archivio.inUnPasso(async () => {
          scritture.forEach((una, i) => {
            archivio.modificaSe((r) => {
              for (const s of una) applica(r, s)
              return !rinuncia[i]
            })
          })
        })
        const dopo = collezioni(archivio.registro)
        if (archivio.contiStoria.annulla === 0) return
        assert.equal(archivio.annulla().ok, true)
        assert.deepEqual(collezioni(archivio.registro), prima)
        assert.equal(archivio.ripristina().ok, true)
        assert.deepEqual(collezioni(archivio.registro), dopo)
      } finally {
        archivio.dispose()
      }
    }), 60)
  })
})

describe('storia: la bozza non cambia chi tiene gli oggetti', () => {
  it('un oggetto messo o preso prima di una modifica resta quello del registro', async () => {
    const archivio = await archivioVuoto()
    const classe = { id: 'cls-1', nome: 'I A', allievi: [] }
    archivio.modifica((r) => { r.classi.push(classe) }, ['classi'])
    assert.equal(archivio.registro.classi[0], classe, 'messo: è lui')

    const tenuta = archivio.registro.classi[0]
    const lista = archivio.registro.classi
    archivio.modifica((r) => { r.classi[0].nome = 'I B' }, ['classi'])
    assert.equal(tenuta.nome, 'I B', 'chi la teneva vede la modifica')
    assert.equal(archivio.registro.classi, lista, 'la lista è la stessa')
    archivio.dispose()
  })

  it('nelle prove una collezione toccata e non dichiarata ferma la scrittura', async () => {
    const archivio = await archivioVuoto()
    assert.throws(() => archivio.modifica((r) => {
      r.materie.push({ id: 'mat-1', nome: 'Matematica' })
    }, ['classi']), /non dichiarate: registro/)
    assert.deepEqual(archivio.registro.materie, [], 'lancia prima di toccare lo stato')
    archivio.dispose()
  })

  it('fuori da sviluppo e prove si scrive lo stesso, con un avviso', async () => {
    const archivio = await archivioVuoto()
    const ricevute = []
    const via = archivio.alleDifferenze((d) => ricevute.push(d))
    const avvisi = []
    const avvisa = console.warn
    console.warn = (frase) => avvisi.push(frase)
    // Come nel programma installato: né `REGISTRO_SVILUPPO` né `node --test`.
    const contesto = process.env.NODE_TEST_CONTEXT
    const sviluppo = process.env.REGISTRO_SVILUPPO
    delete process.env.NODE_TEST_CONTEXT
    delete process.env.REGISTRO_SVILUPPO
    try {
      archivio.modifica((r) => {
        r.classi.push({ id: 'cls-1', nome: 'I A', allievi: [] })
        r.materie.push({ id: 'mat-1', nome: 'Matematica' })
      }, ['classi'])
    } finally {
      if (contesto !== undefined) process.env.NODE_TEST_CONTEXT = contesto
      if (sviluppo !== undefined) process.env.REGISTRO_SVILUPPO = sviluppo
      console.warn = avvisa
      via.dispose()
    }
    assert.deepEqual(ricevute[0].collezioni.sort(), ['classi', 'registro'])
    assert.equal(avvisi.length, 1)
    assert.match(avvisi[0], /registro/)
    archivio.dispose()
  })

  it('un annulla che non combacia con lo stato rifiuta invece di lanciare', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => { r.classi.push({ id: 'cls-1', nome: 'I A', allievi: [] }) }, ['classi'])
      archivio.modifica((r) => { r.classi[0].nome = 'I B' }, ['classi'])
    })
    // Tolta senza passare da `modifica`: il numero di versione non lo sa.
    archivio.registro.classi.length = 0
    const errori = []
    const scrivi = console.error
    console.error = (...parti) => errori.push(parti)
    let esito
    try {
      esito = archivio.annulla()
    } finally {
      console.error = scrivi
    }
    assert.equal(errori.length, 1, 'lo dice nel giornale')
    assert.equal(esito.ok, false)
    assert.equal(esito.motivo, 'cambiata')
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    archivio.dispose()
  })
})
