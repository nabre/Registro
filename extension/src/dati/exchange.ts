// Il collegamento diretto a Exchange: il registro parla con il server, non con
// un programma installato sopra.
//
// È la via che mancava. Fin qui, per spedire, ci voleva Outlook aperto sulla
// stessa macchina: funziona, ma solo su Windows, solo se Outlook c'è, e solo
// se i due programmi girano con gli stessi permessi — tre condizioni che il
// registro non controlla e che si scoprono rotte nel momento peggiore, con
// venticinque comunicazioni pronte da mandare.
//
// Qui il registro si collega da sé al server di posta della scuola e consegna
// il messaggio. Nessun programma di mezzo, nessun sistema operativo
// obbligatorio: funziona anche su un Mac, anche dentro una sessione remota,
// anche con Outlook chiuso.
//
// ## Perché SMTP e non Graph
//
// La via «moderna» sarebbe l'API Graph di Microsoft. Non si può percorrere: i
// permessi di posta di Graph vogliono un'applicazione registrata su Entra ID,
// e nel tenant di una scuola quella registrazione non la si può fare — la
// richiesta torna indietro con `AADSTS65002`. EWS, la via di prima, Microsoft
// l'ha chiusa all'autenticazione con password.
//
// Resta la consegna SMTP autenticata, che è quella che Exchange tiene aperta
// apposta per i programmi che devono spedire: `smtp.office365.com` sulla porta
// 587, canale cifrato con STARTTLS, e le credenziali della casella. Non è un
// ripiego: è il protocollo con cui Exchange si aspetta di essere usato da un
// programma, ed è l'unico che non chiede il permesso di nessun amministratore
// per essere scritto — anche se, come si legge più sotto, l'amministratore
// deve averlo lasciato acceso sulla casella.
//
// ## Dove sta la password
//
// Nel portachiavi del sistema, che lo shim espone come `SecretStorage`: il
// portachiavi di Windows, quello di macOS, il portafogli di GNOME. Non nelle
// impostazioni, che sono un file JSON in chiaro e finiscono su OneDrive; non
// nel registro, che sta su Git. Il registro la legge quando deve spedire e non
// la scrive da nessun'altra parte.
//
// Con la verifica in due passaggi accesa — e nella scuola lo è — la password
// della casella non basta e non funziona: ci vuole una «password per le app»,
// generata dal proprio profilo Microsoft. È una password diversa, che vale
// solo per questo, e che si revoca da sola senza toccare l'account.

import { hostname } from 'node:os'
import { connect as connettiTcp, type Socket } from 'node:net'
import { connect as connettiTls, type TLSSocket } from 'node:tls'
import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import {
  componiPerInvio,
  destinatariBusta,
  type MessaggioFallito,
  type MessaggioPosta,
} from '../dominio/comunicazioni.js'
import {
  contoOauth,
  dimenticaOauth,
  gettoneDaSpedire,
  guidaRegistrazione,
  modoAccesso,
  oauthNoto,
} from './oauth.js'
import { casella, type Casella } from './casella.js'

/** Quanto si aspetta una risposta del server prima di dire che non arriva. */
const ATTESA = 30_000

/**
 * La chiave sotto cui sta la password nel portachiavi del sistema.
 *
 * Una sola per tutte le cartelle di lavoro: il portachiavi è dell'utente, non
 * della cartella aperta, ed è giusto così — la casella della scuola è una, e
 * ricollegarla ogni volta che si cambia cartella non lo vuole nessuno.
 */
const CHIAVE = 'registroDocenti.posta.password'

/**
 * Il portachiavi, che arriva dall'attivazione.
 *
 * `SecretStorage` non si costruisce qui: arriva dall'avvio, dentro il contesto.
 * Sta qui in un posto solo perché lo vogliono in tre — chi collega l'account,
 * chi spedisce, chi controlla il collegamento — e passarselo di funzione in
 * funzione fino in fondo non aggiunge niente.
 */
let portachiavi: vscode.SecretStorage | null = null

