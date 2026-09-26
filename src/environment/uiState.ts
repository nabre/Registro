import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'

/** Preferenze separate dai registri, disponibili anche dopo un riavvio. */
export function gestisciStatoInterfaccia (
  radice: string,
  tipo: string,
  operazione: unknown,
  valore?: unknown,
): unknown {
  const cartella = join(radice, 'interfaccia')
  const file = join(cartella, `${encodeURIComponent(tipo)}.json`)
  try {
    if (operazione === 'leggi') {
      const letto: unknown = JSON.parse(readFileSync(file, 'utf8'))
      return letto && typeof letto === 'object' && !Array.isArray(letto) ? letto : null
    }
    if (operazione === 'scrivi' && valore && typeof valore === 'object' && !Array.isArray(valore)) {
      const testo = JSON.stringify(valore)
      if (testo.length > 256000) return null
      mkdirSync(cartella, { recursive: true })
      writeFileSync(`${file}.tmp`, testo, 'utf8')
      renameSync(`${file}.tmp`, file)
      return true
    }
  } catch (errore) {
    if (operazione === 'scrivi') console.warn('Stato interfaccia non salvato:', errore)
  }
  return null
}
