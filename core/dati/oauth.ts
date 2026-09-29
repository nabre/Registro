// L'accesso alla casella con l'account Microsoft (OAuth, gettone per XOAUTH2),
// l'unico modo: le password per le app i tenant delle scuole non le danno.
// Si entra dal browser di sistema con PKCE e un client pubblico di Microsoft
// (`idClientOauth()`); niente device code, che molti tenant bloccano. Il gettone di
// rinnovo sta nel portachiavi del sistema.

import * as crypto from 'node:crypto'
import * as http from 'node:http'

import * as apparato from 'apparato'

import { dominioDi, indirizziDellAccount } from '../dominio/mailbox.js'
import { parole } from '../dominio/words.testi.js'
import { lingua } from '../i18n/index.js'
import { testi } from './oauth.testi.js'

/**
 * I permessi chiesti: `SMTP.Send`, il più stretto per spedire, e
 * `offline_access` per il gettone di rinnovo (senza, si rientra ogni ora).
 * `openid email profile` non danno accesso a niente: fanno tornare chi è
 * entrato, con l'indirizzo di posta, per proporre il mittente.
 */
const PERMESSI = 'https://outlook.office.com/SMTP.Send offline_access openid email profile'

/**
 * Per gli alias, se il tenant lo concede: `User.Read` legge i
 * `proxyAddresses` del proprio profilo. Si chiede col gettone di rinnovo,
 * senza browser; negato, restano gli indirizzi detti all'accesso.
 */
const PERMESSI_PROFILO = 'https://graph.microsoft.com/User.Read'

/** Dove si va a chiedere, quando non si sa ancora di che tenant si tratta. */
const COMUNE = 'organizations'

/** Per che cosa si chiede il permesso: cambia che cosa dire quando la scuola lo nega. */
type ServizioMicrosoft = 'posta' | 'onedrive'

/**
 * La chiave del gettone di rinnovo nel portachiavi. Vale quanto una password,
 * perciò mai nelle impostazioni.
 */
const CHIAVE_RINNOVO = 'registroDocenti.posta.rinnovo'

/**
 * Gli indirizzi da cui l'account collegato può scrivere, letti all'accesso.
 * Non sono segreti, ma stanno col gettone: valgono finché vale lui.
 */
const CHIAVE_INDIRIZZI = 'registroDocenti.posta.indirizzi'

let portachiavi: apparato.DepositoSegreti | null = null

/** Gli indirizzi dell'account collegato, in memoria per la scheda della posta. */
let indirizziNoti: string[] = []

/**
 * Riceve il portachiavi all'avvio e guarda subito se c'è un gettone di rinnovo,
 * perché `oauthNoto()` risponda già all'apertura del pannello.
 */
export function registraPortachiaviOauth (segreti: apparato.DepositoSegreti): void {
  portachiavi = segreti
  void rinnovoSalvato()
  void segreti.get(CHIAVE_INDIRIZZI).then((scritto) => {
    indirizziNoti = leggiIndirizzi(scritto)
  })
}

function leggiIndirizzi (scritto: string | undefined): string[] {
  try {
    const letto: unknown = JSON.parse(scritto ?? '[]')
    return Array.isArray(letto) ? letto.filter((voce): voce is string => typeof voce === 'string') : []
  } catch {
    return []
  }
}

/** Gli indirizzi da cui l'account collegato può scrivere, detti da Microsoft all'accesso. */
export function indirizziPosta (): readonly string[] {
  return indirizziNoti
}

/** L'ultimo gettone d'accesso, solo in memoria, riusato finché vale. */
let inTasca: { gettone: string, scade: number } | null = null

/** Se, per quel che se ne sa senza aspettare, la casella è collegata. */
let notoRinnovabile = false

/**
 * L'applicazione con cui ci si presenta: «Microsoft Graph Command Line Tools»,
 * client pubblico senza segreti. Predefinita perché i docenti non possono
 * registrarne una propria; se il tenant rifiuta, serve il consenso di un
 * amministratore (`spiega()`). Ridefinibile via variabile d'ambiente.
 */
const CLIENT_PREDEFINITO = '14d82eec-204b-4c2f-b7e8-296a70dab67e'

