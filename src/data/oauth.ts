// L'accesso alla casella con l'account Microsoft, invece che con una password.
//
// È il modo con cui Microsoft vuole che si entri, ed è rimasto l'unico. Il
// registro sapeva entrare anche con una «password per le app»: quella strada è
// caduta, perché l'accesso di base è spento di serie sui tenant nuovi, perché
// un tenant federato — come quello di una scuola — le password per le app non
// le genera affatto, e perché teneva in piedi un secondo modo di autenticarsi
// che nessuno poteva usare. `AUTH XOAUTH2` — un gettone al posto della
// password — resta acceso, e chi collega la casella si trova la solita pagina
// di Microsoft con la verifica in due passaggi che fa già tutti i giorni.
//
// ## Con che applicazione si bussa
//
// Con una di Microsoft, e non si sceglie: `CLIENT`, più sotto, con il perché
// non è un'impostazione. Non è un trucco ed è quel che fanno i programmi di
// posta liberi da anni — è un client pubblico, non porta nessun segreto, e
// serve solo a dire *che programma* sta chiedendo il permesso. Il permesso lo
// dà comunque la persona, sulla pagina di Microsoft, e la casella che si apre
// è la sua.
//
// ## Una strada sola, e le due che sono cadute
//
// Si entra dal browser, e basta: `collegaDalBrowser`, più sotto, con il perché.
//
// La prima caduta è il menu degli account di VS Code, che l'estensione si
// faceva prestare dall'editor. Fuori dall'editor quel menu non esiste.
//
// La seconda è il *device code*, il codice da incollare in una pagina di
// Microsoft da qualunque dispositivo. Era il ripiego per quando il browser non
// si può usare, e non vale il suo costo: scade in un quarto d'ora — e chi lo
// copia mentre fa altro lo trova morto, con un «questo codice non funziona»
// che non dice perché — e sempre più tenant lo bloccano di proposito, perché è
// il flusso con cui si fanno le truffe del codice da incollare. Quel blocco
// arriva alla fine, dopo che si è già copiato tutto, e non si distingue da un
// guasto. Un ripiego che fallisce in modo illeggibile è peggio che nessun
// ripiego: chi non riesce a entrare dal browser ha un problema che va visto,
// non aggirato.

import * as crypto from 'node:crypto'
import * as http from 'node:http'

import * as apparato from 'apparato'

import { dominioDi, type Casella } from '../domain/mailbox.js'

/**
 * Il permesso che si chiede: spedire, e nient'altro.
 *
 * `SMTP.Send` è il più stretto che esista per questo: non lascia leggere la
 * posta, non lascia guardare il calendario, non lascia toccare i contatti. Chi
 * autorizza vede scritto esattamente quello, e un registro di classe non ha
 * motivo di chiedere di più.
 *
 * `offline_access` è quello che permette di non ridomandare tutto ogni ora:
 * senza, il gettone dura sessanta minuti e poi si ricomincia da capo — con la
 * pagina e l'accesso — in mezzo a un giro di comunicazioni.
 */
const PERMESSI = 'https://outlook.office.com/SMTP.Send offline_access'

/** Dove si va a chiedere, quando non si sa ancora di che tenant si tratta. */
const COMUNE = 'organizations'

/**
 * La chiave sotto cui sta il gettone di rinnovo nel portachiavi.
 *
 * Il gettone di rinnovo è la cosa da tenere: dura settimane e serve a farsi
 * dare quelli d'accesso, che durano un'ora. Vale quanto una password — chi ce
 * l'ha spedisce dalla casella — e sta dove sta una password: nel portachiavi
 * del sistema, mai nelle impostazioni.
 */
const CHIAVE_RINNOVO = 'registroDocenti.posta.rinnovo'

let portachiavi: apparato.DepositoSegreti | null = null

