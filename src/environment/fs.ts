// `workspace.fs` sopra `node:fs/promises`.
//
// Novantatré chiamate passano di qui, e tre dettagli — se sbagliati — rompono
// il registro senza dire niente:
//
//   1. il codice dell'errore, perché `archive.ts` distingue «file mai
//      scritto» da «file rotto» solo guardando `code === 'FileNotFound'`. Un
//      `ENOENT` grezzo che passa vuol dire un avviso a ogni avvio;
//   2. `rename` con `overwrite: false`, che deve fallire davvero: `years.ts` e
//      `filing.ts` contano su quel fallimento per non sovrascrivere
//      durante le migrazioni, e `fs.rename` di Node sovrascrive in silenzio;
//   3. `useTrash`, che deve andare nel cestino vero: quando il registro
//      cancella i dati di un anno, l'unico rimedio a un errore è il cestino.
//
// Il resto è traduzione diretta.

import { shell } from 'electron'
import * as fs from 'node:fs/promises'
import * as percorso from 'node:path'

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
  | 'FileNotADirectory'
  | 'Unknown'

export class ErroreFile extends Error {
  readonly code: CodiceFile

  constructor (messaggio: string, code: CodiceFile = 'Unknown') {
    super(messaggio)
    this.name = 'ErroreFile'
    this.code = code
  }

  static FileNotFound (dove?: Uri | string): ErroreFile {
    return new ErroreFile(`file non trovato: ${detto(dove)}`, 'FileNotFound')
  }

  static FileExists (dove?: Uri | string): ErroreFile {
    return new ErroreFile(`c'è già qualcosa: ${detto(dove)}`, 'FileExists')
  }

  static NoPermissions (dove?: Uri | string): ErroreFile {
    return new ErroreFile(`permesso negato: ${detto(dove)}`, 'NoPermissions')
  }

  static FileIsADirectory (dove?: Uri | string): ErroreFile {
    return new ErroreFile(`è una cartella: ${detto(dove)}`, 'FileIsADirectory')
  }

  static FileNotADirectory (dove?: Uri | string): ErroreFile {
    return new ErroreFile(`non è una cartella: ${detto(dove)}`, 'FileNotADirectory')
  }
}

function detto (dove?: Uri | string): string {
  if (dove === undefined) return 'percorso ignoto'
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
function tipoDi (voce: { isFile (): boolean, isDirectory (): boolean, isSymbolicLink (): boolean }): GenereFile {
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
    // La verifica prima della mossa non è a prova di corsa, ma il registro è
    // un'applicazione sola su una cartella sola: quel che conta è che una
    // migrazione non passi sopra un file già scritto, e questo lo garantisce.
    if (!opzioni?.overwrite && (await esiste(a.fsPath))) throw ErroreFile.FileExists(a)
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

/**
 * Scrive in fondo a un file, da un certo punto in poi, senza toccare quel che
 * viene prima.
 *
 * Non è API di VS Code, e non potrebbe esserlo: `workspace.fs` conosce solo il
 * file intero. Serve alla scrittura incrementale del documento d'anno, dove il
 * grosso — i PDF dell'archivio, le copie dello storico — resta dov'è e si
 * riscrive soltanto la coda. La differenza è fra scrivere dieci kilobyte e
 * riscriverne otto milioni, e su una cartella sincronizzata è anche la
 * differenza fra caricare la coda del file e ricaricarlo tutto.
 *
 * L'ordine conta ed è garantito da `fsync`: prima i dati nuovi arrivano sul
 * disco, poi la coda che li nomina. Al contrario, un'interruzione fra le due
 * scritture lascerebbe un archivio che dichiara voci mai scritte — e sarebbe
 * peggio di non aver salvato affatto.
 *
 * `troncaA` taglia quel che avanza: serve quando il documento nuovo è più corto
 * del vecchio, cioè dopo una compattazione.
 */
export async function scriviDa (
  uri: Uri,
  da: number,
  contenuto: Uint8Array,
  opzioni?: { troncaA?: number },
): Promise<void> {
  let file: fs.FileHandle | null = null
  try {
    // `r+` e non `a`: si scrive a un offset preciso, e `a` ignorerebbe la
    // posizione mettendo tutto in coda comunque.
    file = await fs.open(uri.fsPath, 'r+')
    await file.write(contenuto, 0, contenuto.length, da)
    if (opzioni?.troncaA !== undefined) await file.truncate(opzioni.troncaA)
    await file.sync()
  } catch (errore) {
    throw tradotto(errore, uri)
  } finally {
    await file?.close()
  }
}

