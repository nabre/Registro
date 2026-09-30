/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
// Il modulo `apparato`: il contratto fra il core/registro e la macchina.
// `core/apparato/platform.ts` definisce la porta (`Impianto`) e i delegati.
// All'avvio dell'applicazione o nelle prove, l'ospite chiama `impianta(implementazione)`.

import * as fs from 'node:fs/promises'
import * as percorso from 'node:path'

import type { StatoAggiornamenti } from '../../contract/protocol.js'

import { Smaltitore, type Event, type Smaltibile } from './events.js'
import { ViewColumn, AmbitoImpostazione } from './enumerations.js'
import { ModelloRelativo, Uri } from './uri.js'
import { testi } from './fs.testi.js'

export { Smaltitore, EventEmitter } from './events.js'
export type { Event, Smaltibile } from './events.js'
export { ViewColumn, AmbitoImpostazione } from './enumerations.js'
export { ModelloRelativo, Uri } from './uri.js'

export enum GenereFile {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface StatoFile {
  type: GenereFile
  ctime: number
  mtime: number
  size: number
}

type CodiceFile =
  | 'FileNotFound'
  | 'FileExists'
  | 'NoPermissions'
  | 'FileIsADirectory'
  | 'Unknown'

export class ErroreFile extends Error {
  readonly code: CodiceFile

  constructor (messaggio: string, code: CodiceFile = 'Unknown') {
    super(messaggio)
    this.name = 'ErroreFile'
    this.code = code
  }

  static FileNotFound (dove?: Uri | string): ErroreFile {
    return new ErroreFile(testi().nonTrovato(detto(dove)), 'FileNotFound')
  }

  static FileExists (dove?: Uri | string): ErroreFile {
    return new ErroreFile(testi().giàQualcosa(detto(dove)), 'FileExists')
  }

  static NoPermissions (dove?: Uri | string): ErroreFile {
    return new ErroreFile(testi().permessoNegato(detto(dove)), 'NoPermissions')
  }

