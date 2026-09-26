// La fila delle scritture dentro `chiama()`: una sola per tutti i trasporti
// (pannello, condotto, ponte…).
//
// **La prima prova è la regola**: due scritture avviate nello stesso tick su un
// gestore che aspetta in mezzo osservano `1→1→2→2`, non `1→2→1→2`. Le altre
// difendono quel che una fila ingenua sbaglia: le letture saltano la corsia, il
// turno può non arrivare, il documento cambia mentre si aspetta, un errore non
// avvelena la fila.
//
// Serve un archivio vero: si misura l'ordine delle scritture.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it, mock } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-coda-')

let api
let archivio
let Uri

/** Quel che le procedute finte scrivono passando: è l'ordine che si guarda. */
let tracce = []

/** Una promessa che si scioglie da fuori: il dialogo di sistema, in miniatura. */
function sospesa () {
  let sciogli
  const attesa = new Promise((risolvi) => {
    sciogli = risolvi
  })
  return { attesa, sciogli }
}

/** Lascia girare le microtask, perché chi si è messo in fila ci arrivi davvero. */
async function respira (giri = 4) {
  for (let i = 0; i < giri; i += 1) await Promise.resolve()
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, registra: false }))
  const { definisci, registra, SCRITTURA, schemi } = api
  Uri = api.Uri

  /** Il gestore che aspetta in mezzo: due scritture, e fra loro un `await`. */
  const scriveInDueTempi = async (ambito, ingresso) => {
    ambito.contesto.modifica((r) => {
      tracce.push(`${ingresso.chi}a`)
      r.impostazioni.durataPausaPredefinita = ingresso.minuti
    }, ['registro'])
    // Il punto in cui un gestore lascia il controllo col registro a metà (dialogo,
    // posta, PDF).
    await new Promise((risolvi) => setImmediate(risolvi))
    ambito.contesto.modifica((r) => {
      tracce.push(`${ingresso.chi}b`)
      r.impostazioni.durataPausaPredefinita = ingresso.minuti + 1
    }, ['registro'])
    return { revisione: ambito.contesto.archivio.revisione }
  }

  registra(
    definisci({
      nome: 'fila.dueTempi',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Scrive, aspetta, riscrive: il gestore che si può intrecciare',
      idempotente: false,
      collezioni: ['registro'],
      ingresso: schemi.oggetto({
        chi: schemi.testo({ minimo: 1 }),
        minuti: schemi.numero({ intero: true, minimo: 0, massimo: 600 }),
      }),
      uscita: SCRITTURA,
      esegui: scriveInDueTempi,
    }),
    definisci({
      nome: 'fila.legge',
      versione: 1,
      genere: 'lettura',
      titolo: 'Legge il registro in memoria, e non deve mettersi in fila',
      idempotente: true,
      ingresso: schemi.vuoto(),
      uscita: schemi.oggetto({ revisione: schemi.numero({ intero: true }) }),
      esegui: (ambito) => {
        tracce.push('lettura')
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'fila.chiamaUnaLettura',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Una scrittura che dentro di sé chiede una lettura al nucleo',
      idempotente: false,
      collezioni: ['registro'],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: async (ambito) => {
        // Il rientro possibile: una lettura da dentro un gestore passa da `chiama()`
        // senza mettersi in fila, o aspetterebbe il proprio chiamante per sempre.
        const dentro = await api.chiama(ambito.contesto.archivio, 'fila.legge', {})
        assert.equal(dentro.ok, true)
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = 11
        }, ['registro'])
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'fila.sulFile',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Non dichiara collezioni ma parla del documento: come esportazioni.elimina',
      idempotente: false,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: (ambito) => {
        tracce.push('sulFile')
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'fila.fuoriDalDocumento',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Non guarda il documento: come la finestra o le impostazioni del programma',
      idempotente: false,
      collezioni: [],
      documento: 'indipendente',
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: (ambito) => {
        tracce.push('fuori')
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'fila.attende',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Tiene il turno finché non la si scioglie da fuori, e non scrive',
      idempotente: false,
      collezioni: [],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: async (ambito) => {
        await bloccoCorrente.attesa
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'fila.esplode',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Solleva a metà: la fila dietro non se ne deve accorgere',
      idempotente: false,
      collezioni: ['registro'],
      ingresso: schemi.vuoto(),
      uscita: SCRITTURA,
      esegui: () => {
        tracce.push('esplosa')
        throw new TypeError('non si legge una proprietà di undefined')
      },
    }),
  )
})

/** Il blocco che `fila.attende` aspetta: si rifà a ogni prova che lo usa. */
let bloccoCorrente = sospesa()

after(() => smonta(radice, archivio))

describe('l’ordine delle scritture', () => {
  it('due scritture avviate insieme non si intrecciano: 1→1→2→2', async () => {
    // Senza la fila l'ordine sarebbe `1a 2a 1b 2b`: la seconda entra sull'`await`
    // della prima e le due scritture si coprono.
    tracce = []
    const prima = api.chiama(archivio, 'fila.dueTempi', { chi: '1', minuti: 10 })
    const seconda = api.chiama(archivio, 'fila.dueTempi', { chi: '2', minuti: 20 })
    const esiti = await Promise.all([prima, seconda])

    assert.deepEqual(esiti.map((e) => e.ok), [true, true])
    assert.deepEqual(tracce, ['1a', '1b', '2a', '2b'])
  })

  it('una lettura non aspetta la scrittura lenta che ha davanti', async () => {
    // La fila è **solo** sulle scritture: una lettura è sincrona e non aspetta
    // venti PDF.
    tracce = []
    bloccoCorrente = sospesa()
    const scrittura = api.chiama(archivio, 'fila.attende', {})
    await respira()

    const lettura = await api.chiama(archivio, 'fila.legge', {})
    assert.equal(lettura.ok, true)
    // La lettura passa mentre la scrittura è ancora nel suo `await`.
    assert.deepEqual(tracce, ['lettura'])

    bloccoCorrente.sciogli()
    assert.equal((await scrittura).ok, true)
  })

  it('una scrittura che solleva non ferma quella dopo', async () => {
    tracce = []
    const male = api.chiama(archivio, 'fila.esplode', {})
    const bene = api.chiama(archivio, 'fila.dueTempi', { chi: '3', minuti: 30 })

    const primaBusta = await male
    assert.equal(primaBusta.ok, false)
    assert.equal(primaBusta.codice, 'interno')

    // Un errore non avvelena la fila: altrimenti smetterebbe di avanzare in
    // silenzio. Come `Archivio.inFila` e la coda del condotto.
    const secondaBusta = await bene
    assert.equal(secondaBusta.ok, true)
    assert.deepEqual(tracce, ['esplosa', '3a', '3b'])
  })
})

describe('il rientro, che è il presupposto della fila', () => {
  it('nessun gestore chiama il nucleo: verificato sul sorgente', () => {
    // Nessun gestore rientra in `chiama()`, o la fila si fermerebbe fino al tetto
    // («il registro era occupato»). Si legge il sorgente e si vieta tutto; che la
    // strada di una lettura esista lo mostra `fila.chiamaUnaLettura`.
    const cartelle = [
      fileURLToPath(new URL('../../src/actions', import.meta.url)),
      fileURLToPath(new URL('../../src/api/procedures', import.meta.url)),
    ]
    const colpevoli = []
    const guarda = (dove) => {
      for (const voce of readdirSync(dove)) {
        const pieno = percorso.join(dove, voce)
        if (statSync(pieno).isDirectory()) {
          guarda(pieno)
          continue
        }
        if (!voce.endsWith('.ts')) continue
        const testo = readFileSync(pieno, 'utf8')
        // `chiama(` preceduto da una non-lettera: `daGestore`, `richiamare` e le
        // citazioni fra apici non contano.
        for (const riga of testo.split('\n')) {
          if (riga.trimStart().startsWith('//') || riga.trimStart().startsWith('*')) continue
          if (/(?<![A-Za-z])chiama\s*\(/.test(riga)) colpevoli.push(`${pieno}: ${riga.trim()}`)
        }
      }
    }
    for (const cartella of cartelle) guarda(cartella)
    assert.deepEqual(colpevoli, [], 'un gestore rientra in chiama(): la fila unica può stallare')
  })

  it('una scrittura che chiede una lettura al nucleo non stalla', async () => {
    const esito = await api.chiama(archivio, 'fila.chiamaUnaLettura', {})
    assert.equal(esito.ok, true)
  })
})

describe('quel che una fila ingenua sbaglia', () => {
  it('il documento cambiato mentre si aspetta è un conflitto, e non scrive niente', async () => {
    tracce = []
    bloccoCorrente = sospesa()
    // Davanti una scrittura che tiene il turno e non tocca il registro.
    const davanti = api.chiama(archivio, 'fila.attende', {})
    await respira()

    // Dietro, una scrittura sulle collezioni del documento aperto.
    const dietro = api.chiama(archivio, 'fila.dueTempi', { chi: '4', minuti: 40 })
    await respira()

    // Intanto il documento cambia (un altro anno aperto, OneDrive): `leggiTutto`
    // **sostituisce** l'oggetto `Registro`.
    await archivio.creaAnno(
      api.creaAnno('2027-09-01', '2028-06-30'),
      Uri.file(percorso.join(dati, '2027-2028.regi')),
    )
    const revisionePrima = archivio.revisione

    bloccoCorrente.sciogli()
    assert.equal((await davanti).ok, true)

    const esito = await dietro
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'conflitto')
    assert.match(esito.messaggi[0], /documento aperto è cambiato/)
    // Non ha scritto niente: né la prima né la seconda metà del gestore.
    assert.deepEqual(tracce, [])
    assert.equal(archivio.revisione, revisionePrima)
  })

  it('anche chi non dichiara collezioni esce in conflitto se il documento cambia, salvo chi non lo guarda', async () => {
    tracce = []
    bloccoCorrente = sospesa()
    const davanti = api.chiama(archivio, 'fila.attende', {})
    await respira()
    // Dietro, due scritture con `collezioni: []`: una sul file dell'anno, l'altra
    // no (lo zoom).
    const sulFile = api.chiama(archivio, 'fila.sulFile', {})
    const fuori = api.chiama(archivio, 'fila.fuoriDalDocumento', {})
    await respira()
    await archivio.creaAnno(
      api.creaAnno('2028-09-01', '2029-06-30'),
      Uri.file(percorso.join(dati, '2028-2029.regi')),
    )
    bloccoCorrente.sciogli()
    assert.equal((await davanti).ok, true)

    const esitoFile = await sulFile
    assert.equal(esitoFile.ok, false)
    assert.equal(esitoFile.codice, 'conflitto')
    assert.equal((await fuori).ok, true)
    assert.deepEqual(tracce, ['fuori'])
  })

  it('il turno che non arriva diventa un rifiuto leggibile, e la fila resta usabile', async () => {
    // Il tetto (trenta secondi, un `setTimeout` in `inFila`) si fa scattare con
    // `mock.timers`, senza manopole nel codice di produzione.
    tracce = []
    bloccoCorrente = sospesa()
    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      // Davanti: qualcosa che tiene a lungo (geocodifica, dialogo aperto).
      const davanti = api.chiama(archivio, 'fila.attende', {})
      await respira()

      const dietro = api.chiama(archivio, 'fila.dueTempi', { chi: '5', minuti: 50 })
      await respira()

      mock.timers.tick(30_000)
      const esito = await dietro
      assert.equal(esito.ok, false)
      assert.equal(esito.codice, 'non-disponibile')
      // Una frase che dice **perché**, non «non disponibile».
      assert.match(esito.messaggi[0], /aspettato il proprio turno/)
      assert.match(esito.messaggi[1], /dialogo di sistema/)
      // E non ha scritto niente, né dichiarato di averlo fatto.
      assert.deepEqual(tracce, [])
      assert.equal(esito.modifiche, 0)

      bloccoCorrente.sciogli()
      assert.equal((await davanti).ok, true)
    } finally {
      mock.timers.reset()
    }

    // Chi rinuncia non lascia la fila appesa: chi arriva dopo passa.
    tracce = []
    const dopo = await api.chiama(archivio, 'fila.dueTempi', { chi: '6', minuti: 60 })
    assert.equal(dopo.ok, true)
    assert.deepEqual(tracce, ['6a', '6b'])
  })
})
