// OneDrive per il registro: sfogliare le cartelle di un account, cercare i
// documenti `.regi`, e aprirne uno. Si apre sempre un file sul disco: quello
// che il client di OneDrive sincronizza, se c'è, così le modifiche tornano su
// OneDrive da sole; altrimenti una copia scaricata dove si sceglie, che però
// non torna su nessuno (lo si dice).
//
// Un account che il client sincronizza su questo computer si legge dalle sue
// cartelle, senza Graph: non serve nessun consenso, e le scuole che lo
// riservano all'amministratore non fermano niente. Graph resta per gli account
// collegati che qui non sono sincronizzati.

import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import * as os from 'node:os'
import * as percorsi from 'node:path'

import * as apparato from 'apparato'

import {
  DRIVE_LOCALE,
  èRegi,
  ordinaVoci,
  percorsoDaGraph,
  voceDaGraph,
  type ElementoGraph,
  type VoceOneDrive,
} from '#core/dominio/onedrive.js'
import { parole } from '#core/dominio/words.testi.js'
import { leggiDaGraph, rileggiOneDriveLocali, scaricaDaGraph } from './microsoft.js'
import { cartelleLocaliDi } from './oneDriveLocal.js'
import { ESTENSIONE } from './package.js'
import { testi } from './onedrive.testi.js'

export type { VoceOneDrive } from '#core/dominio/onedrive.js'

/** I campi che servono di ogni elemento: il resto Graph non lo manda. */
const CAMPI = 'id,name,size,lastModifiedDateTime,folder,file,package,parentReference,remoteItem'

/** Oltre tante voci in una cartella si smette: nessuno le scorre, e ogni pagina è una richiesta. */
const MASSIMO_VOCI = 5000

/** Oltre tanti risultati la ricerca si ferma: sono già più documenti di quanti se ne aprano. */
const MASSIMO_TROVATI = 500

/**
 * Perché una ricerca si è fermata prima di guardare tutto: troppe voci (o
 * cartelle), o il tempo finito. `null` se ha guardato tutto.
 */
type Fermata = 'troppi' | 'tempo' | null

/** Quel che torna una ricerca: le voci, e se e perché è incompleta. */
interface Trovate {
  voci: VoceOneDrive[]
  troncato: boolean
  motivo: Fermata
}

/** Una pagina di Graph: le voci, e dove sta la successiva. */
interface Pagina {
  value?: ElementoGraph[]
  '@odata.nextLink'?: string
}

/** Tutte le pagine di un elenco, fino a `massimo` elementi. */
async function tutteLePagine (
  account: string,
  primo: string,
  massimo: number,
): Promise<{ elementi: ElementoGraph[], troncato: boolean }> {
  const elementi: ElementoGraph[] = []
  let prossima: string | undefined = primo
  while (prossima) {
    const pagina: Pagina = await leggiDaGraph<Pagina>(account, prossima)
    elementi.push(...(pagina.value ?? []))
    if (elementi.length >= massimo) return { elementi: elementi.slice(0, massimo), troncato: true }
    prossima = pagina['@odata.nextLink']
  }
  return { elementi, troncato: false }
}

/** Il drive dell'account, chiesto una volta per account. */
const drivePropri = new Map<string, Promise<string>>()

function driveDi (account: string): Promise<string> {
  const chiave = account.trim().toLowerCase()
  let drive = drivePropri.get(chiave)
  if (!drive) {
    drive = leggiDaGraph<{ id?: string }>(account, '/me/drive?$select=id').then((letto) => letto.id ?? '')
    // Un guasto non resta in memoria: la prossima volta si richiede.
    drive.catch(() => drivePropri.delete(chiave))
    drivePropri.set(chiave, drive)
  }
  return drive
}

/** Un pezzo di indirizzo di Graph: gli id hanno `!` e simili, che nell'indirizzo vanno protetti. */
function pezzo (testo: string): string {
  return encodeURIComponent(testo)
}