function idClientOauth (): string {
  return process.env.REGIKLASS_OAUTH_CLIENT_ID ||
    process.env.REGICLASS_OAUTH_CLIENT_ID ||
    process.env.REGISTRO_OAUTH_CLIENT_ID ||
    CLIENT_PREDEFINITO
}

/** Il gettone di rinnovo dal portachiavi, se c'è. */
async function rinnovoSalvato (): Promise<string | null> {
  if (!portachiavi) return null
  const gettone = (await portachiavi.get(CHIAVE_RINNOVO)) ?? null
  notoRinnovabile = gettone !== null
  return gettone
}

/** Se l'account Microsoft risulta collegato, per quel che si sa senza aspettare. */
export function oauthNoto (): boolean {
  return notoRinnovabile
}

/** Dimentica i gettoni, nel portachiavi e in memoria. */
export async function dimenticaOauth (): Promise<void> {
  await portachiavi?.delete(CHIAVE_RINNOVO)
  notoRinnovabile = false
  inTasca = null
}

/** Azzera tutto: gettoni, indirizzi letti e tenant scoperti. */
export async function azzeraOauth (): Promise<void> {
  await dimenticaOauth()
  await portachiavi?.delete(CHIAVE_INDIRIZZI)
  indirizziNoti = []
  tenantConosciuti.clear()
}

// ------------------------------------------------------------------ il tenant

/** Quel che si è già scoperto: il dominio di posta e il tenant che gli sta dietro. */
const tenantConosciuti = new Map<string, string>()

/**
 * Il tenant di un indirizzo, scoperto dal dominio: la pagina si apre già sulla
 * scuola. Se la scoperta fallisce si ripiega su `ripiego` (`organizations` per
 * la posta, che esiste solo nei tenant).
 */
export async function tenantDi (indirizzo: string, ripiego = COMUNE): Promise<string> {
  const dominio = dominioDi(indirizzo)
  if (!dominio) return ripiego
  const gia = tenantConosciuti.get(dominio)
  if (gia) return gia

  try {
    const risposta = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(dominio)}/v2.0/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(ATTESA_MS) },
    )
    if (!risposta.ok) return ripiego
    const letto = (await risposta.json()) as { issuer?: string }
    // L'emittente è `https://login.microsoftonline.com/<tenant>/v2.0`: il
    // penultimo pezzo è il numero che serve.
    const pezzi = (letto.issuer ?? '').split('/')
    const tenant = pezzi[pezzi.length - 2] ?? ''
    if (!tenant) return ripiego
    tenantConosciuti.set(dominio, tenant)
    return tenant
  } catch {
    return ripiego
  }
}

/**
 * Quanto si aspetta Microsoft: `fetch` senza scadenza può restare appeso per
 * sempre, e `gettoneDaSpedire()` blocca l'intera spedizione.
 */
const ATTESA_MS = 15_000

// ------------------------------------------------------------------ il collegamento

/** Quel che Microsoft risponde quando il gettone arriva. */
export interface Gettoni {
  access_token?: string
  refresh_token?: string
  /** Con `openid`: chi è entrato, firmato da Microsoft. */
  id_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

async function aMicrosoft (tenant: string, dove: string, corpo: URLSearchParams): Promise<unknown> {
  const risposta = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/${dove}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
    signal: AbortSignal.timeout(ATTESA_MS),
  })
  return await risposta.json()
}

/** Com'è andato il collegamento con l'account. */
interface EsitoOauth {
  ok: boolean
  errore?: string
  /** Da che indirizzi l'account può scrivere, il principale per primo. */
  indirizzi?: string[]
}

/**
 * Collega la casella con l'account Microsoft, dal browser, e dice da quali
 * indirizzi l'account può scrivere: quelli che Microsoft mette nel gettone,
 * e gli alias del profilo se il tenant lascia leggerlo.
 */
