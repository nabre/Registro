// Il condotto: la sola superficie esterna dell'applicazione, provata da fuori.
//
// Tutto il resto del registro lo si raggiunge attraverso una finestra. Questo
// no: è un server JSON-RPC su una named pipe (o un socket unix) a cui può
// bussare qualunque processo della sessione utente, ed è l'unico punto in cui
// una riga di testo scritta da qualcun altro diventa una chiamata al nucleo.
// Per molto tempo è stato anche l'unico pezzo dell'API senza prove — mentre
// `tests/api/assistant.test.mjs` lo citava come esistente.
//
// Qui non si prova che le procedure facciano il loro mestiere: per quello ci
// sono le altre prove di questa cartella. Si prova il **trasporto**, cioè le
// sei cose che stanno fra la riga e la procedura e che nessun'altra prova
// guarda:
//
//   1. **il framing** — una riga per messaggio, due richieste di fila sulla
//      stessa connessione, una riga troppo lunga;
//   2. **il parsing** — JSON rotto, busta che non è un oggetto, `method` che
//      non c'è;
//   3. **l'`id`** — assente vuol dire notifica, `null` e `0` non lo vogliono
//      dire, e un `id` che JSON-RPC non ammette si rifiuta;
//   4. **il cancello** — la lettura e la scrittura concesse separatamente, e
//      **rilette a ogni chiamata**: un permesso revocato deve valere subito;
//   5. **i quattro metodi riservati** — `$versione` libero perché serve a
//      diagnosticare, gli altri tre sotto la lettura perché raccontare il
//      registro è leggerlo;
//   6. **i limiti** — un parametro che si moltiplica per ogni attrezzo non
//      deve poter gonfiare la risposta.
//
// ------------------------------------------------- perché passa dagli aiuti
//
// `tests/helpers/api.ts` riesporta `avviaCondotto`, `condottoDaAprire` e
// `indirizzoCondotto` accanto a `permessoMancante`, e `dist-tests/api.mjs` le
// porta qui. Non si bundla niente di proprio, ed è la sola strada possibile:
// l'anno in uso e il deposito aperto sono variabili di modulo, quindi un
// secondo bundle sarebbe un secondo grafo, cioè un registro che non conosce le
// procedure registrate nel primo. La prova parlerebbe con un nucleo vuoto.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-condotto-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')


let api
let archivio
let condotto
let indirizzo

/**
 * Le impostazioni di partenza: condotto acceso, tutto concesso.
 *
 * Si scrivono su disco prima di importare il bundle perché `avviaCondotto` le
 * legge all'accensione per sapere se aprire; da lì in poi le singole prove le
 * cambiano con `update`, che è la stessa via che passa dalla pagina delle
 * impostazioni.
 */
const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.condotto': true,
  'registroDocenti.api.lettura': true,
  'registroDocenti.api.scrittura': true,
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify(PARTENZA),
  )

  api = await import('../../dist-tests/api.mjs')
  const { Archivio, Uri, avviaCondotto, creaAnno, indirizzoCondotto } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )

  // La cartella temporanea entra nell'impronta del nome: due prove che girassero
  // insieme non si incrocerebbero, e nessuna bussa al condotto vero del docente
  // che sta eseguendo `npm test`.
  condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

// ------------------------------------------------------------- il cliente finto

/**
 * Apre una connessione, ci scrive dentro del testo grezzo e raccoglie le buste.
 *
 * Testo grezzo e non oggetti: metà di quel che c'è da provare qui è come il
 * condotto reagisce a righe che un client scritto bene non manderebbe mai — un
 * JSON a metà, una riga da un megabyte e mezzo, due richieste appiccicate.
 *
 * Torna anche `chiusa`, cioè se è stato il condotto a chiudere: per alcuni
 * guasti la chiusura *fa parte della risposta giusta*, e senza guardarla non si
 * distinguerebbe «ha risposto e ha chiuso» da «ha risposto e resta appeso».
 */