/**
 * L'ultima cosa che si sa del portachiavi: se una password c'era.
 *
 * Il portachiavi si legge solo aspettando, e c'è un posto che non può
 * aspettare: lo stato che il pannello spinge al webview, che parte a ogni
 * modifica del registro e dev'essere pronto nello stesso istante. Da lì si
 * legge questa, che è vera dal momento in cui la password è stata letta o
 * scritta e falsa dal momento in cui è stata tolta.
 *
 * È una copia, e come tutte le copie può essere vecchia di un istante: a
 * decidere se si spedisce davvero è sempre il portachiavi, letto per intero.
 * Questa serve solo a disegnare una pastiglia.
 */
let notoCollegato = false

/** L'attivazione consegna il portachiavi: senza, il registro non sa spedire. */
export function registraPortachiavi (segreti: vscode.SecretStorage): void {
  portachiavi = segreti
  // Si va a guardare subito: al primo stato spinto al pannello la risposta
  // dev'esserci già, e chiederla allora sarebbe tardi.
  void password()
}

/** Se, per quel che se ne sa senza aspettare, l'account è collegato. */
export function collegatoNoto (): boolean {
  if (!contoScritto()) return false
  if (modoAccesso() === 'oauth') return Boolean(contoOauth().clientId) && oauthNoto()
  return notoCollegato
}

/** Dove si spedisce e con che nome ci si presenta. */
export interface ContoExchange {
  server: string
  porta: number
  /** Con che nome si entra: il login del tenant, quello che vuole l'autenticazione. */
  utente: string
  /** Da che indirizzo si scrive: quello che va in `MAIL FROM` e in «Da». */
  mittente: string
}

/**
 * Il conto come sta scritto nelle impostazioni.
 *
 * I due nomi arrivano dalla casella già completati l'uno con l'altro: qui non
 * si decide più niente su chi entra e chi scrive. Sta in `dominio/casella.ts`,
 * ed è lo stesso posto da cui leggono Outlook e il file `.eml` — così la sigla
 * di accesso va all'autenticazione e l'indirizzo con il nome va nella busta,
 * da qualunque parte esca il messaggio.
 */
export function conto (): ContoExchange {
  const impostazioni = vscode.workspace.getConfiguration('registroDocenti.posta')
  const suo = casella()
  return {
    server: (impostazioni.get<string>('server') ?? 'smtp.office365.com').trim(),
    porta: impostazioni.get<number>('porta') ?? 587,
    utente: suo?.accesso ?? '',
    mittente: suo?.mittente ?? '',
  }
}

/** Se c'è abbastanza scritto per provarci: un server e un nome. */
export function contoScritto (): boolean {
  const suo = conto()
  return Boolean(suo.server && suo.utente)
}

/** La password dal portachiavi, se qualcuno l'ha messa. */
export async function password (): Promise<string | null> {
  if (!portachiavi) return null
  const segreto = (await portachiavi.get(CHIAVE)) ?? null
  notoCollegato = segreto !== null
  return segreto
}

/** Mette la password nel portachiavi. */
export async function salvaPassword (segreto: string): Promise<void> {
  if (!portachiavi) throw new Error('Il portachiavi del sistema non è disponibile.')
  await portachiavi.store(CHIAVE, segreto)
  notoCollegato = true
}

/**
 * Scollega la casella: la password e il gettone spariscono tutti e due.
 *
 * Tutti e due e non solo quello in uso: chi scollega vuole che il registro non
 * possa più spedire, e lasciare indietro la chiave dell'altro modo vorrebbe
 * dire tornare a spedire cambiando un'impostazione.
 */
export async function dimenticaPassword (): Promise<void> {
  await portachiavi?.delete(CHIAVE)
  notoCollegato = false
  await dimenticaOauth()
}

/**
 * Che cosa si porta al server per entrare: un gettone, o una password.
 *
 * Sono due modi di dire la stessa cosa — «sono io» — e il resto del
 * collegamento non ha motivo di sapere quale dei due sia stato usato. Torna
 * `null` quando non c'è niente da portare: la casella non è collegata.
 */
type Credenziale =
  | { modo: 'oauth', valore: string }
  | { modo: 'password', valore: string }