/**
 * L'avvio consegna il portachiavi e chiede subito se dentro c'è un gettone di
 * rinnovo: da quella risposta dipende la pastiglia «casella collegata» che il
 * pannello mostra appena si apre.
 */
export function registraPortachiaviOauth (segreti: apparato.DepositoSegreti): void {
  portachiavi = segreti
  void rinnovoSalvato()
}

/**
 * L'ultimo gettone d'accesso, tenuto finché vale.
 *
 * Un giro di venticinque comunicazioni sta dentro un solo collegamento, ma i
 * giri sono tanti: ridomandare un gettone a ogni invio vuol dire una chiamata
 * di rete in più ogni volta, per un gettone che è ancora buono per
 * cinquantotto minuti. Sta in memoria e basta: alla chiusura dell'applicazione
 * sparisce, e quel che resta è il gettone di rinnovo nel portachiavi.
 */
let inTasca: { gettone: string, scade: number } | null = null

/** Se, per quel che se ne sa senza aspettare, la casella è collegata. */
let notoRinnovabile = false

/**
 * Con che applicazione il registro si presenta a Microsoft.
 *
 * «Microsoft Graph Command Line Tools»: un client pubblico di Microsoft, fatto
 * per entrare dal browser e chiedere permessi delegati. Non porta nessun
 * segreto e non dà nessun accesso da sé — il permesso lo dà la persona sulla
 * pagina di Microsoft, e la casella che si apre è la sua.
 *
 * Era un'impostazione, con questo stesso valore come predefinito, e serviva a
 * un caso solo: il tenant che rifiuta l'applicazione pubblica, e allora se ne
 * registra una propria e si incolla qui il suo ID. Ma registrare
 * un'applicazione passa dal portale di Azure, che nel tenant di una scuola ai
 * docenti è chiuso — quindi la casella chiedeva di incollare un numero che chi
 * la legge non può ottenere. Una via d'uscita che non si può percorrere non è
 * una via d'uscita: è un campo in più da guardare quando qualcosa non va.
 *
 * Se il tenant rifiuta, il rimedio vero è uno e lo dice `spiega()`: il consenso
 * lo dà un amministratore, su questo id e su questo permesso.
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

/** Dimentica il gettone: scollegare è dimenticare, anche qui. */
export async function dimenticaOauth (): Promise<void> {
  await portachiavi?.delete(CHIAVE_RINNOVO)
  notoRinnovabile = false
  inTasca = null
}

/**
 * Azzera tutto quel che questo modulo tiene: il gettone di rinnovo nel
 * portachiavi, quello d'accesso in memoria e i tenant scoperti.
 *
 * È la mossa da fare quando «non funziona» e non si sa più che cosa sia
 * rimasto in giro: un gettone di un tentativo precedente, un tenant sbagliato
 * ricordato da un indirizzo scritto male. Dopo, si riparte da zero.
 */
export async function azzeraOauth (): Promise<void> {
  await dimenticaOauth()
  tenantConosciuti.clear()
}

// ------------------------------------------------------------------ il tenant

/** Quel che si è già scoperto: il dominio di posta e il tenant che gli sta dietro. */
const tenantConosciuti = new Map<string, string>()

