// Consegna diretta a Exchange Online via SMTP con XOAUTH2, senza programmi di
// posta di mezzo. SMTP perché `SMTP.Send` è il permesso più stretto: niente
// accesso in lettura alla casella, niente copia in «Posta inviata».
// Richiede `SmtpClientAuthentication` acceso sulla casella. Il gettone lo tiene
// `oauth.ts` nel portachiavi del sistema; qui si chiede solo per spedire.

import { hostname } from 'node:os'
import { connect as connettiTcp, type Socket } from 'node:net'
import { connect as connettiTls, type TLSSocket } from 'node:tls'
import { randomBytes } from 'node:crypto'

import {
  componiPerInvio,
  destinatariBusta,
  type MessaggioFallito,
  type MessaggioPosta,
} from '../domain/communications.js'
import { gettoneDaSpedire, oauthNoto } from './oauth.js'
import { casella } from './mailbox.js'
import { testi } from './exchange.testi.js'

/** Quanto si aspetta una risposta del server prima di dire che non arriva. */
const ATTESA = 30_000

/**
 * Dove si consegna, fisso: il gettone vale solo per `outlook.office.com`.
 * `587` con STARTTLS è l'unica porta di Exchange Online per la consegna autenticata.
 */
const SERVER = 'smtp.office365.com'
const PORTA = 587

/** Dove si spedisce e con che nome ci si presenta. */
interface ContoExchange {
  server: string
  /** Con che nome si entra: il login del tenant, quello che vuole l'autenticazione. */
  utente: string
  /** Da che indirizzo si scrive: quello che va in `MAIL FROM` e in «Da». */
  mittente: string
}

/**
 * Il conto dalle impostazioni. Accesso e mittente arrivano già completati
 * dalla casella (`domain/mailbox.ts`), la stessa fonte del file `.eml`.
 */
export function conto (): ContoExchange {
  const suo = casella()
  return { server: SERVER, utente: suo?.accesso ?? '', mittente: suo?.mittente ?? '' }
}

/** Se c'è abbastanza scritto per provarci: un nome con cui entrare. */
export function contoScritto (): boolean {
  return Boolean(conto().utente)
}

/** Se, per quel che se ne sa senza aspettare, l'account è collegato. */
export function collegatoNoto (): boolean {
  return contoScritto() && oauthNoto()
}

/** Se il registro ha tutto quel che serve per spedire da sé, adesso. */
export async function collegato (): Promise<boolean> {
  return collegatoNoto()
}

/** Com'è andata a bussare al server. */
interface EsitoExchange {
  ok: boolean
  /** Il server con cui si è parlato, quando ci si è riusciti. */
  dove: string
  errore?: string
}

/** Com'è andato un giro di invii. */
interface EsitoInvio {
  ok: boolean
  /** Quanti messaggi il server ha preso in carico. */
  quante: number
  /** Quelli rimasti indietro, uno per uno, per posizione nell'elenco. */
  falliti: MessaggioFallito[]
  /**
   * Partiti ma con indirizzi rifiutati: contati in `quante` (rimandarli li
   * duplicherebbe), qui c'è chi è rimasto fuori.
   */
  parziali: MessaggioFallito[]
  errore?: string
}

// ------------------------------------------------------------------ il colloquio

/** Una risposta del server: il numero, e quel che c'era scritto accanto. */
interface RispostaSmtp {
  codice: number
  testo: string
}

/**
 * Il filo aperto con il server. Una risposta SMTP può occupare più righe e
 * finisce con la riga in cui dopo il codice c'è uno spazio e non un trattino:
 * leggere riga per riga sfaserebbe le risposte.
 */
class Colloquio {
  private presa: Socket | TLSSocket
  private avanzo = ''
  private righe: string[] = []
  private inAttesa: {
    risolvi: (r: RispostaSmtp) => void
    rifiuta: (e: Error) => void
  } | null = null
  private guasto: Error | null = null

  constructor (presa: Socket | TLSSocket) {
    this.presa = presa
    this.aggancia()
  }

  private aggancia (): void {
    // Il filo resta in byte, non in modalità testo: dopo lo STARTTLS ci si
    // monta sopra il TLS. Le risposte SMTP sono ASCII e si decodificano qui.
    this.presa.setTimeout(ATTESA)
    this.presa.on('data', (pezzo: Buffer) => this.mangia(pezzo))
    this.presa.on('error', (errore: Error) => this.rompi(errore))
    this.presa.on('timeout', () => this.rompi(new Error(testi().serverMuto)))
    this.presa.on('close', () => this.rompi(new Error(testi().chiuso)))
  }

