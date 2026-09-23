// Il collegamento diretto a Exchange: il registro parla con il server, non con
// un programma installato sopra.
//
// Il registro si collega da sé al server di posta della scuola e consegna il
// messaggio. Nessun programma di mezzo, nessun sistema operativo obbligatorio:
// funziona anche su un Mac, anche dentro una sessione remota, anche con il
// programma di posta chiuso.
//
// ## Perché SMTP, e non l'API di Microsoft
//
// L'alternativa era Graph, ed è stata scritta e poi tolta. Faceva nascere il
// messaggio dentro la casella sul server — bozze vere, rileggibili dal
// telefono, copia in «Posta inviata» — e per farlo voleva `Mail.ReadWrite`,
// cioè il permesso di leggere *tutta* la casella. Un registro di classe deve
// spedire e nient'altro: `SMTP.Send` è il permesso più stretto che esista per
// questo, e non lascia leggere niente. Fra un programma che può leggere la
// posta di chi lo usa e uno che non può, per trecento righe di comodità in
// più, si sceglie il secondo.
//
// Il prezzo è quello che SMTP ha sempre avuto: consegna e basta. Niente bozze
// sul server — le fa il file `.eml` su questo disco — nessuna copia in «Posta
// inviata», e l'amministratore deve aver lasciato acceso
// `SmtpClientAuthentication` sulla casella, cosa che nei tenant nuovi è spenta
// di serie e si riaccende chiedendolo.
//
// ## Dove sta quel che apre la casella
//
// Nel portachiavi del sistema, che lo shim espone come `DepositoSegreti`: il
// portachiavi di Windows, quello di macOS, il portafogli di GNOME. Non nelle
// impostazioni, che sono un file JSON in chiaro e finiscono su OneDrive; non
// nel registro, che sta su Git. Non è una password: è un gettone di Microsoft,
// e lo tiene `oauth.ts`. Qui si chiede quando si deve spedire, e non si scrive
// da nessun'altra parte.

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

/** Quanto si aspetta una risposta del server prima di dire che non arriva. */
const ATTESA = 30_000

/**
 * Dove si consegna. Non è un'impostazione, ed è voluto.
 *
 * Il registro entra con un gettone di Microsoft, chiesto per la risorsa
 * `outlook.office.com` e valido solo lì: puntarlo a un altro server non
 * darebbe un altro modo di spedire, darebbe un rifiuto. Finché l'accesso è
 * quello di Microsoft, il server è questo — e una casella che si può scrivere
 * ma non cambiare davvero è peggio che nessuna casella: invita a provare, e la
 * prova finisce con un errore di rete che parla d'altro.
 *
 * `587` con STARTTLS è l'unica porta che Exchange Online tiene aperta alla
 * consegna autenticata.
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
 * Il conto come sta scritto nelle impostazioni.
 *
 * I due nomi arrivano dalla casella già completati l'uno con l'altro: qui non
 * si decide più niente su chi entra e chi scrive. Sta in `domain/mailbox.ts`,
 * ed è lo stesso posto da cui legge il file `.eml` — così la sigla di accesso
 * va all'autenticazione e l'indirizzo con il nome va nella busta, da qualunque
 * parte esca il messaggio.
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
      alGuasto(new Error(`${server} non risponde sulla porta ${PORTA}.`))
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
 * si ferma qui, e non si ripiega sul chiaro: quel che passerebbe di lì sono il
 * gettone della casella e gli indirizzi di venticinque famiglie.
 */