/** Quel che si vede aprendo una cartella. */
interface CartellaOneDrive {
  account: string
  drive: string
  /** L'id della cartella; `null` per la radice. */
  cartella: string | null
  nome: string
  /** Le cartelle dalla radice fino a questa, esclusa. */
  percorso: string[]
  /** La cartella di sopra; `null` alla radice, o se non si può salire. */
  superiore: string | null
  voci: VoceOneDrive[]
  /** I file che non sono documenti del registro: si contano, non si mostrano. */
  altri: number
  /** Vero se la cartella aveva più di `MASSIMO_VOCI` elementi. */
  troncato: boolean
  /** Vero se letta dalle cartelle sincronizzate sul computer, non da Graph. */
  locale: boolean
}

/** Le cartelle sincronizzate dell'account, rilette se l'account non c'è ancora. */
async function radiciLocali (account: string): Promise<string[]> {
  if (cartelleLocaliDi(account).length === 0) await rileggiOneDriveLocali()
  return cartelleLocaliDi(account)
}

/** Se `dentro` sta in `radice` (o è lei): un id venuto da fuori non esce dalle cartelle di OneDrive. */
function sotto (radice: string, dentro: string): boolean {
  const relativo = percorsi.relative(radice, dentro)
  return !relativo.startsWith('..') && !percorsi.isAbsolute(relativo)
}

/** La cartella sincronizzata che contiene `dove`, o `null` se non ce n'è. */
function radiceDi (radici: readonly string[], dove: string): string | null {
  // La più lunga: una libreria può stare dentro la cartella di un'altra.
  return [...radici].sort((a, b) => b.length - a.length)
    .find((radice) => sotto(radice, dove)) ?? null
}

/** Una voce letta dal disco: l'id è il percorso intero. */
async function voceLocale (
  cartella: string,
  voce: Dirent,
  radice: string,
): Promise<VoceOneDrive | null> {
  if (voce.name.startsWith('.')) return null
  const dove = percorsi.join(cartella, voce.name)
  const dentro = percorsi.relative(radice, cartella).split(percorsi.sep)
  const percorso = [percorsi.basename(radice), ...dentro].filter(Boolean)
  if (voce.isDirectory()) {
    return {
      id: dove,
      drive: DRIVE_LOCALE,
      nome: voce.name,
      genere: 'cartella',
      dimensione: 0,
      modificato: '',
      percorso,
      figli: null,
    }
  }
  if (!voce.isFile() || !èRegi(voce.name)) return null
  // `stat` non scarica un file che è solo nel cloud: legge il segnaposto.
  const letto = await stat(dove).catch(() => null)
  return {
    id: dove,
    drive: DRIVE_LOCALE,
    nome: voce.name,
    genere: 'regi',
    dimensione: letto?.size ?? 0,
    modificato: letto ? letto.mtime.toISOString() : '',
    percorso,
    figli: null,
  }
}

/**
 * Una cartella sincronizzata. Alla radice, con più cartelle (la personale e le
 * librerie condivise), si mostrano quelle; con una sola, il suo contenuto.
 */
async function elencaLocale (
  account: string,
  radici: readonly string[],
  cartella?: string,
): Promise<CartellaOneDrive> {
  const t = testi()
  if (!cartella && radici.length > 1) {
    return {
      account,
      drive: DRIVE_LOCALE,
      cartella: null,
      nome: '',
      percorso: [],
      superiore: null,
      voci: ordinaVoci(radici.map((radice) => ({
        id: radice,
        drive: DRIVE_LOCALE,
        nome: percorsi.basename(radice),
        genere: 'cartella' as const,
        dimensione: 0,
        modificato: '',
        percorso: [],
        figli: null,
      }))),
      altri: 0,
      troncato: false,
      locale: true,
    }
  }

  const dove = percorsi.resolve(cartella || radici[0])
  const radice = radiceDi(radici, dove)
  if (!radice) throw new Error(t.fuoriDaOneDrive)
  const elementi = await readdir(dove, { withFileTypes: true })
  const lette = elementi.slice(0, MASSIMO_VOCI)
  const voci: VoceOneDrive[] = []
  for (const elemento of lette) {
    const voce = await voceLocale(dove, elemento, radice)
    if (voce) voci.push(voce)
  }
  const inRadice = percorsi.relative(radice, dove) === ''
  const pezzi = percorsi.relative(radice, dove).split(percorsi.sep).filter(Boolean)
  return {
    account,
    drive: DRIVE_LOCALE,
    cartella: inRadice && radici.length === 1 ? null : dove,
    nome: inRadice ? percorsi.basename(radice) : percorsi.basename(dove),
    percorso: inRadice ? [] : [percorsi.basename(radice), ...pezzi.slice(0, -1)],
    superiore: inRadice ? null : percorsi.dirname(dove),
    voci: ordinaVoci(voci),
    altri: elementi.filter((voce) => voce.isFile() && !voce.name.startsWith('.')).length -
      voci.filter((voce) => voce.genere === 'regi').length,
    troncato: elementi.length > MASSIMO_VOCI,
    locale: true,
  }
}

