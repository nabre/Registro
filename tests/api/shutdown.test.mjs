// La sequenza di chiusura: che cosa si ferma, che cosa si aspetta, e in che
// ordine.
//
// Lo spegnimento aspettava due cose — il condotto e l'archivio — e ne lasciava
// fuori tre che scrivono, tutte e tre più lente di quelle: la coda del
// pannello, la coda dei PDF di `actions/reports.ts`, la coda dell'OCR dello
// smistatore. L'ultima è la peggiore: una pagina letta arriva a
// `archivio.modifica` **minuti** dopo essere stata accodata, e se ci arriva
// dopo `lasciaPacchetto()` quei minuti di lettura spariscono in silenzio — non
// c'è nessun errore, nessuna riga, nessun file a metà. Semplicemente, domani
// quella pagina risulta non letta.
//
// **Come lo si prova, e perché così.** `spegni()` vive in `src/startup.ts`, che
// è il confine con Electron: chiamarla qui vorrebbe dire un finto `app`, un
// finto vassoio, un finto webview e un finto condotto — e a quel punto si
// proverebbe il finto. È la stessa scelta, e la stessa motivazione, di
// `tests/api/writes.test.mjs`, che legge da `src/panels/panel.ts` la
// guardia di `rispondiDomanda`: quel che conta qui è un **ordine** fra sei
// righe, e un ordine si legge dal sorgente meglio di quanto si simuli.
//
// Le righe che si pinzano sono quelle che, togliendole, non romperebbero niente
// di visibile: una `await` che diventa una chiamata secca, un `chiudi()` che
// risale di tre righe. Sono esattamente i modi in cui questa correzione si
// disfa per sbaglio.
//
// L'ultima prova invece è vera: `Smistatore.fermaEAspetta()` si esercita
// davvero, perché è l'unico pezzo della sequenza che non abbia bisogno di un
// guscio intorno.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const AVVIO = readFileSync(
  fileURLToPath(new URL('../../src/startup.ts', import.meta.url)),
  'utf8',
)

