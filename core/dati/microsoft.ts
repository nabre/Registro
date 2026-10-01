// Gli account Microsoft con cui il registro legge OneDrive. Si entra come per
// la posta (`oauth.ts`: browser di sistema, PKCE, stesso client pubblico), ma
// con i permessi di Microsoft Graph: il gettone della posta vale solo per
// spedire, e un gettone vale per una risorsa sola. Per questo ogni account ha
// il suo gettone di rinnovo, anche quando l'indirizzo è quello della casella.
//
// L'elenco degli account e i gettoni stanno nel portachiavi del sistema: un
// indirizzo non è un segreto, ma tenerlo accanto al suo gettone evita un
// elenco che dice «collegato» a un account di cui il gettone non c'è più.

import * as apparato from 'apparato'

import { sembraIndirizzo, stessoIndirizzo } from '#core/dominio/mailbox.js'
import type { AccountMicrosoft } from '#core/dominio/onedrive.js'
import { casella } from './mailbox.js'
import { aggiornaOneDriveLocali, oneDriveLocaliNoti } from './oneDriveLocal.js'
import { accediDalBrowser, rinnovaConMicrosoft, spiega, tenantDi, type Gettoni } from './oauth.js'
import { testi } from './microsoft.testi.js'

/**
 * Leggere i file, anche quelli condivisi (`Files.Read.All`), e sapere chi è
 * entrato (`User.Read`). Solo lettura: il registro non scrive su OneDrive, ci
 * pensa il client di sincronizzazione.
 */
const PERMESSI =
  'https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/User.Read offline_access'

/**
 * Il ripiego quando il dominio non dice il tenant: `common` e non
 * `organizations`, perché OneDrive esiste anche per gli account personali.
 */
const RIPIEGO = 'common'

const GRAPH = 'https://graph.microsoft.com/v1.0'

/** Quanto si aspetta Graph prima di dire che non risponde. */
const ATTESA_MS = 30_000

/** Quanto può durare lo scarico di un documento: un `.regi` con gli allegati pesa. */
const ATTESA_SCARICO_MS = 5 * 60_000

const CHIAVE_ELENCO = 'registroDocenti.microsoft.account'

function chiaveRinnovo (indirizzo: string): string {
  return `registroDocenti.microsoft.rinnovo.${indirizzo.trim().toLowerCase()}`
}

/** Un account come sta nel portachiavi. */
interface AccountSalvato {
  /** Il nome con cui si è entrati, come lo dice Microsoft (`userPrincipalName`). */
  indirizzo: string
  /** Il nome da mostrare: «Maria Rossi». */
  nome: string
  /** Il tenant da cui rinnovare: scoperto una volta, all'accesso. */
  tenant: string
}

let portachiavi: apparato.DepositoSegreti | null = null
let elenco: AccountSalvato[] = []
/** Gli account con un gettone di rinnovo nel portachiavi, in minuscolo. */
const conRinnovo = new Set<string>()
/** Gli ultimi gettoni d'accesso, solo in memoria. */
const inTasca = new Map<string, { gettone: string, scade: number }>()
/** I rinnovi in volo: due letture insieme non rinnovano due volte. */
const inRinnovo = new Map<string, Promise<string>>()
/** Chi ascolta i cambi dell'elenco: il pannello, che lo ridisegna. */
const alCambio = new apparato.EventEmitter<void>()

export const cambiAccount = alCambio.event

/**
 * Riceve il portachiavi all'avvio e legge l'elenco: finita la lettura,
 * `cambiAccount` lo dice al pannello. Chi deve aspettarla (le prove) aspetta.
 */
export async function registraPortachiaviMicrosoft (
  segreti: apparato.DepositoSegreti,
): Promise<void> {
  portachiavi = segreti
  await caricaElenco()
}

async function caricaElenco (): Promise<void> {
  await aggiornaOneDriveLocali()
  if (!portachiavi) {
    alCambio.fire()
    return
  }
  elenco = leggiElenco(await portachiavi.get(CHIAVE_ELENCO))
  conRinnovo.clear()
  for (const account of elenco) {
    if (await portachiavi.get(chiaveRinnovo(account.indirizzo))) {
      conRinnovo.add(account.indirizzo.toLowerCase())
    }
  }
  alCambio.fire()
}

