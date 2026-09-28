// Il condotto: il registro che risponde a chi non è una finestra.
//
// Server JSON-RPC 2.0 su named pipe (Windows) o socket unix, una riga di JSON
// per messaggio. Mai una porta di rete: un errore di firewall esporrebbe il
// registro alla rete della scuola.
//
// Quattro metodi riservati (`$versione`, `$elenco`, `$schema`, `$attrezzi`)
// raccontano le procedure; ogni altro `method` è una procedura e passa da
// `chiama`, con convalida, giornale e codici del pannello. Gli ultimi tre
// chiedono la lettura: raccontare il registro è leggerlo. `$versione` resta
// libero perché `regi stato` lo usa per diagnosticare un rifiuto.
//
// Sicurezza:
// - Spento di serie (`registroDocenti.api.condotto`): spento non apre niente.
//   Sotto, `api.lettura` (predefinita `true`) e `api.scrittura` (predefinita
//   `false`), decise dal `genere` di ogni procedura. Il limite vale solo qui: i
//   pannelli passano da `chiama` senza queste impostazioni.
// - Su Windows una named pipe con ACL predefinita è raggiungibile da ogni
//   processo della stessa sessione utente: acceso il condotto, ogni programma
//   dell'utente può chiamare le procedure (e scrivere, se concesso). Lo stesso
//   avvertimento sta in `docs/API.md`: tenerli uguali.
// - Il condotto non allarga sé stesso: `chiaveIntoccabile` elenca le chiavi del
//   programma che non cambia (permessi, programmi da eseguire, dettatura).
// - Fuori da Windows il socket nasce sotto `XDG_RUNTIME_DIR` se c'è
//   (`cartellaDelSocket`), con `chmod 0600` subito dopo `listen`.
// - Il nome è un'impronta (sha256 di utente + cartella dei dati), non il nome
//   utente; su Windows si aggiunge un segreto rifatto a ogni accensione
//   (`FILE_SEGRETO`), perché `\\.\pipe\` è condiviso da tutta la macchina.
// - Il nome si vede, la chiave no: ogni connessione si presenta con `$accedi`
//   prima di qualunque altro metodo, dimostrando di conoscere la chiave
//   (`FILE_CHIAVE`) senza mandarla, e il condotto risponde dimostrando lo
//   stesso. Chi non legge la cartella dei dati non chiama niente, e una pipe
//   che occupa il nome dopo un arresto brutale non sa rispondere.
// - Quel che esce non nomina nessuno: niente percorsi, nomi o segreti; il
//   guasto imprevisto esce come una riga con il tracciato, e il resto sta
//   nella console.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { chmod, unlink } from 'node:fs/promises'
import { createServer, type Socket } from 'node:net'
import { homedir, tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'

import * as apparato from 'apparato'

import type { Archivio } from '../../core/dati/archive.js'
import { VERSIONE_API, type Codice, type Genere } from '../../contract/contract.js'
import { catalogo } from '../../contract/tools.js'
import { registraTutte } from '../../contract/registro.js'
import { chiama, descrivi, osserva, procedura, procedure } from '../../contract/core.js'
import {
  convalida, formaInBreve, oggetto, opzionale, schemaJson, testo, type Forma,
} from '../../contract/schemas.js'
import { comeCollegato } from './assistant.js'
import { testi } from './conduit.testi.js'

/**
 * La riga più lunga accettata, nei due sensi: oltre, l'ingresso chiude la
 * connessione e l'uscita diventa un guasto. Conta in caratteri: è una diga,
 * non una misura.
 */
const LIMITE_RIGA = 1024 * 1024

/**
 * Quante connessioni insieme. La riga di comando ne apre una per chiamata; la
 * trentatreesima riceve un guasto che lo dice, non un EOF.
 */
const MASSIMO_PRESE = 32

/**
 * Quanto si tiene aperta una presa silenziosa. Il timer del socket conta i
 * byte, non le chiamate: si ferma mentre la presa ha qualcosa in coda, o una
 * geocodifica lunga verrebbe tagliata.
 */
const INATTIVITA_MS = 5 * 60 * 1000

/**
 * Quanto si aspettano, in chiusura, le chiamate già cominciate: una scrittura
 * in coda tocca comunque l'archivio, e chi l'ha mandata deve ricevere «fatto».
 * Poi si chiude lo stesso.
 */
const ATTESA_SVUOTAMENTO_MS = 5000

/**
 * Quante richieste possono aspettare il turno su una connessione. Serve insieme
 * all'attesa del `'drain'`: senza, le righe si accumulerebbero nella catena di
 * promesse invece che nel buffer di Node.
 */
const MASSIMO_IN_CODA = 128

/**
 * Quanto possono pesare, insieme, le righe in attesa su una connessione (in
 * caratteri, come `LIMITE_RIGA`): il tetto sul numero da solo lascerebbe
 * gigabyte in memoria.
 */
const MASSIMO_ACCODATO = 16 * 1024 * 1024

/**
 * Il nome dell'applicazione come lo scrive Electron nel percorso di `userData`.
 * Deve coincidere con il `productName` di `package.json` e con la copia in
 * `cli/common.mjs`: così la riga di comando ritrova il condotto.
 */
// testo-fisso: il `productName` dell'applicazione, parte di un percorso
const NOME_APPLICAZIONE = 'Regiklass'

// -------------------------------------------------------------- l'indirizzo

/**
 * La cartella dei dati dell'applicazione, ricavata dalle regole di Electron.
 * Ripiego: `avviaCondotto` riceve quella vera, ma `indirizzoCondotto()` deve
 * rispondere anche prima, e la riga di comando usa le stesse regole.
 */
function cartellaUtentePredefinita (): string {
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(roaming, NOME_APPLICAZIONE)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', NOME_APPLICAZIONE)
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), NOME_APPLICAZIONE)
}

/** Il nome utente, o quel che ne resta su una macchina che non lo dichiara. */
function nomeUtente (): string {
  try {
    return userInfo().username
  } catch {
    // Un container senza voce in /etc/passwd fa lanciare `userInfo`: all'impronta
    // basta separare, non identificare.
    return process.env.USERNAME ?? process.env.USER ?? ''
  }
}

/** La cartella vera, quando chi ha acceso il condotto ce l'ha detta. */
let cartellaUtenteVista: string | null = null

/**
 * La cartella del socket, fuori da Windows: `XDG_RUNTIME_DIR` se c'è, perché è
 * `0700` e dell'utente. In `tmpdir()` un altro utente che calcola l'impronta
 * potrebbe creare per primo quel file e far partire il registro senza condotto.
 */
