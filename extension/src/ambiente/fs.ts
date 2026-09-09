// `workspace.fs` sopra `node:fs/promises`.
//
// Novantatré chiamate passano di qui, e tre dettagli — se sbagliati — rompono
// il registro senza dire niente:
//
//   1. il codice dell'errore, perché `archivio.ts` distingue «file mai
//      scritto» da «file rotto» solo guardando `code === 'FileNotFound'`. Un
//      `ENOENT` grezzo che passa vuol dire un avviso a ogni avvio;
//   2. `rename` con `overwrite: false`, che deve fallire davvero: `anni.ts` e
//      `archiviazione.ts` contano su quel fallimento per non sovrascrivere
//      durante le migrazioni, e `fs.rename` di Node sovrascrive in silenzio;
//   3. `useTrash`, che deve andare nel cestino vero: quando il registro
//      cancella i dati di un anno, l'unico rimedio a un errore è il cestino.
//
// Il resto è traduzione diretta.

import { shell } from 'electron'
import * as fs from 'node:fs/promises'
import * as percorso from 'node:path'

import { Uri } from './uri.js'

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface FileStat {
  type: FileType
  ctime: number
  mtime: number
  size: number
}

/** I codici che il registro guarda davvero, più il ripiego. */
export type CodiceFile =
  | 'FileNotFound'
  | 'FileExists'
  | 'NoPermissions'
  | 'FileIsADirectory'
  | 'FileNotADirectory'
  | 'Unknown'

export class FileSystemError extends Error {
  readonly code: CodiceFile

  constructor (messaggio: string, code: CodiceFile = 'Unknown') {
    super(messaggio)
    this.name = 'FileSystemError'
    this.code = code
  }

  static FileNotFound (dove?: Uri | string): FileSystemError {
    return new FileSystemError(`file non trovato: ${detto(dove)}`, 'FileNotFound')
  }

  static FileExists (dove?: Uri | string): FileSystemError {
    return new FileSystemError(`c'è già qualcosa: ${detto(dove)}`, 'FileExists')
  }

  static NoPermissions (dove?: Uri | string): FileSystemError {
    return new FileSystemError(`permesso negato: ${detto(dove)}`, 'NoPermissions')
  }

  static FileIsADirectory (dove?: Uri | string): FileSystemError {
    return new FileSystemError(`è una cartella: ${detto(dove)}`, 'FileIsADirectory')
  }

  static FileNotADirectory (dove?: Uri | string): FileSystemError {
    return new FileSystemError(`non è una cartella: ${detto(dove)}`, 'FileNotADirectory')
  }
}

function detto (dove?: Uri | string): string {
  if (dove === undefined) return 'percorso ignoto'
  return typeof dove === 'string' ? dove : dove.fsPath
}

/** Da errore di Node a errore che il registro sa leggere. */
function tradotto (errore: unknown, dove: Uri): FileSystemError {
  const codice = (errore as NodeJS.ErrnoException | null)?.code
  switch (codice) {
    case 'ENOENT':
    case 'ENOTDIR':
      return FileSystemError.FileNotFound(dove)
    case 'EEXIST':
    case 'ERR_FS_CP_EEXIST':
      return FileSystemError.FileExists(dove)
    case 'EPERM':
    case 'EACCES':
      return FileSystemError.NoPermissions(dove)
    case 'EISDIR':
    case 'ERR_FS_EISDIR':
      return FileSystemError.FileIsADirectory(dove)
    default: {
      const messaggio = errore instanceof Error ? errore.message : String(errore)
      return new FileSystemError(`${messaggio} (${dove.fsPath})`)
    }
  }
}

/** Il tipo di una voce, nella forma dell'enum. */
function tipoDi (voce: { isFile (): boolean, isDirectory (): boolean, isSymbolicLink (): boolean }): FileType {
  if (voce.isSymbolicLink()) return FileType.SymbolicLink
  if (voce.isDirectory()) return FileType.Directory
  if (voce.isFile()) return FileType.File
  return FileType.Unknown
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

export const filesystem = {
  async readFile (uri: Uri): Promise<Uint8Array> {
    try {
      return await fs.readFile(uri.fsPath)
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  async writeFile (uri: Uri, contenuto: Uint8Array): Promise<void> {
    try {
      await fs.writeFile(uri.fsPath, contenuto)
    } catch (errore) {
      // VS Code crea da sé le cartelle che mancano, e il registro ci conta in
      // qualche punto. Si riprova una volta sola, e solo per quel motivo: un
      // permesso negato deve restare un permesso negato.
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

  async readDirectory (uri: Uri): Promise<Array<[string, FileType]>> {
    try {
      const voci = await fs.readdir(uri.fsPath, { withFileTypes: true })
      return voci.map((voce) => [voce.name, tipoDi(voce)])
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  async stat (uri: Uri): Promise<FileStat> {
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
    // La verifica prima della mossa non è a prova di corsa, ma il registro è
    // un'applicazione sola su una cartella sola: quel che conta è che una
    // migrazione non passi sopra un file già scritto, e questo lo garantisce.
    if (!opzioni?.overwrite && (await esiste(a.fsPath))) throw FileSystemError.FileExists(a)
    try {
      await fs.rename(da.fsPath, a.fsPath)
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
        // Su una chiavetta o su una condivisione di rete il cestino non c'è.
        // VS Code in quel caso cancella e basta: meglio che lasciare in giro
        // un file che l'utente crede di avere buttato.
      }
    }
    try {
      await fs.rm(uri.fsPath, { recursive: opzioni?.recursive ?? false })
    } catch (errore) {
      throw tradotto(errore, uri)
    }
  },

  /** Sul desktop si scrive sempre: non ci sono cartelle di sola lettura montate dall'editor. */
  isWritableFileSystem (_schema: string): boolean {
    return true
  },
}