async function credenziale (utente: string): Promise<Credenziale | null> {
  const modo = modoAccesso()
  if (modo === 'oauth') {
    const gettone = await gettoneDaSpedire(utente)
    return gettone ? { modo: 'oauth', valore: gettone } : null
  }
  const segreto = await password()
  return segreto ? { modo: 'password', valore: segreto } : null
}

/** Se il registro ha tutto quel che serve per spedire da sé, adesso. */
export async function collegato (): Promise<boolean> {
  if (!contoScritto()) return false
  if (modoAccesso() === 'oauth') return Boolean(contoOauth().clientId) && oauthNoto()
  return Boolean(await password())
}

/** Com'è andata a bussare al server. */
export interface EsitoExchange {
  ok: boolean
  /** Il server con cui si è parlato, quando ci si è riusciti. */
  dove: string
  errore?: string
}

/** Com'è andato un giro di invii. */
export interface EsitoInvio {
  ok: boolean
  /** Quanti messaggi il server ha preso in carico. */
  quante: number
  /** Quelli rimasti indietro, uno per uno, per posizione nell'elenco. */
  falliti: MessaggioFallito[]
  errore?: string
}

// ------------------------------------------------------------------ il colloquio

/** Una risposta del server: il numero, e quel che c'era scritto accanto. */
interface RispostaSmtp {
  codice: number
  testo: string
}

/**
 * Il filo aperto con il server, e le regole per parlarci.
 *
 * SMTP è un botta e risposta: si scrive una riga, si aspetta un numero. La
 * parte che non si vede è che una risposta può occupare più righe — il server
 * elenca quel che sa fare — e finisce solo quando arriva una riga in cui dopo
 * il numero c'è uno spazio invece di un trattino. Leggere una riga alla volta
 * senza saperlo vuol dire scambiare metà elenco per la risposta al comando
 * dopo, e da lì in poi si parla sfasati.
 */
class Colloquio {
  private presa: Socket | TLSSocket
  private avanzo = ''
  private righe: string[] = []
  private inAttesa: { risolvi: (r: RispostaSmtp) => void, rifiuta: (e: Error) => void } | null = null
  private guasto: Error | null = null

  constructor (presa: Socket | TLSSocket) {
    this.presa = presa
    this.aggancia()
  }

  private aggancia (): void {
    // I pezzi restano byte e non stringhe: sopra questo filo, dopo lo
    // STARTTLS, ci va montato il canale cifrato, e un filo messo in modalità
    // testo consegnerebbe l'handshake a noi invece che a chi lo deve leggere.
    // Le risposte SMTP sono ASCII: tradurle qui non costa niente.
    this.presa.setTimeout(ATTESA)
    this.presa.on('data', (pezzo: Buffer) => this.mangia(pezzo))
    this.presa.on('error', (errore: Error) => this.rompi(errore))
    this.presa.on('timeout', () => this.rompi(new Error('Il server non risponde.')))
    this.presa.on('close', () => this.rompi(new Error('Il server ha chiuso il collegamento.')))
  }

  /**
   * Molla il filo e lo restituisce nudo, per montarci sopra la cifratura.
   *
   * Va fatto prima di alzare il canale cifrato e non dopo: finché questi
   * ascolti sono attaccati, i byte dell'handshake arrivano qui invece che a
   * chi li deve leggere, e la cifratura non si stabilisce mai.
   */
  molla (): Socket {
    this.presa.removeAllListeners()
    this.presa.setTimeout(0)
    return this.presa as Socket
  }

  /** Prende il filo cifrato al posto di quello di prima. */
  sostituisci (presa: TLSSocket): void {
    this.presa = presa
    this.avanzo = ''
    this.righe = []
    this.aggancia()
  }

  private mangia (pezzo: Buffer): void {
    this.avanzo += pezzo.toString('utf8')
    let taglio = this.avanzo.indexOf('\r\n')
    while (taglio >= 0) {
      this.righe.push(this.avanzo.slice(0, taglio))
      this.avanzo = this.avanzo.slice(taglio + 2)
      taglio = this.avanzo.indexOf('\r\n')
    }
    this.consegna()
  }

