import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { leggiJson, scriviJson } from './jsonStore.js'

/**
 * Preferenze separate dai registri, disponibili anche dopo un riavvio. Lettura e
 * scrittura passano da `jsonStore.ts` come gli altri file di `userData`: fsync
 * prima della rinomina e pazienza con OneDrive e antivirus su Windows.
 */
export function gestisciStatoInterfaccia (
  radice: string,
  tipo: string,
  operazione: unknown,
  valore?: unknown,
): unknown {
  const cartella = join(radice, 'interfaccia')
  const file = join(cartella, `${encodeURIComponent(tipo)}.json`)
  if (operazione === 'leggi') {
    const esito = leggiJson(file)
    if (esito.stato !== 'letto') return null
    const letto = esito.valore
    return letto && typeof letto === 'object' && !Array.isArray(letto) ? letto : null
  }
  if (operazione === 'scrivi' && valore && typeof valore === 'object' && !Array.isArray(valore)) {
    try {
      if (JSON.stringify(valore).length > 256000) return null
      mkdirSync(cartella, { recursive: true })
      scriviJson(file, valore)
      return true
    } catch (errore) {
      console.warn('Stato interfaccia non salvato:', errore)
    }
  }
  return null
}