function bussa (testo, { attese = 1, attesaMs = 10000, finoAllaChiusura = false } = {}) {
  return new Promise((risolvi, rifiuta) => {
    const buste = []
    let chiusa = false
    let finita = false
    let resto = ''

    const presa = createConnection(indirizzo)
    const sveglia = setTimeout(() => {
      finisci(new Error(
        `il condotto non ha risposto entro ${attesaMs} ms: ${buste.length} buste su ${attese}`,
      ))
    }, attesaMs)

    function finisci (male) {
      if (finita) return
      finita = true
      clearTimeout(sveglia)
      presa.destroy()
      if (male) rifiuta(male)
      else risolvi({ buste, chiusa })
    }

    presa.on('connect', () => presa.write(testo))
    presa.on('data', (pezzo) => {
      resto += pezzo.toString('utf8')
      let taglio = resto.indexOf('\n')
      while (taglio >= 0) {
        const riga = resto.slice(0, taglio)
        resto = resto.slice(taglio + 1)
        if (riga.trim() !== '') buste.push(JSON.parse(riga))
        taglio = resto.indexOf('\n')
      }
      // `finoAllaChiusura` aspetta che sia il condotto a chiudere: per certi
      // guasti la chiusura *fa parte* della risposta giusta, e chiudendo noi
      // per primi non si distinguerebbe «ha risposto e ha chiuso» da «ha
      // risposto e resta appeso». Negli altri casi basta un giro del ciclo
      // degli eventi, che è quanto serve a vedere arrivare una busta di troppo.
      if (buste.length >= attese && !finoAllaChiusura) setTimeout(() => finisci(), 20)
    })
    // `end` è il FIN che manda il condotto; `close` è la presa che se ne va.
    // Guardarli tutti e due toglie di mezzo la corsa fra i due eventi.
    presa.on('end', () => { chiusa = true })
    presa.on('close', () => {
      chiusa = true
      finisci()
    })
    presa.on('error', (male) => finisci(male))
  })
}

/** Una richiesta sola, e la busta che torna. */
async function chiedi (richiesta, opzioni) {
  const { buste } = await bussa(`${JSON.stringify(richiesta)}\n`, opzioni)
  assert.equal(buste.length, 1, `una busta sola, non ${buste.length}`)
  return buste[0]
}

/** Accende o spegne un'impostazione del condotto, come farebbe la pagina. */
async function concedi (voce, valore) {
  await api.impostazioni.leggi('registroDocenti.api').update(voce, valore)
}

/** Esegue qualcosa con dei permessi diversi, e li rimette com'erano. */
async function con (permessi, fare) {
  for (const [voce, valore] of Object.entries(permessi)) await concedi(voce, valore)
  try {
    return await fare()
  } finally {
    await concedi('lettura', true)
    await concedi('scrittura', true)
  }
}

// ------------------------------------------------------------------- le buste

