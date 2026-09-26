// Il file system sopra `node:fs/promises`. Tre punti da non sbagliare:
//   1. gli errori portano `code` tradotto (`archive.ts` guarda `'FileNotFound'`);
//   2. `rename` con `overwrite: false` fallisce davvero (Node sovrascrive);
//   3. `useTrash` va nel cestino vero, unico rimedio a una cancellazione sbagliata.

import { shell } from 'electron'
import * as fs from 'node:fs/promises'
import * as percorso from 'node:path'

import { testi } from './fs.testi.js'
import { Uri } from './uri.js'

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

/** I codici che il registro guarda davvero, più il ripiego. */
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

/** Da errore di Node a errore che il registro sa leggere. */
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

/** Il tipo di una voce, nella forma dell'enum. */
function tipoDi (voce: {
  isFile (): boolean
  isDirectory (): boolean
  isSymbolicLink (): boolean
}): GenereFile {
  if (voce.isSymbolicLink()) return GenereFile.SymbolicLink
  if (voce.isDirectory()) return GenereFile.Directory
  if (voce.isFile()) return GenereFile.File
  return GenereFile.Unknown
}

/** Vero se a quel percorso nativo c'è qualcosa. */
async function esiste (nativo: string): Promise<boolean> {
  try {
    await fs.access(nativo)
    return true
  } catch {
    return false
  }
}

/** I rifiuti di Windows che vogliono dire «il file è occupato adesso», non «non puoi». */
const OCCUPATO = new Set(['EPERM', 'EACCES', 'EBUSY'])

/**
 * `fs.rename` che su Windows riprova per due secondi, con attese crescenti come
 * `graceful-fs`: un file tenuto aperto un attimo (antivirus, sincronizzazione,
 * osservatore) fa fallire la rinomina con `EPERM`.
 */
async function rinominaConPazienza (da: string, a: string): Promise<void> {
  const scadenza = Date.now() + 2000
  for (let attesa = 10; ; attesa = Math.min(attesa * 2, 200)) {
    try {
      await fs.rename(da, a)
      return
    } catch (errore) {
      const codice = (errore as NodeJS.ErrnoException).code ?? ''
      if (process.platform !== 'win32' || !OCCUPATO.has(codice) || Date.now() >= scadenza) throw errore
      await new Promise((risolvi) => setTimeout(risolvi, attesa))
    }
  }
}

/** Scrive un file intero; con `sincronizza`, passando da un `fsync` prima di chiuderlo. */
async function scriviTutto (
  nativo: string,
  contenuto: Uint8Array,
  sincronizza: boolean,
): Promise<void> {
  if (!sincronizza) {
    await fs.writeFile(nativo, contenuto)
    return
  }
  const file = await fs.open(nativo, 'w')
  try {
    await file.writeFile(contenuto)
    await file.sync()
  } finally {
    await file.close()
  }
}

export const filesystem = {
  async readFile (uri: Uri): Promise<Uint8Array> {
    try {
      return await fs.readFile(uri.fsPath)
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  /**
   * `sincronizza` attende che i byte siano sul disco: serve a chi poi rinomina
   * sopra il file buono, o un'interruzione può lasciare un file pieno di zeri.
   */
  async writeFile (
    uri: Uri,
    contenuto: Uint8Array,
    opzioni?: { sincronizza?: boolean },
  ): Promise<void> {
    const sincronizza = opzioni?.sincronizza ?? false
    try {
      await scriviTutto(uri.fsPath, contenuto, sincronizza)
    } catch (errore) {
      // Crea le cartelle mancanti e riprova una volta, solo per `ENOENT`.
      if ((errore as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw tradotto(errore, uri)
      try {
        await fs.mkdir(percorso.dirname(uri.fsPath), { recursive: true })
        await scriviTutto(uri.fsPath, contenuto, sincronizza)
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
      return voci.map((voce) => [voce.name, tipoDi(voce)])
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  async stat (uri: Uri): Promise<StatoFile> {
    try {
      const dati = await fs.stat(uri.fsPath)
      return {
        type: tipoDi(dati),
        ctime: Math.round(dati.birthtimeMs || dati.ctimeMs),
        mtime: Math.round(dati.mtimeMs),
        size: dati.size,
      }
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  async rename (da: Uri, a: Uri, opzioni?: { overwrite?: boolean }): Promise<void> {
    // Verifica non atomica, sufficiente per un solo processo sulla cartella.
    if (!opzioni?.overwrite && (await esiste(a.fsPath))) throw ErroreFile.FileExists(a)
    try {
      await rinominaConPazienza(da.fsPath, a.fsPath)
    } catch (errore) {
      throw tradotto(errore, da)
    }
  },

  async copy (da: Uri, a: Uri, opzioni?: { overwrite?: boolean }): Promise<void> {
    const sovrascrivi = opzioni?.overwrite ?? false
    try {
      await fs.cp(da.fsPath, a.fsPath, {
        recursive: true,
        force: sovrascrivi,
        errorOnExist: !sovrascrivi,
      })
    } catch (errore) {
      throw tradotto(errore, da)
    }
  },

  async delete (uri: Uri, opzioni?: { recursive?: boolean, useTrash?: boolean }): Promise<void> {
    if (opzioni?.useTrash) {
      try {
        await shell.trashItem(uri.fsPath)
        return
      } catch {
        // Senza cestino (chiavetta, rete) si cancella e basta.
      }
    }
    try {
      await fs.rm(uri.fsPath, { recursive: opzioni?.recursive ?? false })
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  /** Sul desktop ogni schema è scrivibile. */
  isWritableFileSystem (_schema: string): boolean {
    return true
  },
}

/**
 * Scrive un file dall'offset `da` in poi, lasciando intatto il resto: serve
 * alla scrittura incrementale del documento d'anno, che riscrive solo la coda.
 * Il `fsync` porta i dati sul disco prima della coda che li nomina.
 */
export async function scriviDa (
  uri: Uri,
  da: number,
  contenuto: Uint8Array,
): Promise<void> {
  let file: fs.FileHandle | null = null
  try {
    // `r+` e non `a`, che ignorerebbe l'offset.
    file = await fs.open(uri.fsPath, 'r+')
    await file.write(contenuto, 0, contenuto.length, da)
    await file.sync()
  } catch (errore) {
    throw tradotto(errore, uri)
  } finally {
    await file?.close()
  }
}

/**
 * Vero se il file misura ancora `misura` byte e finisce con `fine`: prima di
 * accodare garantisce che l'archivio sia quello letto (la coda di uno ZIP porta
 * posizione e lunghezza dell'indice). Un file sparito torna falso.
 */
export async function finisceCon (uri: Uri, misura: number, fine: Uint8Array): Promise<boolean> {
  let file: fs.FileHandle | null = null
  try {
    try {
      file = await fs.open(uri.fsPath, 'r')
    } catch (errore) {
      const codice = (errore as NodeJS.ErrnoException | null)?.code
      if (codice === 'ENOENT' || codice === 'ENOTDIR') return false
      throw errore
    }
    const { size } = await file.stat()
    if (size !== misura || fine.length > size) return false
    const letto = Buffer.alloc(fine.length)
    const { bytesRead } = await file.read(letto, 0, fine.length, size - fine.length)
    return bytesRead === fine.length && letto.equals(fine)
  } catch (errore) {
    throw tradotto(errore, uri)
  } finally {
    await file?.close()
  }
}