function cartellaDelSocket (): string {
  const corsa = process.env.XDG_RUNTIME_DIR
  return corsa && corsa !== '' ? corsa : tmpdir()
}

/**
 * Dove ascolta il condotto. L'impronta a dodici caratteri esadecimali separa
 * utenti e installazioni senza scrivere il nome utente, visibile a tutta la
 * macchina.
 *
 * Esportata per `tests/api/conduit.test.mjs`, che così non ricalcola il nome
 * con una seconda regola.
 */
export function indirizzoCondotto (): string {
  const cartella = cartellaUtenteVista ?? cartellaUtentePredefinita()
  const impronta = createHash('sha256')
    .update(`${nomeUtente()}\n${cartella}`)
    .digest('hex')
    .slice(0, 12)
  if (process.platform !== 'win32') {
    return join(cartellaDelSocket(), `regiklass-${impronta}.sock`)
  }
  const segreto = leggiSegreto(cartella)
  return `\\\\.\\pipe\\regiklass-${impronta}${segreto ? `-${segreto}` : ''}`
}

/**
 * Il file con il segreto del nome della pipe, dentro la cartella dei dati.
 *
 * Su Windows `\\.\pipe\` è unico per la macchina: un altro utente potrebbe
 * occupare per primo il nome, e la riga di comando parlerebbe con la sua pipe.
 * Il segreto (sedici byte casuali) sta nel profilo dell'utente, protetto dalla
 * sua ACL, e lo rilegge anche `cli/registro.mjs`.
 *
 * Il nome della pipe invece è visibile a tutti, segreto compreso: per questo si
 * rifà a ogni accensione, e quel che si legge vale solo finché il nome è già
 * nostro. Fuori da Windows non serve.
 */
const FILE_SEGRETO = 'condotto.segreto'

/** La forma del segreto: quel che non la ha non si usa, si rifà. */
const FORMA_SEGRETO = /^[0-9a-f]{32}$/

/** Il segreto già scritto, o `null` se il condotto non si è mai acceso qui. */
function leggiSegreto (cartella: string): string | null {
  try {
    const letto = readFileSync(join(cartella, FILE_SEGRETO), 'utf8').trim()
    return FORMA_SEGRETO.test(letto) ? letto : null
  } catch {
    return null
  }
}

/**
 * Un segreto nuovo, scritto prima di ascoltare; solo su Windows e solo da
 * `avviaCondotto` (vedi `FILE_SEGRETO`).
 *
 * Nessuna concorrenza fra due registri: `requestSingleInstanceLock` in
 * `desktop/shell/main.ts` sta nella stessa cartella. Si scrive in un file accanto e si
 * rinomina, perché la riga di comando può leggere in quell'istante.
 */
function segretoDelCondotto (cartella: string): string {
  const nuovo = randomBytes(16).toString('hex')
  const file = join(cartella, FILE_SEGRETO)
  const provvisorio = `${file}.${process.pid}.nuovo`
  try {
    mkdirSync(cartella, { recursive: true })
    writeFileSync(provvisorio, nuovo, { mode: 0o600, flag: 'w' })
    renameSync(provvisorio, file)
  } catch {
    try { unlinkSync(provvisorio) } catch { /* non c'era */ }
    // Scrittura fallita: meglio il segreto vecchio, che la riga di comando trova
    // nel file, e senza nemmeno quello il nome senza segreto piuttosto che niente.
    return leggiSegreto(cartella) ?? ''
  }
  return leggiSegreto(cartella) ?? nuovo
}

/** Toglie il segreto, se è ancora quello scritto da questa accensione. */
function togliSegreto (cartella: string, segreto: string): void {
  if (leggiSegreto(cartella) !== segreto) return
  try { unlinkSync(join(cartella, FILE_SEGRETO)) } catch { /* già via */ }
}

// ------------------------------------------------------------------ la chiave

/**
 * Il file con la chiave del condotto, accanto al segreto e su ogni sistema.
 *
 * Il segreto finisce nel nome della pipe, che tutta la macchina vede; la chiave
 * resta nel file, protetto dall'ACL del profilo (o da `0600`), e sulla presa
 * passano solo prove calcolate con lei (`$accedi`). Si rifà a ogni accensione:
 * una prova raccolta da una pipe impostora vale solo per una chiave già morta.
 * La legge anche `cli/accesso.mjs`.
 */
const FILE_CHIAVE = 'condotto.chiave'

/** Trentadue byte in esadecimale. */
const FORMA_CHIAVE = /^[0-9a-f]{64}$/

function leggiChiave (cartella: string): string | null {
  try {
    const letto = readFileSync(join(cartella, FILE_CHIAVE), 'utf8').trim()
    return FORMA_CHIAVE.test(letto) ? letto : null
  } catch {
    return null
  }
}

/**
 * Una chiave nuova, scritta prima di ascoltare con temporaneo e rinomina come
 * il segreto. A differenza del segreto non c'è ripiego: senza chiave scritta il
 * condotto non si apre, perché un condotto che nessuno può riconoscere sarebbe
 * aperto a tutti o a nessuno.
 */
function chiaveDelCondotto (cartella: string): Buffer {
  const nuova = randomBytes(32).toString('hex')
  const file = join(cartella, FILE_CHIAVE)
  const provvisorio = `${file}.${process.pid}.nuovo`
  try {
    mkdirSync(cartella, { recursive: true })
    writeFileSync(provvisorio, nuova, { mode: 0o600, flag: 'w' })
    renameSync(provvisorio, file)
  } catch (male) {
    try { unlinkSync(provvisorio) } catch { /* non c'era */ }
    throw new Error(testi().chiaveNonScritta, { cause: male })
  }
  if (leggiChiave(cartella) !== nuova) throw new Error(testi().chiaveNonScritta)
  return Buffer.from(nuova, 'hex')
}

/** Toglie la chiave, se è ancora quella scritta da questa accensione. */
function togliChiave (cartella: string, chiave: Buffer): void {
  if (leggiChiave(cartella) !== chiave.toString('hex')) return
  try { unlinkSync(join(cartella, FILE_CHIAVE)) } catch { /* già via */ }
}

/**
 * La prova di conoscere la chiave, per una sfida. L'etichetta separa i due
 * versi: senza, la prova del condotto si potrebbe rimandargli come prova del
 * cliente. Stessa regola in `cli/accesso.mjs`.
 */
function prova (chiave: Buffer, chi: 'cliente' | 'condotto', sfida: string): string {
  return createHmac('sha256', chiave).update(`${chi}\n${sfida}`).digest('hex')
}

/** La sfida del cliente: da sedici a sessantaquattro byte, in esadecimale. */
const FORMA_SFIDA = /^[0-9a-f]{32,128}$/
const FORMA_PROVA = /^[0-9a-f]{64}$/

