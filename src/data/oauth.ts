// L'accesso alla casella con l'account Microsoft (OAuth, gettone per XOAUTH2),
// l'unico modo: le password per le app i tenant delle scuole non le danno.
// Si entra dal browser di sistema con PKCE e un client pubblico di Microsoft
// (`CLIENT`); niente device code, che molti tenant bloccano. Il gettone di
// rinnovo sta nel portachiavi del sistema.

import * as crypto from 'node:crypto'
import * as http from 'node:http'

import * as apparato from 'apparato'

import { dominioDi, type Casella } from '../domain/mailbox.js'
import { parole } from '../domain/words.testi.js'
import { lingua } from '../i18n/index.js'
import { testi } from './oauth.testi.js'

/**
 * I permessi chiesti: `SMTP.Send`, il più stretto per spedire, e
 * `offline_access` per il gettone di rinnovo (senza, si rientra ogni ora).
 */
const PERMESSI = 'https://outlook.office.com/SMTP.Send offline_access'

/** Dove si va a chiedere, quando non si sa ancora di che tenant si tratta. */
const COMUNE = 'organizations'

/**
 * La chiave del gettone di rinnovo nel portachiavi. Vale quanto una password,
 * perciò mai nelle impostazioni.
 */
const CHIAVE_RINNOVO = 'registroDocenti.posta.rinnovo'

let portachiavi: apparato.DepositoSegreti | null = null

/**
 * Riceve il portachiavi all'avvio e guarda subito se c'è un gettone di rinnovo,
 * perché `oauthNoto()` risponda già all'apertura del pannello.
 */
export function registraPortachiaviOauth (segreti: apparato.DepositoSegreti): void {
  portachiavi = segreti
  void rinnovoSalvato()
}

/** L'ultimo gettone d'accesso, solo in memoria, riusato finché vale. */
let inTasca: { gettone: string, scade: number } | null = null

/** Se, per quel che se ne sa senza aspettare, la casella è collegata. */
let notoRinnovabile = false

/**
 * L'applicazione con cui ci si presenta: «Microsoft Graph Command Line Tools»,
 * client pubblico senza segreti. Fissa perché i docenti non possono registrarne
 * una propria; se il tenant rifiuta, serve il consenso di un amministratore
 * (`spiega()`).
 */
const CLIENT = '14d82eec-204b-4c2f-b7e8-296a70dab67e'

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

/** Azzera tutto: gettone di rinnovo, gettone d'accesso e tenant scoperti. */
export async function azzeraOauth (): Promise<void> {
  await dimenticaOauth()
  tenantConosciuti.clear()
}

// ------------------------------------------------------------------ il tenant

/** Quel che si è già scoperto: il dominio di posta e il tenant che gli sta dietro. */
const tenantConosciuti = new Map<string, string>()

/**
 * Il tenant di un indirizzo, scoperto dal dominio: la pagina si apre già sulla
 * scuola. Se la scoperta fallisce si ripiega su `organizations`.
 */
async function tenantDi (indirizzo: string): Promise<string> {
  const dominio = dominioDi(indirizzo)
  if (!dominio) return COMUNE
  const gia = tenantConosciuti.get(dominio)
  if (gia) return gia

  try {
    const risposta = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(dominio)}/v2.0/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(ATTESA_MS) },
    )
    if (!risposta.ok) return COMUNE
    const letto = (await risposta.json()) as { issuer?: string }
    // L'emittente è `https://login.microsoftonline.com/<tenant>/v2.0`: il
    // penultimo pezzo è il numero che serve.
    const pezzi = (letto.issuer ?? '').split('/')
    const tenant = pezzi[pezzi.length - 2] ?? ''
    if (!tenant) return COMUNE
    tenantConosciuti.set(dominio, tenant)
    return tenant
  } catch {
    return COMUNE
  }
}

/**
 * Quanto si aspetta Microsoft: `fetch` senza scadenza può restare appeso per
 * sempre, e `gettoneDaSpedire()` blocca l'intera spedizione.
 */
const ATTESA_MS = 15_000

// ------------------------------------------------------------------ il collegamento

/** Quel che Microsoft risponde quando il gettone arriva. */
interface Gettoni {
  access_token?: string
  refresh_token?: string
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
}

/** Collega la casella con l'account Microsoft, dal browser. */
export async function collegaConOauth (suo: Casella): Promise<EsitoOauth> {
  if (!portachiavi) return { ok: false, errore: testi().senzaPortachiavi }

  // Il nome di accesso, non l'indirizzo: è quello che Microsoft conosce.
  return await collegaDalBrowser(await tenantDi(suo.accesso), suo.accesso)
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
    `<title>${titolo} — Regiclass</title>` +
    '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;' +
    'min-height:100vh;padding:24px;color:#1b1b1b;background:#f6f6f4}' +
    'main{max-width:34rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}' +
    '@media (prefers-color-scheme:dark){body{color:#eee;background:#1b1b1b}}</style>' +
    `<main><h1>${titolo}</h1><p>${detto}</p></main>`
  )
}

/**
 * Il giro dal browser: pagina, ritorno, scambio del codice con i gettoni.
 * `state` distingue la risposta alla nostra richiesta da ogni altra.
 */
async function collegaDalBrowser (tenant: string, indirizzo: string): Promise<EsitoOauth> {
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
          client_id: CLIENT,
          response_type: 'code',
          redirect_uri: dove,
          response_mode: 'query',
          scope: PERMESSI,
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
    return { ok: false, errore: spiega(ritorno.error, ritorno.error_description) }
  }
  if (ritorno.state !== stato) {
    return { ok: false, errore: testi().rispostaAltrui }
  }

  const gettoni = (await aMicrosoft(
    tenant,
    'token',
    new URLSearchParams({
      client_id: CLIENT,
      grant_type: 'authorization_code',
      code: ritorno.code,
      redirect_uri: rimando,
      code_verifier: verificatore,
      scope: PERMESSI,
    }),
  )) as Gettoni

  return await tieni(gettoni)
}

/**
 * Un gettone d'accesso buono adesso: quello in memoria se vale ancora almeno
 * un minuto (per non scadere a metà giro), altrimenti uno rinnovato.
 */
export async function gettoneDaSpedire (indirizzo: string): Promise<string | null> {
  if (inTasca && inTasca.scade - 60_000 > Date.now()) return inTasca.gettone

  const rinnovo = await rinnovoSalvato()
  if (!rinnovo) return null

  const tenant = await tenantDi(indirizzo)
  const risposta = (await aMicrosoft(
    tenant,
    'token',
    new URLSearchParams({
      client_id: CLIENT,
      grant_type: 'refresh_token',
      refresh_token: rinnovo,
      scope: PERMESSI,
    }),
  )) as Gettoni

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
function spiega (errore: string | undefined, dettaglio: string | undefined): string {
  const detto = `${errore ?? ''} ${dettaglio ?? ''}`.trim()
  const t = testi()

  if (errore === 'expired_token' || errore === 'code_expired') {
    return t.codiceScaduto
  }
  if (errore === 'authorization_declined') return t.rifiutata
  if (/AADSTS7000218/.test(detto)) return t.nonPubblico
  if (/AADSTS65002|AADSTS650052/.test(detto)) return t.consensoAmministratore(CLIENT)
  if (/AADSTS7000215|invalid_client/.test(detto)) return t.clientSconosciuto(CLIENT)
  if (/AADSTS50020|AADSTS500011/.test(detto)) return t.altraOrganizzazione
  if (/AADSTS65004|consent/i.test(detto)) return t.consensoNegato
  return detto || t.senzaPerche
}