/**
 * Il corpo di una funzione, contando le graffe.
 *
 * Una regex sola non basta: `spegni` contiene blocchi, chiusure e stringhe con
 * dentro delle graffe. Si conta, come fa `tests/api/writes.test.mjs` con i
 * metodi del pannello.
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

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-spegnimento-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
  // Senza documento aperto, ed è di proposito: quel che si esercita qui è la
  // coda dell'OCR a vuoto, cioè il caso che lo spegnimento incontra quasi
  // sempre — nessuno ha aperto la quarantena, e `fermaEAspetta` deve tornare
  // lo stesso invece di lasciare «Esci» premuto per sempre.
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('l’ordine dello spegnimento', () => {
  it('le tre code che scrivono si fermano e si aspettano', () => {
    // Non basta che i nomi compaiano: devono comparire **con l'`await`
    // davanti**. Una `fermaRapporti()` senza `await` è esattamente il difetto
    // di prima con un nome nuovo — si lancia la chiusura e si esce comunque.
    for (const riga of [
      'await PannelloRegistro.attendiScritture()',
      'await smistatore?.fermaEAspetta()',
      'await fermaRapporti()',
    ]) {
      assert.ok(SPEGNI.includes(riga), `spegni() non aspetta: manca «${riga}»`)
    }
  })

  it('l’archivio si consegna al disco dopo tutte le code, e non prima', () => {
    // È l'invariante vera: quel che scrive deve aver finito di scrivere prima
    // che l'archivio lasci il pacchetto. Fin qui la pagina letta dall'OCR
    // arrivava dopo, e spariva.
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
    // Chiudere il pannello dopo aver aspettato la sua coda vorrebbe dire
    // lasciar partire una richiesta in più proprio mentre si aspettano quelle
    // di prima. Stessa regola del condotto, che questa funzione applicava già.
    assert.ok(dove('PannelloRegistro.chiudi()') < dove('await PannelloRegistro.attendiScritture()'))
    assert.ok(dove('fermaLetture()') < dove('await smistatore?.fermaEAspetta()'))
    assert.ok(dove('chiudiAgenda()') < dove('await chiudiCondotto()'))
  })

  it('le letture dell’OCR si fermano per prime', () => {
    // Girano in un programma a parte, e una pagina può tenerlo occupato fino a
    // tre minuti: sono la cosa più lunga che lo spegnimento possa incontrare, e
    // chi sta uscendo non la aspetta. Non è una questione di processi orfani —
    // un figlio lanciato con `execFile` muore un secondo e mezzo dopo il padre,
    // perché su Windows libuv li mette già in un job object — è che una coda
    // fermata deve smettere davvero invece di macinare quel che le è rimasto.
    const primo = dove('fermaLetture()')
    for (const dopo of ['vassoioAttivo?.dispose()', 'chiudiAgenda()', 'await chiudiCondotto()']) {
      assert.ok(primo < dove(dopo), `fermaLetture() non viene prima di «${dopo}»`)
    }
  })
})

describe('le iscrizioni, che nessuno svuotava', () => {
  it('`subscriptions` si svuota davvero, e in un posto solo', () => {
    // Il commento lo dichiarava da sempre — «`subscriptions` viene svuotato
    // allo spegnimento» — e non lo svuotava nessuno: li uccideva `app.exit(0)`,
    // cioè il sistema operativo. Ogni `dispose` scritto là dentro non veniva
    // mai chiamato, e i commenti che ci contavano raccontavano una cosa falsa.
    const svuotamenti = AVVIO.split('\n').filter((riga) => /subscriptions\.pop\s*\(/.test(riga))
    assert.equal(svuotamenti.length, 1, 'le iscrizioni si svuotano in più di un posto, o in nessuno')
    assert.ok(SPEGNI.includes('subscriptions.pop()'), 'non è `spegni` a svuotarle')
  })

  it('si svuotano per ultime, dopo la chiusura dell’archivio', () => {
    // Per ultime e non per prime: là dentro c'è l'archivio, e il suo `dispose`
    // lancia un `chiudi()` d'emergenza che non aspetta nessuno. Arrivandoci
    // dopo quello vero non trova più niente da fare, che è quel che si vuole.
    assert.ok(dove('await archivio?.chiudi()') < dove('subscriptions.pop()'))
  })

  it('un `dispose` che solleva non ferma gli altri', () => {
    // È l'ultima cosa che il registro fa: farla a metà — un ascoltatore che
    // resta registrato perché quello prima ha sollevato — sarebbe peggio che
    // non farla.
    const giro = SPEGNI.slice(dove('while (contesto && contesto.subscriptions.length > 0)'))
    assert.ok(/try\s*\{/.test(giro), 'lo svuotamento non protegge i `dispose` uno per uno')
  })
})

describe('la coda dell’OCR, esercitata davvero', () => {
  it('`fermaEAspetta` torna anche se non è mai partito niente', async () => {
    // Lo spegnimento la chiama sempre, anche su un registro in cui nessuno ha
    // mai aperto la quarantena: se aspettasse qualcosa che non c'è, «Esci»
    // resterebbe premuto per sempre.
    const smistatore = dataApi.smistatoreDi(archivio)
    await smistatore.fermaEAspetta()
    // Due volte di fila, perché lo spegnimento può arrivare dopo una chiusura
    // di documento che l'ha già fermata.
    await smistatore.fermaEAspetta()
    assert.equal(smistatore.avanzamento.coda.length, 0)
    assert.equal(smistatore.avanzamento.corrente, null)
  })

  it('accodare dopo un arresto riparte con un segnale nuovo', async () => {
    // Un segnale già tirato non si rilassa: senza un `AbortController` nuovo,
    // la prima lettura dopo un «Ferma» morirebbe sul nascere, e la coda
    // resterebbe piena e immobile fino al riavvio.
    const smistatore = dataApi.smistatoreDi(archivio)
    await smistatore.fermaEAspetta()
    smistatore.accodaLettura([
      { smistamentoId: 'nessuno', pagina: 1, etichetta: 'una pagina che non esiste' },
    ])
    // Lo smistamento non esiste: `leggiPagina` torna subito senza toccare l'OCR
    // — quel che si guarda è che il giro sia **ripartito**, non che legga.
    await smistatore.fermaEAspetta()
    assert.equal(smistatore.avanzamento.coda.length, 0)
  })
})
