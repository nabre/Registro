// La disposizione delle finestre del registro, per documento: quali figlie
// erano aperte su quel `.regi`, per riaprirle quando lo si riapre. Il resto
// sta altrove: dove stava ogni finestra in `finestre.json` (`placement.ts`,
// per tipo), che pagina mostrava nella sua memoria (`interfaccia/<tipo>.json`).
// In `userData` e non nel documento: le finestre dipendono dagli schermi di
// questo computer, non dall'anno.

import { app } from 'electron'
import * as percorso from 'node:path'

import { depositoJson } from './jsonStore.js'
import { NUMERO_PRINCIPALE } from './panelTypes.js'

const NOME_FILE = 'disposizione.json'

/** Il tetto delle figlie, quello più alto che l'impostazione `finestre.massimo` ammette. */
export const MASSIMO_FIGLIE = 6

/** Quanti documenti si ricordano: oltre, cedono i meno usati (come `ui/memory.ts`). */
export const MASSIMO_DOCUMENTI = 20

/** Le figlie di un documento e quando lo si è guardato l'ultima volta. */
export interface Disposizione {
  figlie: number[]
  usato: string
}

type Disposizioni = Record<string, Disposizione>

/**
 * La chiave di un documento: il percorso con le barre dritte e in minuscolo,
 * perché Windows non distingue maiuscole né barre. Un anno provvisorio non ne
 * ha: sta in una cartella che non si riaprirà.
 */
export function chiaveDellaDisposizione (
  documento: string | null,
  provvisorio: boolean,
): string | null {
  if (provvisorio || !documento) return null
  return documento.replace(/\\/g, '/').toLowerCase()
}

/** Un numero di figlia buono: intero, dopo la principale, sotto il tetto. */
function numeroDiFiglia (valore: unknown): valore is number {
  return Number.isInteger(valore) &&
    (valore as number) > NUMERO_PRINCIPALE &&
    (valore as number) <= NUMERO_PRINCIPALE + MASSIMO_FIGLIE
}

/**
 * Le disposizioni lette dal file, qualunque cosa ci sia: si tiene solo quel che
 * si riconosce, i numeri doppi una volta, al più `MASSIMO_DOCUMENTI` (i più
 * recenti). Non lancia mai: un file storto vale come vuoto.
 */
export function disposizioniValide (letto: unknown): Disposizioni {
  if (!letto || typeof letto !== 'object' || Array.isArray(letto)) return {}
  const buone: Disposizioni = {}
  for (const [chiave, voce] of Object.entries(letto as Record<string, unknown>)) {
    // `__proto__` da `JSON.parse` è una chiave vera: assegnata, cambierebbe il prototipo.
    if (chiave === '__proto__' || chiave === '' || !voce || typeof voce !== 'object') continue
    const { figlie, usato } = voce as Record<string, unknown>
    if (!Array.isArray(figlie)) continue
    const numeri = [...new Set(figlie.filter(numeroDiFiglia))].sort((a, b) => a - b)
    buone[chiave] = { figlie: numeri, usato: typeof usato === 'string' ? usato : '' }
  }
  return potate(buone)
}

/** Al più `MASSIMO_DOCUMENTI`, via i meno recenti. */
function potate (disposizioni: Disposizioni): Disposizioni {
  const chiavi = Object.keys(disposizioni)
  if (chiavi.length <= MASSIMO_DOCUMENTI) return disposizioni
  const usato = (chiave: string) => disposizioni[chiave].usato
  const recenti = chiavi
    .sort((a, b) => (usato(b) > usato(a) ? 1 : usato(b) < usato(a) ? -1 : 0))
    .slice(0, MASSIMO_DOCUMENTI)
  return Object.fromEntries(recenti.map((chiave) => [chiave, disposizioni[chiave]]))
}

// Un file presente ma illeggibile `depositoJson` lo lascia stare, come i posti.
const deposito = depositoJson<Disposizioni>(
  () => percorso.join(app.getPath('userData'), NOME_FILE),
  disposizioniValide,
  () => ({}),
)

/** Le figlie ricordate per il documento, in ordine; nessuna senza chiave. */
export function figlieRicordate (chiave: string | null): number[] {
  if (chiave === null) return []
  return [...(deposito.contenuto()[chiave]?.figlie ?? [])]
}

/**
 * Ricorda le figlie aperte sul documento. Si scrive subito, a ogni apertura e
 * chiusura: sono gesti rari, e una chiusura del programma che non arriva in
 * fondo non deve perderli.
 */
export function ricordaFiglie (chiave: string | null, figlie: readonly number[]): void {
  if (chiave === null) return
  const numeri = [...new Set(figlie.filter(numeroDiFiglia))].sort((a, b) => a - b)
  try {
    deposito.salva((attuali) => {
      const prima = attuali[chiave]?.figlie ?? []
      if (prima.length === numeri.length && prima.every((n, i) => n === numeri[i])) return attuali
      return potate({ ...attuali, [chiave]: { figlie: numeri, usato: new Date().toISOString() } })
    })
  } catch (errore) {
    // Al peggio, riaprendo il documento le figlie non tornano.
    console.warn('Disposizione delle finestre non salvata:', errore)
  }
}

/** Rilegge il file. Serve alle prove, che scrivono in una `userData` loro. */
export function ricaricaDisposizioni (): void {
  deposito.dimentica()
}