/** Le prove uguali, in tempo costante. */
function proveUguali (attesa: string, data: string): boolean {
  const a = Buffer.from(attesa, 'hex')
  const b = Buffer.from(data, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

// ----------------------------------------------------------------- le buste

/**
 * I codici del registro tradotti in JSON-RPC. Tre hanno un corrispondente
 * standard; gli altri vanno in `-32000`. Il codice del registro sta sempre in
 * `data`: è quello che decide se ritentare.
 */
const CODICI_JSONRPC: Record<Codice, number> = {
  'ingresso-non-valido': -32602,
  'procedura-sconosciuta': -32601,
  interno: -32603,
  'non-trovato': -32000,
  rifiutato: -32000,
  conflitto: -32000,
  'non-disponibile': -32000,
  'non-permesso': -32000,
}

/**
 * Quel che si guarda di una richiesta in arrivo. `jsonrpc` non si controlla,
 * per tolleranza verso client scritti in fretta: se una versione futura
 * cambiasse il significato, il controllo va aggiunto qui.
 */
interface Richiesta {
  id?: unknown
  method?: unknown
  params?: unknown
}

// ------------------------------------------------------------------ i permessi

/**
 * Che cosa il condotto lascia fare, per genere di procedura. Compare nella
 * firma di `OpzioniCondotto` (vedi lì per `npm run census`).
 */
interface Permessi {
  lettura: boolean
  scrittura: boolean
}

/**
 * Lo scavalco delle prove (`OpzioniCondotto.permessi`). `null` = valgono le
 * impostazioni, come nell'applicazione vera.
 */
let permessiScavalcati: Permessi | null = null

/**
 * Quel che vale adesso, riletto a ogni chiamata: spegnere un interruttore ha
 * effetto subito. La coerenza vale dentro una chiamata: `eseguiMetodo` legge i
 * permessi una volta e li tiene per tutta la sua durata.
 */
function permessiOra (): Permessi {
  return permessiScavalcati ?? permessiDalleImpostazioni()
}

/**
 * I permessi come li dichiarano le impostazioni. `condotto` è l'interruttore
 * generale: spento, le altre due voci non si leggono. È la stessa gerarchia di
 * `dipendeDa` nel manifesto, riscritta qui perché il registro non deve
 * dipendere dall'interfaccia per sapere che cosa concede.
 */
function permessiDalleImpostazioni (): Permessi {
  const sezione = apparato.impostazioni.leggi('registroDocenti.api')
  if (!sezione.get<boolean>('condotto', false)) return { lettura: false, scrittura: false }
  return {
    lettura: sezione.get<boolean>('lettura', true),
    scrittura: sezione.get<boolean>('scrittura', false),
  }
}

/**
 * Il permesso che un genere richiede, quando il condotto non ce l'ha
 * (`null` = si passa). Pura, per poterla provare.
 */
export function permessoMancante (
  genere: Genere,
  concessi: Permessi,
): 'lettura' | 'scrittura' | null {
  if (genere === 'scrittura' && !concessi.scrittura) return 'scrittura'
  if (genere === 'lettura' && !concessi.lettura) return 'lettura'
  return null
}

/**
 * Lo stesso, per un metodo del condotto. Le procedure sconosciute passano:
 * devono ricevere «non esiste», o gli errori diversi rivelerebbero i nomi validi.
 */
function permessoMancantePerMetodo (
  metodo: string,
  concessi: Permessi,
): 'lettura' | 'scrittura' | null {
  const p = procedura(metodo)
  return p ? permessoMancante(p.genere, concessi) : null
}

/**
 * Se è `$schema` di una procedura di scrittura, chiesto da chi può scrivere
 * (il perché sta al cancello in `eseguiMetodo`). Nomi non stringa o sconosciuti
 * non passano.
 */
function schemaDiUnaScritturaConcessa (
  metodo: string,
  params: unknown,
  concessi: Permessi,
): boolean {
  if (metodo !== '$schema' || !concessi.scrittura) return false
  const chiesta = (params as { procedura?: unknown } | null | undefined)?.procedura
  if (typeof chiesta !== 'string') return false
  return procedura(chiesta)?.genere === 'scrittura'
}

/**
 * Il rifiuto per mancanza di permesso, con una frase sola: chi la legge cerca
 * nelle impostazioni la parola che ci trova.
 */
function senzaPermesso (che: 'lettura' | 'scrittura', perché: string): GuastoRpc {
  const t = testi()
  return new GuastoRpc(CODICI_JSONRPC['non-permesso'], t.nonConcede(che), {
    codice: 'non-permesso' satisfies Codice,
    messaggi: [perché, t.siConcede(che)],
  })
}

/**
 * Le procedure che scrivono un'impostazione del programma. `impostazioni.salva`
 * scrive quelle del documento, mai chiavi `registroDocenti.*`.
 */
const SCRIVONO_IMPOSTAZIONI = new Set(['programma.salva', 'programma.azzera', 'programma.sfoglia'])

/**
 * Le chiavi del programma che il condotto non cambia, anche con la scrittura:
 *
 *   - i permessi del condotto (`registroDocenti.api.*`), riletti a ogni chiamata:
 *     uno script con la sola scrittura si concederebbe la lettura;
 *   - i percorsi dei programmi che il registro esegue (`ocr.programma`, più
 *     chiavi non più usate, tenute sbarrate se tornassero): farebbero eseguire
 *     un programma qualunque;
 *   - `dettatura.indirizzo`: uno script si farebbe mandare la voce di chi detta.
 *
 * Confronto senza maiuscole, per non dipendere dalla dogana di `valoreConMotivo`.
 */
const PREFISSO_PERMESSI = 'registrodocenti.api.'
const PERCORSI_ESEGUITI = new Set([
  'registrodocenti.ocr.programma',
  'registrodocenti.ocr.cartella',
  'registrodocenti.dettatura.programma',
  'registrodocenti.dettatura.cartella',
  'registrodocenti.recapiti.outlook',
  'registrodocenti.modelli.cartella',
  'registrodocenti.ocr.modello',
  'registrodocenti.ocr.proiettore',
])
const DOVE_VA_LA_VOCE = new Set(['registrodocenti.dettatura.indirizzo'])

/**
 * Il rifiuto per una chiave che il condotto non tocca, o `null` se si passa.
 * Prima della convalida: una chiamata che non si farà non va nel giornale.
 */
function chiaveIntoccabile (metodo: string, params: unknown): GuastoRpc | null {
  if (!SCRIVONO_IMPOSTAZIONI.has(metodo)) return null
  const chiave = (params as { chiave?: unknown } | null | undefined)?.chiave
  if (typeof chiave !== 'string') return null
  const bassa = chiave.trim().toLowerCase()
  const t = testi()
  const perche = bassa.startsWith(PREFISSO_PERMESSI)
    ? t.permessiIntoccabili
    : PERCORSI_ESEGUITI.has(bassa)
      ? t.programmiIntoccabili
      : DOVE_VA_LA_VOCE.has(bassa)
        ? t.voceIntoccabile
        : null
  if (!perche) return null
  return new GuastoRpc(CODICI_JSONRPC['non-permesso'], perche, {
    codice: 'non-permesso' satisfies Codice,
    messaggi: [perche, t.aMano],
    campo: 'chiave',
  })
}

/** Un errore già nella forma in cui esce dal condotto. */
class GuastoRpc extends Error {
  readonly code: number
  readonly dati: Record<string, unknown>

  constructor (code: number, messaggio: string, dati: Record<string, unknown>) {
    super(messaggio)
    this.name = 'GuastoRpc'
    this.code = code
    this.dati = dati
  }
}

function bustaEsito (id: unknown, risultato: unknown): string {
  return `${JSON.stringify({ jsonrpc: '2.0', id, result: risultato })}\n`
}

function bustaGuasto (
  id: unknown,
  code: number,
  messaggio: string,
  dati: Record<string, unknown>,
): string {
  const busta = {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message: messaggio, data: dati },
  }
  return `${JSON.stringify(busta)}\n`
}

// ------------------------------------------------------------------ i metodi

/**
 * La forma di ogni campo in una riga: la riga di comando gira senza
 * compilazione e non può importare `formaInBreve`.
 */
function breviDeiCampi (campi: Record<string, Forma>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(campi).map(([campo, forma]) => [campo, formaInBreve(forma)]),
  )
}