/** Quante cartelle si guardano al più cercando: un OneDrive grande non blocca il registro. */
const MASSIMO_CARTELLE = 20_000

/**
 * Quanto dura al più una ricerca sul disco: una cartella solo nel cloud si
 * elenca chiedendo al client, e mille così durano minuti. Quel che si è
 * trovato si mostra, detto incompleto.
 */
const TEMPO_MASSIMO_RICERCA_MS = 20_000

/** Una cartella letta entro `scadenza`, o `null` se il tempo finisce prima. */
async function leggiEntro (cartella: string, scadenza: number): Promise<Dirent[] | null> {
  let sveglia: ReturnType<typeof setTimeout> | undefined
  const tardi = new Promise<null>((risolvi) => {
    sveglia = setTimeout(() => risolvi(null), Math.max(0, scadenza - Date.now()))
  })
  try {
    return await Promise.race([
      readdir(cartella, { withFileTypes: true }).catch(() => []),
      tardi,
    ])
  } finally {
    clearTimeout(sveglia)
  }
}

/**
 * I `.regi` delle cartelle sincronizzate, cercati sul disco. Leggere una
 * cartella che è solo nel cloud la fa elencare al client, senza scaricare i
 * file.
 */
async function cercaLocale (radici: readonly string[]): Promise<Trovate> {
  const voci: VoceOneDrive[] = []
  const fermata = (motivo: Fermata): Trovate =>
    ({ voci: ordinaTrovate(voci), troncato: motivo !== null, motivo })
  // In ampiezza su tutte le radici insieme: col tetto, nessuna resta non vista.
  const daVedere = radici.map((radice) => ({ cartella: radice, radice }))
  const scadenza = Date.now() + TEMPO_MASSIMO_RICERCA_MS
  let viste = 0
  while (daVedere.length > 0) {
    // Prima il tempo: se scadono insieme, quel che si è notato è l'attesa.
    if (Date.now() >= scadenza) return fermata('tempo')
    if (viste >= MASSIMO_CARTELLE || voci.length >= MASSIMO_TROVATI) return fermata('troppi')
    const { cartella, radice } = daVedere.shift() as { cartella: string, radice: string }
    viste += 1
    const elementi = await leggiEntro(cartella, scadenza)
    if (!elementi) return fermata('tempo')
    for (const elemento of elementi) {
      const voce = await voceLocale(cartella, elemento, radice)
      if (!voce) continue
      if (voce.genere === 'cartella') daVedere.push({ cartella: voce.id, radice })
      else voci.push(voce)
    }
  }
  return fermata(null)
}

function ordinaTrovate (voci: VoceOneDrive[]): VoceOneDrive[] {
  return voci.sort((a, b) => b.modificato.localeCompare(a.modificato))
}

/**
 * Una cartella di OneDrive: sottocartelle e documenti `.regi`. Senza
 * `cartella` è la radice. Dalle cartelle sincronizzate se l'account lo è su
 * questo computer, altrimenti da Graph.
 */
export async function elencaCartella (
  account: string,
  drive?: string,
  cartella?: string,
): Promise<CartellaOneDrive> {
  if (!drive || drive === DRIVE_LOCALE) {
    const radici = await radiciLocali(account)
    if (radici.length > 0) return await elencaLocale(account, radici, cartella)
    if (drive === DRIVE_LOCALE) throw new Error(testi().nonSincronizzato(account))
  }
  return await elencaDaGraph(account, drive, cartella)
}