describe('la busta che arriva', () => {
  it('rifiuta quel che non è un oggetto JSON-RPC', async () => {
    // JSON valido, busta no. Il messaggio deve dirlo: un array è la forma che
    // manda chi ha letto §4.2 e ha provato i parametri posizionali.
    const busta = await chiedi([1, 2, 3])
    assert.equal(busta.error.code, -32600)
    assert.equal(busta.error.data.codice, 'ingresso-non-valido')
    assert.equal(busta.id, null)
  })

  it('su un JSON rotto risponde e poi chiude', async () => {
    // La chiusura è metà della risposta. Dopo un JSON rotto non si sa dove
    // finisse quella riga, quindi non si sa nemmeno se la prossima è una
    // richiesta o la sua coda: la connessione è desincronizzata. E la busta va
    // a `id: null`, che chi correla per id — la riga di comando lo fa — scarta:
    // restando aperta, quella connessione non sveglierebbe più nessuno.
    const { buste, chiusa } = await bussa('{questo non è json\n', { finoAllaChiusura: true })
    assert.equal(buste.length, 1)
    assert.equal(buste[0].error.code, -32700)
    assert.equal(chiusa, true, 'dopo un -32700 la connessione va chiusa')
  })

  it('dice che i parametri posizionali non si usano, e lo dice nominando params', async () => {
    // JSON-RPC 2.0 §4.2 li ammette; il registro no, perché le sue procedure non
    // hanno un ordine dei campi. Finendo dentro `oggetto()`, l'array si
    // prendeva un «Serve un oggetto.» che non nomina `params`: chi lo legge va
    // a cercare l'oggetto mancante dentro l'ingresso della procedura, dove non è.
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.elenco', params: [1, 2] })
    assert.equal(busta.error.code, -32602)
    assert.equal(busta.error.data.campo, 'params')
    assert.match(busta.error.message, /params/)
  })

  it('senza «method» si lamenta del method', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1 })
    assert.equal(busta.error.code, -32600)
    assert.equal(busta.error.data.campo, 'method')
  })

  it('regge due richieste sulla stessa riga di dati, nell’ordine', async () => {
    // Due buste appiccicate in un `write` solo: il framing è la riga, non il
    // pacchetto, e chi manda una pipeline si aspetta le risposte in ordine.
    const testo =
      `${JSON.stringify({ jsonrpc: '2.0', id: 'a', method: '$versione' })}\n` +
      `${JSON.stringify({ jsonrpc: '2.0', id: 'b', method: '$versione' })}\n`
    const { buste } = await bussa(testo, { attese: 2 })
    assert.deepEqual(buste.map((b) => b.id), ['a', 'b'])
  })

  it('una riga oltre il megabyte torna come guasto, non come EOF', async () => {
    // Lo scenario vero: un PDF da 800 KB passato in base64 a
    // `smistamento.pdf.deposita` — che le docs raccomandano proprio come la via
    // da script — diventa poco più di un megabyte e supera il limite. Prima si
    // chiudeva e basta: la riga di comando, su `close`, risolve tutte le attese
    // con `null`, e lo script concludeva che il registro non risponde.
    const gonfio = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'corsi.elenco',
      params: { nota: 'x'.repeat(1024 * 1024 + 64) },
    })
    const { buste } = await bussa(`${gonfio}\n`)
    assert.equal(buste.length, 1, 'la busta deve uscire prima della chiusura')
    assert.equal(buste[0].error.code, -32600)
    assert.match(buste[0].error.message, /1 MiB/)
  })
})

// ---------------------------------------------------------------------- l'id

describe('l’id, che decide se si risponde', () => {
  it('senza «id» è una notifica e non risponde nessuno', async () => {
    // Si manda la notifica e subito dopo una richiesta vera: se tornasse una
    // busta di troppo la si vedrebbe qui, e l'ordine della coda garantisce che
    // la notifica sia già stata servita quando arriva la risposta alla seconda.
    const testo =
      `${JSON.stringify({ jsonrpc: '2.0', method: '$versione' })}\n` +
      `${JSON.stringify({ jsonrpc: '2.0', id: 'dopo', method: '$versione' })}\n`
    const { buste } = await bussa(testo)
    assert.equal(buste.length, 1, 'alla notifica non si risponde')
    assert.equal(buste[0].id, 'dopo')
  })

  it('«id: null» è una richiesta, e una risposta la vuole', async () => {
    // JSON-RPC 2.0 §4: una notifica è una richiesta *priva* del membro `id`.
    // Qui `id: null` è stato a lungo trattato come notifica, e per una
    // scrittura voleva dire questo: il registro segnava l'assenza e non
    // rispondeva, chi aveva chiamato aspettava per sempre — un tetto di tempo
    // non c'è da nessuna delle due parti — e interrompeva con Ctrl-C convinto
    // che non fosse successo niente. L'assenza intanto era segnata.
    const busta = await chiedi({ jsonrpc: '2.0', id: null, method: '$versione' })
    assert.equal(busta.id, null)
    assert.ok(busta.result, 'a «id: null» si deve una risposta')
  })

  it('«id: 0» è valido anche se è falso', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 0, method: '$versione' })
    assert.equal(busta.id, 0)
    assert.ok(busta.result)
  })

  it('un «id» che non è stringa, numero o null si rifiuta', async () => {
    // Tornava indietro verbatim: chi correla le risposte per id si trova a
    // confrontare due oggetti diversi che si assomigliano, e nessuna attesa si
    // risolve mai.
    const busta = await chiedi({ jsonrpc: '2.0', id: { a: 1 }, method: '$versione' })
    assert.equal(busta.error.code, -32600)
    assert.equal(busta.error.data.campo, 'id')
  })
})

// ------------------------------------------------------------------ i nomi

