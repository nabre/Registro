#!/usr/bin/env node
// La riga di comando del registro.
//
// È un cliente del condotto e nient'altro: non conosce le lezioni, non conosce
// i voti, non ha una copia dell'elenco delle procedure. Tutto quel che sa lo
// chiede — `$elenco` per l'indice, `$schema` per la forma di un ingresso — e
// per questo non invecchia: una procedura aggiunta stamattina si chiama da qui
// stasera senza che questo file cambi di una riga.
//
// Non si compila e non ha dipendenze, solo moduli `node:`. È una scelta e non
// una pigrizia: uno strumento che serve a capire perché il registro non fa quel
// che dovrebbe non può avere bisogno che la costruzione sia andata bene.
//
//   node src/cli/registro.mjs elenco
//   node src/cli/registro.mjs schema ore.appello.casella
//   node src/cli/registro.mjs chiama corso.presenze --corsoId cor-...
//
// Gli errori vanno su stderr e i dati su stdout, sempre: è quel che permette
// `registro chiama ... --json | jq` senza dover ripulire niente.

import { createHash } from 'node:crypto'
import net from 'node:net'
import { homedir, tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Il nome dell'applicazione come lo scrive Electron nel percorso di `userData`.
 * Deve restare uguale al `productName` di `package.json` e alla costante gemella
 * di `src/api/transports/conduit.ts`: è di lì che esce l'indirizzo del condotto.
 */
const NOME_APPLICAZIONE = 'Registro docenti'

/**
 * Come si chiama questo comando, per chi ne legge l'aiuto.
 *
 * Lo dichiara il ponte scritto da `shell/system/commandLine.ts` — `regdoc` — perché
 * altrimenti l'aiuto insegnerebbe a scrivere una parola che sulla macchina di
 * chi legge non è un comando. Chi arriva qui in un altro modo non dichiara
 * niente e si tiene il nome storico.
 */
const COMANDO = process.env.REGISTRO_COMANDO ?? 'registro'

const USCITA_RIFIUTO = 1
const USCITA_MUTO = 2

const SPENTO = [
  'Il registro non risponde sul condotto.',
  '',
  'Il condotto è spento finché non lo si accende: nelle impostazioni del registro,',
  'la voce «registroDocenti.api.condotto», da mettere a vero. È l’interruttore',
  'generale; sotto, «registroDocenti.api.lettura» (accesa di suo) e',
  '«registroDocenti.api.scrittura» dicono quanto si concede. Poi il registro deve',
  'essere aperto — il condotto vive dentro l’applicazione, non da solo.',
  '',
  'Attenzione: da acceso, ogni programma che gira con questo utente può chiamare le',
  'procedure del registro. Con la sola lettura può già leggere assenze, ritardi, medie',
  'e note delle persone in formazione — già calcolate, senza dover aprire il file — e',
  'far partire posta a nome del docente; con la scrittura, anche segnare al posto suo.',
].join('\n')

// -------------------------------------------------------------- l'indirizzo

/**
 * Dove ascolta il condotto.
 *
 * Le regole sono quelle di `conduit.ts`, ripetute qui perché questo file non
 * può importare TypeScript. `REGISTRO_CONDOTTO` le scavalca: serve
 * all'installazione portatile, che tiene i dati dove vuole lei, e a chi sta
 * provando due registri sulla stessa macchina.
 */
function indirizzo () {
  if (process.env.REGISTRO_CONDOTTO) return process.env.REGISTRO_CONDOTTO
  const impronta = createHash('sha256')
    .update(`${nomeUtente()}\n${cartellaUtente()}`)
    .digest('hex')
    .slice(0, 12)
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\registro-docenti-${impronta}`
    : join(tmpdir(), `registro-docenti-${impronta}.sock`)
}

function nomeUtente () {
  try {
    return userInfo().username
  } catch {
    return process.env.USERNAME ?? process.env.USER ?? ''
  }
}

function cartellaUtente () {
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(roaming, NOME_APPLICAZIONE)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', NOME_APPLICAZIONE)
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), NOME_APPLICAZIONE)
}

// ------------------------------------------------------------ la conversazione

/** Apre il condotto, o dice che non c'è. */
function collega () {
  return new Promise((risolvi, rifiuta) => {
    const presa = net.createConnection(indirizzo())
    presa.once('connect', () => risolvi(presa))
    presa.once('error', (male) => rifiuta(male))
  })
}

/**
 * Una conversazione a più richieste sulla stessa presa.
 *
 * Più di una serve davvero: `chiama` chiede prima lo schema — è l'unico modo
 * di sapere se `--ud 3` è il numero tre o il testo «3» — e poi chiama. Due
 * connessioni farebbero lo stesso lavoro in due volte il tempo.
 */
function conversazione (presa) {
  let resto = ''
  let prossimo = 1
  const attese = new Map()

  presa.setEncoding('utf8')
  presa.on('data', (pezzo) => {
    resto += pezzo
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      const riga = resto.slice(0, taglio)
      resto = resto.slice(taglio + 1)
      consegna(riga)
      taglio = resto.indexOf('\n')
    }
  })
  // La presa che si chiude mentre si aspetta: chi aspettava riceve `null`, che
  // è il modo in cui tutto il resto di questo file scrive «il condotto è muto».
  presa.on('close', () => {
    for (const attesa of attese.values()) attesa(null)
    attese.clear()
  })
  presa.on('error', () => undefined)

  function consegna (riga) {
    if (riga.trim() === '') return
    let busta = null
    try {
      busta = JSON.parse(riga)
    } catch {
      // Una riga che non è JSON non è una risposta a niente: si lascia cadere.
      return
    }
    const attesa = attese.get(busta?.id)
    if (attesa) {
      attese.delete(busta.id)
      attesa(busta)
      return
    }
    // Un guasto che non risponde a nessuna domanda risponde a **tutte**.
    //
    // JSON-RPC 2.0 §5 dice che una busta d'errore porta `id: null` quando
    // l'`id` della richiesta non si è potuto nemmeno leggere, ed è proprio il
    // caso in cui il condotto ha qualcosa da dire: `-32700` per una riga che
    // JSON non è, `-32600` per una busta che supera il tetto di 1 MiB. Quelle
    // buste finivano nel `return` qui sopra, scartate in silenzio — poi la
    // presa si chiudeva, `close` risolveva tutte le attese con `null`, e chi
    // aveva battuto il comando leggeva «il registro non risponde». Che è la
    // diagnosi sbagliata: il registro aveva risposto, e aveva detto esattamente
    // che cosa non andava.
    //
    // Lo scenario vero è uno script che passa un PDF in base64 a
    // `smistamento.pdf.deposita` — la via da script che `docs/API.md`
    // raccomanda — e supera il limite della riga. «La riga supera il limite di
    // 1 MiB» si legge e si corregge; «il registro non risponde» manda a
    // guardare se l'applicazione è aperta.
    if (busta?.error && attese.size > 0) {
      for (const aperta of attese.values()) aperta(busta)
      attese.clear()
    }
  }

  return {
    chiedi (method, params) {
      const id = prossimo++
      return new Promise((risolvi) => {
        attese.set(id, risolvi)
        presa.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
      })
    },
    chiudi () {
      presa.end()
    },
  }
}

// ---------------------------------------------------------------- gli argomenti

/** Quel che l'utente ha sbagliato a scrivere: si dice e si esce con 1. */
class ErroreUso extends Error {}

/**
 * Scioglie la riga di comando.
 *
 * `--json` è due cose, e si distinguono da quel che viene dopo: seguito da un
 * oggetto è l'ingresso intero, da solo (o prima di un'altra opzione) vuol dire
 * «stampami la busta grezza». È una comodità che si paga con questa regola, e
 * vale la pena: `--json '{...}'` è il modo in cui si passa quel che un'opzione
 * non sa dire — un elenco di oggetti, una struttura annidata.
 */
function analizza (argomenti) {
  const liberi = []
  const campi = new Map()
  let grezzo = false
  let corpo = null
  let aiuto = false

  for (let i = 0; i < argomenti.length; i++) {
    const voce = argomenti[i]
    if (!voce.startsWith('--')) {
      liberi.push(voce)
      continue
    }
    const nome = voce.slice(2)
    const dopo = argomenti[i + 1]
    if (nome === 'aiuto' || nome === 'help') {
      aiuto = true
      continue
    }
    if (nome === 'json') {
      if (dopo !== undefined && !dopo.startsWith('--') && dopo.trimStart().startsWith('{')) {
        corpo = dopo
        i++
      } else grezzo = true
      continue
    }
    // Un'opzione senza valore vale «vero»: `--assente` si legge come si
    // scriverebbe a voce, e lo schema dirà se quel campo è davvero booleano.
    if (dopo === undefined || dopo.startsWith('--')) {
      campi.set(nome, 'vero')
      continue
    }
    campi.set(nome, dopo)
    i++
  }

  return { liberi, campi, grezzo, corpo, aiuto }
}

const VERO = ['vero', 'sì', 'si', 'true', '1']
const FALSO = ['falso', 'no', 'false', '0']

/**
 * Il testo di un'opzione diventa il valore che lo schema dichiara.
 *
 * Mai indovinando: `--ud 3` è il numero tre perché lo schema dice che `ud` è un
 * intero, non perché «3» sembri un numero. La differenza si vede su un campo di
 * testo che contiene cifre — un numero di telefono, una sigla di classe — che
 * indovinando diventerebbe un numero e perderebbe lo zero davanti.
 */
function converti (testo, forma, campo) {
  // Un campo che ammette anche `null` si pubblica come `"type": ["string",
  // "null"]`: è un elenco, non una parola, e confrontarlo con `=== 'number'`
  // falliva sempre. Il danno non era che la conversione non avvenisse — era
  // che avveniva al contrario: `--valore 5.5` partiva come il *testo* «5.5» e
  // il registro lo rifiutava, e `--pianoId null` partiva come il testo «null»,
  // che per un identificatore è una stringa buona come un'altra e finiva
  // scritta nel registro al posto del distacco che si voleva.
  const tipi = Array.isArray(forma?.type) ? forma.type : [forma?.type]
  const ammette = (genere) => tipi.includes(genere)

  // `null` si scrive dove il contratto lo ammette, e solo lì: altrove è il
  // testo «null», che per un campo di testo è un valore legittimo.
  if (ammette('null') && testo.toLowerCase() === 'null') return null

  if (ammette('number') || ammette('integer')) {
    const numero = Number(testo)
    if (!Number.isFinite(numero)) {
      throw new ErroreUso(`«${campo}» vuole un numero, e «${testo}» non lo è.`)
    }
    return numero
  }
  if (ammette('boolean')) {
    const basso = testo.toLowerCase()
    if (VERO.includes(basso)) return true
    if (FALSO.includes(basso)) return false
    throw new ErroreUso(`«${campo}» vuole vero o falso, e «${testo}» non lo è.`)
  }
  if (ammette('array')) {
    return testo.split(',').map((voce) => converti(voce.trim(), forma.items ?? {}, campo))
  }
  if (ammette('object')) {
    try {
      return JSON.parse(testo)
    } catch {
      throw new ErroreUso(`«${campo}» vuole un oggetto JSON, e «${testo}» non lo è.`)
    }
  }
  return testo
}

function componiIngresso (campi, corpo, schemaIngresso) {
  const proprieta = schemaIngresso?.properties ?? {}
  const ingresso = {}

  for (const [campo, testo] of campi) {
    if (!Object.prototype.hasOwnProperty.call(proprieta, campo)) {
      const noti = Object.keys(proprieta)
      throw new ErroreUso(
        `Questa procedura non ha un campo «${campo}».` +
        (noti.length > 0 ? ` Ha: ${noti.join(', ')}.` : ''),
      )
    }
    ingresso[campo] = converti(testo, proprieta[campo], campo)
  }

  if (corpo !== null) {
    let letto
    try {
      letto = JSON.parse(corpo)
    } catch {
      throw new ErroreUso('L’oggetto passato a --json non è JSON valido.')
    }
    if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
      throw new ErroreUso('--json vuole un oggetto, non un elenco né un valore solo.')
    }
    // `--json` vince: è la via con cui si dicono le cose che un'opzione non sa
    // dire — un `null`, un elenco di oggetti — e chi la usa la sta usando apposta.
    Object.assign(ingresso, letto)
  }

  return ingresso
}

// ------------------------------------------------------------------ la stampa

function tabella (intestazioni, righe) {
  const larghezze = intestazioni.map((testa, colonna) =>
    Math.max(testa.length, ...righe.map((riga) => String(riga[colonna] ?? '').length)),
  )
  const riga = (celle) =>
    celle
      .map((cella, colonna) =>
        colonna === celle.length - 1
          ? String(cella ?? '')
          : String(cella ?? '').padEnd(larghezze[colonna]),
      )
      .join('  ')
      .trimEnd()
  return [riga(intestazioni), riga(larghezze.map((l) => '─'.repeat(l))), ...righe.map(riga)]
    .join('\n')
}

function scriviDati (testo) {
  process.stdout.write(`${testo}\n`)
}

function scriviErrore (testo) {
  process.stderr.write(`${testo}\n`)
}

/** Le frasi che il condotto ha mandato, o il messaggio JSON-RPC se non ce ne sono. */
function frasiDi (busta) {
  const dati = busta?.error?.data
  if (Array.isArray(dati?.messaggi) && dati.messaggi.length > 0) return dati.messaggi
  return [busta?.error?.message ?? 'Il registro non ha detto perché.']
}

function raccontaGuasto (busta) {
  for (const frase of frasiDi(busta)) scriviErrore(frase)
  const dati = busta?.error?.data
  if (dati?.campo) scriviErrore(`Campo: ${dati.campo}`)
  if (dati?.tracciato) scriviErrore(`Tracciato: ${dati.tracciato}`)
}

// ------------------------------------------------------------------ i comandi

async function comandoElenco (condotto, grezzo) {
  const busta = await condotto.chiedi('$elenco', {})
  if (busta === null) return muto()
  if (busta.error) {
    raccontaGuasto(busta)
    return USCITA_RIFIUTO
  }
  if (grezzo) {
    scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  const righe = busta.result.map((p) => [
    p.nome,
    p.genere,
    p.idempotente ? 'sì' : 'no',
    p.titolo,
  ])
  scriviDati(tabella(['procedura', 'genere', 'idem.', 'che cosa fa'], righe))
  return 0
}

async function comandoSchema (condotto, nome, grezzo) {
  if (!nome) throw new ErroreUso(`Serve il nome della procedura: ${COMANDO} schema <procedura>`)
  const busta = await condotto.chiedi('$schema', { procedura: nome })
  if (busta === null) return muto()
  if (busta.error) {
    raccontaGuasto(busta)
    scriviErrore(`L’elenco completo: ${COMANDO} elenco`)
    return USCITA_RIFIUTO
  }

  const ritratto = busta.result
  if (grezzo) {
    scriviDati(JSON.stringify({ ingresso: ritratto.ingresso, uscita: ritratto.uscita }, null, 2))
    return 0
  }

  scriviDati(`${ritratto.nome} — ${ritratto.titolo}`)
  scriviDati(`${ritratto.genere}${ritratto.idempotente ? ', idempotente' : ''}`)
  scriviDati('')

  const proprieta = ritratto.ingresso?.properties ?? {}
  const richiesti = ritratto.ingresso?.required ?? []
  const nomi = Object.keys(proprieta)
  if (nomi.length === 0) {
    scriviDati('Non chiede niente.')
    return 0
  }
  const righe = nomi.map((campo) => [
    richiesti.includes(campo) ? `${campo}*` : campo,
    ritratto.breve?.[campo] ?? proprieta[campo]?.type ?? 'qualunque',
    proprieta[campo]?.description ?? '',
  ])
  scriviDati(tabella(['campo', 'forma', 'a che serve'], righe))
  scriviDati('')
  scriviDati(`* obbligatorio.  Lo schema completo: ${COMANDO} schema ${nome} --json`)
  return 0
}

async function comandoChiama (condotto, nome, campi, corpo, grezzo) {
  if (!nome) throw new ErroreUso(`Serve il nome della procedura: ${COMANDO} chiama <procedura> …`)

  // Prima lo schema: senza, un `--ud 3` sarebbe il testo «3», e la convalida
  // del registro lo rifiuterebbe con ragione.
  const ritratto = await condotto.chiedi('$schema', { procedura: nome })
  if (ritratto === null) return muto()
  if (ritratto.error) {
    raccontaGuasto(ritratto)
    scriviErrore(`L’elenco completo: ${COMANDO} elenco`)
    return USCITA_RIFIUTO
  }

  const ingresso = componiIngresso(campi, corpo, ritratto.result.ingresso)

  const busta = await condotto.chiedi(nome, ingresso)
  if (busta === null) return muto()
  if (busta.error) {
    raccontaGuasto(busta)
    return USCITA_RIFIUTO
  }
  if (grezzo) {
    scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  scriviDati(JSON.stringify(busta.result.dati, null, 2))
  return 0
}

async function comandoStato (condotto, grezzo) {
  const busta = await condotto.chiedi('$versione', {})
  if (busta === null) return muto()
  if (busta.error) {
    raccontaGuasto(busta)
    return USCITA_RIFIUTO
  }
  if (grezzo) {
    scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  const { api, applicazione, documento, permessi } = busta.result
  scriviDati('Il condotto risponde.')
  scriviDati(`  contratto    ${api}`)
  scriviDati(`  applicazione ${applicazione}`)
  scriviDati(`  anno aperto  ${documento ?? '— nessuno'}`)
  scriviDati(`  concesso     ${concessioni(permessi)}`)
  scriviDati(`  condotto     ${indirizzo()}`)
  return 0
}

/**
 * Che cosa il condotto lascia fare, in una riga.
 *
 * Un registro più vecchio di questa riga non manda `permessi` e concedeva tutto:
 * dirlo invece di stampare «undefined» è quel che permette a `stato` di restare
 * utile davanti a un'applicazione non ancora aggiornata.
 */
function concessioni (permessi) {
  if (!permessi) return 'lettura e scrittura (registro precedente ai permessi)'
  const voci = [permessi.lettura ? 'lettura' : null, permessi.scrittura ? 'scrittura' : null]
  const concesse = voci.filter((voce) => voce !== null)
  return concesse.length > 0 ? concesse.join(' e ') : 'niente'
}

function muto () {
  scriviErrore(SPENTO)
  return USCITA_MUTO
}

// -------------------------------------------------------------------- l'aiuto

const AIUTO = [
  'Registro docenti — riga di comando.',
  '',
  `  ${COMANDO} elenco                    le procedure che il registro espone`,
  `  ${COMANDO} schema <procedura>        i campi dell’ingresso; con --json lo schema intero`,
  `  ${COMANDO} chiama <procedura> [--campo valore]… [--json '{…}']`,
  `  ${COMANDO} stato                     dice se il condotto risponde`,
  `  ${COMANDO} catalogo                  le procedure in JSON, per darle a un programma`,
  `  ${COMANDO} chiedi "domanda"          la stessa domanda, in italiano, a un modello`,
  '',
  'Opzioni:',
  '  --json        da solo, stampa la busta JSON-RPC grezza. Dopo «chiama», seguito da',
  '                un oggetto, è l’ingresso intero e vince sui --campo: è il modo di',
  '                passare un elenco di oggetti, che da riga di comando non si scrive.',
  '  --passi       dopo «chiedi», stampa sotto la risposta i comandi con cui il modello',
  '                l’ha letta: è così che una risposta si verifica invece di crederla.',
  '  --aiuto       questa pagina',
  '',
  'I valori dei --campo si convertono guardando lo schema della procedura, mai',
  'indovinando dal testo: un campo dichiarato numero riceve un numero, uno booleano',
  'riceve vero o falso. Un’opzione senza valore vale «vero».',
  '',
  'Il condotto è spento finché non lo si accende: «registroDocenti.api.condotto».',
  'Che cosa concede lo dicono «registroDocenti.api.lettura», accesa di suo, e',
  '«registroDocenti.api.scrittura», spenta: una procedura di scrittura chiamata',
  'senza la seconda torna «non-permesso» e non tocca niente. Che cosa vale adesso',
  'lo dice «stato». Da acceso, ogni programma che gira con questo utente può usarlo.',
  '',
  '«chiedi» vuole in più l’assistente acceso — «registroDocenti.assistente.attivo» — e',
  'un modello che sappia chiamare gli strumenti. Legge e basta: al modello si danno',
  'soltanto le procedure di lettura, e il genere si ricontrolla prima di eseguire. Se',
  'gli si chiede di segnare qualcosa risponde con il comando che lo farebbe, e lo batte',
  'una persona.',
  'REGISTRO_CONDOTTO scavalca l’indirizzo.',
  '',
  'Uscita: 0 fatto, 1 rifiutato, 2 il condotto non risponde.',
].join('\n')

// ------------------------------------------------------------- in italiano

/**
 * Quanti giri di attrezzi prima di fermarsi.
 *
 * Un modello piccolo che non trova quel che cerca riprova con gli stessi
 * argomenti, e lo rifarebbe finché qualcuno non lo ferma. Dieci bastano a
 * qualunque domanda vera — guarda i corsi, scegline uno, chiedine le presenze —
 * e un tetto che si tocca è una risposta parziale, non una macchina che macina.
 *
 * Il gemello è `CHIAMATE_MASSIME` in `data/llamaCpp.ts`, che tiene lo stesso
 * freno dentro la finestra: era dichiarato in `api/transports/assistant.ts`,
 * dove non c'è mai stato, e i due numeri avevano preso strade diverse — cinque
 * qui, dieci là — pur dicendosi lo stesso. Sono due perché questo file non si
 * compila (vedi la nota in testa), non perché siano due scelte diverse.
 *
 * L'unità però non è la stessa, ed è l'unica cosa da tenere a mente cambiandoli:
 * là si contano le **chiamate**, qui i **giri**, e in un giro il modello può
 * chiedere più attrezzi insieme. Il tetto di qui è quindi il più largo dei due.
 */
const GIRI_MASSIMI = 10

/**
 * Quanto di un risultato si rimanda al modello.
 *
 * Le presenze di una classe da venticinque sono una busta lunga: mandata intera
 * riempie la finestra di un modello piccolo e la conversazione perde il proprio
 * inizio, cioè le istruzioni. Tagliata, il modello risponde su quel che ha
 * visto e **sa di averne visto una parte**, che è la cosa che va detta.
 */
const LIMITE_RISULTATO = 6000

/** Il catalogo vivo, come lo racconta il registro che sta rispondendo. */
async function prendiCatalogo (condotto) {
  const busta = await condotto.chiedi('$attrezzi', { comando: COMANDO })
  if (busta === null) return null
  if (busta.error) {
    raccontaGuasto(busta)
    return undefined
  }
  return busta.result
}

/**
 * Il catalogo in JSON: il registro raccontato a un programma che non è questo.
 *
 * Ha due usi, e sono lo stesso uso visto da due lati: darlo in pasto a un
 * modello che non gira di qui, e guardarlo quando si vuole sapere che forma ha
 * un ingresso senza chiederla procedura per procedura. La copia che sta nel
 * versionamento — `resources/tools.json` — è questa, generata dal registro.
 */
async function comandoCatalogo (condotto) {
  const catalogo = await prendiCatalogo(condotto)
  if (catalogo === null) return muto()
  if (catalogo === undefined) return USCITA_RIFIUTO
  // Esce intero, tranne come l'assistente è collegato: l'indirizzo di un
  // servizio non è una cosa da lasciar finire in un file per sbaglio.
  const { assistente: _assistente, ...resto } = catalogo
  scriviDati(JSON.stringify(resto, null, 2))
  return 0
}

/**
 * Una richiesta al modello, con il corpo dell'errore dentro il messaggio.
 *
 * Il corpo di un errore di Ollama dice quasi sempre la cosa che serve — «model
 * "qwen2.5" not found, try pulling it first» — e buttarlo via lascerebbe a chi
 * guarda soltanto un numero.
 */
async function postaAlModello (assistente, corpo) {
  const risposta = await fetch(`${assistente.url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...corpo, model: assistente.modello, stream: false }),
    signal: AbortSignal.timeout(assistente.attesaMs),
  })
  if (!risposta.ok) {
    const testo = await risposta.text().catch(() => '')
    const dettaglio = testo.trim().slice(0, 300)
    throw new ErroreUso(
      `Il modello risponde ${risposta.status}${dettaglio ? `: ${dettaglio}` : '.'}`,
    )
  }
  return await risposta.json()
}

/**
 * La domanda in italiano, e la risposta con sotto i comandi che l'hanno fatta.
 *
 * **Solo letture.** Gli attrezzi che si mandano al modello sono quelli che il
 * catalogo dichiara `offribile` — cioè quel che `offribile()` di
 * `api/tools.ts` ha deciso: le letture, meno quelle che si sono dichiarate
 * fuori posto per un assistente, più la sola deroga che non tocca l'archivio. E
 * prima di chiamarne uno si ricontrolla: la whitelist non è l'elenco che si è
 * mandato, è il controllo che si fa al ritorno. Un modello che si inventa `ore.appello.riga` — cosa che i modelli
 * fanno — riceve un errore e non una scrittura. Non c'è un'opzione per
 * allargare questo confine, e non è una dimenticanza: una scrittura decisa da un
 * modello è una scrittura che nessuno ha chiesto, e nel registro di una classe
 * non si disfa. Quel che si ottiene al posto suo è il comando da battere, che
 * una persona legge e decide.
 *
 * Il condotto resta il solo modo in cui si arriva al registro — stesse
 * procedure, stessa convalida, stesso giornale, e la riga che resta scritta
 * dice `condotto`. Il modello non tocca niente che gli altri comandi di questo
 * file non tocchino già.
 */
async function comandoChiedi (condotto, domanda, grezzo, mostraPassi) {
  if (!domanda) {
    throw new ErroreUso(`Serve la domanda: ${COMANDO} chiedi "quante ore ha perso Rossi?"`)
  }

  const catalogo = await prendiCatalogo(condotto)
  if (catalogo === null) return muto()
  if (catalogo === undefined) return USCITA_RIFIUTO

  const assistente = catalogo.assistente ?? {}
  if (!assistente.attivo) {
    scriviErrore([
      'L’assistente è spento: si accende nelle impostazioni del registro, sotto «Assistente».',
      '',
      'Senza, restano i comandi che non hanno bisogno di nessun modello:',
      `  ${COMANDO} elenco     tutte le procedure, una per riga`,
      `  ${COMANDO} catalogo   le stesse in JSON, con la forma di ogni ingresso`,
    ].join('\n'))
    return USCITA_RIFIUTO
  }

  // La regola di chi si può offrire non è scritta qui, e non è una comodità.
  // Stava scritta qui, e diceva `genere === 'lettura'` mentre l'assistente
  // della finestra diceva «lettura oppure `assistente: true`»: due definizioni
  // della stessa regola in due file, che non sapevano di contraddirsi — e
  // `vista.apri` la vedeva la finestra e non il terminale. Adesso la risposta
  // la calcola `offribile()` in `api/tools.ts` e il catalogo la pubblica
  // voce per voce; qui si legge e basta. Un catalogo che non porta il campo è
  // un registro più vecchio di questa riga di comando, e la cosa si vede subito
  // — nessun attrezzo — invece di sbagliarsi in silenzio.
  const offribili = catalogo.attrezzi.filter((a) => a.offribile === true)
  const perFunzione = new Map()
  for (const a of offribili) {
    // Il nome senza punti è quello che si manda; quello con i punti è quello
    // che il registro scrive nei rimedi dei propri errori — «le classi
    // dell'anno le elenca «classi.elenco»» — e che il modello, giustamente,
    // ribatte. Senza questa seconda chiave il consiglio che il registro gli ha
    // appena dato tornava indietro come «quell'attrezzo non esiste». La
    // tolleranza va in una direzione sola: si accetta solo un nome che sta
    // nell'elenco già filtrato, quindi non apre niente.
    perFunzione.set(a.funzione, a)
    perFunzione.set(a.nome, a)
  }
  const attrezzi = offribili.map((a) => ({
    type: 'function',
    function: { name: a.funzione, description: a.titolo, parameters: a.parametri },
  }))

  const battute = [
    { role: 'system', content: catalogo.istruzioni },
    { role: 'user', content: domanda },
  ]
  const passi = []

  for (let giro = 0; giro < GIRI_MASSIMI; giro++) {
    const risposta = await postaAlModello(assistente, { messages: battute, tools: attrezzi })
    const messaggio = risposta?.message ?? {}
    const chiamate = Array.isArray(messaggio.tool_calls) ? messaggio.tool_calls : []

    if (chiamate.length === 0) {
      const testo = String(messaggio.content ?? '').trim()
      if (grezzo) {
        scriviDati(JSON.stringify({ domanda, risposta: testo, passi }, null, 2))
        return 0
      }
      scriviDati(testo || 'Il modello non ha risposto niente.')
      if (mostraPassi && passi.length > 0) {
        scriviDati('')
        scriviDati('Letto con:')
        for (const passo of passi) {
          scriviDati(`  ${passo.riga}${passo.ok ? '' : `   → ${passo.perche}`}`)
        }
      }
      return 0
    }

    battute.push({
      role: 'assistant',
      content: String(messaggio.content ?? ''),
      tool_calls: chiamate,
    })

    for (const chiamata of chiamate) {
      const esito = await usaAttrezzo(condotto, perFunzione, chiamata)
      passi.push(esito.passo)
      if (esito.muto) return muto()
      battute.push({
        role: 'tool',
        content: esito.testo,
        tool_name: chiamata?.function?.name ?? '',
      })
    }
  }

  scriviErrore(
    `Il modello ha chiesto attrezzi ${GIRI_MASSIMI} volte di fila senza arrivare a una ` +
    'risposta. La domanda è probabilmente troppo larga: conviene spezzarla.',
  )
  return USCITA_RIFIUTO
}

/**
 * Esegue quel che il modello ha chiesto, e torna il testo da rimandargli.
 *
 * **Non solleva mai.** Ogni cosa che va storta — un attrezzo che non esiste, una
 * procedura che scrive, argomenti malformati, un rifiuto del registro — diventa
 * testo dentro la risposta. È l'unico modo in cui la conversazione può
 * continuare: un modello che riceve «non esiste» cambia strada, un modello che
 * non riceve niente resta fermo su quel che aveva immaginato. L'unica eccezione
 * è il condotto che tace, perché lì non c'è più conversazione da continuare.
 */
async function usaAttrezzo (condotto, perFunzione, chiamata) {
  const chiesto = chiamata?.function?.name ?? ''
  const male = (perche) => ({
    testo: `Errore: ${perche}`,
    passo: { riga: chiesto || '(senza nome)', ok: false, perche },
    muto: false,
  })

  if (chiesto === '') return male('La chiamata non dice quale attrezzo usare.')

  // La whitelist vera è questa riga, non l'elenco che si è mandato: quel che si
  // manda è un suggerimento, quel che si esegue è un controllo.
  const attrezzo = perFunzione.get(chiesto)
  if (!attrezzo) {
    return male(
      `L’attrezzo «${chiesto}» non esiste, o non è fra quelli che ti si danno. ` +
      'Usa soltanto quelli che ti sono stati dati.',
    )
  }

  const letti = argomentiDi(chiamata?.function?.arguments)
  if (!letti.ok) return male(letti.perche)

  const ingresso = senzaFiltriVuoti(letti.valore, attrezzo.parametri)
  const busta = await condotto.chiedi(attrezzo.nome, ingresso)
  if (busta === null) {
    return {
      testo: 'Errore: il registro ha smesso di rispondere.',
      passo: { riga: attrezzo.nome, ok: false, perche: 'il condotto è muto' },
      muto: true,
    }
  }
  if (busta.error) return male(frasiDi(busta).join(' '))

  // Due forme, e si sa quale: le procedure rispondono con la busta del
  // contratto, che ha i dati sotto `dati`; i metodi `$` — `$elenco`, `$schema`,
  // `$attrezzi` — mettono il valore nudo in `result`. Qui si chiamano solo
  // procedure, quindi la prima è la strada e la seconda è la rete: scritto
  // così invece che con un `??` che si legge come un'incertezza, perché
  // un'incertezza a ogni chiamata è quel che poi nessuno osa più togliere.
  const risposta = busta.result
  const dati = JSON.stringify(
    risposta !== null && typeof risposta === 'object' && 'dati' in risposta
      ? risposta.dati
      : risposta,
  )
  const tagliato = dati.length > LIMITE_RISULTATO
  return {
    testo: tagliato
      ? `${dati.slice(0, LIMITE_RISULTATO)}\n\n[Questo risultato è stato tagliato: è più ` +
        'lungo di quel che ti si può mandare. Rispondi su quel che hai visto, e dillo.]'
      : dati,
    passo: { riga: rigaDiChiamata(attrezzo, ingresso), ok: true },
    muto: false,
  }
}

/**
 * I filtri riempiti con «niente» tolti di mezzo.
 *
 * ------------------------------------------------------------- che cosa succede
 *
 * La griglia che vincola un modello locale — la grammatica che durante la
 * generazione lascia passare solo un JSON della forma giusta — **esige tutte le
 * proprietà che dichiara**: un attrezzo con sei filtri opzionali è un attrezzo
 * che il modello deve riempire in sei punti anche quando non vuole filtrare
 * niente. I `null` che ne escono li tratta ormai `opzionale()` in
 * `api/schemas.ts`, che è il posto giusto — è il contratto, cioè l'unica cosa
 * che i due trasporti hanno davvero in comune, e da lì valgono per tutti.
 *
 * Restano i «niente» che `null` non sono, e che nessuna modifica a `opzionale`
 * può coprire perché per lo schema sono valori:
 *
 *   - `cerca: ''` — una stringa vuota è un filtro di testo che non filtra, e la
 *     busta la rimanda accanto alle righe come se si fosse cercato qualcosa;
 *   - `stati: []`, `ha: []`, `senza: []` — gli elenchi dichiarano `minimo: 1`,
 *     quindi il nucleo li **rifiuta**: «L'elenco deve avere almeno 1 voci.», per
 *     un filtro che il modello non voleva. Toglierlo dà esattamente quel che
 *     l'elenco vuoto voleva dire, perché senza il campo si prende il
 *     predefinito;
 *   - `da: 0` — la prima riga, cioè il valore che si ha senza chiedere niente.
 *
 * ---------------------------------------------- perché «da» si chiama per nome
 *
 * Perché la regola generale — «togli gli zeri dai numeri opzionali» — sarebbe
 * **sbagliata**: `scadeEntro: 0` vuol dire «scade oggi» e `arretrateDaAlmeno: 0`
 * vuol dire «da almeno zero giorni», due filtri veri che uno zero buttato via
 * cambierebbe in silenzio. `da` invece è il salto di pagina, dichiarato una
 * volta sola in `api/procedure/comuni/filtri.ts` con scritto accanto che senza
 * di lui si comincia dalla prima riga: zero e assente sono la stessa cosa per
 * costruzione. Un nome e una riga, invece di una regola che si porta dietro un
 * difetto.
 *
 * I campi **obbligatori** non si toccano mai, e questa è la riga che rende la
 * pulizia sicura: un `nome: ''` su un campo richiesto è un errore di chi ha
 * chiamato, e toglierlo vorrebbe dire trasformare «questo campo è vuoto» in
 * «questo campo manca» — cioè nascondere al modello quale dei due sbagli ha
 * fatto. Lo schema lo dice da sé, e arriva nella stessa busta dell'attrezzo.
 *
 * Non scende negli oggetti annidati: gli ingressi delle letture sono piatti, e
 * una pulizia profonda qui sarebbe una regola scritta per un caso che non
 * esiste.
 */
function senzaFiltriVuoti (ingresso, parametri) {
  if (ingresso === null || typeof ingresso !== 'object' || Array.isArray(ingresso)) return ingresso
  const richiesti = new Set(Array.isArray(parametri?.required) ? parametri.required : [])
  const pulito = {}
  for (const [campo, valore] of Object.entries(ingresso)) {
    if (!richiesti.has(campo)) {
      if (valore === '') continue
      if (Array.isArray(valore) && valore.length === 0) continue
      if (campo === 'da' && valore === 0) continue
    }
    pulito[campo] = valore
  }
  return pulito
}

/**
 * Gli argomenti di una chiamata, districati.
 *
 * Arrivano in tre forme e tutte e tre sono normali: un oggetto già decodificato,
 * una stringa JSON, o una stringa che JSON non è — un modello piccolo che ha
 * tirato a indovinare. Le prime due si accettano; la terza è un errore che
 * **torna al modello**, non un'eccezione: un modello a cui si dice che cosa ha
 * sbagliato quasi sempre riprova giusto.
 */
function argomentiDi (grezzi) {
  if (grezzi === undefined || grezzi === null) return { ok: true, valore: {} }
  if (typeof grezzi === 'object' && !Array.isArray(grezzi)) return { ok: true, valore: grezzi }
  if (typeof grezzi === 'string') {
    const testo = grezzi.trim()
    if (testo === '') return { ok: true, valore: {} }
    try {
      const letto = JSON.parse(testo)
      if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
        return { ok: false, perche: 'Gli argomenti devono essere un oggetto JSON.' }
      }
      return { ok: true, valore: letto }
    } catch {
      return { ok: false, perche: 'Gli argomenti non sono JSON valido.' }
    }
  }
  return { ok: false, perche: 'Gli argomenti devono essere un oggetto JSON.' }
}

/**
 * La lettura appena fatta, riscritta come la si ribatterebbe.
 *
 * È quel che rende verificabile la risposta di un modello: chi legge sta davanti
 * a un terminale, e una riga che si può ribattere vale più di una frase che si
 * deve credere.
 */
function rigaDiChiamata (attrezzo, ingresso) {
  const opzioni = Object.entries(ingresso)
    .filter(([, valore]) => valore !== undefined && valore !== null)
    .map(([campo, valore]) =>
      `--${campo} ${typeof valore === 'object' ? JSON.stringify(valore) : String(valore)}`)
  return `${COMANDO} chiama ${attrezzo.nome}${opzioni.length > 0 ? ` ${opzioni.join(' ')}` : ''}`
}

// ------------------------------------------------------------------ il giro

async function principale () {
  const { liberi, campi, grezzo, corpo, aiuto } = analizza(process.argv.slice(2))
  const comando = liberi[0]

  if (aiuto || !comando) {
    scriviDati(AIUTO)
    return 0
  }
  if (!['elenco', 'schema', 'chiama', 'stato', 'catalogo', 'chiedi'].includes(comando)) {
    scriviErrore(
      `Non so che cosa sia «${comando}». ` +
      'I comandi: elenco, schema, chiama, stato, catalogo, chiedi.',
    )
    return USCITA_RIFIUTO
  }

  let presa
  try {
    presa = await collega()
  } catch {
    // Un condotto spento e un condotto inesistente si presentano allo stesso
    // modo — ENOENT, ECONNREFUSED — e la risposta utile è la stessa: si dice
    // come accenderlo, non che cos'è andato storto dentro `net`.
    return muto()
  }

  const condotto = conversazione(presa)
  try {
    if (comando === 'elenco') return await comandoElenco(condotto, grezzo)
    if (comando === 'schema') return await comandoSchema(condotto, liberi[1], grezzo)
    if (comando === 'stato') return await comandoStato(condotto, grezzo)
    if (comando === 'catalogo') return await comandoCatalogo(condotto)
    if (comando === 'chiedi') {
      // La domanda è tutto quel che non è un'opzione: si scrive fra virgolette,
      // ma chi la batte senza se le dimentica — e una domanda spezzata in
      // parole è ancora quella domanda.
      return await comandoChiedi(condotto, liberi.slice(1).join(' '), grezzo, campi.has('passi'))
    }
    return await comandoChiama(condotto, liberi[1], campi, corpo, grezzo)
  } finally {
    condotto.chiudi()
  }
}

principale()
  .then((uscita) => {
    process.exitCode = uscita
  })
  .catch((male) => {
    if (male instanceof ErroreUso) {
      scriviErrore(male.message)
      process.exitCode = USCITA_RIFIUTO
      return
    }
    // Uno stack in faccia a chi voleva sapere un voto non serve a nessuno: il
    // messaggio sì, e basta quello.
    scriviErrore(`Qualcosa è andato storto: ${male instanceof Error ? male.message : String(male)}`)
    process.exitCode = USCITA_RIFIUTO
  })