/**
 * Di quale organizzazione fa parte un indirizzo.
 *
 * Si potrebbe chiedere a `organizations` e lasciare che Microsoft smisti, ma
 * allora la pagina comincia domandando *chi sei*, e chi ha due account
 * Microsoft aperti nel browser sbaglia bersaglio senza accorgersene.
 * Chiedendolo prima, la pagina si apre già sulla scuola.
 *
 * Il tenant non è un'impostazione, e non serve che lo sia: il dominio della
 * casella lo dice sempre, e nei casi in cui non lo dicesse `organizations`
 * funziona lo stesso. Una casella da riempire per una cosa che il programma sa
 * ricavare è una casella che si sbaglia.
 *
 * Se la scoperta non riesce — niente rete, o un dominio che non è di Microsoft
 * — si torna a `organizations`, che funziona lo stesso: si perde la comodità,
 * non la possibilità.
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
 * Quanto si aspetta Microsoft prima di rinunciare.
 *
 * `fetch` non ha una scadenza propria: su una rete scolastica con un filtro
 * che accetta la connessione e poi non risponde più, la chiamata resta appesa
 * per sempre. E queste due non sono chiamate qualunque — `gettoneDaSpedire()`
 * sta **prima** che l'invio diretto apra il collegamento SMTP, quindi un
 * silenzio qui blocca l'intera spedizione senza niente da mostrare e niente da
 * annullare. Le altre tre chiamate di rete del registro — la geocodifica,
 * l'OCR — la scadenza ce l'hanno già; queste erano le sole senza.
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

/**
 * Collega la casella con l'account Microsoft.
 *
 * Una riga sola, perché il giro è uno solo: si accede dal browser. Quel che
 * c'era prima — il codice da incollare, con la sua attesa a intervalli — è
 * caduto, e il perché sta in cima al file.
 */
export async function collegaConOauth (suo: Casella): Promise<EsitoOauth> {
  if (!portachiavi) return { ok: false, errore: 'Il portachiavi del sistema non è disponibile.' }

  // Nella pagina si entra con il nome di accesso, non con l'indirizzo: è
  // quello che Microsoft conosce come utente.
  return await collegaDalBrowser(await tenantDi(suo.accesso), suo.accesso)
}

/**
 * Mette al sicuro quel che Microsoft ha dato, o dice perché non c'è niente da
 * mettere.
 *
 * Il gettone di rinnovo va nel portachiavi, quello d'accesso in tasca. Senza
 * il primo non c'è collegamento: un gettone d'accesso da solo dura un'ora, e
 * chiamare «collegata» una casella che scade prima di sera vuol dire una
 * riga verde che mente.
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

/**
 * Il collegamento come lo fa ogni programma che entra in un account Microsoft:
 * si apre il browser, si accede, e Microsoft rimanda indietro il permesso.
 *
 * È la strada buona, e quella del codice è il ripiego. Il codice ha due
 * difetti che si pagano subito: scade in un quarto d'ora — e chi lo copia
 * mentre sta facendo altro lo trova già morto, con un «questo codice non
 * funziona» che non dice perché — e sempre più tenant lo *bloccano di
 * proposito*, perché è il flusso con cui si fanno le truffe del codice da
 * incollare. Un blocco così non si distingue da un guasto: la pagina risponde
 * male alla fine, dopo che si è già copiato tutto.
 *
 * Qui non c'è niente da copiare. Il registro apre una porta in ascolto su
 * `127.0.0.1`, manda il browser di sistema alla pagina di Microsoft dicendole
 * di rimandare la risposta lì, e aspetta. Il browser di sistema è anche quello
 * in cui la sessione della scuola è già aperta: chi ha fatto la verifica in due
 * passaggi stamattina non la rifà.
 *
 * ## PKCE, e perché serve qui
 *
 * Un programma che gira sul computer di chi lo usa non può tenere un segreto:
 * chiunque apra il file lo legge. Senza un segreto, però, chiunque altro
 * potrebbe intercettare il permesso che torna indietro e usarselo. PKCE è il
 * rimedio: si estrae un numero a caso, se ne manda *l'impronta* alla pagina, e
 * il numero vero solo alla fine. Chi ha rubato il permesso non ha il numero, e
 * il permesso non gli vale niente.
 */
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
 * Apre una porta su `127.0.0.1` e aspetta che Microsoft ci rimandi il permesso.
 *
 * La porta la sceglie il sistema — `listen(0)` — e non è pigrizia: una porta
 * fissa prima o poi è occupata da qualcos'altro, e il collegamento fallirebbe
 * con un errore che parla di reti a chi stava collegando la posta.
 *
 * Quel che si risponde al browser conta: chi autorizza sta guardando quella
 * scheda, e una pagina bianca lo lascia lì a chiedersi se ha funzionato.
 */
