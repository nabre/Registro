// La presentazione al condotto: la chiave letta dalla cartella dei dati e lo
// scambio di `$accedi`. Solo moduli `node:`, nessuna compilazione.
//
// Le regole sono quelle di `FILE_CHIAVE` e `prova` in
// `desktop/transports/conduit.ts`, ripetute perché qui non si importa
// TypeScript: vanno tenute uguali.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { cartellaUtente } from './common.mjs'

/**
 * Dove sta la chiave: `REGISTRO_CHIAVE` scavalca, come `REGISTRO_CONDOTTO` per
 * l'indirizzo (portabile, due registri sulla stessa macchina).
 */
export function fileDellaChiave () {
  return process.env.REGISTRO_CHIAVE || join(cartellaUtente(), 'condotto.chiave')
}

/** La chiave come l'ha scritta il condotto, o `null` se non c'è. */
export function leggiChiave (file = fileDellaChiave()) {
  try {
    const letta = readFileSync(file, 'utf8').trim()
    return /^[0-9a-f]{64}$/.test(letta) ? Buffer.from(letta, 'hex') : null
  } catch {
    return null
  }
}

/** La prova di conoscere la chiave: l'etichetta dice in che verso va. */
export function prova (chiave, chi, sfida) {
  return createHmac('sha256', chiave).update(`${chi}\n${sfida}`).digest('hex')
}

/**
 * Si presenta sulla conversazione e controlla che il condotto sappia fare lo
 * stesso, prima di mandare qualunque altra cosa.
 *
 * Torna `{ esito: 'riconosciuto' }`, `{ esito: 'muto' }` (nessuna risposta),
 * `{ esito: 'rifiutato', busta }` (il condotto non accetta la chiave) o
 * `{ esito: 'impostore' }` (chi risponde non ha la chiave).
 */
export async function presentati (condotto, chiave) {
  const sfida = randomBytes(32).toString('hex')
  const busta = await condotto.chiedi('$accedi', { sfida, prova: prova(chiave, 'cliente', sfida) })
  if (!busta) return { esito: 'muto' }
  if (busta.error) {
    return busta.error.data?.codice === 'non-permesso'
      ? { esito: 'rifiutato', busta }
      : { esito: 'impostore' }
  }
  const attesa = Buffer.from(prova(chiave, 'condotto', sfida), 'hex')
  const data = typeof busta.result?.prova === 'string' && /^[0-9a-f]{64}$/.test(busta.result.prova)
    ? Buffer.from(busta.result.prova, 'hex')
    : Buffer.alloc(0)
  if (data.length !== attesa.length || !timingSafeEqual(data, attesa)) return { esito: 'impostore' }
  return { esito: 'riconosciuto' }
}