/**
 * Il ritratto di una procedura per chi ne compone l'ingresso da fuori: la base
 * è `descrivi` (la stessa di `$elenco`), più i due JSON Schema.
 */
function ritratto (nome: string): Record<string, unknown> {
  const p = procedura(nome)
  if (!p) {
    throw new GuastoRpc(-32601, testi().nonConosceProcedura(nome), {
      codice: 'procedura-sconosciuta' satisfies Codice,
    })
  }
  const forma = p.ingresso.forma
  return {
    ...descrivi(p),
    ingresso: schemaJson(forma),
    uscita: schemaJson(p.uscita.forma),
    breve: forma.genere === 'oggetto' ? breviDeiCampi(forma.campi) : {},
  }
}

/**
 * Che cosa `$attrezzi` accetta: un nome di comando, con un tetto. Il nome si
 * ripete una volta per attrezzo: senza tetto una richiesta sotto `LIMITE_RIGA`
 * produrrebbe centinaia di megabyte di risposta.
 */
const INGRESSO_ATTREZZI = oggetto({
  comando: opzionale(testo({
    aiuto: () => testi().comandoAttrezzi,
    massimo: 64,
    modello: /^[A-Za-z0-9._-]+$/,
  })),
})

async function eseguiMetodo (
  archivio: Archivio,
  metodo: string,
  params: unknown,
  presa?: Socket,
): Promise<unknown> {
  // JSON-RPC 2.0 §4.2 ammette parametri posizionali; il registro no (i campi
  // hanno nomi, non un ordine). Si rifiuta qui con un messaggio che nomina
  // `params`.
  if (Array.isArray(params)) {
    throw new GuastoRpc(-32602, testi().posizionali, {
      codice: 'ingresso-non-valido' satisfies Codice,
      campo: 'params',
    })
  }

  // Una volta sola per chiamata: `$versione` e il cancello qui sotto vedono gli
  // stessi permessi. Fra una chiamata e l'altra si rilegge (`permessiOra`).
  const concessi = permessiOra()

  if (metodo === '$versione') {
    return {
      api: VERSIONE_API,
      applicazione: apparato.versioneApplicazione(),
      // Il nome dell'anno, non il percorso: la cartella del docente non si dice.
      documento: archivio.cartellaCorrente,
      // `regi stato` lo stampa: per questo `$versione` non chiede permessi, o la
      // diagnosi mancherebbe proprio quando serve.
      permessi: concessi,
    }
  }

  // Raccontare il registro è leggerlo: elenco, schemi e catalogo chiedono la
  // lettura, anche a chi ha la sola scrittura.
  //
  // Eccezione: `$schema` di una procedura di scrittura a chi può scrivere. È la
  // forma di una chiamata già permessa, e la riga di comando lo chiede prima di
  // ogni `chiama` per convertire i `--campo`. Nomi sconosciuti e letture restano
  // dietro al cancello.
  if (metodo === '$elenco' || metodo === '$schema' || metodo === '$attrezzi' || metodo === '$guarda') {
    if (!concessi.lettura && !schemaDiUnaScritturaConcessa(metodo, params, concessi)) {
      throw senzaPermesso(
        'lettura',
        testi().raccontareELeggere(metodo),
      )
    }
  }

  if (metodo === '$elenco') return procedure().map((p) => descrivi(p))

  if (metodo === '$guarda') {
    if (presa) {
      const cancellaSpia = osserva((voce) => {
        if (presa.destroyed || presa.writableEnded) return
        const notifica = `${JSON.stringify({
          jsonrpc: '2.0',
          method: '$giornale',
          params: voce,
        })}\n`
        void scrivi(presa, null, notifica)
      })
      presa.once('close', cancellaSpia)
      presa.once('error', cancellaSpia)
    }
    return { ok: true }
  }

  if (metodo === '$attrezzi') {
    // Il catalogo vivo, non `resources/tools.json`: se il registro risponde, la
    // verità è qui.
    //
    // Contiene anche come è collegato l'assistente (indirizzo del servizio, nome
    // del modello), che da fuori Electron non si legge altrimenti: esce solo verso
    // chi ha la lettura.
    const controllo = convalida(INGRESSO_ATTREZZI, params ?? {})
    if (controllo.issues) {
      const problema = controllo.issues[0]
      const campo = problema?.path?.join('.')
      throw new GuastoRpc(-32602, problema?.message ?? testi().ingressoNonValido, {
        codice: 'ingresso-non-valido' satisfies Codice,
        ...(campo ? { campo } : {}),
      })
    }
    const comando = controllo.value.comando
    return { ...catalogo(comando), assistente: comeCollegato() }
  }

  if (metodo === '$schema') {
    const chiesta = (params as { procedura?: unknown } | null | undefined)?.procedura
    if (typeof chiesta !== 'string' || chiesta === '') {
      throw new GuastoRpc(-32602, testi().serveProcedura, {
        codice: 'ingresso-non-valido' satisfies Codice,
        campo: 'procedura',
      })
    }
    return ritratto(chiesta)
  }

  if (metodo.startsWith('$')) {
    throw new GuastoRpc(-32601, testi().nonConosceMetodo(metodo), {
      codice: 'procedura-sconosciuta' satisfies Codice,
    })
  }

  // Prima della convalida e del giornale: una chiamata non permessa non si
  // compone e non si registra.
  const manca = permessoMancantePerMetodo(metodo, concessi)
  if (manca) {
    throw senzaPermesso(
      manca,
      testi().proceduraDi(metodo, manca),
    )
  }

  const intoccabile = chiaveIntoccabile(metodo, params)
  if (intoccabile) throw intoccabile

  const risultato = await chiama(archivio, metodo, params ?? {}, { origine: 'condotto' })
  if (risultato.ok) return risultato

  // Il messaggio di un guasto imprevisto può contenere un percorso: esce una riga
  // con il tracciato, il resto è già in console.
  const messaggi = risultato.codice === 'interno'
    ? [testi().guastoNelGiornale(risultato.tracciato)]
    : risultato.messaggi

  // `?? interno`: `comeErroreApi` riconosce un `ErroreApi` dalla forma, e un
  // codice sconosciuto lascerebbe la busta senza `code`.
  const numero = CODICI_JSONRPC[risultato.codice] ?? CODICI_JSONRPC.interno
  throw new GuastoRpc(numero, messaggi.join(' '), {
    codice: risultato.codice,
    messaggi,
    ...(risultato.campo ? { campo: risultato.campo } : {}),
    tracciato: risultato.tracciato,
    // `modifiche > 0` con `codice: 'interno'`: la scrittura è avvenuta, non va
    // ritentata alla cieca. Vedi `chiudi()` in `api/core.ts`.
    ...(risultato.modifiche !== undefined ? { modifiche: risultato.modifiche } : {}),
    ...(risultato.revisione !== undefined ? { revisione: risultato.revisione } : {}),
    ...(risultato.versione !== undefined ? { versione: risultato.versione } : {}),
  })
}