describe('il nome del metodo', () => {
  it('un nome che non esiste torna «procedura-sconosciuta»', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.inventati' })
    assert.equal(busta.error.code, -32601)
    assert.equal(busta.error.data.codice, 'procedura-sconosciuta')
  })

  it('i nomi sono quelli che sono: le maiuscole non passano', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'Corsi.Elenco' })
    assert.equal(busta.error.data.codice, 'procedura-sconosciuta')
  })

  it('un metodo riservato che non esiste dice che non lo conosce il condotto', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: '$inventato' })
    assert.equal(busta.error.code, -32601)
    assert.match(busta.error.message, /condotto/)
  })
})

// -------------------------------------------------------- i metodi riservati

describe('i quattro metodi riservati', () => {
  it('«$versione» dice l’anno aperto e i permessi di adesso', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: '$versione' })
    assert.equal(busta.result.permessi.lettura, true)
    assert.equal(busta.result.permessi.scrittura, true)
    assert.ok(busta.result.api, 'la versione dell’API serve a sapere se si può ritentare')
  })

  it('«$schema» porta la versione della procedura, non solo il nome', async () => {
    // Il ritratto se lo costruisce con `descrivi`, la stessa che serve
    // `$elenco`: le due si erano separate, e `$schema` aveva smesso di dire
    // `versione` — che `contract.ts` chiama l'unica cosa che permette a chi
    // chiama da fuori di sapere se può ritentare. Chiederla al metodo che serve
    // proprio a preparare una chiamata, e non trovarla, è il modo più diretto
    // di perderla.
    const busta = await chiedi({
      jsonrpc: '2.0', id: 1, method: '$schema', params: { procedura: 'corsi.elenco' },
    })
    assert.equal(busta.result.nome, 'corsi.elenco')
    assert.equal(typeof busta.result.versione, 'number')
    assert.equal(busta.result.genere, 'lettura')
    assert.ok(busta.result.ingresso, 'lo schema d’ingresso è il motivo per cui si chiama $schema')
    assert.ok(busta.result.uscita)
  })

  it('«$attrezzi» non accetta un comando che non è un nome di comando', async () => {
    // Il conto che fa paura: `comando` finisce una volta nel campo omonimo, una
    // decina di volte nelle istruzioni e **una volta per ogni attrezzo**, e gli
    // attrezzi sono centinaia. Novecentomila caratteri stanno comodi sotto
    // `LIMITE_RIGA` — la diga dell'ingresso non li vede nemmeno passare — e
    // diventavano centosessanta megabyte di risposta, altrettanti di
    // `JSON.stringify` e una `write` sola. Dieci connessioni così bastavano a
    // far morire per esaurimento di memoria il processo che tiene l'archivio.
    const busta = await chiedi({
      jsonrpc: '2.0', id: 1, method: '$attrezzi', params: { comando: 'x'.repeat(900000) },
    })
    assert.equal(busta.error.code, -32602)
    assert.equal(busta.error.data.codice, 'ingresso-non-valido')
    assert.ok(
      JSON.stringify(busta).length < 4096,
      'il rifiuto deve essere corto: è il contrario dell’amplificazione',
    )
  })

  it('«$attrezzi» rifiuta anche un comando con dentro quel che un comando non ha', async () => {
    const busta = await chiedi({
      jsonrpc: '2.0', id: 1, method: '$attrezzi', params: { comando: 'registro; rm -rf /' },
    })
    assert.equal(busta.error.code, -32602)
  })

  it('«$attrezzi» con un comando buono risponde il catalogo', async () => {
    const busta = await chiedi({
      jsonrpc: '2.0', id: 1, method: '$attrezzi', params: { comando: 'registro' },
    })
    assert.ok(busta.result, busta.error && busta.error.message)
    assert.ok(busta.result.assistente, 'il catalogo porta anche come è collegato l’assistente')
  })

  it('«$elenco» descrive le procedure vere', async () => {
    const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: '$elenco' })
    assert.ok(Array.isArray(busta.result))
    assert.ok(busta.result.some((p) => p.nome === 'corsi.elenco'))
  })
})

// ---------------------------------------------------------------- il cancello