async function aspettaIlRitorno (
  quando: (indirizzo: string) => Promise<void>,
  annulla: apparato.Annullamento,
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

    // Un quarto d'ora: il tempo di accedere, fare la verifica in due passaggi e
    // leggere che cosa si sta autorizzando. Oltre, la scheda è stata
    // dimenticata aperta, e il registro non deve restare in ascolto per sempre.
    const scadenza = setTimeout(() => chiudi({ error: 'scaduto' }), 15 * 60_000)

    annulla.onCancellationRequested(() => chiudi({ error: 'annullato' }))

    server.listen(0, '127.0.0.1', () => {
      const dove = server.address()
      if (dove === null || typeof dove === 'string') {
        chiudi({ error: 'porta', error_description: 'la porta in ascolto non si è aperta' })
        return
      }
      void quando(`http://localhost:${dove.port}`).catch((guasto: Error) => {
        chiudi({ error: 'browser', error_description: guasto.message })
      })
    })
  })
}

/** Che cosa legge chi ha appena autorizzato, nella scheda del browser. */
function paginaDiRitorno (errore: string | null): string {
  const titolo = errore ? 'Non è andata' : 'Fatto'
  const detto = errore
    ? 'Il registro non ha ricevuto il permesso. Torna al registro: là c’è scritto perché.'
    : 'Il registro ha ricevuto il permesso. Puoi chiudere questa scheda e tornare al registro.'
  return (
    '<!doctype html><html lang="it"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>${titolo} — Registro docenti</title>` +
    '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;' +
    'min-height:100vh;padding:24px;color:#1b1b1b;background:#f6f6f4}' +
    'main{max-width:34rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}' +
    '@media (prefers-color-scheme:dark){body{color:#eee;background:#1b1b1b}}</style>' +
    `<main><h1>${titolo}</h1><p>${detto}</p></main>`
  )
}

/**
 * Tutto il giro dal browser: la pagina, il ritorno, e il permesso scambiato con
 * i gettoni.
 *
 * `state` si controlla al ritorno, ed è la parte che sembra inutile finché non
 * serve: è quel che distingue la risposta *alla nostra* richiesta da una
 * qualunque altra cosa che bussi a quella porta mentre è aperta.
 */
async function collegaDalBrowser (tenant: string, indirizzo: string): Promise<EsitoOauth> {
  const verificatore = aCaso(48)
  const stato = aCaso(16)
  let rimando = ''

  const ritorno = await apparato.dialoghi.conAvanzamento(
    {
      location: apparato.DoveAvanzamento.Notification,
      title: `Registro: accedi come ${indirizzo} nel browser che si è aperto…`,
      cancellable: true,
    },
    async (_avanzamento, annulla) =>
      await aspettaIlRitorno(async (dove) => {
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
          // Con due account Microsoft aperti nel browser, senza questi due si
          // autorizza quello sbagliato senza accorgersene: il suggerimento
          // riempie il campo, la scelta esplicita impedisce di saltarlo.
          login_hint: indirizzo,
          prompt: 'select_account',
        }).toString()
        await apparato.esterno.apri(apparato.Uri.parse(pagina.toString()))
      }, annulla),
  )

  if (ritorno.error === 'porta' || ritorno.error === 'browser') {
    return {
      ok: false,
      errore:
        'Il registro non è riuscito ad aprire l’accesso nel browser. ' +
        `(${ritorno.error_description ?? ritorno.error})`,
    }
  }
  if (ritorno.error === 'annullato') return { ok: false, errore: 'Collegamento annullato.' }
  if (ritorno.error === 'scaduto') {
    return { ok: false, errore: 'È passato troppo tempo senza che l’accesso finisse: riprova.' }
  }
  if (ritorno.error || !ritorno.code) {
    return { ok: false, errore: spiega(ritorno.error, ritorno.error_description) }
  }
  if (ritorno.state !== stato) {
    return {
      ok: false,
      errore: 'La risposta arrivata non è quella della richiesta partita da qui: riprova.',
    }
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
 * Un gettone d'accesso buono adesso: quello in tasca finché vale, altrimenti
 * uno nuovo chiesto con il gettone di rinnovo.
 *
 * Il margine di un minuto è quel che evita il caso peggiore: un gettone preso
 * a cinquantanove minuti e mezzo, e il server che lo rifiuta a metà di un giro
 * di venticinque comunicazioni.
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
    // Un rinnovo rifiutato non torna buono da solo: la password è cambiata, o
    // l'autorizzazione è stata revocata. Si butta, così il registro dice «da
    // ricollegare» invece di riprovare all'infinito con una chiave morta.
    if (risposta.error === 'invalid_grant') await dimenticaOauth()
    throw new Error(spiega(risposta.error, risposta.error_description))
  }

  inTasca = {
    gettone: risposta.access_token,
    scade: Date.now() + (risposta.expires_in ?? 3600) * 1000,
  }
  // Microsoft può darne uno nuovo a ogni rinnovo: si tiene l'ultimo, o al
  // prossimo mese di vacanza quello vecchio non varrà più.
  if (risposta.refresh_token) await portachiavi?.store(CHIAVE_RINNOVO, risposta.refresh_token)
  return risposta.access_token
}