// ------------------------------------------------------------- la connessione

/**
 * Manda fuori una busta già fatta, se c'è ancora chi ascolta. Oltre
 * `LIMITE_RIGA` diventa un guasto interno, che è corto per definizione.
 */
async function scrivi (presa: Socket, id: unknown, testo: string): Promise<void> {
  // Anche `writableEnded`: `write` su una presa chiusa emetterebbe
  // `ERR_STREAM_WRITE_AFTER_END`.
  if (presa.destroyed || presa.writableEnded) return
  if (testo.length > LIMITE_RIGA) {
    presa.write(bustaGuasto(id, -32603, testi().rispostaTroppoLunga, {
      codice: 'interno' satisfies Codice,
    }))
    return
  }
  // `write` torna `false` oltre la soglia del buffer: si aspetta il `'drain'`,
  // così un cliente che non legge rallenta la sua coda invece di far crescere la
  // memoria del registro.
  if (presa.write(testo)) return
  await drenata(presa)
}

/**
 * Aspetta che il buffer si svuoti, o che la presa se ne vada: senza `close` ed
 * `error`, un cliente morto terrebbe appesa la coda e lo spegnimento
 * (`svuota()`) aspetterebbe fino al tetto.
 */
function drenata (presa: Socket): Promise<void> {
  return new Promise<void>((risolvi) => {
    const basta = (): void => {
      presa.off('drain', basta)
      presa.off('close', basta)
      presa.off('error', basta)
      risolvi()
    }
    presa.on('drain', basta)
    presa.on('close', basta)
    presa.on('error', basta)
  })
}

/**
 * Un `id` che si possa rimandare indietro: stringa, numero o `null` (JSON-RPC
 * 2.0 §4). Un oggetto non si correla.
 */
function idAmmesso (id: unknown): boolean {
  return typeof id === 'string' || typeof id === 'number' || id === null
}

/**
 * La busta con cui si rifiuta una riga che non entra in coda, con il suo `id`:
 * con `id: null` la riga di comando la scarterebbe e resterebbe ad aspettare.
 * Se la riga non è JSON o l'`id` non è ammesso, resta `null`.
 */
function rispostaDiRifiuto (
  riga: string,
  messaggio: string,
  dati: Record<string, unknown>,
): { id: unknown, testo: string } | null {
  let id: unknown = null
  try {
    const letto: unknown = JSON.parse(riga.trim())
    if (typeof letto === 'object' && letto !== null && !Array.isArray(letto)) {
      const forse = (letto as Richiesta).id
      // Una notifica non riceve risposta, nemmeno un rifiuto (JSON-RPC 2.0 §4.1).
      if (forse === undefined) return null
      if (idAmmesso(forse)) id = forse
    }
  } catch {
    // Non JSON: la busta va a `null`, e il guasto vero lo dirà `rispondi`.
  }
  return { id, testo: bustaGuasto(id, CODICI_JSONRPC['non-disponibile'], messaggio, dati) }
}

/**
 * Serve una riga. Torna `true` quando la connessione non si può più leggere
 * (dopo un JSON rotto) e le righe dietro non vanno eseguite.
 */
