// Nome dell'applicazione e cartella dei dati, per `registro.mjs` e `disinstalla.mjs`.
// Non si compila, solo moduli `node:`: gira anche a costruzione rotta e dal
// disinstallatore di Windows (`app.asar.unpacked/src/cli/`).

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Il nome nel percorso di `userData`. Uguale al `productName` di `package.json`
 * e alla costante di `src/api/transports/conduit.ts`, da cui esce l'indirizzo
 * del condotto.
 */
export const NOME_APPLICAZIONE = 'Regiclass'

/**
 * Il nome precedente della cartella dei dati (`NOME_VECCHIO` in
 * `src/data/formerName.ts`): finché il registro non riesce a rinominarla,
 * lavora lì.
 */
export const NOME_PRECEDENTE = 'Registro docenti'

/** La cartella del sistema che contiene quelle dei dati, secondo le regole di Electron. */
function cartellaDelSistema () {
  if (process.platform === 'win32') {
    return process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  }
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support')
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
}

/** La cartella dei dati col nome precedente: la toglie anche la disinstallazione. */
export function cartellaUtentePrecedente () {
  return join(cartellaDelSistema(), NOME_PRECEDENTE)
}

/**
 * La cartella `userData`, con la regola di Electron e di `src/data/appData.ts`.
 * Quella col nome precedente solo se la nuova non c'è ancora.
 */
export function cartellaUtente () {
  const nuova = join(cartellaDelSistema(), NOME_APPLICAZIONE)
  const precedente = cartellaUtentePrecedente()
  return !existsSync(nuova) && existsSync(precedente) ? precedente : nuova
}