  /** Se fra le righe arrivate c'è una risposta intera, la dà a chi l'aspetta. */
  private consegna (): void {
    if (!this.inAttesa) return
    const fine = this.righe.findIndex((riga) => /^\d{3}(?: |$)/.test(riga))
    if (fine < 0) return
    const parte = this.righe.splice(0, fine + 1)
    const chi = this.inAttesa
    this.inAttesa = null
    chi.risolvi({
      codice: Number(parte[parte.length - 1].slice(0, 3)),
      testo: parte.map((riga) => riga.slice(4)).join(' ').trim(),
    })
  }

  private rompi (errore: Error): void {
    // Il primo guasto è quello che spiega; quelli dopo sono conseguenze.
    this.guasto ??= errore
    const chi = this.inAttesa
    this.inAttesa = null
    chi?.rifiuta(this.guasto)
  }

  /** Aspetta la prossima risposta intera. */
  async leggi (): Promise<RispostaSmtp> {
    if (this.guasto) throw this.guasto
    return await new Promise<RispostaSmtp>((risolvi, rifiuta) => {
      this.inAttesa = { risolvi, rifiuta }
      this.consegna()
    })
  }

  /** Scrive senza aspettare risposta: serve al corpo del messaggio. */
  butta (testo: string): void {
    this.presa.write(testo)
  }

  /** Dice una riga e aspetta il numero che il server risponde. */
  async chiedi (riga: string): Promise<RispostaSmtp> {
    if (this.guasto) throw this.guasto
    this.presa.write(`${riga}\r\n`)
    return await this.leggi()
  }

  /**
   * Come `chiedi`, ma un numero fuori posto è un errore e non un valore da
   * guardare. Serve dove la risposta sbagliata non ha rimedio: se il server
   * rifiuta lo STARTTLS non c'è un piano B da provare, c'è da fermarsi.
   */
  async pretendi (riga: string, atteso: number): Promise<RispostaSmtp> {
    const risposta = await this.chiedi(riga)
    if (Math.floor(risposta.codice / 100) !== Math.floor(atteso / 100)) {
      throw new Error(`${risposta.codice} ${risposta.testo}`)
    }
    return risposta
  }

  chiudi (): void {
    try {
      this.presa.write('QUIT\r\n')
    } catch {
      // Il filo era già caduto: non cambia niente, si chiude lo stesso.
    }
    this.presa.removeAllListeners()
    this.presa.destroy()
  }
}

/** Apre il filo, cifrato subito sulla 465 e in chiaro sulle altre. */
async function apri (server: string, porta: number): Promise<Socket | TLSSocket> {
  return await new Promise<Socket | TLSSocket>((risolvi, rifiuta) => {
    const presa =
      porta === 465
        ? connettiTls({ host: server, port: porta, servername: server })
        : connettiTcp({ host: server, port: porta })
    const alGuasto = (errore: Error): void => {
      presa.removeAllListeners()
      presa.destroy()
      rifiuta(errore)
    }
    presa.setTimeout(ATTESA, () => {
      alGuasto(new Error(`${server} non risponde sulla porta ${porta}.`))
    })
    presa.once(porta === 465 ? 'secureConnect' : 'connect', () => {
      presa.removeListener('error', alGuasto)
      presa.setTimeout(0)
      risolvi(presa)
    })
    presa.once('error', alGuasto)
  })
}

/** Alza il canale cifrato sopra il filo in chiaro, dopo lo STARTTLS. */
async function cifra (presa: Socket, server: string): Promise<TLSSocket> {
  return await new Promise<TLSSocket>((risolvi, rifiuta) => {
    const sicura = connettiTls({ socket: presa, servername: server })
    const alGuasto = (errore: Error): void => { rifiuta(errore) }
    sicura.once('secureConnect', () => {
      sicura.removeListener('error', alGuasto)
      risolvi(sicura)
    })
    sicura.once('error', alGuasto)
  })
}

