// La sequenza di chiusura: che cosa si ferma, che cosa si aspetta, in che
// ordine. Oltre a condotto e archivio si aspettano la coda del pannello, quella
// dei PDF (`actions/reports.ts`) e quella dell'OCR: una pagina letta che arriva
// ad `archivio.modifica` dopo `lasciaPacchetto()` si perde in silenzio.
//
// `spegni()` vive in `src/startup.ts`, al confine con Electron: si legge il
// sorgente e si fissa l'ordine delle righe (come `writes.test.mjs` fa col
// pannello). L'ultima prova esercita davvero `Smistatore.fermaEAspetta()`.

import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const AVVIO = readFileSync(
  fileURLToPath(new URL('../../src/startup.ts', import.meta.url)),
  'utf8',
)

/**
 * Il corpo di una funzione, contando le graffe: `spegni` contiene blocchi e
 * stringhe con graffe.
 */
function corpoDi (sorgente, firma) {
  const inizio = sorgente.indexOf(firma)
  assert.ok(inizio >= 0, `«${firma}» non esiste più in startup.ts`)
  const apertura = sorgente.indexOf('{', inizio)
  let profondita = 0
  for (let i = apertura; i < sorgente.length; i += 1) {
    if (sorgente[i] === '{') profondita += 1
    else if (sorgente[i] === '}') {
      profondita -= 1
      if (profondita === 0) return sorgente.slice(apertura, i + 1)
    }
  }
  assert.fail(`«${firma}» non si chiude`)
}

const SPEGNI = corpoDi(AVVIO, 'export async function spegni ()')

/** Dove sta una riga dentro `spegni`, per confrontare gli ordini. */
function dove (frammento) {
  const posto = SPEGNI.indexOf(frammento)
  assert.ok(posto > 0, `«${frammento}» non compare più in spegni()`)
  return posto
}

const { radice, lavoro, dati } = cartelleDiProva('registro-api-spegnimento-')

let dataApi
let archivio

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  dataApi = await import('../../dist-tests/data.mjs')
  const { Archivio, Uri } = dataApi
  // Senza documento aperto apposta: la coda dell'OCR vuota è il caso comune, e
  // `fermaEAspetta` deve tornare lo stesso.
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
})

after(() => smonta(radice, archivio))

describe('l’ordine dello spegnimento', () => {
  it('le tre code che scrivono si fermano e si aspettano', () => {
    // Non basta il nome: ci vuole l'`await` davanti, o si lancia la chiusura e si
    // esce comunque.
    for (const riga of [
      'await PannelloRegistro.attendiScritture()',
      'await smistatore?.fermaEAspetta()',
      'await fermaRapporti()',
    ]) {
      assert.ok(SPEGNI.includes(riga), `spegni() non aspetta: manca «${riga}»`)
    }
  })

  it('l’archivio si consegna al disco dopo tutte le code, e non prima', () => {
    // Quel che scrive finisce prima che l'archivio lasci il pacchetto.
    const chiusura = dove('await archivio?.chiudi()')
    for (const coda of [
      'await PannelloRegistro.attendiScritture()',
      'await smistatore?.fermaEAspetta()',
      'await fermaRapporti()',
      'await chiudiCondotto()',
    ]) {
      assert.ok(dove(coda) < chiusura, `«${coda}» viene dopo la chiusura dell’archivio`)
    }
  })

  it('le porte si chiudono prima di aspettare quel che è già entrato', () => {
    // Il pannello si chiude prima di aspettarne la coda: niente richieste nuove
    // mentre si aspettano le vecchie. Come per il condotto.
    assert.ok(dove('PannelloRegistro.chiudi()') < dove('await PannelloRegistro.attendiScritture()'))
    assert.ok(dove('fermaLetture()') < dove('await smistatore?.fermaEAspetta()'))
  })

  it('le letture dell’OCR si fermano per prime', () => {
    // Le letture OCR girano in un programma a parte e possono durare minuti: si
    // fermano per prime, e una coda fermata smette davvero invece di finire quel
    // che le resta.
    const primo = dove('fermaLetture()')
    for (const dopo of ['vassoioAttivo?.dispose()', 'await chiudiCondotto()']) {
      assert.ok(primo < dove(dopo), `fermaLetture() non viene prima di «${dopo}»`)
    }
  })
})

describe('le iscrizioni, che nessuno svuotava', () => {
  it('`subscriptions` si svuota davvero, e in un posto solo', () => {
    // `subscriptions` si svuota davvero: con `app.exit(0)` nessun `dispose`
    // verrebbe chiamato.
    const svuotamenti = AVVIO.split('\n').filter((riga) => /subscriptions\.pop\s*\(/.test(riga))
    assert.equal(svuotamenti.length, 1, 'le iscrizioni si svuotano in più di un posto, o in nessuno')
    assert.ok(SPEGNI.includes('subscriptions.pop()'), 'non è `spegni` a svuotarle')
  })

  it('si svuotano per ultime, dopo la chiusura dell’archivio', () => {
    // Per ultime: dentro c'è l'archivio, il cui `dispose` fa un `chiudi()`
    // d'emergenza che dopo quello vero non trova niente da fare.
    assert.ok(dove('await archivio?.chiudi()') < dove('subscriptions.pop()'))
  })

  it('un `dispose` che solleva non ferma gli altri', () => {
    // Un ascoltatore che solleva non ferma lo svuotamento degli altri.
    const giro = SPEGNI.slice(dove('while (contesto && contesto.subscriptions.length > 0)'))
    assert.ok(/try\s*\{/.test(giro), 'lo svuotamento non protegge i `dispose` uno per uno')
  })
})

describe('la coda dell’OCR, esercitata davvero', () => {
  it('`fermaEAspetta` torna anche se non è mai partito niente', async () => {
    // Chiamata sempre, anche senza quarantena aperta: non deve aspettare qualcosa
    // che non c'è.
    const smistatore = dataApi.smistatoreDi(archivio)
    await smistatore.fermaEAspetta()
    // Due volte di fila: una chiusura di documento può averla già fermata.
    await smistatore.fermaEAspetta()
    assert.equal(smistatore.avanzamento.coda.length, 0)
    assert.equal(smistatore.avanzamento.corrente, null)
  })

  it('accodare dopo un arresto riparte con un segnale nuovo', async () => {
    // Dopo «Ferma» serve un `AbortController` nuovo, o la prima lettura dopo
    // morirebbe sul nascere.
    const smistatore = dataApi.smistatoreDi(archivio)
    await smistatore.fermaEAspetta()
    smistatore.accodaLettura([
      { smistamentoId: 'nessuno', pagina: 1, etichetta: 'una pagina che non esiste' },
    ])
    // Lo smistamento non esiste: `leggiPagina` torna subito; si guarda che il giro
    // sia **ripartito**.
    await smistatore.fermaEAspetta()
    assert.equal(smistatore.avanzamento.coda.length, 0)
  })
})