  /**
   * Stacca gli ascolti e restituisce il filo nudo. Va fatto prima del TLS,
   * altrimenti i byte dell'handshake arrivano qui.
   */
  molla (): Socket {
    this.presa.removeAllListeners()
    this.presa.setTimeout(0)
    return this.presa
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

  /** Come `chiedi`, ma una classe di codice diversa da `atteso` solleva. */
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
      // Il filo era già caduto: si chiude lo stesso.
    }
    this.presa.removeAllListeners()
    this.presa.destroy()
  }
}

/** Apre il filo in chiaro: la cifratura arriva subito dopo, con lo STARTTLS. */
async function apri (server: string): Promise<Socket> {
  return await new Promise<Socket>((risolvi, rifiuta) => {
    const presa = connettiTcp({ host: server, port: PORTA })
    const alGuasto = (errore: Error): void => {
      presa.removeAllListeners()
      presa.destroy()
      rifiuta(errore)
    }
    presa.setTimeout(ATTESA, () => {
      alGuasto(new Error(testi().portaMuta(server, PORTA)))
    })
    presa.once('connect', () => {
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

/** Il nome per `EHLO`: il nome della macchina ripulito, o `regiclass`. */
function nomeDelCliente (): string {
  return hostname().replace(/[^A-Za-z0-9.-]/g, '') || 'regiclass'
}

/** Legge una risposta non sollecitata (il saluto d'apertura) e pretende `atteso`. */
async function attendi (colloquio: Colloquio, atteso: number): Promise<RispostaSmtp> {
  const risposta = await colloquio.leggi()
  if (risposta.codice !== atteso) throw new Error(`${risposta.codice} ${risposta.testo}`)
  return risposta
}

/**
 * Saluto, STARTTLS e autenticazione. Senza STARTTLS ci si ferma: in chiaro
 * passerebbero gettone e indirizzi.
 */
async function entra (suo: ContoExchange, gettone: string): Promise<Colloquio> {
  const colloquio = new Colloquio(await apri(suo.server))
  try {
    await attendi(colloquio, 220)

    const io = nomeDelCliente()
    // testo-fisso: un comando SMTP, lo legge il server
    const inChiaro = await colloquio.pretendi(`EHLO ${io}`, 250)

    if (!/STARTTLS/i.test(inChiaro.testo)) {
      throw new Error(testi().senzaCifratura(suo.server))
    }
    await colloquio.pretendi('STARTTLS', 220)
    colloquio.sostituisci(await cifra(colloquio.molla(), suo.server))
    // Dopo la cifratura si ripete EHLO: le voci AUTH compaiono solo adesso.
    // testo-fisso: un comando SMTP, lo legge il server
    const saluto = await colloquio.pretendi(`EHLO ${io}`, 250)

    await autentica(colloquio, saluto.testo, suo.utente, gettone)
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
 * Autenticazione XOAUTH2. Il rifiuto arriva come sfida `334` con il motivo in
 * base64, e il server aspetta una riga vuota prima del verdetto.
 */
async function autenticaConGettone (
  colloquio: Colloquio,
  utente: string,
  gettone: string,
): Promise<void> {
  // I separatori sono byte uno, non spazi: è la forma che XOAUTH2 vuole.
  const detto = in64(`user=${utente}\u0001auth=Bearer ${gettone}\u0001\u0001`)
  // testo-fisso: un comando SMTP, lo legge il server
  const risposta = await colloquio.chiedi(`AUTH XOAUTH2 ${detto}`)
  if (Math.floor(risposta.codice / 100) === 2) return

  if (risposta.codice === 334) {
    const motivo = leggiSfida(risposta.testo)
    // La riga vuota che chiude la sfida: senza, il server resta in attesa.
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
    return testi().gettoneRifiutatoPerche(letto.status ?? testi().senzaCodice)
  } catch {
    return testi().gettoneRifiutato
  }
}

/** Solo `XOAUTH2`: se il server non lo offre, la casella non è di Microsoft 365. */
async function autentica (
  colloquio: Colloquio,
  offerte: string,
  utente: string,
  gettone: string,
): Promise<void> {
  if (!/AUTH[^\r\n]*\bXOAUTH2\b/i.test(offerte)) {
    throw new Error(testi().nonMicrosoft)
  }
  await autenticaConGettone(colloquio, utente, gettone)
}

/**
 * Il guasto tradotto in quel che c'è da fare: i messaggi di Exchange non
 * dicono la causa, i codici sì.
 */
export function rimedio (detto: string): string {
  const t = testi()
  // I guasti scritti dal registro, in tutte le lingue: può essere cambiata nel frattempo.
  const tutte = testi.tutte()
  const chiuso = tutte.some((parole) => detto.includes(parole.chiuso))
  const muto = tutte.some((parole) => detto.includes(parole.sintomoMuto))
  if (/SmtpClientAuthentication is disabled/i.test(detto)) return t.smtpSpentoNelTenant
  if (/5\.7\.139|basic authentication is disabled/i.test(detto)) return t.smtpSpentoSullaCasella
  if (/\b535\b|authentication unsuccessful|5\.7\.3\b/i.test(detto)) return t.gettoneScadutoOSpento(detto)
  if (/5\.7\.60|does not have permissions to send as/i.test(detto)) return t.mittenteNonConcesso
  // Il tetto di Exchange Online (circa 30 messaggi al minuto): 421 / 4.4.2 o
  // filo chiuso. Basta aspettare.
  if (/\b421\b|\b4\.4\.2\b|\brate\b|exceeded/i.test(detto) || chiuso) return t.troppiMessaggi(detto)
  if (/ENOTFOUND|EAI_AGAIN/i.test(detto)) return t.serverIntrovabile(SERVER, detto)
  if (/ECONNREFUSED|ETIMEDOUT/i.test(detto) || muto) return t.reteChiusa(detto)
  return detto
}

/** Prova il collegamento: entra, si autentica e chiude, senza mandare niente. */
export async function provaExchange (): Promise<EsitoExchange> {
  const suo = conto()
  if (!contoScritto()) {
    return { ok: false, dove: '', errore: testi().senzaMittente }
  }
  try {
    const gettone = await gettoneDaSpedire(suo.utente)
    if (!gettone) {
      return {
        ok: false,
        dove: '',
        errore: testi().senzaAutorizzazione,
      }
    }
    const colloquio = await entra(suo, gettone)
    colloquio.chiudi()
    return { ok: true, dove: suo.server }
  } catch (errore) {
    return { ok: false, dove: '', errore: rimedio((errore as Error).message) }
  }
}

/**
 * Da quanti messaggi in su si rallenta, e di quanto: Exchange Online accetta
 * circa 30 messaggi al minuto per casella, e un messaggio ogni 2,1 s ne fa 28.
 */
const SOGLIA_LENTA = 25
const PAUSA_MS = 2_100

/** Quanto aspettare fra un messaggio e l'altro, per un giro di `quanti`. */
export function pausaFraMessaggi (quanti: number): number {
  return quanti > SOGLIA_LENTA ? PAUSA_MS : 0
}

/**
 * Consegna i messaggi su un filo solo (riautenticarsi a ogni messaggio è lento
 * e Exchange lo frena). Un messaggio fallito non ferma gli altri. `dopoOgni`
 * si chiama subito dopo ciascuno, perché un giro lento può interrompersi.
 */
export async function spedisciConExchange (
  messaggi: MessaggioPosta[],
  dopoOgni?: (indice: number, ok: boolean) => void,
): Promise<EsitoInvio> {
  if (messaggi.length === 0) return { ok: true, quante: 0, falliti: [], parziali: [] }

  const suo = conto()
  let colloquio: Colloquio
  try {
    // Un gettone per tutto il giro: se è scaduto si rinnova qui, non a metà.
    const gettone = contoScritto() ? await gettoneDaSpedire(suo.utente) : null
    if (!gettone) {
      return {
        ok: false,
        quante: 0,
        falliti: [],
        parziali: [],
        errore: testi().nonCollegato,
      }
    }
    colloquio = await entra(suo, gettone)
  } catch (errore) {
    return {
      ok: false,
      quante: 0,
      falliti: [],
      parziali: [],
      errore: rimedio((errore as Error).message),
    }
  }

  try {
    return await giroSulFilo(colloquio, messaggi, suo.mittente, dopoOgni)
  } finally {
    colloquio.chiudi()
  }
}

/** Quel che il giro chiede al filo: il `Colloquio`, o un finto nelle prove. */
type Filo = Pick<Colloquio, 'chiedi' | 'pretendi' | 'butta' | 'leggi'>

/**
 * Il giro vero e proprio, su un filo già aperto e autenticato. Chi chiama lo
 * chiude. Esportato per le prove, che gli danno un server finto.
 */
export async function giroSulFilo (
  colloquio: Filo,
  messaggi: MessaggioPosta[],
  mittente: string,
  dopoOgni?: (indice: number, ok: boolean) => void,
): Promise<EsitoInvio> {
  const falliti: MessaggioFallito[] = []
  const parziali: MessaggioFallito[] = []
  let quante = 0
  const pausa = pausaFraMessaggi(messaggi.length)

  for (const [indice, messaggio] of messaggi.entries()) {
    if (indice > 0 && pausa > 0) await new Promise((risolvi) => setTimeout(risolvi, pausa))
    let ok = false
    try {
      const rifiutati = await consegna(colloquio, messaggio, mittente)
      quante += 1
      ok = true
      if (rifiutati.length > 0) {
        const errore = testi().speditoMaNonA(rifiutati.join('; '))
        console.warn(`[exchange] messaggio ${indice}: ${errore}`)
        parziali.push({ indice, errore })
      }
    } catch (errore) {
      falliti.push({ indice, errore: rimedio((errore as Error).message) })
      // `RSET`: dopo un rifiuto il server resta a metà busta, e il prossimo
      // messaggio erediterebbe i destinatari.
      try {
        await colloquio.chiedi('RSET')
      } catch {
        // Filo caduto: lo dirà l'errore del prossimo.
      }
    }
    // Un `try` a parte: un guasto di chi ascolta non è un messaggio fallito.
    try {
      dopoOgni?.(indice, ok)
    } catch (errore) {
      console.error('[exchange] dopoOgni:', errore)
    }
  }

  return {
    ok: quante > 0 || falliti.length === 0,
    quante,
    falliti,
    parziali,
    errore: quante === 0 && falliti.length > 0 ? falliti[0].errore : undefined,
  }
}

/**
 * Un messaggio: busta, poi testo. Torna gli indirizzi rifiutati se è partito
 * verso gli altri. La busta contiene anche le copie nascoste, il testo no.
 */
async function consegna (
  colloquio: Filo,
  messaggio: MessaggioPosta,
  da: string,
): Promise<string[]> {
  const destinatari = destinatariBusta(messaggio)
  if (destinatari.length === 0) throw new Error(testi().nessunDestinatario)

  // Una riga sola: un a capo nel mittente sarebbe un comando in più sul filo.
  const mittente = (messaggio.da ?? da).replace(/[\r\n]+/g, ' ')
  // testo-fisso: un comando SMTP, lo legge il server
  await colloquio.pretendi(`MAIL FROM:<${mittente}>`, 250)

  // Un indirizzo rifiutato non ferma il messaggio; nessuno accettato sì.
  const rifiutati: string[] = []
  for (const indirizzo of destinatari) {
    // testo-fisso: un comando SMTP, lo legge il server
    const risposta = await colloquio.chiedi(`RCPT TO:<${indirizzo}>`)
    if (Math.floor(risposta.codice / 100) !== 2) {
      rifiutati.push(`${indirizzo} (${risposta.codice} ${risposta.testo})`)
    }
  }
  if (rifiutati.length === destinatari.length) {
    throw new Error(testi().nessunoAccettato(rifiutati.join('; ')))
  }

  await colloquio.pretendi('DATA', 354)
  colloquio.butta(perFilo(componiPerInvio(messaggio, new Date(), randomBytes(6).toString('hex'))))
  // Solo lettura: il punto finale l'ha già scritto `perFilo`. Un secondo «.»
  // lascerebbe in coda un 500 che sfasa le risposte del messaggio dopo.
  const esito = await colloquio.leggi()
  if (Math.floor(esito.codice / 100) !== 2) throw new Error(`${esito.codice} ${esito.testo}`)

  // Partito: i rifiutati si segnalano a parte, non come invio fallito, perché
  // ripetere l'invio lo duplicherebbe per gli altri.
  return rifiutati
}

/**
 * Il messaggio pronto per il filo: i punti a inizio riga si raddoppiano (un
 * punto da solo chiuderebbe il messaggio) e in fondo va il punto finale.
 */
function perFilo (messaggio: string): string {
  const corretto = messaggio.replace(/\r\n\./g, '\r\n..').replace(/^\./, '..')
  return corretto.endsWith('\r\n') ? `${corretto}.\r\n` : `${corretto}\r\n.\r\n`
}