/** L'elenco scritto nel portachiavi; quel che non ha la forma giusta si lascia. */
function leggiElenco (scritto: string | undefined): AccountSalvato[] {
  if (!scritto) return []
  try {
    const letto: unknown = JSON.parse(scritto)
    if (!Array.isArray(letto)) return []
    return letto.flatMap((voce: Partial<AccountSalvato>) =>
      typeof voce?.indirizzo === 'string' && voce.indirizzo
        ? [{
            indirizzo: voce.indirizzo,
            nome: typeof voce.nome === 'string' ? voce.nome : '',
            tenant: typeof voce.tenant === 'string' && voce.tenant ? voce.tenant : RIPIEGO,
          }]
        : [],
    )
  } catch {
    return []
  }
}

/**
 * Rilegge gli account che OneDrive sincronizza sul computer, e se sono cambiati
 * lo dice al pannello: un account aggiunto al client compare senza riavviare.
 */
export async function rileggiOneDriveLocali (): Promise<void> {
  if (await aggiornaOneDriveLocali()) alCambio.fire()
}

async function salvaElenco (): Promise<void> {
  await portachiavi?.store(CHIAVE_ELENCO, JSON.stringify(elenco))
  alCambio.fire()
}

function salvato (indirizzo: string): AccountSalvato | undefined {
  return elenco.find((account) => stessoIndirizzo(account.indirizzo, indirizzo))
}

/**
 * Gli account da mostrare: quelli che il client di OneDrive sincronizza sul
 * computer (si sfogliano senza accesso), quelli collegati con Graph, e la
 * casella della posta anche se non è né l'uno né l'altro.
 */
export function accountMicrosoft (): AccountMicrosoft[] {
  const suo = casella()
  const èPosta = (indirizzo: string): boolean =>
    Boolean(suo) &&
    (stessoIndirizzo(suo?.accesso ?? '', indirizzo) || stessoIndirizzo(suo?.mittente ?? '', indirizzo))
  const locali = oneDriveLocaliNoti()
  const sulComputer = (indirizzo: string): boolean =>
    locali.some((voce) => stessoIndirizzo(voce.indirizzo, indirizzo))

  const account: AccountMicrosoft[] = elenco.map((voce) => ({
    indirizzo: voce.indirizzo,
    nome: voce.nome || (locali.find((l) => stessoIndirizzo(l.indirizzo, voce.indirizzo))?.nome ?? ''),
    onedrive: conRinnovo.has(voce.indirizzo.toLowerCase()),
    sulComputer: sulComputer(voce.indirizzo),
    posta: èPosta(voce.indirizzo),
  }))
  for (const locale of locali) {
    if (account.some((voce) => stessoIndirizzo(voce.indirizzo, locale.indirizzo))) continue
    account.push({
      indirizzo: locale.indirizzo,
      nome: locale.nome,
      onedrive: false,
      sulComputer: true,
      posta: èPosta(locale.indirizzo),
    })
  }
  if (suo && !account.some((voce) => voce.posta)) {
    account.unshift({
      indirizzo: suo.accesso,
      nome: '',
      onedrive: false,
      sulComputer: sulComputer(suo.accesso),
      posta: true,
    })
  }
  // La casella della posta in cima: è il primo account che si cerca.
  return account.sort((a, b) => Number(b.posta) - Number(a.posta))
}

/** Com'è andato un gesto sugli account, detto in una riga. */
interface EsitoAccount {
  ok: boolean
  testo: string
}

/**
 * Collega un account per OneDrive: indirizzo (quello dato, o chiesto con la
 * casella della posta già scritta), accesso dal browser, e si salva solo se
 * Microsoft dice chi è entrato. `null` se si chiude la domanda.
 */
