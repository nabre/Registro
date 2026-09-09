// Le impostazioni: un file JSON in `userData`.
//
// Le chiavi restano piatte e puntate — `registroDocenti.posta.mittente` — e i
// valori predefiniti si leggono da `src/manifesto.ts`, che è l'unico elenco.
// Riscriverli a mano qui vorrebbe dire due elenchi da tenere allineati, e la
// divergenza si scoprirebbe fra un anno da un'impostazione che vale una cosa
// nella finestra e un'altra dentro il registro.
//
// La lettura è sincrona perché mezzo registro chiama `get` in mezzo a un
// calcolo. Il file è di poche righe: si legge una volta all'avvio e resta in
// memoria.

import { app } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'

import { predefinitiImpostazioni } from '../manifesto.js'
import { EventEmitter } from './eventi.js'

/** I predefiniti del manifesto, appiattiti una volta sola. */
const PREDEFINITI_IMPOSTAZIONI: Record<string, unknown> = predefinitiImpostazioni()

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export interface ConfigurationChangeEvent {
  affectsConfiguration (sezione: string): boolean
}

export interface WorkspaceConfiguration {
  get<T> (chiave: string): T | undefined
  get<T> (chiave: string, ripiego: T): T
  has (chiave: string): boolean
  inspect<T> (chiave: string): { key: string, defaultValue?: T, globalValue?: T } | undefined
  update (chiave: string, valore: unknown, target?: ConfigurationTarget): Promise<void>
}

const NOME_FILE = 'impostazioni.json'

/**
 * Il modo `vscode` passava dall'account dell'editor. Non c'è più nemmeno
 * l'editor, ma il valore resta scritto nel file di chi usava l'estensione.
 */
const AUTENTICAZIONE = 'registroDocenti.posta.autenticazione'

let scritte: Record<string, unknown> | null = null

const emettitore = new EventEmitter<ConfigurationChangeEvent>()

/** Scatta quando un'impostazione cambia. */
export const onDidChangeConfiguration = emettitore.event

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

function caricate (): Record<string, unknown> {
  if (scritte) return scritte
  try {
    const letto: unknown = JSON.parse(readFileSync(file(), 'utf8'))
    scritte = letto !== null && typeof letto === 'object' ? (letto as Record<string, unknown>) : {}
  } catch {
    // File mai scritto, o scritto male a mano: si riparte dai predefiniti
    // invece di impedire l'avvio. Quel che c'era resta sul disco finché non
    // si salva qualcosa.
    scritte = {}
  }
  return scritte
}

/**
 * Rilegge il file. Serve alle prove, e servirà all'osservatore che alla fase 4
 * accorgerà l'app delle modifiche fatte dalla finestra delle impostazioni.
 */
export function ricaricaImpostazioni (): void {
  scritte = null
}

function salva (valori: Record<string, unknown>): void {
  const destinazione = file()
  const temporaneo = `${destinazione}.tmp`
  // In due tempi, come fa `archivio.ts` con i JSON del registro e per lo stesso
  // motivo: un salvataggio interrotto a metà lascia il file buono al suo posto.
  writeFileSync(temporaneo, `${JSON.stringify(valori, null, 2)}\n`, 'utf8')
  renameSync(temporaneo, destinazione)
}

/** Il valore, con la correzione che l'applicazione impone. */
function corretto (piena: string, valore: unknown): unknown {
  // `vscode` significava «l'account del menu di VS Code». Chi ha usato
  // l'estensione si porta dietro quel valore scritto nel file: si legge come
  // `oauth`, che è la stessa strada senza l'editor in mezzo.
  if (piena === AUTENTICAZIONE && valore === 'vscode') return 'oauth'
  return valore
}

function predefinito (piena: string): unknown {
  return corretto(piena, PREDEFINITI_IMPOSTAZIONI[piena])
}

/**
 * Le impostazioni di una sezione.
 *
 * `ConfigurationTarget` si accetta ma non si guarda: sul desktop non ci sono
 * tre livelli — utente, cartella, sottocartella — ce n'è uno solo, e i tre
 * finiscono tutti nello stesso file. È una semplificazione voluta: `posta.ts`
 * cancella un'impostazione su tutti e tre i livelli per essere sicuro di
 * averla tolta, e qui la prima cancellazione basta.
 */
export function getConfiguration (sezione?: string): WorkspaceConfiguration {
  const piena = (chiave: string): string => (sezione ? `${sezione}.${chiave}` : chiave)

  function leggi<T> (chiave: string, ripiego?: T): T | undefined {
    const nome = piena(chiave)
    const valori = caricate()
    if (Object.prototype.hasOwnProperty.call(valori, nome)) {
      const valore = corretto(nome, valori[nome])
      if (valore !== undefined) return valore as T
    }
    const dato = predefinito(nome)
    return (dato !== undefined ? dato : ripiego) as T | undefined
  }

  return {
    get: leggi as WorkspaceConfiguration['get'],

    has (chiave: string): boolean {
      const nome = piena(chiave)
      return (
        Object.prototype.hasOwnProperty.call(caricate(), nome) ||
        Object.prototype.hasOwnProperty.call(PREDEFINITI_IMPOSTAZIONI, nome)
      )
    },

    inspect<T> (chiave: string) {
      const nome = piena(chiave)
      const valori = caricate()
      return {
        key: nome,
        defaultValue: predefinito(nome) as T | undefined,
        globalValue: Object.prototype.hasOwnProperty.call(valori, nome)
          ? (corretto(nome, valori[nome]) as T)
          : undefined,
      }
    },

    async update (chiave: string, valore: unknown): Promise<void> {
      const nome = piena(chiave)
      const valori = caricate()
      if (valore === undefined) {
        if (!Object.prototype.hasOwnProperty.call(valori, nome)) return
        delete valori[nome]
      } else {
        if (valori[nome] === valore) return
        valori[nome] = valore
      }
      salva(valori)
      emettitore.fire({
        affectsConfiguration: (prefisso: string) => nome === prefisso || nome.startsWith(`${prefisso}.`),
      })
    },
  }
}
