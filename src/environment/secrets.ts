// Segreti (la password della posta) cifrati con `safeStorage`, cioè il
// portachiavi del sistema. Senza portachiavi disponibile non si scrive mai in
// chiaro: una password in un JSON finisce nei backup e nelle cartelle sincronizzate.

import { safeStorage } from 'electron'
import { type Deposito, depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

import { EventEmitter } from './events.js'
import { testi } from './secrets.testi.js'

export interface CambioSegreti {
  key: string
}

export interface DepositoSegreti {
  get (chiave: string): Promise<string | undefined>
  store (chiave: string, valore: string): Promise<void>
  delete (chiave: string): Promise<void>
  onDidChange: import('./events.js').Event<CambioSegreti>
}

const NOME_FILE = 'segreti.json'

export class Segreti implements DepositoSegreti {
  readonly #emettitore = new EventEmitter<CambioSegreti>()
  readonly onDidChange = this.#emettitore.event

  /** Il file dei segreti cifrati; `depositoJson` non lo riscrive finché non si riesce a leggerlo. */
  readonly #deposito: Deposito<Record<string, unknown>>

  /** La cartella del file, chiesta tardi perché `app` sia pronta. */
  constructor (private readonly cartella: () => string) {
    this.#deposito = depositoJson<Record<string, unknown>>(
      () => this.file(),
      (letto) =>
        letto !== null && typeof letto === 'object' ? { ...(letto as Record<string, unknown>) } : {},
      () => ({}),
    )
  }

  async get (chiave: string): Promise<string | undefined> {
    if (!safeStorage.isEncryptionAvailable()) return undefined
    const cifrato = this.tutti()[chiave]
    if (typeof cifrato !== 'string') return undefined
    try {
      return safeStorage.decryptString(Buffer.from(cifrato, 'base64'))
    } catch {
      // Cifrato altrove: irrecuperabile, e «non c'è» fa ridomandare la password.
      return undefined
    }
  }

  async store (chiave: string, valore: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error(testi().senzaPortachiavi)
    const cifrato = safeStorage.encryptString(valore).toString('base64')
    if (!this.salva((attuale) => ({ ...attuale, [chiave]: cifrato }))) {
      throw new Error(testi().segretiBloccati)
    }
    this.#emettitore.fire({ key: chiave })
  }

  async delete (chiave: string): Promise<void> {
    let trovata = false
    const scritto = this.salva((attuale) => {
      if (!Object.prototype.hasOwnProperty.call(attuale, chiave)) return attuale
      trovata = true
      const { [chiave]: _tolto, ...rimasti } = attuale
      return rimasti
    })
    if (!scritto) throw new Error(testi().segretiBloccati)
    if (trovata) this.#emettitore.fire({ key: chiave })
  }

  private file (): string {
    return percorso.join(this.cartella(), NOME_FILE)
  }

  private tutti (): Record<string, unknown> {
    return this.#deposito.contenuto()
  }

  /**
   * Cambia e scrive; falso se il file c'è ma non si legge. `muta` si applica
   * dopo la rilettura del deposito, così non si perdono gli altri segreti.
   */
  private salva (
    muta: (attuale: Record<string, unknown>) => Record<string, unknown>,
  ): boolean {
    return this.#deposito.salva(muta)
  }
}
