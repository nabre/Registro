// Risoluzione dell'indirizzo del condotto per la riga di comando.
// Solo moduli `node:`, nessuna compilazione.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { cartellaUtente } from './common.mjs'

/**
 * Dove ascolta il condotto: le regole di `conduit.ts`, ripetute perché qui non
 * si importa TypeScript. `REGISTRO_CONDOTTO` le scavalca (portabile, due
 * registri sulla stessa macchina).
 *
 * Fuori da Windows il socket sta in `XDG_RUNTIME_DIR` se c'è, come
 * `cartellaDelSocket`. Su Windows il nome porta il segreto scritto dal condotto
 * (`FILE_SEGRETO`); senza, `null`: il nome senza segreto può averlo occupato un
 * altro utente.
 */
export function indirizzo () {
  if (process.env.REGISTRO_CONDOTTO) return process.env.REGISTRO_CONDOTTO
  const cartella = cartellaUtente()
  const impronta = createHash('sha256')
    .update(`${nomeUtente()}\n${cartella}`)
    .digest('hex')
    .slice(0, 12)
  if (process.platform !== 'win32') {
    const corsa = process.env.XDG_RUNTIME_DIR
    return join(corsa && corsa !== '' ? corsa : tmpdir(), `regiklass-${impronta}.sock`)
  }
  const segreto = segretoDelCondotto(cartella)
  return segreto ? `\\\\.\\pipe\\regiklass-${impronta}-${segreto}` : null
}

/** Il segreto del nome della pipe, come l'ha scritto il condotto; `null` se non c'è. */
function segretoDelCondotto (cartella) {
  try {
    const letto = readFileSync(join(cartella, 'condotto.segreto'), 'utf8').trim()
    return /^[0-9a-f]{32}$/.test(letto) ? letto : null
  } catch {
    return null
  }
}

function nomeUtente () {
  try {
    return userInfo().username
  } catch {
    return process.env.USERNAME ?? process.env.USER ?? ''
  }
}
