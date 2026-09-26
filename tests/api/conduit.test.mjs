// Il condotto: la sola superficie esterna dell'applicazione, provata da fuori.
// Un server JSON-RPC su named pipe (o socket unix) a cui bussa qualunque
// processo della sessione. Qui si prova il **trasporto**, non le procedure:
//
//   1. **il framing**: una riga per messaggio, richieste di fila, righe troppo
//      lunghe;
//   2. **il parsing**: JSON rotto, busta non oggetto, `method` assente;
//   3. **l'`id`**: assente è notifica, `null` e `0` no, un `id` non ammesso si
//      rifiuta;
//   4. **il cancello**: lettura e scrittura concesse a parte e **rilette a ogni
//      chiamata**;
//   5. **i quattro metodi riservati**: `$versione` libero, gli altri sotto la
//      lettura;
//   6. **i limiti**: un parametro ripetuto per ogni attrezzo non gonfia la
//      risposta.
//
// `avviaCondotto` e compagnia arrivano da `dist-tests/api.mjs` (via
// `tests/helpers/api.ts`): un secondo bundle avrebbe un nucleo senza procedure,
// perché anno e deposito sono variabili di modulo.

import assert from 'node:assert/strict'
import { createConnection } from 'node:net'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-condotto-')

let api
let archivio
let condotto
let indirizzo

/**
 * Le impostazioni di partenza: condotto acceso, tutto concesso. Si scrivono
 * prima di importare il bundle perché `avviaCondotto` le legge all'accensione.
 */
const PARTENZA = {
  cartellaLavoro: lavoro,
  'registroDocenti.api.condotto': true,
  'registroDocenti.api.lettura': true,
  'registroDocenti.api.scrittura': true,
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    impostazioni: PARTENZA,
    registra: false,
  }))
  const { avviaCondotto, indirizzoCondotto } = api

  // La cartella temporanea entra nell'impronta del nome: nessuna prova bussa al
  // condotto vero del docente.
  condotto = await avviaCondotto(archivio, { cartellaUtente: process.env.REGISTRO_USERDATA })
  indirizzo = indirizzoCondotto()
})

after(async () => {
  condotto?.dispose()
  await condotto?.svuotato()
  smonta(radice, archivio)
})

// ------------------------------------------------------------- il cliente finto

