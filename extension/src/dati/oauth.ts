// L'accesso alla casella con l'account Microsoft, invece che con una password.
//
// È il modo con cui Microsoft vuole che si entri, e l'unico che sopravvive a
// quel che sta togliendo: la consegna SMTP con nome e password è spenta di
// serie sui tenant nuovi e si accende solo chiedendolo a un amministratore,
// mentre `AUTH XOAUTH2` — un gettone al posto della password — resta acceso.
// Chi collega la casella si trova la solita pagina di Microsoft, con la
// verifica in due passaggi che fa già tutti i giorni, e non deve generare né
// ricordare nessuna «password per le app».
//
// ## Due strade, e la prima non chiede niente
//
// La prima è l'account di VS Code. VS Code un provider Microsoft ce l'ha già
// dentro — è quello del menu degli account, in basso a sinistra, quello con
// cui si sincronizzano le impostazioni — e lo mette a disposizione delle
// estensioni: si chiede una sessione con i permessi che servono, e VS Code
// pensa alla pagina di accesso, al rinnovo dei gettoni e alla memoria di chi è
// entrato. Il registro non tiene niente e non scade niente. Non c'è nulla da
// registrare e nulla da incollare: è la via da provare per prima, ed è quella
// che il registro propone.
//
// Non è detto che basti. Il numero con cui VS Code si presenta a Microsoft è
// suo, e Microsoft lo autorizza sulle risorse che vuole: se sulla posta non lo
// autorizza, la richiesta torna indietro con `AADSTS65002` — ed è lì che serve
// la seconda strada.
//
// La seconda è registrare la propria applicazione, una volta sola, e incollare
// il suo «ID applicazione» nelle impostazioni. Da quel momento si può ancora
// passare da VS Code, che quel numero lo accetta al posto del proprio con due
// voci speciali (`VSCODE_CLIENT_ID:`, `VSCODE_TENANT:`), oppure si può usare
// il *device code* qui sotto: il registro chiede un codice, chi collega lo
// incolla nella pagina di Microsoft da qualunque browser — anche dal telefono
// — e il registro intanto aspetta. Serve dove il menu degli account non c'è o
// non si vuole toccare.
//
// La procedura di registrazione sta scritta per intero in `guidaRegistrazione`:
// il registro la stampa quando serve, invece di dire soltanto che manca un
// numero.

import * as vscode from 'vscode'

import { dellaCasella, dominioDi, type Casella } from '../dominio/casella.js'

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
 * pagina, il codice e il telefono — in mezzo a un giro di comunicazioni.
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

let portachiavi: vscode.SecretStorage | null = null

/**
 * L'attivazione consegna il portachiavi e mette in ascolto sugli account.
 *
 * L'ascolto serve a una cosa sola e importante: un account tolto dal menu degli
 * account di VS Code deve spegnere la pastiglia «casella collegata» senza che
 * si debba riavviare niente — altrimenti il registro continua a dire che
 * spedisce da una casella a cui non ha più accesso.
 */
export function registraPortachiaviOauth (segreti: vscode.SecretStorage): vscode.Disposable {
  portachiavi = segreti
  void rinnovoSalvato()
  void sessioneVsCode(false)
  return vscode.authentication.onDidChangeSessions((cambio) => {
    if (cambio.provider.id === PROVIDER) void sessioneVsCode(false)
  })
}

/**
 * L'ultimo gettone d'accesso, tenuto finché vale.
 *
 * Un giro di venticinque comunicazioni sta dentro un solo collegamento, ma i
 * giri sono tanti: ridomandare un gettone a ogni invio vuol dire una chiamata
 * di rete in più ogni volta, per un gettone che è ancora buono per
 * cinquantotto minuti. Sta in memoria e basta: alla chiusura di VS Code
 * sparisce, e quel che resta è il gettone di rinnovo nel portachiavi.
 */
let inTasca: { gettone: string, scade: number } | null = null

/** Se, per quel che se ne sa senza aspettare, la casella è collegata. */
let notoRinnovabile = false

/** Come si presenta il registro a Microsoft, e a quale tenant. */
export interface ContoOauth {
  clientId: string
  /** Il tenant scritto a mano, o vuoto per ricavarlo dall'indirizzo. */
  tenant: string
}

export function contoOauth (): ContoOauth {
  const impostazioni = vscode.workspace.getConfiguration('registroDocenti.posta')
  return {
    clientId: (impostazioni.get<string>('clientId') ?? '').trim(),
    tenant: (impostazioni.get<string>('tenant') ?? '').trim(),
  }
}

/** Con che cosa il registro entra nella casella. */
export type ModoAccesso = 'vscode' | 'oauth' | 'password'