/** Come ci si presenta al server. Un nome qualunque non va bene: dev'essere uno. */
function nomeDelCliente (): string {
  return hostname().replace(/[^A-Za-z0-9.-]/g, '') || 'registro-docenti'
}

/** Il saluto di apertura, che arriva da solo appena il filo è aperto. */
async function attendi (colloquio: Colloquio, atteso: number): Promise<RispostaSmtp> {
  const risposta = await colloquio.leggi()
  if (risposta.codice !== atteso) throw new Error(`${risposta.codice} ${risposta.testo}`)
  return risposta
}

/**
 * Il saluto, il canale cifrato e l'autenticazione: tutto quel che c'è da fare
 * prima di poter consegnare qualcosa.
 *
 * La cifratura non è opzionale. Se il server non offre STARTTLS il collegamento
 * si ferma qui, e non si ripiega sul chiaro: quel che passerebbe di lì sono la
 * password della casella e gli indirizzi di venticinque famiglie.
 */
async function entra (suo: ContoExchange, chiave: Credenziale): Promise<Colloquio> {
  const colloquio = new Colloquio(await apri(suo.server, suo.porta))
  try {
    await attendi(colloquio, 220)

    const io = nomeDelCliente()
    let saluto = await colloquio.pretendi(`EHLO ${io}`, 250)

    if (suo.porta !== 465) {
      if (!/STARTTLS/i.test(saluto.testo)) {
        throw new Error(
          `${suo.server} non offre un canale cifrato sulla porta ${suo.porta}: ` +
            'di qui non passano né la password né gli indirizzi.',
        )
      }
      await colloquio.pretendi('STARTTLS', 220)
      colloquio.sostituisci(await cifra(colloquio.molla(), suo.server))
      // Dopo la cifratura ci si ripresenta: quel che il server aveva detto
      // prima non vale più, e le voci di AUTH compaiono solo adesso.
      saluto = await colloquio.pretendi(`EHLO ${io}`, 250)
    }

    await autentica(colloquio, saluto.testo, suo.utente, chiave)
    return colloquio
  } catch (errore) {
    colloquio.chiudi()
    throw errore
  }
}

/** In base64, come vuole ogni passo dell'autenticazione SMTP. */
function in64 (testo: string): string {
  return Buffer.from(testo, 'utf8').toString('base64')
}

/**
 * L'autenticazione con il gettone dell'account Microsoft.
 *
 * Il rifiuto arriva in una forma tutta sua, e va saputa o si legge un guasto
 * che non dice niente: invece di rispondere «no», il server manda una sfida —
 * un `334` con dentro, in base64, il motivo vero — e resta lì ad aspettare. Ci
 * si risponde con una riga vuota, e solo allora arriva il verdetto. Chi non lo
 * sa vede il collegamento piantarsi senza spiegazioni.
 */
async function autenticaConGettone (
  colloquio: Colloquio,
  utente: string,
  gettone: string,
): Promise<void> {
  // I separatori sono byte uno, non spazi: è la forma che XOAUTH2 vuole.
  const detto = in64(`user=${utente}\u0001auth=Bearer ${gettone}\u0001\u0001`)
  const risposta = await colloquio.chiedi(`AUTH XOAUTH2 ${detto}`)
  if (Math.floor(risposta.codice / 100) === 2) return

  if (risposta.codice === 334) {
    const motivo = leggiSfida(risposta.testo)
    // La riga vuota che chiude la sfida: senza, il server resta in attesa e il
    // collegamento non si chiude né va avanti.
    await colloquio.chiedi('')
    throw new Error(motivo)
  }
  throw new Error(`${risposta.codice} ${risposta.testo}`)
}

/** Il motivo del rifiuto, che il server manda in base64 dentro la sfida. */
function leggiSfida (sfida: string): string {
  try {
    const letto = JSON.parse(Buffer.from(sfida.trim(), 'base64').toString('utf8')) as {
      status?: string
    }
    return `Il gettone non è stato accettato (${letto.status ?? 'senza codice'}).`
  } catch {
    return 'Il gettone non è stato accettato.'
  }
}