export async function collegaConOauth (accesso: string): Promise<EsitoOauth> {
  if (!portachiavi) return { ok: false, errore: testi().senzaPortachiavi }

  // Il nome di accesso, non l'indirizzo: è quello che Microsoft conosce.
  const tenant = await tenantDi(accesso)
  const esito = await accediDalBrowser(tenant, accesso, PERMESSI, 'posta')
  if (!esito.ok) return { ok: false, errore: esito.errore }
  const tenuto = await tieni(esito.gettoni)
  if (!tenuto.ok) return tenuto

  const chi = {
    ...rivendicazioni(esito.gettoni.access_token),
    ...rivendicazioni(esito.gettoni.id_token),
  }
  const profilo = await profiloDaGraph(tenant, esito.gettoni.refresh_token ?? '')
  const indirizzi = indirizziDellAccount(
    [profilo.mail, chi.email, chi.upn, chi.preferred_username, chi.unique_name],
    profilo.proxyAddresses ?? [],
    accesso,
  )
  indirizziNoti = indirizzi
  await portachiavi.store(CHIAVE_INDIRIZZI, JSON.stringify(indirizzi))
  return { ok: true, indirizzi }
}

/**
 * Le rivendicazioni di un gettone JWT, senza verificarne la firma: arriva
 * direttamente dalla pagina dei gettoni di Microsoft, e serve solo a proporre
 * un indirizzo, non a decidere chi entra.
 */
function rivendicazioni (jwt: string | undefined): Record<string, string | undefined> {
  const corpo = jwt?.split('.')[1]
  if (!corpo) return {}
  try {
    const letto: unknown = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
    if (!letto || typeof letto !== 'object') return {}
    return Object.fromEntries(
      Object.entries(letto).filter(([, valore]) => typeof valore === 'string'),
    )
  } catch {
    return {}
  }
}

/**
 * Indirizzo principale e alias dal proprio profilo, con `User.Read`. Qualsiasi
 * rifiuto (consenso negato, rete) dà un profilo vuoto: gli alias sono un di più.
 */
async function profiloDaGraph (
  tenant: string,
  rinnovo: string,
): Promise<{ mail?: string, proxyAddresses?: string[] }> {
  try {
    const gettoni = await rinnovaConMicrosoft(tenant, rinnovo, PERMESSI_PROFILO)
    if (!gettoni.access_token) return {}
    const risposta = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,proxyAddresses', {
      headers: { authorization: `Bearer ${gettoni.access_token}` },
      signal: AbortSignal.timeout(ATTESA_MS),
    })
    if (!risposta.ok) return {}
    return (await risposta.json()) as { mail?: string, proxyAddresses?: string[] }
  } catch {
    return {}
  }
}

/**
 * Conserva i gettoni: rinnovo nel portachiavi, accesso in memoria. Senza
 * gettone di rinnovo non c'è collegamento: quello d'accesso dura un'ora.
 */
async function tieni (gettoni: Gettoni): Promise<EsitoOauth> {
  if (!gettoni.refresh_token || !gettoni.access_token) {
    return { ok: false, errore: spiega(gettoni.error, gettoni.error_description) }
  }
  await portachiavi?.store(CHIAVE_RINNOVO, gettoni.refresh_token)
  notoRinnovabile = true
  inTasca = {
    gettone: gettoni.access_token,
    scade: Date.now() + (gettoni.expires_in ?? 3600) * 1000,
  }
  return { ok: true }
}

// ------------------------------------------------------------------ dal browser

// Accesso dal browser di sistema (dove la sessione della scuola è già aperta)
// con ritorno su una porta locale. PKCE sostituisce il segreto che un
// programma sul computer di chi lo usa non può tenere: si manda l'impronta di
// un numero a caso, e il numero solo allo scambio finale.

/** Un numero a caso in base64url: il verificatore di PKCE, e lo stato. */
function aCaso (byte: number): string {
  return crypto.randomBytes(byte).toString('base64url')
}

/** L'impronta del verificatore, che è quel che si manda alla pagina. */
function impronta (verificatore: string): string {
  return crypto.createHash('sha256').update(verificatore).digest('base64url')
}

/** Quel che la pagina di Microsoft rimanda indietro sulla porta in ascolto. */
interface Ritorno {
  code?: string
  error?: string
  error_description?: string
  state?: string
}

/**
 * Apre una porta su `127.0.0.1` (scelta dal sistema, `listen(0)`) e aspetta
 * il ritorno da Microsoft. Si chiude solo sulla risposta con il nostro
 * `stato`: le altre ricevono 400 e l'attesa continua. Esportata per le prove.
 */