/**
 * Gli errori di Microsoft tradotti in quel che c'è da fare.
 *
 * `AADSTS65002` e `AADSTS7000218` sono i due che si incontrano davvero, e i
 * loro messaggi sono lunghi e in inglese: dicono la causa e non il rimedio.
 */
function spiega (errore: string | undefined, dettaglio: string | undefined): string {
  const detto = `${errore ?? ''} ${dettaglio ?? ''}`.trim()

  if (errore === 'annullato') return 'Collegamento annullato.'
  if (errore === 'expired_token' || errore === 'code_expired') {
    return 'Il codice è scaduto prima che fosse autorizzato: riprova.'
  }
  if (errore === 'authorization_declined') return 'L’autorizzazione è stata rifiutata.'
  if (/AADSTS7000218/.test(detto)) {
    return (
      'L’applicazione registrata non è dichiarata come client pubblico: nel portale, in ' +
      'Autenticazione, metti «Consenti flussi client pubblici» su Sì e salva.'
    )
  }
  if (/AADSTS65002|AADSTS650052/.test(detto)) {
    return (
      'La scuola non lascia che il registro spedisca dalla tua casella, e non è una cosa che ' +
      'si possa rimediare da qui: il consenso lo deve dare chi amministra il tenant. È una ' +
      'richiesta precisa, e conviene girargliela così com’è — «consenso amministratore per ' +
      `l’applicazione ${CLIENT} (Microsoft Graph Command Line Tools) sul permesso delegato ` +
      'SMTP.Send di Office 365 Exchange Online». Fino ad allora le comunicazioni escono come ' +
      'file .eml, e a spedirle sei tu.'
    )
  }
  if (/AADSTS7000215|invalid_client/.test(detto)) {
    return (
      `Microsoft non riconosce l’applicazione ${CLIENT}: se l’ha ritirata, il registro va ` +
      'aggiornato.'
    )
  }
  if (/AADSTS50020|AADSTS500011/.test(detto)) {
    return (
      'L’account con cui hai autorizzato non appartiene all’organizzazione dell’indirizzo: ' +
      'rifai il collegamento accedendo con la casella della scuola.'
    )
  }
  if (/AADSTS65004|consent/i.test(detto)) {
    return (
      'Il consenso non è stato dato. Se la pagina dice che serve un amministratore, la scuola ' +
      'ha chiuso il consenso degli utenti: va chiesto a chi amministra il tenant.'
    )
  }
  return detto || 'Microsoft non ha detto perché.'
}