async function entra (suo: ContoExchange, gettone: string): Promise<Colloquio> {
  const colloquio = new Colloquio(await apri(suo.server))
  try {
    await attendi(colloquio, 220)

    const io = nomeDelCliente()
    const inChiaro = await colloquio.pretendi(`EHLO ${io}`, 250)

    if (!/STARTTLS/i.test(inChiaro.testo)) {
      throw new Error(
        `${suo.server} non offre un canale cifrato: di qui non passano né il gettone né gli ` +
          'indirizzi delle famiglie.',
      )
    }
    await colloquio.pretendi('STARTTLS', 220)
    colloquio.sostituisci(await cifra(colloquio.molla(), suo.server))
    // Dopo la cifratura ci si ripresenta: quel che il server aveva detto prima
    // non vale più, e le voci di AUTH compaiono solo adesso.
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
 * L'autenticazione: `XOAUTH2`, e non c'è altro da provare.
 *
 * Se il server non lo offre, quella casella non è di Microsoft 365 e il
 * gettone lì non vale niente. C'era anche `AUTH LOGIN`, per la «password per
 * le app»: è caduta con il modo password — vedi il cappello di `oauth.ts`.
 */
async function autentica (
  colloquio: Colloquio,
  offerte: string,
  utente: string,
  gettone: string,
): Promise<void> {
  if (!/AUTH[^\r\n]*\bXOAUTH2\b/i.test(offerte)) {
    throw new Error(
      'Il server non accetta l’accesso con l’account Microsoft: questa casella non è di ' +
        'Microsoft 365, e il registro non sa entrarci.',
    )
  }
  await autenticaConGettone(colloquio, utente, gettone)
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
      'Il tenant tiene spenta la consegna SMTP autenticata: nessun gettone la fa ' +
      'funzionare. Va chiesto all’amministratore di accenderla sulla casella ' +
      '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). Fino ad allora restano le bozze.'
    )
  }
  if (/5\.7\.139|basic authentication is disabled/i.test(detto)) {
    return (
      'Exchange rifiuta il gettone: sulla casella la consegna SMTP autenticata è spenta, ' +
      'e va accesa da chi amministra il tenant.'
    )
  }
  if (/\b535\b|authentication unsuccessful|5\.7\.3\b/i.test(detto)) {
    return (
      'Il gettone non è stato accettato. O l’autorizzazione è scaduta — allora si rifà il ' +
      'collegamento — o sulla casella la consegna SMTP è spenta, e allora la riaccende chi ' +
      `amministra il tenant. (${detto})`
    )
  }
  if (/5\.7\.60|does not have permissions to send as/i.test(detto)) {
    return (
      'La casella con cui si è entrati non può spedire da quell’indirizzo: ' +
      '«registroDocenti.posta.mittente» dev’essere un indirizzo della casella in cui si entra ' +
      'con «registroDocenti.posta.utente», o uno da cui si è autorizzati a spedire.'
    )
  }
  // Il tetto di Exchange Online: una trentina di messaggi al minuto per casella.
  // Superato, il server risponde 421 / 4.4.2 o chiude il filo, e da lì ogni
  // messaggio del giro fallisce con la stessa riga. Non è un guasto della casella
  // né della rete: basta aspettare.
  if (/\b421\b|\b4\.4\.2\b|\brate\b|exceeded|Il server ha chiuso il collegamento/i.test(detto)) {
    return (
      'Exchange ha smesso di accettare messaggi per un po’: ne sono partiti troppi in poco ' +
      `tempo. Si riprova fra un minuto con quelli rimasti. (${detto})`
    )
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(detto)) {
    return `${SERVER} non si trova: il computer non arriva al DNS, o la rete lo blocca. (${detto})`
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
  try {
    const gettone = await gettoneDaSpedire(suo.utente)
    if (!gettone) {
      return {
        ok: false,
        dove: '',
        errore: 'L’account non è collegato: manca l’autorizzazione di Microsoft.',
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
 * Da quanti messaggi in su si rallenta, e di quanto.
 *
 * Exchange Online accetta una trentina di messaggi al minuto per casella con
 * SMTP autenticato; al trentunesimo risponde 421 o chiude il filo, e con un filo
 * solo per tutto il giro vuol dire che tutti quelli dopo finiscono fra i
 * falliti. Sotto la soglia si va di corsa come sempre; sopra, un messaggio ogni
 * poco più di due secondi, che fa ventotto al minuto: una classe intera parte in
 * un minuto e mezzo invece di fermarsi a metà.
 */
const SOGLIA_LENTA = 25
const PAUSA_MS = 2_100

/** Quanto aspettare fra un messaggio e l'altro, per un giro di `quanti`. */
export function pausaFraMessaggi (quanti: number): number {
  return quanti > SOGLIA_LENTA ? PAUSA_MS : 0
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
/**
 * `dopoOgni`, se c'è, si chiama subito dopo ogni messaggio con il suo indice e
 * con com'è andata: serve a chi deve segnare gli inviati uno per volta, e non
 * a giro finito — un giro lento dura più di un minuto, e può interrompersi.
 */
export async function spedisciConExchange (
  messaggi: MessaggioPosta[],
  dopoOgni?: (indice: number, ok: boolean) => void,
): Promise<EsitoInvio> {
  if (messaggi.length === 0) return { ok: true, quante: 0, falliti: [] }

  const suo = conto()
  let colloquio: Colloquio
  try {
    // Il gettone si chiede adesso, non a ogni messaggio: uno solo vale per
    // tutto il giro, e se è scaduto è qui che si rinnova — non in mezzo alla
    // diciottesima comunicazione.
    const gettone = contoScritto() ? await gettoneDaSpedire(suo.utente) : null
    if (!gettone) {
      return { ok: false, quante: 0, falliti: [], errore: 'L’account non è collegato.' }
    }
    colloquio = await entra(suo, gettone)
  } catch (errore) {
    return { ok: false, quante: 0, falliti: [], errore: rimedio((errore as Error).message) }
  }

  const falliti: MessaggioFallito[] = []
  let quante = 0
  const pausa = pausaFraMessaggi(messaggi.length)

  try {
    for (const [indice, messaggio] of messaggi.entries()) {
      if (indice > 0 && pausa > 0) await new Promise((risolvi) => setTimeout(risolvi, pausa))
      let ok = false
      try {
        await consegna(colloquio, messaggio, suo.mittente)
        quante += 1
        ok = true
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
      // Fuori dal `try` di sopra, e con uno suo: un guasto di chi ascolta non è
      // un messaggio fallito, e non deve fermare quelli che restano.
      try {
        dopoOgni?.(indice, ok)
      } catch (errore) {
        console.error('[exchange] dopoOgni:', errore)
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

  // Una riga sola, come i `RCPT TO` di `destinatariBusta`: un a capo nel mittente
  // sarebbe un comando in più sul filo.
  const mittente = (messaggio.da ?? da).replace(/[\r\n]+/g, ' ')
  await colloquio.pretendi(`MAIL FROM:<${mittente}>`, 250)

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
  // Si legge e basta: il punto finale l'ha gia' scritto `perFilo`, come dice il
  // suo ultimo capoverso. Mandarne un secondo con `chiedi('.')` — che e' quel
  // che si faceva — lasciava sul filo un comando «.» che il server non
  // conosce: il 250 del messaggio veniva letto qui, quindi il primo invio
  // sembrava riuscito, ma il 500 del punto di troppo restava in coda e
  // sfasava tutte le risposte del messaggio dopo. Su un giro di invii — una
  // richiesta di firma per persona, una consegna a testa — partiva solo il
  // primo.
  const esito = await colloquio.leggi()
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