/**
 * Apre una connessione, ci scrive del testo grezzo (anche righe che un client
 * corretto non manderebbe) e raccoglie le buste. Torna anche `chiusa`, perché
 * per alcuni guasti la chiusura fa parte della risposta giusta.
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
      // `finoAllaChiusura` aspetta che chiuda il condotto; altrimenti basta un giro
      // del ciclo degli eventi per vedere una busta di troppo.
      if (buste.length >= attese && !finoAllaChiusura) setTimeout(() => finisci(), 20)
    })
    // `end` è il FIN del condotto, `close` la presa che se ne va: si guardano
    // tutti e due per evitare la corsa.
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
    // JSON valido, busta no: un array è chi prova i parametri posizionali (§4.2).
    const busta = await chiedi([1, 2, 3])
    assert.equal(busta.error.code, -32600)
    assert.equal(busta.error.data.codice, 'ingresso-non-valido')
    assert.equal(busta.id, null)
  })

  it('su un JSON rotto risponde e poi chiude', async () => {
    // Dopo un JSON rotto la connessione è desincronizzata, e la busta va a
    // `id: null` che chi correla per id scarta: il condotto chiude.
    const { buste, chiusa } = await bussa('{questo non è json\n', { finoAllaChiusura: true })
    assert.equal(buste.length, 1)
    assert.equal(buste[0].error.code, -32700)
    assert.equal(chiusa, true, 'dopo un -32700 la connessione va chiusa')
  })

  it('dice che i parametri posizionali non si usano, e lo dice nominando params', async () => {
    // JSON-RPC §4.2 ammette `params` posizionali, il registro no: il messaggio
    // nomina `params`, invece di un «Serve un oggetto.» che manda a cercare
    // nell'ingresso della procedura.
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
    // Due buste in un `write` solo: il framing è la riga, e le risposte tornano in
    // ordine.
    const testo =
      `${JSON.stringify({ jsonrpc: '2.0', id: 'a', method: '$versione' })}\n` +
      `${JSON.stringify({ jsonrpc: '2.0', id: 'b', method: '$versione' })}\n`
    const { buste } = await bussa(testo, { attese: 2 })
    assert.deepEqual(buste.map((b) => b.id), ['a', 'b'])
  })

  it('una riga oltre il megabyte torna come guasto, non come EOF', async () => {
    // Un PDF da 800 KB in base64 per `smistamento.pdf.deposita` supera il limite
    // della riga: il condotto risponde con un errore prima di chiudere, o chi
    // chiama concluderebbe che il registro non risponde.
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
    // La notifica e subito dopo una richiesta: una busta di troppo si vedrebbe, e
    // la coda garantisce che la notifica sia già servita.
    const testo =
      `${JSON.stringify({ jsonrpc: '2.0', method: '$versione' })}\n` +
      `${JSON.stringify({ jsonrpc: '2.0', id: 'dopo', method: '$versione' })}\n`
    const { buste } = await bussa(testo)
    assert.equal(buste.length, 1, 'alla notifica non si risponde')
    assert.equal(buste[0].id, 'dopo')
  })

  it('«id: null» è una richiesta, e una risposta la vuole', async () => {
    // JSON-RPC §4: una notifica è una richiesta *priva* di `id`. `id: null` ha una
    // risposta, o chi scrive aspetterebbe per sempre.
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
    // Un `id` oggetto non torna tale e quale: nessuno lo potrebbe correlare.
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
    // `$schema` si costruisce con `descrivi`, come `$elenco`, e dice anche
    // `versione` (serve a sapere se si può ritentare).
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
    // `comando` finisce una volta per attrezzo, e gli attrezzi sono centinaia: un
    // valore enorme sotto `LIMITE_RIGA` diventerebbe una risposta di centinaia di
    // megabyte, abbastanza da far morire il processo dell'archivio.
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
      // Il rifiuto nomina l'impostazione da cambiare.
      assert.ok(busta.error.data.messaggi.some((m) => m.includes('registroDocenti.api.scrittura')))
    })
  })

  it('il rifiuto arriva prima della convalida, non dopo', async () => {
    // Senza permesso la chiamata non si convalida nemmeno: il messaggio non parla
    // dei campi mancanti.
    await con({ scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.crea', params: {} })
      assert.equal(busta.error.data.codice, 'non-permesso')
    })
  })

  it('«$elenco», «$schema» e «$attrezzi» vogliono la lettura', async () => {
    // «Scrittura sì, lettura no» è legittimo: allora i metodi che raccontano il
    // registro (procedure, schemi, catalogo dell'assistente) restano chiusi.
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
    // `$versione` è quel che `regi stato` stampa: resta libero, e i suoi campi sono
    // i meno sensibili.
    await con({ lettura: false, scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: '$versione' })
      assert.ok(busta.result, 'a $versione si risponde sempre')
      assert.equal(busta.result.permessi.lettura, false)
      assert.equal(busta.result.permessi.scrittura, false)
    })
  })

  it('un permesso revocato vale dalla chiamata dopo, non dal prossimo avvio', async () => {
    // I permessi si rileggono a ogni chiamata: un interruttore spento nelle
    // impostazioni vale subito, senza riavviare.
    const prima = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.elenco', params: {} })
    assert.ok(prima.result, 'con la lettura concessa deve passare')

    await con({ lettura: false }, async () => {
      const dopo = await chiedi({ jsonrpc: '2.0', id: 2, method: 'corsi.elenco', params: {} })
      assert.equal(dopo.error.data.codice, 'non-permesso')

      // E anche la diagnosi dice il permesso nuovo.
      const stato = await chiedi({ jsonrpc: '2.0', id: 3, method: '$versione' })
      assert.equal(stato.result.permessi.lettura, false)
    })

    const rimessa = await chiedi({ jsonrpc: '2.0', id: 4, method: 'corsi.elenco', params: {} })
    assert.ok(rimessa.result, 'riconcessa la lettura, si torna a passare')
  })

  it('una procedura sconosciuta dice che non esiste, non che manca il permesso', async () => {
    // Errori diversi darebbero l'elenco dei nomi validi a chi non ha permessi.
    await con({ lettura: false, scrittura: false }, async () => {
      const busta = await chiedi({ jsonrpc: '2.0', id: 1, method: 'corsi.inventati' })
      assert.equal(busta.error.data.codice, 'procedura-sconosciuta')
    })
  })
})