  static FileIsADirectory (dove?: Uri | string): ErroreFile {
    return new ErroreFile(testi().èUnaCartella(detto(dove)), 'FileIsADirectory')
  }
}

function detto (dove?: Uri | string): string {
  if (dove === undefined) return testi().percorsoIgnoto
  return typeof dove === 'string' ? dove : dove.fsPath
}

function tradotto (errore: unknown, dove: Uri): ErroreFile {
  const codice = (errore as NodeJS.ErrnoException | null)?.code
  switch (codice) {
    case 'ENOENT':
    case 'ENOTDIR':
      return ErroreFile.FileNotFound(dove)
    case 'EEXIST':
    case 'ERR_FS_CP_EEXIST':
      return ErroreFile.FileExists(dove)
    case 'EPERM':
    case 'EACCES':
      return ErroreFile.NoPermissions(dove)
    case 'EISDIR':
    case 'ERR_FS_EISDIR':
      return ErroreFile.FileIsADirectory(dove)
    default: {
      const messaggio = errore instanceof Error ? errore.message : String(errore)
      return new ErroreFile(`${messaggio} (${dove.fsPath})`)
    }
  }
}

export interface CambioImpostazione {
  affectsConfiguration (sezione: string): boolean
}

export interface Configurazione {
  get<T = unknown> (chiave: string): T | undefined
  get<T = unknown> (chiave: string, ripiego: T): T
  has (chiave: string): boolean
  inspect<T> (chiave: string): { key: string; defaultValue?: T; globalValue?: T } | undefined
  update (chiave: string, valore: unknown, target?: AmbitoImpostazione): Promise<void>
}

export interface CambioSegreti {
  key?: string
  chiave?: string
}

export interface DepositoSegreti {
  get(chiave: string): Promise<string | undefined>
  store(chiave: string, valore: string): Promise<void>
  delete(chiave: string): Promise<void>
  onDidChange: Event<CambioSegreti>
}

export interface VoceMessaggio {
  title: string
  isCloseAffordance?: boolean
}
export interface VoceScelta {
  label: string
  description?: string
  detail?: string
  picked?: boolean
}

export interface Osservatore extends Smaltibile {
  onDidChange: (ascoltatore: (e: Uri) => void) => Smaltibile
  onDidCreate: (ascoltatore: (e: Uri) => void) => Smaltibile
  onDidDelete: (ascoltatore: (e: Uri) => void) => Smaltibile
}

export interface CartellaDiLavoro {
  readonly uri: Uri
  readonly name: string
  readonly index: number
}

export interface ContestoApplicazione {
  readonly subscriptions: Array<{ dispose (): unknown }>
  readonly extensionUri: Uri
  readonly extensionPath: string
  readonly globalStorageUri: Uri
  readonly secrets: DepositoSegreti
}

export interface OpzioniWebview {
  enableScripts?: boolean
  retainContextWhenHidden?: boolean
  localResourceRoots?: Uri[]
}

export interface Webview {
  html: string
  readonly cspSource: string
  options: OpzioniWebview
  asWebviewUri (risorsa: Uri): Uri
  postMessage (messaggio: unknown): Promise<boolean>
  onDidReceiveMessage: Event<unknown>
}

export interface WebviewPanel {
  readonly webview: Webview
  readonly viewColumn: ViewColumn | number | undefined
  title: string
  iconPath?: Uri | { light: Uri; dark: Uri }
  onDidDispose: Event<void>
  readonly idContenuti?: number
  reveal (colonna?: ViewColumn | number, senzaFuoco?: boolean): void
  dispose (): void
}

interface InterfacciaFileSystem {
  readFile (uri: Uri): Promise<Uint8Array>
  writeFile (uri: Uri, contenuto: Uint8Array, opzioni?: { sincronizza?: boolean }): Promise<void>
  createDirectory (uri: Uri): Promise<void>
  readDirectory (uri: Uri): Promise<Array<[string, GenereFile]>>
  stat (uri: Uri): Promise<StatoFile>
  rename (da: Uri, a: Uri, opzioni?: { overwrite?: boolean }): Promise<void>
  copy (da: Uri, a: Uri, opzioni?: { overwrite?: boolean }): Promise<void>
  delete (uri: Uri, opzioni?: { recursive?: boolean; useTrash?: boolean }): Promise<void>
  isWritableFileSystem (schema: string): boolean
}

/** Come si sceglie il percorso di una voce con il dialogo del sistema. */
export interface DialogoPercorso {
  titolo: string
  cartella: boolean
  /** Per nome del filtro, le estensioni senza punto. Vuoto per le cartelle. */
  filtri: Record<string, string[]>
  /** Da dove parte il dialogo: il percorso scritto adesso, se c'è. */
  da: string
}

interface DoganaImpostazioni {
  /** Vero se la chiave è dichiarata nel manifesto. */
  dichiarata: (chiave: string) => boolean
  /** Il valore ammesso per la chiave, o `undefined` con il motivo. */
  valoreConMotivo: (
    chiave: string,
    valore: unknown,
  ) => { valore: string | number | boolean | undefined, motivo: string | null }
  /** Il dialogo per scegliere il percorso della voce, se è un percorso. */
  dialogoPercorso: (chiave: string) => DialogoPercorso | null
}

export interface Impianto {
  file: InterfacciaFileSystem
  accodaSe? (uri: Uri, misura: number, fine: Uint8Array, pezzi: Uint8Array[]): Promise<boolean>
  finisceCon? (uri: Uri, misura: number, fine: Uint8Array): Promise<boolean>
  cartelleDiLavoro? (): CartellaDiLavoro[] | undefined
  osserva? (glob: string | ModelloRelativo, ascoltatore?: (evento: Uri) => void): Osservatore
  impostazioni: {
    leggi: (sezione?: string) => Configurazione
    alCambio: (ascoltatore: (cambio: CambioImpostazione) => void) => Smaltibile
    /** Le regole del manifesto sulle impostazioni del programma: le conosce l'ospite. */
    dogana?: DoganaImpostazioni
  }
  finestre?: {
    crea: (tipo: string, titolo: string, colonna: any, opzioni?: any) => WebviewPanel
  }
  dialoghi?: {
    informa: (messaggio: string, ...resto: any[]) => Promise<string | undefined>
    avvisa: (messaggio: string, ...resto: any[]) => Promise<string | undefined>
    errore: (messaggio: string, ...resto: any[]) => Promise<string | undefined>
    chiediTesto: (opzioni?: any) => Promise<string | undefined>
    chiediScelta: <T extends VoceScelta>(
      voci: T[] | Promise<T[]>,
      opzioni?: any,
    ) => Promise<T | undefined>
    chiediFile: (opzioni?: any) => Promise<Uri[] | undefined>
    chiediDoveSalvare: (opzioni?: any) => Promise<Uri | undefined>
    apriDocumento: (cosa: any, opzioni?: any) => Promise<void>
    conAvanzamento: <T>(opzioni: any, compito: (avanzamento: any) => Promise<T>) => Promise<T>
  }
  comandi?: {
    registra: (nome: string, gestore: any) => Smaltibile
    esegui: <T = unknown>(comando: string, ...argomenti: any[]) => Promise<T>
  }
  esterno?: {
    apri: (indirizzo: Uri | string) => Promise<boolean | void>
    appunti: {
      readText?: () => Promise<string> | string
      writeText?: (testo: string) => Promise<void> | void
      leggi?: () => string
      scrivi?: (testo: string) => void
    }
  }
  aggiornamenti?: {
    stato: () => StatoAggiornamenti
    alCambio: (ascoltatore: (evento: StatoAggiornamenti) => void) => Smaltibile
    controlla: () => Promise<void> | void
    scarica: () => Promise<void> | void
    installa: () => Promise<boolean> | boolean
    nascondiNotizia: (notizia: string) => void
  }
  documenti?: {
    impostaPreferito: (percorso: string, preferito: boolean) => void
    dimentica: (percorso: string) => void
  }
  ricaricaImpostazioni? (): void
  htmlDellaPagina? (id: string): string | undefined
  radiciConcesse? (): Uri[]
  percorsoCaratteriPdf? (): string
  percorsoWorkerPdf? (): string
  versioneApplicazione? (): string
  aEspressione? (glob: string, indifferenteAlleMaiuscole?: boolean): RegExp
  senzaGraffe? (glob: string): string[]
  senzaSegnaposti? (testo: string): string
  applicaTema? (tema: string): void
  coloreSfondo? (): string
  dimensioneTesto? (): number
  osservaTema? (ascoltatore: any): Smaltibile
  preferenzeComuni? (): any
  scuro? (): boolean
  diSistema? (comando: string): string | undefined
}

const filePredefinito: InterfacciaFileSystem = {
  async readFile (uri: Uri): Promise<Uint8Array> {
    try {
      return await fs.readFile(uri.fsPath)
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },
  async writeFile (
    uri: Uri,
    contenuto: Uint8Array,
    opzioni?: { sincronizza?: boolean },
  ): Promise<void> {
    try {
      if (opzioni?.sincronizza) {
        const fileHandle = await fs.open(uri.fsPath, 'w')
        try {
          await fileHandle.writeFile(contenuto)
          await fileHandle.sync()
        } finally {
          await fileHandle.close()
        }
      } else {
        await fs.writeFile(uri.fsPath, contenuto)
      }
    } catch (errore) {
      if ((errore as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw tradotto(errore, uri)
      try {
        await fs.mkdir(percorso.dirname(uri.fsPath), { recursive: true })
        await fs.writeFile(uri.fsPath, contenuto)
      } catch (secondo) {
        throw tradotto(secondo, uri)
      }
    }
  },
  async createDirectory (uri: Uri): Promise<void> {
    try {
      await fs.mkdir(uri.fsPath, { recursive: true })
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },
  async readDirectory (uri: Uri): Promise<Array<[string, GenereFile]>> {
    try {
      const voci = await fs.readdir(uri.fsPath, { withFileTypes: true })
      return voci.map((v) => [
        v.name,
        v.isDirectory()
          ? GenereFile.Directory
          : v.isFile()
            ? GenereFile.File
            : GenereFile.Unknown,
      ])
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },
  async stat (uri: Uri): Promise<StatoFile> {
    try {
      const dati = await fs.stat(uri.fsPath)
      return {
        type: dati.isDirectory()
          ? GenereFile.Directory
          : dati.isFile()
            ? GenereFile.File
            : GenereFile.Unknown,
        ctime: Math.round(dati.birthtimeMs || dati.ctimeMs),
        mtime: Math.round(dati.mtimeMs),
        size: dati.size,
      }
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },
  async rename (da: Uri, a: Uri): Promise<void> {
    try {
      await fs.rename(da.fsPath, a.fsPath)
    } catch (errore) {
      throw tradotto(errore, da)
    }
  },
  async copy (da: Uri, a: Uri, opzioni?: { overwrite?: boolean }): Promise<void> {
    try {
      await fs.cp(da.fsPath, a.fsPath, { recursive: true, force: opzioni?.overwrite ?? false })
    } catch (errore) {
      throw tradotto(errore, da)
    }
  },
  async delete (uri: Uri, opzioni?: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
    try {
      await fs.rm(uri.fsPath, { recursive: opzioni?.recursive ?? false, force: true })
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },
  isWritableFileSystem (): boolean {
    return true
  },
}

async function accodaSePredefinito (
  uri: Uri,
  misura: number,
  fine: Uint8Array,
  pezzi: Uint8Array[],
): Promise<boolean> {
  let f: fs.FileHandle | null = null
  try {
    try {
      f = await fs.open(uri.fsPath, 'r+')
    } catch {
      return false
    }
    // Un handle solo per controllo e scritture: vedi `accodaSe` sul desktop.
    if (!(await finisceGiàAperto(f, misura, fine))) return false
    let da = misura
    for (const pezzo of pezzi) {
      await f.write(pezzo, 0, pezzo.length, da)
      await f.sync()
      da += pezzo.length
    }
    return true
  } catch (errore) {
    throw tradotto(errore, uri)
  } finally {
    await f?.close()
  }
}

async function finisceGiàAperto (
  f: fs.FileHandle,
  misura: number,
  fine: Uint8Array,
): Promise<boolean> {
  const { size } = await f.stat()
  if (size !== misura || fine.length > size) return false
  const letto = Buffer.alloc(fine.length)
  const { bytesRead } = await f.read(letto, 0, fine.length, size - fine.length)
  return bytesRead === fine.length && letto.equals(fine)
}

async function finisceConPredefinito (
  uri: Uri,
  misura: number,
  fine: Uint8Array,
): Promise<boolean> {
  let f: fs.FileHandle | null = null
  try {
    try {
      f = await fs.open(uri.fsPath, 'r')
    } catch {
      return false
    }
    return await finisceGiàAperto(f, misura, fine)
  } catch {
    return false
  } finally {
    await f?.close()
  }
}

const impiantoPredefinito: Impianto = {
  file: filePredefinito,
  accodaSe: accodaSePredefinito,
  finisceCon: finisceConPredefinito,
  impostazioni: {
    leggi: () => ({
      get: <T>(_chiave: string, ripiego?: T) => ripiego,
      has: () => false,
      inspect: () => undefined,
      update: () => Promise.resolve(),
    }),
    alCambio: () => new Smaltitore(() => {}),
  },
}

let impiantoAttivo: Impianto = impiantoPredefinito

export function impianta (nuovoImpianto: Impianto): void {
  impiantoAttivo = nuovoImpianto
}

function ottieniImpianto (): Impianto {
  return impiantoAttivo
}

export const file: InterfacciaFileSystem = {
  readFile: (uri) => ottieniImpianto().file.readFile(uri),
  writeFile: (uri, contenuto, opzioni) => ottieniImpianto().file.writeFile(uri, contenuto, opzioni),
  createDirectory: (uri) => ottieniImpianto().file.createDirectory(uri),
  readDirectory: (uri) => ottieniImpianto().file.readDirectory(uri),
  stat: (uri) => ottieniImpianto().file.stat(uri),
  rename: (da, a, opzioni) => ottieniImpianto().file.rename(da, a, opzioni),
  copy: (da, a, opzioni) => ottieniImpianto().file.copy(da, a, opzioni),
  delete: (uri, opzioni) => ottieniImpianto().file.delete(uri, opzioni),
  isWritableFileSystem: (schema) => ottieniImpianto().file.isWritableFileSystem(schema),
}

export function accodaSe (
  uri: Uri,
  misura: number,
  fine: Uint8Array,
  pezzi: Uint8Array[],
): Promise<boolean> {
  const imp = ottieniImpianto()
  if (imp.accodaSe) return imp.accodaSe(uri, misura, fine, pezzi)
  return accodaSePredefinito(uri, misura, fine, pezzi)
}

export function finisceCon (uri: Uri, misura: number, fine: Uint8Array): Promise<boolean> {
  const imp = ottieniImpianto()
  if (imp.finisceCon) return imp.finisceCon(uri, misura, fine)
  return finisceConPredefinito(uri, misura, fine)
}

export function cartelleDiLavoro (): CartellaDiLavoro[] | undefined {
  return ottieniImpianto().cartelleDiLavoro?.()
}

export function osserva (
  glob: string | ModelloRelativo,
  ascoltatore?: (evento: Uri) => void,
): Osservatore {
  const imp = ottieniImpianto()
  if (imp.osserva) return imp.osserva(glob, ascoltatore)
  return new Smaltitore(() => {}) as unknown as Osservatore
}

export const impostazioni = {
  leggi: (sezione?: string): Configurazione => ottieniImpianto().impostazioni.leggi(sezione),
  alCambio: (ascoltatore: (cambio: CambioImpostazione) => void): Smaltibile =>
    ottieniImpianto().impostazioni.alCambio(ascoltatore),
  // Senza ospite non c'è manifesto da applicare: nessuna chiave passa.
  dichiarata: (chiave: string): boolean =>
    ottieniImpianto().impostazioni.dogana?.dichiarata(chiave) ?? false,
  valoreConMotivo: (chiave: string, valore: unknown) =>
    ottieniImpianto().impostazioni.dogana?.valoreConMotivo(chiave, valore) ??
      { valore: undefined, motivo: null },
  dialogoPercorso: (chiave: string): DialogoPercorso | null =>
    ottieniImpianto().impostazioni.dogana?.dialogoPercorso(chiave) ?? null,
}

export const finestre = {
  crea: (tipo: string, titolo: string, colonna: any, opzioni?: any) => {
    const fn = ottieniImpianto().finestre?.crea
    // testo-fisso: errore interno se la funzione host non è implementata
    if (!fn) throw new Error('finestre.crea non supportato dall’impianto attuale')
    return fn(tipo, titolo, colonna, opzioni)
  },
}

export const dialoghi = {
  informa: (messaggio: string, ...resto: any[]): Promise<string | undefined> =>
    ottieniImpianto().dialoghi?.informa(messaggio, ...resto) ?? Promise.resolve(undefined),
  avvisa: (messaggio: string, ...resto: any[]): Promise<string | undefined> =>
    ottieniImpianto().dialoghi?.avvisa(messaggio, ...resto) ?? Promise.resolve(undefined),
  errore: (messaggio: string, ...resto: any[]): Promise<string | undefined> =>
    ottieniImpianto().dialoghi?.errore(messaggio, ...resto) ?? Promise.resolve(undefined),
  chiediTesto: (opzioni?: any): Promise<string | undefined> =>
    ottieniImpianto().dialoghi?.chiediTesto(opzioni) ?? Promise.resolve(undefined),
  chiediScelta: <T extends VoceScelta>(
    voci: T[] | Promise<T[]>,
    opzioni?: any,
  ): Promise<T | undefined> =>
    ottieniImpianto().dialoghi?.chiediScelta(voci, opzioni) ?? Promise.resolve(undefined),
  chiediFile: (opzioni?: any): Promise<Uri[] | undefined> =>
    ottieniImpianto().dialoghi?.chiediFile?.(opzioni) ?? Promise.resolve(undefined),
  chiediDoveSalvare: (opzioni?: any): Promise<Uri | undefined> =>
    ottieniImpianto().dialoghi?.chiediDoveSalvare?.(opzioni) ?? Promise.resolve(undefined),
  apriDocumento: (cosa: any, opzioni?: any): Promise<void> =>
    ottieniImpianto().dialoghi?.apriDocumento(cosa, opzioni) ?? Promise.resolve(),
  conAvanzamento: <T>(opzioni: any, compito: (avanzamento: any) => Promise<T>): Promise<T> => {
    const fn = ottieniImpianto().dialoghi?.conAvanzamento
    if (fn) return fn(opzioni, compito)
    return compito({ report: () => {} })
  },
}

export const comandi = {
  registra: (nome: string, gestore: any) => {
    const fn = ottieniImpianto().comandi?.registra
    if (!fn) return new Smaltitore(() => {})
    return fn(nome, gestore)
  },
  esegui: <T = unknown>(comando: string, ...argomenti: any[]): Promise<T> => {
    const fn = ottieniImpianto().comandi?.esegui
    if (!fn) return Promise.resolve(undefined as T)
    return fn<T>(comando, ...argomenti)
  },
}

export const esterno = {
  apri: (indirizzo: Uri | string) =>
    ottieniImpianto().esterno?.apri(indirizzo) ?? Promise.resolve(),
  appunti: {
    readText: () => {
      const res = ottieniImpianto().esterno?.appunti?.readText?.() ?? ottieniImpianto().esterno?.appunti?.leggi?.() ?? ''
      return Promise.resolve(res)
    },
    writeText: (testo: string) => {
      void ottieniImpianto().esterno?.appunti?.writeText?.(testo)
      ottieniImpianto().esterno?.appunti?.scrivi?.(testo)
    },
    leggi: () => ottieniImpianto().esterno?.appunti?.leggi?.() ?? '',
    scrivi: (testo: string) => {
      ottieniImpianto().esterno?.appunti?.scrivi?.(testo)
      void ottieniImpianto().esterno?.appunti?.writeText?.(testo)
    },
  },
}

export const aggiornamenti = {
  stato: (): StatoAggiornamenti =>
    ottieniImpianto().aggiornamenti?.stato() ?? {
      supportato: false,
      fase: 'fermo',
      versione: '',
      pagina: '',
      racconto: { breve: '', frase: '', tono: 'quiete' },
    },
  alCambio: (ascoltatore: (evento: StatoAggiornamenti) => void): Smaltibile => {
    const fn = ottieniImpianto().aggiornamenti?.alCambio
    return fn ? fn(ascoltatore) : new Smaltitore(() => {})
  },
  controlla: (): Promise<void> | void => ottieniImpianto().aggiornamenti?.controlla(),
  scarica: (): Promise<void> | void => ottieniImpianto().aggiornamenti?.scarica(),
  installa: (): Promise<boolean> | boolean => ottieniImpianto().aggiornamenti?.installa() ?? false,
  nascondiNotizia: (notizia: string): void => {
    ottieniImpianto().aggiornamenti?.nascondiNotizia(notizia)
  },
}

export const documenti = {
  impostaPreferito: (percorso: string, preferito: boolean) =>
    ottieniImpianto().documenti?.impostaPreferito(percorso, preferito),
  dimentica: (percorso: string) => ottieniImpianto().documenti?.dimentica(percorso),
}

export function ricaricaImpostazioni (): void {
  ottieniImpianto().ricaricaImpostazioni?.()
}

export function htmlDellaPagina (pagina: string): string | undefined {
  return ottieniImpianto().htmlDellaPagina?.(pagina)
}

export function radiciConcesse (): Uri[] {
  return ottieniImpianto().radiciConcesse?.() ?? []
}

export function percorsoCaratteriPdf (): string {
  return ottieniImpianto().percorsoCaratteriPdf?.() ?? ''
}

export function percorsoWorkerPdf (): string {
  return ottieniImpianto().percorsoWorkerPdf?.() ?? ''
}

export function versioneApplicazione (): string {
  return ottieniImpianto().versioneApplicazione?.() ?? '0.0.0'
}

export function aEspressione (glob: string, indifferenteAlleMaiuscole?: boolean): RegExp {
  return ottieniImpianto().aEspressione?.(glob, indifferenteAlleMaiuscole) ?? new RegExp(glob)
}

export function senzaGraffe (glob: string): string[] {
  return ottieniImpianto().senzaGraffe?.(glob) ?? [glob]
}

export function senzaSegnaposti (testo: string): string {
  return ottieniImpianto().senzaSegnaposti?.(testo) ?? testo
}

export function applicaTema (tema: string): void {
  ottieniImpianto().applicaTema?.(tema)
}

export function coloreSfondo (): string {
  return ottieniImpianto().coloreSfondo?.() ?? '#ffffff'
}

export function dimensioneTesto (): number {
  return ottieniImpianto().dimensioneTesto?.() ?? 14
}

export function osservaTema (ascoltatore: (tema?: any) => void): Smaltibile {
  return ottieniImpianto().osservaTema?.(ascoltatore) ?? new Smaltitore(() => {})
}

export function preferenzeComuni (): any {
  return ottieniImpianto().preferenzeComuni?.()
}

export function scuro (): boolean {
  return ottieniImpianto().scuro?.() ?? false
}

export function diSistema (comando: string): string | undefined {
  return ottieniImpianto().diSistema?.(comando)
}