describe('il cancello dei permessi', () => {
  it('una scrittura con la scrittura negata torna «non-permesso»', async () => {
    await con({ scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.crea', params: {} })
      assert.equal(busta.error.data.codice, 'non-permesso')
      // Il rifiuto deve dire come si toglie di mezzo: chi lo legge va a cercare
      // nelle impostazioni la parola che ci ha trovato dentro.
      assert.ok(busta.error.data.messaggi.some((m) => m.includes('registroDocenti.api.scrittura')))
    })
  })

  it('il rifiuto arriva prima della convalida, non dopo', async () => {
    // Una chiamata che non si può fare non deve nemmeno essere composta: se il
    // messaggio parlasse dei campi mancanti, vorrebbe dire che l'ingresso è
    // stato convalidato — e che il giornale ha una riga per una chiamata mai
    // eseguita.
    await con({ scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.crea', params: {} })
      assert.equal(busta.error.data.codice, 'non-permesso')
    })
  })

  it('«$elenco», «$schema» e «$attrezzi» vogliono la lettura', async () => {
    // La configurazione legittima che li regalava: «scrittura sì, lettura no»,
    // cioè «gli script mandino quel che gli dico, non estraggano dati». Bastava
    // che il condotto fosse aperto — e la sola scrittura basta ad aprirlo — per
    // avere i nomi di tutte le procedure con genere e collezioni, i loro due
    // JSON Schema, e il catalogo degli attrezzi con dentro motore, modello e
    // attesa dell'assistente.
    await con({ lettura: false }, async () => {
      for (const metodo of ['$elenco', '$attrezzi']) {
        const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: metodo })
        assert.equal(busta.error.data.codice, 'non-permesso', `«${metodo}» non deve passare`)
      }
      const schema = await chiedi({
        jsonrpc: '2.0', id: 1, method: '$schema', params: { procedura: 'corsi.elenco' },
      })
      assert.equal(schema.error.data.codice, 'non-permesso')
    })
  })

  it('«$versione» risponde anche senza permessi, perché serve a capire il perché', async () => {
    // È quel che `registro stato` stampa: se per leggere la diagnosi servisse
    // il permesso che manca, la diagnosi non servirebbe a niente. I suoi campi
    // sono anche i meno sensibili — il nome dell'anno, non dove sta.
    await con({ lettura: false, scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: '$versione' })
      assert.ok(busta.result, 'a $versione si risponde sempre')
      assert.equal(busta.result.permessi.lettura, false)
      assert.equal(busta.result.permessi.scrittura, false)
    })
  })

  it('un permesso revocato vale dalla chiamata dopo, non dal prossimo avvio', async () => {
    // È il difetto che questa prova esiste per tenere chiuso. I permessi si
    // leggevano una volta sola all'accensione, con un commento che rimandava a
    // un `osservaCondotto` che non è mai esistito: un docente che spegneva
    // l'interruttore lo vedeva spento nelle impostazioni, e il condotto
    // continuava a concedere a ogni processo della sessione fino al riavvio
    // dell'applicazione. `registro stato`, che è il posto dove si va a
    // guardare, confermava il permesso vecchio.
    const prima = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.elenco', params: {} })
    assert.ok(prima.result, 'con la lettura concessa deve passare')

    await con({ lettura: false }, async () => {
      const dopo = await chiedi({ jsonrpc: '2.0', id: 2, method: 'corsi.elenco', params: {} })
      assert.equal(dopo.error.data.codice, 'non-permesso')

      // E anche la diagnosi deve dire la verità nuova, non quella di prima.
      const stato = await chiedi({ jsonrpc: '2.0', id: 3, method: '$versione' })
      assert.equal(stato.result.permessi.lettura, false)
    })

    const rimessa = await chiedi({ jsonrpc: '2.0', id: 4, method: 'corsi.elenco', params: {} })
    assert.ok(rimessa.result, 'riconcessa la lettura, si torna a passare')
  })

  it('una procedura sconosciuta dice che non esiste, non che manca il permesso', async () => {
    // Un elenco dei nomi validi ottenuto a forza di errori diversi sarebbe
    // l'unica cosa che quel controllo regalerebbe.
    await con({ lettura: false, scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.inventati' })
      assert.equal(busta.error.data.codice, 'procedura-sconosciuta')
    })
  })
})
