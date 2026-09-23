// La fila delle scritture, dentro `chiama()`.
//
// È il reperto d'architettura che il cantiere chiede da due giri (C3, «La coda
// è per trasporto, non per archivio»). Fino a qui le code erano sei e non si
// parlavano — il pannello, una per connessione del condotto, il disco, i PDF,
// i depositi, l'OCR — e i punti che chiamano `chiama()` erano cinque, di cui
// uno, il widget dell'agenda, senza nessuna coda. La promessa scritta in testa
// al condotto — «due scritture avviate insieme sullo stesso archivio si
// coprirebbero a vicenda» — valeva solo dentro una connessione.
//
// **La prova che conta è la prima**, ed è una regressione: due scritture
// avviate nello stesso tick su un gestore che aspetta in mezzo devono osservare
// `1→1→2→2` e non `1→2→1→2`. Senza la fila quella prova è rossa, e lo è sempre
// stata: è esattamente il modo in cui «l'ultima `modifica()` vince in
// silenzio» — un dialogo di sistema aperto dentro `smistamento` (32 `await`),
// una spedizione dentro `consegne` (10), e l'altra scrittura che passa in
// mezzo.
//
// Le altre cinque difendono le tre cose che una fila ingenua sbaglia: le
// letture che devono continuare a saltare la corsia, il turno che può non
// arrivare mai, il documento che cambia mentre si aspetta, e l'errore che non
// deve avvelenare la fila.
//
// Serve un archivio vero su una cartella temporanea, come in
// `tests/api/core.test.mjs`: quel che si misura qui è l'ordine delle
// scritture, e un archivio finto non saprebbe contarle.

import assert from 'node:assert/strict'
import {
  mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it, mock } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-coda-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  const { Archivio, creaAnno, definisci, registra, SCRITTURA, schemi } = api
  Uri = api.Uri

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )

  /** Il gestore che aspetta in mezzo: due scritture, e fra loro un `await`. */
  const scriveInDueTempi = async (ambito, ingresso) => {
    ambito.contesto.modifica((r) => {
      tracce.push(`${ingresso.chi}a`)
      r.impostazioni.durataPausaPredefinita = ingresso.minuti
    }, ['registro'])
    // È il dialogo di sistema, il giro di posta, la lettura di un PDF: il punto
    // in cui un gestore lascia il controllo con il registro a metà.
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
        // Il rientro che può succedere davvero: una scrittura che ha bisogno di
        // un conto già fatto. Passa da `chiama()` e **non** si mette in fila,
        // perché è una lettura — se si mettesse, aspetterebbe il proprio
        // chiamante, cioè per sempre.
        const dentro = await api.chiama(ambito.contesto.archivio, 'fila.legge', {})
        assert.equal(dentro.ok, true)
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = 11
        }, ['registro'])
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

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('l’ordine delle scritture', () => {
  it('due scritture avviate insieme non si intrecciano: 1→1→2→2', async () => {
    // **La regressione.** Senza la fila dentro `chiama()` l'ordine osservato è
    // `1a 2a 1b 2b`: la prima lascia il controllo sul suo `await`, la seconda
    // entra, e quel che la prima scrive dopo va sopra quel che la seconda ha
    // appena scritto — o viceversa, a seconda di chi arriva ultimo. È il caso
    // che il commento del condotto dichiarava impossibile e che era possibile
    // fra due trasporti diversi: il pannello e il widget dell'agenda.
    tracce = []
    const prima = api.chiama(archivio, 'fila.dueTempi', { chi: '1', minuti: 10 })
    const seconda = api.chiama(archivio, 'fila.dueTempi', { chi: '2', minuti: 20 })
    const esiti = await Promise.all([prima, seconda])

    assert.deepEqual(esiti.map((e) => e.ok), [true, true])
    assert.deepEqual(tracce, ['1a', '1b', '2a', '2b'])
  })

  it('una lettura non aspetta la scrittura lenta che ha davanti', async () => {
    // L'altra metà della regola, e la ragione per cui la fila è **solo** sulle
    // scritture: una lettura è sincrona sul registro in memoria, e metterla in
    // fila dietro venti PDF vorrebbe dire una pagina ferma per niente.
    tracce = []
    bloccoCorrente = sospesa()
    const scrittura = api.chiama(archivio, 'fila.attende', {})
    await respira()

    const lettura = await api.chiama(archivio, 'fila.legge', {})
    assert.equal(lettura.ok, true)
    // La lettura è passata mentre la scrittura è ancora dentro il suo `await`.
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

    // Se l'errore avvelenasse la fila, questa non arriverebbe mai: `then` su una
    // promessa già rifiutata non esegue più niente, e la fila smetterebbe di
    // avanzare **in silenzio**, restando viva. È la stessa forma che
    // `Archivio.inFila` e la coda del condotto hanno già.
    const secondaBusta = await bene
    assert.equal(secondaBusta.ok, true)
    assert.deepEqual(tracce, ['esplosa', '3a', '3b'])
  })
})