/**
 * L'autenticazione, nel modo che il server dichiara di sapere.
 *
 * Con l'account Microsoft si va di `XOAUTH2` e non c'è altro da provare: se il
 * server non lo offre, quella casella non è di Microsoft 365 e il gettone lì
 * non vale niente.
 *
 * Con la password, `LOGIN` prima di `PLAIN` perché è quello che Exchange
 * annuncia sempre e che accetta senza discutere. `PLAIN` resta per i server di
 * posta di altra specie, che ci si potrebbe trovare configurati.
 */
async function autentica (
  colloquio: Colloquio,
  offerte: string,
  utente: string,
  chiave: Credenziale,
): Promise<void> {
  if (chiave.modo === 'oauth') {
    if (!/AUTH[^\r\n]*\bXOAUTH2\b/i.test(offerte)) {
      throw new Error(
        'Il server non accetta l’accesso con l’account Microsoft: su una casella che non è ' +
          'di Microsoft 365 va usata la password.',
      )
    }
    await autenticaConGettone(colloquio, utente, chiave.valore)
    return
  }

  const segreto = chiave.valore
  if (/AUTH[^\r\n]*\bLOGIN\b/i.test(offerte)) {
    await colloquio.pretendi('AUTH LOGIN', 334)
    await colloquio.pretendi(in64(utente), 334)
    await colloquio.pretendi(in64(segreto), 235)
    return
  }
  if (/AUTH[^\r\n]*\bPLAIN\b/i.test(offerte)) {
    // I separatori sono byte zero e non spazi: la forma che PLAIN vuole e'
    // `\u0000utente\u0000password`, e qualunque altra cosa al loro posto fa
    // rifiutare l'autenticazione senza dire perche'.
    await colloquio.pretendi(`AUTH PLAIN ${in64(`\u0000${utente}\u0000${segreto}`)}`, 235)
    return
  }
  throw new Error(
    'Il server non accetta l’autenticazione con nome e password: ' +
      'sulla casella la consegna SMTP autenticata è spenta.',
  )
}

/**
 * Il guasto tradotto in quel che c'è da fare.
 *
 * I codici di Exchange sono precisi e i loro messaggi no: `535 5.7.139` vuol
 * dire due cose diverse a seconda di che cosa manca, e nessuna delle due sta
 * scritta nella riga che il server manda indietro. Sono le cause vere di un
 * collegamento che non parte, e distinguerle qui vale un pomeriggio.
 */
export function rimedio (detto: string): string {
  if (/SmtpClientAuthentication is disabled/i.test(detto)) {
    return (
      'Il tenant tiene spenta la consegna SMTP autenticata: nessuna password la fa ' +
      'funzionare. Va chiesto all’amministratore di accenderla sulla casella ' +
      '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). Fino ad allora restano le bozze.'
    )
  }
  // Lo stesso codice vuol dire due cose diverse a seconda di come si è entrati,
  // e mandare chi usa l'account Microsoft a cercare una password che non ha
  // sarebbe il modo migliore di fargli perdere un pomeriggio.
  const conGettone = modoAccesso() !== 'password'

  if (/5\.7\.139|basic authentication is disabled/i.test(detto)) {
    return conGettone
      ? 'Exchange rifiuta il gettone: sulla casella la consegna SMTP autenticata è spenta, ' +
        'e va accesa da chi amministra il tenant.'
      : 'Exchange non accetta questa password. Con la verifica in due passaggi accesa la ' +
        'password della casella non vale: ci vuole una «password per le app», generata dal ' +
        'proprio profilo Microsoft, da incollare al posto di quella.'
  }
  if (/\b535\b|authentication unsuccessful|5\.7\.3\b/i.test(detto)) {
    return conGettone
      ? 'Il gettone non è stato accettato. O l’autorizzazione è scaduta — allora si rifà il ' +
        'collegamento — o sulla casella la consegna SMTP è spenta, e allora la riaccende chi ' +
        `amministra il tenant. (${detto})`
      : `Nome o password non accettati: ${detto}`
  }
  if (/5\.7\.60|does not have permissions to send as/i.test(detto)) {
    return (
      'La casella con cui si è entrati non può spedire da quell’indirizzo: ' +
      '«registroDocenti.posta.mittente» dev’essere un indirizzo della casella in cui si entra ' +
      'con «registroDocenti.posta.utente», o uno da cui si è autorizzati a spedire.'
    )
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(detto)) {
    return `Il server non si trova: controlla «registroDocenti.posta.server». (${detto})`
  }
  if (/ECONNREFUSED|ETIMEDOUT|non risponde/i.test(detto)) {
    return (
      `Il server non risponde: ${detto} ` +
      'Da una rete che blocca la porta di consegna il collegamento non si apre — succede ' +
      'con certe reti di ospiti e con qualche antivirus.'
    )
  }
  return detto
}

