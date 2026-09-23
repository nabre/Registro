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
import { type Deposito, depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

import { EventEmitter } from './events.js'

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

const SEGRETI_BLOCCATI =
  'il file dei segreti non si è potuto leggere e non va riscritto: chiudi i programmi ' +
  'che lo tengono aperto (sincronizzazione, antivirus) e riprova'

const SENZA_PORTACHIAVI =
  'il portachiavi del sistema non è disponibile: la password della casella non può essere salvata'

export class Segreti implements DepositoSegreti {
  readonly #emettitore = new EventEmitter<CambioSegreti>()
  readonly onDidChange = this.#emettitore.event

  /**
   * Il file dei segreti cifrati.
   *
   * Passa da `depositoJson` per un motivo preciso: qui dentro ci sono le
   * password della posta, e prima un `catch` solo attorno alla lettura le
   * trattava come assenti anche quando il file c'era ma era bloccato — il
   * salvataggio successivo lo riscriveva vuoto. Adesso, finché il file non si
   * riesce a leggere, non lo si tocca.
   */
  readonly #deposito: Deposito<Record<string, unknown>>

  /** La cartella in cui sta il file: la si chiede tardi, perché `app` sia pronta. */
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
      // Cifrato su un altro profilo o con un'altra macchina: il segreto non è
      // recuperabile, e dire «non c'è» fa ridomandare la password, che è quel
      // che serve.
      return undefined
    }
  }

  async store (chiave: string, valore: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error(SENZA_PORTACHIAVI)
    const cifrato = safeStorage.encryptString(valore).toString('base64')
    if (!this.salva((attuale) => ({ ...attuale, [chiave]: cifrato }))) {
      throw new Error(SEGRETI_BLOCCATI)
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
    if (!scritto) throw new Error(SEGRETI_BLOCCATI)
    if (trovata) this.#emettitore.fire({ key: chiave })
  }

  private file (): string {
    return percorso.join(this.cartella(), NOME_FILE)
  }

  private tutti (): Record<string, unknown> {
    return this.#deposito.contenuto()
  }

  /**
   * Cambia e scrive. Falso se il file c'è ma non si è potuto leggere: non si
   * tocca.
   *
   * Il cambiamento si applica dentro il deposito e non prima: qui dentro ci
   * sono le password della posta, e scrivere la fotografia presa *prima* della
   * rilettura protettiva vorrebbe dire cancellare tutte le altre nel momento
   * esatto in cui l'antivirus molla la presa.
   */
  private salva (
    muta: (attuale: Record<string, unknown>) => Record<string, unknown>,
  ): boolean {
    return this.#deposito.salva(muta)
  }
}