/** Quale dei tre modi di entrare si è scelto. */
export function modoAccesso (): ModoAccesso {
  return (
    vscode.workspace.getConfiguration('registroDocenti.posta').get<ModoAccesso>('autenticazione') ??
    'vscode'
  )
}

/** Il gettone di rinnovo dal portachiavi, se c'è. */
export async function rinnovoSalvato (): Promise<string | null> {
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

// ------------------------------------------------- l'account di VS Code

/**
 * L'accesso con l'account che VS Code ha già.
 *
 * È la via più corta di tutte, e va provata per prima: VS Code un provider
 * Microsoft ce l'ha dentro — è quello del menu degli account, in basso a
 * sinistra — e sa fare da sé la pagina di accesso, il rinnovo dei gettoni e la
 * memoria di chi è entrato. Al registro non resta da tenere niente: nessun
 * gettone nel portachiavi, nessuna scadenza da guardare.
 *
 * Con l'ID applicazione scritto nelle impostazioni si passa quello, con le due
 * voci speciali che VS Code riconosce apposta — `VSCODE_CLIENT_ID:` e
 * `VSCODE_TENANT:` — e allora si entra con la propria registrazione ma con la
 * comodità di VS Code. Senza, si prova con quella di VS Code stesso: non è
 * detto che Microsoft la autorizzi sulla posta, e quando non lo fa lo dice con
 * `AADSTS65002` — che è il momento in cui serve registrarne una propria.
 */
const PROVIDER = 'microsoft'

/** Se, per quel che si è visto, l'account di VS Code c'è. */
let notoInVsCode = false

export function vscodeNoto (): boolean {
  return notoInVsCode
}

/**
 * I permessi da chiedere a VS Code, sempre gli stessi.
 *
 * «Sempre gli stessi» è la parte che conta: VS Code ritrova una sessione già
 * aperta confrontando l'elenco dei permessi, e un elenco che cambia da una
 * chiamata all'altra — perché nel frattempo si è scoperto il tenant — fa
 * ripartire la pagina di accesso a ogni invio. Per questo il tenant, appena
 * scoperto, si scrive nelle impostazioni.
 */
function permessiVsCode (): string[] {
  const permessi = [...PERMESSI.split(' ')]
  const { clientId, tenant } = contoOauth()
  if (clientId) permessi.push(`VSCODE_CLIENT_ID:${clientId}`)
  if (tenant) permessi.push(`VSCODE_TENANT:${tenant}`)
  return permessi
}

/**
 * La sessione di VS Code: quella già aperta, o una nuova se glielo si chiede.
 *
 * Senza `creando` non apre niente e non disturba nessuno: è la domanda che si
 * fa all'avvio e prima di ogni invio, e la risposta «non c'è» è una risposta
 * buona.
 */
async function sessioneVsCode (creando: boolean): Promise<vscode.AuthenticationSession | null> {
  try {
    const sessione = await vscode.authentication.getSession(PROVIDER, permessiVsCode(), {
      createIfNone: creando,
      silent: creando ? undefined : true,
    })
    notoInVsCode = Boolean(sessione)
    return sessione ?? null
  } catch (errore) {
    // Chi chiude la finestra di accesso non ha rotto niente: ha detto di no.
    notoInVsCode = false
    if (creando) throw errore
    return null
  }
}

/** Il gettone dall'account di VS Code, senza aprire niente. */
export async function gettoneDaVsCode (): Promise<string | null> {
  const sessione = await sessioneVsCode(false)
  return sessione?.accessToken ?? null
}

/**
 * Collega la casella con l'account di VS Code.
 *
 * Il tenant si scopre prima e si scrive nelle impostazioni: serve a far aprire
 * la pagina già sulla scuola, e serve soprattutto a non far cambiare l'elenco
 * dei permessi fra oggi e domani.
 *
 * Alla fine si controlla *chi* è entrato. Non è pignoleria: chi ha due account
 * Microsoft nel browser sceglie quello sbagliato con un clic, e il registro
 * finirebbe a spedire dalla casella privata senza che nessuno se ne accorga
 * fino a quando una famiglia non risponde all'indirizzo di casa. VS Code
 * chiama l'account ora con il nome di accesso, ora con l'indirizzo: vanno
 * bene tutti e due, perché sono la stessa casella.
 */
export async function collegaConVsCode (suo: Casella): Promise<EsitoOauth> {
  const impostazioni = vscode.workspace.getConfiguration('registroDocenti.posta')
  if (!contoOauth().tenant) {
    const tenant = await tenantDi(suo.accesso)
    if (tenant !== COMUNE) {
      await impostazioni.update('tenant', tenant, vscode.ConfigurationTarget.Global)
    }
  }

  try {
    const sessione = await sessioneVsCode(true)
    if (!sessione) return { ok: false, errore: 'Collegamento annullato.' }

    const entrato = (sessione.account.label ?? '').trim()
    if (entrato && !dellaCasella(suo, entrato)) {
      return {
        ok: false,
        errore:
          `Sei entrato come ${entrato}, non come ${suo.accesso}. Togli l’account sbagliato dal ` +
          'menu degli account di VS Code, in basso a sinistra, e rifai il collegamento.',
      }
    }
    return { ok: true }
  } catch (errore) {
    return { ok: false, errore: spiega(undefined, (errore as Error).message) }
  }
}

/**
 * Dimentica l'account di VS Code, per quel che il registro può fare.
 *
 * Non può disconnetterlo: la sessione è di VS Code e si toglie dal suo menu
 * degli account. Quel che si può fare è smettere di usarla, e dirlo.
 */
export function dimenticaVsCode (): void {
  notoInVsCode = false
}

/**
 * Azzera tutto quel che questo modulo tiene: il gettone di rinnovo nel
 * portachiavi, quello d'accesso in memoria, la memoria dell'account di VS
 * Code e i tenant scoperti.
 *
 * È la mossa da fare quando «non funziona» e non si sa più che cosa sia
 * rimasto in giro: un gettone di un tentativo precedente, un tenant sbagliato
 * ricordato da un indirizzo scritto male. Dopo, si riparte da zero — tranne
 * l'account nel menu di VS Code, che solo chi sta davanti allo schermo può
 * togliere.
 */
export async function azzeraOauth (): Promise<void> {
  await dimenticaOauth()
  dimenticaVsCode()
  tenantConosciuti.clear()
}

// ------------------------------------------------------------------ il tenant

/** Quel che si è già scoperto: il dominio di posta e il tenant che gli sta dietro. */
const tenantConosciuti = new Map<string, string>()

/**
 * Di quale organizzazione fa parte un indirizzo.
 *
 * Si potrebbe chiedere a `organizations` e lasciare che Microsoft smisti, ma
 * allora la pagina del codice comincia domandando *chi sei*, e chi ha due
 * account Microsoft aperti nel browser sbaglia bersaglio senza accorgersene.
 * Chiedendolo prima, la pagina si apre già sulla scuola.
 *
 * Se la scoperta non riesce — niente rete, o un dominio che non è di Microsoft
 * — si torna a `organizations`, che funziona lo stesso: si perde la comodità,
 * non la possibilità.
 */
export async function tenantDi (indirizzo: string): Promise<string> {
  const scritto = contoOauth().tenant
  if (scritto) return scritto

  const dominio = dominioDi(indirizzo)
  if (!dominio) return COMUNE
  const gia = tenantConosciuti.get(dominio)
  if (gia) return gia

  try {
    const risposta = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(dominio)}/v2.0/.well-known/openid-configuration`,
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

// ------------------------------------------------------------------ il collegamento

/** Il codice da incollare, e dove. */
interface Codice {
  device_code: string
  user_code: string
  verification_uri: string
  interval?: number
  expires_in?: number
}

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
  })
  return await risposta.json()
}

/**
 * La procedura da seguire quando il `clientId` non c'è.
 *
 * Sta scritta per intero e non come «registra un'applicazione»: chi legge non
 * ha mai aperto il portale di Azure, e le voci da toccare hanno nomi che non
 * somigliano a niente. Sette righe qui valgono un pomeriggio perso.
 */
export function guidaRegistrazione (): string {
  return [
    'Per entrare con l’account Microsoft serve un «ID applicazione», che si ottiene una volta sola:',
    '',
    '1. Apri https://entra.microsoft.com e accedi con la casella della scuola.',
    '2. Identità → Applicazioni → Registrazioni app → Nuova registrazione.',
    '3. Nome: «Registro docenti». Tipi di account supportati: solo questa organizzazione.',
    '4. URI di reindirizzamento: scegli «Client pubblico / nativo (desktop e dispositivi mobili)» e metti https://vscode.dev/redirect. Registra.',
    '5. Nella scheda Autenticazione aggiungi, sempre come client pubblico, anche http://localhost e ms-appx-web://Microsoft.AAD.BrokerPlugin/<ID applicazione> (con il tuo ID al posto di <ID applicazione>: serve al broker di Windows, che è quello che VS Code usa per entrare). In fondo metti «Consenti flussi client pubblici» su Sì e salva.',
    '6. In Autorizzazioni API → Aggiungi → API utilizzate dall’organizzazione → Office 365 Exchange Online → Autorizzazioni delegate → SMTP.Send.',
    '7. Copia «ID applicazione (client)» dalla Panoramica e incollalo in registroDocenti.posta.clientId.',
    '',
    'Se la scuola ha chiuso la registrazione delle applicazioni, il passo 2 non si apre: allora resta la «password per le app».',
  ].join('\n')
}

/** Com'è andato il collegamento con l'account. */
export interface EsitoOauth {
  ok: boolean
  errore?: string
}

/**
 * Collega la casella con l'account Microsoft, con il flusso del codice.
 *
 * Il codice si mette negli appunti prima di aprire la pagina: la pagina lo
 * chiede subito, e cercarlo in una notifica già sparita è il modo più semplice
 * di non riuscirci.
 *
 * L'attesa è annullabile. Non è un dettaglio: da qui si sta interrogando
 * Microsoft ogni cinque secondi per un quarto d'ora, e chi ha cambiato idea —
 * o si è accorto di avere sbagliato account — deve poter uscire senza chiudere
 * l'editor.
 */
export async function collegaConOauth (suo: Casella): Promise<EsitoOauth> {
  const { clientId } = contoOauth()
  if (!clientId) return { ok: false, errore: guidaRegistrazione() }
  if (!portachiavi) return { ok: false, errore: 'Il portachiavi del sistema non è disponibile.' }

  // Nella pagina si entra con il nome di accesso, non con l'indirizzo: è quello
  // che Microsoft conosce come utente.
  const indirizzo = suo.accesso
  const tenant = await tenantDi(indirizzo)

  const chiesto = (await aMicrosoft(
    tenant,
    'devicecode',
    new URLSearchParams({ client_id: clientId, scope: PERMESSI }),
  )) as Codice & Gettoni
  if (chiesto.error || !chiesto.device_code) {
    return { ok: false, errore: spiega(chiesto.error, chiesto.error_description) }
  }

  const apri = 'Apri la pagina'
  await vscode.env.clipboard.writeText(chiesto.user_code)
  const scelta = await vscode.window.showInformationMessage(
    `Codice da incollare: ${chiesto.user_code}`,
    {
      modal: true,
      detail:
        `È già negli appunti. Apri ${chiesto.verification_uri}, incollalo, e accedi con ` +
        `${indirizzo}. Il registro aspetta qui.`,
    },
    apri,
  )
  if (scelta !== apri) return { ok: false, errore: 'Collegamento annullato.' }
  await vscode.env.openExternal(vscode.Uri.parse(chiesto.verification_uri))

  const gettoni = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Registro: aspetto che tu autorizzi ${indirizzo}…`,
      cancellable: true,
    },
    async (_avanzamento, annulla) =>
      await aspettaAutorizzazione(tenant, clientId, chiesto, annulla),
  )

  if (!gettoni.refresh_token || !gettoni.access_token) {
    return { ok: false, errore: spiega(gettoni.error, gettoni.error_description) }
  }

  await portachiavi.store(CHIAVE_RINNOVO, gettoni.refresh_token)
  notoRinnovabile = true
  inTasca = {
    gettone: gettoni.access_token,
    scade: Date.now() + (gettoni.expires_in ?? 3600) * 1000,
  }
  return { ok: true }
}