async function rispondi (
  archivio: Archivio,
  presa: Socket,
  riga: string,
  stato: StatoCondotto,
  accesso: Accesso,
): Promise<boolean> {
  let richiesta: Richiesta
  try {
    // `trim`: un BOM UTF-8 in testa al primo messaggio farebbe fallire solo la
    // prima chiamata.
    const letto: unknown = JSON.parse(riga.trim())
    if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
      await scrivi(presa, null, bustaGuasto(null, -32600, testi().serveOggetto, {
        codice: 'ingresso-non-valido' satisfies Codice,
      }))
      return false
    }
    richiesta = letto
  } catch {
    // Dopo un JSON rotto la connessione è desincronizzata: si risponde e si chiude.
    // Il `true` dice ad `accoda` di non eseguire le righe già in coda, o una
    // scrittura avverrebbe con la risposta su una presa chiusa.
    await scrivi(presa, null, bustaGuasto(null, -32700, testi().nonJson, {
      codice: 'ingresso-non-valido' satisfies Codice,
    }))
    presa.end()
    return true
  }

  // Notifica = richiesta senza il membro `id` (JSON-RPC 2.0 §4). `"id": null` è
  // una richiesta normale e riceve risposta.
  const attende = 'id' in richiesta && richiesta.id !== undefined
  const id = attende ? richiesta.id : null

  if (attende && !idAmmesso(id)) {
    await scrivi(presa, null, bustaGuasto(null, -32600, testi().idNonValido, {
      codice: 'ingresso-non-valido' satisfies Codice,
      campo: 'id',
    }))
    return false
  }

  // In chiusura non si comincia niente di nuovo, e lo si dice.
  if (stato.chiuso) {
    if (attende) {
      await scrivi(presa, id, bustaGuasto(id, CODICI_JSONRPC['non-disponibile'],
        testi().siChiude, {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: [testi().siSpegne],
        }))
    }
    return false
  }

  const metodo = richiesta.method

  if (typeof metodo !== 'string' || metodo === '') {
    if (attende) {
      await scrivi(presa, id, bustaGuasto(id, -32600, testi().mancaMetodo, {
        codice: 'ingresso-non-valido' satisfies Codice,
        campo: 'method',
      }))
    }
    return false
  }

  if (metodo === '$accedi' || !accesso.riconosciuta) {
    return await presenta(presa, id, attende, metodo, richiesta.params, stato, accesso)
  }

  let esito: unknown
  try {
    esito = await eseguiMetodo(archivio, metodo, richiesta.params, presa)
  } catch (male) {
    // Prima il racconto, poi la risposta: un guasto su una notifica deve lasciare
    // traccia in console anche senza busta.
    if (!(male instanceof GuastoRpc)) console.error('[condotto] guasto nel trasporto', male)
    if (!attende) return false
    if (male instanceof GuastoRpc) {
      await scrivi(presa, id, bustaGuasto(id, male.code, male.message, male.dati))
      return false
    }
    await scrivi(presa, id, bustaGuasto(id, -32603, testi().guastoInterno, {
      codice: 'interno' satisfies Codice,
    }))
    return false
  }

  if (!attende) return false

  // La composizione della busta sta fuori dal `try` di sopra: se
  // `JSON.stringify` lanciasse (riferimento ciclico, `BigInt`), una chiamata
  // riuscita non deve rispondere «guasto interno», che invita a ritentare.
  try {
    await scrivi(presa, id, bustaEsito(id, esito))
  } catch (male) {
    // Qui la chiamata è riuscita ma la busta non si compone: messaggio suo, per
    // distinguere «non è successo» da «è successo e non so dirtelo».
    console.error('[condotto] la risposta non si è potuta serializzare', male)
    await scrivi(presa, id, bustaGuasto(id, -32603, testi().nonSerializzata, {
      codice: 'interno' satisfies Codice,
      messaggi: [testi().eseguita, testi().bustaNonComposta],
    }))
  }
  return false
}

/** Se una connessione si è già presentata con la chiave giusta. */
interface Accesso {
  riconosciuta: boolean
}

/**
 * `$accedi`, e ogni altro metodo di chi non si è ancora presentato.
 *
 * Il cliente manda una sfida sua e la prova calcolata su di lei; il condotto
 * risponde con la propria prova sulla stessa sfida, che il cliente controlla
 * prima di mandare altro. Una sfida vale una volta per accensione: una prova
 * copiata non si riusa. Qualunque rifiuto chiude la connessione, e prima di
 * presentarsi non si risponde nient'altro, nemmeno `$versione`.
 */
async function presenta (
  presa: Socket,
  id: unknown,
  attende: boolean,
  metodo: string,
  params: unknown,
  stato: StatoCondotto,
  accesso: Accesso,
): Promise<boolean> {
  const t = testi()
  const rifiuta = async (messaggio: string): Promise<boolean> => {
    accesso.riconosciuta = false
    if (attende) {
      await scrivi(presa, id, bustaGuasto(id, CODICI_JSONRPC['non-permesso'], messaggio, {
        codice: 'non-permesso' satisfies Codice,
        messaggi: [messaggio, t.comeSiPresenta],
      }))
    }
    presa.end()
    return true
  }

  if (metodo !== '$accedi') return await rifiuta(t.primaSiPresenta)

  const { sfida, prova: data } = (params ?? {}) as { sfida?: unknown, prova?: unknown }
  if (typeof sfida !== 'string' || !FORMA_SFIDA.test(sfida) ||
    typeof data !== 'string' || !FORMA_PROVA.test(data)) {
    return await rifiuta(t.accessoMalFatto)
  }
  if (stato.sfideViste.has(sfida) || !proveUguali(prova(stato.chiave, 'cliente', sfida), data)) {
    return await rifiuta(t.chiaveSbagliata)
  }
  stato.sfideViste.add(sfida)
  accesso.riconosciuta = true
  if (attende) await scrivi(presa, id, bustaEsito(id, { prova: prova(stato.chiave, 'condotto', sfida) }))
  return false
}

/**
 * Quel che un condotto acceso tiene in mano. Le code stanno qui perché lo
 * spegnimento deve poterle aspettare: altrimenti una modifica entrerebbe dopo
 * la chiusura senza risposta.
 */
interface StatoCondotto {
  /** Da qui in poi non si comincia più niente: si risponde e basta. */
  chiuso: boolean
  /** La chiave di questa accensione: vedi `FILE_CHIAVE`. */
  chiave: Buffer
  /**
   * Le sfide già riconosciute. Ci entrano solo quelle con la prova giusta, cioè
   * di chi ha la chiave: chi non ce l'ha non può farla crescere.
   */
  sfideViste: Set<string>
  /**
   * Una coda per presa (l'ultima promessa della connessione). Resta finché la
   * coda non arriva in fondo, anche a presa chiusa: `svuota()` la aspetta.
   */
  code: Map<Socket, Promise<void>>
}