/**
 * Bussa al server e se ne va: entra, si autentica, saluta e chiude.
 *
 * È la prova del collegamento, e non manda niente a nessuno. Serve prima di
 * accendere l'invio diretto: «collegato, sì, ma a che cosa, e con che
 * credenziali» è una domanda a cui fin qui si poteva rispondere solo mandando
 * una mail vera a qualcuno.
 */
export async function provaExchange (): Promise<EsitoExchange> {
  const suo = conto()
  if (!contoScritto()) {
    return { ok: false, dove: '', errore: 'Manca l’indirizzo con cui spedire.' }
  }
  if (modoAccesso() === 'oauth' && !contoOauth().clientId) {
    return { ok: false, dove: '', errore: guidaRegistrazione() }
  }


  try {
    const chiave = await credenziale(suo.utente)
    if (!chiave) {
      return {
        ok: false,
        dove: '',
        errore:
          modoAccesso() === 'password'
            ? 'L’account non è collegato: manca la password.'
            : 'L’account non è collegato: manca l’autorizzazione di Microsoft.',
      }
    }
    const colloquio = await entra(suo, chiave)
    colloquio.chiudi()
    return { ok: true, dove: `${suo.server}:${suo.porta}` }
  } catch (errore) {
    return { ok: false, dove: '', errore: rimedio((errore as Error).message) }
  }
}

/**
 * Prova una coppia di credenziali senza salvarla.
 *
 * È il passo di mezzo del collegamento: si chiede la password, si va a vedere
 * se il server la accetta, e solo dopo la si mette nel portachiavi. Salvare
 * prima di provare vorrebbe dire tenersi in casa una password sbagliata e
 * scoprirlo al primo giro di comunicazioni.
 */
export async function provaCredenziali (
  chi: Casella,
  segreto: string,
): Promise<EsitoExchange> {
  const suo = { ...conto(), utente: chi.accesso, mittente: chi.mittente }
  try {
    const colloquio = await entra(suo, { modo: 'password', valore: segreto })
    colloquio.chiudi()
    return { ok: true, dove: `${suo.server}:${suo.porta}` }
  } catch (errore) {
    return { ok: false, dove: '', errore: rimedio((errore as Error).message) }
  }
}

/**
 * Consegna i messaggi al server, uno dopo l'altro sullo stesso filo.
 *
 * Un filo solo per tutto il giro, e non uno per messaggio: aprire venticinque
 * volte il canale cifrato e rifare venticinque volte l'autenticazione è lento,
 * e a Exchange somiglia a un attacco — dopo un po' comincia a rispondere di
 * riprovare più tardi.
 *
 * Uno che va storto non ferma gli altri. In un giro di venticinque, un
 * indirizzo scritto male farebbe restare senza comunicazione le sette famiglie
 * che vengono dopo: si manda `RSET`, si riparte pulito, e chi ha chiamato
 * riceve l'elenco di chi è rimasto indietro. È la differenza fra un giro
 * fallito e diciassette famiglie avvisate.
 */
