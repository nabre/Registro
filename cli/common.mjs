// Nome dell'applicazione e cartella dei dati, per `main.mjs` e `uninstall.mjs`.
// Non si compila, solo moduli `node:`: gira anche a costruzione rotta e dal
// disinstallatore di Windows (`app.asar.unpacked/cli/`).

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Il nome nel percorso di `userData`. Uguale al `productName` di `package.json`
 * e alla costante di `src/api/transports/conduit.ts`, da cui esce l'indirizzo
 * del condotto.
 */
export const NOME_APPLICAZIONE = 'Regiklass'

/**
 * I nomi precedenti della cartella dei dati (`NOME_VECCHIO` in
 * `core/dati/formerName.ts` e «Regiclass»): finché il registro non riesce a rinominarla,
 * lavora lì.
 */
const NOMI_PRECEDENTI = ['Regiclass', 'Registro docenti']
export const NOME_PRECEDENTE = NOMI_PRECEDENTI[0]

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
  for (const nome of NOMI_PRECEDENTI) {
    const prec = join(cartellaDelSistema(), nome)
    if (existsSync(prec)) return prec
  }
  return join(cartellaDelSistema(), NOME_PRECEDENTE)
}

/**
 * La cartella `userData`, con la regola di Electron e di `core/dati/appData.ts`.
 * Quella col nome precedente solo se la nuova non c'è ancora.
 */
export function cartellaUtente () {
  const nuova = join(cartellaDelSistema(), NOME_APPLICAZIONE)
  if (existsSync(nuova)) return nuova
  for (const nome of NOMI_PRECEDENTI) {
    const prec = join(cartellaDelSistema(), nome)
    if (existsSync(prec)) return prec
  }
  return nuova
}