async function elencaDaGraph (
  account: string,
  drive?: string,
  cartella?: string,
): Promise<CartellaOneDrive> {
  const proprio = await driveDi(account)
  const suo = drive || proprio
  const base = cartella
    ? `/drives/${pezzo(suo)}/items/${pezzo(cartella)}`
    : drive && drive !== proprio
      ? `/drives/${pezzo(suo)}/root`
      : '/me/drive/root'

  const [questa, contenuto] = await Promise.all([
    leggiDaGraph<ElementoGraph>(account, `${base}?$select=id,name,parentReference,root`),
    tutteLePagine(account, `${base}/children?$select=${CAMPI}&$top=200`, MASSIMO_VOCI),
  ])

  const radice = !cartella || Boolean((questa as { root?: object }).root)
  const voci: VoceOneDrive[] = []
  for (const elemento of contenuto.elementi) {
    const voce = voceDaGraph(elemento, suo)
    if (voce) voci.push(voce)
  }

  return {
    account,
    drive: suo,
    cartella: radice ? null : questa.id ?? cartella ?? null,
    nome: radice ? '' : questa.name ?? '',
    percorso: radice ? [] : percorsoDaGraph(questa.parentReference?.path),
    superiore: radice ? null : questa.parentReference?.id ?? null,
    voci: ordinaVoci(voci),
    altri: contenuto.elementi.length - voci.length,
    troncato: contenuto.troncato,
    locale: false,
  }
}

/**
 * Tutti i documenti `.regi` di un account: sul disco, nelle cartelle
 * sincronizzate, se l'account lo è su questo computer; altrimenti quelli che
 * Microsoft trova nel suo OneDrive e fra quelli condivisi con lui.
 */
export async function cercaRegi (
  account: string,
): Promise<Trovate & { locale: boolean }> {
  const radici = await radiciLocali(account)
  if (radici.length > 0) return { ...(await cercaLocale(radici)), locale: true }
  return { ...(await cercaDaGraph(account)), locale: false }
}

/**
 * Si appoggia all'indice di Microsoft, che per un file appena caricato può
 * arrivare in ritardo: per quello resta la navigazione a mano.
 */
async function cercaDaGraph (account: string): Promise<Trovate> {
  const proprio = await driveDi(account)
  const [propri, condivisi] = await Promise.all([
    tutteLePagine(account, `/me/drive/root/search(q='.regi')?$select=${CAMPI}&$top=200`, MASSIMO_TROVATI),
    // `sharedWithMe` Microsoft lo sta ritirando: se non risponde, restano i propri.
    tutteLePagine(account, '/me/drive/sharedWithMe', MASSIMO_TROVATI)
      .catch(() => ({ elementi: [], troncato: false })),
  ])

  const visti = new Set<string>()
  const voci: VoceOneDrive[] = []
  for (const elemento of [...propri.elementi, ...condivisi.elementi]) {
    const voce = voceDaGraph(elemento, proprio)
    if (!voce || voce.genere !== 'regi') continue
    const chiave = `${voce.drive}/${voce.id}`
    if (visti.has(chiave)) continue
    visti.add(chiave)
    voci.push(voce)
  }
  voci.sort((a, b) => b.modificato.localeCompare(a.modificato))
  const troncato = propri.troncato || condivisi.troncato
  return { voci, troncato, motivo: troncato ? 'troppi' : null }
}

// ------------------------------------------------------------------ aprire

/** Com'è andata l'apertura: il file sul disco, e se è quello sincronizzato. */
interface EsitoApertura {
  percorso: string
  sincronizzato: boolean
}

/**
 * Se sul disco c'è quel file, con la misura che dice Graph. Il nome da solo non
 * basta: due account possono avere lo stesso `2026-2027.regi` nello stesso
 * posto, e aprire quello dell'altro è peggio che scaricare una copia.
 */
async function stessoFile (percorso: string, misura: number | undefined): Promise<boolean> {
  try {
    const letto = await stat(percorso)
    return letto.isFile() && misura !== undefined && letto.size === misura
  } catch {
    return false
  }
}

