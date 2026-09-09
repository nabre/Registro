// Il portachiavi: la password della casella scolastica, e niente altro.
//
// VS Code lo dà all'estensione già fatto; qui va costruito, e sopra
// `safeStorage`, che è la porta di Electron verso il portachiavi del sistema —
// Credential Manager su Windows, Keychain su macOS, il portachiavi di sessione
// su Linux.
//
// La regola che conta è quella del ripiego che non c'è: se il portachiavi non
// è disponibile — capita su Linux senza un ambiente desktop completo — non si
// scrive in chiaro. Una password di posta scolastica in un JSON dentro
// `userData` è peggio che una password non salvata: la seconda si ridigita, la
// prima gira per i backup e per le cartelle sincronizzate senza che nessuno lo
// sappia.

import { safeStorage } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'

import { EventEmitter } from './eventi.js'

export interface SecretStorageChangeEvent {
  key: string
}

export interface SecretStorage {
  get (chiave: string): Promise<string | undefined>
  store (chiave: string, valore: string): Promise<void>
  delete (chiave: string): Promise<void>
  onDidChange: import('./eventi.js').Event<SecretStorageChangeEvent>
}

const NOME_FILE = 'segreti.json'

const SENZA_PORTACHIAVI =
  'il portachiavi del sistema non è disponibile: la password della casella non può essere salvata'

export class Segreti implements SecretStorage {
  readonly #emettitore = new EventEmitter<SecretStorageChangeEvent>()
  readonly onDidChange = this.#emettitore.event

  /** La cartella in cui sta il file: la si chiede tardi, perché `app` sia pronta. */
  constructor (private readonly cartella: () => string) {}

  async get (chiave: string): Promise<string | undefined> {
    if (!safeStorage.isEncryptionAvailable()) return undefined
    const cifrato = this.tutti()[chiave]
    if (typeof cifrato !== 'string') return undefined
    try {
      return safeStorage.decryptString(Buffer.from(cifrato, 'base64'))
    } catch {
      // Cifrato su un altro profilo o con un'altra macchina: il segreto non è
      // recuperabile, e dire «non c'è» fa ridomandare la password, che è quel
      // che serve.
      return undefined
    }
  }

  async store (chiave: string, valore: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error(SENZA_PORTACHIAVI)
    const tutti = this.tutti()
    tutti[chiave] = safeStorage.encryptString(valore).toString('base64')
    this.salva(tutti)
    this.#emettitore.fire({ key: chiave })
  }

  async delete (chiave: string): Promise<void> {
    const tutti = this.tutti()
    if (!Object.prototype.hasOwnProperty.call(tutti, chiave)) return
    delete tutti[chiave]
    this.salva(tutti)
    this.#emettitore.fire({ key: chiave })
  }

  private file (): string {
    return percorso.join(this.cartella(), NOME_FILE)
  }

  private tutti (): Record<string, unknown> {
    try {
      const letto: unknown = JSON.parse(readFileSync(this.file(), 'utf8'))
      return letto !== null && typeof letto === 'object' ? (letto as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  private salva (tutti: Record<string, unknown>): void {
    const destinazione = this.file()
    const temporaneo = `${destinazione}.tmp`
    writeFileSync(temporaneo, `${JSON.stringify(tutti, null, 2)}\n`, 'utf8')
    renameSync(temporaneo, destinazione)
  }
}
