// Scrittura rotante degli errori imprevisti del registro in `userData/errori.log`.
// Non scrive le chiamate riuscite né gli ingressi, per non tenere traccia
// delle abitudini didattiche del docente. Massimo 1 MiB con un file di riserva.

import { appendFileSync, existsSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { VoceGiornale } from '#contract/contract.js'

const MAX_BYTES = 1024 * 1024 // 1 MiB

export function annotaErroreSuDisco (cartellaDati: string, voce: VoceGiornale): void {
  try {
    const file = join(cartellaDati, 'errori.log')
    if (existsSync(file)) {
      const stat = statSync(file)
      if (stat.size >= MAX_BYTES) {
        const vecchio = join(cartellaDati, 'errori.1.log')
        try {
          renameSync(file, vecchio)
        } catch {
          // Se occupato, continua sullo stesso
        }
      }
    }
    const riga = [
      new Date().toISOString(),
      '[' + voce.tracciato + ']',
      voce.procedura,
      voce.codice ?? 'ERR',
      String(voce.durataMs) + 'ms',
      voce.origine,
    ].join(' ') + '\n'
    appendFileSync(file, riga, 'utf8')
  } catch {
    // Il log su disco non deve mai bloccare né sollevare
  }
}