export async function spedisciConExchange (messaggi: MessaggioPosta[]): Promise<EsitoInvio> {
  if (messaggi.length === 0) return { ok: true, quante: 0, falliti: [] }

  const suo = conto()
  let colloquio: Colloquio
  try {
    // Il gettone si chiede adesso, non a ogni messaggio: uno solo vale per
    // tutto il giro, e se è scaduto è qui che si rinnova — non in mezzo alla
    // diciottesima comunicazione.
    const chiave = contoScritto() ? await credenziale(suo.utente) : null
    if (!chiave) {
      return { ok: false, quante: 0, falliti: [], errore: 'L’account non è collegato.' }
    }
    colloquio = await entra(suo, chiave)
  } catch (errore) {
    return { ok: false, quante: 0, falliti: [], errore: rimedio((errore as Error).message) }
  }

  const falliti: MessaggioFallito[] = []
  let quante = 0

  try {
    for (const [indice, messaggio] of messaggi.entries()) {
      try {
        await consegna(colloquio, messaggio, suo.mittente)
        quante += 1
      } catch (errore) {
        falliti.push({ indice, errore: rimedio((errore as Error).message) })
        // Si rimette il server in ordine prima del prossimo: dopo un rifiuto
        // resta a metà di una busta, e il messaggio dopo finirebbe attaccato
        // ai destinatari di quello di prima.
        try {
          await colloquio.chiedi('RSET')
        } catch {
          // Il filo è caduto: quel che resta lo dirà l'errore del prossimo.
        }
      }
    }
  } finally {
    colloquio.chiudi()
  }

  return {
    ok: quante > 0 || falliti.length === 0,
    quante,
    falliti,
    errore: quante === 0 && falliti.length > 0 ? falliti[0].errore : undefined,
  }
}

/**
 * Un messaggio solo: la busta, poi il testo.
 *
 * La busta e il messaggio dicono cose diverse ed è voluto: nella busta ci sono
 * tutti gli indirizzi — anche quelli in copia nascosta — perché sono quelli
 * che il server deve raggiungere; nel messaggio no, perché quelli sono quelli
 * che i destinatari leggeranno.
 */
async function consegna (
  colloquio: Colloquio,
  messaggio: MessaggioPosta,
  da: string,
): Promise<void> {
  const destinatari = destinatariBusta(messaggio)
  if (destinatari.length === 0) throw new Error('Nessun destinatario.')

  await colloquio.pretendi(`MAIL FROM:<${messaggio.da ?? da}>`, 250)

  // Un indirizzo rifiutato non è un messaggio perso: gli altri lo ricevono lo
  // stesso, e chi non l'ha ricevuto sta scritto nell'errore in fondo. Un
  // elenco in cui *nessuno* è stato accettato invece è un guasto, e si ferma.
  const rifiutati: string[] = []
  for (const indirizzo of destinatari) {
    const risposta = await colloquio.chiedi(`RCPT TO:<${indirizzo}>`)
    if (Math.floor(risposta.codice / 100) !== 2) {
      rifiutati.push(`${indirizzo} (${risposta.codice} ${risposta.testo})`)
    }
  }
  if (rifiutati.length === destinatari.length) {
    throw new Error(`Nessun destinatario accettato: ${rifiutati.join('; ')}`)
  }

  await colloquio.pretendi('DATA', 354)
  colloquio.butta(perFilo(componiPerInvio(messaggio, new Date(), randomBytes(6).toString('hex'))))
  const esito = await colloquio.chiedi('.')
  if (Math.floor(esito.codice / 100) !== 2) throw new Error(`${esito.codice} ${esito.testo}`)

  if (rifiutati.length > 0) throw new Error(`Spedito, ma non a: ${rifiutati.join('; ')}`)
}

/**
 * Il messaggio pronto per il filo.
 *
 * Una riga che comincia con un punto va raddoppiata, e il motivo è che il
 * punto da solo su una riga è il modo con cui si dice al server «ho finito».
 * Un messaggio che ne contiene una — e un testo incollato da un documento la
 * può contenere — finirebbe tagliato lì, con il resto letto come comandi. In
 * fondo va il punto vero, preceduto da un a capo.
 */
function perFilo (messaggio: string): string {
  const corretto = messaggio.replace(/\r\n\./g, '\r\n..').replace(/^\./, '..')
  return corretto.endsWith('\r\n') ? `${corretto}.\r\n` : `${corretto}\r\n.\r\n`
}