function servi (archivio: Archivio, presa: Socket, stato: StatoCondotto): void {
  // Un decodificatore e non `setEncoding`: un carattere accentato spezzato fra
  // due pacchetti diventerebbe un punto interrogativo.
  const decodificatore = new StringDecoder('utf8')
  let resto = ''
  const accesso: Accesso = { riconosciuta: false }

  /**
   * La riga entra nella coda della connessione: una richiesta per volta, in
   * ordine. Connessioni diverse non sono serializzate qui (`docs/API.md`: «per
   * trasporto, non in assoluto»).
   *
   * Il `catch` serve: una promessa rifiutata avvelenerebbe la coda, e la
   * connessione smetterebbe di rispondere restando aperta.
   */
  /** Quante righe di questa connessione aspettano il proprio turno. */
  let inCoda = 0
  /**
   * Rifiutata una riga per lunghezza, per peso o perché non era JSON, la presa
   * non legge più altro e non esegue quel che aveva già in coda.
   */
  let rifiutata = false
  /** Quanti caratteri pesano, tutte insieme: vedi `MASSIMO_ACCODATO`. */
  let accodati = 0

  const accoda = (riga: string): void => {
    // Tetto sulla profondità (`MASSIMO_IN_CODA`): si dice e non si chiude, così chi
    // legge sa che deve rallentare.
    if (inCoda >= MASSIMO_IN_CODA) {
      const rifiuto = rispostaDiRifiuto(riga,
        testi().troppeInAttesa(MASSIMO_IN_CODA), {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: [testi().siAspetta],
        })
      if (rifiuto) void scrivi(presa, rifiuto.id, rifiuto.testo)
      return
    }
    // Tetto sul peso (`MASSIMO_ACCODATO`): qui si chiude, chi manda sedici megabyte
    // senza leggere non sta aspettando il turno.
    if (accodati + riga.length > MASSIMO_ACCODATO) {
      rifiutata = true
      const rifiuto = rispostaDiRifiuto(riga,
        testi().troppoPeso, {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: [testi().siAspetta],
        })
      if (rifiuto) void scrivi(presa, rifiuto.id, rifiuto.testo)
      presa.end()
      return
    }
    inCoda += 1
    accodati += riga.length
    // Con una chiamata in corso il timer d'inattività si ferma: conta i byte, non
    // le chiamate.
    if (inCoda === 1) presa.setTimeout(0)
    const prima = stato.code.get(presa) ?? Promise.resolve()
    const dopo = prima
      .then(async () => {
        // Presa rifiutata: le righe già in coda non si eseguono, o una scrittura
        // avverrebbe senza risposta. Non si guarda `presa.destroyed`: una notifica di
        // chi se n'è andato si esegue lo stesso.
        if (rifiutata) return
        if (await rispondi(archivio, presa, riga, stato, accesso)) rifiutata = true
      })
      .catch((male: unknown) => {
        console.error('[condotto] guasto nella coda', male)
      })
      .finally(() => {
        inCoda -= 1
        accodati -= riga.length
        // Coda vuota: da qui in poi scade di nuovo il silenzio.
        if (inCoda === 0 && !presa.destroyed) presa.setTimeout(INATTIVITA_MS)
      })
    stato.code.set(presa, dopo)
    // Coda arrivata in fondo e niente di nuovo: la voce esce dalla mappa, che
    // tiene solo le code ancora attive.
    void dopo.then(() => {
      if (stato.code.get(presa) === dopo) stato.code.delete(presa)
    })
  }


  /**
   * Una riga troppo lunga si rifiuta dicendolo, non con un EOF che la riga di
   * comando leggerebbe come «il registro non risponde» (un PDF in base64 per
   * `smistamento.pdf.deposita` può superare il megabyte). `end` e non `destroy`,
   * o la busta non farebbe in tempo a uscire.
   */
  const troppoLunga = (): void => {
    // Una volta sola: `end` non chiude subito in lettura, e i pezzi in volo
    // farebbero uscire la busta più volte.
    if (rifiutata) return
    rifiutata = true
    void scrivi(presa, null, bustaGuasto(null, -32600, testi().rigaTroppoLunga, {
      codice: 'ingresso-non-valido' satisfies Codice,
      messaggi: [testi().limiteRiga, testi().unPercorso],
    }))
    presa.end()
  }

  presa.on('data', (pezzo: Buffer) => {
    if (rifiutata) return
    resto += decodificatore.write(pezzo)
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      const riga = resto.slice(0, taglio)
      resto = resto.slice(taglio + 1)
      if (riga.length > LIMITE_RIGA) {
        troppoLunga()
        return
      }
      if (riga.trim() !== '') accoda(riga)
      if (rifiutata) return
      taglio = resto.indexOf('\n')
    }
    if (resto.length > LIMITE_RIGA) troppoLunga()
  })

  // Una presa inattiva non resta appesa; `accoda` ferma il timer finché c'è una
  // chiamata in corso.
  //
  // `destroy` e non `end`: un cliente che ignora il FIN resterebbe in `prese`
  // per sempre. Allo scadere non c'è niente in coda da far uscire.
  presa.setTimeout(INATTIVITA_MS, () => presa.destroy())

  // Senza ascoltatore, l'`error` di un socket fa cadere il processo. Si tacciono
  // solo `ECONNRESET` ed `EPIPE` (un programma che ha finito); il resto si dice.
  presa.on('error', (male: Error & { code?: string }) => {
    if (male.code === 'ECONNRESET' || male.code === 'EPIPE') return
    console.error('[condotto] guasto della presa', male.message)
  })
}

// ------------------------------------------------------------------- l'avvio

// Esportata perché compare nella firma di `avviaCondotto`: `npm run census` la
// segnala come «da rendere interna», ma senza `export` l'emissione dei `.d.ts`
// fallirebbe.
interface OpzioniCondotto {
  /**
   * La cartella dei dati dell'applicazione (`app.getPath('userData')`). Entra
   * nell'impronta del nome: due installazioni non si incrociano.
   */
  cartellaUtente?: string
  /** Scavalca le impostazioni. Solo per le prove. */
  permessi?: Permessi
}

/**
 * Un condotto acceso, o il niente che resta da spento.
 *
 * `dispose` smette di accettare e chiude; `svuotato` dice che le chiamate già
 * cominciate sono finite. Separati perché `apparato.Smaltitore` butta il
 * ritorno del disposer, e lo spegnimento deve aspettare l'ultima scrittura
 * prima del salvataggio finale.
 */
export interface Condotto extends apparato.Smaltibile {
  svuotato (): Promise<void>
}

/**
 * Se le impostazioni correnti vogliono un condotto in ascolto. La usa
 * `osservaCondotto` in `startup.ts` per riaprire la pipe solo quando serve (i
 * permessi si rileggono a ogni chiamata). Sta qui per non scrivere una terza
 * volta la gerarchia del generale.
 */
export function condottoDaAprire (): boolean {
  const p = permessiOra()
  return p.lettura || p.scrittura
}

/** Che si dica una volta sola: a ogni finestra aperta sarebbe rumore. */
let dettoSpento = false

/** Un condotto che non c'è: si smaltisce e non c'è niente da aspettare. */
function condottoSpento (): Condotto {
  const smaltitore = new apparato.Smaltitore(() => undefined)
  return { dispose: () => smaltitore.dispose(), svuotato: () => Promise.resolve() }
}

/**
 * Accende il condotto, se le impostazioni concedono qualcosa. Torna sempre
 * qualcosa da smaltire, anche da spento.
 */
