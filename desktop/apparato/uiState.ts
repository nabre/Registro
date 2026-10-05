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
  /** Per una finestra figlia, il tipo della principale: vedi `conLePreferenzeDi`. */
  principale?: string,
): unknown {
  const cartella = join(radice, 'interfaccia')
  const leggi = (diChi: string): Record<string, unknown> | null => {
    const esito = leggiJson(join(cartella, `${encodeURIComponent(diChi)}.json`))
    if (esito.stato !== 'letto') return null
    const letto = esito.valore
    return letto && typeof letto === 'object' && !Array.isArray(letto)
      ? letto as Record<string, unknown>
      : null
  }
  if (operazione === 'leggi') {
    const propria = leggi(tipo)
    return principale ? conLePreferenzeDi(propria, leggi(principale)) : propria
  }
  const file = join(cartella, `${encodeURIComponent(tipo)}.json`)
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

/**
 * La memoria di una finestra figlia del registro: la sua (posto e scelte per
 * documento) con le preferenze di forma della principale, che valgono per
 * tutte. La figlia scrive solo nel suo file, e le sue non arrivano alla
 * principale. `v` e `globali` sono la forma di `ui/memory.ts`: una principale
 * d'altra forma lascia la figlia com'è.
 */
export function conLePreferenzeDi (
  propria: Record<string, unknown> | null,
  principale: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const globali = principale?.v === 2 ? principale.globali : undefined
  if (!globali || typeof globali !== 'object' || Array.isArray(globali)) return propria
  return { ...(propria ?? { v: 2, documenti: {} }), globali }
}