export async function aspettaIlRitorno (
  stato: string,
  quando: (indirizzo: string) => Promise<void>,
): Promise<Ritorno> {
  return await new Promise<Ritorno>((poi) => {
    let finito = false
    const chiudi = (esito: Ritorno): void => {
      if (finito) return
      finito = true
      clearTimeout(scadenza)
      server.close()
      poi(esito)
    }

    const server = http.createServer((richiesta, risposta) => {
      const letto = new URL(richiesta.url ?? '/', 'http://127.0.0.1')
      // Il browser chiede anche l'icona: non è la risposta che si aspetta.
      if (!letto.searchParams.has('code') && !letto.searchParams.has('error')) {
        risposta.writeHead(404).end()
        return
      }
      if (letto.searchParams.get('state') !== stato) {
        risposta.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
        risposta.end(testi().rispostaEstranea)
        return
      }
      risposta.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      risposta.end(paginaDiRitorno(letto.searchParams.get('error')))
      chiudi({
        code: letto.searchParams.get('code') ?? undefined,
        error: letto.searchParams.get('error') ?? undefined,
        error_description: letto.searchParams.get('error_description') ?? undefined,
        state: letto.searchParams.get('state') ?? undefined,
      })
    })

    server.on('error', (guasto) => {
      chiudi({ error: 'porta', error_description: guasto.message })
    })

    // Un quarto d'ora per accedere; poi non si resta in ascolto per sempre.
    const scadenza = setTimeout(() => chiudi({ error: 'scaduto' }), 15 * 60_000)

    server.listen(0, '127.0.0.1', () => {
      const dove = server.address()
      if (dove === null || typeof dove === 'string') {
        chiudi({ error: 'porta', error_description: testi().portaNonAperta })
        return
      }
      void quando(`http://localhost:${dove.port}`).catch((guasto: Error) => {
        chiudi({ error: 'browser', error_description: guasto.message })
      })
    })
  })
}

/** La pagina che il browser mostra dopo l'autorizzazione, per non lasciarla bianca. */
function paginaDiRitorno (errore: string | null): string {
  const t = testi()
  const titolo = errore ? t.nonAndata : parole().fatto
  const detto = errore ? t.permessoNegato : t.permessoRicevuto
  return (
    `<!doctype html><html lang="${lingua()}"><meta charset="utf-8">` +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    // testo-fisso: il marchio, uguale in ogni lingua
    `<title>${titolo} — Regiklass</title>` +
    '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;' +
    'min-height:100vh;padding:24px;color:#1b1b1b;background:#f6f6f4}' +
    'main{max-width:34rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}' +
    '@media (prefers-color-scheme:dark){body{color:#eee;background:#1b1b1b}}</style>' +
    `<main><h1>${titolo}</h1><p>${detto}</p></main>`
  )
}

/**
 * Il giro dal browser: pagina, ritorno, scambio del codice con i gettoni.
 * `state` distingue la risposta alla nostra richiesta da ogni altra. Non
 * conserva niente: i gettoni li tiene chi ha chiesto, ognuno nel suo posto.
 */