export async function avviaCondotto (
  archivio: Archivio,
  opzioni: OpzioniCondotto = {},
): Promise<Condotto> {
  if (opzioni.cartellaUtente) cartellaUtenteVista = opzioni.cartellaUtente

  permessiScavalcati = opzioni.permessi ?? null
  const permessi = permessiOra()
  // Niente da concedere: non si apre un condotto che rifiuterebbe tutto.
  if (!permessi.lettura && !permessi.scrittura) {
    if (!dettoSpento) {
      dettoSpento = true
      // Due silenzi diversi: generale spento è il caso normale; generale acceso con
      // tutto negato sembra aperto e non lo è, e va detto.
      console.log(
        apparato.impostazioni.leggi('registroDocenti.api').get<boolean>('condotto', false)
          ? '[condotto] acceso ma senza concessioni: «registroDocenti.api.lettura» e ' +
            '«registroDocenti.api.scrittura» sono tutte e due spente, e un condotto che ' +
            'rifiuta ogni chiamata non vale un nome riservato. Non apre niente.'
          : '[condotto] spento. Si accende con «registroDocenti.api.condotto»: da acceso, ogni ' +
            'programma che gira con questo utente può leggere i dati delle persone in ' +
            'formazione, e con «registroDocenti.api.scrittura» scrivere nel registro e far ' +
            'partire posta a nome del docente.',
      )
    }
    return condottoSpento()
  }

  registraTutte()
  // Il segreto prima del nome, perché il nome lo contiene: vedi `FILE_SEGRETO`.
  const cartellaSegreto = cartellaUtenteVista ?? cartellaUtentePredefinita()
  // La chiave prima di tutto: se non si scrive, il condotto non si apre.
  const chiave = chiaveDelCondotto(cartellaSegreto)
  const segreto = process.platform === 'win32' ? segretoDelCondotto(cartellaSegreto) : null
  const indirizzo = indirizzoCondotto()

  // Un socket rimasto da una chiusura brutale impedirebbe l'ascolto. Toglierlo è
  // sicuro: il nome viene dall'impronta. Le named pipe non lasciano file.
  if (process.platform !== 'win32') await unlink(indirizzo).catch(() => undefined)

  const stato: StatoCondotto = { chiuso: false, chiave, sfideViste: new Set(), code: new Map() }
  const prese = new Set<Socket>()
  const server = createServer((presa) => {
    // Il tetto, detto: una busta e un `end`, non un `destroy`, perché «sono troppe»
    // è una diagnosi.
    if (prese.size >= MASSIMO_PRESE) {
      // Un ascoltatore di `'error'` anche qui (questa presa non passa da `servi`):
      // un `EPIPE` senza ascoltatori diventerebbe un'eccezione non catturata.
      presa.on('error', () => undefined)
      presa.end(bustaGuasto(null, CODICI_JSONRPC['non-disponibile'],
        testi().tutteOccupate(MASSIMO_PRESE), {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: [testi().siRiprova],
        }))
      return
    }
    prese.add(presa)
    // Alla chiusura la presa esce da `prese`, ma la sua coda no: la toglie
    // `accoda` in fondo. Così `svuota()` vede anche le notifiche di clienti già
    // usciti, che altrimenti scriverebbero dopo il salvataggio finale.
    presa.on('close', () => {
      prese.delete(presa)
    })
    servi(archivio, presa, stato)
  })

  await new Promise<void>((risolvi, rifiuta) => {
    const alGuasto = (male: Error & { code?: string }) => {
      // Ascolto fallito: si chiude il server, o resterebbe appeso al ciclo degli
      // eventi senza nessuno che chiami `dispose`. La chiave se ne va: la riga di
      // comando non manderà prove a chi occupa il nome.
      server.close()
      togliChiave(cartellaSegreto, chiave)
      // `EADDRINUSE` (unix) ed `EACCES` (Windows): quel nome è già di qualcuno. Una
      // copia del registro ancora viva, oppure un altro utente che l'ha occupato per
      // primo: la console deve dire dove guardare.
      if (male.code === 'EADDRINUSE' || male.code === 'EACCES') {
        rifiuta(new Error(testi().nomePreso(indirizzo)))
        return
      }
      rifiuta(male)
    }
    server.once('error', alGuasto)
    server.listen(indirizzo, () => {
      server.off('error', alGuasto)
      risolvi()
    })
  })

  // Solo il proprietario, subito: su unix il permesso del file è il controllo
  // d'accesso del socket.
  if (process.platform !== 'win32') await chmod(indirizzo, 0o600)

  // Dopo l'ascolto il guasto è una presa andata storta: si racconta e il
  // processo non cade.
  server.on('error', (male: Error) => {
    console.error('[condotto]', male.message)
  })

  const concesso = [
    permessi.lettura ? 'lettura' : null,
    permessi.scrittura ? 'scrittura' : null,
  ].filter((voce) => voce !== null).join(' e ')
  console.log(`[condotto] in ascolto su ${indirizzo} — concessa la ${concesso}`)

  /**
   * La chiusura in due tempi: prima si smette di accettare (server e, con
   * `stato.chiuso`, righe nuove sulle connessioni aperte, con un no che si
   * legge); poi si aspettano le chiamate già cominciate, perché la loro
   * scrittura entra comunque nell'archivio. L'attesa ha un tetto: passato, si
   * distrugge.
   */
  const svuota = async (): Promise<void> => {
    const attese = [...stato.code.values()]
    if (attese.length === 0) return
    let sveglia: NodeJS.Timeout | undefined
    const tetto = new Promise<void>((risolvi) => {
      sveglia = setTimeout(() => {
        console.error(
          `[condotto] ${attese.length} chiamate non sono finite entro ` +
          `${ATTESA_SVUOTAMENTO_MS} ms: si chiude lo stesso.`,
        )
        risolvi()
      }, ATTESA_SVUOTAMENTO_MS)
      // Il timer non deve tenere sveglio il processo durante lo spegnimento.
      sveglia.unref?.()
    })
    await Promise.race([Promise.allSettled(attese).then(() => undefined), tetto])
    if (sveglia) clearTimeout(sveglia)
  }

  let finito: Promise<void> | null = null
  const smaltitore = new apparato.Smaltitore(() => {
    stato.chiuso = true
    server.close()
    finito = svuota().then(() => {
      for (const presa of prese) presa.destroy()
      prese.clear()
      stato.code.clear()
      if (process.platform !== 'win32') void unlink(indirizzo).catch(() => undefined)
    })
    // Spenta la pipe, il suo nome (segreto compreso, visibile a tutti) resta
    // libero: un altro utente potrebbe occuparlo, e la riga di comando, trovando
    // ancora il segreto, parlerebbe con lui. Senza file dice «registro spento».
    if (segreto) togliSegreto(cartellaSegreto, segreto)
    togliChiave(cartellaSegreto, chiave)
  })

  return {
    dispose: () => smaltitore.dispose(),
    svuotato: () => finito ?? Promise.resolve(),
  }
}