describe('il rientro, che è il presupposto della fila', () => {
  it('nessun gestore chiama il nucleo: verificato sul sorgente', () => {
    // È il presupposto su cui poggia tutto: una fila sola non può stallare
    // *perché* nessun gestore vi rientra. Si verifica leggendo il sorgente e
    // non fidandosi di una lettura fatta una volta — il giorno in cui qualcuno
    // scrivesse `await chiama(...)` dentro un gestore, la fila si fermerebbe
    // per trenta secondi e poi risponderebbe «il registro era occupato», che è
    // il modo peggiore di scoprirlo.
    //
    // La sola eccezione ammessa è una **lettura**, che la corsia la salta: è
    // quel che prova `fila.chiamaUnaLettura` qui sotto. Ma una lettura non si
    // distingue dal sorgente, e allora qui si vieta tutto e là si mostra che la
    // strada buona esiste.
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
        // `chiama(` preceduto da qualcosa che non sia una lettera: `daGestore`,
        // `richiamare` e i commenti che la nominano fra apici non contano.
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

    // Dietro, una scrittura che parla delle collezioni del documento aperto.
    const dietro = api.chiama(archivio, 'fila.dueTempi', { chi: '4', minuti: 40 })
    await respira()

    // E nel frattempo il documento cambia: «Apri un anno recente», un doppio
    // clic su un altro `.registro`, OneDrive che sincronizza. `leggiTutto` non
    // aggiorna l'oggetto `Registro`: lo **sostituisce**.
    await archivio.creaAnno(
      api.creaAnno('2027-09-01', '2028-06-30'),
      Uri.file(percorso.join(dati, '2027-2028.registro')),
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

  it('il turno che non arriva diventa un rifiuto leggibile, e la fila resta usabile', async () => {
    // Trenta secondi non si aspettano in una prova, e non si aspettano nemmeno
    // nella vita: si fa scattare il tetto invece di viverlo. Il tetto è un
    // `setTimeout` dentro `inFila`, e `mock.timers` è il modo di arrivarci
    // senza mettere una manopola nel codice di produzione solo per le prove.
    tracce = []
    bloccoCorrente = sospesa()
    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      // Davanti: la geocodifica che tiene dieci minuti, il dialogo di sistema
      // che resta aperto finché non gli si risponde.
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

    // La fila non si è rotta: chi arriva dopo passa come sempre. Una rinuncia
    // che lasciasse la fila appesa al proprio turno mai preso sarebbe un
    // registro che da lì in poi non scrive più.
    tracce = []
    const dopo = await api.chiama(archivio, 'fila.dueTempi', { chi: '6', minuti: 60 })
    assert.equal(dopo.ok, true)
    assert.deepEqual(tracce, ['6a', '6b'])
  })
})