/**
 * Le cartelle in cui OneDrive sincronizza quell'account su questo computer.
 * Su Windows dal registro di sistema, che le lega all'indirizzo; solo se lì
 * non ce n'è nessuna, le variabili d'ambiente del client. Su macOS le
 * cartelle di `~/Library/CloudStorage`, che l'account non lo dicono: per
 * questo il file trovato deve anche avere la misura giusta (`stessoFile`).
 */
async function cartelleLocali (account: string): Promise<string[]> {
  const trovate = [...(await radiciLocali(account))]
  if (process.platform === 'win32') {
    // Sono le cartelle dell'account attivo nel client, chiunque sia.
    if (trovate.length === 0) {
      for (const variabile of ['OneDriveCommercial', 'OneDrive', 'OneDriveConsumer']) {
        const valore = process.env[variabile]
        if (valore) trovate.push(valore)
      }
    }
  } else if (process.platform === 'darwin') {
    const nuvola = percorsi.join(os.homedir(), 'Library', 'CloudStorage')
    try {
      for (const nome of await readdir(nuvola)) {
        if (nome.startsWith('OneDrive')) trovate.push(percorsi.join(nuvola, nome))
      }
    } catch {
      // Niente OneDrive su questo Mac.
    }
  }
  return [...new Set(trovate)]
}

/**
 * Apre un documento `.regi` di OneDrive: quello sincronizzato sul computer se
 * c'è, altrimenti una copia scaricata dove si sceglie. `null` se si chiude il
 * dialogo senza scegliere.
 */
export async function apriDaOneDrive (
  account: string,
  drive: string,
  id: string,
): Promise<EsitoApertura | null> {
  const t = testi()
  if (drive === DRIVE_LOCALE) return await apriLocale(account, id)
  const elemento = await leggiDaGraph<ElementoGraph>(
    account,
    `/drives/${pezzo(drive)}/items/${pezzo(id)}?$select=id,name,size,file,parentReference`,
  )
  const nome = elemento.name ?? ''
  if (!elemento.file || !èRegi(nome)) throw new Error(t.nonRegi(nome))

  // Solo il drive dell'account è sincronizzato alla sua radice: un file
  // condiviso, se lo è, sta altrove e con un altro percorso.
  if (drive === (await driveDi(account))) {
    const dentro = percorsoDaGraph(elemento.parentReference?.path)
    for (const radice of await cartelleLocali(account)) {
      const candidato = percorsi.join(radice, ...dentro, nome)
      // Un nome venuto dalla rete non porta fuori dalla cartella di OneDrive.
      const relativo = percorsi.relative(radice, candidato)
      if (relativo.startsWith('..') || percorsi.isAbsolute(relativo)) continue
      if (await stessoFile(candidato, elemento.size)) {
        return { percorso: candidato, sincronizzato: true }
      }
    }
  }

  const cartella = apparato.Uri.file(percorsi.join(os.homedir(), 'Documents'))
  const dove = await apparato.dialoghi.chiediDoveSalvare({
    title: t.doveScaricare(nome),
    saveLabel: parole().salva,
    defaultUri: apparato.Uri.joinPath(cartella, nome),
    filters: { Regiklass: [ESTENSIONE] },
  })
  if (!dove) return null

  const contenuto = await apparato.dialoghi.conAvanzamento(
    { title: t.scarico(nome) },
    async () => await scaricaDaGraph(account, `/drives/${pezzo(drive)}/items/${pezzo(id)}/content`),
  )
  await apparato.file.writeFile(dove, contenuto)
  return { percorso: dove.fsPath, sincronizzato: false }
}

/**
 * Un documento trovato nelle cartelle sincronizzate: è già il file giusto, e
 * aprirlo lo fa scaricare al client se era solo nel cloud. Si controlla che
 * stia davvero in una cartella di quell'account.
 */
async function apriLocale (account: string, dove: string): Promise<EsitoApertura> {
  const t = testi()
  const percorso = percorsi.resolve(dove)
  if (!radiceDi(await radiciLocali(account), percorso)) throw new Error(t.fuoriDaOneDrive)
  if (!èRegi(percorso)) throw new Error(t.nonRegi(percorsi.basename(percorso)))
  const letto = await stat(percorso).catch(() => null)
  if (!letto?.isFile()) throw new Error(t.nonCePiu(percorsi.basename(percorso)))
  return { percorso, sincronizzato: true }
}
