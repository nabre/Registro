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
import { readFileSync, realpathSync } from 'node:fs'
import net from 'node:net'
import { homedir, tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

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
  'e note delle persone in formazione — già calcolate, senza dover aprire il file; con',
  'la scrittura, anche segnare al posto suo e far partire posta a nome del docente.',
].join('\n')

// -------------------------------------------------------------- l'indirizzo

/**
 * Dove ascolta il condotto.
 *
 * Le regole sono quelle di `conduit.ts`, ripetute qui perché questo file non
 * può importare TypeScript. `REGISTRO_CONDOTTO` le scavalca: serve
 * all'installazione portatile, che tiene i dati dove vuole lei, e a chi sta
 * provando due registri sulla stessa macchina.
 *
 * Fuori da Windows il socket sta in `XDG_RUNTIME_DIR` quando c'è — la stessa
 * regola di `cartellaDelSocket` nel condotto. Qui c'era soltanto `tmpdir()`:
 * su un desktop Linux la riga di comando bussava a `/tmp` mentre il registro
 * ascoltava altrove, diceva sempre «condotto spento», e bussava a un nome che
 * in `/tmp` un altro utente può creare per primo.
 *
 * Su Windows il nome porta il segreto che il condotto scrive nella cartella dei
 * dati la prima volta che si accende (vedi `FILE_SEGRETO` in `conduit.ts`).
 * Senza quel file il condotto non si è mai acceso qui, e si torna `null`: il
 * nome senza segreto è proprio quello che un altro utente può aver occupato.
 */
export function indirizzo () {
  if (process.env.REGISTRO_CONDOTTO) return process.env.REGISTRO_CONDOTTO
  const cartella = cartellaUtente()
  const impronta = createHash('sha256')
    .update(`${nomeUtente()}\n${cartella}`)
    .digest('hex')
    .slice(0, 12)
  if (process.platform !== 'win32') {
    const corsa = process.env.XDG_RUNTIME_DIR
    return join(corsa && corsa !== '' ? corsa : tmpdir(), `registro-docenti-${impronta}.sock`)
  }
  const segreto = segretoDelCondotto(cartella)
  return segreto ? `\\\\.\\pipe\\registro-docenti-${impronta}-${segreto}` : null
}