/**
 * Aspetta che qualcuno finisca di autorizzare, chiedendolo a intervalli.
 *
 * `authorization_pending` non è un errore: è «non ha ancora finito», e va
 * ignorato. `slow_down` è Microsoft che dice di rallentare, e va ascoltato —
 * insistere allo stesso ritmo fa chiudere la richiesta.
 */
async function aspettaAutorizzazione (
  tenant: string,
  clientId: string,
  codice: Codice,
  annulla: vscode.CancellationToken,
): Promise<Gettoni> {
  let pausa = (codice.interval ?? 5) * 1000
  const scadenza = Date.now() + (codice.expires_in ?? 900) * 1000

  while (Date.now() < scadenza) {
    if (annulla.isCancellationRequested) return { error: 'annullato' }
    await new Promise((poi) => setTimeout(poi, pausa))
    if (annulla.isCancellationRequested) return { error: 'annullato' }

    const risposta = (await aMicrosoft(
      tenant,
      'token',
      new URLSearchParams({
        client_id: clientId,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: codice.device_code,
      }),
    )) as Gettoni

    if (risposta.access_token) return risposta
    if (risposta.error === 'authorization_pending') continue
    if (risposta.error === 'slow_down') {
      pausa += 5000
      continue
    }
    return risposta
  }
  return { error: 'expired_token' }
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
  const { clientId } = contoOauth()
  if (!rinnovo || !clientId) return null

  const tenant = await tenantDi(indirizzo)
  const risposta = (await aMicrosoft(
    tenant,
    'token',
    new URLSearchParams({
      client_id: clientId,
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
  return inTasca.gettone
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
      'Questa applicazione non è autorizzata a spedire posta per la tua organizzazione. ' +
      `${guidaRegistrazione()}`
    )
  }
  if (/AADSTS7000215|invalid_client/.test(detto)) {
    return 'L’ID applicazione non è valido: ricontrolla registroDocenti.posta.clientId.'
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