export async function aggiungiAccount (dato?: string): Promise<EsitoAccount | null> {
  const t = testi()
  if (!portachiavi) return { ok: false, testo: t.senzaPortachiavi }

  const indirizzo = dato?.trim() || (await apparato.dialoghi.chiediTesto({
    title: t.titoloAggiungi,
    prompt: t.domandaIndirizzo,
    value: propostaIndirizzo(),
    validateInput: (scritto: string) => (sembraIndirizzo(scritto) ? null : t.serveIndirizzo),
  }))?.trim()
  if (!indirizzo) return null
  if (!sembraIndirizzo(indirizzo)) return { ok: false, testo: t.serveIndirizzo }

  const tenant = await tenantDi(indirizzo, RIPIEGO)
  const accesso = await accediDalBrowser(tenant, indirizzo, PERMESSI, 'onedrive')
  // Interrotto da un accesso nuovo: parla quello, questo tace.
  if (!accesso.ok) return accesso.interrotto ? null : { ok: false, testo: t.nonCollegato(accesso.errore) }

  let chi: { userPrincipalName?: string, mail?: string, displayName?: string }
  try {
    chi = await chiediAGraph(
      accesso.gettoni.access_token ?? '',
      '/me?$select=userPrincipalName,mail,displayName',
    )
  } catch (guasto) {
    return { ok: false, testo: t.nonCollegato((guasto as Error).message) }
  }

  // Si tiene il nome con cui Microsoft conosce l'account: nel browser se ne
  // può scegliere un altro da quello scritto.
  const entrato = chi.userPrincipalName || chi.mail || indirizzo
  await tieni(entrato, chi.displayName ?? '', tenant, accesso.gettoni)
  return {
    ok: true,
    testo: stessoIndirizzo(entrato, indirizzo)
      ? t.collegato(entrato)
      : t.collegatoAltro(entrato, indirizzo),
  }
}

/** L'indirizzo da proporre: la casella della posta, se non è già collegata. */
function propostaIndirizzo (): string {
  const suo = casella()
  if (!suo) return ''
  return conRinnovo.has(suo.accesso.toLowerCase()) ? '' : suo.accesso
}

async function tieni (
  indirizzo: string,
  nome: string,
  tenant: string,
  gettoni: Gettoni,
): Promise<void> {
  const chiave = indirizzo.toLowerCase()
  if (gettoni.refresh_token) {
    await portachiavi?.store(chiaveRinnovo(indirizzo), gettoni.refresh_token)
    conRinnovo.add(chiave)
  }
  if (gettoni.access_token) {
    inTasca.set(chiave, {
      gettone: gettoni.access_token,
      scade: Date.now() + (gettoni.expires_in ?? 3600) * 1000,
    })
  }
  elenco = [
    ...elenco.filter((voce) => !stessoIndirizzo(voce.indirizzo, indirizzo)),
    { indirizzo, nome, tenant },
  ]
  await salvaElenco()
}

/** Toglie un account: il gettone dal portachiavi e la riga dall'elenco. */
export async function togliAccount (indirizzo: string): Promise<EsitoAccount> {
  const t = testi()
  const voce = salvato(indirizzo)
  if (!voce) return { ok: false, testo: t.sconosciuto(indirizzo) }
  await portachiavi?.delete(chiaveRinnovo(voce.indirizzo))
  conRinnovo.delete(voce.indirizzo.toLowerCase())
  inTasca.delete(voce.indirizzo.toLowerCase())
  elenco = elenco.filter((altro) => altro !== voce)
  await salvaElenco()
  return { ok: true, testo: t.tolto(voce.indirizzo) }
}

// ------------------------------------------------------------------ i gettoni

/**
 * Un gettone buono adesso per quell'account: quello in memoria se vale ancora
 * almeno un minuto, altrimenti uno rinnovato. Solleva con la frase da mostrare.
 */
async function gettoneDi (indirizzo: string): Promise<string> {
  const voce = salvato(indirizzo)
  if (!voce) throw new Error(testi().sconosciuto(indirizzo))
  const chiave = voce.indirizzo.toLowerCase()

  const tasca = inTasca.get(chiave)
  if (tasca && tasca.scade - 60_000 > Date.now()) return tasca.gettone

  const gia = inRinnovo.get(chiave)
  if (gia) return await gia
  const rinnovo = rinnova(voce).finally(() => inRinnovo.delete(chiave))
  inRinnovo.set(chiave, rinnovo)
  return await rinnovo
}