/** Il segreto del nome della pipe, come l'ha scritto il condotto; `null` se non c'è. */
function segretoDelCondotto (cartella) {
  try {
    const letto = readFileSync(join(cartella, 'condotto.segreto'), 'utf8').trim()
    return /^[0-9a-f]{32}$/.test(letto) ? letto : null
  } catch {
    return null
  }
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
    const dove = indirizzo()
    if (dove === null) {
      rifiuta(new Error('il condotto non si è mai acceso su questa macchina'))
      return
    }
    const presa = net.createConnection(dove)
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

  // Un campo largo — `qualunque()` ne ammette sei — lo schema non dice quale
  // dei tipi si voglia, e provare il numero per primo rifiutava ogni testo:
  // `--valore a@b.it` tornava «vuole un numero». Lì, e solo lì, si deduce.
  if (tipi.length > 2) return deduci(testo, ammette, campo)

  if (ammette('number') || ammette('integer')) {
    // `Number('')` fa zero: `--voto ""` partiva come un voto di zero.
    const numero = testo.trim() === '' ? Number.NaN : Number(testo)
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

/**
 * Il valore di un campo che ammette più di due tipi, dedotto dal testo.
 *
 * In quest'ordine: le parole di vero e falso — non «1» e «0», che su un campo
 * largo sono più spesso numeri —, poi un numero finito, poi un oggetto o un
 * elenco JSON se il testo comincia come uno di loro, e infine il testo com'è.
 * Ogni passo solo se lo schema lo ammette: è una deduzione dentro il contratto,
 * non al posto suo. Chi vuole il testo «vero» o «12» su un campo così lo manda
 * con `--json`.
 */
function deduci (testo, ammette, campo) {
  const basso = testo.toLowerCase()
  if (ammette('boolean')) {
    if (VERO.includes(basso) && !/^\d+$/.test(basso)) return true
    if (FALSO.includes(basso) && !/^\d+$/.test(basso)) return false
  }
  if ((ammette('number') || ammette('integer')) && testo.trim() !== '') {
    const numero = Number(testo)
    if (Number.isFinite(numero) && (ammette('number') || Number.isInteger(numero))) return numero
  }
  const inizio = testo.trimStart()[0]
  if ((inizio === '{' && ammette('object')) || (inizio === '[' && ammette('array'))) {
    try {
      return JSON.parse(testo)
    } catch {
      throw new ErroreUso(`«${campo}» sembra JSON, e «${testo}» non lo è.`)
    }
  }
  if (ammette('string')) return testo
  throw new ErroreUso(`«${campo}» non sa che farsene di «${testo}».`)
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
  '',
  'Opzioni:',
  '  --json        da solo, stampa la busta JSON-RPC grezza. Dopo «chiama», seguito da',
  '                un oggetto, è l’ingresso intero e vince sui --campo: è il modo di',
  '                passare un elenco di oggetti, che da riga di comando non si scrive.',
  '  --aiuto       questa pagina',
  '',
  'I valori dei --campo si convertono guardando lo schema della procedura, mai',
  'indovinando dal testo: un campo dichiarato numero riceve un numero, uno booleano',
  'riceve vero o falso. Un’opzione senza valore vale «vero». Solo un campo che',
  'ammette qualunque cosa si deduce: vero/falso, poi un numero, poi JSON se comincia',
  'con { o [, altrimenti il testo com’è.',
  '',
  'Il condotto è spento finché non lo si accende: «registroDocenti.api.condotto».',
  'Che cosa concede lo dicono «registroDocenti.api.lettura», accesa di suo, e',
  '«registroDocenti.api.scrittura», spenta: una procedura di scrittura chiamata',
  'senza la seconda torna «non-permesso» e non tocca niente. Che cosa vale adesso',
  'lo dice «stato». Da acceso, ogni programma che gira con questo utente può usarlo.',
  'REGISTRO_CONDOTTO scavalca l’indirizzo.',
  '',
  'Uscita: 0 fatto, 1 rifiutato, 2 il condotto non risponde.',
].join('\n')

// ---------------------------------------------------------------- il catalogo

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
 * Quel che si dice a chi batte ancora «chiedi».
 *
 * Il comando mandava la domanda a Ollama, cioè a un servizio con un indirizzo
 * HTTP. Il modello adesso è un file caricato **dentro** il registro, e
 * dall'esterno non c'è più un indirizzo a cui mandarla: il comando usciva con
 * «Failed to parse URL from undefined/api/chat». Rifarlo vorrebbe dire far girare
 * la conversazione dentro il registro attraverso il condotto — una procedura
 * nuova, con la sua regola sulle scritture — e non è una riga di comando nuda a
 * poterlo decidere. Si dice dove si fa, e che cosa resta da qui.
 */
const SENZA_CHIEDI = [
  '«chiedi» non c’è più: il modello dell’assistente gira dentro il registro, e le',
  'domande in italiano si fanno dal riquadro «Assistente» della finestra.',
  '',
  'Da qui restano le procedure, che sono quel che l’assistente legge:',
  `  ${COMANDO} elenco     tutte le procedure, una per riga`,
  `  ${COMANDO} chiama     una procedura, con i suoi campi`,
  `  ${COMANDO} catalogo   le stesse in JSON, per darle a un modello che gira altrove`,
].join('\n')

// ------------------------------------------------------------------ il giro

async function principale () {
  const { liberi, campi, grezzo, corpo, aiuto } = analizza(process.argv.slice(2))
  const comando = liberi[0]

  if (aiuto || !comando) {
    scriviDati(AIUTO)
    return 0
  }
  if (comando === 'chiedi') {
    scriviErrore(SENZA_CHIEDI)
    return USCITA_RIFIUTO
  }
  if (!['elenco', 'schema', 'chiama', 'stato', 'catalogo'].includes(comando)) {
    scriviErrore(
      `Non so che cosa sia «${comando}». ` +
      'I comandi: elenco, schema, chiama, stato, catalogo.',
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
    return await comandoChiama(condotto, liberi[1], campi, corpo, grezzo)
  } finally {
    condotto.chiudi()
  }
}

/**
 * Se questo file è il programma lanciato, e non un modulo importato.
 *
 * Lo importano le prove, per confrontare `indirizzo` con quello del condotto
 * senza doverlo ricalcolare di là. Il confronto si fa come lo fa Node per il
 * modulo principale — il percorso risolto dei collegamenti — e nel dubbio si
 * parte: una riga di comando che non fa niente sarebbe il guasto peggiore.
 */
function lanciato () {
  try {
    const avviato = process.argv[1]
    if (!avviato) return true
    return pathToFileURL(realpathSync(avviato)).href === import.meta.url
  } catch {
    return true
  }
}

if (lanciato()) {
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
}
