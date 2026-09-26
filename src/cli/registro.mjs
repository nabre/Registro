#!/usr/bin/env node
// La riga di comando del registro: un cliente del condotto e nient'altro.
// Chiede l'indice (`$elenco`) e le forme (`$schema`) al condotto, quindi segue
// le procedure senza cambiare. Solo moduli `node:`, niente compilazione: deve
// funzionare anche a costruzione rotta.
//
//   node src/cli/registro.mjs elenco
//   node src/cli/registro.mjs schema ore.appello.casella
//   node src/cli/registro.mjs chiama corso.presenze --corsoId cor-...
//
// Errori su stderr, dati su stdout, così `regi chiama ... --json | jq` funziona.

import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import net from 'node:net'
import { tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { cartellaUtente } from './common.mjs'
import { inTutteLeLingue, testi } from './testi.mjs'

/**
 * Il nome del comando nell'aiuto: lo dichiara il ponte di
 * `shell/system/commandLine.ts`, altrimenti vale quello installato.
 */
const COMANDO = process.env.REGISTRO_COMANDO ?? 'regi'

const USCITA_RIFIUTO = 1
const USCITA_MUTO = 2

/** I testi nella lingua della riga di comando: vedi `testi.mjs`. */
const t = testi()

const SPENTO = [t.nonRisponde, '', t.comeSiAccende].join('\n')

/**
 * Su Windows, quando manca il segreto e l'indirizzo non si conosce: dice dove
 * lo cercava, così chi ha i dati altrove sa di usare `REGISTRO_CONDOTTO`.
 */
function maiAcceso () {
  return [t.maiAcceso(cartellaUtente()), '', t.comeSiAccende].join('\n')
}

/** Il rifiuto di `collega` quando l'indirizzo non si conosce. */
class CondottoMaiAcceso extends Error {}

// -------------------------------------------------------------- l'indirizzo

/**
 * Dove ascolta il condotto: le regole di `conduit.ts`, ripetute perché qui non
 * si importa TypeScript. `REGISTRO_CONDOTTO` le scavalca (portabile, due
 * registri sulla stessa macchina).
 *
 * Fuori da Windows il socket sta in `XDG_RUNTIME_DIR` se c'è, come
 * `cartellaDelSocket`. Su Windows il nome porta il segreto scritto dal condotto
 * (`FILE_SEGRETO`); senza, `null`: il nome senza segreto può averlo occupato un
 * altro utente.
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
    return join(corsa && corsa !== '' ? corsa : tmpdir(), `regiclass-${impronta}.sock`)
  }
  const segreto = segretoDelCondotto(cartella)
  return segreto ? `\\\\.\\pipe\\regiclass-${impronta}-${segreto}` : null
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

// ------------------------------------------------------------ la conversazione

/** Apre il condotto, o dice che non c'è. */
function collega () {
  return new Promise((risolvi, rifiuta) => {
    const dove = indirizzo()
    if (dove === null) {
      rifiuta(new CondottoMaiAcceso('il condotto non si è mai acceso su questa macchina'))
      return
    }
    const presa = net.createConnection(dove)
    presa.once('connect', () => risolvi(presa))
    presa.once('error', (male) => rifiuta(male))
  })
}

/**
 * Più richieste sulla stessa presa: `chiama` chiede prima lo schema, poi chiama.
 * Esportata per le prove.
 */
export function conversazione (presa) {
  let resto = ''
  let prossimo = 1
  let chiusa = false
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
  // Alla chiusura chi aspetta riceve `null`, cioè «il condotto è muto».
  presa.on('close', () => {
    chiusa = true
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
      return
    }
    const attesa = attese.get(busta?.id)
    if (attesa) {
      attese.delete(busta.id)
      attesa(busta)
      return
    }
    // Un errore con `id: null` (JSON-RPC §5: `-32700` riga non JSON, `-32600`
    // oltre 1 MiB) risponde a tutte le attese: altrimenti la chiusura che segue
    // le risolverebbe con `null` e si leggerebbe «il registro non risponde».
    if (busta?.error && attese.size > 0) {
      for (const aperta of attese.values()) aperta(busta)
      attese.clear()
    }
  }

  return {
    chiedi (method, params) {
      // Dopo la chiusura `close` non ripassa: senza questo l'attesa resterebbe
      // appesa e il comando uscirebbe con 0 senza aver fatto niente.
      if (chiusa) return Promise.resolve(null)
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
 * Il valore di un'opzione scritta senza niente dopo. Un simbolo, non «vero»:
 * che cosa voglia dire lo decide lo schema, in `componiIngresso`.
 */
const SENZA_VALORE = Symbol('senza valore')

/**
 * Scioglie la riga di comando.
 *
 * `--json` seguito da un oggetto è l'ingresso intero; da solo vuol dire «stampa
 * la busta grezza». Seguito da un elenco si rifiuta. `--campo=valore` equivale a
 * `--campo valore` e serve per i valori che cominciano con `--`.
 */
function analizza (argomenti) {
  const liberi = []
  const campi = new Map()
  let grezzo = false
  let corpo = null
  let aiuto = false

  const metti = (nome, valore) => {
    // Vale l'ultimo, ma lo si dice.
    if (campi.has(nome)) scriviErrore(t.scrittoPiùVolte(nome))
    campi.set(nome, valore)
  }
  const prendiCorpo = (testo) => {
    if (testo.trimStart().startsWith('[')) {
      throw new ErroreUso(t.jsonElenco)
    }
    corpo = testo
  }

  for (let i = 0; i < argomenti.length; i++) {
    const voce = argomenti[i]
    if (!voce.startsWith('--')) {
      liberi.push(voce)
      continue
    }
    const uguale = voce.indexOf('=')
    const nome = uguale >= 0 ? voce.slice(2, uguale) : voce.slice(2)
    const attaccato = uguale >= 0 ? voce.slice(uguale + 1) : undefined
    const dopo = argomenti[i + 1]
    if (nome === 'aiuto' || nome === 'help') {
      aiuto = true
      continue
    }
    if (nome === 'json') {
      if (attaccato !== undefined) {
        prendiCorpo(attaccato)
      } else if (dopo !== undefined && !dopo.startsWith('--') &&
        /^[{[]/.test(dopo.trimStart())) {
        prendiCorpo(dopo)
        i++
      } else grezzo = true
      continue
    }
    if (attaccato !== undefined) {
      metti(nome, attaccato)
      continue
    }
    // Senza valore: «vero» sui booleani, un errore sugli altri; lo decide
    // `componiIngresso`, che ha lo schema.
    if (dopo === undefined || dopo.startsWith('--')) {
      metti(nome, SENZA_VALORE)
      continue
    }
    metti(nome, dopo)
    i++
  }

  return { liberi, campi, grezzo, corpo, aiuto }
}

// Le parole di tutte le lingue, non solo di quella di adesso: vedi `testi.mjs`.
const VERO = [...inTutteLeLingue('vero'), 'true', '1']
const FALSO = [...inTutteLeLingue('falso'), 'false', '0']

/**
 * Il testo di un'opzione diventa il valore del tipo dichiarato dallo schema,
 * mai indovinato: un campo di testo con cifre (telefono) resta testo.
 */
function converti (testo, forma, campo) {
  // `type` può essere un elenco (`["string", "null"]`).
  const tipi = Array.isArray(forma?.type) ? forma.type : [forma?.type]
  const ammette = (genere) => tipi.includes(genere)

  // `null` solo dove lo schema lo ammette; altrove è il testo «null».
  if (ammette('null') && testo.toLowerCase() === 'null') return null

  // Un campo largo (`qualunque()`) non dice quale tipo voglia: solo lì si deduce.
  if (tipi.length > 2) return deduci(testo, ammette, campo)

  if (ammette('number') || ammette('integer')) {
    // `Number('')` fa zero: il vuoto non è un numero.
    const numero = testo.trim() === '' ? Number.NaN : Number(testo)
    if (!Number.isFinite(numero)) {
      throw new ErroreUso(t.vuoleNumero(campo, testo))
    }
    return numero
  }
  if (ammette('boolean')) {
    const basso = testo.toLowerCase()
    if (VERO.includes(basso)) return true
    if (FALSO.includes(basso)) return false
    throw new ErroreUso(t.vuoleVeroFalso(campo, testo))
  }
  if (ammette('array')) {
    // Vuoto è l'elenco vuoto, non un elenco con un testo vuoto dentro.
    if (testo.trim() === '') return []
    // Un elenco scritto in JSON si legge in JSON, non spezzato sulle virgole.
    if (testo.trimStart().startsWith('[')) {
      try {
        return JSON.parse(testo)
      } catch {
        throw new ErroreUso(t.nonÈElencoJson(campo, testo))
      }
    }
    return testo.split(',').map((voce) => converti(voce.trim(), forma.items ?? {}, campo))
  }
  if (ammette('object')) {
    try {
      return JSON.parse(testo)
    } catch {
      throw new ErroreUso(t.vuoleOggetto(campo, testo))
    }
  }
  return testo
}

/**
 * Il valore di un campo con più di due tipi, dedotto dal testo, ogni passo solo
 * se lo schema lo ammette: parole di vero/falso (non «1»/«0», più spesso
 * numeri), numero finito, JSON se comincia come tale, altrimenti il testo.
 * Per il testo «vero» o «12» c'è `--json`.
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
      throw new ErroreUso(t.nonÈJson(campo, testo))
    }
  }
  if (ammette('string')) return testo
  throw new ErroreUso(t.nonSaCheFarsene(campo, testo))
}

function componiIngresso (campi, corpo, schemaIngresso) {
  const proprieta = schemaIngresso?.properties ?? {}
  const ingresso = {}

  for (const [campo, testo] of campi) {
    if (!Object.prototype.hasOwnProperty.call(proprieta, campo)) {
      throw new ErroreUso(t.nessunCampo(campo, Object.keys(proprieta)))
    }
    if (testo === SENZA_VALORE) {
      const tipi = [proprieta[campo]?.type].flat()
      if (!tipi.includes('boolean')) throw new ErroreUso(t.mancaValore(campo))
      ingresso[campo] = true
      continue
    }
    ingresso[campo] = converti(testo, proprieta[campo], campo)
  }

  if (corpo !== null) {
    let letto
    try {
      letto = JSON.parse(corpo)
    } catch {
      throw new ErroreUso(t.jsonNonValido)
    }
    if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
      throw new ErroreUso(t.jsonNonOggetto)
    }
    // `--json` vince sulle opzioni, ma lo si dice.
    for (const campo of Object.keys(letto)) {
      if (campi.has(campo)) {
        scriviErrore(t.vinceJson(campo))
      }
    }
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
  return [busta?.error?.message ?? t.nonHaDettoPerché]
}

function raccontaGuasto (busta) {
  for (const frase of frasiDi(busta)) scriviErrore(frase)
  const dati = busta?.error?.data
  if (dati?.campo) scriviErrore(t.campo(dati.campo))
  if (dati?.tracciato) scriviErrore(t.tracciato(dati.tracciato))
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
    p.idempotente ? t.sì : t.no,
    p.titolo,
  ])
  scriviDati(tabella(t.colonneElenco, righe))
  return 0
}

async function comandoSchema (condotto, nome, grezzo) {
  const busta = await condotto.chiedi('$schema', { procedura: nome })
  if (busta === null) return muto()
  if (busta.error) {
    raccontaGuasto(busta)
    // Senza permesso di lettura anche l'elenco è negato: non suggerirlo.
    if (busta.error.data?.codice !== 'non-permesso') scriviErrore(t.elencoCompleto(COMANDO))
    return USCITA_RIFIUTO
  }

  const ritratto = busta.result
  if (grezzo) {
    scriviDati(JSON.stringify({ ingresso: ritratto.ingresso, uscita: ritratto.uscita }, null, 2))
    return 0
  }

  scriviDati(`${ritratto.nome} — ${ritratto.titolo}`)
  scriviDati(`${ritratto.genere}${ritratto.idempotente ? t.idempotente : ''}`)
  scriviDati('')

  const proprieta = ritratto.ingresso?.properties ?? {}
  const richiesti = ritratto.ingresso?.required ?? []
  const nomi = Object.keys(proprieta)
  if (nomi.length === 0) {
    scriviDati(t.nonChiedeNiente)
    return 0
  }
  const righe = nomi.map((campo) => [
    richiesti.includes(campo) ? `${campo}*` : campo,
    ritratto.breve?.[campo] ?? proprieta[campo]?.type ?? t.qualunque,
    proprieta[campo]?.description ?? '',
  ])
  scriviDati(tabella(t.colonneSchema, righe))
  scriviDati('')
  scriviDati(t.obbligatorio(COMANDO, nome))
  return 0
}

async function comandoChiama (condotto, nome, campi, corpo, grezzo) {
  // Prima lo schema, per convertire i valori delle opzioni nel tipo giusto.
  const ritratto = await condotto.chiedi('$schema', { procedura: nome })
  if (ritratto === null) return muto()
  if (ritratto.error) {
    raccontaGuasto(ritratto)
    // Senza permesso di lettura anche l'elenco è negato: non suggerirlo.
    if (ritratto.error.data?.codice !== 'non-permesso') scriviErrore(t.elencoCompleto(COMANDO))
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
  const voce = t.voceStato
  // In colonna: i nomi larghi quanto il più lungo, più uno spazio.
  const larga = Math.max(...Object.values(voce).map((nome) => nome.length)) + 1
  const riga = (nome, valore) => scriviDati(`  ${nome.padEnd(larga)}${valore}`)
  scriviDati(t.risponde)
  riga(voce.contratto, api)
  riga(voce.applicazione, applicazione)
  riga(voce.anno, documento ?? t.nessunAnno)
  riga(voce.concesso, concessioni(permessi))
  riga(voce.condotto, indirizzo())
  return 0
}

/** Che cosa il condotto lascia fare, in una riga. Senza `permessi` concede tutto. */
function concessioni (permessi) {
  if (!permessi) return t.concedeTutto
  const voci = [permessi.lettura ? t.lettura : null, permessi.scrittura ? t.scrittura : null]
  const concesse = voci.filter((voce) => voce !== null)
  return concesse.length > 0 ? concesse.join(t.e) : t.niente
}

function muto () {
  scriviErrore(SPENTO)
  return USCITA_MUTO
}

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
 * Il catalogo degli attrezzi in JSON, per un modello esterno o per consultarlo;
 * `resources/tools.json` è la sua copia versionata.
 */
async function comandoCatalogo (condotto) {
  const catalogo = await prendiCatalogo(condotto)
  if (catalogo === null) return muto()
  if (catalogo === undefined) return USCITA_RIFIUTO
  // Senza `assistente`: il collegamento non deve finire in un file per sbaglio.
  const { assistente: _assistente, ...resto } = catalogo
  scriviDati(JSON.stringify(resto, null, 2))
  return 0
}

/**
 * La risposta a «chiedi»: il modello gira dentro il registro e dalla riga di
 * comando non si raggiunge; si dice dove si fa.
 */
const SENZA_CHIEDI = t.senzaChiedi(COMANDO)

// ------------------------------------------------------------------ il giro

/** Quante parole libere ogni comando legge, comando compreso. */
const PAROLE = { elenco: 1, stato: 1, catalogo: 1, schema: 2, chiama: 2 }

async function principale () {
  const { liberi, campi, grezzo, corpo, aiuto } = analizza(process.argv.slice(2))
  const comando = liberi[0]

  if (aiuto || !comando) {
    scriviDati(t.aiuto(COMANDO))
    return 0
  }
  if (comando === 'chiedi') {
    scriviErrore(SENZA_CHIEDI)
    return USCITA_RIFIUTO
  }
  if (!Object.hasOwn(PAROLE, comando)) {
    scriviErrore(t.nonSo(comando))
    return USCITA_RIFIUTO
  }

  // Gli errori d'uso prima di collegarsi, così non diventano «condotto spento».
  if ((comando === 'schema' || comando === 'chiama') && !liberi[1]) {
    throw new ErroreUso(t.serveIlNome(COMANDO, comando))
  }
  // Una parola in più è di solito il valore di un `--campo` dimenticato, o JSON
  // non oggetto dopo `--json`: si rifiuta invece di ignorarla.
  if (liberi.length > PAROLE[comando]) {
    throw new ErroreUso(
      t.paroleInPiù(liberi.slice(0, PAROLE[comando]).join(' '), liberi.slice(PAROLE[comando]).join(' ')) +
      (comando === 'chiama' ? t.valoriDopoIlCampo : t.lAiuto(COMANDO)),
    )
  }

  let presa
  try {
    presa = await collega()
  } catch (male) {
    if (male instanceof CondottoMaiAcceso) {
      scriviErrore(maiAcceso())
      return USCITA_MUTO
    }
    // ENOENT o ECONNREFUSED: in ogni caso si dice come accenderlo.
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
 * Vero se questo file è il programma lanciato e non un modulo importato (dalle
 * prove). Nel dubbio vero: una riga di comando che non fa niente è peggio.
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
      // Solo il messaggio, senza stack.
      scriviErrore(t.storto(male instanceof Error ? male.message : String(male)))
      process.exitCode = USCITA_RIFIUTO
    })
}