export async function accediDalBrowser (
  tenant: string,
  indirizzo: string,
  permessi: string,
  servizio: ServizioMicrosoft,
): Promise<{ ok: true, gettoni: Gettoni } | { ok: false, errore: string }> {
  const verificatore = aCaso(48)
  const stato = aCaso(16)
  let rimando = ''

  const ritorno = await apparato.dialoghi.conAvanzamento(
    {
      title: testi().accedi(indirizzo),
    },
    async () =>
      await aspettaIlRitorno(stato, async (dove) => {
        rimando = dove
        const pagina = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
        pagina.search = new URLSearchParams({
          client_id: idClientOauth(),
          response_type: 'code',
          redirect_uri: dove,
          response_mode: 'query',
          scope: permessi,
          state: stato,
          code_challenge: impronta(verificatore),
          code_challenge_method: 'S256',
          // Con più account nel browser evitano di autorizzare quello sbagliato.
          login_hint: indirizzo,
          prompt: 'select_account',
        }).toString()
        // `apri` non solleva ma torna falso: senza controllo si resterebbe in
        // ascolto un quarto d'ora per niente.
        if (!(await apparato.esterno.apri(apparato.Uri.parse(pagina.toString())))) {
          throw new Error(testi().browserNonAperto)
        }
      }),
  )

  if (ritorno.error === 'porta' || ritorno.error === 'browser') {
    return {
      ok: false,
      errore: testi().accessoNonAperto(ritorno.error_description ?? ritorno.error),
    }
  }
  if (ritorno.error === 'scaduto') {
    return { ok: false, errore: testi().tempoScaduto }
  }
  if (ritorno.error || !ritorno.code) {
    return { ok: false, errore: spiega(ritorno.error, ritorno.error_description, servizio) }
  }
  if (ritorno.state !== stato) {
    return { ok: false, errore: testi().rispostaAltrui }
  }

  const gettoni = (await aMicrosoft(
    tenant,
    'token',
    new URLSearchParams({
      client_id: idClientOauth(),
      grant_type: 'authorization_code',
      code: ritorno.code,
      redirect_uri: rimando,
      code_verifier: verificatore,
      scope: permessi,
    }),
  )) as Gettoni

  if (!gettoni.refresh_token || !gettoni.access_token) {
    return { ok: false, errore: spiega(gettoni.error, gettoni.error_description, servizio) }
  }
  return { ok: true, gettoni }
}

/** Un gettone d'accesso nuovo in cambio di quello di rinnovo, per quei permessi. */
export async function rinnovaConMicrosoft (
  tenant: string,
  rinnovo: string,
  permessi: string,
): Promise<Gettoni> {
  return (await aMicrosoft(
    tenant,
    'token',
    new URLSearchParams({
      client_id: idClientOauth(),
      grant_type: 'refresh_token',
      refresh_token: rinnovo,
      scope: permessi,
    }),
  )) as Gettoni
}

/**
 * Un gettone d'accesso buono adesso: quello in memoria se vale ancora almeno
 * un minuto (per non scadere a metà giro), altrimenti uno rinnovato.
 */
export async function gettoneDaSpedire (indirizzo: string): Promise<string | null> {
  if (inTasca && inTasca.scade - 60_000 > Date.now()) return inTasca.gettone

  const rinnovo = await rinnovoSalvato()
  if (!rinnovo) return null

  const risposta = await rinnovaConMicrosoft(await tenantDi(indirizzo), rinnovo, PERMESSI)

  if (!risposta.access_token) {
    // `invalid_grant` non guarisce da solo (password cambiata, autorizzazione
    // revocata): si butta, così il registro dice «da ricollegare».
    if (risposta.error === 'invalid_grant') await dimenticaOauth()
    throw new Error(spiega(risposta.error, risposta.error_description))
  }

  inTasca = {
    gettone: risposta.access_token,
    scade: Date.now() + (risposta.expires_in ?? 3600) * 1000,
  }
  // Microsoft può ruotare il gettone di rinnovo: si tiene sempre l'ultimo.
  if (risposta.refresh_token) await portachiavi?.store(CHIAVE_RINNOVO, risposta.refresh_token)
  return risposta.access_token
}

/** Gli errori di Microsoft (codici `AADSTS…`) tradotti in quel che c'è da fare. */
export function spiega (
  errore: string | undefined,
  dettaglio: string | undefined,
  servizio: ServizioMicrosoft = 'posta',
): string {
  const detto = `${errore ?? ''} ${dettaglio ?? ''}`.trim()
  const t = testi()

  if (errore === 'expired_token' || errore === 'code_expired') {
    return t.codiceScaduto
  }
  if (errore === 'authorization_declined') return t.rifiutata
  if (/AADSTS7000218/.test(detto)) return t.nonPubblico
  if (/AADSTS65002|AADSTS650052/.test(detto)) {
    return servizio === 'onedrive'
      ? t.consensoAmministratoreOneDrive(idClientOauth())
      : t.consensoAmministratore(idClientOauth())
  }
  if (/AADSTS7000215|invalid_client/.test(detto)) return t.clientSconosciuto(idClientOauth())
  if (/AADSTS50020|AADSTS500011/.test(detto)) return t.altraOrganizzazione
  if (/AADSTS65004|consent/i.test(detto)) return t.consensoNegato
  return detto || t.senzaPerche
}