async function rinnova (voce: AccountSalvato): Promise<string> {
  const chiave = voce.indirizzo.toLowerCase()
  const rinnovo = await portachiavi?.get(chiaveRinnovo(voce.indirizzo))
  if (!rinnovo) {
    conRinnovo.delete(chiave)
    throw new Error(testi().daRicollegare(voce.indirizzo))
  }

  let risposta: Gettoni
  try {
    risposta = await rinnovaConMicrosoft(voce.tenant, rinnovo, PERMESSI)
  } catch (guasto) {
    throw new Error(testi().senzaRete, { cause: guasto })
  }
  if (!risposta.access_token) {
    // `invalid_grant` non guarisce da solo (password cambiata, permesso
    // revocato): si butta, e l'account torna «da ricollegare».
    if (risposta.error === 'invalid_grant') {
      await portachiavi?.delete(chiaveRinnovo(voce.indirizzo))
      conRinnovo.delete(chiave)
      alCambio.fire()
    }
    throw new Error(spiega(risposta.error, risposta.error_description, 'onedrive'))
  }

  inTasca.set(chiave, {
    gettone: risposta.access_token,
    scade: Date.now() + (risposta.expires_in ?? 3600) * 1000,
  })
  // Microsoft può ruotare il gettone di rinnovo: si tiene sempre l'ultimo.
  if (risposta.refresh_token) {
    await portachiavi?.store(chiaveRinnovo(voce.indirizzo), risposta.refresh_token)
  }
  return risposta.access_token
}

// ------------------------------------------------------------------ Graph

/** L'errore che Graph mette nel corpo: `{ error: { code, message } }`. */
interface CorpoErrore {
  error?: { code?: string, message?: string }
}

/** Un rifiuto di Graph, con lo stato HTTP: un 401 si ritenta, gli altri no. */
class RifiutoGraph extends Error {
  constructor (messaggio: string, readonly stato: number) {
    super(messaggio)
  }
}

/**
 * `fetch` che, se la rete manca o Microsoft non risponde in tempo, dice questo
 * e non «fetch failed».
 */
async function aGraph (indirizzo: string, opzioni: RequestInit): Promise<Response> {
  try {
    return await fetch(indirizzo, opzioni)
  } catch (guasto) {
    throw new Error(testi().senzaRete, { cause: guasto })
  }
}

async function chiediAGraph<T> (gettone: string, percorso: string): Promise<T> {
  // I rimandi alla pagina successiva arrivano già interi.
  const risposta = await aGraph(percorso.startsWith(`${GRAPH}/`) ? percorso : `${GRAPH}${percorso}`, {
    headers: { authorization: `Bearer ${gettone}`, accept: 'application/json' },
    signal: AbortSignal.timeout(ATTESA_MS),
  })
  if (!risposta.ok) throw await guastoDi(risposta)
  return (await risposta.json()) as T
}

/** La frase di un rifiuto di Graph: quel che Microsoft dice, o almeno il codice HTTP. */
async function guastoDi (risposta: Response): Promise<RifiutoGraph> {
  const t = testi()
  let detto = ''
  try {
    const corpo = (await risposta.json()) as CorpoErrore
    detto = corpo.error?.message ?? corpo.error?.code ?? ''
  } catch {
    // Un corpo che non è JSON: basta lo stato.
  }
  const stato = risposta.status
  if (stato === 404) return new RifiutoGraph(t.nonTrovato, stato)
  if (stato === 403) return new RifiutoGraph(t.negato(detto), stato)
  return new RifiutoGraph(t.graphRifiuta(stato, detto), stato)
}

/**
 * Una lettura di Graph a nome di un account. Un 401 vuol dire gettone
 * ritirato prima del tempo: se ne prende uno nuovo e si riprova una volta.
 */
export async function leggiDaGraph<T> (indirizzo: string, percorso: string): Promise<T> {
  try {
    return await chiediAGraph<T>(await gettoneDi(indirizzo), percorso)
  } catch (guasto) {
    if (!(guasto instanceof RifiutoGraph) || guasto.stato !== 401) throw guasto
    inTasca.delete(indirizzo.trim().toLowerCase())
    return await chiediAGraph<T>(await gettoneDi(indirizzo), percorso)
  }
}

/**
 * Il contenuto di un file. Graph risponde con un rimando a un indirizzo già
 * firmato: `fetch` lo segue, e toglie da sé l'intestazione con il gettone
 * passando a un'altra origine.
 */
export async function scaricaDaGraph (indirizzo: string, percorso: string): Promise<Uint8Array> {
  const risposta = await aGraph(`${GRAPH}${percorso}`, {
    headers: { authorization: `Bearer ${await gettoneDi(indirizzo)}` },
    signal: AbortSignal.timeout(ATTESA_SCARICO_MS),
  })
  if (!risposta.ok) throw await guastoDi(risposta)
  return new Uint8Array(await risposta.arrayBuffer())
}
